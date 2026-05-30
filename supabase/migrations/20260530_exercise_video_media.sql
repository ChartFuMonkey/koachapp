-- Exercise video media: uploaded-file storage path + public bucket.
-- Links continue to use the existing exercises.video_url column.

alter table exercises add column if not exists video_storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-videos',
  'exercise-videos',
  true,
  52428800, -- 50 MB
  array['video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
