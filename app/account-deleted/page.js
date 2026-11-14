// Posterity — after an account is deleted · Walker Brown
import Link from 'next/link'
import { Wordmark } from '../components/brand/Wordmark'
import { AccountGlow } from '../components/Glow'

// Where the browser lands once Settings has deleted the account and signed it
// out. The page holds nothing of the account: it says the same to anyone who
// opens it.
export default function AccountDeleted() {
  return (
    <main className="relative min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="relative z-[1] w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <Wordmark size="lg" withMark />
          </Link>
        </div>
        <div className="bg-[color:var(--card-ground)] posterity-frame border border-[color:var(--card-edge)] rounded-2xl p-8 flex flex-col gap-4">
          <p className="text-sm text-gray-300 leading-relaxed">
            [Placeholder: Product surface copy — the page shown once an account is deleted: the account and
            everything it held are gone; an email confirms it, and any refund owed arrives in a notice of its own]
          </p>
        </div>
        <p className="text-center text-gray-400 mt-6 text-sm">
          <Link href="/" className="text-white underline hover:text-gray-200">Back to Posterity</Link>
        </p>
      </div>
      <AccountGlow />
    </main>
  )
}
