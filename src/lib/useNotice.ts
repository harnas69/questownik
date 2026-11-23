import { useCallback, useEffect, useRef, useState } from 'react'

// Komunikat, który znika sam po kilku sekundach
export function useNotice(ms = 6000) {
  const [notice, setNoticeState] = useState('')
  const timer = useRef<number | undefined>(undefined)

  const setNotice = useCallback(
    (text: string) => {
      setNoticeState(text)
      window.clearTimeout(timer.current)
      if (text) timer.current = window.setTimeout(() => setNoticeState(''), ms)
    },
    [ms]
  )

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return [notice, setNotice] as const
}