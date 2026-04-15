import { useState, useEffect } from 'react'

const URGENCY_STYLES = {
  high: 'bg-red-900/30 text-red-300 border-red-800/40',
  medium: 'bg-yellow-900/30 text-yellow-300 border-yellow-800/40',
  low: 'bg-green-900/30 text-green-300 border-green-800/40',
}

function ExpiryCountdown({ expiresAt }) {
  const [remaining, setRemaining] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt) - new Date()
      if (diff <= 0) { setRemaining('Expired'); return }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setUrgent(mins < 10)
      setRemaining(mins > 0 ? `Expires in ${mins}m ${secs}s` : `Expires in ${secs}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return (
    <span className={`text-xs font-mono font-semibold ${urgent ? 'text-red-400' : 'text-yellow-400'}`}>
      ⏰ {remaining}
    </span>
  )
}

export default function RequestDetailsModal({ request, currentUserId, isAccepted, onAccept, onChat, onClose, accepting }) {
  if (!request) return null
  const requester = request.profiles
  const isOwn = request.requester_id === currentUserId
  const isExpired = new Date(request.expires_at) < new Date()

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          <h3 className="font-bold text-white">Request Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Requester */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-red flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {requester?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-white">{requester?.full_name}</p>
                {requester?.helps_completed > 5 && (
                  <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">⭐ Trusted</span>
                )}
              </div>
              <p className="text-gray-400 text-sm">@{requester?.username} · {requester?.helps_completed || 0} helps</p>
            </div>
          </div>

          {/* Help type */}
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-1">Help needed</p>
            <p className="text-white font-bold text-xl">{request.help_type}</p>
          </div>

          {/* Description */}
          {request.description && (
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-1">Description</p>
              <p className="text-gray-300 text-sm leading-relaxed">{request.description}</p>
            </div>
          )}

          {/* Reason */}
          {request.reason && (
            <div className="bg-gray-900/50 rounded-xl p-3">
              <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-1">Why they need help</p>
              <p className="text-gray-300 text-sm">{request.reason}</p>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900/50 rounded-xl p-3">
              <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-1">Duration</p>
              <p className="text-white text-sm font-semibold">⏱ {request.duration}</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-3">
              <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-1">Urgency</p>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${URGENCY_STYLES[request.urgency] || URGENCY_STYLES.low}`}>
                {request.urgency}
              </span>
            </div>
          </div>

          {/* Time info */}
          <div className="space-y-1.5">
            <p className="text-gray-500 text-xs">
              Posted: {new Date(request.created_at).toLocaleString()}
            </p>
            {request.expires_at && request.status === 'open' && !isExpired && (
              <ExpiryCountdown expiresAt={request.expires_at} />
            )}
            {isExpired && <span className="text-gray-600 text-xs">Expired</span>}
          </div>

          {/* Actions */}
          {!isOwn && (
            <div className="flex gap-3 pt-2">
              {isAccepted ? (
                <button
                  onClick={() => { onChat(); onClose() }}
                  className="flex-1 bg-brand-blue hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                >
                  💬 Open Chat
                </button>
              ) : (
                <button
                  onClick={() => { onAccept(); onClose() }}
                  disabled={accepting || isExpired || request.status !== 'open'}
                  className="flex-1 bg-brand-green hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                >
                  {accepting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  {isExpired ? 'Expired' : 'Accept Request'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
