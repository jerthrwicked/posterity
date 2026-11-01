// Records a person's agreement to texts and queues the confirmation that
// follows it (Master Specification, the Communication Dispatch System: "Every
// agreement is followed by that confirmation", and as a text the person has
// just set off themselves it goes immediately, outside the sending window).
//
// The agreement belongs to the phone number. Recording it also confirms the
// number, and the event log keeps who agreed, how, and the disclosure they were
// shown, since those may need to be evidenced years later.
//
// The agreement and the queued confirmation are two writes. If the second
// fails, the agreement stands without its confirmation, and the caller's error
// says so; calling again records the agreement afresh and queues its
// confirmation.

import { enqueue } from './enqueue.js';

const E164 = /^\+[1-9][0-9]{7,14}$/;
const CONFIRMATION = 'sms.agreement_confirmation';

function must({ data, error }) {
  if (error) throw error;
  return data;
}

// db: a service-role Supabase client.
// accountId: the account the agreement was given within, which the queued
//   confirmation belongs to.
// who: who agreed, e.g. { role: 'customer', user_id } or { role: 'legacy_guard', ... }.
// how: where they agreed, e.g. 'profile_text_switch'.
// disclosure: the disclosure text shown beside the switch, exactly as shown.
// caller: the confirmation's caller label; a test script gives its own, beginning
//   'test-', so the live scheduler leaves the confirmation to it.
// Returns { agreement, confirmation }: the text_agreements row and the queued
// confirmation message.
export async function recordAgreement(db, { phone, accountId, who, how, disclosure, isTest = false, caller = 'agreement' }) {
  if (!phone || !E164.test(phone)) throw new Error('recordAgreement: phone must be E.164, e.g. +15045551234');
  if (!accountId) throw new Error('recordAgreement: accountId is required');
  if (!who || typeof who !== 'object') throw new Error('recordAgreement: who agreed is required');
  if (!how) throw new Error('recordAgreement: how they agreed is required');
  if (!disclosure) throw new Error('recordAgreement: the disclosure shown is required');

  const agreement = must(await db.rpc('dispatch_record_agreement', {
    p_phone: phone,
    p_account_id: accountId,
    p_detail: { who, how, disclosure },
    p_is_test: isTest,
  }));

  const [confirmation] = await enqueue(db, {
    accountId,
    phone,
    copy: { sms: CONFIRMATION },
    caller,
    selfInitiated: true,
    idempotencyKey: `agreement:${phone}:${agreement.agreed_at}`,
    isTest,
  });

  return { agreement, confirmation };
}
