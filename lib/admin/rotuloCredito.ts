// KINEO-ROTULO-CREDITO-1510 — o rótulo de crédito da coluna "Doing now" do painel /admin (app/api/admin/live/route.ts).
//
// O defeito (fundador, 15/10): a pessoa só VIA o chip de créditos da barra lateral e o painel escrevia "⚡ modal de
// crédito". A regra antiga era `upgrade_modal_opened || algum nome contém 'topup'` — e o chip da barra grava
// `topup_eligibility_handoff_viewed` (impressão, components/Sidebar.tsx) quando aparece na tela. Impressão de chip não é
// modal aberto: o fundador lia "esteve na parede de compra" de quem só passou os olhos na barra.
//
// Os nomes REAIS (lidos no código em 15/10):
//   · modal de compra ABERTO: `upgrade_modal_opened` (o UpgradeModal do /generate). O CreditsTopupModal não grava
//     abertura própria — a compra dele aparece como checkout_* (que já é "🚨 no checkout").
//   · chip/nota VISTOS (impressão): `topup_eligibility_handoff_viewed` (chip da barra, conta sem recarga),
//     `topup_unavailable_note_shown` (nota "recarga só no Creator+").
//   · chip TOCADO: `topup_eligibility_handoff_clicked` — leva para /pricing, NÃO abre modal.
// Nome de recarga novo e desconhecido só vira "modal" se disser que é modal aberto (…modal…_opened/_open); qualquer outro
// cai na linha fraca. Errar para o lado fraco é o certo: o painel nunca promove impressão a intenção.
// Módulo PURO (sem import) — o guardião scripts/test-rotulo-credito-1510.mjs o carrega direto.

export const ROTULO_MODAL_CREDITO = '⚡ modal de crédito'
export const ROTULO_TOCOU_CREDITO = '👆 tocou em créditos (foi aos preços)'
export const ROTULO_VIU_OFERTA_CREDITO = '👀 viu oferta de créditos'

/** Modal de compra/recarga de fato ABERTO. */
export const EVENTOS_MODAL_CREDITO_ABERTO: readonly string[] = Object.freeze(['upgrade_modal_opened'])
/** Chip/botão de créditos TOCADO sem abrir modal (vai para /pricing). */
export const EVENTOS_OFERTA_CREDITO_TOCADA: readonly string[] = Object.freeze(['topup_eligibility_handoff_clicked'])
/** Só impressão: o chip ou a nota apareceram na tela. */
export const EVENTOS_OFERTA_CREDITO_VISTA: readonly string[] = Object.freeze(['topup_eligibility_handoff_viewed', 'topup_unavailable_note_shown'])

const ehRecarga = (n: string) => n.includes('topup')
const recargaDizModalAberto = (n: string) => ehRecarga(n) && n.includes('modal') && /_(opened|open)$/.test(n)

/** O rótulo de crédito da linha (ou null quando a janela não tem nada de crédito). Um rótulo só — o mais forte. */
export function rotuloCredito(names: Iterable<string>): string | null {
  const lista = [...names]
  if (lista.some((n) => EVENTOS_MODAL_CREDITO_ABERTO.includes(n) || recargaDizModalAberto(n))) return ROTULO_MODAL_CREDITO
  if (lista.some((n) => EVENTOS_OFERTA_CREDITO_TOCADA.includes(n))) return ROTULO_TOCOU_CREDITO
  if (lista.some((n) => EVENTOS_OFERTA_CREDITO_VISTA.includes(n) || ehRecarga(n))) return ROTULO_VIU_OFERTA_CREDITO
  return null
}
