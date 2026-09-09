import React, { useEffect, useRef } from 'react';

const MenuIcon = ({ type }) => {
  if (type === 'clear') return <span aria-hidden="true">⌫</span>;
  if (type === 'delete') return <span aria-hidden="true">🗑</span>;
  return <span aria-hidden="true">⊘</span>;
};

const ConversationContextMenu = ({ x, y, deleteLabel = 'Delete user', blockLabel = 'Block user', onClose, onClear, onDelete, onBlock }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) onClose();
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = `${window.innerWidth - rect.width - 8}px`;
    if (rect.bottom > window.innerHeight) menu.style.top = `${window.innerHeight - rect.height - 8}px`;
  }, [x, y]);

  const action = (callback) => {
    callback();
    onClose();
  };

  return (
    <div ref={menuRef} className="conversation-context-menu" style={{ top: y, left: x }}>
      <button className="conversation-context-item" onClick={() => action(onClear)}>
        <MenuIcon type="clear" />
        Clear all chat
      </button>
      <div className="context-menu-divider" />
      <button className="conversation-context-item context-menu-danger" onClick={() => action(onDelete)}>
        <MenuIcon type="delete" />
        {deleteLabel}
      </button>
      <button className="conversation-context-item context-menu-danger" onClick={() => action(onBlock)}>
        <MenuIcon type="block" />
        {blockLabel}
      </button>
    </div>
  );
};

export default ConversationContextMenu;
