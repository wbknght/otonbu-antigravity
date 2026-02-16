-- Migration 010: Fix stale triggers from original schema
-- Drop old triggers that reference outdated table schemas

-- 1. Drop the old job status change trigger
-- It uses old column names (previous_status, new_status, changed_by)
-- that no longer exist in the recreated job_status_history table.
-- The application code in jobs.ts already handles history inserts correctly.
DROP TRIGGER IF EXISTS on_job_status_change ON jobs;
DROP FUNCTION IF EXISTS record_job_status_change() CASCADE;

-- 2. Drop the old auth user signup trigger
-- It tries to insert into a 'profiles' table which is replaced by 'staff_profiles'.
-- User creation is now handled by admins via the Supabase Admin API.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
