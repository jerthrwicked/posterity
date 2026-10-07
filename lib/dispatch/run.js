// One pass of the Communication Dispatch System's scheduler.
//
// A pass claims the messages that are due (dispatch_claim hands each to exactly
// one pass), applies channel policy, renders the copy, sends through the
// channel, and records every outcome in dispatch_events. What wakes the pass on
// a cycle depends on hosting, so the pass itself is host-neutral: a route calls
// it, and so can a local loop.
//
// Outcomes:
//   held      outside the recipient's sending window: back in the queue until
//             it opens. Not an attempt.
//   failed    a failure no retry can fix (no agreement, a stopped number, copy
//             that cannot render, an address the provider refuses), at once.
//   retrying  a failure that may pass, back in the queue after a wait.
//   exhausted out of attempts: failed, for the Operational Dashboard to surface.
//
// ⚠️ A pass that dies after the provider accepts a message but before its row is
// marked sent leaves the row in 'sending', and dispatch_claim takes it again ten
// minutes later, so that message would go out twice. A pass stops starting
// sends well inside that window (PASS_BUDGET_MS) so a slow pass is never the
// cause.

import { decide } from './policy.js';
import { renderEmail, renderSms } from './render.js';

// Waits after the 1st, 2nd, 3rd and 4th failed attempt. The database's default
// of five attempts gives up after the fifth.
export const RETRY_AFTER_MS = [60e3, 5 * 60e3, 30 * 60e3, 2 * 60 * 60e3];
export const PASS_BUDGET_MS = 4 * 60e3;

function must({ data, error }) {
  if (error) throw error;
  return data;
}

// db: a service-role Supabase client.
// channels: { email, sms }, each with send({ message, rendered }) resolving to
//   { providerMessageId }, or throwing an error whose `retryable` is false when
//   no retry can succeed. Any other error is retried.
// now: the clock channel policy reads, injectable for tests.
export async function runPass(db, { channels, limit = 25, now = () => new Date(), budgetMs = PASS_BUDGET_MS } = {}) {
  if (!channels?.email || !channels?.sms) throw new Error('runPass: both the email and the text channel are required');
  const started = Date.now();

  const claimed = must(await db.rpc('dispatch_claim', { p_limit: limit }));
  const tally = { claimed: claimed.length, sent: 0, held: 0, retrying: 0, failed: 0, exhausted: 0, released: 0 };
  if (!claimed.length) return tally;

  const keys = [...new Set(claimed.map((m) => m.copy_key))];
  const copyRows = must(await db.from('dispatch_copy').select().or(`key.in.(${keys.map((k) => `"${k}"`).join(',')}),kind.eq.frame`));
  const copy = new Map(copyRows.map((r) => [r.key, r]));
  const frame = copyRows.find((r) => r.kind === 'frame');

  const phones = [...new Set(claimed.filter((m) => m.channel === 'sms').map((m) => m.destination))];
  const agreements = new Map(
    phones.length
      ? must(await db.from('text_agreements').select().in('phone', phones)).map((a) => [a.phone, a])
      : [],
  );

  for (const m of claimed) {
    if (Date.now() - started > budgetMs) {
      if (await settle(db, m, { status: 'queued', locked_at: null })) tally.released++;
      continue;
    }
    try {
      tally[await handle(db, m, { channels, copy, frame, agreements, now: now() })]++;
    } catch (err) {
      // A database error mid-message. The row goes back to the queue unless it
      // already settled, and the rest of the pass carries on.
      tally.errors = [...(tally.errors ?? []), { id: m.id, error: String(err?.message ?? err) }];
      await settle(db, m, { status: 'queued', locked_at: null }).catch(() => {});
    }
  }
  return tally;
}

async function handle(db, m, { channels, copy, frame, agreements, now }) {
  const decision = decide(m, agreements.get(m.destination) ?? null, now);

  if (decision.action === 'hold') {
    if (await settle(db, m, { status: 'queued', locked_at: null, next_attempt_at: decision.until.toISOString() })) {
      await log(db, m, 'held_window', 'held', { until: decision.until.toISOString() });
    }
    return 'held';
  }
  if (decision.action === 'fail') {
    const ok = await settle(db, m, { status: 'failed', locked_at: null, last_error: decision.reason });
    if (ok) await log(db, m, decision.reason === 'rnd_unavailable' ? 'rnd_unavailable' : 'failed', decision.reason);
    return 'failed';
  }

  let rendered;
  try {
    const row = copy.get(m.copy_key);
    if (!row) throw new Error(`no copy stored under ${m.copy_key}`);
    rendered = m.channel === 'email' ? renderEmail(row, m.params, frame) : renderSms(row, m.params);
  } catch (err) {
    if (await settle(db, m, { status: 'failed', locked_at: null, last_error: `render: ${err.message}` })) {
      await log(db, m, 'failed', 'render_error', { error: err.message });
    }
    return 'failed';
  }

  const attempt = m.attempts + 1;
  await log(db, m, 'attempt', 'attempt', { attempt });
  try {
    const { providerMessageId } = await channels[m.channel].send({ message: m, rendered });
    await settle(db, m, {
      status: 'sent', locked_at: null, attempts: attempt, sent_at: new Date().toISOString(),
      provider_message_id: providerMessageId ?? null, last_error: null,
    });
    // Logged whether or not the row was still ours: it went out either way.
    await log(db, m, 'sent', 'sent', { attempt }, providerMessageId);
    return 'sent';
  } catch (err) {
    const error = String(err?.message ?? err).slice(0, 500);
    if (err?.retryable === false) {
      if (await settle(db, m, { status: 'failed', locked_at: null, attempts: attempt, last_error: error })) {
        await log(db, m, 'failed', 'refused', { attempt, error });
      }
      return 'failed';
    }
    if (attempt >= m.max_attempts) {
      if (await settle(db, m, { status: 'failed', locked_at: null, attempts: attempt, last_error: error })) {
        await log(db, m, 'exhausted', 'exhausted', { attempt, error });
      }
      return 'exhausted';
    }
    const retryAt = new Date(Date.now() + RETRY_AFTER_MS[Math.min(attempt, RETRY_AFTER_MS.length) - 1]).toISOString();
    if (await settle(db, m, { status: 'queued', locked_at: null, attempts: attempt, next_attempt_at: retryAt, last_error: error })) {
      await log(db, m, 'failed', 'retrying', { attempt, error, retry_at: retryAt });
    }
    return 'retrying';
  }
}

// Writes the row only while this pass still holds it: status 'sending' and the
// lock time it was claimed with. A row another pass has since reclaimed is left
// to that pass. Returns whether the write landed.
async function settle(db, m, fields) {
  const rows = must(await db.from('dispatch_messages').update(fields)
    .eq('id', m.id).eq('status', 'sending').eq('locked_at', m.locked_at).select('id'));
  return rows.length === 1;
}

async function log(db, m, eventType, outcome, detail = {}, providerMessageId = null) {
  must(await db.from('dispatch_events').insert({
    account_id: m.account_id, message_id: m.id, event_type: eventType, channel: m.channel,
    destination: m.destination, outcome, provider_message_id: providerMessageId,
    detail: { copy_key: m.copy_key, caller: m.caller, ...detail }, is_test: m.is_test,
  }));
}
