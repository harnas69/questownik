export interface TeacherLink {
  code: string
  key: string
}

// Wyciąga kod trasy i klucz z linku nauczyciela: https://.../nauczyciel/KOD#klucz
export function parseTeacherLink(text: string): TeacherLink | null {
  const m = text.trim().match(/\/nauczyciel\/([A-Za-z0-9]{4,10})#([A-Za-z0-9]{16,128})$/)
  if (!m) return null
  return { code: m[1].toUpperCase(), key: m[2] }
}