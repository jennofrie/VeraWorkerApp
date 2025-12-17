# Timesheet December 8-14 Not Showing - Analysis

## Problem
Timesheet entries for week December 8-14 are not showing on the VeraWorkerApp.

## Data Flow Analysis

### 1. Date Range Calculation (lines 63-79)
- **Current Week**: Dec 8-14 (Monday to Sunday)
- **Week Start**: Dec 8, 2025 (Monday)
- **Week End**: Dec 14, 2025 (Sunday) - but `getWeekEnd` returns `23:59:59.999`
- **Expanded Range**: Dec 7 - Dec 15 (1 day before and after)
- **Query Filters**: 
  - `dateFrom: '2025-12-07'` → `clock_in_time >= '2025-12-07T00:00:00'`
  - `dateTo: '2025-12-15'` → `clock_in_time <= '2025-12-15T23:59:59'`

### 2. Database Entry
- **Stored Value**: `2025-12-07T22:30:00+00:00` (Dec 7, 10:30 PM UTC)
- **Local Time**: Dec 8, 9:30 AM (UTC+11 timezone)
- **Should Match**: ✅ Yes, `2025-12-07T22:30:00` >= `2025-12-07T00:00:00`

### 3. Potential Issues

#### Issue A: `getWeekEnd` Time Component
The `getWeekEnd` function returns a date with time `23:59:59.999`. When we do:
```typescript
expandedEnd.setDate(expandedEnd.getDate() + 1);
```
This adds 1 day, but the time component might cause issues when formatting.

#### Issue B: Week Range String Matching
The code creates week range strings in two places:
1. **In `timesheetData` useMemo** (line 218): Creates week range for each entry
2. **In display logic** (line 354): Creates week range for current week

These must match exactly for entries to show. The format is:
- `"Mon, Dec 08 - Sun, Dec 14"` (from timesheetData)
- `"Mon, Dec 08 - Sun, Dec 14"` (from currentWeekTotal)

#### Issue C: Date Expansion Logic
When expanding the end date:
```typescript
const expandedEnd = new Date(weekEnd);
expandedEnd.setDate(expandedEnd.getDate() + 1);
```
If `weekEnd` is `Dec 14, 23:59:59.999`, adding 1 day gives `Dec 15, 23:59:59.999`.
But `formatDateForQuery` only uses the date part, so this should be fine.

#### Issue D: Week Key Calculation
The week key is calculated from the local date:
- Entry date (local): Dec 8, 2025
- Week start (Monday): Dec 8, 2025
- Week key: `"2025-12-08"`

But the current week start might be calculated differently if `currentWeekStart` state is not Dec 8.

## Debugging Steps

1. **Check if data is being fetched**: Add logging to see if timesheets array has entries
2. **Check week grouping**: Verify that entries are being grouped into the correct week
3. **Check week range matching**: Ensure the week range strings match exactly
4. **Check date expansion**: Verify that the expanded date range includes the entry

## Most Likely Cause

The issue is likely in the **week range string matching**. The code creates week ranges in multiple places and they must match exactly. A single character difference (like spacing, capitalization, or date format) will cause the match to fail.

