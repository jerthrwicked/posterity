// The one way a caller puts a message into the Communication Dispatch System.
//
// A caller names the person's email address, phone number, or both, and the
// copy for each channel. The email is queued whenever an address is given, and
// the text whenever a number is given; whether the text actually goes is
// channel policy's decision at send, not the caller's (Master Specification,
// the Communication Dispatch System). A person reachable only by
// phone gets the text alone.
//
// The copy is checked here, at enqueue, so a message that could never render
// is refused to the caller rather than spending its retries in the queue: the
// key must exist, match the channel, and be a message rather than the frame.

const E164 = /^\+[1-9][0-9]{7,14}$/;

function must({ data, error }) {
  if (error) throw error;
  return data;
}

// db: a service-role Supabase client.
// copy: { email: '<dispatch_copy key>', sms: '<dispatch_copy key>' }, one per
//   channel being queued.
// idempotencyKey: optional. Each row stores it with its channel appended, so
//   enqueueing again with the same key returns the rows already queued.
// Returns the queued rows, the email first.
export async function enqueue(db, {
  accountId, email = null, phone = null, copy = {}, params = {}, caller,
  selfInitiated = false, notBefore = null, idempotencyKey = null,
  recipientId = null, legacyGuardId = null, fromName = null, isTest = false,
}) {
  if (!accountId) throw new Error('enqueue: accountId is required');
  if (!caller) throw new Error('enqueue: caller is required');
  if (!email && !phone) throw new Error('enqueue: an email address or a phone number is required');
  if (phone && !E164.test(phone)) throw new Error(`enqueue: phone must be E.164, e.g. +15045551234`);

  const wanted = [];
  if (email) wanted.push({ channel: 'email', destination: email.trim() });
  if (phone) wanted.push({ channel: 'sms', destination: phone });

  const keys = wanted.map((w) => copy[w.channel]);
  for (const [i, w] of wanted.entries()) {
    if (!keys[i]) throw new Error(`enqueue: no copy key given for ${w.channel}`);
  }
  const rows = must(await db.from('dispatch_copy').select('key, channel, kind').in('key', keys));
  for (const [i, w] of wanted.entries()) {
    const row = rows.find((r) => r.key === keys[i]);
    if (!row) throw new Error(`enqueue: no copy stored under ${keys[i]}`);
    if (row.kind !== 'message') throw new Error(`enqueue: ${keys[i]} is the email frame, not a message`);
    if (row.channel !== w.channel) throw new Error(`enqueue: ${keys[i]} is ${row.channel} copy, not ${w.channel}`);
  }

  const queued = [];
  for (const [i, w] of wanted.entries()) {
    const idem = idempotencyKey ? `${idempotencyKey}:${w.channel}` : null;
    const { data, error } = await db.from('dispatch_messages').insert({
      account_id: accountId,
      channel: w.channel,
      destination: w.destination,
      recipient_id: recipientId,
      legacy_guard_id: legacyGuardId,
      copy_key: keys[i],
      from_name: w.channel === 'email' ? fromName : null,
      params,
      self_initiated: selfInitiated,
      not_before: notBefore,
      caller,
      idempotency_key: idem,
      is_test: isTest,
    }).select().single();

    // 23505: this idempotency key is already queued, so this is a retry.
    if (error?.code === '23505' && idem) {
      queued.push(must(await db.from('dispatch_messages').select().eq('idempotency_key', idem).single()));
    } else {
      queued.push(must({ data, error }));
    }
  }
  return queued;
}
