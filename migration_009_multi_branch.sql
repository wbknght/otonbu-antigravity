-- Migration 009: Multi-Branch Operations
-- FULLY IDEMPOTENT — safe to re-run any number of times
-- ══════════════════════════════════════════════════════════════════

-- ============================================================
-- 1. BRANCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    address text,
    timezone text NOT NULL DEFAULT 'Europe/Istanbul',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users,
    updated_by uuid REFERENCES auth.users
);

INSERT INTO branches (id, name, address) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Varsayılan Şube', 'Ana lokasyon')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. STAFF_PROFILES: add branch_id, expand role enum
-- ============================================================

-- Drop ALL role constraints (old + new) so we can safely re-add
ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_role_check;
ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_branch_required;

-- Add branch_id column
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;

-- Migrate existing roles FIRST (before new constraint)
UPDATE staff_profiles SET role = 'branch_admin' WHERE role = 'admin';
UPDATE staff_profiles SET role = 'staff' WHERE role = 'worker';

-- Now add the new constraint
ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_role_check
    CHECK (role IN ('super_admin', 'branch_admin', 'manager', 'staff'));

-- Link existing staff to default branch
UPDATE staff_profiles SET branch_id = '00000000-0000-0000-0000-000000000001'
    WHERE branch_id IS NULL AND role != 'super_admin';

-- branch_id required unless super_admin
ALTER TABLE staff_profiles ADD CONSTRAINT staff_branch_required
    CHECK (role = 'super_admin' OR branch_id IS NOT NULL);

-- ============================================================
-- 3. JOBS: add branch_id + assignment columns
-- ============================================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE jobs SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
ALTER TABLE jobs ALTER COLUMN branch_id SET NOT NULL;

-- ============================================================
-- 4. JOB STATUS HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS job_status_history (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES jobs ON DELETE CASCADE,
    branch_id uuid NOT NULL REFERENCES branches,
    from_status text,
    to_status text NOT NULL,
    actor_user_id uuid REFERENCES auth.users,
    actor_email text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jsh_job ON job_status_history(job_id);
CREATE INDEX IF NOT EXISTS idx_jsh_branch ON job_status_history(branch_id);
CREATE INDEX IF NOT EXISTS idx_jsh_actor ON job_status_history(actor_user_id);
ALTER TABLE job_status_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. BRANCH-SCOPE ALL ADMIN TABLES
-- ============================================================

ALTER TABLE services        ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE vehicle_classes ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE packages        ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE price_lists     ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE locations       ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE cars            ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE customers       ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;

-- Backfill default branch
UPDATE services        SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE vehicle_classes SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE packages        SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE price_lists     SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE locations       SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE business_settings SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE admin_audit_log SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE cars            SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE customers       SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;

-- Make NOT NULL where needed
ALTER TABLE services        ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE vehicle_classes ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE packages        ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE price_lists     ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE locations       ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE cars            ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE customers       ALTER COLUMN branch_id SET NOT NULL;

-- Unique constraints (drop old first, then add)
ALTER TABLE business_settings DROP CONSTRAINT IF EXISTS business_settings_key_key;
ALTER TABLE business_settings DROP CONSTRAINT IF EXISTS business_settings_key_branch_unique;
ALTER TABLE business_settings ADD CONSTRAINT business_settings_key_branch_unique UNIQUE(key, branch_id);

ALTER TABLE cars DROP CONSTRAINT IF EXISTS cars_plate_number_key;
ALTER TABLE cars DROP CONSTRAINT IF EXISTS cars_plate_branch_unique;
ALTER TABLE cars ADD CONSTRAINT cars_plate_branch_unique UNIQUE(plate_number, branch_id);

-- ============================================================
-- 6. HELPER FUNCTIONS
-- ============================================================
DROP FUNCTION IF EXISTS public.staff_role();

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
DECLARE v_updated integer;
BEGIN
    UPDATE jobs SET assigned_to = p_user_id, assigned_by = p_user_id, assigned_at = now()
    WHERE id = p_job_id AND assigned_to IS NULL AND status = 'queue';
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. DROP ALL OLD + NEW RLS POLICIES (clean slate)
-- ============================================================

-- Old policies (migration_008)
DROP POLICY IF EXISTS "sp_select_admin" ON staff_profiles;
DROP POLICY IF EXISTS "sp_select_self" ON staff_profiles;
DROP POLICY IF EXISTS "svc_insert" ON services;
DROP POLICY IF EXISTS "svc_update" ON services;
DROP POLICY IF EXISTS "svc_delete" ON services;
DROP POLICY IF EXISTS "vc_insert" ON vehicle_classes;
DROP POLICY IF EXISTS "vc_update" ON vehicle_classes;
DROP POLICY IF EXISTS "vc_delete" ON vehicle_classes;
DROP POLICY IF EXISTS "pkg_insert" ON packages;
DROP POLICY IF EXISTS "pkg_update" ON packages;
DROP POLICY IF EXISTS "pkg_delete" ON packages;
DROP POLICY IF EXISTS "pi_insert" ON package_items;
DROP POLICY IF EXISTS "pi_update" ON package_items;
DROP POLICY IF EXISTS "pi_delete" ON package_items;
DROP POLICY IF EXISTS "pl_insert" ON price_lists;
DROP POLICY IF EXISTS "pl_update" ON price_lists;
DROP POLICY IF EXISTS "pl_delete" ON price_lists;
DROP POLICY IF EXISTS "pr_insert" ON price_rules;
DROP POLICY IF EXISTS "pr_update" ON price_rules;
DROP POLICY IF EXISTS "pr_delete" ON price_rules;
DROP POLICY IF EXISTS "loc_insert" ON locations;
DROP POLICY IF EXISTS "loc_update" ON locations;
DROP POLICY IF EXISTS "loc_delete" ON locations;
DROP POLICY IF EXISTS "Cars viewable by authenticated" ON cars;
DROP POLICY IF EXISTS "Cars insertable by workers" ON cars;
DROP POLICY IF EXISTS "Cars updatable by workers" ON cars;
DROP POLICY IF EXISTS "Customers viewable by authenticated" ON customers;
DROP POLICY IF EXISTS "Customers insertable by workers" ON customers;
DROP POLICY IF EXISTS "Customers updatable by workers" ON customers;

-- New + potentially existing policies (drop all before recreating)
DROP POLICY IF EXISTS "br_select" ON branches;
DROP POLICY IF EXISTS "br_insert" ON branches;
DROP POLICY IF EXISTS "br_update" ON branches;
DROP POLICY IF EXISTS "br_delete" ON branches;
DROP POLICY IF EXISTS "sp_select" ON staff_profiles;
DROP POLICY IF EXISTS "sp_insert" ON staff_profiles;
DROP POLICY IF EXISTS "sp_update" ON staff_profiles;
DROP POLICY IF EXISTS "sp_delete" ON staff_profiles;
DROP POLICY IF EXISTS "jobs_select" ON jobs;
DROP POLICY IF EXISTS "jobs_insert" ON jobs;
DROP POLICY IF EXISTS "jobs_update" ON jobs;
DROP POLICY IF EXISTS "jobs_delete" ON jobs;
DROP POLICY IF EXISTS "jsh_select" ON job_status_history;
DROP POLICY IF EXISTS "jsh_insert" ON job_status_history;
DROP POLICY IF EXISTS "cars_select" ON cars;
DROP POLICY IF EXISTS "cars_insert" ON cars;
DROP POLICY IF EXISTS "cars_update" ON cars;
DROP POLICY IF EXISTS "cust_select" ON customers;
DROP POLICY IF EXISTS "cust_insert" ON customers;
DROP POLICY IF EXISTS "cust_update" ON customers;
DROP POLICY IF EXISTS "svc_select" ON services;
DROP POLICY IF EXISTS "svc_modify" ON services;
DROP POLICY IF EXISTS "vc_select" ON vehicle_classes;
DROP POLICY IF EXISTS "vc_modify" ON vehicle_classes;
DROP POLICY IF EXISTS "pkg_select" ON packages;
DROP POLICY IF EXISTS "pkg_modify" ON packages;
DROP POLICY IF EXISTS "pi_select" ON package_items;
DROP POLICY IF EXISTS "pi_modify" ON package_items;
DROP POLICY IF EXISTS "pl_select" ON price_lists;
DROP POLICY IF EXISTS "pl_modify" ON price_lists;
DROP POLICY IF EXISTS "pr_select" ON price_rules;
DROP POLICY IF EXISTS "pr_modify" ON price_rules;
DROP POLICY IF EXISTS "loc_select" ON locations;
DROP POLICY IF EXISTS "loc_modify" ON locations;
DROP POLICY IF EXISTS "wh_select" ON working_hours;
DROP POLICY IF EXISTS "wh_modify" ON working_hours;
DROP POLICY IF EXISTS "vw_select" ON valet_windows;
DROP POLICY IF EXISTS "vw_modify" ON valet_windows;
DROP POLICY IF EXISTS "bd_select" ON blackout_dates;
DROP POLICY IF EXISTS "bd_modify" ON blackout_dates;
DROP POLICY IF EXISTS "bs_select" ON business_settings;
DROP POLICY IF EXISTS "bs_modify" ON business_settings;
DROP POLICY IF EXISTS "aal_select" ON admin_audit_log;
DROP POLICY IF EXISTS "aal_insert" ON admin_audit_log;

-- ============================================================
-- 8. CREATE NEW RLS POLICIES
-- ============================================================

-- branches
CREATE POLICY "br_select" ON branches FOR SELECT
    USING (public.is_super_admin() OR id = public.user_branch_id());
CREATE POLICY "br_insert" ON branches FOR INSERT
    WITH CHECK (public.is_super_admin());
CREATE POLICY "br_update" ON branches FOR UPDATE
    USING (public.is_super_admin());
CREATE POLICY "br_delete" ON branches FOR DELETE
    USING (public.is_super_admin());

-- staff_profiles
CREATE POLICY "sp_select" ON staff_profiles FOR SELECT
    USING (public.is_super_admin() OR branch_id = public.user_branch_id() OR user_id = auth.uid());
CREATE POLICY "sp_insert" ON staff_profiles FOR INSERT
    WITH CHECK (public.is_super_admin() OR (public.user_role() = 'branch_admin' AND branch_id = public.user_branch_id()));
CREATE POLICY "sp_update" ON staff_profiles FOR UPDATE
    USING (public.is_super_admin() OR (public.user_role() = 'branch_admin' AND branch_id = public.user_branch_id()));
CREATE POLICY "sp_delete" ON staff_profiles FOR DELETE
    USING (public.is_super_admin());

-- jobs
CREATE POLICY "jobs_select" ON jobs FOR SELECT
    USING (public.can_access_branch(branch_id));
CREATE POLICY "jobs_insert" ON jobs FOR INSERT
    WITH CHECK (public.can_access_branch(branch_id));
CREATE POLICY "jobs_update" ON jobs FOR UPDATE
    USING (public.is_super_admin() OR (public.can_access_branch(branch_id) AND (public.user_role() IN ('branch_admin','manager') OR assigned_to = auth.uid())));
CREATE POLICY "jobs_delete" ON jobs FOR DELETE
    USING (public.is_super_admin() OR (public.can_access_branch(branch_id) AND public.user_role() IN ('branch_admin','manager')));

-- job_status_history
CREATE POLICY "jsh_select" ON job_status_history FOR SELECT
    USING (public.can_access_branch(branch_id));
CREATE POLICY "jsh_insert" ON job_status_history FOR INSERT
    WITH CHECK (public.can_access_branch(branch_id));

-- cars
CREATE POLICY "cars_select" ON cars FOR SELECT
    USING (public.can_access_branch(branch_id));
CREATE POLICY "cars_insert" ON cars FOR INSERT
    WITH CHECK (public.can_access_branch(branch_id));
CREATE POLICY "cars_update" ON cars FOR UPDATE
    USING (public.can_access_branch(branch_id));

-- customers
CREATE POLICY "cust_select" ON customers FOR SELECT
    USING (public.can_access_branch(branch_id));
CREATE POLICY "cust_insert" ON customers FOR INSERT
    WITH CHECK (public.can_access_branch(branch_id));
CREATE POLICY "cust_update" ON customers FOR UPDATE
    USING (public.can_access_branch(branch_id));

-- services
CREATE POLICY "svc_select" ON services FOR SELECT
    USING (public.can_access_branch(branch_id));
CREATE POLICY "svc_modify" ON services FOR ALL
    USING (public.is_super_admin() OR (public.can_access_branch(branch_id) AND public.user_role() IN ('branch_admin','manager')));

-- vehicle_classes
CREATE POLICY "vc_select" ON vehicle_classes FOR SELECT
    USING (public.can_access_branch(branch_id));
CREATE POLICY "vc_modify" ON vehicle_classes FOR ALL
    USING (public.is_super_admin() OR (public.can_access_branch(branch_id) AND public.user_role() IN ('branch_admin','manager')));

-- packages
CREATE POLICY "pkg_select" ON packages FOR SELECT
    USING (public.can_access_branch(branch_id));
CREATE POLICY "pkg_modify" ON packages FOR ALL
    USING (public.is_super_admin() OR (public.can_access_branch(branch_id) AND public.user_role() IN ('branch_admin','manager')));

-- package_items (inherits branch from package)
CREATE POLICY "pi_select" ON package_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM packages p WHERE p.id = package_items.package_id AND public.can_access_branch(p.branch_id)));
CREATE POLICY "pi_modify" ON package_items FOR ALL
    USING (EXISTS (SELECT 1 FROM packages p WHERE p.id = package_items.package_id AND public.can_access_branch(p.branch_id) AND (public.is_super_admin() OR public.user_role() IN ('branch_admin','manager'))));

-- price_lists
CREATE POLICY "pl_select" ON price_lists FOR SELECT
    USING (public.can_access_branch(branch_id));
CREATE POLICY "pl_modify" ON price_lists FOR ALL
    USING (public.is_super_admin() OR (public.can_access_branch(branch_id) AND public.user_role() IN ('branch_admin','manager')));

-- price_rules (inherits branch from price_list)
CREATE POLICY "pr_select" ON price_rules FOR SELECT
    USING (EXISTS (SELECT 1 FROM price_lists pl WHERE pl.id = price_rules.price_list_id AND public.can_access_branch(pl.branch_id)));
CREATE POLICY "pr_modify" ON price_rules FOR ALL
    USING (EXISTS (SELECT 1 FROM price_lists pl WHERE pl.id = price_rules.price_list_id AND public.can_access_branch(pl.branch_id) AND (public.is_super_admin() OR public.user_role() IN ('branch_admin','manager'))));

-- locations
CREATE POLICY "loc_select" ON locations FOR SELECT
    USING (public.can_access_branch(branch_id));
CREATE POLICY "loc_modify" ON locations FOR ALL
    USING (public.is_super_admin() OR (public.can_access_branch(branch_id) AND public.user_role() IN ('branch_admin','manager')));

-- working_hours (inherits branch from location)
CREATE POLICY "wh_select" ON working_hours FOR SELECT
    USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = working_hours.location_id AND public.can_access_branch(l.branch_id)));
CREATE POLICY "wh_modify" ON working_hours FOR ALL
    USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = working_hours.location_id AND public.can_access_branch(l.branch_id) AND (public.is_super_admin() OR public.user_role() IN ('branch_admin','manager'))));

-- valet_windows (inherits branch from location)
CREATE POLICY "vw_select" ON valet_windows FOR SELECT
    USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = valet_windows.location_id AND public.can_access_branch(l.branch_id)));
CREATE POLICY "vw_modify" ON valet_windows FOR ALL
    USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = valet_windows.location_id AND public.can_access_branch(l.branch_id) AND (public.is_super_admin() OR public.user_role() IN ('branch_admin','manager'))));

-- blackout_dates (inherits branch from location)
CREATE POLICY "bd_select" ON blackout_dates FOR SELECT
    USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = blackout_dates.location_id AND public.can_access_branch(l.branch_id)));
CREATE POLICY "bd_modify" ON blackout_dates FOR ALL
    USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = blackout_dates.location_id AND public.can_access_branch(l.branch_id) AND (public.is_super_admin() OR public.user_role() IN ('branch_admin','manager'))));

-- business_settings
CREATE POLICY "bs_select" ON business_settings FOR SELECT
    USING (branch_id IS NULL OR public.can_access_branch(branch_id));
CREATE POLICY "bs_modify" ON business_settings FOR ALL
    USING (public.is_super_admin() OR (branch_id IS NOT NULL AND public.can_access_branch(branch_id) AND public.user_role() IN ('branch_admin','manager')));

-- admin_audit_log
CREATE POLICY "aal_select" ON admin_audit_log FOR SELECT
    USING (public.is_super_admin() OR (branch_id IS NOT NULL AND public.can_access_branch(branch_id) AND public.user_role() IN ('branch_admin','manager')));
CREATE POLICY "aal_insert" ON admin_audit_log FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 9. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_jobs_branch ON jobs(branch_id);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned ON jobs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_branch ON staff_profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_services_branch ON services(branch_id);
CREATE INDEX IF NOT EXISTS idx_vc_branch ON vehicle_classes(branch_id);
CREATE INDEX IF NOT EXISTS idx_packages_branch ON packages(branch_id);
CREATE INDEX IF NOT EXISTS idx_pricelists_branch ON price_lists(branch_id);
CREATE INDEX IF NOT EXISTS idx_locations_branch ON locations(branch_id);
CREATE INDEX IF NOT EXISTS idx_cars_branch ON cars(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_branch ON admin_audit_log(branch_id);
