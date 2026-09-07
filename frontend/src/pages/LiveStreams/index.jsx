import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { StreamContext } from '../../context/StreamContext';
import Sidebar from '../../components/common/Sidebar';
import GoLiveModal from '../../components/stream/GoLiveModal';
import LiveStreamCard from '../../components/stream/LiveStreamCard';
import { getActiveStreams, getRecentStreams } from '../../services/stream.service';

const LiveStreams = () => {
  const { user } = useContext(AuthContext);
  const { myStream, checkMyStream, startStream } = useContext(StreamContext);
  const navigate = useNavigate();
  const [showGoLive, setShowGoLive] = useState(false);
  const [activeStreams, setActiveStreams] = useState([]);
  const [recentStreams, setRecentStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('live'); // 'live' or 'recent'

  useEffect(() => {
    checkMyStream();
    loadStreams();
  }, []);

  const loadStreams = async () => {
    setLoading(true);
    try {
      const [active, recent] = await Promise.all([
        getActiveStreams(),
        getRecentStreams(),
      ]);
      setActiveStreams(active.data.streams || []);
      setRecentStreams(recent.data.streams || []);
    } catch (err) {
      console.error('Failed to load streams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoLive = async (data) => {
    try {
      const stream = await startStream({
        title: data.title,
        description: data.description,
      });
      setShowGoLive(false);
      navigate(`/live/${stream._id}`);
    } catch (err) {
      throw err;
    }
  };

  const handleJoinMyStream = () => {
    if (myStream) {
      navigate(`/live/${myStream._id}`);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="live-streams-page">
        <div className="live-streams-header">
          <div className="live-streams-header-left">
            <span className="calls-eyebrow">LIVE STREAMING</span>
            <h1>Live Streams</h1>
          </div>
          <div className="live-streams-header-actions">
            {myStream ? (
              <button className="btn-golive active" onClick={handleJoinMyStream}>
                <span className="golive-dot" />
                My Stream
              </button>
            ) : (
              <button className="btn-golive" onClick={() => setShowGoLive(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" />
                </svg>
                Go Live
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="filter-tabs">
          <button
            className={`filter-tab ${tab === 'live' ? 'active' : ''}`}
            onClick={() => setTab('live')}
          >
            🔴 Live Now ({activeStreams.length})
          </button>
          <button
            className={`filter-tab ${tab === 'recent' ? 'active' : ''}`}
            onClick={() => setTab('recent')}
          >
            Recent
          </button>
        </div>

        {/* Stream Grid */}
        {loading ? (
          <div className="calls-empty">
            <div className="loading-spinner" />
          </div>
        ) : tab === 'live' ? (
          activeStreams.length > 0 ? (
            <div className="stream-grid">
              {activeStreams.map((stream) => (
                <LiveStreamCard key={stream._id} stream={stream} />
              ))}
            </div>
          ) : (
            <div className="calls-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              <h2>No Live Streams</h2>
              <p>Be the first to go live!</p>
            </div>
          )
        ) : recentStreams.length > 0 ? (
          <div className="stream-grid">
            {recentStreams.map((stream) => (
              <LiveStreamCard key={stream._id} stream={{ ...stream, status: 'ended' }} />
            ))}
          </div>
        ) : (
          <div className="calls-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <h2>No Recent Streams</h2>
            <p>Streams will appear here once they end.</p>
          </div>
        )}

        {/* Go Live Modal */}
        {showGoLive && (
          <GoLiveModal
            onStart={handleGoLive}
            onCancel={() => setShowGoLive(false)}
          />
        )}
      </div>
    </div>
  );
};

export default LiveStreams;
