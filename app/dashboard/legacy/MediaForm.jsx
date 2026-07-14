'use client'

// Posterity — upload a video or photo · Walker Brown
import { useState } from 'react'
import { createClient } from '../../../lib/supabase/client'
import { addMedia } from './actions'

const input =
  'w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition'
const label = 'text-sm text-gray-400 mb-1 block'

const MAX_BYTES = 25 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm'

function kindOf(file) {
  if (file.type.startsWith('image/')) return 'photo'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

function extOf(file) {
  const m = /\.([A-Za-z0-9]+)$/.exec(file.name)
  return (m ? m[1] : 'bin').toLowerCase()
}

export function MediaForm({ recipients, accountId, legacyId }) {
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')

    const form = e.currentTarget
    const data = new FormData(form)

    if (!file) return setError('Choose a photo or a video.')

    const kind = kindOf(file)
    if (!kind) return setError("That file type isn't supported.")

    // A courtesy, not a control — the bucket enforces this server-side. Better
    // to say so here than to let someone watch a 200MB upload fail at the end.
    if (file.size > MAX_BYTES) {
      return setError(
        `That file is ${(file.size / 1024 / 1024).toFixed(0)}MB. The limit is 25MB — try a shorter clip.`
      )
    }
    if (!data.get('recipient_id')) return setError('Choose who this is for.')
    if (!data.get('deliver_on')) return setError('Choose a date for it to arrive.')

    setBusy('Uploading...')
    const supabase = createClient()

    // <account_id>/<legacy_id>/<uuid>.<ext> — the first folder is what storage's
    // RLS keys on, so the path is the permission.
    const path = `${accountId}/${legacyId}/${crypto.randomUUID()}.${extOf(file)}`

    const { error: upErr } = await supabase.storage
      .from('legacy-media')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (upErr) {
      setBusy('')
      return setError(upErr.message)
    }

    setBusy('Saving...')
    data.set('storage_path', path)
    data.set('kind', kind)
    data.set('file_type', file.type)
    data.set('file_size_bytes', String(file.size))

    const result = await addMedia({}, data)
    setBusy('')

    if (result?.error) {
      // The row didn't save, so nothing points at the file. Don't leave it there.
      await supabase.storage.from('legacy-media').remove([path])
      return setError(result.error)
    }

    setOk('Saved.')
    setFile(null)
    form.reset()
  }

  if (!recipients.length) {
    return (
      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
        <p className="text-gray-400 mb-6">
          Add someone first. A message has to be <em>for</em> someone.
        </p>
        <a
          href="/dashboard/recipients"
          className="inline-block bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition"
        >
          Add a recipient
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="bg-gray-900 rounded-2xl p-8 border border-gray-800 flex flex-col gap-4">
      <div>
        <label htmlFor="file" className={label}>Video or photo</label>
        <input
          id="file"
          type="file"
          accept={ACCEPT}
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(''); setOk('') }}
          className="w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white file:text-black hover:file:bg-gray-200 file:cursor-pointer cursor-pointer"
        />
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          Up to 25MB. For video, that&rsquo;s roughly three or four minutes — say the thing that
          matters, not everything.
        </p>
      </div>

      <div>
        <label htmlFor="media_body" className={label}>
          Anything to go with it <span className="text-gray-600">(optional)</span>
        </label>
        <textarea
          id="media_body"
          name="body"
          rows={3}
          className={input + ' resize-y leading-relaxed'}
          placeholder="A few words alongside it."
        />
      </div>

      <div>
        <label htmlFor="media_title" className={label}>
          Title <span className="text-gray-600">(optional — just for you)</span>
        </label>
        <input id="media_title" name="title" className={input} placeholder="The kitchen, Christmas morning" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="media_recipient" className={label}>For</label>
          <select id="media_recipient" name="recipient_id" defaultValue="" className={input}>
            <option value="" disabled>Choose someone</option>
            {recipients.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="media_deliver_on" className={label}>Arrives on</label>
          <input id="media_deliver_on" name="deliver_on" type="date" className={input} />
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm text-gray-400 cursor-pointer mt-1">
        <input type="checkbox" name="include_in_posterity" defaultChecked className="mt-1 accent-white cursor-pointer" />
        <span>Keep this in my Posterity — the permanent archive, after everything has been delivered.</span>
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {ok && <p className="text-sm text-green-400">{ok}</p>}

      <button
        type="submit"
        disabled={!!busy}
        className="w-full bg-white text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition disabled:opacity-50 cursor-pointer"
      >
        {busy || 'Save to my legacy'}
      </button>
    </form>
  )
}
