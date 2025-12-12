/**
 * WorkerSchedule interface matching the worker_schedules table schema
 * from the CRM database
 */
export interface WorkerSchedule {
  id: string;
  worker_id: string;
  scheduled_date: string; // YYYY-MM-DD format
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  location_name: string | null;
  location_address: string | null;
  notes: string | null;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  created_by: string | null; // Admin who created the schedule
  created_at: string;
  updated_at: string;
}

