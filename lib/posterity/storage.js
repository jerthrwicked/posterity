// Posterity — storage, in the customer's words · Walker Brown
//
// Whether building is open is the database's answer, not the page's:
// public.account_status() reads it, and the restrictive row-level security that
// locks building reads the same functions (20261026000000). requireAccount()
// asks it once per request. This file holds only the words a page shows.

// Customer-facing. No clinical language, and "storage" is the product's own
// word for the fee (Master Spec: "$9.99/year is a holding fee not a service fee").
export const STORAGE_LAPSED_MESSAGE =
  'Your storage is not current, so building is paused. Everything you have made is safe and still here. Renew storage to keep building.'

// The line a page shows while the trial is running and nothing is paid yet.
export function trialDaysLeft(status, now = new Date()) {
  if (!status?.trial_ends_at) return null
  const ms = new Date(status.trial_ends_at) - now
  return ms > 0 ? Math.ceil(ms / 86400000) : 0
}
