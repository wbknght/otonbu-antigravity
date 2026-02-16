-- Migration 011: Fix Payments Table
-- 1. Add branch_id to payments
-- 2. Update RLS policies for payments

-- 1. Add branch_id
ALTER TABLE payments ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;

-- 2. Backfill branch_id from jobs
UPDATE payments p
SET branch_id = j.branch_id
FROM jobs j
WHERE p.job_id = j.id
AND p.branch_id IS NULL;

-- 3. Set NOT NULL (assuming all payments have valid jobs with branches)
-- If there are orphaned payments, this might fail, but in this simplified schema it should be fine.
ALTER TABLE payments ALTER COLUMN branch_id SET NOT NULL;

-- 4. Create Index
CREATE INDEX IF NOT EXISTS idx_payments_branch ON payments(branch_id);

-- 5. Drop old policies
DROP POLICY IF EXISTS "Payments viewable by authenticated" ON payments;
DROP POLICY IF EXISTS "Payments insertable by workers" ON payments;

-- 6. Create new policies (consistent with other tables)
CREATE POLICY "pay_select" ON payments FOR SELECT
    USING (public.can_access_branch(branch_id));

CREATE POLICY "pay_insert" ON payments FOR INSERT
    WITH CHECK (public.can_access_branch(branch_id));

CREATE POLICY "pay_update" ON payments FOR UPDATE
    USING (public.is_super_admin() OR (public.can_access_branch(branch_id) AND public.user_role() IN ('branch_admin','manager')));

CREATE POLICY "pay_delete" ON payments FOR DELETE
    USING (public.is_super_admin());
