// Posterity — the cart, read from the plans being built · Walker Brown
//
// Master Specification, User Profiles: "All plans currently being built, as
// well any purchased Additional Recipients and/or skipped year storage fees,
// are automatically included in a profile's cart. Plans can be paid for
// individually or all at once, and only the plan (not its added inclusions)
// can be selected for payment within a cart."
//
// So the cart is not a record. It is the account's unpaid plans, each with
// what travels with it, worked out afresh every time it is shown or paid for:
// its Additional Recipient slots, and the storage fee of each skipped plan
// year directly before it (Plan Year System: "stacking per skipped year").
// Every price is the catalog's (plans.js).
//
// Nothing here needs the server, so the page and the checkout
// (lib/posterity/checkout.js) read the cart through the same functions, and
// what a customer is shown is what they are charged.
//
// A line: { kind, planId, planYear, tier, name, quantity, unitAmount, priceId }
//   kind         plan, recipient_slots, skipped_year, or storage
//   planId       the plan the line belongs to; a skipped year belongs to the
//                plan after it. Null on the storage fee.
//   planYear     the plan's year, or the skipped year itself. Null on the
//                storage fee.
//   unitAmount   in cents
import { PLANS, GRACE_STORAGE, STORAGE_FEE, RECIPIENT_SLOTS } from './plans.js'
import { CUSTOMER_TIERS } from './plan-calendar.js'

// A catalog price in cents: '$9.99' is 999 and '$49' is 4900.
export function cents(price) {
  const read = /^\$(\d+)(?:\.(\d{2}))?$/.exec(String(price ?? ''))
  if (!read) throw new Error(`cart: a catalog price that cannot be read: ${price}`)
  return Number(read[1]) * 100 + Number(read[2] ?? 0)
}

// Cents as the catalog writes a price: 4900 is $49 and 999 is $9.99.
export function dollars(amount) {
  const whole = Math.trunc(amount / 100)
  const part = amount % 100
  return part ? `$${whole}.${String(part).padStart(2, '0')}` : `$${whole}`
}

const amountOf = (line) => line.quantity * line.unitAmount

// What a set of lines comes to, in cents.
export function totalOf(lines) {
  return lines.reduce((sum, line) => sum + amountOf(line), 0)
}

function feeLine(plan, year) {
  return {
    kind: 'skipped_year', planId: plan.id, planYear: year, tier: plan.tier, name: STORAGE_FEE.name,
    quantity: 1, unitAmount: cents(STORAGE_FEE.price), priceId: STORAGE_FEE.priceId,
  }
}

// The cart.
//
// plans: the account's plan rows (id, plan_year, tier, paid_at,
//   additional_recipient_slots).
// fees: its storage_fees rows (plan_year, paid_at). A skipped year whose fee
//   is paid is not charged again.
//
// Returns { groups, loose, total }.
//   groups   one per unpaid plan, in plan year order: { planId, planYear,
//            tier, name, lines, total }, the plan's own line first, then its
//            slots, then the skipped years before it
//   loose    the fee of a skipped year whose plan is already paid, which no
//            unpaid plan carries. It is always part of the next payment.
//
// A plan placed by Posterity (Grace or Custom) is paid for through its own
// path, so it and the skipped years before it are left out here.
export function cartOf({ plans, fees = [] }) {
  const paidFee = new Set(fees.filter((fee) => fee.paid_at).map((fee) => fee.plan_year))
  const groups = []
  const loose = []
  let before = 0
  for (const plan of [...plans].sort((a, b) => a.plan_year - b.plan_year)) {
    const skipped = []
    for (let year = before + 1; year < plan.plan_year; year += 1) {
      if (!paidFee.has(year)) skipped.push(feeLine(plan, year))
    }
    before = plan.plan_year
    if (!CUSTOMER_TIERS.includes(plan.tier)) continue
    if (plan.paid_at) {
      loose.push(...skipped)
      continue
    }

    const catalog = PLANS[plan.tier]
    const slot = RECIPIENT_SLOTS[plan.tier]
    const slots = plan.additional_recipient_slots ?? 0
    const lines = [{
      kind: 'plan', planId: plan.id, planYear: plan.plan_year, tier: plan.tier, name: catalog.name,
      quantity: 1, unitAmount: cents(catalog.price), priceId: catalog.priceId,
    }]
    if (slots > 0) {
      lines.push({
        kind: 'recipient_slots', planId: plan.id, planYear: plan.plan_year, tier: plan.tier, name: slot.name,
        quantity: slots, unitAmount: cents(slot.price), priceId: slot.priceId,
      })
    }
    lines.push(...skipped)
    groups.push({ planId: plan.id, planYear: plan.plan_year, tier: plan.tier, name: catalog.name, lines, total: totalOf(lines) })
  }
  return { groups, loose, total: groups.reduce((sum, g) => sum + g.total, 0) + totalOf(loose) }
}

// The lines one payment takes: the chosen plans, each with everything that
// travels with it, and every loose skipped-year fee.
export function linesFor(cart, planIds) {
  const chosen = new Set(planIds ?? [])
  return [...cart.groups.filter((g) => chosen.has(g.planId)).flatMap((g) => g.lines), ...cart.loose]
}

// The storage fee as a line: the account's storage product, billed each year.
// status: the account status check's answer.
export function storageLine(status) {
  const product = status?.storage_product === 'grace' ? GRACE_STORAGE : PLANS.horizon
  return {
    kind: 'storage', planId: null, planYear: null, tier: status?.storage_product === 'grace' ? 'grace' : 'horizon',
    name: product.name, quantity: 1, unitAmount: cents(product.price), priceId: product.priceId,
  }
}

// Whether the storage fee is current: a paid storage year holds, read from
// the paid-through date as the database reads it (storage_paid_end: the day
// has ended everywhere, UTC-12). The free trial is not a paid year, so an
// account within it reads false here (Horizon Tier: "Paying for a plan
// without a current storage fee automatically adds the storage fee at
// checkout").
export function storageCurrent(status, now = new Date()) {
  const through = status?.storage_paid_through
  if (!through) return false
  return Date.parse(`${through}T00:00:00Z`) + 36 * 60 * 60 * 1000 > now.getTime()
}

// What Stripe's payment form is opened with: one entry per price, so two
// plans on one tier are one entry of two.
export function stripeItems(lines) {
  const byPrice = new Map()
  for (const line of lines) byPrice.set(line.priceId, (byPrice.get(line.priceId) ?? 0) + line.quantity)
  return [...byPrice].map(([price, quantity]) => ({ price, quantity }))
}

// The plans a payment form is open for right now.
//
// checkouts: the account's open checkouts, each with its checkout_lines.
// A form past its expiry is no longer one a customer can pay through.
export function plansInCheckout(checkouts, now = new Date()) {
  const held = new Set()
  for (const checkout of checkouts ?? []) {
    if (checkout.status && checkout.status !== 'open') continue
    if (checkout.expires_at && Date.parse(checkout.expires_at) <= now.getTime()) continue
    for (const line of checkout.checkout_lines ?? []) {
      if (line.kind === 'plan' && line.plan_id) held.add(line.plan_id)
    }
  }
  return held
}
