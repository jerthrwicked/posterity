// Posterity — the sign on the door when building is paused · Walker Brown
//
// Shown in place of a build form when storage is not current: the trial has
// ended and no storage year covers today. Master Spec, Storage Lapse Grace
// Period: the customer "can log in and view all content, but cannot build or
// edit until storage is current." The database enforces that; this explains it.
import { STORAGE_LAPSED_MESSAGE } from '../../lib/posterity/storage'

export function StorageNotice() {
  return (
    <div className="rounded-2xl p-6 border border-yellow-900 bg-yellow-950/30">
      <p className="text-yellow-200 text-sm">{STORAGE_LAPSED_MESSAGE}</p>
      <a href="/pricing" className="inline-block mt-4 text-sm text-yellow-100 underline">
        See storage and plans
      </a>
    </div>
  )
}
