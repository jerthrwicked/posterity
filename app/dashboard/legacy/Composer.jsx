'use client'

// Posterity — write a message, or leave a video or photo · Walker Brown
import { useState } from 'react'
import { MessageForm } from './MessageForm'
import { MediaForm } from './MediaForm'

export function Composer({ recipients, accountId, legacyId }) {
  const [tab, setTab] = useState('message')

  const tabClass = (t) =>
    `px-5 py-2.5 rounded-full text-sm font-semibold transition cursor-pointer ${
      tab === t
        ? 'bg-white text-black'
        : 'text-gray-400 hover:text-white border border-gray-800'
    }`

  return (
    <div>
      <div className="flex gap-3 mb-5">
        <button type="button" onClick={() => setTab('message')} className={tabClass('message')}>
          Write a message
        </button>
        <button type="button" onClick={() => setTab('media')} className={tabClass('media')}>
          Leave a video or photo
        </button>
      </div>

      {tab === 'message' ? (
        <MessageForm recipients={recipients} />
      ) : (
        <MediaForm recipients={recipients} accountId={accountId} legacyId={legacyId} />
      )}
    </div>
  )
}
