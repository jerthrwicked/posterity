#!/usr/bin/env node
// Posterity — where to continue after signing in
/*
The sign-in page and the links in authentication emails carry `next`, the page
to continue to. This checks that `next` is kept on this site.

  node scripts/test-next-address.mjs                          the check itself
  node scripts/test-next-address.mjs --server http://localhost:3011
                                                              plus the sign-in page on that server

What matters most:
  - a page on this site is kept as written, with anything after its "?"
  - an address somewhere else is refused however it is written: in full,
    with two slashes, with a backslash, or with a tab or line break a browser
    would drop
  - someone who signs in through a link carrying an address somewhere else
    lands on their dashboard, and is never sent off this site

With --server it makes one test user, signs in as them in a real browser, and
deletes them at the end. Needs ~/posterity/.env.local (NEXT_PUBLIC_SUPABASE_URL,
NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) and CHROME_PATH if
Puppeteer's own Chrome is not installed.
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { safeNext } from '../lib/auth/next-address.js';

const flag = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };
const SERVER = flag('--server')?.replace(/\/$/, '') ?? null;

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : `  — ${detail}`}`);
  if (!ok) fails++;
}

const ELSEWHERE = 'elsewhere.invalid';
// Each way of writing an address somewhere else, by name.
const OUTSIDE = {
  'a full address': `https://${ELSEWHERE}/x`,
  'two slashes': `//${ELSEWHERE}/x`,
  'a slash and a backslash': `/\\${ELSEWHERE}/x`,
  'a backslash further in': `/dashboard\\..\\..\\${ELSEWHERE}`,
  'a tab between two slashes': `/\t/${ELSEWHERE}/x`,
  'a line break between two slashes': `/\n/${ELSEWHERE}/x`,
  'a carriage return between two slashes': `/\r/${ELSEWHERE}/x`,
  'no slash at the start': `${ELSEWHERE}/x`,
  'a script': 'javascript:alert(1)',
};
const INSIDE = ['/dashboard', '/dashboard/settings', '/dashboard/settings?payment=saved_paid', '/pricing', '/reset-password', '/dashboard/legacy-guards#primary'];

let browser;
const users = [];
const env = {};
let rest;
try {
  console.log('A page on this site');
  for (const path of INSIDE) check(`${path} is kept as written`, safeNext(path) === path, String(safeNext(path)));

  console.log('\nAn address somewhere else');
  for (const [name, raw] of Object.entries(OUTSIDE)) check(`${name} is refused`, safeNext(raw) === null, JSON.stringify(safeNext(raw)));

  console.log('\nNothing to continue to');
  for (const [name, raw] of [['none given', null], ['left empty', ''], ['not text', 7], ['undefined', undefined]]) {
    check(`${name} is refused, for the caller to use its own landing page`, safeNext(raw) === null, JSON.stringify(safeNext(raw)));
  }

  if (!SERVER) {
    console.log('\nThe sign-in page: skipped, no --server');
  } else {
    console.log(`\nThe sign-in page on ${SERVER}`);
    for (const raw of readFileSync(homedir() + '/posterity/.env.local', 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const i = line.indexOf('=');
        env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      }
    }
    const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!URL_ || !SERVICE) throw new Error('missing Supabase values in ~/posterity/.env.local');
    rest = async (path, { method = 'GET', body } = {}) => {
      const r = await fetch(URL_ + path, {
        method, headers: { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const text = await r.text();
      let data = text;
      try { data = text ? JSON.parse(text) : null; } catch {}
      return [r.status, data];
    };
    const PASSWORD = 'test-password-123';
    const email = `test-na-${Date.now()}-a@yourposterity.com`;
    const [st, made] = await rest('/auth/v1/admin/users', {
      method: 'POST', body: { email, password: PASSWORD, email_confirm: true, user_metadata: { legal_name: 'Next Address Test' } },
    });
    if (st !== 200) throw new Error(`admin create ${email}: ${st} ${JSON.stringify(made)}`);
    users.push(made.id);

    const { default: puppeteer } = await import('puppeteer');
    browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });

    // Signs in through the sign-in page carrying `next`, and gives the first
    // address the browser is then sent to. A page somewhere else is never
    // loaded: the request for it is stopped, and its address kept.
    const signInWith = async (next) => {
      const page = await (await browser.createBrowserContext()).newPage();
      await page.setRequestInterception(true);
      let sentTo = null;
      let armed = false;
      page.on('request', (req) => {
        const top = req.isNavigationRequest() && req.frame() === page.mainFrame();
        if (top && armed && !sentTo) sentTo = req.url();
        if (top && !req.url().startsWith(SERVER + '/')) return req.abort();
        return req.continue();
      });
      await page.goto(`${SERVER}/login${next === null ? '' : `?next=${encodeURIComponent(next)}`}`, { waitUntil: 'networkidle0', timeout: 120000 });
      await page.type('#email', email);
      await page.type('#password', PASSWORD);
      armed = true;
      await page.keyboard.press('Enter');
      for (let i = 0; i < 150 && !sentTo; i++) await new Promise((done) => setTimeout(done, 200));
      await page.browserContext().close();
      return sentTo;
    };

    check('with nothing to continue to, signing in lands on the dashboard', (await signInWith(null)) === `${SERVER}/dashboard`);
    const kept = '/dashboard/settings?payment=saved';
    const went = await signInWith(kept);
    check('a page on this site is where signing in lands, with what follows its "?"', went === SERVER + kept, String(went));
    for (const name of ['a full address', 'two slashes', 'a slash and a backslash', 'a tab between two slashes']) {
      const to = await signInWith(OUTSIDE[name]);
      check(`carrying ${name} for somewhere else, signing in lands on the dashboard`, to === `${SERVER}/dashboard`, String(to));
    }
  }
} catch (e) {
  console.log(`  ✗ stopped: ${e.message}`);
  fails++;
} finally {
  if (browser) await browser.close();
  if (users.length) {
    console.log('\nCleanup');
    let left = 0;
    for (const uid of users) {
      const [st, r] = await rest(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
      if (st !== 200) { left++; console.log(`  could not delete user ${uid}: ${st} ${JSON.stringify(r)}`); }
    }
    console.log(`  ${users.length - left} test user(s) deleted; left: ${left}`);
    if (left) fails++;
  }
}

console.log();
if (fails) {
  console.log(`✗ ${fails} check(s) FAILED`);
  process.exit(1);
}
console.log('✓ all checks passed');
