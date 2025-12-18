# Troubleshooting: Schedule Not Showing in App

## Problem
Schedule for "angela08moss@gmail.com" on December 14 was created in CRM but not showing in the mobile app.

## Common Causes & Solutions

### 1. **Week View Filter** ⚠️ MOST LIKELY
**Problem**: The schedule screen only shows the current week (Monday-Sunday). December 14 might be outside the visible week.

**Solution**: 
- Navigate to the week containing December 14 using the "Prev" button in the schedule screen
- Or check if December 14 is within the current week range

**How to Check**:
- Look at the week range displayed at the top of the schedule screen
- December 14, 2024 falls on a Saturday
- The week view shows Monday-Sunday, so you need to navigate to the week that contains December 14

---

### 2. **RLS Policy - Email Mismatch** 🔒
**Problem**: The RLS policy checks if the worker's email matches the authenticated user's email. If they don't match exactly, schedules won't show.

**How RLS Works**:
```sql
-- The RLS policy uses this function:
worker_belongs_to_user(worker_id)

-- Which checks:
-- 1. Get authenticated user's email from auth.users
-- 2. Check if worker.email matches auth.users.email (case-insensitive)
-- 3. Only return schedules where worker_id matches
```

**Solution**: Verify email matches:
1. Check Supabase Dashboard → Authentication → Users
   - Find user with email: `angela08moss@gmail.com`
   - Note the exact email (case, spaces, etc.)

2. Check Supabase Dashboard → Table Editor → `workers`
   - Find worker with email: `angela08moss@gmail.com`
   - Verify emails match EXACTLY (case-insensitive is OK, but no extra spaces)

3. Check the schedule's `worker_id`:
   ```sql
   -- Run this in Supabase SQL Editor:
   SELECT 
     ws.id,
     ws.scheduled_date,
     ws.start_time,
     ws.end_time,
     ws.worker_id,
     w.email as worker_email,
     w.name as worker_name
   FROM worker_schedules ws
   LEFT JOIN workers w ON ws.worker_id = w.id
   WHERE w.email = 'angela08moss@gmail.com'
   AND ws.scheduled_date = '2024-12-14';
   ```

---

### 3. **Worker ID Mismatch** 🔑
**Problem**: The schedule was created with a `worker_id` that doesn't match the logged-in worker.

**Solution**: Verify the schedule's `worker_id` matches the worker's ID:
```sql
-- Get worker ID for angela08moss@gmail.com
SELECT id, email, name 
FROM workers 
WHERE email = 'angela08moss@gmail.com';

-- Check if schedule uses this worker_id
SELECT 
  id,
  scheduled_date,
  worker_id,
  (SELECT email FROM workers WHERE id = worker_schedules.worker_id) as worker_email
FROM worker_schedules
WHERE scheduled_date = '2024-12-14';
```

---

### 4. **Date Format Issue** 📅
**Problem**: Date might be stored in wrong format or timezone.

**Solution**: Verify date format:
```sql
-- Check the exact date stored
SELECT 
  id,
  scheduled_date,
  scheduled_date::text as date_text,
  start_time,
  end_time
FROM worker_schedules
WHERE scheduled_date = '2024-12-14';
```

**Expected Format**: `YYYY-MM-DD` (e.g., `2024-12-14`)

---

### 5. **Status Filter** 🏷️
**Problem**: Schedule might have status 'cancelled' and is being filtered out.

**Solution**: Check schedule status:
```sql
SELECT id, scheduled_date, status 
FROM worker_schedules 
WHERE scheduled_date = '2024-12-14';
```

**Valid Statuses**: `'scheduled'`, `'confirmed'`, `'cancelled'`
- The app shows all statuses by default, but check if status is set correctly

---

## Debugging Steps

### Step 1: Check Console Logs
1. Open the app in development mode
2. Open browser console (web) or React Native debugger (mobile)
3. Look for `[useWorkerSchedules]` logs
4. Check:
   - What date range is being queried?
   - How many schedules are returned?
   - Any error messages?

### Step 2: Test Without Date Filters
Temporarily modify `hooks/useWorkerSchedules.ts` to remove date filters:
```typescript
// Comment out date filters temporarily
// if (filters?.dateFrom) {
//   query = query.gte('scheduled_date', filters.dateFrom);
// }
// if (filters?.dateTo) {
//   query = query.lte('scheduled_date', filters.dateTo);
// }
```

This will show ALL schedules (not just current week) to verify RLS is working.

### Step 3: Verify RLS Policy
Run this in Supabase SQL Editor:
```sql
-- Check if RLS policy exists
SELECT 
  policyname,
  cmd as command,
  roles,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'worker_schedules';

-- Expected: Should see "Workers can read their own schedules"
```

### Step 4: Test RLS Policy Directly
```sql
-- Simulate what the app does (replace with actual auth user email)
-- This tests if RLS would allow the query
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = (SELECT id FROM auth.users WHERE email = 'angela08moss@gmail.com' LIMIT 1);

SELECT * FROM worker_schedules 
WHERE scheduled_date = '2024-12-14';
```

---

## Quick Fix Checklist

- [ ] Navigate to the week containing December 14 in the app
- [ ] Verify `angela08moss@gmail.com` exists in `auth.users` table
- [ ] Verify `angela08moss@gmail.com` exists in `workers` table
- [ ] Verify emails match exactly (case-insensitive OK)
- [ ] Verify schedule's `worker_id` matches worker's `id`
- [ ] Verify schedule's `scheduled_date` is `2024-12-14` (YYYY-MM-DD format)
- [ ] Check console logs for error messages
- [ ] Verify RLS policy exists and is correct

---

## Most Likely Solution

**90% chance it's the week view filter**. The schedule screen only shows the current week. December 14 might be in a different week. 

**Fix**: Navigate to the week containing December 14 using the "Prev" button in the schedule screen.

