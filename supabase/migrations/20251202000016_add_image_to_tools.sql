-- Add image_url column to tools table
-- Migration: 20251202000016_add_image_to_tools.sql

-- Add image_url column to tools
ALTER TABLE tools
ADD COLUMN image_url TEXT;

-- Add comment
COMMENT ON COLUMN tools.image_url IS 'Tool image URL (Supabase Storage path)';

-- Create storage bucket for tool images (run this in Supabase Dashboard > Storage)
-- Bucket name: tool-images
-- Public: false (private, only authenticated users can access)
-- File size limit: 5MB
-- Allowed file types: image/jpeg, image/png, image/webp

-- Note: Storage bucket and policies must be created manually in Supabase Dashboard or via SQL:
--
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'tool-images',
--   'tool-images',
--   false,
--   5242880, -- 5MB in bytes
--   ARRAY['image/jpeg', 'image/png', 'image/webp']
-- );
--
-- Storage policies (RLS for storage):
--
-- CREATE POLICY "Users can upload tool images"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'tool-images' AND
--   auth.uid() IN (
--     SELECT id FROM users WHERE organization_id = (storage.foldername(name))[1]::uuid
--   )
-- );
--
-- CREATE POLICY "Users can view their organization's tool images"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--   bucket_id = 'tool-images' AND
--   auth.uid() IN (
--     SELECT id FROM users WHERE organization_id = (storage.foldername(name))[1]::uuid
--   )
-- );
--
-- CREATE POLICY "Users can delete their organization's tool images"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'tool-images' AND
--   auth.uid() IN (
--     SELECT id FROM users WHERE organization_id = (storage.foldername(name))[1]::uuid
--   )
-- );
