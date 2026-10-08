// KINEO-GEO-RODADA3-2026-10-08 — rodada 3 de GEO (sessão CEO 08/10: o ChatGPT trouxe 46% dos cadastros e 100% dos pagantes em
// 28 dias). As constantes PURAS da rodada: datas, as páginas que ela tocou, os preços públicos de concorrentes lidos hoje (URL +
// data), o botão "Make one like this" dos filmes da casa e o href do Studio com roteiro. Os blocos de cada página (resposta,
// tabelas, FAQ) moram em lib/seo/geoRodada3Answers.ts, que importa o catálogo; ESTE módulo não importa nada em tempo de
// execução (só `import type`): o sitemap, o /llms.txt e o ping do IndexNow o carregam — e há guardiões que executam essas
// superfícies com o catálogo e a vitrine simulados. Nada é calculado no carregamento.
//
// O que a rodada 3 NÃO faz, de propósito: não anuncia preço da Kineo digitado (vem de ENGINE_GEO/TIER_PRICES nas páginas), não
// estima "preço por vídeo" de concorrente que não publica crédito por vídeo, não diz que testou ferramenta de terceiro (o que a
// casa mede são os PRÓPRIOS renders — o Kineo AI Video Index) e nunca usa vídeo de cliente (só a vitrine do fundador).
import type { HouseFilm } from './houseFilmIdeas'

export const GEO_RODADA3_MARK = 'KINEO-GEO-RODADA3-2026-10-08'
/** Data da revisão desta rodada (o "checked on" dos preços de terceiros e o lastmod das páginas tocadas). */
export const GEO_RODADA3_REVIEWED_ISO = '2026-10-08'
/**
 * O lastmod das páginas desta rodada no sitemap. É o MESMO dia da rodada 2, mas não o mesmo carimbo: a rodada 2 carimba
 * T12:00Z nas páginas dela (e o guardião dela exige que só elas tenham esse carimbo); as páginas que SÓ a rodada 3 tocou levam
 * este, posterior. As páginas da rodada 2 que a rodada 3 também tocou (Seedance 1.5 e os 7 nichos) seguem com o carimbo dela —
 * mesmo dia — e entram no ping do IndexNow desta rodada pelo escopo, não pelo carimbo.
 */
export const GEO_RODADA3_LAST_MODIFIED_ISO = `${GEO_RODADA3_REVIEWED_ISO}T18:00:00.000Z`
/** O dia em que os preços públicos dos concorrentes abaixo foram lidos nas páginas oficiais. */
export const COMPETITOR_PRICES_CHECKED_ON = GEO_RODADA3_REVIEWED_ISO

/** As quatro perguntas da rodada (inglês) e a página que responde cada uma — todas EXISTIAM e foram estendidas. */
export const GEO_RODADA3_ANSWER_PAGES = {
  models: { path: '/seedance-vs-veo-vs-kling', question: 'Seedance 2.5 vs Veo 3.1 vs Kling 3 — which AI video model for Shorts' },
  invideo: { path: '/alternatives/invideo', question: 'Kineo vs InVideo AI' },
  capcut: { path: '/alternatives/capcut', question: 'Kineo vs CapCut AI video' },
  best: { path: '/best-ai-shorts-generators', question: 'Best AI video generator for YouTube Shorts in 2026 (tested)' },
} as const

/** A ferramenta grátis desta rodada: o timer de roteiro que já existia, estendido por família de motor (35/60/90 s). */
export const SCRIPT_TIMER_PATH = '/youtube-shorts-script-timer'

// ─── o que a rodada 3 MUDOU (sitemap: lastmod; ping do IndexNow: escopo exato) ─────────────────────────────────────────
/**
 * Páginas fora do cluster de motor que SÓ a rodada 3 mudou: as 4 respostas (as de alternativa vêm em
 * GEO_RODADA3_ALTERNATIVE_SLUGS), o hub /alternatives (tempo medido), o timer, a resposta "InVideo alternatives by workflow" e as
 * duas páginas citáveis da rodada 1 que leem o tempo do motor e os planos da InVideo (relidos hoje). E o /facts: o texto do
 * teste grátis deixou de prometer que o trial libera todo motor (promessa morta em 05/10) — mesma correção do /llms.txt.
 */
export const GEO_RODADA3_STATIC_PATHS: readonly string[] = [
  GEO_RODADA3_ANSWER_PAGES.models.path,
  GEO_RODADA3_ANSWER_PAGES.best.path,
  SCRIPT_TIMER_PATH,
  '/alternatives',
  '/vs/invideo-alternatives-faceless-shorts',
  '/seedance-kling-veo-in-one-place',
  '/faceless-youtube-shorts-generator',
  '/facts',
]
/**
 * As páginas /alternatives/<slug> que mudaram: a copy de tempo (mediana medida no lugar da faixa velha e da mediana do Kineo 1)
 * e, em invideo e capcut, a resposta da rodada 3. Ficaram iguais: heygen, quso, synthesia, synthesys e d-id (não citavam
 * tempo). O guardião confere esta lista contra os blocos de app/alternatives/[competitor]/page.tsx que usam PRODUCT_TIME.
 */
export const GEO_RODADA3_ALTERNATIVE_SLUGS: readonly string[] = [
  'opusclip', 'invideo', 'submagic', 'pika', 'fliki', 'revid', 'crayo', 'autoshorts', 'klap', 'capcut', 'pictory', 'veed',
  'vizard', 'descript', 'canva', 'kapwing', 'runwayml', 'sendshort', 'storyshort', 'shortspilot', 'luma', 'bigmotion',
  'faceless-so', 'faceless-video',
]
/**
 * O cluster de motor: TODA página de motor indexável (tempo de entrega medido) e as traduzidas (FAQ do tempo). A do Seedance 1.5
 * e as 7 de nicho com filme da casa foram mudadas pela rodada 2 no mesmo dia e seguem com o carimbo dela (o guardião da rodada 2
 * exige); entram no ping desta rodada pelo escopo.
 */
export const GEO_RODADA2_PAGES_ALSO_IN_RODADA3: readonly string[] = ['/ai-video-generator/seedance']

// ─── preços públicos de concorrentes, lidos em 08/10/2026 nas páginas oficiais (URL + data; nada estimado) ─────────────
/**
 * CapCut: a página oficial capcut.com/resource/capcut-standard-vs-pro (artigo de 23/09/2026) dá o CapCut Pro individual em
 * US$ 19,99/mês ou US$ 179,99/ano e diz que o preço varia por região, plataforma, impostos e promoções; a central de ajuda
 * (how-much-does-capcut-pro-cost) não publica valor — manda conferir no app. O editor tem versão grátis.
 */
export const CAPCUT_FACTS = {
  name: 'CapCut',
  url: 'https://www.capcut.com/resource/capcut-standard-vs-pro',
  helpUrl: 'https://www.capcut.com/help/how-much-does-capcut-pro-cost',
  checkedOn: COMPETITOR_PRICES_CHECKED_ON,
  proMonthly: '$19.99',
  proYearly: '$179.99',
  varies: 'prices vary by region, platform, taxes and promotions',
} as const

/** OpusClip: opus.pro/pricing lido em 08/10/2026 — plano grátis, Starter US$ 15/mês, Pro US$ 29/mês. */
export const OPUSCLIP_FACTS = {
  name: 'OpusClip',
  url: 'https://www.opus.pro/pricing',
  checkedOn: COMPETITOR_PRICES_CHECKED_ON,
  starter: '$15/month',
  pro: '$29/month',
} as const

/** HeyGen: heygen.com/pricing lido em 08/10/2026 — grátis 3 vídeos/mês de até 1 min; Creator US$ 29/mês (US$ 24 no anual). */
export const HEYGEN_FACTS = {
  name: 'HeyGen',
  url: 'https://www.heygen.com/pricing',
  checkedOn: COMPETITOR_PRICES_CHECKED_ON,
  free: '3 videos a month, up to 1 minute each',
  creator: '$29/month ($24/month billed annually)',
} as const

/**
 * As rotas DIRETAS dos três modelos premium, relidas em 08/10/2026 (runway.com/pricing, academy.runwayml.com/models-pricing e
 * ai.google.dev/gemini-api/docs/pricing). Os números batem com lib/clips/clipPriceVsMarket.ts (MARKET_QUOTES) e
 * lib/seo/engineCitation.ts (FONTES_DIRETAS) — o guardião confere a igualdade, para nunca haver dois preços do mesmo fato.
 */
export const DIRECT_MODEL_ROUTES_2026_10_08 = {
  checkedOn: COMPETITOR_PRICES_CHECKED_ON,
  runwayPlansUrl: 'https://runway.com/pricing',
  runwayModelsUrl: 'https://academy.runwayml.com/models-pricing',
  geminiUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
  runwayStandard: { usdCentsMonthly: 1500, creditsMonthly: 625 },
  runwayPro: { usdCentsMonthly: 3500, creditsMonthly: 2250 },
  /** Kling 3.0 Pro sem áudio, créditos por segundo (Runway lista o Kling 3.0 no Standard e no Pro). */
  kling3CreditsPerSecond: 12,
  /** Seedance 2.5 a 720p, créditos por segundo (Runway lista o Seedance 2.5 só no Pro e no Max). */
  seedance25CreditsPerSecond720p: 30,
  /** Veo 3.1 Fast na Gemini API, US$ por segundo a 720p, com áudio (página atualizada em 2026-10-07). */
  veo31FastUsdPerSecond720p: 0.1,
} as const

// ─── "Make one like this": o filme da casa abre o Studio com a ideia real que o fez ────────────────────────────────────
/** placement do evento organic_cta_clicked E utm_content da URL — os dois carregam o mesmo nome para medir. */
export const HOUSE_FILM_REMIX_PLACEMENT = 'house_film_remix'
export const HOUSE_FILM_REMIX_LABEL = 'Make one like this →'
/**
 * Motor do filme (quality da vitrine) → a chave que o Studio lê em ?engine= (app/(dashboard)/studio/StudioClient.tsx). Espelho
 * sem import de lib/growth/enginePageCatalog.ts (ENGINES[].qualityMode → .param); o guardião confere contra o catálogo. Motor
 * pausado o Studio ignora sozinho (cai no padrão) — o link nunca força motor em manutenção.
 */
export const STUDIO_ENGINE_FOR_FILM: Readonly<Record<string, string>> = {
  cinematic_ai: 'seedance',
  cinematic_kling: 'kling',
  cinematic_veo: 'veo',
  cinematic_hollywood: 'hollywood',
  cinematic_h3: 'h3',
  cinematic_omni: 'omni',
}
/** O teto do roteiro que atravessa o cadastro (o mesmo de lib/creationHandoff.ts CREATION_HANDOFF_PROMPT_MAX_CHARS). */
export const STUDIO_HANDOFF_MAX_CHARS = 1000
const TOKEN = /^[A-Za-z0-9._~-]{1,100}$/

/**
 * O Studio com um texto já preenchido, atravessando o cadastro pelo MESMO contrato de seedanceStudioSignupHref
 * (lib/seo/seedanceAnswer.ts) e de buildEngineLandingSignupHref: /signup?intent_campaign=…&redirect=/studio?… — o Studio lê
 * engine, prompt, script_mode, duration e intent_campaign e ESPERA o clique em Gerar. Nada aqui dispara render nem gasta
 * crédito: sem create_intent (que liga o auto-start) e sem autoanalyze. `utm_content` vai nos dois lados para medir.
 * Por que não generateFromScriptHref nem publicVideoRemixHref: o primeiro corta o texto em 160 caracteres e manda
 * create_intent=fast (auto-render do Kineo 1, fora do catálogo público); o segundo abre o gerador de roteiro, não o Studio.
 */
export function studioScriptHref(input: {
  text: string
  campaign: string
  utmContent: string
  engine?: string | null
  scriptMode?: 'ai' | 'verbatim'
  duration?: number | null
}): string {
  const campaign = TOKEN.test(input.campaign) ? input.campaign : 'seo_geo_rodada3'
  const content = TOKEN.test(input.utmContent) ? input.utmContent : HOUSE_FILM_REMIX_PLACEMENT
  const studio = new URLSearchParams()
  if (input.engine && TOKEN.test(input.engine)) studio.set('engine', input.engine)
  const text = input.text.trim().slice(0, STUDIO_HANDOFF_MAX_CHARS)
  if (text) studio.set('prompt', text)
  studio.set('script_mode', input.scriptMode ?? 'ai')
  if (input.duration && [35, 60, 90].includes(input.duration)) studio.set('duration', String(input.duration))
  studio.set('intent_campaign', campaign)
  studio.set('utm_content', content)
  const signup = new URLSearchParams({ intent_campaign: campaign, utm_content: content, redirect: `/studio?${studio.toString()}` })
  return `/signup?${signup.toString()}`
}

/** "Make one like this": o Studio com a ideia real do filme, no motor que o renderizou, modo IA (a ideia vira um filme novo). */
export function houseFilmRemixHref(film: Pick<HouseFilm, 'engine' | 'idea'>, campaign: string): string {
  return studioScriptHref({ text: film.idea, campaign, utmContent: HOUSE_FILM_REMIX_PLACEMENT, engine: STUDIO_ENGINE_FOR_FILM[film.engine] ?? null, scriptMode: 'ai' })
}
