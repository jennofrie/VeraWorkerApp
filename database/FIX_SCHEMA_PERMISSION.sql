-- Fix: Permission Denied for Schema Auth
-- Create function in PUBLIC schema instead of AUTH schema

-- Step 1: Create function in public schema (not auth schema)
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

-- Step 3: Drop existing policy if it exists
DROP POLICY IF EXISTS "Authenticated users can read workers by email" ON workers;

-- Step 4: Create policy using the function
CREATE POLICY "Authenticated users can read workers by email"
ON workers
FOR SELECT
TO authenticated
USING (
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

