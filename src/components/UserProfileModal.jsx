import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Avatar({ profile, size = 80 }) {
  const [err, setErr] = useState(false)
  if (profile?.avatar_url && !err) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.full_name}
        onError={() => setErr(true)}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border-2 border-white/10 flex-shrink-0"
      />
    )
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {profile?.full_name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function getLevelInfo(helps) {
  if (helps >= 20) return { label: '🌟 Community Hero', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' }
  if (helps >= 5)  return { label: '🤝 Trusted Helper',  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' }
  return               { label: '🌱 New Helper',       color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' }
}

export default function UserProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    const fetch = async () => {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio, community, helps_completed, created_at')
        .eq('id', userId)
        .single()
      if (err) setError('Could not load profile.')
      else setProfile(data)
      setLoading(false)
    }
    fetch()
  }, [userId])

  const level = profile ? getLevelInfo(profile.helps_completed || 0) : null

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-card rounded-2xl w-full max-w-sm border border-white/10 shadow-2xl animate-slide-up overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div className="h-20 bg-gradient-to-br from-green-500/20 via-blue-500/10 to-purple-500/20 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/30 hover:bg-black/50 flex items-center justify-center text-white/70 hover:text-white transition-all text-sm"
          >✕</button>
        </div>

        <div className="px-6 pb-6">
          {/* Avatar overlaps header */}
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="ring-4 ring-[#0D0D0D] rounded-full">
              {loading
                ? <div className="w-20 h-20 rounded-full bg-white/10 animate-pulse" />
                : <Avatar profile={profile} size={80} />
              }
            </div>
            {profile && (
              <div className="mb-1">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${level.bg} ${level.color}`}>
                  {level.label}
                </span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="skeleton h-5 w-40 rounded" />
              <div className="skeleton h-3.5 w-24 rounded" />
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-3/4 rounded" />
            </div>
          ) : error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : profile ? (
            <div className="space-y-4">
              {/* Name + username */}
              <div>
                <h2 className="text-xl font-bold text-white leading-tight">{profile.full_name}</h2>
                <p className="text-gray-500 text-sm">@{profile.username}</p>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-gray-400 text-sm leading-relaxed">{profile.bio}</p>
              )}

              {/* Stats row */}
              <div className="flex gap-3">
                <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                  <p className="text-2xl font-extrabold text-green-400">{profile.helps_completed || 0}</p>
                  <p className="text-gray-600 text-xs mt-0.5">helps done</p>
                </div>
                <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                  <p className="text-sm font-bold text-white mt-1">
                    {profile.created_at
                      ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      : '—'}
                  </p>
                  <p className="text-gray-600 text-xs mt-0.5">member since</p>
                </div>
              </div>

              {/* Community */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>📍</span>
                <span>{profile.community || 'No community set'}</span>
              </div>

              {/* Trusted badge */}
              {(profile.helps_completed || 0) > 5 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <span>⭐</span>
                  <p className="text-yellow-400 text-sm font-semibold">Trusted Community Member</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
