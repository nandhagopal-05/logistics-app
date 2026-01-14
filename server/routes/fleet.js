import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import * as XLSX from 'xlsx';
import fs from 'fs';
import { logActivity } from '../utils/logger.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Get all vehicles
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vehicles ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Get vehicles error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Import vehicles
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
                normalizedRow[key.toLowerCase()] = row[key];
            });

            // Assuming 'registration no' or 'id' is mandatory and used as ID
            const id = normalizedRow['registration no'] || normalizedRow['id'] || normalizedRow['reg no'];
            const name = normalizedRow['name'] || normalizedRow['vehicle name'];

            if (!id) {
                errors.push(`Skipped row: Registration No. (ID) is missing for ${name || 'unknown vehicle'}`);
                continue;
            }

            try {
                // Check if exists
                const existing = await pool.query('SELECT id FROM vehicles WHERE id = $1', [id]);
                if (existing.rows.length > 0) {
                    // Determine if we should update or skip. For now, let's skip to be safe or update fields? 
                    // Exporters logic inserts new. Let's try INSERT ON CONFLICT DO UPDATE or just skip?
                    // Start simple: Insert only.
                    errors.push(`Vehicle ${id} already exists`);
                    continue;
                }

                await pool.query(
                    `INSERT INTO vehicles (id, name, type, owner, phone, email, comments, driver, status, location)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        id,
                        name || id,
                        normalizedRow['type'] || 'Unknown',
                        normalizedRow['owner'] || normalizedRow['owner name'] || null,
                        normalizedRow['phone'] || normalizedRow['owner phone'] || null,
                        normalizedRow['email'] || normalizedRow['owner email'] || null,
                        normalizedRow['comments'] || null,
                        normalizedRow['driver'] || null,
                        normalizedRow['status'] || 'Idle',
                        normalizedRow['location'] || null
                    ]
                );
                successCount++;
            } catch (err) {
                errors.push(`Failed to import ${id}: ${err.message}`);
            }
        }

        fs.unlinkSync(req.file.path);

        // Log activity if logActivity is available (it should be)
        // await logActivity(req.user.id, 'IMPORT_FLEET', `Imported ${successCount} vehicles`, 'VEHICLE', 'BATCH');

        res.json({
            message: `Imported ${successCount} vehicles`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to process file: ' + error.message });
    }
});

// Get single vehicle
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get vehicle error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new vehicle
router.post('/', authenticateToken, async (req, res) => {
    // ... (rest of create logic)
    try {
        const { id, name, type, owner, phone, email, comments, driver, status, location } = req.body;

        const result = await pool.query(
            `INSERT INTO vehicles (id, name, type, owner, phone, email, comments, driver, status, location)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [id, name, type, owner, phone, email, comments, driver, status || 'Idle', location]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create vehicle error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update vehicle
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, owner, phone, email, comments, driver, status, location, fuel, maintenance, mileage, next_service } = req.body;

        const result = await pool.query(
            `UPDATE vehicles 
       SET name = $1, type = $2, owner = $3, phone = $4, email = $5, comments = $6, driver = $7, status = $8, location = $9, fuel = $10, 
           maintenance = $11, mileage = $12, next_service = $13, updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
            [name, type, owner, phone, email, comments, driver, status, location, fuel, maintenance, mileage, next_service, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update vehicle error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete vehicle
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM vehicles WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
        console.error('Delete vehicle error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get fleet statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Active') as active,
        COUNT(*) FILTER (WHERE status = 'Idle') as idle,
        COUNT(*) FILTER (WHERE status = 'Maintenance') as maintenance
      FROM vehicles
    `);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get fleet stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
