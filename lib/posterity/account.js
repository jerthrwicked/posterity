// Posterity — the signed-in customer's account and legacy · Walker Brown
import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'

// One reading of the account, from public.account_status(): its phase, storage
// standing (trial, current, lapsed, or ended), storage product, whether
// building is open and when it locks, the state of Posterity Social, and
// whether Legacy Guard setup is open. The row-level security that locks
// building and the trigger that locks Legacy Guard setup read the same
// functions, so a page that shows a form open is a page the database will let
// write. Null when the account cannot be read.
export async function accountStatus(supabase, accountId) {
  if (!accountId) return null
  const { data } = await supabase
    .rpc('account_status', { p_account_id: accountId })
    .maybeSingle()
  return data ?? null
}

// Every private page and every server action starts here.
//
// Returns the Supabase client, the auth user, the account, the primary legacy,
// the account's status, and canBuild — whether building is open. Pages read
// canBuild to explain a closed form; the database enforces it regardless. An
// account whose status cannot be read counts as closed.
//
// The account and the legacy are both created by a database trigger at signup,
// so by the time anyone is signed in, both exist — nothing here has to create
// them lazily, and no write path has to remember to check.
export async function requireAccount() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: account } = await supabase
    .from('accounts')
    .select('id, phase, next_checkin_due')
    .eq('user_id', user.id)
    .single()

  const [{ data: legacy }, status] = await Promise.all([
    supabase
      .from('legacies')
      .select('id, title')
      .eq('account_id', account?.id)
      .eq('is_primary', true)
      .single(),
    accountStatus(supabase, account?.id),
  ])

  return { supabase, user, account, legacy, status, canBuild: status?.building_open === true }
}
