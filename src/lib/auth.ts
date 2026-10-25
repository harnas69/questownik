import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface AuthState {
  user: User | null
  loading: boolean
}

// Zwraca tylko zalogowane KONTO. Gracz z anonimową sesją liczy się jako niezalogowany.
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(() => {
    let active = true
    const apply = (u: User | null | undefined) => {
      if (!active) return
      setState({ user: u && !u.is_anonymous ? u : null, loading: false })
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return state
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/konto` },
  })
  if (error) throw error
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<'signedIn' | 'confirm'> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: `${window.location.origin}/konto` },
  })
  if (error) throw error
  return data.session && !data.session.user.is_anonymous ? 'signedIn' : 'confirm'
}

export async function signOutAccount(): Promise<void> {
  await supabase.auth.signOut()
}

export function authErrorMessage(e: unknown): string {
  const msg = ((e as { message?: string } | null)?.message ?? '').toLowerCase()
  if (msg.includes('invalid login credentials')) return 'Nieprawidłowy e-mail lub hasło.'
  if (msg.includes('email not confirmed'))
    return 'Adres e-mail nie jest potwierdzony. Kliknij link z wiadomości wysłanej po rejestracji.'
  if (msg.includes('already registered')) return 'Konto z tym adresem już istnieje. Zaloguj się.'
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.'
  if (msg.includes('password') && msg.includes('character'))
    return 'Hasło jest za krótkie (minimum 8 znaków).'
  if (msg.includes('provider is not enabled') || msg.includes('unsupported provider'))
    return 'Logowanie przez Google nie jest jeszcze włączone w Supabase.'
  return 'Nie udało się zalogować. Spróbuj ponownie.'
}