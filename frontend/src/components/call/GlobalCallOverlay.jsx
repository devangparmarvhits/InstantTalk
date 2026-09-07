import React, { useContext } from 'react';
import { CallContext } from '../../context/CallContext';
import { AuthContext } from '../../context/AuthContext';
import CallPanel from './CallPanel';

/**
 * GlobalCallOverlay — renders the CallPanel (incoming + active) on every page.
 * It reads the call state from CallContext and resolves the "other" user info
 * from call.remoteUser (set by the socket invite handler).
 *
 * This component is safe to render anywhere — it returns null when call is idle.
 */
const GlobalCallOverlay = () => {
  const callCtx = useContext(CallContext);
  const { user } = useContext(AuthContext);

  if (!callCtx) return null;

  const { call, acceptCall, rejectCall, endCall, toggleMute, toggleSpeaker, toggleCamera } = callCtx;

  // Keep the panel visible when setup failed so the user can read the error.
  if (call.status === 'idle' && !call.error) return null;

  // The "other" user is resolved by CallContext from the incoming invite data
  // (call.remoteUser) or from conversation participants when starting an outgoing call
  const other = call.remoteUser || null;

  return (
    <CallPanel
      call={call}
      other={other}
      onAccept={acceptCall}
      onReject={rejectCall}
      onEnd={endCall}
      onToggleMute={toggleMute}
      onToggleSpeaker={toggleSpeaker}
      onToggleCamera={toggleCamera}
    />
  );
};

export default GlobalCallOverlay;
