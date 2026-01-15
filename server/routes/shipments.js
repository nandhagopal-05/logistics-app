
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateInvoicePDF } from '../utils/invoiceGenerator.js';
import XLSX from 'xlsx';
import { logActivity } from '../utils/logger.js';


const router = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Updated regex to allow xlxs, xls, csv for imports AND images/pdf for docs
        const allowedTypes = /jpeg|jpg|png|pdf|xlsx|xls|csv/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        // checks mimetype but mimetype for excel can varies, so mostly relying on extension for excel
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Allowed: PDF, Images, Excel, CSV'));
    }
});

// Helper to generate Shipment ID
const generateShipmentId = async () => {
    const date = new Date();
    const year = date.getFullYear();
    const prefix = `SH-${year}`;

    // Get last shipment ID for this year
    const result = await pool.query(
        "SELECT id FROM shipments WHERE id LIKE $1 ORDER BY created_at DESC LIMIT 1",
        [`${prefix}-%`]
    );

    let nextNum = 1;
    if (result.rows.length > 0) {
        const lastId = result.rows[0].id;
        const parts = lastId.split('-');
        if (parts.length === 3) {
            nextNum = parseInt(parts[2]) + 1;
        }
    }

    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
};

// Import Shipments from Excel/CSV
router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        // Remove the uploaded file after parsing
        fs.unlinkSync(filePath);

        const importedShipments = [];
        let successCount = 0;
        let failureCount = 0;
        let errors = [];

        await pool.query('BEGIN');

        for (const row of data) {
            try {
                // Normalize keys to lowercase
                const normalizedRow = {};
                Object.keys(row).forEach(key => {
                    normalizedRow[key.toLowerCase().trim()] = row[key];
                });

                const shipmentNo = normalizedRow['shipment no'] || normalizedRow['shipment_no'] || normalizedRow['id'];
                const id = shipmentNo || await generateShipmentId();
                const status = 'New';
                const progress = 0;

                // Expected Headers mapping
                const customer = normalizedRow['customer'] || normalizedRow['client'] || normalizedRow['exporter'] || 'Unknown';
                const consignee = normalizedRow['consignee'] || normalizedRow['receiver'] || 'Unknown';
                const exporter = normalizedRow['exporter'] || normalizedRow['shipper'] || normalizedRow['sender'] || 'Unknown';
                const transport_mode = normalizedRow['transport mode'] || normalizedRow['mode'] || 'SEA';
                const description = normalizedRow['description'] || normalizedRow['goods'] || 'Import Goods';
                const weight = normalizedRow['g.w'] || normalizedRow['gw'] || normalizedRow['weight'] || '0';
                const price = parseFloat(normalizedRow['price'] || normalizedRow['value'] || normalizedRow['amount'] || '0');
                const origin = normalizedRow['origin'] || exporter;
                const destination = normalizedRow['destination'] || consignee;

                // New Excel Columns
                const invoiceNo = normalizedRow['invoice no'] || normalizedRow['invoice_no'] || null;
                const invoiceItems = normalizedRow['invoice # items'] || normalizedRow['invoice items'] || normalizedRow['items'] || null;
                const customsRForm = normalizedRow['customs r form'] || normalizedRow['customs_r_form'] || null;
                const blAwbNo = normalizedRow['bl/awb no'] || normalizedRow['bl awb no'] || normalizedRow['bl_awb_no'] || null;
                const containerNo = normalizedRow['container no'] || normalizedRow['container_no'] || null;
                const containerType = normalizedRow['container type'] || normalizedRow['container_type'] || null;
                const cbm = parseFloat(normalizedRow['cbm'] || '0');
                const noOfPkg = normalizedRow['no. of pkg'] || normalizedRow['no of pkg'] || normalizedRow['packages'] || null;

                // Expenses
                const expenseMacl = parseFloat(normalizedRow['macl'] || '0');
                const expenseMpl = parseFloat(normalizedRow['mpl'] || '0');
                const expenseMcs = parseFloat(normalizedRow['mcs'] || '0');
                const expenseTransportation = parseFloat(normalizedRow['transportation'] || '0');
                const expenseLiner = parseFloat(normalizedRow['liner'] || '0');

                // Insert Shipment
                await pool.query(
                    `INSERT INTO shipments (
                                id, customer, origin, destination, status, progress, 
                                sender_name, receiver_name, description, weight, price, transport_mode,
                                invoice_no, invoice_items, customs_r_form, bl_awb_no, container_no, container_type, cbm, no_of_pkgs,
                                expense_macl, expense_mpl, expense_mcs, expense_transportation, expense_liner
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
                    [
                        id, customer, origin, destination, status, progress,
                        exporter, consignee, description, weight, price, transport_mode,
                        invoiceNo, invoiceItems, customsRForm, blAwbNo, containerNo, containerType, cbm, noOfPkg,
                        expenseMacl, expenseMpl, expenseMcs, expenseTransportation, expenseLiner
                    ]
                );

                // Auto-Generate Invoice record
                const invoiceId = `INV-${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

                // Try to generate PDF
                let invoicePath = null;
                try {
                    const invoiceData = {
                        receiver_name: consignee,
                        customer: customer,
                        receiver_address: destination,
                        destination: destination,
                        description: description,
                        price: price
                    };
                    invoicePath = await generateInvoicePDF(invoiceData, invoiceId);
                } catch (pdfError) {
                    console.error('Import PDF Gen Error (non-fatal):', pdfError.message);
                }

                await pool.query(
                    'INSERT INTO invoices (id, shipment_id, amount, status, file_path) VALUES ($1, $2, $3, $4, $5)',
                    [invoiceId, id, price, 'Pending', invoicePath]
                );

                successCount++;
                importedShipments.push(id);

            } catch (rowError) {
                console.error('Error importing row:', row, rowError);
                failureCount++;
                errors.push(`Row error: ${rowError.message}`);
            }
        }

        await pool.query('COMMIT');

        // Log Action
        await logActivity(req.user.id, 'IMPORT_SHIPMENTS', `Imported ${successCount} shipments`, 'BATCH', 'EXCEL');

        res.json({
            message: 'Import processed',
            success: successCount,
            failed: failureCount,
            errors: errors.length > 0 ? errors : undefined,
            imported_ids: importedShipments
        });

    } catch (err) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await pool.query('ROLLBACK');
        console.error('Excel Import Error:', err);
        res.status(500).json({ error: 'Internal server error during import: ' + err.message });
    }
});

// Get all shipments
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = `
            SELECT s.*, i.id as invoice_id, i.status as payment_status 
            FROM shipments s
            LEFT JOIN invoices i ON s.id = i.shipment_id
        `;
        const params = [];
        const conditions = [];

        if (search) {
            conditions.push(`(s.id ILIKE $${params.length + 1} OR s.customer ILIKE $${params.length + 1} OR s.sender_name ILIKE $${params.length + 1})`);
            params.push(`%${search}%`);
        }

        if (status && status !== 'All') {
            conditions.push(`s.status = $${params.length + 1}`);
            params.push(status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY s.created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get shipments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single shipment
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const shipmentResult = await pool.query('SELECT * FROM shipments WHERE id = $1', [id]);

        if (shipmentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Shipment not found' });
        }

        const documentsResult = await pool.query('SELECT * FROM shipment_documents WHERE shipment_id = $1', [id]);
        const invoiceResult = await pool.query('SELECT * FROM invoices WHERE shipment_id = $1', [id]);

        res.json({
            ...shipmentResult.rows[0],
            documents: documentsResult.rows,
            invoice: invoiceResult.rows[0] || null,
            payment_status: invoiceResult.rows[0]?.status || 'Pending',
            invoice_id: invoiceResult.rows[0]?.id || null
        });
    } catch (error) {
        console.error('Get shipment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const shipmentUpload = upload.fields([
    { name: 'invoice', maxCount: 1 },
    { name: 'packing_list', maxCount: 1 },
    { name: 'transport_doc', maxCount: 1 }
]);

// Create new shipment
router.post('/', authenticateToken, shipmentUpload, async (req, res) => {
    try {
        const {
            sender_name, sender_address,
            receiver_name, receiver_address,
            description, weight, dimensions, price,
            date, expected_delivery_date, transport_mode,
            driver, vehicle_id
        } = req.body;

        const id = await generateShipmentId();
        const status = 'New';
        const progress = 0;

        // Map sender_name to customer and origin/destination for backward compatibility
        const customer = sender_name;
        const origin = sender_address ? sender_address.split('\n')[0] : '';
        const destination = receiver_address ? receiver_address.split('\n')[0] : '';

        // Handle case where numeric fields might be undefined or empty string
        const safePrice = price ? parseFloat(price) : 0;
        const safeWeight = weight || '0';

        // Begin transaction
        await pool.query('BEGIN');

        const shipmentQuery = `
            INSERT INTO shipments (
                id, customer, origin, destination, status, progress, 
                sender_name, sender_address, receiver_name, receiver_address,
                description, weight, dimensions, price,
                date, expected_delivery_date, transport_mode,
                driver, vehicle_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `;

        const shipmentValues = [
            id, customer, origin, destination, status, progress,
            sender_name, sender_address, receiver_name, receiver_address,
            description, safeWeight, dimensions, safePrice,
            date, expected_delivery_date, transport_mode,
            driver || null, vehicle_id || null
        ];

        const shipmentResult = await pool.query(shipmentQuery, shipmentValues);

        // Handle File Uploads
        if (req.files) {
            const fileTypes = ['invoice', 'packing_list', 'transport_doc'];

            for (const type of fileTypes) {
                if (req.files[type]) {
                    const file = req.files[type][0];
                    await pool.query(
                        'INSERT INTO shipment_documents (shipment_id, file_name, file_path, file_type, file_size, document_type) VALUES ($1, $2, $3, $4, $5, $6)',
                        [id, file.originalname, file.path, file.mimetype, file.size, type]
                    );
                }
            }
        }

        // AUTO-GENERATE INVOICE
        const invoiceId = `INV-${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

        // Generate PDF
        let invoicePath = null;
        try {
            const invoiceData = {
                receiver_name: receiver_name,
                customer: customer,
                receiver_address: receiver_address,
                destination: destination,
                description: description,
                price: safePrice
            };
            invoicePath = await generateInvoicePDF(invoiceData, invoiceId);
        } catch (pdfError) {
            console.error('PDF Generation failed:', pdfError);
            // Continue without PDF, just DB record
        }

        await pool.query(
            'INSERT INTO invoices (id, shipment_id, amount, status, file_path) VALUES ($1, $2, $3, $4, $5)',
            [invoiceId, id, safePrice, 'Pending', invoicePath]
        );

        // Log action
        await logActivity(req.user.id, 'CREATE_SHIPMENT', `Created shipment ${id}`, 'SHIPMENT', id);

        await pool.query('COMMIT');

        res.status(201).json(shipmentResult.rows[0]);
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Create shipment error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// Update shipment
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status, progress, driver, vehicle_id,
            sender_name, sender_address,
            receiver_name, receiver_address,
            description, weight, dimensions, price,
            date, expected_delivery_date, transport_mode,
            invoice_no, invoice_items, customs_r_form, bl_awb_no, container_no, container_type, cbm, no_of_pkgs,
            expense_macl, expense_mpl, expense_mcs, expense_transportation, expense_liner
        } = req.body;

        await pool.query('BEGIN');

        const result = await pool.query(
            `UPDATE shipments 
             SET status = COALESCE($1, status), 
                 progress = COALESCE($2, progress), 
                 driver = COALESCE($3, driver), 
                 vehicle_id = COALESCE($4, vehicle_id),
                 sender_name = COALESCE($5, sender_name),
                 sender_address = COALESCE($6, sender_address),
                 receiver_name = COALESCE($7, receiver_name),
                 receiver_address = COALESCE($8, receiver_address),
                 description = COALESCE($9, description),
                 weight = COALESCE($10, weight),
                 dimensions = COALESCE($11, dimensions),
                 price = COALESCE($12, price),
                 date = COALESCE($13, date),
                 expected_delivery_date = COALESCE($14, expected_delivery_date),
                 transport_mode = COALESCE($15, transport_mode),
                 invoice_no = COALESCE($17, invoice_no),
                 invoice_items = COALESCE($18, invoice_items),
                 customs_r_form = COALESCE($19, customs_r_form),
                 bl_awb_no = COALESCE($20, bl_awb_no),
                 container_no = COALESCE($21, container_no),
                 container_type = COALESCE($22, container_type),
                 cbm = COALESCE($23, cbm),
                 no_of_pkgs = COALESCE($24, no_of_pkgs),
                 expense_macl = COALESCE($25, expense_macl),
                 expense_mpl = COALESCE($26, expense_mpl),
                 expense_mcs = COALESCE($27, expense_mcs),
                 expense_transportation = COALESCE($28, expense_transportation),
                 expense_liner = COALESCE($29, expense_liner),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $16
             RETURNING *`,
            [
                status, progress, driver, vehicle_id,
                sender_name, sender_address, receiver_name, receiver_address,
                description, weight, dimensions, price,
                date, expected_delivery_date, transport_mode,
                id,
                invoice_no, invoice_items, customs_r_form, bl_awb_no, container_no, container_type, cbm, no_of_pkgs,
                expense_macl, expense_mpl, expense_mcs, expense_transportation, expense_liner
            ]
        );

        if (result.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'Shipment not found' });
        }

        const updatedShipment = result.rows[0];

        // AUTO-CREATE DELIVERY NOTE
        if (status === 'In Transit') {
            const checkDN = await pool.query('SELECT id FROM delivery_notes WHERE shipment_id = $1', [id]);
            if (checkDN.rows.length === 0) {
                const dnId = `DN-${new Date().getFullYear()}${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}`;

                await pool.query(
                    `INSERT INTO delivery_notes (
                        id, shipment_id, consignee, exporter, details_location, issued_by, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, 'Pending')`,
                    [
                        dnId,
                        id,
                        updatedShipment.receiver_name || updatedShipment.destination,
                        updatedShipment.sender_name || updatedShipment.customer,
                        updatedShipment.destination,
                        req.user.username
                    ]
                );

                await pool.query(
                    'INSERT INTO delivery_note_jobs (delivery_note_id, job_no) VALUES ($1, $2)',
                    [dnId, id]
                );
            }
        }

        // Log action
        await logActivity(req.user.id, 'UPDATE_SHIPMENT', `Updated shipment ${id}`, 'SHIPMENT', id);

        await pool.query('COMMIT');
        res.json(updatedShipment);
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Update shipment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete shipment
router.delete('/:id', authenticateToken, authorizeRole(['Administrator', 'Clearance Manager']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM shipments WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipment not found' });
        }

        res.json({ message: 'Shipment deleted successfully' });

        await logActivity(req.user.id, 'DELETE_SHIPMENT', `Deleted shipment ${id}`, 'SHIPMENT', id);
    } catch (error) {
        console.error('Delete shipment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
