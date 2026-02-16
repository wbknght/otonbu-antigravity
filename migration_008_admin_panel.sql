-- Migration 008: Admin Panel Schema
-- Run this in Supabase SQL Editor AFTER migration_007

-- ============================================================
-- 1. BUSINESS SETTINGS (KV Store)
-- ============================================================
CREATE TABLE business_settings (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    key text NOT NULL UNIQUE,
    value text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES auth.users
);

INSERT INTO business_settings (key, value, description) VALUES
    ('default_currency', 'TRY', 'Varsayılan para birimi ISO kodu'),
    ('default_locale', 'tr-TR', 'Varsayılan dil/bölge'),
    ('timezone', 'Europe/Istanbul', 'İş yeri saat dilimi');

-- ============================================================
-- 2. STAFF PROFILES (replaces simple profiles for role mgmt)
-- ============================================================
CREATE TABLE staff_profiles (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users UNIQUE,
    email text NOT NULL UNIQUE,
    full_name text NOT NULL,
    phone text,
    role text NOT NULL CHECK (role IN ('worker', 'manager', 'admin')) DEFAULT 'worker',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users,
    updated_by uuid REFERENCES auth.users
);

-- ============================================================
-- 3. SERVICES (catalog of individual wash services)
-- ============================================================
CREATE TABLE services (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    description text,
    duration_min int,
    is_active boolean DEFAULT true,
    sort_order int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users,
    updated_by uuid REFERENCES auth.users
);

-- ============================================================
-- 4. VEHICLE CLASSES
-- ============================================================
CREATE TABLE vehicle_classes (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    key text NOT NULL UNIQUE,
    label text NOT NULL,
    sort_order int DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users,
    updated_by uuid REFERENCES auth.users
);

-- Seed vehicle classes
INSERT INTO vehicle_classes (key, label, sort_order) VALUES
    ('small', 'Küçük', 1),
    ('sedan', 'Sedan', 2),
    ('suv', 'SUV', 3),
    ('van', 'Van', 4),
    ('pickup', 'Pikap', 5),
    ('luxury', 'Lüks', 6);

-- ============================================================
-- 5. PACKAGES (grouping of services)
-- ============================================================
CREATE TABLE packages (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    sort_order int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users,
    updated_by uuid REFERENCES auth.users
);

-- ============================================================
-- 6. PACKAGE ITEMS (M:N packages <-> services)
-- ============================================================
CREATE TABLE package_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    package_id uuid NOT NULL REFERENCES packages ON DELETE CASCADE,
    service_id uuid NOT NULL REFERENCES services ON DELETE CASCADE,
    is_base boolean DEFAULT false,
    sort_order int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    UNIQUE(package_id, service_id)
);

-- ============================================================
-- 7. PRICE LISTS (time-bounded)
-- ============================================================
CREATE TABLE price_lists (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    valid_from date,
    valid_to date,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users,
    updated_by uuid REFERENCES auth.users
);

-- ============================================================
-- 8. PRICE RULES (per package × vehicle_class)
-- ============================================================
CREATE TABLE price_rules (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    price_list_id uuid NOT NULL REFERENCES price_lists ON DELETE CASCADE,
    package_id uuid NOT NULL REFERENCES packages ON DELETE CASCADE,
    vehicle_class_id uuid NOT NULL REFERENCES vehicle_classes ON DELETE CASCADE,
    amount_krs bigint NOT NULL,
    currency text NOT NULL DEFAULT 'TRY',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users,
    updated_by uuid REFERENCES auth.users,
    UNIQUE(price_list_id, package_id, vehicle_class_id)
);

-- ============================================================
-- 9. LOCATIONS
-- ============================================================
CREATE TABLE locations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    address text,
    phone text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users,
    updated_by uuid REFERENCES auth.users
);

-- ============================================================
-- 10. WORKING HOURS (per location per day)
-- ============================================================
CREATE TABLE working_hours (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    location_id uuid NOT NULL REFERENCES locations ON DELETE CASCADE,
    day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time time NOT NULL,
    close_time time NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(location_id, day_of_week)
);

-- ============================================================
-- 11. VALET WINDOWS (per location per day)
-- ============================================================
CREATE TABLE valet_windows (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    location_id uuid NOT NULL REFERENCES locations ON DELETE CASCADE,
    day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time time NOT NULL,
    end_time time NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(location_id, day_of_week)
);

-- ============================================================
-- 12. BLACKOUT DATES
-- ============================================================
CREATE TABLE blackout_dates (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    location_id uuid REFERENCES locations ON DELETE CASCADE,
    blackout_date date NOT NULL,
    reason text,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users
);

-- ============================================================
-- 13. ADMIN AUDIT LOG (append-only)
-- ============================================================
CREATE TABLE admin_audit_log (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users,
    user_email text,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 14. HELPER: get staff role from auth.uid()
-- ============================================================
CREATE OR REPLACE FUNCTION public.staff_role()
RETURNS text AS $$
    SELECT role FROM public.staff_profiles
    WHERE user_id = auth.uid() AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 15. RLS POLICIES
-- ============================================================

-- Enable RLS on all admin tables
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE valet_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE blackout_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ── business_settings ──
CREATE POLICY "bs_select" ON business_settings FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "bs_modify" ON business_settings FOR UPDATE
    USING (public.staff_role() IN ('admin', 'manager'));

-- ── staff_profiles ──
-- Admin/manager can see all, workers can see only their own
CREATE POLICY "sp_select_admin" ON staff_profiles FOR SELECT
    USING (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "sp_select_self" ON staff_profiles FOR SELECT
    USING (user_id = auth.uid());
CREATE POLICY "sp_insert" ON staff_profiles FOR INSERT
    WITH CHECK (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "sp_update" ON staff_profiles FOR UPDATE
    USING (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "sp_delete" ON staff_profiles FOR DELETE
    USING (public.staff_role() = 'admin');

-- ── services ──
-- Everyone can read (workers need it for job creation), only admin/manager can write
CREATE POLICY "svc_select" ON services FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "svc_insert" ON services FOR INSERT
    WITH CHECK (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "svc_update" ON services FOR UPDATE
    USING (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "svc_delete" ON services FOR DELETE
    USING (public.staff_role() = 'admin');

-- ── vehicle_classes ──
CREATE POLICY "vc_select" ON vehicle_classes FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "vc_insert" ON vehicle_classes FOR INSERT
    WITH CHECK (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "vc_update" ON vehicle_classes FOR UPDATE
    USING (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "vc_delete" ON vehicle_classes FOR DELETE
    USING (public.staff_role() = 'admin');

-- ── packages ──
CREATE POLICY "pkg_select" ON packages FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "pkg_insert" ON packages FOR INSERT
    WITH CHECK (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "pkg_update" ON packages FOR UPDATE
    USING (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "pkg_delete" ON packages FOR DELETE
    USING (public.staff_role() = 'admin');

-- ── package_items ──
CREATE POLICY "pi_select" ON package_items FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "pi_insert" ON package_items FOR INSERT
    WITH CHECK (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "pi_update" ON package_items FOR UPDATE
    USING (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "pi_delete" ON package_items FOR DELETE
    USING (public.staff_role() IN ('admin', 'manager'));

-- ── price_lists ──
CREATE POLICY "pl_select" ON price_lists FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "pl_insert" ON price_lists FOR INSERT
    WITH CHECK (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "pl_update" ON price_lists FOR UPDATE
    USING (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "pl_delete" ON price_lists FOR DELETE
    USING (public.staff_role() = 'admin');

-- ── price_rules ──
CREATE POLICY "pr_select" ON price_rules FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "pr_insert" ON price_rules FOR INSERT
    WITH CHECK (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "pr_update" ON price_rules FOR UPDATE
    USING (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "pr_delete" ON price_rules FOR DELETE
    USING (public.staff_role() IN ('admin', 'manager'));

-- ── locations ──
CREATE POLICY "loc_select" ON locations FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "loc_insert" ON locations FOR INSERT
    WITH CHECK (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "loc_update" ON locations FOR UPDATE
    USING (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "loc_delete" ON locations FOR DELETE
    USING (public.staff_role() = 'admin');

-- ── working_hours ──
CREATE POLICY "wh_select" ON working_hours FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "wh_modify" ON working_hours FOR ALL
    USING (public.staff_role() IN ('admin', 'manager'));

-- ── valet_windows ──
CREATE POLICY "vw_select" ON valet_windows FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "vw_modify" ON valet_windows FOR ALL
    USING (public.staff_role() IN ('admin', 'manager'));

-- ── blackout_dates ──
CREATE POLICY "bd_select" ON blackout_dates FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "bd_modify" ON blackout_dates FOR ALL
    USING (public.staff_role() IN ('admin', 'manager'));

-- ── admin_audit_log ──
CREATE POLICY "aal_select" ON admin_audit_log FOR SELECT
    USING (public.staff_role() IN ('admin', 'manager'));
CREATE POLICY "aal_insert" ON admin_audit_log FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
-- No update/delete on audit log (append-only)
