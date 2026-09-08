import React, { useState, useRef, useEffect, useCallback } from 'react';

const GoLiveModal = ({ onStart, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [devices, setDevices] = useState({ cameras: [], mics: [] });
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Enumerate devices once the preview stream has granted permission.
  useEffect(() => {
    const enumerate = async () => {
      try {
        // Wait for the preview stream to be active so enumerateDevices()
        // returns labels and we don't grab a second camera streams.
        for (let i = 0; i < 50 && !streamRef.current; i++) {
          await new Promise((r) => setTimeout(r, 100));
        }
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const cameras = allDevices.filter((d) => d.kind === 'videoinput');
        const mics = allDevices.filter((d) => d.kind === 'audioinput');
        setDevices({ cameras, mics });
        if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId);
        if (mics.length > 0) setSelectedMic(mics[0].deviceId);
      } catch (err) {
        setError('Camera/microphone access is required to go live');
      }
    };
    enumerate();
  }, []);

  // Stop the current preview stream (if any)
  const stopPreview = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Start camera preview. Falls back to video-only or audio-only if the
  // combined camera+mic request is denied (e.g. mic blocked but camera OK),
  // so a working camera still starts instead of showing "permission denied".
  const startPreview = useCallback(async (videoDeviceId, audioDeviceId, videoEnabled, audioEnabled) => {
    // Skip if a matching preview is already running (device id is unconstrained
    // until the user picks one from the list, so '' always matches)
    const stream = streamRef.current;
    const haveVideo = !!(stream && stream.getVideoTracks().length > 0);
    const haveAudio = !!(stream && stream.getAudioTracks().length > 0);
    const videoId = stream?.getVideoTracks()[0]?.getSettings?.().deviceId || '';
    const audioId = stream?.getAudioTracks()[0]?.getSettings?.().deviceId || '';
    if (
      stream &&
      haveVideo === videoEnabled &&
      haveAudio === audioEnabled &&
      (!videoDeviceId || videoId === videoDeviceId) &&
      (!audioDeviceId || audioId === audioDeviceId)
    ) {
      return;
    }

    stopPreview();

    const acquire = (v, a) => {
      const constraints = {};
      constraints.video = v ? (videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true) : false;
      constraints.audio = a ? (audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true) : false;
      return navigator.mediaDevices.getUserMedia(constraints);
    };

    let acquired = null;
    try {
      try {
        acquired = await acquire(videoEnabled, audioEnabled);
      } catch (err) {
        // The previous preview may not have been fully released yet — retry once.
        await new Promise((r) => setTimeout(r, 400));
        try {
          acquired = await acquire(videoEnabled, audioEnabled);
        } catch {
          // Combined request denied — try each permission separately.
          if (videoEnabled) {
            try { acquired = await acquire(true, false); } catch {}
          }
          if (!acquired && audioEnabled) {
            try { acquired = await acquire(false, true); } catch {}
          }
        }
      }

      if (acquired) {
        streamRef.current = acquired;
        if (videoRef.current) videoRef.current.srcObject = acquired;
        setCameraOn(acquired.getVideoTracks().length > 0);
        setMicOn(acquired.getAudioTracks().length > 0);
        setError('');

        // Explain which input is blocked so the user knows what to allow.
        let hint = '';
        if (videoEnabled && !acquired.getVideoTracks().length) {
          hint = 'Camera is unavailable. Allow camera access in site settings and restart the feed.';
        } else if (audioEnabled && !acquired.getAudioTracks().length) {
          hint = 'Microphone is unavailable. Allow mic access in site settings, or check your Windows/Safari privacy settings, then go live again.';
        }
        setNotice(hint);
      } else {
        console.error('Failed to start camera preview: permission denied');
        setNotice('');
        setError(
          videoEnabled || audioEnabled
            ? 'Camera/microphone permission denied. Allow access in site settings and retry.'
            : 'Failed to start camera preview'
        );
      }
    } catch (err) {
      console.error('Failed to start camera preview:', err);
      setNotice('');
      setError('Failed to start camera preview');
    }
  }, [stopPreview]);

  // (Re)start the preview when the camera/mic toggles or the modal mounts.
  useEffect(() => {
    if (cameraOn || micOn) {
      startPreview(selectedCamera, selectedMic, cameraOn, micOn);
    } else {
      stopPreview();
    }
  }, [cameraOn, micOn, selectedCamera, selectedMic, startPreview, stopPreview]);

  // Stop the preview stream on unmount
  useEffect(() => () => stopPreview(), [stopPreview]);

  const handleCameraChange = (e) => {
    const id = e.target.value;
    setSelectedCamera(id);
    if (cameraOn) startPreview(id, selectedMic, cameraOn, micOn);
  };

  const handleMicChange = (e) => {
    const id = e.target.value;
    setSelectedMic(id);
    if (micOn) startPreview(selectedCamera, id, cameraOn, micOn);
  };

  const toggleCamera = () => setCameraOn((prev) => !prev);
  const toggleMic = () => setMicOn((prev) => !prev);

  const handleStart = async () => {
    if (!title.trim()) {
      setError('Please enter a stream title');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onStart({
        title: title.trim(),
        description: description.trim(),
        stream: streamRef.current,
      });
      // Stream ownership is now with StreamContext — don't stop its tracks on unmount.
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch (err) {
      setError(err.message || 'Failed to start stream');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stream-modal-overlay">
      <div className="stream-modal">
        <div className="stream-modal-header">
          <h2>Go Live</h2>
          <button className="icon-btn ghost" onClick={onCancel} disabled={loading}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="stream-modal-body">
          {/* Camera Preview */}
          <div className="stream-preview-container">
            {cameraOn ? (
              <video ref={videoRef} autoPlay muted playsInline className="stream-preview-video" />
            ) : (
              <div className="stream-preview-off">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
                  <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
                <span>Camera is off</span>
              </div>
            )}
            <div className="stream-preview-controls">
              <button
                className={`stream-preview-btn ${!cameraOn ? 'off' : ''}`}
                onClick={toggleCamera}
                title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {cameraOn ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                )}
              </button>
              <button
                className={`stream-preview-btn ${!micOn ? 'off' : ''}`}
                onClick={toggleMic}
                title={micOn ? 'Turn off microphone' : 'Turn on microphone'}
              >
                {micOn ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
                    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .76-.13 1.48-.36 2.14" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Stream Info */}
          <div className="stream-form">
            <div className="stream-form-group">
              <label>Stream Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="What's your stream about?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                disabled={loading}
              />
            </div>
            <div className="stream-form-group">
              <label>Description</label>
              <textarea
                className="form-input stream-textarea"
                placeholder="Add a description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Device Selectors */}
            {devices.cameras.length > 1 && (
              <div className="stream-form-group">
                <label>Camera</label>
                <select
                  className="form-input"
                  value={selectedCamera}
                  onChange={handleCameraChange}
                  disabled={loading || !cameraOn}
                >
                  {devices.cameras.map((cam) => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label || `Camera ${devices.cameras.indexOf(cam) + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {devices.mics.length > 1 && (
              <div className="stream-form-group">
                <label>Microphone</label>
                <select
                  className="form-input"
                  value={selectedMic}
                  onChange={handleMicChange}
                  disabled={loading || !micOn}
                >
                  {devices.mics.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microphone ${devices.mics.indexOf(mic) + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <div className="stream-error">{error}</div>}
          {notice && !error && <div className="stream-error">{notice}</div>}
        </div>

        <div className="stream-modal-footer">
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn-golive" onClick={handleStart} disabled={loading || !title.trim()}>
            {loading ? (
              <span className="loading-spinner small" />
            ) : (
              <>
                <span className="golive-dot" />
                Go Live
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoLiveModal;
