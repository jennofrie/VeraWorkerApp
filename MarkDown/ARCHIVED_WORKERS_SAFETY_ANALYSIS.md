# Archived/Inactive Workers Safety Analysis

## Current Implementation Status

### ✅ **App Won't Crash**
The current implementation is **safe** - archived/inactive workers will **not cause the app to crash**. Here's why:

1. **RLS Function Behavior**: The `worker_belongs_to_user()` function checks:
   ```sql
   WHERE w.id = worker_uuid
   AND LOWER(w.email) = LOWER(public.get_auth_user_email())
   ```
   - If a worker is archived but still exists in the `workers` table, the function will still return `true` if the email matches
   - The query will succeed (no error thrown)
   - Schedules will be returned if they exist

2. **Query Behavior**: The `useWorkerSchedules` hook queries `worker_schedules` table:
   - RLS policy filters by `worker_belongs_to_user(worker_id)`
   - If the worker exists and email matches, schedules are returned
   - No crash occurs even if worker is archived

### ⚠️ **Potential Issue: Archived Workers Can See Schedules**

**Scenario**: If the CRM implements soft deletes by adding an `active` or `is_active` column to the `workers` table:

- **Current Behavior**: Archived workers (`active = false`) can still see schedules
- **Reason**: RLS function doesn't check `active` status
- **Impact**: Security/data isolation concern (not a crash)

## Recommended Solution

### Option 1: Update RLS Function (Recommended - Database Level)

If the CRM adds an `active` column to `workers` table, update the `worker_belongs_to_user()` function:

```sql
-- Updated function that checks active status (if column exists)
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
    -- Check active status if column exists (gracefully handles missing column)
    AND (
      -- If active column doesn't exist, this condition is always true
      NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workers' 
        AND column_name = 'active'
      )
      OR w.active = true  -- Only check if column exists
    )
  );
END;
$$;
```

**Note**: This approach checks if the column exists before using it, preventing errors if the column hasn't been added yet.

### Option 2: Simpler Approach (If Column Always Exists)

If you're certain the `active` column will always exist:

```sql
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
    AND w.active = true  -- Only allow active workers
  );
END;
$$;
```

**Warning**: This will fail if the `active` column doesn't exist. Use Option 1 if unsure.

### Option 3: App-Level Filter (Not Recommended)

You could filter in the app, but this is less secure (RLS should handle it):

```typescript
// In useWorkerSchedules hook - NOT RECOMMENDED
// RLS should handle this at database level
```

## Verification Steps

### 1. Check if `active` column exists:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'workers'
AND column_name IN ('active', 'is_active', 'archived', 'is_archived');
```

### 2. Test RLS with archived worker:

```sql
-- As an archived worker, try to query schedules
-- Should return empty result if RLS is working correctly
SELECT * FROM worker_schedules;
```

### 3. Verify function behavior:

```sql
-- Test the function directly
SELECT public.worker_belongs_to_user('worker-uuid-here');
-- Should return false for archived workers if active column exists and is checked
```

## Current Recommendation

**Status**: ✅ **Safe to proceed** - App won't crash

**Action Required**:
1. ✅ **No immediate action needed** - Current implementation is safe
2. ⚠️ **Future consideration**: If CRM adds `active` column, update RLS function using Option 1 above
3. 📝 **Documentation**: This analysis documents the current behavior

**When to Update**:
- When CRM implements soft deletes with `active` column
- When you want to prevent archived workers from seeing schedules
- When security requirements mandate filtering inactive workers

## Summary

- ✅ **App Safety**: No crash risk - current implementation is safe
- ⚠️ **Data Isolation**: Archived workers may see schedules if `active` column isn't checked
- 🔒 **Security**: RLS should handle filtering at database level (not app level)
- 📋 **Action**: Monitor for CRM changes, update RLS function when `active` column is added

