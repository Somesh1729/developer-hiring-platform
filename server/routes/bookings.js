const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../utils/auth');
const { generateAgoraToken, generateChannelName } = require('../utils/agora');

const router = express.Router();

// Create booking
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { developer_id, scheduled_at, duration_minutes } = req.body;
    const customer_user_id = req.userId;

    // Get developer and their rate
    const devResult = await pool.query(
      'SELECT user_id, hourly_rate FROM developer_profiles WHERE id = $1',
      [developer_id]
    );

    if (devResult.rows.length === 0) {
      return res.status(404).json({ error: 'Developer not found' });
    }

    const { user_id: developer_user_id, hourly_rate } = devResult.rows[0];

    // Calculate total amount
    const totalAmount = (hourly_rate / 60) * duration_minutes;

    // Create booking
    const bookingResult = await pool.query(
      `INSERT INTO bookings 
      (customer_user_id, developer_id, developer_user_id, scheduled_at, duration_minutes, hourly_rate, total_amount) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *`,
      [customer_user_id, developer_id, developer_user_id, scheduled_at, duration_minutes, hourly_rate, totalAmount]
    );

    const booking = bookingResult.rows[0];

    res.status(201).json({
      booking,
      message: 'Booking created successfully. Please proceed to payment.',
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get user bookings
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (parseInt(userId) !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT 
        b.*,
        u.full_name as developer_name,
        u.profile_picture_url,
        dp.hourly_rate
      FROM bookings b
      JOIN users u ON b.developer_user_id = u.id
      JOIN developer_profiles dp ON b.developer_id = dp.id
      WHERE b.customer_user_id = $1 OR b.developer_user_id = $1
      ORDER BY b.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get booking by ID
router.get('/:bookingId', authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const result = await pool.query(
      `SELECT 
        b.*,
        u.full_name as developer_name,
        u.profile_picture_url,
        cu.full_name as customer_name,
        cu.profile_picture_url as customer_picture
      FROM bookings b
      JOIN users u ON b.developer_user_id = u.id
      JOIN users cu ON b.customer_user_id = cu.id
      WHERE b.id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = result.rows[0];

    // Verify access
    if (booking.customer_user_id !== req.userId && booking.developer_user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Confirm booking (after payment)
router.put('/:bookingId/confirm', authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Get booking
    const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // Verify customer
    if (booking.customer_user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Verify payment is completed
    if (booking.payment_status !== 'completed') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Generate Agora channel and tokens
    const channelName = generateChannelName(bookingId);
    const customerUid = booking.customer_user_id;
    const developerUid = booking.developer_user_id;

    const customerToken = generateAgoraToken(channelName, customerUid, 'publisher');
    const developerToken = generateAgoraToken(channelName, developerUid, 'publisher');

    // Update booking
    const result = await pool.query(
      `UPDATE bookings 
      SET status = 'confirmed', agora_channel_name = $1, agora_token = $2
      WHERE id = $3
      RETURNING *`,
      [channelName, customerToken, bookingId]
    );

    // Create call session
    await pool.query(
      `INSERT INTO call_sessions (booking_id, agora_channel_id, customer_uid, developer_uid)
      VALUES ($1, $2, $3, $4)`,
      [bookingId, channelName, customerUid, developerUid]
    );

    res.json({
      booking: result.rows[0],
      callDetails: {
        channelName,
        customerToken,
        developerToken,
        customerUid,
        developerUid,
      },
    });
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({ error: 'Failed to confirm booking' });
  }
});

// Start call
router.put('/:bookingId/start-call', authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const result = await pool.query(
      `UPDATE bookings 
      SET status = 'in_progress', started_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [bookingId]
    );

    // Update developer availability status
    if (result.rows.length > 0) {
      const booking = result.rows[0];
      await pool.query(
        'UPDATE developer_profiles SET availability_status = $1 WHERE id = $2',
        ['in_call', booking.developer_id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Start call error:', error);
    res.status(500).json({ error: 'Failed to start call' });
  }
});

// End call
router.put('/:bookingId/end-call', authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { actual_duration_minutes, quality_stats } = req.body;

    // Get booking
    const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // Calculate refund if applicable (if actual duration < booked duration)
    let refundAmount = 0;
    if (actual_duration_minutes < booking.duration_minutes) {
      const minutesDifference = booking.duration_minutes - actual_duration_minutes;
      refundAmount = (booking.hourly_rate / 60) * minutesDifference;
    }

    // Update booking
    const result = await pool.query(
      `UPDATE bookings 
      SET status = 'completed', ended_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [bookingId]
    );

    // Update call session
    await pool.query(
      `UPDATE call_sessions 
      SET call_ended_at = CURRENT_TIMESTAMP, actual_duration_minutes = $1, quality_stats = $2
      WHERE booking_id = $3`,
      [actual_duration_minutes, JSON.stringify(quality_stats), bookingId]
    );

    // Update developer stats
    await pool.query(
      `UPDATE developer_profiles 
      SET total_hours_worked = total_hours_worked + $1,
          availability_status = 'online',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2`,
      [actual_duration_minutes / 60, booking.developer_id]
    );

    // Update developer earnings
    const developerEarnings = booking.total_amount - refundAmount;
    await pool.query(
      'UPDATE developer_profiles SET total_earnings = total_earnings + $1 WHERE id = $2',
      [developerEarnings, booking.developer_id]
    );

    // Process refund if applicable
    if (refundAmount > 0) {
      // TODO: Process refund through Stripe
      console.log(`[DevHire] Refund amount: ${refundAmount} for booking ${bookingId}`);
    }

    res.json({
      booking: result.rows[0],
      refundAmount,
      developerEarnings,
    });
  } catch (error) {
    console.error('End call error:', error);
    res.status(500).json({ error: 'Failed to end call' });
  }
});

// Cancel booking
router.put('/:bookingId/cancel', authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    // Get booking
    const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // Verify authorization (customer or developer)
    if (booking.customer_user_id !== req.userId && booking.developer_user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Can't cancel completed or already cancelled bookings
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot cancel this booking' });
    }

    // Update booking
    const result = await pool.query(
      `UPDATE bookings 
      SET status = 'cancelled'
      WHERE id = $1
      RETURNING *`,
      [bookingId]
    );

    // Process refund if payment was completed
    if (booking.payment_status === 'completed') {
      // TODO: Process refund through Stripe
      await pool.query(
        `UPDATE bookings 
        SET payment_status = 'refunded'
        WHERE id = $1`,
        [bookingId]
      );
    }

    res.json({
      booking: result.rows[0],
      message: 'Booking cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
