
-- Migration to update vendors table structure
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS currency VARCHAR(20);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS billing_street TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- Rename country to billing_country if it exists as 'country'
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='vendors' AND column_name='country') THEN
    ALTER TABLE vendors RENAME COLUMN country TO billing_country;
  END IF;
END $$;

-- Drop address if it exists (we use billing_street/billing_address now)
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='vendors' AND column_name='address') THEN
    ALTER TABLE vendors DROP COLUMN address;
  END IF;
END $$;
