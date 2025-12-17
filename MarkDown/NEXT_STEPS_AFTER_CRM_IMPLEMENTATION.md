# Next Steps: After CRM Implementation

## ✅ CRM Implementation Complete

The CRM has implemented the `worker_schedules` table and RLS policies. Now let's verify and test the integration.

## Step 1: Update TypeScript Interface (If Needed)

**Check if CRM includes `created_by` field:**

1. Run this SQL in Supabase to check table structure:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'worker_schedules'
ORDER BY ordinal_position;
```

2. **If `created_by` column exists**, update the interface:

**File:** `types/schedule.ts`

Add `created_by` field:
```typescript
export interface WorkerSchedule {
  id: string;
  worker_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  location_name: string | null;
  location_address: string | null;
  notes: string | null;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  created_by: string | null; // ADD THIS if CRM includes it
  created_at: string;
  updated_at: string;
}
```

## Step 2: Verify RLS Policy

**Run this SQL in Supabase SQL Editor:**

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'worker_schedules';

-- Verify policy exists
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'worker_schedules';

-- Expected result:
-- policyname: "Workers can read their own schedules"
-- cmd: SELECT
-- roles: authenticated
```

**Verify functions exist:**
```sql
-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_auth_user_email', 'worker_belongs_to_user');
```

## Step 3: Create Test Data

**Have CRM create test schedules for workers:**

```sql
-- Example: Create a test schedule for a worker
-- Replace 'worker-uuid-here' with actual worker_id from workers table
INSERT INTO worker_schedules (
  worker_id,
  scheduled_date,
  start_time,
  end_time,
  location_name,
  location_address,
  notes,
  status
) VALUES (
  'worker-uuid-here', -- Get from: SELECT id FROM workers WHERE email = 'worker@example.com';
  '2024-12-16', -- Today or future date
  '09:00:00',
  '17:00:00',
  'Client A Home',
  '123 Main St, City',
  'Regular shift',
  'scheduled'
);
```

**Verify test data:**
```sql
-- Check schedules exist
SELECT * FROM worker_schedules ORDER BY scheduled_date, start_time;
```

## Step 4: Test Authentication & Email Matching

**Critical**: Worker's email must match between `auth.users` and `workers` table.

**Verify email matching:**
```sql
-- Check if worker emails match
SELECT 
  au.email as auth_email,
  w.email as worker_email,
  w.id as worker_id,
  LOWER(au.email) = LOWER(w.email) as emails_match
FROM auth.users au
LEFT JOIN workers w ON LOWER(au.email) = LOWER(w.email)
WHERE au.email IS NOT NULL;
```

**All rows should show `emails_match = true`**

## Step 5: Test Mobile App

### 5.1 Start Development Server

```powershell
cd C:\Users\jenno\Desktop\Cursor\VeraWorkerApp\VeraWorkerApp
npm start
```

### 5.2 Test Checklist

1. **Login Test:**
   - [ ] Login with worker credentials
   - [ ] Verify login succeeds
   - [ ] Check console for any errors

2. **Schedule Screen Test:**
   - [ ] Navigate to Schedule tab/screen
   - [ ] Verify schedules load (should see test schedules)
   - [ ] Check loading state appears briefly
   - [ ] Verify schedules display correctly

3. **Data Display Test:**
   - [ ] Dates format correctly (e.g., "Mon", "15", "Dec")
   - [ ] Times format correctly (e.g., "9:00 AM - 5:00 PM")
   - [ ] Location names display if available
   - [ ] Week navigation works (prev/next buttons)
   - [ ] "Today" button works

4. **Error Handling Test:**
   - [ ] Empty state shows when no schedules
   - [ ] Error message shows if query fails
   - [ ] Pull-to-refresh works

5. **Security Test:**
   - [ ] Login as Worker A - see only Worker A's schedules
   - [ ] Login as Worker B - see only Worker B's schedules
   - [ ] Verify workers cannot see each other's schedules

## Step 6: Troubleshooting

### Issue: "Permission denied" error

**Solution:**
1. Verify RLS policy exists (Step 2)
2. Verify functions exist (Step 2)
3. Verify email matching (Step 4)
4. Check if worker is authenticated:
```sql
-- In Supabase Dashboard → Authentication → Users
-- Verify worker email exists and matches workers table
```

### Issue: No schedules showing

**Possible causes:**
1. No schedules created for worker
2. Schedules are in past (check date range)
3. Status filter excluding schedules
4. RLS blocking access

**Debug:**
```sql
-- Check what schedules exist
SELECT * FROM worker_schedules;

-- Check if RLS is blocking (run as authenticated user)
SELECT * FROM worker_schedules;
-- Should only return schedules for authenticated worker
```

### Issue: Schedules show but dates/times wrong

**Check:**
1. Date format: Should be YYYY-MM-DD
2. Time format: Should be HH:MM:SS
3. Timezone: Check if timezone conversion needed

## Step 7: Production Readiness Checklist

Before deploying to production:

- [ ] RLS policy verified and tested
- [ ] Test schedules created and visible
- [ ] Multiple workers tested (data isolation verified)
- [ ] Error handling works correctly
- [ ] Empty state displays properly
- [ ] Loading states work
- [ ] Date/time formatting correct
- [ ] Week navigation works
- [ ] Pull-to-refresh works
- [ ] No console errors
- [ ] Performance acceptable (schedules load quickly)

## Step 8: Optional Enhancements

Consider adding later:

1. **Real-time Updates:**
   - Supabase real-time subscriptions
   - Auto-refresh when CRM creates/modifies schedules

2. **Schedule Details View:**
   - Tap schedule to see full details
   - Show notes, location address, etc.

3. **Filtering:**
   - Filter by status (scheduled, confirmed, cancelled)
   - Filter by date range

4. **Notifications:**
   - Notify workers of new schedules
   - Notify of schedule changes/cancellations

## Quick Test Commands

```powershell
# 1. Start app
npm start

# 2. Open in web browser (press 'w')
# Or scan QR code with Expo Go app

# 3. Login with worker credentials

# 4. Navigate to Schedule screen

# 5. Verify schedules appear
```

## Support & Debugging

**If issues occur:**

1. Check browser/app console for errors
2. Check Supabase Dashboard → Logs for database errors
3. Verify RLS policy matches exactly
4. Verify email matching between auth.users and workers
5. Test with a simple query first:
```sql
-- Run as authenticated worker
SELECT COUNT(*) FROM worker_schedules;
-- Should return count of worker's schedules only
```

## Success Criteria

✅ **Integration is successful when:**
- Workers can login
- Schedule screen loads without errors
- Workers see their assigned schedules
- Workers cannot see other workers' schedules
- Dates and times display correctly
- Empty state shows when no schedules
- Error handling works for failures

---

**Next:** Once verified, you can deploy to production and start using the schedule feature!

