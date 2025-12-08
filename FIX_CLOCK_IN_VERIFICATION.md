# Fix: Verification Error When Starting Shift

## Problem
After logging in successfully, when tapping "Start Shift", you get:
- "Verification Error, failed to verify your worker account please try again"

## Root Cause
The clock-in verification was querying workers table by UUID (`id`), but the RLS policy only allows queries by email for authenticated users.

## Solution Applied
✅ Updated code to query by email instead of UUID
✅ Added better error handling and session refresh
✅ Updated RLS policy to handle case-insensitive email matching

---

## What Was Changed

### Code Changes (Already Applied)
1. **app/(tabs)/index.tsx** - Updated `handleClockIn` to:
   - Query workers table by email instead of UUID
   - Check for workerEmail before verification
   - Handle permission errors gracefully
   - Refresh session if needed

### SQL Changes (Run This in Supabase)

Update your RLS policy to handle case-insensitive email matching:

```sql
-- Drop existing authenticated policy
DROP POLICY IF EXISTS "Authenticated users can read workers by email" ON workers;

-- Create updated policy with case-insensitive email matching
CREATE POLICY "Authenticated users can read workers by email"
ON workers
FOR SELECT
TO authenticated
USING (
  -- Match email from auth.users with workers.email (case-insensitive)
  LOWER((SELECT email FROM auth.users WHERE id = auth.uid())) = LOWER(email)
);
```

---

## Steps to Fix

### Step 1: Update RLS Policy (2 minutes)

1. Go to Supabase Dashboard → SQL Editor → New Query
2. Copy and paste this SQL:

```sql
DROP POLICY IF EXISTS "Authenticated users can read workers by email" ON workers;

CREATE POLICY "Authenticated users can read workers by email"
ON workers
FOR SELECT
TO authenticated
USING (
  LOWER((SELECT email FROM auth.users WHERE id = auth.uid())) = LOWER(email)
);
```

3. Click **Run**
4. Wait for "Success" message

### Step 2: Verify It Works

1. Restart your app: `npm start`
2. Login with email + password
3. Tap "Start Shift"
4. Should work now! ✅

---

## Why This Works

**Before:**
- Code queried by UUID → RLS policy only allows email queries → Permission denied ❌

**After:**
- Code queries by email → RLS policy allows email queries → Success ✅
- Case-insensitive matching handles email casing differences
- Session refresh handles timing issues

---

## Still Having Issues?

### Check 1: Verify Email Matches
Run this SQL to check:
```sql
SELECT 
  au.email as auth_email,
  w.email as worker_email,
  LOWER(au.email) = LOWER(w.email) as emails_match
FROM auth.users au
LEFT JOIN workers w ON LOWER(au.email) = LOWER(w.email)
WHERE au.email IS NOT NULL;
```

All rows should show `emails_match = true`.

### Check 2: Verify Session Exists
After logging in, check if session is active:
- The app should maintain the Supabase auth session
- If session expires, user will need to login again

### Check 3: Check Console Logs
Look for:
- "Worker verification error" - shows the actual error
- "Permission denied" - RLS issue
- "Worker Not Found" - email mismatch

---

## Summary

✅ **Code Updated** - Queries by email instead of UUID
✅ **Error Handling Improved** - Better messages and session refresh
✅ **RLS Policy Updated** - Case-insensitive email matching

Run the SQL above and test again!

