'use client'
// Posterity — the phase glow: the six phase colours, from jade at the top down to gold
// (Posterity design system). Every page with the glow washes it in, then breathes for as long as the page is open;
// the homepage's Six Phases band washes it in once the band is in view, then breathes.
// Anyone who has turned off motion sees it still everywhere (app/globals.css).
import { useEffect, useRef, useState } from 'react'

export function AccountGlow() {
  return (
    <div aria-hidden="true" className="posterity-glow-wrap">
      <div className="posterity-glow posterity-glow--breathe" />
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
    }, { threshold: 0, rootMargin: '0px 0px -33% 0px' })
    io.observe(band)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} aria-hidden="true" className={on ? 'posterity-pulse posterity-glow--breathe' : 'posterity-pulse posterity-pulse--waiting'} />
}
