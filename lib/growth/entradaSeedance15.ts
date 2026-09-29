// ═══ KINEO-ENTRADA-SEEDANCE15-2026-09-29 (E2b) — a ENTRADA do cliente novo vira o Seedance 1.5 de 15 s ═══
//
// Decisão do fundador (29/09): o filme grátis de quem chega é o Seedance 1.5 de 15 s (7 cr, cabe no trial de 10 —
// TRIAL_CREDIT_CAP intocado); o Kineo 1 some para conta nova e fica só para quem já paga e usa ou comprou pacote/passe
// (flag `kineo1` de lib/engineLaunch.ts resolveKineo1Flag). Este módulo é a régua ÚNICA que as telas (Studio,
// /generate) e as rotas (next-action, /go) leem para decidir a entrada — nenhuma decide sozinha.
//
// ⚠ UM INTERRUPTOR SÓ: tudo aqui só age quando a entrada nova existe PARA ESTA CONTA — a flag `seedance15`
// (lib/engineLaunch.ts seedance15sVisible = SEEDANCE_15S_PUBLIC || casa). Com ela desligada, a entrada é a de antes,
// byte a byte (o Kineo 1 continua na tela e no auto-start): esconder o Kineo 1 sem o filme de 15 s deixaria o trial de
// 10 cr sem NENHUM filme possível (o Seedance de 35 s custa 15). Ligar SEEDANCE_15S_PUBLIC (commit de junção) liga a
// entrada inteira de uma vez.
//
// Módulo PURO (só importa lib/durationByEngine, também puro): executado por scripts/test-entrada-seedance15-2026-09-29.mjs.
import { SEEDANCE_SHORT_SECONDS, maxWordsForShortFilm } from '@/lib/durationByEngine'

export const ENTRADA_SEEDANCE15_VERSION = 'entrada_seedance15_v1' as const

/** O rótulo do filme grátis — só aparece quando é verdade (rotuloDoFilmeGratis). */
export const FREE_SHORT_FILM_LABEL = `Your free ${SEEDANCE_SHORT_SECONDS}-second film`

/** A flag `kineo1` como a tela a recebe: true/false decididos; null = leitura falhou; undefined = ainda não chegou. */
export type Kineo1Flag = boolean | null | undefined

/**
 * O Kineo 1 aparece nesta tela? Sem a entrada nova, sempre (o de antes). Com ela: true decidido → sim; false decidido
 * → não; 'não sei' (flag ausente ou leitura que falhou — pendência 5 da E1) → só para quem sabidamente paga: uma
 * falha momentânea nunca esconde o motor de um pagante que o usa, e nunca o devolve a uma conta nova.
 */
export function kineo1NaTela(f: { entrada15: boolean | null | undefined; kineo1: Kineo1Flag; hasPaid?: boolean | null }): boolean {
  if (f.entrada15 !== true) return true
  if (f.kineo1 === true) return true
  if (f.kineo1 === false) return false
  return f.hasPaid === true
}

const KINEO1_URL_KEYS = ['fast', 'kineo1', 'kineo-1', 'kineo_1']

/**
 * `?engine=` da URL traduzido pela régua: pedido de Kineo 1 sem Kineo 1 na tela vira o Seedance (o motor da entrada).
 * Vazio devolve null (a tela segue o padrão dela). Qualquer outro motor passa como veio.
 */
export function motorDaUrl(raw: string | null | undefined, kineo1Visivel: boolean): string | null {
  const e = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (!e) return null
  if (KINEO1_URL_KEYS.includes(e)) return kineo1Visivel ? 'fast' : 'seedance'
  return e
}

/** As durações da entrada, da maior para a menor (o 15 s é o degrau que cabe no trial). */
export const DURACOES_DA_ENTRADA = [60, 35, SEEDANCE_SHORT_SECONDS] as const
export type DuracaoDaEntrada = (typeof DURACOES_DA_ENTRADA)[number]

/**
 * Sem ?duration e sem escolha manual: a MAIOR duração do Seedance cujo custo cabe no saldo (B8 do cético). Nada
 * cabe → o 15 s (o menor; a parede de crédito explica o resto). Saldo desconhecido → null (a tela não mexe).
 */
export function duracaoDeEntrada(balance: number | null | undefined, custoSeedance: (segundos: number) => number): DuracaoDaEntrada | null {
  if (typeof balance !== 'number' || !Number.isFinite(balance)) return null
  for (const d of DURACOES_DA_ENTRADA) {
    const c = custoSeedance(d)
    if (Number.isFinite(c) && c > 0 && c <= balance) return d
  }
  return SEEDANCE_SHORT_SECONDS
}

/**
 * "Your free 15-second film" — só quando é verdade: entrada nova ligada, conta NO trial, Seedance a 15 s escolhido, e
 * o custo de 15 s (derivado, nunca digitado) cabe no saldo. Fora disso, null (a tela mostra o custo de sempre).
 */
export function rotuloDoFilmeGratis(f: {
  entrada15: boolean
  trialActive: boolean | null | undefined
  balance: number | null | undefined
  engine: string
  duration: number
  custoSeedance: (segundos: number) => number
}): string | null {
  if (f.entrada15 !== true || f.trialActive !== true) return null
  if (f.engine !== 'seedance' && f.engine !== 'cinematic_ai') return null
  if (f.duration !== SEEDANCE_SHORT_SECONDS) return null
  if (typeof f.balance !== 'number' || !Number.isFinite(f.balance)) return null
  const c = f.custoSeedance(SEEDANCE_SHORT_SECONDS)
  return Number.isFinite(c) && c > 0 && c <= f.balance ? FREE_SHORT_FILM_LABEL : null
}

/**
 * Roteiro colado (verbatim) grande demais para o filme curto: abrir em modo IA a 15 s, como TEASER do roteiro, em vez
 * de verbatim (a guarda do cinematic recusaria com 422 'script_too_long_for_short_film'). Mesma régua da guarda.
 */
export function roteiroCabeNoFilmeCurto(texto: string | null | undefined, segundos: number = SEEDANCE_SHORT_SECONDS): boolean {
  const palavras = String(texto ?? '').split(/\s+/).filter(Boolean).length
  return palavras <= maxWordsForShortFilm(segundos)
}
