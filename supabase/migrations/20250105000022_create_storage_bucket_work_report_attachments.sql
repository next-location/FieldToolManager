-- Storage bucket for work report attachments (documents, drawings)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'work-report-attachments',
  'work-report-attachments',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for work-report-attachments bucket

-- Allow authenticated users to upload attachments
CREATE POLICY "Users can upload work report attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-report-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view all attachments (bucket is public)
CREATE POLICY "Users can view work report attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'work-report-attachments'
);

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their own work report attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-report-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
