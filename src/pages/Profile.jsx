import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import { ProfileSkeleton } from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'

function AvatarUpload({ profile, userId, onUpdate }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(profile?.avatar_url || null)
  const [imgErr, setImgErr] = useState(false)
  const fileRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Only JPG, PNG, or WebP images are allowed.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB.')
      return
    }

    setUploading(true)
    try {
      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1]
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath])
      }

      const ext = file.name.split('.').pop()
      const filePath = `${userId}/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('avatars').upload(filePath, file, { upsert: true })
      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage
        .from('avatars').getPublicUrl(filePath)

      const { error: updateErr } = await supabase
        .from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
      if (updateErr) throw updateErr

      setPreview(publicUrl)
      setImgErr(false)
      onUpdate({ ...profile, avatar_url: publicUrl })
    } catch (err) {
      alert('Upload failed: ' + (err.message || 'Unknown error'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        {preview && !imgErr ? (
          <img
            src={preview}
            alt="Avatar"
            onError={() => setImgErr(true)}
            className="w-24 h-24 rounded-full object-cover border-4 border-gray-700"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-brand-red flex items-center justify-center text-white text-4xl font-extrabold border-4 border-gray-700">
            {profile?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
        )}

        {/* Overlay on hover */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          {uploading
            ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <span className="text-white text-xs font-semibold">📷 Change</span>
          }
        </button>
      </div>

      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="text-brand-blue hover:text-blue-400 text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : '📷 Change Avatar'}
      </button>
      <p className="text-gray-600 text-xs">JPG, PNG, WebP · max 2MB</p>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}

export default function Profile({ session }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [completedHistory, setCompletedHistory] = useState([])
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ full_name: '', phone: '', community: '', bio: '' })

  const userId = session.user.id

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: p }, { data: h }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('requests')
          .select('*, requester_profile:profiles!requests_requester_id_fkey(id, full_name, username, avatar_url)')
          .eq('helper_id', userId).eq('status', 'completed')
          .order('created_at', { ascending: false }).limit(20),
      ])
      if (p) {
        setProfile(p)
        setForm({ full_name: p.full_name || '', phone: p.phone || '', community: p.community || '', bio: p.bio || '' })
      }
      if (h) setCompletedHistory(h)
      setLoading(false)
    }
    fetchAll()
  }, [userId])

  const handleChange = e => { setForm(prev => ({ ...prev, [e.target.name]: e.target.value })); setError('') }

  const handleSave = async () => {
    if (!form.full_name.trim()) { setError('Full name is required.'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const { error: e } = await supabase.from('profiles')
        .update({ full_name: form.full_name.trim(), phone: form.phone.trim(), community: form.community.trim(), bio: form.bio.trim() })
        .eq('id', userId)
      if (e) throw e
      setProfile(prev => ({ ...prev, ...form }))
      setEditing(false); setSuccess('Profile updated!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { setError(err.message || 'Failed to save.') }
    finally { setSaving(false) }
  }

  const handleCancel = () => {
    setForm({ full_name: profile?.full_name || '', phone: profile?.phone || '', community: profile?.community || '', bio: profile?.bio || '' })
    setEditing(false); setError('')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('helpnear_safety_accepted')
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex">
        <Sidebar profile={null} />
        <div className="flex-1 px-4 py-8 max-w-xl mx-auto w-full"><ProfileSkeleton /></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <Sidebar profile={profile} onProfileUpdate={setProfile} />

      <div className="flex-1 px-4 py-8 max-w-xl mx-auto w-full">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm font-medium">
          ← Back to Dashboard
        </Link>

        <div className="animate-slide-up space-y-4">

          {/* Avatar + name card */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <AvatarUpload profile={profile} userId={userId} onUpdate={setProfile} />
              <div className="text-center sm:text-left">
                <h1 className="text-2xl font-extrabold text-white">{profile?.full_name}</h1>
                <p className="text-gray-400">@{profile?.username}</p>
                <p className="text-gray-500 text-sm mt-1">📍 {profile?.community || 'No community set'}</p>
                {profile?.bio && <p className="text-gray-300 text-sm mt-3 leading-relaxed max-w-xs">{profile.bio}</p>}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 text-center">
              <p className="text-4xl font-extrabold text-brand-green mb-1">{profile?.helps_completed || 0}</p>
              <p className="text-gray-400 text-sm">Helps Completed</p>
              {(profile?.helps_completed || 0) > 5 && (
                <span className="inline-block mt-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-2.5 py-1 rounded-full font-medium">
                  ⭐ Trusted
                </span>
              )}
            </div>
            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 text-center">
              <p className="text-lg font-bold text-white mb-1">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
              </p>
              <p className="text-gray-400 text-sm">Member Since</p>
            </div>
          </div>

          {/* Edit form */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white text-lg">Profile Details</h2>
              {!editing && (
                <button onClick={() => setEditing(true)} className="text-brand-blue hover:text-blue-400 text-sm font-semibold transition-colors">Edit</button>
              )}
            </div>

            {error && <div className="mb-4 bg-red-900/30 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm">{error}</div>}
            {success && <div className="mb-4 bg-green-900/30 border border-green-800 text-green-300 rounded-xl px-4 py-3 text-sm">✓ {success}</div>}

            <div className="space-y-4">
              {[
                { key: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Your name' },
                { key: 'phone', label: 'Phone', type: 'tel', placeholder: 'Optional' },
                { key: 'community', label: 'Community', type: 'text', placeholder: 'Your neighbourhood' },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">{label}</label>
                  {editing ? (
                    <input type={type} name={key} value={form[key]} onChange={handleChange} placeholder={placeholder}
                      className="w-full bg-gray-900 border border-gray-700 focus:border-brand-blue text-white placeholder-gray-600 rounded-xl px-4 py-2.5 outline-none transition-colors text-sm" />
                  ) : (
                    <p className="text-white text-sm">{profile?.[key] || (key === 'phone' ? 'Not set' : '—')}</p>
                  )}
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Bio</label>
                {editing ? (
                  <textarea name="bio" value={form.bio} onChange={handleChange} placeholder="Tell your community about yourself..." rows={3}
                    className="w-full bg-gray-900 border border-gray-700 focus:border-brand-blue text-white placeholder-gray-600 rounded-xl px-4 py-2.5 outline-none transition-colors text-sm resize-none" />
                ) : (
                  <p className="text-white text-sm">{profile?.bio || 'No bio yet'}</p>
                )}
              </div>

              {editing && (
                <div className="flex gap-3 pt-2">
                  <button onClick={handleCancel} className="flex-1 border border-gray-700 text-gray-400 hover:text-white py-3 rounded-xl font-semibold text-sm transition-colors">Cancel</button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 bg-brand-blue hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                    {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Help History */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <h2 className="font-bold text-white text-lg mb-4">Help History</h2>
            {completedHistory.length === 0 ? (
              <EmptyState type="history" />
            ) : (
              <div className="space-y-3">
                {completedHistory.map(req => (
                  <div key={req.id} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-white font-semibold text-sm">{req.help_type}</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        For: <span className="text-gray-300">{req.requester_profile?.full_name || 'Unknown'}</span>
                      </p>
                      <p className="text-gray-600 text-xs mt-1 font-mono">
                        {req.created_at ? new Date(req.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                    <span className="bg-green-900/30 text-green-300 text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0">✓ Done</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleSignOut}
            className="w-full border border-red-900/40 hover:border-red-700 text-red-400 hover:text-red-300 py-3 rounded-xl font-semibold text-sm transition-all">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
