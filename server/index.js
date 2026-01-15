import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import shipmentRoutes from './routes/shipments.js';
import fleetRoutes from './routes/fleet.js';
import analyticsRoutes from './routes/analytics.js';
import usersRoutes from './routes/users.js';
import logsRoutes from './routes/logs.js';
import deliveryNoteRoutes from './routes/delivery_notes.js';
import invoiceRoutes from './routes/invoices.js';
import consigneeRoutes from './routes/consignees.js';
import customerRoutes from './routes/customers.js';
import exporterRoutes from './routes/exporters.js';
import clearanceRoutes from './routes/clearance.js';
import vendorRoutes from './routes/vendors.js';
import deliveryAgentRoutes from './routes/delivery_agents.js';

import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
    origin: true, // Allow any origin (reflects request origin)
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../dist')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/delivery-notes', deliveryNoteRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/consignees', consigneeRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/exporters', exporterRoutes);
app.use('/api/clearance', clearanceRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/delivery-agents', deliveryAgentRoutes);


// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Logistics API is running' });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    // Don't intercept API 404s
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Route not found' });
    }
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`💚 Health check: http://localhost:${PORT}/health\n`);
});
