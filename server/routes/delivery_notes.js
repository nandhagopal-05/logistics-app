import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // resolve to server/uploads
        // __dirname is .../server/routes
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Sanitize filename
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|xlsx|xls|csv|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type'));
    }
});

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
        // Fetch Items with Shipment Details
        // Joining to get BL/AWB, Shipper (Sender), Packages
        // PRIORITIZE details from Clearance Schedule (cs) if they exist
        // Also fetch 'port' from clearance schedule to use as fallback/default Discharge Location
        // Fallback to Shipment (s) details
        const itemsResult = await pool.query(`
            SELECT dni.*, 
                   COALESCE(cs.bl_awb, s.bl_awb_no) as bl_awb_no, 
                   s.sender_name, 
                   COALESCE(cs.packages, CAST(s.no_of_pkgs AS VARCHAR)) as packages, 
                   s.container_type as package_type, 
                   s.container_no,
                   cs.port as schedule_port
            FROM delivery_note_items dni
            LEFT JOIN clearance_schedules cs ON dni.schedule_id = cs.id
            LEFT JOIN shipments s ON dni.job_id = s.id
            WHERE dni.delivery_note_id = $1
        `, [id]);

        // Fetch Vehicles
        // Joining to get Vehicle Name/Registration if vehicle_id exists
        // Note: vehicle_id in delivery_note_vehicles might be the registration number (string) based on fleet import logic
        // We alias columns to match the frontend camelCase interface (DeliveryNoteVehicle)
        const vehiclesResult = await pool.query(`
            SELECT dnv.id,
                   dnv.vehicle_id as "vehicleId", 
                   dnv.driver_name as "driver",
                   dnv.driver_contact as "driverContact",
                   dnv.discharge_location as "dischargeLocation",
                   v.name as "vehicleName", 
                   v.id as "registrationNumber",
                   v.type as "vehicle_type"
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

// Delete Delivery Note
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM delivery_notes WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery Note not found' });
        }

        res.json({ message: 'Delivery Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting delivery note:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update Delivery Note Details (Documents, Comments, Date)
router.put('/:id', authenticateToken, upload.array('files'), async (req, res) => {
    try {
        const { id } = req.params;
        const { unloading_date, comments, mark_delivered } = req.body;

        // 1. Fetch existing data
        const currentRes = await pool.query('SELECT documents, status FROM delivery_notes WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery note not found' });
        }

        let currentDocs = currentRes.rows[0].documents || [];
        // Ensure strictly an array
        if (!Array.isArray(currentDocs)) currentDocs = [];

        // 2. Process Uploaded Files
        const newDocs = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                newDocs.push({
                    name: file.originalname,
                    url: `/uploads/${file.filename}`,
                    uploaded_at: new Date().toISOString(),
                    type: file.mimetype,
                    size: file.size
                });
            });
        }

        const updatedDocs = [...currentDocs, ...newDocs];
        const updatedDocsJson = JSON.stringify(updatedDocs);

        // 3. Build Update Query
        let query = 'UPDATE delivery_notes SET documents = $1';
        const params = [updatedDocsJson];
        let pIdx = 2;

        if (unloading_date) {
            query += `, unloading_date = $${pIdx++}`;
            params.push(unloading_date);
        }

        if (comments !== undefined) {
            query += `, comments = $${pIdx++}`;
            params.push(comments);
        }

        if (mark_delivered === 'true' || mark_delivered === true) {
            query += `, status = 'Delivered'`;
        }

        query += ` WHERE id = $${pIdx}`;
        params.push(id);

        query += ' RETURNING *';

        const result = await pool.query(query, params);
        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error updating delivery note:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve Document safely
router.get('/document/view', authenticateToken, async (req, res) => {
    try {
        const { path: filePath } = req.query;
        if (!filePath) return res.status(400).send('Path required');

        // Extract filename from the stored path (e.g. /uploads/filename.ext -> filename.ext)
        const filename = path.basename(filePath);
        const absolutePath = path.join(__dirname, '../uploads', filename);

        if (fs.existsSync(absolutePath)) {
            res.sendFile(absolutePath);
        } else {
            console.error(`File not found at: ${absolutePath}`);
            res.status(404).json({ error: 'File not found on server' });
        }
    } catch (e) {
        console.error('Error serving document:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
