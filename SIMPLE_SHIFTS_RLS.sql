-- SIMPLE FIX: Shifts RLS Policy
-- Allows authenticated users to insert/update/read shifts
-- Use this if you want a simpler approach (less secure)

-- Step 1: Enable RLS on shifts table
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies
DROP POLICY IF EXISTS "Workers can insert their own shifts" ON shifts;
DROP POLICY IF EXISTS "Workers can update their own shifts" ON shifts;
DROP POLICY IF EXISTS "Workers can read their own shifts" ON shifts;
DROP POLICY IF EXISTS "Allow anonymous inserts" ON shifts;
DROP POLICY IF EXISTS "Allow anonymous updates" ON shifts;
DROP POLICY IF EXISTS "Allow anonymous selects" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can insert shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can update shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can read shifts" ON shifts;

-- Step 3: Simple policies - allow authenticated users to do everything
CREATE POLICY "Authenticated users can insert shifts"
ON shifts
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update shifts"
ON shifts
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read shifts"
ON shifts
FOR SELECT
TO authenticated
USING (true);

-- Step 4: Verify policies
SELECT 
  policyname,
  cmd as command,
  roles
FROM pg_policies
WHERE tablename = 'shifts'
ORDER BY policyname;

