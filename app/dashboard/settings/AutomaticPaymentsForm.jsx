'use client'

// Posterity — the automatic payments switch · Walker Brown
import { useActionState } from 'react'
import { automaticPaymentsAction } from './automatic-payments'
import { Switch } from './Switch'

const label = 'text-sm text-gray-400 mb-1 block'
const note = 'text-xs text-gray-600 mt-3 leading-relaxed'

// held: whether the account holds a storage subscription, which is what the
// switch moves. on: whether its renewals are charged automatically, as Stripe
// holds it. unread: the setting could not be read, so no switch is shown
// rather than one that might be wrong.
//
// With no storage subscription yet the switch reads on, the default every
// storage subscription opens with, and holds still.
export function AutomaticPaymentsForm({ held, on, unread = false }) {
  const [state, action] = useActionState(automaticPaymentsAction, {})
  const shown = held ? on : true

  return (
    <form id="automatic_payments" action={action} className="bg-gray-900 rounded-2xl p-8 border border-gray-800 mt-6">
      <input type="hidden" name="turn" value={shown ? 'off' : 'on'} />
      <div className="flex items-center justify-between gap-6">
        <div>
          <p id="automatic_payments_label" className={label}>Automatic payments</p>
          {!unread && (
            <p id="automatic_payments_state" className={held ? 'text-gray-300' : 'text-gray-600'}>
              {shown ? 'On' : 'Off'}
            </p>
          )}
        </div>
        {!unread && (
          <Switch id="automatic_payments_switch" labelledBy="automatic_payments_label" on={shown} disabled={!held} />
        )}
      </div>

      {unread && (
        <p className="text-xs text-yellow-200 mt-3 leading-relaxed">
          [Placeholder: Product surface copy — error messages: the automatic payments setting cannot be shown right now]
        </p>
      )}
      {!unread && !held && (
        <p className={note}>
          [Placeholder: Product surface copy — Settings: automatic payments are on by default and begin with the first
          storage payment; they can be turned off here once storage is paid for]
        </p>
      )}
      {!unread && held && on && (
        <p className={note}>
          [Placeholder: Product surface copy — Settings: the storage fee is charged to the saved payment method each
          year]
        </p>
      )}
      {!unread && held && !on && (
        <p className={note}>
          [Placeholder: Product surface copy — Settings: with automatic payments off, a reminder is sent thirty days
          before each renewal is due and a payment request on the due date]
        </p>
      )}
      {state.error && <p className="text-sm text-red-400 mt-3">{state.error}</p>}
    </form>
  )
}
