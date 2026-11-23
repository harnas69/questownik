import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'

export interface TabDef {
  id: string
  label: string
  badge?: { count: number; label: string }
}

interface Props {
  tabs: TabDef[]
  active: string
  onChange: (id: string) => void
  label: string
  idPrefix?: string
}

// Zakładki zgodne ze wzorcem ARIA: strzałki, Home i End zmieniają zakładkę.
// Panel zakładki: <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-${id}`}>
export default function Tabs({ tabs, active, onChange, label, idPrefix = 'tab' }: Props) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    refs.current[active]?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })
  }, [active])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.id === active)
    let next = -1
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    if (next < 0) return
    e.preventDefault()
    const id = tabs[next].id
    onChange(id)
    refs.current[id]?.focus()
  }

  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[t.id] = el
          }}
          type="button"
          role="tab"
          id={`${idPrefix}-${t.id}`}
          aria-selected={t.id === active}
          aria-controls={`${idPrefix}-panel-${t.id}`}
          tabIndex={t.id === active ? 0 : -1}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.badge && (
            <span className="tab-badge">
              <span aria-hidden="true">{t.badge.count}</span>
              <span className="sr-only">
                , {t.badge.count} {t.badge.label}
              </span>
            </span>
          )}
        </button>
      ))}
    </div>
  )
}