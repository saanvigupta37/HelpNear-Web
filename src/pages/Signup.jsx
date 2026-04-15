import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    community: '',
  })
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          )
          const data = await res.json()
          const suburb =
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.village ||
            data.address?.town ||
            data.address?.city ||
            'My Community'
          setForm(prev => ({ ...prev, community: suburb }))
        } catch {
          setError('Could not determine your location. Please type it manually.')
        } finally {
          setLocating(false)
        }
      },
      () => {
        setError('Location access denied. Please type your community name.')
        setLocating(false)
      }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { fullName, username, email, password, community } = form

    if (!fullName || !username || !email || !password || !community) {
      setError('Please fill in all required fields.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: username.toLowerCase().trim(),
            community: community.trim(),
          }
        }
      })

      if (signUpError) throw signUpError

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: fullName.trim(),
            username: username.toLowerCase().trim(),
            community: community.trim(),
            helps_completed: 0,
          })

        if (profileError) throw profileError

        navigate('/safety')
      }
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('This email is already in use. Try logging in.')
      } else {
        setError(err.message || 'Signup failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-brand-green opacity-5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-brand-red opacity-5 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-slide-up relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-red flex items-center justify-center">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <span className="font-bold text-2xl text-white">HelpNear</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white mb-2">Join your community</h1>
          <p className="text-gray-400">Start giving and receiving help today</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          {error && (
            <div className="mb-5 bg-red-900/30 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Jane Smith"
                className="w-full bg-gray-900 border border-gray-700 focus:border-brand-green text-white placeholder-gray-600 rounded-xl px-4 py-3 outline-none transition-colors"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="janesmith"
                className="w-full bg-gray-900 border border-gray-700 focus:border-brand-green text-white placeholder-gray-600 rounded-xl px-4 py-3 outline-none transition-colors"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full bg-gray-900 border border-gray-700 focus:border-brand-green text-white placeholder-gray-600 rounded-xl px-4 py-3 outline-none transition-colors"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 6 characters"
                className="w-full bg-gray-900 border border-gray-700 focus:border-brand-green text-white placeholder-gray-600 rounded-xl px-4 py-3 outline-none transition-colors"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Community / Neighbourhood</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="community"
                  value={form.community}
                  onChange={handleChange}
                  placeholder="e.g. Greenwood Heights"
                  className="flex-1 bg-gray-900 border border-gray-700 focus:border-brand-green text-white placeholder-gray-600 rounded-xl px-4 py-3 outline-none transition-colors"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locating || loading}
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 rounded-xl transition-colors flex items-center justify-center gap-1 text-sm font-medium min-w-[60px]"
                  title="Auto-detect location"
                >
                  {locating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    '📍'
                  )}
                </button>
              </div>
              <p className="text-gray-600 text-xs mt-1.5">Click 📍 to auto-detect your neighbourhood</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-green hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 mt-6 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-green hover:text-green-400 font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}