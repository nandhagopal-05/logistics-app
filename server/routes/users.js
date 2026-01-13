import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

const VALID_ROLES = [
    'Administrator',
    'Administrator Assistant',
    'Accountant',
    'Accountant Assistant',
    'Clearance Manager',
    'Clearance Manager Assistant'
];

// Ensure authentication
router.use(authenticateToken);

// Get all users (Admins only)
router.get('/', authorizeRole(['Administrator']), async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role, email, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new user (Admins only)
router.post('/', authorizeRole(['Administrator']), async (req, res) => {
    const { username, password, role, email } = req.body;

    if (!username || !role || !email) {
        return res.status(400).json({ error: 'Missing required fields (username, role, email)' });
    }

    if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    // Generate random password if not provided
    const generatedPassword = password || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        // Insert user
        const result = await pool.query(
            'INSERT INTO users (username, password, role, email, must_change_password) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role, email, created_at',
            [username, hashedPassword, role, email, true]
        );

        // Send Welcome Email
        // Send Welcome Email (Async - don't wait for it)
        import('../utils/email.js').then(({ sendWelcomeEmail }) => {
            sendWelcomeEmail(email, username, generatedPassword).catch(err => {
                console.error('Failed to send welcome email (async):', err);
            });
        }).catch(err => {
            console.error('Failed to import email utils:', err);
        });

        // Log action
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'CREATE_USER', `Created user ${username} with role ${role}`, 'USER', result.rows[0].id]
        );

        const newUser = result.rows[0];
        // Return the generated password so the admin can give it to the user if email fails
        newUser.temporaryPassword = generatedPassword;

        res.status(201).json(newUser);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Username or email already exists' });
        }
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { role, password, username, email } = req.body;

    // Authorization Check: Admin or Self
    if (req.user.role !== 'Administrator' && req.user.id !== id) {
        return res.status(403).json({ error: 'Access denied' });
    }

    // Only Admin can change roles
    if (role && req.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Only Administrators can change roles' });
    }

    if (role && !VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    try {
        let query = 'UPDATE users SET ';
        const values = [];
        let index = 1;

        if (role) {
            query += `role = $${index}, `;
            values.push(role);
            index++;
        }

        if (username) {
            query += `username = $${index}, `;
            values.push(username);
            index++;
        }

        if (email) {
            query += `email = $${index}, `;
            values.push(email);
            index++;
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += `password = $${index}, `;
            values.push(hashedPassword);
            index++;
        }

        if (values.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        // Remove trailing comma and space
        query = query.slice(0, -2);
        query += ` WHERE id = $${index} RETURNING id, username, role, email`;
        values.push(id);

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Log action
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'UPDATE_USER', `Updated user ${result.rows[0].username}`, 'USER', id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Username or email already exists' });
        }
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete user (Admins only)
router.delete('/:id', authorizeRole(['Administrator']), async (req, res) => {
    const { id } = req.params;

    if (id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    try {
        const check = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const usernameToDelete = check.rows[0].username;

        await pool.query('DELETE FROM users WHERE id = $1', [id]);

        // Log action
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'DELETE_USER', `Deleted user ${usernameToDelete}`, 'USER', id]
        );

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

import multer from 'multer';
import path from 'path';

// Configure Multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// Upload profile photo
router.post('/:id/photo', upload.single('photo'), async (req, res) => {
    const { id } = req.params;

    // Authorization Check: Admin or Self
    if (req.user.role !== 'Administrator' && req.user.id !== id) {
        return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const photoUrl = `/uploads/${req.file.filename}`;

        await pool.query(
            'UPDATE users SET photo_url = $1 WHERE id = $2',
            [photoUrl, id]
        );

        res.json({ photoUrl });
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
