// KINEO-PAGINAS-MOTOR-1610 — o "molde Seedance" nas páginas de motor premium + a página de custo e a comparação de motores
// (fundador 16/10: página de conteúdo/SEO não conta como produto congelado; PLANO-TRIPLICAR-VISITANTES-2026-10-16, Ação 3).
//
// POR QUE: /ai-video-generator/seedance trouxe 152 visitantes em 28 dias e cadastra ~39%; Veo 3.1, Kling 3 e Seedance 2.5
// tiveram 4–10. A página do Seedance responde na primeira dobra o que o comprador pergunta ao ChatGPT (onde usar, quanto custa,
// é grátis?, 1.5 × 2.5) e mostra filmes reais. As irmãs tinham a tabela de preço e quase nada além. Este módulo dá a elas a
// mesma camada citável, com o conteúdo dos 6 artigos do GPT (docs/paginas-gpt/, 14/10) onde há sobreposição:
//   · resumo citável de 3 linhas; · preço por duração (15/35/60 s) ao lado do motor irmão; · limites honestos;
//   · "When NOT to use"; · links para a comparação e a página de custo.
// E, a pedido da coordenação (teste real no ChatGPT de 15/10: a Kineo não aparece para "cheapest way to make AI YouTube
// Shorts" nem para "best AI video generator for YouTube Shorts with Seedance or Veo"), a resposta curta da página de custo e
// a comparação honesta com Google Flow, Dreamina, CapCut, o app do Kling e o Seedance.tv.
//
// REGRAS DE VERDADE (as mesmas de lib/seo/engineCitation.ts):
//   · crédito = creditCostForDuration (a função que cobra); durações = supportedDurationsFor; planos = TIER_PRICES/TIER_CREDITS
//     e o nome de PLANS; US$ = créditos × preço do Creator ÷ créditos do Creator (a régua do /pricing e das páginas de motor);
//   · Seedance 2.5 só aparece com S25_PUBLIC; motor pausado ou fora da oferta não aparece;
//   · preço de TERCEIRO só de página oficial, com URL e data da leitura (CONCORRENTES_1610 abaixo); onde a página oficial não
//     mostra o número, a frase diz isso em vez de inventar. Nada de nota, ranking de qualidade ou métrica de público.
//   · selo honesto: o nome do motor é o do modelo que roda (Veo 3.1 = Veo 3.1 Fast; Kling 3 = Kling 3.0 Pro + voz da casa).
// Fatos de código conferidos em 15/10 (origin/main c9199975):
//   · Veo/Seedance/Kling 2.5 = caminho clássico, áudio do modelo desligado, narração da casa (route.ts generate_audio:false);
//   · diálogo na câmera só no caminho hollywood; a fala é a VOZ DA CASA sincronizada no retrato-âncora (KINEO-VOZ-NA-BOCA,
//     ligado por padrão) com o áudio nativo do Kling 3 como reserva; fala na câmera só em inglês (lib/hollywood/router.ts:
//     "the on-camera engines lip-sync English only"); sem pessoa real; hostFits=false → zero cenas de diálogo.
// MÓDULO PURO: só imports relativos de módulos puros — o guardião scripts/test-paginas-motor-1610.mjs o executa isolado.
import { creditCostForDuration, type Quality } from '../credits/engineCost'
import { supportedDurationsFor } from '../durationByEngine'
import { TIER_CREDITS, TIER_PRICES } from '../checkoutPricing'
import { PLANS } from '../pricing'
import { AVATAR_PUBLIC, S25_PUBLIC, enginePaused, engineOffered } from '../engineLaunch'
import { FREE_FILM_LABEL, GRANT_COUNTRY_CLAUSE, TRIAL_FREE_FILM_SECONDS, TRIAL_SEEDANCE15_FILMS } from '../freeTierOffer'

export const PAGINAS_MOTOR_1610_MARK = 'KINEO-PAGINAS-MOTOR-1610'
/** Data da leitura das fontes externas e da revisão do texto. */
export const PAGINAS_MOTOR_1610_CHECKED_ISO = '2026-10-15'
export const PAGINAS_MOTOR_1610_CHECKED_LABEL = '15 October 2026'
/** As durações da tabela "preço por duração" (as que o artigo do GPT usa; só as que o motor aceita entram). */
export const GUIDE_FILM_SECONDS = [15, 35, 60] as const
export const COMPARE_PATH = '/seedance-vs-veo-vs-kling'
export const COST_PATH = '/cheapest-ai-shorts-maker'

type EngineKey = 'seedance' | 'kling' | 'h3' | 'veo' | 'hollywood' | 's25'
interface EngineRef { key: EngineKey; name: string; quality: Quality; path: string }
/** Os motores das tabelas (nomes = selos de lib/growth/enginePageCatalog.ts; o guardião confere). */
export const ENGINE_REFS: Record<EngineKey, EngineRef> = {
  seedance: { key: 'seedance', name: 'Seedance 1.5', quality: 'cinematic_ai', path: '/ai-video-generator/seedance' },
  kling: { key: 'kling', name: 'Kling 2.5', quality: 'cinematic_kling', path: '/ai-video-generator/kling' },
  h3: { key: 'h3', name: 'MiniMax H3', quality: 'cinematic_h3', path: '/ai-video-generator/minimax-h3' },
  veo: { key: 'veo', name: 'Veo 3.1', quality: 'cinematic_veo', path: '/ai-video-generator/veo' },
  hollywood: { key: 'hollywood', name: 'Kling 3', quality: 'cinematic_hollywood', path: '/ai-video-generator/kling-3' },
  s25: { key: 's25', name: 'Seedance 2.5', quality: 'cinematic_s25', path: '/ai-video-generator/seedance-2-5' },
}
/** Motor que pode aparecer em página pública: na oferta, fora de manutenção e (o 2.5) com o interruptor ligado. */
export function engineListed(key: EngineKey): boolean {
  return engineOffered(key) && !enginePaused(key) && (key !== 's25' || S25_PUBLIC)
}

// ─── dinheiro (a régua das páginas de motor: preço do crédito do Creator) ─────────────────────────────────────────────
const PAID = ['starter', 'basic', 'pro'] as const
type PaidTier = typeof PAID[number]
export function usd(cents: number): string {
  return `$${(Math.round(cents) / 100).toFixed(2)}`
}
function money(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : usd(cents)
}
/** ≈ centavos de US$ de N créditos no preço do crédito do plano (padrão: Creator). */
export function creditsToCents(credits: number, tier: PaidTier = 'basic'): number {
  return Math.round((credits * TIER_PRICES[tier].usd) / TIER_CREDITS[tier])
}
export const REFERENCE_PLAN_LINE = (): string =>
  `${PLANS.basic.name} plan’s credit price (${money(TIER_PRICES.basic.usd)} for ${TIER_CREDITS.basic} credits)`
/** O menor plano mensal cujo grant cobre N créditos (null = nenhum sozinho). */
export function smallestPlanFor(credits: number): { tier: PaidTier; name: string; price: string } | null {
  const t = PAID.find((x) => TIER_CREDITS[x] >= credits)
  return t ? { tier: t, name: PLANS[t].name, price: money(TIER_PRICES[t].usd) } : null
}
/** Créditos de um filme do motor nesta duração (null = o motor não oferece essa duração). */
export function filmCredits(key: EngineKey, seconds: number): number | null {
  return supportedDurationsFor(key).includes(seconds) ? creditCostForDuration(ENGINE_REFS[key].quality, true, seconds) : null
}
function c(key: EngineKey, seconds: number): number {
  const v = filmCredits(key, seconds)
  if (v === null || !Number.isFinite(v) || v <= 0) throw new Error(`paginasMotor1610: ${key} sem filme de ${seconds} s`)
  return v
}

// ─── o guia de cada página de motor ───────────────────────────────────────────────────────────────────────────────
export interface GuideRow { seconds: number; credits: number; usdCents: number; smallestPlan: string; compareCredits: number | null; compareUsdCents: number | null }
export interface EngineGuide {
  slug: string
  key: EngineKey
  name: string
  compare: EngineRef
  /** O resumo citável: exatamente 3 frases (o guardião confere). */
  summary: [string, string, string]
  rows: GuideRow[]
  limits: string[]
  whenNot: string[]
  links: { href: string; label: string }[]
  paidPlansOnly: boolean
}

/** Os slugs que ganham o guia (Omni Flash saiu da oferta em 12/10 — a página é 301 para o Kling 3). */
export const GUIDE_SLUGS = ['veo', 'kling-3', 'kling', 'seedance-2-5'] as const
const SLUG_KEY: Record<(typeof GUIDE_SLUGS)[number], EngineKey> = { veo: 'veo', 'kling-3': 'hollywood', kling: 'kling', 'seedance-2-5': 's25' }
const COMPARE_KEY: Record<EngineKey, EngineKey> = { veo: 'seedance', hollywood: 'kling', kling: 'hollywood', s25: 'seedance', seedance: 'veo', h3: 'hollywood' }

function rowsFor(key: EngineKey, compare: EngineKey): GuideRow[] {
  return GUIDE_FILM_SECONDS.filter((s) => filmCredits(key, s) !== null).map((s) => {
    const credits = c(key, s)
    const other = filmCredits(compare, s)
    const plan = smallestPlanFor(credits)
    return {
      seconds: s,
      credits,
      usdCents: creditsToCents(credits),
      smallestPlan: plan ? `${plan.name} (${plan.price}/mo)` : 'More than one monthly grant',
      compareCredits: other,
      compareUsdCents: other === null ? null : creditsToCents(other),
    }
  })
}

const ILLUSTRATION = 'Generated scenes are illustrations: a realistic place, machine or person on screen is not evidence that an event looked that way. Check names, dates and numbers in the script before you render.'
const NO_FOOTAGE_EDIT = 'You already have the footage and only need it cut, trimmed or captioned — this workflow generates new scenes from a script.'

export function engineGuideFor(slug: string): EngineGuide | null {
  if (!(GUIDE_SLUGS as readonly string[]).includes(slug)) return null
  const key = SLUG_KEY[slug as (typeof GUIDE_SLUGS)[number]]
  if (!engineListed(key)) return null
  const e = ENGINE_REFS[key]
  const cmpKey = engineListed(COMPARE_KEY[key]) ? COMPARE_KEY[key] : 'seedance'
  const cmp = ENGINE_REFS[cmpKey]
  const rows = rowsFor(key, cmpKey)
  const r60 = rows.find((r) => r.seconds === 60)
  const r15 = rows.find((r) => r.seconds === 15)
  const r35 = rows.find((r) => r.seconds === 35)
  if (!r60) return null
  const priceLine = `${[r15, r35, r60].filter(Boolean).map((r) => `${r!.credits} credits for ${r!.seconds} seconds`).join(', ')} — about ${usd(r60.usdCents)} for 60 seconds at the ${REFERENCE_PLAN_LINE()}`
  const s60 = c('seedance', 60)
  const k60 = c('kling', 60)
  const k3 = engineListed('hollywood') ? c('hollywood', 60) : null
  const creatorCovers60 = Math.floor(TIER_CREDITS.basic / r60.credits)
  const links = [
    { href: COMPARE_PATH, label: 'Seedance vs Veo vs Kling: which engine for which story' },
    { href: COST_PATH, label: 'What an AI Short costs on every engine (and outside Kineo)' },
    { href: cmp.path, label: `${cmp.name} on Kineo` },
  ]
  const kling3Line = k3 !== null ? ` Kling 3 is the engine built for a character speaking on camera (${k3} credits per 60 seconds; lines in English only).` : ''

  if (key === 'veo') {
    return {
      slug, key, name: e.name, compare: cmp, rows, links, paidPlansOnly: false,
      summary: [
        `Kineo runs Google’s Veo 3.1 Fast inside a finished-film workflow: you use a Kineo account and Kineo credits, with no separate Google AI subscription.`,
        `A finished Veo 3.1 Short with narration, captions and music costs ${priceLine}.`,
        `Kineo switches Veo’s own audio off and narrates your script itself, so characters do not speak on camera.${kling3Line}`,
      ],
      limits: [
        'The model is Veo 3.1 Fast. Settings sold elsewhere under the Veo name — the Quality model, 4K output, native dialogue — are not part of this purchase.',
        'Sound: the narration, captions and music are Kineo’s. Veo’s native audio is off in this workflow, so there is no on-camera dialogue or lip sync with Veo here.',
        'Length: the duration you pick sizes the script; review the exported runtime if a placement needs an exact length.',
        ILLUSTRATION,
      ],
      whenNot: [
        'You want Google’s own Flow workspace or every Veo control (Quality model, 4K, native audio) — use Google’s tools directly.',
        ...(k3 !== null ? ['A character has to speak a line on camera with lip sync — choose Kling 3 (English only).'] : []),
        `You post every day on a small plan — a 60-second ${ENGINE_REFS.seedance.name} film costs ${s60} credits against Veo’s ${r60.credits}.`,
        NO_FOOTAGE_EDIT,
      ],
    }
  }
  if (key === 'hollywood') {
    return {
      slug, key, name: e.name, compare: cmp, rows, links, paidPlansOnly: false,
      summary: [
        `Kling 3 in Kineo makes multi-scene vertical films where a fictional character can speak a line on camera, with lip sync, between narrated scenes.`,
        `A finished Kling 3 film costs ${priceLine}; the ${PLANS.basic.name} monthly grant covers ${creatorCovers60 === 1 ? 'one' : creatorCovers60} 60-second film${creatorCovers60 === 1 ? '' : 's'}.`,
        `On-camera lines are English only — a Portuguese or Spanish script is narrated instead — and a narrated 60-second ${ENGINE_REFS.kling.name} film without dialogue costs ${k60} credits.`,
      ],
      limits: [
        'Dialogue is English only. A Portuguese or Spanish script becomes narrated scenes, with no on-camera speech.',
        'Not every film has a speaker: Kineo plans each film from the script. Stories with a narrator persona (mysteries, history, facts, explainers) open and close with the character speaking; spectacle and fiction without a storyteller are narrated throughout.',
        'The voice in a dialogue scene is normally the same Kineo voice that narrates the film, lip-synced onto the character’s portrait; Kling 3’s own audio is the fallback. Review the lip sync before you post.',
        'One fictional character per film, generated from one anchor portrait so the face and outfit carry from scene to scene; details can still drift between shots. Real people and celebrities are never depicted.',
        ILLUSTRATION,
      ],
      whenNot: [
        `The story only needs narration over scenery — ${ENGINE_REFS.kling.name} (${k60} credits) or ${ENGINE_REFS.seedance.name} (${s60} credits) cover a 60-second film for fewer credits.`,
        'The dialogue must be in a language other than English.',
        ...(AVATAR_PUBLIC ? [] : ['You need the same face across separate videos — saving a character between films is not part of the catalogue today.']),
        'You need a real person, a recognisable actor or an exact product demonstration.',
      ],
    }
  }
  if (key === 'kling') {
    const starterCovers = Math.floor(TIER_CREDITS.starter / r60.credits)
    return {
      slug, key, name: e.name, compare: cmp, rows, links, paidPlansOnly: false,
      summary: [
        `Kling 2.5 Turbo Pro in Kineo is the engine for camera-led narrated Shorts — push-ins, drone reveals, action — with Kineo’s narration, captions and music on top.`,
        `A finished Kling 2.5 film costs ${priceLine}${starterCovers >= 1 ? `; the ${PLANS.starter.name} monthly grant covers ${starterCovers === 1 ? 'one 60-second film' : `${starterCovers} 60-second films`}` : ''}.`,
        `Kling 2.5 scenes are narrated, never spoken on camera.${kling3Line}`,
      ],
      limits: [
        'Narration only: Kineo’s narrator speaks over the footage; characters do not speak on camera.',
        'The scenes are generated silent; every sound in the film is Kineo’s narration and music.',
        `If the camera does not need to move, ${ENGINE_REFS.seedance.name} tells the same story for ${s60} credits per 60 seconds.`,
        ILLUSTRATION,
      ],
      whenNot: [
        ...(k3 !== null ? ['A character has to deliver a line on camera — choose Kling 3 (English only).'] : []),
        'You need the same actor recognisable in every shot, or an exact product demonstration.',
        NO_FOOTAGE_EDIT,
      ],
    }
  }
  // Seedance 2.5 — só plano pago (lib/s25Access.ts); só existe aqui com S25_PUBLIC (engineListed).
  return {
    slug, key, name: e.name, compare: cmp, rows, links, paidPlansOnly: true,
    summary: [
      `Seedance 2.5 in Kineo turns one sentence into a finished vertical film — every scene generated by ByteDance’s Seedance 2.5, plus Kineo’s narration, captions and music — on paid plans only.`,
      `It costs ${priceLine}; the free trial does not include it.`,
      `${ENGINE_REFS.seedance.name} makes the same kind of narrated film for ${s60} credits per 60 seconds; Seedance 2.5 is for scenes where the motion itself — weather, machines, crowds — carries the film.`,
    ],
    limits: [
      'Paid plans only: the free trial and free accounts cannot render it.',
      'Kineo turns the model’s own audio off; the voice is Kineo’s narration of your script, word for word.',
      'It renders more slowly than the other engines — long scenes queue at the provider.',
      'Fine on-screen text and very close faces hold up less well than on Kling 3.',
      ILLUSTRATION,
    ],
    whenNot: [
      ...(TRIAL_SEEDANCE15_FILMS >= 1 ? [`You are on the free trial — start with the ${FREE_FILM_LABEL}${GRANT_COUNTRY_CLAUSE}.`] : []),
      `You publish several films a week on a small plan — ${ENGINE_REFS.seedance.name} costs ${s60} credits per 60 seconds.`,
      ...(k3 !== null ? ['A character speaking on camera is the point of the film — choose Kling 3 (English lines only).'] : []),
      'The film depends on readable text on screen or very close faces.',
    ],
  }
}

// ─── fora da Kineo: o que cada ferramenta entrega, com fonte oficial e data ──────────────────────────────────────────
// Lido em 15/10/2026 nas páginas OFICIAIS abaixo. Onde a página não mostra o número (preço só depois do login, preço em
// moeda local, página que só renderiza com JavaScript), a frase diz isso — nunca um número de blog. A página de preços
// da CapCut e a do Google One nos foram servidas com preço local (BRL) ou sem preço em US$: por isso não citamos mensalidade.
export interface Competitor {
  id: 'google-flow' | 'seedance-tv' | 'dreamina' | 'capcut' | 'kling-app'
  name: string
  delivers: string
  publicPrice: string
  /** O que a ferramenta não monta por você, em relação a um filme narrado pronto (sem afirmar o que não conferimos). */
  gap: string
  /** Custo calculado (em código) de 60 s de vídeo bruto na ferramenta; null = a página oficial não dá base. */
  sixtySeconds: string | null
  sources: { label: string; url: string }[]
  checkedOn: string
}

/** Números lidos nas páginas oficiais (15/10/2026). */
export const FONTES_CONCORRENTES_1610 = {
  googleFlow: {
    url: 'https://support.google.com/flow/answer/16526234?hl=en', // "Manage your Google Flow credits"
    freeCreditsPerDay: 50,
    veoFastCreditsPerGeneration: 20, // non-Ultra subscribers; 4 s, 6 s, 8 s
    veoFastMaxSeconds: 8,
    planCreditsPerMonth: { plus: 200, pro: 1000, ultra100: 10000, ultra200: 25000 },
  },
  seedanceTv: {
    url: 'https://www.seedance.tv/pricing',
    miniUsdCentsMonthly: 3900,
    miniCreditsMonthly: 400,
    freeStarterCredits: 12,
    seedance2Mini480p5sCredits: 4,
    clipSeconds: 5,
    veo31_720p_8sCredits: 10,
  },
  dreamina: { url: 'https://dreamina.capcut.com/' },
  capcut: {
    url: 'https://www.capcut.com/pricing',
    proCreditsMonthly: 1750,
    seedance25FromUsdPerSecond: 0.12, // "first month", Pro
  },
  klingApp: { url: 'https://kling.ai/app/membership/membership-plan' }, // app.klingai.com redireciona (301) para cá; a página só renderiza com JavaScript
} as const

export function competitors1610(): Competitor[] {
  const f = FONTES_CONCORRENTES_1610.googleFlow
  const flowClips60 = Math.ceil(60 / f.veoFastMaxSeconds)
  const flowCredits60 = flowClips60 * f.veoFastCreditsPerGeneration
  const flowDays60 = Math.ceil(flowCredits60 / f.freeCreditsPerDay)
  const flowClipsPerDay = Math.floor(f.freeCreditsPerDay / f.veoFastCreditsPerGeneration)
  const s = FONTES_CONCORRENTES_1610.seedanceTv
  const sClips60 = Math.ceil(60 / s.clipSeconds)
  const sCredits60 = sClips60 * s.seedance2Mini480p5sCredits
  const sCents60 = Math.round((sCredits60 * s.miniUsdCentsMonthly) / s.miniCreditsMonthly)
  const cc = FONTES_CONCORRENTES_1610.capcut
  const ccCents60 = Math.round(cc.seedance25FromUsdPerSecond * 60 * 100)
  const checkedOn = PAGINAS_MOTOR_1610_CHECKED_ISO
  return [
    {
      id: 'google-flow',
      name: 'Google Flow',
      delivers: `Generated clips (Veo 3.1 up to ${f.veoFastMaxSeconds} seconds each, Gemini Omni Flash) in Google’s AI studio.`,
      publicPrice: `Free accounts get ${f.freeCreditsPerDay} credits a day; a Veo 3.1 Fast generation costs ${f.veoFastCreditsPerGeneration} credits for non-Ultra users (${flowClipsPerDay} a day free). Google AI plans add ${f.planCreditsPerMonth.plus.toLocaleString('en-US')} (Plus) to ${f.planCreditsPerMonth.ultra200.toLocaleString('en-US')} (Ultra) credits a month.`,
      gap: 'Priced per clip: a 60-second Short means planning several clips, then adding the script, narration across clips and captions.',
      sixtySeconds: `${flowClips60} clips × ${f.veoFastCreditsPerGeneration} = ${flowCredits60} credits — about ${flowDays60} days of the free daily credits.`,
      sources: [{ label: 'Manage your Google Flow credits (Google Help)', url: f.url }],
      checkedOn,
    },
    {
      id: 'seedance-tv',
      name: 'Seedance.tv',
      delivers: 'Clips from many models (Seedance 2, Veo 3.1, Kling 3.0, MiniMax H3) and an AI Video Agent that cuts generated shots into a film of up to 2.5 minutes.',
      publicPrice: `Mini plan ${money(s.miniUsdCentsMonthly)}/month for ${s.miniCreditsMonthly} credits; a ${s.clipSeconds}-second Seedance 2 Mini clip at 480p costs ${s.seedance2Mini480p5sCredits} credits, an 8-second Veo 3.1 clip at 720p with audio ${s.veo31_720p_8sCredits}. New accounts get ${s.freeStarterCredits} starter credits.`,
      gap: 'Narration and captions are not listed among the features on its pricing page.',
      sixtySeconds: `${sClips60} Seedance 2 Mini clips × ${s.seedance2Mini480p5sCredits} = ${sCredits60} credits — about ${usd(sCents60)} of the Mini plan, before any voice or captions.`,
      sources: [{ label: 'Seedance.tv pricing', url: s.url }],
      checkedOn,
    },
    {
      id: 'dreamina',
      name: 'Dreamina (CapCut)',
      delivers: 'Text-to-video and image-to-video clips with Seedance 2.5, Seedance 2.0, Veo 3.1 and Sora 2.',
      publicPrice: 'Free daily credits (the amount is not shown publicly) and Seedance 2.0 marked as available for free; plan names and full prices appear only after sign-in.',
      gap: 'A clip generator: per-video credit costs are not published, and the narrated edit is a separate step.',
      sixtySeconds: null,
      sources: [{ label: 'Dreamina home page', url: FONTES_CONCORRENTES_1610.dreamina.url }],
      checkedOn,
    },
    {
      id: 'capcut',
      name: 'CapCut',
      delivers: 'A video editor with AI generation built in (Seedance 2.0 Mini and Seedance 2.5 on paid plans), templates and editing tools.',
      publicPrice: `Free plan with templates and basic editing; Pro includes ${cc.proCreditsMonthly.toLocaleString('en-US')} AI credits a month, with Seedance 2.5 listed from $${cc.seedance25FromUsdPerSecond.toFixed(2)} per second in the first month. Plan prices are shown in local currency and vary by region.`,
      gap: 'You assemble the Short in the editor — script, voice, captions and cuts — with its tools.',
      sixtySeconds: `60 seconds of Seedance 2.5 at the listed first-month rate ≈ ${usd(ccCents60)} of generation, before editing.`,
      sources: [{ label: 'CapCut pricing', url: cc.url }],
      checkedOn,
    },
    {
      id: 'kling-app',
      name: 'Kling app (klingai.com)',
      delivers: 'Kling’s own studio for clips from the Kling models.',
      publicPrice: 'Monthly credit plans whose prices change with promotions; the plan page loads only after sign-in — compare the current offer there.',
      gap: 'Clips, not a narrated film: the script, narration across scenes and captions are separate steps.',
      sixtySeconds: null,
      sources: [{ label: 'Kling plans', url: FONTES_CONCORRENTES_1610.klingApp.url }],
      checkedOn,
    },
  ]
}

// ─── a resposta da página de custo ("cheapest way to make AI YouTube Shorts") ────────────────────────────────────────
export interface CostRow { key: EngineKey; name: string; path: string; cells: { seconds: number; credits: number | null; usdCents: number | null }[] }
/** Tabela de custo de filme narrado por motor e duração (só motores listados; 15/35/60). */
export function kineoCostRows(): CostRow[] {
  const order: EngineKey[] = ['seedance', 'kling', 'h3', 'veo', 'hollywood', 's25']
  return order.filter(engineListed).map((k) => ({
    key: k,
    name: ENGINE_REFS[k].name,
    path: ENGINE_REFS[k].path,
    cells: GUIDE_FILM_SECONDS.map((s) => {
      const credits = filmCredits(k, s)
      return { seconds: s, credits, usdCents: credits === null ? null : creditsToCents(credits) }
    }),
  }))
}

/** O plano cujo crédito sai mais barato (para "about $X" — o menor valor honesto por crédito entre os mensais). */
export function cheapestCreditPlan(): { tier: PaidTier; name: string; line: string } {
  const best = [...PAID].sort((a, b) => TIER_PRICES[a].usd / TIER_CREDITS[a] - TIER_PRICES[b].usd / TIER_CREDITS[b])[0]
  return { tier: best, name: PLANS[best].name, line: `${PLANS[best].name} plan’s credit price (${money(TIER_PRICES[best].usd)} for ${TIER_CREDITS[best]} credits)` }
}

export interface CheapestAnswer { summary: [string, string, string]; cheapest: { name: string; path: string; c15: number; c60: number; usd15: string; usd60: string } }
export function cheapestAnswer(): CheapestAnswer {
  const rows = kineoCostRows()
  const sixty = (r: CostRow) => r.cells.find((x) => x.seconds === 60)?.credits ?? Infinity
  const best = [...rows].sort((a, b) => sixty(a) - sixty(b))[0]
  const plan = cheapestCreditPlan()
  const c60 = sixty(best)
  const c15 = best.cells.find((x) => x.seconds === 15)?.credits ?? c60
  const usd60 = usd(creditsToCents(c60, plan.tier))
  const usd15 = usd(creditsToCents(c15, plan.tier))
  const f = FONTES_CONCORRENTES_1610.googleFlow
  const freeFilm = TRIAL_SEEDANCE15_FILMS >= 1 ? `New Kineo accounts${GRANT_COUNTRY_CLAUSE} get one ${FREE_FILM_LABEL}. ` : ''
  return {
    cheapest: { name: best.name, path: best.path, c15, c60, usd15, usd60 },
    summary: [
      `The cheapest way to make AI YouTube Shorts depends on who does the editing: Google Flow gives free accounts ${f.freeCreditsPerDay} credits a day — ${Math.floor(f.freeCreditsPerDay / f.veoFastCreditsPerGeneration)} Veo 3.1 Fast clips of up to ${f.veoFastMaxSeconds} seconds — and you add the script, voice and captions yourself.`,
      `On Kineo a finished, narrated 60-second Short costs ${c60} credits with ${best.name} — about ${usd60} at the ${plan.line} — and a 15-second one costs ${c15} credits (about ${usd15}).`,
      `${freeFilm}No tool is the cheapest for every channel: clip tools price raw seconds of video, Kineo prices a finished film with the script, voice, captions and music done.`,
    ],
  }
}

// ─── a comparação de motores (/seedance-vs-veo-vs-kling): para que história serve cada um ───────────────────────────
export interface DecisionRow { name: string; path: string; considerFor: string; credits60: number; usdCents60: number; limitation: string }
export function decisionRows1610(): DecisionRow[] {
  const spec: { key: EngineKey; considerFor: string; limitation: string }[] = [
    { key: 'seedance', considerFor: 'Frequent narrated history, mystery and unusual-fact Shorts', limitation: 'Narrated — no character speaking on camera' },
    { key: 'kling', considerFor: 'Sports, action, travel and camera-led scenes', limitation: 'Silent generated scenes with Kineo narration' },
    { key: 'veo', considerFor: 'Narrated stories where you want Google’s Veo 3.1 Fast on every scene', limitation: 'Veo’s own audio is off in Kineo; no on-camera dialogue' },
    { key: 'hollywood', considerFor: 'Short stories where a character speaks on camera', limitation: 'On-camera lines in English only' },
    { key: 's25', considerFor: 'Spectacle: weather, machines, crowds, set pieces', limitation: 'Paid plans only; slower to render' },
  ]
  return spec.filter((x) => engineListed(x.key)).map((x) => {
    const credits60 = c(x.key, 60)
    return { name: ENGINE_REFS[x.key].name, path: ENGINE_REFS[x.key].path, considerFor: x.considerFor, credits60, usdCents60: creditsToCents(credits60), limitation: x.limitation }
  })
}

/** Os "When NOT to use this" e as perguntas novas da comparação (FAQ visível = JSON-LD: a página monta os dois do mesmo array). */
export function compareExtras1610(): { whenNot: string[]; faq: { q: string; a: string }[] } {
  const k3 = engineListed('hollywood')
  return {
    whenNot: [
      'Do not use an engine comparison to choose a tool for exact product demonstrations, factual evidence or identity-critical footage: if a shot must prove what a real object did, film the object.',
      ...(k3 ? ['Do not pay for Kling 3 because its version number is higher — its extra cost buys on-camera dialogue (English), which a narrated story does not use.'] : []),
      'Do not pick Veo in Kineo for native audio: the narrated workflow switches the model’s audio off.',
    ],
    faq: [
      {
        q: 'Can every engine make characters talk on Kineo?',
        a: k3
          ? 'No. Kling 3 is the engine Kineo builds around a character speaking on camera (English lines only). Seedance 1.5, Kling 2.5 and Veo 3.1 films are narrated: Kineo’s narrator speaks over the scenes. Supplier demos of native dialogue do not describe Kineo’s finished-film workflow.'
          : 'Seedance 1.5, Kling 2.5 and Veo 3.1 films are narrated: Kineo’s narrator speaks over the scenes. Supplier demos of native dialogue do not describe Kineo’s finished-film workflow.',
      },
      {
        q: 'Are the dollar amounts the price of one video?',
        a: `No. They are what the credits are worth at the ${REFERENCE_PLAN_LINE()}. You pay for a plan; each film uses credits from the same monthly balance as your clips and other creations.`,
      },
      {
        q: 'How do I compare engines fairly?',
        a: 'Keep the script, length and brief the same, then compare whether each film tells the story clearly: visible errors, usable scenes, how well the visuals match the narration. Count the credits spent, including retries. One test guides your next purchase; it is not a universal ranking.',
      },
    ],
  }
}
