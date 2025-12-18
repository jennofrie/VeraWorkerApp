-- Fix: Permission Denied for Table Users Error
-- This creates a security definer function to access auth.users safely
-- NOTE: Function must be in public schema, not auth schema

-- Step 1: Create function to get authenticated user's email
-- This function runs with elevated privileges (SECURITY DEFINER)
-- It can access auth.users table which regular users cannot
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

-- Step 2: Grant execute permission to authenticated role
GRANT EXECUTE ON FUNCTION public.get_auth_user_email() TO authenticated;

-- Step 3: Drop existing authenticated policy
DROP POLICY IF EXISTS "Authenticated users can read workers by email" ON workers;

-- Step 4: Create updated policy using the function
CREATE POLICY "Authenticated users can read workers by email"
ON workers
FOR SELECT
TO authenticated
USING (
  -- Match email using the security definer function
  LOWER(public.get_auth_user_email()) = LOWER(email)
);

-- Step 5: Verify it works
SELECT 
  policyname,
  cmd as command,
  roles
FROM pg_policies
WHERE tablename = 'workers'
ORDER BY policyname;

