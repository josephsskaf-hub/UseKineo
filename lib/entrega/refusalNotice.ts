// ═══ KINEO-RECUSA-QUE-NINGUEM-LEU-2026-09-09 ═══════════════════════════════
//
// O DEFEITO, MEDIDO (30 dias, contas externas, produção):
// 31 pessoas foram barradas pela trava de narração (`narration_guard_blocked`,
// 21 eventos / 12 pessoas só nos últimos 7 dias — a causa nº1 de "apertou e
// não saiu" por pessoas atingidas). O servidor devolve um 422 EXEMPLAR: diz
// quantos segundos de fala existem, quantas palavras faltam, qual duração
// caberia, e não cobra nada. Só que esse 422 tem UM leitor no produto inteiro
// (`GenerateClient.tsx`, no `res.status === 422`), e ele só existe enquanto a
// aba está montada. No ramo auto-start a pessoa é levada embora antes da
// resposta chegar: r3 mediu 19% de tela vista no auto-start contra 59% no
// manual, e 15 das 30 pessoas não receberam aviso por NENHUM canal.
//
// POR QUE O AVISO MORA AQUI E NÃO NUMA CARTA:
// A carta (`send-failure-recovery`) tem a lição escrita e é cega para esta
// coorte — a fonte dela é `generate_failed`, evento de NAVEGADOR, o mesmo
// sinal que quem foi embora não consegue emitir. E disparar e-mail é decisão
// do fundador, não desta rotina.
//
// POR QUE NÃO MORA NO /api/next-action (a recomendação da r3):
// alcance medido. Das 31 pessoas da coorte, apenas 2 receberam
// `next_action_served` alguma vez — 6%. A tela de criar recebe 14 das 31
// (`generate_page_view`, 71 vezes), 7x mais. O aviso vai onde a plateia está.
// (memória: `medir-alcance-da-superficie-antes-de-ligar`)
//
// O QUE ESTE ARQUIVO É: a decisão PURA de mostrar ou não, e com que frase.
// Nada de rede, nada de React — para o guardião poder amarrar as asserções à
// condição que decide, e não a texto de tela.
import { largestFittingDuration } from '@/lib/expandPolicy'

/** Fatos crus lidos do banco, sem juízo nenhum. */
export type RefusalFacts = {
  /** ISO do `narration_guard_blocked` mais recente da pessoa. */
  blockedAt: string
  speechSeconds: number
  targetSeconds: number
  missingWords: number
  /**
   * O que o claim registrou de fato. Desde KINEO-DEBITO-DEPOIS-DA-TRAVA
   * (02/09) a trava roda ANTES do débito, então o normal é `false`. A frase
   * "nothing was charged" só sai quando isto é `false` — prometer estorno num
   * ramo que cobrou seria mentir na cara de quem perdeu crédito.
   *
   * `null` = O EVENTO NÃO DIZ (bloqueios anteriores a 02/09 gravavam
   * `refunded: true` chumbado). Desconhecido NÃO vira `false`: a frase some e
   * o resto do aviso fica de pé.
   */
  charged: boolean | null
  /** Houve `generation_failed_screen_shown` DEPOIS do bloqueio? */
  sawScreenAfter: boolean
  /** Houve vídeo `completed` DEPOIS do bloqueio? */
  completedVideoAfter: boolean
}

export type RefusalNotice = {
  speechSeconds: number
  targetSeconds: number
  missingWords: number
  /** Maior duração DO SELETOR que esta fala enche, ou 0 = não há botão honesto. */
  suggestedDuration: number
  /** true ⇒ podemos dizer que nada foi cobrado. */
  nothingCharged: boolean
  minutesSince: number
}

/**
 * Idade máxima do bloqueio que ainda merece aviso. Passou disso, a pessoa não
 * liga mais a tela ao que aconteceu, e o aviso vira ruído sobre um fato que
 * ela esqueceu. 14 dias cobre a coorte medida (mediana de retorno bem abaixo).
 */
export const REFUSAL_NOTICE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Mostra o aviso? As três recusas, cada uma por um motivo diferente:
 *
 * 1. `sawScreenAfter` — ela JÁ LEU. Repetir a lição para quem leu é o erro que
 *    o próprio produto já pagou (ver `avaliarEspiral` na rota: a segunda
 *    mensagem repetia a primeira, que já tinha se provado inútil).
 * 2. `completedVideoAfter` — ela se recuperou sozinha. Avisar de um tropeço já
 *    superado é falar de derrota para quem ganhou.
 * 3. idade — ver REFUSAL_NOTICE_MAX_AGE_MS.
 */
export function decidirAvisoDeRecusa(
  fatos: RefusalFacts | null,
  agoraMs: number,
): RefusalNotice | null {
  if (!fatos) return null
  if (fatos.sawScreenAfter) return null
  if (fatos.completedVideoAfter) return null

  const blockedMs = Date.parse(fatos.blockedAt)
  if (!Number.isFinite(blockedMs)) return null
  const idade = agoraMs - blockedMs
  // Bloqueio no futuro = relógio torto (o incidente PGRST303 de 28/08 nasceu
  // de relógio adiantado). Falha FECHADA aqui: na dúvida, não avisa nada.
  if (idade < 0) return null
  if (idade > REFUSAL_NOTICE_MAX_AGE_MS) return null

  const fala = Number(fatos.speechSeconds)
  const alvo = Number(fatos.targetSeconds)
  if (!Number.isFinite(fala) || fala <= 0) return null
  if (!Number.isFinite(alvo) || alvo <= 0) return null

  return {
    speechSeconds: Math.round(fala),
    targetSeconds: Math.round(alvo),
    missingWords: Math.max(0, Math.round(Number(fatos.missingWords) || 0)),
    // Mesma fonte que o servidor usa no 422 e que o cliente usa no botão:
    // SUPPORTED_DURATIONS. `null` (nada cabe) vira 0 = "não há botão honesto".
    suggestedDuration: largestFittingDuration(fala) ?? 0,
    nothingCharged: fatos.charged === false,
    minutesSince: Math.max(0, Math.round(idade / 60000)),
  }
}
