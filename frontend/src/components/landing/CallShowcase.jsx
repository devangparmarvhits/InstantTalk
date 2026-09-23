import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  PhoneOff,
  Monitor,
  Users,
  Radio,
} from './Icons';

const CallShowcase = () => {
  const [callMode, setCallMode] = useState('group'); // 'direct' or 'group'
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);

  return (
    <section id="calls" className="call-showcase-section">
      <div className="landing-container">
        {/* Section Header */}
        <div className="section-header text-center">
          <div className="section-badge">WEBRTC VOICE & VIDEO</div>
          <h2 className="section-title">
            Talk face-to-face, <span className="gradient-text">wherever you are.</span>
          </h2>
          <p className="section-subtitle">
            Make high-definition voice and video calls powered by WebRTC. Seamlessly jump into direct 1-on-1 calls or group sessions with up to 4 participants.
          </p>

          {/* Mode Switcher */}
          <div className="call-mode-toggle">
            <button
              className={`mode-btn ${callMode === 'group' ? 'active' : ''}`}
              onClick={() => setCallMode('group')}
            >
              <Users size={16} />
              <span>Group Call (4 Participants)</span>
            </button>
            <button
              className={`mode-btn ${callMode === 'direct' ? 'active' : ''}`}
              onClick={() => setCallMode('direct')}
            >
              <Video size={16} />
              <span>1-on-1 Direct Call</span>
            </button>
          </div>
        </div>

        {/* Call Stage */}
        <div className="call-stage-wrapper">
          <div className="call-stage-ambient" />

          <div className="call-stage">
            {/* Topbar of the call */}
            <div className="call-stage-topbar">
              <div className="call-info">
                <span className="live-call-pill">
                  <span className="pulse-dot green" />
                  <span>CALL IN PROGRESS</span>
                </span>
                <span className="call-timer">14:38</span>
              </div>

              <div className="call-quality-badge">
                <Radio size={14} className="icon-green" />
                <span>HD 1080p • 24ms latency • WebRTC</span>
              </div>
            </div>

            {/* Video Grid */}
            {callMode === 'group' ? (
              <div className="call-grid-4">
                {/* Tile 1: Sarah */}
                <div className="video-tile speaking">
                  <div className="tile-bg tile-bg-1">
                    <div className="tile-avatar">SJ</div>
                  </div>
                  <div className="tile-overlay">
                    <span className="participant-name">Sarah Jenkins</span>
                    <span className="speaking-badge">
                      <span className="waveform-bar" />
                      <span className="waveform-bar" />
                      <span className="waveform-bar" />
                      Speaking
                    </span>
                  </div>
                </div>

                {/* Tile 2: Alex */}
                <div className="video-tile">
                  <div className="tile-bg tile-bg-2">
                    <div className="tile-avatar">AR</div>
                  </div>
                  <div className="tile-overlay">
                    <span className="participant-name">Alex Rivera</span>
                    <span className="status-mic"><Mic size={14} /></span>
                  </div>
                </div>

                {/* Tile 3: Liam */}
                <div className="video-tile">
                  <div className="tile-bg tile-bg-3">
                    <div className="tile-avatar">LC</div>
                  </div>
                  <div className="tile-overlay">
                    <span className="participant-name">Liam Chen</span>
                    <span className="status-mic muted"><MicOff size={14} /></span>
                  </div>
                </div>

                {/* Tile 4: You */}
                <div className="video-tile self">
                  <div className="tile-bg tile-bg-4">
                    <div className="tile-avatar">YOU</div>
                  </div>
                  <div className="tile-overlay">
                    <span className="participant-name">You (Host)</span>
                    <span className="status-mic">
                      {isMuted ? <MicOff size={14} className="text-danger" /> : <Mic size={14} />}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="call-direct-grid">
                {/* Peer Tile */}
                <div className="direct-tile peer speaking">
                  <div className="tile-bg tile-bg-1">
                    <div className="tile-avatar lg">SJ</div>
                  </div>
                  <div className="tile-overlay">
                    <span className="participant-name">Sarah Jenkins</span>
                    <span className="speaking-badge">
                      <span className="waveform-bar" />
                      <span className="waveform-bar" />
                      <span className="waveform-bar" />
                      Speaking
                    </span>
                  </div>
                </div>

                {/* Picture-in-picture Self */}
                <div className="pip-tile">
                  <div className="tile-bg tile-bg-4">
                    <div className="tile-avatar sm">YOU</div>
                  </div>
                  <span className="pip-label">You</span>
                </div>
              </div>
            )}

            {/* Bottom Call Controls Toolbar */}
            <div className="call-toolbar">
              <button
                className={`call-ctrl-btn ${isMuted ? 'active-off' : ''}`}
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <button
                className={`call-ctrl-btn ${!isVideoOn ? 'active-off' : ''}`}
                onClick={() => setIsVideoOn(!isVideoOn)}
                title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                aria-label={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
              >
                <Video size={20} />
              </button>

              <button
                className="call-ctrl-btn"
                title="Share Screen"
                aria-label="Share Screen"
              >
                <Monitor size={20} />
              </button>

              <button
                className="call-ctrl-btn end-call"
                title="End Call"
                aria-label="End Call"
              >
                <PhoneOff size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallShowcase;
