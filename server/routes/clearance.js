import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();

router.use(authenticateToken);

// Create a new clearance schedule
router.post('/', async (req, res) => {
    try {
        console.log('Creating clearance schedule:', req.body);
        const { job_id, date, type, port, bl_awb, transport_mode, remarks, packages, clearance_method, container_no, container_type } = req.body;

        if (!job_id || !date) {
            return res.status(400).json({ error: 'Job ID and Date are required' });
        }

        const result = await pool.query(
            `INSERT INTO clearance_schedules (job_id, clearance_date, clearance_type, port, bl_awb, transport_mode, remarks, packages, clearance_method, container_no, container_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [job_id, date, type, port, bl_awb, transport_mode, remarks, packages, clearance_method, container_no, container_type]
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

// Update a clearance schedule
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { date, type, port, bl_awb, transport_mode, remarks, packages, clearance_method, reschedule_reason, container_no, container_type } = req.body;

        const result = await pool.query(
            `UPDATE clearance_schedules 
             SET clearance_date = $1, clearance_type = $2, port = $3, bl_awb = $4, transport_mode = $5, remarks = $6, packages = $7, clearance_method = $8, reschedule_reason = $9, container_no = $10, container_type = $11
             WHERE id = $12
             RETURNING *`,
            [date, type, port, bl_awb, transport_mode, remarks, packages, clearance_method, reschedule_reason, container_no, container_type, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Clearance schedule not found' });
        }

        const schedule = result.rows[0];

        // Audit Log
        await logActivity(
            req.user.id,
            'UPDATE_CLEARANCE_SCHEDULE',
            `Updated clearance schedule for Job ${schedule.job_id}`,
            'clearance_schedules',
            schedule.id
        );

        res.json(schedule);
    } catch (error) {
        console.error('Error updating clearance schedule:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all clearance schedules (with filters)
router.get('/', async (req, res) => {
    try {
        const { search, type, transport_mode, date } = req.query;

        // Note: We might need master_bl/house_bl from shipments if present in schema.
        // Assuming they might be added or we just rely on what is saved in clearance_schedules.bl_awb
        // For now, let's just make sure we get enough shipment info to populate dropdowns if needed
        // but typically 'bl_awb' is stored in theschedule itself.
        // To be safe for editing, if we need to show OPTIONS, we should join relevant columns.
        // Based on user feedback earlier, they use master_bl/house_bl from selectedJob prop in frontend.
        // We will expose them here just in case.

        // Checking schema: shipments table doesn't have master_bl/house_bl explicitly in my view_file checks,
        // but user asked for them. I will assume they might exist or be part of description/etc?
        // Actually, earlier I used selectedJob.master_bl in frontend. If that worked, they exist in frontend model from somewhere.
        // Let's assume they are columns or alias them. If not, the query will fail.
        // Safest is to just stick to what works, but adding update endpoint is key.

        let query = `
            SELECT cs.*, 
                   s.customer, 
                   s.sender_name as exporter, 
                   s.receiver_name as consignee,
                   s.description,
                   s.container_no,
                   s.container_type,
                   s.transport_mode as shipment_transport_mode,
                   s.bl_awb_no
            FROM clearance_schedules cs
            LEFT JOIN shipments s ON cs.job_id = s.id
        `;

        const params = [];
        const conditions = [];

        // Exclude schedules that are already linked to a Delivery Note (and thus "transferred")
        conditions.push(`cs.id NOT IN (SELECT schedule_id FROM delivery_note_items WHERE schedule_id IS NOT NULL)`);

        if (search) {
            const i = params.length + 1;
            conditions.push(`(
        cs.job_id ILIKE $${i} OR 
                s.customer ILIKE $${i} OR 
                s.sender_name ILIKE $${i} OR 
                cs.bl_awb ILIKE $${i} OR
                cs.port ILIKE $${i}
    )`);
            params.push(`% ${search} % `);
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

// Delete a clearance schedule
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM clearance_schedules WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        const schedule = result.rows[0];

        // Audit Log
        await logActivity(
            req.user.id,
            'DELETE_CLEARANCE_SCHEDULE',
            `Deleted clearance schedule for Job ${schedule.job_id}`,
            'clearance_schedules',
            id
        );

        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        console.error('Error deleting clearance schedule:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
