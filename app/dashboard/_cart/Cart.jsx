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
//
// The cart sits in the top bar, just left of the menu, on every page behind
// sign-in. Each of those pages renders it through NavCart.js, and it is
// carried up into the bar's place for it (GlobalNav.js). It shows as a cart
// symbol with the number of plans it holds; pressing the symbol opens the
// whole cart in a panel below it.
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal, useFormStatus } from 'react-dom'
import { dollars } from '../../../lib/posterity/cart'
import { payAction } from './actions'
import { WarningMark } from '../../components/StatusMarks'

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
const note = 'text-xs text-[color:var(--text-quiet)] mt-1 leading-relaxed'
const PILL = `w-full rounded-full border border-gray-600 px-5 py-3 text-sm font-semibold text-white hover:bg-white hover:text-black hover:border-white transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS}`
const TICK = `mt-1 w-4 h-4 shrink-0 accent-[#93ab99] ${FOCUS}`
const BUTTON = `relative inline-flex items-center justify-center w-10 h-10 rounded-full border border-transparent hover:border-[#404040] text-white cursor-pointer list-none [&::-webkit-details-marker]:hidden ${FOCUS}`
// text-white: within the top bar the panel no longer sits inside a page's
// white main, and the body's own colour is dark in a light colour scheme.
const PANEL = 'absolute right-0 top-full mt-2 w-[360px] max-h-[calc(100vh-7rem)] overflow-y-auto z-50 bg-[color:var(--card-ground)] border border-[color:var(--card-edge)] rounded-2xl shadow-[0_18px_48px_rgba(0,0,0,0.6)] px-5 pt-4 pb-5 text-white ' +
  'max-sm:fixed max-sm:left-2.5 max-sm:right-2.5 max-sm:top-[6rem] max-sm:w-auto'

// The top bar's place for the cart (GlobalNav.js). It is found on the client
// only: the server render and the first client render hold no cart, so the
// two match.
const never = () => () => {}
const findSlot = () => document.getElementById('nav-cart-slot')
const noSlot = () => null

function Submit({ children, disabled }) {
  const { pending } = useFormStatus()
  return (
    <button id="cart-pay" type="submit" disabled={pending || disabled} className={PILL}>
      {children}
    </button>
  )
}

const amountOf = (line) => line.quantity * line.unitAmount
const plansText = (n) => `${n} ${n === 1 ? 'plan' : 'plans'}`

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
// The cart starts closed on every page.
export function Cart({ groups, loose, storage, inCheckout, closed }) {
  const [state, action] = useActionState(payAction, {})
  // The plans unticked. A plan added later arrives ticked.
  const [off, setOff] = useState(() => new Set())
  const toggle = (id) => setOff((was) => {
    const next = new Set(was)
    if (!next.delete(id)) next.add(id)
    return next
  })
  const slot = useSyncExternalStore(never, findSlot, noSlot)

  // The panel closes on a click or tap outside the cart and on the Escape
  // key; the symbol opens and closes it as any summary does. Escape hands
  // focus back to the symbol when it was within the panel.
  const cartRef = useRef(null)
  useEffect(() => {
    function close(e) {
      const cart = cartRef.current
      if (!cart?.open) return
      if (e.type === 'keydown') {
        if (e.key !== 'Escape') return
        const within = cart.contains(document.activeElement)
        cart.open = false
        if (within) cart.querySelector('summary')?.focus()
      } else if (!cart.contains(e.target)) {
        cart.open = false
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
      document.removeEventListener('keydown', close)
    }
  }, [])

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

  if (!slot) return null

  return createPortal(
    <details id="cart" ref={cartRef} data-plans={groups.length} className="relative">
      <summary className={BUTTON}>
        <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M2 3.5h2.6l2.3 10.6a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2L21 6.5H5.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9.4" cy="19.4" r="1.35" fill="currentColor"/><circle cx="16.6" cy="19.4" r="1.35" fill="currentColor"/></svg>
        {groups.length > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -right-1 min-w-[19px] h-[19px] px-[5px] rounded-full bg-[#93ab99] text-black text-[11px] font-bold leading-[19px] text-center tabular-nums">{groups.length}</span>
        )}
        <span className="sr-only">Cart, </span>
        <span id="cart-summary" className="sr-only">
          {groups.length} {groups.length === 1 ? 'plan' : 'plans'} · {dollars(total)}
        </span>
      </summary>

      <form id="cart-form" action={action} className={PANEL}>
        <p className="flex items-center justify-between gap-3 pb-3 border-b border-[color:var(--card-edge)]">
          <span className="font-semibold">Cart</span>
          <span className="text-sm text-gray-400">{plansText(groups.length)}</span>
        </p>
        <input type="hidden" name="total" value={total} />

        {groups.length === 0 && loose.length === 0 && (
          <p id="cart-empty" className="text-sm text-gray-400 pt-4">{COPY.empty}</p>
        )}

        {groups.length > 0 && (
          <ul id="cart-plans">
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
        {state.error && <p id="cart-error" role="alert" className="text-sm text-[color:var(--brand-rose)] mt-3 inline-flex items-start gap-2"><WarningMark className="mt-0.5" />{state.error}</p>}
      </form>
    </details>,
    slot,
  )
}
