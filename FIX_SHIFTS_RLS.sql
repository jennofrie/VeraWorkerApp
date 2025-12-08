-- Fix: Row-Level Security Policy for Shifts Table
-- This allows authenticated users to insert/update/read their own shifts

-- Step 1: Enable RLS on shifts table
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies that might conflict
DROP POLICY IF EXISTS "Workers can insert their own shifts" ON shifts;
DROP POLICY IF EXISTS "Workers can update their own shifts" ON shifts;
DROP POLICY IF EXISTS "Workers can read their own shifts" ON shifts;
DROP POLICY IF EXISTS "Allow anonymous inserts" ON shifts;
DROP POLICY IF EXISTS "Allow anonymous updates" ON shifts;
DROP POLICY IF EXISTS "Allow anonymous selects" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can insert shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can update shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can read shifts" ON shifts;

-- Step 3: Create function to check if worker belongs to authenticated user (if not exists)
-- This uses the function we created earlier for workers table
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

-- Step 4: Grant execute permission
GRANT EXECUTE ON FUNCTION public.worker_belongs_to_user(UUID) TO authenticated;

-- Step 5: Policy to allow authenticated users to insert their own shifts
-- Checks that worker_id belongs to the authenticated user
CREATE POLICY "Authenticated users can insert their own shifts"
ON shifts
FOR INSERT
TO authenticated
WITH CHECK (
  public.worker_belongs_to_user(worker_id)
);

-- Step 6: Policy to allow authenticated users to update their own shifts
CREATE POLICY "Authenticated users can update their own shifts"
ON shifts
FOR UPDATE
TO authenticated
USING (
  public.worker_belongs_to_user(worker_id)
);

-- Step 7: Policy to allow authenticated users to read their own shifts
CREATE POLICY "Authenticated users can read their own shifts"
ON shifts
FOR SELECT
TO authenticated
USING (
  public.worker_belongs_to_user(worker_id)
);

-- Step 8: Verify policies were created
SELECT 
  policyname,
  cmd as command,
  roles
FROM pg_policies
WHERE tablename = 'shifts'
ORDER BY policyname;

