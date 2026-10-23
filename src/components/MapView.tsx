import { Fragment, useEffect } from 'react'
import type { RefObject } from 'react'
import { MapContainer, TileLayer, Marker, Circle, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import icon from 'leaflet/dist/images/marker-icon.png'
import icon2x from 'leaflet/dist/images/marker-icon-2x.png'
import shadow from 'leaflet/dist/images/marker-shadow.png'
import type { DraftPoint } from '../types/route'
import { TILE_ATTRIBUTION, TILE_URL } from '../lib/tiles'

L.Icon.Default.mergeOptions({
  iconUrl: icon,
  iconRetinaUrl: icon2x,
  shadowUrl: shadow,
})

interface Props {
  points: DraftPoint[]
  selected: number | null
  mapRef: RefObject<LeafletMap | null>
  onAdd: (lat: number, lng: number) => void
  onSelect: (index: number) => void
  onMove: (index: number, lat: number, lng: number) => void
}

function ClickHandler({ onAdd }: { onAdd: Props['onAdd'] }) {
  useMapEvents({ click: (e) => onAdd(e.latlng.lat, e.latlng.lng) })
  return null
}

// Gdy wybrany punkt jest poza widokiem (np. wybrany z listy), przesuwamy mapę do niego
function FocusSelected({ point }: { point: DraftPoint | null }) {
  const map = useMap()
  const lat = point?.lat
  const lng = point?.lng
  useEffect(() => {
    if (lat === undefined || lng === undefined) return
    if (!map.getBounds().contains([lat, lng])) map.panTo([lat, lng])
  }, [map, lat, lng])
  return null
}

export default function MapView({ points, selected, mapRef, onAdd, onSelect, onMove }: Props) {
  const selectedPoint = selected !== null ? (points[selected] ?? null) : null

  return (
    <MapContainer
      ref={mapRef}
      center={[51.7611, 18.091]}
      zoom={15}
      style={{ height: '70vh', width: '100%' }}
    >
      <TileLayer crossOrigin attribution={TILE_ATTRIBUTION} url={TILE_URL} />
      <ClickHandler onAdd={onAdd} />
      <FocusSelected point={selectedPoint} />
      {points.map((p, i) => (
        <Fragment key={i}>
          <Marker
            position={[p.lat, p.lng]}
            draggable
            eventHandlers={{
              click: () => onSelect(i),
              dragend: (e) => {
                const { lat, lng } = (e.target as L.Marker).getLatLng()
                onMove(i, lat, lng)
              },
            }}
          >
            <Tooltip permanent direction="top" offset={[-15, -20]}>
              {i + 1}
            </Tooltip>
          </Marker>
          <Circle
            center={[p.lat, p.lng]}
            radius={p.radiusM}
            interactive={false}
            pathOptions={{ color: i === selected ? '#d9480f' : '#3388ff' }}
          />
        </Fragment>
      ))}
    </MapContainer>
  )
}