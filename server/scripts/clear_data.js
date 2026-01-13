import pool from '../config/database.js';

const clearData = async () => {
    try {
        console.log('Clearing all shipment data...');
        // Due to CASCADE constraints, deleting shipments should clear related invoices, delivery_notes, documents, etc.
        await pool.query('DELETE FROM shipments');
        console.log('All shipments deleted successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing data:', error);
        process.exit(1);
    }
};

clearData();
