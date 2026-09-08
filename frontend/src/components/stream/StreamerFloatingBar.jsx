import React, { useContext, useRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StreamContext } from '../../context/StreamContext';

const StreamerFloatingBar = () => {
  const {
    myStream, isStreamer, viewerCount, duration, endCurrentStream,
    cameraOn, micOn, screenSharing, toggleCamera, toggleMic, toggleScreenShare,
  } = useContext(StreamContext);
  const navigate = useNavigate();
  const location = useLocation();
  const barRef = useRef(null);
  const dragRef = useRef({ isDragging: false, offsetX: 0, offsetY: 0 });

  // Persist position in localStorage so it survives page reloads
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('streamBarPosition');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { left: '50%', top: 'auto', bottom: '20px', transform: 'translateX(-50%)' };
  });

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    // Apply persisted position
    if (pos.left !== '50%') {
      el.style.left = pos.left;
      el.style.top = pos.top;
      el.style.bottom = pos.bottom;
      el.style.transform = pos.transform;
    }

    const onMove = (e) => {
      if (!dragRef.current.isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = clientX - dragRef.current.offsetX;
      const y = clientY - dragRef.current.offsetY;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.bottom = 'auto';
      el.style.transform = 'none';
    };

    const onEnd = () => {
      if (!dragRef.current.isDragging) return;
      dragRef.current.isDragging = false;
      // Save final position
      const r = el.getBoundingClientRect();
      setPos({
        left: `${r.left}px`,
        top: `${r.top}px`,
        bottom: 'auto',
        transform: 'none',
      });
      try {
        localStorage.setItem('streamBarPosition', JSON.stringify({
          left: `${r.left}px`, top: `${r.top}px`, bottom: 'auto', transform: 'none',
        }));
      } catch {}
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
  }, [pos]);

  const handleDragStart = (e) => {
    const el = barRef.current;
    if (!el) return;
    // On first drag, snap out of centered layout into absolute positioning
    if (el.style.left === '' || el.style.left === '50%') {
      const rect = el.getBoundingClientRect();
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.top}px`;
      el.style.bottom = 'auto';
      el.style.transform = 'none';
    }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = {
      isDragging: true,
      offsetX: clientX - el.getBoundingClientRect().left,
      offsetY: clientY - el.getBoundingClientRect().top,
    };
    el.style.cursor = 'grabbing';
    el.classList.add('dragging');
    el.style.transition = 'none';
  };

  // Reset to default bottom-center position
  const resetPosition = () => {
    if (!barRef.current) return;
    barRef.current.style.left = '50%';
    barRef.current.style.top = 'auto';
    barRef.current.style.bottom = '20px';
    barRef.current.style.transform = 'translateX(-50%)';
    barRef.current.style.cursor = 'grab';
    barRef.current.classList.remove('dragging');
    barRef.current.style.transition = '';
    setPos({ left: '50%', top: 'auto', bottom: '20px', transform: 'translateX(-50%)' });
    try { localStorage.removeItem('streamBarPosition'); } catch {}
  };

  // Don't show if not streaming or on the stream page itself
  if (!myStream || !isStreamer) return null;
  if (location.pathname.startsWith('/live')) return null;

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleEnd = async () => {
    try {
      await endCurrentStream();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBarClick = () => {
    // Only navigate if the user didn't just drag the bar
    if (dragRef.current.isDragging) return;
    navigate(`/live/${myStream._id}`);
  };

  return (
    <div
      ref={barRef}
      className="streamer-floating-bar"
      onClick={handleBarClick}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
    >
      <div className="floating-bar-left">
        <span className="golive-dot" />
        <span className="floating-bar-title">{myStream.title}</span>
        <span className="floating-bar-timer">{formatDuration(duration)}</span>
        <span className="floating-bar-viewers">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          {viewerCount}
        </span>
      </div>
      <div className="floating-bar-controls" onClick={(e) => e.stopPropagation()}>
        <button className={`mini-ctrl ${!cameraOn ? 'off' : ''}`} onClick={toggleCamera} title="Camera">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
        </button>
        <button className={`mini-ctrl ${!micOn ? 'off' : ''}`} onClick={toggleMic} title="Mic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
        </button>
        <button className={`mini-ctrl ${screenSharing ? 'active' : ''}`} onClick={toggleScreenShare} title="Screen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
        </button>
        <button className="mini-ctrl end" onClick={handleEnd} title="End Stream">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>
        </button>
        <button
          className="mini-ctrl reset"
          onClick={(e) => { e.stopPropagation(); resetPosition(); }}
          title="Reset position"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.85l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.85-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.85.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.85 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.85l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.85.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.85-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.85V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default StreamerFloatingBar;
