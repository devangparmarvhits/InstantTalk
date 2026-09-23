import React, { useState } from 'react';
import {
  Pin,
  Smile,
  Paperclip,
  CheckCheck,
  Send,
  PhoneCall,
  Video,
  Mic,
  Users,
  Radio,
  Zap,
} from './Icons';

const ChatShowcase = () => {
  const [activeReactions, setActiveReactions] = useState({
    heart: 6,
    rocket: 4,
    fire: 7,
    thumbs: 9,
  });
  const [userReacted, setUserReacted] = useState({});
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const toggleReaction = (type) => {
    setUserReacted((prev) => {
      const isCurrentlyReacted = !!prev[type];
      setActiveReactions((r) => ({
        ...r,
        [type]: isCurrentlyReacted ? r[type] - 1 : r[type] + 1,
      }));
      return { ...prev, [type]: !isCurrentlyReacted };
    });
  };

  return (
    <section id="showcase" className="showcase-section">
      <div className="landing-container">
        {/* Section Header */}
        <div className="section-header text-center">
          <div className="section-badge">MESSAGING EXPERIENCE</div>
          <h2 className="section-title">
            Conversations that <span className="gradient-text">feel alive.</span>
          </h2>
          <p className="section-subtitle">
            Experience lightning-fast real-time messaging with instant delivery receipts, interactive reactions, rich attachments, and voice notes.
          </p>
        </div>

        {/* Showcase Modern Workspace Window */}
        <div className="showcase-card-wrapper">
          <div className="showcase-ambient-blur" />

          {/* Floating Pill Badges */}
          <div className="showcase-pill-badge left-badge">
            <Zap size={14} className="icon-accent" />
            <span>&lt;10ms Socket.IO Latency</span>
          </div>

          <div className="showcase-pill-badge right-badge">
            <Radio size={14} className="icon-green" />
            <span>Live Presence &amp; Typing</span>
          </div>

          <div className="showcase-workspace-window">
            {/* Top Window Bar */}
            <div className="workspace-window-header">
              <div className="window-controls">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>
              <div className="window-title">InstantTalk Workspace — #dev-engineering</div>
              <div className="window-badge">
                <span className="pulse-dot green" />
                <span>Connected</span>
              </div>
            </div>

            {/* 2-Column Workspace Body */}
            <div className="workspace-window-body">
              {/* Left Sidebar: Channels & DMs */}
              <div className="showcase-sidebar">
                <div className="workspace-org-header">
                  <div className="org-icon">IT</div>
                  <div className="org-info">
                    <span className="org-name">InstantTalk Team</span>
                    <span className="org-plan">Pro Workspace</span>
                  </div>
                </div>

                {/* Channels */}
                <div className="sidebar-group">
                  <span className="group-title">CHANNELS</span>
                  <div className="channel-item">
                    <span className="hash">#</span>
                    <span className="channel-name">general-sync</span>
                  </div>
                  <div className="channel-item active">
                    <span className="hash">#</span>
                    <span className="channel-name">dev-engineering</span>
                    <span className="unread-badge">3</span>
                  </div>
                  <div className="channel-item">
                    <span className="hash">#</span>
                    <span className="channel-name">webrtc-audio-video</span>
                  </div>
                </div>

                {/* Direct Messages */}
                <div className="sidebar-group">
                  <span className="group-title">DIRECT MESSAGES</span>
                  <div className="dm-item active">
                    <div className="avatar-wrap xs">
                      <div className="mock-avatar avatar-sarah xs">SJ</div>
                      <span className="status-indicator online" />
                    </div>
                    <span className="dm-name">Sarah Jenkins</span>
                  </div>
                  <div className="dm-item">
                    <div className="avatar-wrap xs">
                      <div className="mock-avatar avatar-alex xs">AR</div>
                      <span className="status-indicator online" />
                    </div>
                    <span className="dm-name">Alex Rivera</span>
                  </div>
                  <div className="dm-item">
                    <div className="avatar-wrap xs">
                      <div className="mock-avatar avatar-team xs">DP</div>
                      <span className="status-indicator busy" />
                    </div>
                    <span className="dm-name">Devang Parmar</span>
                  </div>
                </div>
              </div>

              {/* Right Chat Stream */}
              <div className="showcase-main-chat">
                {/* Chat Header */}
                <div className="chat-header-bar">
                  <div className="chat-header-details">
                    <div className="chat-title-row">
                      <span className="chat-hash">#</span>
                      <h4 className="chat-channel-heading">dev-engineering</h4>
                    </div>
                    <span className="chat-topic-desc">Real-time architecture, WebRTC streaming &amp; active sprint discussion</span>
                  </div>

                  <div className="chat-header-tools">
                    <div className="participants-chip">
                      <Users size={14} />
                      <span>8 online</span>
                    </div>
                    <button className="icon-btn" title="Start Voice Call" aria-label="Start Voice Call">
                      <PhoneCall size={16} />
                    </button>
                    <button className="icon-btn active-call" title="Start Video Call" aria-label="Start Video Call">
                      <Video size={16} />
                    </button>
                  </div>
                </div>

                {/* Pinned Announcement Bar */}
                <div className="chat-pinned-banner">
                  <Pin size={13} className="pinned-icon" />
                  <span className="pinned-label">Pinned:</span>
                  <span className="pinned-info">WebRTC Mesh v2.4 Signaling Live Review — Today @ 4:00 PM EST</span>
                </div>

                {/* Message Stream */}
                <div className="chat-stream-scroll">
                  {/* Message 1: Alex Rivera */}
                  <div className="stream-msg-row">
                    <div className="mock-avatar avatar-alex sm">AR</div>
                    <div className="msg-content-block">
                      <div className="msg-header-meta">
                        <span className="msg-author-name">Alex Rivera</span>
                        <span className="msg-author-role">Lead Engineer</span>
                        <span className="msg-time">03:28 PM</span>
                      </div>
                      <div className="msg-text-bubble">
                        Team, the WebRTC signaling STUN/TURN fallback traversal is now live across all nodes! 🚀
                      </div>
                    </div>
                  </div>

                  {/* Message 2: Sarah (Outgoing / You) with Reply */}
                  <div className="stream-msg-row outgoing-row">
                    <div className="msg-content-block outgoing-align">
                      <div className="msg-header-meta right">
                        <span className="msg-time">03:29 PM</span>
                        <span className="msg-author-name">You</span>
                      </div>

                      {/* Reply Box */}
                      <div className="stream-reply-box">
                        <span className="reply-sender">Alex Rivera</span>
                        <span className="reply-text">Team, the WebRTC signaling STUN/TURN fallback...</span>
                      </div>

                      <div className="msg-text-bubble outgoing-bubble">
                        <span>Tested with 4-way group mesh — latency is under 18ms with 0 packet drops!</span>
                        <div className="msg-receipt-check">
                          <CheckCheck size={14} className="icon-read" />
                        </div>
                      </div>
                    </div>
                    <div className="mock-avatar avatar-sarah sm">SJ</div>
                  </div>

                  {/* Message 3: Alex with Attachment & Reactions */}
                  <div className="stream-msg-row">
                    <div className="mock-avatar avatar-alex sm">AR</div>
                    <div className="msg-content-block">
                      <div className="msg-header-meta">
                        <span className="msg-author-name">Alex Rivera</span>
                        <span className="msg-time">03:30 PM</span>
                      </div>

                      {/* Rich Document Card */}
                      <div className="rich-attachment-card">
                        <div className="doc-icon-badge">
                          <Paperclip size={18} />
                        </div>
                        <div className="doc-details">
                          <span className="doc-filename">InstantTalk_WebRTC_Architecture_v2.4.pdf</span>
                          <span className="doc-filesize">2.4 MB • Complete Signaling &amp; ICE Spec</span>
                        </div>
                        <div className="doc-action-tag">Ready</div>
                      </div>

                      <div className="msg-text-bubble">
                        Here is the complete topology diagram. Let's do a quick voice note walk-through!
                      </div>

                      {/* Interactive Reactions */}
                      <div className="stream-reactions-row">
                        <button
                          className={`reaction-btn ${userReacted.heart ? 'active' : ''}`}
                          onClick={() => toggleReaction('heart')}
                        >
                          <span>❤️</span>
                          <span className="count">{activeReactions.heart}</span>
                        </button>
                        <button
                          className={`reaction-btn ${userReacted.rocket ? 'active' : ''}`}
                          onClick={() => toggleReaction('rocket')}
                        >
                          <span>🚀</span>
                          <span className="count">{activeReactions.rocket}</span>
                        </button>
                        <button
                          className={`reaction-btn ${userReacted.fire ? 'active' : ''}`}
                          onClick={() => toggleReaction('fire')}
                        >
                          <span>🔥</span>
                          <span className="count">{activeReactions.fire}</span>
                        </button>
                        <button
                          className={`reaction-btn ${userReacted.thumbs ? 'active' : ''}`}
                          onClick={() => toggleReaction('thumbs')}
                        >
                          <span>👍</span>
                          <span className="count">{activeReactions.thumbs}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Message 4: Voice Note Player Bubble */}
                  <div className="stream-msg-row">
                    <div className="mock-avatar avatar-alex sm">AR</div>
                    <div className="msg-content-block">
                      <div className="voice-note-player-card">
                        <button
                          className={`voice-play-btn ${isPlayingAudio ? 'playing' : ''}`}
                          onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                          aria-label="Play voice note"
                        >
                          {isPlayingAudio ? '❚❚' : '▶'}
                        </button>
                        <div className="voice-wave-bars">
                          <span className={`bar ${isPlayingAudio ? 'anim' : ''}`} style={{ height: '8px' }} />
                          <span className={`bar ${isPlayingAudio ? 'anim' : ''}`} style={{ height: '18px' }} />
                          <span className={`bar ${isPlayingAudio ? 'anim' : ''}`} style={{ height: '12px' }} />
                          <span className={`bar ${isPlayingAudio ? 'anim' : ''}`} style={{ height: '22px' }} />
                          <span className={`bar ${isPlayingAudio ? 'anim' : ''}`} style={{ height: '14px' }} />
                          <span className={`bar ${isPlayingAudio ? 'anim' : ''}`} style={{ height: '20px' }} />
                          <span className={`bar ${isPlayingAudio ? 'anim' : ''}`} style={{ height: '10px' }} />
                          <span className={`bar ${isPlayingAudio ? 'anim' : ''}`} style={{ height: '16px' }} />
                          <span className={`bar ${isPlayingAudio ? 'anim' : ''}`} style={{ height: '14px' }} />
                          <span className={`bar ${isPlayingAudio ? 'anim' : ''}`} style={{ height: '6px' }} />
                        </div>
                        <span className="voice-duration">0:24</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Typing Status Indicator */}
                  <div className="stream-typing-row">
                    <div className="typing-dots-pill">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                    <span className="typing-username">Sarah Jenkins is typing...</span>
                  </div>
                </div>

                {/* Input Bar */}
                <div className="chat-compose-bar">
                  <button className="compose-tool-btn" title="Add File" aria-label="Add File">
                    <Paperclip size={18} />
                  </button>
                  <div className="compose-input-wrapper">
                    <span className="compose-placeholder">Message #dev-engineering...</span>
                  </div>
                  <button className="compose-tool-btn" title="Add Emoji" aria-label="Add Emoji">
                    <Smile size={18} />
                  </button>
                  <button className="compose-tool-btn" title="Voice Message" aria-label="Voice Message">
                    <Mic size={18} />
                  </button>
                  <button className="compose-send-btn" title="Send" aria-label="Send">
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChatShowcase;
