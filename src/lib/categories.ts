export interface Option {
  id: string
  label: string
}

// Te same identyfikatory są w ograniczeniach tabeli route_templates w bazie
export const SUBJECTS: readonly Option[] = [
  { id: 'historia', label: 'Historia' },
  { id: 'geografia', label: 'Geografia' },
  { id: 'polski', label: 'Język polski' },
  { id: 'matematyka', label: 'Matematyka' },
  { id: 'przyroda', label: 'Przyroda i biologia' },
  { id: 'jezyki', label: 'Języki obce' },
  { id: 'informatyka', label: 'Informatyka' },
  { id: 'sztuka', label: 'Sztuka i kultura' },
  { id: 'wf', label: 'Wychowanie fizyczne' },
  { id: 'integracja', label: 'Integracja i wycieczki' },
  { id: 'inne', label: 'Inne' },
]

export const LEVELS: readonly Option[] = [
  { id: 'sp1_3', label: 'Klasy 1-3' },
  { id: 'sp4_6', label: 'Klasy 4-6' },
  { id: 'sp7_8', label: 'Klasy 7-8' },
  { id: 'lo', label: 'Szkoła ponadpodstawowa' },
]

export const TYPE_OPTIONS: readonly Option[] = [
  { id: 'quiz', label: 'Quiz' },
  { id: 'open', label: 'Pytanie otwarte' },
  { id: 'code', label: 'Kod z tabliczki' },
  { id: 'photo', label: 'Zdjęcie' },
  { id: 'text', label: 'Informacja' },
]

export const SIZE_OPTIONS: readonly Option[] = [
  { id: 'short', label: 'Krótka (do 5 punktów)' },
  { id: 'medium', label: 'Średnia (6-10 punktów)' },
  { id: 'long', label: 'Długa (powyżej 10 punktów)' },
]

export function labelOf(list: readonly Option[], id: string | null | undefined): string | null {
  if (!id) return null
  return list.find((o) => o.id === id)?.label ?? null
}