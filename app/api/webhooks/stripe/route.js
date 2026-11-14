import Stripe from 'stripe';
import { getStripe } from '../../../../lib/posterity/stripe';
import { createClient } from '@supabase/supabase-js';
import { applyPaymentSetupAsOpened, PaymentSetupRefused, PAYMENT_SETUP } from '../../../../lib/posterity/payment-setup';
import { applyCheckoutAsOpened, CheckoutRefused, CART } from '../../../../lib/posterity/checkout';
import { periodEnd, extendStorage, recordSubscription } from '../../../../lib/posterity/storage-subscriptions';

// Workers have no synchronous HMAC; Web Crypto is async-only. The async verifier
// works on Node as well, so this is safe on Vercel and on Cloudflare.
const cryptoProvider = Stripe.createSubtleCryptoProvider();

// Service-role client: the webhook runs with no user session, so it writes past
// RLS. A storage subscription is recorded here and by the cart's checkout
// (lib/posterity/storage-subscriptions.js); a plan payment is recorded by the
// cart's checkout alone (lib/posterity/checkout.js), which this calls.
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
// ⚠️ TO ACTIVATE (Jeremy): set STRIPE_WEBHOOK_SECRET as a Worker secret
// (`wrangler secret put` or the Cloudflare dashboard, never in the build) and
// register this endpoint (`/api/webhooks/stripe`) in the Stripe dashboard for the events
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
    event = await getStripe().webhooks.constructEventAsync(raw, sig, secret, undefined, cryptoProvider);
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

// The payment form opened from Settings to save a payment method
// (lib/posterity/payment-setup.js). The customer's browser returning to
// /api/payment-setup/return applies it too; whichever arrives second changes
// nothing. Applying it also charges any storage fee the account owes to the
// payment method saved. A form that is refused, such as one an account has
// since replaced with a newer one, will be refused on every retry as well, so
// it is logged and acknowledged. Anything else fails the event, and Stripe
// sends it again.
async function onPaymentSetup(db, session) {
  if (session.metadata?.purpose !== PAYMENT_SETUP || !session.metadata?.account_id) return;
  try {
    await applyPaymentSetupAsOpened(db, getStripe(), { sessionId: session.id });
  } catch (err) {
    if (!(err instanceof PaymentSetupRefused)) throw err;
    console.log(`[stripe-webhook] payment setup ${session.id} not applied: ${err.reason}`);
  }
}

// The cart's payment form (lib/posterity/checkout.js): plans paid for, each
// with its inclusions, and the storage subscription where the storage fee was
// not current. The customer's browser returning to /api/cart/return applies
// it too; whichever arrives second changes nothing. A form that is refused
// will be refused on every retry as well, so it is logged and acknowledged.
// Anything else fails the event, and Stripe sends it again.
async function onCart(db, session) {
  try {
    await applyCheckoutAsOpened(db, getStripe(), { sessionId: session.id });
  } catch (err) {
    if (!(err instanceof CheckoutRefused)) throw err;
    console.log(`[stripe-webhook] cart checkout ${session.id} not applied: ${err.reason}`);
  }
}

async function onCheckoutCompleted(db, session) {
  // A session that saves a payment method takes no payment. It is handled
  // first and on its own, so it can never be recorded as a payment below.
  if (session.mode === 'setup') {
    await onPaymentSetup(db, session);
    return;
  }

  // The cart's form carries its own record of what it was opened for.
  if (session.metadata?.purpose === CART) {
    await onCart(db, session);
    return;
  }

  const accountId = session.client_reference_id || session.metadata?.account_id;
  if (!accountId) return;

  // Storage bought alone (recurring): record/refresh the subscription.
  // Idempotent on the subscription id, so Stripe retries can't duplicate it.
  if (session.mode === 'subscription' && session.subscription) {
    const sub = await getStripe().subscriptions.retrieve(session.subscription);
    await recordSubscription(db, {
      accountId,
      customerId: session.customer,
      sub,
      tier: session.metadata?.tier,
      priceId: session.metadata?.price_id,
    });
    return;
  }

  // Every plan payment runs through the cart, so a one-time payment that is
  // not the cart's is none of Posterity's making. Nothing is recorded for it.
  console.log(`[stripe-webhook] checkout ${session.id} is not the cart's and opens no subscription: nothing recorded`);
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
