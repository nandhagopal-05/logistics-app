import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not Set');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // SSL configuration is often required for CockroachDB (especially cloud/serverless)
    // SSL configuration
    ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('sslmode')
        ? { rejectUnauthorized: false }
        : undefined
});

// Test connection
pool.on('connect', () => {
    console.log('✅ Connected to Database (PostgreSQL/CockroachDB)');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;
