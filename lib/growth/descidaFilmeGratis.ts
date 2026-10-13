// KINEO-PRIMEIRO-FILME-2026-10-13 — CONSERTO 1 do diagnóstico do 1º filme (docs/DIAGNOSTICO-PRIMEIRO-FILME-2026-10-13.md),
// aprovado pelo fundador em 13/10 ("tudo sim nos 3 consertos").
//
// O DEFEITO (medido, 30 d): 91 pessoas pediram um filme de 35/60/90 s que o saldo do teste (10 cr) ou da região (14 cr)
// NÃO paga, e o produto respondeu com a parede de preço (wall_before_script / upgrade_modal 'credits') ou com a prévia de
// cenas que leva ao /pricing — quando o MESMO saldo paga o filme grátis de 15 s do Seedance 1.5. São 36% dos sem filme do
// produto atual. A duração quase sempre veio pela URL (links de SEO/ChatGPT/campanha com duration=60) ou foi escolhida na
// mão no /studio.
//
// O CONSERTO: onde o saldo não paga a duração pedida mas paga os 15 s, DESCER para 15 s e gerar normalmente, com uma
// nota honesta na tela ("Your free 15-second film — want the full 60 s version? Creator …"). A regra de QUEM pode ter
// filme grátis NÃO muda: só desce quem o chamador já sabe ter direito ao filme grátis (teste ativo, ou região elegível),
// que não paga, e cujo saldo cobre os 15 s. 'blocked', quem já usou o grátis e ficou sem saldo, e pagantes seguem
// exatamente como antes.
//
// MÓDULO PURO, SEM IMPORT (o guardião scripts/test-primeiro-filme-1310.mjs o executa com o transpilador): o custo e os
// segundos do filme curto entram como argumento — os chamadores passam creditCostForDuration (a função que COBRA) e
// SEEDANCE_SHORT_SECONDS. O preço da nota entra pronto (buyCreatorPrice), nunca digitado aqui.

export const DESCIDA_FILME_GRATIS_VERSION = 'primeiro_filme_descida_v1' as const
/** Evento da descida (servidor no /studio/create, cliente no /studio e na guarda do autoanalyze). */
export const DESCIDA_FILME_GRATIS_EVENT = 'trial_downshift_to_free_film' as const
/** Parâmetro da URL que carrega a duração PEDIDA depois da descida (a nota lê daqui). */
export const DESCIDA_FILME_GRATIS_PARAM = 'free_film_from' as const

export type DescidaMotivo =
  | 'downshift'
  | 'short_hidden'
  | 'not_seedance'
  | 'not_longer'
  | 'paid_or_unknown'
  | 'not_entitled'
  | 'balance_unknown'
  | 'balance_pays_requested'
  | 'short_not_affordable'

export interface DescidaDecisao {
  descer: boolean
  motivo: DescidaMotivo
  /** Duração pedida (null quando não se aplica). */
  de: number | null
  /** Duração do filme grátis (null quando não desce). */
  para: number | null
  custoPedido: number | null
  custoCurto: number | null
}

/**
 * Desce para o filme grátis de 15 s? Só quando TODAS valem: o filme curto existe para a conta (shortVisible), o motor é
 * o Seedance 1.5, a duração pedida é maior que a curta, a conta comprovadamente NÃO paga (paid === false; desconhecido
 * não desce), a conta comprovadamente TEM direito ao filme grátis (freeFilmEntitled === true), o saldo é conhecido, o
 * saldo NÃO paga a duração pedida e PAGA os 15 s. Qualquer outra combinação = o comportamento de antes.
 */
export function decidirDescidaFilmeGratis(f: {
  engine: string | null | undefined
  requestedSeconds: number | null | undefined
  balance: number | null | undefined
  paid: boolean | null | undefined
  freeFilmEntitled: boolean | null | undefined
  shortSeconds: number
  shortVisible: boolean
  custoSeedance: (segundos: number) => number
}): DescidaDecisao {
  const de = typeof f.requestedSeconds === 'number' && Number.isFinite(f.requestedSeconds) ? f.requestedSeconds : null
  const nao = (motivo: DescidaMotivo, custoPedido: number | null = null, custoCurto: number | null = null): DescidaDecisao =>
    ({ descer: false, motivo, de, para: null, custoPedido, custoCurto })
  if (!f.shortVisible) return nao('short_hidden')
  const motor = typeof f.engine === 'string' ? f.engine.trim().toLowerCase() : ''
  if (motor !== 'seedance' && motor !== 'cinematic_ai') return nao('not_seedance')
  if (de === null || de <= f.shortSeconds) return nao('not_longer')
  if (f.paid !== false) return nao('paid_or_unknown')
  if (f.freeFilmEntitled !== true) return nao('not_entitled')
  if (typeof f.balance !== 'number' || !Number.isFinite(f.balance)) return nao('balance_unknown')
  const custoPedido = f.custoSeedance(de)
  const custoCurto = f.custoSeedance(f.shortSeconds)
  if (!Number.isFinite(custoPedido) || custoPedido <= 0 || custoPedido <= f.balance) return nao('balance_pays_requested', custoPedido, custoCurto)
  if (!Number.isFinite(custoCurto) || custoCurto <= 0 || custoCurto > f.balance) return nao('short_not_affordable', custoPedido, custoCurto)
  return { descer: true, motivo: 'downshift', de, para: f.shortSeconds, custoPedido, custoCurto }
}

/** `?free_film_from=60` → 60, só quando é uma duração plausível maior que a curta. Lixo = null (sem nota). */
export function lerDescidaDaUrl(raw: string | null | undefined, shortSeconds: number): number | null {
  if (typeof raw !== 'string' || !/^\d{2,3}$/.test(raw.trim())) return null
  const n = Number(raw.trim())
  return n > shortSeconds && n <= 300 ? n : null
}

/** A duração pedida pela URL como o /studio/create a lê (readCreationHandoff: 45 vira 35; o resto passa como veio). */
export function duracaoPedidaDaUrl(raw: string | null | undefined): number | null {
  const n = Number(raw ?? '')
  if (!Number.isFinite(n) || n <= 0) return null
  return n === 45 ? 35 : n
}

// ── a nota honesta (en/pt/es; outras línguas caem no inglês) ─────────────────────────────────────────────────────────
type NotaTemplate = { offer: string; plain: string }
const NOTA: Record<'en' | 'pt' | 'es', NotaTemplate> = {
  en: {
    offer: 'Your free {s}-second film — want the full {full} s version? Creator {first} first month.',
    plain: 'Your free {s}-second film — want the full {full} s version? Creator {price}/month.',
  },
  pt: {
    offer: 'Seu filme grátis de {s} segundos — quer a versão completa de {full} s? Creator {first} no 1º mês.',
    plain: 'Seu filme grátis de {s} segundos — quer a versão completa de {full} s? Creator {price}/mês.',
  },
  es: {
    offer: 'Tu película gratis de {s} segundos — ¿quieres la versión completa de {full} s? Creator {first} el primer mes.',
    plain: 'Tu película gratis de {s} segundos — ¿quieres la versión completa de {full} s? Creator {price}/mes.',
  },
}

/** A frase da nota. O preço vem de buyCreatorPrice (o mesmo do bloco pós-filme); sem 1º mês com desconto, o preço cheio. */
export function notaDaDescida(args: {
  language: unknown
  shortSeconds: number
  fullSeconds: number
  price: { full: string; firstMonth: string | null }
}): string {
  const key = args.language === 'pt' || args.language === 'es' ? args.language : 'en'
  const t = NOTA[key]
  const vars: Record<string, string | number> = {
    s: args.shortSeconds,
    full: args.fullSeconds,
    first: args.price.firstMonth ?? args.price.full,
    price: args.price.full,
  }
  return (args.price.firstMonth ? t.offer : t.plain).replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}
