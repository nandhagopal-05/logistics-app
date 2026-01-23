import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all payments (with search/pagination)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT jp.*, u.username as requested_by_name, s.customer
            FROM job_payments jp
            LEFT JOIN users u ON jp.requested_by = u.id
            LEFT JOIN shipments s ON jp.job_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ` AND (
                jp.job_id ILIKE $${params.length + 1} OR
                jp.vendor ILIKE $${params.length + 1} OR
                jp.payment_type ILIKE $${params.length + 1} OR
                jp.bill_ref_no ILIKE $${params.length + 1} OR
                s.customer ILIKE $${params.length + 1}
            )`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY jp.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Count for pagination
        let countQuery = `
            SELECT COUNT(*) 
            FROM job_payments jp
            LEFT JOIN shipments s ON jp.job_id = s.id
            WHERE 1=1
        `;
        const countParams = [];
        if (search) {
            countQuery += ` AND (
                jp.job_id ILIKE $${countParams.length + 1} OR
                jp.vendor ILIKE $${countParams.length + 1} OR
                jp.payment_type ILIKE $${countParams.length + 1} OR
                jp.bill_ref_no ILIKE $${countParams.length + 1} OR
                s.customer ILIKE $${countParams.length + 1}
            )`;
            countParams.push(`%${search}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count, 10);

        res.json({
            data: result.rows,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/job/:jobId', authenticateToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const result = await pool.query(
            `SELECT jp.*, u.username as requested_by_name 
             FROM job_payments jp
             LEFT JOIN users u ON jp.requested_by = u.id
             WHERE jp.job_id = $1 
             ORDER BY jp.created_at DESC`,
            [jobId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new payment
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { job_id, payment_type, vendor, amount, bill_ref_no, paid_by } = req.body;
        const requested_by = req.user.id;

        if (!job_id || !payment_type || !amount || !paid_by) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await pool.query(
            `INSERT INTO job_payments (job_id, payment_type, vendor, amount, bill_ref_no, paid_by, requested_by, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending')
             RETURNING *`,
            [job_id, payment_type, vendor, amount, bill_ref_no, paid_by, requested_by]
        );

        // Optional: Create audit log
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'CREATE_PAYMENT', `Created payment ${payment_type} of ${amount}`, 'PAYMENT', result.rows[0].id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a payment
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM job_payments WHERE id = $1', [id]);
        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        console.error('Delete payment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
