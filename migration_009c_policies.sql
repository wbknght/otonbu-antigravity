-- Migration 009c: RLS Policies (run THIRD, after 009b succeeds)
-- ═══════════════════════════════════════════════════════════════

-- Drop ALL old policies
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

-- Drop new policies (for re-run safety)
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

-- ══════════════════════════════════════
-- CREATE NEW POLICIES
-- ══════════════════════════════════════

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

-- package_items
CREATE POLICY "pi_select" ON package_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM packages p WHERE p.id = package_items.package_id AND public.can_access_branch(p.branch_id)));
CREATE POLICY "pi_modify" ON package_items FOR ALL
    USING (EXISTS (SELECT 1 FROM packages p WHERE p.id = package_items.package_id AND public.can_access_branch(p.branch_id) AND (public.is_super_admin() OR public.user_role() IN ('branch_admin','manager'))));

-- price_lists
CREATE POLICY "pl_select" ON price_lists FOR SELECT
    USING (public.can_access_branch(branch_id));
CREATE POLICY "pl_modify" ON price_lists FOR ALL
    USING (public.is_super_admin() OR (public.can_access_branch(branch_id) AND public.user_role() IN ('branch_admin','manager')));

-- price_rules
CREATE POLICY "pr_select" ON price_rules FOR SELECT
    USING (EXISTS (SELECT 1 FROM price_lists pl WHERE pl.id = price_rules.price_list_id AND public.can_access_branch(pl.branch_id)));
CREATE POLICY "pr_modify" ON price_rules FOR ALL
    USING (EXISTS (SELECT 1 FROM price_lists pl WHERE pl.id = price_rules.price_list_id AND public.can_access_branch(pl.branch_id) AND (public.is_super_admin() OR public.user_role() IN ('branch_admin','manager'))));

-- locations
CREATE POLICY "loc_select" ON locations FOR SELECT
    USING (public.can_access_branch(branch_id));
CREATE POLICY "loc_modify" ON locations FOR ALL
    USING (public.is_super_admin() OR (public.can_access_branch(branch_id) AND public.user_role() IN ('branch_admin','manager')));

-- working_hours
CREATE POLICY "wh_select" ON working_hours FOR SELECT
    USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = working_hours.location_id AND public.can_access_branch(l.branch_id)));
CREATE POLICY "wh_modify" ON working_hours FOR ALL
    USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = working_hours.location_id AND public.can_access_branch(l.branch_id) AND (public.is_super_admin() OR public.user_role() IN ('branch_admin','manager'))));

-- valet_windows
CREATE POLICY "vw_select" ON valet_windows FOR SELECT
    USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = valet_windows.location_id AND public.can_access_branch(l.branch_id)));
CREATE POLICY "vw_modify" ON valet_windows FOR ALL
    USING (EXISTS (SELECT 1 FROM locations l WHERE l.id = valet_windows.location_id AND public.can_access_branch(l.branch_id) AND (public.is_super_admin() OR public.user_role() IN ('branch_admin','manager'))));

-- blackout_dates
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
