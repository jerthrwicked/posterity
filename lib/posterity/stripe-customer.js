// Posterity — the account's Stripe customer · Walker Brown
//
// An account is one customer within Stripe. Every checkout the account opens
// belongs to that customer, so its storage subscription, its plan payments
// and its saved payment method (Master Specification, Settings: Payment
// setup) sit together.
//
// accounts.stripe_customer_id holds it. Only Posterity sets that column
// (guard_account_columns), so `db` here is a Supabase client with the service
// role.

function must({ data, error }) {
  if (error) throw error;
  return data;
}

// The customer as Stripe holds it, or null where Stripe no longer holds it.
async function heldBy(stripe, id) {
  try {
    const customer = await stripe.customers.retrieve(id);
    return customer.deleted ? null : customer;
  } catch (err) {
    if (err?.code === 'resource_missing') return null;
    throw err;
  }
}

// The Stripe customer id for an account, opening the customer the first time.
//
// email: the address the account signs in with. The customer within Stripe
// carries it, and it is brought up to date here when the account's has
// changed, since Stripe's payment form shows it.
//
// Two checkouts opened at once for a new account each open a customer; one is
// written to the account and the other is deleted, and both get the one kept.
// A customer deleted within Stripe is replaced the same way.
export async function stripeCustomerFor(db, stripe, { accountId, userId, email }) {
  if (!accountId) throw new Error('stripe customer: the account is required');
  const read = async () => must(await db.from('accounts').select('stripe_customer_id').eq('id', accountId).single()).stripe_customer_id;

  const held = await read();
  if (held) {
    const customer = await heldBy(stripe, held);
    if (customer) {
      if (email && customer.email !== email) await stripe.customers.update(held, { email });
      return held;
    }
  }

  const made = await stripe.customers.create({
    ...(email ? { email } : {}),
    metadata: { account_id: accountId, ...(userId ? { user_id: userId } : {}) },
  });
  // Written only over what was read, so a customer another request has
  // written in the meantime is kept and this one is given up.
  let write = db.from('accounts').update({ stripe_customer_id: made.id }).eq('id', accountId);
  write = held ? write.eq('stripe_customer_id', held) : write.is('stripe_customer_id', null);
  let kept;
  try {
    kept = must(await write.select('stripe_customer_id'));
  } catch (err) {
    await stripe.customers.del(made.id).catch(() => {});
    throw err;
  }
  if (kept.length) return made.id;

  await stripe.customers.del(made.id).catch(() => {});
  const now = await read();
  if (!now) throw new Error('stripe customer: none could be held for the account');
  return now;
}
