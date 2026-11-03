'use client'

import { useState } from 'react'
import { createClient } from '../../lib/supabase/client'

// Sets the password on the session the reset link opened. The same rule as
// signup: at least 8 characters. Once it is set, a full navigation to the
// dashboard, so the proxy sees the session cookies on a fresh request.

export function NewPasswordForm({ email }) {
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    if (password.length < 8) return setError('Please choose a password of at least 8 characters.')
    if (password !== again) return setError('Those two passwords do not match.')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    window.location.href = '/dashboard'
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-8 flex flex-col gap-4">
      <p className="text-sm text-gray-400">
        Signed in as <span className="text-white">{email}</span>
      </p>
      <div>
        <label htmlFor="password" className="text-sm text-gray-400 mb-1 block">New password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
        />
      </div>
      <div>
        <label htmlFor="again" className="text-sm text-gray-400 mb-1 block">New password, again</label>
        <input
          id="again"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleSave()}
          className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
        />
      </div>
      {error && <p className="text-sm text-center text-red-400">{error}</p>}
      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full bg-white text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition mt-2 disabled:opacity-50 cursor-pointer"
      >
        {loading ? 'Saving...' : 'Save new password'}
      </button>
    </div>
  )
}
