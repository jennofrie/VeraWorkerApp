# Fix: Permission Denied for Table Users (Error 42501)

## Problem
Getting error: `permission denied for table users` when trying to verify worker during clock-in.

## Root Cause
The RLS policy tries to query `auth.users` table directly, but authenticated users don't have permission to read from `auth.users`.

## Solution Options

You have **2 options** - choose the one that fits your security needs:

---

## Option 1: Simple Fix (Recommended for Testing)

**Allow authenticated users to read workers** (since they're already authenticated):

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Authenticated users can read workers by email" ON workers;

-- Create simple policy - allows any authenticated user to read workers
CREATE POLICY "Authenticated users can read workers"
ON workers
FOR SELECT
TO authenticated
USING (true);
```

**Pros:** Simple, works immediately
**Cons:** Any authenticated user can read any worker record

---

## Option 2: Secure Fix (Recommended for Production)

**Create a security definer function** that can access `auth.users`:

```sql
-- Step 1: Create function in PUBLIC schema (not auth schema)
-- auth schema is protected, so we use public schema
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

-- Step 2: Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_auth_user_email() TO authenticated;

-- Step 3: Drop old policy
DROP POLICY IF EXISTS "Authenticated users can read workers by email" ON workers;

-- Step 4: Create new policy using the function
CREATE POLICY "Authenticated users can read workers by email"
ON workers
FOR SELECT
TO authenticated
USING (
  LOWER(public.get_auth_user_email()) = LOWER(email)
);
```

**Pros:** Secure - only allows reading own worker record
**Cons:** Slightly more complex

---

## Quick Fix Steps (Choose One)

### For Quick Testing (Option 1):

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste Option 1 SQL above
3. Click **Run**
4. Test clock-in

### For Production (Option 2):

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste Option 2 SQL above
3. Click **Run**
4. Test clock-in

---

## Why This Happens

- `auth.users` is a system table
- Regular authenticated users can't query it directly
- RLS policies run with user privileges, not admin privileges
- Solution: Use `SECURITY DEFINER` function (runs with elevated privileges)

---

## Verify It Works

After running the SQL, test:

1. Restart app: `npm start`
2. Login with email + password
3. Tap "Start Shift"
4. Should work! ✅

---

## Files Available

- `FIX_AUTH_USERS_PERMISSION.sql` - Option 2 (Secure)
- `SIMPLE_RLS_FIX.sql` - Option 1 (Simple)
- `FIX_RLS_POLICIES.sql` - Updated with function approach

