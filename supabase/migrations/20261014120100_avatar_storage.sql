-- Uploaded profile photos, in their own migration (like page media) so the rest of the schema
-- applies even if this project's Storage service isn't enabled yet.
--
-- Photos live in the public bucket "avatars" under "<user id>/<file>". Anyone can load a photo
-- by its URL (teammates and invite emails show it); only the owner can add, replace or remove
-- files in their own folder.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Owners can add a photo to their folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners can see their photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners can replace their photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners can delete their photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Two-factor accounts need a two-factor session for photos"
  on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'avatars' or (select public.mfa_satisfied()))
  with check (bucket_id <> 'avatars' or (select public.mfa_satisfied()));

commit;
