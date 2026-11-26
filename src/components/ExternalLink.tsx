import type { ReactNode } from 'react'

interface Props {
  href: string
  className?: string
  children: ReactNode
}

// Link w nowej karcie z informacją dla czytników ekranu (WCAG 3.2.5)
export default function ExternalLink({ href, className, children }: Props) {
  return (
    <a href={href} className={className} target="_blank" rel="noreferrer">
      {children}
      <span className="sr-only"> (otwiera się w nowej karcie)</span>
    </a>
  )
}