// KINEO-PREVIA-CENAS-2026-10-03 — "Prévia das cenas" para quem nasceu fora do filme grátis (trial_status='region_paid_only').
//
// O PORQUÊ (medido no banco em 03/10 pela sessão CEO): desde a saída B (29/09, lib/freeFilmPolicy.ts) quem é de país fora
// da lista nasce com 0 crédito e todo motor recusa — 28 cadastros, 0% fizeram filme, 0 pagantes. A pessoa batia numa
// parede no clique mais quente do produto. Agora, no lugar da parede, ela vê o PRODUTO funcionando por centavos: o roteiro
// do filme (o mesmo escritor da /api/generate-script) e 3 a 4 imagens das cenas no modelo de imagem mais barato da casa
// (FLUX schnell, o mesmo slug e a mesma entrada do /images). Nada de vídeo, nada de voz. O pedido de pagamento chega no
// pico do interesse ("Transformar em filme"), e a ideia + o roteiro ficam guardados para sair com 1 clique depois de pagar.
//
// HONESTIDADE: prévia é prévia. A tela diz que o filme é feito por um motor de vídeo e não sai idêntico às imagens.
//
// MÓDULO PURO (sem import em tempo de execução): a rota (app/api/scene-preview), a tela (/studio/previa), o desvio do
// Gerar (/studio/create) e o guardião (scripts/test-previa-cenas-2026-10-03.mjs) leem as MESMAS regras.

/** Interruptor em código (env da Vercel nos dá 403). Nasce ligado por ordem do fundador (03/10). */
export const PREVIA_CENAS_PUBLIC = true

// ── travas (todas conferidas no servidor ANTES de qualquer fornecedor) ──────────────────────────────────────────────
export const PREVIA_PER_ACCOUNT_PER_DAY = 1
export const PREVIA_PER_ACCOUNT_TOTAL = 3
export const PREVIA_GLOBAL_PER_DAY = 200
export const PREVIA_DAY_MS = 24 * 60 * 60 * 1000
export const PREVIA_IDEA_MIN = 8
export const PREVIA_IDEA_MAX = 2000
export const PREVIA_MIN_SCENES = 3
export const PREVIA_MAX_SCENES = 4
/** O filme da prévia: o mesmo alvo da cota grátis dos países da lista (Seedance 1.5, 15 s). */
export const PREVIA_TARGET_SECONDS = 15
export const PREVIA_ENGINE_STUDIO_KEY = 'seedance'
export const PREVIA_ENGINE_QUALITY = 'cinematic_ai'

// ── eventos (todos de servidor, com user_id) ────────────────────────────────────────────────────────────────────────
export const PREVIA_EVENTS = {
  requested: 'scene_preview_requested',
  shown: 'scene_preview_shown',
  refused: 'scene_preview_refused',
  ctaClicked: 'scene_preview_cta_clicked',
} as const
/** A reserva (scene_preview_requested) nasce 'reserved' e termina 'shown' ou 'failed'. Falha do fornecedor libera a vaga. */
export type PreviaReservationStatus = 'reserved' | 'shown' | 'failed'
export const PREVIA_COUNTED_STATUSES: readonly PreviaReservationStatus[] = ['reserved', 'shown']

// ── imagem: o modelo mais barato da casa (MESMO slug e entrada de app/api/images/generate MODELS.schnell) ──────────────
export const PREVIA_IMAGE_SLUG = 'fal-ai/flux/schnell'
export const PREVIA_IMAGE_SIZE = 'portrait_16_9' as const
export function previaImageInput(prompt: string): { prompt: string; image_size: 'portrait_16_9'; num_inference_steps: number; enable_safety_checker: boolean } {
  return { prompt, image_size: PREVIA_IMAGE_SIZE, num_inference_steps: 4, enable_safety_checker: true }
}
/** Megapixels de uma imagem portrait_16_9 na fal (576 × 1024). É o que a fal fatura no schnell (por megapixel). */
export const PREVIA_IMAGE_MEGAPIXELS = (576 * 1024) / 1_000_000

// ── quem pode ───────────────────────────────────────────────────────────────────────────────────────────────────────
export interface PreviaProfile {
  trial_status?: string | null
  has_paid?: boolean | null
  plan?: string | null
  video_credits?: number | null
}
/**
 * Elegível = a MESMA régua de regionPaidOnlyNoticeVisible (lib/freeFilmPolicy.ts): trial_status 'region_paid_only',
 * has_paid != true, plano grátis. Espelhada aqui sem import (módulo puro); o guardião confere que as duas concordam.
 */
export function previaEligible(row: PreviaProfile | null | undefined, publicFlag: boolean = PREVIA_CENAS_PUBLIC): boolean {
  if (!publicFlag || !row || row.trial_status !== 'region_paid_only') return false
  if (row.has_paid === true) return false
  const plan = typeof row.plan === 'string' ? row.plan.trim().toLowerCase() : 'free'
  return plan === 'free' || plan === ''
}

/**
 * O Gerar do Studio (despacho para /studio/create) vira prévia? Só a conta elegível, só no despacho do Studio (studio=1 ou
 * autoanalyze=1, com ideia), e só quando o saldo NÃO paga o filme pedido — quem tem crédito (cortesia do admin) segue o
 * caminho de sempre. Nunca desvia link de e-mail, retomada de checkout ou criação automática.
 */
export function shouldRouteGenerateToPreview(args: {
  profile: PreviaProfile | null | undefined
  params: { studio?: string | null; autoanalyze?: string | null; prompt?: string | null; create_intent?: string | null; resume?: string | null }
  filmCost: number | null
  publicFlag?: boolean
}): boolean {
  if (!previaEligible(args.profile, args.publicFlag ?? PREVIA_CENAS_PUBLIC)) return false
  const p = args.params
  if (p.studio !== '1' && p.autoanalyze !== '1') return false
  if (p.create_intent || p.resume) return false
  if (typeof p.prompt !== 'string' || p.prompt.trim().length < PREVIA_IDEA_MIN) return false
  const balance = typeof args.profile?.video_credits === 'number' ? args.profile.video_credits : 0
  const cost = typeof args.filmCost === 'number' && args.filmCost > 0 ? args.filmCost : 1
  return balance < cost
}

/** Destino do desvio: a tela da prévia com a ideia (e o que a pessoa escolheu) — nunca gera nada sozinha. */
export function previaPath(params: { prompt: string; engine?: string | null; duration?: string | null; language?: string | null }): string {
  const q = new URLSearchParams({ prompt: params.prompt.slice(0, PREVIA_IDEA_MAX), from: 'generate' })
  if (params.engine && /^[a-z0-9_]{1,24}$/.test(params.engine)) q.set('engine', params.engine)
  if (params.duration && /^\d{1,3}$/.test(params.duration)) q.set('duration', params.duration)
  if (params.language && /^[a-z]{2}$/.test(params.language)) q.set('language', params.language)
  return `/studio/previa?${q.toString()}`
}

// ── decisão das travas (a rota passa as contagens; aqui só a regra) ────────────────────────────────────────────────
export type PreviaRefusalReason =
  | 'not_eligible' | 'idea_too_short' | 'idea_too_long' | 'daily_limit' | 'total_limit' | 'global_limit' | 'moderation'
  | 'moderation_unavailable' | 'script_failed' | 'images_failed' | 'busy'

export function decidePreviaLimits(c: { accountLastDay: number; accountTotal: number; globalLastDay: number }): PreviaRefusalReason | null {
  if (c.accountTotal >= PREVIA_PER_ACCOUNT_TOTAL) return 'total_limit'
  if (c.accountLastDay >= PREVIA_PER_ACCOUNT_PER_DAY) return 'daily_limit'
  if (c.globalLastDay >= PREVIA_GLOBAL_PER_DAY) return 'global_limit'
  return null
}

/**
 * Depois de gravar a própria reserva, a rota reconta em ordem (created_at, id): só passa quem cabe nos tetos contando a
 * partir do começo. Dois cliques ao mesmo tempo gravam duas reservas; a segunda se vê além do teto e é recusada.
 */
export function reservationWins(args: { myId: string | number; accountDayIds: readonly (string | number)[]; accountAllIds: readonly (string | number)[]; globalDayIds: readonly (string | number)[] }): PreviaRefusalReason | null {
  const pos = (ids: readonly (string | number)[]) => ids.map(String).indexOf(String(args.myId))
  const a = pos(args.accountAllIds)
  const d = pos(args.accountDayIds)
  const g = pos(args.globalDayIds)
  if (a < 0 || d < 0 || g < 0) return 'busy'
  if (a >= PREVIA_PER_ACCOUNT_TOTAL) return 'total_limit'
  if (d >= PREVIA_PER_ACCOUNT_PER_DAY) return 'daily_limit'
  if (g >= PREVIA_GLOBAL_PER_DAY) return 'global_limit'
  return null
}

// ── roteiro → cenas ─────────────────────────────────────────────────────────────────────────────────────────────────
export interface PreviaScene { label: string; cue: string; text: string }
const SECTION_RE = /^\s*(HOOK|MICRO REWARD\s*\d|ESCALATION|RHYTHM|PAYOFF)\b[^:\n]*:\s*/i
/** O roteiro estruturado (HOOK / MICRO REWARD / … / PAYOFF, com [Pexels: …]) vira cenas. Nunca lança. */
export function parsePreviaScenes(script: unknown): PreviaScene[] {
  if (typeof script !== 'string') return []
  const out: PreviaScene[] = []
  let cur: PreviaScene | null = null
  for (const raw of script.split(/\r?\n/)) {
    const m = raw.match(SECTION_RE)
    if (m) {
      if (cur) out.push(cur)
      cur = { label: m[1].toUpperCase().replace(/\s+/g, ' '), cue: '', text: '' }
      const rest = raw.slice(m[0].length)
      appendLine(cur, rest)
    } else if (cur) {
      appendLine(cur, raw)
    }
  }
  if (cur) out.push(cur)
  return out.filter((s) => s.text.length > 0 || s.cue.length > 0)
}
function appendLine(s: PreviaScene, line: string) {
  let rest = line
  const cue = rest.match(/\[(?:Pexels|Footage|Visual)\s*:\s*([^\]]+)\]/i)
  if (cue && !s.cue) s.cue = cue[1].trim().slice(0, 120)
  rest = rest.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim()
  if (rest) s.text = `${s.text} ${rest}`.trim().slice(0, 400)
}

/** As cenas que viram imagem: até 4, priorizando gancho, as recompensas e o fecho (RHYTHM não tem imagem própria). */
export function pickPreviaScenes(scenes: readonly PreviaScene[]): PreviaScene[] {
  const visual = scenes.filter((s) => s.label !== 'RHYTHM' && (s.cue || s.text))
  if (visual.length <= PREVIA_MAX_SCENES) return visual.slice()
  const hook = visual.find((s) => s.label === 'HOOK')
  const payoff = visual.find((s) => s.label === 'PAYOFF')
  const middle = visual.filter((s) => s !== hook && s !== payoff)
  const picked = [hook, ...middle.slice(0, PREVIA_MAX_SCENES - (hook ? 1 : 0) - (payoff ? 1 : 0)), payoff].filter((s): s is PreviaScene => !!s)
  return picked.slice(0, PREVIA_MAX_SCENES)
}

/** Prompt da imagem da cena (inglês, sem texto na imagem, sem pessoa famosa). */
export function previaImagePrompt(scene: PreviaScene): string {
  const what = scene.cue || scene.text.split(/(?<=[.!?])\s/)[0] || scene.text
  return `Cinematic vertical film still: ${what.slice(0, 160)}. Photorealistic, dramatic natural light, shallow depth of field, rich color grade. No text, no letters, no captions, no logos, no watermark.`
}

/** Custo estimado da prévia em US$ — só com preços passados pela rota; sem preço conhecido, null (DESCONHECIDO). */
export function previaCostEstimate(args: { images: number; usdPerMegapixel: number | null; scriptUsd: number | null }): number | null {
  if (args.usdPerMegapixel === null || args.scriptUsd === null) return null
  return Math.round((args.images * PREVIA_IMAGE_MEGAPIXELS * args.usdPerMegapixel + args.scriptUsd) * 10000) / 10000
}

// ── textos (pt/en/es; outras línguas da interface caem no inglês) ──────────────────────────────────────────────────
export interface PreviaCopy {
  title: string
  sub: string
  ideaLabel: string
  cta: string
  working: string
  honest: string
  scriptTitle: string
  scenesTitle: string
  toFilm: string
  toFilmHint: string
  left: string
  refused: Record<PreviaRefusalReason, string>
  resumeTitle: string
  resumeBody: string
  resumeCta: string
  bannerPreview: string
}
export const PREVIA_COPY: { en: PreviaCopy; pt: PreviaCopy; es: PreviaCopy } = {
  en: {
    title: 'See a free preview of your film',
    sub: 'Kineo writes the script and shows your scenes as images — free. When you like it, turn it into the film.',
    ideaLabel: 'Your idea',
    cta: 'See free preview',
    working: 'Writing the script and drawing your scenes… about 30 seconds.',
    honest: 'This is a preview: the film is made by a video engine from the same script, so it will not look exactly like these images.',
    scriptTitle: 'Your script',
    scenesTitle: 'Your scenes',
    toFilm: 'Turn into a film',
    toFilmHint: 'Pick a plan and your idea and script stay saved — the film is one click away after you pay.',
    left: '{n} free previews left',
    refused: {
      not_eligible: 'The free preview is for accounts that cannot make a free film yet.',
      idea_too_short: 'Write a little more about your idea (at least a short sentence).',
      idea_too_long: 'Your idea is too long for a preview — keep it under 2,000 characters.',
      daily_limit: 'You already used today’s free preview. Come back tomorrow, or turn your idea into a film now.',
      total_limit: 'You used all your free previews. Pick a plan to turn your idea into a film.',
      global_limit: 'Free previews are paused for today because of demand. Try again tomorrow.',
      moderation: 'This idea can’t be previewed. Try a different idea.',
      moderation_unavailable: 'We couldn’t check your idea right now. Nothing was used — try again in a minute.',
      script_failed: 'The script didn’t come out this time. Nothing was used — try again in a minute.',
      images_failed: 'The scene images didn’t come out this time. Nothing was used — try again in a minute.',
      busy: 'Another preview is being made. Wait a moment and try again.',
    },
    resumeTitle: 'Your preview is ready to become a film',
    resumeBody: 'Your idea and script are saved. Open them in the Studio and press Generate.',
    resumeCta: 'Make my film',
    bannerPreview: 'See a free preview',
  },
  pt: {
    title: 'Veja uma prévia grátis do seu filme',
    sub: 'A Kineo escreve o roteiro e mostra as suas cenas em imagens — grátis. Gostou? Transforme no filme.',
    ideaLabel: 'Sua ideia',
    cta: 'Ver prévia grátis',
    working: 'Escrevendo o roteiro e desenhando as cenas… uns 30 segundos.',
    honest: 'Isto é uma prévia: o filme é feito por um motor de vídeo a partir do mesmo roteiro, então não sai idêntico a estas imagens.',
    scriptTitle: 'Seu roteiro',
    scenesTitle: 'Suas cenas',
    toFilm: 'Transformar em filme',
    toFilmHint: 'Escolha um plano e a sua ideia e o roteiro ficam guardados — o filme sai com 1 clique depois de pagar.',
    left: '{n} prévias grátis restantes',
    refused: {
      not_eligible: 'A prévia grátis é para contas que ainda não podem fazer o filme grátis.',
      idea_too_short: 'Escreva um pouco mais sobre a sua ideia (pelo menos uma frase curta).',
      idea_too_long: 'A ideia está longa demais para a prévia — use até 2.000 caracteres.',
      daily_limit: 'Você já usou a prévia grátis de hoje. Volte amanhã ou transforme a sua ideia em filme agora.',
      total_limit: 'Você usou todas as prévias grátis. Escolha um plano para transformar a sua ideia em filme.',
      global_limit: 'As prévias grátis estão pausadas hoje por causa da procura. Tente amanhã.',
      moderation: 'Esta ideia não pode virar prévia. Tente outra ideia.',
      moderation_unavailable: 'Não conseguimos conferir a sua ideia agora. Nada foi usado — tente de novo em um minuto.',
      script_failed: 'O roteiro não saiu desta vez. Nada foi usado — tente de novo em um minuto.',
      images_failed: 'As imagens das cenas não saíram desta vez. Nada foi usado — tente de novo em um minuto.',
      busy: 'Outra prévia está sendo feita. Espere um instante e tente de novo.',
    },
    resumeTitle: 'Sua prévia está pronta para virar filme',
    resumeBody: 'A sua ideia e o roteiro estão guardados. Abra no Studio e aperte Gerar.',
    resumeCta: 'Fazer meu filme',
    bannerPreview: 'Ver prévia grátis',
  },
  es: {
    title: 'Mira una vista previa gratis de tu película',
    sub: 'Kineo escribe el guion y muestra tus escenas en imágenes — gratis. ¿Te gusta? Conviértela en la película.',
    ideaLabel: 'Tu idea',
    cta: 'Ver vista previa gratis',
    working: 'Escribiendo el guion y dibujando tus escenas… unos 30 segundos.',
    honest: 'Esto es una vista previa: la película la hace un motor de video a partir del mismo guion, así que no saldrá idéntica a estas imágenes.',
    scriptTitle: 'Tu guion',
    scenesTitle: 'Tus escenas',
    toFilm: 'Convertir en película',
    toFilmHint: 'Elige un plan y tu idea y el guion quedan guardados — la película sale con 1 clic después de pagar.',
    left: 'Te quedan {n} vistas previas gratis',
    refused: {
      not_eligible: 'La vista previa gratis es para cuentas que todavía no pueden hacer la película gratis.',
      idea_too_short: 'Escribe un poco más sobre tu idea (al menos una frase corta).',
      idea_too_long: 'Tu idea es demasiado larga para la vista previa — usa hasta 2.000 caracteres.',
      daily_limit: 'Ya usaste la vista previa gratis de hoy. Vuelve mañana o convierte tu idea en película ahora.',
      total_limit: 'Usaste todas tus vistas previas gratis. Elige un plan para convertir tu idea en película.',
      global_limit: 'Las vistas previas gratis están pausadas hoy por la demanda. Inténtalo mañana.',
      moderation: 'Esta idea no puede tener vista previa. Prueba otra idea.',
      moderation_unavailable: 'No pudimos revisar tu idea ahora. No se usó nada — inténtalo en un minuto.',
      script_failed: 'El guion no salió esta vez. No se usó nada — inténtalo en un minuto.',
      images_failed: 'Las imágenes de las escenas no salieron esta vez. No se usó nada — inténtalo en un minuto.',
      busy: 'Se está haciendo otra vista previa. Espera un momento e inténtalo de nuevo.',
    },
    resumeTitle: 'Tu vista previa está lista para ser película',
    resumeBody: 'Tu idea y el guion están guardados. Ábrelos en el Studio y pulsa Generar.',
    resumeCta: 'Hacer mi película',
    bannerPreview: 'Ver vista previa gratis',
  },
}

/** Chave do navegador que guarda ideia + roteiro para a volta depois de pagar (14 dias). */
export const PREVIA_RESUME_STORAGE_KEY = 'kineo:previa:v1'
export const PREVIA_RESUME_MAX_AGE_MS = 14 * PREVIA_DAY_MS
export interface PreviaResume { t: number; idea: string; script: string; language: string }
/** Link do Studio com o roteiro da prévia, verbatim, no motor da prévia — a pessoa só aperta Gerar. */
export function previaResumeStudioHref(r: PreviaResume): string {
  const q = new URLSearchParams({
    prompt: r.script.slice(0, 5000),
    engine: PREVIA_ENGINE_STUDIO_KEY,
    duration: String(PREVIA_TARGET_SECONDS),
    script_mode: 'verbatim',
    intent_campaign: 'scene_preview',
  })
  if (/^[a-z]{2}$/.test(r.language) && r.language !== 'en') q.set('language', r.language)
  return `/studio?${q.toString()}`
}
export function previaResumeValid(r: unknown, now: number): r is PreviaResume {
  if (!r || typeof r !== 'object') return false
  const x = r as Partial<PreviaResume>
  return typeof x.t === 'number' && now - x.t >= 0 && now - x.t < PREVIA_RESUME_MAX_AGE_MS && typeof x.script === 'string' && x.script.trim().length > 0 && typeof x.idea === 'string' && typeof x.language === 'string'
}
