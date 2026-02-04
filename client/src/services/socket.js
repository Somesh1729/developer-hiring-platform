import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://developer-hiring-platform-1.onrender.com';

let socket = null;

const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[DevHire] Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('[DevHire] Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('[DevHire] Socket error:', error);
    });
  }

  return socket;
};

const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

const joinUserRoom = (userId) => {
  const s = getSocket();
  s.emit('user:join', userId);
};

const goOnline = (developerId) => {
  const s = getSocket();
  s.emit('developer:online', developerId);
};

const goOffline = (developerId) => {
  const s = getSocket();
  s.emit('developer:offline', developerId);
};

const notifyBookingRequest = (developerId, bookingId, customerName, duration, rate) => {
  const s = getSocket();
  s.emit('booking:created', {
    developerId,
    bookingId,
    customerName,
    duration,
    rate,
  });
};

const notifyBookingConfirmed = (customerId, developerId, bookingId, channelName) => {
  const s = getSocket();
  s.emit('booking:confirmed', {
    customerId,
    developerId,
    bookingId,
    channelName,
  });
};

const notifyCallStarted = (bookingId, channelName, customerId, developerId) => {
  const s = getSocket();
  s.emit('call:started', {
    bookingId,
    channelName,
    customerId,
    developerId,
  });
};

const notifyCallEnded = (bookingId, customerId, developerId, duration, stats) => {
  const s = getSocket();
  s.emit('call:ended', {
    bookingId,
    customerId,
    developerId,
    duration,
    stats,
  });
};

const notifyPaymentCompleted = (bookingId, customerId, developerId, amount) => {
  const s = getSocket();
  s.emit('payment:completed', {
    bookingId,
    customerId,
    developerId,
    amount,
  });
};

const onBookingRequest = (callback) => {
  const s = getSocket();
  s.on('notification:booking-request', callback);
};

const onBookingConfirmed = (callback) => {
  const s = getSocket();
  s.on('notification:booking-confirmed', callback);
};

const onCallReady = (callback) => {
  const s = getSocket();
  s.on('notification:call-ready', callback);
};

const onCallParticipantJoined = (callback) => {
  const s = getSocket();
  s.on('call:participant-joined', callback);
};

const onCallEnded = (callback) => {
  const s = getSocket();
  s.on('notification:call-ended', callback);
};

const onDeveloperStatusChanged = (callback) => {
  const s = getSocket();
  s.on('developer:status-changed', callback);
};

const onAvailabilityChanged = (callback) => {
  const s = getSocket();
  s.on('availability:changed', callback);
};

const offEvent = (event) => {
  const s = getSocket();
  s.off(event);
};

export {
  initSocket,
  getSocket,
  joinUserRoom,
  goOnline,
  goOffline,
  notifyBookingRequest,
  notifyBookingConfirmed,
  notifyCallStarted,
  notifyCallEnded,
  notifyPaymentCompleted,
  onBookingRequest,
  onBookingConfirmed,
  onCallReady,
  onCallParticipantJoined,
  onCallEnded,
  onDeveloperStatusChanged,
  onAvailabilityChanged,
  offEvent,
};
