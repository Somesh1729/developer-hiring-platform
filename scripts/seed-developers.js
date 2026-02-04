const path = require('path');
const { Pool } = require('pg');
const { hashPassword } = require(path.join(__dirname, '../server/utils/auth'));

require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'devhire',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// 10 dummy developers with distinct profile images (pravatar.cc - reliable placeholder avatars)
const DEVELOPERS = [
  {
    full_name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    bio: 'Full-stack engineer with 8+ years building scalable web apps. React and Node.js specialist. Love mentoring and clean code.',
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
    hourly_rate: 95,
    experience_years: 8,
    image: 'https://i.pravatar.cc/300?img=1',
  },
  {
    full_name: 'Marcus Johnson',
    email: 'marcus.johnson@example.com',
    bio: 'Senior backend developer. AWS certified. Expert in distributed systems and API design. Previously at two FAANG companies.',
    skills: ['Python', 'AWS', 'Django', 'Docker'],
    hourly_rate: 120,
    experience_years: 10,
    image: 'https://i.pravatar.cc/300?img=3',
  },
  {
    full_name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    bio: 'Frontend specialist and UI/UX enthusiast. I build fast, accessible React and Vue applications. Design systems and component libraries.',
    skills: ['React', 'Vue.js', 'Tailwind CSS', 'Figma'],
    hourly_rate: 85,
    experience_years: 6,
    image: 'https://i.pravatar.cc/300?img=5',
  },
  {
    full_name: 'James Wilson',
    email: 'james.wilson@example.com',
    bio: 'DevOps and cloud architect. Kubernetes, Terraform, CI/CD. I help teams ship faster and more reliably.',
    skills: ['Kubernetes', 'Terraform', 'AWS', 'GitLab CI'],
    hourly_rate: 110,
    experience_years: 9,
    image: 'https://i.pravatar.cc/300?img=12',
  },
  {
    full_name: 'Elena Rodriguez',
    email: 'elena.rodriguez@example.com',
    bio: 'Mobile developer (React Native & Flutter). Shipped 15+ apps to App Store and Play Store. Passionate about performance.',
    skills: ['React Native', 'Flutter', 'JavaScript', 'Firebase'],
    hourly_rate: 90,
    experience_years: 5,
    image: 'https://i.pravatar.cc/300?img=9',
  },
  {
    full_name: 'David Kim',
    email: 'david.kim@example.com',
    bio: 'Data engineer and ML pipeline specialist. Python, Spark, and cloud data warehouses. I turn messy data into reliable analytics.',
    skills: ['Python', 'Apache Spark', 'SQL', 'GCP'],
    hourly_rate: 100,
    experience_years: 7,
    image: 'https://i.pravatar.cc/300?img=13',
  },
  {
    full_name: 'Aisha Okonkwo',
    email: 'aisha.okonkwo@example.com',
    bio: 'Security-focused full-stack developer. OWASP, auth systems, and compliance. I help startups build secure products from day one.',
    skills: ['Node.js', 'React', 'Security', 'OAuth'],
    hourly_rate: 105,
    experience_years: 6,
    image: 'https://i.pravatar.cc/300?img=20',
  },
  {
    full_name: 'Alex Thompson',
    email: 'alex.thompson@example.com',
    bio: 'Startup technical co-founder and solo full-stack dev. Rails, React, and Postgres. I ship MVPs and iterate quickly.',
    skills: ['Ruby on Rails', 'React', 'PostgreSQL', 'Heroku'],
    hourly_rate: 88,
    experience_years: 5,
    image: 'https://i.pravatar.cc/300?img=15',
  },
  {
    full_name: 'Yuki Tanaka',
    email: 'yuki.tanaka@example.com',
    bio: 'Backend and database expert. Go and Rust for high-performance services. Former database kernel engineer.',
    skills: ['Go', 'Rust', 'PostgreSQL', 'Redis'],
    hourly_rate: 115,
    experience_years: 8,
    image: 'https://i.pravatar.cc/300?img=14',
  },
  {
    full_name: 'Nina Patel',
    email: 'nina.patel@example.com',
    bio: 'Product-minded engineer. Full-stack JavaScript, A/B testing, and metrics. I bridge product and engineering.',
    skills: ['JavaScript', 'Node.js', 'React', 'Analytics'],
    hourly_rate: 92,
    experience_years: 6,
    image: 'https://i.pravatar.cc/300?img=23',
  },
];

const DEFAULT_PASSWORD = 'password123';

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding dummy developers...');

    for (let i = 0; i < DEVELOPERS.length; i++) {
      const d = DEVELOPERS[i];
      const password_hash = await hashPassword(DEFAULT_PASSWORD);

      const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [d.email]);
      if (existingUser.rows.length > 0) {
        console.log(`  Skipping ${d.full_name} (already exists)`);
        continue;
      }

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name, profile_picture_url, bio, user_type)
         VALUES ($1, $2, $3, $4, $5, 'developer')
         RETURNING id`,
        [d.email, password_hash, d.full_name, d.image, d.bio]
      );
      const userId = userResult.rows[0].id;

      await client.query(
        `INSERT INTO developer_profiles (user_id, hourly_rate, skills, experience_years, availability_status, total_hours_worked, total_reviews, rating, github_url, portfolio_url)
         VALUES ($1, $2, $3, $4, 'online', $5, $6, $7, $8, $9)`,
        [
          userId,
          d.hourly_rate,
          d.skills,
          d.experience_years,
          Math.floor(Math.random() * 200) + 20,
          Math.floor(Math.random() * 50) + 5,
          (Math.random() * 1.5 + 3.5).toFixed(2),
          'https://github.com',
          'https://example.com',
        ]
      );

      await client.query('INSERT INTO wallet_balances (user_id) VALUES ($1)', [userId]);
      await client.query('INSERT INTO notification_preferences (user_id) VALUES ($1)', [userId]);

      console.log(`  Added: ${d.full_name}`);
    }

    console.log('✅ Seed complete. 10 developer profiles are available (password: ' + DEFAULT_PASSWORD + ')');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
