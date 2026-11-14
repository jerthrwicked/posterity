// Posterity — filling Stripe's hosted payment form in a test · Walker Brown
//
// The test scripts pay through Stripe's own page in a real browser, with a
// test card. Stripe has drawn that page two ways. Until November 2026 the
// card fields sat on the page itself (#cardNumber). Since then they sit in a
// frame Stripe loads into it (#payment-numberInput), under a list of payment
// methods with Card among them. fillStripeForm() fills whichever it finds, so
// a script does not stop the day Stripe moves a customer from one to the
// other.
//
// The frame is reached through a session of this script's own, not through
// Puppeteer's handle on it. In a tab that has shown one of Stripe's forms
// before, that handle sometimes never answers, though the form is on the
// screen, and neither a new tab nor loading the page again reliably brings
// it back. The frame's own session answers every time.
//
// It fills and submits. Whether the payment went through is the script's to
// ask Stripe, or to read from where the browser lands.

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
export const TEST_CARD = { number: '4242424242424242', expiry: '1234', cvc: '123', name: 'Test Customer', postalCode: '70112' };

const within = (promise, ms, otherwise = null) => Promise.race([promise.catch(() => otherwise), pause(ms).then(() => otherwise)]);

// The Checkout session a page is showing, from its address.
const sessionOf = (page) => page.url().match(/cs_(?:test|live)_[A-Za-z0-9]+/)?.[0] || null;

// Runs a piece of script within the form's frame and gives back its value.
const ask = (frame, expression, ms = 5000) => within(
  frame.send('Runtime.evaluate', { expression, returnByValue: true, userGesture: true }).then((r) => r.result?.value ?? null), ms);

const OLD_FORM = '#cardNumber, [data-testid="card-accordion-item-button"]';
const NEW_FORM = '#payment-numberInput, [data-testid="payment-accordion-wrapper"] [data-value="card"]';

// Where the card fields are: on the page itself ('page'), or in a frame, with
// a session opened on that frame ('frame'). Waits until one is there.
//
// Stripe's frames each carry the Checkout session in their address, which is
// how a frame is known to belong to this page and not to another tab's form.
async function findForm(page, timeout) {
  const until = Date.now() + timeout;
  const opened = new Map();
  const close = (keep) => Promise.all([...opened.values()].filter((s) => s !== keep).map((s) => s.detach().catch(() => {})));
  for (;;) {
    if (await within(page.evaluate((sel) => Boolean(document.querySelector(sel)), OLD_FORM), 3000, false)) {
      await close();
      return { layout: 'page' };
    }
    const id = sessionOf(page);
    for (const target of id ? page.browser().targets() : []) {
      if (!target.url().startsWith('https://js.stripe.com/') || !target.url().includes(id)) continue;
      if (!opened.has(target)) {
        const session = await within(target.createCDPSession(), 5000);
        if (session) opened.set(target, session);
      }
      const frame = opened.get(target);
      if (frame && await ask(frame, `Boolean(document.querySelector(${JSON.stringify(NEW_FORM)}))`, 3000)) {
        await close(frame);
        return { layout: 'frame', frame };
      }
    }
    if (Date.now() > until) {
      await close();
      // STRIPE_FORM_SHOT names a file to save a picture of the page to, for
      // seeing what Stripe showed instead.
      if (process.env.STRIPE_FORM_SHOT) await page.screenshot({ path: process.env.STRIPE_FORM_SHOT }).catch(() => {});
      const text = await within(page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 200)), 5000, '');
      throw new Error(`Stripe's payment form did not show its card fields within ${timeout / 1000} seconds (${page.url().slice(0, 60)}): ${text}`);
    }
    await pause(500);
  }
}

// Types into a field of the old layout that is there, and passes over one that is not.
async function type(page, selector, text) {
  const field = await page.$(selector);
  if (!field) return false;
  await field.type(text);
  return true;
}

// Types into a field within the frame: the field takes the cursor, and the
// keys go through the page as a person's would. A field that is not there is
// passed over unless it must be.
async function typeWithin(page, frame, id, text, { required = true } = {}) {
  const there = await ask(frame, `(() => { const e = document.getElementById(${JSON.stringify(id)}); if (!e) return false; e.focus(); return document.activeElement === e; })()`);
  if (!there) {
    if (required) throw new Error(`Stripe's payment form has no field #${id} to type into`);
    return false;
  }
  await page.keyboard.type(text);
  return true;
}

// Fills Stripe's hosted payment form with a test card and submits it. The
// page must be on the form or on its way to it.
//
// Returns the layout it found, 'page' or 'frame'.
export async function fillStripeForm(page, card = {}) {
  const c = { ...TEST_CARD, ...card };
  await page.waitForFunction(() => location.host === 'checkout.stripe.com', { timeout: 180000 });
  const { frame, layout } = await findForm(page, 90000);

  if (layout === 'page') {
    await page.evaluate(() => document.querySelector('[data-testid="card-accordion-item-button"]')?.click());
    await page.waitForSelector('#cardNumber', { visible: true, timeout: 30000 });
    await page.type('#cardNumber', c.number);
    await page.type('#cardExpiry', c.expiry);
    await page.type('#cardCvc', c.cvc);
    await type(page, '#billingName', c.name);
    await type(page, '#billingPostalCode', c.postalCode);
    // Link's offer to save the card is declined.
    await page.evaluate(() => { const box = document.getElementById('enableStripePass'); if (box?.checked) box.click(); });
    await page.evaluate(() => document.querySelector('[data-testid="hosted-payment-submit-button"]').click());
    return layout;
  }

  try {
    // The tab in front is the one the keys go to.
    await page.bringToFront();
    // Card is one of several payment methods, and is opened before its fields show.
    await ask(frame, `(() => { if (!document.getElementById('payment-numberInput')) document.querySelector('[data-testid="payment-accordion-wrapper"] [data-value="card"]')?.click(); })()`);
    const shown = `(() => { const e = document.getElementById('payment-numberInput'); return Boolean(e && e.getClientRects().length); })()`;
    for (const until = Date.now() + 30000; !(await ask(frame, shown));) {
      if (Date.now() > until) throw new Error("Stripe's payment form did not open its card fields within 30 seconds");
      await pause(250);
    }
    await typeWithin(page, frame, 'payment-numberInput', c.number);
    await typeWithin(page, frame, 'payment-expiryInput', c.expiry);
    await typeWithin(page, frame, 'payment-cvcInput', c.cvc);
    await typeWithin(page, frame, 'payment-nameInput', c.name, { required: false });
    await typeWithin(page, frame, 'payment-postalCodeInput', c.postalCode, { required: false });
    // What the form now holds, so a field the keys missed stops the script
    // here and not at a payment that never arrives.
    const held = await ask(frame, `['payment-numberInput', 'payment-expiryInput', 'payment-cvcInput'].map((id) => document.getElementById(id)?.value.replace(/\\D/g, '') || '').join(' ')`);
    if (held !== `${c.number} ${c.expiry} ${c.cvc}`) throw new Error(`Stripe's payment form did not take the card as typed (it holds ${String(held).replace(/\d(?=\d{4})/g, '•')})`);
    // Link's offer to save the card is declined.
    await ask(frame, `(() => { const box = document.getElementById('payment-linkOptInInput'); if (box?.checked) box.click(); })()`);
    await ask(frame, `document.querySelector('[data-testid="payment-form-submit-button"]').click()`);
    return layout;
  } finally {
    await frame.detach().catch(() => {});
  }
}
