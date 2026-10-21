import { supabase } from './supabase'
import type { DraftPoint } from '../types/route'

function makeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

export async function saveRoute(title: string, points: DraftPoint[]) {
  const code = makeCode()

  const { data: route, error } = await supabase
    .from('routes')
    .insert({ code, title })
    .select()
    .single()
  if (error) throw error

  const rows = points.map((p, i) => ({
    route_id: route.id,
    position: i,
    lat: p.lat,
    lng: p.lng,
    radius_m: p.radiusM,
  }))
  const { error: pointsError } = await supabase.from('points').insert(rows)
  if (pointsError) throw pointsError

  return code
}