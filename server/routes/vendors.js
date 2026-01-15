
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import XLSX from 'xlsx';
import fs from 'fs';
import { logActivity } from '../utils/logger.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Get all vendors
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vendors ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create single vendor
router.post('/', authenticateToken, async (req, res) => {
    const {
        name, company_name, email, phone, currency,
        billing_address, billing_street, billing_country,
        city, region, postal_code, bank_name, account_number
    } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO vendors (
                name, company_name, email, phone, currency,
                billing_address, billing_street, billing_country,
                city, region, postal_code,
                bank_name, account_number
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [
                name, company_name, email, phone, currency,
                billing_address, billing_street, billing_country,
                city, region, postal_code,
                bank_name, account_number
            ]
        );

        await logActivity(req.user.id, 'CREATE_VENDOR', `Created vendor: ${name}`, 'VENDOR', result.rows[0].id);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating vendor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update vendor
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const {
        name, company_name, email, phone, currency,
        billing_address, billing_street, billing_country,
        city, region, postal_code, bank_name, account_number
    } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            `UPDATE vendors SET 
                name = $1, company_name = $2, email = $3, phone = $4, currency = $5,
                billing_address = $6, billing_street = $7, billing_country = $8,
                city = $9, region = $10, postal_code = $11,
                bank_name = $12, account_number = $13,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $14 RETURNING *`,
            [
                name, company_name, email, phone, currency,
                billing_address, billing_street, billing_country,
                city, region, postal_code,
                bank_name, account_number,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        await logActivity(req.user.id, 'UPDATE_VENDOR', `Updated vendor: ${name}`, 'VENDOR', id);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating vendor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Import from Excel/CSV
router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
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

            const name = normalizedRow['name'] || normalizedRow['display name'] || normalizedRow['contact name'];
            if (!name) continue;

            try {
                await pool.query(
                    `INSERT INTO vendors (
                        name, company_name, email, phone, currency,
                        billing_address, billing_street, billing_country,
                        city, region, postal_code,
                        bank_name, account_number
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                    [
                        name,
                        normalizedRow['company name'] || normalizedRow['company'] || null,
                        normalizedRow['email'] || null,
                        normalizedRow['phone'] || null,
                        normalizedRow['currency'] || normalizedRow['currency code'] || null,
                        normalizedRow['billing address'] || null,
                        normalizedRow['billing street'] || normalizedRow['street'] || null,
                        normalizedRow['billing country'] || normalizedRow['country'] || null,
                        normalizedRow['city'] || null,
                        normalizedRow['region'] || null,
                        normalizedRow['postal code'] || null,
                        normalizedRow['bank name'] || null,
                        normalizedRow['account number'] || null
                    ]
                );
                successCount++;
            } catch (err) {
                errors.push(`Failed to import ${name}: ${err.message}`);
            }
        }

        fs.unlinkSync(req.file.path);

        await logActivity(req.user.id, 'IMPORT_VENDORS', `Imported ${successCount} vendors`, 'VENDOR', 'BATCH');

        res.json({
            message: `Imported ${successCount} vendors`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to process file: ' + error.message });
    }
});

// Delete all vendors
router.delete('/delete-all', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM vendors');
        await logActivity(req.user.id, 'DELETE_ALL_VENDORS', 'Deleted all vendors', 'VENDOR', 'ALL');
        res.json({ message: 'All vendors deleted successfully' });
    } catch (error) {
        console.error('Error deleting all vendors:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete vendor
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM vendors WHERE id = $1', [req.params.id]);
        await logActivity(req.user.id, 'DELETE_VENDOR', `Deleted vendor ID: ${req.params.id}`, 'VENDOR', req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting vendor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
