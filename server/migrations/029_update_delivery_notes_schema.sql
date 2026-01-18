-- Add reschedule_reason to clearance_schedules
ALTER TABLE clearance_schedules ADD COLUMN IF NOT EXISTS reschedule_reason VARCHAR(100);

-- Update delivery_notes table
-- We will revamp it to ensure it covers all new fields
ALTER TABLE delivery_notes ADD COLUMN IF NOT EXISTS loading_date DATE;
ALTER TABLE delivery_notes ALTER COLUMN shipment_id DROP NOT NULL;

-- Create delivery_note_items to store detailed item info
CREATE TABLE IF NOT EXISTS delivery_note_items (
    id SERIAL PRIMARY KEY,
    delivery_note_id VARCHAR(50) REFERENCES delivery_notes(id) ON DELETE CASCADE,
    schedule_id INTEGER REFERENCES clearance_schedules(id),
    job_id VARCHAR(50) REFERENCES shipments(id),
    shortage VARCHAR(50),
    damaged VARCHAR(50),
    remarks TEXT
);

-- Create delivery_note_vehicles to store transport info
CREATE TABLE IF NOT EXISTS delivery_note_vehicles (
    id SERIAL PRIMARY KEY,
    delivery_note_id VARCHAR(50) REFERENCES delivery_notes(id) ON DELETE CASCADE,
    vehicle_id UUID, -- Assuming fleet uses UUID, if not remove type constraint or check fleet schema
    driver_name VARCHAR(255),
    driver_contact VARCHAR(100),
    discharge_location VARCHAR(255)
);
