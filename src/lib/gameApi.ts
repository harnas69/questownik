import { supabase } from './supabase'
import type { GameRoute } from '../types/game'

export async function loadRoute(code: string): Promise<GameRoute> {
  const { data: route, error } = await supabase
    .from('routes')
    .select('id, code, title')
    .eq('code', code)
    .maybeSingle()
  if (error) throw error
  if (!route) throw new Error('Nie znaleziono trasy o takim kodzie.')

  const { data: pts, error: pointsError } = await supabase
    .from('points')
    .select('*')
    .eq('route_id', route.id)
    .order('position')
  if (pointsError) throw pointsError

  return {
    id: route.id,
    code: route.code,
    title: route.title,
    points: (pts ?? []).map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      radiusM: p.radius_m,
      taskType: p.task_type,
      content: { prompt: '', ...p.content },
      score: p.score,
      hint: p.hint,
    })),
  }
}