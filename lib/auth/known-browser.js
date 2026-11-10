// "A browser that has signed into that login before" (Master Specification,
// Settings, Account recovery), Founder Build Roadmap, Stage 4.2.
//
// A browser holding a session is given a marker: a random value in a cookie of
// its own, one cookie per login. known_browsers holds a SHA-256 of the marker
// against the login, never the marker. An account recovery request opens only
// from a browser whose cookie matches a row there.
//
//   rememberBrowser   proxy.js calls it for a signed-in page load whose cookie
//                     is missing or was last recorded over thirty days ago, so
//                     a browser costs at most one write a month per login.
//   isKnownBrowser    the recovery request's check.
//
// The marker is always made here. A cookie value the server did not issue
// matches no row and is replaced, never adopted, so a value planted in
// someone's browser cannot become a way in.
//
// A browser keeps a cookie 400 days at most, so the cookie is renewed while the
// person keeps coming back and a row unseen for 400 days is pruned.
//
// This file uses Web Crypto rather than node:crypto because the proxy imports
// it. Every write runs with the service role: known_browsers is server-only
// (20261110000000_account_recovery).

export const COOKIE_PREFIX = 'posterity_kb_';
export const KEEP_DAYS = 400;
export const RENEW_DAYS = 30;
export const MAX_BROWSERS = 50;

const DAY_MS = 24 * 60 * 60 * 1000;
const MARKER = /^[A-Za-z0-9_-]{43}$/;

function must({ data, error }) {
  if (error) throw error;
  return data;
}

async function sha256(text) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text))));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function newMarker() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// One cookie per login, so two people sharing a browser each keep their own.
// The name carries a hash of the login's id rather than the id.
export async function cookieName(userId) {
  return COOKIE_PREFIX + (await sha256(userId)).slice(0, 16);
}

// The cookie's value is `<marker>.<when it was last recorded, in seconds>`.
// Returns { marker, at } or null for anything else.
export function parseCookie(value) {
  const [marker, seconds, ...rest] = String(value ?? '').split('.');
  if (rest.length || !MARKER.test(marker) || !/^[0-9]{1,12}$/.test(seconds ?? '')) return null;
  return { marker, at: new Date(Number(seconds) * 1000) };
}

// Whether the cookie was recorded recently enough that nothing needs writing.
// The proxy checks this before it builds a database client.
export function isFresh(value, now = new Date()) {
  const held = parseCookie(value);
  if (!held) return false;
  const age = now.getTime() - held.at.getTime();
  return age >= 0 && age < RENEW_DAYS * DAY_MS;
}

export function cookieOptions({ secure }) {
  return { httpOnly: true, sameSite: 'lax', secure: !!secure, path: '/', maxAge: KEEP_DAYS * 24 * 60 * 60 };
}

// Records this browser against the login and returns the cookie value to set.
// A marker already recorded for the login is kept and its last-seen time
// moved; anything else gets a new marker.
export async function rememberBrowser(db, { userId, cookieValue = null, now = () => new Date() }) {
  if (!userId) throw new Error('known browser: userId is required');
  const at = now();
  const stamp = (marker) => `${marker}.${Math.floor(at.getTime() / 1000)}`;

  const held = parseCookie(cookieValue);
  if (held) {
    const kept = must(await db.from('known_browsers').update({ last_seen_at: at.toISOString() })
      .eq('user_id', userId).eq('marker_hash', await sha256(held.marker)).select('marker_hash'));
    if (kept.length === 1) return stamp(held.marker);
  }

  const marker = newMarker();
  must(await db.from('known_browsers').insert({
    user_id: userId, marker_hash: await sha256(marker), first_seen_at: at.toISOString(), last_seen_at: at.toISOString(),
  }));

  // Rows no cookie can still match, and anything past the login's newest fifty.
  must(await db.from('known_browsers').delete().eq('user_id', userId)
    .lt('last_seen_at', new Date(at.getTime() - KEEP_DAYS * DAY_MS).toISOString()));
  const extra = must(await db.from('known_browsers').select('marker_hash').eq('user_id', userId)
    .order('last_seen_at', { ascending: false }).range(MAX_BROWSERS, MAX_BROWSERS + 199));
  if (extra.length) {
    must(await db.from('known_browsers').delete().eq('user_id', userId).in('marker_hash', extra.map((r) => r.marker_hash)));
  }
  return stamp(marker);
}

// Whether the cookie's marker is one recorded for this login within the past
// 400 days. The time inside the cookie is not trusted; the row's is.
export async function isKnownBrowser(db, { userId, cookieValue, now = () => new Date() }) {
  const held = parseCookie(cookieValue);
  if (!userId || !held) return false;
  const rows = must(await db.from('known_browsers').select('last_seen_at')
    .eq('user_id', userId).eq('marker_hash', await sha256(held.marker)));
  return rows.length === 1 && new Date(rows[0].last_seen_at).getTime() > now().getTime() - KEEP_DAYS * DAY_MS;
}
