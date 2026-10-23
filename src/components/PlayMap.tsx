import { useEffect, useRef, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { GeoPos } from '../lib/geo'
import { TILE_ATTRIBUTION, TILE_URL } from '../lib/tiles'

interface Target {
  lat: number
  lng: number
  radiusM: number
}

interface Props {
  target: Target
  pos: GeoPos | null
}

const targetIcon = L.divIcon({
  className: 'pin',
  html: '📍',
  iconSize: [32, 32],
  iconAnchor: [16, 30],
})

// Dopasowuje widok do celu i gracza: przy zmianie celu, po kliknięciu przycisku
// oraz gdy gracz wyjdzie poza widoczny fragment mapy.
function AutoFit({ target, pos, signal }: { target: Target; pos: GeoPos | null; signal: number }) {
  const map = useMap()
  const lastKey = useRef('')
  const plat = pos?.lat
  const plng = pos?.lng

  useEffect(() => {
    const points: L.LatLngTuple[] = [[target.lat, target.lng]]
    let outside = false
    if (plat !== undefined && plng !== undefined) {
      points.push([plat, plng])
      outside = !map.getBounds().contains([plat, plng])
    }
    const key = `${target.lat},${target.lng},${plat !== undefined},${signal}`
    if (key !== lastKey.current || outside) {
      lastKey.current = key
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 18, animate: false })
    }
  }, [map, target.lat, target.lng, plat, plng, signal])

  return null
}

export default function PlayMap({ target, pos }: Props) {
  const [signal, setSignal] = useState(0)

  return (
    <div className="map-block">
      <div className="map-wrap" role="region" aria-label="Mapa z Twoją pozycją i celem">
        <MapContainer center={[target.lat, target.lng]} zoom={17}>
          <TileLayer crossOrigin attribution={TILE_ATTRIBUTION} url={TILE_URL} />
          <AutoFit target={target} pos={pos} signal={signal} />

          <Circle
            center={[target.lat, target.lng]}
            radius={target.radiusM}
            interactive={false}
            pathOptions={{ color: '#d9480f', weight: 2, fillOpacity: 0.15 }}
          />
          <Marker
            position={[target.lat, target.lng]}
            icon={targetIcon}
            interactive={false}
            keyboard={false}
          />

          {pos && (
            <>
              {pos.accuracy <= 200 && (
                <Circle
                  center={[pos.lat, pos.lng]}
                  radius={pos.accuracy}
                  interactive={false}
                  pathOptions={{ color: '#1c7ed6', weight: 1, fillOpacity: 0.1 }}
                />
              )}
              <Polyline
                positions={[
                  [pos.lat, pos.lng],
                  [target.lat, target.lng],
                ]}
                interactive={false}
                pathOptions={{ color: '#1c7ed6', weight: 3, dashArray: '6 8' }}
              />
              <CircleMarker
                center={[pos.lat, pos.lng]}
                radius={9}
                interactive={false}
                pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#1c7ed6', fillOpacity: 1 }}
              />
            </>
          )}
        </MapContainer>
      </div>
      <button type="button" onClick={() => setSignal((s) => s + 1)}>
        Pokaż mnie i cel
      </button>
    </div>
  )
}