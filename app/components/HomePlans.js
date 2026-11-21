"use client";
// The homepage's plans. Below 1024px a switch shows one plan at a time, starting on
// Premium; from 1024px all four sit side by side in one card. The card copy comes
// from PlanCards, so the homepage and /pricing read the same words. The homepage
// leaves out the handwritten note, which /pricing carries, and says what each
// delivery type holds where it first appears.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS as PLAN_CATALOG } from "../../lib/posterity/plans";
import { PLANS as CARDS, ADD_A_PLAN, CHECKOUT_FAILED } from "./PlanCards";
import { WarningMark } from "./StatusMarks";

const PREMIUM = CARDS.findIndex((plan) => plan.featured);

// Horizon keeps its own bullets. A plan's delivery counts are read from the catalog,
// each with what that delivery type holds.
function bullets(plan) {
  if (plan.id === "horizon") return plan.bullets.map((text) => ({ text }));
  const { standard, feature } = PLAN_CATALOG[plan.id];
  return [
    { text: `${standard} Standard ${standard === 1 ? "Delivery" : "Deliveries"}`, holds: "(text and photos)" },
    { text: `${feature} Feature ${feature === 1 ? "Delivery" : "Deliveries"}`, holds: "(with video)" },
  ];
}

function PlanBody({ plan }) {
  return (
    <div className="grid gap-2">
      <h3 className={`text-[20px] lg:text-[17px] font-bold ${plan.featured ? "text-[color:var(--paper-sage)]" : ""}`}>{plan.name}</h3>
      <p>
        <span className="text-[36px] lg:text-[30px] font-bold leading-none tracking-[-0.02em]">{PLAN_CATALOG[plan.id]?.price ?? plan.price}</span>
        <span className="ml-1 text-[13px] text-[color:var(--paper-quiet)]">/year</span>
      </p>
      <p className="text-[13px] leading-[1.5] text-[color:var(--paper-ink-3)]">{plan.description}</p>
      <ul className="mt-1 grid list-disc gap-1.5 pl-[18px] text-[13.5px] leading-[1.45] text-[color:var(--paper-ink-2)]">
        {bullets(plan).map((b) => (
          <li key={b.text}>
            {b.text}
            {b.holds && (
              <>
                {" "}<span className="text-[color:var(--paper-quiet)]">{b.holds}</span> per plan year
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const BUTTON =
  "inline-block border border-[color:var(--paper-ink)] text-[color:var(--paper-ink)] px-6 py-2.5 rounded-full text-[15px] font-semibold hover:bg-[color:var(--paper-ink)] hover:text-white transition cursor-pointer disabled:opacity-50";

export default function HomePlans() {
  const router = useRouter();
  const [shown, setShown] = useState(PREMIUM);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // Horizon is the storage fee, bought through Stripe's payment form, as on /pricing.
  const startHorizon = async () => {
    setLoading(true);
    setFailed(false);
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "horizon" }),
    }).catch(() => null);
    if (res && res.status === 401) {
      router.push("/login?next=/");
      return;
    }
    const data = res ? await res.json().catch(() => ({})) : {};
    if (data && data.url) {
      window.location.href = data.url;
    } else {
      setLoading(false);
      setFailed(true);
    }
  };

  const button = (plan) =>
    plan.id === "horizon" ? (
      <button type="button" onClick={startHorizon} disabled={loading} data-plan="horizon" className={BUTTON}>
        {loading ? "Loading..." : "Get Started"}
      </button>
    ) : (
      <a href={ADD_A_PLAN} data-plan={plan.id} className={BUTTON} style={{ textDecoration: "none" }}>
        Get Started
      </a>
    );

  const failure = (plan) =>
    failed && plan.id === "horizon" ? (
      <p role="alert" className="mt-3 inline-flex items-start gap-2 text-left text-sm text-[color:var(--paper-rose)]">
        <WarningMark className="mt-0.5" />
        {CHECKOUT_FAILED}
      </p>
    ) : null;

  const current = CARDS[shown];

  return (
    <>
      {/* Phone and tablet: one plan at a time */}
      <div className="mx-auto max-w-[400px] px-6 lg:hidden">
        <div className="rounded-2xl bg-[color:var(--paper)] p-4 text-[color:var(--paper-ink)]">
          <div role="tablist" aria-label="Plans" className="mb-[18px] grid grid-cols-4 rounded-full bg-[#f2f2f2] p-[3px]">
            {CARDS.map((plan, i) => (
              <button
                key={plan.id}
                type="button"
                role="tab"
                id={`plan-tab-${plan.id}`}
                aria-selected={shown === i}
                aria-controls="plan-panel"
                onClick={() => setShown(i)}
                className={`rounded-full py-2 text-[12.5px] font-semibold transition-colors ${
                  shown === i
                    ? plan.featured
                      ? "bg-[color:var(--paper-sage)] text-white"
                      : "bg-[color:var(--paper-ink)] text-white"
                    : "text-[color:var(--paper-ink-3)]"
                }`}
              >
                {plan.name}
              </button>
            ))}
          </div>
          <div role="tabpanel" id="plan-panel" aria-labelledby={`plan-tab-${current.id}`}>
            <PlanBody plan={current} />
            <div className="mt-[18px] text-center">
              {button(current)}
              {failure(current)}
            </div>
          </div>
        </div>
      </div>

      {/* From 1024px: all four in one card */}
      <div className="mx-auto hidden max-w-[1100px] px-8 lg:block">
        <div className="grid grid-cols-4 rounded-2xl bg-[color:var(--paper)] p-2 text-[color:var(--paper-ink)]">
          {CARDS.map((plan, i) => (
            <div
              key={plan.id}
              className={`flex flex-col p-6 ${
                plan.featured
                  ? "rounded-xl border border-[color:var(--paper-sage-edge)] shadow-[0_0_0_1px_var(--paper-sage-edge)]"
                  : i > 0 && !CARDS[i - 1].featured
                    ? "border-l border-[#e6e6e6]"
                    : ""
              }`}
            >
              <PlanBody plan={plan} />
              <div className="mt-auto pt-5 text-center">
                {button(plan)}
                {failure(plan)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
