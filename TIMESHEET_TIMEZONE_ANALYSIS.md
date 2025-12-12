# Timesheet Timezone Issue Analysis

## Problem Statement
A schedule set in the CRM for **December 8, 9:30 AM - 12:30 PM** is displaying differently in the Vera Worker App Timesheet section.

## Root Cause Analysis

### How Supabase Stores TIMESTAMPTZ
1. **CRM Input**: Admin enters "Dec 8, 9:30 AM" in the CRM (assumed to be in CRM's local timezone, e.g., UTC+11)
2. **Database Storage**: Supabase converts this to UTC before storing
   - Example: `2025-12-08T09:30:00+11:00` → Stored as `2025-12-07T22:30:00+00:00` (UTC)
3. **App Retrieval**: When the app fetches the data, Supabase returns the UTC timestamp
4. **Current Parsing**: The app extracts the UTC time component (`22:30:00`) and displays it directly
5. **Result**: Shows "10:30 PM" instead of "9:30 AM"

### Current Code Behavior

**Previous Approach (WRONG):**
```typescript
// Extracts UTC time directly: "22:30:00" from "2025-12-07T22:30:00+00:00"
clockInTimeStr = timePart.split(/[+\-Z]/)[0]; // "22:30:00"
startTime = formatScheduleTime(clockInTimeStr); // "10:30 PM" ❌
```

**New Approach (CORRECT):**
```typescript
// Parse full ISO string to Date object (handles timezone conversion)
const clockInDateObj = new Date(clockInTime); // Converts UTC to device local time
const clockInHours = clockInDateObj.getHours(); // Gets local hours
startTime = formatScheduleTime(`${clockInHours}:${clockInMinutes}:00`); // "9:30 AM" ✅
```

## Solution Implemented

The code now:
1. Parses the full ISO timestamp string using `new Date(clockInTime)`
2. Extracts LOCAL time components using `getHours()`, `getMinutes()`, `getDate()`, etc.
3. Displays these local components directly

## Important Assumption

**This solution assumes your device timezone matches the CRM's timezone.**

If your device is in UTC+11 and the CRM is also in UTC+11, the times will display correctly.

## If Times Are Still Wrong

If the times are still incorrect after this fix, it means:
- Your device timezone ≠ CRM timezone
- OR the CRM is storing times in a different timezone than expected

### Diagnostic Steps

1. **Check Debug Logs**: The app now logs:
   - Raw timestamp from database
   - Parsed local time components
   - Device timezone offset

2. **Verify in Supabase**: Run this query to see what's actually stored:
   ```sql
   SELECT 
     id,
     clock_in_time,
     clock_out_time,
     clock_in_time AT TIME ZONE 'UTC' AS clock_in_utc,
     clock_in_time AT TIME ZONE 'Australia/Sydney' AS clock_in_sydney -- Adjust to your CRM timezone
   FROM timesheets
   WHERE worker_id = 'YOUR_WORKER_ID'
   ORDER BY clock_in_time DESC
   LIMIT 5;
   ```

3. **Check Device Timezone**: The debug log shows `getTimezoneOffset()` which indicates your device's timezone offset from UTC.

## Alternative Solutions (If Needed)

### Option 1: Store Timezone with Entry
Add a `timezone` column to the `timesheets` table and store the CRM's timezone when creating entries.

### Option 2: Use Fixed Timezone for Display
If you know the CRM always uses a specific timezone (e.g., "Australia/Sydney"), convert all times to that timezone for display:

```typescript
// Convert UTC to specific timezone
const utcDate = new Date(clockInTime);
const localDate = new Date(utcDate.toLocaleString("en-US", {timeZone: "Australia/Sydney"}));
```

### Option 3: Store Times as TIME Type
Instead of TIMESTAMPTZ, store times as separate DATE and TIME columns to avoid timezone conversion entirely.

## Next Steps

1. **Test the current fix** - Check if times now display correctly
2. **Review debug logs** - Check console output to see what values are being parsed
3. **Verify CRM timezone** - Confirm what timezone your CRM uses when entering times
4. **If still wrong** - Implement one of the alternative solutions above

