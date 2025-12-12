-- Setup Row-Level Security for worker_schedules table
-- This ensures workers can only read their own schedules
-- Uses the same pattern as the shifts table for consistency

-- Step 1: Enable RLS on worker_schedules table
ALTER TABLE worker_schedules ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies that might conflict
DROP POLICY IF EXISTS "Workers can read their own schedules" ON worker_schedules;
DROP POLICY IF EXISTS "Workers can read own schedules" ON worker_schedules;
DROP POLICY IF EXISTS "Authenticated users can read schedules" ON worker_schedules;

-- Step 3: Verify required functions exist, create if they don't
-- Function 1: get_auth_user_email() - should already exist from FIX_RLS_POLICIES.sql
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_auth_user_email() TO authenticated;

-- Function 2: worker_belongs_to_user() - should already exist from FIX_SHIFTS_RLS.sql
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.worker_belongs_to_user(UUID) TO authenticated;

-- Step 4: Create RLS policy for worker_schedules
-- This policy allows authenticated users to read only their own schedules
-- Uses worker_belongs_to_user() function for consistency with shifts table
CREATE POLICY "Workers can read their own schedules"
ON worker_schedules
FOR SELECT
TO authenticated
USING (
  public.worker_belongs_to_user(worker_id)
);

-- Step 5: Verify policy was created successfully
SELECT 
  policyname,
  cmd as command,
  roles
FROM pg_policies
WHERE tablename = 'worker_schedules'
ORDER BY policyname;

-- Expected result: You should see 1 policy:
-- "Workers can read their own schedules" (cmd: SELECT, roles: authenticated)

