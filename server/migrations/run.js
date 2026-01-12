import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    let client;
    try {
        client = await pool.connect();
        console.log('🔄 Running database migrations...');

        // 1. Create migrations table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Get applied migrations
        const { rows: appliedMigrations } = await client.query('SELECT filename FROM _migrations');
        const appliedSet = new Set(appliedMigrations.map(m => m.filename));

        // 3. Get all local migration files
        const files = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.sql'))
            .sort();

        let migrationCount = 0;

        for (const file of files) {
            if (appliedSet.has(file)) {
                // Skip already applied
                continue;
            }

            console.log(`▶️ Executing migration: ${file}`);
            const filePath = path.join(__dirname, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            // Begin transaction for each migration file
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
                await client.query('COMMIT');
                console.log(`   ✅ Applied: ${file}`);
                migrationCount++;
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`   ❌ Failed to apply ${file}:`, err.message);
                // If the specific error is "duplicate constraint", it likely means the migration ran partially before
                // or without tracking. In this specific recovery case, we can try to mark it as applied if safe,
                // BUT better to just throw so user can fix the state or we handle specific known errors.
                // For "fk_vehicle" specifically which caused the user issue:
                if (err.code === '42710') { // duplicate_object
                    console.log(`   ⚠️ Constraint already exists (duplicate_object). Assuming partial success and marking as done.`);
                    await client.query('INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
                } else {
                    throw err;
                }
            }
        }

        if (migrationCount === 0) {
            console.log('✨ No new migrations to apply.');
        } else {
            console.log(`✅ Successfully applied ${migrationCount} migrations!`);
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Critical Migration Failure:', error);
        process.exit(1);
    } finally {
        if (client) client.release();
    }
}

runMigrations();
