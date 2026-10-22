import { supabase } from './supabase'
import type { GameRoute } from '../types/game'

class RouteNotFoundError extends Error {}

const cacheKey = (code: string) => `questownik:route:${code}`

async function fetchRoute(code: string): Promise<GameRoute> {
  const { data: route, error } = await supabase
    .from('routes')
    .select('id, code, title, allow_manual')
    .eq('code', code)
    .maybeSingle()
  if (error) throw error
  if (!route) throw new RouteNotFoundError('Nie znaleziono trasy o takim kodzie.')

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
    allowManual: Boolean(route.allow_manual),
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

export async function loadRoute(code: string): Promise<GameRoute> {
  try {
    const route = await fetchRoute(code)
    try {
      localStorage.setItem(cacheKey(code), JSON.stringify(route))
    } catch {
      // brak miejsca lub dostępu: pomijamy
    }
    return route
  } catch (e) {
    if (e instanceof RouteNotFoundError) throw e
    try {
      const raw = localStorage.getItem(cacheKey(code))
      if (raw) return JSON.parse(raw) as GameRoute
    } catch {
      // uszkodzony zapis: zgłaszamy pierwotny błąd
    }
    throw e
  }
}