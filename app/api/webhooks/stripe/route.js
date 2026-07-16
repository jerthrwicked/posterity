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

  try {
    if (event.type === 'checkout.session.completed') {
      await onCheckoutCompleted(event.data.object);
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await onSubscriptionChange(event.data.object);
    }
  } catch (err) {
    // Return 500 so Stripe retries — never swallow a failed write.
    console.error('[stripe-webhook]', event.type, err);
    return new Response('handler error', { status: 500 });
  }

  return Response.json({ received: true });
}

async function onCheckoutCompleted(session) {
  const db = admin();
  const accountId = session.client_reference_id || session.metadata?.account_id;
  if (!accountId) return;
  const tier = session.metadata?.tier || null;
  const priceId = session.metadata?.price_id || null;

  // Horizon (recurring): record/refresh the subscription. Idempotent on the
  // subscription id, so Stripe retries can't duplicate it.
  if (session.mode === 'subscription' && session.subscription) {
    const sub = await stripe.subscriptions.retrieve(session.subscription);
    await db.from('subscriptions').upsert({
      account_id: accountId,
      stripe_customer_id: session.customer || null,
      stripe_subscription_id: sub.id,
      stripe_price_id: sub.items?.data?.[0]?.price?.id || priceId,
      tier: tier || 'horizon',
      status: sub.status,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
    }, { onConflict: 'stripe_subscription_id' });
    return;
  }

  // Plan (one-time, paid up front): this is an INITIATE event — the account is
  // now contractually funded. Record the paid plan and, if the account is still
  // in Horizon, move it to Planning (the documented initiate transition).
  //
  // ⚠️ Jeremy — review before enabling: (a) WHICH plan_year a payment funds and
  // skip-year storage fees aren't derivable from a single price and are left to
  // your fuller initiation flow; (b) the one-time insert isn't yet idempotent on
  // Stripe retries (no natural unique key on this table for a one-time payment —
  // add an events-processed table or a session-id column if that matters).
  await db.from('subscriptions').insert({
    account_id: accountId,
    stripe_customer_id: session.customer || null,
    stripe_price_id: priceId,
    tier,
    status: 'paid',
  });
  const { data: acct } = await db
    .from('accounts')
    .select('phase, initiated_at')
    .eq('id', accountId)
    .single();
  if (acct && acct.phase === 'horizon') {
    await db.from('accounts').update({
      phase: 'planning',
      initiated_at: acct.initiated_at || new Date().toISOString(),
    }).eq('id', accountId);
  }
}

async function onSubscriptionChange(sub) {
  await admin().from('subscriptions').update({
    status: sub.status,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  }).eq('stripe_subscription_id', sub.id);
}
