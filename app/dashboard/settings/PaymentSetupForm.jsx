'use client'

// Posterity — payment setup · Walker Brown
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { paymentSetupAction } from './payment-setup'

const label = 'text-sm text-gray-400 mb-1 block'
const note = 'text-xs text-gray-600 mt-3 leading-relaxed'
const link = 'text-sm text-gray-300 underline hover:text-white cursor-pointer disabled:opacity-50'

// Card brands as Stripe names them, as they are written.
const BRANDS = {
  visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', discover: 'Discover',
  diners: 'Diners Club', jcb: 'JCB', unionpay: 'UnionPay',
}

function Open({ children }) {
  const { pending } = useFormStatus()
  return (
    <button id="payment_setup_open" type="submit" disabled={pending} className={link}>
      {pending ? 'Opening...' : children}
    </button>
  )
}

// held: whether the account holds a storage subscription, whose saved payment
// method this is. method: that method as lib/posterity/payment-setup.js gives
// it, or null where none is saved. unread: it could not be read, so nothing is
// shown rather than something that might be wrong. notice: how the payment
// form came back, from the page's address: 'saved', 'saved_paid' (and the
// storage fee owed was charged to it), 'saved_unpaid' (but the storage fee
// owed could not be charged) or 'not_saved'.
//
// With no storage subscription yet there is no payment method to change: the
// first storage payment saves one.
export function PaymentSetupForm({ held, method, unread = false, notice }) {
  const [state, action] = useActionState(paymentSetupAction, {})
  const card = method?.type === 'card'

  return (
    <form id="payment_setup" action={action} className="bg-gray-900 rounded-2xl p-8 border border-gray-800 mt-6">
      <p id="payment_setup_label" className={label}>Payment setup</p>

      {unread && (
        <p className="text-xs text-yellow-200 mt-3 leading-relaxed">
          [Placeholder: Product surface copy — error messages: the saved payment method cannot be shown right now]
        </p>
      )}
      {!unread && !held && (
        <p className={note}>
          [Placeholder: Product surface copy — Settings: a payment method is saved with the first storage payment and
          can be changed here afterwards]
        </p>
      )}
      {!unread && held && card && (
        <>
          <p id="payment_setup_method" className="text-gray-300">
            {BRANDS[method.brand] ?? 'Card'} &bull;&bull;&bull;&bull; {method.last4}
          </p>
          <p id="payment_setup_expiry" className="text-xs text-gray-500 mt-1">
            Expires {String(method.expMonth).padStart(2, '0')}/{method.expYear}
          </p>
        </>
      )}
      {!unread && held && method && !card && (
        <p id="payment_setup_method" className="text-gray-300">
          [Placeholder: Product surface copy — Settings: a payment method that is not a card is saved]
        </p>
      )}
      {!unread && held && !method && (
        <p id="payment_setup_method" className="text-gray-600">
          [Placeholder: Product surface copy — Settings: no payment method is saved]
        </p>
      )}

      {notice === 'saved' && held && method && (
        <p id="payment_setup_notice" className="text-xs text-green-300 mt-3">
          [Placeholder: Product surface copy — Settings: the payment method is saved]
        </p>
      )}
      {notice === 'saved_paid' && held && method && (
        <p id="payment_setup_notice" className="text-xs text-green-300 mt-3">
          [Placeholder: Product surface copy — Settings: the payment method is saved, and the storage fee owed was
          charged to it]
        </p>
      )}
      {notice === 'saved_unpaid' && held && method && (
        <p id="payment_setup_notice" className="text-xs text-yellow-200 mt-3">
          [Placeholder: Product surface copy — Settings: the payment method is saved, but the storage fee owed could
          not be charged to it and is still owed]
        </p>
      )}
      {notice === 'not_saved' && (
        <p id="payment_setup_notice" className="text-xs text-red-400 mt-3">
          [Placeholder: Product surface copy — Settings: the payment method was not saved; the one held before is
          unchanged]
        </p>
      )}

      {!unread && held && (
        <>
          <p className={note}>
            [Placeholder: Product surface copy — Settings: the saved payment method is the one each storage renewal is
            charged to; changing it opens the payment form and replaces the one held]
          </p>
          <div className="mt-4">
            <Open>{method ? 'Change payment method' : 'Add a payment method'}</Open>
          </div>
        </>
      )}
      {state?.error && <p className="text-sm text-red-400 mt-3">{state.error}</p>}
    </form>
  )
}
