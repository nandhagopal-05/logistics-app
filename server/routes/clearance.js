import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();

router.use(authenticateToken);

// Create a new clearance schedule
router.post('/', async (req, res) => {
    try {
        const { job_id, date, type, port, bl_awb, transport_mode, remarks } = req.body;

        if (!job_id || !date) {
            return res.status(400).json({ error: 'Job ID and Date are required' });
        }

        const result = await pool.query(
            `INSERT INTO clearance_schedules (job_id, clearance_date, clearance_type, port, bl_awb, transport_mode, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [job_id, date, type, port, bl_awb, transport_mode, remarks]
        );

        const schedule = result.rows[0];

        // Audit Log
        await logActivity(
            req.user.id,
            'CREATE_CLEARANCE_SCHEDULE',
            `Scheduled clearance for Job ${job_id} on ${date}`,
            'clearance_schedules',
            schedule.id
        );

        res.status(201).json(schedule);
    } catch (error) {
        console.error('Error creating clearance schedule:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all clearance schedules (with filters)
router.get('/', async (req, res) => {
    try {
        const { search, type, transport_mode, date } = req.query;

        let query = `
            SELECT cs.*, 
                   s.customer, 
                   s.sender_name as exporter, 
                   s.receiver_name as consignee,
                   s.description, -- Assuming packages info might be here
                   s.transport_mode as shipment_transport_mode -- Fallback
            FROM clearance_schedules cs
            JOIN shipments s ON cs.job_id = s.id
        `;

        const params = [];
        const conditions = [];

        if (search) {
            const i = params.length + 1;
            conditions.push(`(
                cs.job_id ILIKE $${i} OR 
                s.customer ILIKE $${i} OR 
                s.sender_name ILIKE $${i} OR 
                cs.bl_awb ILIKE $${i} OR
                cs.port ILIKE $${i}
            )`);
            params.push(`%${search}%`);
        }

        if (type && type !== 'All types') {
            params.push(type);
            conditions.push(`cs.clearance_type = $${params.length}`);
        }

        if (transport_mode && transport_mode !== 'All modes') {
            params.push(transport_mode);
            conditions.push(`cs.transport_mode = $${params.length}`);
        }

        if (date) {
            params.push(date);
            conditions.push(`cs.clearance_date = $${params.length}`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY cs.clearance_date ASC';

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching clearance schedules:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
