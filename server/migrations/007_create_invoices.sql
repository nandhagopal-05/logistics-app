CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY, -- INV-YYYY...
    shipment_id VARCHAR(50) REFERENCES shipments(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Paid, Overdue
    issued_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    file_path TEXT, -- Path to generated PDF
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_shipment_id ON invoices(shipment_id);
