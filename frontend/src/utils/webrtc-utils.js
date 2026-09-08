const DEFAULT_STUN = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const buildIceServers = (turnUrl, turnUsername, turnCredential) => {
  const servers = [...DEFAULT_STUN];

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
};

export const isIceConnected = (iceState) => {
  return iceState === 'connected' || iceState === 'completed';
};
