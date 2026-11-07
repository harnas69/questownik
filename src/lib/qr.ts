// Kod punktu to 10 znaków szesnastkowych (0-9, A-F), np. A3F92C7B1E.
export function extractToken(text: string): string | null {
  const t = text.trim()

  // Link z kodu QR: .../gra/KOD#qr=A3F92C7B1E
  const fromLink = t.match(/[#?&]qr=([0-9A-Fa-f]{10})(?![0-9A-Fa-f])/)
  if (fromLink) return fromLink[1].toUpperCase()

  // Sam kod, także wpisany ręcznie: A3F92C7B1E, A3F92 C7B1E, A3F92-C7B1E
  if (/^[0-9A-Fa-f]{10}$/.test(t)) return t.toUpperCase()
  const grouped = t.match(/^([0-9A-Fa-f]{5})[\s-]+([0-9A-Fa-f]{5})$/)
  if (grouped) return (grouped[1] + grouped[2]).toUpperCase()

  return null
}

export function formatToken(token: string): string {
  return `${token.slice(0, 5)} ${token.slice(5)}`
}