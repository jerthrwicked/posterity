// Posterity — User Profiles: the Plans tab, the logged-in home · Walker Brown
import { requireAccount } from '../../lib/posterity/account'
import { yearCalendar, skipsBefore, atPlanLimit, CUSTOMER_TIERS, MAX_PLAN_YEAR } from '../../lib/posterity/plan-calendar'
import { ProfileShell, Card } from './_profile/ProfileShell'
import { YearCalendar, PlanFacts, StatusPill, StorageFeeNotice, TIER_NAMES } from './_plans/YearCalendar'
import { PlanOptions, TimeZoneForm, DeletePlanForm } from './_plans/PlanOptions'
import { settleCart, plansHeld } from './_cart/read'

// What the Plans tab says once the cart's payment form comes back
// (app/api/cart/return/route.js). No approved text exists yet, so each is a
// placeholder naming the Writing Requirements item that will supply it.
const PAYMENT = {
  paid: '[Placeholder: Product surface copy — payment form: the payment was received, and the plans it paid for are now paid]',
  not_paid: '[Placeholder: Product surface copy — payment form: the payment was not completed]',
  unconfirmed: '[Placeholder: Product surface copy — payment form: the payment could not be confirmed just now; a payment that was taken shows on its plans shortly]',
}

const PILL = 'inline-block rounded-full border border-gray-600 px-5 py-3 text-sm font-semibold text-white hover:bg-white hover:text-black hover:border-white transition-colors duration-200 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93ab99]'

// The plan year in the address, where it is one a plan can sit on.
function yearFrom(value) {
  const n = Number(Array.isArray(value) ? value[0] : value)
  return Number.isInteger(n) && n >= 1 && n <= MAX_PLAN_YEAR ? n : null
}

export default async function PlansTab({ searchParams }) {
  // proxy.js already redirected signed-out visitors. This is the real check —
  // proxy is an optimistic gate, not an authorization boundary.
  const profile = await requireAccount({ next: '/dashboard' })
  const { supabase, account, status, canBuild } = profile
  const query = await searchParams

  // A payment form paid on Stripe's page is applied before the plans are
  // read, so they show as paid whichever way the customer came back.
  await settleCart(supabase, account?.id)

  // Everything below is read under RLS as this user — they cannot read anyone
  // else's.
  let plans = []
  let content = 0
  let held = new Set()
  if (account) {
    const [planRows, contentRows, heldPlans] = await Promise.all([
      supabase
        .from('plans')
        .select('id, plan_year, tier, paid_at, delivery_time_zone, standard_deliveries, feature_deliveries, social_posts, additional_recipient_slots')
        .eq('account_id', account.id)
        .order('plan_year'),
      supabase.from('content_items').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
      plansHeld(supabase, account.id),
    ])
    plans = planRows.data ?? []
    content = contentRows.count ?? 0
    held = heldPlans
  }

  // Plan Selection opens on the year in the address. Without one it opens on
  // the first plan still to be paid for, then on the last plan, then on Year 1.
  // A plan a payment form is open for reads In checkout.
  const years = yearCalendar(plans).map((y) => (
    y.status === 'configured' && held.has(y.plan.id) ? { ...y, status: 'in_checkout' } : y
  ))
  const came = Array.isArray(query?.payment) ? query.payment[0] : query?.payment
  const payment = Object.hasOwn(PAYMENT, came ?? '') ? PAYMENT[came] : null
  const selected = yearFrom(query?.year)
    ?? plans.find((p) => !p.paid_at)?.plan_year
    ?? plans.at(-1)?.plan_year
    ?? 1
  const entry = years.find((y) => y.year === selected) ?? { year: selected, plan: null, status: null }
  const plan = entry.plan

  // What the customer may do on this year. The server decides each again when
  // it is asked (lib/posterity/plan-records.js).
  const phase = status?.phase ?? account?.phase
  const building = phase === 'horizon' || phase === 'planning'
  const limited = atPlanLimit(phase, plans)
  const theirs = plan ? CUSTOMER_TIERS.includes(plan.tier) : false
  const unpaid = plan ? !plan.paid_at : false

  return (
    <ProfileShell tab="plans" profile={profile}>
      {payment && (
        <p id="payment-result" role="status" data-payment={came}
          className="mb-6 rounded-2xl border border-gray-700 px-5 py-4 text-sm text-gray-200">
          {payment}
        </p>
      )}
      {/* Stage 4.7: the Begin button lands here, showing only on an initiated
          account. */}
      {account && <YearCalendar years={years} selected={selected} />}

      {account && (
        <section id="plan-year-panel" data-year={selected} aria-labelledby="plan-year-title"
          className="mt-6 bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-800">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="plan-year-title" className="text-xl font-bold">
              Year {selected}{plan ? ` · ${TIER_NAMES[plan.tier]}` : ''}
            </h2>
            {entry.status && <StatusPill status={entry.status} />}
          </div>

          {plan ? (
            <>
              <PlanFacts plan={plan} />
              {canBuild && unpaid && theirs && <PlanOptions plan={plan} skips={skipsBefore(plans, plan)} />}
              {/* The time zone alone stays open on a paid plan, and on one
                  placed by staff, until Interlude (Calendar System). */}
              {canBuild && !(unpaid && theirs) && (
                <div id="plan-options" className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <TimeZoneForm key={`zone-${plan.id}-${plan.delivery_time_zone}`} plan={plan} />
                </div>
              )}
              {/* Deleting stays open while building is locked for a storage
                  lapse, and closes with the Planning Phase. A change to a paid
                  plan arrives with the cart's next part. */}
              {building && unpaid && theirs && (
                <div className="mt-8 pt-6 border-t border-gray-800">
                  <DeletePlanForm key={`delete-${plan.id}`} plan={plan} />
                </div>
              )}
            </>
          ) : (
            <div className="mt-4">
              {entry.status === 'skipped' ? (
                <StorageFeeNotice year={selected} />
              ) : (
                <p id="plan-year-empty" className="text-sm text-gray-400">
                  [Placeholder: Product surface copy — Plan Selection: this plan year holds no plan]
                </p>
              )}
              {canBuild && limited && (
                <p id="plan-limit" className="text-sm text-gray-300 mt-4 leading-relaxed">
                  [Placeholder: Product surface copy — Plan Selection: an account builds one plan until that plan is
                  paid for; paying for it opens further plans]
                </p>
              )}
              {canBuild && !limited && (
                <a id="add-plan-here" href={`/dashboard/add-plan?year=${selected}`} className={`${PILL} mt-5`}
                  style={{ textDecoration: 'none' }}>
                  Add a plan
                </a>
              )}
            </div>
          )}
        </section>
      )}

      {/* Stage 4.5: Plan Content and the button that opens the Content
          Builder land here. Until then the content built so far opens from
          this card. */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          href="/dashboard/legacy"
          title="My Legacy"
          blurb="The messages you're leaving behind."
          value={content}
          hint={content === 1 ? 'piece created' : 'pieces created'}
        />
      </div>
    </ProfileShell>
  )
}
