export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-6">
        <h1 className="text-2xl font-bold tracking-widest">POSTERITY</h1>
        <div className="flex gap-6">
          <a href="/pricing" className="text-gray-400 hover:text-white transition">Pricing</a>
          <a href="/login" className="text-gray-400 hover:text-white transition">Login</a>
          <a href="/signup" className="bg-white text-black px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-200 transition">Get Started</a>
        </div>
      </nav>
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32">
        <h2 className="text-6xl font-bold leading-tight max-w-3xl">Your voice.<br />Forever.</h2>
        <p className="mt-6 text-xl text-gray-400 max-w-xl">Posterity lets you schedule messages, memories, and moments to be shared with the people you love — even after you're gone.</p>
        <a href="/signup" className="mt-10 bg-white text-black px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-200 transition">Start Your Legacy</a>
      </section>
      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 px-8 py-20 max-w-6xl mx-auto">
        <div className="bg-gray-900 rounded-2xl p-8">
          <h3 className="text-xl font-bold mb-3">Schedule Messages</h3>
          <p className="text-gray-400">Write letters, record videos, and schedule posts to be delivered exactly when you want.</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-8">
          <h3 className="text-xl font-bold mb-3">Trusted Delivery</h3>
          <p className="text-gray-400">Assign trusted contacts or use our check-in system to ensure your content reaches the right people.</p>
        </div>
        <a href="/pricing" className="bg-gray-900 rounded-2xl p-8 hover:bg-gray-800 transition">
          <h3 className="text-xl font-bold mb-3">Choose Your Plan</h3>
          <p className="text-gray-400">Flexible plans for every need. From basic to premium, your legacy deserves the right home.</p>
        </a>
      </section>
      {/* Footer */}
      <footer className="text-center text-gray-600 py-10 text-sm">
        © 2026 Posterity. All rights reserved.
      </footer>
    </main>
  );
}
