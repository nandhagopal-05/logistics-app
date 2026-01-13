CREATE TABLE IF NOT EXISTS clearance_schedules (
    id SERIAL PRIMARY KEY,
    job_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
    clearance_date DATE,
    clearance_type VARCHAR(50),
    port VARCHAR(100),
    bl_awb VARCHAR(100),
    transport_mode VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clearance_schedules_job_id ON clearance_schedules(job_id);
