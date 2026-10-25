import { supabase } from './supabase'

export interface PhotoItem {
  id: string
  team: string
  position: number
  prompt: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export function isForbidden(e: unknown): boolean {
  const msg = (e as { message?: string } | null)?.message ?? ''
  return msg.includes('forbidden')
}

export async function listPhotos(code: string, key: string): Promise<PhotoItem[]> {
  const { data, error } = await supabase.rpc('teacher_list_photos', { p_code: code, p_key: key })
  if (error) throw error
  return (data ?? []) as PhotoItem[]
}

export async function fetchPhotoImage(code: string, key: string, id: string): Promise<string> {
  const { data, error } = await supabase.rpc('teacher_photo_image', {
    p_code: code,
    p_key: key,
    p_id: id,
  })
  if (error) throw error
  return data as string
}

export async function reviewPhoto(
  code: string,
  key: string,
  id: string,
  approve: boolean
): Promise<void> {
  const { error } = await supabase.rpc('teacher_review', {
    p_code: code,
    p_key: key,
    p_submission: id,
    p_approve: approve,
  })
  if (error) throw error
}

export async function deleteReviewed(code: string, key: string): Promise<number> {
  const { data, error } = await supabase.rpc('teacher_delete_photos', { p_code: code, p_key: key })
  if (error) throw error
  return Number(data ?? 0)
}