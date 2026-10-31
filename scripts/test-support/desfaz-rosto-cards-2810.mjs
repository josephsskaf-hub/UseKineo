// KINEO-ROSTO-NO-CLIPE-2810 — a CORRENTE das camadas DESFAZ das entregas de 28/10 deste ramo (codex/rosto-cards-2810), da mais nova
// para a mais velha. Os guardiões antigos que conferem arquivos byte a byte chamam SÓ esta função, antes de todas as outras camadas:
//   semRostoCards2810(fs.readFileSync(p, 'utf8'), p)
// Entrega nova neste ramo = uma camada nova no topo de CAMADAS (gerada por generate-rosto-cards-2810-undo.mjs).
import path from 'node:path'
import { semRemixPaginas3110, ARQUIVOS as REMIX_PAGINAS_ARQUIVOS } from './desfaz-remix-paginas-3110.mjs' // KINEO-REMIX-PAGINAS-3110 — a mais nova (31/10, Make your own version + 10 páginas): sai primeiro
import { semEp2Painel3110, ARQUIVOS as EP2_PAINEL_ARQUIVOS } from './desfaz-ep2-painel-3110.mjs' // KINEO-EP2-PAINEL-3110 — a mais nova (31/10, carta do episódio 2 + cartão do /admin): sai primeiro
import { semDecisoesPreco3110, ARQUIVOS as DECISOES_PRECO_ARQUIVOS } from './desfaz-decisoes-preco-3110.mjs' // KINEO-DECISOES-PRECO-3110 — a mais nova (31/10, decisões de preço): sai primeiro
import { semDancaSextou3110, ARQUIVOS as DANCA_SEXTOU_ARQUIVOS } from './desfaz-danca-sextou-3110.mjs' // KINEO-DANCA-SEXTOU-3110 — a mais nova (31/10, Friday Groove): sai primeiro
import { semRecusaBotao3110, ARQUIVOS as RECUSA_BOTAO_ARQUIVOS } from './desfaz-recusa-botao-3110.mjs' // KINEO-RECUSA-BOTAO-3110 — a mais nova (31/10): sai primeiro
import { semValorNoCheckout3110 } from './desfaz-valor-no-checkout-3110.mjs' // KINEO-VALOR-NO-CHECKOUT-3110 — a mais nova (31/10, valor na hora de pagar): sai primeiro
import { semEstreia3110 } from './desfaz-estreia-3110.mjs' // KINEO-ESTREIA-3110 — a mais nova (31/10): sai primeiro
import { semAbracoBeijo3110, ARQUIVOS as ABRACO_BEIJO_ARQUIVOS } from './desfaz-abraco-beijo-3110.mjs' // KINEO-ABRACO-BEIJO-3110 — a mais nova (30/10): sai primeiro
import { semRostoQuadroChave2810, ARQUIVOS as ROSTO_QUADRO_CHAVE_ARQUIVOS } from './desfaz-rosto-quadro-chave-2810.mjs' // KINEO-ROSTO-QUADRO-CHAVE-2810 — a mais nova (duas etapas do remix)
import { semFilaQuedaFal2810, ARQUIVOS as FILA_QUEDA_FAL_ARQUIVOS } from './desfaz-fila-queda-fal-2810.mjs' // KINEO-FILA-QUEDA-FAL-2810 — a mais nova (28/10, sobre 9d6dd2e77): sai primeiro
import { semRostoNoClipe2810, ARQUIVOS as ROSTO_NO_CLIPE_ARQUIVOS } from './desfaz-rosto-no-clipe-2810.mjs'
import { semCardsRosto2810, ARQUIVOS as CARDS_ROSTO_ARQUIVOS } from './desfaz-cards-rosto-2810.mjs'
import { semGaleriaCheia2810, ARQUIVOS as GALERIA_CHEIA_ARQUIVOS } from './desfaz-galeria-cheia-2810.mjs'
import { semMenuUniforme2810, ARQUIVOS as MENU_UNIFORME_ARQUIVOS } from './desfaz-menu-uniforme-2810.mjs'
import { semRostoAjuste2810, ARQUIVOS as ROSTO_AJUSTE_ARQUIVOS } from './desfaz-rosto-ajuste-2810.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
/** Da mais nova para a mais velha. */
const CAMADAS = [semRemixPaginas3110, semEp2Painel3110, semDecisoesPreco3110, semDancaSextou3110, semRecusaBotao3110, semValorNoCheckout3110, semEstreia3110, semAbracoBeijo3110, semRostoQuadroChave2810, semFilaQuedaFal2810, semRostoAjuste2810, semMenuUniforme2810, semGaleriaCheia2810, semCardsRosto2810, semRostoNoClipe2810] // KINEO-ROSTO-QUADRO-CHAVE-2810 — reaplicada em 30/10 sobre 796bb74d8: a mais nova, sai primeiro
/** Todos os arquivos que as entregas deste ramo modificaram (para inventários de guardiões antigos). */
export const ARQUIVOS_ROSTO_CARDS_2810 = [...new Set([...REMIX_PAGINAS_ARQUIVOS, ...RECUSA_BOTAO_ARQUIVOS, ...ABRACO_BEIJO_ARQUIVOS, ...ROSTO_QUADRO_CHAVE_ARQUIVOS, ...FILA_QUEDA_FAL_ARQUIVOS, ...ROSTO_AJUSTE_ARQUIVOS, ...MENU_UNIFORME_ARQUIVOS, ...GALERIA_CHEIA_ARQUIVOS, ...CARDS_ROSTO_ARQUIVOS, ...ROSTO_NO_CLIPE_ARQUIVOS, ...EP2_PAINEL_ARQUIVOS, ...DECISOES_PRECO_ARQUIVOS, ...DANCA_SEXTOU_ARQUIVOS])] // KINEO-ROSTO-QUADRO-CHAVE-2810

export function relDe(p) {
  const s = String(p ?? '')
  const rel = path.isAbsolute(s) ? path.relative(ROOT, s) : s
  return rel.replace(/\\/g, '/').replace(/^\.\//, '')
}

export function semRostoCards2810(text, p) {
  const rel = relDe(p)
  return CAMADAS.reduce((s, desfaz) => desfaz(s, rel), text)
}
