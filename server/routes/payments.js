const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../utils/auth');
const { createPaymentIntent, confirmPaymentIntent, refundPayment, convertCryptoPrice } = require('../utils/stripe');

const router = express.Router();

// Create payment intent for booking
router.post('/create-payment-intent', authMiddleware, async (req, res) => {
  try {
    const { booking_id, payment_method } = req.body;

    // Get booking
    const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [booking_id]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.customer_user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Create payment intent
    const paymentIntent = await createPaymentIntent(booking.total_amount, 'usd', {
      booking_id: booking.id,
      user_id: req.userId,
    });

    // Create payment transaction record
    let cryptoAmount = null;
    let cryptoCurrency = null;

    if (payment_method && payment_method.includes('crypto')) {
      const [_, currency] = payment_method.split('_');
      cryptoAmount = await convertCryptoPrice(booking.total_amount, 'USD', currency);
      cryptoCurrency = currency;
    }

    const txResult = await pool.query(
      `INSERT INTO payment_transactions 
      (booking_id, user_id, amount, currency, crypto_amount, crypto_currency, stripe_payment_intent_id, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [
        booking.id,
        req.userId,
        booking.total_amount,
        'usd',
        cryptoAmount,
        cryptoCurrency,
        paymentIntent.id,
        'pending',
      ]
    );

    res.json({
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      transactionId: txResult.rows[0].id,
      cryptoAmount,
      cryptoCurrency,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Confirm payment
router.post('/confirm-payment', authMiddleware, async (req, res) => {
  try {
    const { booking_id, payment_intent_id, payment_method_id } = req.body;

    // Get booking
    const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [booking_id]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.customer_user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Confirm payment with Stripe
    const paymentIntent = await confirmPaymentIntent(payment_intent_id);

    if (paymentIntent.status === 'succeeded') {
      // Update booking
      await pool.query(
        `UPDATE bookings 
        SET payment_status = 'completed', payment_transaction_id = $1
        WHERE id = $2`,
        [payment_intent_id, booking_id]
      );

      // Update payment transaction
      await pool.query(
        `UPDATE payment_transactions 
        SET status = 'completed'
        WHERE stripe_payment_intent_id = $1`,
        [payment_intent_id]
      );

      res.json({
        success: true,
        message: 'Payment successful',
        bookingId: booking_id,
      });
    } else {
      // Update transaction status
      await pool.query(
        `UPDATE payment_transactions 
        SET status = $1
        WHERE stripe_payment_intent_id = $2`,
        [paymentIntent.status, payment_intent_id]
      );

      res.status(400).json({
        success: false,
        message: 'Payment failed',
        status: paymentIntent.status,
      });
    }
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Get payment transactions for user
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pt.*, b.status as booking_status, u.full_name
      FROM payment_transactions pt
      JOIN bookings b ON pt.booking_id = b.id
      JOIN users u ON b.developer_user_id = u.id
      WHERE pt.user_id = $1
      ORDER BY pt.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get payment transaction by ID
router.get('/transaction/:transactionId', authMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.params;

    const result = await pool.query(
      'SELECT * FROM payment_transactions WHERE id = $1 AND user_id = $2',
      [transactionId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Process refund
router.post('/refund', authMiddleware, async (req, res) => {
  try {
    const { booking_id, refund_amount } = req.body;

    // Get booking
    const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [booking_id]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.customer_user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get payment transaction
    const txResult = await pool.query(
      'SELECT * FROM payment_transactions WHERE booking_id = $1',
      [booking_id]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment transaction not found' });
    }

    const transaction = txResult.rows[0];

    // Process refund
    const refund = await refundPayment(transaction.stripe_payment_intent_id, refund_amount);

    // Update transaction
    await pool.query(
      `UPDATE payment_transactions 
      SET status = 'refunded'
      WHERE id = $1`,
      [transaction.id]
    );

    // Update booking
    await pool.query(
      `UPDATE bookings 
      SET payment_status = 'refunded'
      WHERE id = $1`,
      [booking_id]
    );

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refundAmount: refund.amount / 100,
      refundId: refund.id,
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Get wallet balance
router.get('/wallet/balance', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM wallet_balances WHERE user_id = $1', [
      req.userId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
});

// Update wallet balance (after call completion)
router.put('/wallet/update', authMiddleware, async (req, res) => {
  try {
    const { amount, currency = 'USDC' } = req.body;

    const result = await pool.query(
      `UPDATE wallet_balances 
      SET balance = balance + $1, currency = $2, last_updated = CURRENT_TIMESTAMP
      WHERE user_id = $3
      RETURNING *`,
      [amount, currency, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update wallet balance error:', error);
    res.status(500).json({ error: 'Failed to update wallet balance' });
  }
});

module.exports = router;
