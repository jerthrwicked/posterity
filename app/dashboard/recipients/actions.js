'use server'

// Posterity — recipient actions · Walker Brown
import { revalidatePath } from 'next/cache'
import { requireAccount } from '../../../lib/posterity/account'
import { STORAGE_LAPSED_MESSAGE } from '../../../lib/posterity/storage'
import { toE164 } from '../../../lib/posterity/phone'

export async function addRecipient(_prev, formData) {
  const { supabase, account, canBuild } = await requireAccount()

  // Building is paused while storage is not current (Master Spec, Horizon Tier
  // and Storage Lapse Grace Period). The database refuses the write anyway;
  // this says why in the customer's own words instead of an RLS error.
  if (!canBuild) return { error: STORAGE_LAPSED_MESSAGE }

  const name = (formData.get('name') || '').trim()
  const email = (formData.get('email') || '').trim()
  const phoneEntered = (formData.get('phone') || '').trim()
  const platform = (formData.get('platform') || '').trim()
  const handle = (formData.get('platform_handle') || '').trim()

  if (!name) return { error: 'Please enter their name.' }

  // A Saved Recipient holds an email address and an optional phone number
  // (Master Spec). The database enforces it too
  // (20261030020000_contact_email_required); it is checked here so the customer
  // reads a sentence rather than a constraint. No approved text exists yet.
  if (!email) {
    return { error: '[Placeholder: Product surface copy — error messages: a recipient without an email address]' }
  }

  // Held as E.164, the form the Communication Dispatch System sends to; it
  // refuses anything else (20261031020000_contact_phone_e164).
  const phone = phoneEntered ? toE164(phoneEntered) : null
  if (phoneEntered && !phone) {
    return { error: '[Placeholder: Product surface copy — error messages: the phone number cannot be read]' }
  }

  const { error } = await supabase.from('recipients').insert({
    account_id: account.id,
    name,
    email: email || null,
    phone,
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
