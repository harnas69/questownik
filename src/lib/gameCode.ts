// Kod gry ma 6 znaków. Przyjmujemy też cały link (np. skopiowany od nauczyciela)
// oraz kod zapisany z odstępami lub myślnikami.
export function extractGameCode(input: string): string | null {
  const t = input.trim()

  const fromUrl = t.match(/\/(?:gra|ranking)\/([A-Za-z0-9]{6})(?![A-Za-z0-9])/)
  if (fromUrl) return fromUrl[1].toUpperCase()

  const compact = t.replace(/[\s-]/g, '')
  if (/^[A-Za-z0-9]{6}$/.test(compact)) return compact.toUpperCase()

  return null
}