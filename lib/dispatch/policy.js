import areaZones from './area-zones.json' with { type: 'json' };

// Channel policy for the Communication Dispatch System, applied at the moment
// of sending (Master Specification, The Communication Dispatch System).
//
// decide() is pure: it takes the queued message, the number's text agreement
// (or null) and the time, and returns what the sender does with it.
//   { action: 'send' }
//   { action: 'hold', until, reason }   wait for the texting window to open
//   { action: 'fail', reason }          never sent; the email still goes
// It reads nothing and writes nothing, so the run loop records the outcome.

// Texts go out between 8 AM and 9 PM in the recipient's local time.
export const WINDOW_OPENS = 8 * 60;   // minutes after local midnight
export const WINDOW_CLOSES = 21 * 60;

// A number not confirmed within the past year is checked against the FCC's
// Reassigned Numbers Database before it is texted. Posterity has no access to
// that database yet, so such a number is not texted: the check fails closed.
export const CONFIRMATION_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

// A +1 number whose prefix the table lacks is judged against the four
// contiguous US zones together, so the window it gets is open in all of them.
const FALLBACK_ZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'];

const STEP_MS = 15 * 60 * 1000;            // every NANP zone offset is a whole quarter hour
const SEARCH_LIMIT_MS = 7 * 24 * 60 * 60 * 1000;

export function decide(message, agreement, now = new Date()) {
  if (message.channel === 'email') return { action: 'send' };
  if (message.channel !== 'sms') return { action: 'fail', reason: 'unknown_channel' };

  if (!agreement) return { action: 'fail', reason: 'no_agreement' };
  if (agreement.status !== 'agreed') return { action: 'fail', reason: 'stopped' };

  const confirmed = agreement.last_confirmed_at ? new Date(agreement.last_confirmed_at) : null;
  if (!confirmed || now - confirmed > CONFIRMATION_MAX_AGE_MS) {
    return { action: 'fail', reason: 'rnd_unavailable' };
  }

  // A text the person set off themselves goes immediately, whatever the hour.
  if (message.self_initiated) return { action: 'send' };

  const zones = zonesFor(message.destination);
  if (!zones) return { action: 'fail', reason: 'no_time_zone' };
  if (inWindow(zones, now)) return { action: 'send' };

  const until = nextWindowOpen(zones, now);
  if (!until) return { action: 'fail', reason: 'no_window' };
  return { action: 'hold', until, reason: 'held_window', zones };
}

// The time zones a number may sit in, from its longest matching prefix. An area
// code that crosses a time-zone line lists every zone it covers, and the text
// waits for the hours they share. Numbers outside +1 return null.
export function zonesFor(phone) {
  const m = /^\+1(\d{10})$/.exec(phone || '');
  if (!m) return null;
  const digits = m[1];
  for (let len = digits.length; len >= 3; len--) {
    const zones = areaZones.prefixes[digits.slice(0, len)];
    if (zones) return zones;
  }
  return FALLBACK_ZONES;
}

export function inWindow(zones, at) {
  return zones.every((zone) => {
    const mins = localMinutes(zone, at);
    return mins >= WINDOW_OPENS && mins < WINDOW_CLOSES;
  });
}

// The first quarter hour at or after `from` when every zone is inside the
// window, or null when the zones never share one.
export function nextWindowOpen(zones, from) {
  let t = Math.ceil(from.getTime() / STEP_MS) * STEP_MS;
  const limit = from.getTime() + SEARCH_LIMIT_MS;
  for (; t <= limit; t += STEP_MS) {
    if (inWindow(zones, new Date(t))) return new Date(t);
  }
  return null;
}

const formatters = new Map();
function localMinutes(zone, at) {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
    formatters.set(zone, f);
  }
  let h = 0, m = 0;
  for (const p of f.formatToParts(at)) {
    if (p.type === 'hour') h = Number(p.value);
    else if (p.type === 'minute') m = Number(p.value);
  }
  return h * 60 + m;
}
