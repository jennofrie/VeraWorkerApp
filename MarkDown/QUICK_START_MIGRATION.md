# Quick Start: Email + Password Migration

## 🎯 What You Need to Do (5 Simple Steps)

### Step 1: Create Auth Users in Supabase
**Time: 5-10 minutes**

1. Open Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add User"** → **"Create new user"**
3. For EACH worker:
   - Enter their **email** (must match `workers` table)
   - Enter a **password** (temporary - they can change later)
   - ✅ Check **"Auto Confirm User"**
   - Click **"Create User"**

**Tip:** If you have many workers, you can use the Supabase API or create a script to bulk import.

---

### Step 2: Verify Database Structure
**Time: 2 minutes**

Run this in Supabase SQL Editor:

```sql
-- Check if email is unique
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'workers' AND constraint_type = 'UNIQUE';

-- If email is not unique, run this:
ALTER TABLE workers 
ADD CONSTRAINT workers_email_unique UNIQUE (email);
```

---

### Step 3: Update RLS Policies (If Using RLS)
**Time: 2 minutes**

Run this in Supabase SQL Editor:

```sql
-- Allow authenticated users to read their own worker record
CREATE POLICY "Workers can read own record"
ON workers
FOR SELECT
TO authenticated
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = email
);

-- Keep anonymous access for login
CREATE POLICY "Allow anonymous reads for login"
ON workers
FOR SELECT
TO anon
USING (true);
```

**Note:** If you're not using RLS, skip this step.

---

### Step 4: Test Login
**Time: 3 minutes**

1. Start your app: `npm start`
2. Try logging in with:
   - Email: (from your workers table)
   - Password: (the one you set in Step 1)
3. Should successfully login and show the home screen

---

### Step 5: Notify Workers (If Needed)
**Time: Varies**

- Send workers their login credentials
- Or set up a password reset flow (optional)

---

## ✅ Done!

Your app now uses Email + Password authentication.

---

## 🐛 Common Issues & Quick Fixes

**"Invalid email or password"**
- ✅ Check user exists in Supabase Auth Dashboard
- ✅ Verify email matches exactly
- ✅ Check "Auto Confirm User" is enabled

**"Worker account not found"**
- ✅ Verify worker exists in `workers` table
- ✅ Check email matches between `auth.users` and `workers` table

**App crashes on login**
- ✅ Check `.env` file has correct Supabase credentials
- ✅ Check console logs for specific error

---

## 📋 Files Changed (Already Done)

- ✅ `app/index.tsx` - Updated login screen
- ✅ `components/WorkerLoginModal.tsx` - Updated modal
- ✅ `app/(tabs)/index.tsx` - No changes needed (still uses UUID internally)
- ✅ `lib/supabase.ts` - Already configured correctly

---

## 🎉 Benefits

- ✅ Simpler login (just email + password)
- ✅ More secure (Supabase handles password hashing)
- ✅ Better UX (no UUID to remember)
- ✅ Password reset support (can add later)
- ✅ Session management built-in

