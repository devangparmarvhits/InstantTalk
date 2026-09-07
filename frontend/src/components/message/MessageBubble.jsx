import React, { useState, useCallback, useContext, useRef } from 'react';
import { format } from 'date-fns';
import Avatar from '../user/Avatar';
import MessageContextMenu from './MessageContextMenu';
import { editMessage, deleteMessage, forwardMessage } from '../../services/chat.service';
import { ChatContext } from '../../context/ChatContext';
import ForwardModal from './ForwardModal';

const CheckIcon = ({ double = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {double ? (
      <>
        <polyline points="3 12 7 16 13 10"/>
        <polyline points="9 12 13 16 21 8"/>
      </>
    ) : (
      <polyline points="4 12 9 17 20 6"/>
    )}
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

const API_BASE = import.meta.env.VITE_API_URL || '';
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// Parse content — new messages use JSON {url, name}, old messages are plain URLs
const parseFileContent = (content) => {
  if (!content) return { url: '', name: 'Attachment' };
  try {
    const parsed = JSON.parse(content);
    return { url: parsed.url || '', name: parsed.name || 'Attachment' };
  } catch {
    // Legacy format — plain URL string
    return { url: content, name: content.split('/').pop() || 'Attachment' };
  }
};

const getFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const base = API_BASE || window.location.origin;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

const getCallDetails = (content) => {
  try {
    const call = JSON.parse(content || '{}');
    return {
      status: call.status === 'missed' ? 'Missed' : call.status === 'declined' ? 'Cancelled' : call.status === 'completed' ? 'Connected' : call.status,
      callType: call.callType === 'video' ? 'video' : 'audio',
      duration: Number(call.duration) > 0
        ? `${String(Math.floor(call.duration / 60)).padStart(2, '0')}:${String(call.duration % 60).padStart(2, '0')}`
        : '',
      isGroup: !!call.isGroup,
      participantCount: call.participantCount || 0,
    };
  } catch {
    return { status: 'Call', callType: 'audio', duration: '', isGroup: false, participantCount: 0 };
  }
};

const CallIcon = ({ callType }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {callType === 'video' ? (
      <>
        <rect x="3" y="6" width="13" height="12" rx="2" />
        <path d="m16 10 5-3v10l-5-3z" />
      </>
    ) : (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.63 4.35 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.9a16 16 0 0 0 6.1 6.1l1.06-.95a2 2 0 0 1 2.12-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    )}
  </svg>
);

const MessageBubble = ({ message, isSent, showAvatar, user, onReply, isGroup, isAdmin, onReact, onPin }) => {
  const { messages, setMessages } = useContext(ChatContext) || {};
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content || '');
  const [showForward, setShowForward] = useState(false);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const bubbleRef = useRef(null);
  const menuBtnRef = useRef(null);

  const timeStr = message.createdAt ? format(new Date(message.createdAt), 'h:mm a') : '';

  // Message status: sent → delivered → read
  const isDelivered = !!message.deliveredAt;
  const isRead = !!message.readAt;
  const readTimeStr = message.readAt ? format(new Date(message.readAt), 'h:mm a') : '';
  const readTitle = message.readAt
    ? `Read on ${format(new Date(message.readAt), 'MMMM d, yyyy, h:mm a')}`
    : '';

  const handleMenuToggle = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ x: rect.left, y: rect.top });
    }
    setShowMenu((prev) => !prev);
  }, []);

  const handleCopy = useCallback(() => {
    if (message.content) {
      navigator.clipboard.writeText(message.content).catch(() => {});
    }
  }, [message.content]);

  const handleReply = useCallback(() => {
    if (onReply) onReply(message);
  }, [onReply, message]);

  const handleEdit = useCallback(() => {
    setEditText(message.content || '');
    setIsEditing(true);
  }, [message.content]);

  const handleEditSave = useCallback(async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.content) {
      setIsEditing(false);
      return;
    }
    try {
      await editMessage(message._id, trimmed);
      // Update local state
      if (setMessages) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === message._id
              ? { ...m, content: trimmed, editedAt: new Date().toISOString() }
              : m
          )
        );
      }
    } catch (err) {
      console.error('Edit failed:', err);
    } finally {
      setIsEditing(false);
    }
  }, [editText, message._id, message.content, setMessages]);

  const handleEditKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  }, [handleEditSave]);

  const handleDeleteForMe = useCallback(async () => {
    try {
      await deleteMessage(message._id, false);
      if (setMessages) {
        setMessages((prev) => prev.filter((m) => m._id !== message._id));
      }
    } catch (err) {
      console.error('Delete for me failed:', err);
    }
  }, [message._id, setMessages]);

  const handleDeleteForEveryone = useCallback(async () => {
    try {
      await deleteMessage(message._id, true);
      // The socket event will handle UI update
    } catch (err) {
      console.error('Delete for everyone failed:', err);
    }
  }, [message._id]);

  const handleForward = useCallback(() => {
    setShowForward(true);
  }, []);

  const handleBubbleMouseLeave = useCallback((e) => {
    const related = e.relatedTarget;
    if (related && e.currentTarget.contains(related)) return;
    setShowQuickReactions(false);
  }, []);

  const handleForwardSelect = useCallback(async (conversationIds) => {
    try {
      await forwardMessage(message._id, conversationIds);
    } catch (err) {
      console.error('Forward failed:', err);
    }
  }, [message._id]);

  // Render reply preview
  const renderReplyPreview = () => {
    if (!message.replyTo) return null;
    const repliedMsg = message.replyTo;
    // repliedMsg could be an ObjectId string (populate failed or deleted doc)
    if (typeof repliedMsg === 'string') return null;

    const isDeleted = repliedMsg.deleted || (!repliedMsg.content && repliedMsg.type !== 'image' && repliedMsg.type !== 'file');
    // sender can be populated object or plain id string
    const senderName = (typeof repliedMsg.sender === 'object' && repliedMsg.sender?.name)
      ? repliedMsg.sender.name
      : (isDeleted ? '' : 'Message');
    let previewText = '';
    if (isDeleted) {
      previewText = '🚫 This message was deleted';
    } else {
      previewText = repliedMsg.content || '';
      if (!previewText) {
        if (repliedMsg.type === 'image') previewText = '📷 Image';
        else if (repliedMsg.type === 'file') previewText = '📎 File';
        else previewText = 'Message';
      }
    }
    const repliedId = repliedMsg._id || repliedMsg;

    const scrollToOriginal = (e) => {
      e.stopPropagation();
      const el = document.getElementById(`msg-${repliedId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('message-highlight');
        setTimeout(() => el.classList.remove('message-highlight'), 1500);
      }
    };

    return (
      <div className={`reply-preview ${isDeleted ? 'reply-deleted' : ''}`} onClick={scrollToOriginal}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {senderName && <div className="reply-preview-name">{senderName}</div>}
          <div className="reply-preview-text">{previewText}</div>
        </div>
      </div>
    );
  };

  const hasReactions = !!message.reactions && Object.keys(message.reactions).length > 0;

  const renderContent = () => {
    if (message.type === 'call') {
      const call = getCallDetails(message.content);
      const callTitle = call.isGroup
        ? (call.callType === 'video' ? 'Group video call' : 'Group voice call')
        : (call.callType === 'video' ? 'Video call' : 'Voice call');
      return (
        <div className={`call-message-log ${call.callType} ${call.isGroup ? 'group' : ''}`}>
          <span className="call-message-icon"><CallIcon callType={call.callType} /></span>
          <span className="call-message-details">
            <strong>{callTitle}</strong>
            <span className={call.status === 'Missed' ? 'call-message-missed' : ''}>
              {call.status}{call.isGroup && call.participantCount ? ` · ${call.participantCount} participants` : ''}{call.duration ? ` · ${call.duration}` : ''}
            </span>
          </span>
        </div>
      );
    }

    if (message.type === 'image') {
      const { url } = parseFileContent(message.content);
      const src = getFileUrl(url);
      return (
        <img
          src={src}
          alt="attachment"
          style={{
            maxWidth: '250px',
            maxHeight: '250px',
            borderRadius: 'var(--radius-md)',
            display: 'block',
            objectFit: 'cover',
          }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      );
    }

    if (message.type === 'file') {
      const { url, name } = parseFileContent(message.content);
      return (
        <a
          href={getFileUrl(url)}
          target="_blank"
          rel="noopener noreferrer"
          className={`file-attachment ${isSent ? 'sent' : 'received'}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            color: 'inherit',
            background: isSent ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ display: 'inline-flex', opacity: 0.9 }}><FileIcon /></span>
          <span className="file-attachment-name" style={{ fontSize: '14px', wordBreak: 'break-all' }}>
            {name}
          </span>
        </a>
      );
    }

    // Text message — allow editing
    if (isEditing) {
      return (
        <div style={{ width: '100%' }}>
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleEditSave}
            autoFocus
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'inherit',
              fontSize: 'inherit',
              fontFamily: 'inherit',
            }}
          />
        </div>
      );
    }

    return (
      <>
        {message.content}
        {message.editedAt && <span className="message-edited">(edited)</span>}
      </>
    );
  };

  // Check if message was deleted for everyone
  if (message.deleted && !message.content) {
    return (
      <div className={`message-row ${isSent ? 'sent' : 'received'}`}>
        {!isSent && showAvatar && <Avatar user={user} size="sm" />}
        {!isSent && !showAvatar && <div style={{ width: 36, flexShrink: 0 }} />}
        <div className="message-bubble" style={{ opacity: 0.6, fontStyle: 'italic' }}>
          <span style={{ fontSize: 13 }}>This message was deleted</span>
        </div>
      </div>
    );
  }    return (
      <div
        className={`message-row ${isSent ? 'sent' : 'received'}`}
        id={`msg-${message._id}`}
      >
        {!isSent && showAvatar && (
          <Avatar user={user} size="sm" />
        )}
        {!isSent && !showAvatar && (
          <div style={{ width: 36, flexShrink: 0 }} />
        )}

        <div
          className={`message-bubble-wrapper ${showQuickReactions ? 'show-reactions' : ''}`}
          onMouseEnter={() => setShowQuickReactions(true)}
          onMouseLeave={handleBubbleMouseLeave}
        >
        <div
          className="message-bubble"
          ref={bubbleRef}
        >
          {message.pinned && isGroup && (
            <div className="message-pinned-indicator">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="M9 11l-4 4h14l-4-4V5a2 2 0 0 0-2-2H11a2 2 0 0 0-2 2v6z"/></svg>
              Pinned
            </div>
          )}
          {renderReplyPreview()}
          {renderContent()}
          <div className="message-meta">
            <span className="message-time">{timeStr}</span>
            {isSent && (
              <>
                {isRead && <span className="message-read-time">Read {readTimeStr}</span>}
                <span
                  className={`message-status ${isRead ? 'read' : ''}`}
                  title={readTitle}
                >
                  {isRead || isDelivered ? <CheckIcon double /> : <CheckIcon />}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Three-dot menu button — shows on hover */}
        <button
          ref={menuBtnRef}
          className="message-menu-btn"
          onClick={handleMenuToggle}
          title="Message options"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="19" r="2"/>
          </svg>
        </button>

        <div
          className="message-quick-reactions"
          aria-label="Quick reactions"
          onMouseEnter={() => setShowQuickReactions(true)}
          onMouseLeave={(e) => {
            const related = e.relatedTarget;
            if (related && e.currentTarget.parentElement?.contains(related)) return;
            setShowQuickReactions(false);
          }}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <button key={emoji} onClick={() => onReact?.(emoji)} title={`React ${emoji}`}>
              {emoji}
            </button>
          ))}
        </div>

      {/* Reactions — OUTSIDE bubble, below it (WhatsApp style) */}
      {hasReactions && (
        <div className="message-reactions">
          {Object.entries(message.reactions).map(([emoji, users]) => {
            const hasReacted = users.some((u) => (u._id || u)?.toString() === user?._id);
            return (
              <span key={emoji} className={`message-reaction ${hasReacted ? 'active' : ''}`} onClick={() => onReact?.(emoji)}>
                <span>{emoji}</span>
                <span className="message-reaction-count">{users.length}</span>
              </span>
            );
          })}
        </div>
      )}
      </div>

      {showMenu && (
        <MessageContextMenu
          x={menuPos.x}
          y={menuPos.y}
          message={message}
          isSent={isSent}
          isGroup={isGroup}
          isAdmin={isAdmin}
          onClose={() => setShowMenu(false)}
          onReply={handleReply}
          onEdit={handleEdit}
          onCopy={handleCopy}
          onForward={handleForward}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForEveryone={handleDeleteForEveryone}
          onReact={onReact}
          onPin={onPin}
        />
      )}

      {showForward && (
        <ForwardModal
          onSelect={handleForwardSelect}
          onClose={() => setShowForward(false)}
        />
      )}
    </div>
  );
};

const areMessagePropsEqual = (previous, next) => (
  previous.message === next.message &&
  previous.isSent === next.isSent &&
  previous.showAvatar === next.showAvatar &&
  previous.user === next.user &&
  previous.isGroup === next.isGroup &&
  previous.isAdmin === next.isAdmin
);

export default React.memo(MessageBubble, areMessagePropsEqual);
