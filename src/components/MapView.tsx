import { Fragment } from 'react'
import { MapContainer, TileLayer, Marker, Circle, Tooltip, useMapEvents } from 'react-leaflet'
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
  selected: number | null
  onAdd: (lat: number, lng: number) => void
  onSelect: (index: number) => void
  onMove: (index: number, lat: number, lng: number) => void
}

function ClickHandler({ onAdd }: { onAdd: Props['onAdd'] }) {
  useMapEvents({ click: (e) => onAdd(e.latlng.lat, e.latlng.lng) })
  return null
}

export default function MapView({ points, selected, onAdd, onSelect, onMove }: Props) {
  return (
    <MapContainer center={[51.7611, 18.091]} zoom={15} style={{ height: '70vh', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onAdd={onAdd} />
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