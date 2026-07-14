'use client'

// Posterity — add-a-trusted-contact form · Walker Brown
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { addTrustedContact } from './actions'

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
      {pending ? 'Adding...' : 'Add trusted contact'}
    </button>
  )
}

export function TrustedContactForm() {
  const [state, action] = useActionState(addTrustedContact, {})

  return (
    <form action={action} className="bg-gray-900 rounded-2xl p-8 border border-gray-800 flex flex-col gap-4">
      <div>
        <label htmlFor="name" className={label}>Name</label>
        <input id="name" name="name" className={input} placeholder="Someone you'd trust with this" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className={label}>Email</label>
          <input id="email" name="email" type="email" className={input} placeholder="them@example.com" />
        </div>
        <div>
          <label htmlFor="phone" className={label}>Phone</label>
          <input id="phone" name="phone" type="tel" className={input} placeholder="(555) 555-5555" />
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed -mt-1">
        One of these is required. This is the person we reach out to — we have to be able to.
      </p>

      <div>
        <label htmlFor="personal_note" className={label}>
          A note for them <span className="text-gray-600">(optional)</span>
        </label>
        <textarea
          id="personal_note"
          name="personal_note"
          rows={4}
          className={input + ' resize-y leading-relaxed'}
          placeholder="What you'd want them to know, and anything you'd want them to do."
        />
        <p className="text-xs text-gray-500 leading-relaxed mt-2">
          They will only ever see this at the moment they&rsquo;re asked to confirm — never before.
        </p>
      </div>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-400">{state.ok}</p>}

      <Submit />
    </form>
  )
}
