// KINEO-ADS-3-VARIACOES-2026-09-30 — "3 variações" do anúncio v2 (Studio Ads, modo simples e completo).
//
// PEDIDO DO FUNDADOR (30/09, "3 variações sim"; preço: "preço aprovado"): o cliente pede 3 VARIAÇÕES do mesmo anúncio de
// uma vez, para testar qual vende mais. Mesmo produto, mesmas fotos/vídeos, mesma narração e mesmas frases; cada variação
// com um LOOK fixo (cenário quando o setor permite, paleta, luz, ângulo de câmera e a abertura). É o "mesma modelo em 3
// anúncios lado a lado" do Higgsfield.
//
// COMO FUNCIONA (sem duplicar o motor): o pedido planejado vira a variação A; B e C são pedidos v2 NORMAIS, clones do
// plano-base com o look aplicado aos prompts. Cada um tem avanço, status, refação e montagem próprios (lib/ads/v2Advance).
//   · Cena criada por IA (Nano Banana Pro edit): ganha a frase do look (luz, paleta, câmera, roupa das pessoas) e, nos
//     setores sem lugar fixo (loja, app), o cenário do look. Nos setores com lugar real (restaurante, clínica, imóvel,
//     academia, salão, outro) o lugar das fotos NÃO muda — só luz e cor (a régua anti-invenção do v2 continua valendo).
//   · Foto do cliente: muda o MOVIMENTO (variante deslocada por look) e a GRADE DE COR; o conteúdo da foto fica como está
//     (todo prompt continua terminando em "Keep everything exactly as in the photo.").
//   · A abertura (1º plano com IA que não é close-herói) ganha o movimento de abertura do look: o "gancho" visual muda.
//   · Pessoa na cena: B e C usam o still JÁ GERADO da mesma cena na variação A como referência extra (padrão
//     lib/imageReference.ts + fal-ai/nano-banana-pro/edit) — a MESMA pessoa nas 3. A decisão é adsV2AnchorDecision.
//   · Narração e frases: as MESMAS nas 3 (decisão: o teste A/B isola o visual; 3 ganchos falados exigiriam 3 textos
//     novos passando de novo pela régua anti-invenção).
//
// PREÇO (decisão pública do fundador 30/09, "preço aprovado"): 3 variações = 2,5 × o preço do nível, arredondado para
// cima (34→85, 41→103, 51→128). UM débito antes de começar, repartido em 3 linhas do ledger (uma por variação, somando
// EXATAMENTE o preço do grupo): a falha de uma variação estorna SÓ a parte dela, pelo estorno idempotente de sempre
// (failAdsV2Order → refund_render_credits, WHERE refunded_at IS NULL). Nada de estorno em dobro.
//
// LIB PURA (nenhum import): o guardião scripts/test-ads-3-variacoes-2026-09-30.mjs importa este arquivo cru no Node.
// Espelhos conferidos pelo guardião: ADS_V2_KEEP_PHRASE (lib/ads/v2ShotLists.ts) e IDENTITY_INSTRUCTION
// (lib/imageReference.ts).

// ── interruptor ─────────────────────────────────────────────────────────────────────────────────────────────────────
// KINEO-ADS-3-VARIACOES-2026-09-30 — true por decisão do fundador (30/09, "preço aprovado": nasce aberto se o resto
// estiver pronto e testado). Desligar = false: só as contas da casa (isAdsInternalEmail) veem a opção; a rota
// /api/ads/v2/variations responde 404 a qualquer outra conta ANTES de qualquer débito.
export const ADS_VARIACOES_PUBLIC = true

/** Quem vê a opção. Pura: o chamador passa o interruptor e se a conta é da casa (lib/ads/v2VariationsAccess.ts). */
export function adsVariationsVisibleFor(publicFlag: boolean, isInternal: boolean): boolean {
  return publicFlag === true || isInternal === true
}

// ── slots e looks ───────────────────────────────────────────────────────────────────────────────────────────────────
export type AdsV2VariationSlot = 'A' | 'B' | 'C'
export const ADS_V2_VARIATION_SLOTS: readonly AdsV2VariationSlot[] = ['A', 'B', 'C']
export type AdsV2LookId = 'daylight_blue' | 'warm_orange' | 'sunset_pink'

export interface AdsV2Look {
  id: AdsV2LookId
  slot: AdsV2VariationSlot
  /** Nome curto do look na tela (rótulo "A · <nome>"). */
  name: { en: string; pt: string; es: string }
  /** Luz da cena criada. */
  light: string
  /** Paleta de cor. */
  palette: string
  /** Ângulo/enquadramento da câmera na cena criada. */
  camera: string
  /** Roupa das pessoas criadas (a paleta vestida). */
  wardrobe: string
  /** Cenário — SÓ nos setores sem lugar fixo (ADS_V2_LOOK_FREE_SETTING_SECTORS). */
  setting: string
  /** Grade de cor, frase curta aplicada a TODO plano com IA (foto do cliente e cena criada). */
  grade: string
  /** Movimento de abertura (1º plano com IA do anúncio). */
  opening: string
  /** Abertura quando o 1º plano é o close-herói do Cinema (continua macro; as travas do herói ficam). */
  heroOpening: string
  /** Deslocamento da variante de movimento (0/1/2): o mesmo plano ganha OUTRO movimento em cada variação. */
  movementOffset: number
}

// Nenhum dígito nas frases (a régua anti-invenção do v2 recusa número que não está no brief) e nenhuma promessa.
export const ADS_V2_LOOKS: Readonly<Record<AdsV2VariationSlot, AdsV2Look>> = {
  A: {
    id: 'daylight_blue',
    slot: 'A',
    name: { en: 'Fresh daylight', pt: 'Luz do dia', es: 'Luz del día' },
    light: 'bright, soft natural daylight with a clear blue sky feeling',
    palette: 'cool palette of blue, white and light aqua',
    camera: 'eye-level, straight-on framing with generous space around the subject',
    wardrobe: 'light blue and white everyday clothes',
    setting: 'a bright outdoor terrace next to a blue swimming pool on a sunny day',
    grade: 'clean, bright, cool color grade with blue accents',
    opening: 'Quick smooth push-in from a wider view toward the subject',
    heroOpening: 'Macro close-up, slow push-in; soft bright light glides across the surface and reveals the texture',
    movementOffset: 0,
  },
  B: {
    id: 'warm_orange',
    slot: 'B',
    name: { en: 'Warm interior', pt: 'Interior quente', es: 'Interior cálido' },
    light: 'warm, cozy indoor light with golden lamps',
    palette: 'warm palette of orange, amber and cream',
    camera: 'low-angle close framing from the side, intimate and tactile',
    wardrobe: 'orange, rust and cream everyday clothes',
    setting: 'a cozy home kitchen with warm orange tones and wooden surfaces',
    grade: 'warm amber color grade with rich orange tones',
    opening: 'Slow low-angle rise that reveals the subject',
    heroOpening: 'Macro close-up, slow low-angle orbit; warm light catches the texture',
    movementOffset: 1,
  },
  C: {
    id: 'sunset_pink',
    slot: 'C',
    name: { en: 'Sunset energy', pt: 'Pôr do sol', es: 'Atardecer' },
    light: 'glowing sunset backlight, energetic and vivid',
    palette: 'vivid palette of pink, coral and magenta',
    camera: 'slightly high dynamic angle with a lively handheld feel',
    wardrobe: 'pink and coral everyday clothes',
    setting: 'a rooftop terrace at sunset under a pink and coral sky',
    grade: 'vibrant pink and coral sunset color grade',
    opening: 'Energetic handheld move with a short arc around the subject',
    heroOpening: 'Macro close-up, slow rise from the texture to the whole product; a lively glow catches the surface',
    movementOffset: 2,
  },
}

/** Setores sem lugar fixo: o look pode trocar o CENÁRIO da cena criada (nos demais, só luz e cor). */
export const ADS_V2_LOOK_FREE_SETTING_SECTORS: readonly string[] = ['store', 'app_service']

/** Espelho de ADS_V2_KEEP_PHRASE (lib/ads/v2ShotLists.ts) — o guardião confere. */
export const ADS_V2_VARIATION_KEEP_PHRASE = 'Keep everything exactly as in the photo.'
/** Espelho de IDENTITY_INSTRUCTION (lib/imageReference.ts) — o guardião confere. */
export const ADS_V2_VARIATION_IDENTITY = 'Keep the exact face and identity of the person in the reference photo(s).'
/** Frase acrescentada à cena de B/C quando o still da variação A entra como última referência. */
export const ADS_V2_SAME_PERSON_LINE =
  'The last reference photo shows the people of this same scene in another version of this ad: use the same people, with the same faces, hair and build. ' +
  ADS_V2_VARIATION_IDENTITY +
  " Only the light, the colors and the clothes follow this version's look."

// ── preço ───────────────────────────────────────────────────────────────────────────────────────────────────────────
/** 2,5× em conta inteira: ceil(preço × 5 / 2). 34→85 · 41→103 · 51→128 (20 s: 46→115 · 55→138 · 68→170). */
export function adsV2VariationCredits(tierCredits: number): number {
  if (!Number.isInteger(tierCredits) || tierCredits <= 0) throw new Error(`ads_v2_bad_tier_credits:${String(tierCredits)}`)
  return Math.ceil((tierCredits * 5) / 2)
}

/**
 * As 3 partes do débito único (uma linha do ledger por variação), somando EXATAMENTE o preço do grupo. O resto da
 * divisão vai às primeiras variações (85 = 29+28+28 · 103 = 35+34+34 · 128 = 43+43+42). A parte de cada variação é o
 * que volta quando ELA falha.
 */
export function adsV2VariationShares(total: number): readonly [number, number, number] {
  if (!Number.isInteger(total) || total < 3) throw new Error(`ads_v2_bad_group_total:${String(total)}`)
  const base = Math.floor(total / 3)
  const rest = total - base * 3
  return [base + (rest > 0 ? 1 : 0), base + (rest > 1 ? 1 : 0), base]
}

/** Quanto volta ao cliente quando estas variações falham: a soma das PARTES delas (nunca o grupo inteiro). */
export function adsV2VariationRefund(members: readonly { credits: number; failed: boolean }[]): number {
  return members.reduce((s, m) => s + (m.failed ? m.credits : 0), 0)
}

// ── aplicar o look ao plano ─────────────────────────────────────────────────────────────────────────────────────────
/** Forma mínima de um plano gravado que o look toca (o resto é copiado como está). */
export interface AdsV2LookShot {
  idx: number
  kind: string
  source: string
  prompt: string | null
  scenePrompt: string | null
  movementVariant: number
}
export interface AdsV2LookPlan<S extends AdsV2LookShot = AdsV2LookShot> {
  shots: S[]
}

/** Insere a frase antes do fecho "Keep everything exactly as in the photo." (que continua sendo a última frase). */
export function insertBeforeKeep(prompt: string, sentence: string): string {
  const p = prompt.trim()
  const s = sentence.trim()
  if (!s) return p
  if (p.endsWith(ADS_V2_VARIATION_KEEP_PHRASE)) {
    const head = p.slice(0, p.length - ADS_V2_VARIATION_KEEP_PHRASE.length).trim()
    return `${head} ${s} ${ADS_V2_VARIATION_KEEP_PHRASE}`
  }
  return `${p} ${s}`
}

/** Frase de grade de cor do look (planos com IA). */
export function lookGradeSentence(look: AdsV2Look): string {
  return `Color grade: ${look.grade}.`
}

/** Frase do look na cena criada. `sector` decide se o cenário muda (só loja/app) ou só luz e cor. */
export function lookSceneSentence(look: AdsV2Look, sector: string): string {
  const free = ADS_V2_LOOK_FREE_SETTING_SECTORS.includes(sector)
  return (
    `Look of this version: ${look.light}; ${look.palette}; camera ${look.camera}; the people wear ${look.wardrobe}. ` +
    (free
      ? `Setting for this version: ${look.setting}; the product stays exactly as in the photos.`
      : 'Keep the real place from the photos exactly as it is; only the light and the colors change.')
  )
}

/** Prompt de movimento de um plano com o look: movimento deslocado (ou o de abertura) + grade antes do fecho. */
export function lookMotionPrompt(basePrompt: string, look: AdsV2Look, opening: { kind: string; motionOnly: string | null } | null): string {
  let p = basePrompt
  if (opening && opening.motionOnly) {
    // Abertura: troca SÓ a primeira frase (o movimento) pela abertura do look; travas do herói e fecho ficam.
    const rest = p.startsWith(opening.motionOnly) ? p.slice(opening.motionOnly.length) : null
    if (rest !== null) p = `${opening.kind === 'product_hero' ? look.heroOpening : look.opening}${rest}`
  }
  return insertBeforeKeep(p, lookGradeSentence(look))
}

/** Tipos que nunca passam por IA (o look não toca): o texto e o vídeo do cliente. */
const NO_AI = new Set(['text', 'user_video'])

/**
 * O plano da variação: cópia do plano-base com o look aplicado. `motion(kind, variant)` é motionPrompt de
 * lib/ads/v2ShotLists.ts (injetado: esta lib não importa nada). Determinística: mesmas entradas → mesmo plano.
 * slot null = o próprio plano, intocado (sem variações = comportamento de hoje).
 */
export function applyAdsV2Look<S extends AdsV2LookShot, P extends AdsV2LookPlan<S>>(
  plan: P,
  slot: AdsV2VariationSlot | null,
  opts: { sector: string; motion: (kind: string, variant: number) => string },
): P {
  if (slot === null) return plan
  const look = ADS_V2_LOOKS[slot]
  if (!look) throw new Error(`ads_v2_unknown_variation:${String(slot)}`)
  // A abertura é o 1º plano com IA do anúncio (o gancho); um plano de texto ou vídeo do cliente no começo passa a vez.
  const openingIdx = plan.shots.find((s) => !NO_AI.has(s.kind) && typeof s.prompt === 'string' && !!s.prompt)?.idx ?? -1
  const shots: S[] = plan.shots.map((s): S => {
    if (NO_AI.has(s.kind) || typeof s.prompt !== 'string' || !s.prompt) return { ...s }
    const variant = s.movementVariant + look.movementOffset
    const base = opts.motion(s.kind, variant)
    const motionOnly = base.split('. ')[0]
    const prompt = lookMotionPrompt(base, look, s.idx === openingIdx ? { kind: s.kind, motionOnly } : null)
    const scenePrompt = s.source === 'generated_scene' && typeof s.scenePrompt === 'string' && s.scenePrompt
      ? `${s.scenePrompt.trim()} ${lookSceneSentence(look, opts.sector)}`
      : s.scenePrompt
    return { ...s, prompt, scenePrompt, movementVariant: variant }
  })
  return { ...plan, shots } as P
}

/** Prompt da refação paga de um plano de variação: o mesmo look, com o movimento seguinte. Sem look = base intocada. */
export function adsV2RetakePrompt(basePrompt: string, slot: AdsV2VariationSlot | null): string {
  if (slot === null) return basePrompt
  const look = ADS_V2_LOOKS[slot]
  return look ? insertBeforeKeep(basePrompt, lookGradeSentence(look)) : basePrompt
}

// ── marca da variação no brief (coluna jsonb que já existe: nada do motor depende da migration nova) ────────────────
export interface AdsV2VariationTag {
  group_id: string
  slot: AdsV2VariationSlot
  look: AdsV2LookId
  /** Pedido da variação A (dono do still de referência das pessoas). */
  anchor_order_id: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Lê brief.variation com a mesma desconfiança de qualquer jsonb. null = pedido comum. */
export function variationTagOf(brief: unknown): AdsV2VariationTag | null {
  if (!brief || typeof brief !== 'object') return null
  const v = (brief as { variation?: unknown }).variation
  if (!v || typeof v !== 'object') return null
  const t = v as Record<string, unknown>
  const slot = t.slot
  if (slot !== 'A' && slot !== 'B' && slot !== 'C') return null
  if (typeof t.group_id !== 'string' || !UUID_RE.test(t.group_id)) return null
  if (typeof t.anchor_order_id !== 'string' || !UUID_RE.test(t.anchor_order_id)) return null
  return { group_id: t.group_id.toLowerCase(), slot, look: ADS_V2_LOOKS[slot].id, anchor_order_id: t.anchor_order_id.toLowerCase() }
}

// ── a mesma pessoa nas 3 (still da variação A como referência) ───────────────────────────────────────────────────────
/** Quanto B/C esperam pelo still da A antes de seguir sem ele (a cena sai com gente, só não garantidamente a mesma). */
export const ADS_V2_VARIATION_ANCHOR_WAIT_MS = 8 * 60 * 1000

export type AdsV2AnchorDecision =
  | { kind: 'use'; url: string }
  | { kind: 'wait' }
  | { kind: 'skip'; reason: 'not_needed' | 'anchor_gone' | 'anchor_timeout' }

/**
 * B/C, cena criada com gente: usa o still da mesma cena (mesmo idx) da A se já existe; espera enquanto a A trabalha;
 * segue sem ele quando a A morreu ou o prazo passou. A (e qualquer pedido comum) nunca espera.
 */
export function adsV2AnchorDecision(args: {
  slot: AdsV2VariationSlot | null
  shotKind: string
  shotSource: string
  anchorOrderStatus: string | null
  anchorImageUrl: string | null
  waitedMs: number
}): AdsV2AnchorDecision {
  if (args.slot === null || args.slot === 'A' || args.shotSource !== 'generated_scene' || args.shotKind !== 'people') return { kind: 'skip', reason: 'not_needed' }
  if (typeof args.anchorImageUrl === 'string' && /^https:\/\/\S+$/i.test(args.anchorImageUrl)) return { kind: 'use', url: args.anchorImageUrl }
  if (args.anchorOrderStatus === null || args.anchorOrderStatus === 'failed' || args.anchorOrderStatus === 'cancelled') return { kind: 'skip', reason: 'anchor_gone' }
  if (!(args.waitedMs < ADS_V2_VARIATION_ANCHOR_WAIT_MS)) return { kind: 'skip', reason: 'anchor_timeout' }
  return { kind: 'wait' }
}

// ── cobrança do grupo (orquestração pura; o banco entra por injeção) ────────────────────────────────────────────────
export interface AdsV2VariationMember {
  slot: AdsV2VariationSlot
  orderId: string
  /** A parte do débito único que é desta variação (adsV2VariationShares). */
  credits: number
}

export type AdsV2VariationLock = { ok: true; billingRef: string } | { ok: false; code: 'another_active' | 'not_startable' | 'start_failed'; status: number }
export type AdsV2VariationCharge = { ok: true } | { ok: false; code: string; status: number; debitPossible: boolean; balance?: number }

export interface AdsV2VariationChargeDeps {
  /** Trava o pedido (draft|planned → generating) com a chave própria dele e credits_charged = a parte. */
  lock(m: AdsV2VariationMember): Promise<AdsV2VariationLock>
  /** chargeAdsV2 na chave da variação, pelo valor da PARTE. */
  charge(m: AdsV2VariationMember, billingRef: string): Promise<AdsV2VariationCharge>
  /** refundAdsV2Confirmed da chave da variação (idempotente no banco). */
  refund(m: AdsV2VariationMember, billingRef: string): Promise<'refunded' | 'missing' | 'unconfirmed'>
  /** Volta o pedido a 'planned' (só esta geração). */
  unlock(m: AdsV2VariationMember, billingRef: string): Promise<void>
  /** failAdsV2Order: →failed + estorno pelo vencedor (quando não dá para provar que o débito não ficou). */
  fail(m: AdsV2VariationMember, billingRef: string, reason: string): Promise<void>
}

export type AdsV2VariationChargeResult =
  | { ok: true; charged: { slot: AdsV2VariationSlot; orderId: string; billingRef: string; credits: number }[] }
  | { ok: false; code: string; status: number; balance?: number }

/**
 * Débito ÚNICO do grupo, antes de qualquer envio à fal: trava as 3, cobra as 3 partes; tudo ou nada.
 *  - uma trava falhou → destrava as já travadas; nada foi cobrado;
 *  - uma cobrança falhou → a que falhou vai ao caminho de falha se o débito for POSSÍVEL (senão destrava); as já
 *    cobradas são estornadas (estorno confirmado = destrava; sem confirmação = caminho de falha, que estorna de novo,
 *    idempotente); as ainda não cobradas são destravadas.
 */
export async function chargeVariationGroup(members: readonly AdsV2VariationMember[], deps: AdsV2VariationChargeDeps): Promise<AdsV2VariationChargeResult> {
  if (members.length !== ADS_V2_VARIATION_SLOTS.length) return { ok: false, code: 'bad_group', status: 400 }
  const locked: { m: AdsV2VariationMember; billingRef: string }[] = []
  for (const m of members) {
    const l = await deps.lock(m)
    if (!l.ok) {
      for (const x of locked) await deps.unlock(x.m, x.billingRef)
      return { ok: false, code: l.code, status: l.status }
    }
    locked.push({ m, billingRef: l.billingRef })
  }
  const charged: { m: AdsV2VariationMember; billingRef: string }[] = []
  for (let i = 0; i < locked.length; i++) {
    const { m, billingRef } = locked[i]
    const c = await deps.charge(m, billingRef)
    if (c.ok) {
      charged.push({ m, billingRef })
      continue
    }
    if (c.debitPossible) await deps.fail(m, billingRef, `group_charge_${c.code}`)
    else await deps.unlock(m, billingRef)
    for (const x of charged) {
      const r = await deps.refund(x.m, x.billingRef)
      if (r === 'refunded' || r === 'missing') await deps.unlock(x.m, x.billingRef)
      else await deps.fail(x.m, x.billingRef, 'group_charge_rollback_unconfirmed')
    }
    for (const x of locked.slice(i + 1)) await deps.unlock(x.m, x.billingRef)
    return { ok: false, code: c.code, status: c.status, ...(c.balance !== undefined ? { balance: c.balance } : {}) }
  }
  return { ok: true, charged: charged.map((x) => ({ slot: x.m.slot, orderId: x.m.orderId, billingRef: x.billingRef, credits: x.m.credits })) }
}

// ── corpo do POST /api/ads/v2/variations ────────────────────────────────────────────────────────────────────────────
export type AdsV2VariationsBody =
  | { action: 'start'; order_id: string; expected_credits: number | null; dry_run: boolean }
  | { action: 'choose'; order_id: string }

export function sanitizeVariationsBody(raw: unknown): { ok: true; value: AdsV2VariationsBody } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'bad_body' }
  const b = raw as Record<string, unknown>
  if (typeof b.order_id !== 'string' || !UUID_RE.test(b.order_id)) return { ok: false, error: 'bad_order_id' }
  const order_id = b.order_id.toLowerCase()
  const action = b.action === undefined ? 'start' : b.action
  if (action === 'choose') return { ok: true, value: { action: 'choose', order_id } }
  if (action !== 'start') return { ok: false, error: 'bad_action' }
  let dry_run = false
  if (b.dry_run !== undefined && b.dry_run !== null) {
    if (typeof b.dry_run !== 'boolean') return { ok: false, error: 'bad_dry_run' }
    dry_run = b.dry_run
  }
  let expected_credits: number | null = null
  if (b.expected_credits !== undefined && b.expected_credits !== null) {
    if (typeof b.expected_credits !== 'number' || !Number.isInteger(b.expected_credits) || b.expected_credits <= 0) return { ok: false, error: 'bad_expected_credits' }
    expected_credits = b.expected_credits
  }
  // Começar de verdade exige o preço que a tela MOSTROU (o ensaio de US$ 0 não precisa).
  if (!dry_run && expected_credits === null) return { ok: false, error: 'expected_credits_required' }
  return { ok: true, value: { action: 'start', order_id, expected_credits, dry_run } }
}

// ── textos da tela (pt/en/es, como o resto do modo simples; o completo usa o inglês) ────────────────────────────────
const V_EN = {
  toggle: 'Make 3 variations',
  toggleHint: 'Same product, photos and voice — three different looks (scene, colors, camera and opening) to test which one sells more.',
  price: '3 variations · {c} credits (instead of 3 × {one})',
  make: 'Make 3 variations · {c} credits',
  starting: 'Starting your 3 variations…',
  title: 'Your 3 variations',
  lead: 'Each one is made on its own. You can leave this page — they will land in',
  myVideos: 'My videos',
  loadFailed: 'We could not open your variations right now. They keep being made — find them in My videos.',
  working: 'Making it… {r} of {t} shots ready',
  assembling: 'Putting it together…',
  download: 'Download',
  downloading: 'Downloading…',
  redo: 'Redo a shot',
  choose: 'Choose this one',
  chosen: 'Chosen',
  failed: 'This one failed — {c} credits returned.',
  refunded: '{c} credits returned for the variations that failed.',
  back: 'Make another ad',
  swipe: 'Swipe to see the three',
  lost: 'We lost contact for a moment. Trying again…',
}
export type AdsV2VariationsCopy = typeof V_EN
const V_PT: AdsV2VariationsCopy = {
  toggle: 'Fazer 3 variações',
  toggleHint: 'Mesmo produto, fotos e voz — três looks diferentes (cenário, cores, câmera e abertura) para testar qual vende mais.',
  price: '3 variações · {c} créditos (em vez de 3 × {one})',
  make: 'Fazer 3 variações · {c} créditos',
  starting: 'Começando as 3 variações…',
  title: 'Suas 3 variações',
  lead: 'Cada uma é feita separadamente. Pode sair da página — elas chegam em',
  myVideos: 'Meus vídeos',
  loadFailed: 'Não conseguimos abrir suas variações agora. Elas continuam sendo feitas — veja em Meus vídeos.',
  working: 'Fazendo… {r} de {t} cenas prontas',
  assembling: 'Montando…',
  download: 'Baixar',
  downloading: 'Baixando…',
  redo: 'Refazer uma cena',
  choose: 'Escolher esta',
  chosen: 'Escolhida',
  failed: 'Esta falhou — {c} créditos devolvidos.',
  refunded: '{c} créditos devolvidos pelas variações que falharam.',
  back: 'Fazer outro anúncio',
  swipe: 'Deslize para ver as três',
  lost: 'Perdemos o contato por um instante. Tentando de novo…',
}
const V_ES: AdsV2VariationsCopy = {
  toggle: 'Hacer 3 variaciones',
  toggleHint: 'Mismo producto, fotos y voz — tres looks distintos (escenario, colores, cámara y apertura) para probar cuál vende más.',
  price: '3 variaciones · {c} créditos (en vez de 3 × {one})',
  make: 'Hacer 3 variaciones · {c} créditos',
  starting: 'Empezando las 3 variaciones…',
  title: 'Tus 3 variaciones',
  lead: 'Cada una se hace por separado. Puedes salir de la página — llegarán a',
  myVideos: 'Mis videos',
  loadFailed: 'No pudimos abrir tus variaciones ahora. Se siguen haciendo — búscalas en Mis videos.',
  working: 'Haciéndola… {r} de {t} escenas listas',
  assembling: 'Montando…',
  download: 'Descargar',
  downloading: 'Descargando…',
  redo: 'Rehacer una escena',
  choose: 'Elegir esta',
  chosen: 'Elegida',
  failed: 'Esta falló — {c} créditos devueltos.',
  refunded: '{c} créditos devueltos por las variaciones que fallaron.',
  back: 'Hacer otro anuncio',
  swipe: 'Desliza para ver las tres',
  lost: 'Perdimos el contacto un momento. Intentando de nuevo…',
}
export const ADS_V2_VARIATIONS_COPY = { en: V_EN, pt: V_PT, es: V_ES } satisfies { en: AdsV2VariationsCopy; pt: AdsV2VariationsCopy; es: AdsV2VariationsCopy }

/** Rótulo "A · Luz do dia". */
export function variationLabel(slot: AdsV2VariationSlot, lang: string): string {
  const look = ADS_V2_LOOKS[slot]
  const name = lang === 'pt' ? look.name.pt : lang === 'es' ? look.name.es : look.name.en
  return `${slot} · ${name}`
}
