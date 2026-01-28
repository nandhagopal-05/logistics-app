import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get shipment stats
    const shipmentStats = await pool.query(`
      SELECT 
        COUNT(*) as total_shipments,
        COUNT(*) FILTER (WHERE status = 'In Transit') as active_deliveries,
        COUNT(*) FILTER (WHERE status = 'Delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'Delayed') as delayed
      FROM shipments
    `);

    // Get vehicle count
    const vehicleStats = await pool.query('SELECT COUNT(*) as total_vehicles FROM vehicles');

    // Calculate on-time rate
    const onTimeRate = await pool.query(`
      SELECT 
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'Delivered')::DECIMAL / 
          NULLIF(COUNT(*) FILTER (WHERE status IN ('Delivered', 'Delayed')), 0)) * 100, 
          1
        ) as on_time_rate
      FROM shipments
    `);

    // Get recent shipments
    const recentShipments = await pool.query(
      'SELECT * FROM shipments ORDER BY date DESC LIMIT 5'
    );

    // Get weekly data (last 7 days)
    const weeklyData = await pool.query(`
      SELECT 
        TO_CHAR(date, 'Dy') as day,
        COUNT(*) as shipments,
        COUNT(*) FILTER (WHERE status = 'Delivered') as deliveries
      FROM shipments
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY date, TO_CHAR(date, 'Dy')
      ORDER BY date
    `);

    // Get status distribution
    const statusData = await pool.query(`
      SELECT 
        status as name,
        COUNT(*) as value
      FROM shipments
      GROUP BY status
    `);

    // Team Snapshot Data

    // 1. Overdue Clearances: Schedules where date is past today
    const overdueClearances = await pool.query(`
            SELECT COUNT(*) 
            FROM clearance_schedules 
            WHERE clearance_date < CURRENT_DATE
        `);

    // 2. Scheduled Today (Created within 24h as per request)
    const scheduledToday = await pool.query(`
            SELECT COUNT(*) 
            FROM clearance_schedules 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
        `);

    // 3. Awaiting Delivery Notes (Pending status)
    const awaitingDeliveryNotes = await pool.query(`
            SELECT COUNT(*) 
            FROM delivery_notes 
            WHERE status = 'Pending'
        `);

    // 4. Documents Received (Uploaded today - Distinct Jobs)
    const documentsReceived = await pool.query(`
            SELECT COUNT(DISTINCT shipment_id) 
            FROM shipment_documents 
            WHERE DATE(uploaded_at) = CURRENT_DATE
        `);

    res.json({
      stats: {
        totalShipments: shipmentStats.rows[0].total_shipments,
        activeDeliveries: shipmentStats.rows[0].active_deliveries,
        fleetVehicles: vehicleStats.rows[0].total_vehicles,
        onTimeRate: onTimeRate.rows[0].on_time_rate || 0
      },
      teamSnapshot: {
        overdueClearances: parseInt(overdueClearances.rows[0].count),
        scheduledToday: parseInt(scheduledToday.rows[0].count),
        awaitingDeliveryNotes: parseInt(awaitingDeliveryNotes.rows[0].count),
        documentsReceived: parseInt(documentsReceived.rows[0].count)
      },
      recentShipments: recentShipments.rows,

      weeklyData: weeklyData.rows,
      statusData: statusData.rows
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get revenue data
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    // Mock revenue data (in a real app, this would come from a revenue table)
    const revenueData = [
      { month: 'Jan', revenue: 45000, expenses: 32000, profit: 13000 },
      { month: 'Feb', revenue: 52000, expenses: 35000, profit: 17000 },
      { month: 'Mar', revenue: 48000, expenses: 33000, profit: 15000 },
      { month: 'Apr', revenue: 61000, expenses: 38000, profit: 23000 },
      { month: 'May', revenue: 55000, expenses: 36000, profit: 19000 },
      { month: 'Jun', revenue: 67000, expenses: 40000, profit: 27000 },
    ];

    res.json(revenueData);
  } catch (error) {
    console.error('Get revenue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get delivery performance
router.get('/performance', authenticateToken, async (req, res) => {
  try {
    // Get weekly performance (last 4 weeks)
    const performance = await pool.query(`
      SELECT 
        'Week ' || EXTRACT(WEEK FROM date) as week,
        COUNT(*) FILTER (WHERE status = 'Delivered') as on_time,
        COUNT(*) FILTER (WHERE status = 'Delayed') as delayed
      FROM shipments
      WHERE date >= CURRENT_DATE - INTERVAL '4 weeks'
      GROUP BY EXTRACT(WEEK FROM date)
      ORDER BY EXTRACT(WEEK FROM date)
      LIMIT 4
    `);

    res.json(performance.rows);
  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get shipment volume
router.get('/volume', authenticateToken, async (req, res) => {
  try {
    const volume = await pool.query(`
      SELECT 
        TO_CHAR(date, 'Dy') as day,
        COUNT(*) as shipments
      FROM shipments
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY date, TO_CHAR(date, 'Dy')
      ORDER BY date
    `);

    res.json(volume.rows);
  } catch (error) {
    console.error('Get volume error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
