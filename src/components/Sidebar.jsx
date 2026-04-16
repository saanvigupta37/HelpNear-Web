import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CommunityModal from './CommunityModal'

function Avatar({ profile }) {
  const [err, setErr] = useState(false)
  if (profile?.avatar_url && !err) {
    return (
      <img src={profile.avatar_url} alt="" onError={() => setErr(true)}
        className="w-9 h-9 rounded-full object-cover border-2 border-white/10 flex-shrink-0" />
    )
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
      {profile?.full_name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

export default function Sidebar({ profile, onProfileUpdate }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [showCommunityModal, setShowCommunityModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('helpnear_safety_accepted')
    navigate('/')
  }

  const handleCommunityUpdate = (newCommunity) => {
    if (onProfileUpdate) onProfileUpdate({ ...profile, community: newCommunity })
  }

  const communityLabel = profile?.community
    ? (profile.community.length > 13 ? profile.community.slice(0, 13) + '…' : profile.community)
    : 'My Community'

  const navBase = 'flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all w-full text-left text-sm'
  const navActive = `${navBase} bg-green-500/10 text-green-400 border border-green-500/20`
  const navIdle   = `${navBase} text-gray-500 hover:text-white hover:bg-white/[0.04]`

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className="desktop-sidebar hidden md:flex flex-col w-56 h-screen sticky top-0 flex-shrink-0 border-r border-white/[0.06]"
        style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform"
              style={{ boxShadow: '0 0 16px rgba(52,199,89,0.4)' }}>
              <span className="text-black font-black text-sm">H</span>
            </div>
            <span className="font-extrabold text-lg text-white tracking-tight">HelpNear</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Home */}
          <Link to="/dashboard"
            className={location.pathname === '/dashboard' ? navActive : navIdle}>
            <span className="text-lg">🏠</span>
            <span>Home</span>
          </Link>

          {/* My Community */}
          <button onClick={() => setShowCommunityModal(true)} className={navIdle}>
            <span className="text-lg">📍</span>
            <span className="truncate">{communityLabel}</span>
          </button>

          {/* My Stats */}
          <Link to="/profile"
            className={location.pathname === '/profile' ? navActive : navIdle}>
            <span className="text-lg">📊</span>
            <span>My Stats</span>
          </Link>

          {/* Settings */}
          <button onClick={() => setShowSettings(v => !v)} className={navIdle}>
            <span className="text-lg">⚙️</span>
            <span>Settings</span>
            <span className={`ml-auto text-xs transition-transform ${showSettings ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {showSettings && (
            <div className="ml-3 pl-3 border-l border-white/[0.07] space-y-1 animate-fade-in">
              <Link to="/profile"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.04] transition-all text-xs font-medium">
                👤 Edit Profile
              </Link>
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.origin) }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.04] transition-all text-xs font-medium w-full text-left">
                🔗 Copy App Link
              </button>
            </div>
          )}
        </nav>

        {/* User footer */}
        {profile && (
          <div className="px-4 py-4 border-t border-white/[0.06] space-y-3">
            <div className="flex items-center gap-2.5">
              <Avatar profile={profile} />
              <div className="min-w-0">
                <p className="text-white text-xs font-bold truncate">{profile.full_name}</p>
                <p className="text-gray-600 text-xs truncate">@{profile.username}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-gray-600 hover:text-red-400 hover:bg-red-500/5 transition-all text-xs font-semibold border border-transparent hover:border-red-500/20"
            >
              <span>🚪</span> Sign Out
            </button>
          </div>
        )}
      </aside>

      {showCommunityModal && profile && (
        <CommunityModal
          profile={profile}
          onClose={() => setShowCommunityModal(false)}
          onUpdate={handleCommunityUpdate}
        />
      )}
    </>
  )
}
