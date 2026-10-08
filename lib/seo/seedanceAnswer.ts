// KINEO-GEO-RODADA2-2026-10-08 — a página do Seedance 1.5 como a MELHOR resposta para quem pergunta ao ChatGPT "Seedance online /
// quanto custa / tem grátis / Seedance 1.5 x 2.5" (sessão CEO 08/10, item 1 da rodada 2 de GEO).
//
// POR QUE: /ai-video-generator/seedance é a página nº 1 do ChatGPT (52 sessões nos últimos 7 dias, 42 nos 14 anteriores; o
// /ai-video-generator/kineo-1 redireciona 301 para cá) e a única porta de motor que já pagou (seo_engine_seedance 46 → 2). A
// rodada 1 (KINEO-MOTORES-GEO-2026-10-06) respondeu "onde usar + quanto custa". Faltavam: O QUE É GRÁTIS E PARA QUEM (a
// resposta antiga só falava dos "supported countries" — desde 07/10 o resto do mundo também ganha um filme de 15 s, lib/
// freeFilmPolicy.ts REGION_FREE_FILM_LIVE), a comparação 1.5 × 2.5 e mais filmes REAIS feitos no Seedance dentro da Kineo.
//
// NENHUM NÚMERO DIGITADO:
//   · preço por vídeo, US$ e quantos por plano = ENGINE_GEO (lib/seo/engineCitation.ts → clipCreditCost / creditCostForDuration /
//     TIER_PRICES / TIER_CREDITS, montado em lib/growth/enginePageCatalog.ts) — chega por argumento;
//   · o grátis = lib/freeTierOffer.ts (TRIAL_CREDITS_SHOWN, TRIAL_FREE_FILM_SECONDS/CREDITS, GRANT_COUNTRY_CLAUSE) e
//     lib/freeFilmPolicy.ts (FREE_FILM_POLICY, REGION_FREE_FILM_LIVE/SECONDS/QUALITY, REGION_FREE_CLIP_PUBLIC/CREDITS) — os
//     MESMOS interruptores que concedem; desligar o filme de região apaga a frase dele sozinho;
//   · os filmes = lib/seo/houseFilmIdeas.ts (vitrine do fundador + a ideia real de cada filme), montados no componente
//     components/SeedanceAnswerSections.tsx — este módulo não os importa, porque o catálogo de motores (que o sitemap e o
//     llms.txt carregam) importa daqui o FAQ.
// O que esta camada NÃO diz, de propósito: a cota semanal de quem já usou o teste (lib/freeWeeklyFilm.ts — "não é anunciada"),
// nenhum preço do anual (outra sessão mexe no anual), nenhum tempo de render (a página já tem "8–25 min" da rodada 1; um
// segundo número aqui contradiria a tabela).
//
// MÓDULO PURO: só imports de módulos puros (sem banco, sem rede). O guardião scripts/test-geo-rodada2-2026-10-08.mjs o executa
// isolado. A política vem por '@/lib/freeFilmPolicy' — a forma que a trava "interruptores num lugar só" de
// scripts/test-saida-regiao-2026-10-07.mjs exige de quem usa REGION_FREE_FILM_LIVE.
import { money, usd, type EngineCitation } from './engineCitation'
import { GRANT_COUNTRY_CLAUSE, TRIAL_CREDITS_SHOWN, TRIAL_FREE_FILM_CREDITS, TRIAL_FREE_FILM_SECONDS, TRIAL_SEEDANCE15_FILMS } from '../freeTierOffer'
import {
  FREE_FILM_POLICY,
  REGION_FREE_CLIP_CREDITS,
  REGION_FREE_CLIP_PUBLIC,
  REGION_FREE_FILM_LIVE,
  REGION_FREE_FILM_QUALITY,
  REGION_FREE_FILM_SECONDS,
} from '@/lib/freeFilmPolicy'

export const SEEDANCE_ANSWER_MARK = 'KINEO-GEO-RODADA2-2026-10-08'
/** A campanha da página do Seedance (a mesma seo_engine_<slug> dos outros CTAs da página — é ela que vira signup_utm_campaign). */
export const SEEDANCE_CAMPAIGN = 'seo_engine_seedance'
/** A pergunta do FAQ que já existia na página (mantida); a resposta passa a vir de seedanceFreeAnswer. */
export const SEEDANCE_FREE_QUESTION = 'Can I use Seedance 1.5 without paying?'
export const SEEDANCE_VS_25_QUESTION = 'Seedance 1.5 vs Seedance 2.5 — what is the difference on Kineo?'
export const SEEDANCE_25_PATH = '/ai-video-generator/seedance-2-5'

/**
 * O destino do Studio com o Seedance pré-selecionado (o parâmetro ?engine= que o StudioClient já lê), atravessando o cadastro
 * do mesmo jeito de buildEngineLandingSignupHref (lib/growth/engineLandingIntent.ts): /signup?intent_campaign=…&redirect=/studio?…
 * `duration` e `prompt` são os outros parâmetros que o Studio já lê; nada aqui dispara render — o Gerar continua no Studio.
 */
export function seedanceStudioSignupHref(input: { campaign?: string; duration?: number; prompt?: string } = {}): string {
  const campaign = input.campaign && /^[A-Za-z0-9._~-]{1,100}$/.test(input.campaign) ? input.campaign : SEEDANCE_CAMPAIGN
  const studio = new URLSearchParams({ engine: 'seedance' })
  if (input.duration !== undefined) studio.set('duration', String(input.duration))
  const prompt = (input.prompt ?? '').trim().slice(0, 1000)
  if (prompt) studio.set('prompt', prompt)
  studio.set('intent_campaign', campaign)
  const signup = new URLSearchParams({ intent_campaign: campaign, redirect: `/studio?${studio.toString()}` })
  return `/signup?${signup.toString()}`
}

// ─── o que é grátis e para quem ────────────────────────────────────────────────────────────────────────────────────
export interface FreeFilmFacts {
  /** Créditos do teste (país da lista, ou todos com a política 'todos'). */
  trialCredits: number
  /** Os créditos do teste pagam o filme curto do Seedance? */
  trialCoversFilm: boolean
  filmSeconds: number
  filmCredits: number
  /** ' in supported countries' (política 'pais_rico') ou '' (política 'todos'). */
  countryClause: string
  /** Fora da lista, a conta nova também ganha UM filme do Seedance do mesmo tamanho (interruptor REGION_FREE_FILM_LIVE). */
  regionFilm: boolean
  /** Fora da lista, a conta nova ganha um clipe deste tamanho (null = não ganha). */
  regionClipSeconds: number | null
}

/**
 * Anunciar em página pública o que a conta de FORA da lista de países ganha (o filme de 15 s de região, 07/10, e o clipe de
 * 5 s, 05/10). É uma decisão de COMUNICAÇÃO, separada dos interruptores que CONCEDEM (lib/freeFilmPolicy.ts): com isto em
 * false as páginas voltam a falar só do teste dos países da lista, e quem é de fora continua ganhando o que ganha.
 * true desde KINEO-GEO-RODADA2-2026-10-08 (sessão CEO: "o que é grátis e para quem").
 */
export const ANNOUNCE_REGION_FREE_OFFER = true

/** Os fatos do grátis, lidos dos MESMOS interruptores que concedem. `clip` = o clipe do Seedance da tabela de preço. */
export function seedanceFreeFacts(clip: { seconds: number; credits: number } | null, announceRegion: boolean = ANNOUNCE_REGION_FREE_OFFER): FreeFilmFacts {
  const restrito = FREE_FILM_POLICY === 'pais_rico'
  return {
    trialCredits: TRIAL_CREDITS_SHOWN,
    trialCoversFilm: TRIAL_SEEDANCE15_FILMS >= 1,
    filmSeconds: TRIAL_FREE_FILM_SECONDS,
    filmCredits: TRIAL_FREE_FILM_CREDITS,
    countryClause: GRANT_COUNTRY_CLAUSE,
    regionFilm: announceRegion && restrito && REGION_FREE_FILM_LIVE && REGION_FREE_FILM_QUALITY === 'cinematic_ai' && REGION_FREE_FILM_SECONDS === TRIAL_FREE_FILM_SECONDS,
    regionClipSeconds: announceRegion && restrito && REGION_FREE_CLIP_PUBLIC && clip && clip.credits <= REGION_FREE_CLIP_CREDITS ? clip.seconds : null,
  }
}

/**
 * A frase do /llms.txt sobre quem é de FORA da lista (vazia quando não há o que anunciar). O clipe é o de 5 s do Seedance
 * (os créditos do clipe de região pagam exatamente esse clipe — lib/freeFilmPolicy.ts REGION_FREE_CLIP_CREDITS).
 */
export function regionFreeOfferSentence(f: FreeFilmFacts): string {
  if (!f.countryClause) return ''
  // A marca d'água vale para o FILME grátis (o plano grátis de sempre); a do clipe grátis nasceu desligada — não se promete.
  if (f.regionFilm) return `Outside those countries, a new account gets one free ${f.filmSeconds}-second Seedance 1.5 film (watermarked)${f.regionClipSeconds ? ` and one free ${f.regionClipSeconds}-second clip` : ''} instead of the trial credits.`
  if (f.regionClipSeconds) return `Outside those countries, a new account gets one free ${f.regionClipSeconds}-second clip; films need a paid plan.`
  return ''
}

/** A frase curta do filme grátis para outras páginas (nichos): a MESMA régua de seedanceFreeAnswer. null = sem filme grátis. */
export function freeFilmShortLine(f: FreeFilmFacts): string | null {
  if (!f.trialCoversFilm) return null
  const everyone = f.countryClause === '' || f.regionFilm
  return `${everyone ? 'Every new account' : 'Every new account in a supported country'} gets one free ${f.filmSeconds}-second Seedance 1.5 film, watermarked, no card.`
}

export interface SeedanceFreeAnswer {
  heading: string
  lead: string
  bullets: string[]
  ctaLabel: string
  ctaHref: string
  ctaNote: string
  faq: { q: string; a: string }
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export function seedanceFreeAnswer(geo: EngineCitation, f: FreeFilmFacts): SeedanceFreeAnswer {
  const starter = geo.plans.find((p) => p.tier === 'starter') ?? geo.plans[0]
  const per = (row: EngineCitation['rows']['film35']) => row.perPlan.find((p) => p.tier === starter.tier)?.count ?? 0
  const n35 = per(geo.rows.film35)
  const n60 = per(geo.rows.film60)
  const everyone = f.countryClause === '' || f.regionFilm
  const filme = `${f.filmSeconds}-second Seedance 1.5 film`
  const lead = !f.trialCoversFilm
    ? `Not as a film: new accounts${f.countryClause} start with ${f.trialCredits} free credits, and a Seedance 1.5 film needs a plan.`
    : everyone
      ? `Yes — one free ${filme} for every new account, watermarked, no card. Longer films and clean downloads need a plan.`
      : `Yes, in supported countries — one free ${filme} for every new account there, watermarked, no card. Longer films and clean downloads need a plan.`
  const bullets: string[] = []
  if (f.trialCoversFilm) {
    bullets.push(`New account${f.countryClause ? ' in a supported country' : ''}: ${f.trialCredits} free credits on signup — your free ${filme} uses ${f.filmCredits}.`)
  }
  if (f.countryClause) {
    if (f.regionFilm) bullets.push(`New account anywhere else: one free ${filme}${f.regionClipSeconds ? `, plus one free ${f.regionClipSeconds}-second clip` : ''}.`)
    else if (f.regionClipSeconds) bullets.push(`New account anywhere else: one free ${f.regionClipSeconds}-second clip; films need a plan.`)
  }
  bullets.push('Free films carry a small Kineo watermark; any paid plan downloads clean.')
  if (n35 > 0 || n60 > 0) {
    const cobre = [n35 > 0 ? `${n35} ${plural(n35, 'film', 'films')} of 35 seconds` : '', n60 > 0 ? `${n60} of 60 seconds` : ''].filter(Boolean).join(' or ')
    bullets.push(`Seedance films of 35 and 60 seconds need a plan: ${starter.label} (${money(starter.usdCents)}/month, ${starter.credits} credits) covers ${cobre}.`)
  }
  const faqLead = !f.trialCoversFilm ? lead : everyone ? `Yes, for one short film: every new account gets one free ${filme}, watermarked, no card.` : `Yes, once in supported countries: every new account there gets one free ${filme}, watermarked, no card.`
  const como = f.trialCoversFilm && f.countryClause
    ? ` In supported countries it comes from the ${f.trialCredits} free credits every new account gets (the film uses ${f.filmCredits})${f.regionFilm ? `; elsewhere it is granted as one free film${f.regionClipSeconds ? `, plus one free ${f.regionClipSeconds}-second clip` : ''}` : ''}.`
    : f.trialCoversFilm ? ` It comes from the ${f.trialCredits} free credits every new account gets (the film uses ${f.filmCredits}).` : ''
  const faq = {
    q: SEEDANCE_FREE_QUESTION,
    a: `${faqLead}${como} A 60-second Seedance film costs ${geo.rows.film60.credits} credits and comes with ${starter.label} (${money(starter.usdCents)}/month) or a larger plan; a plan also removes the watermark.`,
  }
  return {
    heading: 'Is Seedance 1.5 free?',
    lead,
    bullets,
    ctaLabel: f.trialCoversFilm ? `Make your free ${f.filmSeconds}-second Seedance film →` : 'See the plans that include Seedance →',
    ctaHref: f.trialCoversFilm ? seedanceStudioSignupHref({ duration: f.filmSeconds }) : '/pricing',
    ctaNote: 'You type your idea in the Studio and press Generate — nothing renders on its own.',
    faq,
  }
}

// ─── Seedance 1.5 × Seedance 2.5 ───────────────────────────────────────────────────────────────────────────────────
export interface SeedanceVs25 {
  heading: string
  intro: string
  rows: { label: string; v15: string; v25: string }[]
  verdict: string
  footnote: string
  link: { href: string; label: string }
  faq: { q: string; a: string }
}

function rowCell(row: EngineCitation['rows']['film35']): string {
  return `${row.credits} credits (about ${usd(row.usdCents)})`
}

/** null = o 2.5 não tem página citável agora (pausado ou fora do lançamento): a comparação some sozinha. */
export function seedanceVs25(s15: EngineCitation, s25: EngineCitation | null, f: FreeFilmFacts): SeedanceVs25 | null {
  if (!s25) return null
  const ref = s15.reference
  const perRef = (row: EngineCitation['rows']['film60']) => row.perPlan.find((p) => p.tier === ref.tier)?.count ?? 0
  const clipCell = (g: EngineCitation) => (g.rows.clip ? `${g.rows.clip.credits} credits for ${g.rows.clip.seconds} seconds (about ${usd(g.rows.clip.usdCents)})${g.paidPlansOnly ? ', paid plans' : ''}` : 'Not sold as a single clip')
  const ratio = Math.round(s25.rows.film60.credits / s15.rows.film60.credits)
  const rows = [
    { label: 'Who can use it', v15: f.trialCoversFilm ? `Every account — new accounts get one free ${f.filmSeconds}-second film` : 'Every account', v25: s25.paidPlansOnly ? 'Paid plans only — not in the free trial' : 'Every account' },
    { label: 'One scene as a clip', v15: clipCell(s15), v25: clipCell(s25) },
    { label: 'Narrated film, 35 seconds', v15: rowCell(s15.rows.film35), v25: rowCell(s25.rows.film35) },
    { label: 'Narrated film, 60 seconds', v15: rowCell(s15.rows.film60), v25: rowCell(s25.rows.film60) },
    { label: `60-second films a month on ${ref.label} (${money(ref.usdCents)}/mo)`, v15: String(perRef(s15.rows.film60)), v25: String(perRef(s25.rows.film60)) },
    { label: 'Reach for it when', v15: 'You post often: mystery, history and facts that stock footage cannot show', v25: 'One spectacle film: weather, crowds, explosions, set pieces' },
  ]
  return {
    heading: 'Seedance 1.5 vs Seedance 2.5 on Kineo',
    intro: 'Both are ByteDance video models. On both, Kineo writes the script, generates every scene, narrates it and adds captions and music — what changes is the model and the price.',
    rows,
    verdict: `Seedance 2.5 costs about ${ratio}× the credits of Seedance 1.5 for the same 60-second film. Start on 1.5; switch to 2.5 for the film that needs its motion.`,
    footnote: `US$ at the ${ref.label} plan’s credit price (${usd(ref.usdCents)} for ${ref.credits} credits), the same rule as the price table above.`,
    link: { href: SEEDANCE_25_PATH, label: 'Seedance 2.5: price per video and what it is for →' },
    faq: {
      q: SEEDANCE_VS_25_QUESTION,
      a: `Both are ByteDance video models that Kineo turns into a finished, narrated film. Seedance 1.5 is the everyday engine: ${s15.rows.film35.credits} credits for 35 seconds and ${s15.rows.film60.credits} for 60${f.trialCoversFilm ? `, and new accounts get one free ${f.filmSeconds}-second film` : ''}. Seedance 2.5 is the newer, heavier model for spectacle: ${s25.rows.film35.credits} credits for 35 seconds and ${s25.rows.film60.credits} for 60${s25.paidPlansOnly ? ', on paid plans only' : ''}. At the ${ref.label} plan’s credit price, a 60-second film is about ${usd(s15.rows.film60.usdCents)} on 1.5 and ${usd(s25.rows.film60.usdCents)} on 2.5.`,
    },
  }
}
