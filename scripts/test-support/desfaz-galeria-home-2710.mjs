// KINEO-GALERIA-HOME-2710 — DESFAZ, em memória, esta entrega ("Made with Kineo": item do menu do topo + galeria em /made-with-kineo +
// ?prompt= do /clips) nos arquivos que ela MODIFICOU, para os guardiões que conferem arquivos/menus BYTE A BYTE contra uma base
// anterior. Diff REVERSO exato (contexto 3, manifesto desfaz-galeria-home-2710-hunks.json gerado por
// generate-galeria-home-2710-undo.cjs): cada bloco de AGORA aparece UMA vez e volta a ser o de ANTES. Arquivo fora da lista ou sem a
// marca volta igual (inclusive os mutantes históricos, que recebem a fonte já projetada). É a camada mais nova destes arquivos —
// desfaça ESTA primeiro.
import { readFileSync } from 'node:fs'

const MANIFESTO = JSON.parse(readFileSync(new URL('./desfaz-galeria-home-2710-hunks.json', import.meta.url), 'utf8'))
export const GALERIA_HOME_2710_MARCA = MANIFESTO.marca
export const GALERIA_HOME_2710_BASE = MANIFESTO.base
export const GALERIA_HOME_2710_ARQUIVOS = Object.keys(MANIFESTO.files)
/** Arquivos novos desta entrega (não existem na base). */
export const GALERIA_HOME_2710_NOVOS = [
  'lib/homeGaleria.ts', 'lib/homeGaleriaItems.ts', 'components/KineoHouseGallery.tsx', 'scripts/test-galeria-home-2710.mjs',
  'scripts/test-support/desfaz-galeria-home-2710.mjs', 'scripts/test-support/desfaz-galeria-home-2710-hunks.json',
  'scripts/test-support/generate-galeria-home-2710-undo.cjs',
]

export function semGaleriaHome2710(text, rel) {
  if (typeof text !== 'string') return text // null (arquivo ausente) e não-texto passam como vieram
  const original = text
  const hunks = MANIFESTO.files[String(rel ?? '').replace(/\\/g, '/').replace(/^\.\//, '')]
  if (!hunks || !original.includes(GALERIA_HOME_2710_MARCA)) return original
  const crlf = original.includes('\r\n')
  let s = original.replace(/\r\n/g, '\n')
  for (const h of hunks) {
    const parts = s.split(h.after)
    if (parts.length !== 2) return original // fonte mudou fora desta camada (ex.: mutante histórico): não projeta, o guardião julga o que vê
    s = parts.join(h.before)
  }
  if (s.includes(GALERIA_HOME_2710_MARCA)) throw new Error('semGaleriaHome2710: sobrou linha marcada em ' + rel)
  return crlf ? s.replace(/\n/g, '\r\n') : s
}
