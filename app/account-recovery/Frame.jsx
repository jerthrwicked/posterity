// Posterity — account recovery · Walker Brown
import { AuthHead } from '../components/AuthHead'
import { WhiteGlow } from '../components/Glow'

// The page the three account recovery screens share: the seal, the line as a
// headline, the form on black, and the way back to the sign-in page.
export function Frame({ line, children }) {
  return (
    <main className="relative min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="relative z-[1] w-full max-w-md">
        <AuthHead line={`${line}.`} />
        <div className="flex flex-col gap-4">{children}</div>
        <p className="text-center text-gray-400 mt-6 text-sm">
          <a href="/login" className="text-white underline hover:text-gray-200">Back to log in</a>
        </p>
      </div>
      <WhiteGlow />
    </main>
  )
}
