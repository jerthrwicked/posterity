-- Recovery email address: a change waits beside the confirmed address.
--
-- Under 20261109000000_recovery_email a row held one address, waiting or
-- confirmed, so entering a new address dropped the confirmed one the moment
-- its link was sent. A mistyped new address then left the account with no
-- recovery address at all (schema-sentry, November 9). Now the confirmed
-- address keeps receiving reset links until the new one's link is used, the
-- way the sign-in address keeps working until its change is confirmed.
--
--   email, confirmed_at                     the confirmed address, or neither
--   pending_email, token_hash, link_sent_at the address waiting on its link
--                                           (an hour from link_sent_at), or
--                                           none of the three
--
-- A row holds at least one of the two, and never the same address in both.
-- Using the link moves pending_email into email. A new address, or a link sent
-- again, replaces the waiting one and its token, so only the newest link
-- works. Removing the address deletes the row; cancelling a change clears the
-- waiting address alone (lib/auth/recovery-email.js).
--
-- updated_at now keeps itself, by the touch_updated_at trigger every other
-- table with that column has.

alter table recovery_emails drop constraint recovery_emails_state;
alter table recovery_emails alter column email drop not null;
alter table recovery_emails add column pending_email text;

-- A row still waiting under the first shape holds its address in email.
update recovery_emails set pending_email = email, email = null where confirmed_at is null;

alter table recovery_emails
  add constraint recovery_emails_pending_email check (
    pending_email = lower(btrim(pending_email)) and length(pending_email) between 3 and 254 and pending_email like '%_@_%'
  ),
  add constraint recovery_emails_confirmed check ((email is null) = (confirmed_at is null)),
  add constraint recovery_emails_pending check (
    (pending_email is null) = (token_hash is null) and (token_hash is null) = (link_sent_at is null)
  ),
  add constraint recovery_emails_held check (email is not null or pending_email is not null),
  add constraint recovery_emails_distinct check (pending_email <> email);

create trigger t_recovery_emails before update on recovery_emails
  for each row execute function touch_updated_at();
