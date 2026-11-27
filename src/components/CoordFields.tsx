import { useState } from 'react'
import { COORD_LIMIT, formatCoord, parseCoord } from '../lib/coords'
import type { Axis } from '../lib/coords'
import type { DraftPoint } from '../types/route'

// Wartość trzymana jako tekst, żeby dało się ją swobodnie edytować; zatwierdzana po opuszczeniu pola lub Enterem
function CoordField({
  id,
  label,
  axis,
  value,
  onCommit,
}: {
  id: string
  label: string
  axis: Axis
  value: number
  onCommit: (n: number) => void
}) {
  const [text, setText] = useState(formatCoord(value))
  const [prev, setPrev] = useState(value)
  const [rejected, setRejected] = useState(false)
  if (value !== prev) {
    setPrev(value)
    setText(formatCoord(value))
  }
  const limit = COORD_LIMIT[axis]
  const noteId = `${id}-note`
  const errId = `${id}-error`

  const commit = () => {
    const n = parseCoord(text, axis)
    if (n === null) {
      setText(formatCoord(value))
      setRejected(true)
      return
    }
    setText(formatCoord(n))
    setRejected(false)
    if (formatCoord(n) !== formatCoord(value)) onCommit(n)
  }

  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        value={text}
        aria-invalid={rejected ? true : undefined}
        aria-describedby={rejected ? `${noteId} ${errId}` : noteId}
        onChange={(e) => {
          setText(e.target.value)
          setRejected(false)
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
      />
      <p id={noteId} className="note">
        Liczba od -{limit} do {limit}.
      </p>
      {rejected && (
        <p id={errId} role="alert" className="bad field-error">
          Wpisz liczbę od -{limit} do {limit}, np. 51.7611. Przywrócono poprzednią wartość.
        </p>
      )}
    </div>
  )
}

interface Props {
  index: number
  lat: number
  lng: number
  onChange: (patch: Partial<DraftPoint>) => void
}

export default function CoordFields({ index, lat, lng, onChange }: Props) {
  return (
    <fieldset className="coords">
      <legend>Położenie punktu</legend>
      <div className="pf-grid">
        <CoordField
          id={`pt${index}-lat`}
          label="Szerokość geograficzna (lat)"
          axis="lat"
          value={lat}
          onCommit={(n) => onChange({ lat: n })}
        />
        <CoordField
          id={`pt${index}-lng`}
          label="Długość geograficzna (lng)"
          axis="lng"
          value={lng}
          onCommit={(n) => onChange({ lng: n })}
        />
      </div>
      <p className="note">
        Możesz wpisać współrzędne z dowolnej mapy (kropka lub przecinek). Marker przesunie się od
        razu.
      </p>
    </fieldset>
  )
}