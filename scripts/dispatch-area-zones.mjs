// Rebuilds lib/dispatch/area-zones.json, the table the Communication Dispatch
// System uses to judge a text's local sending window by area code.
//
// Source: Google's libphonenumber prefix-to-time-zone map (Apache License 2.0),
// https://github.com/google/libphonenumber/blob/master/resources/timezones/map_data.txt
// Only the +1 (North American Numbering Plan) prefixes are kept. Most are a
// three-digit area code; where an area code crosses a time-zone line the map
// carries longer prefixes down to the exchange, and lookup takes the longest.
//
// Run: node scripts/dispatch-area-zones.mjs
import { writeFileSync } from 'node:fs';

const SOURCE = 'https://raw.githubusercontent.com/google/libphonenumber/master/resources/timezones/map_data.txt';

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
const lines = (await res.text()).split('\n');

const prefixes = {};
for (const line of lines) {
  const m = line.match(/^1(\d{3,})\|(.+)$/);
  if (!m) continue;
  prefixes[m[1]] = m[2].trim().split('&');
}

// Where an area code is split by exchange, the map gives the area code itself
// only its majority zone. An exchange the map does not list falls back to that
// entry, so it is widened to every zone the area code touches, and the text
// waits for the hours they share rather than risk an hour early.
for (const code of Object.keys(prefixes).filter((p) => p.length === 3)) {
  const zones = new Set(prefixes[code]);
  for (const p of Object.keys(prefixes)) {
    if (p.length > 3 && p.startsWith(code)) prefixes[p].forEach((z) => zones.add(z));
  }
  prefixes[code] = [...zones].sort();
}

const count = Object.keys(prefixes).length;
if (count < 400) throw new Error(`only ${count} +1 prefixes parsed; the source format may have changed`);

// Every zone must be one this runtime knows, or the window check would throw at send.
for (const zones of Object.values(prefixes)) {
  for (const z of zones) new Intl.DateTimeFormat('en-US', { timeZone: z });
}

const out = {
  source: SOURCE,
  license: 'Apache-2.0, The Libphonenumber Authors',
  generated: new Date().toISOString().slice(0, 10),
  prefixes,
};
writeFileSync(new URL('../lib/dispatch/area-zones.json', import.meta.url), JSON.stringify(out) + '\n');
console.log(`wrote ${count} +1 prefixes`);
