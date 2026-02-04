const pool = require('../config/database');

const setupSocketHandlers = (io) => {
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`[DevHire] User connected: ${socket.id}`);

    // User joins
    socket.on('user:join', (userId) => {
      connectedUsers.set(userId, socket.id);
      socket.join(`user:${userId}`);
      socket.emit('connection:success', { message: 'Connected to server' });
    });

    // Developer goes online
    socket.on('developer:online', async (developerId) => {
      try {
        await pool.query(
          'UPDATE developer_profiles SET availability_status = $1 WHERE id = $2',
          ['online', developerId]
        );

        io.emit('developer:status-changed', {
          developerId,
          status: 'online',
          timestamp: new Date(),
        });

        console.log(`[DevHire] Developer ${developerId} went online`);
      } catch (error) {
        console.error('Developer online error:', error);
      }
    });

    // Developer goes offline
    socket.on('developer:offline', async (developerId) => {
      try {
        await pool.query(
          'UPDATE developer_profiles SET availability_status = $1 WHERE id = $2',
          ['offline', developerId]
        );

        io.emit('developer:status-changed', {
          developerId,
          status: 'offline',
          timestamp: new Date(),
        });

        console.log(`[DevHire] Developer ${developerId} went offline`);
      } catch (error) {
        console.error('Developer offline error:', error);
      }
    });

    // Booking notification
    socket.on('booking:created', (data) => {
      const { developerId, bookingId, customerName, duration, rate } = data;

      io.to(`user:${developerId}`).emit('notification:booking-request', {
        bookingId,
        customerName,
        duration,
        rate,
        message: `${customerName} wants to book you for ${duration} minutes`,
      });

      console.log(`[DevHire] Booking notification sent to developer ${developerId}`);
    });

    // Booking confirmation
    socket.on('booking:confirmed', (data) => {
      const { customerId, developerId, bookingId, channelName } = data;

      io.to(`user:${customerId}`).emit('notification:booking-confirmed', {
        bookingId,
        message: 'Your booking has been confirmed. Redirecting to video call...',
        channelName,
      });

      io.to(`user:${developerId}`).emit('notification:call-ready', {
        bookingId,
        message: 'You have a confirmed booking. Join the video call.',
        channelName,
      });

      console.log(`[DevHire] Booking confirmed notifications sent for booking ${bookingId}`);
    });

    // Call started
    socket.on('call:started', (data) => {
      const { bookingId, channelName, customerId, developerId } = data;

      io.to(`user:${customerId}`).emit('call:participant-joined', {
        participantType: 'developer',
      });

      io.to(`user:${developerId}`).emit('call:participant-joined', {
        participantType: 'customer',
      });

      console.log(`[DevHire] Call started for booking ${bookingId}`);
    });

    // Call ended
    socket.on('call:ended', async (data) => {
      const { bookingId, customerId, developerId, duration, stats } = data;

      io.to(`user:${customerId}`).emit('notification:call-ended', {
        message: 'Call ended. Please rate your experience.',
        bookingId,
      });

      io.to(`user:${developerId}`).emit('notification:call-ended', {
        message: 'Call ended',
        bookingId,
      });

      console.log(`[DevHire] Call ended for booking ${bookingId}`);
    });

    // Availability update
    socket.on('availability:updated', async (data) => {
      const { developerId, slots } = data;

      io.emit('availability:changed', {
        developerId,
        slots,
        timestamp: new Date(),
      });

      console.log(`[DevHire] Availability updated for developer ${developerId}`);
    });

    // Message between users
    socket.on('message:send', (data) => {
      const { fromUserId, toUserId, message, bookingId } = data;

      io.to(`user:${toUserId}`).emit('message:received', {
        fromUserId,
        message,
        bookingId,
        timestamp: new Date(),
      });

      console.log(`[DevHire] Message sent from ${fromUserId} to ${toUserId}`);
    });

    // Payment status update
    socket.on('payment:completed', (data) => {
      const { bookingId, customerId, developerId, amount } = data;

      io.to(`user:${customerId}`).emit('notification:payment-confirmed', {
        bookingId,
        amount,
        message: 'Payment confirmed. Waiting for developer to confirm the call.',
      });

      io.to(`user:${developerId}`).emit('notification:payment-confirmed', {
        bookingId,
        amount,
        message: 'Customer payment confirmed. Ready to start the call?',
      });

      console.log(`[DevHire] Payment completed notification sent for booking ${bookingId}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`[DevHire] User ${userId} disconnected`);
          break;
        }
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`[DevHire] Socket error:`, error);
    });
  });
};

module.exports = { setupSocketHandlers };
