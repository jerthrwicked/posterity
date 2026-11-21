// Posterity — after an account is deleted · Walker Brown
import Link from 'next/link'
import { AuthHead } from '../components/AuthHead'
import { WhiteGlow } from '../components/Glow'

// Where the browser lands once Settings has deleted the account and signed it
// out. The page holds nothing of the account: it says the same to anyone who
// opens it.
export default function AccountDeleted() {
  return (
    <main className="relative min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="relative z-[1] w-full max-w-md">
        <AuthHead />
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-300 leading-relaxed">
            [Placeholder: Product surface copy — the page shown once an account is deleted: the account and
            everything it held are gone; an email confirms it, and any refund owed arrives in a notice of its own]
          </p>
        </div>
        <p className="text-center text-gray-400 mt-6 text-sm">
          <Link href="/" className="text-white underline hover:text-gray-200">Back to Posterity</Link>
        </p>
      </div>
      <WhiteGlow />
    </main>
  )
}
