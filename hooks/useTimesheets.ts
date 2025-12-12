import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface Timesheet {
  id: string;
  worker_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  shift_duration: string | null; // INTERVAL type from DB
  shift_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface UseTimesheetsFilters {
  workerId?: string;
  dateFrom?: string; // YYYY-MM-DD format
  dateTo?: string; // YYYY-MM-DD format
  completedOnly?: boolean; // Only show timesheets with clock_out_time
}

interface UseTimesheetsReturn {
  timesheets: Timesheet[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch admin-added timesheets from Supabase
 * Follows the app's pattern of using useState + useEffect (not React Query)
 * 
 * @param filters - Optional filters for worker_id, date range, and completion status
 * @returns Object containing timesheets, loading state, error, and refetch function
 */
export function useTimesheets(
  filters?: UseTimesheetsFilters
): UseTimesheetsReturn {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isRefreshingRef = useRef(false);
  const isFetchingRef = useRef(false);

  const fetchTimesheets = useCallback(async (isRefresh = false) => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current && !isRefresh) {
      return;
    }
    
    isFetchingRef.current = true;
    try {
      // Track refresh state
      isRefreshingRef.current = isRefresh;
      
      // Only set loading state on initial load, never during refresh
      if (!isRefresh) {
        setIsLoading(true);
        setError(null);
      }

      // Build the query
      let query = supabase
        .from('timesheets')
        .select('*')
        .order('clock_in_time', { ascending: false }); // Most recent first

      // Apply filters if provided
      if (filters?.workerId) {
        query = query.eq('worker_id', filters.workerId);
      }
      
      if (filters?.completedOnly) {
        query = query.not('clock_out_time', 'is', null);
      }

      // Date filters (based on clock_in_time)
      if (filters?.dateFrom) {
        query = query.gte('clock_in_time', `${filters.dateFrom}T00:00:00`);
      }
      if (filters?.dateTo) {
        query = query.lte('clock_in_time', `${filters.dateTo}T23:59:59`);
      }

      // Execute query
      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('[useTimesheets] Query error:', queryError.message);
        throw queryError;
      }

      // Set timesheets data atomically to prevent partial updates
      setTimesheets((data as Timesheet[]) || []);
      
      // Clear error on success
      setError(null);
    } catch (err: any) {
      console.error('Error fetching timesheets:', err);
      
      // Only set error on initial load, not during refresh (to prevent UI jumps)
      if (!isRefresh) {
        let errorMessage = 'Failed to load timesheets. Please try again.';
        
        if (err?.code === 'PGRST301' || err?.message?.includes('permission denied')) {
          errorMessage = 'Permission denied. Please ensure you are logged in.';
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        setTimesheets([]);
      }
      // During refresh, silently fail and keep existing data
    } finally {
      // Only update loading state if not refreshing
      if (!isRefreshingRef.current) {
        setIsLoading(false);
      }
      isRefreshingRef.current = false;
      isFetchingRef.current = false;
    }
  }, [filters?.workerId, filters?.dateFrom, filters?.dateTo, filters?.completedOnly]);

  // Fetch timesheets when component mounts or filters change
  useEffect(() => {
    fetchTimesheets(false);
  }, [fetchTimesheets]);

  // Memoize refetch to prevent infinite loops
  const refetch = useCallback(async () => {
    await fetchTimesheets(true);
  }, [fetchTimesheets]);

  return {
    timesheets,
    isLoading,
    error,
    refetch,
  };
}

