import { supabase } from './supabase'

export interface AdminReport {
  id: string
  title: string
  author: string
  isPublic: boolean
  hidden: boolean
  reports: number
  lastReport: string
  reasons: string[]
  prompts: string[]
}

export async function amIAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('am_i_admin')
  if (error) return false
  return data === true
}

export async function listReports(): Promise<AdminReport[]> {
  const { data, error } = await supabase.rpc('admin_reports')
  if (error) throw error
  return (data ?? []) as AdminReport[]
}

export async function setHidden(id: string, hidden: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_hidden', { p_id: id, p_hidden: hidden })
  if (error) throw error
}

export async function adminDeleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_template', { p_id: id })
  if (error) throw error
}