-- Migration 007: Cars & Customers tables + Jobs FK
-- Run this in Supabase SQL Editor

-- 1. CARS TABLE
CREATE TABLE cars (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  plate_number text NOT NULL UNIQUE,
  vehicle_class text CHECK (vehicle_class IN ('small','sedan','suv','van','pickup','luxury')) NOT NULL,
  make text,
  model text,
  color text,
  notes text,
  has_damage boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. CUSTOMERS TABLE
CREATE TABLE customers (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text,
  phone text UNIQUE,
  email text,
  sms_consent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. ADD FK COLUMNS TO JOBS (nullable for backward compat)
ALTER TABLE jobs ADD COLUMN car_id uuid REFERENCES cars;
ALTER TABLE jobs ADD COLUMN customer_id uuid REFERENCES customers;

-- 4. RLS POLICIES
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cars viewable by authenticated" ON cars
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Cars insertable by workers" ON cars
  FOR INSERT WITH CHECK (public.user_role() IN ('worker','manager'));
CREATE POLICY "Cars updatable by workers" ON cars
  FOR UPDATE USING (public.user_role() IN ('worker','manager'));

CREATE POLICY "Customers viewable by authenticated" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Customers insertable by workers" ON customers
  FOR INSERT WITH CHECK (public.user_role() IN ('worker','manager'));
CREATE POLICY "Customers updatable by workers" ON customers
  FOR UPDATE USING (public.user_role() IN ('worker','manager'));
