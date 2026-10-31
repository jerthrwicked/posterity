# Stage 3.5 — Moving hosting from Vercel to Cloudflare · Walker Brown

Draft migration plan, 2026-10-10. The roadmap's first Stage 3.5 item is this plan, decided with Jeremy.

**Cut over 2026-10-11.** www.yourposterity.com is served by the Worker, and the bare domain redirects
to www through a Cloudflare redirect rule. The Vercel preview step below was skipped: there are no
customers, so the move went straight to the live domain. Deployed by hand:
`NEXT_PUBLIC_SITE_URL=https://www.yourposterity.com bash scripts/cf-build.sh && npx wrangler deploy`.

Done: the Worker on www, the five runtime values as Worker secrets, both Vercel records replaced, the
apex redirect rule, and Supabase's site address and allowed redirects. Checked live: the public pages,
the 404, the signed-out dashboard redirect and checkout's 401, and on October 11 a signed-in session
and a test checkout of every plan on the new host (18 checks).
Open: the webhook stays dormant until
`STRIPE_WEBHOOK_SECRET` is set; deploys from GitHub (decision 1); retiring the Vercel project.

**The way back:** take www off the Worker, delete the apex `AAAA 100::` record and the redirect rule,
and restore the two Vercel CNAMEs (both pointed at `0b1f223f52b56ee2.vercel-dns-017.com`, DNS only).
Vercel still holds its last build.

## What is already proven, on branch `walker/cloudflare`

The site builds for Cloudflare Workers with `@opennextjs/cloudflare` and runs in the Workers runtime
locally. Checked with `wrangler dev`:

- `/`, `/login`, `/signup`, `/pricing` return 200, and an unknown page returns 404.
- `/dashboard` signed out redirects to `/login?next=/dashboard`, so the `proxy.js` auth gate runs.
- Checkout signed out returns 401.
- The Stripe webhook rejects a bad signature with 400 and accepts a correctly signed one.

Not yet checked: a signed-in session, a dashboard write, a real checkout, a real Stripe event.

Code changes it took:

- Next.js 16.2.6 → 16.3.8. The adapter refuses every Next from 16.0 to 16.3.7.
- The Stripe webhook verifies with `constructEventAsync` and Web Crypto. Workers have no synchronous
  HMAC. The async form works on Vercel too.
- The Stripe client is built on first use (`lib/posterity/stripe.js`). Building it when a route loads
  crashed the build, because on Cloudflare the key is a runtime secret.
- `scripts/cf-build.sh` is the build command. The adapter copies every `.env*` file into the Worker,
  and the first build carried the service-role key, the Stripe secret key and the Supabase management
  token inside it. The script builds with public values only and fails if a secret reaches the bundle.

## Decisions for Walker and Jeremy

1. **Deployment flow.** The roadmap asks for deploys from GitHub. Cloudflare's Workers Builds can watch
   `jerthrwicked/posterity` and deploy `main` on every push, the way Vercel does now. That needs Jeremy
   to install Cloudflare's GitHub app on his repository. The alternative is deploying by hand with
   `wrangler deploy`, which keeps a person between every push and the live site.
2. **Plan tier — decided: paid Workers plan at go-live** (Walker, 2026-10-10). The Worker is about
   2.7 MiB compressed, well under the paid plan's 10 MiB limit, and the paid plan lifts the free plan's
   CPU limit per request. Most of the size is Next.js itself; about 0.5 MiB is an image renderer the
   site never uses, pulled in by the `proxy.js` bundle. Dropping it is optional tidying, not a need.
   A `workers.dev` preview fits the free plan's size limit, but a page that fails there may only be
   hitting the free plan's CPU cap. Judge preview failures with that in mind, or upgrade first.
3. **Node middleware.** `proxy.js` runs as Node middleware, which the adapter labels experimental on
   Cloudflare. It worked in every local test. The dashboard pages and RLS still check the user if
   it ever fails open, so it is one layer of three.
4. **The dispatch scheduler.** Nothing calls `/api/dispatch/run` on a schedule today. On Cloudflare a
   Cron Trigger can call it, which needs a small wrapper around the generated Worker. That belongs to
   the Dispatch stage rather than this one.

## Settings on Cloudflare

Build variables, inlined into the browser code at build time:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`, set to `https://www.yourposterity.com`. This also closes the roadmap item
  about addresses still pointing at `posterity-seven.vercel.app`.

Secrets, set with `wrangler secret put` or in the dashboard, never in the build:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`, once the webhook is activated
- `DISPATCH_RUN_SECRET`, once the scheduler exists

## Order of the move

1. Deploy to the `posterity.<account>.workers.dev` preview address. Vercel stays live.
2. Set the secrets. Sign in, add a recipient, upload a photo and run a test-mode checkout on the preview.
3. Add the preview address to Supabase's allowed auth redirects for the length of the test.
4. Cut over in Cloudflare DNS. Attach `www.yourposterity.com` and `yourposterity.com` to the Worker as
   custom domains, replacing the two Vercel CNAMEs. Add a redirect rule sending the apex to `www`,
   which Vercel does today. **The mail records stay exactly as they are**: the MX, SPF, DKIM, DMARC and
   Postmark bounce records.
5. Retest login, checkout and the email links against `www.yourposterity.com`.
6. Point Stripe's return addresses and webhook endpoint at the new host if they changed.
7. Keep Vercel for a week as the way back. Undoing the move means putting the two CNAMEs back.
   Then retire the Vercel project.
