-- Create storage bucket for tool images
-- Migration: 20251202000017_create_storage_bucket.sql

-- Insert bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tool-images',
  'tool-images',
  false, -- private bucket
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies

-- Allow authenticated users to upload images to their organization folder
CREATE POLICY "Users can upload tool images to their organization folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tool-images' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM users
    WHERE id = auth.uid()
  )
);

-- Allow authenticated users to view their organization's images
CREATE POLICY "Users can view their organization's tool images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tool-images' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM users
    WHERE id = auth.uid()
  )
);

-- Allow authenticated users to update their organization's images
CREATE POLICY "Users can update their organization's tool images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tool-images' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM users
    WHERE id = auth.uid()
  )
);

-- Allow authenticated users to delete their organization's images
CREATE POLICY "Users can delete their organization's tool images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tool-images' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM users
    WHERE id = auth.uid()
  )
);
