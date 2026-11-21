"use client";
import HomePlans from "../components/HomePlans";
import { GRACE_STORAGE } from "../../lib/posterity/plans";
import { WhiteGlow } from "../components/Glow";


export default function Pricing() {
  return (
    <main className="relative min-h-screen bg-black text-white">
      <div className="relative z-[1]">

      {/* Header */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 pt-10 sm:pt-16 pb-8">
        <h1 className="text-[28px] md:text-4xl leading-[1.15] font-bold">Plans</h1>
        <p className="mt-4 max-w-[42rem] text-[13px] md:text-[17px] leading-[1.7] text-gray-300">
          <span className="serif-accent block text-[15px] md:text-xl leading-snug mb-2" style={{ color: "#c0a176" }}>Before you move forward on your legacy journey, you must first go back.</span>
          Back through the memories, friendships, love, and brilliance. Your creations and your accomplishments: All the uniqueness that made you-You. The little and big things that make life feel well-lived. Relive your past, so you can carry it into the future with Posterity. Select a plan and start building your legacy today.
        </p>
      </section>

      {/* The plans: the homepage's plans card, a switch below 1024px and four plans across from 1024px */}
      <section className="pb-2">
        <HomePlans />
      </section>

      {/* Serif cadence note — appears once, beneath the cards */}
      <div className="max-w-2xl mx-auto text-center px-6 py-10">
        <div className="w-10 h-px mx-auto mb-5" style={{ background: "#93ab99" }} />
        <p className="serif-accent text-[13px] md:text-sm leading-relaxed">
          Quarterly, monthly, weekly — that&rsquo;s just how we count. Every delivery posts on any date you choose, anytime across the plan year.
        </p>
      </div>

      {/* Custom & Grace — two cards with a gold edge on black, set apart from the plans you pay for; two across, one column below 768px */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">

          <div
            className="rounded-2xl px-6 py-7 md:p-10 flex flex-col items-start bg-black border border-[#c0a176] shadow-[0_0_60px_rgba(192,161,118,0.10)]"
          >
            <h2 className="text-lg md:text-xl font-bold mb-4 text-[#c0a176]">Custom</h2>
            <p className="text-gray-300 text-base leading-relaxed mb-8">
              Every legacy is different. If your vision doesn&rsquo;t fit a standard plan, we&rsquo;ll build something that does — contact us to get started
            </p>
            <a
              href="mailto:admin@yourposterity.com"
              className="inline-block border border-[#c0a176] text-[#c0a176] px-6 py-3 rounded-full text-base font-semibold hover:bg-[#c0a176] hover:text-black transition"
            >
              Contact Us
            </a>
          </div>

          <div
            className="rounded-2xl px-6 py-7 md:p-10 flex flex-col items-start bg-black border border-[#c0a176] shadow-[0_0_60px_rgba(192,161,118,0.10)]"
          >
            <h2 className="text-lg md:text-xl font-bold mb-2 text-[#c0a176]">Posterity Grace</h2>
            <p className="text-white text-base mb-4">
              Free, with Grace Storage at {GRACE_STORAGE.price}<span className="text-[color:var(--text-quiet)]">/year</span>
            </p>
            <p className="text-gray-300 text-base leading-relaxed mb-8">
              Everyone deserves a legacy. Financial hardship shouldn&rsquo;t stand between you and your posterity. Contact us to discuss your options — we&rsquo;ll find a way forward together
            </p>
            <a
              href="mailto:admin@yourposterity.com"
              className="inline-block border border-[#c0a176] text-[#c0a176] px-6 py-3 rounded-full text-base font-semibold hover:bg-[#c0a176] hover:text-black transition"
            >
              Contact Us
            </a>
          </div>

        </div>
      </section>

      </div>
      <WhiteGlow />
    </main>
  );
}
