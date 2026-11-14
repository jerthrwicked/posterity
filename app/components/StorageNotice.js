// Posterity — the sign on the door when building is paused · Walker Brown
//
// Shown in place of a build form when building is locked: three months into a
// storage lapse, or from Interlude on. Master Spec, Storage Lapse Grace Period:
// building and editing "continue for the first three months and then lock until
// storage is current." The database enforces that; this explains it.
import { STORAGE_LAPSED_MESSAGE } from '../../lib/posterity/storage'
import { WarningMark } from './StatusMarks'

export function StorageNotice() {
  return (
    <div className="rounded-2xl p-6 border border-white">
      <p className="text-white text-sm flex items-start gap-2"><WarningMark className="mt-0.5" />{STORAGE_LAPSED_MESSAGE}</p>
      <a href="/pricing" className="inline-block mt-4 text-sm text-white underline">
        See storage and plans
      </a>
    </div>
  )
}
