const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'devhire',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function initDatabase() {
  try {
    console.log('Connecting to database...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'init-db.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Executing database schema...');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Database initialized successfully!');
    console.log('All tables created:');
    console.log('  - users');
    console.log('  - developer_profiles');
    console.log('  - availability_slots');
    console.log('  - bookings');
    console.log('  - reviews');
    console.log('  - payment_transactions');
    console.log('  - call_sessions');
    console.log('  - wallet_balances');
    console.log('  - notification_preferences');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    
    if (error.code === '42P07') {
      console.log('⚠️  Some tables already exist. This is okay if you\'re re-running the script.');
    } else if (error.code === '3D000') {
      console.error('❌ Database does not exist. Please create it first:');
      console.error(`   CREATE DATABASE ${process.env.DB_NAME || 'devhire'};`);
    } else {
      console.error('Full error:', error);
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
