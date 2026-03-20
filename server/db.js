// ============================================================
// Database connection pool
// ============================================================
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST || '194.163.172.62',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'site_handicraftkids_com',
  user: process.env.DB_USER || 'user_handicraftkids_com',
  password: process.env.DB_PASSWORD || 'f8Dx0PVZJV181v45vuW5',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err);
});

export default pool;
