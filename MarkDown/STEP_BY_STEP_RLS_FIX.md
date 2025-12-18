# Step-by-Step: Fix 403 Permission Denied Error

## The Problem
You're getting "Permission denied" error even though workers exist in Supabase Auth.

## The Solution
Run the SQL script to create the correct RLS policies. The code now queries workers BEFORE authentication (using anonymous access), so you need the anonymous read policy.

---

## Exact Steps to Fix (Copy-Paste Ready)

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"** button

### Step 2: Copy This ENTIRE SQL Block

```sql
-- Fix RLS Policies for Email + Password Authentication
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Allow anonymous reads on workers" ON workers;
DROP POLICY IF EXISTS "Workers can read own record" ON workers;
DROP POLICY IF EXISTS "Authenticated users can read workers by email" ON workers;
DROP POLICY IF EXISTS "Allow anonymous reads for login" ON workers;

-- Create anonymous read policy (CRITICAL - Used BEFORE authentication)
CREATE POLICY "Allow anonymous reads on workers"
ON workers
FOR SELECT
TO anon
USING (true);

-- Create authenticated read policy (For after authentication)
CREATE POLICY "Authenticated users can read workers by email"
ON workers
FOR SELECT
TO authenticated
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = email
);
```

### Step 3: Run the SQL
1. Paste the SQL into the editor
2. Click **"Run"** button (or press Ctrl+Enter)
3. Wait for "Success" message

### Step 4: Verify It Worked
Run this query to check:

```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'workers';
```

**Expected Result:** You should see 2 policies:
- "Allow anonymous reads on workers" (cmd: SELECT, roles: anon)
- "Authenticated users can read workers by email" (cmd: SELECT, roles: authenticated)

### Step 5: Test Login
1. Restart your app: `npm start`
2. Try logging in
3. Should work now! ✅

---

## Why This Works

The code now:
1. **Queries workers table FIRST** (using anonymous access) ✅
2. **Then authenticates** with Supabase Auth ✅
3. **Stores worker info** in AsyncStorage ✅

This avoids RLS timing issues because we use anonymous access before authentication.

---

## Still Not Working?

### Check 1: Verify Worker Exists
Run this SQL:
```sql
SELECT id, name, email FROM workers;
```
Make sure your worker exists with the correct email.

### Check 2: Verify Auth User Exists
Go to Supabase Dashboard → **Authentication** → **Users**
Make sure user exists with matching email.

### Check 3: Verify Email Matches Exactly
Emails must match EXACTLY (case-sensitive) between:
- `auth.users` table
- `workers` table

### Check 4: Verify Policies Exist
Run this SQL:
```sql
SELECT * FROM pg_policies WHERE tablename = 'workers';
```
Should show 2 policies.

---

## Quick Test: Disable RLS Temporarily

If you want to test without RLS (NOT for production):

```sql
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
```

**Warning:** This removes all security. Only use for testing!

---

## Need More Help?

If still having issues, check:
1. ✅ SQL ran successfully (no errors)
2. ✅ Policies show in pg_policies query
3. ✅ Worker exists in workers table
4. ✅ Auth user exists with matching email
5. ✅ Restarted app after SQL changes

