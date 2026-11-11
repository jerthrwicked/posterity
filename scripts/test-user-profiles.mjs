#!/usr/bin/env node
// Posterity — User Profiles: the logged-in home and its four tabs
/*
User Profiles is the customer's logged-in home (Master Specification, User
Profiles; roadmap Stage 4.3, Layout). This signs in as a real customer in a
real browser and checks the layout every later sub-stage inserts into.

  node scripts/test-user-profiles.mjs --server http://localhost:3011

What matters most:
  - signed out, each of the four tabs sends the visitor to log in and brings
    them back to that tab
  - every tab carries the strip with the phase display, the empty place for
    the check-in button, and the empty place for the Account Restoration
    banner above everything
  - the phase display reads the account status check: each of the six phases
    shows its own name and its own colour, on the next load, on every tab
  - the global menu carries Account, Add a plan, Settings and Log Out when
    signed in, and Login when signed out; the signed-in pages carry no second bar
  - at a phone's width (375px) nothing runs off the side

It makes one test user, signs in as them, moves their account through the six
phases with the service key, and deletes them at the end. Needs
~/posterity/.env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
and CHROME_PATH if Puppeteer's own Chrome is not installed.
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { PHASES } from '../app/dashboard/_profile/phases.js';

const flag = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };
const SERVER = flag('--server')?.replace(/\/$/, '') ?? null;
if (!SERVER) {
  console.error('usage: node scripts/test-user-profiles.mjs --server http://localhost:3011');
  process.exit(2);
}

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : `  — ${detail}`}`);
  if (!ok) fails++;
}

const TABS = [
  { label: 'Plans', path: '/dashboard' },
  { label: 'People', path: '/dashboard/people' },
  { label: 'Social Media', path: '/dashboard/social-media' },
  { label: 'Account', path: '/dashboard/account' },
];
// The pages reached from the tabs and the menu, with where each one's back
// link leads.
const INNER = [
  { path: '/dashboard/legacy', back: 'Plans', to: '/dashboard' },
  { path: '/dashboard/recipients', back: 'People', to: '/dashboard/people' },
  { path: '/dashboard/legacy-guards', back: 'People', to: '/dashboard/people' },
  { path: '/dashboard/settings', back: 'Account', to: '/dashboard' },
];
// The Website Design Standards' phase colours, sage to dusk, written here a
// second time so a wrong colour in the product is caught.
const COLOURS = {
  horizon: '#93ab99', planning: '#879d98', interlude: '#7b8f97',
  active: '#708096', reprise: '#647295', posterity: '#586494',
};
const NAMES = { horizon: 'Horizon', planning: 'Planning', interlude: 'Interlude', active: 'Active', reprise: 'Reprise', posterity: 'Posterity' };
const rgb = (hex) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;

const env = {};
for (const raw of readFileSync(homedir() + '/posterity/.env.local', 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (line && !line.startsWith('#') && line.includes('=')) {
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !SERVICE) { console.error('missing Supabase values in ~/posterity/.env.local'); process.exit(2); }

const rest = async (path, { method = 'GET', body, prefer } = {}) => {
  const r = await fetch(URL_ + path, {
    method,
    headers: { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return [r.status, data];
};

let browser;
const users = [];
try {
  console.log('Signed out');
  for (const tab of TABS) {
    const r = await fetch(SERVER + tab.path, { redirect: 'manual' });
    const to = r.headers.get('location') ?? '';
    const want = `/login?next=${encodeURIComponent(tab.path)}`;
    check(`${tab.path} sends the visitor to log in, to come back to it`, r.status === 307 && to.endsWith(want), `${r.status} ${to}`);
  }

  const PASSWORD = 'test-password-123';
  const email = `test-up-${Date.now()}@yourposterity.com`;
  const LEGAL = 'Profile Test';
  let [st, made] = await rest('/auth/v1/admin/users', {
    method: 'POST', body: { email, password: PASSWORD, email_confirm: true, user_metadata: { legal_name: LEGAL } },
  });
  if (st !== 200) throw new Error(`admin create ${email}: ${st} ${JSON.stringify(made)}`);
  users.push(made.id);
  let rows;
  [st, rows] = await rest(`/rest/v1/accounts?user_id=eq.${made.id}&select=id,name,phase`);
  if (st !== 200 || rows.length !== 1) throw new Error(`the test user's account: ${st} ${JSON.stringify(rows)}`);
  const account = rows[0];

  const setPhase = async (phase) => {
    const [s, r] = await rest(`/rest/v1/accounts?id=eq.${account.id}`, { method: 'PATCH', body: { phase }, prefer: 'return=representation' });
    if (s !== 200 || r?.[0]?.phase !== phase) throw new Error(`setting the phase to ${phase}: ${s} ${JSON.stringify(r)}`);
  };
  const reading = async () => {
    const [s, r] = await rest('/rest/v1/rpc/account_status', { method: 'POST', body: { p_account_id: account.id } });
    if (s !== 200) throw new Error(`account_status: ${s} ${JSON.stringify(r)}`);
    return Array.isArray(r) ? r[0] : r;
  };

  const { default: puppeteer } = await import('puppeteer');
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const go = (path) => page.goto(SERVER + path, { waitUntil: 'networkidle0', timeout: 120000 });
  const here = () => { const u = new URL(page.url()); return u.pathname + u.search; };

  // What a tab shows, read from the page as the customer's browser has it.
  const shell = () => page.evaluate(() => {
    const text = (sel) => document.querySelector(sel)?.textContent.trim() ?? null;
    const banner = document.querySelector('#restoration-banner-place');
    const strip = document.querySelector('#profile-strip');
    const checkin = document.querySelector('#checkin-place');
    const main = document.querySelector('main');
    const dot = document.querySelector('#phase-colour');
    return {
      heading: text('main h1'),
      tabs: [...document.querySelectorAll('#profile-tabs a')].map((a) => ({
        label: a.textContent.trim(), href: a.getAttribute('href'), current: a.getAttribute('aria-current'),
      })),
      strip: !!strip,
      phaseInStrip: !!strip?.querySelector('#phase-display'),
      phaseKey: document.querySelector('#phase-display')?.getAttribute('data-phase') ?? null,
      phaseName: text('#phase-name'),
      phaseLine: document.querySelector('#phase-display p:nth-of-type(3)')?.textContent.trim() ?? null,
      colour: dot ? getComputedStyle(dot).backgroundColor : null,
      checkin: checkin ? { inStrip: !!strip?.contains(checkin), children: checkin.childElementCount, text: checkin.textContent.trim() } : null,
      banner: banner ? {
        children: banner.childElementCount, text: banner.textContent.trim(),
        aboveAll: !!main && main.querySelector('div')?.firstElementChild === banner,
        aboveStrip: !!strip && !!(banner.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING),
      } : null,
      storageLine: text('#storage-line'),
      notice: !!document.querySelector('main a[href="/pricing"]'),
      navsInMain: main ? main.querySelectorAll('nav').length : -1,
      logOutInMain: main ? /log\s?out/i.test(main.textContent) : null,
      panel: document.querySelector('main [id^="tab-"]')?.id ?? null,
    };
  });

  console.log('\nSigning in');
  await go('/login');
  await page.type('#email', email);
  await page.type('#password', PASSWORD);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 }), page.keyboard.press('Enter')]);
  check('signing in lands on the logged-in home', here() === '/dashboard', here());

  console.log('\nEvery tab');
  for (const tab of TABS) {
    await go(tab.path);
    const s = await shell();
    const id = tab.path === '/dashboard' ? 'plans' : tab.path.split('/').pop();
    check(`${tab.label}: opens at ${tab.path}, greeting the customer by name`, here() === tab.path && s.heading === `Welcome, ${account.name}.`, `${here()} ${s.heading}`);
    check(`${tab.label}: the four tabs, in order, each with its own address`,
      JSON.stringify(s.tabs.map((t) => [t.label, t.href])) === JSON.stringify(TABS.map((t) => [t.label, t.path])), JSON.stringify(s.tabs));
    check(`${tab.label}: marked as the current tab, and no other`,
      s.tabs.filter((t) => t.current === 'page').map((t) => t.label).join() === tab.label && s.panel === `tab-${id}`, `${JSON.stringify(s.tabs)} ${s.panel}`);
    check(`${tab.label}: the strip is there, carrying the phase display`, s.strip && s.phaseInStrip && s.phaseName === 'Horizon', JSON.stringify([s.strip, s.phaseInStrip, s.phaseName]));
    check(`${tab.label}: the place for the check-in button is within the strip, and empty`,
      !!s.checkin && s.checkin.inStrip && s.checkin.children === 0 && s.checkin.text === '', JSON.stringify(s.checkin));
    check(`${tab.label}: the place for the Account Restoration banner is above everything, and empty`,
      !!s.banner && s.banner.aboveAll && s.banner.aboveStrip && s.banner.children === 0 && s.banner.text === '', JSON.stringify(s.banner));
    check(`${tab.label}: no second bar and no Log Out within the page`, s.navsInMain === 1 && s.logOutInMain === false, `${s.navsInMain} ${s.logOutInMain}`);
  }

  console.log('\nThe phase display');
  await go('/dashboard');
  let s = await shell();
  let now = await reading();
  check('a new account reads Horizon, with its free trial counted in days', now.phase === 'horizon' && /^Your free trial: \d+ days left\.$/.test(s.storageLine ?? ''), `${now.phase} ${s.storageLine}`);
  check('building is open on a new account, so no storage notice shows', now.building_open === true && s.notice === false, `${now.building_open} ${s.notice}`);
  let closedSeen = 0;
  for (const key of ['planning', 'interlude', 'active', 'reprise', 'posterity', 'horizon']) {
    await setPhase(key);
    now = await reading();
    // Each phase is read on a different tab, so every tab is shown to read afresh.
    const tab = TABS[Object.keys(COLOURS).indexOf(key) % TABS.length];
    await go(tab.path);
    s = await shell();
    check(`${NAMES[key]}: the display shows the phase the account status check reads (on ${tab.label})`,
      now.phase === key && s.phaseKey === key && s.phaseName === NAMES[key], `${now.phase} ${s.phaseKey} ${s.phaseName}`);
    check(`${NAMES[key]}: in its own colour, ${COLOURS[key]}`, s.colour === rgb(COLOURS[key]) && PHASES[key].color === COLOURS[key], `${s.colour} ${PHASES[key]?.color}`);
    check(`${NAMES[key]}: with its line beneath`, !!s.phaseLine && s.phaseLine === PHASES[key].line, String(s.phaseLine));
    check(`${NAMES[key]}: the storage notice shows exactly when building is closed`, s.notice === (now.building_open !== true), `notice ${s.notice}, building_open ${now.building_open}`);
    if (now.building_open !== true) closedSeen++;
  }
  check('at least one phase closed building, so the notice was seen both ways', closedSeen > 0, String(closedSeen));

  console.log('\nWithin the tabs');
  const cards = () => page.evaluate(() => [...document.querySelectorAll('main [id^="tab-"] h2')].map((h) => {
    const card = h.parentElement;
    const p = card.querySelectorAll('p');
    return { title: h.textContent.trim(), href: card.tagName === 'A' ? card.getAttribute('href') : null, value: p[1]?.textContent.trim(), hint: p[2]?.textContent.trim() };
  }));
  await go('/dashboard');
  let c = await cards();
  // Plan Selection is scripts/test-plan-records.mjs's to check; here, that it
  // is on the tab above the one card.
  const selection = await page.evaluate(() => ({
    year: document.querySelector('#tab-plans #plan-selection #plan-selection-year')?.getAttribute('data-year') ?? null,
    panel: document.querySelector('#tab-plans #plan-year-panel')?.getAttribute('data-year') ?? null,
  }));
  check('Plans: Plan Selection on Year 1, and My Legacy opening its own page',
    selection.year === '1' && selection.panel === '1' && JSON.stringify(c.filter((card) => card.href)) === JSON.stringify([
      { title: 'My Legacy', href: '/dashboard/legacy', value: '0', hint: 'pieces created' },
    ]), JSON.stringify([selection, c]));
  await go('/dashboard/people');
  c = await cards();
  check('People: Recipients and Legacy Guards, each opening its own page',
    JSON.stringify(c) === JSON.stringify([
      { title: 'Recipients', href: '/dashboard/recipients', value: '0', hint: 'recipients added' },
      { title: 'Legacy Guards', href: '/dashboard/legacy-guards', value: '0', hint: 'Legacy Guards added' },
    ]), JSON.stringify(c));
  [st, rows] = await rest('/rest/v1/recipients', { method: 'POST', body: { account_id: account.id, name: 'Recipient Test', email: `recipient-${Date.now()}@yourposterity.com` }, prefer: 'return=representation' });
  if (st !== 201) throw new Error(`adding a recipient: ${st} ${JSON.stringify(rows)}`);
  await go('/dashboard/people');
  c = await cards();
  check('People: a recipient added shows in the count on the next load', c[0]?.value === '1' && c[0]?.hint === 'recipient added' && c[1]?.value === '0', JSON.stringify(c));
  for (const tab of TABS.slice(2)) {
    await go(tab.path);
    const body = await page.evaluate(() => document.querySelector('main [id^="tab-"]')?.textContent.trim() ?? '');
    check(`${tab.label}: one line, a placeholder awaiting approved copy`, /^\[Placeholder: Product surface copy — [^\]]+\]$/.test(body), body);
  }

  console.log('\nThe pages reached from the tabs and the menu');
  for (const inner of INNER) {
    await go(inner.path);
    const got = await page.evaluate(() => {
      const main = document.querySelector('main');
      const back = [...(main?.querySelectorAll('a') ?? [])].find((a) => a.textContent.includes('←'));
      return {
        navs: main ? main.querySelectorAll('nav').length : -1,
        logOut: main ? /log\s?out/i.test(main.textContent) : null,
        back: back ? [back.textContent.replace('←', '').trim(), back.getAttribute('href')] : null,
        bars: document.querySelectorAll('nav .navmenu').length,
      };
    });
    check(`${inner.path}: one bar, the global one, and no Log Out within the page`, here() === inner.path && got.navs === 0 && got.logOut === false && got.bars === 1, `${here()} ${JSON.stringify(got)}`);
    check(`${inner.path}: its back link reads ${inner.back} and leads to ${inner.to}`, JSON.stringify(got.back) === JSON.stringify([inner.back, inner.to]), JSON.stringify(got.back));
  }

  // Opens the global menu once the page knows who is signed in, and gives
  // what it lists.
  const menu = async (wait) => {
    for (let i = 0; i < 100; i++) {
      if (!(await page.$('.navmenu__panel'))) await page.click('.navmenu__toggle');
      const items = await page.evaluate(() => [...document.querySelectorAll('.navmenu__panel .navmenu__item, .navmenu__panel .navmenu__cta a')].map((el) => ({
        label: el.textContent.trim(), href: el.getAttribute('href'), tag: el.tagName, current: el.classList.contains('is-current'),
      })));
      if (items.some((it) => it.label === wait)) return items;
      await new Promise((done) => setTimeout(done, 100));
    }
    return page.evaluate(() => [...document.querySelectorAll('.navmenu__panel .navmenu__item')].map((el) => ({ label: el.textContent.trim() })));
  };

  console.log('\nThe global menu, signed in');
  await go('/dashboard/people');
  let items = await menu('Log Out');
  check('it carries Account, Add a plan, Settings and Log Out beneath the public links',
    JSON.stringify(items.map((it) => [it.label, it.href])) === JSON.stringify([
      ['How it works', '/'], ['Plans', '/pricing'], ['Account', '/dashboard'], ['Add a plan', '/dashboard/add-plan'], ['Settings', '/dashboard/settings'], ['Log Out', null],
    ]), JSON.stringify(items));
  check('Account is marked current on a tab, and nothing else is', items.filter((it) => it.current).map((it) => it.label).join() === 'Account', JSON.stringify(items));
  check('no Login and no Get Started while signed in', !items.some((it) => it.label === 'Login' || it.label === 'Get Started'), JSON.stringify(items));
  const clickItem = async (label) => {
    const handle = await page.evaluateHandle((l) => [...document.querySelectorAll('.navmenu__panel .navmenu__item')].find((el) => el.textContent.trim() === l), label);
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 }), handle.asElement().click()]);
  };
  await clickItem('Settings');
  check('Settings opens the settings page', here() === '/dashboard/settings', here());
  items = await menu('Log Out');
  check('there, Settings is the one marked current', items.filter((it) => it.current).map((it) => it.label).join() === 'Settings', JSON.stringify(items));
  await clickItem('Account');
  check('Account opens the logged-in home', here() === '/dashboard', here());

  console.log('\nAt a phone\'s width (375px)');
  await page.setViewport({ width: 375, height: 800 });
  for (const path of [...TABS.map((t) => t.path), ...INNER.map((i) => i.path)]) {
    await go(path);
    const fit = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      tabs: [...document.querySelectorAll('#profile-tabs a')].map((a) => { const r = a.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.height)]; }),
    }));
    const isTab = TABS.some((t) => t.path === path);
    check(`${path}: nothing runs off the side`, fit.page <= 375, `page is ${fit.page}px wide`);
    if (isTab) check(`${path}: all four tabs are within the screen, each tall enough to tap`, fit.tabs.length === 4 && fit.tabs.every(([l, r, h]) => l >= 0 && r <= 375 && h >= 24), JSON.stringify(fit.tabs));
  }
  await go('/dashboard');
  items = await menu('Log Out');
  const panel = await page.evaluate(() => { const r = document.querySelector('.navmenu__panel').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; });
  check('the open menu is within the screen', panel[0] >= 0 && panel[1] <= 375 && items.length === 6, JSON.stringify([panel, items.length]));
  await page.setViewport({ width: 1280, height: 900 });

  console.log('\nLogging out from the menu');
  await go('/dashboard');
  await menu('Log Out');
  await clickItem('Log Out');
  check('Log Out leaves the customer on the front page', here() === '/', here());
  await go('/dashboard');
  check('and signed out: the logged-in home asks them to log in', here() === '/login?next=%2Fdashboard', here());
  await go('/');
  items = await menu('Login');
  check('signed out, the menu carries Login and Get Started, and nothing of the account',
    JSON.stringify(items.map((it) => [it.label, it.href])) === JSON.stringify([
      ['How it works', '/'], ['Plans', '/pricing'], ['Login', '/login'], ['Get Started', '/signup'],
    ]), JSON.stringify(items));
} catch (e) {
  console.log(`  ✗ stopped: ${e.message}`);
  fails++;
} finally {
  if (browser) await browser.close();
  for (const id of users) {
    const [st] = await rest(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
    if (st !== 200) { console.log(`  ✗ could not delete test user ${id}: ${st}`); fails++; }
  }
  if (users.length) {
    const [, left] = await rest(`/rest/v1/accounts?user_id=in.(${users.join(',')})&select=id`);
    check('the test user and their account are gone', Array.isArray(left) && left.length === 0, JSON.stringify(left));
  }
}

console.log(fails ? `\n${fails} FAILED` : '\nAll passed');
process.exit(fails ? 1 : 0);
