import Stripe from 'stripe';

// One Stripe client, built on first use rather than when a route module loads.
// A module-level `new Stripe(key)` throws during `next build` when the key is not
// in the build environment — and on Cloudflare the key is a runtime secret, so
// it never is at build time. Lazy construction keeps secrets out of the build.
//
// The client talks to Stripe through fetch. Its default, Node's http module,
// never answers on Workers: the request hangs until Cloudflare cancels it.
let client;
export function getStripe() {
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });
  return client;
}
