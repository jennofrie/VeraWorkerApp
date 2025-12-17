# Fix: Row-Level Security Policy for Shifts Table

## Problem
Getting error: `new row violates row-level security policy for table "shifts"` when trying to clock in.

## Root Cause
RLS is enabled on the `shifts` table, but there are no policies allowing authenticated users to insert shifts.

## Solution Options

You have **2 options** - choose based on your security needs:

---

## Option 1: Simple Fix (Quick Testing)

**Allow authenticated users to insert/update/read shifts** (since they're already authenticated):

1. Go to Supabase Dashboard → SQL Editor → New Query
2. Copy and paste this SQL:

```sql
-- Enable RLS on shifts table
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Workers can insert their own shifts" ON shifts;
DROP POLICY IF EXISTS "Workers can update their own shifts" ON shifts;
DROP POLICY IF EXISTS "Workers can read their own shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can insert shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can update shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can read shifts" ON shifts;

-- Simple policies - allow authenticated users to do everything
CREATE POLICY "Authenticated users can insert shifts"
ON shifts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update shifts"
ON shifts FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read shifts"
ON shifts FOR SELECT TO authenticated USING (true);
```

3. Click **Run**
4. Test clock-in

**Pros:** Simple, works immediately  
**Cons:** Any authenticated user can insert/update any shift

---

## Option 2: Secure Fix (Recommended for Production)

**Only allow users to insert/update/read their own shifts** (checks worker ownership):

**IMPORTANT:** This requires the `public.get_auth_user_email()` function from the workers RLS fix.

1. Go to Supabase Dashboard → SQL Editor → New Query
2. Copy and paste this SQL:

```sql
-- Enable RLS on shifts table
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Workers can insert their own shifts" ON shifts;
DROP POLICY IF EXISTS "Workers can update their own shifts" ON shifts;
DROP POLICY IF EXISTS "Workers can read their own shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can insert shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can update shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can read shifts" ON shifts;

-- Create function to check if worker belongs to authenticated user
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

-- Policy to allow authenticated users to insert their own shifts
CREATE POLICY "Authenticated users can insert their own shifts"
ON shifts FOR INSERT TO authenticated
WITH CHECK (public.worker_belongs_to_user(worker_id));

-- Policy to allow authenticated users to update their own shifts
CREATE POLICY "Authenticated users can update their own shifts"
ON shifts FOR UPDATE TO authenticated
USING (public.worker_belongs_to_user(worker_id));

-- Policy to allow authenticated users to read their own shifts
CREATE POLICY "Authenticated users can read their own shifts"
ON shifts FOR SELECT TO authenticated
USING (public.worker_belongs_to_user(worker_id));
```

3. Click **Run**
4. Test clock-in

**Pros:** Secure - only allows users to manage their own shifts  
**Cons:** Requires `public.get_auth_user_email()` function to exist

---

## Quick Fix Steps

### For Quick Testing (Option 1):
1. Run `SIMPLE_SHIFTS_RLS.sql` SQL above
2. Test clock-in ✅

### For Production (Option 2):
1. **First:** Make sure you've run `FIX_AUTH_USERS_PERMISSION.sql` (creates `public.get_auth_user_email()`)
2. **Then:** Run `FIX_SHIFTS_RLS.sql` SQL above
3. Test clock-in ✅

---

## Verify It Works

After running the SQL:

```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'shifts';
```

You should see 3 policies:
- INSERT policy
- UPDATE policy  
- SELECT policy

---

## Files Available

- `SIMPLE_SHIFTS_RLS.sql` - Option 1 (Simple)
- `FIX_SHIFTS_RLS.sql` - Option 2 (Secure)
- `FIX_SHIFTS_RLS_GUIDE.md` - This guide

---

## Recommendation

- **For testing:** Use Option 1 (Simple)
- **For production:** Use Option 2 (Secure)

Run one of the SQL scripts and test clock-in again!

