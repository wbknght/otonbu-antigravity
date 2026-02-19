-- Fix claim_job: ROW_COUNT is integer, so variable must be integer (was boolean -> "boolean > integer" error)
CREATE OR REPLACE FUNCTION public.claim_job(p_job_id uuid, p_user_id uuid)
RETURNS boolean AS $$
DECLARE v_updated integer;
BEGIN
    UPDATE jobs SET assigned_to = p_user_id, assigned_by = p_user_id, assigned_at = now()
    WHERE id = p_job_id AND assigned_to IS NULL AND status = 'queue';
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
