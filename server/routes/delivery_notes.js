import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to generate DN Number
const generateDNId = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Count DNs created in this month
    const result = await pool.query(
        "SELECT count(*) FROM delivery_notes WHERE to_char(created_at, 'YYYY-MM') = $1",
        [`${year}-${month}`]
    );

    const count = parseInt(result.rows[0].count) + 1;
    const seq = String(count).padStart(3, '0'); // e.g. 001

    return `DN-${year}-${month}-${seq}`;
};

// Create a new Delivery Note
router.post('/', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Creating Delivery Note:', req.body);
        const { items, vehicles, loadingDate, unloadingDate, comments } = req.body;
        // items: [{ schedule_id, job_id, shortage, damaged, remarks }]
        // vehicles: [{ vehicleId, driver, driverContact, dischargeLocation }]

        if (!items || items.length === 0) {
            throw new Error('No items provided for Delivery Note');
        }

        // Generate ID
        const dnId = await generateDNId();

        // Fetch Consignee/Exporter from the first job (assuming batch belongs to same logic often, or we list first)
        let consignee = '';
        let exporter = '';

        // Use the first job to populate header info
        const firstJobId = items[0].job_id;
        const jobRes = await client.query('SELECT receiver_name, sender_name FROM shipments WHERE id = $1', [firstJobId]);
        if (jobRes.rows.length > 0) {
            consignee = jobRes.rows[0].receiver_name;
            exporter = jobRes.rows[0].sender_name;
        }

        // Insert Delivery Note
        // We use req.user.username or req.user.name or fall back to 'System'
        // authenticateToken usually provides req.user which matches the users table
        const issuedBy = req.user.username || req.user.name || 'System'; // Adjust based on auth middleware

        await client.query(
            `INSERT INTO delivery_notes (id, consignee, exporter, issued_date, issued_by, status, loading_date, unloading_date, comments)
             VALUES ($1, $2, $3, CURRENT_DATE, $4, 'Pending', $5, $6, $7)`,
            [dnId, consignee, exporter, issuedBy, loadingDate || null, unloadingDate || null, comments]
        );

        // Insert Items
        for (const item of items) {
            await client.query(
                `INSERT INTO delivery_note_items (delivery_note_id, schedule_id, job_id, shortage, damaged, remarks)
                  VALUES ($1, $2, $3, $4, $5, $6)`,
                [dnId, item.schedule_id, item.job_id, item.shortage, item.damaged, item.remarks]
            );
        }

        // Insert Vehicles
        if (vehicles && vehicles.length > 0) {
            for (const v of vehicles) {
                // Ensure vehicleId is valid UUID or null if empty string
                const vId = (v.vehicleId && v.vehicleId.trim() !== '') ? v.vehicleId : null;

                await client.query(
                    `INSERT INTO delivery_note_vehicles (delivery_note_id, vehicle_id, driver_name, driver_contact, discharge_location)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [dnId, vId, v.driver, v.driverContact, v.dischargeLocation]
                );
            }
        }

        await client.query('COMMIT');

        res.status(201).json({ id: dnId, message: 'Delivery Note Created Successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating delivery note:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Get all Delivery Notes with joined info
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = `
            SELECT dn.*,
                   (SELECT count(*) FROM delivery_note_items WHERE delivery_note_id = dn.id) as item_count,
                   (SELECT json_agg(job_id) FROM delivery_note_items WHERE delivery_note_id = dn.id) as job_ids
            FROM delivery_notes dn
        `;

        const conditions = [];
        const params = [];

        if (status && status !== 'All Statuses') {
            params.push(status);
            conditions.push(`dn.status = $${params.length}`);
        }

        if (search) {
            params.push(`%${search}%`);
            const i = params.length;
            conditions.push(`(dn.id ILIKE $${i} OR dn.consignee ILIKE $${i} OR dn.exporter ILIKE $${i})`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY dn.created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching delivery notes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Single Delivery Note Details
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const dnResult = await pool.query(`
            SELECT dn.*, c.email as consignee_email, c.phone as consignee_phone, c.address as consignee_address 
            FROM delivery_notes dn
            LEFT JOIN customers c ON LOWER(dn.consignee) = LOWER(c.name)
            WHERE dn.id = $1
        `, [id]);

        if (dnResult.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery Note not found' });
        }
        const dn = dnResult.rows[0];

        // Fetch Items with Shipment Details (BL/AWB, etc.)
        const itemsResult = await pool.query(`
            SELECT dni.*, s.bl_awb_no, s.sender_name, s.packages, s.package_type, s.container_no
            FROM delivery_note_items dni
            LEFT JOIN shipments s ON dni.job_id = s.id
            WHERE dni.delivery_note_id = $1
        `, [id]);

        // Fetch Vehicles
        const vehiclesResult = await pool.query(`
            SELECT dnv.*, v.id as registration_number, v.type as vehicle_type
            FROM delivery_note_vehicles dnv
            LEFT JOIN vehicles v ON dnv.vehicle_id = v.id
            WHERE dnv.delivery_note_id = $1
        `, [id]);

        res.json({
            ...dn,
            items: itemsResult.rows,
            vehicles: vehiclesResult.rows
        });
    } catch (error) {
        console.error('Error fetching delivery note details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update Status
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await pool.query('UPDATE delivery_notes SET status = $1 WHERE id = $2', [status, id]);
        res.json({ message: 'Status updated' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
