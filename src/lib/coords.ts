export type Axis = 'lat' | 'lng'

export const COORD_LIMIT: Record<Axis, number> = { lat: 90, lng: 180 }

// Przyjmuje kropkę i przecinek dziesiętny oraz znak stopnia: "51,7611", "51.7611", "51.7611°"
export function parseCoord(text: string, axis: Axis): number | null {
  const t = text.trim().replace(/\s+/g, '').replace('°', '').replace(',', '.')
  if (!/^[+-]?\d{1,3}(?:\.\d+)?$/.test(t)) return null
  const n = Number(t)
  if (!Number.isFinite(n) || Math.abs(n) > COORD_LIMIT[axis]) return null
  return Math.round(n * 1e6) / 1e6 // 6 miejsc po przecinku to około 0,1 m
}

export function formatCoord(n: number): string {
  return String(Math.round(n * 1e6) / 1e6)
}