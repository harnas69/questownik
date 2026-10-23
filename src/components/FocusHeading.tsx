import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export default function FocusHeading({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])
  return (
    <h2 ref={ref} tabIndex={-1}>
      {children}
    </h2>
  )
}