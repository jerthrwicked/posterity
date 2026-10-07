// Posterity — is storage current? · Walker Brown
//
// The one question every build gate asks. Master Specification, Horizon Tier:
// the three-month trial "grants content building"; "when the trial ends, content
// creation locks. The account itself remains accessible." Storage Lapse Grace
// Period: the customer "cannot build or edit until storage is current."
//
// The database answers the same question in public.storage_is_current() and
// enforces it with restrictive row-level security policies. This mirror exists
// so a page can say why a form is closed before the customer fills it in — the
// database is the wall, this is the sign on the door.

export function storageIsCurrent(account, now = new Date()) {
  if (!account) return false
  if (account.trial_ends_at && new Date(account.trial_ends_at) > now) return true
  if (account.storage_paid_through) {
    // A calendar date. It holds until that date has ended everywhere on earth
    // (midnight in UTC-12, which is noon UTC the next day) — the same rule as
    // public.storage_is_current, so the page and the database never disagree.
    const [y, m, d] = account.storage_paid_through.split('-').map(Number)
    const covered = new Date(Date.UTC(y, m - 1, d + 1, 12))
    if (covered > now) return true
  }
  return false
}

// Customer-facing. No clinical language, and "storage" is the product's own
// word for the fee (Master Spec: "$9.99/year is a holding fee not a service fee").
export const STORAGE_LAPSED_MESSAGE =
  'Your storage is not current, so building is paused. Everything you have made is safe and still here. Renew storage to keep building.'

// The line a page shows while the trial is running and nothing is paid yet.
export function trialDaysLeft(account, now = new Date()) {
  if (!account?.trial_ends_at) return null
  const ms = new Date(account.trial_ends_at) - now
  return ms > 0 ? Math.ceil(ms / 86400000) : 0
}
