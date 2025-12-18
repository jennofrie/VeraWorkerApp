# Analysis: Worker Schedule Viewing Feature Implementation

## ⚠️ CRITICAL ISSUES FOUND

### 1. **React Query Not Installed** ❌
**Problem:** The prompt uses `useQuery` from React Query, but the app does NOT have React Query installed.

**Current App Pattern:**
- Uses `useState` + `useEffect` with direct Supabase queries
- Example: `app/(tabs)/clock-in.tsx` uses `supabase.from('shifts').select()`

**Solution Options:**
- **Option A (Recommended):** Follow existing app pattern - use `useState` + `useEffect` instead of React Query
- **Option B:** Install React Query: `npm install @tanstack/react-query`

**Recommendation:** Use Option A to maintain consistency with existing codebase.

---

### 2. **RLS Policy Implementation Mismatch** ⚠️
**Prompt Says:** "RLS auto-filters by matching email between `auth.users` and `workers` table"

**Current App Implementation:**
- Uses `public.get_auth_user_email()` security definer function
- RLS policy: `LOWER(public.get_auth_user_email()) = LOWER(email)`
- This matches the prompt's description ✅

**Action Required:**
- Ensure `worker_schedules` table RLS policy uses the SAME pattern as `workers` table
- Must use `public.get_auth_user_email()` function (already exists)
- Policy should filter by `worker_id` matching authenticated worker's ID

**Required RLS Policy for `worker_schedules`:**
```sql
-- Enable RLS
ALTER TABLE worker_schedules ENABLE ROW LEVEL SECURITY;

-- Create policy using existing function pattern
CREATE POLICY "Workers can read their own schedules"
ON worker_schedules
FOR SELECT
TO authenticated
USING (
  -- Match worker_id by checking if worker email matches auth user email
  worker_id IN (
    SELECT id FROM workers 
    WHERE LOWER(email) = LOWER(public.get_auth_user_email())
  )
);
```

---

### 3. **Table Name Verification** ✅
**Prompt:** `worker_schedules` table
**Status:** No conflict found - app uses `shifts` table for clock-in/out, `worker_schedules` is separate

**Note:** Ensure table exists in database with exact column names specified.

---

### 4. **Column Name Verification** ⚠️
**Prompt Specifies:**
- `scheduled_date` (DATE)
- `start_time` (TIME)
- `end_time` (TIME)
- `location_name` (TEXT, nullable)
- `location_address` (TEXT, nullable)
- `notes` (TEXT, nullable)
- `status` ('scheduled' | 'confirmed' | 'cancelled')

**Action Required:**
- Verify these exact column names exist in CRM database
- Verify status enum values match exactly: 'scheduled', 'confirmed', 'cancelled'
- Check if `created_at` and `updated_at` are TIMESTAMPTZ (not DATE)

---

### 5. **Data Fetching Pattern Mismatch** ⚠️
**Prompt Uses:**
```typescript
const useWorkerSchedules = (filters?) => {
  return useQuery({ ... });
};
```

**App Currently Uses:**
```typescript
useEffect(() => {
  const fetchData = async () => {
    const { data, error } = await supabase.from('table').select();
    // handle data
  };
  fetchData();
}, []);
```

**Recommended Implementation (Following App Pattern):**
```typescript
const [schedules, setSchedules] = useState<WorkerSchedule[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let query = supabase
        .from('worker_schedules')
        .select('*')
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (filters?.dateFrom) query = query.gte('scheduled_date', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('scheduled_date', filters.dateTo);
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      const { data, error: queryError } = await query;
      
      if (queryError) throw queryError;
      setSchedules(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load schedules');
      console.error('Error fetching schedules:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  fetchSchedules();
}, [filters?.dateFrom, filters?.dateTo, filters?.status]);
```

---

### 6. **Foreign Key Relationship** ⚠️
**Prompt:** Uses `worker_id` column
**Current App:** Uses `worker_id` in `shifts` table with foreign key to `workers(id)`

**Action Required:**
- Verify `worker_schedules.worker_id` has foreign key constraint: `REFERENCES workers(id) ON DELETE CASCADE`
- This ensures data integrity and proper RLS filtering

---

### 7. **Authentication Check** ✅
**Prompt Says:** "Worker must be authenticated (RLS requires this)"
**Current App:** Already implements authentication check in `app/index.tsx`

**Action Required:**
- Ensure user is authenticated before querying schedules
- RLS will automatically fail if not authenticated (expected behavior)

---

### 8. **Status Values Case Sensitivity** ⚠️
**Prompt:** `'scheduled' | 'confirmed' | 'cancelled'` (lowercase)
**Action Required:**
- Verify database uses lowercase values
- Ensure TypeScript interface matches exactly
- Check if CRM uses different casing (e.g., 'Scheduled', 'Confirmed', 'Cancelled')

---

### 9. **Date/Time Format** ⚠️
**Prompt:**
- `scheduled_date`: string (YYYY-MM-DD)
- `start_time`: string (HH:MM:SS)
- `end_time`: string (HH:MM:SS)

**Action Required:**
- Verify Supabase returns these in the expected format
- May need to format dates/times for display
- Consider timezone handling if workers are in different timezones

---

## ✅ CORRECTED IMPLEMENTATION PATTERN

### TypeScript Interface (Keep as-is)
```typescript
interface WorkerSchedule {
  id: string;
  worker_id: string;
  scheduled_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  location_name: string | null;
  location_address: string | null;
  notes: string | null;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  created_at: string;
  updated_at: string;
}
```

### React Hook (Following App Pattern - NO React Query)
```typescript
export function useWorkerSchedules(filters?: {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}) {
  const [schedules, setSchedules] = useState<WorkerSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { supabase } = await import('@/lib/supabase');
        
        let query = supabase
          .from('worker_schedules')
          .select('*')
          .order('scheduled_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (filters?.dateFrom) {
          query = query.gte('scheduled_date', filters.dateFrom);
        }
        if (filters?.dateTo) {
          query = query.lte('scheduled_date', filters.dateTo);
        }
        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          throw queryError;
        }

        setSchedules((data as WorkerSchedule[]) || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load schedules');
        console.error('Error fetching schedules:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedules();
  }, [filters?.dateFrom, filters?.dateTo, filters?.status]);

  return { schedules, isLoading, error };
}
```

---

## 📋 PRE-IMPLEMENTATION CHECKLIST

Before implementing, verify:

- [ ] `worker_schedules` table exists in Supabase
- [ ] All column names match exactly (case-sensitive)
- [ ] `worker_id` has foreign key to `workers(id)`
- [ ] RLS is enabled on `worker_schedules` table
- [ ] RLS policy uses `public.get_auth_user_email()` function
- [ ] Status values are lowercase: 'scheduled', 'confirmed', 'cancelled'
- [ ] `created_at` and `updated_at` are TIMESTAMPTZ (not DATE)
- [ ] Test RLS: authenticated worker can only see their own schedules
- [ ] Test RLS: unauthenticated user gets permission denied

---

## 🔧 REQUIRED SQL SETUP

```sql
-- 1. Verify table exists with correct columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'worker_schedules'
ORDER BY ordinal_position;

-- 2. Enable RLS
ALTER TABLE worker_schedules ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policy (using existing function pattern)
CREATE POLICY "Workers can read their own schedules"
ON worker_schedules
FOR SELECT
TO authenticated
USING (
  worker_id IN (
    SELECT id FROM workers 
    WHERE LOWER(email) = LOWER(public.get_auth_user_email())
  )
);

-- 4. Verify policy exists
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'worker_schedules';
```

---

## 🎯 SUMMARY OF CHANGES NEEDED

1. **Remove React Query dependency** - Use `useState` + `useEffect` pattern
2. **Verify RLS policy** - Must use `public.get_auth_user_email()` function
3. **Verify column names** - Match exactly with CRM database
4. **Verify status values** - Must be lowercase
5. **Add foreign key constraint** - If not already present
6. **Test authentication** - RLS requires authenticated user

---

## ✅ WHAT'S CORRECT IN THE PROMPT

- TypeScript interface structure ✅
- RLS concept (auto-filtering) ✅
- Authentication requirement ✅
- Status enum values ✅
- Query filtering logic ✅
- UI requirements ✅

