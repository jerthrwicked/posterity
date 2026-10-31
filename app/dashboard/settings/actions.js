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
//
// No approved text exists yet for these errors, so each is a placeholder naming
// the Writing Requirements item that will supply it. Not exported: a 'use
// server' file exports only async functions.
const ERRORS = {
  noAccount: '[Placeholder: Product surface copy — error messages: the account record cannot be found]',
  legalName: '[Placeholder: Product surface copy — error messages: the legal name is blank]',
  tooLong: '[Placeholder: Product surface copy — error messages: a name runs past 200 characters]',
  name: '[Placeholder: Product surface copy — error messages: the name has no letter or number]',
  phone: '[Placeholder: Product surface copy — error messages: the phone number cannot be read]',
  notSaved: '[Placeholder: Product surface copy — error messages: the details were not saved]',
}

export async function saveAccountDetails(_prev, formData) {
  const { supabase, account } = await requireAccount()

  const values = {
    legal_name: (formData.get('legal_name') || '').trim(),
    name: (formData.get('name') || '').trim(),
    phone: (formData.get('phone') || '').trim(),
  }

  if (!account) return { values, error: ERRORS.noAccount }
  if (!/[\p{L}\p{Nd}]/u.test(values.legal_name)) return { values, error: ERRORS.legalName }
  if (values.legal_name.length > 200 || values.name.length > 200) {
    return { values, error: ERRORS.tooLong }
  }
  if (values.name && !/[\p{L}\p{Nd}]/u.test(values.name)) {
    return { values, error: ERRORS.name }
  }

  const phone = values.phone ? toE164(values.phone) : null
  if (values.phone && !phone) {
    return { values, error: ERRORS.phone }
  }

  const { error } = await supabase
    .from('accounts')
    .update({ legal_name: values.legal_name, name: values.name || null, phone })
    .eq('id', account.id)

  if (error) return { values, error: ERRORS.notSaved }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  return { ok: 'Saved.' }
}
