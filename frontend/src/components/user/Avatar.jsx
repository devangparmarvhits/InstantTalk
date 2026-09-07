import React from 'react';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const Avatar = ({ user, size = 'md', showStatus = false, isOnline = false, className = '' }) => {
  const sizeClass = `avatar-${size}`;
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className={`avatar-wrapper ${className}`}>
      {user?.avatar ? (
        <img
          src={user.avatar.startsWith('http') ? user.avatar : `${API_BASE}${user.avatar}`}
          alt={user.name}
          className={`avatar ${sizeClass}`}
        />
      ) : (
        <div className={`avatar-placeholder ${sizeClass}`}>
          {initials}
        </div>
      )}
      {showStatus && (
        <span className={`status-dot ${isOnline ? 'online' : ''}`} />
      )}
    </div>
  );
};

export default Avatar;
