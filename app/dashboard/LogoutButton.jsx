'use client'

import { createClient } from '../../lib/supabase/client'

export function LogoutButton() {
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    // Full navigation so the proxy sees the cleared cookies.
    window.location.href = '/'
  }

  return (
    <button
      onClick={handleLogout}
      className="text-gray-400 hover:text-white transition text-sm cursor-pointer"
    >
      Log Out
    </button>
  )
}
