-- Fix RLS Policies for Email + Password Authentication
-- Run this in your Supabase SQL Editor
-- IMPORTANT: Copy and paste ALL of this into SQL Editor and click RUN

-- Step 1: Enable RLS on workers table (if not already enabled)
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies that might conflict
DROP POLICY IF EXISTS "Allow anonymous reads on workers" ON workers;
DROP POLICY IF EXISTS "Workers can read own record" ON workers;
DROP POLICY IF EXISTS "Authenticated users can read workers by email" ON workers;
DROP POLICY IF EXISTS "Allow anonymous reads for login" ON workers;

-- Step 3: Create policy to allow anonymous reads (CRITICAL - This is used BEFORE authentication)
-- This allows the app to query workers table before user logs in
CREATE POLICY "Allow anonymous reads on workers"
ON workers
FOR SELECT
TO anon
USING (true);

-- Step 4: Create a security definer function to get user email
-- This function runs with elevated privileges and can access auth.users
-- NOTE: Function must be in public schema, not auth schema
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

-- Step 4b: Grant execute permission to authenticated role
GRANT EXECUTE ON FUNCTION public.get_auth_user_email() TO authenticated;

-- Step 5: Create policy to allow authenticated users to read workers by email
-- This allows authenticated users to read their own worker record
CREATE POLICY "Authenticated users can read workers by email"
ON workers
FOR SELECT
TO authenticated
USING (
  -- Match email from auth.users with workers.email (case-insensitive)
  -- Uses security definer function to access auth.users
  LOWER(public.get_auth_user_email()) = LOWER(email)
);

-- Step 5: Verify policies were created successfully
-- You should see 2 policies listed after running this
SELECT 
  policyname,
  cmd as command,
  roles
FROM pg_policies
WHERE tablename = 'workers'
ORDER BY policyname;

