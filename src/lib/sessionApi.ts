import { supabase } from './supabase'
import type { SessionRow } from './ranking'

export interface RouteInfo {
  id: string
  code: string
  title: string
  pointCount: number
}

export interface SessionPatch {
  current_idx: number
  score: number
  correct_count: number
  finished_at: string | null
}

async function ensureSignedIn() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}

export async function createSession(routeId: string, teamName: string): Promise<string> {
  await ensureSignedIn()
  const { data, error } = await supabase
    .from('sessions')
    .insert({ route_id: routeId, team_name: teamName })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function updateSession(id: string, patch: SessionPatch) {
  const { error } = await supabase
    .from('sessions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function loadRouteInfo(code: string): Promise<RouteInfo> {
  const { data: route, error } = await supabase
    .from('routes')
    .select('id, code, title')
    .eq('code', code)
    .maybeSingle()
  if (error) throw error
  if (!route) throw new Error('Nie znaleziono trasy o takim kodzie.')

  const { count, error: countError } = await supabase
    .from('points')
    .select('id', { count: 'exact', head: true })
    .eq('route_id', route.id)
  if (countError) throw countError

  return { id: route.id, code: route.code, title: route.title, pointCount: count ?? 0 }
}

export async function fetchSessions(routeId: string): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, team_name, current_idx, score, correct_count, started_at, finished_at')
    .eq('route_id', routeId)
  if (error) throw error
  return (data ?? []) as SessionRow[]
}

export function subscribeSessions(routeId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`ranking:${routeId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sessions', filter: `route_id=eq.${routeId}` },
      onChange
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}