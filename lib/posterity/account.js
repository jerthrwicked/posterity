// Posterity — the signed-in customer's account and legacy · Walker Brown
import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'

// Every private page and every server action starts here.
//
// Returns the Supabase client, the auth user, the account, and the primary
// legacy. The account and the legacy are both created by a database trigger at
// signup, so by the time anyone is signed in, both exist — nothing here has to
// create them lazily, and no write path has to remember to check.
export async function requireAccount() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: account } = await supabase
    .from('accounts')
    .select('id, phase, next_checkin_due')
    .eq('user_id', user.id)
    .single()

  const { data: legacy } = await supabase
    .from('legacies')
    .select('id, title')
    .eq('account_id', account?.id)
    .eq('is_primary', true)
    .single()

  return { supabase, user, account, legacy }
}
