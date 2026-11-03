// KINEO-FILME15-PERFEITO-2610. Durable pre-delivery gate; no providers or database here.
import type { PixelResult } from '@/lib/regua95/pixelScore'
import type { CaptionEvidenceAssessment } from '@/lib/captionEvidenceGuard'
import { trocarCena, type CenaRefazivel } from '@/lib/freeRedo/core'
import { custoEstimadoUsd } from '@/lib/freeRedo/core' // KINEO-GRATIS-REFAZ-CENA-0311 — o custo estimado da cena refeita vai ao relato
import { motivosDosTetos0311, cenaAceitaMotivo0311, corrigirPrompt0311, epocaDaCena0311, rotuloDaEpoca0311, CODIGOS_DO_MOTIVO_0311, TETO_PROMPT_CLIPE_0311, type RefazCena0311 } from '@/lib/free15RefazCena0311' // KINEO-GRATIS-REFAZ-CENA-0311

export const FREE15_GATE_EVENT = 'free15_delivery_gate'
export const FREE15_GATE_FAILED_EVENT = 'free15_gate_failed'
export const FREE15_GATE_VERSION = 'free15-gate-v1'
export type GateMedia = { url: string; snapshotUrl: string | null; durationSeconds: number | null }
export type GateState = {
  version: typeof FREE15_GATE_VERSION
  status: 'ready' | 'checking' | 'scene_submitting' | 'still' | 'scene' | 'render_submitting' | 'render' | 'passed' | 'failed' // KINEO-ELENCO-TRAVA-0311 — 'still': o still da cena refeito com a folha do personagem
  source: Record<string, unknown>
  captionElements: unknown[]
  captionTiming?: 'approximate'
  captionEvidence: CaptionEvidenceAssessment | null
  /** Only signed first-free-film Kling4 trial claims opt into the 15s output contract. */
  minimumSeconds?: 15
  context?: { asked: string; narration: string; language: string }
  attempted: boolean
  captionsRepaired?: boolean
  reason: string
  updatedAt: number
  media?: GateMedia
  mediaSource?: Record<string, unknown>
  sceneIndex?: number
  requestId?: string
  repairRenderId?: string
  pixel?: PixelResult | null
  /** KINEO-ELENCO-TRAVA-0311 — o pedido do still com folha da cena refeita (troca de identidade). */
  stillRequestId?: string
  /** KINEO-ELENCO-TRAVA-0311 — o still novo que foi ao clipe refeito (ausente = o still assinado de sempre). */
  stillUrl?: string
  /** KINEO-ELENCO-TRAVA-0311 — a reprovação final é a troca de personagem: o filme não pode ser celebrado. */
  identityUnresolved?: boolean
  /** KINEO-GRATIS-REFAZ-CENA-0311 — a cena refeita por teto novo do juiz no 1º filme grátis: motivo, cena, quadros, custo e resultado. */
  refazCena0311?: RefazCena0311
}
export type GateDecision = { kind: 'pass' | 'fail' | 'caption' | 'scene'; reason: string; sceneIndex?: number; identity?: boolean /* KINEO-ELENCO-TRAVA-0311 — a cena é refeita por troca de personagem */ }
export const isCaptionElement = (el: unknown): boolean => !!el && typeof el === 'object' &&
  (el as { type?: unknown }).type === 'text' && [5, 7].includes(Number((el as { track?: unknown }).track))

/** Replace caption tracks only: retain audio, clips/cuts, logo, hook, watermark and music. */
export function repairGateCaptions(source: Record<string, unknown>, captions: unknown[]): Record<string, unknown> | null {
  if (!Array.isArray(source.elements) || !captions.length || !captions.every(isCaptionElement)) return null
  return { ...source, elements: [...source.elements.filter(el => !isCaptionElement(el)), ...captions] }
}

function culpritAt(source: Record<string, unknown>, seconds: number | null, scenes: CenaRefazivel[]): number | undefined {
  if (seconds === null || !Number.isFinite(seconds)) return undefined
  const hits: Array<{ index: number; start: number }> = []
  const walk = (els: unknown, offset: number) => {
    if (!Array.isArray(els)) return
    for (const raw of els) {
      if (!raw || typeof raw !== 'object') continue
      const el = raw as Record<string, unknown>
      const start = offset + (typeof el.time === 'number' ? el.time : 0)
      const duration = Number(el.duration)
      if (el.type === 'video' && Number.isFinite(duration) && seconds >= start && seconds < start + duration) {
        const scene = scenes.find(s => s.clipUrl === el.source && (!s.interval ||
          seconds >= s.interval.start && seconds < s.interval.start + s.interval.duration))
        if (scene) hits.push({ index: scene.index, start: Math.max(start, scene.interval?.start ?? start) })
      }
      walk(el.elements, start)
    }
  }
  walk(source.elements, 0)
  // The signed classic builder overlaps each old shot by 0.06s. The next
  // full-frame video is appended above it on the same track: a defect at a cut
  // belongs to the newly visible shot, not the still-active tail underneath.
  return hits.reduce<{ index: number; start: number } | undefined>((visible, hit) =>
    !visible || hit.start >= visible.start ? hit : visible, undefined)?.index
}

/** Only complete pixel evidence can pass. Scores alone never trigger a scene reshoot. */
export function decideFree15Gate(state: GateState, media: GateMedia, pixel: PixelResult | null, scenes: CenaRefazivel[], opts?: { semReferencia?: readonly number[] } /* KINEO-ELENCO-TRAVA-0311 — as cenas que nasceram sem a referência do personagem */): GateDecision {
  if (media.durationSeconds === null || !Number.isFinite(media.durationSeconds)) return { kind: 'fail', reason: 'duration_unverified' }
  const minimumSeconds = state.minimumSeconds === 15 ? 15 : 14
  if (media.durationSeconds < minimumSeconds) return { kind: 'fail', reason: `duration_below_${minimumSeconds}` }
  // Replacing visual text does not create new evidence of the unchanged audio.
  // Preserve the disagreement without asserting whether TTS or ASR was wrong.
  if (state.captionEvidence?.status === 'mismatch' && state.captionsRepaired) return { kind: 'fail', reason: 'caption_evidence_unresolved_after_repair' }
  if (!pixel || pixel.evidence_status !== 'complete' || pixel.score === null) {
    // A known caption mismatch still gets its one local repair when vision is
    // unavailable. Missing pixel evidence can never certify the repaired film.
    if (state.captionEvidence?.status === 'mismatch' && !state.captionsRepaired) return { kind: 'caption', reason: 'caption_evidence_mismatch' }
    return { kind: 'fail', reason: 'pixel_evidence_unverified' }
  }
  const capped = pixel.cap_limit < 100 && pixel.caps.length > 0
  const frames = pixel.defect_frames ?? pixel.frames
  const identityBad = pixel.gate_evidence?.identity_changed ?? pixel.identity_consistent === false
  const caption = state.captionEvidence?.status === 'mismatch' && !state.captionsRepaired || capped &&
    (pixel.gate_evidence?.caption_language_wrong || pixel.gate_evidence?.caption_illegible || pixel.caption_language_ok === false || pixel.caption_legible === false || frames.some(f => f.issues.includes('caption_broken') || f.issues.includes('caption_illegible')))
  const bad = capped ? frames.filter(f => f.issues.some(i => ['invented_text', 'subject_missing', 'off_topic'].includes(i))) : []
  // Identity changes are located by the reviewer in chronological frames. Choose the changed scene, not a random clip.
  const identityFrames = capped && identityBad ? (pixel.identity_changes ?? []).flatMap(change => pixel.frames.filter(f => f.i === change.to)) : []
  const located = [...bad, ...identityFrames].map(f => culpritAt(state.source, f.t, scenes)).filter((i): i is number => i !== undefined)
  if (bad.length || capped && identityBad) {
    // KINEO-ELENCO-TRAVA-0311 — troca de personagem: a cena que nasceu SEM a referência (still de texto) é a culpada provável — o quadro "depois da troca" pode ser a cena certa.
    const identity = capped && identityBad
    const semReferencia = identity ? scenes.find(s => opts?.semReferencia?.includes(s.index))?.index : undefined
    const sceneIndex = semReferencia ?? located.find(i => i > 0) ?? located[0]
    return sceneIndex === undefined ? { kind: 'fail', reason: 'scene_defect_not_located', ...(identity ? { identity } : {}) } : { kind: 'scene', reason: 'pixel_scene_cap', sceneIndex, ...(identity ? { identity } : {}) }
  }
  if (caption) return { kind: 'caption', reason: state.captionEvidence?.status === 'mismatch' ? 'caption_evidence_mismatch' : 'pixel_caption_cap' }
  // Other pixel ceilings (black frame, anatomy etc.) must not be labelled perfect either.
  if (capped) return { kind: 'fail', reason: 'other_pixel_cap' }
  return { kind: 'pass', reason: 'gate_passed' }
}

/**
 * KINEO-GRATIS-REFAZ-CENA-0311 [TRAVA 8.2 — fundador 03/11: "As 2 sim" — refazer a cena reprovada no 1º filme grátis]
 * Só os tetos NOVOS do juiz (época, pessoa inventada, plano parado — e nenhum outro teto junto) ganham UMA cena refeita. A cena é a
 * dos quadros que carregaram o defeito (tempo do quadro → cena pelo RenderScript, o mesmo culpritAt do texto/identidade; a mais
 * votada; empate: a mais cedo, e no plano parado a mais tarde). Plano parado sem quadro localizado → a última cena. Época/pessoa
 * sem quadro localizado (ou pessoa numa cena que não pediu "sem gente") → null: a falha honesta de sempre ('other_pixel_cap').
 */
export function refazCenaGratis0311(state: GateState, pixel: PixelResult | null, scenes: CenaRefazivel[]): RefazCena0311 | null {
  if (pixel?.evidence_status !== 'complete' || pixel.score === null || !(pixel.cap_limit < 100) || !scenes.length) return null
  const motivos = motivosDosTetos0311(pixel.caps)
  if (!motivos) return null
  const contexto = `${state.context?.asked ?? ''}\n${state.context?.narration ?? ''}`
  const frames = pixel.defect_frames ?? pixel.frames
  for (const motivo of motivos) {
    const votos = new Map<number, number[]>()
    for (const f of frames) {
      if (!f.issues.some(i => (CODIGOS_DO_MOTIVO_0311[motivo] as readonly string[]).includes(i))) continue
      const i = culpritAt(state.source, f.t, scenes)
      const scene = i === undefined ? undefined : scenes.find(s => s.index === i)
      if (!scene || !cenaAceitaMotivo0311(motivo, scene.input.prompt, contexto)) continue
      votos.set(scene.index, [...(votos.get(scene.index) ?? []), f.i])
    }
    let cena: number | undefined
    let quadros: number[] = []
    for (const [i, q] of [...votos].sort((a, b) => motivo === 'parado' ? b[0] - a[0] : a[0] - b[0])) if (q.length > quadros.length) { cena = i; quadros = q }
    if (cena === undefined && motivo === 'parado') cena = Math.max(...scenes.map(s => s.index))
    const scene = scenes.find(s => s.index === cena)
    if (!scene) continue
    const epoca = motivo === 'epoca' ? rotuloDaEpoca0311(epocaDaCena0311(scene.input.prompt, contexto)) : undefined
    return { motivo, cena: scene.index, quadros: [...new Set(quadros)].sort((a, b) => a - b), ...(epoca ? { epoca } : {}), usdEstimado: custoEstimadoUsd(scene.model, scene.seconds) }
  }
  return null
}

export interface Free15GateDeps {
  now(): number
  read(): Promise<GateState | null>
  /** Compare-and-swap of the signed previous version. False includes conflicts/errors. */
  move(previous: GateState, next: GateState): Promise<boolean>
  judge(media: GateMedia, state: GateState): Promise<PixelResult | null>
  scenes(source: Record<string, unknown>): CenaRefazivel[]
  submitScene(scene: CenaRefazivel, imageUrl?: string): Promise<string> // KINEO-ELENCO-TRAVA-0311 — imageUrl: o still refeito com a folha (1º quadro do clipe)
  /** KINEO-ELENCO-TRAVA-0311 — as cenas sem referência do personagem (claim assinado, elenco_trava). */
  semReferencia?(): number[]
  /** KINEO-ELENCO-TRAVA-0311 — UM POST do still da cena com a folha + o prompt do still assinado; null = a cena não tem folha (refaz como sempre). */
  submitStill?(scene: CenaRefazivel, refaz0311?: RefazCena0311): Promise<string | null> // KINEO-GRATIS-REFAZ-CENA-0311 — refaz0311: a correção de época vai também ao prompt do still com folha
  /** KINEO-ELENCO-TRAVA-0311 — só leitura do still (formato e moderação conferidos no 'done'). */
  pollStill?(scene: CenaRefazivel, requestId: string, refaz0311?: RefazCena0311): Promise<{ status: 'pending' | 'done' | 'failed'; url?: string | null }> // KINEO-GRATIS-REFAZ-CENA-0311 — o MESMO prompt do envio
  /** KINEO-GRATIS-REFAZ-CENA-0311 — o 1º filme grátis de conta de país rico (sem esta função: nunca refaz por teto novo). */
  primeiroFilmeGratis0311?(): Promise<boolean>
  pollScene(scene: CenaRefazivel, requestId: string): Promise<{ status: 'pending' | 'done' | 'failed'; url?: string | null }>
  submitRender(source: Record<string, unknown>): Promise<string>
  pollRender(id: string): Promise<{ status: string; url: string | null; snapshotUrl: string | null; durationSeconds?: number | null }>
}
export type GateOutcome = { status: 'pending' } | { status: 'passed' | 'failed'; media: GateMedia; reason: string; source?: Record<string, unknown>; identityUnresolved?: boolean /* KINEO-ELENCO-TRAVA-0311 */ }
const pending: GateOutcome = { status: 'pending' }
const STALE = 5 * 60_000
const PROVIDER_STALE = 30 * 60_000

/** One provider action per durable phase. An ambiguous/stale submission is NEVER resubmitted. */
export async function advanceFree15Gate(d: Free15GateDeps, original: GateMedia): Promise<GateOutcome> {
  let state = await d.read()
  let finalPixel: PixelResult | null | undefined
  if (!state) return { status: 'failed', media: original, reason: 'gate_context_missing' }
  const move = async (patch: Partial<GateState>): Promise<boolean> => {
    const next = { ...state!, ...patch, updatedAt: d.now() }
    if (!await d.move(state!, next)) return false
    state = next
    return true
  }
  // KINEO-GRATIS-REFAZ-CENA-0311 — o prompt da cena refeita por teto novo leva a correção positiva (no clipe; o still com folha a recebe no servidor).
  const comCorrecao0311 = (scene: CenaRefazivel): CenaRefazivel => state?.refazCena0311 ? { ...scene, input: { ...scene.input, prompt: corrigirPrompt0311(scene.input.prompt, state.refazCena0311, TETO_PROMPT_CLIPE_0311) } } : scene
  const finish = async (status: 'passed' | 'failed', reason: string, media = state?.media ?? original, identityUnresolved = false): Promise<GateOutcome> =>
    await move({ status, reason, media, ...(finalPixel === undefined ? {} : { pixel: finalPixel }), ...(identityUnresolved ? { identityUnresolved: true } : {}), ...(state?.refazCena0311 ? { refazCena0311: { ...state.refazCena0311, resultado: status } } : {}) /* KINEO-GRATIS-REFAZ-CENA-0311 — o desfecho da cena refeita fica no evento */ }) ? { status, reason, media, source: state?.mediaSource ?? state?.source, ...(identityUnresolved ? { identityUnresolved: true } : {}) } : pending // KINEO-ELENCO-TRAVA-0311 — + a marca da troca de personagem não resolvida
  if (state.status === 'passed' || state.status === 'failed') return { status: state.status, reason: state.reason, media: state.media ?? original, source: state.mediaSource ?? state.source, ...(state.identityUnresolved ? { identityUnresolved: true } : {}) } // KINEO-ELENCO-TRAVA-0311
  const age = d.now() - state.updatedAt
  if (['checking', 'scene_submitting', 'render_submitting'].includes(state.status)) {
    return age > STALE ? finish('failed', 'gate_action_stale') : pending
  }
  // KINEO-ELENCO-TRAVA-0311 — o still da cena refeito com a folha: pronto → o clipe sai dele; falhou/estourou 5 min → o clipe sai do still assinado de sempre (nunca para o portão).
  if (state.status === 'still') {
    const scene = d.scenes(state.source).find(s => s.index === state!.sceneIndex)
    if (!scene || !state.stillRequestId || !d.pollStill) return finish('failed', 'repair_scene_missing')
    let still: { status: 'pending' | 'done' | 'failed'; url?: string | null } = { status: 'failed' }
    try { still = await d.pollStill(scene, state.stillRequestId, state.refazCena0311) } catch { if (age <= STALE) return pending } // KINEO-GRATIS-REFAZ-CENA-0311 — + a correção do envio
    if (still.status === 'pending' && age <= STALE) return pending
    const imageUrl = still.status === 'done' && still.url ? still.url : undefined
    if (!await move({ status: 'scene_submitting', ...(imageUrl ? { stillUrl: imageUrl } : {}) })) return pending
    try {
      const requestId = await d.submitScene(comCorrecao0311(scene), imageUrl) // KINEO-GRATIS-REFAZ-CENA-0311 — sem refazCena0311: a cena de sempre
      await move({ status: 'scene', requestId })
      return pending
    } catch { return finish('failed', 'scene_repair_submit_failed') }
  }
  if (state.status === 'scene') {
    const scene = d.scenes(state.source).find(s => s.index === state!.sceneIndex)
    if (!scene || !state.requestId) return finish('failed', 'repair_scene_missing')
    let result
    try { result = await d.pollScene(scene, state.requestId) } catch { return age > PROVIDER_STALE ? finish('failed', 'scene_poll_timeout') : pending }
    if (result.status === 'pending') return age > PROVIDER_STALE ? finish('failed', 'scene_timeout') : pending
    if (result.status !== 'done' || !result.url) return finish('failed', 'scene_repair_failed')
    const swapped = trocarCena(state.source, scene, result.url)
    if (!swapped.trocados) return finish('failed', 'scene_not_in_source')
    if (!await move({ status: 'render_submitting', source: swapped.source })) return pending
    try {
      const repairRenderId = await d.submitRender(state.source)
      await move({ status: 'render', repairRenderId })
      return pending
    } catch { return finish('failed', 'repair_render_submit_failed') }
  }
  let media = state.media ?? original
  if (state.status === 'render') {
    if (!state.repairRenderId) return finish('failed', 'repair_render_missing')
    let result
    try { result = await d.pollRender(state.repairRenderId) } catch { return age > PROVIDER_STALE ? finish('failed', 'render_poll_timeout') : pending }
    if (['failed', 'cancelled'].includes(result.status)) return finish('failed', 'repair_render_failed')
    if (result.status !== 'succeeded' || !result.url) return age > PROVIDER_STALE ? finish('failed', 'render_timeout') : pending
    media = { url: result.url, snapshotUrl: result.snapshotUrl, durationSeconds: result.durationSeconds ?? null }
  }
  if (!await move({ status: 'checking', media, mediaSource: state.source })) return pending
  let pixel: PixelResult | null = null
  try { pixel = await d.judge(media, state) } catch { /* explicit failed/unverified, never pass on exception */ }
  finalPixel = pixel
  const decision = decideFree15Gate(state, media, pixel, d.scenes(state.source), { semReferencia: d.semReferencia?.() ?? [] }) // KINEO-ELENCO-TRAVA-0311 — + as cenas sem referência
  if (decision.kind === 'pass') return finish('passed', decision.reason, media)
  // KINEO-GRATIS-REFAZ-CENA-0311 [TRAVA 8.2 — fundador 03/11: "As 2 sim"] — teto novo do juiz (época/pessoa/parado) no 1º filme grátis de país
  // rico: a MESMA refação de uma cena (attempted=true antes de gastar; nunca duas refações). Refeita e ainda reprovada → a falha de sempre.
  const refaz0311 = !state.attempted && decision.kind === 'fail' && decision.reason === 'other_pixel_cap' && d.primeiroFilmeGratis0311 ? refazCenaGratis0311(state, pixel, d.scenes(state.source)) : null
  let refazAqui0311 = false
  if (refaz0311) { try { refazAqui0311 = await d.primeiroFilmeGratis0311!() === true } catch { refazAqui0311 = false } }
  if (state.attempted || decision.kind === 'fail' && !refazAqui0311) return finish('failed', decision.reason, media, decision.identity === true) // KINEO-ELENCO-TRAVA-0311 — refeita e o personagem ainda troca: falha marcada, nunca "passou"
  // Persist attempted=true BEFORE spending. Two polls cannot buy two attempts.
  if (decision.kind === 'caption') {
    const repaired = repairGateCaptions(state.source, state.captionElements)
    if (!repaired) return finish('failed', 'canonical_captions_unavailable', media)
    if (!await move({ status: 'render_submitting', attempted: true, captionsRepaired: true, reason: decision.reason, pixel, source: repaired })) return pending
    try {
      const repairRenderId = await d.submitRender(repaired)
      await move({ status: 'render', repairRenderId })
      return pending
    } catch { return finish('failed', 'caption_repair_submit_failed', media) }
  }
  const scene = d.scenes(state.source).find(s => s.index === (refazAqui0311 ? refaz0311!.cena : decision.sceneIndex)) // KINEO-GRATIS-REFAZ-CENA-0311 — era: s.index === decision.sceneIndex
  if (!scene) return finish('failed', 'repair_scene_missing', media)
  if (!await move({ status: 'scene_submitting', attempted: true, sceneIndex: scene.index, reason: decision.reason, pixel, ...(refazAqui0311 ? { reason: `gratis_refaz_${refaz0311!.motivo}`, refazCena0311: refaz0311! } : {}) })) return pending // KINEO-GRATIS-REFAZ-CENA-0311 — + o motivo e o relato da cena
  // KINEO-ELENCO-TRAVA-0311 — troca de personagem: o clipe refeito com o MESMO still assinado repetia o rosto errado. Com folha no claim, o still da cena é refeito com ela primeiro.
  // KINEO-GRATIS-REFAZ-CENA-0311 — época errada com folha: o still (a roupa) também é refeito, com a correção de época no prompt dele.
  if ((decision.identity || state.refazCena0311?.motivo === 'epoca') && d.submitStill) {
    let stillRequestId: string | null = null
    try { stillRequestId = state.refazCena0311 ? await d.submitStill(scene, state.refazCena0311) : await d.submitStill(scene) } catch { stillRequestId = null } // KINEO-GRATIS-REFAZ-CENA-0311 — era: await d.submitStill(scene)
    if (stillRequestId) { await move({ status: 'still', stillRequestId }); return pending }
  }
  try {
    const requestId = await d.submitScene(comCorrecao0311(scene)) // KINEO-GRATIS-REFAZ-CENA-0311 — era: d.submitScene(scene)
    await move({ status: 'scene', requestId })
    return pending
  } catch { return finish('failed', 'scene_repair_submit_failed', media) }
}
