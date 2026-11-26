import { useState } from 'react'
import type { Ref } from 'react'

interface Props {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  error?: string | null
  describedBy?: string
  toggleHint?: string
  inputRef?: Ref<HTMLInputElement>
}

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
  describedBy,
  toggleHint,
  inputRef,
}: Props) {
  const [shown, setShown] = useState(false)
  const errId = `${id}-error`
  const described = [error ? errId : null, describedBy].filter(Boolean).join(' ') || undefined

  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="pw-field">
        <input
          id={id}
          ref={inputRef}
          className="answer"
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
        />
        {/* Nazwa przycisku jest stała, a stan zmienia aria-pressed */}
        <button
          type="button"
          className="pw-toggle"
          aria-pressed={shown}
          onClick={() => setShown((v) => !v)}
        >
          Pokaż
          <span className="sr-only"> hasło{toggleHint ? ` (${toggleHint})` : ''}</span>
        </button>
      </div>
      {error && (
        <p id={errId} role="alert" className="bad field-error">
          {error}
        </p>
      )}
    </div>
  )
}