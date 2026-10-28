'use client'

// Posterity — account details form · Walker Brown
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { saveAccountDetails } from './actions'

const input =
  'w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition'
const label = 'text-sm text-gray-400 mb-1 block'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-white text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition disabled:opacity-50 cursor-pointer"
    >
      {pending ? 'Saving...' : 'Save'}
    </button>
  )
}

// A form action resets the fields to their defaults once it returns, so a
// refused save hands back what the customer typed, and a saved one reads the
// account afresh.
export function AccountDetailsForm({ legalName, name, email, phone }) {
  const [state, action] = useActionState(saveAccountDetails, {})
  const v = state?.values

  return (
    <form action={action} className="bg-gray-900 rounded-2xl p-8 border border-gray-800 flex flex-col gap-4">
      <div>
        <label htmlFor="legal_name" className={label}>Legal name</label>
        <input id="legal_name" name="legal_name" autoComplete="name" className={input}
          defaultValue={v ? v.legal_name : legalName} placeholder="Your full legal name" />
      </div>

      <div>
        <label htmlFor="name" className={label}>
          Name your recipients see <span className="text-gray-600">· optional</span>
        </label>
        <input id="name" name="name" autoComplete="nickname" className={input}
          defaultValue={v ? v.name : name} placeholder="Same as your legal name" />
      </div>

      <div>
        <p className={label}>Email</p>
        <p className="px-4 py-3 rounded-lg border border-gray-800 text-gray-300">{email}</p>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
          You sign in with this address, and every message from Posterity goes to it.
        </p>
      </div>

      <div>
        <label htmlFor="phone" className={label}>
          Phone number <span className="text-gray-600">· optional, recommended</span>
        </label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" className={input}
          defaultValue={v ? v.phone : phone} placeholder="(504) 555-1234" />
      </div>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-400">{state.ok}</p>}

      <Submit />
    </form>
  )
}
