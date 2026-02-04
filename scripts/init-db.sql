-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  profile_picture_url TEXT,
  bio TEXT,
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('developer', 'customer')),
  wallet_address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Developer profiles table
CREATE TABLE developer_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  skills TEXT[] NOT NULL,
  experience_years INTEGER,
  availability_status VARCHAR(50) DEFAULT 'offline' CHECK (availability_status IN ('online', 'offline', 'in_call')),
  total_hours_worked INTEGER DEFAULT 0,
  total_earnings DECIMAL(15, 2) DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  github_url TEXT,
  portfolio_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Developer availability slots table
CREATE TABLE availability_slots (
  id SERIAL PRIMARY KEY,
  developer_id INTEGER NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (developer_id) REFERENCES developer_profiles(id) ON DELETE CASCADE
);

-- Bookings table
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  customer_user_id INTEGER NOT NULL,
  developer_id INTEGER NOT NULL,
  developer_user_id INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_transaction_id VARCHAR(255),
  agora_channel_name VARCHAR(255),
  agora_token VARCHAR(500),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (developer_id) REFERENCES developer_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (developer_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Reviews & ratings table
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL UNIQUE,
  reviewer_user_id INTEGER NOT NULL,
  developer_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (developer_id) REFERENCES developer_profiles(id) ON DELETE CASCADE
);

-- Payment transactions table
CREATE TABLE payment_transactions (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  crypto_amount DECIMAL(20, 8),
  crypto_currency VARCHAR(20),
  transaction_hash VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Call sessions table (for tracking video call details)
CREATE TABLE call_sessions (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL UNIQUE,
  agora_channel_id VARCHAR(255) NOT NULL,
  customer_uid INTEGER,
  developer_uid INTEGER,
  call_started_at TIMESTAMP,
  call_ended_at TIMESTAMP,
  duration_seconds INTEGER,
  actual_duration_minutes INTEGER,
  quality_stats JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Wallet balance table (for tracking crypto balances)
CREATE TABLE wallet_balances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  balance DECIMAL(20, 8) DEFAULT 0,
  currency VARCHAR(20) DEFAULT 'USDC',
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notification settings table
CREATE TABLE notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  booking_notifications BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  payment_notifications BOOLEAN DEFAULT TRUE,
  availability_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_developer_profiles_user_id ON developer_profiles(user_id);
CREATE INDEX idx_developer_profiles_status ON developer_profiles(availability_status);
CREATE INDEX idx_availability_slots_developer ON availability_slots(developer_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_user_id);
CREATE INDEX idx_bookings_developer ON bookings(developer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_reviews_developer ON reviews(developer_id);
CREATE INDEX idx_payment_transactions_booking ON payment_transactions(booking_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_call_sessions_booking ON call_sessions(booking_id);
CREATE INDEX idx_wallet_balances_user ON wallet_balances(user_id);
