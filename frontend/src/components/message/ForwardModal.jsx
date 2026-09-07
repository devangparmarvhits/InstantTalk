import React, { useState, useContext, useEffect } from 'react';
import { ChatContext } from '../../context/ChatContext';
import { AuthContext } from '../../context/AuthContext';

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const ForwardModal = ({ onSelect, onClose }) => {
  const { conversations } = useContext(ChatContext);
  const { user } = useContext(AuthContext);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((conv) => {
    if (!search) return true;
    const other = conv.participants?.find((p) => p._id !== user?._id);
    const name = other?.name || conv.groupName || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const toggleSelect = (convId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(convId)) {
        next.delete(convId);
      } else {
        next.add(convId);
      }
      return next;
    });
  };

  const handleForward = () => {
    if (selected.size > 0) {
      onSelect(Array.from(selected));
      onClose();
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Forward to...</span>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <input
          type="text"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none',
            marginBottom: 12,
          }}
          autoFocus
        />

        <div className="modal-list">
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: 13 }}>
              No conversations found
            </div>
          )}
          {filtered.map((conv) => {
            const other = conv.participants?.find((p) => p._id !== user?._id);
            const name = other?.name || conv.groupName || 'Unknown';
            const initial = name.charAt(0).toUpperCase();
            const isSelected = selected.has(conv._id);

            return (
              <div
                key={conv._id}
                className={`modal-list-item ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleSelect(conv._id)}
              >
                <div
                  className="modal-list-avatar"
                  style={isSelected ? { background: '#fff', color: 'var(--accent-primary)' } : {}}
                >
                  {initial}
                </div>
                <span className="modal-list-name">{name}</span>
                {isSelected && (
                  <span style={{ marginLeft: 'auto', fontSize: 18 }}>✓</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleForward}
            disabled={selected.size === 0}
          >
            Forward {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
