const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { hashPassword, comparePassword, generateToken, authMiddleware } = require('../utils/auth');

const router = express.Router();

// Register
router.post(
  '/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').notEmpty(),
    body('user_type').isIn(['developer', 'customer']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name, user_type } = req.body;

    try {
      // Check if user exists
      const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const password_hash = await hashPassword(password);

      // Create user
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, full_name, user_type) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, user_type',
        [email, password_hash, full_name, user_type]
      );

      const user = result.rows[0];
      const token = generateToken(user.id);

      // If developer, create profile
      if (user_type === 'developer') {
        await pool.query(
          'INSERT INTO developer_profiles (user_id, hourly_rate) VALUES ($1, $2)',
          [user.id, 50]
        );
      }

      // Create wallet balance record
      await pool.query('INSERT INTO wallet_balances (user_id) VALUES ($1)', [user.id]);

      // Create notification preferences
      await pool.query('INSERT INTO notification_preferences (user_id) VALUES ($1)', [user.id]);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          user_type: user.user_type,
        },
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
router.post(
  '/login',
  [body('email').isEmail(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      const isPasswordValid = await comparePassword(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken(user.id);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          user_type: user.user_type,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, full_name, user_type, profile_picture_url, bio, wallet_address FROM users WHERE id = $1', [
      req.userId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Get developer profile if developer
    let devProfile = null;
    if (user.user_type === 'developer') {
      const devResult = await pool.query('SELECT * FROM developer_profiles WHERE user_id = $1', [
        req.userId,
      ]);
      if (devResult.rows.length > 0) {
        devProfile = devResult.rows[0];
      }
    }

    // Get wallet balance
    const walletResult = await pool.query('SELECT balance, currency FROM wallet_balances WHERE user_id = $1', [
      req.userId,
    ]);
    const wallet = walletResult.rows[0] || { balance: 0, currency: 'USDC' };

    res.json({ user: { ...user, devProfile, wallet } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
