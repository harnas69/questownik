import { useTheme } from '../lib/theme'
import type { ThemeChoice } from '../lib/theme'

const NEXT: Record<ThemeChoice, ThemeChoice> = { auto: 'light', light: 'dark', dark: 'auto' }
const ICON: Record<ThemeChoice, string> = { auto: '🌓', light: '☀️', dark: '🌙' }
const SHORT: Record<ThemeChoice, string> = { auto: 'Auto', light: 'Jasny', dark: 'Ciemny' }
const LONG: Record<ThemeChoice, string> = {
  auto: 'automatyczny (zgodny z urządzeniem)',
  light: 'jasny',
  dark: 'ciemny',
}

export default function ThemeToggle() {
  const { theme, set } = useTheme()
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => set(NEXT[theme])}
      aria-label={`Motyw: ${LONG[theme]}. Kliknij, aby zmienić na: ${LONG[NEXT[theme]]}.`}
    >
      <span aria-hidden="true">{ICON[theme]}</span>
      <span aria-hidden="true" className="theme-text">
        {SHORT[theme]}
      </span>
    </button>
  )
}