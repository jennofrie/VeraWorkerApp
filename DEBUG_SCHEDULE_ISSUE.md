# Debug Guide: Schedule Not Showing for December 14, 2025

## Step-by-Step Debugging Process

### Step 1: Check Console Logs

Open your app and navigate to the Schedule tab. Check the browser console (web) or React Native debugger (mobile) for these logs:

1. **`[ScheduleScreen] Week range calculated:`**
   - Check if `includesDec14` is `true`
   - If `false`, December 14, 2025 is NOT in the current week view
   - **Solution**: Navigate to the week containing December 14 (December 8-14, 2025)

2. **`[useWorkerSchedules] Fetching schedules with filters:`**
   - Check `dateFrom` and `dateTo` values
   - Verify they include December 14: `dateFrom <= '2024-12-14' && dateTo >= '2024-12-14'`

3. **`[useWorkerSchedules] Query result:`**
   - Check `dataCount` - how many schedules were returned?
   - Check `schedules` array - does it include December 14, 2025?
   - Check `dec14Schedule` - is there a schedule for December 14, 2025?

4. **`[ScheduleScreen] All schedules received:`**
   - Check `totalSchedules` - how many schedules total?
   - Check `dec14Schedule` - is December 14, 2025 schedule in the results?

5. **`[ScheduleScreen] December 14, 2025 processing:`**
   - Check if this log appears (means December 14, 2025 is in the current week view)
   - Check `daySchedulesFound` - should be > 0 if schedule exists

### Step 2: Verify Database Data

Run this SQL in Supabase SQL Editor:

```sql
-- Check if schedule exists for December 14, 2025
SELECT 
  ws.id,
  ws.scheduled_date,
  ws.start_time,
  ws.end_time,
  ws.worker_id,
  ws.location_name,
  ws.status,
  w.email as worker_email,
  w.name as worker_name
FROM worker_schedules ws
LEFT JOIN workers w ON ws.worker_id = w.id
WHERE ws.scheduled_date = '2025-12-14'
ORDER BY ws.start_time;
```

**Expected Result**: Should show at least 1 schedule for December 14, 2025

### Step 3: Verify RLS Policy

**Option A: Test RLS Function Directly**

Run this SQL to check the schedule and worker data:

```sql
-- Check schedule and worker data (this will work in SQL Editor)
SELECT 
  ws.id,
  ws.scheduled_date,
  ws.start_time,
  ws.end_time,
  ws.worker_id,
  w.email as worker_email,
  w.name as worker_name,
  -- Check if worker exists
  CASE WHEN w.id IS NOT NULL THEN 'Worker exists' ELSE 'Worker NOT found' END as worker_status
FROM worker_schedules ws
LEFT JOIN workers w ON ws.worker_id = w.id
WHERE ws.scheduled_date = '2025-12-14';
```

**Important**: The `worker_belongs_to_user()` function will show `false` in SQL Editor because:
- SQL Editor runs as admin/postgres user, not as an authenticated user
- The function checks `auth.uid()` which is NULL in SQL Editor context
- **This is normal and expected behavior**

**To actually test RLS, you MUST use Option B (test from app) or verify the data matches correctly.**

**Option B: Test from App (Recommended - This is the REAL test)**

The best way to test RLS is from the app itself because it uses actual authentication:

1. **Log in as the worker** (`angela08moss@gmail.com`) in the mobile app
2. **Navigate to Schedule tab**
3. **Navigate to the week containing December 14, 2025** (December 8-14, 2025)
4. **Check browser console** (web) or React Native debugger (mobile) for these logs:
   - `[useWorkerSchedules] Query result:` - Check `dataCount` and `dec14Schedule`
   - `[ScheduleScreen] All schedules received:` - Check `dec14Schedule`
   - `[ScheduleScreen] December 14, 2025 processing:` - Should appear if in correct week

**What to look for:**
- ✅ If `dataCount > 0` and `dec14Schedule` exists → RLS is working correctly!
- ❌ If `dataCount = 0` but schedule exists in database → RLS is blocking it (email mismatch issue)
- ❌ If `dec14Schedule` is `null` → Schedule doesn't exist OR wrong `worker_id`

**This is the ONLY reliable way to test RLS because it uses real authentication context.**

**Option C: Verify RLS Policy Exists**

```sql
-- Check if RLS policy exists and is correct
SELECT 
  policyname,
  cmd as command,
  roles,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'worker_schedules';

-- Expected: Should see "Workers can read their own schedules" policy
```

**Option D: Verify Data Matches (Pre-check before testing RLS)**

Before testing RLS, verify the data is set up correctly:

```sql
-- Step 1: Check if schedule exists
SELECT 
  ws.id,
  ws.scheduled_date,
  ws.start_time,
  ws.end_time,
  ws.worker_id,
  ws.status
FROM worker_schedules ws
WHERE ws.scheduled_date = '2025-12-14';

-- Step 2: Check if worker exists and get their ID
SELECT 
  id,
  email,
  name
FROM workers
WHERE email = 'angela08moss@gmail.com';

-- Step 3: Verify the schedule's worker_id matches the worker's id
SELECT 
  ws.id as schedule_id,
  ws.scheduled_date,
  ws.worker_id as schedule_worker_id,
  w.id as worker_table_id,
  w.email as worker_email,
  CASE 
    WHEN ws.worker_id = w.id THEN '✅ worker_id MATCHES'
    ELSE '❌ worker_id MISMATCH'
  END as match_status
FROM worker_schedules ws
LEFT JOIN workers w ON w.email = 'angela08moss@gmail.com'
WHERE ws.scheduled_date = '2025-12-14';

-- Step 4: Check if auth user exists
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'angela08moss@gmail.com';
```

**Expected Results:**
- ✅ Schedule exists for `2025-12-14`
- ✅ Worker exists with email `angela08moss@gmail.com`
- ✅ Schedule's `worker_id` = Worker's `id` (match_status shows ✅)
- ✅ Auth user exists with same email

**If all checks pass, then test RLS using Option B (from the app).**

### Step 4: Check Week View

December 14, 2025 is a **Sunday**. The week view shows Monday-Sunday, so:

- **Week containing December 14**: December 8 (Monday) - December 14 (Sunday), 2025
- **December 14 is day index 6** (Sunday = index 6 in Monday-Sunday week)

**Solution**: Navigate to the week of December 8-14, 2025

### Step 5: Test Without Date Filters

Temporarily modify `hooks/useWorkerSchedules.ts` to remove date filters:

```typescript
// Comment out date filters temporarily to see ALL schedules
// if (filters?.dateFrom) {
//   query = query.gte('scheduled_date', filters.dateFrom);
// }
// if (filters?.dateTo) {
//   query = query.lte('scheduled_date', filters.dateTo);
// }
```

This will show ALL schedules (not just current week) to verify:
1. RLS is working (you can see schedules)
2. The schedule exists in the database
3. The schedule is associated with the correct worker

### Step 6: Verify Worker Email Match

The RLS policy requires:
- `auth.users.email` = `workers.email` (case-insensitive)
- Schedule's `worker_id` matches worker's `id`

Run this SQL:

```sql
-- Check email match
SELECT 
  au.email as auth_email,
  w.email as worker_email,
  w.id as worker_id,
  LOWER(au.email) = LOWER(w.email) as emails_match
FROM auth.users au
LEFT JOIN workers w ON LOWER(au.email) = LOWER(w.email)
WHERE au.email = 'angela08moss@gmail.com';

-- Check if schedule's worker_id matches
SELECT 
  ws.id,
  ws.worker_id,
  w.id as worker_table_id,
  ws.worker_id = w.id as worker_id_matches
FROM worker_schedules ws
LEFT JOIN workers w ON ws.worker_id = w.id
WHERE ws.scheduled_date = '2024-12-14';
```

## Common Issues & Solutions

### Issue 1: Week View Not Showing December 14
**Symptom**: `includesDec14: false` in logs
**Solution**: Navigate to week December 8-14, 2025

### Issue 2: RLS Policy Blocking
**Symptom**: `dataCount: 0` but schedule exists in database
**Solution**: Verify email match between `auth.users` and `workers` table

### Issue 3: Wrong Worker ID
**Symptom**: Schedule exists but `worker_id` doesn't match logged-in worker
**Solution**: Verify schedule's `worker_id` matches worker's `id` in `workers` table

### Issue 4: Date Format Mismatch
**Symptom**: Schedule exists but date doesn't match
**Solution**: Verify `scheduled_date` is exactly `'2025-12-14'` (YYYY-MM-DD format)

## Quick Test Query

Run this to see everything at once:

```sql
-- Complete diagnostic query
SELECT 
  'Schedule exists' as check_type,
  COUNT(*) as count
FROM worker_schedules
WHERE scheduled_date = '2025-12-14'

UNION ALL

SELECT 
  'Schedule with worker_id',
  COUNT(*)
FROM worker_schedules ws
WHERE ws.scheduled_date = '2025-12-14'
AND ws.worker_id IN (SELECT id FROM workers WHERE email = 'angela08moss@gmail.com')

UNION ALL

SELECT 
  'Worker exists',
  COUNT(*)
FROM workers
WHERE email = 'angela08moss@gmail.com'

UNION ALL

SELECT 
  'Auth user exists',
  COUNT(*)
FROM auth.users
WHERE email = 'angela08moss@gmail.com';
```

This will show you:
- If schedule exists
- If schedule has correct worker_id
- If worker exists
- If auth user exists

