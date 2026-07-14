'use server'

// Posterity — trusted contact actions · Walker Brown
import { revalidatePath } from 'next/cache'
import { requireAccount } from '../../../lib/posterity/account'

export async function addTrustedContact(_prev, formData) {
  const { supabase, account } = await requireAccount()

  const name = (formData.get('name') || '').trim()
  const email = (formData.get('email') || '').trim()
  const phone = (formData.get('phone') || '').trim()
  const note = (formData.get('personal_note') || '').trim()

  if (!name) return { error: 'Please enter their name.' }
  if (!email && !phone) {
    return {
      error:
        'Please add an email or a phone number. This is the person we reach out to — we have to be able to.',
    }
  }

  // The first contact added becomes primary. Someone has to be, and asking a
  // customer to nominate one before they have two is a decision without a choice.
  const { count } = await supabase
    .from('trusted_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', account.id)

  const { error } = await supabase.from('trusted_contacts').insert({
    account_id: account.id,
    name,
    email: email || null,
    phone: phone || null,
    personal_note: note || null,
    is_primary: (count ?? 0) === 0,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/trusted-contacts')
  revalidatePath('/dashboard')
  return { ok: `${name} added.` }
}

// Plain form actions (no useActionState) — they take formData directly.

export async function makePrimary(formData) {
  const { supabase } = await requireAccount()
  // One statement, one transaction. See the migration: doing this as two
  // round-trips can leave a customer with no primary contact at all.
  await supabase.rpc('set_primary_trusted_contact', { p_contact_id: formData.get('id') })
  revalidatePath('/dashboard/trusted-contacts')
}

export async function deleteTrustedContact(formData) {
  const { supabase, account } = await requireAccount()
  const id = formData.get('id')

  const { data: contact } = await supabase
    .from('trusted_contacts')
    .select('is_primary')
    .eq('id', id)
    .eq('account_id', account.id)
    .single()

  await supabase.from('trusted_contacts').delete().eq('id', id).eq('account_id', account.id)

  // If the primary was removed, promote someone. An account with contacts but no
  // primary has nobody at the front of the escalation.
  if (contact?.is_primary) {
    const { data: next } = await supabase
      .from('trusted_contacts')
      .select('id')
      .eq('account_id', account.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (next) {
      await supabase.rpc('set_primary_trusted_contact', { p_contact_id: next.id })
    }
  }

  revalidatePath('/dashboard/trusted-contacts')
  revalidatePath('/dashboard')
}
