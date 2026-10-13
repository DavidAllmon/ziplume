-- File storage for hosted pages (PDFs, images, video, audio), in its own migration so the
-- rest of the schema applies even if this project's Storage service isn't enabled yet.
--
-- Files live in the public bucket "page-media" under "<user id>/<file>". Anyone can read a
-- file by its URL (they appear on public pages); only the owner can add, replace or remove
-- files in their own folder.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'page-media',
  'page-media',
  true,
  52428800,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf',
    'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Owners can add page media to their folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'page-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners can see their page media"
  on storage.objects for select to authenticated
  using (bucket_id = 'page-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners can replace their page media"
  on storage.objects for update to authenticated
  using (bucket_id = 'page-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'page-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners can delete their page media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'page-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Two-factor accounts need a two-factor session for page media"
  on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'page-media' or (select public.mfa_satisfied()))
  with check (bucket_id <> 'page-media' or (select public.mfa_satisfied()));

commit;
