// KINEO-VISIBILIDADE-CHATGPT-2026-10-06 — dados das 4 páginas feitas para o ChatGPT CITAR (rodada 1 da tarefa semanal
// "Kineo — visibilidade no ChatGPT", CSV em kineo/visibilidade-chatgpt/kineo-visibilidade-chatgpt-2026-10-06.csv).
//
// O QUE A RODADA 1 MOSTROU (06/10, ChatGPT com busca ligada, memória desligada): a Kineo apareceu em 0 das 17 perguntas
// genéricas. A pergunta 13 ("Which AI video generator lets me use Seedance, Kling and Veo in one place?") é a proposta
// exata da Kineo e quem ganhou foi a Kenerate AI. Nas perguntas 3/4/5 (Seedance 2.5 e Kling 3 mais baratos) e 11
// (alternativas ao InVideo) as fontes foram páginas de comparação com preço por vídeo em tabela e data. Nenhuma página da
// Kineo foi usada como fonte, nem quando a resposta recomendou a Kineo (pergunta 15).
//
// O QUE ESTE MÓDULO DÁ: as linhas de preço por motor (as MESMAS de ENGINE_GEO, que deriva de clipCreditCost /
// creditCostForDuration / TIER_PRICES — nenhum preço da Kineo digitado aqui), o veredito honesto "quem é mais barato por
// clipe cru" contra a rota direta com fonte oficial datada, e os fatos de terceiros (InVideo, Kenerate, kineo.studio)
// SEMPRE com URL e data da leitura. Quando a rota direta é mais barata (Veo na Gemini API), a página diz.
import { ENGINE_GEO, ENGINES, INDEXABLE_ENGINE_SLUGS } from '@/lib/growth/enginePageCatalog'
import { engineLandingPublicPath, type EngineLandingParam } from '@/lib/growth/engineLandingIntent'
import { dayMonthYear, monthYear, usd, type CitationPlan, type DirectRoute, type EngineCitation } from '@/lib/seo/engineCitation'
import { ENGINE_MARKET, marketQuotesFor, quotePlanListsModel, quoteUsdPerSecond } from '@/lib/clips/clipPriceVsMarket'

export const HUB_MARK = 'KINEO-VISIBILIDADE-CHATGPT-2026-10-06'
/** Data real da revisão das 4 páginas (sitemap lastmod e o "Prices as of" visível). */
export const HUB_REVIEWED_ISO = '2026-10-06'
export const HUB_REVIEWED_DAY = dayMonthYear(HUB_REVIEWED_ISO) // '6 October 2026'
export const HUB_REVIEWED_MONTH = monthYear(HUB_REVIEWED_ISO) // 'October 2026'
export const BASE = 'https://www.usekineo.com'

/** As páginas desta mudança (sitemap, llms.txt, rodapé e links cruzados leem daqui). */
export const HUB_PAGES = {
  oneplace: { path: '/seedance-kling-veo-in-one-place', label: 'Seedance, Kling and Veo in one place' },
  cheapest: { path: '/cheapest-way-to-use-seedance-and-kling-3', label: 'Cheapest way to use Seedance and Kling 3' },
  faceless: { path: '/faceless-youtube-shorts-generator', label: 'AI faceless YouTube Shorts generator' },
  brand: { path: '/kineo-vs-kineo-studio', label: 'Kineo vs kineo.studio (not the same company)' },
} as const

/** Quem faz cada modelo (selo honesto: o nome do fornecedor real). Chave = ClipEngineKey de ENGINE_GEO. */
const MAKER: Record<string, string> = {
  seedance: 'ByteDance',
  s25: 'ByteDance',
  kling: 'Kuaishou',
  hollywood: 'Kuaishou',
  veo: 'Google',
  omni: 'Google',
  h3: 'MiniMax',
}

export interface HubEngine {
  slug: string
  path: string
  param: EngineLandingParam
  name: string
  maker: string
  geo: EngineCitation
}

/** Os motores com página indexável hoje (pausado/oculto fica de fora sozinho), do filme de 60 s mais barato ao mais caro. */
export function hubEngines(): HubEngine[] {
  const out: HubEngine[] = []
  for (const slug of INDEXABLE_ENGINE_SLUGS) {
    const geo = ENGINE_GEO[slug]
    const e = ENGINES[slug]
    if (!geo || !e) continue
    const param = e.param as EngineLandingParam
    out.push({ slug, path: engineLandingPublicPath(param) || `/ai-video-generator/${slug}`, param, name: geo.name, maker: MAKER[geo.key] ?? '', geo })
  }
  return out.sort((a, b) => a.geo.rows.film60.credits - b.geo.rows.film60.credits || a.name.localeCompare(b.name))
}

export function hubEngine(slug: string): HubEngine | null {
  return hubEngines().find((h) => h.slug === slug) ?? null
}

/** Os planos mensais como o checkout cobra (iguais em todo motor: vêm de TIER_PRICES/TIER_CREDITS). */
export function hubPlans(): CitationPlan[] {
  const first = hubEngines()[0]
  return first ? first.geo.plans : []
}

/** Preço em US$ de N créditos no preço do crédito de UM plano (arredondado ao centavo). */
export function creditsOnPlan(credits: number, plan: CitationPlan): string {
  return usd(Math.round((credits * plan.usdCents) / plan.credits))
}

export type ClipVerdict = 'kineo_lower' | 'about_same' | 'direct_lower'
/** Diferença até 5% = "about the same" (centavos de arredondamento não viram vantagem anunciada). */
export function clipVerdict(kineoCents: number, directCents: number): ClipVerdict {
  const diff = (kineoCents - directCents) / directCents
  if (Math.abs(diff) <= 0.05) return 'about_same'
  return diff < 0 ? 'kineo_lower' : 'direct_lower'
}
export function verdictLabel(v: ClipVerdict): string {
  return v === 'kineo_lower' ? 'Kineo is lower per clip' : v === 'direct_lower' ? 'Direct is lower per clip' : 'About the same per clip'
}

/** A rota direta com preço conferido mais barata para o motor (null = nenhuma fonte oficial dá número). */
export function cheapestDirect(geo: EngineCitation): (DirectRoute & { clipUsdCents: number }) | null {
  const priced = geo.direct.filter((r): r is DirectRoute & { clipUsdCents: number } => r.clipUsdCents !== null)
  return priced.sort((a, b) => a.clipUsdCents - b.clipUsdCents)[0] ?? null
}

/** US$ de 60 s de clipe cru na rota direta (proporcional ao clipe cotado). */
export function directRaw60Cents(r: { clipUsdCents: number; seconds: number }): number {
  return Math.round((r.clipUsdCents / r.seconds) * 60)
}

// ─── Fatos de terceiros, lidos em página oficial (URL + data). Mudam: a página mostra a data. ──────────────────────

/** invideo.io/pricing lido em 06/10/2026. Só o que a página mostra; o crédito por vídeo NÃO é publicado lá. */
export const INVIDEO_FACTS = {
  url: 'https://invideo.io/pricing/',
  checkedOn: HUB_REVIEWED_ISO,
  starter: { plan: 'Starter', perSeatMonthBilledYearly: '$20', credits: 400, models: 'Seedance 2.0 Fast and Mini only — no Seedance 2.5' },
  plus: { plan: 'Plus', perSeatMonthBilledYearly: '$36', credits: 2000, models: 'all models, including Seedance 2.5' },
  max: { plan: 'Max', perSeatMonthBilledYearly: '$75', credits: 5000, models: 'all models' },
  perVideoNote: 'InVideo prices in credits per seat; its pricing page does not publish how many credits one finished video uses, so we do not estimate a price per video for it.',
} as const

/** kenerateai.com lido em 06/10/2026 (a resposta que ganhou a pergunta 13 da rodada 1). */
export const KENERATE_FACTS = {
  url: 'https://kenerateai.com/',
  checkedOn: HUB_REVIEWED_ISO,
  summary: 'an all-in-one AI image and video studio with 200+ models (including Seedance 2.5, Kling 3.0, Veo 3.1, Sora 2 and Hailuo), 25 free credits and one-time credit packs from $15',
} as const

/** kineo.studio lido em 06/10/2026 — empresa homônima, sem relação com a Kineo (usekineo.com). Descrição neutra. */
export const KINEO_STUDIO_FACTS = {
  url: 'https://kineo.studio/',
  productHuntUrl: 'https://www.producthunt.com/products/kineo',
  checkedOn: HUB_REVIEWED_ISO,
  makes: 'turns an article, a link or a topic into a vertical video of up to 3 minutes, with a digital avatar of the user, voiceover and subtitles',
  pricing: 'a free tier, a Pro plan at $9.90/month and a one-time lifetime plan; video compute is billed separately through your own WaveSpeed API key (bring your own key)',
} as const

/** Onde a Kineo (usekineo.com) tem perfil próprio — para conferir que é a mesma empresa. Só perfis confirmados. */
export const KINEO_OWN_PROFILES = [
  { label: 'There’s An AI For That', url: 'https://theresanaiforthat.com/ai/kineo/' },
  { label: 'TikTok @usekineo', url: 'https://www.tiktok.com/@usekineo' },
] as const

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
}

export function breadcrumbJsonLd(name: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Kineo', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name, item: `${BASE}${path}` },
    ],
  }
}

/** JSON-LD seguro dentro de <script> (mesma régua das páginas de motor). */
export function ldJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

/** ['a','b','c'] → 'a, b and c'. */
export function listJoin(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

// ─── Mercado: TODA cotação oficial do mesmo modelo e da mesma resolução do nosso clipe (lib/clips/clipPriceVsMarket.ts) ──
// As páginas de motor comparam só com a rota direta de FONTES/Runway. Aqui, que a pergunta é "qual é o mais barato", entra
// toda cotação oficial da régua — inclusive quando o concorrente é mais barato que a Kineo (Higgsfield no Kling 3 e no
// Seedance 2.5, em 06/10). Cotação secundária, plano que não lista o modelo e resolução diferente ficam de fora.
export interface MarketRow {
  who: string
  plan: string
  monthlyCents: number
  resolution: string
  audio: 'off' | 'unknown' | 'included'
  clipCents: number
  seconds: number
  url: string
  planUrl: string
  checkedOn: string
}
export function marketRowsFor(geo: EngineCitation): MarketRow[] {
  const clip = geo.rows.clip
  if (!clip) return []
  const match = ENGINE_MARKET[geo.key]
  return marketQuotesFor(geo.key, Infinity)
    .filter((q) => q.source === 'oficial' && q.plan.source === 'oficial' && quotePlanListsModel(q) !== false)
    .map((q) => ({
      who: q.plan.competitor,
      plan: q.plan.plan,
      monthlyCents: q.plan.usdCentsMonthly,
      resolution: match.resolution,
      audio: q.audio,
      clipCents: Math.round(quoteUsdPerSecond(q) * clip.seconds * 100),
      seconds: clip.seconds,
      url: q.url,
      planUrl: q.plan.url,
      checkedOn: q.checkedOn,
    }))
    .sort((a, b) => a.clipCents - b.clipCents)
}
/** A resolução do clipe da Kineo para o motor (a mesma régua das cotações acima). */
export function kineoClipResolution(geo: EngineCitation): string {
  return ENGINE_MARKET[geo.key].resolution
}
