import PlanCards from "./components/PlanCards";

const PHASE_HUES = ["#93ab99", "#879d98", "#7b8f97", "#708096", "#647295", "#586494"];

const PHASES = [
  { name: "Horizon", copy: "Your legacy starts here. Build your account before committing." },
  { name: "Planning", copy: "Some or all of the plans within your account have received funding. Content continues to be created and refined." },
  { name: "Abeyance", copy: "A period of waiting between the triggering of your account and its activation." },
  { name: "Active", copy: "Your account is live. The custom content you\u2019ve created is delivered to your loved ones in the exact way, at the exact time you designed it to be." },
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
            Messages, memories, and videos — delivered to the ones you love, even after you&rsquo;re gone
          </p>
          <p className="serif-accent text-base md:text-lg leading-relaxed">
            Say the things too important to leave unsaid
          </p>
        </div>
      </section>

      {/* Trust strip */}
      {/* Trust strip — outer div just centers; inner block left-aligns items as a unit */}
      <div
        className="flex justify-center px-6 py-8"
        style={{ borderTop: "1px solid #262626", borderBottom: "1px solid #262626" }}
      >
        <div className="flex flex-col items-start gap-3 max-w-xs sm:flex-row sm:items-center sm:max-w-none sm:gap-x-12">
          <div className="flex items-start sm:items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px] sm:mt-0" style={{ background: "#93ab99" }} />
            <span className="font-sans font-medium text-gray-400" style={{ fontSize: "0.875rem", letterSpacing: "0.04em" }}>Fully automated delivery</span>
          </div>
          <div className="flex items-start sm:items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px] sm:mt-0" style={{ background: "#93ab99" }} />
            <span className="font-sans font-medium text-gray-400" style={{ fontSize: "0.875rem", letterSpacing: "0.04em" }}>Begins January 1st following account activation</span>
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 md:px-8 py-16 max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <p className="text-xs font-mono tracking-wider mb-3" style={{ color: "#93ab99" }}>01</p>
          <h3 className="text-xl font-bold mb-3">A Living Legacy</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Build a custom delivery calendar of messages, videos, and memories. Your content reaches the people you choose, on the dates you set — long after you&rsquo;re gone.
          </p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <p className="text-xs font-mono tracking-wider mb-3" style={{ color: "#93ab99" }}>02</p>
          <h3 className="text-xl font-bold mb-3">On Your Terms</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            You build it. You preview it. You control it. Nothing moves until you&rsquo;re ready — and when you are, your account begins its journey through six carefully designed phases.
          </p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <p className="text-xs font-mono tracking-wider mb-3" style={{ color: "#93ab99" }}>03</p>
          <h3 className="text-xl font-bold mb-3">Fully Automated. Fully Protected</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Your legacy fund is untouched until your account activates. Every delivery, every notification, every transfer — automated with a full audit trail and zero employee access to your funds.
          </p>
        </div>
      </section>

      {/* Phase lifecycle */}
      <div
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(147,171,153,0.10), rgba(15,21,18,0) 60%), linear-gradient(180deg, #0f1512 0%, #000000 100%)",
          borderTop: "1px solid #2c3f35",
          borderBottom: "1px solid #2c3f35",
        }}
      >
      <section className="max-w-[60rem] mx-auto px-6 md:px-8 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Six Phases. One Journey.</h2>
        <p className="text-gray-500 text-sm text-center mb-12">Every Posterity account moves through six carefully designed phases.</p>

        {/* Layer 1 — Tracker: connected line + pips + uppercase labels (≥880px only) */}
        <div className="hidden min-[880px]:block">
          <div className="relative">
            {/* Track line: left/right = 1/12 of width so endpoints land on pip centers */}
            <div
              className="absolute"
              style={{
                top: "5px",
                left: "calc(100% / 12)",
                right: "calc(100% / 12)",
                height: "2px",
                background: "#262626",
              }}
            />
            {/* 6-column grid — no gap so each cell = 1/6 width, pip centered inside */}
            <div className="grid grid-cols-6">
              {PHASES.map((phase, i) => (
                <div key={phase.name} className="flex flex-col items-center relative z-10">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: PHASE_HUES[i],
                      ...(i === 2 ? { boxShadow: "0 0 0 4px rgba(123,143,151,0.28)" } : {}),
                    }}
                  />
                  <p
                    className="text-[11px] font-mono uppercase tracking-widest mt-2 text-center"
                    style={{ color: PHASE_HUES[i] }}
                  >
                    {phase.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hairline divider between tracker and detail grid (≥880px only) */}
        <div className="hidden min-[880px]:block h-px mt-8 mb-10" style={{ background: "#262626" }} />

        {/* Layer 2 — Detail grid: 3-col × 2-row (→ vertical timeline on mobile) */}
        <div className="phases-timeline grid grid-cols-1 min-[880px]:grid-cols-3 gap-x-10 gap-y-0 min-[880px]:gap-y-8">
          {PHASES.map((phase, i) => (
            <div key={phase.name} className="phases-timeline-item flex flex-col gap-1.5">
              {/* Number + name row — pip is anchored inside so it always tracks this row */}
              <div className="flex items-baseline gap-2" style={{ position: "relative" }}>
                {/* Mobile pip — vertically centered on this row, hidden at ≥880px */}
                <div
                  className="min-[880px]:hidden"
                  style={{
                    position: "absolute",
                    left: "-2rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: PHASE_HUES[i],
                    zIndex: 1,
                    ...(i === 2 ? { boxShadow: "0 0 0 4px rgba(123,143,151,0.28)" } : {}),
                  }}
                />
                <p className="text-[11px] font-mono text-gray-500 tracking-wider">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="font-semibold" style={{ fontSize: "17px", color: PHASE_HUES[i] }}>
                  {phase.name}
                </p>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">{phase.copy}</p>
            </div>
          ))}
        </div>
      </section>
      </div>

      {/* Plans preview */}
      <section className="py-16">
        <div className="text-center px-6 mb-10">
          <h2 className="text-4xl font-bold mb-3">Plans for every legacy</h2>
          <p className="text-gray-400 text-lg">Start building on Horizon. Pay for your plan — or plans — when you&rsquo;re ready.</p>
        </div>
        <PlanCards />
      </section>

      {/* Closing CTA */}
      <section className="flex flex-col items-center text-center px-6 py-20">
        <h2 className="text-5xl font-bold mb-5" style={{ lineHeight: "1.1" }}>Begin while there&rsquo;s time.</h2>
        <p className="serif-accent mb-8" style={{ fontSize: "20px", lineHeight: "1.75" }}>
          Your legacy, on your terms.
        </p>
        <a
          href="/pricing"
          className="bg-white text-black px-8 py-4 rounded-full font-semibold text-base hover:bg-gray-200 transition"
        >
          Get Started
        </a>
      </section>

      {/* Footer */}
      <footer className="text-gray-600 py-10 text-sm border-t border-gray-900 px-8 flex flex-row justify-between items-center">
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.6em", color: "#ffffff" }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="36" height="36" aria-hidden="true">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#ffffff" strokeWidth="6" />
            <g transform="translate(100,100) scale(0.62) translate(-60,-58)">
              <path d="M60 36 C72 26 92 20 110 22 C96 34 80 46 66 54 C65 58 64 62 63 66 L69 94 L60 77 L51 94 L57 66 C56 62 55 58 54 54 C40 46 24 34 10 22 C28 20 48 26 60 36 Z" fill="#ffffff" />
            </g>
          </svg>
          <span style={{ fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", lineHeight: 1, fontSize: 16 }}>Posterity</span>
        </div>
        <p className="hidden sm:block">© 2026 Posterity. All rights reserved.</p>
        <p className="sm:hidden">© 2026 Posterity</p>
      </footer>
    </main>
  );
}
