"use client";
import { useState } from "react";

const PLANS = [
  {
    id: "horizon",
    name: "Horizon",
    price: "$9.99",
    priceId: "price_1Tcvq1BcdnR2VoDgYustrs4G",
    border: "border-gray-800",
    description: "Your legacy starts here. Unlimited time to build your account before you commit.",
    bullets: [
      "Legacy builder — build now, activate later",
      "Your content held safely until you're ready",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    price: "$99",
    priceId: "price_1TeTeyBcdnR2VoDgYhf7uym0",
    border: "border-gray-700",
    description: "A steady cadence — quarterly messages for the people who matter most.",
    bullets: [
      "4 messages, posts, or shares per plan year",
      "1 video message per plan year",
      "Optional handwritten note per message",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$249",
    priceId: "price_1Tcvj2BcdnR2VoDgt4oZu8VA",
    border: "border-gray-600",
    badge: "Most popular",
    featured: true,
    description: "Monthly moments across the year — birthdays, anniversaries, ordinary Tuesdays.",
    bullets: [
      "12 messages, posts, or shares per plan year",
      "4 video messages per plan year",
      "Optional handwritten note per message",
    ],
  },
  {
    id: "legacy",
    name: "Legacy",
    price: "$899",
    priceId: "price_1TeTj5BcdnR2VoDgtfA9O3z8",
    border: "border-gray-700",
    badge: "Limited availability",
    description: "A message every week — a full, living presence that lasts the whole year through.",
    bullets: [
      "52 messages, posts, or shares per plan year",
      "12 video messages per plan year",
      "Optional handwritten note per message",
    ],
  },
];

export default function PlanCards() {
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
    <>
      {/* Card grid — 1-up ≤560px, 2-up ≤1040px, 4-up >1040px */}
      {/* Outer: max-width + centering only. Inner grid: 2rem padding eats into the 1280px → ~1216px card span */}
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div
          className="grid grid-cols-1 min-[561px]:grid-cols-2 min-[1041px]:grid-cols-4"
          style={{ padding: "0 2rem", gap: "1.25rem" }}
        >
          {PLANS.map((plan, i) => (
            <div
              key={plan.id}
              className={`border ${plan.border} flex flex-col min-[561px]:min-h-[525px]`}
              style={{
                backgroundColor: plan.featured ? "#262626" : "#171717",
                borderRadius: "16px",
                padding: "2.5rem",
                ...(plan.featured ? { boxShadow: "var(--glow-presence)" } : {}),
              }}
            >
              {plan.badge ? (
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-bold">{plan.name}</h2>
                  <span
                    style={{
                      background: "rgba(147,171,153,0.14)",
                      color: "#93ab99",
                      border: "1px solid rgba(147,171,153,0.32)",
                      borderRadius: "999px",
                      padding: "0.35rem 0.7rem",
                      fontSize: "12px",
                      fontWeight: 600,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      marginLeft: "0.75rem",
                      marginTop: "2px",
                    }}
                  >
                    {plan.badge}
                  </span>
                </div>
              ) : (
                <h2 className="text-xl font-bold mb-3">{plan.name}</h2>
              )}

              <div className="mb-4">
                <span className="text-[44px] font-bold leading-none">{plan.price}</span>
                <span className="text-gray-500 ml-2 text-base">/year</span>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed mb-5">{plan.description}</p>

              {/* flex-1 on the ul: bullets sit flush under description; slack falls below the last bullet */}
              <ul className="flex flex-col flex-1 text-sm text-gray-300" style={{ gap: "0.85rem" }}>
                {plan.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span className="text-gray-500 mt-0.5">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              {/* Fixed ~1.5rem gap between last bullet and button */}
              <div style={{ height: "1.5rem" }} />

              <button
                onClick={() => handleCheckout(plan.priceId, i)}
                disabled={loading === i}
                className={
                  plan.featured
                    ? "text-center bg-white text-black px-6 py-3 rounded-full text-base font-semibold hover:bg-gray-200 transition cursor-pointer disabled:opacity-50"
                    : "text-center border border-white text-white px-6 py-3 rounded-full text-base font-semibold hover:bg-white hover:text-black transition cursor-pointer disabled:opacity-50"
                }
              >
                {loading === i ? "Loading..." : "Get Started"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Serif cadence note — appears once, beneath the cards */}
      <div className="max-w-2xl mx-auto text-center px-6 py-10">
        <div className="w-10 h-px mx-auto mb-5" style={{ background: "#93ab99" }} />
        <p className="serif-accent" style={{ fontSize: "18px", lineHeight: "1.75" }}>
          Quarterly, monthly, weekly — that&rsquo;s just how we count. Every message and video message posts on any date you choose, anytime across the plan year.
        </p>
      </div>
    </>
  );
}
