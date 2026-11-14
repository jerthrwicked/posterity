// Posterity — Plan Selection: the year calendar · Walker Brown
//
// Master Specification, Calendar System: "customers pick which plan year they
// are configuring before placing content. Each year shows its plan and tier
// and whether it is configured, scheduled, paid, or skipped. Year arrows, plan
// year list, and manual year input all supported. Skipped years are surfaced
// in the calendar with the storage fee notice attached."
//
// The chosen year rides in the address (?year=3), so the arrows and the list
// are links, the manual input is a form that needs no script, and a year can
// be bookmarked or sent back to after a change. Scheduled arrives with the
// delivery schedule within Stage 4.5.
//
// A plan a payment form is open for reads In checkout until the form is paid
// or closed (lib/posterity/checkout.js).
import { PLANS, STORAGE_FEE } from '../../../lib/posterity/plans'
import { MAX_PLAN_YEAR } from '../../../lib/posterity/plan-calendar'

export const TIER_NAMES = { basic: 'Basic', premium: 'Premium', legacy: 'Legacy', custom: 'Custom', grace: 'Grace' }
export const STATUS_NAMES = { paid: 'Paid', in_checkout: 'In checkout', configured: 'Configured', skipped: 'Skipped' }

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93ab99]'
const ARROW = `inline-flex items-center justify-center w-11 h-11 rounded-full border text-lg transition-colors duration-200 ${FOCUS}`
const PILL = `rounded-full border border-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-white hover:text-black hover:border-white transition-colors duration-200 cursor-pointer ${FOCUS}`

const STATUS_STYLE = {
  paid: 'border-[#93ab99] text-[#93ab99]',
  in_checkout: 'border-gray-300 text-white',
  configured: 'border-gray-500 text-gray-200',
  skipped: 'border-gray-700 text-gray-400',
}

export function yearHref(year) {
  return `/dashboard?year=${year}`
}

export function StatusPill({ status }) {
  return (
    <span data-status={status} className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {STATUS_NAMES[status]}
    </span>
  )
}

// The storage fee notice a skipped year carries (Plan Year System: skipped
// years "generate non-recurring storage fees that are automatically added to
// the user's cart"). The fee's name and price are the catalog's; the sentence
// awaits approved copy.
export function StorageFeeNotice({ year }) {
  return (
    <span data-storage-fee-notice={year} className="block text-xs text-gray-400 leading-relaxed">
      <span className="text-gray-300">{STORAGE_FEE.name} · {STORAGE_FEE.price}</span>{' '}
      [Placeholder: Product surface copy — Plan Selection: the storage fee notice on a skipped plan year]
    </span>
  )
}

function Arrow({ id, to, label, children }) {
  if (to === null) {
    return (
      <span id={id} aria-hidden="true" className={`${ARROW} border-gray-800 text-gray-700`}>
        {children}
      </span>
    )
  }
  return (
    <a id={id} href={yearHref(to)} aria-label={label}
      className={`${ARROW} border-gray-600 text-white hover:bg-white hover:text-black hover:border-white`}
      style={{ textDecoration: 'none' }}>
      {children}
    </a>
  )
}

// years: the calendar from yearCalendar(). selected: the plan year chosen.
export function YearCalendar({ years, selected }) {
  return (
    <section id="plan-selection" aria-labelledby="plan-selection-year"
      className="bg-[color:var(--card-ground)] posterity-frame rounded-2xl p-6 sm:p-8 border border-[color:var(--card-edge)]">
      <p className="font-mono text-xs uppercase tracking-widest text-gray-400">Plan Selection</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Arrow id="year-prev" to={selected > 1 ? selected - 1 : null} label={`Year ${selected - 1}`}>
            <span aria-hidden="true">←</span>
          </Arrow>
          <h2 id="plan-selection-year" data-year={selected} className="text-2xl font-bold min-w-[5.5rem] text-center">
            Year {selected}
          </h2>
          <Arrow id="year-next" to={selected < MAX_PLAN_YEAR ? selected + 1 : null} label={`Year ${selected + 1}`}>
            <span aria-hidden="true">→</span>
          </Arrow>
        </div>

        <form id="year-form" method="get" action="/dashboard" className="flex items-center gap-2">
          <label htmlFor="year-input" className="text-sm text-gray-400">Plan year</label>
          <input id="year-input" name="year" type="number" inputMode="numeric" min={1} max={MAX_PLAN_YEAR} required
            defaultValue={selected} key={selected}
            className={`w-20 bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white transition ${FOCUS}`} />
          <button type="submit" className={PILL}>Go</button>
        </form>
      </div>

      {years.length > 0 && (
        <ol id="plan-year-list" className="mt-6 border-t border-gray-800">
          {years.map(({ year, plan, status }) => (
            <li key={year} className="border-b border-gray-800">
              <a href={yearHref(year)} data-year={year} data-status={status} data-tier={plan?.tier ?? ''}
                aria-current={year === selected ? 'true' : undefined}
                className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-3 rounded-lg transition-colors duration-200 hover:bg-white/5 ${FOCUS} ${year === selected ? 'bg-white/10' : ''}`}
                style={{ textDecoration: 'none', color: 'inherit' }}>
                <span className="font-semibold w-16">Year {year}</span>
                <span className="flex-1 text-gray-300">{plan ? TIER_NAMES[plan.tier] : <span aria-hidden="true">—</span>}</span>
                <StatusPill status={status} />
                {status === 'skipped' && <span className="basis-full"><StorageFeeNotice year={year} /></span>}
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

// What a plan carries, read from its own record, in the specification's terms.
export function PlanFacts({ plan }) {
  const catalog = PLANS[plan.tier]
  const rows = [
    catalog ? ['Price per plan year', catalog.price] : null,
    ['Standard Deliveries', plan.standard_deliveries],
    ['Feature Deliveries', plan.feature_deliveries],
    ['Social media posts', plan.social_posts],
    ['Additional Recipient slots', plan.additional_recipient_slots],
    ['Delivery time zone', plan.delivery_time_zone],
  ].filter(Boolean)
  return (
    <dl id="plan-facts" className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
      {rows.map(([name, value]) => (
        <div key={name} className="flex justify-between gap-4 border-b border-gray-800 py-2">
          <dt className="text-gray-400">{name}</dt>
          <dd className="text-white text-right break-words" data-fact={name}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
