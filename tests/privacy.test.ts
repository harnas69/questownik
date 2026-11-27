import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const src = readFileSync(new URL('../src/pages/PrivacyPage.tsx', import.meta.url), 'utf8')

describe('strona prywatności', () => {
  it.each(['CONTROLLER', 'CONTACT', 'REGION'])(
    '%s jest zwykłym tekstem, bez nawiasów kwadratowych',
    (name) => {
      const m = new RegExp(`const ${name}\\s*=\\s*(['"\`])([\\s\\S]*?)\\1`).exec(src)
      expect(m, `nie znaleziono stałej ${name}`).not.toBeNull()
      const value = (m?.[2] ?? '').trim()
      expect(value.startsWith('[') || value.endsWith(']'), value).toBe(false)
    }
  )
})