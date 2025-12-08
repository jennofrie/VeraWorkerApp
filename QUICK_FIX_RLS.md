# Quick Fix: 403 Error - Worker Account Not Found

## Problem
After successful authentication, you're getting:
- "Worker account not found. Please contact support."
- 403 Forbidden error
- Workers exist in Authentication tab but query fails

## Root Cause
Row Level Security (RLS) policies are blocking access to the `workers` table after authentication.

## Solution (2 Minutes)

### Step 1: Run This SQL in Supabase SQL Editor

Copy and paste this entire SQL script into your Supabase SQL Editor and run it:

```sql
-- Fix RLS Policies for Email + Password Authentication
-- Enable RLS on workers table (if not already enabled)
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Allow anonymous reads on workers" ON workers;
DROP POLICY IF EXISTS "Workers can read own record" ON workers;
DROP POLICY IF EXISTS "Authenticated users can read workers by email" ON workers;
DROP POLICY IF EXISTS "Allow anonymous reads for login" ON workers;

-- Create policy to allow authenticated users to read workers by email
CREATE POLICY "Authenticated users can read workers by email"
ON workers
FOR SELECT
TO authenticated
USING (
  -- Match email from auth.users with workers.email
  (SELECT email FROM auth.users WHERE id = auth.uid()) = email
);

-- Create policy to allow anonymous reads (for initial login lookup)
CREATE POLICY "Allow anonymous reads on workers"
ON workers
FOR SELECT
TO anon
USING (true);
```

### Step 2: Verify It Worked

After running the SQL, try logging in again. It should work now!

---

## Alternative: If You Don't Want RLS (Less Secure)

If you want to disable RLS entirely (not recommended for production):

```sql
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
```

**Warning:** This allows anyone to read all worker records. Only use for testing.

---

## Verify Your Setup

After fixing RLS, verify:

1. ✅ Auth user exists in Supabase Dashboard → Authentication → Users
2. ✅ Worker exists in `workers` table with matching email
3. ✅ RLS policies are created (run the SQL above)
4. ✅ Try logging in again

---

## Still Having Issues?

Check:
1. **Email matches exactly** between `auth.users` and `workers` table (case-sensitive)
2. **Worker exists** in `workers` table (check Supabase Table Editor)
3. **RLS is enabled** on workers table
4. **Policies are created** (check Supabase Dashboard → Authentication → Policies)

