-- Migration 015: Add Partner Role
-- Adds 'partner' to the allowed roles and updates logic to treat them like restricted super admins

-- 1. Drop existing role check constraint
ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_role_check;

-- 2. Add new constraint including 'partner'
ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_role_check
    CHECK (role IN ('super_admin', 'partner', 'branch_admin', 'manager', 'staff'));

-- 3. Update is_super_admin function to include partner
-- This ensures Partners inherently pass "is_super_admin()" checks in RLS policies,
-- giving them access to all branches and global settings.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.staff_profiles
        WHERE user_id = auth.uid() AND role IN ('super_admin', 'partner') AND is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Update access policies (Just in case specific role checks were used)
-- Most policies use is_super_admin() so they are automatically covered.
-- We check for any explicit 'super_admin' string comparisons in RLS.
-- (None found in standard migration_009 policies that strictly used is_super_admin helper)

-- 5. Helper function for frontend/other logic to check for 'partner' specifically if needed
-- (Not strictly needed in DB if we treat them as super_admin generally)
