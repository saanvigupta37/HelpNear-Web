import { useState, useEffect } from 'react'

const URGENCY_CONFIG = {
  high:   { label: 'Urgent',       dot: 'bg-red-500 animate-pulse-soft',    badge: 'bg-red-500/15 text-red-400 border-red-500/30' },
  medium: { label: 'Normal',       dot: 'bg-yellow-400',                    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  low:    { label: 'Low priority', dot: 'bg-green-500',                     badge: 'bg-green-500/15 text-green-400 border-green-500/30' },
}

const STATUS_CONFIG = {
  open:      { label: 'Open',      cls: 'bg-blue-500/15 text-blue-400' },
  accepted:  { label: 'Accepted',  cls: 'bg-yellow-500/15 text-yellow-400' },
  completed: { label: 'Completed', cls: 'bg-green-500/15 text-green-400' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-700/50 text-gray-500' },
}

function Avatar({ profile, size = 36, onClick }) {
  const [err, setErr] = useState(false)
  const cls = `rounded-full flex-shrink-0 ${onClick ? 'cursor-pointer hover:opacity-75 hover:scale-105 transition-all' : ''}`

  if (profile?.avatar_url && !err) {
    return (
      <img src={profile.avatar_url} alt="" onError={() => setErr(true)}
        onClick={onClick} style={{ width: size, height: size }}
        className={`${cls} object-cover border-2 border-white/10`} />
    )
  }
  return (
    <div onClick={onClick}
      className={`${cls} bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold`}
      style={{ width: size, height: size, fontSize: Math.floor(size * 0.4) }}>
      {profile?.full_name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function ExpiryTimer({ expiresAt, status }) {
  const [label, setLabel] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    if (status !== 'open') return
    const tick = () => {
      const diff = new Date(expiresAt) - new Date()
      if (diff <= 0) { setLabel('Expired'); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setUrgent(m < 10)
      setLabel(m > 0 ? `${m}m ${s}s` : `${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt, status])

  if (!label || status !== 'open') return null
  return (
    <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${urgent ? 'text-red-400 bg-red-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>
      ⏰ {label}
    </span>
  )
}

export default function RequestCard({
  request, isHelper, isOwn,
  onAccept, onBackOut, onComplete, onCancel,
  onOpenDetails, onOpenChat, onViewProfile,
  accepting, completing, cancelling,
}) {
  const requester = request.requester_profile || request.profiles
  const urgency = URGENCY_CONFIG[request.urgency] || URGENCY_CONFIG.low
  const isExpired = new Date(request.expires_at) < new Date() && request.status === 'open'

  return (
    <div
      className="glass-card rounded-2xl p-4 card-lift cursor-pointer group relative overflow-hidden"
      onClick={() => onOpenDetails?.(request)}
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-px ${
        request.urgency === 'high' ? 'bg-gradient-to-r from-transparent via-red-500/50 to-transparent' :
        request.urgency === 'medium' ? 'bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent' :
        'bg-gradient-to-r from-transparent via-green-500/40 to-transparent'
      }`} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Clickable avatar */}
          <div onClick={e => { e.stopPropagation(); onViewProfile?.(requester?.id) }}>
            <Avatar profile={requester} size={36} onClick={onViewProfile ? () => {} : undefined} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Clickable name */}
              <button
                onClick={e => { e.stopPropagation(); onViewProfile?.(requester?.id) }}
                className="font-semibold text-white text-sm leading-tight hover:text-green-400 transition-colors truncate max-w-[120px]"
              >
                {requester?.full_name || 'Unknown'}
              </button>
              {requester?.helps_completed > 5 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex-shrink-0">
                  ⭐ Trusted
                </span>
              )}
            </div>
            <p className="text-gray-500 text-xs">@{requester?.username || '—'}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold flex items-center gap-1.5 ${urgency.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${urgency.dot}`} />
            {urgency.label}
          </span>
          <span className="text-gray-500 text-xs">⏱ {request.duration}</span>
        </div>
      </div>

      <h3 className="font-bold text-white text-base mb-1.5">{request.help_type}</h3>

      {request.description && (
        <p className="text-gray-400 text-sm mb-2 leading-relaxed line-clamp-2">{request.description}</p>
      )}

      {request.reason && (
        <div className="bg-white/[0.03] rounded-xl px-3 py-2 mb-2 border border-white/[0.06]">
          <p className="text-gray-400 text-xs">
            <span className="text-yellow-500/80">💡 </span>
            <span className="italic">"{request.reason}"</span>
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {isOwn && request.status && (
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_CONFIG[request.status]?.cls || ''}`}>
            {STATUS_CONFIG[request.status]?.label}
          </span>
        )}
        <ExpiryTimer expiresAt={request.expires_at} status={request.status} />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]" onClick={e => e.stopPropagation()}>
        <span className="text-gray-500 text-xs font-mono">🤝 {requester?.helps_completed || 0} helps</span>

        <div className="flex gap-2">
          {isOwn && request.status === 'open' && (
            <button
              onClick={e => { e.stopPropagation(); onCancel?.(request) }}
              disabled={cancelling}
              className="text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 bg-red-500/5 hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
            >
              {cancelling
                ? <span className="flex items-center gap-1"><div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />...</span>
                : '✕ Cancel'}
            </button>
          )}

          {isHelper ? (
            <>
              <button onClick={e => { e.stopPropagation(); onOpenChat?.(request) }}
                className="text-blue-400 border border-blue-500/20 hover:bg-blue-500/10 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95">
                💬 Chat
              </button>
              <button onClick={e => { e.stopPropagation(); onBackOut?.(request) }}
                disabled={completing}
                className="text-gray-400 hover:text-red-400 border border-white/[0.08] hover:border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-50">
                Back Out
              </button>
              <button onClick={e => { e.stopPropagation(); onComplete?.(request) }}
                disabled={completing}
                className="bg-green-500 hover:bg-green-400 text-black font-bold px-3 py-1.5 rounded-lg text-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-1">
                {completing ? <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> : '✓'} Done
              </button>
            </>
          ) : !isOwn && (
            <button onClick={e => { e.stopPropagation(); onAccept?.(request) }}
              disabled={accepting || isExpired}
              className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold px-4 py-1.5 rounded-lg text-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 glow-green">
              {accepting ? <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> : null}
              {isExpired ? 'Expired' : 'Accept'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
