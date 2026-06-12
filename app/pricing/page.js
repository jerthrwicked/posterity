"use client";
import PlanCards from "../components/PlanCards";


export default function Pricing() {
  return (
    <main className="min-h-screen bg-black text-white">

      {/* Header */}
      <section className="text-center px-6 pt-12 pb-10">
        <h1 className="text-4xl font-bold">Plans</h1>
        <p className="text-gray-400 text-lg mt-3">Start building your legacy today.</p>
      </section>

      {/* Plan Cards (shared component — do not inline here) */}
      <PlanCards />

      {/* Custom & Grace — secondary tier, side-by-side, stacks at ≤640px */}
      <section
        className="mx-auto px-6 md:px-8 pb-20 text-center"
        style={{ maxWidth: "900px" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          <div
            className="rounded-2xl p-10 flex flex-col items-center"
            style={{ backgroundColor: "#0d0d0d", border: "1px solid #262626" }}
          >
            <h2 className="text-2xl font-bold mb-4">Custom</h2>
            <p className="text-gray-400 text-base leading-relaxed mb-8">
              Every legacy is different. If your vision doesn&rsquo;t fit a standard plan, we&rsquo;ll build something that does — contact us to get started
            </p>
            <a
              href="mailto:hello@posterity.app"
              className="inline-block border border-white text-white px-6 py-3 rounded-full text-base font-semibold hover:bg-white hover:text-black transition"
            >
              Contact Us
            </a>
          </div>

          <div
            className="rounded-2xl p-10 flex flex-col items-center"
            style={{ backgroundColor: "#0d0d0d", border: "1px solid #262626" }}
          >
            <h2 className="text-2xl font-bold mb-4">Posterity Grace</h2>
            <p className="text-gray-400 text-base leading-relaxed mb-8">
              Everyone deserves a legacy. Financial hardship shouldn&rsquo;t stand between you and your posterity. Contact us to discuss your options — we&rsquo;ll find a way forward together
            </p>
            <a
              href="mailto:hello@posterity.app"
              className="inline-block border border-white text-white px-6 py-3 rounded-full text-base font-semibold hover:bg-white hover:text-black transition"
            >
              Contact Us
            </a>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="text-gray-600 py-10 text-sm border-t border-gray-900 px-8 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.6em", color: "#ffffff" }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="36" height="36" aria-hidden="true">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#ffffff" strokeWidth="6" />
            <g transform="translate(100,100) scale(0.62) translate(-60,-58)">
              <path d="M60 36 C72 26 92 20 110 22 C96 34 80 46 66 54 C65 58 64 62 63 66 L69 94 L60 77 L51 94 L57 66 C56 62 55 58 54 54 C40 46 24 34 10 22 C28 20 48 26 60 36 Z" fill="#ffffff" />
            </g>
          </svg>
          <span style={{ fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", lineHeight: 1, fontSize: 16 }}>Posterity</span>
        </div>
        <p>© 2026 Posterity. All rights reserved.</p>
      </footer>

    </main>
  );
}
