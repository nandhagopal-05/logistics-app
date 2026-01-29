CREATE TABLE IF NOT EXISTS shipment_containers (
    id SERIAL PRIMARY KEY,
    shipment_id TEXT REFERENCES shipments(id) ON DELETE CASCADE,
    container_no TEXT,
    container_type TEXT,
    unloaded_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
