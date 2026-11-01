// What Postmark and Twilio report back after a send, and the texts people send
// to Posterity's number (Master Specification, the Communication Dispatch
// System). Three routes call these:
//
//   POST /api/dispatch/postmark         an email delivered or bounced
//   POST /api/dispatch/twilio/status    a text delivered, undelivered or failed
//   POST /api/dispatch/twilio/inbound   a text received
//
// Every report lands in dispatch_events against the message it belongs to. A
// report is only believed once it is proven real: Twilio signs each request
// with the account's auth token, and Postmark signs nothing, so a Postmark
// report is looked up through Postmark's own API before it is recorded. A report
// for a message Posterity never sent is ignored.
//
// Both providers send a report again when it is not answered with a 2xx, so a
// report can arrive twice. Each event carries a report_id in its detail, and a
// unique index on (provider_message_id, event_type, report_id) turns the second
// copy into a no-op (migration 20261101010000_dispatch_report_dedupe).
//
// A bounce or a failed text is recorded and nothing more: Postmark refuses an
// address that bounced (the sender treats that refusal as final), and Twilio
// refuses a number that replied STOP.

import { createHmac, timingSafeEqual } from 'node:crypto';

export const SITE = 'https://www.yourposterity.com';
export const STATUS_CALLBACK_PATH = '/api/dispatch/twilio/status';

const E164 = /^\+[1-9][0-9]{7,14}$/;

function must({ data, error }) {
  if (error) throw error;
  return data;
}

// Writes one report to the log. A second copy of the same report breaks the
// unique index (23505) and is reported as a duplicate rather than an error.
async function logReport(db, row) {
  const { error } = await db.from('dispatch_events').insert(row);
  if (error?.code === '23505') return 'duplicate';
  if (error) throw error;
  return 'recorded';
}

async function findMessage(db, providerMessageId, channel) {
  if (!providerMessageId) return null;
  const rows = must(await db.from('dispatch_messages')
    .select('id, account_id, channel, destination, copy_key, caller, is_test')
    .eq('provider_message_id', providerMessageId).eq('channel', channel).limit(1));
  return rows[0] ?? null;
}

function eventFor(m, eventType, outcome, providerMessageId, detail) {
  return {
    account_id: m.account_id, message_id: m.id, event_type: eventType, channel: m.channel,
    destination: m.destination, outcome, provider_message_id: providerMessageId,
    detail: { copy_key: m.copy_key, caller: m.caller, ...detail }, is_test: m.is_test,
  };
}

// ------------------------------------------------------------------ Postmark

// Asks Postmark about a report before believing it. Resolves with the verified
// record, null when Postmark has no such record (a forged or test report), or
// throws when Postmark could not be asked, so the route answers 503 and
// Postmark sends the report again later.
async function askPostmark(path, { token, fetch: doFetch }) {
  let res;
  try {
    res = await doFetch(`https://api.postmarkapp.com${path}`, {
      headers: { Accept: 'application/json', 'X-Postmark-Server-Token': token },
    });
  } catch (err) {
    throw new Error(`postmark lookup: ${err.message}`);
  }
  if (res.status === 404 || res.status === 422) return null;
  if (!res.ok) throw new Error(`postmark lookup: ${res.status}`);
  return res.json();
}

// payload: the webhook's JSON body. token: the live server's token.
// Returns { result } where result is recorded, duplicate, ignored, or
// unverified (Postmark has no record matching the report).
export async function recordPostmarkReport(db, payload, { token, fetch: doFetch = fetch }) {
  const kind = payload?.RecordType;
  if (kind !== 'Delivery' && kind !== 'Bounce') return { result: 'ignored', why: `record type ${kind}` };

  const messageId = typeof payload.MessageID === 'string' ? payload.MessageID : null;
  const m = await findMessage(db, messageId, 'email');
  if (!m) return { result: 'ignored', why: 'not a message Posterity sent' };

  if (kind === 'Delivery') {
    const details = await askPostmark(`/messages/outbound/${encodeURIComponent(messageId)}/details`, { token, fetch: doFetch });
    const delivered = details?.MessageEvents?.find((e) => e.Type === 'Delivered');
    if (!delivered) return { result: 'unverified' };
    return {
      result: await logReport(db, eventFor(m, 'delivered', 'delivered', messageId, {
        report_id: 'delivery', delivered_at: delivered.ReceivedAt ?? null,
      })),
    };
  }

  const bounceId = Number(payload.ID);
  if (!Number.isSafeInteger(bounceId)) return { result: 'unverified' };
  const bounce = await askPostmark(`/bounces/${bounceId}`, { token, fetch: doFetch });
  if (!bounce || bounce.MessageID !== messageId) return { result: 'unverified' };
  return {
    result: await logReport(db, eventFor(m, 'bounced', 'bounced', messageId, {
      report_id: `bounce:${bounceId}`, bounce_type: bounce.Type ?? null,
      inactive: bounce.Inactive ?? null, description: bounce.Description ?? null,
      bounced_at: bounce.BouncedAt ?? null,
    })),
  };
}

// ------------------------------------------------------------------ Twilio

// Twilio's request signature: HMAC-SHA1, keyed with the auth token, over the
// full URL Twilio called followed by every POST parameter as name then value,
// sorted by name. Base64, in the X-Twilio-Signature header.
export function twilioSignature(authToken, url, params) {
  const pairs = [...params].sort(([a, x], [b, y]) => (a < b ? -1 : a > b ? 1 : x < y ? -1 : x > y ? 1 : 0));
  const data = url + pairs.map(([k, v]) => k + v).join('');
  return createHmac('sha1', authToken).update(data, 'utf8').digest('base64');
}

// urls: every address the request could have been signed against. The route
// passes the one it was called at and the same path on the public site, since
// the Worker may see a different host than the one Twilio was given.
export function twilioSignatureValid(authToken, urls, params, signature) {
  if (!authToken || !signature) return false;
  const given = Buffer.from(signature);
  return urls.some((url) => {
    const expected = Buffer.from(twilioSignature(authToken, url, params));
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

// Reads a Twilio webhook's form fields and checks its signature. Resolves with
// the fields, or null when the request is not Twilio's (or not this account's).
export async function readTwilioRequest(req, { authToken, accountSid }) {
  const params = new URLSearchParams(await req.text());
  const url = new URL(req.url);
  const urls = [...new Set([req.url, `${SITE}${url.pathname}${url.search}`])];
  if (!twilioSignatureValid(authToken, urls, params, req.headers.get('x-twilio-signature'))) return null;
  if (params.get('AccountSid') !== accountSid) return null;
  return params;
}

// Twilio's final word on a text. Anything else (queued, sending, sent) is a
// step on the way and is not recorded.
const FINAL_STATUS = { delivered: 'delivered', undelivered: 'failed', failed: 'failed' };

// params: the status callback's form fields, signature already checked.
export async function recordTwilioStatus(db, params) {
  const status = params.get('MessageStatus');
  const eventType = FINAL_STATUS[status];
  if (!eventType) return { result: 'ignored', why: `status ${status}` };

  const sid = params.get('MessageSid');
  const m = await findMessage(db, sid, 'sms');
  if (!m) return { result: 'ignored', why: 'not a message Posterity sent' };

  const code = params.get('ErrorCode');
  return {
    result: await logReport(db, eventFor(m, eventType, status, sid, {
      report_id: `status:${status}`, error_code: code ? Number(code) : null,
    })),
  };
}

// Twilio's own keywords. It replies to these itself and stops or resumes
// sending to the number at its level. With Advanced Opt-Out on, Twilio names
// which one it matched in OptOutType; otherwise the whole text is matched.
const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REVOKE', 'OPTOUT']);
const START_WORDS = new Set(['START', 'YES', 'UNSTOP']);
const HELP_WORDS = new Set(['HELP', 'INFO']);

export function classifyInbound(body, optOutType = null) {
  const named = String(optOutType ?? '').toUpperCase();
  if (named === 'STOP' || named === 'START' || named === 'HELP') return named.toLowerCase();
  const word = String(body ?? '').trim().toUpperCase();
  if (STOP_WORDS.has(word)) return 'stop';
  if (START_WORDS.has(word)) return 'start';
  if (HELP_WORDS.has(word)) return 'help';
  return 'other';
}

// params: the inbound webhook's form fields, signature already checked.
//
// Every text is kept in dispatch_inbound, and any text received confirms the
// number. STOP ends the number's agreement, and the person's messages go by
// email alone. START is recorded and nothing more: an agreement is given only
// against the disclosure, which a START reply never shows, so texts resume
// once the person turns them back on in Settings. HELP is recorded, and
// Twilio sends its reply. Anything else waits for the Check-in System (4.8).
//
// The 'inbound' event is written last and marks the text as handled, so a text
// Twilio sends again after a failure partway is handled again, and one that
// was fully handled is not.
export async function recordInbound(db, params, { isTest = false } = {}) {
  const sid = params.get('MessageSid') ?? params.get('SmsSid');
  const from = params.get('From');
  if (!sid || !from) return { result: 'ignored', why: 'no message id or sender' };
  const handledAs = classifyInbound(params.get('Body'), params.get('OptOutType'));

  const kept = await db.from('dispatch_inbound').insert({
    twilio_sid: sid, from_phone: from, body: params.get('Body'), handled_as: handledAs,
  });
  if (kept.error && kept.error.code !== '23505') throw kept.error;

  const done = must(await db.from('dispatch_events').select('id')
    .eq('provider_message_id', sid).eq('event_type', 'inbound').limit(1));
  if (done.length) return { result: 'duplicate', handledAs };

  const detail = { twilio_sid: sid };
  if (E164.test(from)) {
    if (handledAs === 'stop') {
      must(await db.rpc('dispatch_record_stop', { p_phone: from, p_via: 'stop_reply', p_detail: detail, p_is_test: isTest }));
    }
    must(await db.rpc('dispatch_confirm_number', { p_phone: from, p_via: 'inbound_text', p_detail: detail, p_is_test: isTest }));
  }
  if (handledAs === 'start') {
    await logReport(db, {
      event_type: 'start', channel: 'sms', destination: from, outcome: 'recorded_only',
      provider_message_id: sid, detail: { ...detail, report_id: 'start' }, is_test: isTest,
    });
  }
  const result = await logReport(db, {
    event_type: 'inbound', channel: 'sms', destination: from, outcome: handledAs,
    provider_message_id: sid, detail: { report_id: 'inbound', to: params.get('To') }, is_test: isTest,
  });
  return { result, handledAs };
}
