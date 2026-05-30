"use client";
import { useState } from "react";

const tiers = [
  {
    name: "Posterity Basic",
    price: "$49",
    period: "/year",
    priceId: "price_1TcvdEBcdnR2VoDgGEYC3RtA",
    description: "Schedule one message or memory per quarter, each with an optional handwritten note. Plus one video message per year. Keep your voice alive for the people you love.",
    buttonText: "Get Started",
    contact: false,
  },
  {
    name: "Posterity Premium",
    price: "$99",
    period: "/year",
    priceId: "price_1Tcvj2BcdnR2VoDgt4oZu8VA",
    description: "Schedule one message or memory per month, each with an optional handwritten note. Plus a video message every quarter. Stay present in the lives of those who matter most.",
    buttonText: "Get Started",
    contact: false,
  },
  {
    name: "Posterity Super Premium",
    price: "$199",
    period: "/year",
    priceId: "price_1TcvjyBcdnR2VoDgq3uxVHRg",
    description: "Schedule a message or memory every week, each with an optional handwritten note. Plus a monthly video message. The most complete way to leave your legacy.",
    buttonText: "Get Started",
    contact: false,
  },
  {
    name: "Posterity Storage Only",
    price: "$9.99",
    period: "/year",
    priceId: "price_1Tcvq1BcdnR2VoDgYustrs4G",
    description: "The perfect way to start your Posterity journey.",
    bullets: [
      "Start building your legacy before committing to a full plan",
      "Keep your account safely stored while your scheduled posts await future delivery",
      "Content is not delivered until a plan is activated",
      "Upgrade to any plan directly from your dashboard",
    ],
    buttonText: "Start Building",
    contact: false,
  },
  {
    name: "Build Your Own",
    price: "Custom",
    period: "",
    priceId: null,
    description: "Your legacy doesn't fit in a box and your plan shouldn't either. Work with a Posterity rep to build something as unique as the life you've lived.",
    buttonText: "Contact Us",
    contact: true,
  },
  {
    name: "Financial Hardship",
    price: "Custom",
    period: "",
    priceId: null,
    description: "Everyone deserves to leave a message for the ones they love. Contact us to discuss a plan that works for your situation.",
    buttonText: "Contact Us",
    contact: true,
  },
];

export default function PricingPage() {
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
    <main style={{ backgroundColor: "#000", minHeight: "100vh", padding: "60px 20px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <h1 style={{ color: "#fff", fontSize: "2.5rem", textAlign: "center", marginBottom: "16px" }}>
          Choose Your Plan
        </h1>
        <p style={{ color: "#aaa", textAlign: "center", fontSize: "1.1rem", marginBottom: "60px" }}>
          Your voice. Your legacy. Your terms.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          {tiers.map((tier, i) => (
            <div key={i} style={{ backgroundColor: "#111", border: "1px solid #222", borderRadius: "12px", padding: "32px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ color: "#fff", fontSize: "1.3rem", marginBottom: "8px" }}>{tier.name}</h2>
                <div style={{ marginBottom: "20px" }}>
                  <span style={{ color: "#fff", fontSize: "2rem", fontWeight: "bold" }}>{tier.price}</span>
                  <span style={{ color: "#aaa", fontSize: "1rem" }}>{tier.period}</span>
                </div>
                <p style={{ color: "#bbb", fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "16px" }}>{tier.description}</p>
                {tier.bullets && (
                  <ul style={{ paddingLeft: "20px", color: "#fff", fontSize: "0.9rem", lineHeight: "1.8", listStyleType: "disc", listStyleType: "disc" }}>
                    {tier.bullets.map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                )}
              </div>
              <button
                onClick={() => tier.contact ? window.location.href = "mailto:support@posterity.app" : handleCheckout(tier.priceId, i)}
                disabled={loading === i}
                style={{ marginTop: "32px", padding: "14px", backgroundColor: tier.contact ? "transparent" : "#fff", color: tier.contact ? "#fff" : "#000", border: tier.contact ? "1px solid #fff" : "none", borderRadius: "8px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer", width: "100%" }}
              >
                {loading === i ? "Loading..." : tier.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

