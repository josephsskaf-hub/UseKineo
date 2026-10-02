// KINEO-PRODUCAO-ADS-2026-10-01 — "Produção": o fluxo que o fundador fez À MÃO em 01/10 para uma cliente (atriz
// consistente → planos → clipes → fala para a câmera → montagem com o logo), virado produto dentro do Ads.
//
// Módulo PURO (sem import de servidor, sem React): a tela (/ads/producao), as rotas (/api/ads/producao/plan e
// /api/ads/producao/montage) e o guardião (scripts/test-producao-ads-2026-10-01.mjs, que transpila e EXECUTA este
// arquivo) usam as MESMAS regras. As peças pagas já existem e NÃO são reescritas — só costuradas:
//   · personagem → /api/images/reference (foto, moderada, grátis) ou /api/images/generate (Nano Banana Pro, 5 cr) e
//                  /api/characters (salvar para reusar);
//   · planos     → /api/ads/producao/plan (grátis, teto diário) propõe 3 a 5 planos; a pessoa edita;
//   · prévia     → SÓ as imagens primeiro: /api/images/generate com a referência do personagem, 5 cr cada, aprovar/trocar
//                  por plano ANTES de qualquer vídeo;
//   · dar vida   → clipe pelo /api/clips (agora aceita a imagem gerada da própria conta, renders/images/<uid>/) ou FALA
//                  PARA A CÂMERA pelo /api/generate-avatar (fabric; voz feminina ou masculina escolhida, sem truque);
//   · montar     → /api/ads/producao/montage (Creatomate): ordem dos planos, transição de 0,4 s, a fala do avatar alinhada
//                  ao plano, narração opcional e CARTÃO FINAL de 3 s com o logo da conta em tela cheia. MP4 1080×1920.
// Selo honesto: o motor nomeado em cada passo é o motor real. Nada de marca de terceiros nos prompts.

export const PRODUCAO_VERSION = 'producao_ads_20261001'

// ═══ Interruptor ════════════════════════════════════════════════════════════════════════════════════════════════════
// false → só as contas da casa (lista EXATA do Ads, isAdsInternalEmail) veem a tela e as rotas respondem; o resto 404.
// Virar true só com: (1) render real aprovado pelo fundador; (2) preço da montagem decidido (PRODUCAO_MONTAGE_CREDITS
// deixa de ser null — o guardião recusa abrir com o preço "a definir").
export const PRODUCAO_PUBLIC = false
export function producaoVisibleFor(publicFlag: boolean, isInternal: boolean): boolean {
  return publicFlag || isInternal
}

// ═══ Preços (o que a tela mostra ANTES do clique) ═══════════════════════════════════════════════════════════════════
/** Nano Banana Pro no /api/images/generate (MODELS.nanobanana.cost) — com ou sem referência, o mesmo preço. */
export const PRODUCAO_IMAGE_CREDITS = 5
export const PRODUCAO_IMAGE_MODEL = 'nanobanana'
/** 9:16 no gerador de imagens (size 'portrait_16_9' → aspect_ratio 9:16). */
export const PRODUCAO_IMAGE_SIZE = 'portrait_16_9'
/** Fala para a câmera: /api/generate-avatar, engine fabric → AVATAR_CREDIT_COST (110). Espelho; o guardião confere. */
export const PRODUCAO_AVATAR_ENGINE = 'fabric'
export const PRODUCAO_AVATAR_CREDITS = 110
/** O avatar recusa (422, sem cobrar) menos de 12 s de fala (AVATAR_MIN_NARRATION_SECONDS na rota). */
export const PRODUCAO_AVATAR_MIN_SECONDS = 12
/** Narração opcional: /api/audio/generate, MiniMax Speech-2.8 HD = 2 cr a cada 1.000 caracteres (mínimo 1 bloco). */
export const PRODUCAO_NARRATION_MODEL = 'minimax'
export const PRODUCAO_NARRATION_CREDITS_PER_1K = 2
export function narrationCredits(text: string): number {
  const chars = String(text ?? '').trim().length
  if (chars === 0) return 0
  return Math.max(1, Math.ceil(chars / 1000)) * PRODUCAO_NARRATION_CREDITS_PER_1K
}
/**
 * Montagem (Creatomate): SEM tabela de preço — "preço novo = decisão do fundador". null = "preço a definir": a casa
 * monta sem cobrar enquanto PRODUCAO_PUBLIC = false. Custo real de referência no código: ~US$0,13 por vídeo de 15 s
 * (lib/ads/v2Tiers.ts ADS_V2_FIXED_USD_PARTS.creatomate), escalando com os segundos.
 */
export const PRODUCAO_MONTAGE_CREDITS: number | null = null
export const PRODUCAO_MONTAGE_USD_PER_15S = 0.13
export function montageUsdEstimate(seconds: number): number {
  const s = Number(seconds)
  if (!Number.isFinite(s) || s <= 0) return 0
  return Math.round((PRODUCAO_MONTAGE_USD_PER_15S * (s / 15)) * 100) / 100
}

// ═══ Personagem ═════════════════════════════════════════════════════════════════════════════════════════════════════
export type ProducaoCharacterKind = 'woman' | 'man' | 'mascot'
export const PRODUCAO_CHARACTER_KINDS: readonly ProducaoCharacterKind[] = ['woman', 'man', 'mascot']
export function isProducaoCharacterKind(v: unknown): v is ProducaoCharacterKind {
  return typeof v === 'string' && (PRODUCAO_CHARACTER_KINDS as readonly string[]).includes(v)
}
/** A frase de identidade que abre TODO prompt de plano (a referência do personagem vai junto no pedido). */
export function identityLine(kind: ProducaoCharacterKind): string {
  const who = kind === 'man' ? 'man' : kind === 'mascot' ? 'character' : 'woman'
  return `This exact ${who}, same face, hair and outfit`
}
/** Prompt do personagem criado por IA (sem referência): retrato de corpo inteiro, fundo neutro, sem texto nem marca. */
export function buildCharacterPrompt(kind: ProducaoCharacterKind, description: string): string {
  const d = cleanLine(description, 600)
  const base = kind === 'mascot'
    ? 'A friendly brand mascot character, full body, standing, facing the camera, clean studio background'
    : kind === 'man'
      ? 'A man in his natural everyday look, full body, standing, facing the camera, soft studio light, clean background'
      : 'A woman in her natural everyday look, full body, standing, facing the camera, soft studio light, clean background'
  return `${base}${d ? `. ${d}` : ''}. Vertical 9:16 photo. ${NO_TEXT_NO_BRANDS}`
}

// ═══ Modelos prontos (topo da tela) ═════════════════════════════════════════════════════════════════════════════════
export type ProducaoTemplateKey = 'ugc' | 'mascot' | 'app'
export type ProducaoShotMode = 'clip' | 'talk'

export interface ProducaoShot {
  title: string
  /** Prompt de imagem em INGLÊS, SEM a frase de identidade (a montagem do prompt a acrescenta). */
  imagePrompt: string
  /** Prompt de movimento em inglês (clipe). */
  motionPrompt: string
  mode: ProducaoShotMode
  /** Fala para a câmera (só no modo 'talk'), na língua do anúncio. */
  line: string
}

export interface ProducaoTemplate {
  key: ProducaoTemplateKey
  /** Rótulos da tela (inglês; a tela passa por UiLabel). */
  title: string
  sub: string
  characterKind: ProducaoCharacterKind
  /** Pista ao planejador (inglês). */
  planHint: string
  /** O pedido de exemplo do campo de ideia. */
  ideaExample: string
  /** A foto extra (produto/app) é pedida por este modelo? */
  productPhoto: 'optional' | 'recommended'
  fallback: ProducaoShot[]
}

const NO_TEXT_NO_BRANDS = 'No text, no letters, no logos, no brand names, no watermark.'

export const PRODUCAO_TEMPLATES: readonly ProducaoTemplate[] = [
  {
    key: 'ugc',
    title: 'Testimonial (UGC)',
    sub: 'A real-looking person tries your product and talks to the camera.',
    characterKind: 'woman',
    planHint: 'User-generated-content testimonial filmed on a phone: selfie framing, natural light, authentic home or street setting. Open and close with the person talking to the camera; the middle shows the product being used.',
    ideaExample: 'A busy mom tries our meal-prep service and tells her friends why she loves it.',
    productPhoto: 'optional',
    fallback: [
      { title: 'Hook to camera', imagePrompt: 'selfie framing, holding the phone at arm length, natural window light, cozy living room, excited expression', motionPrompt: 'handheld phone camera, subtle natural movement, she starts talking', mode: 'talk', line: '' },
      { title: 'Product in hand', imagePrompt: 'close-up, she holds the product toward the camera with a smile, kitchen counter, soft daylight', motionPrompt: 'slow push-in on the product, gentle handheld feel', mode: 'clip', line: '' },
      { title: 'Using it', imagePrompt: 'medium shot, she is using the product in her daily routine, warm natural light, candid moment', motionPrompt: 'smooth tracking shot following her hands, natural pace', mode: 'clip', line: '' },
      { title: 'The result', imagePrompt: 'medium close-up, she looks relieved and happy with the result, golden hour light through the window', motionPrompt: 'slow dolly-in, she smiles and nods', mode: 'clip', line: '' },
      { title: 'Recommendation', imagePrompt: 'selfie framing again, she points to the camera with confidence, same living room, natural light', motionPrompt: 'handheld phone camera, she speaks directly to the viewer', mode: 'talk', line: '' },
    ],
  },
  {
    key: 'mascot',
    title: 'Brand mascot',
    sub: 'Your mascot presents the business, scene after scene.',
    characterKind: 'mascot',
    planHint: 'A brand mascot is the star of every shot: friendly, expressive, colorful, cinematic 3D animation look. It introduces itself, shows the product or service, does something fun with it and invites the viewer.',
    ideaExample: 'Our coffee bean mascot welcomes people to the shop and shows the new iced latte.',
    productPhoto: 'optional',
    fallback: [
      { title: 'Hello!', imagePrompt: 'the mascot waves at the camera in front of the shop entrance, bright cheerful light, 3D animation look', motionPrompt: 'the mascot waves and bounces happily, slow push-in', mode: 'clip', line: '' },
      { title: 'Shows the product', imagePrompt: 'the mascot proudly presents the product on a table, close-up, vibrant colors, 3D animation look', motionPrompt: 'the mascot gestures toward the product, gentle orbit around the table', mode: 'clip', line: '' },
      { title: 'In action', imagePrompt: 'the mascot happily uses the product, dynamic angle, playful mood, 3D animation look', motionPrompt: 'energetic movement, the mascot jumps with joy, camera follows', mode: 'clip', line: '' },
      { title: 'Invitation', imagePrompt: 'the mascot looks straight at the camera with a big smile, centered, clean background, 3D animation look', motionPrompt: 'the mascot speaks to the viewer, subtle head movement', mode: 'talk', line: '' },
    ],
  },
  {
    key: 'app',
    title: 'Your app on the phone',
    sub: 'A person shows your app on a phone and explains why it helps.',
    characterKind: 'woman',
    planHint: 'A person shows a mobile app on a smartphone. Show the everyday problem, the person opening the app, a close-up of the phone screen (the app interface from the reference image when provided), the happy result, and a closing line to the camera.',
    ideaExample: 'A freelancer shows how our invoicing app gets her paid in two taps.',
    productPhoto: 'recommended',
    fallback: [
      { title: 'The problem', imagePrompt: 'she looks stressed at a messy desk full of papers, evening lamp light, realistic photo', motionPrompt: 'slow push-in, she sighs and rubs her forehead', mode: 'clip', line: '' },
      { title: 'Opens the app', imagePrompt: 'she picks up her smartphone and opens an app, over-the-shoulder shot, soft desk light', motionPrompt: 'over-the-shoulder camera, her thumb taps the screen', mode: 'clip', line: '' },
      { title: 'Phone screen', imagePrompt: 'close-up of the smartphone screen in her hand showing the app interface, shallow depth of field', motionPrompt: 'slow push-in on the phone screen, her thumb scrolls gently', mode: 'clip', line: '' },
      { title: 'Problem solved', imagePrompt: 'she smiles with relief, holding the phone, the desk is now organized, warm light', motionPrompt: 'gentle dolly-out, she relaxes in her chair', mode: 'clip', line: '' },
      { title: 'Talk to camera', imagePrompt: 'medium close-up, she holds the phone next to her face and looks at the camera, clean office background', motionPrompt: 'static camera, she speaks to the viewer', mode: 'talk', line: '' },
    ],
  },
]

export function producaoTemplate(key: unknown): ProducaoTemplate {
  return PRODUCAO_TEMPLATES.find((t) => t.key === key) ?? PRODUCAO_TEMPLATES[0]
}

// ═══ Planos ═════════════════════════════════════════════════════════════════════════════════════════════════════════
export const PRODUCAO_MIN_SHOTS = 3
export const PRODUCAO_MAX_SHOTS = 5
export const PRODUCAO_IDEA_MIN = 8
export const PRODUCAO_IDEA_MAX = 800
export const PRODUCAO_TITLE_MAX = 60
export const PRODUCAO_PROMPT_MAX = 600
export const PRODUCAO_MOTION_MAX = 300
export const PRODUCAO_LINE_MAX = 600
export const PRODUCAO_PLAN_DAILY_CAP = 40
export const PRODUCAO_PLAN_MODEL = 'gpt-4o-mini'
export const PRODUCAO_PLAN_EVENT = 'producao_plan_created'
export const PRODUCAO_MONTAGE_EVENT = 'producao_montage_submitted'

export type ProducaoLanguage = 'en' | 'pt' | 'es'
export const PRODUCAO_LANGUAGES: readonly ProducaoLanguage[] = ['en', 'pt', 'es']
export function producaoLanguage(v: unknown): ProducaoLanguage {
  const s = typeof v === 'string' ? v.slice(0, 2).toLowerCase() : ''
  return s === 'pt' ? 'pt' : s === 'es' ? 'es' : 'en'
}
const LANGUAGE_NAME: Record<ProducaoLanguage, string> = { en: 'English', pt: 'Brazilian Portuguese', es: 'Spanish' }

export function cleanLine(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

/** Mensagens do planejador (JSON). A fala vem na língua do anúncio; os prompts de imagem e movimento em inglês. */
export function buildPlanMessages(args: {
  idea: string
  template: ProducaoTemplateKey
  kind: ProducaoCharacterKind
  characterDescription?: string
  language: ProducaoLanguage
  productPhoto?: boolean
}): { system: string; user: string } {
  const t = producaoTemplate(args.template)
  const who = args.kind === 'mascot' ? 'the brand mascot' : `the same ${args.kind === 'man' ? 'man' : 'woman'}`
  const system = [
    'You are the director of a short vertical (9:16) social media ad made of AI-generated shots.',
    `Every shot stars ${who} from a reference image, so NEVER describe their face, hair, age, skin or body — only pose, action, framing, setting, light and mood.`,
    `Return JSON: {"shots":[{"title":string,"image_prompt":string,"motion_prompt":string,"mode":"clip"|"talk","line":string}]} with ${PRODUCAO_MIN_SHOTS} to ${PRODUCAO_MAX_SHOTS} shots in story order.`,
    '- title: 2 to 5 words, in the ad language.',
    '- image_prompt: ONE English sentence for a photorealistic still (framing, action, setting, light). Max 300 characters.',
    '- motion_prompt: ONE English sentence for the camera and subject movement in a 5-second clip. Max 160 characters.',
    `- mode "talk" = the character speaks to the camera (lip-synced). Use 1 or 2 talk shots at most; the rest are "clip".`,
    `- line: only for talk shots — what the character says, in ${LANGUAGE_NAME[args.language]}, natural and persuasive, 35 to 60 words (it must last at least 12 seconds when spoken). Empty string for clip shots.`,
    `- ${NO_TEXT_NO_BRANDS} Never name or show real brands, celebrities or competitors.`,
    args.productPhoto ? '- A second reference image shows the product or the app screen: mention "the product from the reference" or "the app screen from the reference" where it appears.' : '',
    `Style for this ad: ${t.planHint}`,
  ].filter(Boolean).join('\n')
  const desc = cleanLine(args.characterDescription, 300)
  const user = [`Ad idea: ${cleanLine(args.idea, PRODUCAO_IDEA_MAX)}`, desc ? `Character: ${desc}` : ''].filter(Boolean).join('\n')
  return { system, user }
}

/** Normaliza a resposta do planejador. Devolve null quando não há pelo menos PRODUCAO_MIN_SHOTS planos válidos. */
export function parsePlan(raw: unknown): ProducaoShot[] | null {
  let obj: unknown = raw
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw) } catch { return null }
  }
  const list = obj && typeof obj === 'object' && Array.isArray((obj as { shots?: unknown }).shots) ? (obj as { shots: unknown[] }).shots : null
  if (!list) return null
  const shots: ProducaoShot[] = []
  for (const s of list) {
    if (shots.length >= PRODUCAO_MAX_SHOTS) break
    if (!s || typeof s !== 'object') continue
    const r = s as Record<string, unknown>
    const imagePrompt = cleanLine(r.image_prompt, PRODUCAO_PROMPT_MAX)
    if (imagePrompt.length < 8) continue
    const mode: ProducaoShotMode = r.mode === 'talk' ? 'talk' : 'clip'
    const line = mode === 'talk' ? cleanLine(r.line, PRODUCAO_LINE_MAX) : ''
    shots.push({
      title: cleanLine(r.title, PRODUCAO_TITLE_MAX) || `Shot ${shots.length + 1}`,
      imagePrompt,
      motionPrompt: cleanLine(r.motion_prompt, PRODUCAO_MOTION_MAX) || 'slow cinematic push-in, natural movement',
      // fala vazia não vira avatar: o plano volta a ser clipe (a pessoa pode trocar de novo na tela)
      mode: mode === 'talk' && line.length > 0 ? 'talk' : 'clip',
      line,
    })
  }
  return shots.length >= PRODUCAO_MIN_SHOTS ? shots : null
}

/** Plano de reserva (planejador fora do ar): os planos do modelo, com a ideia na fala dos planos 'talk'. */
export function fallbackPlan(template: ProducaoTemplateKey, idea: string): ProducaoShot[] {
  const t = producaoTemplate(template)
  const said = cleanLine(idea, PRODUCAO_LINE_MAX)
  return t.fallback.slice(0, PRODUCAO_MAX_SHOTS).map((s) => ({ ...s, line: s.mode === 'talk' ? said : '' }))
}

/** O prompt de imagem de um plano: identidade + o plano + a foto extra (se houver) + formato + sem texto/marca. */
export function buildShotImagePrompt(args: { kind: ProducaoCharacterKind; shot: Pick<ProducaoShot, 'imagePrompt'>; productPhoto?: boolean }): string {
  const scene = cleanLine(args.shot.imagePrompt, PRODUCAO_PROMPT_MAX).replace(/[.\s]+$/, '')
  const extra = args.productPhoto ? ' The product or app screen shown is exactly the one in the second reference image.' : ''
  return `${identityLine(args.kind)} as in the first reference image. ${scene}.${extra} Vertical 9:16 photo, photorealistic, cinematic light. ${NO_TEXT_NO_BRANDS}`.slice(0, 2000)
}

/** Estimativa de segundos de fala (tts-1-hd da casa ≈ 3,1 palavras/s). A rota do avatar é quem decide (mede o mp3). */
export const PRODUCAO_TALK_WORDS_PER_SECOND = 3.1
export function estimateTalkSeconds(line: string): number {
  const words = String(line ?? '').trim().split(/\s+/).filter(Boolean).length
  return Math.round((words / PRODUCAO_TALK_WORDS_PER_SECOND) * 10) / 10
}
export function talkLongEnough(line: string): boolean {
  return estimateTalkSeconds(line) >= PRODUCAO_AVATAR_MIN_SECONDS
}

// ═══ Voz do avatar (sem o truque do [Pexels:] + vertical) ═══════════════════════════════════════════════════════════
export type ProducaoVoice = 'female' | 'male'
/** OpenAI tts-1-hd — a mesma família de voz do Kineo 1 e do Ads (lib/ads/renderContract ADS_VOICES). */
export const PRODUCAO_VOICE_IDS: Record<ProducaoVoice, 'nova' | 'onyx'> = { female: 'nova', male: 'onyx' }
export function producaoVoice(v: unknown): ProducaoVoice | null {
  return v === 'female' || v === 'male' ? v : null
}

// ═══ Montagem (Creatomate) ══════════════════════════════════════════════════════════════════════════════════════════
export const PRODUCAO_WIDTH = 1080
export const PRODUCAO_HEIGHT = 1920
export const PRODUCAO_FRAME_RATE = 30
export const PRODUCAO_TRANSITION_SECONDS = 0.4
export const PRODUCAO_END_CARD_SECONDS = 3
export const PRODUCAO_SLOGAN_MAX = 60
export const PRODUCAO_SUPPORT_MAX = 90
/** Segundos aceitos por plano (clipe 3–30 s; fala 3–60 s, o teto do fabric). */
export const PRODUCAO_SHOT_MIN_SECONDS = 2
export const PRODUCAO_SHOT_MAX_SECONDS = 60
const RECT_PATH = 'M 0 0 L 100 0 L 100 100 L 0 100 Z'

export interface ProducaoMontageShot {
  kind: ProducaoShotMode
  videoUrl: string
  seconds: number
  /** Fala do avatar (mp3 assinado no claim do avatar) — toca alinhada ao plano. Só em 'talk'. */
  voiceUrl?: string | null
}
export interface ProducaoMontageInput {
  shots: readonly ProducaoMontageShot[]
  narration?: { url: string; seconds: number } | null
  endCard: { logoUrl: string | null; slogan: string; support: string; theme?: 'light' | 'dark' }
  fontFamily?: string
}

const r3 = (n: number) => Math.round(n * 1000) / 1000
const isHttps = (u: unknown): u is string => typeof u === 'string' && /^https:\/\/\S+$/i.test(u)

/** Linha do tempo: cada plano começa 0,4 s antes do fim do anterior (a transição), o cartão entra do mesmo jeito. */
export function montageTimeline(seconds: readonly number[]): { starts: number[]; cardStart: number; total: number } {
  const starts: number[] = []
  let t = 0
  seconds.forEach((s, i) => {
    starts.push(r3(t))
    t = t + s - (i < seconds.length - 1 ? PRODUCAO_TRANSITION_SECONDS : 0)
  })
  const shotsEnd = r3(t)
  const cardStart = r3(Math.max(0, shotsEnd - PRODUCAO_TRANSITION_SECONDS))
  return { starts, cardStart, total: r3(cardStart + PRODUCAO_END_CARD_SECONDS) }
}

/**
 * Source do Creatomate. Só propriedades que os montadores da casa já exercitam em produção (lib/ads/adV2Montage.ts,
 * lib/spaces/spaces.ts): shape+path+fill_color, video com fit/volume/loop/trim_start, image com fit, audio com volume,
 * text com fill_color, enter_transition 'fade'. Planos alternam as faixas 2 e 3 (o fade de 0,4 s cruza um no outro); a
 * fala do avatar entra na faixa 5 no MESMO instante e com a MESMA duração do plano; a narração (opcional) na faixa 6 só
 * por cima dos planos de clipe que vêm ANTES da primeira fala (nunca duas vozes juntas); o cartão final na faixa 4.
 */
export function buildProducaoMontageSource(input: ProducaoMontageInput): Record<string, unknown> {
  const shots = input.shots
  if (!Array.isArray(shots) || shots.length === 0 || shots.length > PRODUCAO_MAX_SHOTS) throw new Error('producao_montage_bad_shots')
  shots.forEach((s, i) => {
    if (s.kind !== 'clip' && s.kind !== 'talk') throw new Error(`producao_montage_bad_kind:${i}`)
    if (!isHttps(s.videoUrl)) throw new Error(`producao_montage_bad_url:${i}`)
    if (!(Number.isFinite(s.seconds) && s.seconds >= PRODUCAO_SHOT_MIN_SECONDS && s.seconds <= PRODUCAO_SHOT_MAX_SECONDS)) throw new Error(`producao_montage_bad_seconds:${i}`)
    if (s.kind === 'talk' && !isHttps(s.voiceUrl)) throw new Error(`producao_montage_bad_voice:${i}`)
  })
  const font = cleanLine(input.fontFamily, 60) || 'Montserrat'
  const secs = shots.map((s) => r3(s.seconds))
  const { starts, cardStart, total } = montageTimeline(secs)
  const full = { x: '50%', y: '50%', width: '100%', height: '100%' }
  const elements: Record<string, unknown>[] = []
  elements.push({ type: 'shape', track: 1, time: 0, duration: total, ...full, path: RECT_PATH, fill_color: '#000000' })

  shots.forEach((s, i) => {
    elements.push({
      type: 'video', track: i % 2 === 0 ? 2 : 3, time: starts[i], duration: secs[i],
      source: s.videoUrl.trim(), fit: 'cover', ...full, loop: false, trim_start: 0, volume: '0%',
      ...(i > 0 ? { enter_transition: { type: 'fade', duration: PRODUCAO_TRANSITION_SECONDS } } : {}),
    })
    if (s.kind === 'talk' && s.voiceUrl) {
      elements.push({ type: 'audio', track: 5, time: starts[i], duration: secs[i], source: s.voiceUrl.trim(), volume: '100%' })
    }
  })

  // Narração: só por cima dos clipes antes da primeira fala (ou de todos, sem fala). Corta no começo da fala.
  const n = input.narration
  if (n && isHttps(n.url) && Number.isFinite(n.seconds) && n.seconds > 0) {
    const firstTalk = shots.findIndex((s) => s.kind === 'talk')
    const room = firstTalk === -1 ? cardStart : starts[firstTalk]
    const d = r3(Math.min(n.seconds, room))
    if (d >= 1) elements.push({ type: 'audio', track: 6, time: 0, duration: d, source: n.url.trim(), volume: '100%', audio_fade_out: 0.3 })
  }

  // Cartão final de 3 s: fundo liso, o logo da conta em tela cheia (contain), slogan e linha de apoio.
  const dark = input.endCard.theme === 'dark'
  const bg = dark ? '#0B0E13' : '#FFFFFF'
  const fg = dark ? '#FFFFFF' : '#0E1116'
  const slogan = cleanLine(input.endCard.slogan, PRODUCAO_SLOGAN_MAX)
  const support = cleanLine(input.endCard.support, PRODUCAO_SUPPORT_MAX)
  const logo = isHttps(input.endCard.logoUrl) ? input.endCard.logoUrl : null
  const cardFade = { type: 'fade', duration: PRODUCAO_TRANSITION_SECONDS }
  elements.push({ type: 'shape', track: 4, time: cardStart, duration: PRODUCAO_END_CARD_SECONDS, ...full, path: RECT_PATH, fill_color: bg, enter_transition: cardFade })
  if (logo) {
    elements.push({
      type: 'image', track: 7, time: cardStart, duration: PRODUCAO_END_CARD_SECONDS, source: logo, fit: 'contain',
      x: '50%', y: slogan || support ? '38%' : '50%', width: '84%', height: slogan || support ? '46%' : '70%',
      enter_transition: cardFade,
    })
  }
  const lines = [
    slogan ? { text: slogan, size: 64, weight: '800' } : null,
    support ? { text: support, size: 40, weight: '600' } : null,
  ].filter((l): l is { text: string; size: number; weight: string } => !!l)
  lines.forEach((l, i) => {
    const y = logo ? 70 + i * 9 : 44 + i * 10
    elements.push({
      type: 'text', track: 8 + i, time: r3(cardStart + 0.2), duration: r3(PRODUCAO_END_CARD_SECONDS - 0.2), text: l.text,
      x: '50%', y: `${y}%`, x_anchor: '50%', y_anchor: '50%', width: '86%', height: i === 0 ? '8%' : '7%',
      font_family: font, font_size: l.size, font_weight: l.weight, fill_color: fg,
      enter_transition: { type: 'fade', duration: 0.3 },
    })
  })

  return {
    output_format: 'mp4', width: PRODUCAO_WIDTH, height: PRODUCAO_HEIGHT, frame_rate: PRODUCAO_FRAME_RATE,
    duration: total, snapshot_time: Math.min(1.5, total), elements,
  }
}

// ═══ Posse da narração (o áudio do /api/audio/generate mora em renders/audio/<uid>/) ═══════════════════════════════
export function isOwnedProducaoAudioUrl(url: unknown, userId: string, supabaseOrigin: string): boolean {
  if (typeof url !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) return false
  let u: URL
  let origin: string
  try { u = new URL(url); origin = new URL(supabaseOrigin).origin } catch { return false }
  if (u.origin !== origin || u.username || u.password || u.search || u.hash) return false
  let p: string
  try { p = decodeURIComponent(u.pathname) } catch { return false }
  if (p.includes('..') || p.includes('\\') || p.includes('//')) return false
  const prefix = `/storage/v1/object/public/renders/audio/${userId.toLowerCase()}/`
  return p.toLowerCase().startsWith(prefix) && p.length > prefix.length
}

// ═══ Pedido de montagem (forma do corpo; a rota resolve cada peça no banco, nunca confia em URL do navegador) ═════
export type ProducaoMontageRef = { kind: 'clip'; clipId: string } | { kind: 'talk'; generationId: string }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const GEN_RE = /^[A-Za-z0-9_-]{8,100}$/
export function parseMontageRefs(raw: unknown): ProducaoMontageRef[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > PRODUCAO_MAX_SHOTS) return null
  const out: ProducaoMontageRef[] = []
  for (const r of raw) {
    const o = r && typeof r === 'object' ? (r as Record<string, unknown>) : null
    if (o?.kind === 'clip' && typeof o.clip_id === 'string' && UUID_RE.test(o.clip_id)) out.push({ kind: 'clip', clipId: o.clip_id })
    else if (o?.kind === 'talk' && typeof o.generation_id === 'string' && GEN_RE.test(o.generation_id)) out.push({ kind: 'talk', generationId: o.generation_id })
    else return null
  }
  return out
}
