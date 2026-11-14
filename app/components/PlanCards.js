"use client";
import { useState } from "react";
import { PLANS as PLAN_CATALOG } from "../../lib/posterity/plans";
import { WarningMark } from "./StatusMarks";

// Horizon is the storage fee, bought here on its own through Stripe's payment
// form. Basic, Premium and Legacy are plans: each button opens Add a plan,
// where the plan is placed on its year, and the plan is paid for from the cart
// within User Profiles. A visitor who is signed out signs in on the way.
const ADD_A_PLAN = "/dashboard/add-plan";

// Shown beneath Horizon's button when its checkout fails to open. Awaits approved copy.
const CHECKOUT_FAILED = "[Placeholder: Product surface copy — error messages: a checkout that fails to open]";

// A tier's delivery counts read from the catalog, in the specification's terms.
function deliveryBullets(id) {
  const { standard, feature } = PLAN_CATALOG[id];
  return [
    `${standard} Standard ${standard === 1 ? "Delivery" : "Deliveries"} per plan year`,
    `${feature} Feature ${feature === 1 ? "Delivery" : "Deliveries"} per plan year`,
  ];
}

const PLANS = [
  {
    id: "horizon",
    name: "Horizon",
    price: "$9.99",
    priceId: "price_1UHEk8BcdnR2VoDg768Poe7B",
    border: "border-[color:var(--paper)]",
    description: "Your legacy starts here. Unlimited time to build your account before you commit.",
    bullets: [
      "Legacy builder — build now, initiate later",
      "Safely store your content until your account becomes active",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    price: "$49",
    priceId: "price_1TcvdEBcdnR2VoDgGEYC3RtA",
    border: "border-[color:var(--paper)]",
    description: "A steady cadence — quarterly messages for the people who matter most.",
    bullets: [
      ...deliveryBullets("basic"),
      "Optional handwritten note per delivery",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$129",
    priceId: "price_1TtgZxBcdnR2VoDgc40u5BRt",
    border: "border-[color:var(--paper-sage-edge)] shadow-[0_0_0_1px_var(--paper-sage-edge),0_0_80px_rgba(147,171,153,0.22)]",
    badge: "Most popular",
    featured: true,
    description: "Monthly moments across the year — birthdays, anniversaries, ordinary Tuesdays.",
    bullets: [
      ...deliveryBullets("premium"),
      "Optional handwritten note per delivery",
    ],
  },
  {
    id: "legacy",
    name: "Legacy",
    price: "$399",
    priceId: "price_1TtgZxBcdnR2VoDgLqiUvC3j",
    border: "border-[color:var(--paper)]",
    badge: "Limited availability",
    description: "A message every week — a full, living presence that lasts the whole year through.",
    bullets: [
      ...deliveryBullets("legacy"),
      "Optional handwritten note per delivery",
    ],
  },
];

export default function PlanCards() {
  const [loading, setLoading] = useState(null);
  const [failed, setFailed] = useState(null);

  const handleCheckout = async (planId, index) => {
    setLoading(index);
    setFailed(null);
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planId }),
    }).catch(() => null);
    if (res && res.status === 401) {
      // must be signed in to check out — the server owns the price, so this is required
      window.location.href = "/login?next=/pricing";
      return;
    }
    const data = res ? await res.json().catch(() => ({})) : {};
    if (data && data.url) {
      window.location.href = data.url;
    } else {
      // The button returns to rest, and the card says checkout did not open.
      setLoading(null);
      setFailed(index);
    }
  };

  return (
    <>
      {/* Card grid — one column on a phone, two across from 768px, within the page's column */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          {PLANS.map((plan, i) => (
            <div
              key={plan.id}
              className={`border ${plan.border} bg-[color:var(--paper)] flex flex-col`}
              style={{
                borderRadius: "16px",
                padding: "2.5rem",
              }}
            >
              {plan.badge ? (
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-bold text-[color:var(--paper-ink)]">{plan.name}</h2>
                  <span
                    style={{
                      background: "rgba(124,148,130,0.14)",
                      color: "#4f6b57",
                      border: "1px solid rgba(124,148,130,0.45)",
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
                <h2 className="text-xl font-bold mb-3 text-[color:var(--paper-ink)]">{plan.name}</h2>
              )}

              <div className="mb-4">
                <span className="text-[44px] font-bold leading-none text-[color:var(--paper-ink)]">{PLAN_CATALOG[plan.id]?.price ?? plan.price}</span>
                <span className="text-[color:var(--paper-quiet)] ml-2 text-base">/year</span>
              </div>

              <p className="text-[color:var(--paper-ink-3)] text-sm leading-relaxed mb-5">{plan.description}</p>

              {/* flex-1 on the ul: bullets sit flush under description; slack falls below the last bullet */}
              <ul className="flex flex-col flex-1 text-sm text-[color:var(--paper-ink-2)]" style={{ gap: "0.85rem" }}>
                {plan.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span className="text-[color:var(--paper-quiet)] mt-0.5">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              {/* Fixed ~1.5rem gap between last bullet and button */}
              <div style={{ height: "1.5rem" }} />

              {plan.id === "horizon" ? (
                <button
                  onClick={() => handleCheckout(plan.id, i)}
                  disabled={loading === i}
                  data-plan={plan.id}
                  className="self-start border border-[color:var(--paper-ink)] text-[color:var(--paper-ink)] px-6 py-3 rounded-full text-base font-semibold hover:bg-[color:var(--paper-ink)] hover:text-white transition cursor-pointer disabled:opacity-50"
                >
                  {loading === i ? "Loading..." : "Get Started"}
                </button>
              ) : (
                <a
                  href={ADD_A_PLAN}
                  data-plan={plan.id}
                  className={
                    plan.featured
                      ? "self-start bg-[color:var(--paper-ink)] text-white px-6 py-3 rounded-full text-base font-semibold hover:bg-[#333333] transition cursor-pointer"
                      : "self-start border border-[color:var(--paper-ink)] text-[color:var(--paper-ink)] px-6 py-3 rounded-full text-base font-semibold hover:bg-[color:var(--paper-ink)] hover:text-white transition cursor-pointer"
                  }
                  style={{ textDecoration: "none" }}
                >
                  Get Started
                </a>
              )}
              {failed === i && (
                <p role="alert" className="text-sm text-center text-[color:var(--paper-rose)] mt-3 inline-flex items-start justify-center gap-2"><WarningMark className="mt-0.5" />{CHECKOUT_FAILED}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Serif cadence note — appears once, beneath the cards */}
      <div className="max-w-2xl mx-auto text-center px-6 py-10">
        <div className="w-10 h-px mx-auto mb-5" style={{ background: "#93ab99" }} />
        <p className="serif-accent" style={{ fontSize: "18px", lineHeight: "1.75" }}>
          Quarterly, monthly, weekly — that&rsquo;s just how we count. Every delivery posts on any date you choose, anytime across the plan year.
        </p>
      </div>
    </>
  );
}
