"use client";
import { useState } from "react";

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
        <h1 className="text-5xl font-bold">Plans</h1>
        <p className="text-gray-500 text-sm mt-2">Start building your legacy today</p>
      </section>

      {/* Pricing Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto px-8 pb-20">

        {/* Horizon */}
        <div className="bg-gray-950 rounded-2xl p-8 border border-gray-800 flex flex-col">
          <h2 className="text-xl font-bold mb-1">Horizon</h2>
          <p className="text-gray-500 text-xs mb-4">Storage Only</p>
          <div className="mb-6">
            <span className="text-4xl font-bold">$9.99</span>
            <span className="text-gray-400 ml-2">/year</span>
          </div>
          <p className="text-gray-400 text-sm mb-6">Start building your legacy before any commitment. Your content is safely stored and waiting until you are ready to activate your plan.</p>
          <ul className="flex flex-col gap-3 text-sm text-gray-300 mb-8">
            <li>• Legacy builder — build your account now, activate later</li>
            <li>• Reserve — your legacy held safely until you think the time is right</li>
          </ul>
          <button
            onClick={() => handleCheckout("price_1Tcvq1BcdnR2VoDgYustrs4G", 0)}
            disabled={loading === 0}
            className="mt-auto text-center border border-gray-600 text-gray-300 px-6 py-3 rounded-full font-semibold hover:border-white hover:text-white transition cursor-pointer"
          >
            {loading === 0 ? "Loading..." : "Get Started"}
          </button>
        </div>

        {/* Basic */}
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 flex flex-col">
          <h2 className="text-xl font-bold mb-1">Basic</h2>
          <div className="mb-6 mt-5">
            <span className="text-4xl font-bold">$39</span>
            <span className="text-gray-400 ml-2">/year</span>
          </div>
          <ul className="flex flex-col gap-3 text-sm text-gray-300 mb-8">
            <li>• 4 messages, posts, or shares (quarterly) for each year of your plan, each with an optional handwritten note</li>
            <li>• 1 video message per year</li>
          </ul>
          <button
            onClick={() => handleCheckout("price_1TeTeyBcdnR2VoDgYhf7uym0", 1)}
            disabled={loading === 1}
            className="mt-auto text-center border border-white text-white px-6 py-3 rounded-full font-semibold hover:bg-white hover:text-black transition cursor-pointer"
          >
            {loading === 1 ? "Loading..." : "Get Started"}
          </button>
        </div>

        {/* Premium */}
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 flex flex-col">
          <h2 className="text-xl font-bold mb-1">Premium</h2>
          <div className="mb-6 mt-5">
            <span className="text-4xl font-bold">$99</span>
            <span className="text-gray-400 ml-2">/year</span>
          </div>
          <ul className="flex flex-col gap-3 text-sm text-gray-300 mb-8">
            <li>• 12 messages, posts, or shares (monthly) for each year of your plan, each with an optional handwritten note</li>
            <li>• 4 video messages per year</li>
          </ul>
          <button
            onClick={() => handleCheckout("price_1Tcvj2BcdnR2VoDgt4oZu8VA", 2)}
            disabled={loading === 2}
            className="mt-auto text-center border border-white text-white px-6 py-3 rounded-full font-semibold hover:bg-white hover:text-black transition cursor-pointer"
          >
            {loading === 2 ? "Loading..." : "Get Started"}
          </button>
        </div>

        {/* Legacy */}
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 flex flex-col">
          <h2 className="text-xl font-bold mb-1">Legacy</h2>
          <div className="mb-6 mt-5">
            <span className="text-4xl font-bold">$299</span>
            <span className="text-gray-400 ml-2">/year</span>
          </div>
          <ul className="flex flex-col gap-3 text-sm text-gray-300 mb-8">
            <li>• 52 messages, posts, or shares (weekly) for each year of your plan, each with an optional handwritten note</li>
            <li>• 12 video messages per year</li>
          </ul>
          <button
            onClick={() => handleCheckout("price_1TeTj5BcdnR2VoDgtfA9O3z8", 3)}
            disabled={loading === 3}
            className="mt-auto text-center border border-white text-white px-6 py-3 rounded-full font-semibold hover:bg-white hover:text-black transition cursor-pointer"
          >
            {loading === 3 ? "Loading..." : "Get Started"}
          </button>
        </div>

      </section>

      {/* Custom & Financial Hardship */}
      <section className="max-w-2xl mx-auto px-8 pb-20 flex flex-col gap-8 text-center">

        <div className="bg-gray-900 rounded-2xl p-10 border border-gray-800">
          <h2 className="text-2xl font-bold mb-3">Custom</h2>
          <p className="text-gray-400 mb-6">Your legacy doesn't fit in a box — and your plan doesn't have to either. Work with a Posterity rep to build a custom plan that works for you.</p>
          <a href="mailto:hello@posterity.app" className="border border-gray-600 text-gray-300 px-8 py-3 rounded-full font-semibold hover:border-white hover:text-white transition">
            Contact Us
          </a>
        </div>

        <div className="bg-gray-900 rounded-2xl p-10 border border-gray-800">
          <h2 className="text-2xl font-bold mb-3">Financial Hardship</h2>
          <p className="text-gray-400 mb-6">Everyone deserves a legacy. Contact us to start building yours.</p>
          <a href="mailto:hello@posterity.app" className="border border-gray-600 text-gray-300 px-8 py-3 rounded-full font-semibold hover:border-white hover:text-white transition">
            Contact Us
          </a>
        </div>

      </section>

      {/* Footer */}
      <footer className="text-center text-gray-600 py-10 text-sm border-t border-gray-900">
        © 2026 Posterity. All rights reserved.
      </footer>

    </main>
  );
}