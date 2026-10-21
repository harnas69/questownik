export interface GeoPos {
  lat: number
  lng: number
  accuracy: number
}

const R = 6371000 // promień Ziemi w metrach

export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Tolerancja: gdy GPS jest niedokładny, dajemy bonus do promienia (maks. 25 m).
export function isInRange(
  pos: GeoPos,
  target: { lat: number; lng: number; radiusM: number }
): boolean {
  const d = distanceM(pos.lat, pos.lng, target.lat, target.lng)
  return d <= target.radiusM + Math.min(pos.accuracy, 25)
}