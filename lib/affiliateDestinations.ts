// Affiliate deep links are deliberately an allowlist, not a `redirect=` URL.
// The `/a/[code]` route owns the redirect and may only send traffic to these
// first-party acquisition surfaces. This keeps old `/a/CODE` links working
// while giving partners a useful destination instead of the generic homepage.

export const AFFILIATE_DESTINATIONS = [
  {
    key: 'script',
    label: 'Free script generator',
    audience: 'People who have a topic but not a script',
    path: '/free-script-generator',
    campaign: 'affiliate_script',
    description: 'Best for people who already have a topic and want a hook-to-payoff draft.',
    sharePitch: 'Try this free AI script generator for Shorts — it can turn one topic into a hook, facts and payoff, no signup:',
    spokenPitch: 'If you have a Shorts idea but no script, Kineo turns one topic into a hook, facts and payoff before you even create an account.',
    emailSubject: 'Free AI script generator for Shorts',
  },
  {
    key: 'video',
    label: 'Free AI Shorts generator',
    audience: 'People ready to test the full video workflow',
    path: '/free-ai-shorts-generator',
    campaign: 'affiliate_video',
    // KINEO-AFILIADO-DESTINO-1610 — "Fast test" saiu: o Kineo 1 (ex-Fast) não é mais o grátis (29/09) e a própria
    // página já tirou essa promessa (guardião test-citation-entry-truth-2026-09-30). Este texto vira o post padrão.
    description: 'Best for people who want to see the topic-to-video workflow and make a free first film.',
    sharePitch: 'Turn one idea into a scripted, voiced and captioned AI Short with Kineo — the first test needs no card:',
    spokenPitch: 'Kineo turns one idea into a scripted, voiced and captioned vertical video. The first test needs no card, so you can judge the result yourself.',
    emailSubject: 'Try Kineo’s free AI Shorts workflow',
  },
  {
    key: 'faceless',
    label: 'Faceless video workflow',
    audience: 'Faceless YouTube, TikTok and Reels creators',
    path: '/faceless-video-generator',
    campaign: 'affiliate_faceless',
    description: 'Best for creators who want narration, changing visuals and captions without filming themselves.',
    sharePitch: 'Want to make faceless Shorts without filming? Kineo combines a hook-driven script, AI voice, changing visuals and captions:',
    spokenPitch: 'For faceless Shorts, Kineo combines a hook-driven script, AI voice, changing visuals and captions without asking you to film yourself.',
    emailSubject: 'Faceless Shorts without filming',
  },
  {
    key: 'business',
    label: 'Business content planner',
    audience: 'Companies and freelancers planning weekly business content',
    path: '/business-video-content-plan',
    campaign: 'affiliate_business_plan',
    description: 'Best for businesses that need a useful weekly plan before choosing production.',
    sharePitch: 'Build a free weekly Short-form video plan for your business — offer, audience and goal in; concrete angles and evidence boundaries out:',
    spokenPitch: 'Kineo has a free business video planner that turns an offer, audience and goal into a week of Short ideas with evidence boundaries before anyone signs up.',
    emailSubject: 'Free weekly video plan for your business',
  },
] as const

export type AffiliateDestination = (typeof AFFILIATE_DESTINATIONS)[number]
export type AffiliateDestinationKey = AffiliateDestination['key']
type AffiliateRouteOnlyDestination = {
  key: 'client_brief'
  path: '/client-video-brief-generator'
  campaign: 'affiliate_client_brief'
}
export type AffiliateRouteDestination = AffiliateDestination | AffiliateRouteOnlyDestination
export type AffiliateRouteDestinationKey = AffiliateRouteDestination['key']
export type AffiliateDestinationBucket = AffiliateDestinationKey | 'legacy'

const DESTINATION_BY_KEY = new Map<AffiliateDestinationKey, AffiliateDestination>(
  AFFILIATE_DESTINATIONS.map((destination) => [destination.key, destination]),
)

// Route-only because this relay is created contextually by the existing client
// intake tool. Keeping it out of AFFILIATE_DESTINATIONS prevents a silent fifth
// campaign card from appearing in the affiliate dashboard.
const CLIENT_BRIEF_ROUTE_DESTINATION: AffiliateRouteOnlyDestination = {
  key: 'client_brief',
  path: '/client-video-brief-generator',
  campaign: 'affiliate_client_brief',
}

const ROUTE_DESTINATION_BY_KEY = new Map<string, AffiliateRouteDestination>([
  ...AFFILIATE_DESTINATIONS.map((destination) => [destination.key, destination] as const),
  [CLIENT_BRIEF_ROUTE_DESTINATION.key, CLIENT_BRIEF_ROUTE_DESTINATION] as const,
])

// KINEO-AFILIADO-DESTINO-1610 — o destino padrão passa a ser `video` (/free-ai-shorts-generator).
// Medido em 28 dias (docs/PLANO-TRIPLICAR-VISITANTES-2026-10-16.md §2.4): /free-script-generator cadastra 2% dos
// visitantes (1 de 41) e /free-ai-shorts-generator 52% (42 de 80). `script` era o padrão do botão Copiar do painel
// do parceiro, da missão de 1º clique e do widget; e o link SEM `?to=` caía na home sem etiqueta nenhuma
// (ColorMango, 68 cliques). Agora o MESMO destino vale para o painel e para o `/a/CODIGO` puro. Fundador, 16/10.
export const RECOMMENDED_AFFILIATE_DESTINATION: AffiliateDestinationKey = 'video'
export const DEFAULT_AFFILIATE_ROUTE_DESTINATION: AffiliateDestinationKey = RECOMMENDED_AFFILIATE_DESTINATION

// Formato público do código (o mesmo de buildAffiliateRouteShareLink). Só vira `utm_content` se bater exatamente,
// então nenhum texto arbitrário do caminho chega à URL de destino nem às métricas.
const AFFILIATE_CODE_SHAPE = /^[A-HJ-NP-Z2-9]{8}$/

/**
 * KINEO-AFILIADO-DESTINO-1610 — para onde vai o `/a/[code]` quando o `?to=` está ausente, desconhecido ou é
 * malicioso. O valor da query só serve de chave de um Map fixo (getAffiliateRouteDestination) — nunca vira caminho
 * nem URL —, então não existe open redirect; o que não está na lista cai aqui.
 */
export function defaultAffiliateRouteDestination(): AffiliateDestination {
  return DESTINATION_BY_KEY.get(DEFAULT_AFFILIATE_ROUTE_DESTINATION)!
}

export function getAffiliateDestination(value: string | null | undefined): AffiliateDestination | null {
  const key = (value ?? '').trim().toLowerCase() as AffiliateDestinationKey
  return DESTINATION_BY_KEY.get(key) ?? null
}

export function getAffiliateRouteDestination(
  value: string | null | undefined,
): AffiliateRouteDestination | null {
  const key = (value ?? '').trim().toLowerCase()
  return ROUTE_DESTINATION_BY_KEY.get(key) ?? null
}

export function buildAffiliateDestinationUrl(origin: string, key: AffiliateDestinationKey): URL {
  const destination = DESTINATION_BY_KEY.get(key)
  if (!destination) return new URL('/', origin)
  const url = new URL(destination.path, origin)
  url.searchParams.set('utm_source', 'affiliate')
  url.searchParams.set('utm_medium', 'partner')
  url.searchParams.set('utm_campaign', destination.campaign)
  return url
}

export function buildAffiliateRouteDestinationUrl(
  origin: string,
  key: AffiliateRouteDestinationKey,
  code?: string | null,
): URL {
  // KINEO-AFILIADO-DESTINO-1610 — chave fora da lista cai no destino padrão COM etiqueta (antes: home sem etiqueta).
  const destination = ROUTE_DESTINATION_BY_KEY.get(key) ?? defaultAffiliateRouteDestination()
  const url = new URL(destination.path, origin)
  // A etiqueta que o painel e as consultas já leem: utm_source=affiliate + utm_medium=partner (balde "Afiliados"
  // do apêndice A.1 do plano) e utm_campaign=affiliate_<destino> (contexto "Recommended by a Kineo partner").
  url.searchParams.set('utm_source', 'affiliate')
  url.searchParams.set('utm_medium', 'partner')
  url.searchParams.set('utm_campaign', destination.campaign)
  // utm_content=<CÓDIGO>: o trackEvent copia os utm_* guardados para todo evento da sessão, então a visita
  // (landing_session_started) passa a dizer DE QUAL afiliado veio. Só analytics: o dono financeiro continua sendo o
  // par de cookies sf_aff + sf_aff_click com prova no banco.
  const normalizedCode = (code ?? '').trim().toUpperCase()
  if (AFFILIATE_CODE_SHAPE.test(normalizedCode)) url.searchParams.set('utm_content', normalizedCode)
  return url
}

export function buildAffiliateShareLink(baseLink: string, key: AffiliateDestinationKey): string {
  return buildAffiliateRouteShareLink(baseLink, key)
}

export function buildAffiliateRouteShareLink(
  baseLink: string,
  key: AffiliateRouteDestinationKey,
): string {
  if (!baseLink) return ''
  try {
    const destination = getAffiliateRouteDestination(key)
    const source = new URL(baseLink)
    const match = /^\/a\/([A-HJ-NP-Z2-9]{8})\/?$/i.exec(source.pathname)
    if (!match) return ''
    // Partner links are public acquisition assets, so always copy the
    // production canonical host even when the dashboard is opened via a
    // preview/legacy host. This also prevents compromised API data from
    // turning the Copy button into an arbitrary-link distributor.
    const url = new URL(`/a/${match[1].toUpperCase()}`, 'https://www.usekineo.com')
    if (destination) url.searchParams.set('to', destination.key)
    return url.toString()
  } catch {
    return ''
  }
}

export function affiliateClickLandingPath(code: string, destination: AffiliateRouteDestination | null): string {
  return destination ? `/a/${code}?to=${destination.key}` : `/a/${code}`
}

export function affiliateDestinationBucket(
  landingPath: string | null | undefined,
): AffiliateDestinationBucket {
  if (!landingPath) return 'legacy'
  try {
    const url = new URL(landingPath, 'https://www.usekineo.com')
    const destination = getAffiliateDestination(url.searchParams.get('to'))
    return destination?.key ?? 'legacy'
  } catch {
    return 'legacy'
  }
}

// Social unfurlers request partner links to build a preview, but no human has
// visited and their cookie jar will never reach signup. Excluding these known
// agents keeps the dashboard's raw “link visits” count from being inflated and
// avoids minting unusable financial proof rows. Unknown agents remain visible;
// this is a conservative allowlist of well-known preview/crawler signatures.
//
// KINEO-AFILIADOS-CLIQUE-ROBO-2026-10-03 — medido em produção (30 dias, sem a conta da casa): 18 dos 60 "cliques"
// de afiliado eram robôs que a lista acima não conhecia (Bytespider, ShapBot, ClaudeBot, ExaSearchBot, SemrushBot,
// Applebot, trendictionbot…). Cada um virava "visita" no painel do parceiro e cunhava prova de clique que nunca
// chega a um cadastro. A forma genérica `<letra>bot` seguida de `/`, `;`, `)` ou dígito pega os crawlers
// que se declaram, sem pegar o celular Cubot (o UA dele traz `Cubot X30 Build/` ou `CUBOT_P40`: depois do "bot" vem
// espaço ou `_`, nunca `/;)`/dígito — ver o guardião scripts/test-afiliados-atribuicao-2026-10-03.mjs, que prova os
// dois lados).
//
// KINEO-AFILIADO-DESTINO-1610 — medido em affiliate_clicks (28 dias até 15/10): 27 linhas ainda eram máquina com UA
// que a lista não conhecia — curl/8.5.0 (9), Google-Safety (7, quatro disfarçadas de Nexus 5X), python-requests (3),
// kuma-check (2, monitor de disponibilidade), SubstackContentFetch (1), curl/7 (1). Somam-se as ferramentas HTTP sem
// navegador (wget, Go, okhttp, axios, node-fetch, Java, libwww) e o UA vazio. Tokens explícitos, nunca `bot` solto:
// o celular Cubot continua gente (guardião test-afiliados-atribuicao-2026-10-03).
const AFFILIATE_PREVIEW_BOT =
  /(facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|googlebot|bingbot|bytespider|crawler|spider|headlesschrome|[a-z]bot[\/;)\d]|curl\/|wget\/|python-requests|python-urllib|aiohttp|go-http-client|okhttp|axios\/|node-fetch|undici|java\/|libwww|httpclient|google-safety|google-inspectiontool|kuma-check|uptime|contentfetch|fetcher|link-?preview|scanner)/i

/** Por que o UA é máquina (o token casado, ou `empty_user_agent`), ou null quando parece gente. */
export function affiliateBotReason(userAgent: string | null | undefined): string | null {
  const ua = (userAgent ?? '').trim()
  if (!ua) return 'empty_user_agent'
  const match = AFFILIATE_PREVIEW_BOT.exec(ua)
  return match ? match[1].toLowerCase().slice(0, 40) : null
}

export function isAffiliatePreviewBot(userAgent: string | null | undefined): boolean {
  return affiliateBotReason(userAgent) !== null
}
