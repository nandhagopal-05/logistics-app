import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const router = express.Router();

import crypto from 'crypto';

// ... (imports)

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password, token: twoFactorToken } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Get user from database
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check for 2FA
        if (user.two_factor_enabled) {
            if (!twoFactorToken) {
                return res.json({ requiresTwoFactor: true });
            }

            const verified = speakeasy.totp.verify({
                secret: user.two_factor_secret,
                encoding: 'base32',
                token: twoFactorToken
            });

            if (!verified) {
                return res.status(401).json({ error: 'Invalid 2FA token' });
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Store Session
        try {
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            const userAgent = req.headers['user-agent'] || 'Unknown';
            // Simple IP extraction (handles proxies if configured, otherwise simple)
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';

            await pool.query(
                'INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL \'24 hours\')',
                [user.id, tokenHash, ip, userAgent]
            );
        } catch (sessionError) {
            console.error('Error saving session:', sessionError);
            // Don't fail login if session tracking fails, but nice to know
        }

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                must_change_password: user.must_change_password,
                two_factor_enabled: user.two_factor_enabled,
                photo_url: user.photo_url
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2FA: Generate Secret
router.post('/2fa/generate', authenticateToken, async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({
            name: `Seaflow Logistics (${req.user.username})`
        });

        // Store secret temporarily (or update existing) but keep enabled = false
        await pool.query(
            'UPDATE users SET two_factor_secret = $1 WHERE id = $2',
            [secret.base32, req.user.id]
        );

        // Generate QR Code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.json({
            secret: secret.base32,
            qrCodeUrl
        });
    } catch (error) {
        console.error('2FA Generate error:', error);
        res.status(500).json({ error: 'Failed to generate 2FA: ' + (error.message || 'Unknown error') });
    }
});

// 2FA: Verify & Enable
router.post('/2fa/verify', authenticateToken, async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    try {
        // Get user's secret
        const result = await pool.query('SELECT two_factor_secret FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];

        if (!user || !user.two_factor_secret) {
            return res.status(400).json({ error: '2FA not initialized' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token
        });

        if (verified) {
            await pool.query('UPDATE users SET two_factor_enabled = TRUE WHERE id = $1', [req.user.id]);
            res.json({ message: 'Two-factor authentication enabled successfully', verified: true });
        } else {
            res.status(400).json({ error: 'Invalid token', verified: false });
        }
    } catch (error) {
        console.error('2FA Verify error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2FA: Disable
router.post('/2fa/disable', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            'UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = $1',
            [req.user.id]
        );
        res.json({ message: 'Two-factor authentication disabled' });
    } catch (error) {
        console.error('2FA Disable error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Current User
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email, role, must_change_password, two_factor_enabled, photo_url FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Active Sessions
router.get('/sessions', authenticateToken, async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        const currentTokenHash = token ? crypto.createHash('sha256').update(token).digest('hex') : null;

        const result = await pool.query(
            `SELECT id, ip_address, user_agent, last_active, created_at, 
            (token_hash = $2) as is_current 
            FROM user_sessions 
            WHERE user_id = $1 
            ORDER BY last_active DESC`,
            [req.user.id, currentTokenHash]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Revoke Session
router.delete('/sessions/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            'DELETE FROM user_sessions WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );
        res.json({ message: 'Session revoked' });
    } catch (error) {
        console.error('Revoke session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout (Revoke current session)
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        if (token) {
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            await pool.query(
                'DELETE FROM user_sessions WHERE token_hash = $1',
                [tokenHash]
            );
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        // Even if DB fails, tell client strictly to clear token
        res.json({ message: 'Logged out' });
    }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const result = await pool.query('SELECT id, username FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            // For security, do not reveal if the email exists
            return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        const user = result.rows[0];

        // Generate Token (simple random string for now, could use crypto.randomBytes)
        // Using crypto would require importing it, but let's stick to a simple secure enough random string for this context or use jwt
        // Let's use jwt as we already have it imported, it's easy to verify and can contain expiration
        const token = jwt.sign(
            { id: user.id, type: 'reset' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Store token hash in DB (optional if using stateless JWT, but prompt implied storing random password/token flow. 
        // Although JWT is self-contained. Let's strictly follow "add column reset_token" from migration)
        // Actually, if we use JWT we don't strictly need to store it if we just verify signature, 
        // BUT storing it allows us to invalidate it after use (single use).

        // Let's store it to ensure single use and valid tracking
        await pool.query(
            'UPDATE users SET reset_password_token = $1, reset_password_expires = NOW() + INTERVAL \'1 hour\' WHERE id = $2',
            [token, user.id]
        );

        // Send Email (Async)
        import('../utils/email.js').then(({ sendPasswordResetEmail }) => {
            sendPasswordResetEmail(email, token).catch(err => {
                console.error('Failed to send password reset email (async):', err);
            });
        }).catch(err => {
            console.error('Failed to import email utils:', err);
        });

        res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
    }

    try {
        // Verify JWT first (checks expiration and signature)
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        if (decoded.type !== 'reset') {
            return res.status(400).json({ error: 'Invalid token type' });
        }

        // Check if token matches DB and is not expired (double check database side)
        const result = await pool.query(
            'SELECT id FROM users WHERE id = $1 AND reset_password_token = $2 AND reset_password_expires > NOW()',
            [decoded.id, token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        // Update Password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
            [hashedPassword, decoded.id]
        );

        res.json({ message: 'Password has been reset successfully' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Change Password (Authenticated)
router.post('/change-password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!newPassword || !oldPassword) {
        return res.status(400).json({ error: 'Old and new passwords are required' });
    }

    try {
        // Get user
        const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = result.rows[0];

        // Verify old password
        const validPassword = await bcrypt.compare(oldPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Incorrect old password' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear must_change_password flag
        await pool.query(
            'UPDATE users SET password = $1, must_change_password = FALSE WHERE id = $2',
            [hashedPassword, req.user.id]
        );

        // Log action
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'CHANGE_PASSWORD', `User changed password`, 'USER', req.user.id]
        );

        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
