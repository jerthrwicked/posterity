// Posterity — the marks that lead a message
//
// WarningMark leads an error or a notice, and CheckMark leads a confirmation.
// Each is a 16px line drawing in currentColor, so it takes the colour of the
// words it sits before. Both are hidden from screen readers, since the words
// carry the meaning. A text-sm row passes className="mt-0.5", which centres
// the mark on the row's 20px line.
export function WarningMark({ className }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={className ? `flex-none ${className}` : 'flex-none'}>
      <path d="M8 1.6 15 14H1L8 1.6Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6v3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.6" r=".9" fill="currentColor" />
    </svg>
  )
}

export function CheckMark({ className }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={className ? `flex-none ${className}` : 'flex-none'}>
      <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 8.2 7.1 10.3 11 6.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
