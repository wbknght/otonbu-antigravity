-- Migration 012: Add audit columns to branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Optional: Backfill existing rows if needed (e.g., with specific user or NULL)
-- UPDATE branches SET created_by = 'user_uuid' WHERE created_by IS NULL;
