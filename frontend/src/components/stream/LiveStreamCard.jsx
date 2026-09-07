import React from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../user/Avatar';

const LiveStreamCard = ({ stream }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/live/${stream._id}`);
  };

  return (
    <div className="stream-card" onClick={handleClick}>
      <div className="stream-card-preview">
        <div className="stream-card-preview-placeholder">
          <Avatar user={stream.streamer} size="xl" />
        </div>
        <div className="stream-card-live-badge">
          <span className="golive-dot" />
          LIVE
        </div>
        <div className="stream-card-viewers-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {stream.viewerCount}
        </div>
      </div>
      <div className="stream-card-info">
        <div className="stream-card-avatar">
          <Avatar user={stream.streamer} size="sm" />
        </div>
        <div className="stream-card-details">
          <h4 className="stream-card-title">{stream.title}</h4>
          <span className="stream-card-streamer">{stream.streamer?.name || 'Streamer'}</span>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamCard;
