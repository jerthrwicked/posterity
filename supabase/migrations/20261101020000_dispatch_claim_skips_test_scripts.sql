-- Stage 3.4 — the live scheduler leaves test scripts' messages alone · Walker Brown
--
-- The test scripts (scripts/test-dispatch-*.mjs) queue messages in the live
-- database and send them with stand-in senders. The Worker's cron claims every
-- due message once a minute, so it could take a test's message first and send
-- it through the real Postmark and Twilio. Each script labels its messages with
-- a caller beginning 'test-'.
--
-- dispatch_claim now takes the caller to claim for. Without one (the live
-- scheduler), it claims every due message except those whose caller begins
-- 'test-'. With one (a test script), it claims only that caller's messages.
-- A message flagged is_test under any other caller is still sent by the live
-- scheduler, which is how a deliberate live test goes out.
--
-- The old one-argument function is replaced; a call naming only p_limit
-- resolves to the new one.

drop function public.dispatch_claim(int);

create function public.dispatch_claim(p_limit int default 25, p_caller text default null)
returns setof dispatch_messages
language sql security invoker set search_path = public as $$
  update dispatch_messages m
     set status = 'sending', locked_at = now()
   where m.id in (
     select id from dispatch_messages
      where ((status = 'queued'  and next_attempt_at <= now())
          or (status = 'sending' and locked_at < now() - interval '10 minutes'))
        and case when p_caller is null then caller not like 'test-%'
                 else caller = p_caller end
      order by next_attempt_at
      limit greatest(p_limit, 0)
      for update skip locked)
  returning m.*;
$$;
comment on function public.dispatch_claim(int, text) is
  'Claims due messages for one scheduler pass. No caller: everything except callers beginning test- (the live scheduler). A caller: only that caller''s messages (a test script).';

revoke execute on function public.dispatch_claim(int, text) from public, anon, authenticated;
grant execute on function public.dispatch_claim(int, text) to service_role;

notify pgrst, 'reload schema';
