-- Migration 014: Unify Services
-- Links jobs and appointments to the 'services' table instead of the deprecated 'service_types'

-- 1. Modify JOBS table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id);
-- Make it nullable initially to allow migration, but intention is to replace service_type_id
-- We will NOT drop service_type_id yet to prevent data loss if there are existing records,
-- but the application will switch to using service_id.

-- 2. Modify APPOINTMENTS table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id);

-- 3. Update RLS Policies for JOBS to ensure service access?
-- RLS on JOBS is currently role based, so it should be fine.
-- However, we need to ensure users can read 'services' table.
-- Existing policy on 'services': "svc_select" USING (branch_id IS NULL OR public.can_access_branch(branch_id))
-- This should cover Staff accessing global or branch services.

-- 4. Deprecation Note:
-- 'service_types' table and 'service_type_id' columns are now deprecated.
-- Future cleanup migration will drop them.
