import { useState, useEffect } from 'react'

const URGENCY_STYLES = {
  high: 'bg-red-900/30 text-red-300 border-red-800/40',
  medium: 'bg-yellow-900/30 text-yellow-300 border-yellow-800/40',
  low: 'bg-green-900/30 text-green-300 border-green-800/40',
}
const URGENCY_LABELS = {
  high: '🔴 High',
  medium: '🟡 Medium',
  low: '🟢 Low',
}
const STATUS_STYLES = {
  open: 'bg-blue-900/30 text-blue-300',
  accepted: 'bg-yellow-900/30 text-yellow-300',
  completed: 'bg-green-900/30 text-green-300',
  cancelled: 'bg-gray-700/50 text-gray-500',
}

function Avatar({ profile, size = 9 }) {
  const [imgError, setImgError] = useState(false)
  const sizeClass = `w-${size} h-${size}`
  if (profile?.avatar_url && !imgError) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.full_name}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 border-2 border-gray-700`}
      />
    )
  }
  return (
    <div className={`${sizeClass} rounded-full bg-brand-red flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {profile?.full_name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function ExpiryTimer({ expiresAt, status }) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('text-yellow-400')

  useEffect(() => {
    if (status !== 'open') return
    const update = () => {
      const diff = new Date(expiresAt) - new Date()
      if (diff <= 0) { setLabel('Expired'); setColor('text-gray-500'); return }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setColor(mins < 10 ? 'text-red-400' : 'text-yellow-400')
      setLabel(mins > 0 ? `${mins}m ${secs}s left` : `${secs}s left`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [expiresAt, status])

  if (!label || status !== 'open') return null
  return <span className={`text-xs font-mono font-semibold ${color}`}>⏰ {label}</span>
}

export default function RequestCard({
  request,
  isHelper,
  isOwn,
  onAccept,
  onBackOut,
  onComplete,
  onCancel,
  onOpenDetails,
  onOpenChat,
  accepting,
  completing,
  cancelling,
}) {
  const requester = request.requester_profile || request.profiles
  const isExpired = new Date(request.expires_at) < new Date() && request.status === 'open'

  return (
    <div
      className="bg-gray-800 rounded-2xl p-5 border border-gray-700 hover:border-gray-600 transition-all animate-fade-in cursor-pointer"
      onClick={() => onOpenDetails && onOpenDetails(request)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <Avatar profile={requester} size={9} />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-white text-sm leading-tight">
                {requester?.full_name || 'Unknown'}
              </p>
              {requester?.helps_completed > 5 && (
                <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-1.5 py-0.5 rounded-full font-medium">
                  ⭐ Trusted
                </span>
              )}
            </div>
            <p className="text-gray-500 text-xs">@{requester?.username || '—'}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${URGENCY_STYLES[request.urgency] || URGENCY_STYLES.low}`}>
            {URGENCY_LABELS[request.urgency] || '🟢 Low'}
          </span>
          <span className="text-gray-500 text-xs">⏱ {request.duration}</span>
        </div>
      </div>

      {/* Help type */}
      <h3 className="font-bold text-white text-base mb-1">{request.help_type}</h3>

      {/* Description */}
      {request.description && (
        <p className="text-gray-400 text-sm mb-2 leading-relaxed line-clamp-2">{request.description}</p>
      )}

      {/* Reason */}
      {request.reason && (
        <div className="bg-gray-900/50 rounded-lg px-3 py-2 mb-2">
          <p className="text-gray-400 text-xs">
            <span className="text-yellow-500">💡 </span>
            <span className="text-gray-500 font-medium">"{request.reason}"</span>
          </p>
        </div>
      )}

      {/* Status badge (for own requests) */}
      {isOwn && (
        <div className="mb-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[request.status] || STATUS_STYLES.open}`}>
            {request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}
          </span>
        </div>
      )}

      {/* Expiry timer */}
      <div className="mb-2">
        <ExpiryTimer expiresAt={request.expires_at} status={request.status} />
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-2 border-t border-gray-700/50"
        onClick={e => e.stopPropagation()}
      >
        <span className="text-gray-500 text-xs font-mono">
          🤝 {requester?.helps_completed || 0} helps
        </span>

        <div className="flex gap-2">
          {/* Cancel button for own open requests */}
          {isOwn && request.status === 'open' && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel && onCancel(request) }}
              disabled={cancelling}
              className="text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-700 bg-red-900/10 hover:bg-red-900/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            >
              {cancelling ? <span className="flex items-center gap-1"><div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />Cancelling</span> : '✕ Cancel'}
            </button>
          )}

          {isHelper ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onOpenChat && onOpenChat(request) }}
                className="text-brand-blue border border-brand-blue/30 hover:bg-brand-blue/10 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              >
                💬 Chat
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onBackOut && onBackOut(request) }}
                disabled={completing}
                className="text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-700/50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
              >
                Back Out
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onComplete && onComplete(request) }}
                disabled={completing}
                className="bg-brand-green hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-1"
              >
                {completing ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '✓'} Done
              </button>
            </>
          ) : !isOwn && (
            <button
              onClick={(e) => { e.stopPropagation(); onAccept && onAccept(request) }}
              disabled={accepting || isExpired}
              className="bg-brand-green hover:bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              {accepting ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {isExpired ? 'Expired' : 'Accept'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}