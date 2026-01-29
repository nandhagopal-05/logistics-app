ALTER TABLE shipment_containers ADD COLUMN IF NOT EXISTS packages JSONB DEFAULT '[]';
