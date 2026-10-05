// KINEO-HOME-CLIPS-FIRST-2026-10-05 — A/B da home "clips-first" (sessão CEO em nome do fundador, 04/10: a Kineo passa a ter
// 2 produtos — PRODUTO 1 = CLIPES, a porta de entrada no estilo dos concorrentes de clipe; PRODUTO 2 = FILME NARRADO, o
// premium que já existe).
//
// O QUE ESTE MÓDULO DECIDE: qual home uma pessoa vê — a atual ('control', curadoria do fundador, intacta) ou a nova
// ('clips_first': galeria de efeitos de 1 clique + "Upload a photo" no primeiro quadro, filme narrado como 2º cartão).
//
// O INTERRUPTOR (em código, nunca env da Vercel):
//   'off'  → NINGUÉM muda: control para todos, nenhum cookie novo, nenhum evento. (nasce assim)
//   'ab50' → metade das PESSOAS vê clips_first; robô sempre vê control (a página que o Google indexa continua a atual).
//   'all'  → toda pessoa vê clips_first; robô continua em control até o fundador decidir que a variante VIRA a home
//            indexada (aí a regra do robô sai junto com o FAQ/metadata portados — ver relatório de 05/10).
//
// A ATRIBUIÇÃO: hash DETERMINÍSTICO (FNV-1a 32 + finalizador murmur3) de `${HOME_AB_SALT}:${id}` → balde 0..9999;
// balde < 5000 = clips_first. id = user_id quando logado; senão o cookie first-party httpOnly `kineo_vid` (180 dias,
// criado pelo middleware só na home e só com o interruptor ligado — a analytics da casa não tem id estável legível no
// servidor: o `kineo_event_session` nasce no navegador e morre com a aba). Mesma pessoa = mesma variante, sempre.
// Trocar o SAL reembaralha todo mundo — só em experimento NOVO.
//
// MÓDULO PURO (zero import): o middleware (edge), a home (servidor), a rota de exposição e o guardião
// scripts/test-home-clips-first-2026-10-05.mjs executam as MESMAS funções.

export type HomeClipsFirstMode = 'off' | 'ab50' | 'all'

/** Interruptor da home clips-first. NASCE 'off' (nada muda para ninguém). O fundador liga. */
export const HOME_CLIPS_FIRST: HomeClipsFirstMode = 'off'

export type HomeVariant = 'control' | 'clips_first'
export type HomeAssignmentKind = 'user' | 'visitor'

/** Nome do evento de servidor (está em SERVER_ONLY_EVENTS de app/api/events/route.ts — o navegador não cunha). */
export const HOME_VARIANT_EXPOSED_EVENT = 'home_variant_exposed'
/** Versão do contrato do evento (metadata.version). */
export const HOME_VARIANT_EVENT_VERSION = 'home_clips_first_v1'
/** Sal do hash. Trocar = reembaralhar todo mundo (só em experimento NOVO). */
export const HOME_AB_SALT = 'home_clips_first_v1'

/** Cookie first-party httpOnly do visitante anônimo (id aleatório, não é PII). */
export const HOME_VISITOR_COOKIE = 'kineo_vid'
export const HOME_VISITOR_COOKIE_MAX_AGE_SECONDS = 180 * 24 * 60 * 60
/** Cookie httpOnly de dedupe da exposição: `${dia UTC}|${variante}|${atribuição}`. */
export const HOME_EXPOSURE_COOKIE = 'kineo_hve'
export const HOME_EXPOSURE_COOKIE_MAX_AGE_SECONDS = 2 * 24 * 60 * 60

/** Prévia só para contas da casa: `/?home_variant=clips_first` (sem evento, sem mexer na atribuição). */
export const HOME_PREVIEW_PARAM = 'home_variant'

export const HOME_BUCKETS = 10_000
/** Fatia da variante em 'ab50' (baldes 0..4999). */
export const HOME_CLIPS_FIRST_SHARE = 5_000

const VISITOR_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{15,63}$/

/** Aceita só ids no formato que o middleware cria (UUID) ou um user_id; o resto é ignorado (cookie adulterado = sem id). */
export function normalizeHomeVisitorId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim()
  return VISITOR_ID_RE.test(v) ? v : null
}

/** FNV-1a 32 bits + finalizador do murmur3 (espalha os bits baixos; ids parecidos não caem juntos). */
export function homeHash32(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/** Balde estável 0..9999 da pessoa. */
export function homeBucket(id: string, salt: string = HOME_AB_SALT): number {
  return homeHash32(`${salt}:${id}`) % HOME_BUCKETS
}

// Robôs de busca, de prévia de link, de IA e ferramentas de linha de comando. Na dúvida (UA vazio) = robô: o pior caso é
// uma pessoa sem user-agent ver a home atual, que é a que já funciona. Navegador DENTRO de app (Instagram/Facebook FBAN,
// LinkedInApp, Pinterest, TikTok) é GENTE — por isso os nomes de rede social só casam na forma "...bot"; e o celular
// CUBOT (marca Android) não é robô.
const BOT_UA_RE =
  /(?<!cu)bot\b|(?<!cu)bot\/|crawler|crawling|spider|slurp|googleother|google-inspectiontool|google-extended|feedfetcher|mediapartners|adsbot|apis-google|bingpreview|google web preview|facebookexternalhit|facebookcatalog|meta-externalagent|embedly|quora link preview|whatsapp\/|telegrambot|discordbot|slackbot|slack-imgproxy|twitterbot|linkedinbot|pinterestbot|vkshare|redditbot|skypeuripreview|applebot|yandex|baiduspider|duckduckbot|petalbot|sogou|seznam|semrush|ahrefs|mj12|dotbot|screaming frog|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-web|claude-user|anthropic-ai|perplexity|ccbot|bytespider|amazonbot|cohere-ai|diffbot|lighthouse|pagespeed|headlesschrome|phantomjs|python-requests|python-urllib|aiohttp|httpx|curl\/|wget\/|go-http-client|okhttp|node-fetch|axios\/|undici|java\/|libwww|httpclient|postman|uptime|pingdom|statuscake|monitor/i

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? '').trim()
  if (!ua) return true
  return BOT_UA_RE.test(ua)
}

export interface HomeAssignmentInput {
  mode?: HomeClipsFirstMode
  userId?: string | null
  visitorId?: string | null
  userAgent?: string | null
}

export interface HomeAssignment {
  variant: HomeVariant
  /** De quem é o id que decidiu (null = ninguém foi sorteado: off, robô ou sem id). */
  assignment: HomeAssignmentKind | null
  /** O id usado no hash (user_id ou kineo_vid). */
  assignmentId: string | null
  mode: HomeClipsFirstMode
  reason: 'off' | 'bot' | 'no_id' | 'ab50' | 'all'
  /** Grava home_variant_exposed? (só pessoa de verdade, com o interruptor ligado). */
  expose: boolean
}

/**
 * A regra inteira. Ordem: off → robô → all → ab50 por user_id (logado) → ab50 por kineo_vid → sem id = control.
 * 'all' também carrega o id (quando há) para o evento ligar a pessoa ao funil.
 */
export function assignHomeVariant(input: HomeAssignmentInput): HomeAssignment {
  const mode: HomeClipsFirstMode = input.mode ?? HOME_CLIPS_FIRST
  if (mode !== 'ab50' && mode !== 'all') {
    return { variant: 'control', assignment: null, assignmentId: null, mode: 'off', reason: 'off', expose: false }
  }
  if (isBotUserAgent(input.userAgent)) {
    return { variant: 'control', assignment: null, assignmentId: null, mode, reason: 'bot', expose: false }
  }
  const userId = normalizeHomeVisitorId(input.userId)
  const visitorId = normalizeHomeVisitorId(input.visitorId)
  const assignment: HomeAssignmentKind | null = userId ? 'user' : visitorId ? 'visitor' : null
  const assignmentId = userId ?? visitorId
  if (mode === 'all') {
    return { variant: 'clips_first', assignment, assignmentId, mode, reason: 'all', expose: true }
  }
  if (!assignmentId) {
    // Cookie bloqueado/ausente: sem id estável não há sorteio honesto — home atual, sem evento.
    return { variant: 'control', assignment: null, assignmentId: null, mode, reason: 'no_id', expose: false }
  }
  const variant: HomeVariant = homeBucket(assignmentId) < HOME_CLIPS_FIRST_SHARE ? 'clips_first' : 'control'
  return { variant, assignment, assignmentId, mode, reason: 'ab50', expose: true }
}

/**
 * Trava POR PESSOA: a home só mostra a galeria a quem pode usá-la — a MESMA regra do /clips (lib/clips/clipLaunch.ts
 * clipsVisible(email) e lib/clips/clipEffects.ts clipEffectsVisible(isInternalEmail(email))). O servidor
 * (lib/growth/homeClipsFirstServer.ts) passa os dois booleanos JÁ resolvidos para a pessoa. Efeito: com HOME_CLIPS_FIRST
 * ligado e CLIP_EFFECTS_PUBLIC=false, a conta da casa entra no sorteio (canário) e o visitante de fora fica na home atual
 * sem evento — nunca cai numa galeria que não vê.
 */
export function effectiveHomeClipsFirstMode(
  mode: HomeClipsFirstMode,
  gates: { clipsPublic: boolean; effectsPublic: boolean },
): HomeClipsFirstMode {
  if (mode !== 'ab50' && mode !== 'all') return 'off'
  return gates.clipsPublic === true && gates.effectsPublic === true ? mode : 'off'
}

/**
 * O middleware cria o `kineo_vid`? Só na HOME ('/'), só GET, só com o interruptor ligado, só para gente (robô não ganha
 * cookie) e só se ainda não existe um válido. Com 'off' nada muda — nem cookie.
 */
export function shouldMintHomeVisitorCookie(input: {
  mode?: HomeClipsFirstMode
  pathname: string
  method: string
  userAgent?: string | null
  existing?: string | null
}): boolean {
  const mode = input.mode ?? HOME_CLIPS_FIRST
  if (mode !== 'ab50' && mode !== 'all') return false
  if (input.pathname !== '/' || input.method.toUpperCase() !== 'GET') return false
  if (isBotUserAgent(input.userAgent)) return false
  return normalizeHomeVisitorId(input.existing) === null
}

/** Dia UTC (YYYY-MM-DD) — a janela do dedupe. */
export function homeExposureDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** Valor do cookie de dedupe: a mesma pessoa, no mesmo dia, na mesma variante, conta UMA exposição por navegador. */
export function homeExposureDedupeKey(day: string, a: Pick<HomeAssignment, 'variant' | 'assignment'>): string {
  return `${day}|${a.variant}|${a.assignment ?? 'none'}`
}

/** Superfície da exposição: home comum ou o pouso pós-cadastro (/?welcome=1 do e-mail, /?signup=1 do OAuth). */
export type HomeExposureSurface = 'home' | 'post_signup'
export function homeExposureSurface(raw: unknown): HomeExposureSurface {
  return raw === 'post_signup' ? 'post_signup' : 'home'
}

/**
 * Prévia da casa: `/?home_variant=clips_first|control` só vale para conta interna. Devolve null quando não é prévia.
 * Prévia NUNCA grava evento (a página não monta o sinal de exposição).
 */
export function homePreviewVariant(raw: unknown, isInternal: boolean): HomeVariant | null {
  if (!isInternal) return null
  return raw === 'clips_first' || raw === 'control' ? raw : null
}

/**
 * CONTRATO com a tela do /clips (feita por outro agente na mesma rodada): clicar num efeito leva a
 *   logado    → /clips?effect=<key>
 *   deslogado → /signup?redirect=<encode(/clips?effect=<key>)>   (o cadastro devolve para o mesmo efeito)
 * O /clips lê `effect` (chave de lib/clips/clipEffects.ts CLIP_EFFECTS; chave desconhecida = tela normal).
 * "Upload a photo" (sem efeito escolhido) leva a /clips?upload=1 — o /clips pode abrir o seletor de foto; se ignorar o
 * parâmetro, abre a tela normal (seguro).
 */
export function clipEffectEntryHref(effectKey: string, signedIn: boolean): string {
  const clips = `/clips?effect=${encodeURIComponent(effectKey)}`
  return signedIn ? clips : `/signup?redirect=${encodeURIComponent(clips)}`
}

export function clipUploadEntryHref(signedIn: boolean): string {
  const clips = '/clips?upload=1'
  return signedIn ? clips : `/signup?redirect=${encodeURIComponent(clips)}`
}

/** Botão do 2º produto (filme narrado): o Studio, com a campanha que a SQL do A/B lê. */
export const HOME_CLIPS_FIRST_FILM_CAMPAIGN = 'home_clips_first_film'
export function clipsFirstFilmHref(signedIn: boolean): string {
  const studio = `/studio?intent_campaign=${HOME_CLIPS_FIRST_FILM_CAMPAIGN}`
  return signedIn ? studio : `/signup?redirect=${encodeURIComponent(studio)}`
}
