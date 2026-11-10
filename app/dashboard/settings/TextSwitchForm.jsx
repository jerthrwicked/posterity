'use client'

// Posterity — the text message switch · Walker Brown
import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { textSwitchAction } from './text-switch'

const label = 'text-sm text-gray-400 mb-1 block'
const note = 'text-xs text-gray-600 mt-3 leading-relaxed'
// How often the page looks for the customer's text while a code is showing.
const LOOK_EVERY_MS = 5000

function Switch({ on, disabled }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" role="switch" aria-checked={on} aria-labelledby="text_switch_label"
      disabled={disabled || pending}
      className={`relative shrink-0 w-12 h-7 rounded-full border transition disabled:opacity-50 ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${on ? 'bg-white border-white' : 'bg-black border-gray-700 hover:border-white'}`}>
      <span className={`absolute top-1 left-1 w-[18px] h-[18px] rounded-full transition-transform ${
        on ? 'translate-x-5 bg-black' : 'bg-gray-500'
      }`} />
    </button>
  )
}

function Cancel() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}
      className="text-sm text-gray-500 hover:text-white underline underline-offset-4 disabled:opacity-50">
      Cancel
    </button>
  )
}

// on: whether the switch reads on, from the agreement record. phone: the number
// on file as the customer reads it, or ''. disclosure: the text the agreement
// is given against, which the action records exactly as shown here. sending:
// whether Posterity is sending texts yet (channel policy's TEXTING_OPEN).
// waiting: { code } while the switch waits for the customer to text that code
// from the number, else null. textTo: Posterity's number, { e164, display }.
// minutes: how long a code waits.
// Email has no switch: it is always sent.
export function TextSwitchForm({ on, phone, disclosure, sending, waiting = null, textTo, minutes }) {
  const [state, action] = useActionState(textSwitchAction, {})
  const router = useRouter()
  const code = waiting?.code ?? null

  // The agreement is recorded when the text arrives, which this page hears
  // nothing of, so while a code shows it reads the switch again every few
  // seconds, and at once when the customer comes back from sending the text.
  useEffect(() => {
    if (!code) return undefined
    const look = () => { if (document.visibilityState === 'visible') router.refresh() }
    const timer = setInterval(look, LOOK_EVERY_MS)
    document.addEventListener('visibilitychange', look)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', look)
    }
  }, [code, router])

  return (
    <form action={action} className="bg-gray-900 rounded-2xl p-8 border border-gray-800 mt-6">
      <input type="hidden" name="turn" value={code ? 'cancel' : on ? 'off' : 'on'} />
      <div className="flex items-center justify-between gap-6">
        <div>
          <p id="text_switch_label" className={label}>Text messages</p>
          {phone ? (
            <p className="text-gray-300">{on ? 'On' : 'Off'} <span className="text-gray-600">· {phone}</span></p>
          ) : (
            <p className="text-gray-600">Off</p>
          )}
        </div>
        {/* While a code shows the switch holds still, and the form's one button is Cancel. */}
        <Switch on={on} disabled={!phone || !!code} />
      </div>

      <p id="text_disclosure" className="text-sm text-gray-400 mt-4 leading-relaxed">{disclosure}</p>

      {code && (
        <div id="text_waiting" className="mt-6 rounded-xl border border-gray-700 p-6">
          <p className="text-sm text-gray-300 leading-relaxed">
            [Placeholder: Product surface copy — Settings: to turn texts on, text this code from {phone} to{' '}
            {textTo.display}; texts turn on when it arrives, and the code lasts {minutes} minutes]
          </p>
          <p id="text_code" className="text-3xl font-bold tracking-[0.3em] mt-4">{code}</p>
          <div className="flex flex-wrap items-center gap-6 mt-4">
            <a id="text_code_link" href={`sms:${textTo.e164}?&body=${code}`}
              className="text-sm text-white underline underline-offset-4">
              Text the code
            </a>
            <Cancel />
          </div>
        </div>
      )}

      {!phone && (
        <p className={note}>
          [Placeholder: Product surface copy — Settings: turning texts on needs a phone number in the account details
          above]
        </p>
      )}
      {phone && !on && !code && (
        <p className={note}>
          [Placeholder: Product surface copy — Settings: turning texts on is recommended, since check-ins then arrive by
          both email and text; email is always sent]
        </p>
      )}
      {!sending && (
        <p className="text-xs text-yellow-200 mt-3 leading-relaxed">
          [Placeholder: Product surface copy — Settings: Posterity is not sending texts yet; everything goes by email
          until it is]
        </p>
      )}
      {(state.done === 'on' || state.done === 'waiting') && on && sending && (
        <p className="text-xs text-green-300 mt-3">
          [Placeholder: Product surface copy — Settings: texts are on, and a confirmation text is on its way to {phone}]
        </p>
      )}
      {state.error && <p className="text-sm text-red-400 mt-3">{state.error}</p>}
    </form>
  )
}
