import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Missing Supabase env vars. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
})

/**
 * Reliably increment helps_completed.
 * Tries the RPC function first, falls back to a direct update if RPC fails.
 */
export async function incrementHelps(userId) {
  // ── Attempt 1: SQL function ──
  const { error: rpcError } = await supabase.rpc('increment_helps', { user_id: userId })

  if (!rpcError) {
    console.log('incrementHelps: RPC succeeded')
    return { error: null }
  }

  console.warn('incrementHelps: RPC failed, trying direct update.', rpcError.message)

  // ── Attempt 2: Read then write ──
  const { data: row, error: readErr } = await supabase
    .from('profiles')
    .select('helps_completed')
    .eq('id', userId)
    .single()

  if (readErr) {
    console.error('incrementHelps: read failed', readErr.message)
    return { error: readErr }
  }

  const current = row?.helps_completed ?? 0

  const { error: writeErr } = await supabase
    .from('profiles')
    .update({ helps_completed: current + 1 })
    .eq('id', userId)

  if (writeErr) {
    console.error('incrementHelps: write failed', writeErr.message)
  } else {
    console.log(`incrementHelps: direct update succeeded. New count: ${current + 1}`)
  }

  return { error: writeErr }
}
