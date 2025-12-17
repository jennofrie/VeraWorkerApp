# Email + Password Authentication Migration Guide

## Overview
This guide walks you through migrating from UUID + Name + Email authentication to Email + Password authentication using Supabase Auth.

---

## Step-by-Step Implementation

### Step 1: Create Auth Users in Supabase Dashboard

**Action Required:** Create Supabase Auth users for each worker

1. Go to your Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. For each worker:
   - **Email:** Use the same email as in your `workers` table
   - **Password:** Set a temporary password (workers can change later)
   - **Auto Confirm User:** ✅ Check this (or workers won't be able to login)
   - Click "Create User"

**Alternative (Bulk Import):**
If you have many workers, use the Supabase API or SQL to create users programmatically.

---

### Step 2: Verify Workers Table Structure

**Action Required:** Ensure your `workers` table has the correct structure

Run this SQL in Supabase SQL Editor to verify:

```sql
-- Check current structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'workers'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` (UUID, PRIMARY KEY)
- `name` (TEXT, NOT NULL)
- `email` (TEXT, NOT NULL, UNIQUE)
- `created_at` (TIMESTAMPTZ)

**If email is not UNIQUE, fix it:**
```sql
-- Make email unique if not already
ALTER TABLE workers 
ADD CONSTRAINT workers_email_unique UNIQUE (email);
```

---

### Step 3: Link Workers to Auth Users (Optional but Recommended)

**Action Required:** Create a link between workers and auth users

**Option A: Add auth_user_id column (Recommended)**
```sql
-- Add column to link workers to auth users
ALTER TABLE workers 
ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workers_auth_user_id ON workers(auth_user_id);
```

**Option B: Use email as the link (Simpler)**
- No schema changes needed
- Email in `workers` table must match email in `auth.users` table
- This is what the current code uses

---

### Step 4: Update RLS Policies (If Using Row Level Security)

**Action Required:** Update RLS policies to allow authenticated users

```sql
-- Enable RLS on workers table (if not already enabled)
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow anonymous reads on workers" ON workers;

-- Allow authenticated users to read their own worker record
CREATE POLICY "Workers can read own record"
ON workers
FOR SELECT
TO authenticated
USING (
  -- Option A: If using auth_user_id column
  auth.uid() = auth_user_id
  
  -- Option B: If using email link (uncomment this instead)
  -- (SELECT email FROM auth.users WHERE id = auth.uid()) = email
);

-- Allow anonymous reads for login (if needed)
CREATE POLICY "Allow anonymous reads for login"
ON workers
FOR SELECT
TO anon
USING (true);
```

---

### Step 5: Test Authentication Flow

**Action Required:** Test the new login flow

1. **Start your app:**
   ```bash
   npm start
   ```

2. **Test login:**
   - Open the app
   - Enter email and password (from Step 1)
   - Should successfully login and navigate to tabs

3. **Test error cases:**
   - Wrong password → Should show "Invalid email or password"
   - Wrong email → Should show "Invalid email or password"
   - Unverified email → Should show verification message

---

### Step 6: Migrate Existing Users (If Any)

**Action Required:** If you have existing logged-in users

**Option A: Force re-login (Simplest)**
- Existing users will need to login again with email + password
- Their stored credentials will be cleared automatically

**Option B: Clear AsyncStorage for all users**
```sql
-- If you have a way to notify users, do so
-- The app will automatically clear invalid credentials on next launch
```

---

### Step 7: Set Up Password Reset (Optional but Recommended)

**Action Required:** Configure password reset emails in Supabase

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL** to your app's URL
3. Set **Redirect URLs** to include your app's deep link scheme
4. Go to Authentication → Email Templates
5. Customize "Reset Password" template if desired

**Password reset flow:**
- Users can request password reset via Supabase Auth
- You can add a "Forgot Password" button in your login screen later

---

## Verification Checklist

After completing all steps, verify:

- [ ] All workers have corresponding auth users in Supabase
- [ ] Email addresses match between `workers` and `auth.users` tables
- [ ] Workers table has unique email constraint
- [ ] RLS policies are updated (if using RLS)
- [ ] Login works with email + password
- [ ] Error messages display correctly
- [ ] Clock in/out still works after login
- [ ] Worker UUID is still stored correctly in AsyncStorage

---

## Troubleshooting

### Issue: "Invalid email or password" even with correct credentials

**Solution:**
1. Check if user exists in Supabase Auth Dashboard
2. Verify email matches exactly (case-sensitive in some cases)
3. Check if user is confirmed (Auto Confirm should be enabled)
4. Try resetting password in Supabase Dashboard

### Issue: "Worker account not found" after successful auth

**Solution:**
1. Verify worker exists in `workers` table with matching email
2. Check RLS policies allow reading worker records
3. Verify email matches exactly between auth.users and workers table

### Issue: App crashes on login

**Solution:**
1. Check console logs for specific error
2. Verify Supabase credentials in `.env` file
3. Ensure `lib/supabase.ts` is properly configured
4. Check network connectivity

---

## Rollback Plan (If Needed)

If you need to rollback to UUID authentication:

1. **Revert code changes:**
   ```bash
   git revert <commit-hash>
   ```

2. **Keep auth users in Supabase** (no harm in keeping them)
3. **No database changes needed** (workers table unchanged)

---

## Next Steps (Future Enhancements)

After successful migration, consider:

1. **Add "Forgot Password" functionality**
   - Use `supabase.auth.resetPasswordForEmail()`

2. **Add password change functionality**
   - Use `supabase.auth.updateUser()`

3. **Add email verification flow**
   - Use `supabase.auth.resend()`

4. **Add session management**
   - Check `supabase.auth.getSession()` on app start
   - Auto-logout expired sessions

---

## Support

If you encounter issues during migration:

1. Check Supabase Dashboard → Logs for errors
2. Check browser/app console for client-side errors
3. Verify all environment variables are set correctly
4. Test with a single worker first before migrating all

---

## Summary

**What Changed:**
- ✅ Login now uses Email + Password (Supabase Auth)
- ✅ Removed UUID Last 4 verification
- ✅ Removed Full Name requirement
- ✅ More secure password handling
- ✅ Better error messages

**What Stayed the Same:**
- ✅ Worker UUID still used internally for shift operations
- ✅ AsyncStorage still stores worker UUID
- ✅ Clock in/out functionality unchanged
- ✅ Database schema mostly unchanged (only optional auth_user_id column)

**Manual Steps Required:**
1. Create auth users in Supabase Dashboard
2. Verify workers table structure
3. Update RLS policies (if using RLS)
4. Test login flow

