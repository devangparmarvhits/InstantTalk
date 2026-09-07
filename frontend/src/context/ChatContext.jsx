import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { getSocket, onSocketConnect } from '../socket/socket';
import { getConversations, getMessages as fetchMessages } from '../services/chat.service';
import { AuthContext } from './AuthContext';
import { playNotificationSound, showNotification } from '../utils/notification';

export const ChatContext = createContext(null);

// Reply context for communicating between MessageBubble and MessageInput
export const ReplyContext = createContext(null);

// Persist the open conversation across page refreshes
const STORAGE_KEY = 'instattalk_active_conversation_id';
const getStoredConvId = () => {
  try { return localStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
};
const setStoredConvId = (id) => {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
};

export const ChatProvider = ({ children }) => {
  const { user } = useContext(AuthContext);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const activeConvRef = useRef(activeConversation);
  useEffect(() => {
    activeConvRef.current = activeConversation;
  }, [activeConversation]);

  // Keep the open conversation in sync with fresh (masked) participant data
  // so privacy changes to last seen / online status reflect in the header live
  useEffect(() => {
    if (!activeConversation) return;
    const fresh = conversations.find((c) => c._id === activeConversation._id);
    if (!fresh) return;
    const currentParts = JSON.stringify(activeConversation.participants || []);
    const nextParts = JSON.stringify(fresh.participants || []);
    if (currentParts !== nextParts) {
      setActiveConversation((prev) => (prev ? { ...prev, ...fresh } : prev));
    }
  }, [conversations, activeConversation]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConversations(true);
    try {
      const data = await getConversations();
      setConversations(data.data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadConversations();
  }, [user, loadConversations]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (conversationId) => {
    setLoadingMessages(true);
    try {
      const data = await fetchMessages(conversationId);
      setMessages(data.data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const selectConversation = useCallback((conversation) => {
    setActiveConversation(conversation);
    setReplyTo(null);
    setMessages([]); // Clear old messages immediately
    if (conversation) {
      const socket = getSocket();
      const myId = user?._id?.toString();
      setStoredConvId(conversation._id);
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversation._id && myId
            ? { ...c, unreadCount: { ...(c.unreadCount || {}), [myId]: 0 } }
            : c
        )
      );
      if (socket) {
        socket.emit('join_conversation', conversation._id);
        socket.emit('mark_read', { conversationId: conversation._id });
      }
      loadMessages(conversation._id);
    } else {
      setStoredConvId(null);
    }
  }, [loadMessages, user?._id]);

  // Restore the previously open conversation after a page refresh.
  // Runs when conversations finish loading so we can re-select it and load
  // its messages automatically. Placed after selectConversation so the
  // dependency array can reference it during render.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!conversations.length || restoredRef.current) return;
    const storedId = getStoredConvId();
    if (!storedId) {
      restoredRef.current = true;
      return;
    }
    const restored = conversations.find((c) => c._id === storedId);
    if (restored) {
      restoredRef.current = true;
      selectConversation(restored);
    }
  }, [conversations, selectConversation]);

  const loadConversationsTimerRef = useRef(null);

  // Live check: is the message list scrolled to the bottom right now? Reading
  // the DOM directly (instead of a ref kept by scroll events) avoids the case
  // where the scroll event hadn't fired yet when a message arrived — which was
  // marking scrolled-up chats as read and clearing the down-arrow + badge.
  const isMessagesAreaNearBottom = useCallback(() => {
    const el = document.getElementById('messages-area');
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  // Mark the open conversation read when the user scrolls down / hits the
  // "new message" arrow and actually views the latest messages.
  const markReadOnView = useCallback(() => {
    const socket = getSocket();
    const conv = activeConvRef.current;
    if (!socket || !conv) return;
    if (window.location.pathname !== '/chat') return;
    const myId = user?._id?.toString();
    if (!myId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c._id === conv._id
          ? { ...c, unreadCount: { ...(c.unreadCount || {}), [myId]: 0 } }
          : c
      )
    );
    socket.emit('mark_read', { conversationId: conv._id });
  }, []);

  // markActiveConversationRead — REMOVED. We should NOT auto-mark-read on
  // socket reconnect or any automatic event. Messages are only marked read
  // when the user EXPLICITLY views them (scrolls to bottom, clicks arrow).
  // This prevents messages from being marked read when the user has the
  // chat open but is on another tab or not actively reading.

  // Debounced loadConversations to prevent rapid-fire API calls
  const loadConversationsDebounced = useCallback(() => {
    if (loadConversationsTimerRef.current) {
      clearTimeout(loadConversationsTimerRef.current);
    }
    loadConversationsTimerRef.current = setTimeout(() => {
      loadConversations();
      loadConversationsTimerRef.current = null;
    }, 300);
  }, [loadConversations]);

  // Update the conversation list locally when a new message arrives —
  // moves the chat to the top, sets the latest preview, and bumps the
  // unread count for incoming messages. Avoids a full list reload on every
  // send/receive, which made the entire sidebar re-render/spinner.
  const applyNewMessageToConversations = useCallback(
    (message, { msgConvId, isFromOther, isActive, isViewing }) => {
      const myId = user?._id?.toString();
      if (!myId) return;

      setConversations((prev) => {
        const exists = prev.some((c) => c._id?.toString() === msgConvId);
        if (!exists) {
          // Brand new conversation — need full data, so fetch the list.
          loadConversationsDebounced();
          return prev;
        }
        const next = prev
          .map((c) => {
            if (c._id?.toString() !== msgConvId) return c;
            if (c.lastMessage?._id?.toString() === message._id?.toString()) return c;
            const updated = {
              ...c,
              lastMessage: message,
              updatedAt: message.createdAt || c.updatedAt,
            };
            if (isFromOther && !isViewing) {
              const count = updated.unreadCount?.[myId] || 0;
              updated.unreadCount = { ...(updated.unreadCount || {}), [myId]: count + 1 };
            }
            if (isActive && isViewing) {
              updated.unreadCount = { ...(updated.unreadCount || {}), [myId]: 0 };
            }
            return updated;
          })
          .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        return next;
      });
    },
    [user, loadConversationsDebounced]
  );

  // Socket event binding
  useEffect(() => {
    if (!user) return;

    const setupSocketListeners = (socket) => {
      if (!socket) return;

      // Remove ALL existing listeners first to prevent duplicates
      socket.off('new_message');
      socket.off('conversation_updated');
      socket.off('online_users');
      socket.off('user_online');
      socket.off('user_offline');
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('messages_status');
      socket.off('messages_read');

      socket.on('new_message', (message) => {
        const msgConvId = (message.conversationId?._id || message.conversationId).toString();
        const currentActiveId = activeConvRef.current?._id?.toString();
        const myId = user?._id?.toString();
        const senderStr = message.sender?._id?.toString() || message.sender?.toString();
        const isFromOther = senderStr && senderStr !== myId;
        const isActive = currentActiveId === msgConvId;

        const viewingChat =
          isFromOther &&
          isActive &&
          window.location.pathname === '/chat' &&
          document.visibilityState === 'visible' &&
          document.hasFocus() &&
          isMessagesAreaNearBottom();

        // Update sidebar list locally (no full reload on every message)
        applyNewMessageToConversations(message, {
          msgConvId,
          isFromOther,
          isActive,
          isViewing: viewingChat,
        });

        if (isFromOther) {
          if (viewingChat) {
            // Recipient is looking at this chat → read instantly (WhatsApp behavior)
            socket.emit('mark_read', { conversationId: msgConvId });
          } else {
            // Otherwise just ack delivery → sender sees ✓✓
            socket.emit('message_delivered', { messageIds: [message._id] });

            // Real-time notification: browser alert + optional sound
            const notifSettings = user?.settings?.notifications || {};
            if (notifSettings.messages !== false) {
              if (notifSettings.sound !== false) {
                try { playNotificationSound(); } catch { /* ignore */ }
              }
              const senderName = message.sender?.name || 'Someone';
              const preview =
                notifSettings.preview === false
                  ? 'New message'
                  : (message.content || '[Attachment]').slice(0, 120);
              showNotification({
                title: `${senderName} on InstantTalk`,
                body: preview,
              });
            }
          }
        }

        if (currentActiveId && currentActiveId === msgConvId) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === message._id)) return prev;
            // If this real message is from me, drop any optimistic (temp)
            // placeholder message sent moments ago so it doesn't duplicate.
            const isMine = senderStr === myId;
            const cleaned = isMine
              ? prev.filter((m) => !String(m._id).startsWith('temp-') || (m.conversationId?.toString?.() !== msgConvId))
              : prev;
            return [...cleaned, message];
          });
        }
      });

      socket.on('conversation_updated', () => {
        loadConversationsDebounced();
      });

      // Apply delivered/read status updates to matching messages
      const applyStatusUpdates = (payload) => {
        if (!payload?.messages?.length) return;
        setMessages((prev) =>
          prev.map((m) => {
            const update = payload.messages.find((u) => u._id === m._id);
            if (!update) return m;
            return {
              ...m,
              deliveredAt: update.deliveredAt || m.deliveredAt,
              readAt: update.readAt || m.readAt,
              readBy: update.readBy || m.readBy,
            };
          })
        );
      };

      socket.on('messages_status', applyStatusUpdates);
      socket.on('messages_read', applyStatusUpdates);

      // Message edited
      socket.on('message_edited', (update) => {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === update._id
              ? { ...m, content: update.content, editedAt: update.editedAt }
              : m
          )
        );
      });

      // Message deleted for everyone
      socket.on('message_deleted', (update) => {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === update._id
              ? { ...m, deleted: true, content: '' }
              : m
          )
        );
      });

      // Message deleted for me (only affects my view)
      socket.on('message_deleted_for_me', (update) => {
        setMessages((prev) => prev.filter((m) => m._id !== update._id));
      });

      // Message reaction updated
      socket.on('message_reaction', (update) => {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === update.messageId
              ? { ...m, reactions: update.reactions }
              : m
          )
        );
      });

      socket.on('online_users', (userIds) => {
        setOnlineUsers((userIds || []).map((id) => id.toString()));
      });

      socket.on('user_online', ({ userId }) => {
        if (!userId) return;
        const uStr = userId.toString();
        setOnlineUsers((prev) => [...new Set([...prev, uStr])]);
      });

      socket.on('user_offline', ({ userId }) => {
        if (!userId) return;
        const uStr = userId.toString();
        setOnlineUsers((prev) => prev.filter((id) => id !== uStr));
      });

      socket.on('user_typing', ({ userId, conversationId }) => {
        setTypingUsers((prev) => ({ ...prev, [conversationId]: userId }));
      });

      socket.on('user_stop_typing', ({ conversationId }) => {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[conversationId];
          return next;
        });
      });

      // If a conversation is already open, re-join its room
      // Do NOT mark_read here — only mark when user explicitly views messages
      const currentConv = activeConvRef.current;
      if (currentConv) {
        socket.emit('join_conversation', currentConv._id);
      }
    };

    // Only use onSocketConnect to avoid double-registration
    const unsubscribe = onSocketConnect(setupSocketListeners);

    return () => {
      unsubscribe();
      if (loadConversationsTimerRef.current) {
        clearTimeout(loadConversationsTimerRef.current);
      }
      const s = getSocket();
      if (s) {
        s.off('new_message');
        s.off('conversation_updated');
        s.off('online_users');
        s.off('user_online');
        s.off('user_offline');
        s.off('user_typing');
        s.off('user_stop_typing');
        s.off('messages_status');
        s.off('messages_read');
        s.off('message_edited');
        s.off('message_deleted');
        s.off('message_deleted_for_me');
      }
    };
  }, [user, loadConversationsDebounced, isMessagesAreaNearBottom, applyNewMessageToConversations]);

  // Reply state
  const [replyTo, setReplyTo] = useState(null);

  // Scroll state snapshot — lets MessageInput save before addMessage
  const scrollStateRef = useRef({ isAtBottom: true });

  const addMessage = useCallback((message) => {
    setMessages((prev) => {
      if (prev.some((m) => m._id === message._id)) return prev;
      return [...prev, message];
    });
    // loadConversations is called by the 'new_message' socket event instead
  }, []);

  const isUserOnline = useCallback(
    (userId) => {
      if (!userId) return false;
      return onlineUsers.includes(userId.toString());
    },
    [onlineUsers]
  );

  return (
    <ChatContext.Provider
      value={{
        conversations,
        setConversations,
        activeConversation,
        messages,
        setMessages,
        onlineUsers,
        typingUsers,
        loadingConversations,
        loadingMessages,
        selectConversation,
        loadConversations,
        addMessage,
        isUserOnline,
        replyTo,
        setReplyTo,
        scrollStateRef,
        markReadOnView,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
