'use server'

// Posterity — recipient actions · Walker Brown
import { revalidatePath } from 'next/cache'
import { requireAccount } from '../../../lib/posterity/account'

export async function addRecipient(_prev, formData) {
  const { supabase, account } = await requireAccount()

  const name = (formData.get('name') || '').trim()
  const email = (formData.get('email') || '').trim()
  const phone = (formData.get('phone') || '').trim()
  const platform = (formData.get('platform') || '').trim()
  const handle = (formData.get('platform_handle') || '').trim()

  if (!name) return { error: 'Please enter their name.' }

  // The database enforces this too. It is checked here as well so the customer
  // gets a sentence instead of a constraint violation — and so the reason is
  // stated at the moment it matters.
  if (!email && !phone) {
    return {
      error:
        'Please add an email or a phone number. A social account can be lost — we need a way to reach them that always works.',
    }
  }

  const { error } = await supabase.from('recipients').insert({
    account_id: account.id,
    name,
    email: email || null,
    phone: phone || null,
    platform: platform || null,
    platform_handle: handle || null,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/recipients')
  return { ok: `${name} added.` }
}

// Plain form action (no useActionState), so it takes formData directly.
export async function deleteRecipient(formData) {
  const { supabase, account } = await requireAccount()
  const id = formData.get('id')

  // account_id is redundant under RLS — kept as a second lock, because deleting
  // the wrong person's recipient is not a bug you get to apologise for.
  const { error } = await supabase
    .from('recipients')
    .delete()
    .eq('id', id)
    .eq('account_id', account.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/recipients')
  return { ok: 'Removed.' }
}
