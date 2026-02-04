const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authMiddleware } = require('../utils/auth');

const router = express.Router();

// Create review
router.post(
  '/',
  authMiddleware,
  [
    body('booking_id').isInt(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('review_text').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { booking_id, rating, review_text } = req.body;

      // Get booking
      const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [booking_id]);

      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const booking = bookingResult.rows[0];

      // Only customer can review
      if (booking.customer_user_id !== req.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Can only review completed bookings
      if (booking.status !== 'completed') {
        return res.status(400).json({ error: 'Can only review completed bookings' });
      }

      // Check if review already exists
      const existingReview = await pool.query(
        'SELECT * FROM reviews WHERE booking_id = $1',
        [booking_id]
      );

      if (existingReview.rows.length > 0) {
        return res.status(400).json({ error: 'Review already exists for this booking' });
      }

      // Create review
      const result = await pool.query(
        `INSERT INTO reviews (booking_id, reviewer_user_id, developer_id, rating, review_text) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *`,
        [booking_id, req.userId, booking.developer_id, rating, review_text]
      );

      // Update developer rating
      const ratingResult = await pool.query(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews 
        FROM reviews 
        WHERE developer_id = $1`,
        [booking.developer_id]
      );

      const { avg_rating, total_reviews } = ratingResult.rows[0];

      await pool.query(
        `UPDATE developer_profiles 
        SET rating = $1, total_reviews = $2
        WHERE id = $3`,
        [parseFloat(avg_rating).toFixed(2), total_reviews, booking.developer_id]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create review error:', error);
      res.status(500).json({ error: 'Failed to create review' });
    }
  }
);

// Get reviews for developer
router.get('/developer/:developerId', async (req, res) => {
  try {
    const { developerId } = req.params;

    const result = await pool.query(
      `SELECT r.*, u.full_name as reviewer_name, u.profile_picture_url
      FROM reviews r
      JOIN users u ON r.reviewer_user_id = u.id
      WHERE r.developer_id = $1
      ORDER BY r.created_at DESC`,
      [developerId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get reviews by user (reviews written by this user)
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (parseInt(userId) !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT r.*, d.full_name as developer_name
      FROM reviews r
      JOIN developer_profiles dp ON r.developer_id = dp.id
      JOIN users d ON dp.user_id = d.id
      WHERE r.reviewer_user_id = $1
      ORDER BY r.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Update review
router.put('/:reviewId', authMiddleware, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, review_text } = req.body;

    // Get review
    const reviewResult = await pool.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const review = reviewResult.rows[0];

    if (review.reviewer_user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update review
    const result = await pool.query(
      `UPDATE reviews 
      SET rating = COALESCE($1, rating), review_text = COALESCE($2, review_text)
      WHERE id = $3
      RETURNING *`,
      [rating, review_text, reviewId]
    );

    // Update developer rating
    const ratingResult = await pool.query(
      `SELECT AVG(rating) as avg_rating 
      FROM reviews 
      WHERE developer_id = $1`,
      [review.developer_id]
    );

    const { avg_rating } = ratingResult.rows[0];

    await pool.query(
      `UPDATE developer_profiles 
      SET rating = $1
      WHERE id = $2`,
      [parseFloat(avg_rating).toFixed(2), review.developer_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete review
router.delete('/:reviewId', authMiddleware, async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Get review
    const reviewResult = await pool.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const review = reviewResult.rows[0];

    if (review.reviewer_user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete review
    await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId]);

    // Update developer rating
    const ratingResult = await pool.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews 
      FROM reviews 
      WHERE developer_id = $1`,
      [review.developer_id]
    );

    const { avg_rating, total_reviews } = ratingResult.rows[0];

    await pool.query(
      `UPDATE developer_profiles 
      SET rating = $1, total_reviews = $2
      WHERE id = $3`,
      [avg_rating ? parseFloat(avg_rating).toFixed(2) : 0, total_reviews || 0, review.developer_id]
    );

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;
