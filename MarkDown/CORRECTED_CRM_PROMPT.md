# CORRECTED: Worker Schedule Viewing Feature - Implementation Request

## CONTEXT & BACKGROUND

The Vera Link CRM dashboard has been updated to allow admins to create and assign schedules to workers. These schedules are stored in a new Supabase table called `worker_schedules`. The mobile app needs to display these schedules to workers so they can see their assigned work shifts.

## DATABASE STRUCTURE

### Table: `worker_schedules`

**Columns:**
- `id` (UUID, PRIMARY KEY)
- `worker_id` (UUID, REFERENCES workers(id) ON DELETE CASCADE)
- `scheduled_date` (DATE) - Format: YYYY-MM-DD
- `start_time` (TIME) - Format: HH:MM:SS (e.g., "09:00:00")
- `end_time` (TIME) - Format: HH:MM:SS (e.g., "17:00:00")
- `location_name` (TEXT, nullable) - e.g., "Client A's Home"
- `location_address` (TEXT, nullable) - e.g., "123 Main St, City"
- `notes` (TEXT, nullable) - Additional instructions
- `status` (TEXT) - Values: 'scheduled' (default), 'confirmed', 'cancelled'
- `created_by` (UUID, nullable) - Admin who created it (optional, for tracking)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## ROW LEVEL SECURITY (RLS) - CRITICAL

**IMPORTANT**: The mobile app uses a specific RLS policy pattern that MUST be implemented exactly as specified below.

**RLS Policy Name**: "Workers can read their own schedules"

**RLS Policy Implementation**:
```sql
-- Enable RLS
ALTER TABLE worker_schedules ENABLE ROW LEVEL SECURITY;

-- Create policy using worker_belongs_to_user() function
-- This function already exists in the mobile app's database
CREATE POLICY "Workers can read their own schedules"
ON worker_schedules
FOR SELECT
TO authenticated
USING (
  public.worker_belongs_to_user(worker_id)
);
```

**Required Functions** (should already exist, but create if missing):
```sql
-- Function 1: Get authenticated user's email
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

GRANT EXECUTE ON FUNCTION public.get_auth_user_email() TO authenticated;

-- Function 2: Check if worker belongs to authenticated user
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

GRANT EXECUTE ON FUNCTION public.worker_belongs_to_user(UUID) TO authenticated;
```

**Why This Pattern?**
- Consistent with the mobile app's `shifts` table RLS policy
- More secure than direct email matching
- Reusable function pattern already established
- Ensures workers only see schedules where `worker_id` matches their authenticated worker record

**Critical**: Worker's email in `auth.users` MUST match email in `workers` table for RLS to work.

## DATA FLOW
```
CRM Dashboard (Admin)
↓ [Creates schedule via UI]
Supabase Database (worker_schedules table)
↓ [RLS Policy filters by worker_id using worker_belongs_to_user()]
Mobile App (Worker queries schedules)
↓ [RLS returns only worker's schedules]
Worker sees their assigned schedules
```

## IMPLEMENTATION REQUIREMENTS

### 1. TypeScript Interface

The mobile app expects this interface (includes `created_by` if your CRM tracks it):

```typescript
export interface WorkerSchedule {
  id: string;
  worker_id: string;
  scheduled_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  location_name: string | null;
  location_address: string | null;
  notes: string | null;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  created_by: string | null; // Optional: if CRM tracks creator
  created_at: string;
  updated_at: string;
}
```

### 2. Mobile App Implementation Status

**Already Implemented:**
- ✅ Data fetching hook using `useState + useEffect` pattern
- ✅ UI component for displaying schedules
- ✅ Date/time formatting utilities
- ✅ Loading, error, and empty states
- ✅ Week view with navigation

**What Mobile App Does:**
- Queries `worker_schedules` table
- RLS automatically filters to worker's own schedules
- Displays schedules in week view format
- Formats dates/times for display
- Handles all error states

### 3. Query Pattern (Mobile App Uses)

The mobile app queries like this:

```typescript
const { data, error } = await supabase
  .from('worker_schedules')
  .select('*')
  .order('scheduled_date', { ascending: true })
  .order('start_time', { ascending: true });
```

**Optional Filters** (mobile app supports but doesn't require):
- Date range filtering (dateFrom, dateTo)
- Status filtering (scheduled, confirmed, cancelled)

**RLS automatically filters** - no manual filtering needed in query.

### 4. Security Requirements

**Read-Only Access:**
- ✅ Workers can ONLY read (SELECT) their own schedules
- ❌ Workers CANNOT insert schedules
- ❌ Workers CANNOT update schedules
- ❌ Workers CANNOT delete schedules
- ✅ Only CRM admins can create/modify schedules

**RLS Policy Verification:**
After creating the RLS policy, verify it works:
```sql
-- Should return 1 policy
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'worker_schedules';

-- Expected:
-- policyname: "Workers can read their own schedules"
-- cmd: SELECT
-- roles: authenticated
```

### 5. Testing Requirements

**Before Mobile App Can Test:**

1. **Create test schedules** for at least one worker
2. **Verify RLS policy** - worker can only see their own schedules
3. **Verify email matching** - worker email in `auth.users` matches `workers.email`
4. **Test with multiple workers** - ensure data isolation works

**Test Query (Run as authenticated worker):**
```sql
-- This should only return schedules for the authenticated worker
SELECT * FROM worker_schedules
ORDER BY scheduled_date, start_time;
```

## INTEGRATION CHECKLIST

**CRM Side:**
- [ ] `worker_schedules` table created with all columns
- [ ] Foreign key constraint: `worker_id REFERENCES workers(id) ON DELETE CASCADE`
- [ ] RLS enabled on `worker_schedules` table
- [ ] RLS policy created using `worker_belongs_to_user()` function
- [ ] `public.get_auth_user_email()` function exists
- [ ] `public.worker_belongs_to_user()` function exists
- [ ] Test schedules created for workers
- [ ] RLS policy tested and verified

**Mobile App Side:**
- [x] TypeScript interface defined
- [x] Data fetching hook implemented
- [x] UI component implemented
- [x] Date/time formatting implemented
- [x] Error handling implemented
- [ ] Ready to test once CRM creates schedules

## KEY DIFFERENCES FROM GENERIC PROMPTS

1. **RLS Policy**: Uses `worker_belongs_to_user()` function (not direct email matching)
2. **Date Formatting**: Mobile app uses custom utilities (not date-fns library)
3. **Status Filtering**: Optional in mobile app (not required in query)
4. **Real-time Updates**: Not implemented yet (can be added later)

## SUMMARY

**What CRM Needs to Do:**
1. Create `worker_schedules` table with specified columns
2. Implement RLS policy using `worker_belongs_to_user()` function
3. Create test schedules for workers
4. Verify RLS works correctly

**What Mobile App Already Has:**
- Complete implementation ready to consume schedules
- Proper error handling and loading states
- Week view UI for displaying schedules
- Date/time formatting utilities

**Security:**
- ✅ Read-only access for workers
- ✅ RLS ensures data isolation
- ✅ Workers only see their own schedules
- ✅ No ability to modify schedules from mobile app

