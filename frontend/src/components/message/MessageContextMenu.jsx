import React, { useEffect, useRef } from 'react';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const MessageContextMenu = ({
  x, y, message, isSent, isGroup, isAdmin, onClose,
  onReply, onEdit, onCopy, onForward,
  onDeleteForMe, onDeleteForEveryone,
  onReact, onPin,
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) menuRef.current.style.left = `${window.innerWidth - rect.width - 8}px`;
      if (rect.bottom > window.innerHeight) menuRef.current.style.top = `${window.innerHeight - rect.height - 8}px`;
    }
  }, [x, y]);

  const handleAction = (action) => { action(); onClose(); };
  const isTextMessage = message.type === 'text' || !message.type;

  return (
    <div ref={menuRef} className="message-context-menu" style={{ top: y, left: x }}>
      {/* Quick Reactions */}
      <div className="context-menu-reactions">
        {QUICK_REACTIONS.map((emoji) => (
          <button key={emoji} className="context-reaction-btn" onClick={() => handleAction(() => onReact?.(emoji))} title={emoji}>
            {emoji}
          </button>
        ))}
      </div>

      <div className="context-menu-divider" />

      <button className="context-menu-item" onClick={() => handleAction(onReply)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
        </svg>
        Reply
      </button>

      {isTextMessage && (
        <button className="context-menu-item" onClick={() => handleAction(onCopy)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy
        </button>
      )}

      <button className="context-menu-item" onClick={() => handleAction(onForward)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/>
        </svg>
        Forward
      </button>

      {isSent && isTextMessage && (
        <button className="context-menu-item" onClick={() => handleAction(onEdit)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit
        </button>
      )}

      {isGroup && (
        <button className="context-menu-item" onClick={() => handleAction(() => onPin?.(message._id))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M12 17v5"/><path d="M9 11l-4 4h14l-4-4V5a2 2 0 0 0-2-2H11a2 2 0 0 0-2 2v6z"/>
          </svg>
          {message.pinned ? 'Unpin' : 'Pin message'}
        </button>
      )}

      <div className="context-menu-divider" />

      <button className="context-menu-item context-menu-danger" onClick={() => handleAction(onDeleteForMe)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        Delete for me
      </button>

      {/* In groups, admins can delete anyone's messages */}
      {(isSent || (isGroup && isAdmin)) && (
        <button className="context-menu-item context-menu-danger" onClick={() => handleAction(onDeleteForEveryone)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
          Delete for everyone
        </button>
      )}
    </div>
  );
};

export default MessageContextMenu;
