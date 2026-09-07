// ═══════════════════════════════════════════════════════════════════════════
// KINEO-DOWNLOAD-E-O-MOMENTO-2026-09-07 — a tela não sabia que o download
// aconteceu para 8 de cada 10 pessoas que baixam.
//
// MEDIDO em produção hoje (30 dias, contas externas, contando PESSOAS):
//   · `video_download_clicked`  225 pessoas — 207 delas na DONE SCREEN.
//   · `video_downloaded`        193 pessoas, e o campo `export_type` diz o que
//     elas levaram: **159 'clean'** contra **45 'watermarked'**.
//
// O `handleDownload` do /generate só marcava o estado pós-download numa
// condição:
//
//     if (delivered && exportType === 'watermarked') setWatermarkedDownloadConfirmed(true)
//
// `exportType` só é 'watermarked' para `free && !hasPaid && !trialActive`. Ou
// seja: das 193 pessoas que puseram o arquivo na mão, ~159 fizeram isso e a
// PÁGINA NÃO FICOU SABENDO. Nada na tela reagiu ao instante de maior valor
// percebido que este produto tem.
//
// POR QUE ISSO IMPORTA MAIS DO QUE PARECE: quem baixa em trial leva um MP4
// LIMPO (o servidor decide por `isFreePlanFast`, que exclui o trial). Então a
// oferta que existe nessa tela — "remove a marca d'água", `clean_paywall` —
// é, para essa coorte, uma oferta de algo que a pessoa JÁ TEM. Vender isso
// seria mentira, e a caixa de export limpo exclui o trial exatamente por
// isso, com razão. O defeito nunca foi a exclusão: é que **nada** ficou no
// lugar no instante do download.
//
// ⛔ O QUE ESTE MÓDULO DELIBERADAMENTE NÃO FAZ:
//  · NÃO cria uma segunda caixa. O comentário de KINEO-TRIAL-DEATH-OFFER
//    registra o preço já pago uma vez por dois cartões azuis gêmeos e
//    adjacentes, cada um com um checkout de tier diferente. Aqui a decisão
//    só troca a COPY de um cartão que JÁ está na tela.
//  · NÃO toca no download. O botão continua primeiro, grátis, sem pedágio
//    (KINEO-DELIVER-FIRST). Esta função só é consultada DEPOIS que os bytes
//    estão na mão — `downloadDelivered` é a primeira guarda.
//  · NÃO rouba o momento de quem vê a oferta de marca d'água. Se o bloco de
//    export limpo está visível, ele é o dono do instante e esta função se
//    cala (`watermark_offer_owns_moment`). Empilhar as duas seria o defeito
//    que a casa já pagou.
//
// A função é PURA de propósito: o guardião a exercita sem React, e a regra
// deixa de morar dentro de um JSX de 12 mil linhas onde ninguém a audita.
// ═══════════════════════════════════════════════════════════════════════════

/** Por que a casa falou — ou por que ficou calada — no instante do download. */
export type PostDownloadAskReason =
  /** Ainda não há download entregue. Não é silêncio: é "ainda não". */
  | 'not_downloaded'
  /** O bloco de export limpo está na tela e é o dono do momento. */
  | 'watermark_offer_owns_moment'
  /** Já paga. Não se vende plano a quem já assinou. */
  | 'already_paid'
  /** Trial correndo: o filme saiu limpo, e o que falta é o mês seguinte. */
  | 'trial_active'
  /** Trial acabando/acabado: é a hora mais honesta de falar de plano. */
  | 'trial_ending'
  /**
   * Baixou e NÃO havia nada para dizer. Este é o motivo que interessa medir:
   * é a coorte que hoje some. Nomear é o primeiro passo para dimensionar.
   */
  | 'no_surface'

export interface PostDownloadAskInput {
  /** Bytes na mão. `popup_blocked`/`unavailable` NÃO contam como entregues. */
  downloadDelivered: boolean
  /** O que a pessoa levou. 'clean' significa que não há marca d'água a vender. */
  exportType: 'clean' | 'watermarked' | 'current_asset' | null
  /** Fase do trial vinda do SERVIDOR (/api/credits), nunca recalculada aqui. */
  trialPhase: 'active' | 'ending' | null
  hasPaid: boolean
  /** `showPostVideoExportChoice` do /generate — o bloco de marca d'água. */
  watermarkOfferVisible: boolean
}

export interface PostDownloadAskDecision {
  /** Trocar a copy do cartão que já está na tela para falar do download. */
  ask: boolean
  reason: PostDownloadAskReason
}

/**
 * Decide se — e por quê — a casa deve falar no instante em que o arquivo
 * chegou na mão da pessoa.
 *
 * A ORDEM DAS GUARDAS É A REGRA, não um detalhe:
 *  1. sem download entregue não existe momento;
 *  2. quem já tem dono (o bloco de marca d'água) mantém o momento;
 *  3. quem já paga não recebe oferta;
 *  4. só então a fase do trial decide o que dizer.
 */
export function decidePostDownloadAsk(input: PostDownloadAskInput): PostDownloadAskDecision {
  if (!input.downloadDelivered) return { ask: false, reason: 'not_downloaded' }
  // O bloco de export limpo já reage ao download (`watermarkedDownloadConfirmed`)
  // e já carrega a oferta certa para quem levou arquivo COM marca. Não empilhar.
  if (input.watermarkOfferVisible) return { ask: false, reason: 'watermark_offer_owns_moment' }
  if (input.hasPaid) return { ask: false, reason: 'already_paid' }
  if (input.trialPhase === 'ending') return { ask: true, reason: 'trial_ending' }
  if (input.trialPhase === 'active') return { ask: true, reason: 'trial_active' }
  return { ask: false, reason: 'no_surface' }
}

/**
 * A sobrancelha do cartão DEPOIS do download. Só é chamada quando
 * `decidePostDownloadAsk` devolveu `ask: true`, e afirma um FATO que acabou de
 * acontecer ("está com você"), nunca uma urgência inventada.
 */
export function postDownloadEyebrow(reason: PostDownloadAskReason): string | null {
  if (reason === 'trial_active') return 'Your film is downloaded'
  if (reason === 'trial_ending') return 'Your film is downloaded'
  return null
}
