-- Add shift_duration column to existing shifts table
-- Run this in your Supabase SQL Editor if you already have a shifts table

ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS shift_duration TEXT;

-- The shift_duration will be stored in format "HH:MM:SS" (e.g., "08:30:45" for 8 hours, 30 minutes, 45 seconds)

