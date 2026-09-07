import React, { createContext, useState, useCallback, useContext, useRef } from 'react';
import { getSocket, onSocketConnect } from '../socket/socket';
import { AuthContext } from './AuthContext';
import { createStream as createStreamApi, endStream as endStreamApi, getMyActiveStream } from '../services/stream.service';

export const StreamContext = createContext(null);

export const StreamProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [myStream, setMyStream] = useState(null);
  const [activeStream, setActiveStream] = useState(null);
  const [streamChatMessages, setStreamChatMessages] = useState([]);
  const [streamViewers, setStreamViewers] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [isStreamer, setIsStreamer] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);

  const activeStreamRef = useRef(activeStream);
  activeStreamRef.current = activeStream;

  // Check if user has an active stream on mount
  const checkMyStream = useCallback(async () => {
    try {
      const data = await getMyActiveStream();
      if (data.data.stream) {
        setMyStream(data.data.stream);
      }
    } catch (err) {
      // No active stream
    }
  }, []);

  // Start a new live stream
  const startStream = useCallback(async ({ title, description }) => {
    try {
      const data = await createStreamApi({ title, description });
      const stream = data.data.stream;
      setMyStream(stream);
      setActiveStream(stream);
      setIsStreamer(true);
      setStreamChatMessages([]);
      setStreamViewers([]);
      setViewerCount(0);
      setStreamEnded(false);

      // Join the stream room as streamer
      const socket = getSocket();
      if (socket) {
        socket.emit('stream:join-as-streamer', { streamId: stream._id });
        setupStreamListeners(socket, stream._id, true);
      }

      return stream;
    } catch (error) {
      throw error;
    }
  }, []);

  // End the current stream
  const endCurrentStream = useCallback(async () => {
    if (!myStream) return;
    try {
      const socket = getSocket();
      if (socket) {
        socket.emit('stream:end', { streamId: myStream._id });
      }
      await endStreamApi(myStream._id);
      setMyStream(null);
      setActiveStream(null);
      setIsStreamer(false);
      setStreamChatMessages([]);
      setStreamViewers([]);
      setViewerCount(0);
      setStreamEnded(true);
    } catch (error) {
      throw error;
    }
  }, [myStream]);

  // Join a stream as viewer
  const joinStream = useCallback(async (stream) => {
    setActiveStream(stream);
    setIsStreamer(false);
    setStreamChatMessages([]);
    setStreamViewers([]);
    setViewerCount(stream.viewerCount || 0);
    setStreamEnded(false);

    const socket = getSocket();
    if (socket) {
      socket.emit('stream:join-as-viewer', { streamId: stream._id });
      setupStreamListeners(socket, stream._id, false);
    }
  }, []);

  // Leave a stream
  const leaveStream = useCallback(() => {
    const socket = getSocket();
    if (socket && activeStreamRef.current) {
      socket.emit('stream:leave', { streamId: activeStreamRef.current._id });
      cleanupStreamListeners(socket);
    }
    setActiveStream(null);
    setIsStreamer(false);
    setStreamChatMessages([]);
    setStreamViewers([]);
    setViewerCount(0);
    setStreamEnded(false);
  }, []);

  // Send a chat message
  const sendStreamChat = useCallback((content) => {
    const socket = getSocket();
    if (socket && activeStreamRef.current) {
      socket.emit('stream:chat', { streamId: activeStreamRef.current._id, content });
    }
  }, []);

  // Remove a viewer (streamer only)
  const removeStreamViewer = useCallback((viewerId) => {
    const socket = getSocket();
    if (socket && myStream) {
      socket.emit('stream:remove-viewer', { streamId: myStream._id, viewerId });
    }
  }, [myStream]);

  // Block a viewer (streamer only)
  const blockStreamViewer = useCallback((viewerId) => {
    const socket = getSocket();
    if (socket && myStream) {
      socket.emit('stream:block-viewer', { streamId: myStream._id, viewerId });
    }
  }, [myStream]);

  // Delete a chat message (streamer only)
  const deleteStreamChatMessage = useCallback((messageId) => {
    const socket = getSocket();
    if (socket && myStream) {
      socket.emit('stream:delete-chat', { streamId: myStream._id, messageId });
    }
  }, [myStream]);

  // Setup socket listeners for a stream
  const setupStreamListeners = useCallback((socket, streamId, isStreamerRole) => {
    if (!socket) return;

    socket.off('stream:chat-message');
    socket.off('stream:viewer-joined');
    socket.off('stream:viewer-left');
    socket.off('stream:viewer-count-updated');
    socket.off('stream:ended');
    socket.off('stream:removed');
    socket.off('stream:blocked');
    socket.off('stream:chat-deleted');
    socket.off('stream:viewers-list');
    socket.off('stream:streamer-info');
    socket.off('stream:error');

    socket.on('stream:chat-message', (message) => {
      setStreamChatMessages((prev) => [...prev, message]);
    });

    socket.on('stream:viewer-joined', ({ userId, user, viewerCount: count }) => {
      setViewerCount(count);
      if (user) {
        setStreamViewers((prev) => {
          if (prev.some((v) => v._id === userId)) return prev;
          return [...prev, { _id: userId, name: user.name, avatar: user.avatar }];
        });
      }
    });

    socket.on('stream:viewer-left', ({ userId, viewerCount: count }) => {
      setViewerCount(count);
      setStreamViewers((prev) => prev.filter((v) => v._id !== userId));
    });

    socket.on('stream:viewer-count-updated', ({ viewerCount: count }) => {
      setViewerCount(count);
    });

    socket.on('stream:ended', () => {
      setStreamEnded(true);
      setActiveStream(null);
      setMyStream(null);
      setIsStreamer(false);
    });

    socket.on('stream:removed', () => {
      setActiveStream(null);
      setMyStream(null);
      setIsStreamer(false);
      setStreamEnded(true);
    });

    socket.on('stream:blocked', () => {
      setActiveStream(null);
      setMyStream(null);
      setIsStreamer(false);
      setStreamEnded(true);
    });

    socket.on('stream:chat-deleted', ({ messageId }) => {
      setStreamChatMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    socket.on('stream:viewers-list', ({ viewers: viewerIds, viewerCount: count }) => {
      setViewerCount(count);
    });

    socket.on('stream:error', ({ message }) => {
      console.error('Stream error:', message);
    });
  }, []);

  // Cleanup stream listeners
  const cleanupStreamListeners = useCallback((socket) => {
    if (!socket) return;
    socket.off('stream:chat-message');
    socket.off('stream:viewer-joined');
    socket.off('stream:viewer-left');
    socket.off('stream:viewer-count-updated');
    socket.off('stream:ended');
    socket.off('stream:removed');
    socket.off('stream:blocked');
    socket.off('stream:chat-deleted');
    socket.off('stream:viewers-list');
    socket.off('stream:streamer-info');
    socket.off('stream:error');
  }, []);

  // Listen for notifications when any user starts a stream
  const notificationHandlerRef = useRef(null);
  const setupGlobalStreamListener = useCallback((socket) => {
    if (!socket || !user) return;

    // Clean up previous listener
    if (notificationHandlerRef.current) {
      notificationHandlerRef.current();
    }

    // Listen for new stream notifications from other users
    socket.on('stream:notification', ({ streamerName, streamId }) => {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`${streamerName} is LIVE now!`, {
            body: 'Click to watch the live stream',
            tag: `stream-${streamId}`,
          });
        } catch {
          // Notification failed silently
        }
      }
    });

    notificationHandlerRef.current = () => {
      socket.off('stream:notification');
    };
  }, [user]);

  return (
    <StreamContext.Provider
      value={{
        myStream,
        setMyStream,
        activeStream,
        setActiveStream,
        streamChatMessages,
        setStreamChatMessages,
        streamViewers,
        setStreamViewers,
        viewerCount,
        setViewerCount,
        isStreamer,
        streamEnded,
        setStreamEnded,
        checkMyStream,
        startStream,
        endCurrentStream,
        joinStream,
        leaveStream,
        sendStreamChat,
        removeStreamViewer,
        blockStreamViewer,
        deleteStreamChatMessage,
        setupGlobalStreamListener,
      }}
    >
      {children}
    </StreamContext.Provider>
  );
};
