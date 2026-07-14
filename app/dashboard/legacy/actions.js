'use server'

// Posterity — content actions · Walker Brown
import { revalidatePath } from 'next/cache'
import { requireAccount } from '../../../lib/posterity/account'

export async function addMessage(_prev, formData) {
  const { supabase, account, legacy } = await requireAccount()

  const title = (formData.get('title') || '').trim()
  const body = (formData.get('body') || '').trim()
  const recipientId = formData.get('recipient_id') || ''
  const deliverOn = formData.get('deliver_on') || ''
  const includeInPosterity = formData.get('include_in_posterity') === 'on'

  if (!body) return { error: 'Write something first.' }
  if (!recipientId) return { error: 'Choose who this is for.' }
  if (!deliverOn) return { error: 'Choose a date for it to arrive.' }

  // The recipient must belong to this account. RLS would stop a foreign id
  // anyway, but a message addressed to a stranger should fail loudly here.
  const { data: recipient } = await supabase
    .from('recipients')
    .select('id')
    .eq('id', recipientId)
    .eq('account_id', account.id)
    .single()

  if (!recipient) return { error: "We couldn't find that recipient." }

  const { error } = await supabase.from('content_items').insert({
    legacy_id: legacy.id,
    account_id: account.id,
    kind: 'message',
    title: title || null,
    body,
    recipient_id: recipientId,
    deliver_on: deliverOn,
    include_in_posterity: includeInPosterity,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/legacy')
  revalidatePath('/dashboard')
  return { ok: 'Saved.' }
}

// Plain form action (no useActionState), so it takes formData directly.
export async function deleteMessage(formData) {
  const { supabase, account } = await requireAccount()
  const id = formData.get('id')

  const { error } = await supabase
    .from('content_items')
    .delete()
    .eq('id', id)
    .eq('account_id', account.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/legacy')
  revalidatePath('/dashboard')
}
