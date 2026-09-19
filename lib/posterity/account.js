// Posterity — the signed-in customer's account and legacy · Walker Brown
import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'
import { storageIsCurrent } from './storage'

// Every private page and every server action starts here.
//
// Returns the Supabase client, the auth user, the account, the primary legacy,
// and canBuild — whether storage is current (trial running or a storage year
// paid through today). Pages read canBuild to explain a closed form; the
// database enforces it regardless (public.storage_is_current, restrictive RLS).
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
    .select('id, phase, next_checkin_due, trial_ends_at, storage_paid_through')
    .eq('user_id', user.id)
    .single()

  const { data: legacy } = await supabase
    .from('legacies')
    .select('id, title')
    .eq('account_id', account?.id)
    .eq('is_primary', true)
    .single()

  return { supabase, user, account, legacy, canBuild: storageIsCurrent(account) }
}
