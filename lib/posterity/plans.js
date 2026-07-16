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

export const PLANS = {
  horizon: { id: 'horizon', name: 'Horizon', tier: 'horizon', price: '$9.99', mode: 'subscription', priceId: 'price_1Tcvq1BcdnR2VoDgYustrs4G' },
  basic:   { id: 'basic',   name: 'Basic',   tier: 'basic',   price: '$49',   mode: 'payment',      priceId: 'price_1TcvdEBcdnR2VoDgGEYC3RtA' },
  premium: { id: 'premium', name: 'Premium', tier: 'premium', price: '$129',  mode: 'payment',      priceId: 'price_1TtgZxBcdnR2VoDgc40u5BRt' },
  legacy:  { id: 'legacy',  name: 'Legacy',  tier: 'legacy',  price: '$399',  mode: 'payment',      priceId: 'price_1TtgZxBcdnR2VoDgLqiUvC3j' },
};

export function getPlan(id) {
  return Object.prototype.hasOwnProperty.call(PLANS, id) ? PLANS[id] : null;
}

export function planForPriceId(priceId) {
  return Object.values(PLANS).find((p) => p.priceId === priceId) || null;
}
