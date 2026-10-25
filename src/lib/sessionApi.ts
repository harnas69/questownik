import { supabase } from './supabase'
import type { SessionRow } from './ranking'
import type { AnswerResult, SessionState } from '../types/game'

export interface RouteInfo {
  id: string
  code: string
  title: string
  pointCount: number
}

async function ensureSignedIn() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}

export async function createSession(routeId: string, teamName: string): Promise<string> {
  await ensureSignedIn()
  const { data, error } = await supabase.rpc('start_session', {
    p_route: routeId,
    p_team: teamName,
  })
  if (error) throw error
  return data as string
}

interface RawResult {
  correct: boolean
  earned: number
  attempts: number
  current_idx: number
  score: number
  correct_count: number
  finished_at: string | null
}

function toResult(d: RawResult): AnswerResult {
  return {
    correct: d.correct,
    earned: d.earned,
    attempts: d.attempts,
    currentIdx: d.current_idx,
    score: d.score,
    correctCount: d.correct_count,
    finishedAt: d.finished_at,
  }
}

export async function submitAnswer(
  sessionId: string,
  pointId: string,
  given: string | number | null,
  skip = false
): Promise<AnswerResult> {
  const { data, error } = await supabase.rpc('submit_answer', {
    p_session: sessionId,
    p_point: pointId,
    p_given: given ?? undefined,
    p_skip: skip,
  })
  if (error) throw error
  return toResult(data as RawResult)
}

export async function submitPhoto(
  sessionId: string,
  pointId: string,
  image: string
): Promise<AnswerResult> {
  const { data, error } = await supabase.rpc('submit_photo', {
    p_session: sessionId,
    p_point: pointId,
    p_image: image,
  })
  if (error) throw error
  return toResult(data as RawResult)
}

export async function fetchSessionState(id: string): Promise<SessionState | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('team_name, current_idx, score, correct_count, started_at, finished_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    teamName: data.team_name,
    currentIdx: data.current_idx,
    score: data.score,
    correctCount: data.correct_count,
    startedAt: data.started_at,
    finishedAt: data.finished_at,
  }
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