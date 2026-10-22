// KINEO-CARTOON-CONSISTENCIA-2210 — desfaz somente esta entrega em memória; contagens e trocas inteiras, base exata.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
export const CARTOON_CONSISTENCIA_MARK = 'KINEO-CARTOON-CONSISTENCIA-2210'
export const CARTOON_CONSISTENCIA_BASE = '1b991815ca62701c2c6e06a69aa2eba068e63d5f'
const table = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-cartoon-consistencia-2210-trocas.json'), 'utf8'))
export const CARTOON_CONSISTENCIA_ADDITIONS = Object.freeze(table.__acrescimos)
export const CARTOON_CONSISTENCIA_FILES = Object.freeze(Object.keys(table.__acrescimos))
export const CARTOON_CONSISTENCIA_NEW = Object.freeze([
  'lib/kidsCartoon/cartoonConsistency.ts', 'lib/kidsCartoon/cartoonDuration.ts', 'lib/kidsCartoon/cartoonReferenceServer.ts',
  'scripts/test-cartoon-consistencia-2210.mjs', 'scripts/test-cartoon-duration-floor-2210.mjs',
  'scripts/test-support/cartoon-story-ui-proof-2210.mjs', 'scripts/test-support/cartoon-retry-cap-proof-2210.mjs',
  'scripts/test-support/cartoon-episode-budget-proof-2210.mjs',
  'scripts/test-support/cartoon-music-budget-proof-2210.mjs',
  'scripts/test-support/desfaz-cartoon-consistencia-2210.mjs', 'scripts/test-support/desfaz-cartoon-consistencia-2210-trocas.json',
  'docs/previews/cartoon-consistencia-2210-before-after.html', 'docs/previews/cartoon-consistencia-2210-desktop.png', 'docs/previews/cartoon-consistencia-2210-mobile.png',
  'docs/CARTOON-CONSISTENCIA-2026-10-22.md', 'docs/verification/cartoon-consistencia-2210-suite.json',
])
export function semCartoonConsistencia2210(texto, file) {
  const relative = String(file ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !Object.hasOwn(table.__acrescimos, relative) || !texto.includes(CARTOON_CONSISTENCIA_MARK)) return texto
  const swaps = new Map(table[relative] ?? []), used = new Set(), kept = []
  let normalized = texto.replace(/\r\n/g, '\n')
  for (const [after, before] of table.__contextos?.[relative] ?? []) {
    if (normalized.split(after).length - 1 !== 1) throw new Error('desfaz-cartoon-consistencia-2210: contexto divergente ' + relative)
    normalized = normalized.replace(after, before)
  }
  let removed = 0
  for (const line of normalized.split('\n')) {
    if (!line.includes(CARTOON_CONSISTENCIA_MARK)) kept.push(line)
    else if (swaps.has(line)) {
      if (used.has(line)) throw new Error('desfaz-cartoon-consistencia-2210: troca duplicada ' + relative)
      kept.push(swaps.get(line)); used.add(line)
    } else removed++
  }
  if (removed !== table.__acrescimos[relative] || used.size !== swaps.size) throw new Error('desfaz-cartoon-consistencia-2210: contagem/troca divergente ' + relative)
  const out = kept.join('\n')
  return texto.includes('\r\n') ? out.replace(/\n/g, '\r\n') : out
}
