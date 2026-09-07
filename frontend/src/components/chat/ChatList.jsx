import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { ChatContext } from '../../context/ChatContext';
import { AuthContext } from '../../context/AuthContext';
import Avatar from '../user/Avatar';
import ConversationContextMenu from './ConversationContextMenu';
import { format, isToday, isYesterday } from 'date-fns';
import { formatLastSeen } from '../../utils/format';
import { getOrCreateConversation, getUsers, toggleFavorite, clearConversation, deleteConversation } from '../../services/chat.service';
import api from '../../services/api';
import { createGroup, getUserGroups, addMembers, removeMember, deleteGroup, leaveGroup, deleteGroup as deleteGroupApi, promoteToAdmin, demoteFromAdmin } from '../../services/group.service';
import { onSocketConnect } from '../../socket/socket';

/* ─── Icons ─── */
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const ComposeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const CheckIcon = ({ checked }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    {checked ? (
      <><polyline points="3 12 7 16 13 10"/><polyline points="9 12 13 16 21 8"/></>
    ) : (
      <circle cx="12" cy="12" r="10"/>
    )}
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

/* ─── Helpers ─── */
const formatConvTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE');
};

const getOtherParticipant = (conversation, currentUserId) => {
  return conversation.participants?.find((p) => p._id !== currentUserId) || {};
};

const getConvPreview = (conversation, currentUserId) => {
  const msg = conversation.lastMessage;
  if (!msg) return 'No messages yet';
  const isMe = msg.sender?._id === currentUserId || msg.sender === currentUserId;
  const prefix = isMe ? 'You: ' : '';
  if (msg.type === 'image') {
    try { const p = JSON.parse(msg.content); return prefix + (p.name || 'Photo'); } catch {}
    return prefix + 'Photo';
  }
  if (msg.type === 'file') {
    try { const p = JSON.parse(msg.content); return prefix + (p.name || 'File'); } catch {}
    return prefix + 'File';
  }
  if (msg.type === 'call') {
    try {
      const p = JSON.parse(msg.content || '{}');
      const callLabel = p.callType === 'video' ? 'Video call' : 'Voice call';
      const status = p.status === 'missed' ? 'Missed' : p.status === 'declined' ? 'Cancelled' : '';
      return `${prefix}${callLabel}${status ? ` · ${status}` : ''}`;
    } catch {
      return `${prefix}Voice call`;
    }
  }
  let text = msg.content || '';
  try { const p = JSON.parse(text); if (p.url) text = p.name || 'File'; } catch {}
  return `${prefix}${text}`;
};

const TABS = ['All', 'Unread', 'Favorites'];

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
const ChatList = () => {
  const location = useLocation();
  const { conversations, activeConversation, selectConversation, loadingConversations, isUserOnline, loadConversations } = useContext(ChatContext);
  const { user } = useContext(AuthContext);

  /* ─── Shared State ─── */
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(timer);
  }, [search]);
  const [activeTab, setActiveTab] = useState('All');
  const [conversationMenu, setConversationMenu] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  /* ─── People / New Chat State ─── */
  const [showNewChat, setShowNewChat] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  /* ─── Groups State ─── */
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(null); // group object for info panel
  const [showAddMembers, setShowAddMembers] = useState(null); // group object for add members modal

  const isGroups = location.pathname === '/groups';

  /* ─── Data Fetching ─── */
  const fetchUsers = useCallback(() => {
    setLoadingUsers(true);
    getUsers()
      .then((data) => setAllUsers(data.data.users || []))
      .catch(() => setAllUsers([]))
      .finally(() => setLoadingUsers(false));
  }, []);

  const fetchGroups = useCallback(() => {
    setLoadingGroups(true);
    getUserGroups()
      .then((data) => setGroups(data.data.groups || []))
      .catch(() => setGroups([]))
      .finally(() => setLoadingGroups(false));
  }, []);

  useEffect(() => {
    if (location.pathname === '/people' || showNewChat || showCreateGroup || showAddMembers) fetchUsers();
    if (isGroups) fetchGroups();
  }, [location.pathname, showNewChat, showCreateGroup, showAddMembers, isGroups, fetchUsers, fetchGroups]);

  useEffect(() => {
    const unsubscribe = onSocketConnect((socket) => {
      socket.off('users_refresh');
      socket.on('users_refresh', () => fetchUsers());
      socket.off('conversation_updated');
      socket.on('conversation_updated', () => {
        if (isGroups) fetchGroups();
      });
    });
    return unsubscribe;
  }, [fetchUsers, fetchGroups, isGroups]);

  /* ─── Derived Data ─── */
  const isOnlineFor = (u) => isUserOnline(u?._id) && u?.lastSeen != null;

  const pageTitle = { '/chat': 'Chats', '/people': 'People', '/groups': 'Groups', '/calls': 'Calls' }[location.pathname] || 'Chats';

  const getUnread = (c) => c.unreadCount?.get?.(user?._id) || c.unreadCount?.[user?._id] || 0;
  const getFav = (c) => c.isFavorite?.get?.(user?._id) || c.isFavorite?.[user?._id] || false;
  const unreadCount = conversations.reduce((sum, c) => sum + (getUnread(c) > 0 ? 1 : 0), 0);
  const favCount = conversations.reduce((sum, c) => sum + (getFav(c) ? 1 : 0), 0);

  const filteredConversations = conversations
    .filter((c) => {
      if (c.isGroup) return false; // groups don't show in chat tab
      const other = getOtherParticipant(c, user?._id);
      const name = other?.name || '';
      const matchesSearch = name.toLowerCase().includes(debouncedSearch.toLowerCase());
      if (activeTab === 'Unread') return matchesSearch && getUnread(c) > 0;
      if (activeTab === 'Favorites') return matchesSearch && getFav(c);
      return matchesSearch;
    })
    .sort((a, b) => {
      const favoriteOrder = Number(getFav(b)) - Number(getFav(a));
      if (favoriteOrder !== 0) return favoriteOrder;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

  const filteredGroups = groups.filter((g) => {
    return (g.groupName || '').toLowerCase().includes(debouncedSearch.toLowerCase());
  });

  const filteredUsers = allUsers.filter((u) =>
    u.name.toLowerCase().includes((location.pathname === '/people' ? debouncedSearch : userSearch).toLowerCase())
  );

  /* ─── Actions ─── */
  const handleToggleFavorite = async (e, convId) => {
    e?.stopPropagation?.();
    try { await toggleFavorite(convId); loadConversations(); } catch (err) { console.error(err); }
  };

  const closeConversationMenu = useCallback(() => setConversationMenu(null), []);

  const handleConversationMenu = (event, conversation) => {
    event.preventDefault();
    event.stopPropagation();
    setConversationMenu({
      conversation,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleClearConversation = async (conversation) => {
    try {
      await clearConversation(conversation._id);
      if (activeConversation?._id === conversation._id) selectConversation(null);
      loadConversations();
    } catch (err) { console.error('Failed to clear chat:', err); }
  };

  const handleDeleteConversation = async (conversation) => {
    try {
      await deleteConversation(conversation._id);
      if (activeConversation?._id === conversation._id) selectConversation(null);
      loadConversations();
    } catch (err) { console.error('Failed to delete chat:', err); }
  };

  const handleBlockUser = async (conversation) => {
    const other = getOtherParticipant(conversation, user?._id);
    try {
      await api.post(`/api/users/${other._id}/block`);
      await deleteConversation(conversation._id);
      if (activeConversation?._id === conversation._id) selectConversation(null);
      loadConversations();
    } catch (err) { console.error('Failed to block user:', err); }
  };

  const handleDeleteGroup = async (group) => {
    try {
      await deleteGroupApi(group._id);
      if (activeConversation?._id === group._id) selectConversation(null);
      fetchGroups();
    } catch (err) { console.error('Failed to delete group:', err); }
  };

  const handleLeaveGroup = async (group) => {
    try {
      await leaveGroup(group._id);
      if (activeConversation?._id === group._id) selectConversation(null);
      fetchGroups();
    } catch (err) { console.error('Failed to leave group:', err); }
  };

  const requestConfirmation = (type, conversation) => {
    const otherName = getOtherParticipant(conversation, user?._id)?.name || 'this user';
    const details = {
      clear: {
        title: 'Clear all chat?',
        message: 'All messages in this chat will be cleared for you.',
        confirmLabel: 'Clear chat',
        action: () => handleClearConversation(conversation),
      },
      delete: {
        title: 'Delete this chat?',
        message: `The chat with ${otherName} will be removed from your chats.`,
        confirmLabel: 'Delete chat',
        action: () => handleDeleteConversation(conversation),
      },
      block: {
        title: `Block ${otherName}?`,
        message: 'You will no longer receive messages from this user.',
        confirmLabel: 'Block user',
        action: () => handleBlockUser(conversation),
      },
      deleteGroup: {
        title: `Delete ${conversation.groupName || 'this group'}?`,
        message: 'This group and its chat will be permanently deleted.',
        confirmLabel: 'Delete group',
        action: () => handleDeleteGroup(conversation),
      },
      leaveGroup: {
        title: `Leave ${conversation.groupName || 'this group'}?`,
        message: 'You will leave this group and no longer receive its messages.',
        confirmLabel: 'Leave group',
        action: () => handleLeaveGroup(conversation),
      },
    };
    setConfirmation(details[type]);
  };

  const startChat = async (targetUser) => {
    try {
      const data = await getOrCreateConversation(targetUser._id);
      setShowNewChat(false);
      selectConversation(data.data.conversation);
    } catch (err) { console.error(err); }
  };

  const openGroupChat = (group) => {
    // Convert group to conversation-like object for ChatWindow
    selectConversation(group);
  };

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  return (
    <>
      <div className="chat-list-panel">
        {/* Header */}
        <div className="chat-list-header">
          <h2>{pageTitle}</h2>
          {isGroups ? (
            <button id="create-group-btn" className="icon-btn" onClick={() => setShowCreateGroup(true)} title="Create Group">
              <PlusIcon />
            </button>
          ) : (
            <button id="new-chat-btn" className="icon-btn" onClick={() => setShowNewChat(true)} title="New Chat">
              <ComposeIcon />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <SearchIcon />
            <input
              id="chat-search"
              type="text"
              placeholder={isGroups ? "Search groups..." : location.pathname === '/people' ? "Search people..." : "Search conversations..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filter Tabs (only for Chats) */}
        {location.pathname === '/chat' && (
          <div className="filter-tabs">
            {TABS.map((tab) => {
              const count = tab === 'Unread' ? unreadCount : tab === 'Favorites' ? favCount : null;
              return (
                <button key={tab} id={`tab-${tab.toLowerCase()}`} className={`filter-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab}{count != null && count > 0 ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── List Content ─── */}
        <div className="conversation-list">

          {/* ═══ PEOPLE LIST ═══ */}
          {location.pathname === '/people' && (
            loadingUsers ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                <div className="loading-spinner" style={{ borderTopColor: 'var(--accent-primary)', width: 24, height: 24 }} />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 13 }}>No people found</div>
            ) : (
              filteredUsers.map((u) => (
                <div key={u._id} className="user-list-item" onClick={() => startChat(u)} style={{ padding: '10px', borderRadius: 'var(--radius-md)' }}>
                  <Avatar user={u} size="md" showStatus isOnline={isOnlineFor(u)} />
                  <div className="user-list-item-info">
                    <div className="user-list-item-name">{u.name}</div>
                    <div className={`user-list-item-status ${isOnlineFor(u) ? 'online' : ''}`}>
                      {isOnlineFor(u) ? '● Online' : u.lastSeen != null ? formatLastSeen(u.lastSeen) : ''}
                    </div>
                  </div>
                </div>
              ))
            )
          )}

          {/* ═══ GROUPS LIST ═══ */}
          {isGroups && (
            loadingGroups ? (
              <div>
                {[1,2,3].map(i => (
                  <div key={i} className="skeleton-conv-item">
                    <div className="skeleton skeleton-avatar" />
                    <div className="skeleton-lines" style={{ flex: 1 }}>
                      <div className="skeleton skeleton-line w60" style={{ height: 14 }} />
                      <div className="skeleton skeleton-line w80" style={{ height: 10 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
                {debouncedSearch ? 'No groups found' : (
                  <>
                    <div style={{ marginBottom: 8 }}>No groups yet</div>
                    <button className="filter-tab active" onClick={() => setShowCreateGroup(true)} style={{ marginTop: 4 }}>
                      <PlusIcon /> Create Group
                    </button>
                  </>
                )}
              </div>
            ) : (
              filteredGroups.map((group) => {
                const isActive = activeConversation?._id === group._id;
                const memberCount = group.participants?.length || 0;
                const unread = group.unreadCount?.get?.(user?._id) || group.unreadCount?.[user?._id] || 0;
                const unreadText = unread > 100 ? '100+' : unread > 0 ? String(unread) : '';

                return (
                  <div key={group._id} className={`conversation-item ${isActive ? 'active' : ''}`} onClick={() => openGroupChat(group)} onContextMenu={(event) => handleConversationMenu(event, group)}>
                    <Avatar user={{ name: group.groupName }} size="md" />
                    <div className="conv-info">
                      <div className="conv-top">
                        <span className="conv-name">{group.groupName}</span>
                        <span className="conv-time">{group.lastMessage ? formatConvTime(group.updatedAt) : ''}</span>
                      </div>
                      <div className="conv-bottom">
                        <span className="conv-preview" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <UsersIcon /> {memberCount} member{memberCount !== 1 ? 's' : ''}
                          {group.lastMessage ? ` · ${getConvPreview(group, user?._id)}` : ''}
                        </span>
                        <div className="conv-bottom-right">
                          {unreadText && <span className="conv-unread-badge">{unreadText}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}

          {/* ═══ CHATS / CALLS LIST ═══ */}
          {!isGroups && location.pathname !== '/people' && (
            loadingConversations ? (
              <div>
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="skeleton-conv-item">
                    <div className="skeleton skeleton-avatar" />
                    <div className="skeleton-lines" style={{ flex: 1 }}>
                      <div className="skeleton skeleton-line w60" style={{ height: 14 }} />
                      <div className="skeleton skeleton-line w80" style={{ height: 10 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
                {debouncedSearch ? 'No conversations found' : 'No conversations yet. Start chatting!'}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const other = getOtherParticipant(conv, user?._id);
                const isActive = activeConversation?._id === conv._id;
                const isOnline = isOnlineFor(other);
                const unread = conv.unreadCount?.get?.(user?._id) || conv.unreadCount?.[user?._id] || 0;
                const unreadText = unread > 100 ? '100+' : unread > 0 ? String(unread) : '';

                return (
                  <div key={conv._id} id={`conv-${conv._id}`} className={`conversation-item ${isActive ? 'active' : ''}`} onClick={() => selectConversation(conv)} onContextMenu={(event) => handleConversationMenu(event, conv)}>
                    <Avatar user={other} size="md" />
                    <div className="conv-info">
                      <div className="conv-top">
                        <span className="conv-name">{other?.name || 'Unknown'}</span>
                        {getFav(conv) && (
                          <svg viewBox="0 0 24 24" fill="#f59e0b" stroke="none" width="12" height="12" style={{ flexShrink: 0 }}>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                        )}
                        <span className="conv-time">{conv.lastMessage ? formatConvTime(conv.updatedAt) : ''}</span>
                      </div>
                      <div className="conv-bottom">
                        <span className="conv-preview">{getConvPreview(conv, user?._id)}</span>
                        <div className="conv-bottom-right">
                          {unreadText && <span className="conv-unread-badge">{unreadText}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {conversationMenu && (
        <ConversationContextMenu
          x={conversationMenu.x}
          y={conversationMenu.y}
          isFavorite={getFav(conversationMenu.conversation)}
          deleteLabel={conversationMenu.conversation.isGroup ? 'Delete group' : 'Delete user'}
          blockLabel={conversationMenu.conversation.isGroup ? 'Leave group' : 'Block user'}
          onClose={closeConversationMenu}
          onFavorite={() => handleToggleFavorite(null, conversationMenu.conversation._id)}
          onClear={() => requestConfirmation('clear', conversationMenu.conversation)}
          onDelete={() => conversationMenu.conversation.isGroup
            ? requestConfirmation('deleteGroup', conversationMenu.conversation)
            : requestConfirmation('delete', conversationMenu.conversation)}
          onBlock={() => conversationMenu.conversation.isGroup
            ? requestConfirmation('leaveGroup', conversationMenu.conversation)
            : requestConfirmation('block', conversationMenu.conversation)}
        />
      )}

      {confirmation && (
        <div className="modal-overlay" onClick={() => setConfirmation(null)}>
          <div className="modal-content conversation-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{confirmation.title}</h3>
              <button className="modal-close" onClick={() => setConfirmation(null)} aria-label="Close confirmation">×</button>
            </div>
            <p className="conversation-confirm-message">{confirmation.message}</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmation(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { const action = confirmation.action; setConfirmation(null); action(); }}>
                {confirmation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
         MODALS
         ═══════════════════════════════════════════════ */}

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Chat</h3>
              <button className="modal-close" onClick={() => setShowNewChat(false)}><CloseIcon /></button>
            </div>
            <div className="search-input-wrapper">
              <SearchIcon />
              <input id="user-search" type="text" placeholder="Search people..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} autoFocus />
            </div>
            <div className="user-list">
              {loadingUsers ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                  <div className="loading-spinner" style={{ borderTopColor: 'var(--accent-primary)', width: 22, height: 22 }} />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No users found</div>
              ) : (
                filteredUsers.map((u) => (
                  <div key={u._id} id={`user-${u._id}`} className="user-list-item" onClick={() => startChat(u)}>
                    <Avatar user={u} size="sm" showStatus isOnline={isOnlineFor(u)} />
                    <div className="user-list-item-info">
                      <div className="user-list-item-name">{u.name}</div>
                      <div className="user-list-item-status">
                        {isOnlineFor(u) ? '🟢 Online' : u.lastSeen != null ? 'Offline' : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal
          allUsers={allUsers}
          loadingUsers={loadingUsers}
          onClose={() => setShowCreateGroup(false)}
          onCreated={(group) => {
            setShowCreateGroup(false);
            fetchGroups();
            selectConversation(group);
          }}
        />
      )}

      {/* Add Members Modal */}
      {showAddMembers && (
        <AddMembersModal
          group={showAddMembers}
          allUsers={allUsers}
          onClose={() => setShowAddMembers(null)}
          onAdded={(updatedGroup) => {
            setShowAddMembers(null);
            if (updatedGroup) setShowGroupInfo(updatedGroup);
            fetchGroups();
          }}
        />
      )}

      {/* Group Info Panel */}
      {showGroupInfo && (
        <GroupInfoPanel
          group={showGroupInfo}
          user={user}
          onClose={() => setShowGroupInfo(null)}
          onAddMembers={() => setShowAddMembers(showGroupInfo)}
          onLeave={async () => {
            try {
              await leaveGroup(showGroupInfo._id);
              setShowGroupInfo(null);
              fetchGroups();
              loadConversations();
            } catch (err) { console.error(err); }
          }}
          onDelete={async () => {
            if (!window.confirm('Delete this group permanently?')) return;
            try {
              await deleteGroupApi(showGroupInfo._id);
              setShowGroupInfo(null);
              fetchGroups();
              loadConversations();
            } catch (err) { console.error(err); }
          }}
          onRemoveMember={async (memberId) => {
            try {
              const data = await removeMember(showGroupInfo._id, memberId);
              setShowGroupInfo(data.data.conversation);
              fetchGroups();
            } catch (err) { console.error(err); }
          }}
          onPromote={async (memberId) => {
            try {
              const data = await promoteToAdmin(showGroupInfo._id, memberId);
              setShowGroupInfo((current) => ({ ...current, admins: data.data.admins }));
              fetchGroups();
            } catch (err) { console.error(err); }
          }}
          onDemote={async (memberId) => {
            try {
              const data = await demoteFromAdmin(showGroupInfo._id, memberId);
              setShowGroupInfo((current) => ({ ...current, admins: data.data.admins }));
              fetchGroups();
            } catch (err) { console.error(err); }
          }}
        />
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════
   CREATE GROUP MODAL
   ═══════════════════════════════════════════════ */
const CreateGroupModal = ({ allUsers, loadingUsers, onClose, onCreated }) => {
  const { user } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const filtered = allUsers.filter((u) =>
    u._id !== user?._id &&
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleMember = (u) => {
    setSelected((prev) =>
      prev.some((s) => s._id === u._id)
        ? prev.filter((s) => s._id !== u._id)
        : [...prev, u]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Group name is required'); return; }
    if (selected.length === 0) { setError('Select at least one member'); return; }
    setSubmitting(true);
    setError('');
    try {
      const data = await createGroup({
        name: name.trim(),
        description,
        memberIds: selected.map((s) => s._id),
      });
      onCreated(data.data.conversation);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h3>Create Group</h3>
          <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        </div>

        {error && <div className="auth-error-alert" style={{ marginBottom: 8 }}>{error}</div>}

        {/* Group name */}
        <div className="form-group">
          <label className="form-label">Group Name</label>
          <input className="form-input" type="text" placeholder="e.g. Dev Team" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        {/* Description */}
        <div className="form-group" style={{ marginTop: 8 }}>
          <label className="form-label">Description (optional)</label>
          <input className="form-input" type="text" placeholder="What's this group about?" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {/* Member search */}
        <div className="search-input-wrapper" style={{ marginTop: 12 }}>
          <SearchIcon />
          <input type="text" placeholder="Search people..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* User list — show min 3, then scroll */}
        <div className="user-list" style={{ marginTop: 8, maxHeight: 180, overflowY: 'auto' }}>
          {loadingUsers ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
              <div className="loading-spinner" style={{ borderTopColor: 'var(--accent-primary)', width: 22, height: 22 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No users found</div>
          ) : (
            filtered.map((u) => {
              const isSelected = selected.some((s) => s._id === u._id);
              return (
                <div key={u._id} className={`group-member-item ${isSelected ? 'selected' : ''}`} onClick={() => toggleMember(u)}>
                  <Avatar user={u} size="sm" />
                  <span className="group-member-name">{u.name}</span>
                  <span className={`group-member-check ${isSelected ? 'checked' : ''}`}>
                    <CheckIcon checked={isSelected} />
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Create button */}
        <div className="modal-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={submitting || !name.trim() || selected.length === 0}>
            {submitting ? 'Creating...' : `Create (${selected.length + 1} members)`}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   ADD MEMBERS MODAL
   ═══════════════════════════════════════════════ */
const AddMembersModal = ({ group, allUsers, onClose, onAdded }) => {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const memberIds = (group.participants || []).map((p) => p._id?.toString() || p.toString());
  const filtered = allUsers.filter((u) =>
    !memberIds.includes(u._id) &&
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleMember = (u) => {
    setSelected((prev) =>
      prev.some((s) => s._id === u._id) ? prev.filter((s) => s._id !== u._id) : [...prev, u]
    );
  };

  const handleAdd = async () => {
    if (selected.length === 0) return;
    setSubmitting(true);
    try {
      const data = await addMembers(group._id, selected.map((s) => s._id));
      onAdded(data.data.conversation);
    } catch (err) { console.error(err); } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Members</h3>
          <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="search-input-wrapper">
          <SearchIcon />
          <input type="text" placeholder="Search people..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
        </div>
        <div className="user-list" style={{ maxHeight: 260, overflowY: 'auto', marginTop: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No more users to add</div>
          ) : (
            filtered.map((u) => {
              const isSelected = selected.some((s) => s._id === u._id);
              return (
                <div key={u._id} className={`group-member-item ${isSelected ? 'selected' : ''}`} onClick={() => toggleMember(u)}>
                  <Avatar user={u} size="sm" />
                  <span className="group-member-name">{u.name}</span>
                  <span className={`group-member-check ${isSelected ? 'checked' : ''}`}>
                    <CheckIcon checked={isSelected} />
                  </span>
                </div>
              );
            })
          )}
        </div>
        <div className="modal-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={submitting || selected.length === 0}>
            {submitting ? 'Adding...' : `Add ${selected.length || ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   GROUP INFO PANEL (replaces ChatWindow when on /groups)
   ═══════════════════════════════════════════════ */
const GroupInfoPanel = ({ group, user, onClose, onAddMembers, onLeave, onDelete, onRemoveMember, onPromote, onDemote }) => {
  const currentUserId = user?._id?.toString();
  const creatorId = (group.createdBy?._id || group.createdBy)?.toString();
  const isCreator = !!currentUserId && creatorId === currentUserId;
  const isAdmin = group.admins?.some((a) => (a._id || a)?.toString() === currentUserId) || isCreator;

  return (
    <div className="group-info-panel">
      <div className="chat-header">
        <div className="chat-header-user">
          <Avatar user={{ name: group.groupName }} size="md" />
          <div className="chat-header-info">
            <h3>{group.groupName}</h3>
            <span className="status-text offline">{group.participants?.length || 0} members</span>
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="header-action-btn" onClick={onClose} title="Back to groups">
            <CloseIcon />
          </button>
        </div>
      </div>

      <div style={{ overflowY: 'auto', padding: 20, maxHeight: 'calc(100vh - 120px)' }}>
        {/* Group info */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Avatar user={{ name: group.groupName }} size="xl" />
          <h2 style={{ marginTop: 12, fontSize: 20, fontWeight: 700 }}>{group.groupName}</h2>
          {group.groupDescription && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{group.groupDescription}</p>
          )}
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
            Created by {group.createdBy?.name || 'Unknown'}
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {isAdmin && (
            <button className="btn btn-primary" onClick={onAddMembers} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PlusIcon /> Add Members
            </button>
          )}
          {!isCreator && (
            <button className="btn btn-secondary" onClick={onLeave} style={{ color: 'var(--danger)' }}>
              Leave Group
            </button>
          )}
          {isCreator && (
            <button className="btn btn-secondary" onClick={onDelete} style={{ color: 'var(--danger)' }}>
              <TrashIcon /> Delete Group
            </button>
          )}
        </div>

        {/* Members list */}
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Members ({group.participants?.length || 0})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(group.participants || []).map((p) => {
            const memberId = p._id?.toString() || p.toString();
            const isMemberCreator = (group.createdBy?._id || group.createdBy)?.toString() === memberId;
            const isMemberAdmin = group.admins?.some((a) => (a._id || a)?.toString() === memberId);
            const isMe = user?._id?.toString() === memberId;

            return (
              <div key={memberId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--radius-md)', transition: 'background 0.15s' }}>
                <Avatar user={p} size="sm" showStatus />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name || 'Unknown'}{isMe && ' (You)'}</div>
                  {isMemberCreator && <span style={{ fontSize: 11, color: 'var(--accent-primary)' }}>Creator</span>}
                  {isMemberAdmin && !isMemberCreator && <span style={{ fontSize: 11, color: 'var(--warning)' }}>Admin</span>}
                </div>
                {isAdmin && !isMe && !isMemberCreator && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => isMemberAdmin ? onDemote(memberId) : onPromote(memberId)} style={{ background: 'none', border: 'none', color: isMemberAdmin ? 'var(--warning)' : 'var(--accent-primary)', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, fontSize: 11 }} title={isMemberAdmin ? 'Demote admin' : 'Promote to admin'}>
                      {isMemberAdmin ? 'Demote' : 'Promote'}
                    </button>
                    <button onClick={() => onRemoveMember(memberId)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4, borderRadius: 4 }} title="Remove member">
                      <CloseIcon />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChatList;
