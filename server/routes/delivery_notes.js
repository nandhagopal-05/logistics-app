import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all delivery notes
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Fetch DNs and aggregate jobs (shipment IDs)
        const result = await pool.query(`
            SELECT dn.*, 
                   array_agg(dnj.job_no) as jobs,
                   count(dnj.id) as details_count
            FROM delivery_notes dn
            LEFT JOIN delivery_note_jobs dnj ON dn.id = dnj.delivery_note_id
            GROUP BY dn.id
            ORDER BY dn.created_at DESC
        `);

        // Map backend fields to frontend interface expected (camelCase vs snake_case)
        const mapped = result.rows.map(row => ({
            id: row.id,
            consignee: row.consignee,
            exporter: row.exporter,
            jobs: row.jobs.filter(j => j !== null), // Remove nulls
            detailsCount: parseInt(row.details_count) || 0,
            detailsType: row.details_type,
            detailsLocation: row.details_location,
            issuedDate: row.issued_date,
            issuedBy: row.issued_by,
            status: row.status
        }));

        res.json(mapped);
    } catch (error) {
        console.error('Get delivery notes error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update delivery note
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comments, unloading_date } = req.body;

        const result = await pool.query(
            `UPDATE delivery_notes 
             SET status = COALESCE($1, status),
                 comments = COALESCE($2, comments),
                 unloading_date = COALESCE($3, unloading_date),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [status, comments, unloading_date, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery note not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update delivery note error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
