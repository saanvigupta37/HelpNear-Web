import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import RequestCard from '../components/RequestCard'
import LoadingSkeleton from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'
import RequestDetailsModal from '../components/RequestDetailsModal'
import BottomBanner from '../components/BottomBanner'

const PRESET_TYPES = [
  { icon: '🛒', label: 'Buy groceries' },
  { icon: '📦', label: 'Carry items' },
  { icon: '🐶', label: 'Walk pet' },
  { icon: '🔧', label: 'Quick fix' },
  { icon: '🚶', label: 'Walk with me' },
]
const DURATIONS = ['5 min', '10 min', '15 min', '20 min', '30 min', '1 hour']
const URGENCIES = ['low', 'medium', 'high']

/* ── Avatar component ── */
function Avatar({ profile, size = 9, className = '' }) {
  const [err, setErr] = useState(false)
  const s = `w-${size} h-${size}`
  if (profile?.avatar_url && !err) {
    return <img src={profile.avatar_url} alt={profile.full_name} onError={() => setErr(true)}
      className={`${s} rounded-full object-cover flex-shrink-0 border-2 border-gray-700 ${className}`} />
  }
  return (
    <div className={`${s} rounded-full bg-brand-red flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${className}`}>
      {profile?.full_name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

/* ── Celebration Modal ── */
function CelebrationModal({ onClose }) {
  const colors = ['#FF3B30', '#34C759', '#FFD60A', '#0A84FF', '#FF6B35', '#30D158']
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 animate-fade-in">
      <div className="relative bg-gray-800 rounded-3xl p-8 text-center max-w-sm w-full border border-gray-700 animate-celebrate overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="confetti-piece rounded-sm" style={{
              left: `${Math.random() * 100}%`, top: '-10px',
              backgroundColor: colors[i % colors.length],
              animationDelay: `${Math.random() * 0.5}s`,
              animationDuration: `${1 + Math.random()}s`,
              width: `${6 + Math.random() * 8}px`, height: `${6 + Math.random() * 8}px`,
            }} />
          ))}
        </div>
        <div className="relative z-10">
          <div className="text-6xl mb-4 animate-float">🎉</div>
          <h2 className="text-2xl font-extrabold text-white mb-2">You're amazing!</h2>
          <p className="text-gray-400 mb-2">Help completed successfully.</p>
          <p className="text-brand-green font-semibold mb-6">+1 help added to your count!</p>
          <button onClick={onClose} className="w-full bg-brand-green hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition-all">
            Keep Helping 💚
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Chat Modal ── */
function ChatModal({ request, currentUserId, onClose }) {
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const endRef = useRef(null)

  useEffect(() => {
    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*')
        .eq('request_id', request.id).order('created_at', { ascending: true })
      if (data) setMessages(data)
      setLoading(false)
    }
    fetchMsgs()
    const ch = supabase.channel(`chat-${request.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${request.id}` },
        (p) => setMessages(prev => [...prev, p.new]))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [request.id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    const text = newMsg.trim()
    if (!text || sending) return
    setSending(true); setNewMsg('')
    await supabase.from('messages').insert({ request_id: request.id, sender_id: currentUserId, content: text })
    setSending(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 animate-fade-in">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 flex flex-col" style={{ height: 520 }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h3 className="font-bold text-white">Chat</h3>
            <p className="text-gray-400 text-xs">{request.help_type}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading
            ? [0,1,2].map(i => <div key={i} className={`flex ${i%2===0?'justify-start':'justify-end'}`}><div className="h-10 rounded-2xl bg-gray-700 animate-pulse" style={{width: i%2===0?192:144}} /></div>)
            : messages.length === 0
              ? <div className="flex flex-col items-center justify-center h-full text-center"><div className="text-4xl mb-3">💬</div><p className="text-gray-500 text-sm">No messages yet. Say hello!</p></div>
              : messages.map(msg => {
                  const isMe = msg.sender_id === currentUserId
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-brand-green text-white rounded-br-sm' : 'bg-gray-700 text-gray-200 rounded-bl-sm'}`}>
                        {msg.content}
                      </div>
                    </div>
                  )
                })
          }
          <div ref={endRef} />
        </div>
        <div className="px-5 py-4 border-t border-gray-700 flex gap-3">
          <input type="text" value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Type a message..."
            className="flex-1 bg-gray-900 border border-gray-700 focus:border-brand-green text-white placeholder-gray-600 rounded-xl px-4 py-2.5 outline-none transition-colors text-sm"
          />
          <button onClick={send} disabled={!newMsg.trim() || sending}
            className="bg-brand-green hover:bg-green-500 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl transition-all">
            {sending ? '...' : '→'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Chat List Modal ── */
function ChatListModal({ acceptedRequests, currentUserId, onSelectChat, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-end z-50 pt-16 pr-4 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-80 border border-gray-700 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h3 className="font-bold text-white">Active Chats</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {acceptedRequests.length === 0
            ? <div className="py-8 text-center text-gray-500 text-sm">No active chats</div>
            : acceptedRequests.map(req => (
              <button key={req.id} onClick={() => { onSelectChat(req); onClose() }}
                className="w-full px-5 py-3.5 border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors text-left">
                <p className="text-white text-sm font-semibold">{req.help_type}</p>
                <p className="text-gray-400 text-xs mt-0.5">with {req.requester_profile?.full_name || 'someone'}</p>
              </button>
            ))
          }
        </div>
      </div>
    </div>
  )
}

/* ── Notifications Modal ── */
function NotificationsModal({ notifications, onClose, onMarkRead }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-end z-50 pt-16 pr-4 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-80 border border-gray-700 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h3 className="font-bold text-white">Notifications</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0
            ? <div className="py-8 text-center"><div className="text-3xl mb-2">🔔</div><p className="text-gray-500 text-sm">Nothing new yet</p></div>
            : notifications.map(n => (
              <div key={n.id} className={`px-5 py-3.5 border-b border-gray-700/50 ${!n.is_read ? 'bg-brand-blue/5' : ''}`}>
                <p className="text-white text-sm font-medium">{n.message}</p>
                <p className="text-gray-500 text-xs mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))
          }
        </div>
        {notifications.some(n => !n.is_read) && (
          <div className="px-5 py-3 border-t border-gray-700">
            <button onClick={onMarkRead} className="text-brand-blue text-sm font-semibold hover:text-blue-400">Mark all as read</button>
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
  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError('') }

  const handleSubmit = () => {
    if (!form.helpType.trim()) { setError('Please enter or select a help type.'); return }
    if (!form.duration) { setError('Please select a duration.'); return }
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          <h3 className="font-bold text-white text-lg">New Request</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-5">
          {error && <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm">{error}</div>}

          <div>
            <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">Quick select</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_TYPES.map(({ icon, label }) => (
                <button key={label} onClick={() => set('helpType', label)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${form.helpType === label ? 'bg-brand-red text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Or describe it</label>
            <input type="text" value={form.helpType} onChange={e => set('helpType', e.target.value)}
              placeholder="What do you need help with?"
              className="w-full bg-gray-900 border border-gray-700 focus:border-brand-red text-white placeholder-gray-600 rounded-xl px-4 py-2.5 outline-none transition-colors text-sm" />
          </div>

          <div>
            <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">Duration</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map(d => (
                <button key={d} onClick={() => set('duration', d)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${form.duration === d ? 'bg-brand-red text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">Urgency</p>
            <div className="flex gap-2">
              {URGENCIES.map(u => (
                <button key={u} onClick={() => set('urgency', u)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${form.urgency === u
                    ? u === 'high' ? 'bg-red-500 text-white' : u === 'medium' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Describe what you need..." rows={3}
              className="w-full bg-gray-900 border border-gray-700 focus:border-brand-red text-white placeholder-gray-600 rounded-xl px-4 py-2.5 outline-none transition-colors text-sm resize-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
              Why do you need help? <span className="text-gray-600 normal-case font-normal">(optional)</span>
            </label>
            <input type="text" value={form.reason} onChange={e => set('reason', e.target.value)}
              placeholder="e.g. Broken leg, elderly parent..."
              className="w-full bg-gray-900 border border-gray-700 focus:border-brand-red text-white placeholder-gray-600 rounded-xl px-4 py-2.5 outline-none transition-colors text-sm" />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-700 text-gray-400 hover:text-white py-3 rounded-xl font-semibold transition-colors text-sm">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 bg-brand-red hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
              {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              Post Request
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Cancel Confirm Dialog ── */
function CancelConfirmModal({ request, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-sm border border-gray-700 p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="text-3xl text-center mb-3">🗑️</div>
        <h3 className="font-bold text-white text-center text-lg mb-2">Cancel Request?</h3>
        <p className="text-gray-400 text-sm text-center mb-5">
          Cancel your request for <span className="text-white font-semibold">"{request?.help_type}"</span>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-700 text-gray-400 hover:text-white py-3 rounded-xl font-semibold text-sm">Keep it</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   MAIN DASHBOARD
════════════════════════════════════════ */
export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [tab, setTab] = useState('need')
  const [myRequests, setMyRequests] = useState([])
  const [communityRequests, setCommunityRequests] = useState([])
  const [acceptedRequests, setAcceptedRequests] = useState([])
  const [notifications, setNotifications] = useState([])
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

  // Action states
  const [acceptingId, setAcceptingId] = useState(null)
  const [completingId, setCompletingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const userId = session.user.id
  const searchRef = useRef(null)

  /* ── Fetch profile ── */
  const fetchProfile = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', userId).single()
    if (error) console.error('fetchProfile error:', error)
    if (data) setProfile(data)
  }, [userId])

  /* ── Fetch MY requests (all statuses so user sees them) ── */
  const fetchMyRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        requester_profile:profiles!requests_requester_id_fkey(id, full_name, username, avatar_url, helps_completed)
      `)
      .eq('requester_id', userId)
      .in('status', ['open', 'accepted', 'completed'])
      .order('created_at', { ascending: false })
    if (error) console.error('fetchMyRequests error:', error)
    if (data) setMyRequests(data)
  }, [userId])

  /* ── Fetch community requests (exclude own) ── */
  const fetchCommunity = useCallback(async (community) => {
    if (!community) return
    setLoadingRequests(true)
    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        requester_profile:profiles!requests_requester_id_fkey(id, full_name, username, avatar_url, helps_completed)
      `)
      .eq('status', 'open')
      .eq('community', community)
      .neq('requester_id', userId)
      .order('created_at', { ascending: false })
    if (error) console.error('fetchCommunity error:', error)
    if (data) setCommunityRequests(data)
    setLoadingRequests(false)
  }, [userId])

  /* ── Fetch requests I accepted (to help with) ── */
  const fetchAccepted = useCallback(async () => {
    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        requester_profile:profiles!requests_requester_id_fkey(id, full_name, username, avatar_url, helps_completed)
      `)
      .eq('helper_id', userId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
    if (error) console.error('fetchAccepted error:', error)
    if (data) setAcceptedRequests(data)
  }, [userId])

  /* ── Fetch notifications ── */
  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(20)
    if (data) setNotifications(data)
  }, [userId])

  /* ── Init ── */
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
  }, [profile, fetchMyRequests, fetchCommunity, fetchAccepted, fetchNotifications])

  /* ── Auto-expire ── */
  useEffect(() => {
    const expire = async () => {
      await supabase.from('requests').update({ status: 'cancelled' })
        .eq('status', 'open').lt('expires_at', new Date().toISOString())
    }
    expire()
    const id = setInterval(expire, 60000)
    return () => clearInterval(id)
  }, [])

  /* ── Realtime ── */
  useEffect(() => {
    if (!profile) return
    const ch1 = supabase.channel('dashboard-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        fetchMyRequests()
        fetchCommunity(profile.community)
        fetchAccepted()
      }).subscribe()
    const ch2 = supabase.channel('dashboard-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        fetchNotifications).subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  }, [profile, userId, fetchMyRequests, fetchCommunity, fetchAccepted, fetchNotifications])

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'n' || e.key === 'N') { setShowNewForm(true); return }
      if (e.key === 'Escape') {
        setShowNewForm(false); setShowNotifs(false); setShowChatList(false)
        setChatRequest(null); setDetailsRequest(null); setCancelTarget(null)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  /* ── Search filter ── */
  const filterRequests = (reqs) => {
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
  const handleSubmitRequest = async (form) => {
    setSubmitting(true)
    try {
      const { error } = await supabase.from('requests').insert({
        requester_id: userId,
        help_type: form.helpType,
        duration: form.duration,
        urgency: form.urgency,
        description: form.description,
        reason: form.reason,
        community: profile.community,
        status: 'open',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      if (error) throw error
      setShowNewForm(false)
      await fetchMyRequests()
    } catch (err) { console.error('submit error:', err) }
    finally { setSubmitting(false) }
  }

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    const { error } = await supabase.from('requests')
      .update({ status: 'cancelled' }).eq('id', cancelTarget.id)
    if (error) console.error('cancel error:', error)
    setCancelTarget(null)
    setCancelling(false)
    await fetchMyRequests()
  }

  const handleAccept = async (request) => {
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
      fetchCommunity(profile.community)
      fetchAccepted()
    } catch (err) { console.error('accept error:', err) }
    finally { setAcceptingId(null) }
  }

  const handleBackOut = async (request) => {
    await supabase.from('requests').update({ status: 'open', helper_id: null }).eq('id', request.id)
    fetchAccepted()
    fetchCommunity(profile.community)
  }

  const handleComplete = async (request) => {
    setCompletingId(request.id)
    try {
      await supabase.from('requests').update({ status: 'completed' }).eq('id', request.id)
      await supabase.rpc('increment_helps', { user_id: userId })
      fetchAccepted()
      fetchProfile()
      setCelebrating(true)
    } catch (err) { console.error('complete error:', err) }
    finally { setCompletingId(null) }
  }

  const handleMarkNotifsRead = async () => {
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', userId).eq('is_read', false)
    fetchNotifications()
  }

  const handleInvite = async () => {
    try { await navigator.clipboard.writeText(window.location.origin) }
    catch { alert(`Share: ${window.location.origin}`) }
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2500)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('helpnear_safety_accepted')
    navigate('/')
  }

  /* ── Derived ── */
  const unreadCount = notifications.filter(n => !n.is_read).length
  const filteredCommunity = filterRequests(communityRequests)
  const filteredMine = filterRequests(myRequests)

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-brand-red border-t-transparent animate-spin" />
          <p className="text-gray-400 font-mono text-sm">Loading your community...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <Sidebar profile={profile} onProfileUpdate={setProfile} />

      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Top Navbar ── */}
        <header className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-8 h-8 rounded-lg bg-brand-red flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">H</span>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-sm relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search requests... (⌘K)"
                className="w-full bg-gray-800 border border-gray-700 focus:border-brand-green text-white placeholder-gray-600 rounded-xl pl-8 pr-8 py-2 text-sm outline-none transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs">✕</button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Chat */}
              <button onClick={() => { setShowChatList(v => !v); setShowNotifs(false) }}
                className="relative w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center transition-colors" title="Chats">
                <span className="text-base">💬</span>
                {acceptedRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-blue text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {acceptedRequests.length}
                  </span>
                )}
              </button>

              {/* Notifications */}
              <button onClick={() => { setShowNotifs(v => !v); setShowChatList(false) }}
                className="relative w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center transition-colors">
                <span className="text-base">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Profile avatar */}
              <Link to="/profile">
                <Avatar profile={profile} size={9} className="hover:opacity-80 transition-opacity cursor-pointer" />
              </Link>
            </div>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="flex-1 flex">

          {/* Main column */}
          <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full pb-24">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-white">
                Hey, {profile?.full_name?.split(' ')[0] || 'there'} 👋
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">
                {searchQuery ? `Results for "${searchQuery}"` : 'What can your community do for you today?'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button onClick={() => setTab('need')}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${tab === 'need' ? 'bg-brand-red text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}>
                🆘 Need Help
              </button>
              <button onClick={() => setTab('help')}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${tab === 'help' ? 'bg-brand-green text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}>
                🙋 Help Others
              </button>
            </div>

            {/* ═══ NEED HELP TAB ═══ */}
            {tab === 'need' && (
              <div className="space-y-4 animate-fade-in">
                <button onClick={() => setShowNewForm(true)}
                  className="w-full bg-brand-red hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2">
                  <span className="text-lg font-light">+</span> New Request
                  <span className="text-red-300 text-xs font-normal opacity-70">(press N)</span>
                </button>

                <div>
                  <h3 className="text-gray-400 text-sm font-semibold mb-3 uppercase tracking-wide">
                    Your Requests
                    {filteredMine.length > 0 && <span className="ml-2 text-gray-600 font-normal normal-case">({filteredMine.length})</span>}
                  </h3>

                  {filteredMine.length === 0 ? (
                    <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50">
                      <EmptyState type="requests" message="No requests yet. Click '+ New Request' to post one!" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredMine.map(req => (
                        <RequestCard
                          key={req.id}
                          request={req}
                          isOwn={true}
                          onCancel={() => setCancelTarget(req)}
                          onOpenDetails={setDetailsRequest}
                          cancelling={cancelling && cancelTarget?.id === req.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ HELP OTHERS TAB ═══ */}
            {tab === 'help' && (
              <div className="space-y-4 animate-fade-in">

                {/* Currently helping */}
                {acceptedRequests.length > 0 && (
                  <div>
                    <h3 className="text-brand-green text-sm font-semibold mb-3 uppercase tracking-wide">
                      You're currently helping
                    </h3>
                    <div className="space-y-3">
                      {acceptedRequests.map(req => (
                        <RequestCard
                          key={req.id}
                          request={req}
                          isHelper={true}
                          onBackOut={() => handleBackOut(req)}
                          onComplete={() => handleComplete(req)}
                          onOpenChat={() => setChatRequest(req)}
                          onOpenDetails={setDetailsRequest}
                          completing={completingId === req.id}
                        />
                      ))}
                    </div>
                    <div className="border-t border-gray-800 my-5" />
                  </div>
                )}

                <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wide">
                  Requests Near You — <span className="text-white normal-case">{profile?.community}</span>
                  {filteredCommunity.length > 0 && <span className="ml-2 text-gray-600 font-normal normal-case">({filteredCommunity.length})</span>}
                </h3>

                {loadingRequests ? (
                  <LoadingSkeleton type="request" count={3} />
                ) : filteredCommunity.length === 0 ? (
                  <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50">
                    <EmptyState type={searchQuery ? 'search' : 'community'} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCommunity.map(req => (
                      <RequestCard
                        key={req.id}
                        request={req}
                        isHelper={false}
                        isOwn={false}
                        onAccept={() => handleAccept(req)}
                        onOpenDetails={setDetailsRequest}
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
            <div className="sticky top-20 space-y-4">

              {/* Community */}
              <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Your Community</p>
                </div>
                <p className="text-white font-bold text-lg mb-1">📍 {profile?.community || '—'}</p>
                <p className="text-gray-500 text-xs">
                  {communityRequests.length} active request{communityRequests.length !== 1 ? 's' : ''} in your area
                </p>
              </div>

              {/* Quick Profile */}
              <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Quick Profile</p>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar profile={profile} size={11} />
                  <div>
                    <p className="text-white font-bold text-sm">{profile?.full_name}</p>
                    <p className="text-gray-500 text-xs">@{profile?.username}</p>
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-extrabold text-brand-green">{profile?.helps_completed || 0}</p>
                  <p className="text-gray-400 text-xs mt-0.5">helps completed</p>
                  {(profile?.helps_completed || 0) > 5 && (
                    <span className="inline-block mt-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-2.5 py-0.5 rounded-full">⭐ Trusted</span>
                  )}
                </div>
              </div>

              {/* Invite */}
              <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">📨 Invite Neighbours</p>
                <p className="text-gray-500 text-xs mb-3 leading-relaxed">Share HelpNear with people in your area.</p>
                <button onClick={handleInvite}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                  {inviteCopied ? '✓ Link Copied!' : '🔗 Copy Invite Link'}
                </button>
              </div>

              <button onClick={handleSignOut} className="w-full text-gray-600 hover:text-red-400 text-sm font-medium transition-colors py-2">
                Sign out
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Bottom Banner ── */}
      <BottomBanner community={profile?.community} />

      {/* ── Modals ── */}
      {showNotifs && <NotificationsModal notifications={notifications} onClose={() => setShowNotifs(false)} onMarkRead={handleMarkNotifsRead} />}
      {showChatList && <ChatListModal acceptedRequests={acceptedRequests} currentUserId={userId} onSelectChat={setChatRequest} onClose={() => setShowChatList(false)} />}
      {chatRequest && <ChatModal request={chatRequest} currentUserId={userId} onClose={() => setChatRequest(null)} />}
      {celebrating && <CelebrationModal onClose={() => setCelebrating(false)} />}
      {showNewForm && <NewRequestModal onClose={() => setShowNewForm(false)} onSubmit={handleSubmitRequest} submitting={submitting} />}
      {detailsRequest && (
        <RequestDetailsModal
          request={detailsRequest}
          currentUserId={userId}
          isAccepted={acceptedRequests.some(r => r.id === detailsRequest.id)}
          onAccept={() => handleAccept(detailsRequest)}
          onChat={() => setChatRequest(detailsRequest)}
          onClose={() => setDetailsRequest(null)}
          accepting={acceptingId === detailsRequest?.id}
        />
      )}
      {cancelTarget && (
        <CancelConfirmModal
          request={cancelTarget}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelTarget(null)}
          loading={cancelling}
        />
      )}
    </div>
  )
}
