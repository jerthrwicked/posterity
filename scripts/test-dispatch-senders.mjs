// Tests the Communication Dispatch System's two senders (lib/dispatch/senders.js)
// and the scheduler route's wiring of them.
//
// Postmark and Twilio are answered by a stand-in for every outcome either can
// give, so the retry decision is checked for each. Postmark is also called for
// real with its public test token, POSTMARK_API_TEST, which accepts an email and
// delivers nothing. Twilio is called for real only when its test credentials are
// in the environment (TWILIO_TEST_ACCOUNT_SID, TWILIO_TEST_AUTH_TOKEN), which
// accept a text and deliver nothing. No live key is read or needed.
//
// Run: node scripts/test-dispatch-senders.mjs
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { postmarkSender, twilioSender, EMAIL_FROM, EMAIL_REPLY_TO, SMS_FROM, SMS_MAX_CHARS } from '../lib/dispatch/senders.js';

let passed = 0, failed = 0, skipped = 0;
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}
function skip(name, why) { skipped++; console.log(`  - ${name} (skipped: ${why})`); }

// A stand-in for fetch that answers with one status and body, and keeps the request.
function answering(status, body) {
  const calls = [];
  const fake = async (url, init) => {
    calls.push({ url, init });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  };
  fake.calls = calls;
  return fake;
}
function unreachable() {
  const fake = async () => { throw new TypeError('fetch failed'); };
  fake.calls = [];
  return fake;
}
async function outcome(sender, input) {
  try { return { ok: true, value: await sender.send(input) }; }
  catch (err) { return { ok: false, err }; }
}

const email = { id: 41, channel: 'email', destination: 'test@yourposterity.com', copy_key: 'email.test', from_name: null };
const rendered = { subject: 'A test', html: '<p>Hello.</p>', text: 'Hello.' };
const text = { id: 42, channel: 'sms', destination: '+15045550123', copy_key: 'sms.test' };

console.log('Postmark: what is sent');
{
  const fetch = answering(200, { ErrorCode: 0, Message: 'OK', MessageID: 'pm-1', To: email.destination });
  const r = await outcome(postmarkSender({ token: 'tok', fetch }), { message: email, rendered });
  const { url, init } = fetch.calls[0];
  const sent = JSON.parse(init.body);
  check('posts to Postmark\'s email endpoint', url === 'https://api.postmarkapp.com/email' && init.method === 'POST');
  check('carries the server token in its header', init.headers['X-Postmark-Server-Token'] === 'tok');
  check('names Posterity alone when no delivery name is given', sent.From === `"Posterity" <${EMAIL_FROM}>`, sent.From);
  check('replies go to admin@yourposterity.com', sent.ReplyTo === EMAIL_REPLY_TO && EMAIL_REPLY_TO === 'admin@yourposterity.com');
  check('sends both the designed and the plain-text version', sent.HtmlBody === rendered.html && sent.TextBody === rendered.text);
  check('subject, recipient and stream as given', sent.Subject === 'A test' && sent.To === email.destination && sent.MessageStream === 'outbound');
  check('the queue\'s message id rides along for the delivery callbacks', sent.Metadata.dispatch_message_id === '41');
  check('resolves with Postmark\'s id for the send', r.ok && r.value.providerMessageId === 'pm-1', JSON.stringify(r.value ?? r.err?.message));
}
{
  const fetch = answering(200, { ErrorCode: 0, MessageID: 'pm-2' });
  await outcome(postmarkSender({ token: 'tok', fetch }), { message: { ...email, from_name: 'Ana "the" Reyes\r\nBcc: x' }, rendered });
  const sent = JSON.parse(fetch.calls[0].init.body);
  check('a delivery\'s name is used, with quotes and line breaks stripped', sent.From === `"Ana the ReyesBcc: x" <${EMAIL_FROM}>`, sent.From);
}

console.log('Postmark: what is retried');
for (const [status, body, retryable, why] of [
  [422, { ErrorCode: 406, Message: 'Inactive recipient' }, false, 'an inactive recipient is refused for good'],
  [422, { ErrorCode: 412, Message: 'Account pending approval' }, false, 'an address off the domain while unapproved is refused for good'],
  [401, { ErrorCode: 10, Message: 'Bad or missing server token' }, true, 'a wrong key is retried until someone fixes it'],
  [429, { Message: 'Rate limit' }, true, 'a rate limit is retried'],
  [500, 'Internal Server Error', true, 'an outage is retried, even with no JSON body'],
]) {
  const r = await outcome(postmarkSender({ token: 'tok', fetch: answering(status, body) }), { message: email, rendered });
  check(`${status}: ${why}`, !r.ok && r.err.retryable === retryable, r.ok ? 'resolved' : `${r.err.retryable} ${r.err.message}`);
}
{
  const r = await outcome(postmarkSender({ token: 'tok', fetch: unreachable() }), { message: email, rendered });
  check('no answer at all is retried', !r.ok && r.err.retryable === true);
  check('a sender cannot be made without a token', (() => { try { postmarkSender({}); return false; } catch { return true; } })());
}

console.log('Postmark: the real API with its test token');
{
  const r = await outcome(postmarkSender({ token: 'POSTMARK_API_TEST' }), { message: email, rendered });
  check('Postmark accepts the email and returns an id', r.ok && typeof r.value.providerMessageId === 'string' && r.value.providerMessageId.length > 0,
    r.ok ? JSON.stringify(r.value) : r.err.message);
}

console.log('Twilio: what is sent');
{
  const fetch = answering(201, { sid: 'SM123', status: 'queued' });
  const r = await outcome(twilioSender({ accountSid: 'ACabc', authToken: 'sec', fetch }), { message: text, rendered: { body: 'Hello.' } });
  const { url, init } = fetch.calls[0];
  const form = new URLSearchParams(init.body);
  check('posts to the account\'s Messages endpoint', url === 'https://api.twilio.com/2010-04-01/Accounts/ACabc/Messages.json' && init.method === 'POST');
  check('signs in with the account SID and auth token', init.headers.Authorization === `Basic ${Buffer.from('ACabc:sec').toString('base64')}`);
  check('sends from 504-358-3544 by default', form.get('From') === SMS_FROM && SMS_FROM === '+15043583544');
  check('to the number and with the body given', form.get('To') === text.destination && form.get('Body') === 'Hello.');
  check('no status callback until one is configured', !form.has('StatusCallback'));
  check('resolves with Twilio\'s id for the send', r.ok && r.value.providerMessageId === 'SM123');
}
{
  const fetch = answering(201, { sid: 'SM124' });
  const r = await outcome(twilioSender({ accountSid: 'ACabc', authToken: 'sec', fetch }), { message: text, rendered: { body: 'x'.repeat(SMS_MAX_CHARS) } });
  check('a text of exactly 1,600 characters is sent', r.ok && fetch.calls.length === 1);
}
{
  const fetch = answering(201, { sid: 'SM125' });
  const r = await outcome(twilioSender({ accountSid: 'ACabc', authToken: 'sec', fetch }), { message: text, rendered: { body: 'x'.repeat(SMS_MAX_CHARS + 1) } });
  check('a text of 1,601 characters is refused for good, without calling Twilio', !r.ok && r.err.retryable === false && fetch.calls.length === 0);
}
{
  const fetch = answering(201, { sid: 'SM126' });
  const r = await outcome(twilioSender({ accountSid: 'ACabc', authToken: 'sec', fetch }), { message: text, rendered: { body: '' } });
  check('an empty text is refused for good, without calling Twilio', !r.ok && r.err.retryable === false && fetch.calls.length === 0);
}

console.log('Twilio: what is retried');
for (const [status, body, retryable, why] of [
  [400, { code: 21211, message: 'Invalid To number' }, false, 'an invalid number is refused for good'],
  [400, { code: 21610, message: 'Attempt to send to unsubscribed recipient' }, false, 'a number that replied STOP is refused for good'],
  [400, { code: 21408, message: 'Permission to send to this region is not enabled' }, false, 'a region not enabled is refused for good'],
  [400, { code: 21606, message: 'The From phone number is not a valid, SMS-capable inbound phone number' }, true, 'an error not known to be final is retried'],
  [401, { code: 20003, message: 'Authenticate' }, true, 'a wrong key is retried until someone fixes it'],
  [429, { code: 20429, message: 'Too Many Requests' }, true, 'a rate limit is retried'],
  [503, 'Service Unavailable', true, 'an outage is retried, even with no JSON body'],
]) {
  const r = await outcome(twilioSender({ accountSid: 'ACabc', authToken: 'sec', fetch: answering(status, body) }), { message: text, rendered: { body: 'Hello.' } });
  check(`${status}${body.code ? ` (${body.code})` : ''}: ${why}`, !r.ok && r.err.retryable === retryable, r.ok ? 'resolved' : `${r.err.retryable} ${r.err.message}`);
}
{
  const r = await outcome(twilioSender({ accountSid: 'ACabc', authToken: 'sec', fetch: unreachable() }), { message: text, rendered: { body: 'Hello.' } });
  check('no answer at all is retried', !r.ok && r.err.retryable === true);
}

console.log('Twilio: the real API with its test credentials');
if (process.env.TWILIO_TEST_ACCOUNT_SID && process.env.TWILIO_TEST_AUTH_TOKEN) {
  const sender = twilioSender({ accountSid: process.env.TWILIO_TEST_ACCOUNT_SID, authToken: process.env.TWILIO_TEST_AUTH_TOKEN, from: '+15005550006' });
  const ok = await outcome(sender, { message: { ...text, destination: '+15005550006' }, rendered: { body: 'Hello.' } });
  check('Twilio accepts a text and returns an id', ok.ok && ok.value.providerMessageId?.startsWith('SM'), ok.ok ? '' : ok.err.message);
  const bad = await outcome(sender, { message: { ...text, destination: '+15005550001' }, rendered: { body: 'Hello.' } });
  check('Twilio\'s invalid test number is refused for good', !bad.ok && bad.err.retryable === false, bad.ok ? 'resolved' : bad.err.message);
} else {
  skip('Twilio accepts a text and returns an id', 'no Twilio test credentials in the environment');
}

console.log('The scheduler route');
{
  // The route's imports leave off their extensions, as Next allows, so it is
  // bundled before Node can load it.
  const dir = mkdtempSync(join(tmpdir(), 'dispatch-route-'));
  const out = join(dir, 'route.mjs');
  await build({
    entryPoints: [new URL('../app/api/dispatch/run/route.js', import.meta.url).pathname],
    bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'silent',
  });
  const { POST } = await import(pathToFileURL(out).href);
  const call = () => POST(new Request('http://x/api/dispatch/run', { method: 'POST', headers: { authorization: 'Bearer s' } }));
  const KEYS = ['POSTMARK_SERVER_TOKEN', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'];
  const saved = Object.fromEntries(['DISPATCH_RUN_SECRET', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', ...KEYS].map((k) => [k, process.env[k]]));

  process.env.DISPATCH_RUN_SECRET = 's';
  for (const missing of KEYS) {
    for (const k of KEYS) process.env[k] = 'x';
    delete process.env[missing];
    const res = await call();
    check(`without ${missing}, the pass does not run (503)`, res.status === 503 && (await res.text()) === 'senders not configured');
  }
  // With every key present the route goes on to the database. It is pointed at
  // an address nothing answers, so reaching that failure proves the senders
  // were built, and no queue anywhere is touched.
  for (const k of KEYS) process.env[k] = 'x';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:9';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
  let stoppedAt;
  try { const res = await call(); stoppedAt = `answered ${res.status}`; } catch (err) { stoppedAt = String(err?.message ?? err); }
  check('with all three keys, the senders are built and the pass goes on to claim', /fetch failed/i.test(stoppedAt) && !stoppedAt.includes('runPass:'), stoppedAt);

  for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ''}`);
process.exit(failed ? 1 : 0);
