import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, incrementHelps } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import RequestCard from '../components/RequestCard'
import EmptyState from '../components/EmptyState'
import RequestDetailsModal from '../components/RequestDetailsModal'
import UserProfileModal from '../components/UserProfileModal'

const PRESET_TYPES = [
  { icon: '🛒', label: 'Buy groceries' },
  { icon: '📦', label: 'Carry items' },
  { icon: '🐶', label: 'Walk pet' },
  { icon: '🔧', label: 'Quick fix' },
  { icon: '🚶', label: 'Walk with me' },
]
const DURATIONS = ['5 min', '10 min', '15 min', '20 min', '30 min', '1 hour']
const URGENCIES = ['low', 'medium', 'high']

function getLevel(helps) {
  if (helps >= 20) return { label: '🌟 Community Hero', next: null,  progress: 100, color: 'text-purple-400' }
  if (helps >= 5)  return { label: '🤝 Trusted Helper', next: 20,   progress: ((helps - 5) / 15) * 100, color: 'text-blue-400' }
  return               { label: '🌱 New Helper',       next: 5,    progress: (helps / 5) * 100, color: 'text-green-400' }
}

/* ── Avatar ── */
function Avatar({ profile, size = 36, className = '', onClick }) {
  const [err, setErr] = useState(false)
  const Tag = onClick ? 'button' : 'div'
  if (profile?.avatar_url && !err) {
    return (
      <Tag onClick={onClick}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover border-2 border-white/10 flex-shrink-0 overflow-hidden ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}>
        <img src={profile.avatar_url} alt="" onError={() => setErr(true)}
          style={{ width: size, height: size }} className="object-cover w-full h-full" />
      </Tag>
    )
  }
  return (
    <Tag onClick={onClick}
      className={`rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      style={{ width: size, height: size, fontSize: Math.floor(size * 0.4) }}>
      {profile?.full_name?.[0]?.toUpperCase() || '?'}
    </Tag>
  )
}

/* ── Skeleton ── */
function CardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="skeleton w-9 h-9 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-3.5 w-32 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="skeleton h-4 w-40 rounded mb-2" />
      <div className="skeleton h-3 w-full rounded mb-1.5" />
      <div className="skeleton h-3 w-3/4 rounded mb-3" />
      <div className="flex justify-between pt-2 border-t border-white/[0.06]">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-7 w-20 rounded-lg" />
      </div>
    </div>
  )
}

/* ── Celebration Modal ── */
function CelebrationModal({ onClose, helpsCount }) {
  const colors = ['34C759','0A84FF','FFD60A','AF52DE','FF6B35','30D158']
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 animate-fade-in">
      <div className="relative glass-card rounded-3xl p-8 text-center max-w-sm w-full border border-green-500/20 animate-celebrate overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({length:24}).map((_,i) => (
            <div key={i} className="confetti-piece rounded-sm absolute" style={{
              left:`${Math.random()*100}%`, top:'-12px',
              backgroundColor:`#${colors[i%colors.length]}`,
              animationDelay:`${Math.random()*0.6}s`,
              animationDuration:`${1.2+Math.random()*0.8}s`,
              width:`${5+Math.random()*8}px`, height:`${5+Math.random()*8}px`,
            }} />
          ))}
        </div>
        <div className="relative z-10">
          <div className="text-6xl mb-4 animate-float">🎉</div>
          <h2 className="text-2xl font-extrabold text-white mb-2">You're a hero!</h2>
          <p className="text-gray-400 mb-1">Task completed successfully.</p>
          <p className="text-green-400 font-bold text-lg mb-1">{helpsCount} helps total!</p>
          {helpsCount === 5  && <p className="text-blue-400 text-sm mb-3">🏆 You unlocked <strong>Trusted Helper</strong>!</p>}
          {helpsCount === 20 && <p className="text-purple-400 text-sm mb-3">🌟 You're a <strong>Community Hero</strong>!</p>}
          <button onClick={onClose}
            className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] glow-green mt-2">
            Keep Helping 💚
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   CHAT MODAL
   Dual-channel strategy for guaranteed bidirectional delivery:

   A) Supabase BROADCAST — instant cross-user delivery
      • fires for both users the moment sender broadcasts
      • does NOT depend on RLS or replica identity
      • used for real-time UI updates

   B) DB insert — persists message for history
      • both users load history on open
      • even if Broadcast misses an event, polling on focus
        re-syncs state

   Result: sender sees message instantly (optimistic),
   receiver sees it via Broadcast within milliseconds.
═══════════════════════════════════════════════════════ */
function ChatModal({ request, currentUserId, onClose, onViewProfile }) {
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const endRef = useRef(null)
  const channelRef = useRef(null)

  const loadHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('request_id', request.id)
      .order('created_at', { ascending: true })
    if (error) console.error('chat load error:', error.message)
    if (data) setMessages(data)
    setLoading(false)
  }, [request.id])

  useEffect(() => {
    let isMounted = true
    loadHistory()

    // Broadcast channel — works cross-user without RLS dependency
    const channelName = `chat:${request.id}`
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }, // don't echo back to sender
    })

    channel
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        if (!isMounted) return
        setMessages(prev => {
          if (prev.some(m => m.id === payload.id)) return prev
          return [...prev, payload]
        })
      })
      .subscribe((status) => {
        console.log(`Chat channel [${channelName}]:`, status)
      })

    channelRef.current = channel

    // Re-sync on window focus (catches any missed events)
    const onFocus = () => { if (isMounted) loadHistory() }
    window.addEventListener('focus', onFocus)

    return () => {
      isMounted = false
      window.removeEventListener('focus', onFocus)
      supabase.removeChannel(channel)
    }
  }, [request.id, loadHistory])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = newMsg.trim()
    if (!text || sending) return
    setSending(true)
    setNewMsg('')

    // 1. Show optimistically for sender immediately
    const tempId = `opt-${Date.now()}`
    const optimistic = {
      id: tempId,
      request_id: request.id,
      sender_id: currentUserId,
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    // 2. Persist to DB
    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({ request_id: request.id, sender_id: currentUserId, content: text })
      .select()
      .single()

    if (error) {
      console.error('send error:', error.message)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setSending(false)
      return
    }

    // 3. Replace optimistic with real record for sender
    setMessages(prev => prev.map(m => m.id === tempId ? inserted : m))

    // 4. Broadcast to the OTHER user via Broadcast channel
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'new_message',
      payload: inserted,
    })

    setSending(false)
  }

  const requesterProfile = request.requester_profile
  const helperProfile = request.helper_profile

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 animate-fade-in">
      <div className="glass-card rounded-2xl w-full max-w-md border border-white/10 flex flex-col shadow-2xl animate-slide-up"
        style={{ height: 560 }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07]">
          {/* Show both party avatars */}
          <div className="flex -space-x-2">
            {requesterProfile && (
              <button onClick={() => onViewProfile(request.requester_id)} className="relative z-10 hover:z-20 transition-all hover:scale-110">
                <Avatar profile={requesterProfile} size={32} />
              </button>
            )}
            {helperProfile && (
              <button onClick={() => onViewProfile(request.helper_id)} className="relative hover:z-20 transition-all hover:scale-110">
                <Avatar profile={helperProfile} size={32} />
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm truncate">{request.help_type}</h3>
            <p className="text-gray-600 text-xs">
              {requesterProfile?.full_name} & {helperProfile?.full_name || 'helper'}
            </p>
          </div>
          <button onClick={onClose}
            className="text-gray-600 hover:text-white transition-colors w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-sm flex-shrink-0">
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          {loading ? (
            <div className="space-y-3">
              {[0,1,2].map(i => (
                <div key={i} className={`flex ${i%2===0?'justify-start':'justify-end'}`}>
                  <div className="skeleton rounded-2xl" style={{height:40, width: i%2===0?180:140}} />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-4xl mb-3 animate-float">💬</div>
              <p className="text-gray-500 text-sm">No messages yet. Say hi!</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_id === currentUserId
              const isOptimistic = msg.id?.toString().startsWith('opt-')
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[76%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-opacity ${
                    isMe
                      ? `bg-green-500 text-black font-medium rounded-br-sm ${isOptimistic ? 'opacity-70' : 'opacity-100'}`
                      : 'glass text-gray-200 rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              )
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3.5 border-t border-white/[0.07] flex gap-3">
          <input
            type="text" value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Message... (Enter to send)"
            className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-green-500/50 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 outline-none transition-colors text-sm"
          />
          <button onClick={send} disabled={!newMsg.trim() || sending}
            className="bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 glow-green">
            {sending ? '...' : '↑'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Chat List Modal ── */
function ChatListModal({ acceptedRequests, currentUserId, onSelectChat, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-end z-50 pt-16 pr-4 animate-fade-in" onClick={onClose}>
      <div className="glass-card rounded-2xl w-80 border border-white/10 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <h3 className="font-bold text-white">Active Chats</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-lg">✕</button>
        </div>
        {acceptedRequests.length === 0
          ? <div className="py-8 text-center text-gray-600 text-sm">No active chats</div>
          : acceptedRequests.map(req => (
            <button key={req.id} onClick={() => { onSelectChat(req); onClose() }}
              className="w-full px-5 py-3.5 border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors text-left">
              <p className="text-white text-sm font-semibold">{req.help_type}</p>
              <p className="text-gray-500 text-xs mt-0.5">with {req.requester_profile?.full_name || 'someone'}</p>
            </button>
          ))
        }
      </div>
    </div>
  )
}

/* ── Notifications Modal ── */
function NotificationsModal({ notifications, onClose, onMarkRead }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-end z-50 pt-16 pr-4 animate-fade-in" onClick={onClose}>
      <div className="glass-card rounded-2xl w-80 border border-white/10 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <h3 className="font-bold text-white">Notifications</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-lg">✕</button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0
            ? <div className="py-8 text-center"><div className="text-3xl mb-2 animate-float">🔔</div><p className="text-gray-600 text-sm">Nothing new yet</p></div>
            : notifications.map(n => (
              <div key={n.id} className={`px-5 py-3.5 border-b border-white/[0.05] ${!n.is_read ? 'bg-blue-500/5' : ''}`}>
                <p className="text-white text-sm">{n.message}</p>
                <p className="text-gray-600 text-xs mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))
          }
        </div>
        {notifications.some(n => !n.is_read) && (
          <div className="px-5 py-3 border-t border-white/[0.07]">
            <button onClick={onMarkRead} className="text-blue-400 text-sm font-semibold hover:text-blue-300">Mark all read</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── New Request Modal ── */
function NewRequestModal({ onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({ helpType: '', duration: '', urgency: 'medium', description: '', reason: '' })
  const [error, setError] = useState('')
  const set = (k, v) => { setForm(p => ({...p,[k]:v})); setError('') }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 animate-fade-in" onClick={onClose}>
      <div className="glass-card rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] sticky top-0 bg-[#0D0D0D]/80 backdrop-blur z-10">
          <h3 className="font-bold text-white text-lg">New Request</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-xl">✕</button>
        </div>
        <div className="p-5 space-y-5">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>}
          <div>
            <p className="text-gray-500 text-xs font-semibold mb-2.5 uppercase tracking-wider">Quick select</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_TYPES.map(({ icon, label }) => (
                <button key={label} onClick={() => set('helpType', label)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${form.helpType === label ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'glass text-gray-400 hover:text-white border border-white/[0.08]'}`}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Or type it</label>
            <input type="text" value={form.helpType} onChange={e => set('helpType', e.target.value)}
              placeholder="What do you need help with?"
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-green-500/50 text-white placeholder-gray-600 rounded-xl px-4 py-3 outline-none transition-colors text-sm" />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-semibold mb-2.5 uppercase tracking-wider">Duration</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map(d => (
                <button key={d} onClick={() => set('duration', d)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${form.duration === d ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'glass text-gray-400 hover:text-white border border-white/[0.08]'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-semibold mb-2.5 uppercase tracking-wider">Urgency</p>
            <div className="flex gap-2">
              {URGENCIES.map(u => (
                <button key={u} onClick={() => set('urgency', u)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all active:scale-95 ${
                    form.urgency === u
                      ? u==='high' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : u==='medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'glass text-gray-500 border border-white/[0.08] hover:text-white'
                  }`}>{u}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Describe what you need..." rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-green-500/50 text-white placeholder-gray-600 rounded-xl px-4 py-3 outline-none transition-colors text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
              Why? <span className="text-gray-700 normal-case font-normal">(optional)</span>
            </label>
            <input type="text" value={form.reason} onChange={e => set('reason', e.target.value)}
              placeholder="e.g. Broken leg, caring for parent..."
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-green-500/50 text-white placeholder-gray-600 rounded-xl px-4 py-3 outline-none transition-colors text-sm" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 glass border border-white/[0.08] text-gray-400 hover:text-white py-3 rounded-xl font-semibold text-sm transition-colors">Cancel</button>
            <button
              onClick={() => {
                if (!form.helpType.trim()) { setError('Please enter or select a help type.'); return }
                if (!form.duration) { setError('Please select a duration.'); return }
                onSubmit(form)
              }}
              disabled={submitting}
              className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 glow-green active:scale-[0.98]">
              {submitting ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : null}
              Post Request
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Cancel Confirm ── */
function CancelConfirmModal({ request, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 animate-fade-in" onClick={onClose}>
      <div className="glass-card rounded-2xl w-full max-w-sm border border-white/10 p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="text-3xl text-center mb-3">🗑️</div>
        <h3 className="font-bold text-white text-center text-lg mb-2">Cancel Request?</h3>
        <p className="text-gray-500 text-sm text-center mb-5">
          Cancel <span className="text-white font-semibold">"{request?.help_type}"</span>? This can't be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 glass border border-white/[0.08] text-gray-400 hover:text-white py-3 rounded-xl font-semibold text-sm">Keep it</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 bg-red-500/80 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════ */
export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [tab, setTab] = useState('need')
  const [myRequests, setMyRequests] = useState([])
  const [communityRequests, setCommunityRequests] = useState([])
  const [acceptedRequests, setAcceptedRequests] = useState([])
  const [notifications, setNotifications] = useState([])
  const [todayCount, setTodayCount] = useState(0)
  const [activeMemberCount, setActiveMemberCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(false)

  // Modals
  const [showNewForm, setShowNewForm] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showChatList, setShowChatList] = useState(false)
  const [chatRequest, setChatRequest] = useState(null)
  const [celebrating, setCelebrating] = useState(false)
  const [detailsRequest, setDetailsRequest] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [viewingUserId, setViewingUserId] = useState(null)

  // Action states
  const [acceptingId, setAcceptingId] = useState(null)
  const [completingId, setCompletingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const userId = session.user.id
  const searchRef = useRef(null)

  // Use inner join aliases — works regardless of exact FK constraint name in Supabase
  // requester_id always has a FK, helper_id is nullable but still has FK
  const SELECT_REQUEST = `
    *,
    requester_profile:profiles!requester_id(id, full_name, username, avatar_url, helps_completed),
    helper_profile:profiles!helper_id(id, full_name, username, avatar_url, helps_completed)
  `

  const fetchProfile = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) console.error('fetchProfile:', error.message)
    if (data) setProfile(data)
  }, [userId])

  const fetchMyRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('requests').select(SELECT_REQUEST)
      .eq('requester_id', userId)
      .in('status', ['open', 'accepted', 'completed'])
      .order('created_at', { ascending: false })
    if (error) console.error('fetchMyRequests:', error.message)
    if (data) setMyRequests(data)
  }, [userId])

  const fetchCommunity = useCallback(async (community) => {
    if (!community) return
    setLoadingRequests(true)
    const { data, error } = await supabase
      .from('requests').select(SELECT_REQUEST)
      .eq('status', 'open')
      .eq('community', community)
      .neq('requester_id', userId)
      .order('created_at', { ascending: false })
    if (error) console.error('fetchCommunity:', error.message)
    if (data) setCommunityRequests(data)
    setLoadingRequests(false)
  }, [userId])

  const fetchAccepted = useCallback(async () => {
    const { data, error } = await supabase
      .from('requests').select(SELECT_REQUEST)
      .eq('helper_id', userId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
    if (error) console.error('fetchAccepted:', error.message)
    if (data) setAcceptedRequests(data)
  }, [userId])

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(20)
    if (data) setNotifications(data)
  }, [userId])

  const fetchTodayCount = useCallback(async (community) => {
    if (!community) return
    const since = new Date(Date.now() - 24*60*60*1000).toISOString()
    const { count } = await supabase.from('requests').select('*', { count: 'exact', head: true })
      .eq('status', 'completed').eq('community', community).gte('created_at', since)
    setTodayCount(count || 0)
  }, [])

  const fetchActiveMembers = useCallback(async (community) => {
    if (!community) return
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      .eq('community', community)
    setActiveMemberCount(count || 0)
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoadingData(true)
      await fetchProfile()
      setLoadingData(false)
    }
    init()
  }, [fetchProfile])

  useEffect(() => {
    if (!profile) return
    fetchMyRequests()
    fetchCommunity(profile.community)
    fetchAccepted()
    fetchNotifications()
    fetchTodayCount(profile.community)
    fetchActiveMembers(profile.community)
  }, [profile, fetchMyRequests, fetchCommunity, fetchAccepted, fetchNotifications, fetchTodayCount, fetchActiveMembers])

  // Auto-expire
  useEffect(() => {
    const expire = async () => {
      await supabase.from('requests').update({ status: 'cancelled' })
        .eq('status', 'open').lt('expires_at', new Date().toISOString())
    }
    expire()
    const id = setInterval(expire, 60000)
    return () => clearInterval(id)
  }, [])

  // Realtime
  useEffect(() => {
    if (!profile) return
    const ch1 = supabase.channel('db-requests')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'requests',
      }, (payload) => {
        // Re-fetch immediately when any request updates
        // This covers: accepted, completed, cancelled transitions
        fetchMyRequests()
        fetchCommunity(profile.community)
        fetchAccepted()
        fetchTodayCount(profile.community)
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'requests',
      }, () => {
        fetchCommunity(profile.community)
      })
      .subscribe()
    const ch2 = supabase.channel('db-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        fetchNotifications).subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  }, [profile, userId, fetchMyRequests, fetchCommunity, fetchAccepted, fetchNotifications, fetchTodayCount])

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'n' || e.key === 'N') { setShowNewForm(true); return }
      if (e.key === 'Escape') {
        setShowNewForm(false); setShowNotifs(false); setShowChatList(false)
        setChatRequest(null); setDetailsRequest(null); setCancelTarget(null); setViewingUserId(null)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const filter = (reqs) => {
    if (!searchQuery.trim()) return reqs
    const q = searchQuery.toLowerCase()
    return reqs.filter(r =>
      r.help_type?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.requester_profile?.username?.toLowerCase().includes(q) ||
      r.requester_profile?.full_name?.toLowerCase().includes(q)
    )
  }

  /* ── Actions ── */
  const submitRequest = async (form) => {
    setSubmitting(true)
    try {
      const { error } = await supabase.from('requests').insert({
        requester_id: userId, help_type: form.helpType,
        duration: form.duration, urgency: form.urgency,
        description: form.description, reason: form.reason,
        community: profile.community, status: 'open',
        expires_at: new Date(Date.now() + 60*60*1000).toISOString(),
      })
      if (error) throw error
      setShowNewForm(false)
      await fetchMyRequests()
    } catch (e) { console.error('submit:', e) }
    finally { setSubmitting(false) }
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    await supabase.from('requests').update({ status: 'cancelled' }).eq('id', cancelTarget.id)
    setCancelTarget(null); setCancelling(false)
    await fetchMyRequests()
  }

  const accept = async (request) => {
    setAcceptingId(request.id)
    try {
      const { error } = await supabase.from('requests')
        .update({ status: 'accepted', helper_id: userId })
        .eq('id', request.id).eq('status', 'open')
      if (error) throw error
      await supabase.from('notifications').insert({
        user_id: request.requester_id,
        message: `${profile.full_name} accepted your request: "${request.help_type}"`,
        is_read: false,
      })
      fetchCommunity(profile.community); fetchAccepted()
    } catch (e) { console.error('accept:', e) }
    finally { setAcceptingId(null) }
  }

  const backOut = async (request) => {
    await supabase.from('requests').update({ status: 'open', helper_id: null }).eq('id', request.id)
    fetchAccepted(); fetchCommunity(profile.community)
  }

  const complete = async (request) => {
    setCompletingId(request.id)
    try {
      await supabase.from('requests').update({ status: 'completed' }).eq('id', request.id)
      const { error } = await incrementHelps(userId)
      if (error) console.error('incrementHelps error:', error)
      await fetchProfile()
      fetchAccepted()
      setCelebrating(true)
      fetchTodayCount(profile.community)
    } catch (e) { console.error('complete:', e) }
    finally { setCompletingId(null) }
  }

  const markNotifsRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    fetchNotifications()
  }

  const invite = async () => {
    try { await navigator.clipboard.writeText(window.location.origin) } catch { alert(window.location.origin) }
    setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2500)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('helpnear_safety_accepted')
    navigate('/')
  }

  const unread = notifications.filter(n => !n.is_read).length
  const filteredCommunity = filter(communityRequests)
  const filteredMine = filter(myRequests)
  const level = getLevel(profile?.helps_completed || 0)

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
          <p className="text-gray-500 font-mono text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar profile={profile} onProfileUpdate={setProfile} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0D0D0D]/80 backdrop-blur-xl px-4 py-3">
          <div className="flex items-center gap-3 max-w-5xl mx-auto">
            <div className="md:hidden w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
              <span className="text-black font-bold text-sm">H</span>
            </div>
            <div className="flex-1 max-w-sm relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">🔍</span>
              <input ref={searchRef} type="text" value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search requests... (⌘K)"
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-green-500/40 text-white placeholder-gray-600 rounded-xl pl-8 pr-8 py-2 text-sm outline-none transition-colors" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white text-xs">✕</button>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => { setShowChatList(v => !v); setShowNotifs(false) }}
                className="relative w-9 h-9 rounded-xl glass border border-white/[0.08] hover:border-white/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95">
                <span className="text-base">💬</span>
                {acceptedRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{acceptedRequests.length}</span>
                )}
              </button>
              <button onClick={() => { setShowNotifs(v => !v); setShowChatList(false) }}
                className="relative w-9 h-9 rounded-xl glass border border-white/[0.08] hover:border-white/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95">
                <span className="text-base">🔔</span>
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unread > 9 ? '9+' : unread}</span>
                )}
              </button>
              <Link to="/profile" className="hover:scale-105 transition-transform active:scale-95">
                <Avatar profile={profile} size={36} />
              </Link>
            </div>
          </div>
        </header>

        {/* Today banner */}
        {todayCount > 0 && (
          <div className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border-b border-green-500/10 px-4 py-2">
            <p className="text-green-400 text-xs font-semibold text-center">
              🔥 <span className="text-white font-bold">{todayCount}</span> {todayCount === 1 ? 'person helped' : 'people helped'} today in <span className="text-green-400">{profile?.community}</span>
            </p>
          </div>
        )}

        <div className="flex-1 flex">
          <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full pb-28 md:pb-8">
            <div className="mb-5">
              <h1 className="text-2xl font-extrabold text-white">
                Hey, {profile?.full_name?.split(' ')[0] || 'there'} 👋
              </h1>
              <div className="mt-2 flex items-center gap-3">
                <span className={`text-sm font-semibold ${level.color}`}>{level.label}</span>
                {level.next && (
                  <div className="flex-1 max-w-[140px]">
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all duration-700"
                        style={{ width: `${level.progress}%` }} />
                    </div>
                    <p className="text-gray-600 text-xs mt-0.5">{profile?.helps_completed || 0}/{level.next} to next</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mb-5 flex-wrap">
              <div className="glass border border-white/[0.06] rounded-xl px-3 py-2 text-xs font-medium text-gray-400 flex items-center gap-1.5">
                👥 <span className="text-white font-bold">{activeMemberCount}</span> in {profile?.community}
              </div>
              <div className="glass border border-white/[0.06] rounded-xl px-3 py-2 text-xs font-medium text-gray-400 flex items-center gap-1.5">
                ✅ <span className="text-green-400 font-bold">{profile?.helps_completed || 0}</span> helps
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-5">
              <button onClick={() => setTab('need')}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${tab === 'need' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'glass text-gray-400 hover:text-white border border-white/[0.08]'}`}>
                🆘 Need Help
              </button>
              <button onClick={() => setTab('help')}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${tab === 'help' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'glass text-gray-400 hover:text-white border border-white/[0.08]'}`}>
                💚 Help Others
              </button>
            </div>

            {/* ═══ NEED HELP ═══ */}
            {tab === 'need' && (
              <div className="space-y-4 animate-fade-in">
                <button onClick={() => setShowNewForm(true)}
                  className="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40">
                  <span className="text-lg font-light">+</span> New Request
                  <span className="text-red-500/50 text-xs font-normal">(N)</span>
                </button>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Your Requests</h3>
                    {filteredMine.length > 0 && <span className="text-gray-600 text-xs">{filteredMine.length}</span>}
                  </div>

                  {filteredMine.length === 0 ? (
                    <div className="glass-card rounded-2xl">
                      <EmptyState type="requests" message="No requests yet. Post one above!" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredMine.map(req => (
                        <div key={req.id}>
                          <RequestCard
                            request={req} isOwn
                            onCancel={() => setCancelTarget(req)}
                            onOpenDetails={setDetailsRequest}
                            onViewProfile={setViewingUserId}
                            cancelling={cancelling && cancelTarget?.id === req.id}
                          />
                          {/* Show helper info + chat button when accepted */}
                          {req.status === 'accepted' && (
                            <div className="mt-1.5 mx-0.5 glass-card rounded-xl px-4 py-3 border border-green-500/15">
                              {req.helper_profile ? (
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-green-400 text-xs font-semibold">Helped by:</span>
                                    <button
                                      onClick={() => setViewingUserId(req.helper_id)}
                                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                    >
                                      <Avatar profile={req.helper_profile} size={24} />
                                      <span className="text-white text-xs font-semibold">{req.helper_profile.full_name}</span>
                                      {req.helper_profile.helps_completed > 5 && (
                                        <span className="text-yellow-400 text-xs">⭐</span>
                                      )}
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => setChatRequest(req)}
                                    className="flex items-center gap-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                                  >
                                    💬 Chat
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-green-400 text-xs font-semibold animate-pulse-soft">
                                    ✅ Someone accepted your request!
                                  </span>
                                  <button
                                    onClick={() => setChatRequest(req)}
                                    className="flex items-center gap-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                                  >
                                    💬 Chat
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ HELP OTHERS ═══ */}
            {tab === 'help' && (
              <div className="space-y-4 animate-fade-in">
                {acceptedRequests.length > 0 && (
                  <div>
                    <h3 className="text-green-500/70 text-xs font-semibold uppercase tracking-wider mb-3">Currently Helping</h3>
                    <div className="space-y-3">
                      {acceptedRequests.map(req => (
                        <RequestCard key={req.id} request={req} isHelper
                          onBackOut={() => backOut(req)}
                          onComplete={() => complete(req)}
                          onOpenChat={() => setChatRequest(req)}
                          onOpenDetails={setDetailsRequest}
                          onViewProfile={setViewingUserId}
                          completing={completingId === req.id}
                        />
                      ))}
                    </div>
                    <div className="border-t border-white/[0.05] my-5" />
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
                    Near You — {profile?.community}
                  </h3>
                  {filteredCommunity.length > 0 && <span className="text-gray-600 text-xs">{filteredCommunity.length} open</span>}
                </div>

                {loadingRequests ? (
                  <div className="space-y-3">{[0,1,2].map(i => <CardSkeleton key={i} />)}</div>
                ) : filteredCommunity.length === 0 ? (
                  <div className="glass-card rounded-2xl">
                    <EmptyState type={searchQuery ? 'search' : 'community'} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCommunity.map(req => (
                      <RequestCard key={req.id} request={req}
                        onAccept={() => accept(req)}
                        onOpenDetails={setDetailsRequest}
                        onViewProfile={setViewingUserId}
                        accepting={acceptingId === req.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Right sidebar */}
          <aside className="hidden lg:block w-72 px-4 py-6 flex-shrink-0">
            <div className="sticky top-20 space-y-3">
              <div className="glass-green rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-soft" />
                  <p className="text-green-500/70 text-xs font-semibold uppercase tracking-wider">Your Community</p>
                </div>
                <p className="text-white font-bold text-lg leading-tight mb-1">📍 {profile?.community || '—'}</p>
                <p className="text-gray-500 text-xs">{communityRequests.length} open · {activeMemberCount} members</p>
              </div>
              <div className="glass-card rounded-2xl p-4">
                <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-3">Profile</p>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar profile={profile} size={44} onClick={() => navigate('/profile')} />
                  <div>
                    <p className="text-white font-bold text-sm">{profile?.full_name}</p>
                    <p className="text-gray-600 text-xs">@{profile?.username}</p>
                  </div>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.05]">
                  <p className="text-3xl font-extrabold text-green-400">{profile?.helps_completed || 0}</p>
                  <p className="text-gray-600 text-xs mt-0.5">helps completed</p>
                  <p className={`text-xs font-semibold mt-1 ${level.color}`}>{level.label}</p>
                  {level.next && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full"
                          style={{ width: `${level.progress}%`, transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="glass-card rounded-2xl p-4">
                <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-2">📨 Invite</p>
                <p className="text-gray-500 text-xs mb-3">Share HelpNear with your neighbours.</p>
                <button onClick={invite}
                  className="w-full glass border border-white/[0.08] hover:border-green-500/30 text-white font-semibold py-2.5 rounded-xl text-sm transition-all hover:bg-green-500/5 active:scale-[0.98]">
                  {inviteCopied ? '✓ Copied!' : '🔗 Copy Link'}
                </button>
              </div>
              <button onClick={signOut} className="w-full text-gray-700 hover:text-red-500 text-xs font-medium transition-colors py-2">
                Sign out
              </button>
            </div>
          </aside>
        </div>

        {/* Mobile bottom nav */}
        <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.07] bg-[#0D0D0D]/90 backdrop-blur-xl px-4 py-2 items-center justify-around">
          <button onClick={() => setTab('need')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${tab==='need' ? 'text-red-400' : 'text-gray-600'}`}>
            <span className="text-xl">🆘</span>
            <span className="text-xs font-semibold">Need Help</span>
          </button>
          <button onClick={() => setShowNewForm(true)} className="flex flex-col items-center gap-0.5 px-4 py-1.5">
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-black text-2xl font-bold shadow-lg -mt-5 glow-green active:scale-95 transition-transform">+</div>
          </button>
          <button onClick={() => setTab('help')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${tab==='help' ? 'text-green-400' : 'text-gray-600'}`}>
            <span className="text-xl">💚</span>
            <span className="text-xs font-semibold">Help</span>
          </button>
          <Link to="/profile" className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-gray-600">
            <span className="text-xl">👤</span>
            <span className="text-xs font-semibold">Profile</span>
          </Link>
          <button onClick={() => setShowNotifs(v => !v)}
            className="relative flex flex-col items-center gap-0.5 px-4 py-1.5 text-gray-600">
            <span className="text-xl">🔔</span>
            <span className="text-xs font-semibold">Alerts</span>
            {unread > 0 && <span className="absolute top-0 right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unread}</span>}
          </button>
        </nav>
      </div>

      {/* Modals */}
      {showNotifs && <NotificationsModal notifications={notifications} onClose={() => setShowNotifs(false)} onMarkRead={markNotifsRead} />}
      {showChatList && <ChatListModal acceptedRequests={acceptedRequests} currentUserId={userId} onSelectChat={setChatRequest} onClose={() => setShowChatList(false)} />}
      {chatRequest && (
        <ChatModal
          request={chatRequest}
          currentUserId={userId}
          onClose={() => setChatRequest(null)}
          onViewProfile={(id) => { setViewingUserId(id); }}
        />
      )}
      {celebrating && <CelebrationModal onClose={() => setCelebrating(false)} helpsCount={profile?.helps_completed || 0} />}
      {showNewForm && <NewRequestModal onClose={() => setShowNewForm(false)} onSubmit={submitRequest} submitting={submitting} />}
      {detailsRequest && (
        <RequestDetailsModal
          request={detailsRequest}
          currentUserId={userId}
          isAccepted={acceptedRequests.some(r => r.id === detailsRequest.id)}
          onAccept={() => accept(detailsRequest)}
          onChat={() => setChatRequest(detailsRequest)}
          onClose={() => setDetailsRequest(null)}
          accepting={acceptingId === detailsRequest?.id}
        />
      )}
      {cancelTarget && (
        <CancelConfirmModal request={cancelTarget} onConfirm={confirmCancel} onClose={() => setCancelTarget(null)} loading={cancelling} />
      )}
      {viewingUserId && (
        <UserProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
      )}
    </div>
  )
}
