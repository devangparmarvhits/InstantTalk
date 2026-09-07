import React, { useState, useRef, useContext, useCallback, useEffect } from 'react';
import { ChatContext } from '../../context/ChatContext';
import { AuthContext } from '../../context/AuthContext';
import { sendMessage as sendMessageApi, uploadFile as uploadFileApi } from '../../services/chat.service';
import { getSocket } from '../../socket/socket';

const AttachIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);

const EmojiIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
    <line x1="9" y1="9" x2="9.01" y2="9"/>
    <line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const EMOJIS = ['😀', '😂', '❤️', '👍', '🔥', '🎉', '😊', '🤔', '👋', '✨', '💯', '🙏'];

const MessageInput = () => {
  const { activeConversation, setMessages, addMessage, replyTo, setReplyTo, scrollStateRef } = useContext(ChatContext);
  const { user } = useContext(AuthContext);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const isSendingRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  // Use refs for values that may be stale in async handleSend
  const textRef = useRef(text);
  const pendingFileRef = useRef(pendingFile);
  const replyToRef = useRef(replyTo);
  const activeConvRef = useRef(activeConversation);

  // Keep refs in sync
  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => { pendingFileRef.current = pendingFile; }, [pendingFile]);
  useEffect(() => { replyToRef.current = replyTo; }, [replyTo]);
  useEffect(() => { activeConvRef.current = activeConversation; }, [activeConversation]);

  // Auto focus input when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [activeConversation]);

  // Clear pending file preview when conversation changes
  useEffect(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
  }, [activeConversation]);

  const clearPendingFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket || !activeConversation) return;

    socket.emit('typing_start', { conversationId: activeConversation._id });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { conversationId: activeConversation._id });
    }, 1500);
  }, [activeConversation]);

  const handleSend = async () => {
    // Read fresh values from refs to avoid stale closures
    const content = (textRef.current || '').trim();
    const conv = activeConvRef.current;
    const file = pendingFileRef.current;
    const reply = replyToRef.current;

    if ((!content && !file) || !conv || isSendingRef.current) return;

    isSendingRef.current = true;
    const originalText = textRef.current;
    setText('');
    setShowEmoji(false);
    if (reply) setReplyTo(null);

    // Keep cursor inside input box immediately
    setTimeout(() => inputRef.current?.focus(), 0);

    const currentReplyTo = reply?._id || null;

    // Snapshot scroll state BEFORE addMessage (focus after send scrolls down)
    const messagesArea = document.getElementById('messages-area');
    const atBottom = !messagesArea || (messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight < 150);
    if (scrollStateRef) scrollStateRef.current = { isAtBottom: atBottom };

    const tempIds = [];

    // Create an optimistic (temp) message and add it to the list instantly.
    const addOptimistic = (type, optimisticContent) => {
      const temp = {
        _id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        conversationId: conv._id,
        sender: user?._id,
        content: optimisticContent,
        type,
        replyTo: reply || null,
        createdAt: new Date().toISOString(),
      };
      tempIds.push(temp._id);
      addMessage(temp);
    };

    // Replace an optimistic temp message with the confirmed real message.
    const confirmMessage = (tempId, realMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? realMessage : m))
      );
    };

    // Snapshot the chat's message list (via addMessage → ChatContext state)
    const isImage = file?.type.startsWith('image/');
    const clearFile = () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPendingFile(null);
    };
    const removeTemps = () => {
      if (!tempIds.length) return;
      setMessages((prev) => prev.filter((m) => !tempIds.includes(m._id)));
    };

    try {
      if (file) {
        const type = isImage ? 'image' : 'file';
        const optimisticContent = JSON.stringify({
          url: previewUrl || '',
          name: file.name,
        });

        const formData = new FormData();
        formData.append('file', file);
        addOptimistic(type, optimisticContent);
        const upRes = await uploadFileApi(formData);

        const fileContent = JSON.stringify({ url: upRes.data.url, name: file.name });
        const msgRes = await sendMessageApi(conv._id, fileContent, type, currentReplyTo);
        confirmMessage(tempIds[tempIds.length - 1], msgRes.data.message);
        clearFile();
      }

      if (content) {
        addOptimistic('text', content);
        // Send via socket for instant delivery (fallback to HTTP if socket unavailable)
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit('send_message', {
            conversationId: conv._id,
            content,
            type: 'text',
            replyTo: currentReplyTo,
          });
          // Socket will return 'new_message' which replaces the temp
          // Remove temp after 3s if no response (fallback cleanup)
          setTimeout(() => {
            setMessages((prev) => prev.filter((m) => !tempIds.includes(m._id)));
          }, 5000);
        } else {
          const msgRes = await sendMessageApi(conv._id, content, 'text', currentReplyTo);
          confirmMessage(tempIds[tempIds.length - 1], msgRes.data.message);
        }
      }

      const socket = getSocket();
      if (socket) {
        socket.emit('typing_stop', { conversationId: conv._id });
      }
    } catch (err) {
      console.error('Send failed:', err);
      // Remove the optimistic placeholder(s) if the send failed.
      removeTemps();
      if (content && !file) {
        setText(originalText);
      }
    } finally {
      isSendingRef.current = false;
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    setTimeout(() => inputRef.current?.focus(), 0);
    setShowEmoji(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeConversation || isSendingRef.current) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('File size should be less than 20MB');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(file);
    setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    setShowEmoji(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!activeConversation) return null;

  return (
    <div style={{ position: 'relative' }}>
      {/* File preview chip — above input row */}
      {pendingFile && (
        <div style={{ padding: '8px 16px 0', background: 'var(--bg-secondary)' }}>
          <div className="file-preview-chip">
            {previewUrl ? (
              <img src={previewUrl} alt="preview" className="file-preview-chip-img" />
            ) : (
              <div className="file-preview-chip-icon">
                <FileIcon />
              </div>
            )}
            <span className="file-preview-chip-name">{pendingFile.name}</span>
            <button className="file-preview-chip-remove" onClick={clearPendingFile} title="Remove">
              <CloseIcon />
            </button>
          </div>
        </div>
      )}

      {/* Reply bar */}
      {replyTo && (
        <div className="reply-bar">
          <div className="reply-bar-content">
            <div className="reply-bar-label">Reply to {replyTo.sender?.name || 'Message'}</div>
            <div className="reply-bar-text">{replyTo.content || (replyTo.type === 'image' ? '📷 Image' : replyTo.type === 'file' ? '📎 File' : '')}</div>
          </div>
          <button className="reply-bar-close" onClick={() => setReplyTo(null)} title="Cancel reply">
            <CloseIcon />
          </button>
        </div>
      )}

      <div className="message-input-bar" style={{ position: 'relative' }}>
      {/* Emoji picker */}
      {showEmoji && (
        <div style={{
          position: 'absolute',
          bottom: '68px',
          left: '60px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '6px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 10,
        }}>
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => insertEmoji(emoji)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--bg-active)'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <button
        id="attach-btn"
        className="input-action-btn"
        title="Attach file"
        onClick={() => fileInputRef.current?.click()}
      >
        <AttachIcon />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.mp3,.mp4"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <button
        id="emoji-btn"
        className="input-action-btn"
        title="Emoji"
        onClick={() => {
          setShowEmoji((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <EmojiIcon />
      </button>

      <div className="message-input-wrapper">
        <input
          ref={inputRef}
          id="message-input"
          type="text"
          autoComplete="off"
          placeholder={pendingFile ? 'Add a caption...' : 'Type a message...'}
          value={text}
          onChange={(e) => { setText(e.target.value); handleTyping(); }}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>

      <button
        id="send-btn"
        className="send-btn"
        onClick={handleSend}
        disabled={!text.trim() && !pendingFile}
        title="Send message"
      >
        <SendIcon />
      </button>
      </div>
    </div>
  );
};

export default MessageInput;
