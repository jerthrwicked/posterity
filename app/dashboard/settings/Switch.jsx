'use client'

// Posterity — a Settings switch · Walker Brown
import { useFormStatus } from 'react-dom'

// The switch a Settings form submits with. It sits inside the form it moves,
// whose hidden `turn` input says which way, and it holds still while the form
// is sending.
//
// id: the switch's own, since Settings holds more than one. labelledBy: the id
// of the text naming it. on: where it stands. disabled: held still.
export function Switch({ id, labelledBy, on, disabled = false }) {
  const { pending } = useFormStatus()
  return (
    <button id={id} type="submit" role="switch" aria-checked={on} aria-labelledby={labelledBy}
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
