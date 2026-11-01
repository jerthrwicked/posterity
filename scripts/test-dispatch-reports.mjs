#!/usr/bin/env node
// Posterity — Communication Dispatch System: what the providers report back
/*
Tests lib/dispatch/reports.js and its three routes against the live database:
Postmark's delivered and bounced reports, Twilio's status callback, and texts
received at Posterity's number.

What matters most:
  - a report nobody can prove is refused: a Twilio request signed wrongly or for
    another account, a Postmark report Postmark's own API does not confirm
  - a report sent twice is recorded once (dispatch_events_report_once)
  - STOP ends the number's agreement; START leaves it stopped; every text
    received confirms the number and is kept

No provider is called and no live key is read. Postmark's API is a stand-in,
and Twilio's signature is made with a stand-in auth token the routes are given
for the run. Test messages are written as already sent, so the live scheduler
never claims them. Its events are flagged is_test and stay in the append-only
log; the test user, copy, agreements and kept texts are removed.

Run: node scripts/test-dispatch-reports.mjs
*/
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { createClient } from '@supabase/supabase-js';
import {
  recordPostmarkReport, recordInbound, readTwilioRequest, twilioSignature, classifyInbound, SITE,
} from '../lib/dispatch/reports.js';

const env = {};
for (const raw of readFileSync(homedir() + '/posterity/.env.local', 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (line && !line.startsWith('#') && line.includes('=')) {
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };

let fails = 0;
function check(label, cond, detail = '') {
  console.log((cond ? '  ✓ ' : '  ✗ ') + label + (detail && !cond ? `  [${detail}]` : ''));
  if (!cond) fails++;
}

// A stand-in for Postmark's API: path -> [status, body], or 'down'. Keeps each call.
function postmark(answers) {
  const calls = [];
  const fake = async (url) => {
    const path = new URL(url).pathname;
    calls.push(path);
    const a = answers[path];
    if (a === 'down') throw new TypeError('fetch failed');
    const [status, body] = a ?? [422, { ErrorCode: 701, Message: 'not found' }];
    return new Response(JSON.stringify(body), { status });
  };
  fake.calls = calls;
  return fake;
}

// The routes' imports leave off their extensions, as Next allows, so each is
// bundled before Node can load it.
const dir = mkdtempSync(join(tmpdir(), 'dispatch-reports-'));
async function route(path) {
  const out = join(dir, `${path.replaceAll('/', '_')}.mjs`);
  await build({
    entryPoints: [new URL(`../app/api/dispatch/${path}/route.js`, import.meta.url).pathname],
    bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'silent',
  });
  return (await import(pathToFileURL(out).href)).POST;
}

const TOKEN = 'stand-in-auth-token', ACCOUNT = 'ACstandin0000000000000000000000000';
function twilioRequest(path, fields, { token = TOKEN, signature = null } = {}) {
  const url = `${SITE}${path}`;
  const params = new URLSearchParams(fields);
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': signature ?? twilioSignature(token, url, params) },
    body: params.toString(),
  });
}

const run = Date.now().toString(36);
const COPY = `test.reports.${run}.email`, SMS_COPY = `test.reports.${run}.sms`;
const PHONE = '+15045550147';   // a fictional 555-01xx number
let uid = null, phoneWasNew = false;
const inboundSids = [];

const saved = Object.fromEntries(['TWILIO_AUTH_TOKEN', 'TWILIO_ACCOUNT_SID', 'POSTMARK_SERVER_TOKEN', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  .map((k) => [k, process.env[k]]));

try {
  console.log('Twilio\'s signature');
  {
    // The worked example in Twilio's security documentation.
    const params = new URLSearchParams({ CallSid: 'CA1234567890ABCDE', Caller: '+12349013030', Digits: '1234', From: '+12349013030', To: '+18005551212' });
    check('matches Twilio\'s documented example', twilioSignature('12345', 'https://mycompany.com/myapp.php?foo=1&bar=2', params) === '0/KCTR6DLpKmkAf8muzZqo1nDgQ=');
    const fields = { AccountSid: ACCOUNT, MessageSid: 'SMx', MessageStatus: 'delivered' };
    check('a request signed with the auth token is read', (await readTwilioRequest(twilioRequest('/p', fields), { authToken: TOKEN, accountSid: ACCOUNT }))?.get('MessageSid') === 'SMx');
    check('one signed with another token is refused', (await readTwilioRequest(twilioRequest('/p', fields, { token: 'other' }), { authToken: TOKEN, accountSid: ACCOUNT })) === null);
    check('one with no signature is refused', (await readTwilioRequest(twilioRequest('/p', fields, { signature: '' }), { authToken: TOKEN, accountSid: ACCOUNT })) === null);
    check('one for another Twilio account is refused', (await readTwilioRequest(twilioRequest('/p', { ...fields, AccountSid: 'ACother' }), { authToken: TOKEN, accountSid: ACCOUNT })) === null);
    const signed = twilioRequest('/p', fields);
    const tampered = new Request(signed.url, { method: 'POST', headers: signed.headers, body: new URLSearchParams({ ...fields, MessageStatus: 'failed' }).toString() });
    check('a signed request with a field changed is refused', (await readTwilioRequest(tampered, { authToken: TOKEN, accountSid: ACCOUNT })) === null);
  }

  console.log('What a received text is');
  for (const [body, type, as] of [
    ['STOP', null, 'stop'], [' stop ', null, 'stop'], ['Unsubscribe', null, 'stop'], ['QUIT', null, 'stop'],
    ['START', null, 'start'], ['unstop', null, 'start'], ['HELP', null, 'help'], ['info', null, 'help'],
    ['Stop texting me please', null, 'other'], ['Arrêt', 'STOP', 'stop'], ['Yes I am fine', null, 'other'],
  ]) check(`${JSON.stringify(body)}${type ? ` (Twilio names ${type})` : ''} is ${as}`, classifyInbound(body, type) === as);

  // A test account and two messages written as already sent.
  const created = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `dispatch-reports-${run}@posterity.app`, password: `x-${run}-${Math.random()}`, email_confirm: true, user_metadata: { legal_name: 'Dispatch Reports Test' } }),
  }).then((r) => r.json());
  uid = created.id;
  if (!uid) throw new Error('could not create the test user');
  const accountId = must(await db.from('accounts').select('id').eq('user_id', uid).single()).id;
  must(await db.from('dispatch_copy').insert([
    { key: COPY, channel: 'email', subject: 'S', text_body: 'T' },
    { key: SMS_COPY, channel: 'sms', sms_body: 'T' },
  ]));
  const sent = { account_id: accountId, caller: 'test-dispatch-reports', is_test: true, status: 'sent', sent_at: new Date().toISOString(), attempts: 1 };
  const PM_ID = `pm-${run}`, SM_ID = `SM${run}`;
  const emailMsg = must(await db.from('dispatch_messages').insert({ ...sent, channel: 'email', destination: `reports-${run}@example.com`, copy_key: COPY, provider_message_id: PM_ID }).select().single());
  const textMsg = must(await db.from('dispatch_messages').insert({ ...sent, channel: 'sms', destination: PHONE, copy_key: SMS_COPY, provider_message_id: SM_ID }).select().single());
  const events = async (id, type) => must(await db.from('dispatch_events').select('event_type,outcome,detail,is_test,account_id').eq('message_id', id).eq('event_type', type));

  console.log('Postmark: delivered');
  {
    const details = { [`/messages/outbound/${PM_ID}/details`]: [200, { MessageID: PM_ID, MessageEvents: [{ Type: 'Delivered', ReceivedAt: '2026-11-01T12:00:00Z', Recipient: emailMsg.destination }] }] };
    const report = { RecordType: 'Delivery', MessageID: PM_ID, Recipient: emailMsg.destination, Metadata: { dispatch_message_id: emailMsg.id } };
    const first = await recordPostmarkReport(db, report, { token: 't', fetch: postmark(details) });
    const again = await recordPostmarkReport(db, report, { token: 't', fetch: postmark(details) });
    const evs = await events(emailMsg.id, 'delivered');
    check('a delivery Postmark confirms is recorded against the message', first.result === 'recorded' && evs.length === 1 && evs[0].account_id === accountId && evs[0].is_test === true, JSON.stringify(first));
    check('the time Postmark gives is kept', evs[0]?.detail?.delivered_at === '2026-11-01T12:00:00Z');
    check('the same delivery sent again is recorded once', again.result === 'duplicate' && evs.length === 1, JSON.stringify(again));

    const forged = await recordPostmarkReport(db, report, { token: 't', fetch: postmark({ [`/messages/outbound/${PM_ID}/details`]: [200, { MessageEvents: [{ Type: 'Opened' }] }] }) });
    check('a delivery Postmark has no record of is not recorded', forged.result === 'unverified');
    const notFound = await recordPostmarkReport(db, report, { token: 't', fetch: postmark({}) });
    check('nor one Postmark answers "not found" for', notFound.result === 'unverified');
    let threw = false;
    try { await recordPostmarkReport(db, report, { token: 't', fetch: postmark({ [`/messages/outbound/${PM_ID}/details`]: 'down' }) }); } catch { threw = true; }
    check('Postmark out of reach is an error, so the route asks for the report again', threw);

    const stranger = postmark(details);
    const unknown = await recordPostmarkReport(db, { ...report, MessageID: 'pm-never-sent' }, { token: 't', fetch: stranger });
    check('a report for a message Posterity never sent is ignored, without asking Postmark', unknown.result === 'ignored' && stranger.calls.length === 0);
    const open = await recordPostmarkReport(db, { RecordType: 'Open', MessageID: PM_ID }, { token: 't', fetch: postmark(details) });
    check('a report type not subscribed to is ignored', open.result === 'ignored');
  }

  console.log('Postmark: bounced');
  {
    const report = { RecordType: 'Bounce', ID: 4242, MessageID: PM_ID, Email: emailMsg.destination, Type: 'HardBounce' };
    const bounces = { '/bounces/4242': [200, { ID: 4242, MessageID: PM_ID, Type: 'HardBounce', Inactive: true, Description: 'The server was unable to deliver your message' }] };
    const first = await recordPostmarkReport(db, report, { token: 't', fetch: postmark(bounces) });
    const again = await recordPostmarkReport(db, report, { token: 't', fetch: postmark(bounces) });
    const evs = await events(emailMsg.id, 'bounced');
    check('a bounce Postmark confirms is recorded, with its type', first.result === 'recorded' && evs.length === 1 && evs[0].detail.bounce_type === 'HardBounce' && evs[0].detail.inactive === true, JSON.stringify(first));
    check('the same bounce sent again is recorded once', again.result === 'duplicate' && evs.length === 1);
    const other = await recordPostmarkReport(db, { ...report, ID: 4343 }, { token: 't', fetch: postmark({ '/bounces/4343': [200, { ID: 4343, MessageID: 'pm-someone-else' }] }) });
    check('a bounce Postmark ties to a different message is not recorded', other.result === 'unverified' && (await events(emailMsg.id, 'bounced')).length === 1);
  }

  console.log('The Postmark route');
  {
    const POST = await route('postmark');
    delete process.env.POSTMARK_SERVER_TOKEN;
    check('without the server token it answers 503, so Postmark tries again', (await POST(new Request('http://x/', { method: 'POST', body: '{}' }))).status === 503);
    process.env.POSTMARK_SERVER_TOKEN = 't';
    check('a body that is not JSON is refused (400)', (await POST(new Request('http://x/', { method: 'POST', body: 'nope' }))).status === 400);
  }

  console.log('Twilio: the status callback route');
  {
    const POST = await route('twilio/status');
    const path = '/api/dispatch/twilio/status';
    delete process.env.TWILIO_AUTH_TOKEN;
    check('without the Twilio keys it answers 503', (await POST(twilioRequest(path, { AccountSid: ACCOUNT }))).status === 503);
    Object.assign(process.env, { TWILIO_AUTH_TOKEN: TOKEN, TWILIO_ACCOUNT_SID: ACCOUNT, NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY });
    const fields = { AccountSid: ACCOUNT, MessageSid: SM_ID, MessageStatus: 'undelivered', ErrorCode: '30034', To: PHONE };

    check('a forged report is refused (403) and nothing is recorded',
      (await POST(twilioRequest(path, fields, { token: 'guess' }))).status === 403 && (await events(textMsg.id, 'failed')).length === 0);
    const sending = await (await POST(twilioRequest(path, { ...fields, MessageStatus: 'sent', ErrorCode: '' }))).json();
    check('a status on the way (sent) is not recorded', sending.result === 'ignored');
    const r1 = await POST(twilioRequest(path, fields));
    const r2 = await POST(twilioRequest(path, fields));
    const evs = await events(textMsg.id, 'failed');
    check('an undelivered text is recorded as failed, with the carrier\'s error code', r1.status === 200 && evs.length === 1 && evs[0].outcome === 'undelivered' && evs[0].detail.error_code === 30034, JSON.stringify(evs));
    check('the same report sent again is recorded once', (await r2.json()).result === 'duplicate' && evs.length === 1);
    await POST(twilioRequest(path, { ...fields, MessageStatus: 'delivered', ErrorCode: '' }));
    const del = await events(textMsg.id, 'delivered');
    check('a delivered text is recorded as delivered', del.length === 1 && del[0].detail.error_code === null);
    const unknown = await (await POST(twilioRequest(path, { ...fields, MessageSid: 'SMnever' }))).json();
    check('a report for a text Posterity never sent is ignored', unknown.result === 'ignored');
  }

  console.log('Twilio: texts received');
  {
    const POST = await route('twilio/inbound');
    const path = '/api/dispatch/twilio/inbound';
    const kept = async (sid) => must(await db.from('dispatch_inbound').select().eq('twilio_sid', sid));
    const byNumber = async (type) => must(await db.from('dispatch_events').select('outcome,detail').eq('destination', PHONE).eq('event_type', type).eq('is_test', true).gte('occurred_at', startedAt));
    const agreement = async () => must(await db.from('text_agreements').select().eq('phone', PHONE)).at(0);
    const startedAt = new Date(Date.now() - 1000).toISOString();
    const text = (sid, Body, extra = {}) => new URLSearchParams({ AccountSid: ACCOUNT, MessageSid: sid, From: PHONE, To: '+15043583544', Body, ...extra });

    const forgedSid = `SMforged${run}`;
    inboundSids.push(forgedSid);
    const forged = await POST(twilioRequest(path, Object.fromEntries(text(forgedSid, 'STOP')), { token: 'guess' }));
    check('a forged text is refused (403) and nothing is kept', forged.status === 403 && (await kept(forgedSid)).length === 0);
    // A signed text goes on to the database. Pointed at an address nothing
    // answers, the route asks to be sent the text again, which proves the
    // signature was accepted without writing a real-looking row. The rest go
    // to recordInbound directly and are flagged as tests.
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:9';
    const signed = await POST(twilioRequest(path, Object.fromEntries(text(`SMsigned${run}`, 'HELP'))));
    check('a signed text is accepted and goes on to be recorded (503 here, so Twilio would retry)', signed.status === 503);
    process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;

    const helpSid = `SMhelp${run}`;
    inboundSids.push(helpSid);
    const h = await recordInbound(db, text(helpSid, 'HELP'), { isTest: true });
    check('HELP is kept as help', h.handledAs === 'help' && (await kept(helpSid))[0]?.handled_as === 'help');

    const before = await agreement();
    phoneWasNew = !before;
    must(await db.rpc('dispatch_record_agreement', { p_phone: PHONE, p_account_id: accountId, p_is_test: true }));

    const stopSid = `SMstop${run}`;
    inboundSids.push(stopSid);
    const s1 = await recordInbound(db, text(stopSid, 'Stop'), { isTest: true });
    const a1 = await agreement();
    check('STOP ends the number\'s agreement', s1.handledAs === 'stop' && a1.status === 'stopped' && a1.stopped_via === 'stop_reply', JSON.stringify(a1));
    check('the text is kept', (await kept(stopSid))[0]?.handled_as === 'stop');
    check('and it confirms the number', (await byNumber('confirmed')).some((e) => e.detail.via === 'inbound_text' && e.detail.twilio_sid === stopSid));
    const stopsBefore = (await byNumber('stop')).length;
    const s2 = await recordInbound(db, text(stopSid, 'Stop'), { isTest: true });
    check('the same text sent again is handled once', s2.result === 'duplicate' && (await byNumber('stop')).length === stopsBefore && (await kept(stopSid)).length === 1);

    const startSid = `SMstart${run}`;
    inboundSids.push(startSid);
    const s3 = await recordInbound(db, text(startSid, 'START'), { isTest: true });
    check('START is recorded, and the number stays stopped until Settings', s3.handledAs === 'start' && (await agreement()).status === 'stopped' && (await byNumber('start')).length === 1);

    const otherSid = `SMother${run}`;
    inboundSids.push(otherSid);
    await recordInbound(db, text(otherSid, 'I am fine, thanks'), { isTest: true });
    const o = (await kept(otherSid))[0];
    check('any other text is kept for the Check-in System, unconsumed', o?.handled_as === 'other' && o.body === 'I am fine, thanks' && o.consumed_at === null);
    check('every text handled is logged as inbound', (await byNumber('inbound')).length === 4);
  }
} catch (err) {
  fails++;
  console.log(`  ✗ stopped: ${err?.message ?? err}`);
} finally {
  console.log('\nCleanup');
  for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  rmSync(dir, { recursive: true, force: true });
  if (inboundSids.length) must(await db.from('dispatch_inbound').delete().in('twilio_sid', inboundSids));
  if (phoneWasNew) must(await db.from('text_agreements').delete().eq('phone', PHONE));
  if (uid) {
    await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
      method: 'DELETE', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
  }
  must(await db.from('dispatch_copy').delete().in('key', [COPY, SMS_COPY]));
  console.log('  test user, copy, agreement and kept texts removed (its events stay in the append-only log)');
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
