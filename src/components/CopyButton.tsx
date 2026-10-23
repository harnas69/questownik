import { useState } from 'react'
import { copyText } from '../lib/clipboard'

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')

  const onClick = async () => {
    const ok = await copyText(text)
    setState(ok ? 'ok' : 'fail')
    window.setTimeout(() => setState('idle'), 2500)
  }

  return (
    <>
      <button type="button" onClick={onClick}>
        {label}
      </button>
      <span role="status" className="copy-status">
        {state === 'ok' ? 'Skopiowano!' : state === 'fail' ? 'Nie udało się skopiować' : ''}
      </span>
    </>
  )
}