// KINEO-TRENDING-2026-10-13 — a página "🔥 Trending now" (/trending), pedida pelo fundador na noite de 13/10.
//
// O QUE ELA É: uma vitrine pública (visitante e logado) feita SÓ de mídia que já existe no repositório — nenhum render
// novo. Quatro blocos, cada um lido da sua fonte de verdade, sem cópia:
//   1. Estilos de anúncio  → lib/ads/v2Styles.ts (ADS_V2_STYLES: prévia feita pelo próprio efeito, motor = ADS_V2_STYLE_ENDPOINT)
//   2. Efeitos de clipe    → lib/clips/clipEffectPages.ts publicEffectPages() (os efeitos com prévia, fora de pausa) +
//                            clipEffectEngineLabel (o modelo real: Kling 2.5, Kling 1.6, PixVerse 5.5, Seedance 1.5)
//   3. Temas de filme      → lib/viralTopics.ts (a mesma fonte do Viral Now: /api/viral-now e o cron refresh-viral-now só
//                            chamam getViralNowTopics, 8 temas a cada bloco de 4 h UTC). Filme da casa SÓ quando o assunto é
//                            o mesmo (TOPIC_HOUSE_FILMS, com a palavra que prova); senão o cartão diz "Script ready".
//   4. Motores em ação     → o melhor filme da casa por motor, das listas curadas (ENGINE_PAGE_LEAD + FOUNDER_SHOWCASE de
//                            lib/publicExamples.ts, na ordem do fundador), só motores na oferta (engineOffered/enginePaused).
//
// HONESTIDADE (regra da casa: selo honesto é ativo de marca):
//   · todo selo de motor sai do CAMPO do dado (engineLabelFor(engine), clipEffectEngineLabel, ADS_V2_STYLE_ENDPOINT) —
//     nenhum nome de motor digitado solto aqui;
//   · NENHUMA métrica: sem views, likes, notas, "x pessoas usando". O viralScore e o badge ('Hot'/'Trending') do catálogo
//     do Viral Now NÃO são lidos — são números de catálogo, não medição;
//   · "Trending" aqui = "adicionado nos últimos 7 dias" (selo New, pela data do lote) ou "escolhido pela pesquisa de hoje".
//
// TODO (gancho da pesquisa diária, a partir de 14/10): a rotina de pesquisa grava public/trending/today.json com o formato
//   { "date": "AAAA-MM-DD", "ad_styles": ["beach_ad", …], "clip_effects": ["wings", …], "topics": ["mys-02", …] }
// e faz a publicação de sempre. A página lê o arquivo a cada visita (parseTrendingToday): chave desconhecida é ignorada,
// no máximo 6 por lista, e o arquivo vale por 36 h a partir da data — vencido ou ausente, a página cai nos dados de
// sempre (lançamentos mais novos primeiro e os temas do Viral Now do bloco atual). A pesquisa só ESCOLHE e ORDENA o que já
// existe: não cria cartão, não traz número.
import { ADS_V2_STYLES, ADS_V2_STYLE_ENDPOINT, type AdsV2StyleKey } from '@/lib/ads/v2Styles'
import { clipEffectEngineLabel, type ClipEffectKey } from '@/lib/clips/clipEffects'
import { publicEffectPages } from '@/lib/clips/clipEffectPages'
import { getViralNowTopics, getViralTopicById, type ViralTopic } from '@/lib/viralTopics'
import { ENGINE_PAGE_LEAD, FOUNDER_SHOWCASE, type FounderShowcaseExample } from '@/lib/publicExamples'
import { engineLabelFor } from '@/lib/engineLabel'
import { STUDIO_ENGINE_FOR_QUALITY } from '@/lib/navigation/reviewVideoRetry'
import { enginePaused, engineOffered } from '@/lib/engineLaunch'

export const TRENDING_PATH = '/trending'
export const TRENDING_MARKER = 'KINEO-TRENDING-2026-10-13'
/** Arquivo opcional da pesquisa diária (relativo à raiz do projeto). */
export const TRENDING_TODAY_FILE = 'public/trending/today.json'
/** Janela do selo "New". */
export const TRENDING_NEW_DAYS = 7
/** Validade do today.json a partir da data dele. */
export const TRENDING_TODAY_MAX_AGE_HOURS = 36
export const TRENDING_TODAY_MAX_PER_LIST = 6
/** Studio: o filme do tema abre no Seedance 1.5 (o motor da entrada), 60 s (régua da casa), roteiro estruturado pela IA. */
export const TRENDING_TOPIC_ENGINE = 'seedance'
export const TRENDING_TOPIC_DURATION = '60'

/**
 * Data de lançamento de cada lote (é a data do marcador do commit que trouxe o lote — o catálogo não guarda data):
 *   estilos de anúncio — KINEO-ESTILOS-PRODUTO-2026-10-09 (os 5 primeiros, tipo AdsV2BaseStyleKey em v2Styles.ts) e
 *   KINEO-ADS-UX-MARCA-2026-10-10 (os 10 seguintes) e KINEO-ESTILOS-DIA1-2026-10-13 (os 4 do lote do dia 1, tipo
 *   AdsV2Dia1StyleKey); efeitos de clipe — KINEO-CLIPS-PRIMEIRO-2026-10-05 (a galeria) e
 *   KINEO-EFEITOS-NOVOS-2026-10-13 (wings, dollar_rain, muscle_surge). O guardião confere cada chave contra o marcador
 *   no arquivo-fonte; estilo/efeito novo sem data aqui = sem selo New (nunca inventado).
 */
export const ADS_STYLE_RELEASED: Readonly<Partial<Record<AdsV2StyleKey, string>>> = {
  package_explosion: '2026-10-09', giant_product: '2026-10-09', product_closeup: '2026-10-09', ocean_ad: '2026-10-09', mechanical_assembly: '2026-10-09',
  naked_eye_3d_ad: '2026-10-10', beach_ad: '2026-10-10', lighting_ad: '2026-10-10', supermarket_ad: '2026-10-10', poster_ad: '2026-10-10',
  graffiti_ad: '2026-10-10', dreamlike_cloud: '2026-10-10', parachute_delivery: '2026-10-10', shoal_surround: '2026-10-10', dishes_served: '2026-10-10',
  dolly_zoom: '2026-10-13', boom_drop: '2026-10-13', macaron_machine: '2026-10-13', starlight_gift: '2026-10-13', // KINEO-ESTILOS-DIA1-2026-10-13
}
export const CLIP_EFFECT_RELEASED: Readonly<Partial<Record<ClipEffectKey, string>>> = {
  bring_to_life: '2026-10-05', product_360: '2026-10-05', zoom_out_earth: '2026-10-05', cinematic_slowmo: '2026-10-05', restore_old_photo: '2026-10-05',
  color_burst: '2026-10-05', storm_behind: '2026-10-05', melt: '2026-10-05', secret_cake: '2026-10-05',
  wings: '2026-10-13', dollar_rain: '2026-10-13', muscle_surge: '2026-10-13',
}

/**
 * Filme da casa para um tema do Viral Now — SÓ quando o filme é sobre o mesmo assunto. `subject` é a palavra que prova:
 * aparece no tema (título ou roteiro) E no título do filme (o guardião confere). Tema sem par aqui = cartão "Script ready".
 */
export const TOPIC_HOUSE_FILMS: readonly { topic: string; film: string; subject: string }[] = [
  { topic: 'mys-02', film: 'f3de57b0-3486-4400-ba72-c9390774d426', subject: 'Dyatlov' },
]
// Fora de propósito: sci-02 (oceano) ↔ "Life in the Mariana Trench" é do Omni Flash, motor fora da oferta desde 12/10 e com
// selo genérico na home desde 13/10 (KINEO-SELO-OMNI-2026-10-13) — o tema fica "Script ready" em vez de vender o Omni.

/** Frases da página (inglês = chave do dicionário lib/ui/refinementCopy.json; as 16 línguas lá). */
export const TRENDING_COPY = [
  '🔥 Trending', 'Trending now', 'Real videos made on Kineo. Pick one and make your own.',
  'No view counts, no fake numbers. Trending here means the newest styles and effects, and today’s picks.',
  'Ad styles', 'Turn one product photo into an ad in this style.',
  'Clip effects', 'One photo, one tap, a 5-second clip.',
  'Film topics', 'Ideas with a script ready. Open one in the Studio and make the film.',
  'Engines in action', 'The best house film from each engine.',
  'Make mine', 'New', 'Today’s pick', 'Script ready', 'Made on Kineo', 'House film on this subject', 'Picked from today’s research',
] as const

export type TrendingBadge = 'new' | 'pick' | null
export interface TrendingCardData {
  key: string
  title: string
  /** Uma linha (o que o estilo/efeito faz, ou o gancho do tema). */
  sub: string
  /** Nome REAL do motor, lido do campo do dado. null só no tema sem filme (não há vídeo para selar). */
  engine: string | null
  video: string | null
  poster: string | null
  href: string
  badge: TrendingBadge
  /** Tema sem filme da casa: o cartão mostra "Script ready" no lugar do vídeo. */
  scriptReady?: boolean
  /** Tema COM filme: a legenda honesta "House film on this subject". */
  houseFilm?: boolean
}
export interface TrendingBlock { id: 'ad-styles' | 'clip-effects' | 'film-topics' | 'engines'; title: string; sub: string; cards: TrendingCardData[] }
export interface TrendingToday { date: string; adStyles: string[]; clipEffects: string[]; topics: string[] }

// ─── datas e "New" ──────────────────────────────────────────────────────────
const DAY_MS = 86_400_000
/** Lançado nos últimos TRENDING_NEW_DAYS dias (data ausente ou inválida = false: sem data, sem selo). */
export function isNewRelease(released: string | undefined, now: Date): boolean {
  if (!released || !/^\d{4}-\d{2}-\d{2}$/.test(released)) return false
  const t = Date.parse(released + 'T00:00:00Z')
  const age = now.getTime() - t
  return Number.isFinite(t) && age >= 0 && age < TRENDING_NEW_DAYS * DAY_MS
}

// ─── o gancho da pesquisa diária (public/trending/today.json) ──────────────
/** Lê o JSON da pesquisa. Inválido, sem data ou vencido = null (a página usa os dados de sempre). Nunca lança. */
export function parseTrendingToday(raw: string | null | undefined, now: Date): TrendingToday | null {
  if (!raw) return null
  let data: unknown
  try { data = JSON.parse(raw) } catch { return null }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const o = data as Record<string, unknown>
  const date = typeof o.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : null
  if (!date) return null
  const age = now.getTime() - Date.parse(date + 'T00:00:00Z')
  if (!Number.isFinite(age) || age < -DAY_MS || age > TRENDING_TODAY_MAX_AGE_HOURS * 3_600_000) return null
  const list = (v: unknown): string[] => Array.isArray(v)
    ? Array.from(new Set(v.filter((x): x is string => typeof x === 'string' && /^[a-z0-9_-]{1,40}$/.test(x)))).slice(0, TRENDING_TODAY_MAX_PER_LIST)
    : []
  return { date, adStyles: list(o.ad_styles), clipEffects: list(o.clip_effects), topics: list(o.topics) }
}

/** Escolhidos pela pesquisa primeiro (na ordem dela, só os que existem), depois o resto na ordem dada. */
function pickedFirst<T>(items: readonly T[], keyOf: (t: T) => string, picks: readonly string[]): { item: T; picked: boolean }[] {
  const byKey = new Map(items.map((t) => [keyOf(t), t] as const))
  const first = picks.filter((k) => byKey.has(k)).map((k) => ({ item: byKey.get(k)!, picked: true }))
  const taken = new Set(first.map((x) => keyOf(x.item)))
  return [...first, ...items.filter((t) => !taken.has(keyOf(t))).map((item) => ({ item, picked: false }))]
}
/** Mais novo primeiro; empate = a ordem do catálogo (curadoria). */
function newestFirst<T>(items: readonly T[], released: (t: T) => string | undefined): T[] {
  return items.map((t, i) => ({ t, i, d: released(t) ?? '' })).sort((a, b) => (a.d === b.d ? a.i - b.i : a.d < b.d ? 1 : -1)).map((x) => x.t)
}

// ─── selos de motor (sempre do dado) ────────────────────────────────────────
/** "fal-ai/pixverse/v5/effects" → "PixVerse 5". O selo dos estilos de anúncio sai do endpoint REAL dos estilos. */
export function engineLabelFromEndpoint(endpoint: string): string | null {
  const parts = endpoint.split('/')
  if (parts[0] !== 'fal-ai' || parts.length < 3) return null
  const BRANDS: Record<string, string> = { pixverse: 'PixVerse', 'kling-video': 'Kling' }
  const brand = BRANDS[parts[1]]
  const version = /^v(\d+(?:\.\d+)?)$/.exec(parts[2])?.[1]
  return brand && version ? `${brand} ${version}` : null
}
export const ADS_STYLE_ENGINE_LABEL = engineLabelFromEndpoint(ADS_V2_STYLE_ENDPOINT)

// ─── destinos do "Make mine" ────────────────────────────────────────────────
const viaSignup = (target: string, signedIn: boolean) => (signedIn ? target : '/signup?' + new URLSearchParams({ redirect: target }).toString())
/** Estilo de anúncio → montador do anúncio v2 com o estilo já marcado (AdsV2Simple lê ?style=, só chaves do catálogo). */
export function trendingAdStyleHref(key: AdsV2StyleKey, signedIn: boolean): string {
  return viaSignup('/ads/v2?' + new URLSearchParams({ style: key, utm_source: 'trending' }).toString(), signedIn)
}
/** Efeito → /clips com o efeito escolhido (mesmo formato do effectDestination das páginas de efeito, origem própria). */
export function trendingClipEffectHref(key: ClipEffectKey, signedIn: boolean): string {
  return viaSignup('/clips?' + new URLSearchParams({ effect: key, utm_source: 'trending' }).toString(), signedIn)
}
/** O roteiro do tema sem as etiquetas de busca de stock ([Pexels: …]) nem a linha de formato — o Studio estrutura o resto. */
export function topicScriptForStudio(prompt: string): string {
  return prompt
    .split('\n')
    .filter((line, i) => !(i === 0 && /^YouTube Short format/i.test(line.trim())))
    .map((line) => line.replace(/\[Pexels:[^\]]*\]\s*/g, '').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
/** Tema → Studio com a ideia pronta (os parâmetros que o StudioClient já lê: prompt, engine, duration, script_mode, intent_campaign). */
export function trendingTopicHref(topic: Pick<ViralTopic, 'id' | 'prompt'>): string {
  return '/studio?' + new URLSearchParams({
    prompt: topicScriptForStudio(topic.prompt),
    engine: TRENDING_TOPIC_ENGINE,
    duration: TRENDING_TOPIC_DURATION,
    script_mode: 'ai',
    intent_campaign: `trending_topic_${topic.id}`,
  }).toString()
}
/** Motor → Studio já nele. */
export function trendingEngineHref(engine: string): string | null {
  const key = STUDIO_ENGINE_FOR_QUALITY[engine]
  return key ? '/studio?' + new URLSearchParams({ engine: key, intent_campaign: 'trending_engine' }).toString() : null
}

// ─── os 4 blocos ────────────────────────────────────────────────────────────
export function adStyleCards(now: Date, signedIn: boolean, picks: readonly string[] = []): TrendingCardData[] {
  return pickedFirst(newestFirst(ADS_V2_STYLES, (s) => ADS_STYLE_RELEASED[s.key]), (s) => s.key, picks).map(({ item: s, picked }) => ({
    key: s.key,
    title: s.label,
    sub: s.oneLine,
    engine: ADS_STYLE_ENGINE_LABEL,
    video: s.preview,
    poster: s.poster,
    href: trendingAdStyleHref(s.key, signedIn),
    badge: picked ? 'pick' : isNewRelease(ADS_STYLE_RELEASED[s.key], now) ? 'new' : null,
  }))
}

export function clipEffectCards(now: Date, signedIn: boolean, picks: readonly string[] = []): TrendingCardData[] {
  const effects = publicEffectPages().filter((e) => e.preview?.video && e.preview.poster)
  return pickedFirst(newestFirst(effects, (e) => CLIP_EFFECT_RELEASED[e.key]), (e) => e.key, picks).map(({ item: e, picked }) => ({
    key: e.key,
    title: e.title,
    sub: e.sub,
    engine: clipEffectEngineLabel(e),
    video: e.preview!.video,
    poster: e.preview!.poster!,
    href: trendingClipEffectHref(e.key, signedIn),
    badge: picked ? 'pick' : isNewRelease(CLIP_EFFECT_RELEASED[e.key], now) ? 'new' : null,
  }))
}

const SHOWCASE: readonly FounderShowcaseExample[] = [...ENGINE_PAGE_LEAD, ...FOUNDER_SHOWCASE]
export function houseFilm(id: string): FounderShowcaseExample | null {
  return SHOWCASE.find((f) => f.id === id) ?? null
}

/** Os temas: os escolhidos pela pesquisa primeiro, depois os do bloco atual do Viral Now (sem repetir), até 8. */
export function trendingTopics(picks: readonly string[] = []): ViralTopic[] {
  const out: ViralTopic[] = []
  for (const id of picks) { const t = getViralTopicById(id); if (t && !out.some((x) => x.id === t.id)) out.push(t) }
  for (const t of getViralNowTopics()) { if (out.length >= 8) break; if (!out.some((x) => x.id === t.id)) out.push(t) }
  return out.slice(0, 8)
}

export function filmTopicCards(picks: readonly string[] = []): TrendingCardData[] {
  const picked = new Set(picks)
  return trendingTopics(picks).map((t) => {
    const pair = TOPIC_HOUSE_FILMS.find((p) => p.topic === t.id)
    const film = pair ? houseFilm(pair.film) : null
    return {
      key: t.id,
      title: t.title,
      sub: t.hook,
      engine: film ? engineLabelFor(film.engine) : null,
      video: film ? film.previewPath : null,
      poster: film ? film.posterPath : null,
      href: trendingTopicHref(t),
      badge: picked.has(t.id) ? 'pick' : null,
      ...(film ? { houseFilm: true } : { scriptReady: true }),
    }
  })
}

/** O 1º filme de cada motor na ordem curada (o filme-líder do Seedance, depois os 30 do fundador); só motor na oferta. */
export function engineCards(): TrendingCardData[] {
  const seen = new Set<string>()
  const out: TrendingCardData[] = []
  for (const f of SHOWCASE) {
    if (seen.has(f.engine)) continue
    seen.add(f.engine)
    const studioKey = STUDIO_ENGINE_FOR_QUALITY[f.engine]
    const label = engineLabelFor(f.engine)
    const href = trendingEngineHref(f.engine)
    if (!studioKey || !label || !href || !engineOffered(studioKey) || enginePaused(studioKey)) continue
    out.push({ key: f.engine, title: label, sub: f.title, engine: label, video: f.previewPath, poster: f.posterPath, href, badge: null })
  }
  return out
}

export function trendingBlocks(args: { now: Date; signedIn: boolean; today: TrendingToday | null }): TrendingBlock[] {
  const { now, signedIn, today } = args
  return [
    { id: 'ad-styles', title: 'Ad styles', sub: 'Turn one product photo into an ad in this style.', cards: adStyleCards(now, signedIn, today?.adStyles) },
    { id: 'clip-effects', title: 'Clip effects', sub: 'One photo, one tap, a 5-second clip.', cards: clipEffectCards(now, signedIn, today?.clipEffects) },
    { id: 'film-topics', title: 'Film topics', sub: 'Ideas with a script ready. Open one in the Studio and make the film.', cards: filmTopicCards(today?.topics) },
    { id: 'engines', title: 'Engines in action', sub: 'The best house film from each engine.', cards: engineCards() },
  ]
}
