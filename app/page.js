export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 md:py-32">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight max-w-3xl">
          Your Voice.<br />Forever.
        </h1>
        <div className="mt-8 md:mt-10 space-y-3 max-w-2xl">
          <p className="text-lg md:text-2xl text-gray-300 leading-relaxed">
            Messages, memories, and videos — delivered to the ones you love, even after you're gone
          </p>
          <p className="text-base md:text-lg text-gray-500 leading-relaxed">
            Say the things too important to leave unsaid
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 md:px-8 py-16 max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <h3 className="text-xl font-bold mb-3">A Living Legacy</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Build a custom delivery calendar of messages, videos, and memories. Your content reaches the people you choose, on the dates you set — long after you're gone.
          </p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <h3 className="text-xl font-bold mb-3">On Your Terms</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            You build it. You preview it. You control it. Nothing moves until you're ready — and when you are, your account begins its journey through six carefully designed phases.
          </p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <h3 className="text-xl font-bold mb-3">Fully Automated. Fully Protected</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Your legacy fund is untouched until your account activates. Every delivery, every notification, every transfer — automated with a full audit trail and zero employee access to your funds.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-gray-600 py-10 text-sm border-t border-gray-900">
        © 2026 Posterity. All rights reserved.
      </footer>
    </main>
  );
}
