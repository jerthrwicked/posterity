export default function Login() {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-10">
            <a href="/" className="text-2xl font-bold tracking-widest">POSTERITY</a>
            <p className="text-gray-400 mt-2">Welcome back</p>
          </div>
  
          {/* Form */}
          <div className="bg-gray-900 rounded-2xl p-8 flex flex-col gap-4">
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
              Log In
            </button>
          </div>
  
          {/* Signup Link */}
          <p className="text-center text-gray-400 mt-6 text-sm">
            Don't have an account?{" "}
            <a href="/signup" className="text-white underline hover:text-gray-200">Sign up</a>
          </p>
        </div>
      </main>
    );
  }