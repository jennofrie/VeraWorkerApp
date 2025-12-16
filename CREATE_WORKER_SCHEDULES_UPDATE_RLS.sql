-- ============================================================================
-- RLS POLICY: Allow workers to UPDATE their own schedules
-- ============================================================================
-- This enables workers to clock in/out by updating worker_schedules table
-- Run this AFTER running MIGRATE_WORKER_SCHEDULES_SCHEMA.sql
-- ============================================================================

-- Step 1: Verify RLS is enabled (should already be enabled)
ALTER TABLE worker_schedules ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing UPDATE policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Workers can update their own schedules" ON worker_schedules;
DROP POLICY IF EXISTS "Authenticated users can update schedules" ON worker_schedules;

-- Step 3: Verify required functions exist (should already exist from previous setup)
-- These functions are used by the SELECT policy and are needed for UPDATE too
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_auth_user_email', 'worker_belongs_to_user');

-- If functions don't exist, create them:
CREATE OR REPLACE FUNCTION public.get_auth_user_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_user_email() TO authenticated;

CREATE OR REPLACE FUNCTION public.worker_belongs_to_user(worker_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM workers w
    WHERE w.id = worker_uuid
    AND LOWER(w.email) = LOWER(public.get_auth_user_email())
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.worker_belongs_to_user(UUID) TO authenticated;

-- Step 4: Create UPDATE policy
-- This allows authenticated workers to update their own schedules
-- Specifically for clock in/out operations (updating actual_start_time, actual_end_time, status, notes)
CREATE POLICY "Workers can update their own schedules"
ON worker_schedules
FOR UPDATE
TO authenticated
USING (
  -- Can only update schedules where worker_id belongs to authenticated user
  public.worker_belongs_to_user(worker_id)
)
WITH CHECK (
  -- After update, must still belong to authenticated user (prevents changing worker_id)
  public.worker_belongs_to_user(worker_id)
);

-- Step 5: Verify policy was created
SELECT 
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'worker_schedules'
ORDER BY policyname;

-- Expected result: You should see 2 policies:
-- 1. "Workers can read their own schedules" (SELECT)
-- 2. "Workers can update their own schedules" (UPDATE)

-- ============================================================================
-- TESTING THE POLICY
-- ============================================================================
-- To test, you'll need to be authenticated as a worker
-- The policy should allow:
-- ✅ UPDATE worker_schedules SET actual_start_time = NOW(), status = 'STARTED' WHERE worker_id = <your_worker_id>
-- ❌ UPDATE worker_schedules SET actual_start_time = NOW() WHERE worker_id = <other_worker_id> (should fail)

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
/*
DROP POLICY IF EXISTS "Workers can update their own schedules" ON worker_schedules;
*/

