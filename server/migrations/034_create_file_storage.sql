CREATE TABLE IF NOT EXISTS file_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT,
    mime_type TEXT,
    data BYTEA,
    size INT,
    uploaded_at TIMESTAMP DEFAULT current_timestamp
);
