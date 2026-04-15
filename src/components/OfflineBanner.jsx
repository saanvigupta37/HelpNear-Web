import { useState, useEffect } from 'react'

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)
  const [showBack, setShowBack] = useState(false)

  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true)
      setWasOffline(true)
      setShowBack(false)
    }
    const goOnline = () => {
      setIsOffline(false)
      if (wasOffline) {
        setShowBack(true)
        setTimeout(() => setShowBack(false), 3000)
      }
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [wasOffline])

  if (!isOffline && !showBack) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all animate-slide-up ${
      isOffline
        ? 'bg-red-900/90 text-red-200 border-b border-red-800'
        : 'bg-green-900/90 text-green-200 border-b border-green-800'
    }`}>
      {isOffline ? (
        <>
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          You're offline. Changes will sync when you're back online.
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-green-400" />
          Back online! ✓
        </>
      )}
    </div>
  )
}
