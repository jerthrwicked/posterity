// The text message switch (Master Specification, Settings: "Text message
// opt-in - off until the customer turns it on with a phone number on file.
// Turning it on is the customer's agreement to texts, given against the
// disclosure beside the switch. Email is always sent and has no switch.").
//
// The switch holds nothing of its own. It reads the agreement record the
// Communication Dispatch System keeps for the number, so a STOP reply shows it
// as off, and turning it on or off writes that record.
//
// An agreement belongs to the number, and text_agreements is keyed by number,
// so a number typed into a form could arrive carrying someone else's agreement.
// Each holder of a number therefore keeps its own confirmed-at stamp, which a
// changed number clears, and the switch reads on only where that stamp stands
// and the number's agreement does.
//
// A number is typed, so before a holder's stamp is set the holder proves the
// number is theirs: the switch shows a code, and the person texts it from that
// number to Posterity's. Only that text's arrival records the agreement and
// sets the stamp. Until then nothing is recorded for the number and nothing is
// sent to it, so typing someone else's number neither agrees for them, texts
// them, nor lets the typist end their agreement. A holder whose stamp already
// stands for the number turns the switch on at once.
//
// The top half of this file is the switch for any holder (the Legacy Guard and
// co-administrator switches reuse it); the bottom half is the customer's,
// whose stamp is accounts.phone_confirmed_at and whose waiting code is a row
// in text_switch_requests.
//
// One agreement covers every text Posterity sends that number, so turning the
// switch off stops them all, wherever else the number is held.

import { randomInt } from 'node:crypto';
import { recordAgreement } from './agreement.js';

// The disclosure beside the switch. The agreement record keeps this text
// exactly as shown, so the page renders this constant and the action records
// it. No approved text exists yet.
export const TEXT_DISCLOSURE =
  '[Placeholder: Product surface copy — Settings: the disclosure beside the text message switch: what Posterity texts, how often, and how to stop]';

export const HOW_SETTINGS = 'settings_text_switch';
// How long the code shown beside the switch waits for its text.
export const CODE_MINUTES = 60;
const STOP_REPLY = 'stop_reply';
const E164 = /^\+[1-9][0-9]{7,14}$/;

// A local server run by a test script sets DISPATCH_TEST_CALLER (it must start
// with test-). What the switch records then is flagged as a test's, and the
// confirmation it queues is left to that script's own pass. The Worker never
// sets it.
const TEST_CALLER = process.env.DISPATCH_TEST_CALLER || null;
const CALLER = 'agreement';

// Why the switch did not move. reason: 'no_number', 'needs_start' or 'not_on'.
export class SwitchRefused extends Error {
  constructor(reason) {
    super(`text switch: ${reason}`);
    this.name = 'SwitchRefused';
    this.reason = reason;
  }
}

function must({ data, error }) {
  if (error) throw error;
  return data;
}

function testCaller(caller) {
  const c = caller ?? TEST_CALLER;
  if (c && !c.startsWith('test-')) throw new Error('text switch: a caller label is for test callers, beginning test-');
  return c || null;
}

async function agreementFor(db, phone) {
  return must(await db.from('text_agreements').select().eq('phone', phone))[0] ?? null;
}

// Twilio refuses a number that replied STOP until the person texts START. A
// START is recorded and nothing more, so the agreement still reads stopped;
// what it changes is that agreeing again can now reach the number.
async function blockedByStopReply(db, agreement) {
  if (agreement?.status !== 'stopped' || agreement.stopped_via !== STOP_REPLY) return false;
  const started = must(await db.from('dispatch_events').select('id')
    .eq('event_type', 'start').eq('destination', agreement.phone)
    .gte('occurred_at', agreement.stopped_at).limit(1));
  return started.length === 0;
}

// db: a service-role Supabase client.
// phone: the number on file, or null. confirmedAt: the holder's own stamp for
//   that number, or null.
// Returns { on, phone }: on only where the holder has confirmed the number and
// the number's agreement stands.
export async function readTextSwitch(db, { phone, confirmedAt }) {
  if (!phone || !E164.test(phone)) return { on: false, phone: null };
  if (!confirmedAt) return { on: false, phone };
  const agreement = await agreementFor(db, phone);
  return { on: agreement?.status === 'agreed', phone };
}

// Throws SwitchRefused 'needs_start' for a number that replied STOP and has not
// texted START since.
async function refuseIfStopped(db, phone) {
  if (await blockedByStopReply(db, await agreementFor(db, phone))) throw new SwitchRefused('needs_start');
}

// Records the agreement and queues its confirmation text, for a holder who has
// proven the number is theirs. Throws SwitchRefused 'needs_start' as above.
// who, how, disclosure, evidence: as recordAgreement keeps them; evidence is
//   how the number was proven.
// caller: a test script's label; without one DISPATCH_TEST_CALLER applies, and
//   without that the confirmation is the live scheduler's.
// Returns { agreement, confirmation }. The holder's own stamp is the caller's
// to set, from agreement.agreed_at.
export async function turnTextsOn(db, { phone, accountId, who, how, disclosure, evidence, caller = null }) {
  if (!phone || !E164.test(phone)) throw new SwitchRefused('no_number');
  if (!evidence || typeof evidence !== 'object') throw new Error('turnTextsOn: how the number was proven is required');
  const test = testCaller(caller);
  await refuseIfStopped(db, phone);
  return recordAgreement(db, { phone, accountId, who, how, disclosure, evidence, isTest: !!test, caller: test ?? CALLER });
}

// Records the stop, with who turned it off and where. Returns the agreement row.
export async function turnTextsOff(db, { phone, accountId, who, how, caller = null }) {
  if (!phone || !E164.test(phone)) throw new SwitchRefused('no_number');
  if (!who || typeof who !== 'object') throw new Error('turnTextsOff: who turned it off is required');
  if (!how) throw new Error('turnTextsOff: where it was turned off is required');
  return must(await db.rpc('dispatch_record_stop', {
    p_phone: phone, p_via: how, p_account_id: accountId, p_detail: { who, how }, p_is_test: !!testCaller(caller),
  }));
}

// ------------------------------------------------------------ the customer's

async function accountNumber(db, accountId) {
  const row = must(await db.from('accounts').select('phone, phone_confirmed_at').eq('id', accountId).single());
  return { phone: row.phone, confirmedAt: row.phone_confirmed_at };
}

// The account's waiting code, or null: only one for the number now on file,
// and only until it expires.
async function waitingFor(db, accountId, phone, now = new Date()) {
  const row = must(await db.from('text_switch_requests').select().eq('account_id', accountId))[0] ?? null;
  if (!row || row.phone !== phone || new Date(row.expires_at) <= now) return null;
  return row;
}

// The customer's switch as Settings shows it: { on, phone, waiting }. waiting
// is { code, expiresAt } while the switch waits for the customer's text, else
// null.
export async function readAccountTextSwitch(db, { accountId, now = new Date() }) {
  const held = await accountNumber(db, accountId);
  const { on, phone } = await readTextSwitch(db, held);
  const row = on || !phone ? null : await waitingFor(db, accountId, phone, now);
  return { on, phone, waiting: row ? { code: row.code, expiresAt: row.expires_at } : null };
}

// The customer turns the switch on, agreeing against the disclosure shown.
// Throws SwitchRefused 'no_number' with no phone number on file and
// 'needs_start' for a number that replied STOP and has not texted START since.
//
// Where this account has already proven the number, the agreement is recorded
// and its confirmation queued at once: returns { on: true, agreement,
// confirmation }.
//
// Otherwise nothing is recorded for the number yet. A code is kept for the
// account, replacing any earlier one, and the agreement waits for a text
// carrying it from that number (confirmTextSwitchByText): returns { on: false,
// waiting: { code, expiresAt } }.
export async function turnAccountTextsOn(db, { accountId, userId, disclosure = TEXT_DISCLOSURE, caller = null, now = new Date() }) {
  const { phone, confirmedAt } = await accountNumber(db, accountId);
  if (!phone) throw new SwitchRefused('no_number');
  const who = { role: 'customer', user_id: userId };

  if (confirmedAt) {
    const done = await turnTextsOn(db, {
      phone, accountId, who, how: HOW_SETTINGS, disclosure, caller,
      evidence: { by: 'number_proven_earlier', confirmed_at: confirmedAt },
    });
    must(await db.from('text_switch_requests').delete().eq('account_id', accountId));
    return { on: true, ...done };
  }

  const test = testCaller(caller);
  await refuseIfStopped(db, phone);
  const row = {
    account_id: accountId, user_id: userId, phone, disclosure, how: HOW_SETTINGS, caller: test ?? CALLER,
    requested_at: now.toISOString(), expires_at: new Date(now.getTime() + CODE_MINUTES * 60 * 1000).toISOString(),
  };
  // Another account waiting on the same number may hold the code drawn; draw again.
  for (let tries = 0; ; tries++) {
    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    const { error } = await db.from('text_switch_requests').upsert({ ...row, code }, { onConflict: 'account_id' });
    if (!error) return { on: false, waiting: { code, expiresAt: row.expires_at } };
    if (error.code !== '23505' || tries >= 4) throw error;
  }
}

// The customer stops waiting: the code is forgotten and nothing was recorded.
export async function cancelAccountTextRequest(db, { accountId }) {
  must(await db.from('text_switch_requests').delete().eq('account_id', accountId));
}

// The customer turns the switch off. Only a switch that reads on can be turned
// off: a number this account has not confirmed may be someone else's, and its
// agreement is not this account's to end. Throws SwitchRefused 'not_on' then.
export async function turnAccountTextsOff(db, { accountId, userId, caller = null }) {
  const held = await accountNumber(db, accountId);
  const { on, phone } = await readTextSwitch(db, held);
  if (!on) throw new SwitchRefused('not_on');
  return turnTextsOff(db, { phone, accountId, who: { role: 'customer', user_id: userId }, how: HOW_SETTINGS, caller });
}

// A text has arrived at Posterity's number (recordInbound calls this for any
// text that is not STOP, START or HELP). Where its digits are the code an
// account is waiting on for that very number, the customer has proven the
// number: the agreement they gave when they turned the switch on is recorded,
// its confirmation queued, the account's stamp set, and the code forgotten.
//
// from: the sender's number. body: the text. sid: Twilio's id for it, kept as
//   the proof. now: the moment it is judged at.
// Returns null where the text answers no waiting code, else { result,
// accountId }: 'on', 'needs_start' (the number replied STOP and has not texted
// START since; the code keeps waiting), or 'number_changed' (the account's
// number changed after the code was shown; nothing is recorded).
//
// The agreement, the stamp and the forgetting are three writes, in that order,
// so a text delivered again after a failure finds the code still waiting and
// completes it.
export async function confirmTextSwitchByText(db, { from, body, sid, now = new Date() }) {
  if (!from || !E164.test(from)) return null;
  const code = String(body ?? '').replace(/\D/g, '');
  if (code.length !== 6) return null;
  const request = must(await db.from('text_switch_requests').select().eq('phone', from).eq('code', code))[0] ?? null;
  if (!request || new Date(request.expires_at) <= now) return null;
  const accountId = request.account_id;
  const forget = () => db.from('text_switch_requests').delete().eq('account_id', accountId).eq('code', code);

  const held = await accountNumber(db, accountId);
  if (held.phone !== from) {
    must(await forget());
    return { result: 'number_changed', accountId };
  }

  let done;
  try {
    done = await turnTextsOn(db, {
      phone: from, accountId, who: { role: 'customer', user_id: request.user_id }, how: request.how, disclosure: request.disclosure,
      evidence: { by: 'text_from_number', twilio_sid: sid, code_shown_at: request.requested_at },
      caller: request.caller.startsWith('test-') ? request.caller : null,
    });
  } catch (err) {
    if (err instanceof SwitchRefused && err.reason === 'needs_start') return { result: 'needs_start', accountId };
    throw err;
  }
  const stamped = must(await db.from('accounts').update({ phone_confirmed_at: done.agreement.agreed_at })
    .eq('id', accountId).eq('phone', from).select('id'));
  must(await forget());
  // The number changed in the instant between: the agreement stands for the
  // number that sent the text, and this account's switch reads off.
  if (!stamped.length) return { result: 'number_changed', accountId };
  return { result: 'on', accountId };
}
