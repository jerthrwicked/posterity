export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 md:py-32">
        <h2 className="text-4xl md:text-6xl font-bold leading-tight max-w-3xl">
          Your voice.<br />Forever.
        </h2>
        <p className="mt-6 text-base md:text-xl text-gray-400 max-w-xl leading-relaxed">
          Posterity lets you schedule messages, memories, and moments to be shared with the people you love — even after you're gone.
        </p>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 md:px-8 py-16 max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <h3 className="text-xl font-bold mb-3">Schedule Messages</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Write letters, record videos, and schedule posts to be delivered exactly when you want.
          </p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <h3 className="text-xl font-bold mb-3">Trusted Delivery</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Assign trusted contacts or use our check-in system to ensure your content reaches the right people.
          </p>
        </div>
        <a href="/pricing" className="bg-gray-800 rounded-2xl p-8 border border-gray-700 hover:bg-gray-700 transition block">
          <h3 className="text-xl font-bold mb-3">Choose Your Plan</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Flexible plans for every need. From basic to legacy, your voice deserves the right home.
          </p>
        </a>
      </section>

      {/* Footer */}
      <footer className="text-center text-gray-600 py-10 text-sm border-t border-gray-900">
        © 2026 Posterity. All rights reserved.
      </footer>
    </main>
  );
}
