import express from 'express';
import pool from '../config/database.js';
import path from 'path';

const router = express.Router();

router.get('/view/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM file_storage WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).send('File not found');
        }

        const file = result.rows[0];
        const buffer = file.data;
        
        // Handle headers
        res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
        res.setHeader('Content-Length', file.size);
        res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);

        res.send(buffer);

    } catch (e) {
        console.error('Error fetching file:', e);
        res.status(500).send('Server Error');
    }
});

export default router;
