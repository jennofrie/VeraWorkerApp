/**
 * WorkerSchedule interface matching the worker_schedules table schema
 * from the CRM database
 * 
 * Status values:
 * - 'BOOKED': Future shift, not started yet
 * - 'STARTED': Currently in progress (clocked in)
 * - 'COMPLETED': Shift finished (clocked out)
 */
export interface WorkerSchedule {
  id: string;
  worker_id: string;
  scheduled_date: string; // YYYY-MM-DD format
  start_time: string; // HH:MM:SS format (scheduled start)
  end_time: string; // HH:MM:SS format (scheduled end)
  location_name: string | null;
  location_address: string | null;
  notes: string | null; // Shift notes (updated on clock out)
  status: 'BOOKED' | 'STARTED' | 'COMPLETED';
  actual_start_time: string | null; // TIMESTAMPTZ - when worker actually clocked in
  actual_end_time: string | null; // TIMESTAMPTZ - when worker actually clocked out
  created_by: string | null; // Admin who created the schedule
  created_at: string;
  updated_at: string;
}

