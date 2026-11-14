'use client'
// Posterity — the phase glow: the six phase colours, from jade at the top down to gold
// (Posterity design system). The account home breathes; the other pages, apart from the homepage, wash it in, then hold it;
// the homepage's Six Phases band washes it in the first time the band scrolls into view, then breathes.
// Anyone who has turned off motion sees it still everywhere (app/globals.css).
import { useEffect, useRef, useState } from 'react'

export function AccountGlow({ breathing = false }) {
  return (
    <div aria-hidden="true" className="posterity-glow-wrap">
      <div className={breathing ? 'posterity-glow posterity-glow--breathe' : 'posterity-glow posterity-glow--settle'} />
    </div>
  )
}

export function BandPulse() {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const band = ref.current?.parentElement
    if (!band) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!('IntersectionObserver' in window)) { setOn(true); return }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setOn(true); io.disconnect() }
    }, { threshold: 0.35 })
    io.observe(band)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} aria-hidden="true" className={on ? 'posterity-pulse posterity-glow--breathe' : 'posterity-pulse posterity-pulse--waiting'} />
}
