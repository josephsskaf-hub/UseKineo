import { semLevaSobreMain2610 } from './leva-rebase-2610.mjs' // KINEO-LEVA-REBASE-2610: newest merged source leaves before exact main hashes.
// [TRAVA 8.2 — vai do fundador 26/10 "o ads de 15 está horrível… arrumasse para mim o mais rápido possível"] KINEO-FILME15-FIEL-2610 —
// desfaz EXATO, em memória, da camada "filme de 15 s fiel": idioma do filme pelo roteiro (compose), Whisper no idioma do filme
// (lib/whisperNaEscrita), protagonista em PT/ES/EN vira história com personagem (lib/cinematic/visualMode), crítico do still em
// 'enforce' no filme grátis de 15 s (lib/cinematic/criticoStill + rota). Tabela de trechos (before/after com 1 linha de contexto)
// em desfaz-filme15-fiel-2610-hunks.json. Sem a marca = intocado. Trecho ausente/ambíguo ou resultado diferente da base = LANÇA.
// Camada MAIS NOVA: desfaz-caption-canonico-2610 (a cabeça da corrente) chama isto PRIMEIRO. Fim de linha: o do próprio texto.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { semFilme15Rosto2610 } from './desfaz-filme15-rosto-2610.mjs' // KINEO-FILME15-ROSTO-2610 — camada mais nova sai primeiro
export const MARCA_FILME15_FIEL_2610 = 'KINEO-FILME15-FIEL-2610'
export const FILME15_FIEL_2610 = JSON.parse(readFileSync(new URL('./desfaz-filme15-fiel-2610-hunks.json', import.meta.url), 'utf8'))
export const FILME15_FIEL_2610_BASE = FILME15_FIEL_2610.base
export const FILME15_FIEL_2610_ARQUIVOS = Object.freeze(Object.keys(FILME15_FIEL_2610.scope))
const sha = (t) => createHash('sha256').update(t).digest('hex')

// Intersection of the immutable main guardian scopes with this reviewed merge.
// Other paths have no newer main overlap; leave them to their original LEVA undo chain.
const MAIN_REBASE_OVERLAPS_2610 = new Set([
  '.github/workflows/guardiao.yml', 'app/api/compose/route.ts',
  'docs/video-fiel-2610/test-legacy-layer.mjs', 'scripts/test-idiomas-formatos-undo-2410.mjs',
  'scripts/test-locale-readiness.mjs', 'scripts/test-support/desfaz-compra-clareza-2610.mjs',
  'scripts/test-support/desfaz-idiomas-formatos-2410.mjs',
])
export function semFilme15Fiel2610(texto, p) {
  if (MAIN_REBASE_OVERLAPS_2610.has(String(p ?? '').replace(/\\/g, '/'))) texto = semLevaSobreMain2610(texto, p)
  texto = semFilme15Rosto2610(texto, p) // KINEO-FILME15-ROSTO-2610
  const rel = String(p ?? '').split(String.fromCharCode(92)).join('/')
  const entry = FILME15_FIEL_2610.scope[rel]
  if (typeof texto !== 'string' || !entry || !texto.includes(MARCA_FILME15_FIEL_2610)) return texto
  const crlf = texto.includes('\r\n')
  let t = texto.replace(/\r\n/g, '\n')
  if (sha(t) === entry.beforeSha256) return texto
  for (const h of entry.hunks) {
    const n = t.split(h.after).length - 1
    if (n !== 1) throw new Error(`desfaz ${MARCA_FILME15_FIEL_2610}: trecho ${n === 0 ? 'ausente' : 'ambíguo'} em ${rel}`)
    t = t.replace(h.after, () => h.before)
  }
  if (sha(t) !== entry.beforeSha256) throw new Error(`desfaz ${MARCA_FILME15_FIEL_2610}: resultado diverge da base em ${rel}`)
  return crlf ? t.replace(/\n/g, '\r\n') : t
}
