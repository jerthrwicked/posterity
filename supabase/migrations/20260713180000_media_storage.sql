-- Phase 1.1 — storage for videos and photos · Walker Brown
--
-- A PRIVATE bucket. Not public, not "unlisted" — private.
--
-- What goes in here is a man's last video to his daughter. A public bucket means
-- anyone holding the URL can watch it, forever, and object URLs leak: they end up
-- in logs, in referrer headers, in a forwarded email. Everything is read through
-- short-lived signed URLs instead.
--
-- Access is keyed on the FIRST FOLDER of the object path, which is the account id:
--
--     <account_id>/<legacy_id>/<uuid>.<ext>
--
-- so the same RLS that protects the rows protects the files.
--
-- Limits are enforced BY THE BUCKET, not by the browser. A client-side size check
-- is a courtesy to the customer; it is not a control. The 25MB ceiling and the
-- accepted formats come from CONTEXT_for_posterity.md.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'legacy-media',
  'legacy-media',
  false,
  26214400,   -- 25 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- A customer can only ever touch objects filed under their own account id.
drop policy if exists legacy_media_own_files on storage.objects;
create policy legacy_media_own_files on storage.objects
  for all
  using (
    bucket_id = 'legacy-media'
    and (storage.foldername(name))[1] in (
      select id::text from public.accounts where user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'legacy-media'
    and (storage.foldername(name))[1] in (
      select id::text from public.accounts where user_id = (select auth.uid())
    )
  );
