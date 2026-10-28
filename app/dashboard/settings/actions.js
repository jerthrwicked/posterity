'use server'

// Posterity — account details actions · Walker Brown
import { revalidatePath } from 'next/cache'
import { requireAccount } from '../../../lib/posterity/account'
import { toE164 } from '../../../lib/posterity/phone'

// Saves the name, legal name, and phone number under own_account. The database
// holds the rules (20261028010000_account_details): the legal name is required,
// a name left blank becomes the legal name, and a changed number starts over
// unconfirmed. They are checked here too so the customer reads a sentence
// rather than a constraint.
//
// Account details stay editable whatever the account's storage standing, so
// this does not read canBuild.
export async function saveAccountDetails(_prev, formData) {
  const { supabase, account } = await requireAccount()

  const values = {
    legal_name: (formData.get('legal_name') || '').trim(),
    name: (formData.get('name') || '').trim(),
    phone: (formData.get('phone') || '').trim(),
  }

  if (!account) return { values, error: 'We couldn’t find your account record. Please contact us.' }
  if (!/[\p{L}\p{Nd}]/u.test(values.legal_name)) return { values, error: 'Please enter your legal name.' }
  if (values.legal_name.length > 200 || values.name.length > 200) {
    return { values, error: 'Please keep each name to 200 characters.' }
  }
  if (values.name && !/[\p{L}\p{Nd}]/u.test(values.name)) {
    return { values, error: 'Your name needs at least one letter or number, or leave it blank to use your legal name.' }
  }

  const phone = values.phone ? toE164(values.phone) : null
  if (values.phone && !phone) {
    return { values, error: 'That phone number doesn’t look right. A US number is ten digits; any other starts with + and its country code.' }
  }

  const { error } = await supabase
    .from('accounts')
    .update({ legal_name: values.legal_name, name: values.name || null, phone })
    .eq('id', account.id)

  if (error) return { values, error: 'Your details weren’t saved. Please try again.' }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  return { ok: 'Saved.' }
}
