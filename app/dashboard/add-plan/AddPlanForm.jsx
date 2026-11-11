'use client'

// Posterity — Add a plan: choosing the tier · Walker Brown
import { useActionState, useSyncExternalStore } from 'react'
import { useFormStatus } from 'react-dom'
import { PLANS } from '../../../lib/posterity/plans'
import { CUSTOMER_TIERS } from '../../../lib/posterity/plan-calendar'
import { addPlanAction } from '../_plans/actions'

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93ab99]'
const PILL = `w-full rounded-full border border-white px-5 py-3 text-sm font-semibold text-white hover:bg-white hover:text-black transition-colors duration-200 cursor-pointer disabled:opacity-50 ${FOCUS}`

// The time zone this browser reports (Calendar System: a plan's delivery time
// zone defaults "to the time zone reported by the customer's browser"). Empty
// on the server and on the first client render, so the two match.
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
const noZone = () => ''
const never = () => () => {}

function Submit({ children }) {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending} className={PILL}>{children}</button>
}

// year: the plan year the new plan lands on. chosen: whether the customer
// picked that year on the calendar; where they did not, the server places the
// plan on the year after their last when the form arrives.
export function AddPlanForm({ year, chosen }) {
  const [state, action] = useActionState(addPlanAction, {})
  const zone = useSyncExternalStore(never, browserZone, noZone)

  return (
    <div id="add-plan">
      <p className="font-mono text-xs uppercase tracking-widest text-gray-400" data-year={year}>Year {year}</p>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {CUSTOMER_TIERS.map((tier) => {
          const plan = PLANS[tier]
          return (
            <form key={tier} action={action} data-tier={tier}
              className="bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-800 flex flex-col">
              <input type="hidden" name="tier" value={tier} />
              <input type="hidden" name="time_zone" value={zone} />
              {chosen && <input type="hidden" name="year" value={year} />}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>{' '}
                <span className="text-sm text-gray-400">per plan year</span>
              </p>
              <dl className="mt-5 mb-6 text-sm flex-1">
                {[
                  ['Standard Deliveries', plan.standard],
                  ['Feature Deliveries', plan.feature],
                  ['Social media posts', plan.social],
                ].map(([name, value]) => (
                  <div key={name} className="flex justify-between gap-4 border-b border-gray-800 py-2">
                    <dt className="text-gray-400">{name}</dt>
                    <dd className="text-white">{value}</dd>
                  </div>
                ))}
              </dl>
              <Submit>Add {plan.name}</Submit>
            </form>
          )
        })}
      </div>
      {state.error && <p role="alert" className="text-sm text-red-400 mt-4">{state.error}</p>}
    </div>
  )
}
