import React, { useContext, useState, useEffect } from 'react';
import { ChatContext } from '../../context/ChatContext';
import { AuthContext } from '../../context/AuthContext';
import Avatar from '../user/Avatar';
import { formatLastSeen } from '../../utils/format';
import { toggleMute as toggleMuteApi, getPinnedMessages, searchMessages } from '../../services/group.service';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.63 4.35 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.9a16 16 0 0 0 6.1 6.1l1.06-.95a2 2 0 0 1 2.12-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z"/>
  </svg>
);

const VideoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
);

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M12 17v5"/><path d="M9 11l-4 4h14l-4-4V5a2 2 0 0 0-2-2H11a2 2 0 0 0-2 2v6z"/>
  </svg>
);

const MuteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
  </svg>
);

const UnmuteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const ChatHeader = ({ onToggleInfoPanel, onToggleSearch, onTogglePinned, onStartVoiceCall, onStartVideoCall, onStartGroupVoiceCall, onStartGroupVideoCall, callBusy, groupCallBusy }) => {
  const { activeConversation, isUserOnline } = useContext(ChatContext);
  const { user } = useContext(AuthContext);
  const [isMuted, setIsMuted] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // Check mute status for groups
  useEffect(() => {
    if (!activeConversation?.isGroup) return;
    const muted = activeConversation.mutedBy?.some(
      (m) => (m._id || m).toString() === user?._id
    );
    setIsMuted(!!muted);
  }, [activeConversation, user]);

  if (!activeConversation) return null;

  const isGroup = activeConversation.isGroup;

  let displayName, statusText;
  if (isGroup) {
    displayName = activeConversation.groupName || 'Group';
    statusText = `${activeConversation.participants?.length || 0} members`;
  } else {
    const other = activeConversation.participants?.find((p) => p._id !== user?._id) || {};
    displayName = other.name || 'Unknown';
    const isOnline = isUserOnline(other._id) && other.lastSeen != null;
    statusText = isOnline
      ? '\u25CF Online'
      : other.lastSeen != null ? formatLastSeen(other.lastSeen) : '';
  }

  const handleMute = async () => {
    try {
      const res = await toggleMuteApi(activeConversation._id);
      setIsMuted(res.data.muted);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="chat-header">
      <div className="chat-header-user" style={{ cursor: isGroup ? 'pointer' : 'default' }} onClick={isGroup ? onToggleInfoPanel : undefined}>
        <Avatar
          user={isGroup ? { name: activeConversation.groupName } : activeConversation.participants?.find((p) => p._id !== user?._id)}
          size="md"
          showStatus={!isGroup}
        />
        <div className="chat-header-info">
          <h3>{displayName}</h3>
          <span className={`status-text ${!isGroup && statusText.includes('Online') ? 'online' : 'offline'}`}>
            {statusText}
          </span>
        </div>
      </div>

      <div className="chat-header-actions">
        {isGroup && (
          <>
            <button id="header-group-voice-btn" className="header-action-btn" title="Voice Call" onClick={onStartGroupVoiceCall} disabled={groupCallBusy}>
              <PhoneIcon />
            </button>
            <button id="header-group-video-btn" className="header-action-btn" title="Video Call" onClick={onStartGroupVideoCall} disabled={groupCallBusy}>
              <VideoIcon />
            </button>
            <button className="header-action-btn" onClick={onToggleSearch} title="Search messages">
              <SearchIcon />
            </button>
            <button className="header-action-btn" onClick={onTogglePinned} title="Pinned messages">
              <PinIcon />
            </button>
            <button className="header-action-btn" onClick={handleMute} title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <MuteIcon /> : <UnmuteIcon />}
            </button>
            <button className="header-action-btn" onClick={onToggleInfoPanel} title="Group info">
              <UsersIcon />
            </button>
          </>
        )}
        {!isGroup && (
          <>
            <button id="header-search-btn" className="header-action-btn" onClick={onToggleSearch} title="Search messages">
              <SearchIcon />
            </button>
            <button id="header-call-btn" className="header-action-btn" title="Voice Call" onClick={onStartVoiceCall} disabled={callBusy}>
              <PhoneIcon />
            </button>
            <button id="header-video-btn" className="header-action-btn" title="Video Call" onClick={onStartVideoCall} disabled={callBusy}>
              <VideoIcon />
            </button>
          </>
        )}
        <div className="header-more-wrap">
          <button id="header-more-btn" className="header-action-btn" onClick={() => setShowMore((open) => !open)} title="More" aria-expanded={showMore}>
            <MoreIcon />
          </button>
          {showMore && (
            <div className="header-more-menu">
              <button onClick={() => { onToggleSearch?.(); setShowMore(false); }}>Search messages</button>
              {isGroup && <button onClick={() => { onToggleInfoPanel?.(); setShowMore(false); }}>Group info</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
