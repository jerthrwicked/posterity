'use client'

// Posterity — write a message · Walker Brown
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { addMessage } from './actions'

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
      {pending ? 'Saving...' : 'Save to my legacy'}
    </button>
  )
}

export function MessageForm({ recipients }) {
  const [state, action] = useActionState(addMessage, {})

  if (!recipients.length) {
    return (
      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
        <p className="text-gray-400 mb-6">
          Add someone first. A message has to be <em>for</em> someone.
        </p>
        <a
          href="/dashboard/recipients"
          className="inline-block bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition"
        >
          Add a recipient
        </a>
      </div>
    )
  }

  return (
    <form action={action} className="bg-gray-900 rounded-2xl p-8 border border-gray-800 flex flex-col gap-4">
      <div>
        <label htmlFor="body" className={label}>Your message</label>
        <textarea
          id="body"
          name="body"
          rows={7}
          className={input + ' resize-y leading-relaxed'}
          placeholder="Say the thing you'd want them to hear."
        />
      </div>

      <div>
        <label htmlFor="title" className={label}>
          Title <span className="text-gray-600">(optional — just for you, to find it later)</span>
        </label>
        <input id="title" name="title" className={input} placeholder="Her 30th birthday" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="recipient_id" className={label}>For</label>
          <select id="recipient_id" name="recipient_id" defaultValue="" className={input}>
            <option value="" disabled>Choose someone</option>
            {recipients.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="deliver_on" className={label}>Arrives on</label>
          <input id="deliver_on" name="deliver_on" type="date" className={input} />
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm text-gray-400 cursor-pointer mt-1">
        <input
          type="checkbox"
          name="include_in_posterity"
          defaultChecked
          className="mt-1 accent-white cursor-pointer"
        />
        <span>
          Keep this in my Posterity — the permanent archive your trusted contact can hold onto after
          everything has been delivered.
        </span>
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-400">{state.ok}</p>}

      <Submit />
    </form>
  )
}
