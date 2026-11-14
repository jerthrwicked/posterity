// Posterity — deleting an account · Walker Brown
//
// Master Specification, Settings: "Delete account - available throughout the
// Horizon and Planning Phases and confirmed through double verification.
// Stripe issues any refund owed under the refund policy held within Legal and
// Compliance." And: "The Begin button and account deletion stay locked for
// thirty days after a recovery."
//
// Every record and file ties to its account, so deleting the account removes
// it (Founder Build Roadmap, Stage 4 conventions). The event log is the
// exception. It stays, and it gains the record of the deletion.
//
// The order is what keeps a deletion that stops halfway safe to run again:
//
//   1. A payment form the account left open is closed, and one that was
//      paid is applied (checkout.js). Every plan paid within the refund
//      window is then refunded in full (refunds.js), each refund recorded and
//      its notice queued. A refund Stripe refuses stops the deletion here,
//      with nothing else changed.
//   2. The refund notices and the email confirming the deletion are sent, now
//      and not on the scheduler's next minute: a queued message is removed
//      with its account, so one left in the queue would never go. While one
//      has still to go, nothing below runs.
//   3. The account's storage subscription ends within Stripe. Storage fees
//      are not refunded.
//   4. The account's files are removed from storage.
//   5. The deletion is written to the event log with a summary of what the
//      account held, since the rows that told it are about to go.
//   6. The account's Stripe customers are deleted, and the saved payment
//      method with them. Stripe keeps its own record of the payments.
//   7. The sign-in is deleted, and the database removes the account and every
//      row tied to it.
//
// Nothing before step 3 takes anything from the account but the payment it
// refunds, so a deletion that stops on its notices leaves an account that
// still works, its storage subscription with it. Each step finds what an
// earlier run already did and does not do it twice: a refund already issued,
// a notice already sent, a subscription already ended, a file already gone.
//
// Not here yet: the Legacy Guard logins for the account and the notice to its
// accepted Legacy Guards (Stage 5.1), and the Facebook Page handback (Stage
// 6.4).

import { planPayments, refundOwed, inRefundWindow, issueRefund, refundsIssued, recordRefund, once } from './refunds.js';
import { closeOpenCheckout } from './checkout.js';
import { enqueue } from '../dispatch/enqueue.js';
import { sendNow, allSettled } from '../dispatch/channels.js';

export const DELETION_PHASES = new Set(['horizon', 'planning']);
export const DELETED_COPY = 'email.account_deleted';
export const CALLER = 'account-deletion';
export const CAUSE = 'account_deletion';
export const BUCKET = 'legacy-media';

// A local server run by a test script sets DISPATCH_TEST_CALLER (it must start
// with test-), so what it queues into the live database carries a caller the
// scheduler skips. The Worker never sets it.
const TEST_CALLER = process.env.DISPATCH_TEST_CALLER || null;

// Stripe's statuses for a subscription that is over.
const ENDED = new Set(['canceled', 'incomplete_expired']);

// Why a deletion was refused, as a short reason the caller maps to its own
// words: phase, recovery_lock, no_account, notices_waiting.
export class DeletionRefused extends Error {
  constructor(reason, detail = {}) { super(reason); this.reason = reason; Object.assign(this, detail); }
}

function must({ data, error }) {
  if (error) throw error;
  return data;
}

// Whether deletion is open to an account, from its account_status() row: null
// where it is, or the reason it is not. Settings shows the card from this, and
// deleteAccount asks again before it does anything.
export function deletionClosed(status, now = new Date()) {
  if (!status) return 'no_account';
  if (!DELETION_PHASES.has(status.phase)) return 'phase';
  if (status.recovery_lock_until && new Date(status.recovery_lock_until) > now) return 'recovery_lock';
  return null;
}

// Every Stripe customer that is the account's: the one the account holds, and
// any a `subscriptions` row names from before an account held one.
async function customersOf(db, account) {
  const rows = must(await db.from('subscriptions').select('stripe_customer_id').eq('account_id', account.id));
  return [...new Set([account.stripe_customer_id, ...rows.map((r) => r.stripe_customer_id)].filter(Boolean))];
}

// What deleting the account would refund now, for the card to say before the
// customer confirms. Reads Stripe and changes nothing.
export async function refundsOwedOnDeletion(db, stripe, { accountId, now = new Date() }) {
  const payments = await planPayments(db, stripe, { accountId, now });
  return payments
    .map((payment) => ({ plan: payment.plan, planName: payment.planName, currency: payment.currency, amount: refundOwed(payment, now) }))
    .filter((r) => r.amount > 0);
}

// Step 3. Ends every storage subscription the account holds, those its rows
// name and any other its customers hold, at once and with no final charge.
// Returns each one with when Stripe ended it, so a deletion that carries on
// from an earlier run still records the subscription that run ended.
async function endSubscriptions(db, stripe, { accountId, customerIds }) {
  const rows = must(await db.from('subscriptions').select('stripe_subscription_id')
    .eq('account_id', accountId).not('stripe_subscription_id', 'is', null));
  const ids = new Set(rows.map((r) => r.stripe_subscription_id));
  for (const customer of customerIds) {
    try {
      for await (const sub of stripe.subscriptions.list({ customer, status: 'all', limit: 100 })) {
        ids.add(sub.id);
      }
    } catch (err) {
      if (err?.code !== 'resource_missing') throw err;
    }
  }

  const ended = [];
  const at = (sub) => new Date((sub.canceled_at ?? sub.ended_at ?? sub.created) * 1000).toISOString();
  for (const id of ids) {
    try {
      const sub = await stripe.subscriptions.retrieve(id);
      if (ENDED.has(sub.status)) {
        ended.push({ subscription: id, endedAt: at(sub), now: false });
        continue;
      }
      const over = await stripe.subscriptions.cancel(id, { invoice_now: false, prorate: false });
      ended.push({ subscription: id, endedAt: at(over), now: true });
    } catch (err) {
      // A subscription Stripe no longer holds is over.
      if (err?.code !== 'resource_missing') throw err;
    }
  }
  return ended;
}

// Step 1. Refunds what each plan payment inside the window still holds, and
// completes the record and the notice of any refund an earlier run issued.
async function refundPlans(db, stripe, { accountId, payer, caller, isTest, now }) {
  const done = [];
  for (const payment of await planPayments(db, stripe, { accountId, now })) {
    if (!inRefundWindow(payment, now)) continue;
    const seen = new Set();
    for (const refund of await refundsIssued(stripe, { accountId, payment, cause: CAUSE })) {
      done.push(await recordRefund(db, { accountId, payment, refund, cause: CAUSE, payer, caller, isTest }));
      seen.add(refund.id);
    }
    const amount = refundOwed(payment, now);
    if (amount > 0) {
      const made = await issueRefund(db, stripe, { accountId, payment, amount, cause: CAUSE, payer, caller, isTest });
      if (!seen.has(made.refund)) done.push(made);
    }
  }
  return done;
}

// Every file under the account's folder. A file's first folder is its account
// (the bucket's row-level security keys on it), and storage lists one folder
// at a time.
export async function accountFiles(db, accountId) {
  const paths = [];
  const walk = async (prefix) => {
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw error;
      for (const entry of data) {
        const path = `${prefix}/${entry.name}`;
        if (entry.id === null) await walk(path);
        else paths.push(path);
      }
      if (data.length < 100) break;
    }
  };
  await walk(accountId);
  return paths;
}

// Step 4. Removes the account's files, and reads the folder again to be sure
// none is left.
async function removeFiles(db, accountId) {
  const paths = await accountFiles(db, accountId);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await db.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw error;
  }
  if (paths.length) {
    const left = await accountFiles(db, accountId);
    if (left.length) throw new Error(`account deletion: ${left.length} of ${paths.length} files were not removed`);
  }
  return paths.length;
}

// Every row of a table for the account, a thousand at a time.
async function every(db, table, columns, accountId, order) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const page = must(await db.from(table).select(columns).eq('account_id', accountId)
      .order(order).range(from, from + 999));
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

// What the account held, for the deletion's record: its phase history, its
// check-ins, its plans and what each stored, and its storage. These are the
// records a card dispute is answered with (Master Specification, Legal and
// Compliance), and every row they come from goes with the account. It names
// no recipient and no Legacy Guard, and carries no content.
export async function accountHistory(db, accountId) {
  const account = must(await db.from('accounts')
    .select('created_at, phase, phase_entered_at, initiated_at, checkin_interval_months, next_checkin_due, trial_ends_at, storage_paid_through, storage_lapsed_at, storage_product, recovered_at')
    .eq('id', accountId).single());
  const [phaseEvents, checkins, plans, storageFees, subscriptions, checkouts, checkoutLines, content, recipients, guards] = await Promise.all([
    every(db, 'account_phase_events', 'from_phase, to_phase, source, note, created_at', accountId, 'created_at'),
    every(db, 'checkins', 'due_on, status, answered_at, answered_via, created_at', accountId, 'created_at'),
    every(db, 'plans', 'id, plan_year, tier, paid_at, delivery_year, funds_released_at, delivery_time_zone, standard_deliveries, feature_deliveries, social_posts, additional_recipient_slots, created_at', accountId, 'created_at'),
    every(db, 'storage_fees', 'plan_year, amount_cents, paid_at, created_at', accountId, 'created_at'),
    every(db, 'subscriptions', 'tier, status, stripe_subscription_id, stripe_price_id, current_period_end, created_at', accountId, 'created_at'),
    every(db, 'checkouts', 'id, status, mode, amount_cents, currency, refund_policy_accepted_at, stripe_session_id, stripe_payment_intent_id, stripe_subscription_id, paid_at, created_at', accountId, 'created_at'),
    every(db, 'checkout_lines', 'checkout_id, kind, plan_year, tier, quantity, unit_amount_cents, stripe_price_id', accountId, 'created_at'),
    every(db, 'content_items', 'plan_id, kind, created_at', accountId, 'created_at'),
    every(db, 'recipients', 'id', accountId, 'id'),
    every(db, 'legacy_guards', 'accepted_at', accountId, 'id'),
  ]);

  // What each plan stored: how many items of each kind, and when the first
  // and the last were stored. Items on no plan are counted under 'none'.
  const stored = {};
  for (const item of content) {
    const key = item.plan_id ?? 'none';
    const s = stored[key] ??= { items: 0, kinds: {}, first_stored_at: item.created_at, last_stored_at: item.created_at };
    s.items++;
    s.kinds[item.kind] = (s.kinds[item.kind] ?? 0) + 1;
    if (item.created_at < s.first_stored_at) s.first_stored_at = item.created_at;
    if (item.created_at > s.last_stored_at) s.last_stored_at = item.created_at;
  }

  return {
    account,
    phase_events: phaseEvents,
    checkins,
    plans: plans.map(({ id, ...plan }) => ({ ...plan, content: stored[id] ?? { items: 0, kinds: {} } })),
    content_on_no_plan: stored.none ?? { items: 0, kinds: {} },
    storage_fees: storageFees,
    payments_recorded: subscriptions,
    // Each payment the cart took, with what it was opened for and when the
    // refund policy was accepted before it.
    checkouts: checkouts.map(({ id, ...checkout }) => ({
      ...checkout,
      lines: checkoutLines.filter((line) => line.checkout_id === id).map(({ checkout_id, ...line }) => line),
    })),
    recipients: recipients.length,
    legacy_guards: { named: guards.length, accepted: guards.filter((g) => g.accepted_at).length },
  };
}

// Deletes an account at its customer's confirmed request.
//
// db: a Supabase client with the service role. The customer's own token
//   cannot delete an account (20261026010000_account_guard).
// user: the signed-in Supabase user, whose account it must be. Double
//   verification has already passed; this does not ask again.
// channels: the Communication Dispatch System's senders (channels.js).
// verificationId: the double verification code that confirmed it, kept on the
//   deletion's record.
//
// Returns what it did: { refunds, subscriptionsEnded, filesRemoved, notices }.
// Throws DeletionRefused where the account may not be deleted, or where a
// notice has still to go, with nothing of the customer's removed. Anything
// else thrown is a fault partway, and running it again carries on.
export async function deleteAccount(db, stripe, {
  accountId, user, channels, verificationId = null,
  caller = TEST_CALLER ?? CALLER, refundCaller = TEST_CALLER ?? undefined, isTest = !!TEST_CALLER,
  now = () => new Date(),
}) {
  if (TEST_CALLER && !TEST_CALLER.startsWith('test-')) throw new Error('DISPATCH_TEST_CALLER must start with test-');
  if (!accountId || !user?.id || !user?.email) throw new Error('account deletion: the account and its user are required');
  if (!channels?.email || !channels?.sms) throw new Error('account deletion: the senders are required');

  const account = must(await db.from('accounts').select('id, user_id, name, stripe_customer_id').eq('id', accountId).maybeSingle());
  if (!account || account.user_id !== user.id) throw new DeletionRefused('no_account');
  const status = must(await db.rpc('account_status', { p_account_id: accountId }).maybeSingle());
  const closed = deletionClosed(status, now());
  if (closed) throw new DeletionRefused(closed, { until: status?.recovery_lock_until ?? null });

  const payer = { email: user.email, name: account.name };
  const customerIds = await customersOf(db, account);

  // 1. Closing the open payment form comes first: once Stripe has closed
  // it, nothing can be paid into an account that is going.
  await closeOpenCheckout(db, stripe, { accountId });
  const refunds = await refundPlans(db, stripe, {
    accountId, payer, isTest, now: now(), ...(refundCaller ? { caller: refundCaller } : {}),
  });

  // 2. The email confirming the deletion joins the refund notices, and all
  // of them leave before anything is ended or removed.
  const confirming = await enqueue(db, {
    accountId,
    email: user.email,
    copy: { email: DELETED_COPY },
    params: { name: account.name || user.email },
    caller,
    selfInitiated: true,
    idempotencyKey: `account-deleted:${accountId}`,
    isTest,
  });
  const ids = [...refunds.flatMap((r) => r.messages), ...confirming].map((m) => m.id);
  const notices = await sendNow(db, { ids, channels });
  if (!allSettled(notices)) throw new DeletionRefused('notices_waiting');

  // 3, 4 and 5.
  const subscriptions = await endSubscriptions(db, stripe, { accountId, customerIds });
  const filesRemoved = await removeFiles(db, accountId);
  // One record per account is the database's rule
  // (dispatch_events_account_deleted_once), so a run that follows a fault, or
  // a second request at the same instant, leaves the first record standing.
  once(await db.from('dispatch_events').insert({
    account_id: accountId,
    event_type: 'account_deleted',
    destination: user.email,
    outcome: 'deleted',
    detail: {
      user_id: user.id,
      requested_by: 'customer',
      confirmed_by: 'double_verification',
      verification: verificationId,
      stripe_customers: customerIds,
      storage_subscriptions: subscriptions.map(({ subscription, endedAt }) => ({ subscription, ended_at: endedAt })),
      refunds: refunds.map(({ refund, amount, currency, plan, paymentIntent }) => ({ refund, amount, currency, plan, payment_intent: paymentIntent })),
      notices: notices.map(({ id, status }) => ({ message: id, status })),
      files_removed: filesRemoved,
      history: await accountHistory(db, accountId),
    },
    is_test: isTest,
  }));

  // 6.
  for (const customer of customerIds) {
    try {
      await stripe.customers.del(customer);
    } catch (err) {
      if (err?.code !== 'resource_missing') throw err;
    }
  }

  // 7. Deleting the sign-in removes the account's row, and every row tied to
  // the account goes with it.
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) throw error;
  const left = must(await db.from('accounts').select('id').eq('id', accountId));
  if (left.length) throw new Error('account deletion: the account is still held after its sign-in was deleted');

  return { refunds, subscriptionsEnded: subscriptions.filter((s) => s.now).map((s) => s.subscription), filesRemoved, notices };
}
