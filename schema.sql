-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Extends Supabase Auth)
create table profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  role text check (role in ('worker', 'manager')) default 'worker',
  created_at timestamptz default now()
);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'worker');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. SERVICE TYPES
create table service_types (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  price decimal(10, 2) not null,
  duration_min int not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Seed Service Types
insert into service_types (name, price, duration_min) values
('Basic Wash', 15.00, 20),
('Interior + Exterior', 30.00, 45),
('Full Valet', 60.00, 90);

-- 3. JOBS
create table jobs (
  id uuid default uuid_generate_v4() primary key,
  plate_number text not null,
  service_type_id uuid references service_types not null,
  status text check (status in ('queue', 'washing', 'drying', 'completed')) default 'queue',
  payment_status text check (payment_status in ('pending', 'paid')) default 'pending',
  owner_id uuid references profiles,
  created_at timestamptz default now(),
  closed_at timestamptz
);

-- Constraint: Unique active job per plate (where closed_at is null)
create unique index unique_active_plate on jobs(plate_number) where closed_at is null;

-- 4. JOB STATUS HISTORY (Audit)
create table job_status_history (
  id bigint generated always as identity primary key,
  job_id uuid references jobs not null,
  previous_status text,
  new_status text,
  changed_by uuid references profiles,
  created_at timestamptz default now()
);

-- Trigger for Job Status History
create or replace function record_job_status_change()
returns trigger as $$
begin
  if (old.status is distinct from new.status) then
    insert into job_status_history (job_id, previous_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_job_status_change
  after update on jobs
  for each row execute procedure record_job_status_change();

-- 5. PAYMENTS
create table payments (
  id uuid default uuid_generate_v4() primary key,
  job_id uuid references jobs not null,
  amount decimal(10, 2) not null,
  method text check (method in ('cash', 'card', 'transfer')),
  completed_at timestamptz default now(),
  recorded_by uuid references profiles
);

-- 6. APPOINTMENTS
create table appointments (
  id uuid default uuid_generate_v4() primary key,
  customer_name text not null,
  customer_phone text,
  plate_number text,
  scheduled_time timestamptz not null,
  service_type_id uuid references service_types,
  is_valet boolean default false,
  valet_address text,
  status text check (status in ('booked', 'cancelled', 'completed')) default 'booked',
  converted_job_id uuid references jobs,
  created_at timestamptz default now()
);

-- RLS POLICIES (Simplified for v1)
alter table profiles enable row level security;
alter table service_types enable row level security;
alter table jobs enable row level security;
alter table job_status_history enable row level security;
alter table payments enable row level security;
alter table appointments enable row level security;

-- Helper function for role
create or replace function public.user_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable;

-- Policies
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Service types are viewable by everyone" on service_types for select using (true);
create policy "Service types manageable by managers" on service_types for all using (public.user_role() = 'manager');

create policy "Jobs viewable by authenticated users" on jobs for select using (auth.role() = 'authenticated');
create policy "Jobs insertable by workers and managers" on jobs for insert with check (public.user_role() in ('worker', 'manager'));
create policy "Jobs updatable by workers and managers" on jobs for update using (public.user_role() in ('worker', 'manager'));
create policy "Jobs deletable by managers only" on jobs for delete using (public.user_role() = 'manager');

create policy "History viewable by authenticated" on job_status_history for select using (auth.role() = 'authenticated');

create policy "Payments viewable by authenticated" on payments for select using (auth.role() = 'authenticated');
create policy "Payments insertable by workers" on payments for insert with check (public.user_role() in ('worker', 'manager'));

create policy "Appointments viewable by authenticated" on appointments for select using (auth.role() = 'authenticated');
create policy "Appointments manageable by workers" on appointments for all using (public.user_role() in ('worker', 'manager'));
