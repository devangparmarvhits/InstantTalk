import React, { useContext, useEffect, useState } from 'react';
import { format } from 'date-fns';
import Sidebar from '../../components/common/Sidebar';
import Avatar from '../../components/user/Avatar';
import { AuthContext } from '../../context/AuthContext';
import { getCallHistory, deleteCall, clearCallHistory } from '../../services/call.service';
import { CallContext } from '../../context/CallContext';
import CallHistoryContextMenu from '../../components/call/CallHistoryContextMenu';

const PhoneIcon = ({ direction }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`call-history-icon ${direction}`}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.63 4.35 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.9a16 16 0 0 0 6.1 6.1l1.06-.95a2 2 0 0 1 2.12-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const VideoIcon = ({ direction }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`call-history-icon ${direction}`} aria-label="Video call">
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="m16 10 5-3v10l-5-3z" />
  </svg>
);

const durationText = (seconds) => {
  if (!seconds) return '';
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const Calls = () => {
  const { user } = useContext(AuthContext);
  const { startCall } = useContext(CallContext) || {};
  const [calls, setCalls] = useState([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(null);

  useEffect(() => {
    getCallHistory()
      .then((data) => {
        setCalls(data.data?.calls || []);
        setTotalCalls(Number(data.data?.totalCount) || data.data?.calls?.length || 0);
      })
      .catch(() => setCalls([]))
      .finally(() => setLoading(false));
  }, []);

  const openMenu = (event, call, peer) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY, call, peer });
  };

  const callAgain = (type) => {
    const conversationId = menu?.call?.conversationId?._id || menu?.call?.conversationId;
    if (startCall && conversationId && menu?.peer?._id) {
      startCall(conversationId, menu.peer._id, type, menu.peer);
    }
  };

  const removeCall = async () => {
    if (!menu) return;
    try {
      await deleteCall(menu.call._id);
      setCalls((current) => current.filter((call) => call._id !== menu.call._id));
      setTotalCalls((current) => Math.max(0, current - 1));
    } catch (error) { console.error('Failed to delete call:', error); }
  };

  const removeCallHistory = async () => {
    try {
      await clearCallHistory();
      setCalls([]);
      setTotalCalls(0);
    } catch (error) { console.error('Failed to clear call history:', error); }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="calls-page">
        <header className="calls-page-header">
          <div><span className="calls-eyebrow">InstantTalk</span><h1>Call history</h1></div>
          <span className="calls-count">{totalCalls} {totalCalls === 1 ? 'call' : 'calls'}</span>
        </header>
        {loading ? <div className="calls-empty"><div className="loading-spinner" /></div> : calls.length === 0 ? (
          <div className="calls-empty"><PhoneIcon direction="outgoing" /><h2>No calls yet</h2><p>Your audio and video calls will appear here.</p></div>
        ) : (
          <div className="call-history-list">
            {calls.map((call) => {
              const isGroupCall = call.isGroup || call.conversationId?.isGroup;
              const isOutgoing = (call.caller?._id || call.caller)?.toString() === user?._id?.toString();
              const peer = isGroupCall
                ? { name: call.conversationId?.groupName || 'Group call' }
                : (isOutgoing ? call.receiver : call.caller);
              const direction = isOutgoing ? 'outgoing' : 'incoming';
              const callKind = call.type === 'video' ? 'Video' : 'Voice';
              const label = `${isOutgoing ? 'Outgoing' : 'Incoming'} ${callKind.toLowerCase()} call${call.status === 'completed' ? '' : ` · ${call.status.charAt(0).toUpperCase() + call.status.slice(1)}`}`;
              const CallTypeIcon = call.type === 'video' ? VideoIcon : PhoneIcon;
              return (
                <article className="call-history-item" key={call._id} onContextMenu={(event) => openMenu(event, call, peer)}>
                  <Avatar user={peer} size="md" />
                  <div className="call-history-person"><strong>{peer?.name || 'Unknown'}</strong><span className={call.status === 'missed' ? 'call-missed' : ''}><CallTypeIcon direction={direction} />{label}{call.duration ? ` · ${durationText(call.duration)}` : ''}</span></div>
                  <time dateTime={call.createdAt}>{format(new Date(call.createdAt), 'MMM d, h:mm a')}</time>
                </article>
              );
            })}
          </div>
        )}
        {menu && (
          <CallHistoryContextMenu
            x={menu.x}
            y={menu.y}
            onClose={() => setMenu(null)}
            onAudio={() => callAgain('audio')}
            onVideo={() => callAgain('video')}
            onDelete={removeCall}
            onClear={removeCallHistory}
          />
        )}
      </main>
    </div>
  );
};

export default Calls;
