export default function FieldError({ id, text }: { id: string; text?: string | null }) {
  if (!text) return null
  return (
    <p id={id} className="bad field-error">
      <span className="sr-only">Błąd: </span>
      {text}
    </p>
  )
}