// Posterity — the storage subscriptions an account holds · Walker Brown
//
// An account holds a storage subscription from its first storage payment.
// Supabase's `subscriptions` table says which Stripe subscriptions are the
// account's: the Stripe webhook writes those rows, and a customer can read
// their own and write none, so nothing built on this can be pointed at a
// subscription that is not the account's own. Everything else about a
// subscription is read from Stripe, which is the record of it.
//
// Settings reads this once for both of its payment cards: the automatic
// payments switch (automatic-payments.js) and payment setup (payment-setup.js).

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
