import { supabase } from './supabase'

export interface MyRoute {
  code: string
  title: string
  created_at: string
  closed: boolean
  teams: number
  points: number
}

export async function listMyRoutes(): Promise<MyRoute[]> {
  const { data, error } = await supabase.rpc('my_routes')
  if (error) throw error
  return (data ?? []) as MyRoute[]
}

export async function claimRoute(code: string, key: string): Promise<string> {
  const { data, error } = await supabase.rpc('claim_route', { p_code: code, p_key: key })
  if (error) throw error
  return data as string
}