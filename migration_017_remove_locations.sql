-- Migration 017: Remove Locations
-- Drops the unused locations, working_hours, valet_windows, and blackout_dates tables as they were never fully implemented.

-- Drop child tables first
DROP TABLE IF EXISTS working_hours;
DROP TABLE IF EXISTS valet_windows;
DROP TABLE IF EXISTS blackout_dates;

-- Drop locations table
DROP TABLE IF EXISTS locations;
