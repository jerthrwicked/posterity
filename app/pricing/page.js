"use client";
import { useState } from "react";
import { Wordmark } from "../components/brand/Wordmark";

const btnBase =
  "mt-auto text-center border border-white text-white px-6 py-3 rounded-full text-base font-semibold hover:bg-white hover:text-black transition cursor-pointer disabled:opacity-50";

const PHASE_HUES = ["#93ab99", "#879d98", "#7b8f97", "#708096", "#647295", "#586494"];

const PHASES = [
  { name: "Horizon", copy: "Your legacy starts here. Build your account before committing." },
  { name: "Planning", copy: "Your account is funded. Content continues to build while your account waits." },
  { name: "Abeyance", copy: "A period of careful waiting before your legacy begins its journey." },
  { name: "Active", copy: "Content is delivered according to your calendar, to the people you chose." },
  { name: "Twilight", copy: "A neutral, free year. If you choose, trusted contacts can gather and download approved content within your account." },
  { name: "Posterity", copy: "Optional. Should you wish it, the approved portions of your account become a permanent archive — your legacy, living on." },
];

export default function Pricing() {
  const [loading, setLoading] = useState(null);

  const handleCheckout = async (priceId, index) => {
    setLoading(index);
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });
    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <main className="min-h-screen bg-black text-white">

      {/* Header */}
      <section className="text-center px-6 pt-12 pb-10">
        <h1 className="text-6xl font-bold">Plans</h1>
        <p className="text-gray-400 text-base mt-3">Start building your legacy today</p>
      </section>

      {/* Main Plan Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto px-6 md:px-8 pb-10">

        {/* Horizon */}
        <div className="bg-gray-900 rounded-2xl p-10 border border-gray-800 flex flex-col">
          <h2 className="text-2xl font-bold mb-3">Horizon</h2>
          <div className="mb-5">
            <span className="text-5xl font-bold">$9.99</span>
            <span className="text-gray-500 ml-2 text-base">/year</span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Your legacy starts here. Horizon gives you unlimited time to build your account — upload content, set your calendar, and prepare your plans before committing.
          </p>
          <ul className="flex flex-col gap-4 text-base text-gray-300 mb-10 flex-1">
            <li className="flex gap-3"><span className="text-gray-500 mt-0.5">•</span><span>Legacy builder — build your account now, activate later</span></li>
            <li className="flex gap-3"><span className="text-gray-500 mt-0.5">•</span><span>Your content held safely until you're ready</span></li>
          </ul>
          <button
            onClick={() => handleCheckout("price_1Tcvq1BcdnR2VoDgYustrs4G", 0)}
            disabled={loading === 0}
            className={btnBase}
          >
            {loading === 0 ? "Loading..." : "Get Started"}
          </button>
        </div>

        {/* Basic */}
        <div className="bg-gray-800 rounded-2xl p-10 border border-gray-700 flex flex-col">
          <h2 className="text-2xl font-bold mb-3">Basic</h2>
          <div className="mb-8">
            <span className="text-5xl font-bold">$99</span>
            <span className="text-gray-500 ml-2 text-base">/year</span>
          </div>
          <ul className="flex flex-col gap-4 text-base text-gray-300 mb-10 flex-1">
            <li className="flex gap-3"><span className="text-gray-500 mt-0.5">•</span><span>4 messages, posts, or shares per plan year, each with an optional handwritten note</span></li>
            <li className="flex gap-3"><span className="text-gray-500 mt-0.5">•</span><span>1 video message per plan year</span></li>
          </ul>
          <button
            onClick={() => handleCheckout("price_1TeTeyBcdnR2VoDgYhf7uym0", 1)}
            disabled={loading === 1}
            className={btnBase}
          >
            {loading === 1 ? "Loading..." : "Get Started"}
          </button>
        </div>

        {/* Premium */}
        <div className="bg-gray-800 rounded-2xl p-10 border border-gray-700 flex flex-col">
          <h2 className="text-2xl font-bold mb-3">Premium</h2>
          <div className="mb-8">
            <span className="text-5xl font-bold">$249</span>
            <span className="text-gray-500 ml-2 text-base">/year</span>
          </div>
          <ul className="flex flex-col gap-4 text-base text-gray-300 mb-10 flex-1">
            <li className="flex gap-3"><span className="text-gray-500 mt-0.5">•</span><span>12 messages, posts, or shares per plan year, each with an optional handwritten note</span></li>
            <li className="flex gap-3"><span className="text-gray-500 mt-0.5">•</span><span>4 video messages per plan year</span></li>
          </ul>
          <button
            onClick={() => handleCheckout("price_1Tcvj2BcdnR2VoDgt4oZu8VA", 2)}
            disabled={loading === 2}
            className={btnBase}
          >
            {loading === 2 ? "Loading..." : "Get Started"}
          </button>
        </div>

        {/* Legacy */}
        <div className="bg-gray-800 rounded-2xl p-10 border border-gray-700 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-2xl font-bold">Legacy</h2>
            <span className="text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full whitespace-nowrap ml-3 mt-0.5">
              Limited Availability
            </span>
          </div>
          <div className="mb-8">
            <span className="text-5xl font-bold">$899</span>
            <span className="text-gray-500 ml-2 text-base">/year</span>
          </div>
          <ul className="flex flex-col gap-4 text-base text-gray-300 mb-10 flex-1">
            <li className="flex gap-3"><span className="text-gray-500 mt-0.5">•</span><span>52 messages, posts, or shares per plan year, each with an optional handwritten note</span></li>
            <li className="flex gap-3"><span className="text-gray-500 mt-0.5">•</span><span>12 video messages per plan year</span></li>
          </ul>
          <button
            onClick={() => handleCheckout("price_1TeTj5BcdnR2VoDgtfA9O3z8", 3)}
            disabled={loading === 3}
            className={btnBase}
          >
            {loading === 3 ? "Loading..." : "Get Started"}
          </button>
        </div>

      </section>

      {/* Clarifying note */}
      <div className="max-w-2xl mx-auto text-center px-6 py-10">
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

      {/* Custom & Grace */}
      <section className="max-w-2xl mx-auto px-6 md:px-8 pb-20 flex flex-col gap-8 text-center">

        <div className="bg-gray-900 rounded-2xl p-10 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Custom</h2>
          <p className="text-gray-400 text-base leading-relaxed mb-8">
            Every legacy is different. If your vision doesn't fit a standard plan, we'll build something that does — contact us to get started
          </p>
          <a
            href="mailto:hello@posterity.app"
            className="inline-block border border-white text-white px-6 py-3 rounded-full text-base font-semibold hover:bg-white hover:text-black transition"
          >
            Contact Us
          </a>
        </div>

        <div className="bg-gray-900 rounded-2xl p-10 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Posterity Grace</h2>
          <p className="text-gray-400 text-base leading-relaxed mb-8">
            Everyone deserves a legacy. Financial hardship shouldn't stand between you and your posterity. Contact us to discuss your options — we'll find a way forward together
          </p>
          <a
            href="mailto:hello@posterity.app"
            className="inline-block border border-white text-white px-6 py-3 rounded-full text-base font-semibold hover:bg-white hover:text-black transition"
          >
            Contact Us
          </a>
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
