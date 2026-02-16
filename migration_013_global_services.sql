-- Migration 013: Global Services
-- Makes services universal (branch_id nullable) and adds branch_services junction table
-- Run this in Supabase SQL Editor

-- 1. Modify SERVICES table to support global (null branch_id)
ALTER TABLE services ALTER COLUMN branch_id DROP NOT NULL;

-- 2. Create BRANCH_SERVICES junction table
CREATE TABLE IF NOT EXISTS branch_services (
    branch_id uuid REFERENCES branches NOT NULL,
    service_id uuid REFERENCES services NOT NULL,
    is_active boolean DEFAULT true,
    custom_price decimal(10, 2), -- Optional override
    custom_duration_min int,     -- Optional override
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES auth.users,
    PRIMARY KEY (branch_id, service_id)
);

-- 3. Enable RLS on new table
ALTER TABLE branch_services ENABLE ROW LEVEL SECURITY;

-- 4. Update RLS Policies for SERVICES
-- Drop old policies regarding branch restrictions for SELECT
DROP POLICY IF EXISTS "svc_select" ON services;
DROP POLICY IF EXISTS "svc_modify" ON services;

-- New SELECT policy: Visible if Global (branch_id is null) OR accessible branch
CREATE POLICY "svc_select" ON services FOR SELECT
    USING (branch_id IS NULL OR public.can_access_branch(branch_id));

-- New MODIFY policy: 
-- Super Admin can modify ALL (including Global).
-- Branch Admin/Manager can modify ONLY their own branch-specific services (if we still allow private services).
CREATE POLICY "svc_modify" ON services FOR ALL
    USING (
        public.is_super_admin() 
        OR (branch_id IS NOT NULL AND public.can_access_branch(branch_id) AND public.user_role() IN ('branch_admin','manager'))
    );

-- 5. RLS Policies for BRANCH_SERVICES
-- Select: Viewable by anyone who can access the branch
CREATE POLICY "bs_select" ON branch_services FOR SELECT
    USING (public.can_access_branch(branch_id));

-- Modify: Branch admins/managers can manage their own branch's service availability
CREATE POLICY "bs_modify" ON branch_services FOR ALL
    USING (
        public.is_super_admin()
        OR (public.can_access_branch(branch_id) AND public.user_role() IN ('branch_admin','manager'))
    );

-- 6. Backfill BRANCH_SERVICES for existing Branch-Specific Services
-- (Optional: If we want to treat existing services as "active" for their branches)
INSERT INTO branch_services (branch_id, service_id, is_active)
SELECT branch_id, id, is_active
FROM services
WHERE branch_id IS NOT NULL
ON CONFLICT DO NOTHING;
