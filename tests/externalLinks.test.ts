import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const srcDir = fileURLToPath(new URL('../src/', import.meta.url))
const files = (readdirSync(srcDir, { recursive: true }) as string[]).filter((f) =>
  f.endsWith('.tsx')
)

describe('linki otwierane w nowej karcie (WCAG 3.2.5)', () => {
  it('każdy target="_blank" ma informację dla czytników ekranu', () => {
    const offenders: string[] = []
    for (const f of files) {
      const text = readFileSync(join(srcDir, f), 'utf8')
      const blanks = text.match(/target=["']_blank["']/g)?.length ?? 0
      const notes = text.match(/otwiera się w nowej karcie/g)?.length ?? 0
      if (blanks > notes) offenders.push(`${f}: ${blanks} linków, ${notes} opisów`)
    }
    expect(offenders, `Użyj <ExternalLink>:\n${offenders.join('\n')}`).toEqual([])
  })
})