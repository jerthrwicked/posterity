// Posterity — the storage subscriptions an account holds · Walker Brown
//
// An account holds a storage subscription from its first storage payment.
// Supabase's `subscriptions` table says which Stripe subscriptions are the
// account's: the Stripe webhook and the cart's checkout write those rows
// (recordSubscription, below), and a customer can read their own and write
// none, so nothing built on this can be pointed at a subscription that is not
// the account's own. Everything else about a subscription is read from
// Stripe, which is the record of it.
//
// Settings reads this once for both of its payment cards: the automatic
// payments switch (automatic-payments.js) and payment setup (payment-setup.js).

function must({ data, error }) {
  if (error) throw error;
  return data;
}

// Stripe's statuses for a subscription that is over: nothing will renew.
const ENDED = new Set(['canceled', 'incomplete_expired']);

// A Settings page waits on Stripe for this long and no longer, with no second try.
export const READ = { timeout: 8000, maxNetworkRetries: 0 };

// The account's storage subscriptions as Stripe holds them now, oldest first,
// those that are over left out. Stripe is asked for each rather than the row's
// `status` trusted, since the row is only as fresh as the last webhook.
//
// Each comes back with its customer, its own saved payment method and the
// customer's default payment method in full, so a caller can show the card
// without asking Stripe again.
//
// db: a Supabase client that can read the account's `subscriptions` rows, the
// customer's own or the service role's.
// options: Stripe request options, such as READ.
//
// Throws where Supabase or Stripe cannot be read.
export async function liveSubscriptions(db, stripe, accountId, options) {
  if (!accountId) throw new Error('storage subscriptions: the account is required');
  const { data, error } = await db.from('subscriptions')
    .select('stripe_subscription_id')
    .eq('account_id', accountId)
    .not('stripe_subscription_id', 'is', null)
    .order('created_at');
  if (error) throw error;

  const subs = await Promise.all(data.map(async (row) => {
    try {
      return await stripe.subscriptions.retrieve(row.stripe_subscription_id, {
        expand: ['default_payment_method', 'customer.invoice_settings.default_payment_method'],
      }, options);
    } catch (err) {
      // A subscription Stripe no longer holds is over.
      if (err?.code === 'resource_missing') return null;
      throw err;
    }
  }));
  return subs.filter((sub) => sub && !ENDED.has(sub.status));
}

// When a subscription's paid period ends. Stripe's current API keeps the
// billing period on each subscription item, not on the subscription itself,
// so the subscription-level field reads undefined.
export function periodEnd(sub) {
  const end = sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end;
  return end ? new Date(end * 1000) : null;
}

// A paid storage year (Horizon or Grace Storage) keeps the account current
// through the end of its billing period. Only an active subscription extends
// it, and it only ever moves forward: a cancellation leaves the paid year
// standing. storage_paid_through is a server-only column
// (guard_account_columns blocks the customer's own token), and this is the
// server path that writes it.
//
// db: a Supabase client with the service role.
export async function extendStorage(db, accountId, sub) {
  const end = periodEnd(sub);
  if (sub.status !== 'active' || !end) return;
  const through = end.toISOString().slice(0, 10);
  const acct = must(await db.from('accounts').select('storage_paid_through').eq('id', accountId).single());
  if (acct.storage_paid_through && acct.storage_paid_through >= through) return;
  must(await db.from('accounts').update({ storage_paid_through: through }).eq('id', accountId));
}

// Records a storage subscription as the account's own and carries its paid
// year onto the account. Written once per subscription: recording the same
// one again refreshes its row and changes nothing else.
//
// sub: the subscription as Stripe holds it.
// tier: the storage product, horizon or grace.
// db: a Supabase client with the service role.
export async function recordSubscription(db, { accountId, customerId, sub, tier, priceId }) {
  if (!accountId) throw new Error('storage subscriptions: the account is required');
  const end = periodEnd(sub);
  must(await db.from('subscriptions').upsert({
    account_id: accountId,
    stripe_customer_id: customerId || null,
    stripe_subscription_id: sub.id,
    stripe_price_id: sub.items?.data?.[0]?.price?.id || priceId || null,
    tier: tier || 'horizon',
    status: sub.status,
    current_period_end: end ? end.toISOString() : null,
  }, { onConflict: 'stripe_subscription_id' }));
  await extendStorage(db, accountId, sub);
}
