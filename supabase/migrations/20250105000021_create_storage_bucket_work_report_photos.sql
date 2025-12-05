-- Storage bucket for work report photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'work-report-photos',
  'work-report-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for work-report-photos bucket

-- Allow authenticated users to upload photos
CREATE POLICY "Users can upload work report photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-report-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view all photos (bucket is public)
CREATE POLICY "Users can view work report photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'work-report-photos'
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own work report photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-report-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
