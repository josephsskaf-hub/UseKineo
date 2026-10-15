// ═══ KINEO-ABANDONO-RAPIDO-1610 — o e-mail de quem abriu o checkout e não pagou sai cedo, com o filme e a garantia ═══
//
// Decisão do fundador (16/10, jogada 3 de docs/PESQUISA-FECHAMENTO-CONCORRENTES-2026-10-16.md): o primeiro toque a quem
// abandona a página de pagamento sai em horas, não ~24 h, levando o FILME que a pessoa fez
// (ou o convite para o filme grátis de 15 s com a última ideia dela) e a garantia de verdade. Sem desconto novo.
//
// NÃO É CARTA NOVA. A carta que fala nessa hora já existe: app/api/admin/send-checkout-hot-nudge (cron "6,21,36,51 * * * *",
// confirm=SEND, só com a sessão Stripe ainda `open`, uma por pessoa na vida). Este módulo só:
//   1. MANTÉM a janela de 30 min–6 h (a carta já saía em 31–45 min; atrasar para 60 min seria piora — coordenação 16/10).
//      As constantes moram aqui e a rota as lê; o cron de 15 em 15 min passa por ela ~22 vezes;
//   2. acrescenta à carta a GARANTIA (a mesma da página de preços) com o NOME do plano que a pessoa abriu, e — para quem
//      ainda não tem filme entregue e cujo teste paga o filme de 15 s AGORA — o convite para fazê-lo com a última ideia;
//   3. confere NO ENVIO (não só na seleção) que a pessoa não pagou: perfil, payment_success e a sessão Stripe relidos;
//   4. decide se o e-mail de ~24 h (app/api/cron/send-recovery) vira o SEGUNDO toque: só sai para quem levou a carta
//      rápida e NÃO voltou ao site depois dela (nenhum evento de navegador com session_id). Quem nunca levou a rápida
//      continua recebendo o de 24 h como sempre.
//
// O QUE O BANCO MOSTROU (16/10, só SELECT, contas internas fora, 30 dias): 50 pessoas com conta apertaram comprar e não
// pagaram na 1ª hora (21 em 14 dias ≈ 1,5/dia); 42 delas sem nenhum filme entregue antes do clique. A carta rápida saiu
// para 36 pessoas; o e-mail de 24 h saiu 54 vezes, 37 delas DEPOIS da rápida — e só 1 dessas pessoas tinha voltado ao
// site entre as duas. Ou seja: o de 24 h já é, na prática, o segundo toque de quem não reagiu; a trava só formaliza isso
// e tira o e-mail de quem já voltou.
//
// MÓDULO SEM REDE: as decisões são puras e exportadas (o guardião scripts/test-abandono-rapido-1610.mjs as executa e as
// muta). O texto é en/pt/es — as mesmas línguas da carta quente (lib/lifecycle/cartaQuente.ts).
import { PLANS } from '../pricing'
import { ANNUAL_REFUND_DAYS } from '../checkoutPricing'
import { TRIAL_FREE_FILM_CREDITS, TRIAL_FREE_FILM_SECONDS } from '../freeTierOffer'
import { CARD_ENTRY_ONLY } from '../entryPolicy'
import { isTrialActive, trialCapFor, trialCreditsUsed } from '../reverseTrial'
import { ideiaDoCartao } from '../growth/paywallFilmePrimeiro'
import type { RegionEmailLang } from './regionFirstFilmEmail'

export const ABANDONO_RAPIDO_MARK = 'KINEO-ABANDONO-RAPIDO-1610' as const
/** Gravado no carimbo de envio da carta rápida (metadata.abandono_version). */
export const ABANDONO_RAPIDO_VERSION = 'abandono_rapido_1610' as const

/** O carimbo da carta rápida (o mesmo de sempre da send-checkout-hot-nudge — nenhum evento novo de envio). */
export const CARTA_RAPIDA_EVENT = 'checkout_hot_nudge_emailed_v1' as const

/** A janela nova, em minutos depois do `checkout_started`. A rota usa estes números; o guardião prova as bordas. */
export const ABANDONO_JANELA_MIN_MINUTOS = 30
export const ABANDONO_JANELA_MAX_MINUTOS = 360

/**
 * A garantia do MENSAL. Espelho do texto público — a página de preços não tem constante para ela, só a frase do FAQ
 * ("Starter, Creator, and Studio come with a 7-day money-back guarantee… email us within 7 days of your purchase and
 * we'll refund 100%") e os termos ("7-day money-back guarantee on the first paid month … within 7 days of the first
 * charge"). O guardião lê os DOIS arquivos e falha se o número daqui divergir do número de lá.
 * O anual lê ANNUAL_REFUND_DAYS (lib/checkoutPricing), a fonte única de pricing/FAQ/termos.
 */
export const MONTHLY_MONEY_BACK_DAYS = 7
/** Os planos que o FAQ nomeia na garantia. Business e passe avulso não estão lá — sem linha de garantia (cala, não inventa). */
export const PLANOS_COM_GARANTIA = ['starter', 'basic', 'pro'] as const
export const SUPORTE_EMAIL = 'support@usekineo.com'

const SITE = 'https://www.usekineo.com'
/** utm do convite do filme grátis — o placar separa este clique dos da carta. */
export const CONVITE_CAMPAIGN = 'checkout_fast_free_film' as const

export type Garantia = { plano: string; periodo: 'monthly' | 'annual'; dias: number }
export type ConviteFilmeGratis = { segundos: number; ideia: string | null; href: string }
export type RapidoNaCarta = { garantia: Garantia | null; convite: ConviteFilmeGratis | null }
export const SEM_RAPIDO: RapidoNaCarta = { garantia: null, convite: null }

/** O nome do plano como a tela mostra (PLANS), nunca um mapa à mão. Tier desconhecido = null. */
export function nomeDoPlano(tier: unknown): string | null {
  if (typeof tier !== 'string') return null
  const t = tier.trim().toLowerCase()
  if (!t || t === 'free') return null
  if (!Object.prototype.hasOwnProperty.call(PLANS, t)) return null
  const nome = (PLANS as Record<string, { name?: unknown } | undefined>)[t]?.name
  return typeof nome === 'string' && nome.trim() ? nome : null
}

/**
 * A garantia da PÁGINA ABERTA. Lida da sessão Stripe viva (modo, plano e período que a pessoa vai pagar), FECHADA por
 * padrão: sessão que não é assinatura, plano fora do FAQ, ou período desconhecido = sem linha.
 */
export function garantiaDaSessao(sessao: {
  mode?: string | null
  metadata?: { [key: string]: string } | null
} | null | undefined): Garantia | null {
  if (!sessao || sessao.mode !== 'subscription') return null
  const md = sessao.metadata ?? {}
  const tier = typeof md.tier === 'string' ? md.tier.trim().toLowerCase() : ''
  if (!(PLANOS_COM_GARANTIA as readonly string[]).includes(tier)) return null
  const plano = nomeDoPlano(tier)
  if (!plano) return null
  if (md.billing === 'monthly') return { plano, periodo: 'monthly', dias: MONTHLY_MONEY_BACK_DAYS }
  if (md.billing === 'annual') return { plano, periodo: 'annual', dias: ANNUAL_REFUND_DAYS }
  return null
}

export type PerfilDoConvite = {
  has_paid?: boolean | null
  trial_status?: unknown
  trial_ends_at?: unknown
  trial_credits_used?: unknown
  trial_credits_granted?: unknown
  video_credits?: unknown
}

/**
 * O convite do filme grátis entra? Só quando o servidor ENTREGA o filme de 15 s agora (caso Rick: nunca prometer o que o
 * cobrador recusa). Fechado por padrão:
 *   · nenhuma entrega concluída (quem já tem filme recebe o bloco do filme próprio, não o convite);
 *   · has_paid PROVADO false;
 *   · teste ativo pela régua única (isTrialActive: status, relógio e teto) e sem a entrada só-com-cartão;
 *   · o saldo E a folga do teto do teste pagam o Seedance de 15 s (TRIAL_FREE_FILM_CREDITS, a função que cobra).
 * A última ideia vai junto quando existe e passa na régua do cartão do filme grátis (ideiaDoCartao); senão, sem ideia.
 */
export function conviteDoFilmeGratis(input: {
  temFilme: boolean
  perfil: PerfilDoConvite | null | undefined
  ideia: string | null | undefined
  agoraMs: number
}): ConviteFilmeGratis | null {
  if (input.temFilme !== false) return null
  const p = input.perfil
  if (!p || p.has_paid !== false) return null
  if (CARD_ENTRY_ONLY) return null
  if (!isTrialActive(p, input.agoraMs)) return null
  const custo = TRIAL_FREE_FILM_CREDITS
  if (!(typeof custo === 'number' && Number.isFinite(custo) && custo > 0)) return null
  const saldo = typeof p.video_credits === 'number' && Number.isFinite(p.video_credits) ? p.video_credits : null
  if (saldo === null || saldo < custo) return null
  if (trialCapFor(p) - trialCreditsUsed(p) < custo) return null
  const ideia = ideiaDoCartao(input.ideia ?? null)
  return { segundos: TRIAL_FREE_FILM_SECONDS, ideia, href: linkDoConvite(ideia) }
}

/** O Studio com a ideia JÁ ESCRITA (só preenche: sem autoanalyze, sem create_intent — nada gera sozinho). */
export function linkDoConvite(ideia: string | null): string {
  const q = new URLSearchParams()
  if (ideia) q.set('prompt', ideia)
  q.set('utm_source', 'lifecycle')
  q.set('utm_medium', 'email')
  q.set('utm_campaign', CONVITE_CAMPAIGN)
  return `${SITE}/studio/create?${q.toString()}`
}

/** A carta inteira do abandono rápido: garantia da página aberta e o convite (só sem filme). */
export function rapidoDaCarta(input: {
  sessao: { mode?: string | null; metadata?: { [key: string]: string } | null } | null | undefined
  temFilme: boolean
  perfil: PerfilDoConvite | null | undefined
  ideia: string | null | undefined
  agoraMs: number
}): RapidoNaCarta {
  return {
    garantia: garantiaDaSessao(input.sessao),
    convite: conviteDoFilmeGratis({ temFilme: input.temFilme, perfil: input.perfil, ideia: input.ideia, agoraMs: input.agoraMs }),
  }
}

// ─── A conferência NO ENVIO ─────────────────────────────────────────────────────────────────────────────────────────
export type MotivoNoEnvio = 'pagou_antes_do_envio' | 'sem_pagina_viva_no_envio' | 'conferencia_falhou'

/**
 * Relida segundos antes do POST ao Resend. Qualquer coisa que a casa não sabe vira "não envia":
 *   · leitura falhou (null) → conferencia_falhou;
 *   · has_paid !== false, ou qualquer payment_success da pessoa → pagou_antes_do_envio;
 *   · a sessão Stripe relida já não está aberta/sem url → sem_pagina_viva_no_envio.
 */
export function podeEnviarAgora(input: {
  hasPaid: boolean | null | undefined
  pagamentos: number | null | undefined
  paginaViva: string | null | undefined
  leituraOk: boolean
}): MotivoNoEnvio | null {
  if (input.leituraOk !== true) return 'conferencia_falhou'
  if (typeof input.pagamentos !== 'number' || !Number.isFinite(input.pagamentos)) return 'conferencia_falhou'
  if (input.hasPaid !== false || input.pagamentos > 0) return 'pagou_antes_do_envio'
  if (!input.paginaViva) return 'sem_pagina_viva_no_envio'
  return null
}

// ─── O e-mail de ~24 h vira o segundo toque ──────────────────────────────────────────────────────────────────────────
export type SegundoToque = 'enviar' | 'pular_voltou' | 'adiar'

/**
 * O e-mail de ~24 h (cron/send-recovery) sai para esta pessoa?
 *   · nunca levou a carta rápida deste abandono (cartaRapidaEm === null) → 'enviar' (é o primeiro toque, como sempre);
 *   · levou a rápida e NÃO voltou ao site depois dela (voltou === false) → 'enviar' (segundo toque, ~22 h depois);
 *   · levou a rápida e VOLTOU (voltou === true) → 'pular_voltou' — a rápida já fez o trabalho; um 2º e-mail é ruído;
 *   · qualquer leitura desconhecida (undefined) → 'adiar' (sem carimbo: a próxima rodada, 2 h depois, tenta de novo).
 * Não há rastreio de abertura de e-mail na casa; "voltou" = qualquer evento de navegador (session_id) da pessoa depois da
 * carta rápida — inclui o clique no filme/biblioteca e a volta por conta própria. O clique no link da Stripe, sozinho,
 * não deixa rastro aqui: essa pessoa recebe o 2º toque, que é o certo para quem viu a página e não pagou.
 */
export function decidirSegundoToque24h(input: {
  cartaRapidaEm: string | null | undefined
  voltou: boolean | null | undefined
}): SegundoToque {
  if (input.cartaRapidaEm === undefined) return 'adiar'
  if (input.cartaRapidaEm === null) return 'enviar'
  if (input.voltou === true) return 'pular_voltou'
  if (input.voltou === false) return 'enviar'
  return 'adiar'
}

/** Onde procurar a carta rápida DESTE abandono: a sessão vive RECURRING_CHECKOUT_WINDOW_HOURS (24 h) e a carta sai até
 *  6 h depois do clique — tudo cabe em (expiração − sessão − 6 h de folga). Antes disso é carta de outro abandono. */
export function inicioDaBuscaDaCartaRapida(expiredAtIso: string | null | undefined, horasDaSessao: number): string | null {
  const t = typeof expiredAtIso === 'string' ? Date.parse(expiredAtIso) : NaN
  if (!Number.isFinite(t) || !Number.isFinite(horasDaSessao) || horasDaSessao <= 0) return null
  return new Date(t - (horasDaSessao + 6) * 3600_000).toISOString()
}

// ─── O texto (en/pt/es) ─────────────────────────────────────────────────────────────────────────────────────────────
type CopyRapido = {
  garantiaMensal: (plano: string, dias: number) => string
  garantiaAnual: (plano: string, dias: number) => string
  convite: (segundos: number) => string
  conviteIdeia: (ideia: string) => string
  conviteBotao: (segundos: number) => string
}

export const ABANDONO_RAPIDO_COPY: Record<RegionEmailLang, CopyRapido> = {
  en: {
    garantiaMensal: (p, d) => `${p} comes with a ${d}-day money-back guarantee: if it is not for you, email ${SUPORTE_EMAIL} within ${d} days of your first charge and we refund 100%.`,
    garantiaAnual: (p, d) => `The annual ${p} plan is refundable in full within ${d} days of purchase.`,
    convite: (s) => `Before you pay for anything: your trial still covers one free ${s}-second film (Seedance 1.5), and you have not made it yet. Watch Kineo make your own idea first, then decide.`,
    conviteIdeia: (i) => `Your last idea is ready to go: “${i}”`,
    conviteBotao: (s) => `Make my free ${s}-second film`,
  },
  pt: {
    garantiaMensal: (p, d) => `O ${p} tem garantia de ${d} dias: se não for para você, escreva para ${SUPORTE_EMAIL} em até ${d} dias da primeira cobrança e devolvemos 100%.`,
    garantiaAnual: (p, d) => `O plano ${p} anual é reembolsável integralmente em até ${d} dias da compra.`,
    convite: (s) => `Antes de pagar qualquer coisa: o seu teste ainda cobre um filme grátis de ${s} segundos (Seedance 1.5), e você ainda não o fez. Veja a Kineo fazer a sua própria ideia primeiro e depois decida.`,
    conviteIdeia: (i) => `Sua última ideia está pronta: “${i}”`,
    conviteBotao: (s) => `Fazer meu filme grátis de ${s} s`,
  },
  es: {
    garantiaMensal: (p, d) => `${p} tiene garantía de devolución de ${d} días: si no es para ti, escribe a ${SUPORTE_EMAIL} dentro de los ${d} días del primer cobro y te devolvemos el 100%.`,
    garantiaAnual: (p, d) => `El plan ${p} anual es reembolsable por completo dentro de los ${d} días de la compra.`,
    convite: (s) => `Antes de pagar nada: tu prueba todavía cubre una película gratis de ${s} segundos (Seedance 1.5), y aún no la hiciste. Mira a Kineo hacer tu propia idea primero y luego decide.`,
    conviteIdeia: (i) => `Tu última idea está lista: “${i}”`,
    conviteBotao: (s) => `Hacer mi película gratis de ${s} s`,
  },
}

/** A frase da garantia na língua da carta. */
export function fraseDaGarantia(lang: RegionEmailLang, g: Garantia): string {
  const c = ABANDONO_RAPIDO_COPY[lang] ?? ABANDONO_RAPIDO_COPY.en
  return g.periodo === 'annual' ? c.garantiaAnual(g.plano, g.dias) : c.garantiaMensal(g.plano, g.dias)
}

type ComRapido = { lang: RegionEmailLang; rapido?: RapidoNaCarta | null }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const AZUL = '#2997ff'

/** O convite (texto): entra logo depois da frase "o que você já fez / chegou até a página". Vazio sem convite. */
export function conviteTexto(x: ComRapido): string {
  const v = x.rapido?.convite
  if (!v) return ''
  const c = ABANDONO_RAPIDO_COPY[x.lang] ?? ABANDONO_RAPIDO_COPY.en
  return `\n\n${c.convite(v.segundos)}${v.ideia ? `\n${c.conviteIdeia(v.ideia)}` : ''}\n\n${v.href}`
}

/** O convite (html): um botão de contorno, ACIMA do botão de pagamento — mas sem esconder o botão de comprar. */
export function conviteHtml(x: ComRapido): string {
  const v = x.rapido?.convite
  if (!v) return ''
  const c = ABANDONO_RAPIDO_COPY[x.lang] ?? ABANDONO_RAPIDO_COPY.en
  const ideia = v.ideia ? `<p style="margin:0 0 10px;font-size:14px;color:#555">${esc(c.conviteIdeia(v.ideia))}</p>\n` : ''
  return `<p>${esc(c.convite(v.segundos))}</p>
${ideia}<p style="margin:0 0 22px"><a href="${esc(v.href)}" style="color:#1a1a1a;border:1px solid #c8c8c8;text-decoration:none;padding:9px 16px;border-radius:8px;font-weight:700;display:inline-block">${esc(c.conviteBotao(v.segundos))} &rarr;</a></p>
`
}

/** A garantia (texto): logo abaixo do link da página de pagamento. Vazia sem garantia. */
export function garantiaTexto(x: ComRapido): string {
  const g = x.rapido?.garantia
  if (!g) return ''
  return `\n${fraseDaGarantia(x.lang, g)}\n`
}

/** A garantia (html): uma linha discreta logo abaixo do botão de pagamento. */
export function garantiaHtml(x: ComRapido): string {
  const g = x.rapido?.garantia
  if (!g) return ''
  return `<p style="font-size:14px;color:#555;margin:0 0 18px">&#10003; ${esc(fraseDaGarantia(x.lang, g)).replace(SUPORTE_EMAIL, `<a href="mailto:${SUPORTE_EMAIL}" style="color:${AZUL}">${SUPORTE_EMAIL}</a>`)}</p>
`
}
