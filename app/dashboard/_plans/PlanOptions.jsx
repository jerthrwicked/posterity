'use client'

// Posterity — Plan Selection: the options on a plan · Walker Brown
//
// Master Specification, User Profiles: a plan's options are the skipped years
// before it, its Additional Recipient slots, its delivery time zone, a change
// of tier "with its confirmation on a downgrade", and deletion with its
// confirmation. Each is its own small form, so one saves without the others.
// The server decides every one of them (actions.js); what a form offers here
// is only what it will accept.
import { useActionState, useState, useSyncExternalStore } from 'react'
import { useFormStatus } from 'react-dom'
import { PLANS, RECIPIENT_SLOTS } from '../../../lib/posterity/plans'
import { CUSTOMER_TIERS, MAX_SLOTS, MAX_PLAN_YEAR, isDowngrade } from '../../../lib/posterity/plan-calendar'
import { skipsAction, slotsAction, timeZoneAction, tierAction, deletePlanAction } from './actions'

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93ab99]'
const field = `w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white transition ${FOCUS}`
const label = 'text-sm text-gray-400 mb-1 block'
const note = 'text-xs text-gray-500 mt-2 leading-relaxed'
const PILL = `rounded-full border border-gray-600 px-5 py-3 text-sm font-semibold text-white hover:bg-white hover:text-black hover:border-white transition-colors duration-200 cursor-pointer disabled:opacity-50 ${FOCUS}`
const RED = `rounded-full border border-red-900 px-5 py-3 text-sm font-semibold text-red-300 hover:border-red-500 hover:text-red-200 transition-colors duration-200 cursor-pointer disabled:opacity-50 ${FOCUS}`

function Submit({ children, className = PILL, disabled = false }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {children}
    </button>
  )
}

function Row({ children }) {
  return <div className="flex items-end gap-3">{children}</div>
}

function Problem({ state }) {
  return state.error ? <p role="alert" className="text-sm text-red-400 mt-2">{state.error}</p> : null
}

// The time zones this browser knows. Read once, on the client; the server
// render and the first client render offer only the plan's own, so the two
// match.
let zones = null
const NO_ZONES = []
const browserZones = () => (zones ??= typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : NO_ZONES)
const serverZones = () => NO_ZONES
const never = () => () => {}

function SkipsForm({ plan, skips }) {
  const [state, action] = useActionState(skipsAction, {})
  return (
    <form id="plan-skips" action={action}>
      <input type="hidden" name="plan_id" value={plan.id} />
      <label htmlFor="plan-skips-input" className={label}>Skipped years before this plan</label>
      <Row>
        <input id="plan-skips-input" name="skips" type="number" inputMode="numeric" min={0} max={MAX_PLAN_YEAR - 1} required
          defaultValue={skips} className={field} />
        <Submit>Save</Submit>
      </Row>
      <p className={note}>
        [Placeholder: Product surface copy — Plan Selection: each skipped year before a plan adds a storage fee, and the
        plans after this one move with it]
      </p>
      <Problem state={state} />
    </form>
  )
}

function SlotsForm({ plan }) {
  const [state, action] = useActionState(slotsAction, {})
  const price = RECIPIENT_SLOTS[plan.tier]?.price
  return (
    <form id="plan-slots" action={action}>
      <input type="hidden" name="plan_id" value={plan.id} />
      <label htmlFor="plan-slots-input" className={label}>Additional Recipient slots</label>
      <Row>
        <select id="plan-slots-input" name="slots" defaultValue={String(plan.additional_recipient_slots)} className={field}>
          {Array.from({ length: MAX_SLOTS + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <Submit>Save</Submit>
      </Row>
      <p className={note}>
        [Placeholder: Product surface copy — Plan Selection: each Additional Recipient slot on a {PLANS[plan.tier].name} plan
        costs {price}, and a plan carries up to four]
      </p>
      <Problem state={state} />
    </form>
  )
}

export function TimeZoneForm({ plan }) {
  const [state, action] = useActionState(timeZoneAction, {})
  const known = useSyncExternalStore(never, browserZones, serverZones)
  const offered = known.includes(plan.delivery_time_zone) ? known : [plan.delivery_time_zone, ...known]
  return (
    <form id="plan-time-zone" action={action}>
      <input type="hidden" name="plan_id" value={plan.id} />
      <label htmlFor="plan-time-zone-input" className={label}>Delivery time zone</label>
      <Row>
        <select id="plan-time-zone-input" name="time_zone" defaultValue={plan.delivery_time_zone} className={field}>
          {offered.map((zone) => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}
        </select>
        <Submit>Save</Submit>
      </Row>
      <p className={note}>
        [Placeholder: Product surface copy — Plan Selection: this plan&rsquo;s deliveries go out at noon in this time
        zone, and it can be changed until the account enters Interlude]
      </p>
      <Problem state={state} />
    </form>
  )
}

function TierForm({ plan }) {
  const [state, action] = useActionState(tierAction, {})
  const [choice, setChoice] = useState(plan.tier)
  const lower = isDowngrade(plan.tier, choice)
  return (
    <form id="plan-tier" action={action}>
      <input type="hidden" name="plan_id" value={plan.id} />
      {lower && <input type="hidden" name="confirmed" value="yes" />}
      <label htmlFor="plan-tier-input" className={label}>Tier</label>
      <Row>
        <select id="plan-tier-input" name="tier" value={choice} onChange={(e) => setChoice(e.target.value)} className={field}>
          {CUSTOMER_TIERS.map((tier) => (
            <option key={tier} value={tier}>{PLANS[tier].name} · {PLANS[tier].price}</option>
          ))}
        </select>
        {!lower && <Submit disabled={choice === plan.tier}>Save</Submit>}
      </Row>
      {lower && (
        <div id="plan-tier-confirm" className="mt-3 rounded-lg border border-yellow-900 bg-yellow-950/30 p-4">
          <p className="text-sm text-yellow-200 leading-relaxed">
            [Placeholder: Product surface copy — Plan Selection: the confirmation on a downgrade,
            from {PLANS[plan.tier].name} to {PLANS[choice].name}, which lowers what the plan carries]
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={() => setChoice(plan.tier)} className={PILL}>Cancel</button>
            <Submit>Change to {PLANS[choice].name}</Submit>
          </div>
        </div>
      )}
      <Problem state={state} />
    </form>
  )
}

// The specification's own sentence (User Profiles, Plan Selection).
const DELETE_SENTENCE = 'Are you sure? This will permanently delete all work on this plan and cannot be undone.'

export function DeletePlanForm({ plan }) {
  const [state, action] = useActionState(deletePlanAction, {})
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <div id="plan-delete">
        <button type="button" onClick={() => setOpen(true)}
          className={`py-2 text-sm text-red-300 underline hover:text-red-200 cursor-pointer ${FOCUS}`}>
          Delete plan
        </button>
      </div>
    )
  }
  return (
    <form id="plan-delete" action={action} className="rounded-lg border border-red-900 p-4">
      <input type="hidden" name="plan_id" value={plan.id} />
      <input type="hidden" name="confirmed" value="yes" />
      <p id="plan-delete-sentence" className="text-sm text-red-200 leading-relaxed">{DELETE_SENTENCE}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={() => setOpen(false)} className={PILL}>Cancel</button>
        <Submit className={RED}>Delete plan</Submit>
      </div>
      <Problem state={state} />
    </form>
  )
}

// plan: the unpaid plan on the chosen year. skips: the skipped years before
// it. Each form is keyed on the value it shows, so a saved change starts the
// form afresh on what the record now holds.
export function PlanOptions({ plan, skips }) {
  return (
    <div id="plan-options" className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
      <SkipsForm key={`skips-${plan.id}-${skips}`} plan={plan} skips={skips} />
      <SlotsForm key={`slots-${plan.id}-${plan.additional_recipient_slots}-${plan.tier}`} plan={plan} />
      <TimeZoneForm key={`zone-${plan.id}-${plan.delivery_time_zone}`} plan={plan} />
      <TierForm key={`tier-${plan.id}-${plan.tier}`} plan={plan} />
    </div>
  )
}
