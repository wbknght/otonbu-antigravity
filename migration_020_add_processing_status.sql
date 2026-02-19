-- Add 'processing' status to jobs table for PPF, coatings, etc.
-- First drop the existing check constraint if it exists (depends on your current DB)
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Add new check constraint with 'processing' status
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
    CHECK (status IN ('queue', 'washing', 'processing', 'drying', 'completed'));
