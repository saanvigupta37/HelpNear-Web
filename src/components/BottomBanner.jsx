import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function BottomBanner({ community }) {
  const [count, setCount] = useState(0)

  const fetchCount = async () => {
    if (!community) return
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: c } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .eq('community', community)
      .gte('updated_at', since)
    setCount(c || 0)
  }

  useEffect(() => {
    fetchCount()
    const channel = supabase
      .channel('banner-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests' }, fetchCount)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [community])

  if (count === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-gray-800/95 border-t border-gray-700 backdrop-blur-md">
      <span className="text-brand-green animate-pulse-soft">💚</span>
      <span className="text-gray-300">
        <span className="text-white font-bold">{count}</span> {count === 1 ? 'person helped' : 'people helped'} others today in{' '}
        <span className="text-brand-green">{community}</span>
      </span>
    </div>
  )
}
