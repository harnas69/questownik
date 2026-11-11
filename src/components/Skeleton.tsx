interface Props {
  label?: string
}

// Cała strona w trakcie wczytywania
export function PageSkeleton({ label = 'Wczytuję…' }: Props) {
  return (
    <main className="play" aria-busy="true">
      <p className="sr-only" role="status">
        {label}
      </p>
      <div className="skeleton sk-title" />
      <div className="skeleton sk-card" />
      <div className="skeleton sk-card" />
    </main>
  )
}

// Fragment strony (lista tras, wyniki itp.)
export function BlockSkeleton({ rows = 2, label = 'Wczytuję…' }: Props & { rows?: number }) {
  return (
    <div className="sk-stack" aria-busy="true">
      <p className="sr-only" role="status">
        {label}
      </p>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton sk-card" />
      ))}
    </div>
  )
}