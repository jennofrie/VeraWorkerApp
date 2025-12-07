-- Fix Foreign Key Constraint Issue
-- This script handles existing shifts with invalid worker_ids

-- Step 1: Check for invalid worker_ids in shifts table
-- Run this first to see what needs to be fixed:
SELECT DISTINCT s.worker_id, COUNT(*) as shift_count
FROM shifts s
LEFT JOIN workers w ON s.worker_id = w.id
WHERE w.id IS NULL
GROUP BY s.worker_id;

-- Step 2: Option A - Delete invalid shifts (if you don't need them)
-- Uncomment the lines below if you want to delete shifts with invalid worker_ids:
/*
DELETE FROM shifts
WHERE worker_id NOT IN (SELECT id FROM workers);
*/

-- Step 2: Option B - Keep shifts but remove invalid worker_ids (set to NULL temporarily)
-- Note: This requires making worker_id nullable first, which may break your app
-- Only use if you really need to keep the shift data
/*
ALTER TABLE shifts ALTER COLUMN worker_id DROP NOT NULL;
UPDATE shifts
SET worker_id = NULL
WHERE worker_id NOT IN (SELECT id FROM workers);
*/

-- Step 3: Add the foreign key constraint (after cleaning up invalid data)
-- This will only work if all worker_ids in shifts exist in workers table
DO $$ 
BEGIN
  -- First, drop the constraint if it exists (in case previous attempt failed)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shifts_worker_id_fkey'
  ) THEN
    ALTER TABLE shifts DROP CONSTRAINT shifts_worker_id_fkey;
  END IF;

  -- Now add the constraint (will fail if invalid data exists)
  ALTER TABLE shifts 
  ADD CONSTRAINT shifts_worker_id_fkey 
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;
  
  RAISE NOTICE 'Foreign key constraint added successfully!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Cannot add foreign key. Invalid worker_ids exist in shifts table. Run Step 1 to identify them, then use Step 2 to fix.';
END $$;

