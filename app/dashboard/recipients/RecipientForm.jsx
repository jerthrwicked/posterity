'use client'

// Posterity — add-a-recipient form · Walker Brown
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { addRecipient } from './actions'
import { CheckMark, WarningMark } from '../../components/StatusMarks'

const input =
  'w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-[color:var(--text-quiet)] focus:outline-none focus:border-white transition'
const label = 'text-sm text-gray-400 mb-1 block'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-white text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition disabled:opacity-50 cursor-pointer"
    >
      {pending ? 'Adding...' : 'Add recipient'}
    </button>
  )
}

export function RecipientForm() {
  const [state, action] = useActionState(addRecipient, {})

  return (
    <form action={action} className="bg-[color:var(--card-ground)] posterity-frame rounded-2xl p-8 border border-[color:var(--card-edge)] flex flex-col gap-4">
      <div>
        <label htmlFor="name" className={label}>Name</label>
        <input id="name" name="name" className={input} placeholder="Who is this for?" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className={label}>Email</label>
          <input id="email" name="email" type="email" required className={input} placeholder="them@example.com" />
        </div>
        <div>
          <label htmlFor="phone" className={label}>Phone <span className="text-[color:var(--text-quiet)]">(optional)</span></label>
          <input id="phone" name="phone" type="tel" className={input} autoComplete="tel" placeholder="(504) 555-1234" />
        </div>
      </div>

      <p className="text-xs text-[color:var(--text-quiet)] leading-relaxed -mt-1">
        [Placeholder: Product surface copy — why a recipient needs an email address]
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="platform" className={label}>Social platform <span className="text-[color:var(--text-quiet)]">(optional)</span></label>
          <select id="platform" name="platform" defaultValue="" className={input}>
            <option value="">None</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
          </select>
        </div>
        <div>
          <label htmlFor="platform_handle" className={label}>Their handle <span className="text-[color:var(--text-quiet)]">(optional)</span></label>
          <input id="platform_handle" name="platform_handle" className={input} placeholder="@them" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-[color:var(--brand-rose)] inline-flex items-start gap-2"><WarningMark className="mt-0.5" />{state.error}</p>}
      {state?.ok && <p className="text-sm text-[#93ab99] inline-flex items-start gap-2"><CheckMark className="mt-0.5" />{state.ok}</p>}

      <Submit />
    </form>
  )
}
