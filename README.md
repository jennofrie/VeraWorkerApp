# Vera Link Shift - Worker Mobile App 👋

A companion mobile app for workers to clock in/out with NDIS compliance features, built with Expo and React Native.

## Features

- **Location-based Clock In/Out**: Uses device GPS for NDIS compliance
- **Persistent Shift State**: Remembers active shifts using AsyncStorage
- **Cinematic UI**: Animated hero button with long-press progress indicator
- **Glassmorphism Modal**: Beautiful blur effect for shift notes
- **Haptic Feedback**: Tactile responses for all interactions
- **Supabase Integration**: Real-time shift tracking

## Environment Setup

Create a `.env` file in the root directory with your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL="your_supabase_url"
EXPO_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anonkey"
```

## Database Schema

The app expects a `shifts` table and a `workers` table in Supabase with the following structure:

```sql
-- Create workers table first
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create shifts table with foreign key constraint
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_in_lat DECIMAL,
  clock_in_lng DECIMAL,
  clock_out_time TIMESTAMPTZ,
  clock_out_lat DECIMAL,
  clock_out_lng DECIMAL,
  shift_notes TEXT,
  shift_duration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint (IMPORTANT: Clean invalid data first!)
-- If you have existing shifts with invalid worker_ids, you must fix them first.
-- See FIX_FOREIGN_KEY.sql for instructions on cleaning up invalid data.

-- Step 1: Check for invalid worker_ids
SELECT DISTINCT s.worker_id, COUNT(*) as shift_count
FROM shifts s
LEFT JOIN workers w ON s.worker_id = w.id
WHERE w.id IS NULL
GROUP BY s.worker_id;

-- Step 2: Delete invalid shifts (or create workers for them)
-- DELETE FROM shifts WHERE worker_id NOT IN (SELECT id FROM workers);

-- Step 3: Add the foreign key constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shifts_worker_id_fkey'
  ) THEN
    ALTER TABLE shifts DROP CONSTRAINT shifts_worker_id_fkey;
  END IF;

  ALTER TABLE shifts 
  ADD CONSTRAINT shifts_worker_id_fkey 
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;
END $$;
```

**Important:** The foreign key constraint ensures that:
- Only existing workers can clock in
- If a worker is deleted, their shifts are also deleted (CASCADE)
- The database will reject any shift creation for non-existent workers

## Row Level Security (RLS) Policies

If you're getting "new row violates row-level security policy" errors, you need to set up RLS policies in Supabase. Run these SQL commands in your Supabase SQL Editor:

```sql
-- Enable RLS on the shifts table
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Policy to allow workers to insert their own shifts
CREATE POLICY "Workers can insert their own shifts"
ON shifts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = worker_id);

-- Policy to allow workers to update their own shifts
CREATE POLICY "Workers can update their own shifts"
ON shifts
FOR UPDATE
TO authenticated
USING (auth.uid() = worker_id);

-- Policy to allow workers to read their own shifts
CREATE POLICY "Workers can read their own shifts"
ON shifts
FOR SELECT
TO authenticated
USING (auth.uid() = worker_id);

-- If you want to allow anonymous inserts (for mobile app without auth):
CREATE POLICY "Allow anonymous inserts"
ON shifts
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous updates"
ON shifts
FOR UPDATE
TO anon
USING (true);

CREATE POLICY "Allow anonymous selects"
ON shifts
FOR SELECT
TO anon
USING (true);

-- Fix Foreign Key Constraint Issue:
-- If you get "violates foreign key constraint" error, you have two options:

-- Option 1: Remove the foreign key constraint (if worker_id doesn't need to reference another table)
-- ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shift_worker_id_fkey;

-- Option 2: Create a workers/users table and ensure the worker_id exists
-- CREATE TABLE IF NOT EXISTS workers (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   name TEXT,
--   email TEXT,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );
-- Then insert your worker UUID into this table before using it in shifts
```

**Note:** If you're using the mobile app without authentication, use the anonymous policies. If workers are authenticated, use the authenticated policies.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Recent Changes & Bug Fixes

### Logout Functionality Fix (Critical for App Store Review)

**Problem**: The logout button in the drawer menu was not properly navigating back to the login screen. After tapping logout, the app would remain on the "My Schedule" section instead of returning to the login page.

**Root Cause**: Expo Router has a known limitation where `router.replace('/')` navigation from inside a Modal component (the Drawer) does not reliably update the UI when navigating from a `(tabs)` group to the root route.

**Debugging History** (17+ attempts):

1. ❌ Simple `router.replace('/')` from DrawerContent
2. ❌ AsyncStorage logout flag check
3. ❌ `setTimeout` delay before navigation
4. ❌ `useRef` guard to prevent re-navigation
5. ❌ Enhanced defensive checks in login screen's `checkAuth()`
6. ❌ `navigation.dispatch(CommonActions.reset())`
7. ❌ `router.dismissAll()` + `router.replace('/')` (caused "POP_TO_TOP not handled" error)
8. ❌ Moved logout button to main screen header (out of drawer)
9. ❌ Removed `unstable_settings.anchor` from root layout
10. ❌ Deep linking using `Linking.openURL()`
11. ❌ Global auth state polling with `<Redirect>` component (broke login UI)
12. ❌ Alert asking user to restart app (not acceptable UX)
13. ❌ Event-driven auth gate with `authEvents.ts` (caused infinite loop/black screen)
14. ❌ Removed all auth checking from tabs layout
15. ❌ One-shot router navigation from tab layout
16. ❌ Callback pattern (navigation outside Modal)
17. ✅ **SOLUTION**: Force app reload using `expo-updates`

**Working Solution**: 

The logout handler now uses `Updates.reloadAsync()` from `expo-updates` to completely restart the app after clearing storage. This approach:
- Clears all AsyncStorage data (worker credentials, profile settings, etc.)
- Signs out from Supabase Auth
- Forces a complete app restart using `Updates.reloadAsync()` (iOS/Android) or `window.location.href = '/'` (web)
- On app restart, with no stored credentials, the login screen is shown automatically

**Implementation Details**:
- File: `components/DrawerContent.tsx` - `handleLogout()` function
- Uses `expo-updates` package for native app reload
- Fallback to `router.replace('/')` in development mode (Expo Go) where `Updates.reloadAsync()` is not available
- Web platform uses hard page reload for immediate effect

**Testing Notes**:
- ✅ **Production builds (TestFlight/App Store)**: Logout works perfectly with app restart
- ⚠️ **Development mode (Expo Go)**: Uses fallback navigation (may still exhibit old bug, but acceptable for dev)
- ✅ **Web**: Works immediately with hard reload

**Configuration Changes**:
- Added `expo-updates` to `package.json` dependencies
- Added `expo-updates` plugin to `app.json`
- Added updates configuration: `updates.enabled = true`, `runtimeVersion.policy = "appVersion"`

### Additional Improvements

- **Network Error Handling**: Enhanced `useWorkerSchedules` hook with retry logic and exponential backoff for timeout errors
- **Supabase Client**: Improved timeout handling with longer timeouts for `worker_schedules` queries (30 seconds)
- **Package Updates**: Updated Expo packages to compatible versions (expo-linking, expo-router, expo-splash-screen)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
