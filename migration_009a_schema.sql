-- Migration 009a: Schema Changes (run FIRST)
-- branches table already created — this will skip via IF NOT EXISTS
-- ═══════════════════════════════════════════

-- 1. BRANCHES TABLE (already exists from test, but safe to re-run)
CREATE TABLE IF NOT EXISTS branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    address text,
    timezone text NOT NULL DEFAULT 'Europe/Istanbul',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

INSERT INTO branches (id, name, address) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Varsayılan Şube', 'Ana lokasyon')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- 2. STAFF_PROFILES
ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_role_check;
ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_branch_required;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;

UPDATE staff_profiles SET role = 'branch_admin' WHERE role = 'admin';
UPDATE staff_profiles SET role = 'staff' WHERE role = 'worker';

ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_role_check
    CHECK (role IN ('super_admin', 'branch_admin', 'manager', 'staff'));

UPDATE staff_profiles SET branch_id = '00000000-0000-0000-0000-000000000001'
    WHERE branch_id IS NULL AND role != 'super_admin';

ALTER TABLE staff_profiles ADD CONSTRAINT staff_branch_required
    CHECK (role = 'super_admin' OR branch_id IS NOT NULL);

-- 3. JOBS
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at timestamptz;
UPDATE jobs SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
ALTER TABLE jobs ALTER COLUMN branch_id SET NOT NULL;

-- 4. JOB STATUS HISTORY
CREATE TABLE IF NOT EXISTS job_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES jobs ON DELETE CASCADE,
    branch_id uuid NOT NULL REFERENCES branches,
    from_status text,
    to_status text NOT NULL,
    actor_user_id uuid REFERENCES auth.users,
    actor_email text,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE job_status_history ENABLE ROW LEVEL SECURITY;

-- 5. ADD branch_id TO ALL ADMIN TABLES
ALTER TABLE services          ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE vehicle_classes   ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE packages          ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE price_lists       ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE locations         ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE admin_audit_log   ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE cars              ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;
ALTER TABLE customers         ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches;

-- 6. BACKFILL ALL
UPDATE services          SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE vehicle_classes   SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE packages          SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE price_lists       SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE locations         SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE business_settings SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE admin_audit_log   SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE cars              SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE customers         SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;

-- 7. SET NOT NULL
ALTER TABLE services          ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE vehicle_classes   ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE packages          ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE price_lists       ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE locations         ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE cars              ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE customers         ALTER COLUMN branch_id SET NOT NULL;

-- 8. UNIQUE CONSTRAINTS
ALTER TABLE business_settings DROP CONSTRAINT IF EXISTS business_settings_key_key;
ALTER TABLE business_settings DROP CONSTRAINT IF EXISTS business_settings_key_branch_unique;
ALTER TABLE business_settings ADD CONSTRAINT business_settings_key_branch_unique UNIQUE(key, branch_id);

ALTER TABLE cars DROP CONSTRAINT IF EXISTS cars_plate_number_key;
ALTER TABLE cars DROP CONSTRAINT IF EXISTS cars_plate_branch_unique;
ALTER TABLE cars ADD CONSTRAINT cars_plate_branch_unique UNIQUE(plate_number, branch_id);

-- 9. INDEXES
CREATE INDEX IF NOT EXISTS idx_jsh_job ON job_status_history(job_id);
CREATE INDEX IF NOT EXISTS idx_jsh_branch ON job_status_history(branch_id);
CREATE INDEX IF NOT EXISTS idx_jsh_actor ON job_status_history(actor_user_id);
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
