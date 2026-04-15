import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CommunityModal from './CommunityModal'

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

  const NavItem = ({ to, icon, label, onClick, active: forceActive }) => {
    const active = forceActive || (to && location.pathname === to)
    const cls = `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all w-full text-left ${
      active
        ? 'bg-brand-red/10 text-brand-red border border-brand-red/20'
        : 'text-gray-400 hover:text-white hover:bg-gray-800'
    }`
    if (onClick) return (
      <button onClick={onClick} className={cls}>
        <span className="text-lg">{icon}</span>
        <span className="truncate">{label}</span>
      </button>
    )
    return (
      <Link to={to} className={cls}>
        <span className="text-lg">{icon}</span>
        <span className="truncate">{label}</span>
      </Link>
    )
  }

  const communityLabel = profile?.community
    ? (profile.community.length > 14 ? profile.community.slice(0, 14) + '…' : profile.community)
    : 'My Community'

  return (
    <>
      <aside className="hidden md:flex flex-col w-56 bg-gray-900 border-r border-gray-800 h-screen sticky top-0 flex-shrink-0">
        <div className="px-6 py-5 border-b border-gray-800">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-red flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-bold text-lg text-white">HelpNear</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavItem to="/dashboard" icon="🏠" label="Home" />
          <NavItem icon="📍" label={communityLabel} onClick={() => setShowCommunityModal(true)} />
          <NavItem to="/profile" icon="📊" label="My Stats" />
          <NavItem icon="⚙️" label="Settings" onClick={() => setShowSettings(v => !v)} />
          {showSettings && (
            <div className="ml-3 pl-3 border-l border-gray-700 space-y-1 animate-fade-in">
              <Link to="/profile" className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all text-sm">
                👤 Edit Profile
              </Link>
              <button
                onClick={() => navigator.clipboard.writeText(window.location.origin)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all text-sm w-full text-left"
              >
                🔗 Copy App Link
              </button>
            </div>
          )}
        </nav>

        {profile && (
          <div className="px-4 py-3 border-t border-gray-800">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {profile.full_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold truncate">{profile.full_name}</p>
                <p className="text-gray-500 text-xs truncate">@{profile.username}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-all text-sm font-semibold"
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