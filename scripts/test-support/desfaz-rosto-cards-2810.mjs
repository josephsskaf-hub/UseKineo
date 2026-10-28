// KINEO-ROSTO-NO-CLIPE-2810 — a CORRENTE das camadas DESFAZ das entregas de 28/10 deste ramo (codex/rosto-cards-2810), da mais nova
// para a mais velha. Os guardiões antigos que conferem arquivos byte a byte chamam SÓ esta função, antes de todas as outras camadas:
//   semRostoCards2810(fs.readFileSync(p, 'utf8'), p)
// Entrega nova neste ramo = uma camada nova no topo de CAMADAS (gerada por generate-rosto-cards-2810-undo.mjs).
import path from 'node:path'
import { semRostoNoClipe2810, ARQUIVOS as ROSTO_NO_CLIPE_ARQUIVOS } from './desfaz-rosto-no-clipe-2810.mjs'
import { semCardsRosto2810, ARQUIVOS as CARDS_ROSTO_ARQUIVOS } from './desfaz-cards-rosto-2810.mjs'
import { semGaleriaCheia2810, ARQUIVOS as GALERIA_CHEIA_ARQUIVOS } from './desfaz-galeria-cheia-2810.mjs'
import { semMenuUniforme2810, ARQUIVOS as MENU_UNIFORME_ARQUIVOS } from './desfaz-menu-uniforme-2810.mjs'
import { semRostoAjuste2810, ARQUIVOS as ROSTO_AJUSTE_ARQUIVOS } from './desfaz-rosto-ajuste-2810.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
/** Da mais nova para a mais velha. */
const CAMADAS = [semRostoAjuste2810, semMenuUniforme2810, semGaleriaCheia2810, semCardsRosto2810, semRostoNoClipe2810]
/** Todos os arquivos que as entregas deste ramo modificaram (para inventários de guardiões antigos). */
export const ARQUIVOS_ROSTO_CARDS_2810 = [...new Set([...ROSTO_AJUSTE_ARQUIVOS, ...MENU_UNIFORME_ARQUIVOS, ...GALERIA_CHEIA_ARQUIVOS, ...CARDS_ROSTO_ARQUIVOS, ...ROSTO_NO_CLIPE_ARQUIVOS])]

export function relDe(p) {
  const s = String(p ?? '')
  const rel = path.isAbsolute(s) ? path.relative(ROOT, s) : s
  return rel.replace(/\\/g, '/').replace(/^\.\//, '')
}

export function semRostoCards2810(text, p) {
  const rel = relDe(p)
  return CAMADAS.reduce((s, desfaz) => desfaz(s, rel), text)
}
