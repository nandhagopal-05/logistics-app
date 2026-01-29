import bcrypt from 'bcrypt';
import pool from '../config/database.js';

const { URL } = await import('url');

console.log('--- DEBUG INFO ---');
if (process.env.DATABASE_URL) {
    try {
        const url = new URL(process.env.DATABASE_URL);
        console.log('Protocol:', url.protocol);
        console.log('Hostname:', url.hostname);
        console.log('Port:', url.port);
    } catch (e) {
        console.log('Could not parse DATABASE_URL:', e.message);
        console.log('Raw URL start:', process.env.DATABASE_URL.substring(0, 10) + '...');
    }
} else {
    console.log('DATABASE_URL is not defined in process.env');
}
console.log('------------------');

async function seedDatabase() {
    try {
        console.log('🌱 Seeding database...');

        // Hash password for admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Insert admin user
        await pool.query(
            `INSERT INTO users (username, password, role) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (username) DO NOTHING`,
            ['admin', hashedPassword, 'Administrator']
        );
        console.log('✅ Database seeded successfully!');
        console.log('📝 Admin credentials: username=admin, password=admin123');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedDatabase();
