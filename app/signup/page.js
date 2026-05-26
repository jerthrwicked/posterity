export default function Signup() {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-10">
            <a href="/" className="text-2xl font-bold tracking-widest">POSTERITY</a>
            <p className="text-gray-400 mt-2">Create your account</p>
          </div>
  
          {/* Form */}
          <div className="bg-gray-900 rounded-2xl p-8 flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Full Name</label>
              <input
                type="text"
                placeholder="Jeremy Smith"
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
              />
            </div>
            <button className="w-full bg-white text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition mt-2">
              Create Account
            </button>
          </div>
  
          {/* Login Link */}
          <p className="text-center text-gray-400 mt-6 text-sm">
            Already have an account?{" "}
            <a href="/login" className="text-white underline hover:text-gray-200">Log in</a>
          </p>
        </div>
      </main>
    );
  }