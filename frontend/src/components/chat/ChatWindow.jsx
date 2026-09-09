import React, { useContext, useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { ChatContext } from '../../context/ChatContext';
import { AuthContext } from '../../context/AuthContext';
import { CallContext } from '../../context/CallContext';
import { GroupCallContext } from '../../context/GroupCallContext';
import ChatHeader from './ChatHeader';
import MessageBubble from '../message/MessageBubble';
import MessageInput from '../message/MessageInput';
import { format, isToday, isYesterday } from 'date-fns';
import { getPinnedMessages, searchMessages, togglePinMessage, toggleReaction, promoteToAdmin, demoteFromAdmin, getGroupById, addMembers, removeMember, leaveGroup, deleteGroup } from '../../services/group.service';
import { getUsers } from '../../services/chat.service';

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 0 2 2z"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const formatDateLabel = (dateStr) => {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
};

const groupMessagesByDate = (messages) => {
  const groups = [];
  let currentDate = null;
  let currentGroup = null;
  messages.forEach((msg) => {
    const dateLabel = msg.createdAt ? formatDateLabel(msg.createdAt) : 'Today';
    if (dateLabel !== currentDate) {
      currentDate = dateLabel;
      currentGroup = { date: dateLabel, messages: [] };
      groups.push(currentGroup);
    }
    currentGroup.messages.push(msg);
  });
  return groups;
};

const getUnreadForUser = (unreadCount, userId) => {
  if (!unreadCount || !userId) return 0;
  const value = typeof unreadCount.get === 'function'
    ? unreadCount.get(userId)
    : unreadCount[userId];
  return Number(value) || 0;
};

const TypingIndicator = ({ user }) => (
  <div className="typing-indicator">
    <div className="typing-dots">
      <div className="typing-dot" />
      <div className="typing-dot" />
      <div className="typing-dot" />
    </div>
    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
      {user?.name || 'Someone'} is typing...
    </span>
  </div>
);

const ChatWindow = () => {
  const { activeConversation, messages, loadingMessages, typingUsers, isUserOnline, setReplyTo, markReadOnView, setMessages, conversations, setConversations } = useContext(ChatContext);
  const { user } = useContext(AuthContext);
  const { call, startCall, endCall } = useContext(CallContext) || {};
  const { groupCall, startGroupCall } = useContext(GroupCallContext) || {};
  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const prevMsgCountRef = useRef(0);
  const wasEmptyRef = useRef(true);
  const initialUnreadRef = useRef(0);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Group feature panels
  const [showSearch, setShowSearch] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);

  const isGroup = activeConversation?.isGroup;
  const isAdmin = isGroup && (
    activeConversation.admins?.some((a) => (a._id || a)?.toString() === user?._id) ||
    activeConversation.createdBy?._id?.toString() === user?._id ||
    activeConversation.createdBy?.toString() === user?._id
  );

  const handleReply = (message) => setReplyTo(message);

  // Live unread count from conversations state (updated by socket via applyNewMessageToConversations)
  const activeConvInList = conversations.find(c => c._id === activeConversation?._id) || null;
  const socketUnread = getUnreadForUser(activeConvInList?.unreadCount, user?._id)
    || getUnreadForUser(activeConversation?.unreadCount, user?._id);

  // IntersectionObserver: reliably track whether user is at bottom
  const [isAtBottom, setIsAtBottom] = useState(true);
  useEffect(() => {
    const endEl = messagesEndRef.current;
    if (!endEl) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsAtBottom(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(endEl);
    return () => observer.disconnect();
  }, [activeConversation?._id, messages.length]);

  const isNearBottom = useCallback(() => {
    const el = messagesAreaRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = messagesAreaRef.current;
    if (!el) return;

    // Only scroll the NEW messages region, not the entire chat.
    // New messages start at index prevMsgCountRef.current.
    // Find the first new message DOM element by querying all message bubbles
    // in order, then scroll from just above it to the bottom.
    const firstNewMsgIndex = prevMsgCountRef.current;
    // Query all message-row elements in DOM order (excludes date dividers and typing indicator)
    const msgEls = el.querySelectorAll('.message-row');
    const firstNewMsgEl = msgEls[firstNewMsgIndex];

    const targetScroll = el.scrollHeight;
    let scrollStart;
    if (firstNewMsgEl) {
      // Position the first new message at the bottom edge of the viewport
      // so it's the first thing the user sees as scrolling begins.
      const firstMsgBottom = firstNewMsgEl.offsetTop + firstNewMsgEl.offsetHeight;
      scrollStart = firstMsgBottom - el.clientHeight;
      // Important: do NOT clamp to current scrollTop.
      // If first new message is above current view, we jump to it instantly
      // (non-animated), then animate only through the new messages.
    } else {
      scrollStart = el.scrollTop;
    }

    // If the first new message is NOT in the current viewport,
    // instantly jump to it first (no animation).
    // This ensures we never scroll through old messages.
    // Then animate only through the new messages region.
    if (scrollStart !== el.scrollTop) {
      el.scrollTop = scrollStart;
    }

    const distance = targetScroll - el.scrollTop;
    if (distance <= 0) {
      setShowNewMsg(false);
      setUnreadCount(0);
      markReadOnView();
      return;
    }
    const stepCount = Math.min(40, Math.max(1, Math.ceil(distance / 25)));
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / stepCount;
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      el.scrollTop = scrollStart + distance * eased;
      if (step >= stepCount) {
        clearInterval(interval);
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
          setShowNewMsg(false);
          setUnreadCount(0);
          markReadOnView();
        });
      }
    }, 25);
  }, [markReadOnView]);

  useEffect(() => {
    const el = messagesAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      if (isNearBottom()) {
        setShowNewMsg(false);
        setUnreadCount(0);
        markReadOnView();
      }
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isNearBottom, activeConversation?._id, markReadOnView]);

  // When a socket message bumps unreadCount → show arrow (scrolled up) or auto-scroll (at bottom)
  useEffect(() => {
    if (wasEmptyRef.current) return;
    if (socketUnread > 0) {
      if (isAtBottom) {
        scrollToBottom();
      } else {
        setShowNewMsg(true);
        setUnreadCount((current) => Math.max(current, socketUnread));
      }
    }
  }, [socketUnread, isAtBottom, scrollToBottom]);

  useEffect(() => {
    initialUnreadRef.current = socketUnread;
    setShowNewMsg(false);
    setUnreadCount(0);
    prevMsgCountRef.current = 0;
    wasEmptyRef.current = true;
    setShowSearch(false);
    setShowPinned(false);
    setShowInfoPanel(false);
  }, [activeConversation?._id]);

  useLayoutEffect(() => {
    if (wasEmptyRef.current && messages.length > 0) {
      const el = messagesAreaRef.current;
      const unreadOnOpen = initialUnreadRef.current;
      const contentFitsViewport = el && el.scrollHeight <= el.clientHeight + 8;
      if (unreadOnOpen > 0 && !contentFitsViewport) {
        if (el) el.scrollTop = 0;
        setShowNewMsg(true);
        setUnreadCount(unreadOnOpen);
      } else if (el) {
        el.scrollTop = el.scrollHeight;
        setShowNewMsg(false);
        setUnreadCount(0);
      }
      prevMsgCountRef.current = messages.length;
      wasEmptyRef.current = false;
      if (unreadOnOpen === 0) markReadOnView();
    }
    if (messages.length === 0) wasEmptyRef.current = true;
  }, [messages, markReadOnView]);

  useEffect(() => {
    if (loadingMessages) return;
    if (!messages.length) return;
    const newMsgAdded = messages.length > prevMsgCountRef.current;
    if (newMsgAdded) {
      const myId = user?._id?.toString();
      const newMessages = messages.slice(prevMsgCountRef.current);
      const hasMyMsg = newMessages.some(m => (m.sender?._id?.toString() || m.sender?.toString()) === myId);
      if (hasMyMsg) {
        scrollToBottom();
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, loadingMessages, user, scrollToBottom]);

  // Group: Search messages
  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    if (!isGroup) {
      const query = q.trim().toLowerCase();
      setSearchResults(messages.filter((message) => (message.content || '').toLowerCase().includes(query)));
      return;
    }
    setSearching(true);
    try {
      const res = await searchMessages(activeConversation._id, q);
      setSearchResults(res.data.messages || []);
    } catch (err) { console.error(err); }
    setSearching(false);
  };

  // Group: Load pinned messages
  const loadPinned = async () => {
    if (!isGroup) return;
    try {
      const res = await getPinnedMessages(activeConversation._id);
      setPinnedMessages(res.data.messages || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (showPinned) loadPinned();
  }, [showPinned, activeConversation?._id]);

  // Group: Toggle pin
  const handlePin = async (messageId) => {
    try {
      await togglePinMessage(messageId, activeConversation._id);
      loadPinned();
    } catch (err) { console.error(err); }
  };

  // Group: Toggle reaction
  const handleReact = async (messageId, emoji) => {
    try {
      await toggleReaction(messageId, emoji);
    } catch (err) { console.error(err); }
  };

  // Scroll to a specific message
  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('message-highlight');
      setTimeout(() => el.classList.remove('message_highlight'), 1500);
    }
  };

  const other = isGroup ? null : activeConversation?.participants?.find((p) => p._id !== user?._id);
  const isTyping = activeConversation ? !!typingUsers[activeConversation._id] : false;
  const isCallActive = call && call.status !== 'idle';
  const isGroupCallActive = groupCall && groupCall.status !== 'idle';
  const shouldShowNewMessage = showNewMsg && !isCallActive && !isGroupCallActive;

  // Call handlers using global call context
  const handleStartVoiceCall = () => {
    if (!isGroup && other && activeConversation) {
      startCall(activeConversation._id, other._id, 'audio', other);
    }
  };

  const handleStartVideoCall = () => {
    if (!isGroup && other && activeConversation) {
      startCall(activeConversation._id, other._id, 'video', other);
    }
  };

  // Group call handlers
  const handleStartGroupVoiceCall = () => {
    if (isGroup && activeConversation && startGroupCall) {
      startGroupCall(activeConversation._id, 'audio', activeConversation.groupName);
    }
  };

  const handleStartGroupVideoCall = () => {
    if (isGroup && activeConversation && startGroupCall) {
      startGroupCall(activeConversation._id, 'video', activeConversation.groupName);
    }
  };

  if (!activeConversation) {
    return (
      <div className="chat-window">
        <div className="empty-state">
          <div className="empty-state-icon"><ChatIcon /></div>
          <h3>Welcome to InstantTalk</h3>
          <p>Select a conversation to start messaging, or start a new chat using the compose button.</p>
        </div>
      </div>
    );
  }

  const groups = groupMessagesByDate(messages);

  return (
    <div className={`chat-window ${(isCallActive || isGroupCallActive) ? 'call-overlay-active' : ''}`} style={{ position: 'relative' }}>
      <ChatHeader
        onToggleInfoPanel={() => setShowInfoPanel(!showInfoPanel)}
        onToggleSearch={() => { setShowSearch(!showSearch); setShowPinned(false); }}
        onTogglePinned={() => { setShowPinned(!showPinned); setShowSearch(false); }}
        onStartVoiceCall={handleStartVoiceCall}
        onStartVideoCall={handleStartVideoCall}
        onStartGroupVoiceCall={handleStartGroupVoiceCall}
        onStartGroupVideoCall={handleStartGroupVideoCall}
        callBusy={isCallActive}
        groupCallBusy={groupCall && groupCall.status !== 'idle'}
      />

      {/* Search Panel */}
      {showSearch && (
        <div className="search-panel">
          <div className="panel-header">
            <h3>Search Messages</h3>
            <button className="panel-close" onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}><CloseIcon /></button>
          </div>
          <div style={{ padding: '12px 12px 0' }}>
            <input className="panel-search-input" type="text" placeholder="Search in conversation..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} autoFocus />
          </div>
          <div className="panel-body">
            {searching && <div style={{ textAlign: 'center', padding: 16 }}><div className="loading-spinner" style={{ borderTopColor: 'var(--accent-primary)', width: 22, height: 22 }} /></div>}
            {!searching && searchResults.length === 0 && searchQuery && (
              <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No messages found</div>
            )}
            {searchResults.map((msg) => (
              <div key={msg._id} className="search-result-item" onClick={() => { scrollToMessage(msg._id); setShowSearch(false); }}>
                <div className="search-result-sender">{msg.sender?.name || 'Unknown'}</div>
                <div className="search-result-text">{msg.content}</div>
                <div className="pinned-msg-time">{msg.createdAt ? format(new Date(msg.createdAt), 'MMM d, h:mm a') : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pinned Messages Panel */}
      {showPinned && (
        <div className="pinned-panel">
          <div className="panel-header">
            <h3>Pinned Messages</h3>
            <button className="panel-close" onClick={() => setShowPinned(false)}><CloseIcon /></button>
          </div>
          <div className="panel-body">
            {pinnedMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No pinned messages</div>
            ) : (
              pinnedMessages.map((msg) => (
                <div key={msg._id} className="pinned-msg-item" onClick={() => { scrollToMessage(msg._id); setShowPinned(false); }}>
                  <div className="pinned-msg-sender">{msg.sender?.name || 'Unknown'}</div>
                  <div className="pinned-msg-text">{msg.content || (msg.type === 'image' ? 'Image' : msg.type === 'file' ? 'File' : '')}</div>
                  <div className="pinned-msg-time">{msg.createdAt ? format(new Date(msg.createdAt), 'MMM d, h:mm a') : ''}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Info Panel */}
      {showInfoPanel && isGroup && (
        <GroupInfoSidePanel
          group={activeConversation}
          user={user}
          onClose={() => setShowInfoPanel(false)}
          onToggleAdmin={async (memberId, isCurrentlyAdmin) => {
            try {
              if (isCurrentlyAdmin) await demoteFromAdmin(activeConversation._id, memberId);
              else await promoteToAdmin(activeConversation._id, memberId);
              const fresh = await getGroupById(activeConversation._id);
              const updated = fresh.data.group;
              setActiveConversation(updated);
              setConversations((prev) => prev.map((c) => c._id === updated._id ? { ...c, admins: updated.admins } : c));
            } catch (err) { console.error(err); }
          }}
          onRemoveMember={async (memberId) => {
            try {
              await removeMember(activeConversation._id, memberId);
              const fresh = await getGroupById(activeConversation._id);
              const updated = fresh.data.group;
              setActiveConversation(updated);
              setConversations((prev) => prev.map((c) => c._id === updated._id ? { ...c, participants: updated.participants } : c));
            } catch (err) { console.error(err); }
          }}
          onAddMembers={() => setShowAddMembers(true)}
          onDeleteGroup={() => setShowDeleteConfirm(true)}
        />
      )}

      {/* Add Members Modal */}
      {showAddMembers && isGroup && (
        <AddMembersModal
          group={activeConversation}
          onClose={() => setShowAddMembers(false)}
          onAdded={async () => {
            setShowAddMembers(false);
            try {               const fresh = await getGroupById(activeConversation._id);
              setActiveConversation(fresh.data.group);
            } catch (err) { console.error(err); }
          }}
        />
      )}

      {/* Delete Group Confirmation */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content conversation-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Delete {activeConversation?.groupName || 'this group'}?</h3>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>&times;</button>
            </div>
            <p className="conversation-confirm-message">This group and all its messages will be permanently deleted.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={async () => {
                try {
                  await deleteGroup(activeConversation._id);
                  setShowDeleteConfirm(false);
                  setShowInfoPanel(false);
                  setActiveConversation(null);
                } catch (err) { console.error(err); }
              }}>Delete group</button>
            </div>
          </div>
        </div>
      )}

      <div className="messages-area" ref={messagesAreaRef}>
        {loadingMessages ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '20px 0' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`skeleton-msg-row ${i % 2 === 0 ? 'sent' : ''}`}>
                {i % 2 !== 0 && <div className="skeleton skeleton-avatar" style={{ width: 36, height: 36 }} />}
                <div className={`skeleton skeleton-bubble w${[120,180,240,160,100][i-1]}`} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No messages yet. Say hello! 👋
          </div>
        ) : (
          groups.map((group) => (
            <React.Fragment key={group.date}>
              <div className="messages-date-divider"><span>{group.date}</span></div>
              {group.messages.map((msg, idx) => {
                const isSent = msg.sender?._id === user?._id || msg.sender === user?._id;
                const senderUser = msg.sender?._id ? msg.sender : (isGroup ? null : other);
                const prevMsg = group.messages[idx - 1];
                const showAvatar = !isSent && (idx === 0 || prevMsg?.sender?._id !== msg.sender?._id);

                return (
                  <MessageBubble
                    key={msg._id}
                    message={msg}
                    isSent={isSent}
                    showAvatar={showAvatar}
                    user={senderUser}
                    onReply={handleReply}
                    isGroup={isGroup}
                    isAdmin={isAdmin}
                    onReact={(emoji) => handleReact(msg._id, emoji)}
                    onPin={handlePin}
                  />
                );
              })}
            </React.Fragment>
          ))
        )}


        {isTyping && <TypingIndicator user={isGroup ? null : other} />}
        <div ref={messagesEndRef} />
      </div>

      {shouldShowNewMessage && (
        <button className="new-msg-arrow" onClick={scrollToBottom}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          <span>{unreadCount} New {unreadCount === 1 ? 'Message' : 'Messages'}</span>
        </button>
      )}

      <MessageInput />
    </div>
  );
};

/* ═══ Group Info Side Panel ═══ */
const GroupInfoSidePanel = ({ group, user, onClose, onToggleAdmin, onRemoveMember, onAddMembers, onDeleteGroup }) => {
  const currentUserId = user?._id?.toString();
  const creatorId = (group.createdBy?._id || group.createdBy)?.toString();
  const isCreator = !!currentUserId && creatorId === currentUserId;
  const isAdmin = group.admins?.some((a) => (a._id || a)?.toString() === currentUserId) || isCreator;

  return (
    <div className="pinned-panel" style={{ width: 300, bottom: 64, top: 0 }}>
      <div className="panel-header">
        <h3>Group Info</h3>
        <button className="panel-close" onClick={onClose}><CloseIcon /></button>
      </div>
      <div className="panel-body" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {/* Group avatar + name */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 24, fontWeight: 700, color: '#fff' }}>
            {(group.groupName || 'G')[0].toUpperCase()}
          </div>
          <h3 style={{ marginTop: 8, fontSize: 16, fontWeight: 700 }}>{group.groupName}</h3>
          {group.groupDescription && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{group.groupDescription}</p>}
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Created by {group.createdBy?.name || 'Unknown'}
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {isAdmin && (
            <button className="btn btn-primary" onClick={onAddMembers} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 14px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Members
            </button>
          )}
          {!isCreator && (
            <button className="btn btn-secondary" onClick={async () => { try { await leaveGroup(group._id); onClose(); } catch (err) { console.error(err); } }} style={{ color: 'var(--danger)', fontSize: 13, padding: '6px 14px' }}>
              Leave Group
            </button>
          )}
          {isCreator && (
            <button className="btn btn-secondary" onClick={onDeleteGroup} style={{ color: 'var(--danger)', fontSize: 13, padding: '6px 14px' }}>
              Delete Group
            </button>
          )}
        </div>

        {/* Members */}
        <div className="group-info-section">
          <div className="group-info-label">Members ({group.participants?.length || 0})</div>
          {(group.participants || []).map((p) => {
            const memberId = (p._id || p).toString();
            const isMemberCreator = (group.createdBy?._id || group.createdBy)?.toString() === memberId;
            const isMemberAdmin = group.admins?.some((a) => (a._id || a)?.toString() === memberId);
            const isMe = user?._id?.toString() === memberId;

            return (
              <div key={memberId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {(p.name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name || 'Unknown'}{isMe ? ' (You)' : ''}
                  </div>
                  {isMemberCreator && <span style={{ fontSize: 10, color: 'var(--accent-primary)' }}>Creator</span>}
                  {isMemberAdmin && !isMemberCreator && <span style={{ fontSize: 10, color: 'var(--warning)' }}>Admin</span>}
                </div>
                {isAdmin && !isMe && !isMemberCreator && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => onToggleAdmin(memberId, isMemberAdmin)}
                      style={{ background: 'none', border: 'none', color: isMemberAdmin ? 'var(--warning)' : 'var(--accent-primary)', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.target.style.background = 'var(--bg-active)'}
                      onMouseLeave={(e) => e.target.style.background = 'none'}
                      title={isMemberAdmin ? 'Remove admin' : 'Make admin'}
                    >
                      {isMemberAdmin ? 'Demote' : 'Promote'}
                    </button>
                    {onRemoveMember && (
                      <button
                        onClick={() => onRemoveMember(memberId)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 3, borderRadius: 4 }}
                        title="Remove member"
                      >
                        <CloseIcon />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ═══ Add Members Modal (for ChatWindow) ═══ */
const AddMembersModal = ({ group, onClose, onAdded }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getUsers().then((data) => setAllUsers(data.data.users || [])).catch(() => setAllUsers([]));
  }, []);

  const memberIds = (group.participants || []).map((p) => (p._id || p).toString());
  const filtered = allUsers.filter((u) =>
    !memberIds.includes(u._id) &&
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleMember = (u) => {
    setSelected((prev) =>
      prev.some((s) => s._id === u._id) ? prev.filter((s) => s._id !== u._id) : [...prev, u]
    );
  };

  const handleAdd = async () => {
    if (selected.length === 0) return;
    setSubmitting(true);
    try {
      await addMembers(group._id, selected.map((s) => s._id));
      onAdded();
    } catch (err) { console.error(err); } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Members</h3>
          <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="search-input-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search people..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
        </div>
        <div className="user-list" style={{ maxHeight: 260, overflowY: 'auto', marginTop: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No more users to add</div>
          ) : (
            filtered.map((u) => {
              const isSelected = selected.some((s) => s._id === u._id);
              return (
                <div key={u._id} className={`group-member-item ${isSelected ? 'selected' : ''}`} onClick={() => toggleMember(u)}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {(u.name || '?')[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{u.name}</span>
                  <span style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)', fontSize: 11 }}>
                    {isSelected ? '✓ Selected' : ''}
                  </span>
                </div>
              );
            })
          )}
        </div>
        <div className="modal-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={submitting || selected.length === 0}>
            {submitting ? 'Adding...' : `Add ${selected.length || ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
