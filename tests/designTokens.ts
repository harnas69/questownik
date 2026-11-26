import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../src/lib/contrast'

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

function declarations(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) out[m[1]] = m[2].trim()
  return out
}

// Łączy wszystkie bloki o danym selektorze (późniejsze deklaracje nadpisują wcześniejsze)
function tokens(selector: string): Record<string, string> {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`${esc}\\s*\\{([^}]*)\\}`, 'g')
  let merged: Record<string, string> = {}
  for (const m of css.matchAll(re)) merged = { ...merged, ...declarations(m[1]) }
  return merged
}

const light = tokens(':root')
const darkMedia = tokens(':root:not([data-theme="light"])')
const darkExplicit = tokens(':root[data-theme="dark"]')
const dark = { ...light, ...darkExplicit }

describe.each([
  ['jasny', light],
  ['ciemny', dark],
] as const)('motyw %s', (_name, t) => {
  it('definiuje tokeny kontrastu jako kolory #rrggbb', () => {
    for (const k of ['--control-border', '--placeholder', '--bg', '--surface', '--surface-2']) {
      expect(t[k], k).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('ramka kontrolek ma co najmniej 3:1 względem tła i powierzchni (WCAG 1.4.11)', () => {
    for (const bg of ['--bg', '--surface', '--surface-2']) {
      expect(contrastRatio(t['--control-border'], t[bg]), `--control-border na ${bg}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('tekst zastępczy ma co najmniej 4,5:1 (WCAG 1.4.3)', () => {
    for (const bg of ['--bg', '--surface', '--surface-2']) {
      expect(contrastRatio(t['--placeholder'], t[bg]), `--placeholder na ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('spójność ciemnego motywu', () => {
  it('blok dla ustawień systemu ma te same wartości co ręcznie wybrany motyw', () => {
    for (const [k, v] of Object.entries(darkMedia)) {
      expect(darkExplicit[k], k).toBe(v)
    }
  })
})

describe('tekst zastępczy', () => {
  it('żadna reguła ::placeholder nie obniża przezroczystości', () => {
    for (const m of css.matchAll(/::placeholder[^{]*\{([^}]*)\}/g)) {
      const op = /opacity\s*:\s*([\d.]+)/.exec(m[1])
      if (op) expect(Number(op[1]), m[0]).toBe(1)
    }
  })
})