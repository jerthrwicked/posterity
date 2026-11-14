import { getStripe } from '../../../lib/posterity/stripe';
import { createClient } from '../../../lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { PLANS } from '../../../lib/posterity/plans';
import { stripeCustomerFor } from '../../../lib/posterity/stripe-customer';


// Create a Stripe Checkout session for the signed-in customer: the storage fee
// bought on its own, from the pricing page.
//
// A plan is not bought here. It is placed on its year through Add a plan and
// paid for from the cart (lib/posterity/checkout.js), which carries the plan,
// its plan year, and everything that travels with it. This route accepts
// Horizon alone and refuses every other choice as unknown_plan.
//
// This route used to take NO auth, accept the price id straight from the client
// (so a caller could pay $9.99 for Legacy), always run mode:'payment' (so the
// recurring Horizon fee never renewed), and send Stripe no identity — a webhook
// would have had nothing to attach the money to. All four are fixed below.
export async function POST(req) {
  // 1) Require a signed-in user. Checkout must know WHO is paying.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'not_authenticated' }, { status: 401 });
  }

  // 2) The client sends a PLAN CHOICE, never a price. The price is resolved
  //    server-side from the trusted catalog, so it can't be tampered with.
  let body = {};
  try { body = await req.json(); } catch { /* empty body → unknown_plan below */ }
  const plan = body?.plan === PLANS.horizon.id ? PLANS.horizon : null;
  if (!plan) {
    return Response.json({ error: 'unknown_plan' }, { status: 400 });
  }

  // 3) The account is created at signup by a DB trigger; attach the money to it.
  const { data: account, error: acctErr } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (acctErr || !account) {
    return Response.json({ error: 'no_account' }, { status: 409 });
  }

  // Identity the webhook keys off. Carried on the session AND on the
  // subscription/payment object, so it's present whichever one Stripe returns.
  const metadata = {
    user_id: user.id,
    account_id: account.id,
    tier: plan.tier,
    plan: plan.id,
    price_id: plan.priceId,
  };

  // 4) The account is one customer within Stripe. Sending Stripe an email
  //    address instead opened a new customer at every checkout, each holding
  //    its own payment method. Only Posterity sets the account's customer, so
  //    it is read and written with the service role.
  const stripe = getStripe();
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const customer = await stripeCustomerFor(admin, stripe, { accountId: account.id, userId: user.id, email: user.email });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const session = await stripe.checkout.sessions.create({
    mode: plan.mode, // 'subscription': the storage fee recurs each year
    line_items: [{ price: plan.priceId, quantity: 1 }],
    client_reference_id: account.id,
    customer,
    metadata,
    subscription_data: { metadata },
    success_url: `${siteUrl}/dashboard?success=true`,
    cancel_url: `${siteUrl}/pricing?canceled=true`,
  });

  return Response.json({ url: session.url });
}
