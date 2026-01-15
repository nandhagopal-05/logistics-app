
-- Migration to update vendors table structure
-- CockroachDB does not support DDL inside DO $$ blocks, so we use direct DDL statements.

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS currency VARCHAR(20);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS billing_street TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- Rename 'country' to 'billing_country'. 
-- Using IF EXISTS to avoid failure if already renamed.
ALTER TABLE vendors RENAME COLUMN IF EXISTS country TO billing_country;

-- Drop 'address' column comfortably
ALTER TABLE vendors DROP COLUMN IF EXISTS address;
