// Posterity — User Profiles: the shell every tab sits within · Walker Brown
//
// The customer's logged-in home (Master Specification, User Profiles). Each of
// the four tabs is its own page and renders this shell around its panels, so
// every tab reads the account afresh: the phase here comes from the account
// status check on each load, as every surface's does.
//
// From the top: the place for the Account Restoration banner, the strip with
// the phase display and the place for the check-in button, and the tabs.
// Later sub-stages insert into the places left for them; each is marked where
// it lands.
import { StorageNotice } from '../../components/StorageNotice'
import { trialDaysLeft } from '../../../lib/posterity/storage'
import { PHASES } from './phases'

export const TABS = [
  { id: 'plans', label: 'Plans', href: '/dashboard' },
  { id: 'people', label: 'People', href: '/dashboard/people' },
  { id: 'social-media', label: 'Social Media', href: '/dashboard/social-media' },
  { id: 'account', label: 'Account', href: '/dashboard/account' },
]

const TAB = 'rounded-full border px-3 sm:px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-200 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93ab99]'

export function ProfileShell({ tab, profile, children }) {
  const { account, status } = profile
  const key = PHASES[status?.phase] ? status.phase : 'horizon'
  const phase = PHASES[key]
  const name = account?.name || 'Friend'

  // Storage state, in the product's words, as account_status() reads it. The
  // trial is the spec's three-month free trial (Horizon Tier); once a storage
  // year is paid, the trial line goes away.
  const canBuild = status?.building_open === true
  let storageLine = null
  if (status?.storage_standing === 'current') {
    storageLine = 'Storage is current.'
  } else if (status?.storage_standing === 'trial') {
    const daysLeft = trialDaysLeft(status)
    storageLine = daysLeft === 1 ? 'Your free trial ends tomorrow.' : `Your free trial: ${daysLeft} days left.`
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        {/* The place for the Account Restoration banner, at the top of every
            tab. Stage 4.7 inserts the banner; until then it holds nothing. */}
        <div id="restoration-banner-place" />

        <h1 className="text-3xl sm:text-4xl font-bold mb-6">Welcome, {name}.</h1>

        {/* The strip across the top of every tab. */}
        <section
          id="profile-strip"
          aria-label="Phase"
          className="rounded-2xl border border-gray-800 px-5 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-4"
        >
          <div id="phase-display" data-phase={key}>
            <p className="font-mono text-xs uppercase tracking-widest text-gray-400">Phase</p>
            <p className="mt-1 flex items-center gap-2.5 text-xl font-semibold">
              <span
                id="phase-colour"
                aria-hidden="true"
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: phase.color }}
              />
              <span id="phase-name">{phase.name}</span>
            </p>
            <p className="text-gray-400 text-sm mt-1">{phase.line}</p>
            {storageLine && <p id="storage-line" className="text-gray-400 text-sm mt-1">{storageLine}</p>}
          </div>
          {/* The place for the check-in button and its next check-in date.
              Stage 4.8 inserts it; until then it holds nothing. A button
              wired to nothing would tell a customer their check-in landed
              when it did not. */}
          <div id="checkin-place" />
        </section>

        {account && !canBuild && (
          <div className="mt-6">
            <StorageNotice />
          </div>
        )}
        {!account && (
          <div className="mt-6 rounded-2xl p-6 border border-yellow-900 bg-yellow-950/30">
            <p className="text-yellow-200 text-sm">
              We couldn&rsquo;t find your account record. Nothing is lost — please contact us and
              we&rsquo;ll put it right.
            </p>
          </div>
        )}

        <nav id="profile-tabs" aria-label="User Profiles" className="mt-8 mb-8 flex flex-wrap gap-1.5 sm:gap-2">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={t.href}
              aria-current={t.id === tab ? 'page' : undefined}
              className={`${TAB} ${t.id === tab
                ? 'bg-white text-black border-white'
                : 'text-white border-gray-600 hover:bg-white hover:text-black hover:border-white'}`}
              style={{ textDecoration: 'none' }}
            >
              {t.label}
            </a>
          ))}
        </nav>

        <div id={`tab-${tab}`}>{children}</div>
      </div>
    </main>
  )
}

// A panel within a tab: a title, a line about it, and a count, opening its
// own page where it has one.
export function Card({ title, blurb, value, hint, href }) {
  const body = (
    <>
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-gray-400 text-sm">{blurb}</p>
      <p className="text-3xl font-bold mt-6">{value}</p>
      <p className="text-gray-400 text-sm">{hint}</p>
    </>
  )
  const base = 'bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-800 block'

  if (!href) return <div className={base}>{body}</div>

  return (
    <a
      href={href}
      className={`${base} hover:border-gray-600 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93ab99]`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      {body}
    </a>
  )
}

// A tab with nothing built within it yet says so in one line.
export function Empty({ children }) {
  return (
    <div className="rounded-2xl p-6 sm:p-8 border border-gray-800">
      <p className="text-gray-400 text-sm">{children}</p>
    </div>
  )
}
