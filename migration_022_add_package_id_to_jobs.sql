-- Add package_id to jobs to track which package was sold
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES packages(id);