// Gdy komunikatu nie ma, element zostaje w drzewie dla czytników ekranu, ale nie zajmuje miejsca
export default function Notice({ text }: { text: string }) {
  return (
    <div role="status" className={text ? 'banner good' : 'sr-only'}>
      {text}
    </div>
  )
}