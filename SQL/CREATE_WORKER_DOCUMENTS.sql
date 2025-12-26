-- =====================================================
-- Worker Documents Table and Storage Setup
-- =====================================================
-- Purpose: Allow workers to upload personal documents (max 10)
--          Admins can view all worker documents via CRM
-- Storage: Supabase Storage bucket 'worker-documents'
-- =====================================================

-- Step 1: Create worker_documents table
CREATE TABLE IF NOT EXISTS worker_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,

  -- File metadata
  file_name TEXT NOT NULL,              -- Original file name (e.g., "Resume.pdf")
  file_type TEXT NOT NULL,              -- MIME type (application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document)
  file_size INTEGER NOT NULL,           -- File size in bytes
  storage_path TEXT NOT NULL UNIQUE,    -- Path in Supabase Storage (e.g., "worker-123/document-abc.pdf")

  -- Document metadata
  document_title TEXT,                  -- Optional: User-friendly title (defaults to file_name)
  document_description TEXT,            -- Optional: Description/notes about document

  -- Audit fields
  uploaded_by UUID REFERENCES auth.users(id), -- Should match worker's user ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_file_type CHECK (
    file_type IN (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  ),
  CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 10485760) -- Max 10MB per file
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_worker_documents_worker_id ON worker_documents(worker_id);
CREATE INDEX idx_worker_documents_created_at ON worker_documents(created_at DESC);
CREATE INDEX idx_worker_documents_uploaded_by ON worker_documents(uploaded_by);

-- Step 3: Enable Row Level Security
ALTER TABLE worker_documents ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies

-- Policy 1: Workers can read their own documents
CREATE POLICY "Workers can read their own documents"
ON worker_documents
FOR SELECT
TO authenticated
USING (
  worker_belongs_to_user(worker_id)
);

-- Policy 2: Workers can insert their own documents (max 10 enforced at app level)
CREATE POLICY "Workers can insert their own documents"
ON worker_documents
FOR INSERT
TO authenticated
WITH CHECK (
  worker_belongs_to_user(worker_id)
  AND uploaded_by = auth.uid()
);

-- Policy 3: Workers can update their own documents (title/description only)
CREATE POLICY "Workers can update their own documents"
ON worker_documents
FOR UPDATE
TO authenticated
USING (worker_belongs_to_user(worker_id))
WITH CHECK (worker_belongs_to_user(worker_id));

-- Policy 4: Workers can delete their own documents
CREATE POLICY "Workers can delete their own documents"
ON worker_documents
FOR DELETE
TO authenticated
USING (worker_belongs_to_user(worker_id));

-- Policy 5: Admins can read all documents (CRM access)
CREATE POLICY "Admins can read all worker documents"
ON worker_documents
FOR SELECT
TO authenticated
USING (is_admin_user());

-- Step 5: Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_worker_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_worker_documents_updated_at
BEFORE UPDATE ON worker_documents
FOR EACH ROW
EXECUTE FUNCTION update_worker_documents_updated_at();

-- Step 6: Create helper function to check document count
CREATE OR REPLACE FUNCTION get_worker_document_count(worker_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM worker_documents
    WHERE worker_id = worker_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON worker_documents TO authenticated;
GRANT EXECUTE ON FUNCTION get_worker_document_count(UUID) TO authenticated;

-- =====================================================
-- Supabase Storage Bucket Setup
-- =====================================================
-- NOTE: Run this in Supabase Dashboard → Storage → Create Bucket
--
-- Bucket Name: worker-documents
-- Public: false (private bucket)
-- File size limit: 10MB
-- Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document
--
-- Storage RLS Policies (run in SQL Editor after creating bucket):

-- Policy 1: Workers can upload to their own folder
-- INSERT INTO storage.objects (bucket_id, name, owner, metadata)
CREATE POLICY "Workers can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'worker-documents'
  AND (storage.foldername(name))[1] = (
    SELECT w.id::text
    FROM workers w
    WHERE w.email = get_auth_user_email()
  )
);

-- Policy 2: Workers can read their own documents
CREATE POLICY "Workers can read their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'worker-documents'
  AND (storage.foldername(name))[1] = (
    SELECT w.id::text
    FROM workers w
    WHERE w.email = get_auth_user_email()
  )
);

-- Policy 3: Workers can delete their own documents
CREATE POLICY "Workers can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'worker-documents'
  AND (storage.foldername(name))[1] = (
    SELECT w.id::text
    FROM workers w
    WHERE w.email = get_auth_user_email()
  )
);

-- Policy 4: Admins can read all worker documents (CRM access)
CREATE POLICY "Admins can read all worker documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'worker-documents'
  AND is_admin_user()
);

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'worker_documents'
-- ORDER BY ordinal_position;

-- Check RLS policies
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'worker_documents';

-- Check document count for a worker
-- SELECT get_worker_document_count('your-worker-id-here');

-- View all worker documents (admin only)
-- SELECT
--   wd.id,
--   w.name AS worker_name,
--   wd.file_name,
--   wd.file_type,
--   wd.file_size,
--   wd.document_title,
--   wd.created_at
-- FROM worker_documents wd
-- JOIN workers w ON wd.worker_id = w.id
-- ORDER BY wd.created_at DESC;

-- =====================================================
-- Migration Complete
-- =====================================================
