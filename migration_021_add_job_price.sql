-- Add price column to jobs to store the branch-specific price at job creation time
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS price numeric(10, 2);