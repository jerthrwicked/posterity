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

// The file is already in storage by the time this runs — the browser uploaded it
// directly. This records it. If it fails, the caller removes the orphaned object.
export async function addMedia(_prev, formData) {
  const { supabase, account, legacy } = await requireAccount()

  const storagePath = formData.get('storage_path') || ''
  const kind = formData.get('kind') || ''
  const fileType = formData.get('file_type') || ''
  const fileSize = Number(formData.get('file_size_bytes') || 0)
  const title = (formData.get('title') || '').trim()
  const body = (formData.get('body') || '').trim()
  const recipientId = formData.get('recipient_id') || ''
  const deliverOn = formData.get('deliver_on') || ''
  const includeInPosterity = formData.get('include_in_posterity') === 'on'

  if (!storagePath) return { error: 'The upload did not finish.' }
  if (kind !== 'photo' && kind !== 'video') return { error: 'Unsupported file.' }
  if (!recipientId) return { error: 'Choose who this is for.' }
  if (!deliverOn) return { error: 'Choose a date for it to arrive.' }

  // The path must sit under this account's folder. RLS on storage enforces this
  // too — this is the second lock, on the row that points at the file.
  if (!storagePath.startsWith(`${account.id}/`)) {
    return { error: 'That file does not belong to this account.' }
  }

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
    kind,
    title: title || null,
    body: body || null,
    storage_path: storagePath,
    file_type: fileType || null,
    file_size_bytes: fileSize || null,
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

  // Read the path before deleting the row — afterwards there's nothing pointing
  // at the file, and a video nobody can see but we still store is the worst of
  // both: we keep a man's last words and can't give them to anyone.
  const { data: item } = await supabase
    .from('content_items')
    .select('storage_path')
    .eq('id', id)
    .eq('account_id', account.id)
    .single()

  const { error } = await supabase
    .from('content_items')
    .delete()
    .eq('id', id)
    .eq('account_id', account.id)

  if (error) return { error: error.message }

  if (item?.storage_path) {
    await supabase.storage.from('legacy-media').remove([item.storage_path])
  }

  revalidatePath('/dashboard/legacy')
  revalidatePath('/dashboard')
}
