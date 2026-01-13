import fs from 'fs';
import path from 'path';
import pool from './config/database.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const run = async () => {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '014_create_clearance_schedules.sql'), 'utf8');
        console.log('Applying 014_create_clearance_schedules.sql...');
        await pool.query(sql);
        console.log('Success!');
        process.exit(0);
    } catch (err) {
        console.error('Failed:', err);
        process.exit(1);
    }
};

run();
