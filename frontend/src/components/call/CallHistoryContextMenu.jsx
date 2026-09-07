import React, { useEffect, useRef } from 'react';

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.8 19.8 0 0 1 1.63 4.35 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.9a16 16 0 0 0 6.1 6.1l1.06-.95a2 2 0 0 1 2.12-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const VideoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="m16 10 5-3v10l-5-3z" />
  </svg>
);

const DeleteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ClearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7" />
  </svg>
);

const CallHistoryContextMenu = ({ x, y, onClose, onAudio, onVideo, onDelete, onClear }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) onClose();
    };
    const escape = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [onClose]);

  useEffect(() => {
    const rect = menuRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (rect.right > window.innerWidth) menuRef.current.style.left = `${window.innerWidth - rect.width - 8}px`;
    if (rect.bottom > window.innerHeight) menuRef.current.style.top = `${window.innerHeight - rect.height - 8}px`;
  }, [x, y]);

  const action = (callback) => { callback(); onClose(); };
  return (
    <div ref={menuRef} className="conversation-context-menu call-context-menu" style={{ top: y, left: x }}>
      <button className="conversation-context-item" onClick={() => action(onAudio)}><PhoneIcon />Call again</button>
      <button className="conversation-context-item" onClick={() => action(onVideo)}><VideoIcon />Video call</button>
      <div className="context-menu-divider" />
      <button className="conversation-context-item context-menu-danger" onClick={() => action(onDelete)}><DeleteIcon />Delete call</button>
      <button className="conversation-context-item context-menu-danger" onClick={() => action(onClear)}><ClearIcon />Clear call history</button>
    </div>
  );
};

export default CallHistoryContextMenu;
