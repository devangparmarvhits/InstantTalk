import React from 'react';
import { Monitor, Users, Eye, Radio, ShieldCheck, Zap, Mic } from './Icons';

const LiveMonitoringShowcase = () => {
  return (
    <section id="screenshare" className="monitoring-section">
      <div className="landing-container">
        {/* Section Header */}
        <div className="section-header text-center">
          <div className="section-badge">LIVE SCREEN BROADCASTING</div>
          <h2 className="section-title">
            Share your screen in <span className="gradient-text">real time.</span>
          </h2>
          <p className="section-subtitle">
            Broadcast presentations, sprint dashboards, designs, or apps with ultra-low latency. Team members can follow along seamlessly with live stream monitoring.
          </p>
        </div>

        {/* Showcase Monitor Window */}
        <div className="monitor-preview-wrapper">
          <div className="monitor-ambient-glow" />

          <div className="monitor-window">
            {/* Monitor Topbar */}
            <div className="monitor-header">
              <div className="monitor-header-left">
                <span className="live-stream-badge">
                  <span className="live-pulsing-dot" />
                  LIVE STREAM
                </span>
                <span className="stream-title">Alex Rivera’s Screen — Q3 Product Sprint & Architecture</span>
              </div>

              <div className="monitor-header-right">
                <div className="viewer-pill">
                  <Eye size={14} />
                  <span>4 viewers</span>
                </div>
                <div className="stream-quality-tag">
                  <span>60 FPS • 1080p HD</span>
                </div>
              </div>
            </div>

            {/* Simulated Live Shared Screen Presentation */}
            <div className="monitor-screen-display">
              <div className="screen-share-workspace">
                {/* Workspace Topbar */}
                <div className="workspace-topbar">
                  <div className="workspace-title-box">
                    <span className="ws-dot" />
                    <span className="ws-name">Sprint Board — InstantTalk Real-Time Engine</span>
                  </div>
                  <div className="ws-status-badge">
                    <Zap size={13} className="text-amber" />
                    <span>Real-Time Sync Active</span>
                  </div>
                </div>

                {/* Dashboard Metrics Cards */}
                <div className="workspace-metrics-row">
                  <div className="ws-metric-card">
                    <span className="metric-label">Active Socket Streams</span>
                    <div className="metric-val-row">
                      <span className="metric-val">1,284</span>
                      <span className="metric-trend up">+18.4%</span>
                    </div>
                  </div>

                  <div className="ws-metric-card">
                    <span className="metric-label">WebRTC Latency</span>
                    <div className="metric-val-row">
                      <span className="metric-val">18 ms</span>
                      <span className="metric-trend good">Optimal</span>
                    </div>
                  </div>

                  <div className="ws-metric-card">
                    <span className="metric-label">Live Active Presence</span>
                    <div className="metric-val-row">
                      <span className="metric-val">42.8k</span>
                      <span className="metric-trend up">+12%</span>
                    </div>
                  </div>
                </div>

                {/* Sprint Board Columns */}
                <div className="workspace-board">
                  {/* Column 1: In Progress */}
                  <div className="board-col">
                    <div className="board-col-header">
                      <span className="col-status-dot yellow" />
                      <span className="col-title">In Progress</span>
                      <span className="col-count">2</span>
                    </div>
                    <div className="board-card">
                      <div className="board-card-tag cyan">WebRTC Mesh</div>
                      <h5 className="board-card-title">4-Way Group Call Dynamic Bitrate</h5>
                      <div className="board-card-footer">
                        <span className="assignee">SJ</span>
                        <span className="due-tag">Today</span>
                      </div>
                    </div>
                    <div className="board-card">
                      <div className="board-card-tag violet">Security</div>
                      <h5 className="board-card-title">JTI Refresh Token Rotation</h5>
                      <div className="board-card-footer">
                        <span className="assignee">DP</span>
                        <span className="due-tag">Sprint 12</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Code Review */}
                  <div className="board-col">
                    <div className="board-col-header">
                      <span className="col-status-dot blue" />
                      <span className="col-title">In Review</span>
                      <span className="col-count">1</span>
                    </div>
                    <div className="board-card active-pointer">
                      <div className="board-card-tag rose">Live Stream</div>
                      <h5 className="board-card-title">Screen Broadcasting Pipeline</h5>
                      <div className="board-card-footer">
                        <span className="assignee">AR</span>
                        <span className="due-tag ready">Ready to Merge</span>
                      </div>

                      {/* Animated Presenter Mouse Pointer */}
                      <div className="presenter-pointer">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5">
                          <polygon points="3 3 10 21 14 13 22 10 3 3" />
                        </svg>
                        <span className="pointer-label">Alex (Presenting)</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Completed */}
                  <div className="board-col">
                    <div className="board-col-header">
                      <span className="col-status-dot green" />
                      <span className="col-title">Completed</span>
                      <span className="col-count">3</span>
                    </div>
                    <div className="board-card">
                      <div className="board-card-tag green">Auth</div>
                      <h5 className="board-card-title">Nodemailer OTP Email Verification</h5>
                      <div className="board-card-footer">
                        <span className="assignee">TS</span>
                        <span className="due-tag done">Deployed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Picture-in-Picture Presenter Video Tile in Corner */}
                <div className="stream-pip-presenter">
                  <div className="pip-avatar-wrap">
                    <div className="mock-avatar avatar-alex sm">AR</div>
                  </div>
                  <div className="pip-info">
                    <span className="pip-name">Alex Rivera</span>
                    <span className="pip-speaking">
                      <span className="waveform-bar" />
                      <span className="waveform-bar" />
                      <span className="waveform-bar" />
                      Speaking
                    </span>
                  </div>
                </div>
              </div>

              {/* Presenter & Viewer Bar Overlay */}
              <div className="monitor-overlay-bar">
                <div className="presenter-info">
                  <div className="mock-avatar avatar-alex sm">AR</div>
                  <div>
                    <span className="presenter-name">Alex Rivera (Host)</span>
                    <span className="presenter-sub">Broadcasting Screen • Microphone Active</span>
                  </div>
                </div>

                <div className="viewer-avatars-list">
                  <span className="viewers-label">Viewers in session:</span>
                  <div className="avatar-group">
                    <div className="mock-avatar avatar-sarah xs" title="Sarah Jenkins">SJ</div>
                    <div className="mock-avatar avatar-team xs" title="Devang P.">DP</div>
                    <div className="mock-avatar avatar-alex xs" title="Liam Chen">LC</div>
                    <div className="mock-avatar avatar-sarah xs" title="Emma Watson">EW</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveMonitoringShowcase;
