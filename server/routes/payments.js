import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { broadcastNotification, broadcastToAll } from '../utils/notify.js';

const router = express.Router();

// Get all payments (with search/pagination)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, status, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT jp.*, u.username as requested_by_name, pu.username as processed_by_name, s.customer
            FROM job_payments jp
            LEFT JOIN users u ON jp.requested_by = u.id
            LEFT JOIN users pu ON jp.processed_by = pu.id
            LEFT JOIN shipments s ON jp.job_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            if (status.includes(',')) {
                const statuses = status.split(',');
                query += ` AND jp.status = ANY($${params.length + 1}::text[])`;
                params.push(statuses);
            } else {
                query += ` AND jp.status = $${params.length + 1}`;
                params.push(status);
            }
        }

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

        if (status) {
            if (status.includes(',')) {
                const statuses = status.split(',');
                countQuery += ` AND jp.status = ANY($${countParams.length + 1}::text[])`;
                countParams.push(statuses);
            } else {
                countQuery += ` AND jp.status = $${countParams.length + 1}`;
                countParams.push(status);
            }
        }

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

// Update payment status
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const result = await pool.query(
            'UPDATE job_payments SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Audit Log
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'UPDATE_PAYMENT_STATUS', `Updated payment status to ${status}`, 'PAYMENT', id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update payment amount/details
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;

        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }

        const result = await pool.query(
            'UPDATE job_payments SET amount = $1 WHERE id = $2 RETURNING *',
            [amount, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'UPDATE_PAYMENT', `Updated payment amount to ${amount}`, 'PAYMENT', id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update payment error:', error);
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
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Draft')
             RETURNING *`,
            [job_id, payment_type, vendor, amount, bill_ref_no, paid_by, requested_by]
        );

        // Optional: Create audit log
        // Log for Job History
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'PAYMENT_REQUEST', `Payment Request created`, 'SHIPMENT', job_id]
        );


        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send Batch to Accounts (Update Draft -> Pending)
router.post('/send-batch', authenticateToken, async (req, res) => {
    try {
        const { paymentIds } = req.body; // Array of IDs

        if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
            return res.status(400).json({ error: 'No Start Payment IDs provided' });
        }

        // Validate Job Clearance Status
        // Payments can only be sent to accounts if the Job is Cleared (progress == 100)
        const validationQuery = `
            SELECT DISTINCT s.id, s.progress, s.status, s.customer
            FROM job_payments jp
            JOIN shipments s ON jp.job_id = s.id
            WHERE jp.id = ANY($1)
        `;
        const valRes = await pool.query(validationQuery, [paymentIds]);

        const incompleteJobs = valRes.rows.filter(job => job.progress < 100 && job.status !== 'Cleared');

        if (incompleteJobs.length > 0) {
            const names = incompleteJobs.map(j => `Job ${j.id} (${j.customer})`).join(', ');
            return res.status(400).json({
                error: `Cannot send to accounts. The following jobs are not yet cleared: ${names}. Please issue Delivery Notes for all BLs first.`
            });
        }

        const result = await pool.query(
            "UPDATE job_payments SET status = 'Pending' WHERE id = ANY($1) AND status = 'Draft' RETURNING *",
            [paymentIds]
        );

        // Update Job Status to 'Payment' for related jobs
        const pendingJobs = [...new Set(valRes.rows.map(r => r.id))];
        if (pendingJobs.length > 0) {
            await pool.query(
                "UPDATE shipments SET status = 'Payment' WHERE id = ANY($1) AND status != 'Completed'",
                [pendingJobs]
            );
        }

        // Audit Logs per Job
        const jobsInBatch = [...new Set(valRes.rows.map(r => r.id))];
        for (const jId of jobsInBatch) {
            await pool.query(
                'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
                [req.user.id, 'SEND_PAYMENTS_TO_ACCOUNTS', `Payment sent for approval`, 'SHIPMENT', jId]
            );
        }

        // Notify Accountants
        try {
            await broadcastNotification('Accountant', 'Payment Approval Request', `New payments have been sent for approval by ${req.user.username}.`, 'action', '/payments');
        } catch (noteError) {
            console.error('Notification error:', noteError);
        }

        res.json({ message: 'Payments sent to accounts', updated: result.rowCount });
    } catch (error) {
        console.error('Send batch error:', error);
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

// Process Batch Payments (Pending/Approved -> Paid)
router.post('/process-batch', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { paymentIds, comments, reference, paymentDate, paymentMode } = req.body;
        const processed_by = req.user.id;

        if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
            return res.status(400).json({ error: 'No items to process' });
        }

        // Generate Voucher Number
        // VH-{YYYY}-001
        const currentYear = new Date().getFullYear();
        const prefix = `VH-${currentYear}-`;

        // Find last voucher number for this year
        const lastVoucherRes = await client.query(
            `SELECT voucher_no FROM job_payments WHERE voucher_no LIKE $1 ORDER BY voucher_no DESC LIMIT 1`,
            [`${prefix}%`]
        );

        let sequence = 1;
        if (lastVoucherRes.rows.length > 0 && lastVoucherRes.rows[0].voucher_no) {
            const lastNo = lastVoucherRes.rows[0].voucher_no;
            const parts = lastNo.split('-');
            if (parts.length === 3) {
                sequence = parseInt(parts[2], 10) + 1;
            }
        }

        const voucherNo = `${prefix}${String(sequence).padStart(3, '0')}`;

        // Update Payments
        // We assume all selected payments get the SAME voucher number if processed together? 
        // Requests usually imply a single "Payment Voucher" for a batch to a vendor.
        const query = `
            UPDATE job_payments 
            SET status = 'Paid',
                voucher_no = $1,
                bill_ref_no = $2,
                paid_at = $3,
                payment_mode = $4,
                comments = $5,
                processed_by = $6,
                updated_at = NOW()
            WHERE id = ANY($7)
            RETURNING *
        `;

        const result = await client.query(query, [
            voucherNo,
            reference,
            paymentDate,
            paymentMode,
            comments,
            processed_by,
            paymentIds
        ]);

        // Check for Job Completion
        const distinctJobIds = [...new Set(result.rows.map(p => p.job_id))];
        const completedJobs = [];

        for (const jId of distinctJobIds) {
            // Check if all payments are paid
            const checkRes = await client.query("SELECT count(*) FROM job_payments WHERE job_id = $1 AND status != 'Paid'", [jId]);
            if (parseInt(checkRes.rows[0].count) === 0) {
                // Log Payment Completion separately
                await pool.query(
                    'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
                    [req.user.id, 'ALL_PAYMENTS_COMPLETED', `All payments completed`, 'SHIPMENT', jId]
                );
            }
        }

        await client.query('COMMIT');

        // Audit Logs & Notifications (After Commit)
        for (const jId of distinctJobIds) {
            await pool.query(
                'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
                [processed_by, 'PAYMENT_PROCESSED', `Payments processed (Voucher: ${voucherNo})`, 'SHIPMENT', jId]
            );
        }

        // Notify Completed
        for (const job of completedJobs) {
            try {
                await broadcastToAll('Job Completed', `Job ${job.id} (${job.customer}) is now Completed.`, 'success', `/registry?id=${job.id}`);
                await pool.query(
                    'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
                    [req.user.id, 'JOB_COMPLETED', `Job marked as Completed`, 'SHIPMENT', job.id]
                );
            } catch (ne) { console.error(ne); }
        }


        res.json({ message: 'Payments processed successfully', data: result.rows, voucherNo });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Process batch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

export default router;
