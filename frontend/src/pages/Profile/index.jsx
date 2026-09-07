import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Avatar from '../../components/user/Avatar';
import { updateProfile, updateSettings } from '../../services/chat.service';
import { Toggle, Segmented, OptionRow } from './settingsUI';
import { playNotificationSound, requestNotificationPermission, showNotification } from '../../utils/notification';

const BackIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const EditIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const LogoutIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const DEFAULT_SETTINGS = {
  privacy: { lastSeen: 'everyone', onlineStatus: true, readReceipts: true, profilePhoto: 'everyone' },
  notifications: { messages: true, sound: true, preview: true },
  appearance: { theme: 'system', fontSize: 'medium' },
};

const WHO_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'contacts', label: 'My Contacts' },
  { value: 'nobody', label: 'Nobody' },
];

const TABS = [
  { id: 'profile', label: 'Profile Settings' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'appearance', label: 'Appearance' },
];

const Profile = () => {
  const { user, logout, updateUser, applyAppearance } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile');

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Privacy
  const [privacy, setPrivacy] = useState({
    ...DEFAULT_SETTINGS.privacy,
    ...(user?.settings?.privacy || {}),
  });

  // Notifications
  const [notifications, setNotifications] = useState({
    ...DEFAULT_SETTINGS.notifications,
    ...(user?.settings?.notifications || {}),
  });

  // Appearance
  const [appearance, setAppearance] = useState({
    ...DEFAULT_SETTINGS.appearance,
    ...(user?.settings?.appearance || {}),
  });

  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => setError(''), [activeTab]);
  useEffect(() => setSettingsError(''), [activeTab]);
  useEffect(() => setSuccess(''), [activeTab]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('bio', bio);
      const data = await updateProfile(formData);
      updateUser(data.data.user);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const data = await updateProfile(formData);
      updateUser(data.data.user);
      setSuccess('Profile photo updated!');
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const persistSetting = async (section, nextValue) => {
    setSettingsSaving(true);
    setSettingsError('');
    try {
      const data = await updateSettings(section, nextValue);
      updateUser(data.data.user);
      setSuccess(`${TABS.find((t) => t.id === section).label} updated`);
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Update failed');
    } finally {
      setSettingsSaving(false);
    }
  };

  const changePrivacy = (key, value) => {
    const next = { ...privacy, [key]: value };
    setPrivacy(next);
    persistSetting('privacy', next);
  };

  const changeNotifications = (key, value) => {
    const next = { ...notifications, [key]: value };
    setNotifications(next);
    persistSetting('notifications', next);
  };

  const changeAppearance = (key, value) => {
    const next = { ...appearance, [key]: value };
    setAppearance(next);
    // Apply theme + font-size instantly for a real-time feel
    applyAppearance({ appearance: next });
    persistSetting('appearance', next);
  };

  const handleTestNotification = async () => {
    const permission = await requestNotificationPermission();
    if (permission === 'granted' || permission === 'default') {
      if (notifications.sound !== false) {
        try { playNotificationSound(); } catch { /* ignore */ }
      }
      showNotification({
        title: 'InstantTalk',
        body: notifications.preview === false
          ? 'You have a new message'
          : 'Notifications are working — this is a test message.',
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const safetyNote = privacy.onlineStatus === false
    ? 'Your online status is hidden, so your "last seen" is hidden too.'
    : privacy.lastSeen === 'nobody'
      ? 'When "Last seen" is Nobody, your online status is also hidden.'
      : '';

  return (
    <div className="profile-layout">
      {/* Profile Sidebar */}
      <div className="profile-sidebar">
        <button
          id="back-to-chat"
          className="profile-back-btn"
          onClick={() => navigate('/chat')}
        >
          <BackIcon size={18} />
          <span>Back to Chats</span>
        </button>

        <div className="profile-menu-section">
          <div className="profile-menu-heading">Settings</div>
          {TABS.map((tab) => (
            <div
              key={tab.id}
              className={`profile-menu-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </div>
          ))}
        </div>

        <div className="profile-sidebar-footer">
          <button
            id="logout-btn"
            className="profile-logout-btn"
            onClick={handleLogout}
          >
            <LogoutIcon size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Settings Content */}
      <div className="profile-page">
        <div className="profile-card settings-card">
          <h2 className="profile-title">
            {TABS.find((t) => t.id === activeTab)?.label}
          </h2>

          {success && <div className="profile-success-alert">✓ {success}</div>}
          {error && <div className="auth-error-alert" style={{ marginBottom: 16 }}>{error}</div>}
          {settingsError && <div className="auth-error-alert" style={{ marginBottom: 16 }}>{settingsError}</div>}

          {/* ===== PROFILE TAB ===== */}
          {activeTab === 'profile' && (
            <>
              <div className="profile-avatar-section">
                <div
                  className="profile-avatar-wrapper"
                  onClick={() => fileInputRef.current?.click()}
                  title="Change photo"
                >
                  <Avatar user={user} size="xl" />
                  <div className="avatar-edit-overlay">
                    {uploading ? <div className="loading-spinner-sm" /> : <EditIcon size={20} />}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarUpload}
                />
                <div className="profile-name">{user?.name}</div>
                <div className="profile-email">{user?.email}</div>
              </div>

              <form className="auth-form" onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-name">Display Name</label>
                  <input
                    id="profile-name"
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="profile-email">Email (read-only)</label>
                  <input
                    id="profile-email"
                    type="email"
                    className="form-input disabled"
                    value={user?.email || ''}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="profile-bio">Bio</label>
                  <input
                    id="profile-bio"
                    type="text"
                    className="form-input"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell people about yourself..."
                    maxLength={200}
                  />
                </div>

                <button id="save-profile" type="submit" className="auth-submit-btn" disabled={saving}>
                  {saving ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <div className="loading-spinner" />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </form>
            </>
          )}

          {/* ===== PRIVACY TAB ===== */}
          {activeTab === 'privacy' && (
            <>
              <div className="setting-section">
                <div className="settings-section-title">Who can see my info</div>
                <div className="settings-section-desc">
                  Control how much of your activity others can see.
                </div>
              </div>

              <OptionRow
                label="Last seen"
                description="When you were last active in the app"
                control={
                  <Segmented
                    options={WHO_OPTIONS}
                    value={privacy.lastSeen}
                    onChange={(v) => changePrivacy('lastSeen', v)}
                  />
                }
              />

              <Toggle
                label="Show online status"
                description="Others can see when you're online"
                checked={privacy.onlineStatus}
                onChange={(v) => changePrivacy('onlineStatus', v)}
              />

              <OptionRow
                label="Profile photo"
                description="Who can see your profile photo"
                control={
                  <Segmented
                    options={WHO_OPTIONS}
                    value={privacy.profilePhoto}
                    onChange={(v) => changePrivacy('profilePhoto', v)}
                  />
                }
              />

              <div className="setting-subtitle">Message receipts</div>

              <Toggle
                label="Read receipts"
                description="Send ✓✓ read / delivered ticks to others when you read their messages. Off = senders only see ✓"
                checked={privacy.readReceipts}
                onChange={(v) => changePrivacy('readReceipts', v)}
              />

              {safetyNote && (
                <div className="settings-privacy-note">{safetyNote}</div>
              )}
            </>
          )}

          {/* ===== NOTIFICATIONS TAB ===== */}
          {activeTab === 'notifications' && (
            <>
              <div className="setting-section">
                <div className="settings-section-title">Notifications</div>
                <div className="settings-section-desc">
                  Choose what happens when a new message arrives.
                </div>
              </div>

              <Toggle
                label="Message notifications"
                description="Show browser notifications for new messages"
                checked={notifications.messages}
                onChange={(v) => changeNotifications('messages', v)}
              />

              <Toggle
                label="Notification sound"
                description="Play a short chime when a message arrives"
                checked={notifications.sound}
                onChange={(v) => changeNotifications('sound', v)}
              />

              <Toggle
                label="Message preview"
                description="Show message content in notifications. Off = just the sender's name"
                checked={notifications.preview}
                onChange={(v) => changeNotifications('preview', v)}
              />

              <button
                type="button"
                className="auth-submit-btn test-notif-btn"
                onClick={handleTestNotification}
              >
                Send test notification
              </button>
            </>
          )}

          {/* ===== APPEARANCE TAB ===== */}
          {activeTab === 'appearance' && (
            <>
              <div className="setting-section">
                <div className="settings-section-title">Theme</div>
                <div className="settings-section-desc">
                  Applied instantly across the whole app.
                </div>
              </div>

              <OptionRow
                label="Mode"
                control={
                  <Segmented
                    options={[
                      { value: 'dark', label: 'Dark' },
                      { value: 'light', label: 'Light' },
                      { value: 'system', label: 'System' },
                    ]}
                    value={appearance.theme}
                    onChange={(v) => changeAppearance('theme', v)}
                  />
                }
              />

              <div className="setting-subtitle">Text size</div>

              <OptionRow
                label="Message text size"
                control={
                  <Segmented
                    options={[
                      { value: 'small', label: 'Small' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'large', label: 'Large' },
                    ]}
                    value={appearance.fontSize}
                    onChange={(v) => changeAppearance('fontSize', v)}
                  />
                }
              />

              {settingsSaving && (
                <div className="settings-saving-indicator">
                  <div className="loading-spinner" style={{ width: 14, height: 14 }} />
                  Saving...
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;