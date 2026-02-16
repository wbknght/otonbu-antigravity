-- Migration 009b: Functions (run SECOND, after 009a succeeds)
-- ═══════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.staff_role() CASCADE;
DROP FUNCTION IF EXISTS public.user_role() CASCADE;
DROP FUNCTION IF EXISTS public.user_branch_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.can_access_branch(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.claim_job(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text AS $$
    SELECT role FROM public.staff_profiles
    WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_branch_id()
RETURNS uuid AS $$
    SELECT branch_id FROM public.staff_profiles
    WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.staff_profiles
        WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_access_branch(target_branch uuid)
RETURNS boolean AS $$
    SELECT public.is_super_admin() OR public.user_branch_id() = target_branch;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.claim_job(p_job_id uuid, p_user_id uuid)
RETURNS boolean AS $$
DECLARE v_updated boolean;
BEGIN
    UPDATE jobs SET assigned_to = p_user_id, assigned_by = p_user_id, assigned_at = now()
    WHERE id = p_job_id AND assigned_to IS NULL AND status = 'queue';
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
