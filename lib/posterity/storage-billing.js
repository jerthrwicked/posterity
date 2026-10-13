// Posterity — storage renewal, on the Stripe side.
//
// Master Specification, Horizon Tier: "the storage fee is charged to the
// customer's saved payment method each year by default, and the customer can
// turn automatic payments off." Where automatic payments are off, "a payment
// request is sent on the due date."
//
// Both are one Stripe subscription. Automatic payments on is Stripe's
// charge_automatically, which every storage subscription Checkout opens already
// is. Off is send_invoice: at each renewal Stripe raises the year's invoice and
// leaves it open for the customer to pay, due the same day, so a payment request
// unpaid past its due date is one day late at most. The renewal date never
// moves either way.
//
// Stripe's own customer emails stay off (a dashboard setting, not an API one),
// since every automated message leaves through the Communication Dispatch System.

// Storage years paid in advance are years, not credit: three years bought are
// three renewals that charge nothing, whatever the storage price is by then.
// They sit on the subscription's schedule as a stretch of years carrying a
// 100%-off coupon, followed by one ordinary year, after which the schedule
// lets the subscription go on renewing as before. Each prepaid renewal is
// still a renewal, a paid invoice of $0, so the paid-through date moves
// forward exactly as it does for a charged year. Cancelling the subscription
// when the account enters Interlude ends the schedule and any unused years.
const PREPAID_COUPON = 'prepaid_storage_year';
const PREPAID_COUPON_NAME = '[Placeholder: Prepaid storage year]';
const DAY = 86400;

const AUTOMATIC = { collection_method: 'charge_automatically' };
const BY_REQUEST = { collection_method: 'send_invoice', invoice_settings: { days_until_due: 0 } };

// stripe: a Stripe client (getStripe()).
// on: true for automatic payments, false for a payment request at each renewal.
// Returns the updated subscription.
//
// Turning automatic payments on needs a saved payment method, on the
// subscription or as the customer's default, and is refused without one rather
// than set to fail at the next renewal. An invoice already open as a payment
// request stays one: the change reaches the next renewal, not a bill already sent.
//
// A subscription with prepaid years is run by its schedule, which sets the
// subscription afresh at each change of phase, so the choice is made on the
// schedule and carries through the prepaid years and past them.
export async function setAutomaticPayments(stripe, subscriptionId, on) {
  if (typeof on !== 'boolean') throw new Error('setAutomaticPayments: on must be true or false');
  const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['customer'] });

  if (on) {
    const saved = sub.default_payment_method || sub.customer?.invoice_settings?.default_payment_method;
    if (!saved) throw new Error('setAutomaticPayments: no saved payment method to charge');
  }

  if (sub.schedule) {
    await stripe.subscriptionSchedules.update(sub.schedule, { default_settings: on ? AUTOMATIC : BY_REQUEST });
    return stripe.subscriptions.retrieve(subscriptionId);
  }
  return stripe.subscriptions.update(subscriptionId, on
    ? AUTOMATIC
    : { collection_method: 'send_invoice', days_until_due: 0 });
}

// The coupon prepaid years carry, made on first use under a fixed id so the
// sandbox and live accounts each hold exactly one.
async function prepaidCoupon(stripe) {
  try {
    return (await stripe.coupons.retrieve(PREPAID_COUPON)).id;
  } catch (err) {
    if (err.code !== 'resource_missing') throw err;
  }
  try {
    return (await stripe.coupons.create({ id: PREPAID_COUPON, percent_off: 100, duration: 'forever', name: PREPAID_COUPON_NAME })).id;
  } catch (err) {
    if (err.code === 'resource_already_exists') return PREPAID_COUPON;
    throw err;
  }
}

const couponOf = (d) => d.coupon?.id ?? d.coupon;
const priceOf = (item) => item.price?.id ?? item.price;

// Adds `years` prepaid storage years to a subscription, after any it already
// holds. Called once the payment for them has succeeded; collecting that
// payment is the cart's work, not this function's.
//
// reference: the id of the payment that bought the years. A reference already
// applied is skipped, so a retried webhook cannot add the same years twice.
// Returns the subscription's schedule.
export async function prepayYears(stripe, subscriptionId, years, reference) {
  if (!Number.isInteger(years) || years < 1) throw new Error('prepayYears: years must be a whole number of at least one');
  if (!reference) throw new Error('prepayYears: the reference of the payment is required');
  const key = `prepaid_${reference}`.slice(0, 40);

  const coupon = await prepaidCoupon(stripe);
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  if (sub.status !== 'active') throw new Error(`prepayYears: the subscription is ${sub.status}, not active`);

  const schedule = sub.schedule
    ? await stripe.subscriptionSchedules.retrieve(sub.schedule)
    : await stripe.subscriptionSchedules.create({ from_subscription: subscriptionId });
  if (schedule.metadata?.[key]) return schedule;

  // The phase running now stays exactly as it is. Prepaid years already waiting
  // after it are counted and laid out again together with the new ones.
  const at = schedule.phases.findIndex((p) => p.start_date === schedule.current_phase.start_date);
  const current = schedule.phases[at];
  const free = (p) => (p.discounts ?? []).some((d) => couponOf(d) === coupon);
  const waiting = schedule.phases.slice(at + 1).filter(free)
    .reduce((n, p) => n + Math.round((p.end_date - p.start_date) / (365.25 * DAY)), 0);
  const items = current.items.map((i) => ({ price: priceOf(i), quantity: i.quantity }));

  return stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: 'release',
    proration_behavior: 'none',
    metadata: { [key]: String(years) },
    phases: [
      { start_date: current.start_date, end_date: current.end_date, items,
        discounts: (current.discounts ?? []).filter(couponOf).map((d) => ({ coupon: couponOf(d) })) },
      { items, discounts: [{ coupon }], duration: { interval: 'year', interval_count: waiting + years } },
      { items, duration: { interval: 'year', interval_count: 1 } },
    ],
  });
}

// Whether a subscription renews by automatic payment.
export function automaticPaymentsOn(sub) {
  return sub.collection_method === 'charge_automatically';
}
