// KINEO-CLIPES-2026-09-29 — o FLUXO do clipe, com as dependências injetadas (banco, fal, moderação, débito, bucket).
//
// Por que injetado: a ordem é o contrato de dinheiro, e o guardião (scripts/test-clipes-2026-09-29.mjs) EXECUTA este
// arquivo com dependências falsas para provar a ordem — não procura texto. As rotas (app/api/clips/*) só ligam os fios
// reais (lib/clips/clipServer.ts).
//
// CONTRATO DO PEDIDO (submitClip):
//   1. forma (motor, modo, duração oferecida, formato, texto, posse da foto) — nada custa;
//   2. motor visível para a conta (pausa, lançamento, plano) — nada custa;
//   3. replay pela chave de idempotência: o mesmo pedido devolve a MESMA linha, nunca um segundo débito;
//   4. teto de clipes em andamento por conta;
//   5. a foto existe e é JPG/PNG de verdade (a URL própria sozinha não prova os bytes);
//   6. MODERAÇÃO do texto e da foto — ANTES de qualquer débito;
//   7. saldo;
//   8. a linha nasce `pending` (UNIQUE user_id+idempotency_key é a trava contra dois débitos do mesmo pedido);
//   9. débito com chave determinística clips-<uuid> (o RPC é idempotente por chave). NÃO é o clip-<uuid> do Modo Clipe
//      do Studio (/api/generate-clip), que grava em `videos` e fica na varredura genérica;
//  10. envio à fila da fal (uma tentativa, sem retry do POST pago);
//  11. qualquer falha depois do débito ESTORNA (refund_render_credits é idempotente: UPDATE … WHERE refunded_at IS NULL)
//      e fecha a linha como `failed`.
//
// CONTRATO DA ENTREGA (settleClip): o MP4 vai para o NOSSO bucket ANTES de a linha virar `done` (a URL da fal expira —
// CLAUDE.md 17/08); falha terminal do fornecedor, envio perdido ou prazo vencido ESTORNAM e fecham `failed`; toda
// mudança de estado é condicional (só quem move a linha grava o evento), então duas abas e o cron juntos nunca
// entregam nem estornam duas vezes.
import {
  CLIP_ENGINES,
  validateClipRequest,
  buildClipFalInput,
  offeredSecondsFor,
  aspectsFor,
  type ClipEngineKey,
  type ClipEngineAccess,
  type ClipRequest,
  type ClipRequestInput,
} from './clipCatalog'
import { clipCreditCost, clipFalUsd } from './clipPricing'
import type { RecreatePlan } from '@/lib/recreate/generation'
import { clipEffectCredits, clipEffectEventMetadata, clipEffectForRow, clipTemplateForRequest } from './clipEffects'
// KINEO-ROSTO-QUADRO-CHAVE-2810 — "Put your face in it" em DUAS etapas (lib/clips/faceRemix.ts): o submitClip confere o `remix` do
// KINEO-ROSTO-QUADRO-CHAVE-2810 — pedido no catálogo, cobra os 10 e manda a etapa 1 (quadro-chave, Nano Banana edit) no lugar do i2v;
// KINEO-ROSTO-QUADRO-CHAVE-2810 — o settleClip, quando o quadro-chave fica pronto, persiste-o no NOSSO bucket, reserva a etapa 2
// KINEO-ROSTO-QUADRO-CHAVE-2810 — (condicional: um ator só) e envia o vídeo (Kling i2v) partindo do quadro-chave. Falha em qualquer
// KINEO-ROSTO-QUADRO-CHAVE-2810 — etapa estorna o débito INTEIRO; a etapa 1 falhando, o motor de vídeo nunca é chamado.
import { FACE_REMIX_EVENTS, FACE_REMIX_KEYFRAME_FAILED, FACE_REMIX_KEYFRAME_MODEL, faceRemixCredits, faceRemixEventMetadata, faceRemixFalUsd, faceRemixForRequest, faceRemixForRow, faceRemixKeyframeInput, faceRemixStageForRow } from './faceRemix' // KINEO-ROSTO-QUADRO-CHAVE-2810
import { MOVIMENTO_FALHA, MOVIMENTO_VIDEO_MODEL, movimentoEnvio, movimentoEnvioEm, movimentoStageForRow } from '@/lib/recreate/movimento' // KINEO-RECREATE-MOVIMENTO-1411
import { ownedClipImageUrl } from './clipCatalog' // KINEO-ROSTO-QUADRO-CHAVE-2810 — a posse do recorte do rosto (2ª referência do quadro-chave), a mesma régua da foto

/** Pedido sem request_id da fal há mais que isto = o envio morreu no meio; estorna. */
export const CLIP_PENDING_STALE_MS = 10 * 60 * 1000
/** Clipe único leva minutos; acima disto o fornecedor não entrega mais (e a URL já teria expirado). */
export const CLIP_EXPIRE_MS = 6 * 60 * 60 * 1000
/** Clipes em andamento por conta. */
export const CLIP_MAX_ACTIVE = 3
/** KINEO-RECREATE-FILA-KLING-EDIT-1411 — a marca da linha na fila (failure_reason de uma linha pending). O mesmo valor de lib/recreate/filaKlingEdit FILA_MARCA. */
export const QUEUE_MARK = 'queue_kling_edit'
/** KINEO-RECREATE-FILA-REVISAO-1411 — a marca da linha que saiu da fila e está sendo mandada. O mesmo valor de lib/recreate/filaKlingEdit FILA_ENVIANDO. */
export const QUEUE_SENDING = 'queue_sending'

export type ClipStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface ClipRow {
  id: string
  user_id: string
  idempotency_key: string
  fingerprint: string
  billing_reference: string
  engine: ClipEngineKey
  mode: 'text' | 'image'
  model: string
  seconds: number
  aspect: string
  prompt: string
  image_url: string | null
  credits: number
  fal_usd: number
  status: ClipStatus
  fal_request_id: string | null
  video_url: string | null
  failure_reason: string | null
  credits_refunded: number
  created_at: string
}

export type ModerationOutcome = { ok: true } | { ok: false; reason: 'blocked' | 'unavailable' | 'unprocessable'; status: number; message: string }

export interface ClipSubmitDeps {
  supabaseUrl: string
  engineAccess(engine: ClipEngineKey): ClipEngineAccess
  findByKey(userId: string, key: string): Promise<ClipRow | null>
  countActive(userId: string): Promise<number>
  verifyImage(url: string): Promise<void>
  moderate(args: { text: string; imageUrls: string[] }): Promise<ModerationOutcome>
  getBalance(userId: string): Promise<number>
  newId(): string
  insertPending(row: ClipRow): Promise<{ ok: true } | { ok: false; conflict: boolean; error?: string }>
  debit(billingReference: string, credits: number): Promise<{ ok: true; balance: number } | { ok: false; error: string }>
  refund(billingReference: string): Promise<number>
  submit(model: string, input: Record<string, unknown>): Promise<{ ok: true; requestId: string } | { ok: false; ambiguous: boolean; error: string }>
  markSubmitted(id: string, requestId: string): Promise<boolean>
  markFailed(id: string, reason: string, refunded: number): Promise<boolean>
  event(name: 'clip_requested' | 'clip_failed' | 'clip_engine_fallback' | 'clip_queued', metadata: Record<string, unknown>): Promise<void> // KINEO-RECREATE-FILA-KLING-EDIT-1411 — + clip_queued
  now(): number
  /** KINEO-RECREATE-FILA-KLING-EDIT-1411 — fila de um pedido por vez no fornecedor (lib/recreate/filaKlingEdit.ts). Só age onde applies(row) é true. */
  queue?: ClipQueueDeps
  /** KINEO-CLIPE-AUTO-3110 — troca o motor da linha ainda 'pending' (motor, modelo, duração, formato, preço e referência de cobrança). Sem ela, não há troca. */
  switchEngine?(id: string, patch: Pick<ClipRow, 'engine' | 'model' | 'seconds' | 'aspect' | 'credits' | 'fal_usd' | 'billing_reference'>): Promise<boolean>
  /** KINEO-MOTORES-SAEM-0511 — a frase da recusa do clipe NOVO em motor fora da oferta; null = pode seguir (motor da oferta, efeito do catálogo ou Espaços). */
  retiredClipRefusal?(req: ClipRequest): string | null
}

/** KINEO-RECREATE-FILA-KLING-EDIT-1411 [CEO 14/11: dois pedidos ao mesmo tempo no Kling edit = nenhum troca] — os fios da fila (a ORDEM mora aqui; o servidor só liga). */
export interface ClipQueueDeps {
  /** Esta linha é de um modelo com fila? Fora dele: false → caminho de sempre, byte a byte. */
  applies(row: ClipRow): boolean
  /** A linha está NA FILA (pending, sem pedido no fornecedor, com a marca)? */
  queued(row: ClipRow): boolean
  /** É a vez desta linha E a vaga agora é dela? true = este ator (e só ele) pode mandar ao fornecedor. `daFila`: a linha está saindo da fila —
   *  no BANCO ela tem de ser a mais antiga da fila (KINEO-RECREATE-FILA-REVISAO-1411: linha lida antes não decide). Resolve a vaga vencida, se houver. */
  take(row: ClipRow, opts?: { daFila?: boolean }): Promise<boolean>
  /** KINEO-RECREATE-FILA-REVISAO-1411 — tira a linha da fila para mandar: UPDATE condicional à marca da fila. Só UM ator consegue; false = já saiu, venceu ou fechou. */
  claimSend(id: string): Promise<boolean>
  /** KINEO-RECREATE-FILA-REVISAO-1411 — teto de espera: failed queue_timeout por UPDATE condicional à marca da fila (0 estornado até o estorno). false = não moveu. */
  expire(id: string): Promise<boolean>
  /** KINEO-RECREATE-FILA-REVISAO-1411 — grava o valor estornado na linha já failed (onde ainda é 0). */
  setRefunded(id: string, refunded: number): Promise<void>
  /** Marca a linha (ainda pending) como na fila. */
  enqueue(id: string): Promise<boolean>
  /** Manda ao fornecedor o pedido gravado na linha (um POST, sem retry do POST pago). */
  submit(row: ClipRow): Promise<{ ok: true; requestId: string } | { ok: false; ambiguous: boolean; error: string }>
  /** processing + request_id, condicional à linha que ESTE ator tirou da fila (claimSend). */
  markSubmitted(id: string, requestId: string): Promise<boolean>
  /** Solta a vaga SÓ se for desta linha. */
  release(id: string): Promise<void>
  /** Teto de espera na fila: passou disso sem sair = falha com estorno. */
  waitLimitMs: number
}

export type ClipSubmitResult =
  | { ok: true; status: number; clip: ClipRow; replay: boolean; balance: number | null }
  | { ok: false; status: number; code: string; error: string; balance?: number; clip?: ClipRow }

export const VALID_CLIP_KEY = /^[A-Za-z0-9._:-]{8,100}$/

// KINEO-CLIPE-AUTO-3110 — fundador 30/10 ("quando há alguma coisa errada o sistema escolhe um motor que vai entregar algo certo"):
// em 30 dias, 15 das 21 falhas de clipe foram a fal RECUSANDO o pedido no envio (provider_rejected, quase todas no Kling 3); o
// cliente via erro e ia embora. Agora a recusa no envio troca, uma vez, para o Seedance 1.5 (o motor que menos recusa: 1 em 45),
// com o mesmo texto, a mesma foto e a duração mais próxima que ele faz. Cobrança: o MENOR dos dois preços (o Seedance é mais
// barato que Kling 3/H3/Veo) — o débito do motor pedido é estornado e o novo entra com outra referência; nunca cobra duas vezes.
// Fora da troca: efeito-modelo (o efeito é do fornecedor), resposta ambígua (pode ter sido aceita) e pedido que já era Seedance.
export const CLIP_FALLBACK_ENGINE: ClipEngineKey = 'seedance'
export function clipFallbackRequest(req: ClipRequest): ClipRequest | null {
  if (req.engine === CLIP_FALLBACK_ENGINE) return null
  const spec = CLIP_ENGINES[CLIP_FALLBACK_ENGINE]
  const model = req.mode === 'i2v' ? spec.i2vModel : spec.t2vModel
  const offered = offeredSecondsFor(CLIP_FALLBACK_ENGINE)
  if (!model || offered.length === 0) return null
  const seconds = offered.reduce((best, s) => (Math.abs(s - req.seconds) < Math.abs(best - req.seconds) ? s : best), offered[0])
  const choices = aspectsFor(CLIP_FALLBACK_ENGINE, req.mode)
  const aspect = choices.length === 0 ? 'image' : req.aspect !== 'image' && choices.includes(req.aspect) ? req.aspect : choices[0]
  return { ...req, engine: CLIP_FALLBACK_ENGINE, model, seconds, aspect }
}

/** Impressão digital do pedido: mesma chave com outro conteúdo = conflito, não replay. */
export function clipFingerprint(req: ClipRequest): string {
  return JSON.stringify([req.engine, req.mode, req.seconds, req.aspect, req.prompt, req.imageUrl ?? ''])
}

// KINEO-S25-FOTO-CLIPES-1610 — o MOTIVO da recusa do fornecedor. Até 16/10 o /clips lia o erro da fal e o jogava fora: o
// clip_failed gravava só 'provider_failed'/'provider_rejected', e as 2 recusas do Seedance 2.5 com foto ficaram sem causa
// (docs/DIAGNOSTICO-S25-FOTO-CLIPES-2026-10-16.md). Agora o texto da fal vai como `provider_error` no clip_failed (envio E
// consulta, todos os motores) — limpo: sem URL (a URL assinada da foto/do vídeo), sem chave, sem token, ≤300 caracteres.
export const PROVIDER_ERROR_MAX = 300 // KINEO-S25-FOTO-CLIPES-1610

/** KINEO-S25-FOTO-CLIPES-1610 — o texto útil do corpo de erro da fal: `detail` (string ou lista [{loc,msg,type}]), senão
 *  `message`/`error`. Nunca devolve o `input`/`ctx` que a validação ecoa (traria o texto e a foto do cliente). */
export function falErrorDetail(body: unknown): string {
  if (typeof body === 'string') return body
  if (!body || typeof body !== 'object') return ''
  const b = body as Record<string, unknown>
  const d = b.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) {
    return d.map((item) => {
      if (typeof item === 'string') return item
      if (!item || typeof item !== 'object') return ''
      const it = item as Record<string, unknown>
      const loc = Array.isArray(it.loc) ? it.loc.filter((x) => typeof x === 'string' || typeof x === 'number').join('.') : ''
      const msg = typeof it.msg === 'string' ? it.msg : typeof it.message === 'string' ? it.message : ''
      const type = typeof it.type === 'string' ? ` (${it.type})` : ''
      // KINEO-RECREATE-SEU-VIDEO-1311 [CEO 13/11: "o livro das falhas"] — content_policy_violation traz `categories`; 'model_moderated' = a
      // recusa veio da moderação do PRÓPRIO modelo (ByteDance), não do filtro da fal (docs.fal.ai/model-apis/errors). Sem categories: o de antes.
      const cats = Array.isArray(it.categories) ? it.categories.filter((x) => typeof x === 'string').slice(0, 8).join(',') : ''
      return `${loc ? loc + ': ' : ''}${msg}${type}${cats ? ` [${cats}]` : ''}`.trim() // KINEO-RECREATE-SEU-VIDEO-1311 — era: …${msg}${type}`
    }).filter(Boolean).join('; ')
  }
  if (d && typeof d === 'object') return falErrorDetail(d)
  for (const k of ['message', 'error']) if (typeof b[k] === 'string') return b[k] as string
  const rest = Object.fromEntries(Object.entries(b).filter(([k]) => k !== 'input' && k !== 'ctx')) // KINEO-S25-FOTO-CLIPES-1610 — o eco do pedido nunca vai junto
  try { return JSON.stringify(rest) } catch { return '' }
}

/** KINEO-S25-FOTO-CLIPES-1610 — limpa o texto do fornecedor antes de gravar/logar: tira os segredos passados (a FAL_KEY),
 *  toda URL (assinada ou não), credencial depois de nome conhecido (key=, token:, Bearer …) e qualquer sequência opaca longa
 *  (chave/token/assinatura); junta espaços e corta em PROVIDER_ERROR_MAX. Vazio → null. */
export function cleanProviderError(raw: unknown, secrets: readonly string[] = []): string | null {
  if (raw === null || raw === undefined) return null
  let text = typeof raw === 'string' ? raw : falErrorDetail(raw)
  for (const s of secrets) if (typeof s === 'string' && s.length >= 8) text = text.split(s).join('[secret]')
  text = text
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>()\]]+/gi, '[url]')
    .replace(/\bdata:[a-z]+\/[^\s"']+/gi, '[data]')
    .replace(/\b(bearer|key|basic|token)\s+[A-Za-z0-9._~+/:=-]{12,}/gi, (_m, name: string) => `${name} [redacted]`)
    .replace(/\b(authorization|api[_-]?key|access[_-]?token|token|secret|signature|sig|password|credentials?|key|x-amz-[a-z-]+)(["']?\s*[:=]\s*["']?)(?=[^\s"',;&}]*\d)[^\s"',;&}]{8,}/gi, (_m, name: string, sep: string) => `${name}${sep}[redacted]`)
    .replace(/[A-Za-z0-9_+/=:-]{32,}/g, (m) => (/[0-9]/.test(m) && /[A-Za-z]/.test(m) ? '[redacted]' : m))
    .replace(/\s+/g, ' ')
    .trim()
  return text ? text.slice(0, PROVIDER_ERROR_MAX) : null
}

export function clipTelemetry(row: Pick<ClipRow, 'engine' | 'seconds' | 'mode' | 'credits' | 'id'>): Record<string, unknown> {
  // Sem dado pessoal: nada de texto, foto ou e-mail — só a forma do pedido.
  return { clip_id: row.id, engine: row.engine, seconds: row.seconds, with_image: row.mode === 'image', credits: row.credits }
}

export async function submitClip(
  deps: ClipSubmitDeps,
  args: { userId: string; idempotencyKey: string; body: ClipRequestInput; recreatePlan?: RecreatePlan },
): Promise<ClipSubmitResult> {
  if (!VALID_CLIP_KEY.test(args.idempotencyKey)) {
    return { ok: false, status: 400, code: 'idempotency', error: 'A valid request key is required. Please try again.' }
  }
  // KINEO-RECREATE-TRAVA-1011 [fundador 10/11: "Cobra 45"] — a duração do Recreate é a da FONTE do catálogo (o Recast a herda; 8 s
  // não é uma duração do H3 de clipe). O formato do pedido é conferido com uma duração válida do motor e a duração confiável do
  // plano (planRecreate) volta em seguida. Sem recreatePlan: byte a byte o de antes.
  const checked = validateClipRequest(args.recreatePlan ? { ...args.body, seconds: 10 } : args.body, { userId: args.userId, supabaseUrl: deps.supabaseUrl }) // KINEO-RECREATE-TRAVA-1011 — era: validateClipRequest(args.body, …)
  if (!checked.ok) return { ok: false, status: checked.status, code: checked.code, error: checked.error }
  const req = args.recreatePlan ? { ...checked.request, seconds: Number(args.recreatePlan.body.seconds) } : checked.request // KINEO-RECREATE-TRAVA-1011 — era: checked.request
  // Recreate is a trusted argument supplied only by /api/recreate after access and catalog validation.
  // The public /api/clips route never forwards it from the request body.
  const recreate = args.recreatePlan
  // KINEO-EFEITOS-NOVOS-2026-10-13 — efeito-modelo (template do fornecedor): conferido no catálogo ANTES de qualquer custo. O
  // modelo, a entrada da fal e o preço saem de effect.template; motor visível, replay, teto, foto, moderação, saldo, linha,
  // débito e estorno são os de baixo, iguais para todo clipe. Sem `effect` no pedido, `template` é null e nada muda.
  const tpl = clipTemplateForRequest(args.body.effect, req)
  if (!tpl.ok) return { ok: false, status: 400, code: 'effect', error: 'Choose one of the listed effects.' }
  const template = tpl.effect?.template ?? null
  // KINEO-ROSTO-QUADRO-CHAVE-2810 — remix ("Put your face in it"): conferido no catálogo ANTES de qualquer custo, como o efeito-modelo.
  // KINEO-ROSTO-QUADRO-CHAVE-2810 — Com remix, a etapa 1 (quadro-chave) substitui o i2v no envio; preço e custo fal são os do remix.
  const rawBody = args.body as ClipRequestInput & { remix?: unknown; faceImageUrl?: unknown } // KINEO-ROSTO-QUADRO-CHAVE-2810
  const rx = faceRemixForRequest(rawBody.remix, req) // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (!rx.ok) return { ok: false, status: 400, code: 'remix', error: 'Choose one of the listed clips.' } // KINEO-ROSTO-QUADRO-CHAVE-2810
  const remix = rx.item // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (remix && template) return { ok: false, status: 400, code: 'remix', error: 'Choose one: an effect or a clip remix.' } // KINEO-ROSTO-QUADRO-CHAVE-2810
  // KINEO-ROSTO-QUADRO-CHAVE-2810 — o recorte do rosto (2ª referência, opcional): só da própria conta, como a foto; fora disso, 403 sem custo.
  let faceImageUrl: string | null = null // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (remix && typeof rawBody.faceImageUrl === 'string' && rawBody.faceImageUrl.trim()) { // KINEO-ROSTO-QUADRO-CHAVE-2810
    faceImageUrl = ownedClipImageUrl(rawBody.faceImageUrl.trim(), args.userId, deps.supabaseUrl) // KINEO-ROSTO-QUADRO-CHAVE-2810
    if (!faceImageUrl) return { ok: false, status: 403, code: 'image', error: 'Upload your photo again — only photos uploaded to your own account can be used.' } // KINEO-ROSTO-QUADRO-CHAVE-2810
  } // KINEO-ROSTO-QUADRO-CHAVE-2810

  const access = deps.engineAccess(req.engine)
  if (!access.ok) {
    const label = CLIP_ENGINES[req.engine].label
    const error = access.reason === 'paused'
      ? `${label} is temporarily paused for maintenance. Nothing was charged.`
      : access.reason === 'plan'
        ? `${label} clips are part of the Studio plan. Nothing was charged.`
        // KINEO-S25-CLIPES-2026-10-06 — mesma frase da recusa do filme do 2.5: o que falta (qualquer plano pago) e que nada foi cobrado.
        : access.reason === 'paid'
          ? `${label} is available on paid plans. Pick any plan to use it — nothing was charged.`
          : 'Choose one of the listed engines.'
    return { ok: false, status: access.status, code: `engine_${access.reason}`, error }
  }

  const fingerprint = recreate ? JSON.stringify([clipFingerprint(req), recreate.model, recreate.fingerprintInput ?? recreate.input]) : clipFingerprint(req) // KINEO-RECREATE-MOVIMENTO-1411 — era: recreate.input
  const existing = await deps.findByKey(args.userId, args.idempotencyKey)
  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      return { ok: false, status: 409, code: 'idempotency_conflict', error: 'This request key was already used for a different clip.' }
    }
    return { ok: true, status: 200, clip: existing, replay: true, balance: null }
  }

  // KINEO-MOTORES-SAEM-0511 [TRAVA 8.2 — fundador 05/11 "3 sim"] — depois do replay de propósito: o pedido que já existe volta como sempre (job antigo termina);
  // só o clipe NOVO em Kling 2.5/Veo 3.1 é recusado, antes de foto, moderação, saldo, débito e fornecedor. Efeito-modelo e remix nem perguntam.
  if (!template && !remix && !recreate) {
    const recusa = deps.retiredClipRefusal?.(req) ?? null
    if (recusa) return { ok: false, status: 410, code: 'engine_retired', error: recusa }
  }

  if ((await deps.countActive(args.userId)) >= CLIP_MAX_ACTIVE) {
    return { ok: false, status: 429, code: 'too_many_active', error: `You already have ${CLIP_MAX_ACTIVE} clips in progress. Wait for one to finish.` }
  }

  if (req.imageUrl) {
    try {
      await deps.verifyImage(req.imageUrl)
      for (const photo of recreate?.photos.slice(1) ?? []) await deps.verifyImage(photo)
      if (faceImageUrl) await deps.verifyImage(faceImageUrl) // KINEO-ROSTO-QUADRO-CHAVE-2810 — o recorte também tem de ser JPG/PNG de verdade
    } catch {
      return { ok: false, status: 400, code: 'image', error: 'We could not read your photo. Upload a JPG or PNG again.' }
    }
  }

  const safety = await deps.moderate({ text: req.prompt, imageUrls: recreate?.photos ?? [...(req.imageUrl ? [req.imageUrl] : []), ...(faceImageUrl ? [faceImageUrl] : [])] }) // KINEO-ROSTO-QUADRO-CHAVE-2810 — + recorte do rosto
  if (!safety.ok) {
    return { ok: false, status: safety.status, code: safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}`, error: safety.message }
  }

  const credits = recreate ? recreate.credits : remix ? faceRemixCredits(remix) : tpl.effect && template ? clipEffectCredits(tpl.effect) : clipCreditCost(req.engine, req.seconds, req.mode === 'i2v') // KINEO-EFEITOS-NOVOS-2026-10-13 · KINEO-ROSTO-QUADRO-CHAVE-2810 — remix: os 10 do fundador (as duas etapas)
  const balance = await deps.getBalance(args.userId)
  if (balance < credits) {
    return { ok: false, status: 402, code: 'credits', error: `This clip costs ${credits} credits. You have ${balance}. Not enough credits.`, balance }
  }

  const id = deps.newId()
  const row: ClipRow = {
    id,
    user_id: args.userId,
    idempotency_key: args.idempotencyKey,
    fingerprint,
    billing_reference: `clips-${id}`,
    engine: req.engine,
    mode: req.mode === 'i2v' ? 'image' : 'text',
    model: recreate ? recreate.model : remix ? FACE_REMIX_KEYFRAME_MODEL : template ? template.model : req.model, // KINEO-EFEITOS-NOVOS-2026-10-13 — o pollFal lê o resultado deste modelo · KINEO-ROSTO-QUADRO-CHAVE-2810 — remix nasce na etapa 1 (quadro-chave); o settleClip troca para o i2v
    seconds: req.seconds,
    aspect: req.aspect,
    prompt: req.prompt,
    image_url: req.imageUrl,
    credits,
    fal_usd: recreate ? recreate.falUsd : remix ? faceRemixFalUsd(remix) : template ? template.usd : clipFalUsd(req.engine, req.seconds, req.mode === 'i2v'), // KINEO-EFEITOS-NOVOS-2026-10-13 · KINEO-ROSTO-QUADRO-CHAVE-2810 — remix: quadro-chave + vídeo
    status: 'pending',
    fal_request_id: null,
    video_url: null,
    failure_reason: null,
    credits_refunded: 0,
    created_at: new Date(deps.now()).toISOString(),
  }
  const inserted = await deps.insertPending(row)
  if (!inserted.ok) {
    if (inserted.conflict) {
      const winner = await deps.findByKey(args.userId, args.idempotencyKey)
      if (winner && winner.fingerprint === fingerprint) return { ok: true, status: 200, clip: winner, replay: true, balance: null }
      return { ok: false, status: 409, code: 'idempotency_conflict', error: 'This request key was already used for a different clip.' }
    }
    return { ok: false, status: 503, code: 'storage', error: 'We could not start your clip right now. Nothing was charged — please try again.' }
  }

  const closeWithRefund = async (reason: string, status: number, error: string, providerError: string | null = null): Promise<ClipSubmitResult> => {
    const refunded = await deps.refund(row.billing_reference)
    await deps.markFailed(row.id, reason, refunded)
    // KINEO-S25-FOTO-CLIPES-1610 — o motivo da fal vai junto (limpo) e num warn curto no log da Vercel.
    if (providerError) console.warn(`[clips] clip_failed stage=submit reason=${reason} engine=${row.engine} clip=${row.id}: ${providerError}`)
    await deps.event('clip_failed', { ...clipTelemetry(row), reason, credits_refunded: refunded, stage: 'submit', ...(providerError ? { provider_error: providerError } : {}) })
    return {
      ok: false,
      status,
      code: reason,
      error: refunded > 0 ? `${error} Your ${refunded} credits were refunded.` : `${error} You were not charged.`,
      clip: { ...row, status: 'failed', failure_reason: reason, credits_refunded: refunded },
    }
  }

  // Every generation, including Recreate, uses the existing atomic server debit.
  const debit = await deps.debit(row.billing_reference, credits)
  if (!debit.ok) {
    // O RPC pode ter gravado o débito e perdido a resposta: o estorno pela mesma chave cobre os dois casos.
    const out = await closeWithRefund('debit_failed', 402, 'Not enough credits to start this clip.')
    return out
  }

  // KINEO-EFEITOS-NOVOS-2026-10-13 — efeito-modelo: endpoint e entrada do catálogo; a foto é a já conferida (posse + bytes + moderação).
  // KINEO-ROSTO-QUADRO-CHAVE-2810 — remix: a etapa 1 vai ao edit do Nano Banana com a foto (e o recorte do rosto primeiro, quando veio);
  // KINEO-ROSTO-QUADRO-CHAVE-2810 — o motor de vídeo NÃO é chamado aqui — só no settleClip, com o quadro-chave nosso pronto.
  // KINEO-RECREATE-FILA-KLING-EDIT-1411 [CEO 14/11] — modelo com fila: só manda AGORA quem pega a vaga (ninguém na frente e nenhum pedido nosso em andamento no
  // fornecedor). Quem não pega fica na fila, com os créditos já reservados e NADA enviado; sai quando chegar a vez (settleClip). Erro ao
  // pegar a vaga = fila (nunca dois ao mesmo tempo por engano).
  const fila = deps.queue?.applies(row) ? deps.queue : null
  if (fila && !(await fila.take(row).catch(() => false))) {
    if (!(await fila.enqueue(row.id))) return closeWithRefund('queue_unavailable', 503, 'We could not start this clip right now.')
    await deps.event('clip_queued', { ...clipTelemetry(row) })
    return { ok: true, status: 202, clip: { ...row, failure_reason: QUEUE_MARK }, replay: false, balance: debit.balance }
  }
  const sent = recreate
    ? await deps.submit(recreate.model, recreate.input)
    : remix && req.imageUrl // KINEO-ROSTO-QUADRO-CHAVE-2810
    ? await deps.submit(FACE_REMIX_KEYFRAME_MODEL, faceRemixKeyframeInput(remix, req.imageUrl, faceImageUrl)) // KINEO-ROSTO-QUADRO-CHAVE-2810
    : template && req.imageUrl // KINEO-ROSTO-QUADRO-CHAVE-2810
    ? await deps.submit(template.model, template.input(req.imageUrl))
    : await deps.submit(req.model, buildClipFalInput(req))
  // KINEO-CLIPE-AUTO-3110 — a fal recusou no envio: uma tentativa no Seedance 1.5 antes de devolver erro ao cliente.
  if (!sent.ok && !sent.ambiguous && !template && !remix && !recreate && deps.switchEngine) { // KINEO-ROSTO-QUADRO-CHAVE-2810 — remix fora: a etapa 1 é o quadro-chave, não um clipe
    const fb = clipFallbackRequest(req)
    if (fb && deps.engineAccess(fb.engine).ok) {
      const second = await deps.submit(fb.model, buildClipFalInput(fb))
      if (second.ok) {
        const fbCredits = Math.min(credits, clipCreditCost(fb.engine, fb.seconds, fb.mode === 'i2v'))
        let billingReference = row.billing_reference
        let charged = credits
        let balance: number | null = debit.balance
        if (fbCredits < credits) {
          const back = await deps.refund(row.billing_reference)
          if (back > 0) {
            billingReference = `${row.billing_reference}-auto`
            const d2 = await deps.debit(billingReference, fbCredits)
            // a fal já aceitou o clipe: se o novo débito falhar, entrega assim mesmo (o custo fica com a casa) — nunca cobra em dobro
            charged = d2.ok ? fbCredits : 0
            balance = d2.ok ? d2.balance : null
          }
        }
        const fbRow: ClipRow = { ...row, engine: fb.engine, model: fb.model, seconds: fb.seconds, aspect: fb.aspect, credits: charged, fal_usd: clipFalUsd(fb.engine, fb.seconds, fb.mode === 'i2v'), billing_reference: billingReference }
        const switched = await deps.switchEngine(row.id, { engine: fbRow.engine, model: fbRow.model, seconds: fbRow.seconds, aspect: fbRow.aspect, credits: fbRow.credits, fal_usd: fbRow.fal_usd, billing_reference: fbRow.billing_reference })
        let fbSaved = switched && await deps.markSubmitted(row.id, second.requestId)
        if (switched && !fbSaved) fbSaved = await deps.markSubmitted(row.id, second.requestId)
        await deps.event('clip_engine_fallback', { ...clipTelemetry(fbRow), from_engine: row.engine, to_engine: fb.engine, credits_before: credits, provider_error: cleanProviderError(sent.error), request_id: second.requestId, tracking_saved: fbSaved })
        await deps.event('clip_requested', { ...clipTelemetry(fbRow), request_id: second.requestId, tracking_saved: fbSaved, fallback_from: row.engine })
        return { ok: true, status: 202, clip: fbSaved ? { ...fbRow, status: 'processing', fal_request_id: second.requestId } : fbRow, replay: false, balance }
      }
    }
  }
  if (!sent.ok) {
    if (fila && !sent.ambiguous) await fila.release(row.id).catch(() => {}) // KINEO-RECREATE-FILA-KLING-EDIT-1411 — recusa clara: a vaga volta já; ambíguo: a vaga vence sozinha (o pedido pode existir do outro lado)
    return closeWithRefund(sent.ambiguous ? 'submit_ambiguous' : 'provider_rejected', 502, 'The engine could not accept this clip.', cleanProviderError(sent.error)) // KINEO-S25-FOTO-CLIPES-1610
  }

  let saved = await deps.markSubmitted(row.id, sent.requestId)
  if (!saved) saved = await deps.markSubmitted(row.id, sent.requestId)
  await deps.event('clip_requested', { ...clipTelemetry(row), request_id: sent.requestId, tracking_saved: saved })
  const clip: ClipRow = saved ? { ...row, status: 'processing', fal_request_id: sent.requestId } : row
  return { ok: true, status: 202, clip, replay: false, balance: debit.balance }
}

// ─── Entrega ─────────────────────────────────────────────────────────────────
export type ProviderState =
  | { state: 'queued' | 'running' | 'unknown' }
  | { state: 'done'; url: string }
  | { state: 'failed'; error: string }

/** KINEO-ROSTO-QUADRO-CHAVE-2810 — os fios da etapa 2 do remix (a ORDEM mora no settleClip; o clipServer só liga). */
export interface ClipKeyframeDeps { // KINEO-ROSTO-QUADRO-CHAVE-2810
  /** Copia o quadro-chave (PNG da fal) para o NOSSO bucket, em caminho determinístico; devolve a URL pública NOSSA. Lança se falhar. */
  persist(row: ClipRow, providerUrl: string): Promise<string> // KINEO-ROSTO-QUADRO-CHAVE-2810
  /** Reserva a etapa 2 — UPDATE condicional (modelo da etapa 1 + o request_id do quadro-chave): só UM ator ganha; o outro vê false. */
  claim(row: ClipRow, videoModel: string): Promise<boolean> // KINEO-ROSTO-QUADRO-CHAVE-2810
  /** Envia o vídeo (i2v do motor) partindo do quadro-chave NOSSO. Um POST, sem retry do POST pago. */
  submitVideo(row: ClipRow, videoModel: string, keyframeUrl: string): Promise<{ ok: true; requestId: string } | { ok: false; ambiguous: boolean; error: string }> // KINEO-ROSTO-QUADRO-CHAVE-2810
  /** Grava o request_id da etapa 2 (condicional: linha reservada, sem request_id). */
  markVideoSubmitted(id: string, videoModel: string, requestId: string): Promise<boolean> // KINEO-ROSTO-QUADRO-CHAVE-2810
  /** O modelo de vídeo do remix desta linha (o i2v do motor). */
  videoModel(row: ClipRow): string // KINEO-ROSTO-QUADRO-CHAVE-2810
} // KINEO-ROSTO-QUADRO-CHAVE-2810

/** KINEO-RECREATE-MOVIMENTO-1411 — os fios dos dois passos do molde de movimento (a ORDEM mora no settleClip; o clipServer só liga). */
export interface ClipMovimentoDeps {
  /** Copia a imagem do passo 1 para o NOSSO bucket (caminho fixo) e devolve a URL pública nossa. Lança se falhar. */
  persist(row: ClipRow, providerUrl: string): Promise<string>
  /** Reserva o passo 2: UPDATE condicional (modelo do passo 1 + o request_id da imagem) que troca o modelo, zera o request_id e grava a marca de envio. */
  claim(row: ClipRow, marca: string): Promise<boolean>
  /** A imagem do passo 1 no NOSSO moderador e depois "é a pessoa da foto?", ANTES de pagar o vídeo. 'blocked' = o moderador recusou. Nunca lança. */
  gate(row: ClipRow, cenaUrl: string): Promise<{ result: 'same' | 'other' | 'unverified' | 'blocked'; reason: string }>
  /** Envia o passo 2 (um POST, sem retry do POST pago). */
  submitVideo(row: ClipRow, cenaUrl: string): Promise<{ ok: true; requestId: string } | { ok: false; ambiguous: boolean; error: string }>
  /** Grava o request_id do passo 2 e solta a marca (condicional: modelo do passo 2, sem request_id, com ESTA marca). */
  markVideoSubmitted(id: string, marca: string, requestId: string): Promise<boolean>
}

export interface ClipSettleDeps {
  poll(model: string, requestId: string): Promise<ProviderState>
  /** Copia o MP4 para o nosso bucket e devolve a URL pública NOSSA. Lança se falhar. */
  persist(row: ClipRow, providerUrl: string): Promise<string>
  refund(billingReference: string): Promise<number>
  markDone(id: string, videoUrl: string): Promise<boolean>
  markFailed(id: string, reason: string, refunded: number): Promise<boolean>
  event(name: 'clip_delivered' | 'clip_failed' | 'clip_effect_ready' | 'face_remix_keyframe' | 'face_remix_ready' | 'clip_requested' | 'recreate_movimento_cena', metadata: Record<string, unknown>): Promise<void> // KINEO-ROSTO-QUADRO-CHAVE-2810 — + os dois eventos do remix · KINEO-RECREATE-MOVIMENTO-1411 — + recreate_movimento_cena
  now(): number
  /** KINEO-ROSTO-QUADRO-CHAVE-2810 — etapa 2 do remix. Ausente (guardiões antigos, caminhos sem remix) = linha de remix espera. */
  keyframe?: ClipKeyframeDeps // KINEO-ROSTO-QUADRO-CHAVE-2810
  /** KINEO-RECREATE-MOVIMENTO-1411 — os dois passos do molde de movimento. Ausente = linha de movimento espera (nunca marca pronto com a imagem). */
  movimento?: ClipMovimentoDeps
  /** KINEO-RECREATE-TRAVA-1011 — trava "não trocou" do Recreate (lib/recreate/swapCheck.ts). Só age onde applies(row) é true. */
  recreateSwap?: RecreateSwapSettleDeps // KINEO-RECREATE-TRAVA-1011
  /** KINEO-RECREATE-FILA-KLING-EDIT-1411 — a fila de um pedido por vez: o clipe da fila sai aqui quando chega a vez, e quem fecha solta a vaga. */
  queue?: ClipQueueDeps
}

/** KINEO-RECREATE-AUDITORIA-DA-TRAVA-1411 — onde a saída reprovada ficou guardada (bucket privado) e até quando. */
export interface RecreateSwapAudit { bucket: string; path: string; bytes: number; expires_at: string }
/** KINEO-RECREATE-TRAVA-1011 — os fios da trava "não trocou" (a ORDEM mora no settleClip; o clipServer só liga). */
export interface RecreateSwapSettleDeps { // KINEO-RECREATE-TRAVA-1011
  /** Esta linha é um Recreate de troca de rosto? Clipes e efeitos: false → caminho de sempre, byte a byte. */
  applies(row: ClipRow): boolean // KINEO-RECREATE-TRAVA-1011
  /** A linha tem reserva de checagem VÁLIDA (não vencida) de outro ator? Então este sai antes de consultar e copiar. */
  busy(row: ClipRow, now: number): boolean // KINEO-RECREATE-TRAVA-1011
  /** Reserva a checagem (UPDATE condicional: um ator só, reserva velha de 2 min pode ser retomada). null = outro ator checa. */
  claim(row: ClipRow): Promise<string | null> // KINEO-RECREATE-TRAVA-1011
  /** Quadros do resultado × quadros do vídeo-base × fotos. Nunca lança; falha da checagem = 'unverified'. */
  check(row: ClipRow, providerUrl: string): Promise<{ result: 'swapped' | 'unchanged' | 'partial' | 'unverified' | 'uncertain'; reason: string }> // KINEO-RECREATE-TRAVA-1011 · KINEO-RECREATE-TRAVA-ALVO-1411 — + uncertain
  /** failed condicional: só se a linha ainda está processing COM a reserva deste ator (credits_refunded 0 até o estorno). */
  markFailed(id: string, reason: string, lock: string): Promise<boolean> // KINEO-RECREATE-TRAVA-1011
  /** Grava o valor estornado na linha já failed. */
  setRefunded(id: string, refunded: number): Promise<void> // KINEO-RECREATE-TRAVA-1011
  /** done condicional à reserva deste ator; solta a reserva (failure_reason volta a null). */
  markDone(id: string, videoUrl: string, lock: string): Promise<boolean> // KINEO-RECREATE-TRAVA-1011
  /** Evento de servidor recreate_swap_check — só quem MOVEU a linha grava. */
  record(row: ClipRow, verdict: { result: string; reason: string }, outcome: { delivered: boolean; credits_refunded: number; audit?: RecreateSwapAudit | null }): Promise<void> // KINEO-RECREATE-TRAVA-1011 · KINEO-RECREATE-AUDITORIA-DA-TRAVA-1411 — + audit
  /** KINEO-RECREATE-AUDITORIA-DA-TRAVA-1411 — guarda a saída REPROVADA do motor em caminho privado, 48 h (só auditoria da casa). Opcional:
   *  ausente ou falhando = segue sem. `gastoMs` = o que a liquidação já gastou (a cópia nunca estoura a rota de status). */
  keepRejected?(row: ClipRow, providerUrl: string, gastoMs: number): Promise<RecreateSwapAudit | null>
  /** KINEO-RECREATE-FILA-REVISAO-1411 — a cópia de auditoria foi guardada: evento próprio (recreate_swap_audit) com o caminho. Roda depois de tudo. */
  recordAudit?(row: ClipRow, audit: RecreateSwapAudit): Promise<void>
  /** KINEO-RECREATE-VEREDITO-UMA-VEZ-1411 — o veredito que já liberou esta linha numa passada anterior (gravado nela), ou null. Opcional: ausente = o juiz roda em toda passada (como antes). */
  approved?(row: ClipRow): 'swapped' | 'unverified' | null
  /** KINEO-RECREATE-VEREDITO-UMA-VEZ-1411 — grava o veredito que libera a entrega, trocando a reserva (UPDATE condicional à reserva deste ator). null = perdeu a reserva. */
  approve?(id: string, lock: string, result: 'swapped' | 'unverified'): Promise<string | null>
} // KINEO-RECREATE-TRAVA-1011

export async function settleClip(deps: ClipSettleDeps, row: ClipRow): Promise<ClipRow> {
  if (row.status === 'done' || row.status === 'failed') return row
  // KINEO-RECREATE-FILA-KLING-EDIT-1411 — o clipe de um modelo com fila que FECHA (pronto ou falha) solta a vaga, e o próximo da fila sai. Envio ambíguo não
  // solta: o pedido pode existir no fornecedor, e a vaga vence sozinha.
  // KINEO-RECREATE-FILA-REVISAO-1411 [revisor, item 10 — bloqueava a publicação] — a cópia de auditoria (download + upload) saiu do meio da liquidação: ela corria
  // ANTES dos eventos e de soltar a vaga, e um upload pendurado matava a rota de status sem gravar clip_failed/recreate_swap_check e com a vaga
  // presa. Agora é `depois`: roda só quando a linha já fechou, o estorno foi feito, os eventos gravados e a vaga solta. Se a rota morrer na
  // cópia, só se perde a cópia.
  const depois: Array<() => Promise<void>> = []
  const after = await settleOpenClip(deps, row, depois)
  if (deps.queue?.applies(row) && (after.status === 'done' || after.status === 'failed') && after.failure_reason !== 'submit_ambiguous') await deps.queue.release(row.id).catch(() => {})
  for (const tarefa of depois) await tarefa().catch(() => {})
  return after
}

async function settleOpenClip(deps: ClipSettleDeps, row: ClipRow, depois: Array<() => Promise<void>>): Promise<ClipRow> {
  const age = deps.now() - Date.parse(row.created_at)
  // KINEO-ROSTO-QUADRO-CHAVE-2810 — é remix? Em que etapa? (pelo prompt fixo + modelo da linha; nenhuma coluna nova.)
  const remixStage = faceRemixStageForRow(row) // KINEO-ROSTO-QUADRO-CHAVE-2810
  const movStage = movimentoStageForRow(row) // KINEO-RECREATE-MOVIMENTO-1411 — molde de movimento: 'scene' (passo 1) ou 'motion' (passo 2), pela linha (catálogo + modelo), nunca pelos fios
  const remixMeta = (video: 'skipped' | 'rejected' | 'failed') => (remixStage ? { remix: faceRemixForRow(row)?.id ?? null, keyframe: remixStage === 'keyframe' ? 'failed' : 'done', video } : {}) // KINEO-ROSTO-QUADRO-CHAVE-2810 — as DUAS etapas no clip_failed

  // KINEO-ROSTO-QUADRO-CHAVE-2810 — `meta`: as duas etapas do remix no clip_failed (padrão pela etapa da linha; a recusa do Kling na etapa 2 passa a sua).
  const fail = async (reason: string, providerError: string | null = null, meta: Record<string, unknown> = remixMeta(remixStage === 'keyframe' ? 'skipped' : 'failed')): Promise<ClipRow> => { // KINEO-ROSTO-QUADRO-CHAVE-2810 — + meta
    const refunded = await deps.refund(row.billing_reference)
    const moved = await deps.markFailed(row.id, reason, refunded)
    // KINEO-S25-FOTO-CLIPES-1610 — só quem MOVEU a linha grava (o evento e o warn): duas abas + o cron nunca repetem.
    if (moved && providerError) console.warn(`[clips] clip_failed stage=settle reason=${reason} engine=${row.engine} clip=${row.id} request=${row.fal_request_id}: ${providerError}`)
    if (moved) await deps.event('clip_failed', { ...clipTelemetry(row), reason, credits_refunded: refunded, stage: 'settle', ...(providerError ? { provider_error: providerError } : {}), ...meta }) // KINEO-ROSTO-QUADRO-CHAVE-2810 — + meta (remix/keyframe/video)
    return { ...row, status: 'failed', failure_reason: reason, credits_refunded: refunded }
  }

  if (row.status === 'pending' || !row.fal_request_id) {
    // KINEO-RECREATE-FILA-KLING-EDIT-1411 — a linha NA FILA: passou do teto de espera = falha com estorno; é a vez dela e a vaga é dela = manda agora (um ator só);
    // senão, espera. A regra de 10 min sem envio não vale para quem está na fila (nada foi enviado de propósito).
    const fila = deps.queue?.applies(row) && deps.queue.queued(row) ? deps.queue : null
    if (fila) {
      // KINEO-RECREATE-FILA-REVISAO-1411 [revisor, item 4] — a linha pode ter sido lida antes: nada aqui decide pela foto. O teto de espera é failed por UPDATE
      // condicional à marca (só quem moveu estorna); a saída da fila exige ser, no banco, a mais antiga (take daFila) e ganhar o claimSend.
      if (Number.isFinite(age) && age >= fila.waitLimitMs) {
        if (!(await fila.expire(row.id))) return row // outro ator mandou ou fechou: quem moveu decide
        let refunded = await deps.refund(row.billing_reference)
        if (refunded <= 0) refunded = await deps.refund(row.billing_reference)
        if (refunded > 0) await fila.setRefunded(row.id, refunded)
        await deps.event('clip_failed', { ...clipTelemetry(row), reason: 'queue_timeout', credits_refunded: refunded, stage: 'queue' })
        return { ...row, status: 'failed', failure_reason: 'queue_timeout', credits_refunded: refunded }
      }
      if (!(await fila.take(row, { daFila: true }).catch(() => false))) return row
      if (!(await fila.claimSend(row.id))) { await fila.release(row.id).catch(() => {}); return row } // a vaga que este ator acabou de pegar volta
      const sent = await fila.submit(row)
      if (!sent.ok) return fail(sent.ambiguous ? 'submit_ambiguous' : 'provider_rejected', cleanProviderError(sent.error))
      let saved = await fila.markSubmitted(row.id, sent.requestId)
      if (!saved) saved = await fila.markSubmitted(row.id, sent.requestId)
      await deps.event('clip_requested', { ...clipTelemetry(row), request_id: sent.requestId, tracking_saved: saved, queued_ms: Math.max(0, age) })
      return saved ? { ...row, status: 'processing', fal_request_id: sent.requestId, failure_reason: null } : row
    }
    // KINEO-RECREATE-FILA-REVISAO-1411 — a linha que SAIU da fila e está sendo mandada (marca queue_sending) não é 'envio perdido' aos 10 min de vida: ela pode
    // ter esperado na fila. Quem a fecha é a vaga vencida (resolverVagaVencida); o prazo abaixo é só a rede de segurança se ninguém mais pedir.
    if (deps.queue?.applies(row) && row.failure_reason === QUEUE_SENDING) return Number.isFinite(age) && age >= deps.queue.waitLimitMs + CLIP_PENDING_STALE_MS ? fail('submit_lost') : row
    // KINEO-RECREATE-MOVIMENTO-1411 — passo 2 reservado e ainda sem request_id: a rede de 10 min conta da MARCA DE ENVIO (o passo 1 pode ter levado
    // minutos), nunca da criação da linha; sem marca legível, da criação (como sempre).
    if (movStage === 'motion') {
      const enviadoEm = movimentoEnvioEm(row.failure_reason)
      const desde = enviadoEm === null ? age : deps.now() - enviadoEm
      return Number.isFinite(desde) && desde >= CLIP_PENDING_STALE_MS ? fail('submit_lost', null, { motion: 'video_lost' }) : row
    }
    return Number.isFinite(age) && age >= CLIP_PENDING_STALE_MS ? fail('submit_lost') : row
  }
  if (deps.recreateSwap?.applies(row) && deps.recreateSwap.busy(row, deps.now())) return row // KINEO-RECREATE-TRAVA-1011 — outro ator checa: sai ANTES de consultar/baixar

  const state = await deps.poll(row.model, row.fal_request_id)
  // KINEO-ROSTO-QUADRO-CHAVE-2810 — ETAPA 1 do remix (quadro-chave): falhou → estorna os 10 e o motor de vídeo NUNCA é chamado;
  // KINEO-ROSTO-QUADRO-CHAVE-2810 — pronto → persiste no nosso bucket (a URL da fal expira) → reserva a etapa 2 (um ator só) →
  // KINEO-ROSTO-QUADRO-CHAVE-2810 — envia o vídeo partindo do quadro-chave NOSSO → grava o request_id → evento com as duas etapas.
  // KINEO-RECREATE-MOVIMENTO-1411 — PASSO 1 do movimento (a imagem): falhou → estorno, o vídeo nunca é chamado; pronto → copia a imagem para o NOSSO
  // bucket → reserva o passo 2 (um ator só, com a marca de envio) → o juiz "é a pessoa da foto?" (uma vez: só quem reservou) → outra pessoa =
  // estorno sem pagar o vídeo → envia o vídeo → grava o request_id (2 tentativas; perdido, a rede de 10 min da marca estorna).
  if (movStage === 'scene') {
    if (state.state === 'failed') return fail(MOVIMENTO_FALHA.cena, cleanProviderError(state.error), { motion: 'scene_failed' })
    if (state.state !== 'done') return Number.isFinite(age) && age >= CLIP_EXPIRE_MS ? fail('expired', null, { motion: 'scene_expired' }) : row
    if (!deps.movimento) return Number.isFinite(age) && age >= CLIP_EXPIRE_MS ? fail('expired', null, { motion: 'scene_expired' }) : row // sem os fios do passo 2, espera (nunca entrega a imagem como vídeo)
    const mov = deps.movimento
    let cenaUrl: string
    try {
      cenaUrl = await mov.persist(row, state.url)
    } catch {
      return Number.isFinite(age) && age >= CLIP_EXPIRE_MS ? fail('persist_failed', null, { motion: 'scene_persist_failed' }) : row
    }
    const marca = movimentoEnvio(deps.now())
    if (!(await mov.claim(row, marca))) return row
    const juiz = await mov.gate(row, cenaUrl).catch(() => ({ result: 'unverified' as const, reason: 'gate_error' }))
    if (juiz.result === 'blocked') { // KINEO-RECREATE-MOVIMENTO-1411 [CEO 14/11 08:45] — o moderador recusou a imagem: estorno, o vídeo nunca sai
      const closed = await fail(MOVIMENTO_FALHA.bloqueada, null, { motion: 'scene_blocked', judge: juiz.result, judge_reason: juiz.reason })
      return { ...closed, model: MOVIMENTO_VIDEO_MODEL, fal_request_id: null }
    }
    if (juiz.result === 'other') {
      const closed = await fail(MOVIMENTO_FALHA.naoEVoce, null, { motion: 'not_you', judge: juiz.result, judge_reason: juiz.reason })
      return { ...closed, model: MOVIMENTO_VIDEO_MODEL, fal_request_id: null }
    }
    const sent = await mov.submitVideo(row, cenaUrl)
    if (!sent.ok) {
      const closed = await fail(sent.ambiguous ? 'submit_ambiguous' : 'provider_rejected', cleanProviderError(sent.error), { motion: 'video_rejected', judge: juiz.result })
      return { ...closed, model: MOVIMENTO_VIDEO_MODEL, fal_request_id: null }
    }
    let saved = await mov.markVideoSubmitted(row.id, marca, sent.requestId)
    if (!saved) saved = await mov.markVideoSubmitted(row.id, marca, sent.requestId)
    await deps.event('recreate_movimento_cena', { ...clipTelemetry(row), scene: 'done', video: 'submitted', judge: juiz.result, judge_reason: juiz.reason, scene_ms: Math.max(0, age), request_id: sent.requestId, tracking_saved: saved })
    return { ...row, model: MOVIMENTO_VIDEO_MODEL, fal_request_id: saved ? sent.requestId : null, failure_reason: saved ? null : marca }
  }
  if (remixStage === 'keyframe') { // KINEO-ROSTO-QUADRO-CHAVE-2810
    if (state.state === 'failed') return fail(FACE_REMIX_KEYFRAME_FAILED, cleanProviderError(state.error)) // KINEO-ROSTO-QUADRO-CHAVE-2810
    if (state.state !== 'done') return Number.isFinite(age) && age >= CLIP_EXPIRE_MS ? fail('expired') : row // KINEO-ROSTO-QUADRO-CHAVE-2810
    if (!deps.keyframe) return Number.isFinite(age) && age >= CLIP_EXPIRE_MS ? fail('expired') : row // KINEO-ROSTO-QUADRO-CHAVE-2810 — sem os fios da etapa 2, espera (nunca marca pronto com o quadro-chave)
    let keyframeUrl: string // KINEO-ROSTO-QUADRO-CHAVE-2810
    try { // KINEO-ROSTO-QUADRO-CHAVE-2810
      keyframeUrl = await deps.keyframe.persist(row, state.url) // KINEO-ROSTO-QUADRO-CHAVE-2810
    } catch { // KINEO-ROSTO-QUADRO-CHAVE-2810
      return Number.isFinite(age) && age >= CLIP_EXPIRE_MS ? fail('persist_failed') : row // KINEO-ROSTO-QUADRO-CHAVE-2810 — tenta de novo no próximo poll
    } // KINEO-ROSTO-QUADRO-CHAVE-2810
    const videoModel = deps.keyframe.videoModel(row) // KINEO-ROSTO-QUADRO-CHAVE-2810
    if (!(await deps.keyframe.claim(row, videoModel))) return row // KINEO-ROSTO-QUADRO-CHAVE-2810 — outro ator (outra aba, o cron) já reservou a etapa 2
    const sent = await deps.keyframe.submitVideo(row, videoModel, keyframeUrl) // KINEO-ROSTO-QUADRO-CHAVE-2810
    if (!sent.ok) { // KINEO-ROSTO-QUADRO-CHAVE-2810 — o Kling recusou a etapa 2: estorna os 10; o evento diz keyframe:'done', video:'rejected'
      const closed = await fail(sent.ambiguous ? 'submit_ambiguous' : 'provider_rejected', cleanProviderError(sent.error), { ...remixMeta('rejected'), keyframe: 'done' }) // KINEO-ROSTO-QUADRO-CHAVE-2810
      return { ...closed, model: videoModel, fal_request_id: null } // KINEO-ROSTO-QUADRO-CHAVE-2810
    } // KINEO-ROSTO-QUADRO-CHAVE-2810
    let saved = await deps.keyframe.markVideoSubmitted(row.id, videoModel, sent.requestId) // KINEO-ROSTO-QUADRO-CHAVE-2810
    if (!saved) saved = await deps.keyframe.markVideoSubmitted(row.id, videoModel, sent.requestId) // KINEO-ROSTO-QUADRO-CHAVE-2810 — como o markSubmitted do pedido: 2 tentativas; perdido, a rede de 10 min estorna (submit_lost)
    await deps.event(FACE_REMIX_EVENTS.keyframe, { ...faceRemixEventMetadata(faceRemixForRow(row)!, row), keyframe: 'done', video: 'submitted', keyframe_ms: Math.max(0, age), request_id: sent.requestId, tracking_saved: saved }) // KINEO-ROSTO-QUADRO-CHAVE-2810
    return { ...row, model: videoModel, fal_request_id: saved ? sent.requestId : null } // KINEO-ROSTO-QUADRO-CHAVE-2810
  } // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (state.state === 'failed') return fail('provider_failed', cleanProviderError(state.error)) // KINEO-S25-FOTO-CLIPES-1610
  if (state.state === 'done') {
    // KINEO-RECREATE-TRAVA-1011 [fundador 10/11] — Recreate: o fornecedor devolve o vídeo-base com "sucesso" quando não troca a
    // pessoa. ANTES de copiar e de marcar pronto: um ator reserva a checagem (token); alguma pessoa esperada continua a do
    // vídeo-base → a linha vira failed por UPDATE condicional (só quem detém a reserva) e SÓ o vencedor estorna (refund
    // idempotente de sempre). Quem perdeu a corrida não estorna nem entrega. Checagem que falha = 'unverified' → entrega.
    // Status repetido depois de decidido sai na 1ª linha do settleClip (done/failed): nunca checa nem estorna de novo.
    const swap = deps.recreateSwap?.applies(row) ? deps.recreateSwap : null // KINEO-RECREATE-TRAVA-1011
    let swapVerdict: { result: string; reason: string } | null = null // KINEO-RECREATE-TRAVA-1011
    let swapLock: string | null = null // KINEO-RECREATE-TRAVA-1011
    let swapRecorded = false // KINEO-RECREATE-VEREDITO-UMA-VEZ-1411 — o evento do veredito já foi gravado (na aprovação)
    const jaAprovado = swap?.approved ? swap.approved(row) : null // KINEO-RECREATE-VEREDITO-UMA-VEZ-1411 — o juiz já liberou esta linha: a montagem não reabre a troca
    if (swap && jaAprovado) { swapLock = row.failure_reason as string; swapVerdict = { result: jaAprovado, reason: 'approved_earlier' }; swapRecorded = true } // KINEO-RECREATE-VEREDITO-UMA-VEZ-1411
    if (swap && !jaAprovado) { // KINEO-RECREATE-TRAVA-1011 · KINEO-RECREATE-VEREDITO-UMA-VEZ-1411 — era: if (swap) {
      const swapStarted = deps.now() // KINEO-RECREATE-AUDITORIA-DA-TRAVA-1411 — o relógio da liquidação (a cópia de auditoria respeita o que sobrou)
      swapLock = await swap.claim(row) // KINEO-RECREATE-TRAVA-1011
      if (!swapLock) return row // KINEO-RECREATE-TRAVA-1011 — outro ator (aba, cron) está checando
      swapVerdict = await swap.check(row, state.url).catch(() => ({ result: 'unverified' as const, reason: 'check_error' })) // KINEO-RECREATE-TRAVA-1011
      // KINEO-RECREATE-TRAVA-ALVO-1411 [CEO 14/11: clip f2bd4efe entregue e cobrado sem troca] — `uncertain` (o juiz respondeu e não deu para afirmar a troca) também
      // NÃO entrega: falha com estorno, com motivo próprio (swap_uncertain).
      if (swapVerdict.result === 'unchanged' || swapVerdict.result === 'partial' || swapVerdict.result === 'uncertain') { // KINEO-RECREATE-TRAVA-1011
        const reason = swapVerdict.result === 'partial' ? 'swap_partial' : swapVerdict.result === 'uncertain' ? 'swap_uncertain' : 'swap_unchanged' // KINEO-RECREATE-TRAVA-1011
        if (!(await swap.markFailed(row.id, reason, swapLock))) return row // KINEO-RECREATE-TRAVA-1011 — perdeu a reserva: nada
        let refunded = await deps.refund(row.billing_reference) // KINEO-RECREATE-TRAVA-1011 — só o vencedor estorna
        if (refunded <= 0) refunded = await deps.refund(row.billing_reference) // KINEO-RECREATE-TRAVA-1011 — 2ª tentativa (o RPC é idempotente)
        if (refunded > 0) await swap.setRefunded(row.id, refunded) // KINEO-RECREATE-TRAVA-1011
        // KINEO-RECREATE-AUDITORIA-DA-TRAVA-1411 [CEO 14/11] — DEPOIS do failed e do estorno (o cliente nunca espera por isto): a saída reprovada
        // vai a um caminho privado por 48 h e o caminho entra no evento. Falhou ou não deu tempo = null, e tudo segue como antes.
        await deps.event('clip_failed', { ...clipTelemetry(row), reason, credits_refunded: refunded, stage: 'settle', swap_check: swapVerdict.result }) // KINEO-RECREATE-TRAVA-1011
        await swap.record(row, swapVerdict, { delivered: false, credits_refunded: refunded }) // KINEO-RECREATE-TRAVA-1011
        // KINEO-RECREATE-FILA-REVISAO-1411 (item 10) — a cópia fica para DEPOIS de tudo (settleClip a roda com a vaga já solta); guardou = evento próprio com o caminho.
        if (swap.keepRejected) { const keep = swap.keepRejected, gasto = Math.max(0, deps.now() - swapStarted), url = state.url; depois.push(async () => { const audit = await keep(row, url, gasto).catch(() => null); if (audit) await swap.recordAudit?.(row, audit) }) }
        return { ...row, status: 'failed', failure_reason: reason, credits_refunded: refunded } // KINEO-RECREATE-TRAVA-1011
      } // KINEO-RECREATE-TRAVA-1011
      // KINEO-RECREATE-VEREDITO-UMA-VEZ-1411 — liberado (trocou, ou a checagem não pôde ser feita): o veredito fica GRAVADO na linha antes da montagem; o evento dele também.
      if (swap.approve && (swapVerdict.result === 'swapped' || swapVerdict.result === 'unverified')) {
        const marca = await swap.approve(row.id, swapLock, swapVerdict.result)
        if (!marca) return row // perdeu a reserva: quem a detém decide
        swapLock = marca
        await swap.record(row, swapVerdict, { delivered: true, credits_refunded: 0 })
        swapRecorded = true
      }
    } // KINEO-RECREATE-TRAVA-1011
    let ours: string
    try {
      ours = await deps.persist(row, state.url)
    } catch {
      // Nunca marca pronto com a URL da fal. Tenta de novo no próximo poll; passou do prazo, estorna.
      return Number.isFinite(age) && age >= CLIP_EXPIRE_MS ? fail('persist_failed') : row
    }
    const moved = swap && swapLock ? await swap.markDone(row.id, ours, swapLock) : await deps.markDone(row.id, ours) // KINEO-RECREATE-TRAVA-1011 — era: await deps.markDone(row.id, ours)
    if (swap && !moved) return row // KINEO-RECREATE-TRAVA-1011 — perdeu a reserva: não entrega (quem a detém decide)
    if (moved) {
      await deps.event('clip_delivered', { ...clipTelemetry(row), age_ms: Math.max(0, age) })
      // KINEO-CLIP-EFEITOS-2026-10-05 — clipe de um efeito de 1 clique ficou pronto. Mesmo ponto e mesma condição do
      // clip_delivered (só quem MOVEU a linha para `done` grava): duas abas + o cron nunca contam o mesmo clipe duas vezes.
      const effect = clipEffectForRow(row)
      if (effect) await deps.event('clip_effect_ready', { ...clipEffectEventMetadata(effect, row), age_ms: Math.max(0, age) })
      // KINEO-ROSTO-QUADRO-CHAVE-2810 — remix entregue: as DUAS etapas fecharam (mesmo ponto e condição do clip_delivered).
      const remixItem = remixStage === 'video' ? faceRemixForRow(row) : null // KINEO-ROSTO-QUADRO-CHAVE-2810
      if (remixItem) await deps.event(FACE_REMIX_EVENTS.ready, { ...faceRemixEventMetadata(remixItem, row), keyframe: 'done', video: 'delivered', age_ms: Math.max(0, age) }) // KINEO-ROSTO-QUADRO-CHAVE-2810
      if (swap && swapVerdict && !swapRecorded) await swap.record(row, swapVerdict, { delivered: true, credits_refunded: 0 }) // KINEO-RECREATE-TRAVA-1011 · KINEO-RECREATE-VEREDITO-UMA-VEZ-1411 — gravado uma vez só
    }
    return { ...row, status: 'done', video_url: ours }
  }
  return Number.isFinite(age) && age >= CLIP_EXPIRE_MS ? fail('expired') : row
}
