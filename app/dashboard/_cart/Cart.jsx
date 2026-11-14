'use client'

// Posterity — User Profiles: the live cart · Walker Brown
//
// Master Specification, User Profiles: "Live cart top right of User Profiles
// ... shows all plans currently being built with total cost, storage fee as a
// permanent separate line item, and next payment date." "Plans can be paid
// for individually or all at once, and only the plan (not its added
// inclusions) can be selected for payment within a cart."
//
// So each plan being built carries one tick, and its Additional Recipient
// slots and the skipped years before it travel with it. The total follows the
// ticks as they change. The server works the charge out again from the plans
// themselves when Pay is pressed (actions.js), and refuses where its total is
// not the one shown here.
//
// Legal and Compliance: "The refund policy is shown at checkout, and the
// customer accepts it before paying." It is shown and accepted here, before
// the payment form opens.
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { dollars } from '../../../lib/posterity/cart'
import { payAction } from './actions'

// No approved text exists yet for these, so each is a placeholder naming the
// Writing Requirements item that will supply it.
const COPY = {
  empty: '[Placeholder: Product surface copy — User Profiles: the cart holds no plan being built]',
  storageJoins: '[Placeholder: Product surface copy — User Profiles: the storage fee is not current, so it is added to this payment and renews each year]',
  storageOwed: '[Placeholder: Product surface copy — User Profiles: the storage fee is unpaid, and is settled before a plan is paid for]',
  loose: '[Placeholder: Product surface copy — User Profiles: the storage fee of a skipped plan year is part of the next payment]',
  policy: '[Placeholder: Product surface copy — payment form: the refund policy, shown before the customer pays]',
  closed: '[Placeholder: Product surface copy — User Profiles: plans are not paid for from here once the Planning Phase has closed]',
}

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93ab99]'
const note = 'text-xs text-gray-500 mt-1 leading-relaxed'
const PILL = `w-full rounded-full border border-gray-600 px-5 py-3 text-sm font-semibold text-white hover:bg-white hover:text-black hover:border-white transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS}`
const TICK = `mt-1 w-4 h-4 shrink-0 accent-[#93ab99] ${FOCUS}`

function Submit({ children, disabled }) {
  const { pending } = useFormStatus()
  return (
    <button id="cart-pay" type="submit" disabled={pending || disabled} className={PILL}>
      {children}
    </button>
  )
}

const amountOf = (line) => line.quantity * line.unitAmount

// One line of a plan: what it is on the left, what it costs on the right.
function Line({ line, lead = false }) {
  let name = line.name
  if (line.kind === 'plan') name = `Year ${line.planYear} · ${line.name}`
  if (line.kind === 'recipient_slots') name = `Additional Recipient slots × ${line.quantity}`
  if (line.kind === 'skipped_year') name = `${line.name} · Year ${line.planYear}`
  return (
    <span data-line-kind={line.kind} data-line-year={line.planYear}
      className={`flex justify-between gap-3 ${lead ? 'text-white font-semibold' : 'text-gray-400 text-sm'}`}>
      <span className="min-w-0 break-words">{name}</span>
      <span className="shrink-0 tabular-nums">{dollars(amountOf(line))}</span>
    </span>
  )
}

// groups, loose, storage, inCheckout, closed: readCart()'s answer (read.js).
// open: whether the cart starts unfolded. It does on the Plans tab.
export function Cart({ groups, loose, storage, inCheckout, closed, open = false }) {
  const [state, action] = useActionState(payAction, {})
  // The plans unticked. A plan added later arrives ticked.
  const [off, setOff] = useState(() => new Set())
  const toggle = (id) => setOff((was) => {
    const next = new Set(was)
    if (!next.delete(id)) next.add(id)
    return next
  })

  const held = new Set(inCheckout)
  const chosen = groups.filter((g) => !off.has(g.planId))
  const joins = storage.state === 'joins' && chosen.length > 0
  const total = chosen.reduce((sum, g) => sum + g.total, 0)
    + loose.reduce((sum, line) => sum + amountOf(line), 0)
    + (joins ? storage.amount : 0)
  const payable = !closed && (chosen.length > 0 || loose.length > 0)

  // The storage fee's line: what it reads on the right, and beneath.
  let storageRight = `${dollars(storage.amount)} per year`
  let storageNote = storage.next ? `Next payment ${storage.next}` : null
  if (storage.state === 'current') storageRight = 'Current'
  if (storage.state === 'owed') storageNote = COPY.storageOwed
  if (joins) {
    storageRight = dollars(storage.amount)
    storageNote = COPY.storageJoins
  } else if (storage.state === 'joins' && storage.trial) {
    storageRight = 'Free trial'
  }

  return (
    <details id="cart" open={open} data-plans={groups.length}
      className="w-full sm:w-80 shrink-0 bg-gray-900 rounded-2xl border border-gray-800">
      <summary className={`flex items-center justify-between gap-3 px-5 py-4 cursor-pointer rounded-2xl ${FOCUS}`}>
        <span className="font-mono text-xs uppercase tracking-widest text-gray-400">Cart</span>
        <span id="cart-summary" className="text-sm font-semibold tabular-nums">
          {groups.length} {groups.length === 1 ? 'plan' : 'plans'} · {dollars(total)}
        </span>
      </summary>

      <form id="cart-form" action={action} className="px-5 pb-5">
        <input type="hidden" name="total" value={total} />

        {groups.length === 0 && loose.length === 0 && (
          <p id="cart-empty" className="text-sm text-gray-400 border-t border-gray-800 pt-4">{COPY.empty}</p>
        )}

        {groups.length > 0 && (
          <ul id="cart-plans" className="border-t border-gray-800">
            {groups.map((g) => {
              const [plan, ...rest] = g.lines
              return (
                <li key={g.planId} data-cart-plan={g.planId} data-plan-year={g.planYear} className="border-b border-gray-800 py-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" name="plan" value={g.planId} disabled={closed}
                      checked={!off.has(g.planId)} onChange={() => toggle(g.planId)} className={TICK} />
                    <span className="flex-1 min-w-0">
                      <Line line={plan} lead />
                      {rest.map((line) => <Line key={`${line.kind}-${line.planYear}`} line={line} />)}
                      {held.has(g.planId) && (
                        <span data-in-checkout className="inline-block mt-1 rounded-full border border-gray-600 px-2 py-0.5 text-xs text-gray-300">
                          In checkout
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        {loose.length > 0 && (
          <div id="cart-loose" className="border-b border-gray-800 py-3">
            {loose.map((line) => <Line key={line.planYear} line={line} />)}
            <p className={note}>{COPY.loose}</p>
          </div>
        )}

        <div id="cart-storage" data-state={storage.state} data-added={joins ? 'true' : 'false'} className="border-b border-gray-800 py-3">
          <p className="flex justify-between gap-3 text-sm">
            <span className="text-gray-300">Storage fee</span>
            <span className="shrink-0 tabular-nums text-gray-300">{storageRight}</span>
          </p>
          {storageNote && <p id="cart-next-payment" className={note}>{storageNote}</p>}
        </div>

        <p className="flex justify-between gap-3 py-3 font-semibold">
          <span>Total</span>
          <span id="cart-total" data-total={total} className="tabular-nums">{dollars(total)}</span>
        </p>

        {closed && <p className={note}>{COPY.closed}</p>}

        {payable && (
          <>
            <p id="refund-policy" className="text-xs text-gray-400 leading-relaxed">{COPY.policy}</p>
            <label className="flex items-start gap-3 mt-3 mb-4 text-sm text-gray-300 cursor-pointer">
              <input id="cart-accept" type="checkbox" name="accept" required className={TICK} />
              <span>I accept the refund policy</span>
            </label>
            <Submit>Pay {dollars(total)}</Submit>
          </>
        )}
        {state.error && <p id="cart-error" role="alert" className="text-sm text-red-400 mt-3">{state.error}</p>}
      </form>
    </details>
  )
}
