export type Proximity = 'here' | 'veryNear' | 'near' | 'onTheWay' | 'far'

export function proximity(distM: number, radiusM: number): Proximity {
  if (distM <= radiusM) return 'here'
  if (distM <= 100) return 'veryNear'
  if (distM <= 300) return 'near'
  if (distM <= 1000) return 'onTheWay'
  return 'far'
}

export const PROXIMITY_LABEL: Record<Proximity, string> = {
  here: 'Jesteś na miejscu',
  veryNear: 'Bardzo blisko',
  near: 'Blisko',
  onTheWay: 'W drodze',
  far: 'Daleko',
}