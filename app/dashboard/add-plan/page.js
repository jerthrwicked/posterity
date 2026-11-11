// Posterity — Add a plan · Walker Brown
//
// Master Specification, User Profiles: "Add a plan, within the global
// navigation dropdown, places a new plan with its tier, under the limit held
// within Horizon Tier." Opened from the dropdown it places the plan on the
// year after the customer's last; opened from an empty year on the calendar
// (?year=3) it places it on that year.
//
// A Grace plan is requested and a Custom plan is quoted, each through its own
// path within this stage; neither is offered here.
import { requireAccount } from '../../../lib/posterity/account'
import { atPlanLimit, MAX_PLAN_YEAR } from '../../../lib/posterity/plan-calendar'
import { StorageNotice } from '../../components/StorageNotice'
import { AddPlanForm } from './AddPlanForm'

function yearFrom(value) {
  const n = Number(Array.isArray(value) ? value[0] : value)
  return Number.isInteger(n) && n >= 1 && n <= MAX_PLAN_YEAR ? n : null
}

const LINE = 'text-sm text-gray-300 leading-relaxed'

export default async function AddPlan({ searchParams }) {
  const query = await searchParams
  const asked = yearFrom(query?.year)
  const { supabase, account, status, canBuild } = await requireAccount({
    next: asked ? `/dashboard/add-plan?year=${asked}` : '/dashboard/add-plan',
  })

  let plans = []
  if (account) {
    const { data } = await supabase.from('plans').select('plan_year, tier').eq('account_id', account.id).order('plan_year')
    plans = data ?? []
  }
  const year = asked ?? (plans.at(-1)?.plan_year ?? 0) + 1
  const taken = plans.some((p) => p.plan_year === year)
  const limited = atPlanLimit(status?.phase ?? account?.phase, plans)

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <a href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">← Plans</a>
        <h1 className="text-3xl sm:text-4xl font-bold mt-4">Add a plan</h1>

        <div className="mt-8">
          {!account ? (
            <p className={LINE}>
              [Placeholder: Product surface copy — error messages: the account record cannot be found]
            </p>
          ) : !canBuild ? (
            <StorageNotice />
          ) : limited ? (
            <p id="plan-limit" className={LINE}>
              [Placeholder: Product surface copy — Plan Selection: an account builds one plan until that plan is paid
              for; paying for it opens further plans]
            </p>
          ) : year > MAX_PLAN_YEAR ? (
            <p id="plan-year-out" className={LINE}>
              [Placeholder: Product surface copy — error messages: that plan year is outside the years a plan can be
              placed on]
            </p>
          ) : taken ? (
            <p id="plan-year-taken" className={LINE}>
              [Placeholder: Product surface copy — error messages: that plan year already holds a plan]{' '}
              <a href={`/dashboard?year=${year}`} className="underline">Year {year}</a>
            </p>
          ) : (
            <AddPlanForm year={year} chosen={asked !== null} />
          )}
        </div>
      </div>
    </main>
  )
}
