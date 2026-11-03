// Checks the signature Supabase puts on every call to the Send Email hook.
//
// Supabase signs the hook's calls the Standard Webhooks way: three headers,
// webhook-id, webhook-timestamp, and webhook-signature, where the signature is
// an HMAC-SHA256 of "<id>.<timestamp>.<raw body>" under the shared secret,
// base64, written "v1,<signature>". The secret Supabase hands out reads
// "v1,whsec_<base64 key>", and the key is what the HMAC uses. A call older
// than five minutes is refused, so a captured call cannot be replayed later.
//
// Twenty lines beat a dependency: the repository bundles into a Worker, and
// this is the whole of the Standard Webhooks check.

import { createHmac, timingSafeEqual } from 'node:crypto';

export const TOLERANCE_S = 5 * 60;

// The HMAC key from the secret as Supabase shows it, with or without its "v1,whsec_" prefix.
export function hookKey(secret) {
  const b64 = String(secret ?? '').trim().replace(/^v1,/, '').replace(/^whsec_/, '');
  if (!b64) throw new Error('send email hook: the secret is empty');
  return Buffer.from(b64, 'base64');
}

export function sign(key, id, timestamp, body) {
  return createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
}

// headers: anything with .get(name), such as a Request's headers.
// Returns { ok: true } or { ok: false, reason }.
export function verifySignature(body, headers, secret, now = Date.now()) {
  const id = headers.get('webhook-id');
  const timestamp = headers.get('webhook-timestamp');
  const given = headers.get('webhook-signature');
  if (!id || !timestamp || !given) return { ok: false, reason: 'missing signature headers' };

  const ts = Number(timestamp);
  if (!Number.isInteger(ts)) return { ok: false, reason: 'bad timestamp' };
  if (Math.abs(now / 1000 - ts) > TOLERANCE_S) return { ok: false, reason: 'timestamp outside tolerance' };

  const expected = Buffer.from(sign(hookKey(secret), id, timestamp, body));
  // The header may carry several signatures, space separated, each "v1,<base64>".
  for (const part of given.split(' ')) {
    const [version, sig] = part.split(',', 2);
    if (version !== 'v1' || !sig) continue;
    const candidate = Buffer.from(sig);
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) return { ok: true };
  }
  return { ok: false, reason: 'no signature matched' };
}
