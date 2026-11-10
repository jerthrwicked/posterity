// The Worker's entry. The site itself is OpenNext's generated worker, passed
// through unchanged; this file adds the cycle that wakes the Communication
// Dispatch System's scheduler.
//
// Every minute (the cron in wrangler.jsonc) a scheduled event calls
// POST /api/dispatch/run through the site's own fetch handler, with the shared
// secret, so the pass runs exactly as it would for any other caller. The route
// refuses until DISPATCH_RUN_SECRET is set and both senders exist, so until the
// Postmark and Twilio keys arrive each wake is a refusal and nothing is sent.
//
// The same wake then calls POST /api/account-recovery/run, which moves access
// for each account recovery whose seven days have run. Each call stands alone,
// so one failing never stops the other.

import handler from './.open-next/worker.js';

export default {
  fetch: handler.fetch,

  async scheduled(controller, env, ctx) {
    for (const [name, path] of [['dispatch', '/api/dispatch/run'], ['account recovery', '/api/account-recovery/run']]) {
      try {
        const req = new Request(`https://www.yourposterity.com${path}`, {
          method: 'POST',
          headers: { authorization: `Bearer ${env.DISPATCH_RUN_SECRET ?? ''}` },
        });
        const res = await handler.fetch(req, env, ctx);
        const body = (await res.text()).slice(0, 200);
        console.log(`${name} pass (${controller.cron}): ${res.status} ${body}`);
      } catch (err) {
        console.log(`${name} pass (${controller.cron}): threw ${String(err?.message ?? err).slice(0, 200)}`);
      }
    }
  },
};

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';
