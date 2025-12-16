import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { WorkerSchedule } from '@/types/schedule';

interface UseWorkerSchedulesFilters {
  dateFrom?: string; // YYYY-MM-DD format
  dateTo?: string; // YYYY-MM-DD format
  status?: string; // 'scheduled' | 'confirmed' | 'cancelled' | 'all'
}

interface UseWorkerSchedulesReturn {
  schedules: WorkerSchedule[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch worker schedules from Supabase
 * Follows the app's pattern of using useState + useEffect (not React Query)
 * 
 * @param filters - Optional filters for date range and status
 * @returns Object containing schedules, loading state, error, and refetch function
 */
export function useWorkerSchedules(
  filters?: UseWorkerSchedulesFilters
): UseWorkerSchedulesReturn {
  const [schedules, setSchedules] = useState<WorkerSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);


      // Build the query
      let query = supabase
        .from('worker_schedules')
        .select('*')
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Apply filters if provided
      if (filters?.dateFrom) {
        query = query.gte('scheduled_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('scheduled_date', filters.dateTo);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Execute query
      const { data, error: queryError } = await query;

      if (queryError) {
        if (__DEV__) {
          console.error('[useWorkerSchedules] Query error:', queryError.message);
        }
        throw queryError;
      }

      // Set schedules data
      setSchedules((data as WorkerSchedule[]) || []);
    } catch (err: any) {
      if (__DEV__) {
        console.error('Error fetching worker schedules:', err);
      }
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to load schedules. Please try again.';
      
      // Handle AbortError (timeout)
      if (err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('AbortError')) {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      } else if (err?.code === 'PGRST301' || err?.message?.includes('permission denied')) {
        errorMessage = 'Permission denied. Please ensure you are logged in.';
      } else if (err?.message?.includes('network') || err?.message?.includes('fetch failed')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      // Don't clear schedules on error - keep existing data if available
      // setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters?.dateFrom, filters?.dateTo, filters?.status]);

  // Fetch schedules when component mounts or filters change
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  return {
    schedules,
    isLoading,
    error,
    refetch: fetchSchedules,
  };
}

