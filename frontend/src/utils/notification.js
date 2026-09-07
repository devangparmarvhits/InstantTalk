let audioCtx = null;

export const playNotificationSound = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(660, audioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch {
    // Audio is not critical
  }
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
};

export const showNotification = ({ title, body, icon }) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const notification = new Notification(title, {
      body,
      icon: icon || undefined,
      tag: 'instanttalk-message',
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Notification failed silently
  }
};