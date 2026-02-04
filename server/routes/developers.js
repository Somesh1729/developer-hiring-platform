const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authMiddleware } = require('../utils/auth');

const router = express.Router();

// Get all available developers
router.get('/available', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        dp.id, 
        dp.user_id,
        u.full_name, 
        u.profile_picture_url,
        u.bio,
        dp.hourly_rate, 
        dp.skills, 
        dp.experience_years,
        dp.availability_status,
        dp.rating,
        dp.total_hours_worked,
        dp.total_reviews,
        dp.github_url,
        dp.portfolio_url
      FROM developer_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.availability_status = 'online'
      ORDER BY dp.rating DESC, dp.total_hours_worked DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get developers error:', error);
    res.status(500).json({ error: 'Failed to fetch developers' });
  }
});

// Get developer profile
router.get('/:developerId', async (req, res) => {
  try {
    const { developerId } = req.params;

    const result = await pool.query(
      `SELECT 
        dp.id, 
        dp.user_id,
        u.full_name, 
        u.profile_picture_url,
        u.bio,
        dp.hourly_rate, 
        dp.skills, 
        dp.experience_years,
        dp.availability_status,
        dp.rating,
        dp.total_hours_worked,
        dp.total_earnings,
        dp.total_reviews,
        dp.github_url,
        dp.portfolio_url,
        u.created_at
      FROM developer_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.id = $1`,
      [developerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Developer not found' });
    }

    // Get reviews
    const reviewsResult = await pool.query(
      `SELECT r.rating, r.review_text, r.created_at, u.full_name as reviewer_name
      FROM reviews r
      JOIN users u ON r.reviewer_user_id = u.id
      WHERE r.developer_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10`,
      [developerId]
    );

    const developer = result.rows[0];
    developer.reviews = reviewsResult.rows;

    res.json(developer);
  } catch (error) {
    console.error('Get developer error:', error);
    res.status(500).json({ error: 'Failed to fetch developer' });
  }
});

// Update developer profile
router.put('/:developerId', authMiddleware, async (req, res) => {
  try {
    const { developerId } = req.params;
    const { hourly_rate, skills, experience_years, github_url, portfolio_url, bio } = req.body;

    // Verify ownership
    const devResult = await pool.query('SELECT user_id FROM developer_profiles WHERE id = $1', [
      developerId,
    ]);

    if (devResult.rows.length === 0) {
      return res.status(404).json({ error: 'Developer profile not found' });
    }

    if (devResult.rows[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update profile
    const result = await pool.query(
      `UPDATE developer_profiles 
      SET hourly_rate = COALESCE($1, hourly_rate),
          skills = COALESCE($2, skills),
          experience_years = COALESCE($3, experience_years),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *`,
      [hourly_rate, skills, experience_years, developerId]
    );

    // Update user info
    await pool.query(
      `UPDATE users 
      SET github_url = COALESCE($1, github_url),
          portfolio_url = COALESCE($2, portfolio_url),
          bio = COALESCE($3, bio)
      WHERE id = $4`,
      [github_url, portfolio_url, bio, req.userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update developer error:', error);
    res.status(500).json({ error: 'Failed to update developer profile' });
  }
});

// Set availability status
router.put('/:developerId/availability-status', authMiddleware, async (req, res) => {
  try {
    const { developerId } = req.params;
    const { status } = req.body;

    if (!['online', 'offline', 'in_call'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify ownership
    const devResult = await pool.query('SELECT user_id FROM developer_profiles WHERE id = $1', [
      developerId,
    ]);

    if (devResult.rows.length === 0) {
      return res.status(404).json({ error: 'Developer profile not found' });
    }

    if (devResult.rows[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'UPDATE developer_profiles SET availability_status = $1 WHERE id = $2 RETURNING *',
      [status, developerId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// Get developer availability slots
router.get('/:developerId/availability-slots', async (req, res) => {
  try {
    const { developerId } = req.params;

    const result = await pool.query(
      `SELECT * FROM availability_slots 
      WHERE developer_id = $1 
      AND end_time > NOW()
      ORDER BY start_time ASC`,
      [developerId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get availability slots error:', error);
    res.status(500).json({ error: 'Failed to fetch availability slots' });
  }
});

// Add availability slots (for developers to set their available times)
router.post('/:developerId/availability-slots', authMiddleware, async (req, res) => {
  try {
    const { developerId } = req.params;
    const { start_time, end_time } = req.body;

    // Verify ownership
    const devResult = await pool.query('SELECT user_id FROM developer_profiles WHERE id = $1', [
      developerId,
    ]);

    if (devResult.rows.length === 0) {
      return res.status(404).json({ error: 'Developer profile not found' });
    }

    if (devResult.rows[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `INSERT INTO availability_slots (developer_id, start_time, end_time) 
      VALUES ($1, $2, $3) 
      RETURNING *`,
      [developerId, start_time, end_time]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add availability slot error:', error);
    res.status(500).json({ error: 'Failed to add availability slot' });
  }
});

module.exports = router;
