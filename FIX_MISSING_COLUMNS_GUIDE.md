# Fix: Missing Columns in Shifts Table

## Problem
Seeing logs:
- "Location columns not found, retrying without location"
- "Some columns not found, retrying with minimal data"

## Root Cause
Your `shifts` table is missing some columns that the app expects:
- `clock_in_lat` / `clock_in_lng` (location when clocking in)
- `clock_out_lat` / `clock_out_lng` (location when clocking out)
- `shift_duration` (calculated duration of shift)
- `shift_notes` (notes entered when clocking out)

## Solution

### Step 1: Add Missing Columns

Run this SQL in Supabase SQL Editor:

```sql
-- Add Missing Columns to Shifts Table
-- Safe to run multiple times (uses IF NOT EXISTS)

-- Add clock_in location columns
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS clock_in_lat DECIMAL;

ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS clock_in_lng DECIMAL;

-- Add clock_out location columns
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS clock_out_lat DECIMAL;

ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS clock_out_lng DECIMAL;

-- Add shift_duration column
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS shift_duration TEXT;

-- Add shift_notes column
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS shift_notes TEXT;
```

### Step 2: Verify Columns Were Added

Run this query to check:

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'shifts'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` (UUID)
- `worker_id` (UUID)
- `clock_in_time` (TIMESTAMPTZ)
- `clock_in_lat` (DECIMAL) ✅
- `clock_in_lng` (DECIMAL) ✅
- `clock_out_time` (TIMESTAMPTZ)
- `clock_out_lat` (DECIMAL) ✅
- `clock_out_lng` (DECIMAL) ✅
- `shift_notes` (TEXT) ✅
- `shift_duration` (TEXT) ✅
- `created_at` (TIMESTAMPTZ)

### Step 3: Test the App

After adding columns:
1. Restart your app: `npm start`
2. Clock in → Should save location (if GPS available)
3. Clock out → Should save location, duration, and notes
4. Check logs → Should NOT see "columns not found" messages

---

## What Each Column Does

| Column | Purpose | Format |
|--------|---------|--------|
| `clock_in_lat` | Latitude when clocking in | Decimal (e.g., -37.8136) |
| `clock_in_lng` | Longitude when clocking in | Decimal (e.g., 144.9631) |
| `clock_out_lat` | Latitude when clocking out | Decimal |
| `clock_out_lng` | Longitude when clocking out | Decimal |
| `shift_duration` | Calculated shift duration | TEXT (HH:MM:SS format) |
| `shift_notes` | Notes entered when clocking out | TEXT |

---

## Why This Happens

The app was designed with these columns in mind, but if you created the `shifts` table manually or with an older schema, these columns might be missing. The app has fallback logic to work without them, but adding them enables full functionality.

---

## After Adding Columns

✅ Location tracking will work (if GPS permissions granted)
✅ Shift duration will be saved
✅ Shift notes will be saved
✅ No more "columns not found" warnings in logs

---

## Files

- `ADD_MISSING_SHIFT_COLUMNS.sql` - SQL script to add columns
- `FIX_MISSING_COLUMNS_GUIDE.md` - This guide

Run the SQL script and the warnings will disappear!

