import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function CommunityModal({ profile, onClose, onUpdate }) {
  const [community, setCommunity] = useState(profile?.community || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)

  const detectLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          const data = await res.json()
          const suburb = data.address?.suburb || data.address?.neighbourhood || data.address?.village || data.address?.town || data.address?.city || ''
          if (suburb) setCommunity(suburb)
        } catch { setError('Could not detect location.') }
        finally { setLocating(false) }
      },
      () => { setError('Location access denied.'); setLocating(false) }
    )
  }

  const handleSave = async () => {
    if (!community.trim()) { setError('Community name cannot be empty.'); return }
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ community: community.trim() })
        .eq('id', profile.id)
      if (err) throw err
      onUpdate(community.trim())
      onClose()
    } catch (e) {
      setError(e.message || 'Failed to update community.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-sm border border-gray-700 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h3 className="font-bold text-white">My Community</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">Current community</p>
            <p className="text-white font-semibold text-lg">📍 {profile?.community || 'Not set'}</p>
          </div>
          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Change community</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={community}
                onChange={e => { setCommunity(e.target.value); setError('') }}
                placeholder="e.g. Greenwood Heights"
                className="flex-1 bg-gray-900 border border-gray-700 focus:border-brand-green text-white placeholder-gray-600 rounded-xl px-4 py-2.5 outline-none transition-colors text-sm"
              />
              <button
                onClick={detectLocation}
                disabled={locating}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 rounded-xl transition-colors flex items-center justify-center min-w-[44px]"
                title="Auto-detect"
              >
                {locating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '📍'}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-700 text-gray-400 hover:text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-brand-green hover:bg-green-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

