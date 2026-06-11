import { Wordmark } from '../components/brand/Wordmark'

export default function Pricing() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-6">
        <a href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
          <Wordmark size="md" withMark />
        </a>
        <div className="flex gap-6">
          <a href="/login" className="text-gray-400 hover:text-white transition">Login</a>
          <a href="/signup" className="bg-white text-black px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-200 transition">Get Started</a>
        </div>
      </nav>

      {/* Header */}
      <section className="text-center px-6 py-16">
        <h1 className="text-5xl font-bold mb-4">Choose Your Legacy</h1>
        <p className="text-gray-400 text-xl max-w-xl mx-auto">Simple, transparent pricing. Cancel anytime.</p>
      </section>

      {/* Pricing Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-8 pb-20">

        {/* Basic */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 flex flex-col">
          <h2 className="text-xl font-bold mb-2">Basic</h2>
          <p className="text-gray-400 text-sm mb-6">For those just getting started.</p>
          <div className="mb-6">
            <span className="text-5xl font-bold">$39</span>
            <span className="text-gray-400 ml-2">/year</span>
          </div>
          <ul className="flex flex-col gap-3 text-sm text-gray-300 mb-8">
            <li>✓ 5 scheduled posts</li>
            <li>✓ Text messages</li>
            <li>✓ 1 trusted contact</li>
            <li>✓ Check-in system</li>
            <li>✓ Email delivery</li>
          </ul>
          <a href="/signup" className="mt-auto text-center border border-white text-white px-6 py-3 rounded-full font-semibold hover:bg-white hover:text-black transition">
            Get Started
          </a>
        </div>

        {/* Premium - Most Popular */}
        <div className="bg-white text-black rounded-2xl p-8 border border-white flex flex-col relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-bold px-4 py-1 rounded-full border border-gray-700">
            MOST POPULAR
          </div>
          <h2 className="text-xl font-bold mb-2">Premium</h2>
          <p className="text-gray-600 text-sm mb-6">For those serious about their legacy.</p>
          <div className="mb-6">
            <span className="text-5xl font-bold">$99</span>
            <span className="text-gray-600 ml-2">/year</span>
          </div>
          <ul className="flex flex-col gap-3 text-sm text-gray-700 mb-8">
            <li>✓ 16 scheduled posts</li>
            <li>✓ Text, photo & video</li>
            <li>✓ 3 trusted contacts</li>
            <li>✓ Check-in system</li>
            <li>✓ Email & SMS delivery</li>
            <li>✓ Priority support</li>
          </ul>
          <a href="/signup" className="mt-auto text-center bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition">
            Get Started
          </a>
        </div>

        {/* Legacy */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 flex flex-col">
          <h2 className="text-xl font-bold mb-2">Legacy</h2>
          <p className="text-gray-400 text-sm mb-6">For those who want to leave everything behind.</p>
          <div className="mb-6">
            <span className="text-5xl font-bold">$299</span>
            <span className="text-gray-400 ml-2">/year</span>
          </div>
          <ul className="flex flex-col gap-3 text-sm text-gray-300 mb-8">
            <li>✓ 60 scheduled posts</li>
            <li>✓ Text, photo & video</li>
            <li>✓ Unlimited trusted contacts</li>
            <li>✓ Check-in system</li>
            <li>✓ Email, SMS & social delivery</li>
            <li>✓ Dedicated account rep</li>
            <li>✓ Quarterly special content</li>
          </ul>
          <a href="/signup" className="mt-auto text-center border border-white text-white px-6 py-3 rounded-full font-semibold hover:bg-white hover:text-black transition">
            Get Started
          </a>
        </div>

      </section>

      {/* Build Your Own */}
      <section className="text-center px-6 pb-20">
        <div className="bg-gray-900 rounded-2xl p-10 max-w-2xl mx-auto border border-gray-800">
          <h2 className="text-2xl font-bold mb-3">Build Your Own</h2>
          <p className="text-gray-400 mb-6">Need something custom? Work directly with our team to create a plan that fits your unique needs.</p>
          <a href="mailto:hello@posterity.app" className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition">
            Contact Us
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-gray-600 py-10 text-sm">
        © 2026 Posterity. All rights reserved.
      </footer>
    </main>
  )
}
