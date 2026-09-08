import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { StreamContext } from '../../context/StreamContext';
import Avatar from '../user/Avatar';
import { formatDistanceToNow } from 'date-fns';

const StreamChat = ({ isStreamer, onRemoveViewer, onBlockViewer }) => {
  const { user } = useContext(AuthContext);
  const { streamChatMessages, sendStreamChat, deleteStreamChatMessage, streamViewers, activeStream } = useContext(StreamContext);
  const [message, setMessage] = useState('');
  const [showMenu, setShowMenu] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamChatMessages, isAtBottom]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setIsAtBottom(atBottom);
  }, []);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendStreamChat(message.trim());
    setMessage('');
  };

  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <div className="stream-chat">
      <div className="stream-chat-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        <span>Live Chat</span>
      </div>

      {/* Viewer list (streamer only) */}
      {isStreamer && streamViewers.length > 0 && (
        <div className="stream-chat-viewers">
          <div className="stream-viewers-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span>{streamViewers.length} viewer{streamViewers.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="stream-viewers-list">
            {streamViewers.map((viewer) => (
              <div key={viewer._id} className="stream-viewer-item">
                <Avatar user={viewer} size="sm" />
                <span className="stream-viewer-name">{viewer.name}</span>
                <div className="stream-viewer-actions">
                  <button
                    className="stream-viewer-action-btn remove"
                    onClick={() => onRemoveViewer && onRemoveViewer(viewer._id)}
                    title="Remove viewer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <button
                    className="stream-viewer-action-btn block"
                    onClick={() => onBlockViewer && onBlockViewer(viewer._id)}
                    title="Block viewer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="stream-chat-messages" ref={chatContainerRef} onScroll={handleScroll}>
        {streamChatMessages.length === 0 ? (
          <div className="stream-chat-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span>No messages yet. Say something!</span>
          </div>
        ) : (
          streamChatMessages.map((msg) => (
            <div
              key={msg._id}
              className={`stream-chat-msg ${msg.userId === user?._id ? 'mine' : ''} ${activeStream?.streamer?._id === msg.userId ? 'host-msg' : ''}`}
              onMouseEnter={() => isStreamer && msg.userId !== user?._id && setShowMenu(msg._id)}
              onMouseLeave={() => setShowMenu(null)}
            >
              <Avatar user={msg.user} size="sm" />
              <div className="stream-chat-msg-content">
                <div className="stream-chat-msg-header">
                  <span className="stream-chat-msg-name">{msg.user?.name || 'User'}</span>
                  {activeStream?.streamer?._id === msg.userId && (
                    <span className="stream-chat-host-badge">HOST</span>
                  )}
                  <span className="stream-chat-msg-time">{formatTime(msg.timestamp)}</span>
                </div>
                <p className="stream-chat-msg-text">{msg.content}</p>
              </div>
              {/* Streamer moderation menu */}
              {isStreamer && showMenu === msg._id && msg.userId !== user?._id && (
                <div className="stream-chat-msg-menu">
                  <button onClick={() => { deleteStreamChatMessage(msg._id); setShowMenu(null); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="stream-chat-input" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Send a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
        />
        <button type="submit" disabled={!message.trim()} className="stream-chat-send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default StreamChat;
