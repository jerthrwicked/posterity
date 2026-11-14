"use client";
import PlanCards from "../components/PlanCards";
import { GRACE_STORAGE } from "../../lib/posterity/plans";
import { Logomark } from "../components/brand/Logomark";
import { AccountGlow } from "../components/Glow";


export default function Pricing() {
  return (
    <main className="relative min-h-screen bg-black text-white">
      <div className="relative z-[1]">

      {/* Header */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 pt-10 sm:pt-16 pb-8">
        <h1 className="text-3xl sm:text-4xl font-bold">Plans</h1>
        <p className="text-gray-400 text-lg mt-3">Start building your legacy today.</p>
      </section>

      {/* Plan Cards (shared component — do not inline here) */}
      <PlanCards />

      {/* Custom & Grace — secondary tier, two across, one column below 768px */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">

          <div
            className="rounded-2xl p-10 flex flex-col items-start bg-[color:var(--paper)] border border-[color:var(--paper)]"
          >
            <h2 className="text-2xl font-bold mb-4 text-[color:var(--paper-ink)]">Custom</h2>
            <p className="text-[color:var(--paper-ink-3)] text-base leading-relaxed mb-8">
              Every legacy is different. If your vision doesn&rsquo;t fit a standard plan, we&rsquo;ll build something that does — contact us to get started
            </p>
            <a
              href="mailto:admin@yourposterity.com"
              className="inline-block border border-[color:var(--paper-ink)] text-[color:var(--paper-ink)] px-6 py-3 rounded-full text-base font-semibold hover:bg-[color:var(--paper-ink)] hover:text-white transition"
            >
              Contact Us
            </a>
          </div>

          <div
            className="rounded-2xl p-10 flex flex-col items-start bg-[color:var(--paper)] border border-[color:var(--paper)]"
          >
            <h2 className="text-2xl font-bold mb-2 text-[color:var(--paper-ink)]">Posterity Grace</h2>
            <p className="text-[color:var(--paper-ink)] text-base mb-4">
              Free, with Grace Storage at {GRACE_STORAGE.price}<span className="text-[color:var(--paper-quiet)]">/year</span>
            </p>
            <p className="text-[color:var(--paper-ink-3)] text-base leading-relaxed mb-8">
              Everyone deserves a legacy. Financial hardship shouldn&rsquo;t stand between you and your posterity. Contact us to discuss your options — we&rsquo;ll find a way forward together
            </p>
            <a
              href="mailto:admin@yourposterity.com"
              className="inline-block border border-[color:var(--paper-ink)] text-[color:var(--paper-ink)] px-6 py-3 rounded-full text-base font-semibold hover:bg-[color:var(--paper-ink)] hover:text-white transition"
            >
              Contact Us
            </a>
          </div>

        </div>
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
      </div>
      <AccountGlow />
    </main>
  );
}
