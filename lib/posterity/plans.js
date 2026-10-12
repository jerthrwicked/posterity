// Posterity — the plan catalog. THE single source of truth for what a plan is,
// what it costs, and how it's billed. The checkout route validates the customer's
// choice against THIS (never a client-supplied price id), and the pricing cards
// render their price from it — so the displayed price and the charged price can
// never drift apart again.
//
// Re-pricing is a Stripe Price ID swap (per the July-2026 pricing analysis): edit
// the priceId here and, for live, the id for the live-mode product. These are the
// current Stripe TEST-mode price ids.
//
// Billing model (from the context doc): plans are paid UP FRONT per plan-year
// (mode 'payment'); only the Horizon storage fee recurs (mode 'subscription').
//
// standard and feature are each tier's deliveries per plan year, from the
// specification's Subscription Tiers table. Standard Deliveries carry text and
// images; Feature Deliveries also carry video.

export const PLANS = {
  horizon: { id: 'horizon', name: 'Horizon', tier: 'horizon', price: '$9.99', mode: 'subscription', priceId: 'price_1UHEk8BcdnR2VoDg768Poe7B' },
  basic:   { id: 'basic',   name: 'Basic',   tier: 'basic',   price: '$49',   mode: 'payment',      priceId: 'price_1TcvdEBcdnR2VoDgGEYC3RtA', standard: 4,  feature: 1 },
  premium: { id: 'premium', name: 'Premium', tier: 'premium', price: '$129',  mode: 'payment',      priceId: 'price_1TtgZxBcdnR2VoDgc40u5BRt', standard: 12, feature: 4 },
  legacy:  { id: 'legacy',  name: 'Legacy',  tier: 'legacy',  price: '$399',  mode: 'payment',      priceId: 'price_1TtgZxBcdnR2VoDgLqiUvC3j', standard: 52, feature: 12 },
};

// Grace Storage sits outside PLANS on purpose: the checkout route accepts only
// what PLANS holds, and Grace Storage has no public checkout. Posterity assigns
// it when a Grace plan request is approved. Shown on the pricing page only.
export const GRACE_STORAGE = { id: 'grace_storage', name: 'Grace Storage', price: '$4.99', mode: 'subscription', priceId: 'price_1UHEc8BcdnR2VoDgwqlr8z6M' };

export function getPlan(id) {
  return Object.prototype.hasOwnProperty.call(PLANS, id) ? PLANS[id] : null;
}

export function planForPriceId(priceId) {
  return Object.values(PLANS).find((p) => p.priceId === priceId) || null;
}
