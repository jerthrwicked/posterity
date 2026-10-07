// Tests the Communication Dispatch System's channel policy and renderer against
// answers worked out by hand. Pure: no network, no database, no keys.
//
// Run: node scripts/test-dispatch-policy.mjs
import { decide, zonesFor } from '../lib/dispatch/policy.js';
import { renderEmail, renderSms, fill } from '../lib/dispatch/render.js';

let passed = 0, failed = 0;
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}
function throws(fn) { try { fn(); return false; } catch { return true; } }

const at = (iso) => new Date(iso);
const agreed = (confirmedIso) => ({ status: 'agreed', last_confirmed_at: confirmedIso });
const sms = (destination, extra = {}) => ({ channel: 'sms', destination, self_initiated: false, ...extra });
const FRESH = agreed('2026-09-01T00:00:00Z');

function expectSend(name, msg, agreement, now) {
  const d = decide(msg, agreement, at(now));
  check(name, d.action === 'send', JSON.stringify(d));
}
function expectHold(name, msg, agreement, now, untilIso) {
  const d = decide(msg, agreement, at(now));
  check(name, d.action === 'hold' && d.until.toISOString() === new Date(untilIso).toISOString(), JSON.stringify(d));
}
function expectFail(name, msg, agreement, now, reason) {
  const d = decide(msg, agreement, at(now));
  check(name, d.action === 'fail' && d.reason === reason, JSON.stringify(d));
}

console.log('Email');
expectSend('email always sends, even at 3 AM', { channel: 'email', destination: 'a@b.co' }, null, '2026-10-07T08:00:00Z');

console.log('Agreement and Reassigned Numbers');
expectFail('no agreement on file: not texted', sms('+15045551234'), null, '2026-10-07T15:00:00Z', 'no_agreement');
expectFail('a stopped number: not texted', sms('+15045551234'), { status: 'stopped', last_confirmed_at: '2026-10-01T00:00:00Z' }, '2026-10-07T15:00:00Z', 'stopped');
expectFail('confirmed 366 days ago: not texted', sms('+15045551234'), agreed('2025-10-06T15:00:00Z'), '2026-10-07T15:00:00Z', 'rnd_unavailable');
expectSend('confirmed 364 days ago: texted', sms('+15045551234'), agreed('2025-10-08T15:00:00Z'), '2026-10-07T15:00:00Z');
expectFail('never confirmed: not texted', sms('+15045551234'), agreed(null), '2026-10-07T15:00:00Z', 'rnd_unavailable');
expectFail('self-initiated still needs a recent confirmation', sms('+15045551234', { self_initiated: true }), agreed('2025-01-01T00:00:00Z'), '2026-10-07T15:00:00Z', 'rnd_unavailable');

console.log('Sending window (New Orleans 504, Central, CDT in October)');
expectSend('9:00 AM CDT sends', sms('+15045551234'), FRESH, '2026-10-07T14:00:00Z');
expectHold('7:30 AM CDT waits until 8:00 AM', sms('+15045551234'), FRESH, '2026-10-07T12:30:00Z', '2026-10-07T13:00:00Z');
expectSend('8:59 PM CDT sends', sms('+15045551234'), FRESH, '2026-10-08T01:59:00Z');
expectHold('9:00 PM CDT waits until 8:00 AM next day', sms('+15045551234'), FRESH, '2026-10-08T02:00:00Z', '2026-10-08T13:00:00Z');
expectHold('7:59:30 AM waits until 8:00 AM, never early', sms('+15045551234'), FRESH, '2026-10-07T12:59:30Z', '2026-10-07T13:00:00Z');
expectSend('3 AM sends when the person set it off themselves', sms('+15045551234', { self_initiated: true }), FRESH, '2026-10-07T08:00:00Z');

console.log('Daylight saving ends November 1, 2026');
expectHold('7:30 AM CST (13:30 UTC) waits until 8:00 AM CST (14:00 UTC)', sms('+15045551234'), FRESH, '2026-11-02T13:30:00Z', '2026-11-02T14:00:00Z');

console.log('Other zones');
expectHold('Honolulu 808, 7:00 AM HST waits until 8:00 AM', sms('+18085551234'), FRESH, '2026-10-07T17:00:00Z', '2026-10-07T18:00:00Z');
expectSend('Manhattan 212, 8:15 AM EDT sends', sms('+12125551234'), FRESH, '2026-10-07T12:15:00Z');

console.log('Area codes that cross a time-zone line');
check('270-68x is a Central exchange', JSON.stringify(zonesFor('+12706812345')) === '["America/Chicago"]', JSON.stringify(zonesFor('+12706812345')));
expectHold('270-68x at 8:15 AM EDT (7:15 AM CDT) waits for Central 8:00 AM', sms('+12706812345'), FRESH, '2026-10-07T12:15:00Z', '2026-10-07T13:00:00Z');
expectHold('270 exchange not in the table waits for the hours both zones share', sms('+12709991234'), FRESH, '2026-10-07T12:15:00Z', '2026-10-07T13:00:00Z');
expectHold('270 unlisted at 8:45 PM CDT (9:45 PM EDT) waits until morning', sms('+12709991234'), FRESH, '2026-10-08T01:45:00Z', '2026-10-08T13:00:00Z');

console.log('Numbers the table cannot place');
expectHold('unknown +1 prefix at 10 AM EDT (7 AM PDT) waits for Pacific 8:00 AM', sms('+19995551234'), FRESH, '2026-10-07T14:00:00Z', '2026-10-07T15:00:00Z');
expectHold('unknown +1 prefix at 9:30 PM EDT waits', sms('+19995551234'), FRESH, '2026-10-08T01:30:00Z', '2026-10-08T15:00:00Z');
expectFail('a non-+1 number is not texted', sms('+447700900123'), FRESH, '2026-10-07T14:00:00Z', 'no_time_zone');

console.log('Rendering');
check('a token with no value throws', throws(() => fill('Hello {{name}}', {})));
check('an empty value throws', throws(() => fill('Hello {{name}}', { name: '' })));
check('tokens fill, with spacing allowed', fill('Hi {{ name }}, {{date}}', { name: 'Ana', date: 'May 1' }) === 'Hi Ana, May 1');

const placeholderSms = { key: 'sms.agreement_confirmation', channel: 'sms', sms_body: '[Placeholder: Cascade copy — the confirmation text sent on agreement]' };
check('the seeded placeholder text renders as stored', renderSms(placeholderSms, {}).body === placeholderSms.sms_body);
check('a text with no body throws', throws(() => renderSms({ key: 'x', sms_body: null }, {})));

const frame = { key: 'email.frame', channel: 'email', kind: 'frame', html_body: null, text_body: '[Placeholder: Product surface copy — the automated email frame’s fixed text]' };
const email = renderEmail(
  { key: 't', channel: 'email', subject: 'A note from {{name}}', html_body: '<p>{{name}} wrote to you.</p>', text_body: null },
  { name: 'Ana <script>' }, frame);
check('subject fills unescaped', email.subject === 'A note from Ana <script>');
check('a value is escaped inside the designed email', email.html.includes('Ana &lt;script&gt; wrote') && !email.html.includes('<script>'));
check('plain text is derived when only HTML is stored', email.text.startsWith('Ana <script> wrote to you.'));
check('both versions carry the frame text', email.html.includes('[Placeholder: Product surface copy') && email.text.includes('[Placeholder: Product surface copy'));
check('the designed email carries the seal inline and the sage accent', email.html.includes('<svg') && email.html.includes('#93AB99'));
check('the frame is light, never the black canvas', !/background:#000(000)?\b/i.test(email.html));
const textOnly = renderEmail({ key: 't', channel: 'email', subject: 'S', html_body: null, text_body: 'One.\n\nTwo & <three>' }, {}, frame);
check('HTML is built from text when only text is stored', textOnly.html.includes('<p style="margin:0 0 0px;">Two &amp; &lt;three&gt;</p>'));
check('an email with no frame row throws', throws(() => renderEmail({ key: 't', subject: 'S', text_body: 'x' }, {}, {})));
check('a frame with no body throws', throws(() => renderEmail({ key: 't', subject: 'S', text_body: 'x' }, {}, { key: 'email.frame', kind: 'frame' })));
check('the frame row cannot be sent as a message', throws(() => renderEmail({ ...frame, subject: 'S' }, {}, frame)));
const linked = renderEmail({ key: 't', subject: 'S', text_body: 'x' }, {}, { key: 'email.frame', kind: 'frame', html_body: '<p>Reply to <a href="mailto:admin@yourposterity.com">us</a></p>', text_body: null });
check('a frame stored as HTML keeps its link and gets a text version', linked.html.includes('href="mailto:admin@yourposterity.com"') && linked.text.includes('Reply to us'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
