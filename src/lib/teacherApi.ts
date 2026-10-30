import { supabase } from './supabase'
import type { SessionRow } from './ranking'
import type { TaskType } from '../types/route'

export interface PhotoItem {
  id: string
  team: string
  position: number
  prompt: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface PointStat {
  position: number
  type: TaskType
  prompt: string
  score: number
  answered: number
  correct: number
  avg_attempts: number | null
}

export interface Overview {
  title: string
  closed: boolean
  teams: number
  finished: number
  points: PointStat[]
}

export interface PointResultRow {
  position: number
  earned: number
  attempts: number
  correct: boolean
}

export interface TeamResult extends SessionRow {
  results: PointResultRow[]
}

export function isForbidden(e: unknown): boolean {
  const msg = (e as { message?: string } | null)?.message ?? ''
  return msg.includes('forbidden')
}

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  return data as T
}

export async function listPhotos(code: string, key: string): Promise<PhotoItem[]> {
  return (await call<PhotoItem[] | null>('teacher_list_photos', { p_code: code, p_key: key })) ?? []
}

export function fetchPhotoImage(code: string, key: string, id: string): Promise<string> {
  return call<string>('teacher_photo_image', { p_code: code, p_key: key, p_id: id })
}

export async function reviewPhoto(code: string, key: string, id: string, approve: boolean): Promise<void> {
  await call('teacher_review', { p_code: code, p_key: key, p_submission: id, p_approve: approve })
}

export async function deleteReviewed(code: string, key: string): Promise<number> {
  return Number((await call<number | null>('teacher_delete_photos', { p_code: code, p_key: key })) ?? 0)
}

export function getOverview(code: string, key: string): Promise<Overview> {
  return call<Overview>('teacher_overview', { p_code: code, p_key: key })
}

export async function getResults(code: string, key: string): Promise<TeamResult[]> {
  return (await call<TeamResult[] | null>('teacher_results', { p_code: code, p_key: key })) ?? []
}

export async function setClosed(code: string, key: string, closed: boolean): Promise<void> {
  await call('teacher_set_closed', { p_code: code, p_key: key, p_closed: closed })
}

export async function resetSessions(code: string, key: string): Promise<number> {
  return Number((await call<number | null>('teacher_reset_sessions', { p_code: code, p_key: key })) ?? 0)
}

export async function deleteRoute(code: string, key: string): Promise<void> {
  await call('teacher_delete_route', { p_code: code, p_key: key })
}

