import { supabase } from './supabase'
import type { DraftPoint } from '../types/route'

export interface TemplateItem {
  id: string
  title: string
  created_at: string
  updated_at: string
  points: number
  games: number
}

export interface GameItem {
  code: string
  title: string
  created_at: string
  closed: boolean
  teams: number
  points: number
}

export interface TemplateData {
  id: string
  title: string
  allowManual: boolean
  points: DraftPoint[]
}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  return data as T
}

export async function listTemplates(): Promise<TemplateItem[]> {
  return (await call<TemplateItem[] | null>('my_templates')) ?? []
}

export async function listGames(): Promise<GameItem[]> {
  return (await call<GameItem[] | null>('my_games')) ?? []
}

export function getTemplate(id: string): Promise<TemplateData> {
  return call<TemplateData>('get_template', { p_id: id })
}

export function saveTemplate(
  id: string | null,
  title: string,
  points: DraftPoint[],
  allowManual: boolean
): Promise<string> {
  return call<string>('save_template', {
    p_id: id,
    p_title: title.trim(),
    p_allow_manual: allowManual,
    p_points: points,
  })
}

export async function deleteTemplate(id: string): Promise<void> {
  await call('delete_template', { p_id: id })
}

export function launchGame(templateId: string): Promise<string> {
  return call<string>('launch_game', { p_template: templateId })
}

export function claimRoute(code: string, key: string): Promise<string> {
  return call<string>('claim_route', { p_code: code, p_key: key })
}

export function accountErrorMessage(e: unknown): string {
  const msg = (e as { message?: string } | null)?.message ?? ''
  if (msg.includes('account required')) return 'Sesja wygasła. Zaloguj się ponownie.'
  if (msg.includes('route limit'))
    return 'Osiągnięto limit 100 tras na koncie. Usuń niepotrzebne trasy.'
  if (msg.includes('game limit'))
    return 'Osiągnięto limit 200 gier na koncie. Usuń stare gry w ich panelach.'
  if (msg.includes('already owned')) return 'Ta trasa należy już do innego konta.'
  if (msg.includes('forbidden')) return 'Brak dostępu do tej trasy.'
  if (/^(Punkt \d+:|Nieprawidłowy tytuł|Trasa musi)/.test(msg)) return msg
  return 'Operacja nie powiodła się. Sprawdź internet i spróbuj ponownie.'
}