'use client'
// The tap pulse: a soft circle spreads from the point where a button is pressed and
// fades, Material Design's ripple. It plays on every button and every rounded link
// across the site, in the color of the button's own text, and never for anyone who
// has turned off motion. An element marked data-no-ripple, or inside one, is skipped.
import { useEffect } from 'react'

const TARGETS = 'button, a.rounded-full, [data-ripple]'

export default function TapRipple() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onDown = (e) => {
      if (reduce.matches || e.button > 0) return
      const el = e.target.closest(TARGETS)
      if (!el || el.disabled || el.closest('[data-no-ripple]')) return
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
      const rect = el.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height) * 2.2
      const clip = document.createElement('span')
      clip.className = 'tap-ripple'
      clip.setAttribute('aria-hidden', 'true')
      const dot = document.createElement('span')
      dot.className = 'tap-ripple__dot'
      dot.style.width = `${size}px`
      dot.style.height = `${size}px`
      dot.style.left = `${e.clientX - rect.left - size / 2}px`
      dot.style.top = `${e.clientY - rect.top - size / 2}px`
      clip.appendChild(dot)
      el.appendChild(clip)
      dot.addEventListener('animationend', () => clip.remove(), { once: true })
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])
  return null
}
