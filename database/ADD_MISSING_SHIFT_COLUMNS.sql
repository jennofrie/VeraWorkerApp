-- Add Missing Columns to Shifts Table
-- Run this in Supabase SQL Editor to add location and duration columns
-- Safe to run multiple times (uses IF NOT EXISTS)

-- Step 1: Add clock_in location columns (if they don't exist)
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS clock_in_lat DECIMAL;

ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS clock_in_lng DECIMAL;

-- Step 2: Add clock_out location columns (if they don't exist)
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS clock_out_lat DECIMAL;

ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS clock_out_lng DECIMAL;

-- Step 3: Add shift_duration column (if it doesn't exist)
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS shift_duration TEXT;

-- Step 4: Add shift_notes column (if it doesn't exist)
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS shift_notes TEXT;

-- Step 5: Verify columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'shifts'
ORDER BY ordinal_position;

