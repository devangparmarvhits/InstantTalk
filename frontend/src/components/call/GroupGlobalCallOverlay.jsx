import React, { useContext } from 'react';
import { GroupCallContext } from '../../context/GroupCallContext';
import GroupCallPanel from './GroupCallPanel';

const GroupGlobalCallOverlay = () => {
  const groupCallCtx = useContext(GroupCallContext);

  if (!groupCallCtx) return null;

  const {
    groupCall,
    acceptGroupCall,
    rejectGroupCall,
    leaveGroupCall,
    endGroupCall,
    toggleMute,
    toggleCamera,
  } = groupCallCtx;

  if (groupCall.status === 'idle') return null;

  return (
    <GroupCallPanel
      groupCall={groupCall}
      onAccept={acceptGroupCall}
      onReject={rejectGroupCall}
      onEnd={endGroupCall}
      onLeave={leaveGroupCall}
      onToggleMute={toggleMute}
      onToggleCamera={toggleCamera}
    />
  );
};

export default GroupGlobalCallOverlay;
