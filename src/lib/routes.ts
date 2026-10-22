import { supabase } from './supabase'
import type { DraftPoint } from '../types/route'

export async function saveRoute(
  title: string,
  points: DraftPoint[],
  allowManual: boolean
): Promise<string> {
  const { data, error } = await supabase.rpc('create_route', {
    p_title: title.trim(),
    p_allow_manual: allowManual,
    p_points: points,
  })
  if (error) throw error
  return data as string
}