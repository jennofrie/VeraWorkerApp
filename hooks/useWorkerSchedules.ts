import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { WorkerSchedule } from '@/types/schedule';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Debug: Get current user info
      const { data: { session } } = await supabase.auth.getSession();
      const storedWorkerId = await AsyncStorage.getItem('@veralink:workerId');
      const storedWorkerEmail = await AsyncStorage.getItem('@veralink:workerEmail');

      // Debug: Log filters being used
      console.log('[useWorkerSchedules] Fetching schedules with filters:');
      console.log('  Date range:', filters?.dateFrom, 'to', filters?.dateTo);
      console.log('  Includes Dec 14?', filters?.dateFrom && filters?.dateTo 
        ? (filters.dateFrom <= '2025-12-14' && filters.dateTo >= '2025-12-14' ? '✅ YES' : '❌ NO')
        : 'N/A');
      console.log('  Auth user email:', session?.user?.email || 'NOT LOGGED IN');
      console.log('  Stored worker ID:', storedWorkerId || 'NOT FOUND');
      console.log('  Stored worker email:', storedWorkerEmail || 'NOT FOUND');

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

      // Debug: Log results
      const dec14Schedule = data?.find((s: any) => s.scheduled_date === '2025-12-14');
      const allDates = data?.map((s: any) => s.scheduled_date).sort() || [];
      
      console.log('[useWorkerSchedules] Query result:');
      console.log('  Total schedules returned:', data?.length || 0);
      console.log('  All dates in results:', allDates.join(', ') || 'NONE');
      console.log('  December 14 schedule:', dec14Schedule ? '✅ FOUND' : '❌ NOT FOUND');
      
      if (queryError) {
        console.error('  ❌ Query ERROR:', {
          message: queryError.message,
          code: queryError.code,
          details: queryError.details,
          hint: queryError.hint,
        });
      }
      
      if (dec14Schedule) {
        console.log('  ✅ December 14 schedule details:', {
          id: dec14Schedule.id,
          scheduled_date: dec14Schedule.scheduled_date,
          start_time: dec14Schedule.start_time,
          end_time: dec14Schedule.end_time,
          worker_id: dec14Schedule.worker_id,
        });
      } else if (data && data.length > 0) {
        console.warn('  ⚠️ December 14 NOT in results, but other dates returned');
        console.warn('  ⚠️ Check date range filter - might be querying wrong week');
      } else if (!queryError) {
        console.warn('  ⚠️ NO schedules returned (no error)');
        console.warn('  ⚠️ Possible causes:');
        console.warn('     - RLS policy blocking (check email match)');
        console.warn('     - Wrong worker_id in schedule');
        console.warn('     - Date range doesn\'t include Dec 14');
        console.warn('     - No schedules exist for this worker');
      }

      if (queryError) {
        console.error('[useWorkerSchedules] Query error details:', {
          message: queryError.message,
          code: queryError.code,
          details: queryError.details,
          hint: queryError.hint,
        });
        throw queryError;
      }

      // Set schedules data
      setSchedules((data as WorkerSchedule[]) || []);
    } catch (err: any) {
      console.error('Error fetching worker schedules:', err);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to load schedules. Please try again.';
      
      if (err?.code === 'PGRST301' || err?.message?.includes('permission denied')) {
        errorMessage = 'Permission denied. Please ensure you are logged in.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch schedules when component mounts or filters change
  useEffect(() => {
    fetchSchedules();
  }, [filters?.dateFrom, filters?.dateTo, filters?.status]);

  return {
    schedules,
    isLoading,
    error,
    refetch: fetchSchedules,
  };
}

