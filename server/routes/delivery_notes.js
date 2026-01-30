import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logActivity } from '../utils/logger.js';
import { broadcastToAll } from '../utils/notify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Memory Storage for DB persistence
const storage = multer.memoryStorage();

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

// Ensure File Storage Table Exists
// Table creation handled by migration 034_create_file_storage.sql

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

        if (!items || items.length === 0) {
            throw new Error('No items provided for Delivery Note');
        }

        // Generate ID
        const dnId = await generateDNId();

        // Fetch Consignee/Exporter from the first job
        let consignee = '';
        let exporter = '';
        const firstJobId = items[0].job_id;
        const jobRes = await client.query('SELECT receiver_name, sender_name FROM shipments WHERE id = $1', [firstJobId]);
        if (jobRes.rows.length > 0) {
            consignee = jobRes.rows[0].receiver_name;
            exporter = jobRes.rows[0].sender_name;
        }

        const issuedBy = req.user.username || req.user.name || 'System';

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
                const vId = (v.vehicleId && v.vehicleId.trim() !== '') ? v.vehicleId : null;
                await client.query(
                    `INSERT INTO delivery_note_vehicles (delivery_note_id, vehicle_id, driver_name, driver_contact, discharge_location)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [dnId, vId, v.driver, v.driverContact, v.dischargeLocation]
                );
            }
        }

        // UPDATE JOB PROGRESS
        // Check if all BLs for the job(s) are now delivered
        const jobIds = [...new Set(items.map(i => i.job_id))];
        for (const jobId of jobIds) {
            // 1. Get Total BLs for this Job
            // We check shipment_bls table. If empty, we fallback to considering the shipment itself as 1 unit (master BL)
            const blRes = await client.query('SELECT COUNT(*) FROM shipment_bls WHERE shipment_id = $1', [jobId]);
            let totalBLs = parseInt(blRes.rows[0].count);

            // If no breakdown in shipment_bls, we treat it as 1 main BL (from shipments table)
            if (totalBLs === 0) totalBLs = 1;

            // 2. Get Delivered BLs for this Job
            // We count distinct BLs from clearance schedules that are linked to ANY delivery note item
            const deliveredRes = await client.query(`
                SELECT COUNT(DISTINCT cs.bl_awb) 
                FROM delivery_note_items dni
                JOIN clearance_schedules cs ON dni.schedule_id = cs.id
                WHERE dni.job_id = $1
            `, [jobId]);
            const deliveredBLs = parseInt(deliveredRes.rows[0].count);

            console.log(`Job ${jobId} Progress Check: ${deliveredBLs}/${totalBLs} BLs delivered`);

            // 3. Update Status if Complete
            if (deliveredBLs >= totalBLs) {
                // Check if Payments are fully paid
                const payRes = await client.query("SELECT count(*) as pending FROM job_payments WHERE job_id = $1 AND status != 'Paid'", [jobId]);
                const totalPayRes = await client.query("SELECT count(*) as total FROM job_payments WHERE job_id = $1", [jobId]);

                const pendingPayments = parseInt(payRes.rows[0].pending);
                const totalPayments = parseInt(totalPayRes.rows[0].total);

                if (totalPayments > 0 && pendingPayments === 0) {
                    await logActivity(req.user.id, 'ALL_PAYMENTS_COMPLETED', `All payments completed`, 'SHIPMENT', jobId);
                }

                // Always set to 'Cleared' when delivery is done. 'Completed' is a manual step.
                await client.query('UPDATE shipments SET progress = 100, status = $1 WHERE id = $2', ['Cleared', jobId]);
            } else {
                // Optional: Set partial progress? e.g. (delivered / total) * 100
                // preserving 'status' might be better if not complete, or set to 'In Clearance'
                const percent = Math.floor((deliveredBLs / totalBLs) * 100);
                await client.query('UPDATE shipments SET progress = $1 WHERE id = $2', [percent, jobId]);
            }
        }

        // Log Activities
        for (const jId of jobIds) {
            await logActivity(req.user.id, 'CLEARANCE', `Clearance (Delivery Note ${dnId} issued)`, 'SHIPMENT', jId);
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

// Get all Delivery Notes
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

        const itemsResult = await pool.query(`
            SELECT dni.*, 
                   COALESCE(cs.bl_awb, s.bl_awb_no) as bl_awb_no, 
                   s.sender_name, 
                   COALESCE(cs.packages, CAST(s.no_of_pkgs AS VARCHAR)) as packages, 
                   COALESCE(cs.container_type, s.container_type) as package_type, 
                   COALESCE(cs.container_no, s.container_no) as container_no,
                   cs.port as schedule_port
            FROM delivery_note_items dni
            LEFT JOIN clearance_schedules cs ON dni.schedule_id = cs.id
            LEFT JOIN shipments s ON dni.job_id = s.id
            WHERE dni.delivery_note_id = $1
        `, [id]);

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

// Update Delivery Note Details (Documents via DB, Comments, Date)
router.put('/:id', authenticateToken, upload.array('files'), async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { unloading_date, comments, mark_delivered } = req.body;

        await client.query('BEGIN');

        // 1. Fetch existing data
        const currentRes = await client.query('SELECT documents, status FROM delivery_notes WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery note not found' });
        }

        let currentDocs = currentRes.rows[0].documents || [];
        if (!Array.isArray(currentDocs)) currentDocs = [];

        // 2. Process Uploaded Files - SAVE TO DB
        const newDocs = [];
        if (req.files && req.files.length > 0) {


            for (const file of req.files) {
                // Insert into file_storage
                const fileRes = await client.query(
                    `INSERT INTO file_storage (filename, mime_type, data, size) 
                     VALUES ($1, $2, $3, $4) 
                     RETURNING id`,
                    [file.originalname, file.mimetype, file.buffer, file.size]
                );
                const fileId = fileRes.rows[0].id;

                newDocs.push({
                    fileId: fileId, // Important: Store the DB ID
                    name: file.originalname,
                    // Legacy URL for fallbacks or UI display logic
                    url: `/api/delivery-notes/document/view?fileId=${fileId}`,
                    uploaded_at: new Date().toISOString(),
                    type: file.mimetype,
                    size: file.size
                });
            }
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

        const result = await client.query(query, params);

        await client.query('COMMIT');
        res.json(result.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating delivery note:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Delete Document
router.delete('/:id/documents', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { url } = req.body;

        if (!url) return res.status(400).json({ error: 'URL is required' });

        const currentRes = await pool.query('SELECT documents FROM delivery_notes WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) return res.status(404).json({ error: 'Note not found' });

        let currentDocs = currentRes.rows[0].documents || [];
        if (!Array.isArray(currentDocs)) currentDocs = [];

        // Identify the doc to remove
        const docToRemove = currentDocs.find(doc => doc.url === url);
        const newDocs = currentDocs.filter(doc => doc.url !== url);

        // Update DB Record
        await pool.query('UPDATE delivery_notes SET documents = $1 WHERE id = $2', [JSON.stringify(newDocs), id]);

        // If it has a fileId, delete from file_storage
        if (docToRemove && docToRemove.fileId) {
            await pool.query('DELETE FROM file_storage WHERE id = $1', [docToRemove.fileId]);
        }
        // Note: We don't delete files from disk for legacy URLs to strictly avoid file system access, 
        // as we assume we are moving to DB storage. 

        // Return updated note structure for frontend
        const updatedRes = await pool.query('SELECT * FROM delivery_notes WHERE id = $1', [id]);
        res.json(updatedRes.rows[0]);

    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve Document (DB or Disk Fallback)
router.get('/document/view', authenticateToken, async (req, res) => {
    try {
        const { path: filePath, fileId } = req.query;

        // 1. Try DB Storage
        if (fileId) {
            const fileRes = await pool.query('SELECT * FROM file_storage WHERE id = $1', [fileId]);
            if (fileRes.rows.length > 0) {
                const file = fileRes.rows[0];
                res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
                res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
                return res.send(file.data);
            } else {
                // Even if fileId provided, if not found, it might be gone.
                return res.status(404).json({ error: 'File not found in database' });
            }
        }

        // 2. Legacy Disk Fallback (if path provided)
        if (filePath) {
            const filename = path.basename(filePath);
            const absolutePath = path.join(__dirname, '../uploads', filename);

            if (fs.existsSync(absolutePath)) {
                return res.sendFile(absolutePath);
            } else {
                return res.status(404).json({ error: 'File not found on server' });
            }
        }

        res.status(400).send('File identifier required (fileId or path)');

    } catch (e) {
        console.error('Error serving document:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
