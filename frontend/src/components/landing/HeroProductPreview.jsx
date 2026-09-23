import React from 'react';
import {
  MessageSquare,
  Users,
  PhoneCall,
  Video,
  Monitor,
  CheckCheck,
  Paperclip,
  Smile,
  Mic,
  Send,
  Radio,
} from './Icons';
import Logo from '../common/Logo';

const HeroProductPreview = () => {
  return (
    <div className="hero-preview-container">
      {/* Background radial ambient glow */}
      <div className="hero-preview-glow" />

      {/* Floating Status Badges with Dynamic Modern Animations */}
      <div className="floating-badge badge-online">
        <span className="pulse-radar-dot">
          <span className="dot-core green" />
          <span className="dot-wave green" />
        </span>
        <span className="badge-text">Sarah is online</span>
      </div>

      <div className="floating-badge badge-delivered">
        <div className="badge-icon-wrap blue">
          <CheckCheck size={14} className="icon-blue" />
        </div>
        <div className="badge-col">
          <span className="badge-title">Message delivered</span>
          <span className="badge-sub">Read receipt active</span>
        </div>
      </div>

      <div className="floating-badge badge-call">
        <div className="badge-icon-wrap violet">
          <Video size={14} />
        </div>
        <div className="badge-col">
          <span className="badge-title">Video call active</span>
          <span className="badge-sub">HD • 1080p WebRTC</span>
        </div>
        <div className="live-sound-bars">
          <span className="mini-wave-bar" />
          <span className="mini-wave-bar" />
          <span className="mini-wave-bar" />
        </div>
      </div>

      <div className="floating-badge badge-group">
        <div className="badge-icon-wrap cyan">
          <Users size={14} />
        </div>
        <span className="badge-text">4 people in group call</span>
      </div>

      <div className="floating-badge badge-screen">
        <span className="pulse-radar-dot">
          <span className="dot-core red" />
          <span className="dot-wave red" />
        </span>
        <span className="badge-text">Live screen sharing</span>
      </div>

      {/* Main Mock App Window - Exactly matching InstantTalk App Layout */}
      <div className="mock-app-window authentic-app">
        {/* Window Topbar */}
        <div className="mock-app-topbar">
          <div className="mock-window-dots">
            <span className="dot dot-red" />
            <span className="dot dot-yellow" />
            <span className="dot dot-green" />
          </div>
          <div className="mock-app-title">
            <span>InstantTalk</span>
          </div>
          <div className="mock-app-status">
            <span className="pulse-dot green" />
            <span>Connected</span>
          </div>
        </div>

        {/* 3-Column Authentic App Layout: [Slim Icon Nav] | [Chats List] | [Active Chat Area] */}
        <div className="authentic-app-body">
          {/* 1. Left Slim Icon Nav (from real Sidebar.jsx) */}
          <div className="app-icon-sidebar">
            <div className="sidebar-brand-icon">
              <Logo size="sm" showText={false} />
            </div>

            <div className="sidebar-nav-icons">
              <div className="nav-icon-btn active" title="Chats">
                <MessageSquare size={16} />
              </div>
              <div className="nav-icon-btn" title="People">
                <Users size={16} />
              </div>
              <div className="nav-icon-btn" title="Calls">
                <PhoneCall size={16} />
              </div>
              <div className="nav-icon-btn" title="Live Monitor">
                <Monitor size={16} />
              </div>
            </div>

            {/* Bottom Profile Avatar (DP) */}
            <div className="sidebar-user-avatar">
              <div className="mock-avatar avatar-team xs">DP</div>
              <span className="status-indicator online" />
            </div>
          </div>

          {/* 2. Chat List Column */}
          <div className="app-chatlist-pane">
            <div className="chatlist-header">
              <h3 className="chatlist-heading">Chats</h3>
              <button className="chatlist-compose-btn" title="New message">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="chatlist-search-box">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="search-placeholder">Search conversations...</span>
            </div>

            {/* Filter Pills */}
            <div className="chatlist-filter-row">
              <span className="filter-pill active">All</span>
              <span className="filter-pill">Unread</span>
            </div>

            {/* Conversation Items */}
            <div className="chatlist-items">
              <div className="chatlist-item active">
                <div className="avatar-wrap sm">
                  <div className="mock-avatar avatar-sarah sm">SJ</div>
                  <span className="status-indicator online" />
                </div>
                <div className="chatlist-item-info">
                  <div className="item-title-row">
                    <span className="item-name">Sarah Jenkins</span>
                    <span className="item-time">12:42 PM</span>
                  </div>
                  <div className="item-preview">Awesome! Let me share the...</div>
                </div>
              </div>

              <div className="chatlist-item">
                <div className="avatar-wrap sm">
                  <div className="mock-avatar avatar-alex sm">AR</div>
                  <span className="status-indicator online" />
                </div>
                <div className="chatlist-item-info">
                  <div className="item-title-row">
                    <span className="item-name">Alex Rivera</span>
                    <span className="item-time">11:15 AM</span>
                  </div>
                  <div className="item-preview">Ready for the group sync?</div>
                </div>
              </div>

              <div className="chatlist-item">
                <div className="avatar-wrap sm">
                  <div className="mock-avatar avatar-team sm">TS</div>
                  <span className="status-indicator busy" />
                </div>
                <div className="chatlist-item-info">
                  <div className="item-title-row">
                    <span className="item-name">Core Team Sync</span>
                    <span className="item-time">Yesterday</span>
                  </div>
                  <div className="item-preview">Emma: Shared project roadmap</div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Active Chat Window Area */}
          <div className="app-main-chat-pane">
            <div className="mock-chat-header">
              <div className="chat-user-info">
                <div className="avatar-wrap sm">
                  <div className="mock-avatar avatar-sarah sm">SJ</div>
                  <span className="status-indicator online sm" />
                </div>
                <div>
                  <h4 className="chat-user-name">Sarah Jenkins</h4>
                  <span className="chat-user-sub">Active now • WebRTC ready</span>
                </div>
              </div>

              <div className="chat-header-actions">
                <button className="icon-btn" title="Voice Call" aria-label="Voice Call">
                  <PhoneCall size={15} />
                </button>
                <button className="icon-btn active-call" title="Video Call" aria-label="Video Call">
                  <Video size={15} />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="mock-messages">
              <div className="mock-msg incoming">
                <div className="msg-bubble">
                  <p>Hey! Did you check out the WebRTC call latency with the new STUN configuration?</p>
                  <span className="msg-meta">12:40 PM</span>
                </div>
              </div>

              <div className="mock-msg outgoing">
                <div className="msg-bubble">
                  <p>Yes! Crystal clear audio and sub-100ms video latency 🚀</p>
                  <div className="msg-meta">
                    <span>12:41 PM</span>
                    <CheckCheck size={13} className="icon-read" />
                  </div>
                </div>
              </div>

              <div className="mock-msg incoming">
                <div className="msg-bubble">
                  <p>Awesome! Let me share the live stream monitor preview now.</p>
                  <div className="msg-reactions">
                    <span className="reaction-chip">❤️ 1</span>
                    <span className="reaction-chip">🔥 2</span>
                  </div>
                  <span className="msg-meta">12:42 PM</span>
                </div>
              </div>

              {/* Typing indicator */}
              <div className="mock-typing-row">
                <div className="typing-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                <span className="typing-label">Sarah is typing...</span>
              </div>
            </div>

            {/* Mock Chat Input */}
            <div className="mock-input-row">
              <button className="input-tool-btn" aria-label="Attach file">
                <Paperclip size={16} />
              </button>
              <div className="mock-input-box">
                <span className="placeholder">Message Sarah...</span>
              </div>
              <button className="input-tool-btn" aria-label="Add emoji">
                <Smile size={16} />
              </button>
              <button className="input-tool-btn" aria-label="Voice note">
                <Mic size={16} />
              </button>
              <button className="input-send-btn" aria-label="Send message">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroProductPreview;
