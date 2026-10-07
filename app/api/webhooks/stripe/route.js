import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Service-role client: the webhook runs with no user session, so it writes past
// RLS. It is the ONLY thing that records money — the `subscriptions` table exists
// for exactly this ("Written by the Stripe webhook", initial schema).
function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// supabase-js returns a failed write as { error } rather than throwing it. Every
// call goes through this, so a failed write reaches the 500 below and Stripe
// retries, instead of answering "received" for money that was never recorded.
function must({ data, error }) {
  if (error) throw error;
  return data;
}

// Stripe → Posterity payment webhook.
//
// ⚠️ TO ACTIVATE (Jeremy): set STRIPE_WEBHOOK_SECRET in .env.local and register
// this endpoint (`/api/webhooks/stripe`) in the Stripe dashboard for the events
// checkout.session.completed, customer.subscription.updated|deleted. The path
// must be excluded from any auth middleware (Stripe calls it unauthenticated).
export async function POST(req) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return new Response('STRIPE_WEBHOOK_SECRET not configured', { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  const raw = await req.text(); // raw body required for signature verification
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return new Response(`signature verification failed: ${err.message}`, { status: 400 });
  }

  const db = admin();
  try {
    // Idempotency: every event is recorded by Stripe's event id before it is
    // handled, and marked processed only once its handler succeeds. A retry of
    // an event already processed is acknowledged and skipped; a retry of one
    // that failed runs again. Two deliveries of the same event arriving at the
    // same instant can still both run, which Stripe does not normally do.
    const seen = must(await db.from('stripe_events').select('processed_at').eq('id', event.id).maybeSingle());
    if (seen?.processed_at) return Response.json({ received: true, duplicate: true });
    if (!seen) must(await db.from('stripe_events').insert({ id: event.id, type: event.type, payload: event }));

    if (event.type === 'checkout.session.completed') {
      await onCheckoutCompleted(db, event.data.object);
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await onSubscriptionChange(db, event.data.object);
    }

    must(await db.from('stripe_events').update({ processed_at: new Date().toISOString() }).eq('id', event.id));
  } catch (err) {
    // Return 500 so Stripe retries — never swallow a failed write.
    console.error('[stripe-webhook]', event.type, err);
    return new Response('handler error', { status: 500 });
  }

  return Response.json({ received: true });
}

// Stripe's current API keeps the billing period on each subscription item, not
// on the subscription itself, so the subscription-level field reads undefined.
function periodEnd(sub) {
  const end = sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end;
  return end ? new Date(end * 1000) : null;
}

// A paid storage year (Horizon or Grace Storage) keeps the account current
// through the end of its billing period. Only an active subscription extends it,
// and it only ever moves forward: a cancellation leaves the paid year standing.
// storage_paid_through is a server-only column (guard_storage_columns blocks the
// customer's own token), and this is the server path that writes it.
async function extendStorage(db, accountId, sub) {
  const end = periodEnd(sub);
  if (sub.status !== 'active' || !end) return;
  const through = end.toISOString().slice(0, 10);
  const acct = must(await db.from('accounts').select('storage_paid_through').eq('id', accountId).single());
  if (acct.storage_paid_through && acct.storage_paid_through >= through) return;
  must(await db.from('accounts').update({ storage_paid_through: through }).eq('id', accountId));
}

async function onCheckoutCompleted(db, session) {
  const accountId = session.client_reference_id || session.metadata?.account_id;
  if (!accountId) return;
  const tier = session.metadata?.tier || null;
  const priceId = session.metadata?.price_id || null;

  // Horizon (recurring): record/refresh the subscription. Idempotent on the
  // subscription id, so Stripe retries can't duplicate it.
  if (session.mode === 'subscription' && session.subscription) {
    const sub = await stripe.subscriptions.retrieve(session.subscription);
    const end = periodEnd(sub);
    must(await db.from('subscriptions').upsert({
      account_id: accountId,
      stripe_customer_id: session.customer || null,
      stripe_subscription_id: sub.id,
      stripe_price_id: sub.items?.data?.[0]?.price?.id || priceId,
      tier: tier || 'horizon',
      status: sub.status,
      current_period_end: end ? end.toISOString() : null,
    }, { onConflict: 'stripe_subscription_id' }));
    await extendStorage(db, accountId, sub);
    return;
  }

  // Plan (one-time, paid up front): this is an INITIATE event — the account is
  // now contractually funded. Record the paid plan and, if the account is still
  // in Horizon, move it to Planning (the documented initiate transition).
  //
  // ⚠️ Jeremy — still open before enabling: WHICH plan_year a payment funds, and
  // skipped-year storage fees, aren't derivable from a single price. Checkout
  // sends a tier and no plan year, because no cart exists yet. Once it does, a
  // payment belongs on its `plans` row (paid_at) and skipped years on
  // `storage_fees`; until then it is recorded here. Retries no longer duplicate
  // this insert: the stripe_events check in POST skips an event already handled.
  must(await db.from('subscriptions').insert({
    account_id: accountId,
    stripe_customer_id: session.customer || null,
    stripe_price_id: priceId,
    tier,
    status: 'paid',
  }));

  // The phase moves only if it is still Horizon at the moment of the update, so
  // two payments landing together move it once and log it once.
  const now = new Date().toISOString();
  const moved = must(await db.from('accounts')
    .update({ phase: 'planning', phase_entered_at: now })
    .eq('id', accountId).eq('phase', 'horizon')
    .select('initiated_at'));
  if (moved.length) {
    if (!moved[0].initiated_at) {
      must(await db.from('accounts').update({ initiated_at: now }).eq('id', accountId).is('initiated_at', null));
    }
    // account_phase_events is the append-only history of every phase change.
    must(await db.from('account_phase_events').insert({
      account_id: accountId,
      from_phase: 'horizon',
      to_phase: 'planning',
      note: `initiated by plan payment (${tier}, checkout ${session.id})`,
    }));
  }
}

async function onSubscriptionChange(db, sub) {
  const end = periodEnd(sub);
  const rows = must(await db.from('subscriptions').update({
    status: sub.status,
    current_period_end: end ? end.toISOString() : null,
  }).eq('stripe_subscription_id', sub.id).select('account_id'));
  // A renewal arrives as an update with the next period: carry storage forward.
  const accountId = rows[0]?.account_id || sub.metadata?.account_id;
  if (accountId) await extendStorage(db, accountId, sub);
}
