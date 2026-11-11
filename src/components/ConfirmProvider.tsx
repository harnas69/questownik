import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ConfirmContext } from '../lib/confirm'
import type { ConfirmFn, ConfirmOptions } from '../lib/confirm'

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  const confirm = useCallback<ConfirmFn>((o) => {
    resolver.current?.(false) // poprzednie pytanie, jeśli jeszcze wisi
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setOpts(o)
    })
  }, [])

  useEffect(() => {
    const d = dialog.current
    if (opts && d && !d.open) d.showModal()
  }, [opts])

  const close = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    dialog.current?.close()
    setOpts(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialog}
        className="dialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
        onCancel={(e) => {
          e.preventDefault()
          close(false)
        }}
        onClick={(e) => {
          if (e.target === dialog.current) close(false)
        }}
      >
        {opts && (
          <div className="dialog-body">
            <h2 id="dialog-title">{opts.title}</h2>
            <p id="dialog-message">{opts.message}</p>
            <div className="dialog-actions">
              <button type="button" onClick={() => close(false)}>
                {opts.cancelLabel ?? 'Anuluj'}
              </button>
              <button
                type="button"
                className={opts.danger ? 'danger solid' : 'primary'}
                onClick={() => close(true)}
              >
                {opts.confirmLabel ?? 'Potwierdź'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  )
}