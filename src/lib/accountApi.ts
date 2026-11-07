import { supabase } from './supabase'
import type { DraftPoint, TaskType } from '../types/route'

export interface TemplateItem {
  id: string
  title: string
  created_at: string
  updated_at: string
  points: number
  games: number
  is_public: boolean
  hidden: boolean
  description: string
  author_name: string
  allow_copy: boolean
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

export type LibrarySort = 'new' | 'popular'

export interface LibraryItem {
  id: string
  title: string
  description: string
  author: string
  points: number
  types: Partial<Record<TaskType, number>>
  games: number
  publishedAt: string
  allowCopy: boolean
  mine: boolean
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

export async function getTemplate(id: string): Promise<TemplateData> {
  const t = await call<TemplateData>('get_template', { p_id: id })
  return {
    ...t,
    points: t.points.map((p) => ({ ...p, unlock: p.unlock === 'qr' ? 'qr' : 'gps' })),
  }
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

export async function publishTemplate(
  id: string,
  isPublic: boolean,
  author: string,
  description: string,
  allowCopy: boolean
): Promise<void> {
  await call('publish_template', {
    p_id: id,
    p_public: isPublic,
    p_author: author.trim(),
    p_description: description.trim(),
    p_allow_copy: allowCopy,
  })
}

export async function searchTemplates(
  query: string,
  sort: LibrarySort,
  limit: number,
  offset: number
): Promise<LibraryItem[]> {
  return (
    (await call<LibraryItem[] | null>('search_templates', {
      p_query: query,
      p_sort: sort,
      p_limit: limit,
      p_offset: offset,
    })) ?? []
  )
}

export function copyTemplate(id: string): Promise<string> {
  return call<string>('copy_template', { p_id: id })
}

export async function reportTemplate(id: string, reason: string): Promise<void> {
  await call('report_template', { p_id: id, p_reason: reason })
}

export function accountErrorMessage(e: unknown): string {
  const msg = (e as { message?: string } | null)?.message ?? ''
  if (msg.includes('account required')) return 'Sesja wygasła. Zaloguj się ponownie.'
  if (msg.includes('route limit'))
    return 'Osiągnięto limit 100 tras na koncie. Usuń niepotrzebne trasy.'
  if (msg.includes('game limit'))
    return 'Osiągnięto limit 200 gier na koncie. Usuń stare gry w ich panelach.'
  if (msg.includes('publish limit'))
    return 'Możesz mieć najwyżej 20 publicznych tras. Wycofaj którąś z biblioteki.'
  if (msg.includes('report limit')) return 'Wysłano dziś zbyt wiele zgłoszeń. Spróbuj jutro.'
  if (msg.includes('invalid author')) return 'Podaj nazwę autora (od 1 do 40 znaków).'
  if (msg.includes('invalid description')) return 'Opis może mieć najwyżej 300 znaków.'
  if (msg.includes('invalid reason')) return 'Wybierz powód zgłoszenia.'
  if (msg.includes('publish blocked'))
    return 'Publikowanie jest zablokowane: dwie Twoje trasy zostały ukryte po zgłoszeniach. Skontaktuj się z administratorem serwisu.'
  if (msg.includes('hidden content'))
    return 'Ta trasa ma taką samą treść jak trasa ukryta po zgłoszeniach, więc nie można jej opublikować.'
  if (msg.includes('hidden'))
    return 'Ta trasa jest ukryta po zgłoszeniach i nie można jej opublikować.'
  if (msg.includes('already owned')) return 'Ta trasa należy już do innego konta.'
  if (msg.includes('forbidden')) return 'Brak dostępu do tej trasy (mogła zostać wycofana).'
  if (/^(Punkt \d+:|Nieprawidłowy tytuł|Trasa musi)/.test(msg)) return msg
    return 'Operacja nie powiodła się. Sprawdź internet i spróbuj ponownie.'
}

export async function deleteMyAccount(): Promise<void> {
  await call('delete_my_account')
}