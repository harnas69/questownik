import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import icon from 'leaflet/dist/images/marker-icon.png'
import icon2x from 'leaflet/dist/images/marker-icon-2x.png'
import shadow from 'leaflet/dist/images/marker-shadow.png'
import type { DraftPoint } from '../types/route'

L.Icon.Default.mergeOptions({
  iconUrl: icon,
  iconRetinaUrl: icon2x,
  shadowUrl: shadow,
})

interface Props {
  points: DraftPoint[]
  onAdd: (lat: number, lng: number) => void
}

function ClickHandler({ onAdd }: { onAdd: Props['onAdd'] }) {
  useMapEvents({ click: (e) => onAdd(e.latlng.lat, e.latlng.lng) })
  return null
}

export default function MapView({ points, onAdd }: Props) {
  return (
    <MapContainer
      center={[51.7611, 18.091]}
      zoom={15}
      style={{ height: '70vh', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onAdd={onAdd} />
      {points.map((p, i) => (
        <span key={i}>
          <Marker position={[p.lat, p.lng]} />
          <Circle center={[p.lat, p.lng]} radius={p.radiusM} />
        </span>
      ))}
    </MapContainer>
  )
}