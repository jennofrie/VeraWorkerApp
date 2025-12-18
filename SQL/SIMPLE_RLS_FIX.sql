-- SIMPLE FIX: Permission Denied for Table Users
-- This avoids querying auth.users entirely

-- Option 1: Allow authenticated users to read workers (Simplest)
-- Since users are already authenticated, allow them to read worker records
DROP POLICY IF EXISTS "Authenticated users can read workers by email" ON workers;

CREATE POLICY "Authenticated users can read workers"
ON workers
FOR SELECT
TO authenticated
USING (true);

-- Option 2: If you want more security, use the function approach (see FIX_AUTH_USERS_PERMISSION.sql)

