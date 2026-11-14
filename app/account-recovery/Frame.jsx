// Posterity — account recovery · Walker Brown
import Link from 'next/link'
import { Wordmark } from '../components/brand/Wordmark'
import { AccountGlow } from '../components/Glow'

// The page the three account recovery screens share: the wordmark, a line
// under it, a card, and the way back to the sign-in page.
export function Frame({ line, children }) {
  return (
    <main className="relative min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="relative z-[1] w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <Wordmark size="lg" withMark />
          </Link>
          <p className="text-gray-400 mt-2">{line}</p>
        </div>
        <div className="bg-[color:var(--card-ground)] posterity-frame border border-[color:var(--card-edge)] rounded-2xl p-8 flex flex-col gap-4">{children}</div>
        <p className="text-center text-gray-400 mt-6 text-sm">
          <a href="/login" className="text-white underline hover:text-gray-200">Back to log in</a>
        </p>
      </div>
      <AccountGlow />
    </main>
  )
}
