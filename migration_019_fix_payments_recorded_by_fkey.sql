-- Fix payments.recorded_by: it referenced "profiles" (legacy); staff live in staff_profiles.
-- Drop old FK and point recorded_by to staff_profiles(user_id) so payments can be recorded by current staff.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_recorded_by_fkey;

ALTER TABLE payments
  ADD CONSTRAINT payments_recorded_by_fkey
  FOREIGN KEY (recorded_by)
  REFERENCES staff_profiles(user_id);
