'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Wordmark } from '../components/brand/Wordmark'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
      } else {
        setUser(user)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex justify-between items-center px-8 py-6 border-b border-gray-800">
        <Wordmark size="sm" withMark />
        <button onClick={handleLogout} className="text-gray-400 hover:text-white transition text-sm">
          Log Out
        </button>
      </nav>
      <div className="max-w-4xl mx-auto px-8 py-16">
        <h2 className="text-4xl font-bold mb-2">
          Welcome, {user?.user_metadata?.full_name || 'Friend'}.
        </h2>
        <p className="text-gray-400 mb-12">Your legacy starts here.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-gray-600 transition cursor-pointer">
            <h3 className="text-xl font-bold mb-2">My Messages</h3>
            <p className="text-gray-400 text-sm">Write and schedule messages for your loved ones.</p>
            <p className="text-3xl font-bold mt-6">0</p>
            <p className="text-gray-600 text-sm">messages created</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-gray-600 transition cursor-pointer">
            <h3 className="text-xl font-bold mb-2">Trusted Contacts</h3>
            <p className="text-gray-400 text-sm">People who can confirm your passing.</p>
            <p className="text-3xl font-bold mt-6">0</p>
            <p className="text-gray-600 text-sm">contacts added</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-gray-600 transition cursor-pointer">
            <h3 className="text-xl font-bold mb-2">My Plan</h3>
            <p className="text-gray-400 text-sm">Manage your subscription.</p>
            <p className="text-3xl font-bold mt-6">Free</p>
            <p className="text-gray-600 text-sm">current plan</p>
          </div>
        </div>
        <div className="mt-8 bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h3 className="text-xl font-bold mb-2">Check-In Status</h3>
          <p className="text-gray-400 text-sm mb-6">Let us know you're still here. Your content won't be delivered as long as you check in.</p>
          <button className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition">
            ✓ I'm Still Here
          </button>
        </div>
      </div>
    </main>
  )
}