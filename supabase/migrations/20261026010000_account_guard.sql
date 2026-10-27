-- Stage 4.1 — closing what account_status left open · Walker Brown
--
-- Found by schema-sentry after 20261026000000 was applied.
--
-- The account row could still be deleted by its own customer. own_account
-- covers every command, and every table that points at accounts cascades, so
-- one call from the customer's token erased the whole legacy with no way back.
-- Deleting an account is Posterity's to do (Stage 4.7), with the service role.
--
-- A file already in the bucket could still be replaced while building was
-- locked: the lock covered uploading a new file, not overwriting an old one.
-- An overwrite, or an upload with upsert, is an UPDATE on storage.objects.
-- Deleting a file stays open, as deleting a message or a recipient does.

-- ============================================================ the account row

create policy accounts_no_customer_delete on public.accounts
  as restrictive for delete to authenticated, anon
  using (false);

-- ============================================================ the lock

create policy legacy_media_building_open_update on storage.objects
  as restrictive for update to authenticated
  using (
    bucket_id <> 'legacy-media'
    or public.building_is_open(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id <> 'legacy-media'
    or public.building_is_open(((storage.foldername(name))[1])::uuid)
  );

-- ============================================================ the record

comment on column public.accounts.trial_ends_at is
  'Three-month free trial, one per account, beginning at signup (Master Spec, Horizon Tier). When it passes and no storage year covers it, storage lapses: building stays open three months into the lapse, then locks.';

-- Fixed, so the function cannot be pointed at another schema's objects.
alter function public.storage_paid_end(date) set search_path = '';
