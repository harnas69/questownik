import { supabase } from './supabase'
import type { DraftPoint } from '../types/route'

export interface SavedRoute {
  code: string
  teacherKey: string
}

export async function saveRoute(
  title: string,
  points: DraftPoint[],
  allowManual: boolean
): Promise<SavedRoute> {
  const { data, error } = await supabase.rpc('create_route_with_key', {
    p_title: title.trim(),
    p_allow_manual: allowManual,
    p_points: points,
  })
  if (error) throw error
  const d = data as { code: string; teacher_key: string }
  return { code: d.code, teacherKey: d.teacher_key }
}