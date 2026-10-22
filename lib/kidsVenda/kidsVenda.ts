// KINEO-KIDS-VENDA-2010 — as 3 formas de VENDER o "AI Kids Cartoon Stories" (fundador 20/10, "já respondi as três sim"; preço
// confirmado pela CEO: US$ 29/mês com 30 vídeos e US$ 49 o pack de 30, para todos, Brasil em reais pela fórmula da casa):
//   1. CANAL NO PILOTO AUTOMÁTICO — assinatura mensal: 1 desenho por dia (30 por ciclo contado da data da assinatura), sempre o
//      MESMO personagem (ficha canônica de lib/kidsCartoon/kidsCartoon.ts), tema/série da pessoa, título + legenda + hashtags,
//      entregue na biblioteca + e-mail "seu vídeo de hoje está pronto". Roda DENTRO do cron do Autopilot (app/api/cron/
//      autopilot-generate, hora em hora) — nenhuma entrada nova de cron (a Vercel rejeita deploy em silêncio quando estoura o teto).
//   2. PACK DE 30 VÍDEOS — pagamento único: 30 desenhos do mesmo personagem/tema, gerados em FILA (poucos por passada, nunca 30 de
//      uma vez na fal), na biblioteca com "baixar todos"; ao fim, a oferta do piloto.
//   3. 1º VÍDEO GRÁTIS COM MARCA-D'ÁGUA — 1 por conta, antifarm do Studio Ads (descartável, trial barrado, região paga), teto
//      diário global; a marca d'água vem da regra da casa (conta sem plano = isFreePlanCinematic no compose).
//
// COMO O FILME NASCE (reuso, sem fork): o cron age COMO A PESSOA (lib/autopilot/session.ts) e chama as MESMAS rotas da tela:
// POST /api/kids-cartoon/story (história na régua do Seedance 1.5, moderação da casa + regra infantil) → POST
// /api/generate-video-cinematic com `kids_cartoon` (estilo 3D + personagem em toda cena) → o cron de resgate da casa
// (finish-stranded-renders) monta o filme e grava em `videos`. Nenhuma linha de render, preço, marca d'água ou régua 95 é duplicada.
// CRÉDITO: "financia e renderiza" — logo antes de cada despacho o cron soma à conta EXATAMENTE o custo do filme (creditCostForDuration)
// e a rota debita como sempre; se a rota recusa ou o filme é estornado, o cron tira de volta o que pôs. O saldo da pessoa nunca
// fica positivo por conta do produto, e o produto nunca gasta crédito que a pessoa comprou para outra coisa.
//
// PREÇO: UMA configuração do servidor (KIDS_PRICES abaixo). Nada que o navegador mande muda o valor cobrado (o checkout ignora a
// query string), e o webhook reconhece o pedido SÓ pela metadata (nunca pelo valor: 4900 é também o Kit BF e o bulk30).
// INTERRUPTOR: KIDS_SALES_LIVE=false → checkout recusa, cartões somem, amostra recusa, cron não despacha. Só a conta da casa
// (isInternalEmail) passa pelo checkout/amostra desligados, para o fundador testar antes de virar (padrão do passe do Studio Ads).
// Dependência de produto: o template precisa estar aberto (KIDS_CARTOON_LIVE) antes de KIDS_SALES_LIVE — o cron chama a rota da
// história, que responde 404 com o template fechado.
//
// MÓDULO PURO (só importa o módulo puro lib/kidsCartoon/kidsCartoon.ts): o guardião scripts/test-kids-venda-2010.mjs executa este
// arquivo num vm; o checkout, o webhook, o cron, as rotas e os cartões leem DAQUI.
import { KIDS_CARTOON_LIVE, KIDS_CHARACTER_IDS, type KidsCartoonDuration, type KidsCartoonLanguage, type KidsCharacterId, isKidsCartoonLanguage, isKidsCharacterId, kidsCharacter, kidsContentRefusal } from '@/lib/kidsCartoon/kidsCartoon'

export const KIDS_VENDA_MARK = 'KINEO-KIDS-VENDA-2010'

/** Interruptor da VENDA (as 3 formas). false = nada muda para ninguém de fora: checkout recusa, cartões somem, amostra recusa. */
export const KIDS_SALES_LIVE = true
/**
 * O que o PÚBLICO vê: a venda só abre com o template também aberto (KIDS_CARTOON_LIVE, lib/kidsCartoon/kidsCartoon.ts) — o cron
 * escreve a história pela rota do template, que responde 404 com ele fechado; vender antes seria cobrar sem conseguir entregar.
 * Ligar = os DOIS true. A conta da casa passa com qualquer combinação (kidsSalesOpen com internal=true), para testar antes.
 */
export const KIDS_SALES_OPEN_FOR_PUBLIC: boolean = KIDS_SALES_LIVE && KIDS_CARTOON_LIVE
/** A venda está aberta para esta conta? (puro: `internal` = isInternalEmail do e-mail verificado da sessão). */
export function kidsSalesOpen(live: boolean, internal: boolean): boolean {
  return live === true || internal === true
}

// ── PREÇO: a única configuração do servidor ───────────────────────────────────────────────────────────────────────────────
/** Lista em dólar (centavos). Brasil paga em reais por lib/settlementCurrency settlementAmountMinor (fórmula da casa, ,90). */
export const KIDS_PRICES = {
  autopilot: { usdMinor: 2900, currency: 'usd' as const, per: 'month' as const },
  pack: { usdMinor: 4900, currency: 'usd' as const, per: 'once' as const },
} as const
/** metadata.pack (pack, Path A) e metadata.kids_product (assinatura) — é por eles, e só por eles, que o webhook reconhece. */
export const KIDS_PACK_ID = 'kids_pack' as const
export const KIDS_AUTOPILOT_ID = 'kids_autopilot' as const
export const KIDS_PRODUCT_META_KEY = 'kids_product' as const
/** Versão do contrato (cartão + checkout + webhook + cron). Muda junto com qualquer promessa do cartão. */
export const KIDS_VENDA_VERSION = 'kids_venda_v1_2026-10-20' as const

export type KidsOrderKind = 'autopilot' | 'pack' | 'sample'
export type KidsOrderStatus = 'active' | 'paused' | 'completed' | 'cancelled'
export type KidsRunStatus = 'pending' | 'dispatched' | 'delivered' | 'failed'

/** Quantos desenhos cada forma entrega. */
export const KIDS_VIDEOS: Record<KidsOrderKind, number> = { autopilot: 30, pack: 30, sample: 1 }
/** O ciclo do piloto: 30 vídeos por mês contados da DATA DA ASSINATURA (a fatura da Stripe), não do dia do mês. */
export const KIDS_CYCLE_DAYS = 30
/**
 * A DURAÇÃO do desenho vendido — a conta de margem (fatura de agosto: Seedance 1.5 ≈ US$ 3,30 por 60 s TUDO-DENTRO, lib/checkoutPricing
 * WORST_CASE_FILM_COSTS): 15 s = 9 cr ≈ US$ 0,50–0,85 · 35 s = 21 cr ≈ US$ 1,30–1,95. Em 30 vídeos: 15 s ≈ US$ 15–26 (cabe nos
 * US$ 27,86 líquidos do piloto e nos US$ 47,28 do pack); 35 s ≈ US$ 39–59 (PREJUÍZO a US$ 29 e empate a US$ 49). Por isso 15 s.
 * Mudar para 35 exige subir o preço ou baixar a contagem — decisão do fundador, numa linha só (esta).
 */
export const KIDS_VENDA_DURATION: KidsCartoonDuration = 15
export const KIDS_VENDA_ENGINE = 'seedance' as const

// ── TETOS DE CUSTO ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Folga de refação por ciclo: o cron financia no máximo videos × custo × 1,25 (retentativas de cena/estorno). Acima: para e avisa. */
export const KIDS_CYCLE_FUNDING_HEADROOM = 1.25
export function kidsCycleCreditCap(videos: number, costPerVideo: number): number {
  return Math.ceil(Math.max(0, videos) * Math.max(0, costPerVideo) * KIDS_CYCLE_FUNDING_HEADROOM)
}
/** Tentativas por posição (seq) antes de desistir daquele vídeo (cada tentativa é um filme novo; a anterior foi recusada/estornada). */
export const KIDS_MAX_ATTEMPTS_PER_SEQ = 3
/** Um despacho sem filme depois disto está morto (o estorno da casa já devolveu o crédito; o cron tira o financiamento de volta). */
export const KIDS_RUN_TIMEOUT_MS = 6 * 60 * 60 * 1000
/** Teto de despachos por passada do cron (a passada divide os 300 s com o Autopilot). */
export const KIDS_MAX_STARTS_PER_PASS = 6
/** O pack anda em FILA: no máximo tantos por pedido por passada (30 vídeos ≈ 15 horas, nunca 30 de uma vez na fal). */
export const KIDS_PACK_PER_ORDER_PER_PASS = 2
/** Pausa: um `fal_balance_exhausted` (lib/falAlert.ts) nas últimas 2 h = nenhum despacho nesta passada. */
export const KIDS_PAUSE_AFTER_FAL_EXHAUSTED_MS = 2 * 60 * 60 * 1000
export const KIDS_FAL_BALANCE_EVENT = 'fal_balance_exhausted'
/** A amostra: 1 por conta (pedido 'sample' em qualquer estado que não seja 'cancelled'), teto global de 30/dia (UTC). */
export const KIDS_SAMPLE_DAILY_CAP = 30

/** O ciclo do piloto a partir da data da assinatura/fatura: 30 dias corridos. */
export function kidsCycleBounds(fromMs: number): { start: string; end: string } {
  const s = Number.isFinite(fromMs) ? fromMs : 0
  return { start: new Date(s).toISOString(), end: new Date(s + KIDS_CYCLE_DAYS * 86_400_000).toISOString() }
}
export function kidsCycleKey(cycleStartIso: string): string {
  return String(cycleStartIso ?? '').slice(0, 10)
}

/** Quantos cabem AINDA nesta janela: total − entregues − em voo (nunca negativo). */
export function kidsRemaining(i: { total: number; delivered: number; inFlight: number }): number {
  return Math.max(0, Math.floor(i.total) - Math.max(0, i.delivered) - Math.max(0, i.inFlight))
}
/** A próxima posição a despachar (1..total) ou null quando a janela está cheia. */
export function kidsNextSeq(i: { total: number; delivered: number; inFlight: number }): number | null {
  const used = Math.max(0, i.delivered) + Math.max(0, i.inFlight)
  return used < i.total ? used + 1 : null
}

/**
 * Quando o piloto despacha de novo: 1 por dia (24 h depois do último). Se o ciclo está atrasado (faltam mais vídeos do que dias,
 * ex.: a fal ficou sem saldo por 3 dias), recupera com no máximo 3 por dia (8 h) — os 30 saem dentro do ciclo pago.
 */
export function kidsAutopilotNextRunMs(i: { nowMs: number; remaining: number; cycleEndMs: number }): number {
  const daysLeft = Math.max(0, (i.cycleEndMs - i.nowMs) / 86_400_000)
  const behind = i.remaining > Math.ceil(daysLeft)
  return i.nowMs + (behind ? 8 : 24) * 3_600_000
}
/** Quantos despachos este pedido pode fazer nesta passada. */
export function kidsStartsAllowedThisPass(kind: KidsOrderKind): number {
  return kind === 'pack' ? KIDS_PACK_PER_ORDER_PER_PASS : 1
}
/** Ordem de prioridade na passada: a amostra (promessa ao visitante) > piloto (do dia) > pack (fila). */
export const KIDS_KIND_PRIORITY: Record<KidsOrderKind, number> = { sample: 0, autopilot: 1, pack: 2 }

/** A pausa da fal está valendo? (último `fal_balance_exhausted` dentro da janela). */
export function kidsFalPaused(lastExhaustedIso: string | null | undefined, nowMs: number): boolean {
  if (!lastExhaustedIso) return false
  const t = Date.parse(lastExhaustedIso)
  return Number.isFinite(t) && nowMs - t < KIDS_PAUSE_AFTER_FAL_EXHAUSTED_MS
}

// ── A AMOSTRA: quem ganha (decisão pura; quem lê o banco é lib/kidsVenda/server.ts) ───────────────────────────────────────
export type KidsSampleRefusal = 'closed' | 'disposable' | 'trial_blocked' | 'already_used' | 'has_order' | 'daily_cap' | 'paid_plan'
export function kidsSampleDecision(i: {
  live: boolean; internal: boolean; disposable: boolean; trialBlocked: boolean
  /** pedidos 'sample' da conta fora de 'cancelled' */ samplesUsed: number
  /** pedidos pagos (autopilot/pack) da conta — quem já comprou não precisa de amostra */ paidOrders: number
  startedToday: number
}): { ok: true } | { ok: false; reason: KidsSampleRefusal } {
  if (!kidsSalesOpen(i.live, i.internal)) return { ok: false, reason: 'closed' }
  if (i.disposable) return { ok: false, reason: 'disposable' }
  if (i.trialBlocked) return { ok: false, reason: 'trial_blocked' }
  if (i.samplesUsed > 0) return { ok: false, reason: 'already_used' }
  if (i.paidOrders > 0) return { ok: false, reason: 'has_order' }
  if (i.startedToday >= KIDS_SAMPLE_DAILY_CAP) return { ok: false, reason: 'daily_cap' }
  return { ok: true }
}
/** Início do dia UTC (ISO) — o teto diário conta amostras CRIADAS desde aqui. */
export function kidsDayStartIso(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

// ── O PEDIDO (personagem + tema + língua), validado no SERVIDOR ──────────────────────────────────────────────────────────
export const KIDS_THEME_MAX_CHARS = 120
export interface KidsSeriesRequest { character: KidsCharacterId; language: KidsCartoonLanguage; theme: string }
export type KidsSeriesValidation = { ok: true; value: KidsSeriesRequest } | { ok: false; error: string; field: string }
/** Tema vazio = "aventuras do dia a dia" (o escritor varia pelos momentos da série). Link não é tema; texto fere a regra infantil = recusa. */
export function validateKidsSeriesRequest(raw: unknown): KidsSeriesValidation {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  if (!isKidsCharacterId(r.character)) return { ok: false, error: 'Pick one of the characters.', field: 'character' }
  if (!isKidsCartoonLanguage(r.language)) return { ok: false, error: 'Pick English, Portuguese or Spanish.', field: 'language' }
  const theme = typeof r.theme === 'string' ? r.theme.replace(/[\u0000-\u001f\u007f​-‍⁠﻿]/g, ' ').replace(/\s+/g, ' ').trim() : ''
  if (theme.length > KIDS_THEME_MAX_CHARS) return { ok: false, error: `Keep the theme under ${KIDS_THEME_MAX_CHARS} characters.`, field: 'theme' }
  if (/https?:\/\/|www\./i.test(theme)) return { ok: false, error: 'Describe the series in words, not a link.', field: 'theme' }
  if (kidsContentRefusal(theme)) return { ok: false, error: 'Kids cartoons must stay innocent. Try another theme.', field: 'theme' }
  return { ok: true, value: { character: r.character, language: r.language, theme } }
}

// ── A SÉRIE: 30 momentos para o mesmo personagem/tema não repetir história (as plataformas punem conteúdo repetido em massa) ──
export const KIDS_SERIES_BEATS: readonly string[] = [
  'finds a lost mitten and looks for its owner', 'tries a new food for the first time', 'learns to wait for a turn on the slide',
  'helps a friend who fell off a tricycle', 'builds a sandcastle that the waves wash away', 'cannot find a favorite toy at bedtime',
  'wants to stay up late but gets very sleepy', 'sees a rainbow after the rain', 'learns to say thank you to the bus driver',
  'shares an umbrella on a rainy walk', 'plants a flower for grandma', 'meets a shy new neighbor', 'learns to tie a shoelace',
  'gets a small scratch and is brave at the doctor', 'waters the garden and discovers a snail', 'makes a card for a friend who is sick',
  'tries to whistle like the birds', 'helps set the table for dinner', 'gets lost in the supermarket for a minute and finds a helper',
  'learns that mistakes are okay when painting', 'cleans up the toys before a story', 'counts the stars from the window',
  'feeds the ducks at the pond', 'waits for a letter from a faraway friend', 'learns to say sorry after breaking a cup',
  'is scared of a thunderstorm and finds a cozy blanket', 'teaches a little cousin to clap a rhythm', 'picks apples with the family',
  'finds a caterpillar and watches it every day', 'gives the last cookie to a friend',
]
/** O momento da posição `seq` (1..n) — determinístico: o mesmo pedido reproduz a mesma ordem; ciclos seguintes deslocam. */
export function kidsBeatFor(seq: number, cycleIndex = 0): string {
  const n = KIDS_SERIES_BEATS.length
  const i = ((Math.max(1, Math.floor(seq)) - 1 + Math.max(0, Math.floor(cycleIndex)) * 7) % n + n) % n
  return KIDS_SERIES_BEATS[i]
}
/** A ideia que vai ao escritor da história (lib/kidsCartoon kidsStoryWriterPrompt usa "Story idea: {Nome} {idea}"). */
export function kidsIdeaForRun(i: { theme: string; seq: number; cycleIndex?: number }): string {
  const beat = kidsBeatFor(i.seq, i.cycleIndex ?? 0)
  const theme = String(i.theme ?? '').trim()
  return theme ? `${beat} (part of the series: ${theme})` : beat
}

// ── TÍTULO · LEGENDA · HASHTAGS de cada episódio (sem promessa de nada; o selo de IA vai junto) ─────────────────────────────
export function kidsEpisodeTitle(i: { script: string; characterId: KidsCharacterId; seq: number; language: KidsCartoonLanguage }): string {
  const name = kidsCharacter(i.characterId)?.name ?? 'Leo'
  const first = String(i.script ?? '').split(/(?<=[.!?])\s+/)[0]?.replace(/["“”]/g, '').trim() ?? ''
  const base = first.length >= 12 && first.length <= 70 ? first : (i.language === 'pt' ? `${name} e a aventura de hoje` : i.language === 'es' ? `${name} y la aventura de hoy` : `${name} and today's adventure`)
  const ep = i.language === 'pt' ? 'Ep.' : i.language === 'es' ? 'Ep.' : 'Ep.'
  return `${base} · ${ep} ${Math.max(1, i.seq)}`.slice(0, 96)
}
export function kidsEpisodeHashtags(language: KidsCartoonLanguage): string[] {
  if (language === 'pt') return ['#DesenhoInfantil', '#HistoriaInfantil', '#FeitoComIA', '#ParaCriancas']
  if (language === 'es') return ['#CuentosInfantiles', '#DibujosAnimados', '#HechoConIA', '#ParaNinos']
  return ['#KidsStories', '#KidsCartoon', '#MadeWithAI', '#ForKids']
}

// ── A SESSÃO DA STRIPE: reconhecimento SÓ pela metadata ───────────────────────────────────────────────────────────────────
type MetaSession = { mode?: string | null; metadata?: Record<string, string> | null }
export function isKidsPackSession(session: MetaSession): boolean {
  return session.mode === 'payment' && (session.metadata?.pack ?? '').trim() === KIDS_PACK_ID
}
export function isKidsAutopilotSession(session: MetaSession): boolean {
  return session.mode === 'subscription' && (session.metadata?.[KIDS_PRODUCT_META_KEY] ?? '').trim() === KIDS_AUTOPILOT_ID
}
/** A assinatura (objeto Subscription) do piloto infantil: metadata.kids_product gravada em subscription_data ao abrir a sessão. */
export function isKidsSubscription(sub: { metadata?: Record<string, string> | null }): boolean {
  return (sub.metadata?.[KIDS_PRODUCT_META_KEY] ?? '').trim() === KIDS_AUTOPILOT_ID
}
/** O pedido lido da metadata da sessão/assinatura (character/language/theme) — inválido = null (o webhook grava o padrão 'leo'/'en'). */
export function kidsSeriesFromMetadata(meta: Record<string, string> | null | undefined): KidsSeriesRequest {
  const v = validateKidsSeriesRequest({ character: meta?.kids_character, language: meta?.kids_language, theme: meta?.kids_theme ?? '' })
  return v.ok ? v.value : { character: KIDS_CHARACTER_IDS[0], language: 'en', theme: '' }
}
/** A URL do checkout (GET; sem sessão leva ao login e retoma). O preço NUNCA vai na URL. */
export function kidsCheckoutHref(kind: 'autopilot' | 'pack', req: KidsSeriesRequest): string {
  const q = new URLSearchParams({ pack: kind === 'pack' ? KIDS_PACK_ID : KIDS_AUTOPILOT_ID, character: req.character, language: req.language })
  if (req.theme) q.set('theme', req.theme)
  return `/api/stripe/checkout?${q.toString()}`
}
/** O id de geração do despacho do cron: prende o filme à run (validCinematicGenerationId aceita [A-Za-z0-9_-]{8,100}). */
export function kidsGenerationId(runId: string): string {
  return `kids-${String(runId).replace(/[^A-Za-z0-9_-]/g, '')}`.slice(0, 100)
}

/** "US$29" / "US$49" — sem ".00" fantasma. */
export function kidsPriceLabel(minor: number): string {
  const v = minor / 100
  return `US$${Number.isInteger(v) ? v : v.toFixed(2)}`
}

/** Eventos (todos de servidor). */
export const KIDS_EVENTS = {
  orderCreated: 'kids_order_created',
  cycleRenewed: 'kids_cycle_renewed',
  orderCancelled: 'kids_order_cancelled',
  orderPaused: 'kids_order_paused',
  sampleRequested: 'kids_sample_requested',
  sampleRefused: 'kids_sample_refused',
  runDispatched: 'kids_run_dispatched',
  runDelivered: 'kids_run_delivered',
  runFailed: 'kids_run_failed',
  creditsFunded: 'kids_credits_funded',
  creditsClawedBack: 'kids_credits_clawed_back',
  passPaused: 'kids_pass_paused',
  capHit: 'kids_cycle_cap_hit',
  videoReadySent: 'kids_video_ready_sent',
  packDone: 'kids_pack_completed',
  checkoutRefused: 'kids_checkout_refused',
} as const

// ── OS CARTÕES (16 línguas) — sem prometer renda ─────────────────────────────────────────────────────────────────────────
export interface KidsVendaCopy {
  title: string
  /** {price} */ autopilot: string
  autopilotNote: string
  /** {price} */ pack: string
  packNote: string
  sample: string
  honest: string
  ctaAutopilot: string
  ctaPack: string
  ctaSample: string
  ctaOpen: string
}
export const KIDS_VENDA_COPY: Record<string, KidsVendaCopy> = {
  en: { title: 'Kids cartoon plans', autopilot: 'Channel on autopilot — {price}/month', autopilotNote: '1 new episode a day (30 per month from your sign-up date), same character, your theme, with title, caption and hashtags. Delivered to your library + e-mail.', pack: 'Pack of 30 episodes — {price} once', packNote: '30 episodes of the same character and theme, made in a queue over a few hours. Download all from your library.', sample: 'First episode free, with watermark (1 per account).', honest: 'Made for kids content: no income promises; label it as AI-generated when you post.', ctaAutopilot: 'Start the autopilot — {price}/mo', ctaPack: 'Buy the pack — {price}', ctaSample: 'Get my free episode', ctaOpen: 'Open kids cartoons' },
  pt: { title: 'Planos de desenho infantil', autopilot: 'Canal no piloto automático — {price}/mês', autopilotNote: '1 episódio novo por dia (30 por mês contados da data da assinatura), mesmo personagem, seu tema, com título, legenda e hashtags. Entregue na biblioteca + e-mail.', pack: 'Pack de 30 episódios — {price} único', packNote: '30 episódios do mesmo personagem e tema, feitos em fila ao longo de algumas horas. Baixe todos da biblioteca.', sample: 'Primeiro episódio grátis, com marca-d’água (1 por conta).', honest: 'Conteúdo para crianças: sem promessa de renda; marque como feito com IA ao postar.', ctaAutopilot: 'Ligar o piloto — {price}/mês', ctaPack: 'Comprar o pack — {price}', ctaSample: 'Quero meu episódio grátis', ctaOpen: 'Abrir desenhos infantis' },
  es: { title: 'Planes de dibujos infantiles', autopilot: 'Canal en piloto automático — {price}/mes', autopilotNote: '1 episodio nuevo al día (30 al mes desde la fecha de suscripción), mismo personaje, tu tema, con título, descripción y hashtags. En tu biblioteca + e-mail.', pack: 'Pack de 30 episodios — {price} único', packNote: '30 episodios del mismo personaje y tema, hechos en cola durante unas horas. Descárgalos todos desde la biblioteca.', sample: 'Primer episodio gratis, con marca de agua (1 por cuenta).', honest: 'Contenido para niños: sin promesas de ingresos; márcalo como hecho con IA al publicar.', ctaAutopilot: 'Activar el piloto — {price}/mes', ctaPack: 'Comprar el pack — {price}', ctaSample: 'Quiero mi episodio gratis', ctaOpen: 'Abrir dibujos infantiles' },
  fr: { title: 'Formules dessins animés enfants', autopilot: 'Chaîne en pilote automatique — {price}/mois', autopilotNote: '1 nouvel épisode par jour (30 par mois à partir de la date d’abonnement), même personnage, votre thème, avec titre, légende et hashtags. Livré dans votre bibliothèque + e-mail.', pack: 'Pack de 30 épisodes — {price} une fois', packNote: '30 épisodes du même personnage et thème, produits en file sur quelques heures. Tout télécharger depuis la bibliothèque.', sample: 'Premier épisode gratuit, avec filigrane (1 par compte).', honest: 'Contenu pour enfants : aucune promesse de revenus ; indiquez « généré par IA » à la publication.', ctaAutopilot: 'Lancer le pilote — {price}/mois', ctaPack: 'Acheter le pack — {price}', ctaSample: 'Mon épisode gratuit', ctaOpen: 'Ouvrir les dessins animés' },
  de: { title: 'Kinder-Cartoon-Pakete', autopilot: 'Kanal auf Autopilot — {price}/Monat', autopilotNote: '1 neue Folge pro Tag (30 pro Monat ab Abo-Datum), gleiche Figur, Ihr Thema, mit Titel, Beschreibung und Hashtags. In Ihre Bibliothek + E-Mail.', pack: 'Paket mit 30 Folgen — {price} einmalig', packNote: '30 Folgen derselben Figur und desselben Themas, in einer Warteschlange über einige Stunden. Alle aus der Bibliothek herunterladen.', sample: 'Erste Folge gratis, mit Wasserzeichen (1 pro Konto).', honest: 'Inhalte für Kinder: keine Einnahmeversprechen; beim Posten als KI-generiert kennzeichnen.', ctaAutopilot: 'Autopilot starten — {price}/Monat', ctaPack: 'Paket kaufen — {price}', ctaSample: 'Meine Gratis-Folge', ctaOpen: 'Kinder-Cartoons öffnen' },
  it: { title: 'Piani cartoni per bambini', autopilot: 'Canale con pilota automatico — {price}/mese', autopilotNote: '1 nuovo episodio al giorno (30 al mese dalla data di abbonamento), stesso personaggio, il tuo tema, con titolo, didascalia e hashtag. Nella tua libreria + e-mail.', pack: 'Pacchetto da 30 episodi — {price} una tantum', packNote: '30 episodi dello stesso personaggio e tema, prodotti in coda nel giro di qualche ora. Scaricali tutti dalla libreria.', sample: 'Primo episodio gratis, con filigrana (1 per account).', honest: 'Contenuti per bambini: nessuna promessa di guadagno; indica che è generato con IA quando pubblichi.', ctaAutopilot: 'Avvia il pilota — {price}/mese', ctaPack: 'Compra il pacchetto — {price}', ctaSample: 'Il mio episodio gratis', ctaOpen: 'Apri i cartoni' },
  nl: { title: 'Kindercartoon-plannen', autopilot: 'Kanaal op automatische piloot — {price}/maand', autopilotNote: '1 nieuwe aflevering per dag (30 per maand vanaf je abonnementsdatum), hetzelfde personage, jouw thema, met titel, bijschrift en hashtags. In je bibliotheek + e-mail.', pack: 'Pakket van 30 afleveringen — {price} eenmalig', packNote: '30 afleveringen van hetzelfde personage en thema, in een wachtrij over enkele uren. Download alles uit je bibliotheek.', sample: 'Eerste aflevering gratis, met watermerk (1 per account).', honest: 'Content voor kinderen: geen inkomstenbeloftes; label het als AI-gegenereerd bij het plaatsen.', ctaAutopilot: 'Start de piloot — {price}/mnd', ctaPack: 'Koop het pakket — {price}', ctaSample: 'Mijn gratis aflevering', ctaOpen: 'Kindercartoons openen' },
  pl: { title: 'Plany bajek dla dzieci', autopilot: 'Kanał na autopilocie — {price}/mies.', autopilotNote: '1 nowy odcinek dziennie (30 miesięcznie od daty subskrypcji), ta sama postać, Twój temat, z tytułem, opisem i hashtagami. Do biblioteki + e-mail.', pack: 'Pakiet 30 odcinków — {price} jednorazowo', packNote: '30 odcinków tej samej postaci i tematu, tworzonych w kolejce przez kilka godzin. Pobierz wszystkie z biblioteki.', sample: 'Pierwszy odcinek gratis, ze znakiem wodnym (1 na konto).', honest: 'Treści dla dzieci: bez obietnic zarobku; oznacz jako wygenerowane przez AI przy publikacji.', ctaAutopilot: 'Włącz autopilota — {price}/mies.', ctaPack: 'Kup pakiet — {price}', ctaSample: 'Mój darmowy odcinek', ctaOpen: 'Otwórz bajki' },
  tr: { title: 'Çocuk çizgi film planları', autopilot: 'Otomatik pilotta kanal — {price}/ay', autopilotNote: 'Günde 1 yeni bölüm (abonelik tarihinden itibaren ayda 30), aynı karakter, sizin temanız, başlık, açıklama ve hashtag’lerle. Kitaplığınıza + e-posta.', pack: '30 bölümlük paket — {price} tek seferlik', packNote: 'Aynı karakter ve temadan 30 bölüm, birkaç saat içinde sırayla üretilir. Hepsini kitaplıktan indirin.', sample: 'İlk bölüm ücretsiz, filigranlı (hesap başına 1).', honest: 'Çocuk içeriği: gelir vaadi yok; paylaşırken yapay zekâ ile üretildi olarak işaretleyin.', ctaAutopilot: 'Pilotu başlat — {price}/ay', ctaPack: 'Paketi al — {price}', ctaSample: 'Ücretsiz bölümüm', ctaOpen: 'Çizgi filmleri aç' },
  ru: { title: 'Планы детских мультфильмов', autopilot: 'Канал на автопилоте — {price}/мес.', autopilotNote: '1 новая серия в день (30 в месяц с даты подписки), тот же персонаж, ваша тема, с названием, описанием и хэштегами. В вашу библиотеку + e-mail.', pack: 'Пакет из 30 серий — {price} разово', packNote: '30 серий с тем же персонажем и темой, создаются в очереди за несколько часов. Скачайте все из библиотеки.', sample: 'Первая серия бесплатно, с водяным знаком (1 на аккаунт).', honest: 'Контент для детей: без обещаний дохода; при публикации отмечайте как созданное ИИ.', ctaAutopilot: 'Включить автопилот — {price}/мес.', ctaPack: 'Купить пакет — {price}', ctaSample: 'Моя бесплатная серия', ctaOpen: 'Открыть мультфильмы' },
  uk: { title: 'Плани дитячих мультфільмів', autopilot: 'Канал на автопілоті — {price}/міс.', autopilotNote: '1 нова серія на день (30 на місяць від дати підписки), той самий персонаж, ваша тема, з назвою, описом і хештегами. У вашу бібліотеку + e-mail.', pack: 'Пакет із 30 серій — {price} разово', packNote: '30 серій того самого персонажа й теми, створюються в черзі за кілька годин. Завантажте всі з бібліотеки.', sample: 'Перша серія безкоштовно, з водяним знаком (1 на акаунт).', honest: 'Контент для дітей: без обіцянок доходу; позначайте як створене ШІ при публікації.', ctaAutopilot: 'Увімкнути автопілот — {price}/міс.', ctaPack: 'Купити пакет — {price}', ctaSample: 'Моя безкоштовна серія', ctaOpen: 'Відкрити мультфільми' },
  ar: { title: 'باقات رسوم الأطفال', autopilot: 'قناة بالطيار الآلي — {price}/شهر', autopilotNote: 'حلقة جديدة كل يوم (30 شهريًا من تاريخ الاشتراك)، نفس الشخصية، موضوعك، مع عنوان ووصف ووسوم. تُسلَّم إلى مكتبتك + بريد إلكتروني.', pack: 'باقة 30 حلقة — {price} مرة واحدة', packNote: '30 حلقة بنفس الشخصية والموضوع، تُنتَج في طابور خلال بضع ساعات. نزّلها كلها من المكتبة.', sample: 'الحلقة الأولى مجانًا بعلامة مائية (1 لكل حساب).', honest: 'محتوى للأطفال: بلا وعود دخل؛ ضع علامة «مولَّد بالذكاء الاصطناعي» عند النشر.', ctaAutopilot: 'تشغيل الطيار الآلي — {price}/شهر', ctaPack: 'شراء الباقة — {price}', ctaSample: 'حلقتي المجانية', ctaOpen: 'فتح رسوم الأطفال' },
  ur: { title: 'بچوں کے کارٹون پلان', autopilot: 'آٹو پائلٹ پر چینل — {price}/ماہ', autopilotNote: 'روزانہ 1 نئی قسط (سبسکرپشن کی تاریخ سے ماہانہ 30)، وہی کردار، آپ کا موضوع، عنوان، کیپشن اور ہیش ٹیگز کے ساتھ۔ آپ کی لائبریری + ای میل میں۔', pack: '30 اقساط کا پیک — {price} ایک بار', packNote: 'ایک ہی کردار اور موضوع کی 30 اقساط، چند گھنٹوں میں قطار میں بنتی ہیں۔ سب لائبریری سے ڈاؤن لوڈ کریں۔', sample: 'پہلی قسط مفت، واٹر مارک کے ساتھ (فی اکاؤنٹ 1)۔', honest: 'بچوں کا مواد: آمدنی کا کوئی وعدہ نہیں؛ پوسٹ کرتے وقت AI سے بنا ہوا لکھیں۔', ctaAutopilot: 'آٹو پائلٹ شروع کریں — {price}/ماہ', ctaPack: 'پیک خریدیں — {price}', ctaSample: 'میری مفت قسط', ctaOpen: 'کارٹون کھولیں' },
  hi: { title: 'बच्चों के कार्टून प्लान', autopilot: 'ऑटोपायलट पर चैनल — {price}/माह', autopilotNote: 'रोज़ 1 नया एपिसोड (सब्सक्रिप्शन की तारीख़ से महीने में 30), वही किरदार, आपकी थीम, टाइटल, कैप्शन और हैशटैग के साथ। आपकी लाइब्रेरी + ई-मेल में।', pack: '30 एपिसोड का पैक — {price} एक बार', packNote: 'एक ही किरदार और थीम के 30 एपिसोड, कुछ घंटों में कतार में बनते हैं। सब लाइब्रेरी से डाउनलोड करें।', sample: 'पहला एपिसोड मुफ़्त, वॉटरमार्क के साथ (प्रति खाता 1)।', honest: 'बच्चों के लिए सामग्री: कमाई का कोई वादा नहीं; पोस्ट करते समय AI से बना हुआ लेबल लगाएँ।', ctaAutopilot: 'ऑटोपायलट शुरू करें — {price}/माह', ctaPack: 'पैक ख़रीदें — {price}', ctaSample: 'मेरा मुफ़्त एपिसोड', ctaOpen: 'कार्टून खोलें' },
  id: { title: 'Paket kartun anak', autopilot: 'Kanal dengan autopilot — {price}/bulan', autopilotNote: '1 episode baru per hari (30 per bulan sejak tanggal berlangganan), karakter yang sama, tema Anda, dengan judul, keterangan, dan tagar. Masuk ke pustaka + e-mail.', pack: 'Paket 30 episode — {price} sekali bayar', packNote: '30 episode dengan karakter dan tema yang sama, dibuat dalam antrean selama beberapa jam. Unduh semua dari pustaka.', sample: 'Episode pertama gratis, dengan tanda air (1 per akun).', honest: 'Konten untuk anak: tanpa janji penghasilan; beri label buatan AI saat memposting.', ctaAutopilot: 'Mulai autopilot — {price}/bln', ctaPack: 'Beli paket — {price}', ctaSample: 'Episode gratis saya', ctaOpen: 'Buka kartun anak' },
  vi: { title: 'Gói hoạt hình thiếu nhi', autopilot: 'Kênh chạy tự động — {price}/tháng', autopilotNote: '1 tập mới mỗi ngày (30 tập/tháng tính từ ngày đăng ký), cùng nhân vật, chủ đề của bạn, có tiêu đề, chú thích và hashtag. Giao vào thư viện + e-mail.', pack: 'Gói 30 tập — {price} một lần', packNote: '30 tập cùng nhân vật và chủ đề, làm theo hàng đợi trong vài giờ. Tải tất cả từ thư viện.', sample: 'Tập đầu miễn phí, có watermark (1 tập/tài khoản).', honest: 'Nội dung cho trẻ em: không hứa hẹn thu nhập; gắn nhãn tạo bằng AI khi đăng.', ctaAutopilot: 'Bật chế độ tự động — {price}/tháng', ctaPack: 'Mua gói — {price}', ctaSample: 'Tập miễn phí của tôi', ctaOpen: 'Mở hoạt hình thiếu nhi' },
}
const fill = (s: string, v: Record<string, string | number>): string => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m))
/** As frases do cartão com os preços DAQUI (língua desconhecida = inglês). */
export function kidsVendaCardText(lang: string | null | undefined) {
  const code = typeof lang === 'string' && KIDS_VENDA_COPY[lang] ? lang : 'en'
  const c = KIDS_VENDA_COPY[code]
  const pa = kidsPriceLabel(KIDS_PRICES.autopilot.usdMinor)
  const pp = kidsPriceLabel(KIDS_PRICES.pack.usdMinor)
  return {
    title: c.title,
    autopilot: fill(c.autopilot, { price: pa }), autopilotNote: c.autopilotNote,
    pack: fill(c.pack, { price: pp }), packNote: c.packNote,
    sample: c.sample, honest: c.honest,
    ctaAutopilot: fill(c.ctaAutopilot, { price: pa }), ctaPack: fill(c.ctaPack, { price: pp }), ctaSample: c.ctaSample, ctaOpen: c.ctaOpen,
  }
}

/** O e-mail "seu vídeo de hoje está pronto" (EN/PT/ES — a língua do pedido). */
export function kidsReadyEmailCopy(language: KidsCartoonLanguage, i: { title: string; seq: number; total: number; kind: KidsOrderKind }): { subject: string; text: string } {
  const n = `${i.seq}/${i.total}`
  if (language === 'pt') return { subject: i.kind === 'autopilot' ? 'Seu desenho de hoje está pronto 🎬' : `Episódio ${n} pronto 🎬`, text: `"${i.title}" já está na sua biblioteca (${n}). Abra, baixe e poste — lembre de marcar como feito com IA.` }
  if (language === 'es') return { subject: i.kind === 'autopilot' ? 'Tu dibujo de hoy está listo 🎬' : `Episodio ${n} listo 🎬`, text: `"${i.title}" ya está en tu biblioteca (${n}). Ábrelo, descárgalo y publícalo — recuerda marcarlo como hecho con IA.` }
  return { subject: i.kind === 'autopilot' ? 'Your cartoon for today is ready 🎬' : `Episode ${n} is ready 🎬`, text: `"${i.title}" is in your library (${n}). Open it, download it and post it — remember to label it as made with AI.` }
}
