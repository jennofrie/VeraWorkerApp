-- ============================================================================
-- MIGRATION: Update worker_schedules table for Shift Details UI/UX Overhaul
-- ============================================================================
-- This script adds required columns and updates status enum values
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Add actual_start_time column (if not exists)
ALTER TABLE worker_schedules 
ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ;

-- Step 2: Add actual_end_time column (if not exists)
ALTER TABLE worker_schedules 
ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ;

-- Step 3: Verify columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'worker_schedules'
  AND column_name IN ('actual_start_time', 'actual_end_time')
ORDER BY column_name;

-- Step 4: Migrate existing status values to new enum
-- IMPORTANT: This assumes you want to map:
--   'scheduled' → 'BOOKED'
--   'confirmed' → 'BOOKED'  
--   'cancelled' → 'COMPLETED' (or you may want to handle this differently)

-- First, check current status values
SELECT DISTINCT status, COUNT(*) as count
FROM worker_schedules
GROUP BY status
ORDER BY status;

-- Update status values (uncomment when ready to migrate)
-- NOTE: Adjust the mapping based on your business logic
/*
UPDATE worker_schedules
SET status = CASE 
  WHEN status = 'scheduled' THEN 'BOOKED'
  WHEN status = 'confirmed' THEN 'BOOKED'
  WHEN status = 'cancelled' THEN 'COMPLETED'
  ELSE status  -- Keep any other values as-is
END
WHERE status IN ('scheduled', 'confirmed', 'cancelled');
*/

-- Step 5: Add constraint to ensure status is one of the valid values
-- (Optional - only if you want database-level validation)
-- ALTER TABLE worker_schedules
-- ADD CONSTRAINT worker_schedules_status_check 
-- CHECK (status IN ('BOOKED', 'STARTED', 'COMPLETED'));

-- Step 6: Verify migration
SELECT 
  COUNT(*) as total_schedules,
  COUNT(actual_start_time) as schedules_with_start_time,
  COUNT(actual_end_time) as schedules_with_end_time,
  status,
  COUNT(*) as count_by_status
FROM worker_schedules
GROUP BY status
ORDER BY status;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- If you need to rollback, run these:
/*
ALTER TABLE worker_schedules 
DROP COLUMN IF EXISTS actual_start_time;

ALTER TABLE worker_schedules 
DROP COLUMN IF EXISTS actual_end_time;

-- Revert status values (adjust based on your original values)
UPDATE worker_schedules
SET status = CASE 
  WHEN status = 'BOOKED' THEN 'scheduled'
  WHEN status = 'STARTED' THEN 'scheduled'
  WHEN status = 'COMPLETED' THEN 'cancelled'
  ELSE status
END
WHERE status IN ('BOOKED', 'STARTED', 'COMPLETED');
*/

