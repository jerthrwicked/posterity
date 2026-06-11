import { Wordmark } from "./components/brand/Wordmark";

const PHASE_HUES = ["#93ab99", "#879d98", "#7b8f97", "#708096", "#647295", "#586494"];

const PHASES = [
  { name: "Horizon", copy: "Your legacy starts here. Build your account before committing." },
  { name: "Planning", copy: "Your account is funded. Content continues to build while your account waits." },
  { name: "Abeyance", copy: "A period of careful waiting before your legacy begins its journey." },
  { name: "Active", copy: "Content is delivered according to your calendar, to the people you chose." },
  { name: "Twilight", copy: "A neutral, free year. If you choose, trusted contacts can gather and download approved content within your account." },
  { name: "Posterity", copy: "Optional. Should you wish it, the approved portions of your account become a permanent archive — your legacy, living on." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 md:py-32">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight max-w-3xl">
          Your Voice.<br />Forever.
        </h1>
        <div className="mt-8 md:mt-10 space-y-3 max-w-2xl">
          <p className="text-lg md:text-2xl text-gray-300 leading-relaxed">
            Messages, memories, and videos — delivered to the ones you love, even after you're gone
          </p>
          <p className="text-base md:text-lg text-gray-500 leading-relaxed">
            Say the things too important to leave unsaid
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 md:px-8 py-16 max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <h3 className="text-xl font-bold mb-3">A Living Legacy</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Build a custom delivery calendar of messages, videos, and memories. Your content reaches the people you choose, on the dates you set — long after you're gone.
          </p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <h3 className="text-xl font-bold mb-3">On Your Terms</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            You build it. You preview it. You control it. Nothing moves until you're ready — and when you are, your account begins its journey through six carefully designed phases.
          </p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <h3 className="text-xl font-bold mb-3">Fully Automated. Fully Protected</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Your legacy fund is untouched until your account activates. Every delivery, every notification, every transfer — automated with a full audit trail and zero employee access to your funds.
          </p>
        </div>
      </section>

      {/* Clarifying note */}
      <div className="max-w-2xl mx-auto text-center px-6 pt-2 pb-10">
        <div className="w-10 h-px mx-auto mb-5" style={{ background: "#93ab99" }} />
        <p style={{
          fontFamily: "var(--font-lora, Georgia, serif)",
          fontStyle: "italic",
          color: "#cccccc",
          fontSize: "0.9rem",
          lineHeight: "1.75",
        }}>
          Quarterly, monthly, weekly — that&rsquo;s just how we count. Every message and video message posts on any date you choose, anytime across the plan year.
        </p>
      </div>

      {/* Phase lifecycle */}
      <section className="max-w-6xl mx-auto px-6 md:px-8 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Six Phases. One Journey.</h2>
        <p className="text-gray-500 text-sm text-center mb-10">Every Posterity account moves through six carefully designed phases.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {PHASES.map((phase, i) => (
            <div key={phase.name} className="flex flex-col gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: PHASE_HUES[i] }}
              />
              <div
                className="text-sm font-semibold"
                style={{ color: PHASE_HUES[i] }}
              >
                {phase.name}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{phase.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-gray-600 py-10 text-sm border-t border-gray-900">
        <div className="flex justify-center mb-3">
          <Wordmark size="sm" withMark />
        </div>
        <p>© 2026 Posterity. All rights reserved.</p>
      </footer>
    </main>
  );
}
