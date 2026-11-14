import PlanCards from "./components/PlanCards";
import { Logomark } from "./components/brand/Logomark";
import { BandPulse } from "./components/Glow";

const PHASE_HUES = ["#93ab99", "#a1b095", "#a1a787", "#b1ac85", "#b6a37a", "#c0a176"];

const PHASES = [
  { name: "Horizon", copy: "Your legacy starts here. Build your account before committing." },
  { name: "Planning", copy: "Some or all of the plans within your account have received funding. Content continues to be created and refined." },
  { name: "Interlude", copy: "A period of waiting between the triggering of your account and its activation." },
  { name: "Active", copy: "Your account is live. The custom content you\u2019ve created is delivered to your loved ones in the exact way, at the exact time you designed it to be." },
  { name: "Reprise", copy: "A neutral, free year. If you choose, Legacy Guards can gather and download approved content within your account." },
  // Approved copy, from the specification's Brand Copy. Used exactly as written.
  { name: "Posterity", copy: "Your Posterity account will become a living representation of the legacy you created." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-[58px] pb-6 md:pt-[82px]">
        <h1 className="text-[52px] md:text-[88px] font-bold leading-[1.02] tracking-[-0.025em] max-w-3xl">
          Your Voice.<br /><span className="text-[#c0a176]">Forever.</span>
        </h1>
        <p className="mt-5 md:mt-[33px] max-w-[34rem] text-sm md:text-[15px] text-gray-300 leading-relaxed">
          Messages, memories, and videos — delivered to the ones you love, even after you&rsquo;re gone
        </p>
        <p className="serif-accent mt-[9px] text-[13px] md:text-sm leading-relaxed">
          Say the things too important to leave unsaid
        </p>
      </section>

      {/* The line under the hero */}
      <div className="px-6 text-center">
        <p className="serif-accent mx-auto max-w-[40rem] text-xs leading-relaxed" style={{ color: "#c0a176" }}>
          The love and memories you shared in life, reaching forward into tomorrow.
        </p>
      </div>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 md:px-8 py-16 max-w-6xl mx-auto">
        <div className="bg-[color:var(--card-ground)] posterity-frame rounded-2xl p-8 border border-[color:var(--card-edge)]">
          <p className="text-xs font-mono tracking-wider mb-3" style={{ color: "#93ab99" }}>01</p>
          <h3 className="text-lg md:text-xl font-bold mb-3">A Living Legacy</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Build a custom delivery calendar of messages, videos, and memories. Your content reaches the people you choose, on the dates you set — long after you&rsquo;re gone.
          </p>
        </div>
        <div className="bg-[color:var(--card-ground)] posterity-frame rounded-2xl p-8 border border-[color:var(--card-edge)]">
          <p className="text-xs font-mono tracking-wider mb-3" style={{ color: "#93ab99" }}>02</p>
          <h3 className="text-lg md:text-xl font-bold mb-3">On Your Terms</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            You build it. You preview it. You control it. Nothing moves until you&rsquo;re ready — and when you are, your account begins its journey through six carefully designed phases.
          </p>
        </div>
        <div className="bg-[color:var(--card-ground)] posterity-frame rounded-2xl p-8 border border-[color:var(--card-edge)]">
          <p className="text-xs font-mono tracking-wider mb-3" style={{ color: "#93ab99" }}>03</p>
          <h3 className="text-lg md:text-xl font-bold mb-3">Fully Automated. Fully Protected</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Your legacy fund is untouched until your account activates. Every delivery, every notification, every transfer — automated with a full audit trail and zero employee access to your funds.
          </p>
        </div>
      </section>

      {/* Phase lifecycle */}
      <div
        style={{
          background: "linear-gradient(180deg, #0f1512 0%, #000000 100%)",
          borderTop: "1px solid rgba(147,171,153,0.45)",
          borderBottom: "1px solid #2c3f35",
          position: "relative",
          overflow: "hidden",
        }}
      >
      <BandPulse />
      <section className="relative max-w-[60rem] mx-auto px-6 md:px-8 py-16">
        <h2 className="text-[28px] md:text-4xl leading-[1.15] font-bold text-center mb-2">Six Phases. One Journey.</h2>
        <p className="text-[color:var(--text-quiet)] text-[15px] md:text-lg text-center mb-12">Every Posterity account moves through six carefully designed phases.</p>

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
                      ...(i === 2 ? { boxShadow: "0 0 0 4px rgba(161,167,135,0.28)" } : {}),
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
                    ...(i === 2 ? { boxShadow: "0 0 0 4px rgba(161,167,135,0.28)" } : {}),
                  }}
                />
                <p className="text-[11px] font-mono text-[color:var(--text-quiet)] tracking-wider">
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
          <h2 className="text-[28px] md:text-4xl leading-[1.15] font-bold mb-3">Plans for every legacy</h2>
          <p className="text-gray-400 text-[15px] md:text-lg">Start building on Horizon. Pay for your plan — or plans — when you&rsquo;re ready.</p>
        </div>
        <PlanCards />
        <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-7 md:pt-9">
          <div className="w-10 h-px mx-auto mb-[22px]" style={{ background: "#93ab99" }} />
          <p className="serif-accent max-w-[42rem] mx-auto text-center text-[13px] md:text-[17px] leading-[1.7]" style={{ color: "#c0a176" }}>
            <span className="block text-[15px] md:text-xl leading-snug mb-2">With Posterity, you create a custom tailored legacy that will - on your terms - reach whatever goal or goals you design for it.</span>
            Do you want your plans to slowly unfold an interconnected story, shared across 52 messages to 52 of your closest friends? Perhaps you want to let them know they all have a piece of your tale in a final Facebook post, and that they will need to work with one another to piece it all together. Maybe-in the multitude of comments that will likely ensue-they will not only reconnect with each other, but also rediscover the legacy you left in all of their lives. The only limit is your creativity, and as you journey back through your life to create your legacy, you are building an account that will journey forward. Your Posterity account can be a secret, a confession, a reminder, a remembrance, a photo album - it can solely be a way for your loved ones to relive the joy you&rsquo;ve shared together. Your legacy is whatever you want it to be, and it starts now.
          </p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="flex flex-col items-center text-center px-6 pt-4 pb-20">
        <h2 className="text-4xl md:text-5xl leading-[1.1] font-bold mb-5">Begin while there&rsquo;s time.</h2>
        <p className="serif-accent mb-8 text-[13px] md:text-sm leading-relaxed">
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
      <footer className="text-[color:var(--text-quiet)] py-10 text-sm border-t border-gray-900 px-8 flex flex-row justify-between items-center">
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.6em", color: "#ffffff" }}>
          <Logomark size={36} />
          <span style={{ fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", lineHeight: 1, fontSize: 16 }}>Posterity</span>
        </div>
        <p className="hidden sm:block">© 2026 Posterity. All rights reserved.</p>
        <p className="sm:hidden">© 2026 Posterity</p>
      </footer>
    </main>
  );
}
