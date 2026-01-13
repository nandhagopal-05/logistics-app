import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    service: 'gmail', // Use 'gmail' or configure host/port for other providers
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 */
export const sendEmail = async (to, subject, text, html) => {
    // Check for default credentials
    if (process.env.EMAIL_USER === 'your-email@gmail.com' || process.env.EMAIL_PASS === 'your-app-password') {
        console.warn('WARNING: Email not sent. You are using default placeholder credentials in server/.env.');
        console.warn('Please update EMAIL_USER and EMAIL_PASS with your actual Gmail address and App Password.');
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Seaflow Logistics" <no-reply@seaflow.com>',
            to,
            subject,
            text,
            html
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        // In development/demo, we might not have valid credentials, so just log it.
        // throw error; 
    }
};

export const sendWelcomeEmail = async (to, username, password) => {
    const subject = 'Welcome to Seaflow Logistics';
    const text = `Hello, \n\nYour account has been created.\nUsername: ${username}\nPassword: ${password}\n\nPlease login and change your password immediately.`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">Welcome to Seaflow Logistics</h2>
            <p>Your account has been successfully created.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Username:</strong> ${username}</p>
                <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
            </div>
            <p>Please <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login">login</a> and change your password immediately.</p>
        </div>
    `;
    await sendEmail(to, subject, text, html);
};

export const sendPasswordResetEmail = async (to, token) => {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    const subject = 'Password Reset Request';
    const text = `Hello, \n\nYou requested a password reset. Click the following link to reset your password: ${resetLink}\n\nThis link will expire in 1 hour.`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">Password Reset Request</h2>
            <p>You requested a password reset. Click the button below to reset your password:</p>
            <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
            <p style="font-size: 12px; color: #666;">This link will expire in 1 hour.</p>
        </div>
    `;
    await sendEmail(to, subject, text, html);
};
