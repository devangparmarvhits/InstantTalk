import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { StreamContext } from '../../context/StreamContext';
import { getSocket } from '../../socket/socket';
import Sidebar from '../../components/common/Sidebar';
import StreamerView from '../../components/stream/StreamerView';
import StreamViewer from '../../components/stream/StreamViewer';
import { getStream } from '../../services/stream.service';

const StreamPage = () => {
  const { streamId } = useParams();
  const { user } = useContext(AuthContext);
  const { myStream, setMyStream, joinStream, leaveStream, streamEnded, activeStream, setActiveStream, setStreamEnded, setIsStreamer, setupStreamListeners, startStreamerWebRTC, startCamera, setViewerCount } = useContext(StreamContext);
  const navigate = useNavigate();
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMyStream, setIsMyStream] = useState(false);
  const isMineRef = useRef(false);

  useEffect(() => {
    const loadStream = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getStream(streamId);
        const fetchedStream = data.data.stream;

        if (!fetchedStream) {
          setError('Stream not found');
          return;
        }

        setStream(fetchedStream);

        // Check if this is the current user's stream
        const isMine = fetchedStream.streamer?._id === user?._id;
        setIsMyStream(isMine);
        isMineRef.current = isMine;

        if (!isMine) {
          // Join as viewer
          joinStream(fetchedStream);
        } else {
          // Streamer: join the stream room via socket and set active stream
          setActiveStream(fetchedStream);
          setMyStream(fetchedStream);
          setIsStreamer(true);
          // Sync viewer count from the API so the streamer sees the real count
          // even before any socket events arrive (e.g. when viewers are already
          // connected before the streamer reloads the page).
          setViewerCount(fetchedStream.viewerCount || 0);
          const socket = getSocket();
          if (socket) {
            socket.emit('stream:join-as-streamer', { streamId: fetchedStream._id });
            setupStreamListeners(socket, fetchedStream._id, true);
          }
          // Start the camera now so viewers can connect immediately after a refresh
          startCamera();
          // Start WebRTC (safe to call multiple times)
          startStreamerWebRTC(fetchedStream._id);
        }
      } catch (err) {
        setError('Failed to load stream');
      } finally {
        setLoading(false);
      }
    };

    loadStream();

    return () => {
      // Only leave stream for viewers, not streamer
      if (!isMineRef.current) {
        leaveStream();
      }
    };
  }, [streamId, user?._id]);

  // Handle stream ended event
  useEffect(() => {
    if (streamEnded) {
      // Stream was ended externally
    }
  }, [streamEnded]);

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="stream-page-loading">
          <div className="loading-spinner" />
          <span>Loading stream...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="stream-page-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <h2>{error}</h2>
          <p>This stream may have ended or doesn't exist.</p>
          <button className="btn-golive" onClick={() => navigate('/live')}>
            Browse Live Streams
          </button>
        </div>
      </div>
    );
  }

  // If stream has ended, show ended state
  if (stream?.status === 'ended' || streamEnded) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="stream-page-ended">
          <div className="stream-ended-card">
            <div className="stream-ended-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <h2>Live Stream Ended</h2>
            <p>This stream has ended.</p>
            {stream?.streamer && (
              <div className="stream-ended-streamer">
                <span>Hosted by {stream.streamer.name}</span>
              </div>
            )}
            <button className="btn-golive" onClick={() => navigate('/live')}>
              Browse Live Streams
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the appropriate view
  return (
    <div className="app-layout">
      <Sidebar />
      {isMyStream ? <StreamerView /> : <StreamViewer stream={stream} />}
    </div>
  );
};

export default StreamPage;
