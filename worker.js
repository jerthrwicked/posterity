// The Worker's entry. The site itself is OpenNext's generated worker, passed
// through unchanged; this file adds the cycle that wakes the Communication
// Dispatch System's scheduler.
//
// Every minute (the cron in wrangler.jsonc) a scheduled event calls
// POST /api/dispatch/run through the site's own fetch handler, with the shared
// secret, so the pass runs exactly as it would for any other caller. The route
// refuses until DISPATCH_RUN_SECRET is set and both senders exist, so until the
// Postmark and Twilio keys arrive each wake is a refusal and nothing is sent.

import handler from './.open-next/worker.js';

export default {
  fetch: handler.fetch,

  async scheduled(controller, env, ctx) {
    const req = new Request('https://www.yourposterity.com/api/dispatch/run', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.DISPATCH_RUN_SECRET ?? ''}` },
    });
    const res = await handler.fetch(req, env, ctx);
    const body = (await res.text()).slice(0, 200);
    console.log(`dispatch pass (${controller.cron}): ${res.status} ${body}`);
  },
};

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';
