import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Safety from './pages/Safety'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import OfflineBanner from './components/OfflineBanner'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [safetyAccepted, setSafetyAccepted] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (localStorage.getItem('helpnear_safety_accepted')) setSafetyAccepted(true)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-brand-red border-t-transparent animate-spin" />
          <p className="text-gray-400 font-mono text-sm">Loading HelpNear...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <OfflineBanner />
      <Routes>
        <Route path="/" element={!session ? <Landing /> : <Navigate to="/dashboard" />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/signup" element={!session ? <Signup /> : <Navigate to={safetyAccepted ? '/dashboard' : '/safety'} />} />
        <Route path="/safety" element={
          session
            ? safetyAccepted
              ? <Navigate to="/dashboard" />
              : <Safety onAccept={() => { setSafetyAccepted(true); localStorage.setItem('helpnear_safety_accepted', 'true') }} />
            : <Navigate to="/login" />
        } />
        <Route path="/dashboard" element={
          session
            ? safetyAccepted ? <Dashboard session={session} /> : <Navigate to="/safety" />
            : <Navigate to="/login" />
        } />
        <Route path="/profile" element={
          session
            ? safetyAccepted ? <Profile session={session} /> : <Navigate to="/safety" />
            : <Navigate to="/login" />
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App