#!/usr/bin/env node
// Posterity — plan records: Add a plan, the year calendar, and the plan options
/*
Plan Selection is where a customer places a plan and changes it before paying
for it (Master Specification, User Profiles, Calendar System, Plan Year System,
Horizon Tier; roadmap Stage 4.3, Plans and Cart). This signs in as two real
customers in real browsers, against the live database, and checks it end to
end.

  node scripts/test-plan-records.mjs --server http://localhost:3011

What matters most:
  - Add a plan places a plan with its tier's allowances and the browser's time
    zone, on the year after the last plan or on the empty year chosen
  - an account that has not been initiated is held to one plan, on the page
    and when a form left open in another tab is sent anyway
  - each year reads Paid, Configured or Skipped, and a skipped year carries
    the storage fee notice; the arrows, the list and the year input all move
  - skipped years before a plan move it and the unpaid plans after it; a paid
    plan never moves, and a move that would reach one is refused
  - a paid plan and a plan placed by staff are read-only but for the time zone
  - deleting a plan shows the specification's sentence first, and removes the
    plan, its content and its files, and nothing else
  - nothing changes once building is closed, on the page or from a stale tab
  - a customer's own token cannot place, move, change or delete a plan, and a
    second customer cannot read, change or delete the first one's plan
  - at a phone's width (375px) nothing runs off the side

No money moves here: a plan is marked paid with the service key, as the
webhook will once the cart exists. It makes two test users and deletes them,
their plans, their content and their files at the end. Needs
~/posterity/.env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY) and CHROME_PATH if Puppeteer's own Chrome is not
installed.
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { PLANS, STORAGE_FEE } from '../lib/posterity/plans.js';
import { BUCKET } from '../lib/posterity/account-deletion.js';

const flag = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };
const SERVER = flag('--server')?.replace(/\/$/, '') ?? null;
if (!SERVER) {
  console.error('usage: node scripts/test-plan-records.mjs --server http://localhost:3011');
  process.exit(2);
}

const env = {};
for (const raw of readFileSync(homedir() + '/posterity/.env.local', 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (line && !line.startsWith('#') && line.includes('=')) {
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) { console.error('missing Supabase values in ~/posterity/.env.local'); process.exit(2); }

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : `  — ${detail}`}`);
  if (!ok) fails++;
}
function must({ data, error }) { if (error) throw error; return data; }

const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
async function rest(path, { method = 'GET', body, key = SERVICE, token } = {}) {
  const r = await fetch(URL_ + path, {
    method,
    headers: { apikey: key, Authorization: 'Bearer ' + (token || key), 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return [r.status, data];
}

// The specification's own sentence (User Profiles, Plan Selection), written
// here a second time so a changed word in the product is caught.
const DELETE_SENTENCE = 'Are you sure? This will permanently delete all work on this plan and cannot be undone.';
// Subscription Tiers, written here a second time for the same reason.
const CARRIES = { basic: [4, 1, 1], premium: [12, 4, 4], legacy: [52, 12, 12] };
const PRICES = { basic: '$49', premium: '$129', legacy: '$399' };
const PASSWORD = 'test-password-123';
const stamp = Date.now();
// The smallest picture the bucket accepts.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const YEARS_AGO = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();

async function waitFor(fn, what, ms = 30000) {
  const end = Date.now() + ms;
  let last;
  for (;;) {
    last = await fn();
    if (last) return last;
    if (Date.now() > end) throw new Error(`waited ${ms / 1000}s for ${what}`);
    await new Promise((done) => setTimeout(done, 150));
  }
}

async function makeUser(tag) {
  const email = `test-pr-${stamp}-${tag}@yourposterity.com`;
  const [st, made] = await rest('/auth/v1/admin/users', {
    method: 'POST', body: { email, password: PASSWORD, email_confirm: true, user_metadata: { legal_name: `Plan Test ${tag}` } },
  });
  if (st !== 200) throw new Error(`admin create ${email}: ${st} ${JSON.stringify(made)}`);
  users.push(made.id);
  const account = must(await db.from('accounts').select('id, trial_ends_at').eq('user_id', made.id).single());
  const [ts, session] = await rest('/auth/v1/token?grant_type=password', { method: 'POST', key: ANON, body: { email, password: PASSWORD } });
  if (ts !== 200 || !session?.access_token) throw new Error(`signing in ${email}: ${ts}`);
  return { email, user: made.id, account: account.id, trialEnds: account.trial_ends_at, token: session.access_token };
}

// The account's plans as the database holds them.
const plansOf = async (who) => must(await db.from('plans').select('*').eq('account_id', who.account).order('plan_year'));
// The same in a line: each plan's year and the first letter of its tier, with
// $ on a paid one. "1b 3b$ 4p" is Basic on Year 1, paid Basic on 3, Premium on 4.
const line = async (who) => (await plansOf(who)).map((p) => `${p.plan_year}${p.tier[0]}${p.paid_at ? '$' : ''}`).join(' ');
const planOn = async (who, year) => (await plansOf(who)).find((p) => p.plan_year === year) ?? null;
const carries = (p) => p && [p.standard_deliveries, p.feature_deliveries, p.social_posts];

let browser;
const users = [];
const folders = [];
try {
  console.log('Signed out');
  for (const path of ['/dashboard/add-plan', '/dashboard/add-plan?year=3', '/dashboard?year=4']) {
    const r = await fetch(SERVER + path, { redirect: 'manual' });
    const to = (r.headers.get('location') ?? '').replace(SERVER, '');
    check(`${path} sends the visitor to log in, to come back to that address`, r.status === 307 && to === `/login?next=${encodeURIComponent(path)}`, `${r.status} ${to}`);
  }

  const A = await makeUser('a');
  const B = await makeUser('b');

  const { default: puppeteer } = await import('puppeteer');
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });

  const go = (pg, path) => pg.goto(SERVER + path, { waitUntil: 'networkidle0', timeout: 120000 });
  const here = (pg) => { const u = new URL(pg.url()); return u.pathname + u.search; };
  // A tab behind another never finishes a click, so each click brings its
  // own tab forward first.
  const click = async (pg, sel) => {
    await pg.bringToFront();
    await pg.$eval(sel, (el) => el.scrollIntoView({ block: 'center' }));
    await pg.click(sel);
  };
  const setNumber = async (pg, sel, n) => {
    await pg.bringToFront();
    await pg.$eval(sel, (el) => { el.scrollIntoView({ block: 'center' }); el.value = ''; });
    await pg.type(sel, String(n));
  };
  const signIn = async (who, zone, from = '/login') => {
    const context = await browser.createBrowserContext();
    const pg = await context.newPage();
    await pg.setViewport({ width: 1280, height: 900 });
    await pg.emulateTimezone(zone);
    await go(pg, from);
    await pg.type('#email', who.email);
    await pg.type('#password', PASSWORD);
    await Promise.all([pg.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 }), pg.keyboard.press('Enter')]);
    return { context, page: pg };
  };
  const secondTab = async (context, zone, path) => {
    const pg = await context.newPage();
    await pg.setViewport({ width: 1280, height: 900 });
    await pg.emulateTimezone(zone);
    await go(pg, path);
    return pg;
  };

  // Plan Selection as the customer's browser has it.
  const view = (pg) => pg.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const text = (s) => q(s)?.textContent.trim().replace(/\s+/g, ' ') ?? null;
    return {
      path: location.pathname + location.search,
      year: q('#plan-selection-year')?.getAttribute('data-year') ?? null,
      panelYear: q('#plan-year-panel')?.getAttribute('data-year') ?? null,
      title: text('#plan-year-title'),
      status: text('#plan-year-panel > div [data-status]'),
      list: [...document.querySelectorAll('#plan-year-list a')].map((a) => [
        a.getAttribute('data-year'), a.getAttribute('data-tier') || '-', a.getAttribute('data-status'),
        a.querySelector('[data-status]')?.textContent.trim(),
        a.querySelector('[data-storage-fee-notice]') ? 'fee' : '',
        a.getAttribute('aria-current') === 'true' ? 'current' : '',
      ].filter(Boolean).join(' ')),
      facts: Object.fromEntries([...document.querySelectorAll('#plan-facts dd')].map((d) => [d.getAttribute('data-fact'), d.textContent.trim()])),
      forms: ['plan-skips', 'plan-slots', 'plan-time-zone', 'plan-tier', 'plan-delete'].filter((id) => !!q('#' + id)),
      skips: q('#plan-skips-input')?.value ?? null,
      empty: !!q('#plan-year-empty'),
      limit: !!q('#plan-limit'),
      addHere: q('#add-plan-here')?.getAttribute('href') ?? null,
      fee: text('#plan-year-panel [data-storage-fee-notice]'),
      prev: q('#year-prev')?.getAttribute('href') ?? null,
      next: q('#year-next')?.getAttribute('href') ?? null,
      alerts: [...document.querySelectorAll('main [role="alert"]')].map((e) => e.textContent.trim().replace(/\s+/g, ' ')).filter(Boolean),
    };
  });
  // The Add a plan page as the customer's browser has it.
  const addView = (pg) => pg.evaluate(() => {
    const q = (s) => document.querySelector(s);
    return {
      path: location.pathname + location.search,
      heading: q('main h1')?.textContent.trim() ?? null,
      back: q('main a[href="/dashboard"]')?.textContent.trim() ?? null,
      year: q('#add-plan [data-year]')?.getAttribute('data-year') ?? null,
      tiers: [...document.querySelectorAll('#add-plan form[data-tier]')].map((f) => ({
        tier: f.getAttribute('data-tier'),
        name: f.querySelector('h2')?.textContent.trim(),
        price: f.querySelector('p span')?.textContent.trim(),
        carries: [...f.querySelectorAll('dd')].map((d) => Number(d.textContent.trim())),
        button: f.querySelector('button[type="submit"]')?.textContent.trim(),
        zone: f.querySelector('input[name="time_zone"]')?.value,
        year: f.querySelector('input[name="year"]')?.value ?? null,
      })),
      limit: !!q('#plan-limit'),
      taken: q('#plan-year-taken a')?.getAttribute('href') ?? null,
      out: !!q('#plan-year-out'),
      storageNotice: !!q('main a[href="/pricing"]'),
      alerts: [...document.querySelectorAll('main [role="alert"]')].map((e) => e.textContent.trim().replace(/\s+/g, ' ')).filter(Boolean),
    };
  });
  const addButton = (tier) => `#add-plan form[data-tier="${tier}"] button[type="submit"]`;
  const shown = (pg, title) => waitFor(async () => (await view(pg)).title === title, `the page to show ${title}`);
  const alerted = (pg, re, read = view) => waitFor(async () => { const a = (await read(pg)).alerts; return a.some((t) => re.test(t)) ? a : null; }, `a refusal matching ${re}`);

  console.log('\nThe calendar with no plan');
  const a = await signIn(A, 'America/Chicago');
  const page = a.page;
  let v = await view(page);
  check('signing in lands on Plan Selection, on Year 1', v.path === '/dashboard' && v.year === '1' && v.panelYear === '1' && v.title === 'Year 1', JSON.stringify([v.path, v.year, v.title]));
  check('the year holds no plan, reads no status, and the list is empty', v.empty && v.status === null && v.list.length === 0 && v.forms.length === 0, JSON.stringify(v));
  check('it offers Add a plan on that year', v.addHere === '/dashboard/add-plan?year=1' && !v.limit, String(v.addHere));
  check('no arrow before Year 1, and the next arrow goes to Year 2', v.prev === null && v.next === '/dashboard?year=2', `${v.prev} ${v.next}`);
  await go(page, '/dashboard?year=100');
  v = await view(page);
  check('on Year 100, no arrow after it', v.year === '100' && v.next === null && v.prev === '/dashboard?year=99', `${v.year} ${v.prev} ${v.next}`);

  console.log('\nAdd a plan, from the menu');
  await go(page, '/dashboard');
  await waitFor(async () => !!(await page.$('.navmenu__toggle')), 'the menu');
  const openMenu = async () => waitFor(async () => {
    await page.bringToFront();
    if (!(await page.$('.navmenu__panel'))) await page.click('.navmenu__toggle');
    return page.evaluate(() => [...document.querySelectorAll('.navmenu__panel .navmenu__item')].some((el) => el.textContent.trim() === 'Add a plan'));
  }, 'Add a plan in the menu');
  const fromMenu = async () => {
    await openMenu();
    const item = await page.evaluateHandle(() => [...document.querySelectorAll('.navmenu__panel .navmenu__item')].find((el) => el.textContent.trim() === 'Add a plan'));
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 }), item.asElement().click()]);
  };
  await fromMenu();
  let av = await waitFor(async () => { const x = await addView(page); return x.tiers[0]?.zone ? x : null; }, 'the form to read the browser\'s time zone');
  check('the menu opens Add a plan, with its way back to Plans', av.path === '/dashboard/add-plan' && av.heading === 'Add a plan' && av.back === '← Plans', JSON.stringify([av.path, av.heading, av.back]));
  check('it places the plan on Year 1', av.year === '1' && av.tiers.every((t) => t.year === null), JSON.stringify([av.year, av.tiers.map((t) => t.year)]));
  check('Basic, Premium and Legacy, each with the price and allowances of Subscription Tiers',
    JSON.stringify(av.tiers.map((t) => [t.tier, t.name, t.price, t.carries, t.button])) === JSON.stringify(['basic', 'premium', 'legacy'].map((t) => [t, PLANS[t].name, PRICES[t], CARRIES[t], `Add ${PLANS[t].name}`])),
    JSON.stringify(av.tiers));
  check('the catalog holds the same', ['basic', 'premium', 'legacy'].every((t) => PLANS[t].price === PRICES[t] && JSON.stringify([PLANS[t].standard, PLANS[t].feature, PLANS[t].social]) === JSON.stringify(CARRIES[t])), JSON.stringify(PLANS));
  check('no Grace and no Custom offered', !av.tiers.some((t) => t.tier === 'grace' || t.tier === 'custom') && av.tiers.length === 3, JSON.stringify(av.tiers.map((t) => t.tier)));
  check('each form carries the time zone the browser reports', av.tiers.every((t) => t.zone === 'America/Chicago'), JSON.stringify(av.tiers.map((t) => t.zone)));

  // A second tab left open on the form, to be sent after the first plan exists.
  const stale = await secondTab(a.context, 'America/Chicago', '/dashboard/add-plan');
  await waitFor(async () => (await addView(stale)).tiers[0]?.zone, 'the second tab\'s form');

  await click(page, addButton('basic'));
  await shown(page, 'Year 1 · Basic');
  v = await view(page);
  let p = await planOn(A, 1);
  check('Add Basic places an unpaid Basic plan on Year 1', (await line(A)) === '1b' && p.paid_at === null, await line(A));
  check('with Basic\'s allowances and no Additional Recipient slots', JSON.stringify(carries(p)) === JSON.stringify(CARRIES.basic) && p.additional_recipient_slots === 0, JSON.stringify(p));
  check('and the browser\'s time zone', p.delivery_time_zone === 'America/Chicago', p.delivery_time_zone);
  check('the calendar opens on the new plan, which reads Configured', v.path === '/dashboard?year=1' && v.status === 'Configured' && JSON.stringify(v.list) === JSON.stringify(['1 basic configured Configured current']), JSON.stringify([v.path, v.status, v.list]));
  check('the plan shows what its record holds',
    JSON.stringify(v.facts) === JSON.stringify({
      'Price per plan year': '$49', 'Standard Deliveries': '4', 'Feature Deliveries': '1', 'Social media posts': '1',
      'Additional Recipient slots': '0', 'Delivery time zone': 'America/Chicago',
    }), JSON.stringify(v.facts));
  check('an unpaid plan carries every option', JSON.stringify(v.forms) === JSON.stringify(['plan-skips', 'plan-slots', 'plan-time-zone', 'plan-tier', 'plan-delete']) && v.skips === '0', JSON.stringify([v.forms, v.skips]));

  console.log('\nOne plan until it is paid for (Horizon Tier)');
  // A refused change loads the page again as it now stands, so a tab left
  // open shows either the refusal or the page that no longer offers the form.
  await click(stale, addButton('premium'));
  let told = await waitFor(async () => {
    const x = await addView(stale);
    return x.alerts.some((m) => /builds one plan/.test(m)) || (x.limit && x.tiers.length === 0) ? x : null;
  }, 'the second tab to answer');
  check('a form left open in another tab, sent after the first plan exists, places nothing', (await line(A)) === '1b', await line(A));
  check('and that tab now explains the limit and offers no tier', told.limit && told.tiers.length === 0, JSON.stringify(told));
  await stale.close();
  let alerts;
  await go(page, '/dashboard/add-plan');
  av = await addView(page);
  check('Add a plan now explains the limit and offers no tier', av.limit && av.tiers.length === 0, JSON.stringify(av));
  await go(page, '/dashboard?year=2');
  v = await view(page);
  check('an empty year explains the limit and offers no Add a plan', v.year === '2' && v.limit && v.addHere === null && v.empty, JSON.stringify([v.year, v.limit, v.addHere, v.empty]));

  console.log('\nThe customer\'s own token, past the pages');
  let [st, r] = await rest('/rest/v1/plans?select=id,plan_year,tier', { key: ANON, token: A.token });
  check('they read their own plan', st === 200 && r.length === 1 && r[0].id === p.id, `${st} ${JSON.stringify(r)}`);
  [st, r] = await rest('/rest/v1/plans?select=id', { key: ANON, token: B.token });
  check('a second customer reads none of it', st === 200 && Array.isArray(r) && r.length === 0, `${st} ${JSON.stringify(r)}`);
  [st, r] = await rest('/rest/v1/rpc/place_plan', { method: 'POST', key: ANON, token: A.token, body: { p_account_id: A.account, p_tier: 'legacy', p_plan_year: 2, p_time_zone: 'UTC', p_standard: 52, p_feature: 12, p_social: 12 } });
  check('placing a plan with it is REFUSED', st >= 400 && (await line(A)) === '1b', `${st} ${JSON.stringify(r)} ${await line(A)}`);
  [st, r] = await rest('/rest/v1/rpc/move_plan', { method: 'POST', key: ANON, token: A.token, body: { p_account_id: A.account, p_plan_id: p.id, p_skipped_before: 3 } });
  check('moving a plan with it is REFUSED', st >= 400 && (await line(A)) === '1b', `${st} ${JSON.stringify(r)} ${await line(A)}`);
  for (const [col, val] of Object.entries({ tier: 'legacy', standard_deliveries: 52, additional_recipient_slots: 4, delivery_time_zone: 'Europe/Paris', paid_at: new Date().toISOString() })) {
    [st, r] = await rest(`/rest/v1/plans?id=eq.${p.id}`, { method: 'PATCH', key: ANON, token: A.token, body: { [col]: val } });
    check(`setting the plan's ${col} with it is REFUSED`, st >= 400 && /set by payment/.test(JSON.stringify(r)), `${st} ${JSON.stringify(r)}`);
  }
  [st, r] = await rest(`/rest/v1/plans?id=eq.${p.id}`, { method: 'DELETE', key: ANON, token: A.token });
  let still = await planOn(A, 1);
  check('deleting the plan with it removes nothing, and the plan is as it was', (st >= 400 || (Array.isArray(r) && r.length === 0)) && JSON.stringify(still) === JSON.stringify(p), `${st} ${JSON.stringify(r)}`);

  console.log('\nThe options on an unpaid plan');
  await go(page, '/dashboard?year=1');
  await page.select('#plan-slots-input', '3');
  await click(page, '#plan-slots button[type="submit"]');
  await waitFor(async () => (await view(page)).facts['Additional Recipient slots'] === '3', 'the slots to show');
  p = await planOn(A, 1);
  check('Additional Recipient slots: three saved, and shown without a reload', p.additional_recipient_slots === 3, JSON.stringify(p));

  await waitFor(() => page.$eval('#plan-time-zone-input', (el) => el.options.length > 100), 'the browser\'s time zones');
  await page.select('#plan-time-zone-input', 'Europe/Paris');
  await click(page, '#plan-time-zone button[type="submit"]');
  await waitFor(async () => (await view(page)).facts['Delivery time zone'] === 'Europe/Paris', 'the time zone to show');
  p = await planOn(A, 1);
  check('Delivery time zone: changed, and nothing else with it', p.delivery_time_zone === 'Europe/Paris' && p.additional_recipient_slots === 3 && p.tier === 'basic', JSON.stringify(p));

  check('Tier: Save waits for a different tier', await page.$eval('#plan-tier button[type="submit"]', (b) => b.disabled) === true);
  await page.select('#plan-tier-input', 'premium');
  check('Tier: a higher tier asks for no confirmation', !(await page.$('#plan-tier-confirm')));
  await click(page, '#plan-tier button[type="submit"]');
  await shown(page, 'Year 1 · Premium');
  p = await planOn(A, 1);
  check('Tier: Premium takes Premium\'s allowances', p.tier === 'premium' && JSON.stringify(carries(p)) === JSON.stringify(CARRIES.premium), JSON.stringify(p));
  check('Tier: its slots and time zone carry over', p.additional_recipient_slots === 3 && p.delivery_time_zone === 'Europe/Paris', JSON.stringify(p));

  await page.select('#plan-tier-input', 'basic');
  await waitFor(async () => !!(await page.$('#plan-tier-confirm')), 'the downgrade confirmation');
  const confirm = await page.$eval('#plan-tier', (f) => ({
    buttons: [...f.querySelectorAll('button')].map((b) => b.textContent.trim()),
    text: f.querySelector('#plan-tier-confirm p').textContent.trim().replace(/\s+/g, ' '),
  }));
  check('Tier: a lower tier asks first, and names both tiers', JSON.stringify(confirm.buttons) === JSON.stringify(['Cancel', 'Change to Basic']) && /Premium to Basic/.test(confirm.text), JSON.stringify(confirm));
  check('Tier: nothing has changed while it asks', (await planOn(A, 1)).tier === 'premium');
  await click(page, '#plan-tier-confirm button[type="button"]');
  await waitFor(async () => !(await page.$('#plan-tier-confirm')), 'the confirmation to close');
  check('Tier: Cancel puts the choice back and changes nothing', (await page.$eval('#plan-tier-input', (el) => el.value)) === 'premium' && (await planOn(A, 1)).tier === 'premium');
  await page.select('#plan-tier-input', 'basic');
  await waitFor(async () => !!(await page.$('#plan-tier-confirm')), 'the downgrade confirmation');
  await page.$eval('#plan-tier input[name="confirmed"]', (el) => { el.value = 'no'; });
  await click(page, '#plan-tier-confirm button[type="submit"]');
  alerts = await alerted(page, /needs to be confirmed/);
  check('Tier: a lower tier sent without its confirmation is refused', (await planOn(A, 1)).tier === 'premium' && JSON.stringify(carries(await planOn(A, 1))) === JSON.stringify(CARRIES.premium), JSON.stringify(alerts));
  await click(page, '#plan-tier-confirm button[type="button"]');
  await waitFor(async () => !(await page.$('#plan-tier-confirm')), 'the confirmation to close');
  await page.select('#plan-tier-input', 'basic');
  await waitFor(async () => !!(await page.$('#plan-tier-confirm')), 'the downgrade confirmation');
  await click(page, '#plan-tier-confirm button[type="submit"]');
  await shown(page, 'Year 1 · Basic');
  p = await planOn(A, 1);
  check('Tier: confirmed, the plan is Basic with Basic\'s allowances', p.tier === 'basic' && JSON.stringify(carries(p)) === JSON.stringify(CARRIES.basic) && p.additional_recipient_slots === 3, JSON.stringify(p));

  await setNumber(page, '#plan-skips-input', 2);
  await click(page, '#plan-skips button[type="submit"]');
  await shown(page, 'Year 3 · Basic');
  v = await view(page);
  check('Skipped years: two before the plan moves it to Year 3', (await line(A)) === '3b' && v.path === '/dashboard?year=3' && v.skips === '2', `${await line(A)} ${v.path} ${v.skips}`);
  check('the plan is the same plan, with everything it held', (await planOn(A, 3)).id === p.id && (await planOn(A, 3)).additional_recipient_slots === 3);

  console.log('\nThe year calendar');
  check('Years 1 and 2 read Skipped with the storage fee notice, Year 3 Configured',
    JSON.stringify(v.list) === JSON.stringify(['1 - skipped Skipped fee', '2 - skipped Skipped fee', '3 basic configured Configured current']), JSON.stringify(v.list));
  await click(page, '#plan-year-list a[data-year="1"]');
  await waitFor(async () => (await view(page)).path === '/dashboard?year=1', 'Year 1 from the list');
  v = await view(page);
  check('the list opens a year: Year 1, Skipped, with the storage fee and its price', v.title === 'Year 1' && v.status === 'Skipped' && !!v.fee && v.fee.includes(STORAGE_FEE.name) && v.fee.includes(STORAGE_FEE.price) && v.fee.includes('$9.99'), JSON.stringify([v.title, v.status, v.fee]));
  check('a skipped year offers no second plan to an account held to one', v.limit && v.addHere === null);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 }), click(page, '#year-next')]);
  v = await view(page);
  check('the next arrow moves on a year', v.path === '/dashboard?year=2' && v.year === '2', v.path);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 }), click(page, '#year-prev')]);
  check('the previous arrow moves back a year', here(page) === '/dashboard?year=1', here(page));
  await setNumber(page, '#year-input', 3);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 }), click(page, '#year-form button[type="submit"]')]);
  v = await view(page);
  check('the year input opens the year typed', v.path === '/dashboard?year=3' && v.title === 'Year 3 · Basic', `${v.path} ${v.title}`);
  for (const bad of ['0', '101', 'abc', '2.5']) {
    await go(page, `/dashboard?year=${bad}`);
    v = await view(page);
    check(`a year of ${bad} in the address opens the plan still to be paid for`, v.year === '3' && v.title === 'Year 3 · Basic', `${v.year} ${v.title}`);
  }
  await go(page, '/dashboard');
  check('with no year in the address, the same', (await view(page)).title === 'Year 3 · Basic');

  console.log('\nA paid plan');
  // No money moves yet: this is what the webhook will write once the cart
  // exists (paid_at on the plan, and the account's move to Planning).
  must(await db.from('plans').update({ paid_at: new Date().toISOString() }).eq('id', p.id).select('id'));
  must(await db.from('accounts').update({ phase: 'planning' }).eq('id', A.account).select('id'));
  await go(page, '/dashboard?year=3');
  v = await view(page);
  check('it reads Paid, in the list and on its year', v.status === 'Paid' && v.list[2] === '3 basic paid Paid current', JSON.stringify([v.status, v.list]));
  check('only its time zone can be changed: no skipped years, slots, tier or deletion', JSON.stringify(v.forms) === JSON.stringify(['plan-time-zone']), JSON.stringify(v.forms));
  await waitFor(() => page.$eval('#plan-time-zone-input', (el) => el.options.length > 100), 'the browser\'s time zones');
  await page.select('#plan-time-zone-input', 'Asia/Tokyo');
  await click(page, '#plan-time-zone button[type="submit"]');
  await waitFor(async () => (await view(page)).facts['Delivery time zone'] === 'Asia/Tokyo', 'the time zone to show');
  check('its time zone changes', (await planOn(A, 3)).delivery_time_zone === 'Asia/Tokyo');

  console.log('\nFurther plans, once the first is paid for');
  await fromMenu();
  av = await waitFor(async () => { const x = await addView(page); return x.tiers[0]?.zone ? x : null; }, 'the form');
  check('Add a plan offers the year after the last plan', av.year === '4' && !av.limit, JSON.stringify([av.year, av.limit]));
  await click(page, addButton('premium'));
  await shown(page, 'Year 4 · Premium');
  await fromMenu();
  await waitFor(async () => (await addView(page)).tiers[0]?.zone, 'the form');
  await click(page, addButton('legacy'));
  await shown(page, 'Year 5 · Legacy');
  p = await planOn(A, 5);
  check('Premium lands on Year 4 and Legacy on Year 5, each with its own allowances', (await line(A)) === '3b$ 4p 5l' && JSON.stringify(carries(await planOn(A, 4))) === JSON.stringify(CARRIES.premium) && JSON.stringify(carries(p)) === JSON.stringify(CARRIES.legacy), await line(A));

  await go(page, '/dashboard?year=1');
  v = await view(page);
  check('a skipped year now offers Add a plan on that year', v.addHere === '/dashboard/add-plan?year=1' && !v.limit, JSON.stringify([v.addHere, v.limit]));
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 }), click(page, '#add-plan-here')]);
  av = await waitFor(async () => { const x = await addView(page); return x.tiers[0]?.zone ? x : null; }, 'the form');
  check('it opens Add a plan on Year 1, and each form carries that year', av.path === '/dashboard/add-plan?year=1' && av.year === '1' && av.tiers.every((t) => t.year === '1'), JSON.stringify([av.path, av.year, av.tiers.map((t) => t.year)]));
  await click(page, addButton('basic'));
  await shown(page, 'Year 1 · Basic');
  v = await view(page);
  check('the plan fills the skipped year, and Year 2 alone stays skipped', (await line(A)) === '1b 3b$ 4p 5l'
    && JSON.stringify(v.list) === JSON.stringify(['1 basic configured Configured current', '2 - skipped Skipped fee', '3 basic paid Paid', '4 premium configured Configured', '5 legacy configured Configured']),
    `${await line(A)} ${JSON.stringify(v.list)}`);

  await go(page, '/dashboard/add-plan?year=3');
  av = await addView(page);
  check('Add a plan on a year that holds a plan says so, and links to it', av.taken === '/dashboard?year=3' && av.tiers.length === 0, JSON.stringify(av));
  for (const bad of ['0', '101']) {
    await go(page, `/dashboard/add-plan?year=${bad}`);
    av = await addView(page);
    check(`Add a plan on a year of ${bad} falls back to the year after the last plan`, av.year === '6', JSON.stringify(av.year));
  }

  console.log('\nA form changed before it is sent');
  const tamper = async (what, edit, re) => {
    await go(page, '/dashboard/add-plan?year=7');
    await waitFor(async () => (await addView(page)).tiers[0]?.zone, 'the form');
    await page.$eval('#add-plan form[data-tier="basic"]', edit);
    await click(page, addButton('basic'));
    const got = await alerted(page, re, addView);
    check(`${what} is refused, and no plan is placed`, got.length === 1 && (await line(A)) === '1b 3b$ 4p 5l', `${JSON.stringify(got)} ${await line(A)}`);
  };
  await tamper('a tier of Grace', (f) => { f.querySelector('input[name="tier"]').value = 'grace'; }, /tier cannot be chosen/);
  await tamper('a tier of Custom', (f) => { f.querySelector('input[name="tier"]').value = 'custom'; }, /tier cannot be chosen/);
  await tamper('a time zone that does not exist', (f) => { f.querySelector('input[name="time_zone"]').value = 'Mars/Phobos'; }, /time zone is not one/);
  await tamper('a year that holds a plan', (f) => { f.querySelector('input[name="year"]').value = '3'; }, /already holds a plan/);
  await tamper('a year of 101', (f) => { f.querySelector('input[name="year"]').value = '101'; }, /outside the years/);
  await tamper('a year of 2.5', (f) => { f.querySelector('input[name="year"]').value = '2.5'; }, /outside the years/);

  console.log('\nSkipped years, with plans after it and a paid plan in the way');
  const skip = async (year, n) => {
    await go(page, `/dashboard?year=${year}`);
    await setNumber(page, '#plan-skips-input', n);
    await click(page, '#plan-skips button[type="submit"]');
  };
  await skip(4, 2);
  await shown(page, 'Year 6 · Premium');
  v = await view(page);
  check('two skipped years before Year 4 move it to 6 and the plan after it to 7', (await line(A)) === '1b 3b$ 6p 7l' && v.path === '/dashboard?year=6', `${await line(A)} ${v.path}`);
  check('Years 4 and 5 now read Skipped', v.list[3] === '4 - skipped Skipped fee' && v.list[4] === '5 - skipped Skipped fee' && v.list.length === 7, JSON.stringify(v.list));
  await skip(6, 0);
  await shown(page, 'Year 4 · Premium');
  check('none skipped moves both back', (await line(A)) === '1b 3b$ 4p 5l', await line(A));
  await skip(1, 1);
  await shown(page, 'Year 2 · Basic');
  check('the first plan moves up to the year before the paid plan, and the paid plan stays', (await line(A)) === '2b 3b$ 4p 5l', await line(A));
  await skip(2, 2);
  alerts = await alerted(page, /holds its year/);
  check('moving it onto the paid plan\'s year is refused, with the reason', alerts.length === 1 && (await line(A)) === '2b 3b$ 4p 5l', `${JSON.stringify(alerts)} ${await line(A)}`);
  await skip(2, 5);
  alerts = await alerted(page, /holds its year/);
  check('and so is moving it past the paid plan', (await line(A)) === '2b 3b$ 4p 5l', await line(A));
  await skip(5, 99);
  alerts = await alerted(page, /outside the years/);
  check('a move past Year 100 is refused', (await line(A)) === '2b 3b$ 4p 5l', await line(A));

  console.log('\nA plan placed by staff');
  [st, r] = await rest('/rest/v1/rpc/place_plan', { method: 'POST', body: { p_account_id: A.account, p_tier: 'grace', p_plan_year: 8, p_time_zone: 'America/Chicago', p_standard: 2, p_feature: 0, p_social: 0 } });
  if (st !== 200) throw new Error(`placing a Grace plan: ${st} ${JSON.stringify(r)}`);
  await go(page, '/dashboard?year=8');
  v = await view(page);
  check('a Grace plan shows on its year with what it carries', v.title === 'Year 8 · Grace' && v.facts['Standard Deliveries'] === '2' && v.facts['Feature Deliveries'] === '0' && !('Price per plan year' in v.facts), JSON.stringify([v.title, v.facts]));
  check('the customer changes its time zone and nothing else', JSON.stringify(v.forms) === JSON.stringify(['plan-time-zone']), JSON.stringify(v.forms));

  console.log('\nDeleting a plan');
  const legacy = must(await db.from('legacies').select('id').eq('account_id', A.account).eq('is_primary', true).single());
  const folder = `${A.account}/${legacy.id}`;
  folders.push(folder);
  const onPlan = `${folder}/${randomUUID()}.png`, offPlan = `${folder}/${randomUUID()}.png`;
  for (const path of [onPlan, offPlan]) must(await db.storage.from(BUCKET).upload(path, PNG, { contentType: 'image/png' }));
  const item = { legacy_id: legacy.id, account_id: A.account };
  must(await db.from('content_items').insert([
    { ...item, plan_id: p.id, kind: 'message', title: 'On the plan', body: 'One', storage_path: null },
    { ...item, plan_id: p.id, kind: 'photo', title: 'On the plan, with a file', body: null, storage_path: onPlan },
    { ...item, plan_id: (await planOn(A, 4)).id, kind: 'photo', title: 'On another plan', body: null, storage_path: offPlan },
    { ...item, plan_id: null, kind: 'message', title: 'On no plan', body: 'Two', storage_path: null },
  ]).select('id'));
  const filesNow = async () => (must(await db.storage.from(BUCKET).list(folder))).map((f) => `${folder}/${f.name}`).sort();
  const titles = async () => (must(await db.from('content_items').select('title').eq('account_id', A.account).order('title'))).map((c) => c.title);
  const before = await line(A);

  await go(page, '/dashboard?year=5');
  await click(page, '#plan-delete button');
  await waitFor(async () => !!(await page.$('#plan-delete-sentence')), 'the confirmation');
  const asked = await page.$eval('#plan-delete', (f) => ({ sentence: f.querySelector('#plan-delete-sentence').textContent, buttons: [...f.querySelectorAll('button')].map((b) => b.textContent.trim()) }));
  check('Delete plan asks first, in the specification\'s words', asked.sentence === DELETE_SENTENCE && JSON.stringify(asked.buttons) === JSON.stringify(['Cancel', 'Delete plan']), JSON.stringify(asked));
  check('nothing is deleted while it asks', (await line(A)) === before && (await titles()).length === 4);
  await click(page, '#plan-delete button[type="button"]');
  await waitFor(async () => !(await page.$('#plan-delete-sentence')), 'the confirmation to close');
  check('Cancel closes it and deletes nothing', (await line(A)) === before && (await titles()).length === 4);
  await click(page, '#plan-delete button');
  await waitFor(async () => !!(await page.$('#plan-delete-sentence')), 'the confirmation');
  await click(page, '#plan-delete button[type="submit"]');
  await shown(page, 'Year 5');
  v = await view(page);
  check('confirmed, the plan is gone and the others are as they were', (await line(A)) === '2b 3b$ 4p 8g', await line(A));
  check('its content went with it, and other content stayed', JSON.stringify(await titles()) === JSON.stringify(['On another plan', 'On no plan']), JSON.stringify(await titles()));
  check('its file is gone from storage, and another plan\'s file is still there', JSON.stringify(await filesNow()) === JSON.stringify([offPlan]), JSON.stringify(await filesNow()));
  check('the calendar stays on that year, now Skipped', v.path === '/dashboard?year=5' && v.status === 'Skipped' && !!v.fee, JSON.stringify([v.path, v.status, v.fee]));

  console.log('\nA second customer');
  [st, r] = await rest('/rest/v1/rpc/place_plan', { method: 'POST', body: { p_account_id: B.account, p_tier: 'basic', p_plan_year: null, p_time_zone: 'America/Chicago', p_standard: 4, p_feature: 1, p_social: 1 } });
  if (st !== 200) throw new Error(`placing B's plan: ${st} ${JSON.stringify(r)}`);
  const b = await signIn(B, 'America/New_York', '/dashboard?year=2');
  check('opening a plan year signed out, then signing in, lands on that year', here(b.page) === '/dashboard?year=2' && (await view(b.page)).year === '2', here(b.page));
  await go(b.page, '/dashboard');
  v = await view(b.page);
  check('they see their own plan and none of the first customer\'s', v.title === 'Year 1 · Basic' && JSON.stringify(v.list) === JSON.stringify(['1 basic configured Configured current']), JSON.stringify([v.title, v.list]));
  const target = await planOn(A, 2);
  await b.page.$eval('#plan-slots input[name="plan_id"]', (el, id) => { el.value = id; }, target.id);
  await b.page.select('#plan-slots-input', '4');
  await click(b.page, '#plan-slots button[type="submit"]');
  alerts = await alerted(b.page, /cannot be found/);
  check('sending the first customer\'s plan to change its slots is refused', JSON.stringify(await planOn(A, 2)) === JSON.stringify(target) && (await planOn(B, 1)).additional_recipient_slots === 0, JSON.stringify(alerts));
  await go(b.page, '/dashboard');
  await b.page.$eval('#plan-skips input[name="plan_id"]', (el, id) => { el.value = id; }, target.id);
  await setNumber(b.page, '#plan-skips-input', 0);
  await click(b.page, '#plan-skips button[type="submit"]');
  alerts = await alerted(b.page, /cannot be found/);
  check('sending it to move the plan is refused', (await line(A)) === '2b 3b$ 4p 8g', await line(A));
  await go(b.page, '/dashboard');
  await click(b.page, '#plan-delete button');
  await waitFor(async () => !!(await b.page.$('#plan-delete-sentence')), 'the confirmation');
  await b.page.$eval('#plan-delete input[name="plan_id"]', (el, id) => { el.value = id; }, target.id);
  await click(b.page, '#plan-delete button[type="submit"]');
  alerts = await alerted(b.page, /cannot be found/);
  check('sending it to delete the plan is refused, and both customers\' plans are as they were', (await line(A)) === '2b 3b$ 4p 8g' && (await line(B)) === '1b', `${await line(A)} / ${await line(B)}`);
  await b.context.close();

  console.log('\nAt a phone\'s width (375px)');
  await page.setViewport({ width: 375, height: 800 });
  for (const path of ['/dashboard?year=2', '/dashboard?year=3', '/dashboard?year=5', '/dashboard/add-plan']) {
    await go(page, path);
    const fit = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      short: [...document.querySelectorAll('main #plan-selection a, main #plan-selection button, main #plan-year-panel button, main #plan-year-panel a, main #add-plan button')]
        .map((el) => [el.id || el.textContent.trim().slice(0, 20), Math.round(el.getBoundingClientRect().height)]).filter(([, h]) => h < 24),
      wide: [...document.querySelectorAll('main #plan-selection *, main #plan-year-panel *, main #add-plan *')]
        .filter((el) => el.getBoundingClientRect().right > 375.5).map((el) => el.id || el.tagName).slice(0, 5),
    }));
    check(`${path}: nothing runs off the side, and every control is tall enough to tap`, fit.page <= 375 && fit.short.length === 0 && fit.wide.length === 0, JSON.stringify(fit));
  }
  await page.setViewport({ width: 1280, height: 900 });

  console.log('\nBuilding closed by a storage lapse');
  // A tab left open on an unpaid plan's options before building closes.
  const open = await secondTab(a.context, 'America/Chicago', '/dashboard?year=4');
  must(await db.from('accounts').update({ trial_ends_at: YEARS_AGO, storage_paid_through: null }).eq('id', A.account).select('id'));
  [st, r] = await rest('/rest/v1/rpc/building_is_open', { method: 'POST', body: { p_account_id: A.account } });
  check('the account status check reads building closed', st === 200 && r === false, `${st} ${JSON.stringify(r)}`);
  await go(page, '/dashboard?year=4');
  v = await view(page);
  check('an unpaid plan shows no option but deletion', JSON.stringify(v.forms) === JSON.stringify(['plan-delete']), JSON.stringify(v.forms));
  await go(page, '/dashboard?year=3');
  check('a paid plan shows none at all', JSON.stringify((await view(page)).forms) === '[]');
  await go(page, '/dashboard?year=5');
  v = await view(page);
  check('an empty year offers no Add a plan', v.addHere === null, String(v.addHere));
  await go(page, '/dashboard/add-plan');
  av = await addView(page);
  check('Add a plan shows the storage notice and no tier', av.storageNotice && av.tiers.length === 0, JSON.stringify(av));
  const held = JSON.stringify(await plansOf(A));
  await open.select('#plan-slots-input', '2');
  await click(open, '#plan-slots button[type="submit"]');
  told = await waitFor(async () => {
    const x = await view(open);
    return x.alerts.some((m) => /while building is closed/.test(m)) || !x.forms.includes('plan-slots') ? x : null;
  }, 'the tab left open to answer');
  check('slots sent from the tab left open change nothing', JSON.stringify(await plansOf(A)) === held);
  check('and that tab now shows no option but deletion', JSON.stringify(told.forms) === JSON.stringify(['plan-delete']), JSON.stringify(told.forms));
  await open.close();
  for (const [what, body] of [['placing', ['place_plan', { p_account_id: A.account, p_tier: 'basic', p_plan_year: 6, p_time_zone: 'UTC', p_standard: 4, p_feature: 1, p_social: 1 }]], ['moving', ['move_plan', { p_account_id: A.account, p_plan_id: (await planOn(A, 4)).id, p_skipped_before: 2 }]]]) {
    [st, r] = await rest(`/rest/v1/rpc/${body[0]}`, { method: 'POST', body: body[1] });
    check(`${what} a plan is refused by the database itself, even for the server`, st >= 400 && /building_closed/.test(JSON.stringify(r)) && JSON.stringify(await plansOf(A)) === held, `${st} ${JSON.stringify(r)}`);
  }
  await go(page, '/dashboard?year=4');
  await click(page, '#plan-delete button');
  await waitFor(async () => !!(await page.$('#plan-delete-sentence')), 'the confirmation');
  await click(page, '#plan-delete button[type="submit"]');
  await shown(page, 'Year 4');
  check('deleting an unpaid plan stays open, and takes its file with it', (await line(A)) === '2b 3b$ 8g' && JSON.stringify(await filesNow()) === '[]' && JSON.stringify(await titles()) === JSON.stringify(['On no plan']), `${await line(A)} ${JSON.stringify(await filesNow())} ${JSON.stringify(await titles())}`);
  must(await db.from('accounts').update({ trial_ends_at: A.trialEnds }).eq('id', A.account).select('id'));

  console.log('\nFrom Interlude on');
  await go(page, '/dashboard?year=2');
  check('in Planning with building open again, the unpaid plan has every option back', (await view(page)).forms.length === 5, JSON.stringify((await view(page)).forms));
  const leftOpen = await secondTab(a.context, 'America/Chicago', '/dashboard?year=2');
  must(await db.from('accounts').update({ phase: 'interlude' }).eq('id', A.account).select('id'));
  for (const year of [2, 3, 8]) {
    await go(page, `/dashboard?year=${year}`);
    v = await view(page);
    check(`Year ${year}: no option, and no deletion`, JSON.stringify(v.forms) === '[]' && v.addHere === null, JSON.stringify(v.forms));
  }
  const atInterlude = JSON.stringify(await plansOf(A));
  await waitFor(() => leftOpen.$eval('#plan-time-zone-input', (el) => el.options.length > 100), 'the browser\'s time zones');
  await leftOpen.select('#plan-time-zone-input', 'Europe/Paris');
  await click(leftOpen, '#plan-time-zone button[type="submit"]');
  told = await waitFor(async () => {
    const x = await view(leftOpen);
    return x.alerts.some((m) => /while building is closed/.test(m)) || x.forms.length === 0 ? x : null;
  }, 'the tab left open to answer');
  check('a time zone sent from a tab left open changes nothing: it locks at Interlude', JSON.stringify(await plansOf(A)) === atInterlude);
  check('and that tab now shows no option', JSON.stringify(told.forms) === '[]', JSON.stringify(told.forms));
  await leftOpen.close();
} catch (e) {
  console.log(`  ✗ stopped: ${e.message}`);
  fails++;
} finally {
  if (browser) await browser.close();
  for (const folder of folders) {
    const { data } = await db.storage.from(BUCKET).list(folder);
    if (data?.length) await db.storage.from(BUCKET).remove(data.map((f) => `${folder}/${f.name}`));
  }
  for (const id of users) {
    const [st] = await rest(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
    if (st !== 200) { console.log(`  ✗ could not delete test user ${id}: ${st}`); fails++; }
  }
  if (users.length) {
    console.log('\nCleaning up');
    const [, left] = await rest(`/rest/v1/accounts?user_id=in.(${users.join(',')})&select=id`);
    check('the test users and their accounts are gone', Array.isArray(left) && left.length === 0, JSON.stringify(left));
    const [, plans] = await rest('/rest/v1/plans?select=id');
    const [, accounts] = await rest('/rest/v1/accounts?select=id');
    console.log(`  the database now holds ${Array.isArray(plans) ? plans.length : '?'} plans across ${Array.isArray(accounts) ? accounts.length : '?'} accounts`);
  }
}

console.log(fails ? `\n${fails} FAILED` : '\nAll passed');
process.exit(fails ? 1 : 0);
