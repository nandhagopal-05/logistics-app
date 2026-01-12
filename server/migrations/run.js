import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    try {
        console.log('🔄 Running database migrations...');

        // Get all .sql files in the directory
        const files = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Ensure order like 001, 002...

        for (const file of files) {
            console.log(`▶️ Executing migration: ${file}`);
            const filePath = path.join(__dirname, file);
            const sql = fs.readFileSync(filePath, 'utf8');
            await pool.query(sql);
        }

        console.log('✅ All migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();
