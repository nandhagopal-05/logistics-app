
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import XLSX from 'xlsx';
import fs from 'fs';
import { logActivity } from '../utils/logger.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Get all payment items
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payment_items ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching payment items:', error);
        // Fallback if table doesn't exist yet, return empty array to prevent frontend crash
        if (error.code === '42P01') {
            return res.json([]);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create payment item
router.post('/', authenticateToken, async (req, res) => {
    const { name, vendor_id } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        // Simple check if table exists, if not, create it (Dev convenience)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payment_items (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const result = await pool.query(
            'INSERT INTO payment_items (name, vendor_id) VALUES ($1, $2) RETURNING *',
            [name, vendor_id || null]
        );

        await logActivity(req.user.id, 'CREATE_PAYMENT_ITEM', `Created payment item: ${name}`, 'PAYMENT_ITEM', result.rows[0].id);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating payment item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update payment item
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, vendor_id } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'UPDATE payment_items SET name = $1, vendor_id = $2 WHERE id = $3 RETURNING *',
            [name, vendor_id || null, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment item not found' });
        }

        await logActivity(req.user.id, 'UPDATE_PAYMENT_ITEM', `Updated payment item: ${name}`, 'PAYMENT_ITEM', id);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating payment item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Import from Excel/CSV
router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        // Ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payment_items (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        let successCount = 0;
        let errors = [];

        for (const row of data) {
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
                normalizedRow[key.toLowerCase().trim()] = row[key];
            });

            const name = normalizedRow['name'] || normalizedRow['payment item'] || normalizedRow['item'] || normalizedRow['payment_item'];
            if (!name) continue;

            // Vendor logic removed as per requirement: Import file only contains payment item names.
            // Vendors are assigned manually in the UI.

            try {
                await pool.query(
                    'INSERT INTO payment_items (name, vendor_id) VALUES ($1, NULL)',
                    [name]
                );
                successCount++;
            } catch (err) {
                errors.push(`Failed to import ${name}: ${err.message}`);
            }
        }

        fs.unlinkSync(req.file.path);
        await logActivity(req.user.id, 'IMPORT_PAYMENT_ITEMS', `Imported ${successCount} payment items`, 'PAYMENT_ITEM', 'BATCH');

        res.json({
            message: `Imported ${successCount} payment items`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to process file: ' + error.message });
    }
});

// Delete all payment items
router.delete('/delete-all', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM payment_items');
        await logActivity(req.user.id, 'DELETE_ALL_PAYMENT_ITEMS', 'Deleted all payment items', 'PAYMENT_ITEM', 'ALL');
        res.json({ message: 'All payment items deleted successfully' });
    } catch (error) {
        console.error('Error deleting all payment items:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete payment item
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM payment_items WHERE id = $1', [req.params.id]);
        await logActivity(req.user.id, 'DELETE_PAYMENT_ITEM', `Deleted payment item ID: ${req.params.id}`, 'PAYMENT_ITEM', req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting payment item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
