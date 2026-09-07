import React, { useEffect, useRef, useMemo } from 'react';

const MicIcon = ({ muted = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {muted ? <><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9V5a3 3 0 0 0-5.65-1.48"/><path d="M17 12a5 5 0 0 1-8.24 3.82M12 19v4M8 23h8"/></> : <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10a7 7 0 0 1-14 0M12 17v5M8 22h8"/></>}
  </svg>
);

const CameraIcon = ({ off = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {off ? <><path d="M3 3l18 18M10.66 10.66A2 2 0 0 0 12 14a2 2 0 0 0 1.34-.52M9.9 4H17l4 3v10"/><path d="M3 7h3l1.5-2h2"/><rect x="3" y="7" width="18" height="13" rx="2"/></> : <><path d="M15 10l4.5-3A1 1 0 0 1 21 7.83v8.34a1 1 0 0 1-1.5.83L15 14"/><rect x="3" y="5" width="12" height="14" rx="2"/></>}
  </svg>
);

const PhoneOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.93 2.86l1.06-.95a2 2 0 0 1 2.12-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22.4 17v2.92a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.59 19 19.5 19.5 0 0 1 5 12.41 19.8 19.8 0 0 1 2.08 3.78 2 2 0 0 1 4.08 1.6H7a2 2 0 0 1 1.53 2.93c.34.96.57 1.9.7 2.81a2 2 0 0 1-.45 2.12l-.95 1.06M3 3l18 18"/></svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.63 4.35 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.9a16 16 0 0 0 6.1 6.1l1.06-.95a2 2 0 0 1 2.12-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
);

const EndCallIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const getInitial = (name) => {
  const value = (name || 'G').trim();
  return value.charAt(0).toUpperCase() || 'G';
};

const formatDuration = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

const ParticipantVideo = ({ stream, user, isLocal = false, isMuted = false }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');
  const displayName = isLocal ? 'You' : (user?.name || 'Participant');

  return (
    <div className={`group-call-participant ${isLocal ? 'local' : 'remote'}`}>
      {hasVideo ? (
        <video ref={videoRef} className="group-call-participant-video" autoPlay playsInline muted={isLocal} />
      ) : (
        <div className="group-call-participant-avatar">
          <span>{getInitial(displayName)}</span>
        </div>
      )}
      <div className="group-call-participant-info">
        <span className="group-call-participant-name">{displayName}</span>
        {isMuted && isLocal && <span className="group-call-participant-muted">Muted</span>}
      </div>
    </div>
  );
};

const GroupCallPanel = ({
  groupCall,
  onAccept,
  onReject,
  onEnd,
  onLeave,
  onToggleMute,
  onToggleCamera,
}) => {
  const localVideoRef = useRef(null);
  const remoteAudioRefs = useRef({});

  const isVideo = groupCall.mediaType === 'video';
  const isIncoming = groupCall.status === 'incoming';
  const isActive = ['ringing', 'connecting', 'connected'].includes(groupCall.status);
  const isConnected = groupCall.status === 'connected';
  const callerName = groupCall.callerInfo?.name || 'Someone';
  const groupName = groupCall.conversationName || 'Group';
  const timerText = formatDuration(groupCall.elapsedSeconds);
  const participantCount = groupCall.participants.length + 1; // +1 for self

  // Build participant list: self + remote participants
  const allParticipants = useMemo(() => {
    const self = { userId: 'local', user: null, stream: groupCall.localStream, isLocal: true };
    const remotes = Object.entries(groupCall.remoteStreams).map(([userId, { stream, user }]) => ({
      userId,
      user,
      stream,
      isLocal: false,
    }));
    return [self, ...remotes];
  }, [groupCall.localStream, groupCall.remoteStreams]);

  const statusText = isIncoming
    ? `Incoming ${isVideo ? 'Video' : 'Audio'} Group Call`
    : isConnected
    ? `${participantCount} participants`
    : groupCall.status === 'connecting'
    ? 'Connecting...'
    : 'Calling...';

  // Audio element for remote streams
  useEffect(() => {
    Object.entries(groupCall.remoteStreams).forEach(([userId, { stream }]) => {
      if (!remoteAudioRefs.current[userId]) {
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.playsInline = true;
        audio.volume = 1;
        remoteAudioRefs.current[userId] = audio;
      }
      remoteAudioRefs.current[userId].srcObject = stream;
      remoteAudioRefs.current[userId].play().catch(() => {});
    });
    // Cleanup removed participants
    Object.keys(remoteAudioRefs.current).forEach((userId) => {
      if (!groupCall.remoteStreams[userId]) {
        remoteAudioRefs.current[userId].srcObject = null;
        delete remoteAudioRefs.current[userId];
      }
    });
  }, [groupCall.remoteStreams]);

  if (groupCall.status === 'idle' && !groupCall.error) return null;

  return (
    <section className={`group-call-panel ${isVideo ? 'group-call-video' : 'group-call-audio'}`} aria-label="Group Call">
      {/* Hidden audio elements for remote streams */}
      {Object.entries(groupCall.remoteStreams).map(([userId, { stream }]) => (
        <audio key={userId} ref={(el) => { if (el) { el.srcObject = stream; el.play().catch(() => {}); } }} autoPlay playsInline />
      ))}

      {/* Header */}
      <div className="group-call-header">
        <div className="group-call-header-left">
          <span className="group-call-header-icon"><UsersIcon /></span>
          <h3>Group Call</h3>
        </div>
        <button className="group-call-header-close" onClick={onEnd} title="Close" aria-label="Close">
          <CloseIcon />
        </button>
      </div>

      {/* Incoming call view */}
      {isIncoming && (
        <div className="group-call-incoming">
          <div className="group-call-incoming-avatar">
            <div className="group-call-incoming-avatar-ring" />
            <div className="group-call-incoming-avatar-core">
              {getInitial(callerName)}
            </div>
          </div>
          <div className="group-call-incoming-info">
            <div className="group-call-incoming-name">{callerName}</div>
            <div className="group-call-incoming-subtitle">
              is calling the group "{groupName}"
            </div>
            <div className="group-call-incoming-type">
              {isVideo ? 'Video' : 'Audio'} Call
            </div>
          </div>
          <div className="group-call-incoming-actions">
            <button className="group-call-action-btn group-call-decline" onClick={onReject} title="Decline">
              <span className="group-call-action-icon"><PhoneOffIcon /></span>
              <span>Decline</span>
            </button>
            <button className="group-call-action-btn group-call-accept" onClick={onAccept} title="Accept">
              <span className="group-call-action-icon"><PhoneIcon /></span>
              <span>Accept</span>
            </button>
          </div>
        </div>
      )}

      {/* Ringing view (outgoing) */}
      {groupCall.status === 'ringing' && (
        <div className="group-call-ringing">
          <div className="group-call-ringing-avatar">
            <div className="group-call-ringing-avatar-ring" />
            <div className="group-call-ringing-avatar-core">
              {getInitial(groupName)}
            </div>
          </div>
          <div className="group-call-ringing-info">
            <div className="group-call-ringing-name">{groupName}</div>
            <div className="group-call-ringing-subtitle">Calling group members...</div>
          </div>
        </div>
      )}

      {/* Active call view (connecting / connected) */}
      {isActive && !isIncoming && (
        <div className={`group-call-grid group-call-grid-${Math.min(allParticipants.length, 4)}`}>
          {allParticipants.map((participant) => (
            <ParticipantVideo
              key={participant.userId}
              stream={participant.stream}
              user={participant.user}
              isLocal={participant.isLocal}
              isMuted={participant.isLocal && groupCall.isMuted}
            />
          ))}
        </div>
      )}

      {/* Status + timer */}
      {groupCall.status !== 'idle' && (
        <div className="group-call-status-bar">
          <span className="group-call-status-icon"><PhoneIcon /></span>
          <span>{statusText}</span>
          {isConnected && (
            <span className="group-call-timer">{timerText}</span>
          )}
        </div>
      )}

      {groupCall.error && (
        <div className="group-call-error">
          {groupCall.error}
          <button className="group-call-error-close" onClick={onEnd}><CloseIcon /></button>
        </div>
      )}

      {/* Controls */}
      {isActive && !isIncoming && (
        <div className="group-call-controls">
          <button
            className={`group-call-ctrl ${groupCall.isMuted ? 'is-off' : ''}`}
            onClick={onToggleMute}
            title={groupCall.isMuted ? 'Unmute' : 'Mute'}
          >
            <MicIcon muted={groupCall.isMuted} />
            <span>{groupCall.isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          {isVideo && (
            <button
              className={`group-call-ctrl ${groupCall.isCameraOff ? 'is-off' : ''}`}
              onClick={onToggleCamera}
              title={groupCall.isCameraOff ? 'Camera on' : 'Camera off'}
            >
              <CameraIcon off={groupCall.isCameraOff} />
              <span>Camera</span>
            </button>
          )}
          <button className="group-call-ctrl group-call-leave" onClick={onLeave || onEnd} title="Leave call">
            <EndCallIcon />
            <span>Leave</span>
          </button>
        </div>
      )}
    </section>
  );
};

export default GroupCallPanel;
