// ═══ KINEO-VENDER-NO-DOWNLOAD-2026-09-18 — jogada 7 do plano de fim de ano ═══
//
// MEDIDO (30 dias até 18/09): 72 pessoas baixaram o filme COM marca d'água na
// tela do filme pronto. A oferta "sem marca" só era dita DEPOIS do download,
// num cartão abaixo: 10 pessoas viram, 0 clicaram. E em 34 das 38 leituras
// recentes do momento pós-download a pessoa estava em TRIAL — ramo em que a
// caixa de export limpo nem monta (`showPostVideoExportChoice` exclui trial) e
// a versão limpa dependia do dono do slot lá embaixo (ponte, porta do 3º filme…).
//
// O mercado inteiro (CapCut, InVideo, Pictory) vende no instante do download:
// "baixar grátis com marca" ao lado de "baixar limpo (assinar)". Esta peça é só
// isso — um segundo botão, GÊMEO do download, no mesmo lugar e na mesma hora,
// em todo filme marcado de conta que não pagou. Nada do que existia abaixo foi
// tocado; o download grátis continua primeiro e sem pedágio (deliver-first).
// Fundador (18/09): "pode ir… na jogada 7… vamos embora". O trial NÃO mudou:
// o filme do trial já saía marcado desde 07/09 (compose: isTrialRender).
//
// Clique → o MESMO checkout de sempre (`handleRemoveWatermark`: Starter,
// return=wm) que volta e remonta ESTE filme sem marca com os clipes já pagos.
// Por isso o botão só aparece quando os insumos da remontagem estão na mão:
// prometer "este filme limpo" sem poder entregar seria a mentira mais cara.

export const CLEAN_DOWNLOAD_TWIN_VERSION = 'clean_download_twin_v1'

export interface CleanDownloadTwinInput {
  /** A tela está em `phase === 'done'` com URL do filme final. */
  delivered: boolean
  /** Veredito do servidor (ou fallback antigo): o arquivo carrega a marca. */
  hasWatermark: boolean
  /** Prova positiva de pagamento lida da rota. Pagante nunca vê a oferta. */
  hasPaid: boolean
  /** A remontagem limpa pós-checkout já está rodando. */
  unlocking: boolean
  /** `lastFastRenderRef` preenchido: dá para remontar ESTE filme limpo. */
  rebuildReady: boolean
}

export type CleanDownloadTwinReason =
  | 'not_delivered'
  | 'no_watermark'
  | 'already_paid'
  | 'unlocking'
  | 'rebuild_not_ready'
  | 'ok'

export interface CleanDownloadTwinDecision {
  visible: boolean
  reason: CleanDownloadTwinReason
  version: typeof CLEAN_DOWNLOAD_TWIN_VERSION
}

export function decideCleanDownloadTwin(input: CleanDownloadTwinInput): CleanDownloadTwinDecision {
  const version = CLEAN_DOWNLOAD_TWIN_VERSION
  if (!input.delivered) return { visible: false, reason: 'not_delivered', version }
  if (!input.hasWatermark) return { visible: false, reason: 'no_watermark', version }
  if (input.hasPaid) return { visible: false, reason: 'already_paid', version }
  if (input.unlocking) return { visible: false, reason: 'unlocking', version }
  if (!input.rebuildReady) return { visible: false, reason: 'rebuild_not_ready', version }
  return { visible: true, reason: 'ok', version }
}

/** Rótulo do botão gêmeo. Sem moeda resolvida, sem número — nunca um preço errado. */
export function cleanDownloadTwinLabel(priceLabel: string | null, monthlyCredits: number): { title: string; sub: string } {
  return {
    title: priceLabel ? `Download clean — Starter ${priceLabel}/mo` : 'Download clean — Starter',
    sub: `this film without the watermark + ${monthlyCredits} credits every month · cancel anytime`,
  }
}
