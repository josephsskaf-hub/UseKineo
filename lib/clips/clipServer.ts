// KINEO-CLIPES-2026-09-29 — os fios reais do clipe: banco (tabela `clips`), fal (fila), moderação, débito/estorno,
// bucket `renders` e eventos. A ORDEM mora em lib/clips/clipFlow.ts (puro, executado pelo guardião); aqui só a ligação.
//
// Reaproveitado da casa, sem cópia de regra:
//   · débito  → lib/credits/debit.ts debitVideoCredits (RPC idempotente por chave; conta o teto do trial)
//   · estorno → lib/credits/refund.ts refundRenderCredits (UPDATE … WHERE refunded_at IS NULL: nunca duas vezes)
//   · moderação → lib/safety/contentModeration.ts, superfície 'clip' (já existia na união), mesma régua do /images e /animate
//   · foto   → sobe por /api/avatar/upload purpose=animate (avatars/<uid>/, moderada no upload), e os bytes são relidos
//              por lib/animate/remoteImage.ts downloadPublicAnimateImage (JPG/PNG ≤ 8 MB, rede pública) antes do envio
//   · bucket → `renders`, pasta clips/<uid>/<clipId>.mp4 (mesmo bucket de images/, audio/, enhanced/; nenhum bucket novo)
//   · interruptores → lib/engineLaunch.ts (enginePaused), lib/clips/clipLaunch.ts (CLIP_S25_PUBLIC — o clipe do 2.5, KINEO-S25-CLIPES-2026-10-06;
//                    substitui o s25ClipVisible do KINEO-S25-ABRE-2026-10-06), lib/s25Access.ts (quem paga) e lib/enginePlanGate.ts (decideEngineGate)
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHmac, randomUUID } from 'node:crypto'
import { fal } from '@fal-ai/client'
import { debitVideoCredits } from '@/lib/credits/debit'
import { refundRenderCredits } from '@/lib/credits/refund'
import { moderateContent } from '@/lib/safety/contentModeration'
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'
import { moderateTopic } from '@/lib/safety/topicModeration' // KINEO-MODERACAO-1410 [TRAVA 8.2 — vai do fundador 14/10] — a régua completa no pedido dos Clipes
import { enginePaused, engineOffered, engineRetired } from '@/lib/engineLaunch' // KINEO-S25-CLIPES-2026-10-06: o clipe do 2.5 lê clipS25Visible (lib/clips/clipLaunch.ts)
import { decideEngineGate } from '@/lib/enginePlanGate'
import { downloadPublicAnimateImage } from '@/lib/animate/remoteImage'
import { writeServerEvent } from '@/lib/serverEvents'
import { RECREATE_MODEL } from '@/lib/recreate/generation' // KINEO-RECREATE-TRAVA-1011
import { KLING4_EDIT_MODEL, silenciarMp4, somOriginalDaLinha } from '@/lib/recreate/seuVideo' // KINEO-RECREATE-SEU-VIDEO-1311 · KINEO-RECREATE-KLING4-1311
import { usaTravaNaoTrocou } from '@/lib/recreate/swapCheck' // KINEO-RECREATE-SEU-VIDEO-1311
import { AUDITORIA_MAX_BYTES, AUDITORIA_PASTA, caminhoDaAuditoria, orcamentoDaCopia, vencidos, venceEm } from '@/lib/recreate/auditoriaDaTrava' // KINEO-RECREATE-AUDITORIA-DA-TRAVA-1411
import { QUARANTINE_BUCKET } from '@/lib/safety/quarantine' // KINEO-RECREATE-AUDITORIA-DA-TRAVA-1411 — o bucket privado da casa
import { RECREATE_SWAP_AUDIT_EVENT, isRecreateNotSwappedReason, RECREATE_SWAP_CHECK_EVENT, SWAP_CHECK_LOCK_PREFIX, SWAP_CHECK_LOCK_STALE_MS, recreateRowContext, runSwapCheck, swapCheckBusy, swapCheckLock, sweepSwapRefunds, SWAP_REFUND_SWEEP_REASONS, type SwapVerdict } from '@/lib/recreate/swapCheck' // KINEO-RECREATE-TRAVA-1011
import { alertFalExhausted, looksExhausted } from '@/lib/falAlert'
import {
  CLIP_ENGINES,
  CLIP_ENGINE_ORDER,
  aspectsFor,
  clipLabelForModel, // KINEO-ROTULO-CLIPE-H3-1111
  clipEngineAccess,
  modesFor,
  offeredSecondsFor,
  type ClipEngineAccess,
  type ClipEngineKey,
} from '@/lib/clips/clipCatalog'
import { clipCreditCost } from '@/lib/clips/clipPricing'
import { CLIP_EFFECTS, clipEffectFilmHref, clipEffectForRow, type ClipEffectKey } from '@/lib/clips/clipEffects'
import { SPACE_CLIP_ENGINE, SPACE_CLIP_SECONDS, SPACE_KINDS, buildSpaceMotionPrompt } from '@/lib/spaces/spaces' // KINEO-MOTORES-SAEM-0511
// KINEO-ROSTO-QUADRO-CHAVE-2810 — etapa 2 do "Put your face in it": o quadro-chave (PNG do Nano Banana) vai para o NOSSO bucket em
// caminho determinístico e o vídeo (i2v do motor) parte dele. A ORDEM mora em lib/clips/clipFlow.ts settleClip; aqui só os fios.
import { faceRemixKeyframePath, faceRemixStageForRow, faceRemixVideoModel, faceRemixForRow } from '@/lib/clips/faceRemix' // KINEO-ROSTO-QUADRO-CHAVE-2810
import { buildClipFalInput } from '@/lib/clips/clipCatalog' // KINEO-ROSTO-QUADRO-CHAVE-2810 — a MESMA entrada do i2v do clipe comum, com o quadro-chave no lugar da foto
import {
  CLIP_EXPIRE_MS,
  CLIP_PENDING_STALE_MS,
  cleanProviderError, // KINEO-S25-FOTO-CLIPES-1610
  falErrorDetail, // KINEO-S25-FOTO-CLIPES-1610
  settleClip,
  type ClipRow,
  type ClipSettleDeps,
  type ClipSubmitDeps,
  type ProviderState,
  type RecreateSwapSettleDeps, // KINEO-RECREATE-TRAVA-1011
  clipTelemetry, // KINEO-RECREATE-FILA-KLING-EDIT-1411
  type ClipQueueDeps, // KINEO-RECREATE-FILA-KLING-EDIT-1411
} from '@/lib/clips/clipFlow'
import { VAGA_TTL_MS, FILA_ENVIANDO, FILA_MARCA, FILA_MOTIVOS, FILA_MOTIVOS_DE_ESTORNO, FILA_TETO_ESPERA_MS, FILA_VAGA_EVENTO, FILA_VAGA_NOME, FILA_VAGA_PATH, entradaDaLinha, naFila, tomarVaga, type FilaIo } from '@/lib/recreate/filaKlingEdit' // KINEO-RECREATE-FILA-KLING-EDIT-1411
import { idDaVez } from '@/lib/cronLease' // KINEO-RECREATE-FILA-KLING-EDIT-1411 — o id fixo da vaga (o mesmo desenho da vez do cron)
import { comEndUserDaFal } from '@/lib/recreate/falEndUser' // KINEO-RECREATE-FILA-KLING-EDIT-1411
import { semMarcasDaCasa } from '@/lib/recreate/seuVideo' // KINEO-RECREATE-FILA-KLING-EDIT-1411
// KINEO-CLIPE-MARCA-2026-10-06 — a marca do clipe grátis: interruptor e regra puros. A fiação (Creatomate) só é carregada
// com o interruptor ligado (import dinâmico em persistClipVideo).
import {
  CLIP_OWNER_PROFILE_COLUMNS,
  FREE_CLIP_WATERMARK_LIVE,
  clipOwnerPays,
  cleanClipSourcePath,
  isBrandedClipUrl,
  isFreeClipMarkTestKey,
  type ClipOwnerProfile,
} from '@/lib/clips/freeClipWatermark'
// KINEO-S25-CLIPES-2026-10-06 — o clipe do Seedance 2.5: interruptor único (clipLaunch) e "só para quem paga" pela MESMA
// função do filme do 2.5 (lib/s25Access.ts — só servidor; isPayingPlan da régua única do admin, nunca lista redigitada).
import { clipPaidUpgradeHref, clipS25Visible } from '@/lib/clips/clipLaunch'
import { s25AccessFor } from '@/lib/s25Access'
// KINEO-PARCEIRO-ABRE-TUDO-2026-10-09 — "pode abrir tudo para ele fazer o que ele quiser dentro" (fundador, 09/10): o parceiro
// ativo (cortesia ativa + afiliado ativo) usa o clipe do 2.5 como o filme. Lido no servidor; só para plano de cortesia.
import { isActivePartner } from '@/lib/partnerAccess'

export const CLIPS_TABLE = 'clips'
export const CLIPS_BUCKET = 'renders'
const SUBMIT_TIMEOUT_MS = 15_000
const DOWNLOAD_TIMEOUT_MS = 45_000
const MAX_CLIP_BYTES = 200 * 1024 * 1024

const COLUMNS = 'id,user_id,idempotency_key,fingerprint,billing_reference,engine,mode,model,seconds,aspect,prompt,image_url,credits,fal_usd,status,fal_request_id,video_url,failure_reason,credits_refunded,created_at'

export function clipsAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function toRow(raw: Record<string, unknown>): ClipRow {
  return {
    ...(raw as unknown as ClipRow),
    seconds: Number(raw.seconds),
    credits: Number(raw.credits),
    fal_usd: Number(raw.fal_usd ?? 0),
    credits_refunded: Number(raw.credits_refunded ?? 0),
  }
}

// ─── Conta e catálogo ────────────────────────────────────────────────────────
export interface ClipAccount {
  userId: string
  email: string | null
  plan: string | null
  createdAt: string | null
  balance: number
  /** KINEO-PARCEIRO-ABRE-TUDO-2026-10-09 — parceiro ativo (lib/partnerAccess.ts): só lido para plano de cortesia; falha = false. */
  partner?: boolean
}

export async function loadClipAccount(supabase: SupabaseClient, user: { id: string; email?: string | null }): Promise<ClipAccount | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('plan,video_credits,created_at')
    .eq('id', user.id)
    .maybeSingle()
  if (error) {
    console.error(`[clips] profile read failed user=${user.id.slice(0, 8)}:`, error.message)
    return null
  }
  const p = (data ?? {}) as { plan?: string | null; video_credits?: number | null; created_at?: string | null }
  return {
    userId: user.id,
    email: user.email ?? null,
    plan: p.plan ?? null,
    createdAt: p.created_at ?? null,
    balance: typeof p.video_credits === 'number' ? p.video_credits : 0,
    partner: await isActivePartner(user.id, p.plan ?? null), // KINEO-PARCEIRO-ABRE-TUDO-2026-10-09
  }
}

export function engineAccessFor(account: Pick<ClipAccount, 'email' | 'plan' | 'createdAt' | 'partner'>): (engine: ClipEngineKey) => ClipEngineAccess {
  return (engine) => clipEngineAccess({
    paused: enginePaused(engine) !== null,
    // KINEO-S25-CLIPES-2026-10-06 — UM interruptor para o CLIPE do 2.5: lib/clips/clipLaunch.ts CLIP_S25_PUBLIC (quem VÊ). Ele
    // substitui a trava "só da casa" do KINEO-S25-ABRE-2026-10-06 (s25ClipVisible); o FILME do 2.5 segue com o S25_PUBLIC dele.
    launchVisible: engine !== 's25' || clipS25Visible(account.email),
    planAllowed: decideEngineGate({ engine, plan: account.plan, profileCreatedAt: account.createdAt }).allowed,
    // KINEO-S25-CLIPES-2026-10-06 — e só quem PAGA usa (a régua do filme do 2.5): quem não paga recebe o card trancado.
    ...(engine === 's25' ? { paidAllowed: clipS25Paying(account) } : {}),
  })
}

// KINEO-MOTORES-SAEM-0511 [TRAVA 8.2 — fundador 05/11 "3 sim"] — o que sai é o CLIPE LIVRE. Os efeitos do catálogo rodam em Kling 2.5 de verdade (i2v do trilho 'kling')
// e os Espaços animam a foto nele (app/(dashboard)/spaces): os dois continuam, com o selo real, até o fundador decidir trocá-los. O prompt deles é fixo e escrito
// pela casa, então é ele que identifica o pedido — nunca um campo do navegador. Motor da oferta: null, nada muda.
export function retiredClipRefusal(req: { engine: ClipEngineKey; mode: 't2v' | 'i2v'; seconds: number; prompt: string }): string | null {
  const fora = engineRetired(req.engine)
  if (!fora) return null
  if (req.mode === 'i2v' && CLIP_EFFECTS.some((e) => !e.template && e.engine === req.engine && e.seconds === req.seconds && e.prompt === req.prompt)) return null
  if (req.mode === 'i2v' && req.engine === SPACE_CLIP_ENGINE && req.seconds === SPACE_CLIP_SECONDS && SPACE_KINDS.some((k) => buildSpaceMotionPrompt(k) === req.prompt)) return null
  return `${fora.label} is no longer available for new clips. Nothing was charged. Your existing clips stay in your library. ${fora.alternative.label} is available right now.`
}

/**
 * KINEO-S25-CLIPES-2026-10-06 — pagante para o clipe do Seedance 2.5 = o portão do FILME do 2.5, a mesma função
 * (lib/s25Access.ts s25AccessFor): a casa EXATA do validador de $0 (isDryRunAccount — não o isInternalEmail largo) ou plano
 * pago AGORA (isPayingPlan de app/api/admin/_shared/mrr.ts: *_trial de cortesia e o trial de $1 NÃO passam; pacote avulso
 * compra crédito, não assinatura — por isso nem isPayingProfile nem treatAsPaid). Plano nulo/ilegível = não paga.
 * KINEO-PARCEIRO-ABRE-TUDO-2026-10-09 — e o parceiro ativo em cortesia (account.partner, preenchido por loadClipAccount).
 */
export function clipS25Paying(account: Pick<ClipAccount, 'email' | 'plan' | 'partner'>): boolean {
  return s25AccessFor({ email: account.email, plan: account.plan, partner: account.partner }).allowed
}

export interface PublicClipEngine {
  key: ClipEngineKey
  label: string
  text: boolean
  photo: boolean
  seconds: number[]
  credits: Record<string, number>
  textAspects: string[]
  /** [] = com foto, o formato é o da foto. */
  photoAspects: string[]
}

/** Só o que a conta pode apertar — a rota recusa o resto com a MESMA régua. */
export function clipCatalogFor(access: (engine: ClipEngineKey) => ClipEngineAccess): PublicClipEngine[] {
  // KINEO-MOTORES-SAEM-0511 — Kling 2.5 e Veo 3.1 fora do seletor. O acesso (access) NÃO muda: é ele que mantém os efeitos do trilho 'kling' de pé (publicClipEffects).
  return CLIP_ENGINE_ORDER.filter((key) => engineOffered(key) && access(key).ok).map((key) => {
    const modes = modesFor(key)
    const seconds = offeredSecondsFor(key)
    return {
      key,
      label: CLIP_ENGINES[key].label,
      text: modes.includes('t2v'),
      photo: modes.includes('i2v'),
      seconds,
      credits: Object.fromEntries(seconds.map((s) => [String(s), clipCreditCost(key, s)])),
      textAspects: modes.includes('t2v') ? aspectsFor(key, 't2v') : [],
      photoAspects: modes.includes('i2v') ? aspectsFor(key, 'i2v') : [],
    }
  })
}

/** KINEO-S25-CLIPES-2026-10-06 — motor que a conta VÊ mas só usa pagando (o card trancado do /clips). */
export interface LockedClipEngine {
  key: ClipEngineKey
  label: string
  seconds: number[]
  /** Os planos (lib/clips/clipLaunch.ts clipPaidUpgradeHref): o clique no card trancado vai para cá. */
  upgradeHref: string
}

/**
 * KINEO-S25-CLIPES-2026-10-06 — os cards trancados ("NEW · paid plans"). Ficam FORA de clipCatalogFor de propósito: quem lê
 * `engines` (/clips, Produção do Studio Ads, Espaços) continua recebendo só o que a conta pode apertar, e a rota recusa o
 * resto com a MESMA régua (402 engine_paid) antes de qualquer débito. Sem preço no card (o preço mora no botão de gerar).
 */
export function lockedClipEnginesFor(access: (engine: ClipEngineKey) => ClipEngineAccess): LockedClipEngine[] {
  return CLIP_ENGINE_ORDER.flatMap((key) => {
    const verdict = access(key)
    if (!engineOffered(key) || verdict.ok || verdict.reason !== 'paid') return [] // KINEO-MOTORES-SAEM-0511
    return [{ key, label: CLIP_ENGINES[key].label, seconds: offeredSecondsFor(key), upgradeHref: clipPaidUpgradeHref(key) }]
  })
}

export interface PublicClip {
  id: string
  engine: ClipEngineKey
  label: string
  with_image: boolean
  seconds: number
  aspect: string
  prompt: string
  status: ClipRow['status']
  video_url: string | null
  credits: number
  credits_refunded: number
  failure_reason: string | null
  created_at: string
  /** KINEO-CLIP-EFEITOS-2026-10-05 — efeito de 1 clique que gerou o clipe (null = clipe livre). */
  effect: ClipEffectKey | null
  /** Link do upsell "filme narrado" (só para clipe de efeito); o clique passa antes por POST /api/clips/effect-upsell. */
  film_href: string | null
  /** KINEO-CLIPE-MARCA-2026-10-06 — o arquivo entregue leva a marca usekineo.com (clipe de quem não paga). */
  branded: boolean
  /** KINEO-ROSTO-QUADRO-CHAVE-2810 — remix em andamento: 'keyframe' (colocando a pessoa na cena) ou 'video' (filmando); null = não é remix. */
  stage: 'keyframe' | 'video' | null // KINEO-ROSTO-QUADRO-CHAVE-2810
}

export function toPublicClip(row: ClipRow): PublicClip {
  const effect = clipEffectForRow(row)
  return {
    stage: faceRemixStageForRow(row), // KINEO-ROSTO-QUADRO-CHAVE-2810
    id: row.id,
    engine: row.engine,
    label: effect?.template?.label ?? (CLIP_ENGINES[row.engine] ? clipLabelForModel(row.engine, row.model) : row.engine), // KINEO-EFEITOS-NOVOS-2026-10-13 — selo do modelo real · KINEO-ROTULO-CLIPE-H3-1111: clipe antigo do trilho seedance = Seedance 1.5
    with_image: row.mode === 'image',
    seconds: row.seconds,
    aspect: row.aspect,
    prompt: row.prompt,
    status: row.status,
    // Nunca a URL da fal: só existe video_url depois de persistido no nosso bucket.
    video_url: row.status === 'done' ? row.video_url : null,
    credits: row.credits,
    credits_refunded: row.credits_refunded,
    failure_reason: row.failure_reason,
    created_at: row.created_at,
    effect: effect?.key ?? null,
    film_href: effect ? clipEffectFilmHref(effect) : null,
    branded: row.status === 'done' && isBrandedClipUrl(row.video_url),
  }
}

/**
 * KINEO-CLIPE-MARCA-2026-10-06 — token do caminho do original LIMPO de um clipe com marca. HMAC com a chave de serviço (o
 * mesmo segredo das claims da casa, lib/animate/claim.ts): o dono lê a própria linha pelo RLS, mas não monta este caminho.
 */
export function clipCleanToken(clipId: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('clip clean token: service key missing')
  return createHmac('sha256', secret).update(`kineo-clip-clean:${clipId}`).digest('hex').slice(0, 24)
}

/**
 * KINEO-CLIPE-MARCA-2026-10-06 — "Meus clipes" para quem ASSINOU depois de fazer clipes grátis: a URL com marca vira a do
 * original limpo. Sem clipe com marca na lista (sempre, com o interruptor desligado) é o mesmo map de antes, sem leitura.
 */
export async function publicClipsForViewer(admin: SupabaseClient, userId: string, rows: ClipRow[]): Promise<PublicClip[]> {
  const out = rows.map((row) => toPublicClip(row))
  if (!out.some((clip) => clip.branded)) return out
  const { data, error } = await admin.from('profiles').select(CLIP_OWNER_PROFILE_COLUMNS).eq('id', userId).maybeSingle()
  if (error || !data || !clipOwnerPays(data as ClipOwnerProfile)) return out
  // KINEO-MARCA-TESTE-INTERNO-2026-10-06 — o clipe de PROVA da casa fica com a marca na lista (ele existe para mostrar a marca).
  const markTests = new Set(rows.filter((row) => isFreeClipMarkTestKey(row.idempotency_key)).map((row) => row.id))
  return out.map((clip) => {
    if (!clip.branded || markTests.has(clip.id)) return clip
    try {
      const { data: pub } = admin.storage.from(CLIPS_BUCKET).getPublicUrl(cleanClipSourcePath(userId, clip.id, clipCleanToken(clip.id)))
      return pub?.publicUrl ? { ...clip, video_url: pub.publicUrl, branded: false } : clip
    } catch {
      return clip
    }
  })
}

export async function listClips(admin: SupabaseClient, userId: string, limit = 30): Promise<ClipRow[] | null> {
  const { data, error } = await admin
    .from(CLIPS_TABLE)
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.warn('[clips] list failed:', error.message)
    return null
  }
  return (data ?? []).map((r) => toRow(r as Record<string, unknown>))
}

export async function loadClip(admin: SupabaseClient, userId: string, id: string): Promise<ClipRow | null | 'error'> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data, error } = await admin.from(CLIPS_TABLE).select(COLUMNS).eq('id', id).eq('user_id', userId).maybeSingle()
  if (error) return 'error'
  return data ? toRow(data as Record<string, unknown>) : null
}

// ─── fal ─────────────────────────────────────────────────────────────────────
/** Um POST cru na fila (o SDK re-tenta POST pago em erro de gateway — mesmo motivo de lib/avatar/veed.ts). */
async function submitToFalOnce(model: string, input: Record<string, unknown>): Promise<{ ok: true; requestId: string } | { ok: false; ambiguous: boolean; error: string }> {
  const key = process.env.FAL_KEY
  if (!key) return { ok: false, ambiguous: false, error: 'FAL_KEY missing' }
  let response: Response
  try {
    response = await fetch(`https://queue.fal.run/${model}`, {
      method: 'POST',
      headers: { Authorization: `Key ${key}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      cache: 'no-store',
      signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
    })
  } catch (error) {
    return { ok: false, ambiguous: true, error: `transport: ${error instanceof Error ? error.message : String(error)}`.slice(0, 200) }
  }
  const raw = await response.text().catch(() => '')
  let payload: Record<string, unknown> = {}
  try { payload = raw ? JSON.parse(raw) as Record<string, unknown> : {} } catch { payload = {} }
  if (!response.ok) {
    // KINEO-S25-FOTO-CLIPES-1610 — o corpo inteiro da fal (detail string OU lista [{loc,msg,type}], message, error), não só o
    // detail-string; limpo (sem URL, sem a FAL_KEY, ≤300) porque vira `provider_error` no clip_failed (lib/clips/clipFlow.ts).
    const detail = falErrorDetail(Object.keys(payload).length ? payload : raw) || raw.slice(0, 300) // KINEO-S25-FOTO-CLIPES-1610
    // KINEO-FAL-SALDO-ALERTA-2026-09-28 — await: o alarme de saldo não pode morrer com a lambda.
    if (looksExhausted({ status: response.status, message: detail })) {
      await alertFalExhausted({ source: 'clips', engine: model, context: 'clip submit' })
    }
    return { ok: false, ambiguous: response.status === 408 || response.status >= 500, error: cleanProviderError(`fal ${response.status}: ${detail}`, [key]) ?? `fal ${response.status}` } // KINEO-S25-FOTO-CLIPES-1610
  }
  const requestId = typeof payload.request_id === 'string' ? payload.request_id.trim() : ''
  if (!requestId) return { ok: false, ambiguous: true, error: 'fal response without request_id' }
  return { ok: true, requestId }
}

function configureFal(): boolean {
  const key = process.env.FAL_KEY
  if (!key) return false
  fal.config({ credentials: key })
  return true
}

/** Espelho de checkAvatarJob: 400/422 é terminal; transporte (rede, 429, 5xx) fica `unknown` — o job pago pode estar vivo. */
async function pollFal(model: string, requestId: string): Promise<ProviderState> {
  if (!configureFal()) return { state: 'unknown' }
  try {
    const st = await fal.queue.status(model, { requestId })
    const s = (st as { status?: string }).status
    if (s === 'IN_QUEUE') return { state: 'queued' }
    if (s === 'IN_PROGRESS') return { state: 'running' }
    if (s !== 'COMPLETED') return { state: 'unknown' }
    const res = await fal.queue.result(model, { requestId })
    const data = ((res as { data?: unknown }).data ?? res) as { video?: { url?: string }; output?: { video?: { url?: string } }; images?: Array<{ url?: string }> } // KINEO-ROSTO-QUADRO-CHAVE-2810 — + images (o quadro-chave do Nano Banana edit)
    const url = data?.video?.url ?? data?.output?.video?.url ?? null
    const imageUrl = Array.isArray(data?.images) ? data.images[0]?.url ?? null : null // KINEO-ROSTO-QUADRO-CHAVE-2810 — a saída do edit (etapa 1 do remix) é images[0].url
    const out = url ?? imageUrl // KINEO-ROSTO-QUADRO-CHAVE-2810
    return out ? { state: 'done', url: out } : { state: 'failed', error: 'completed without video url' } // KINEO-ROSTO-QUADRO-CHAVE-2810 — era `url ? { state: 'done', url }`
  } catch (err) {
    const status = typeof (err as { status?: unknown })?.status === 'number' ? (err as { status: number }).status : null
    const msg = err instanceof Error ? err.message : String(err)
    // KINEO-S25-FOTO-CLIPES-1610 — o motivo REAL mora em err.body.detail (err.message é só "Unprocessable Entity"); era
    // descartado aqui. Mesmo campo que o poller do filme lê (app/api/cinematic-clip-status pollMessageSignal). Limpo com a FAL_KEY.
    if (status === 422 || status === 400 || /unprocessable entity/i.test(msg)) { // KINEO-S25-FOTO-CLIPES-1610
      const detail = falErrorDetail((err as { body?: unknown })?.body) // KINEO-S25-FOTO-CLIPES-1610
      return { state: 'failed', error: cleanProviderError(`fal ${status ?? ''} ${detail || msg}`, [process.env.FAL_KEY ?? '']) ?? `fal ${status ?? ''}` } // KINEO-S25-FOTO-CLIPES-1610
    } // KINEO-S25-FOTO-CLIPES-1610
    console.warn(`[clips] poll transport error request=${requestId}:`, msg.slice(0, 200))
    return { state: 'unknown' }
  }
}

async function persistClipVideo(admin: SupabaseClient, row: ClipRow, providerUrl: string): Promise<string> {
  // KINEO-CLIPE-MARCA-2026-10-06 — clipe de quem não paga sai com a marca usekineo.com (lib/clips/freeClipWatermark.ts).
  // Desligado (FREE_CLIP_WATERMARK_LIVE=false) nada disto roda — nem o import — e o clipe segue o caminho de sempre.
  // null = este clipe não leva marca (pagou, perfil ilegível, perto do prazo): caminho de sempre, logo abaixo.
  // KINEO-MARCA-TESTE-INTERNO-2026-10-06 — a única exceção com o interruptor desligado: o clipe de PROVA (chave de teste). Quem
  // decide se ele leva a marca é o servidor da marca, pelo e-mail do dono (só conta da casa); conta de fora sai limpa.
  // KINEO-RECREATE-SEU-VIDEO-1311 — o Recreate "com o seu vídeo" (Seedance 2.5, sai mudo) passa pela MESMA montagem para receber o som
  // original do vídeo do cliente; com marca (quem não paga) ou só o som (quem paga). Fora dele, audio = null e nada muda. Dentro do
  // interruptor da marca de propósito: desligado, nada da montagem roda (nem o import), e o clipe sai mudo como na Entrega A.
  const audio = somOriginalDaLinha(row, process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') // KINEO-RECREATE-SEU-VIDEO-1311
  if (FREE_CLIP_WATERMARK_LIVE || isFreeClipMarkTestKey(row.idempotency_key)) {
    const { persistFreeClipWithMark } = await import('@/lib/clips/freeClipWatermarkServer')
    const marked = await persistFreeClipWithMark({
      admin, row, providerUrl, bucket: CLIPS_BUCKET, table: CLIPS_TABLE, cleanToken: clipCleanToken(row.id), expireMs: CLIP_EXPIRE_MS, audio, mute: row.model === KLING4_EDIT_MODEL, // KINEO-RECREATE-SEU-VIDEO-1311 — + audio · KINEO-RECREATE-KLING4-1311 — + mute
    })
    if (marked !== null) return marked
  }
  const res = await fetch(providerUrl, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS), cache: 'no-store' })
  if (!res.ok) throw new Error(`download ${res.status}`)
  const cru = await res.arrayBuffer() // KINEO-RECREATE-KLING4-1311 — era: const buf = await res.arrayBuffer()
  const buf = row.model === KLING4_EDIT_MODEL ? silenciarMp4(new Uint8Array(cru)) : cru // KINEO-RECREATE-KLING4-1311 — o som que o Kling inventa nunca é guardado
  if (buf.byteLength === 0 || buf.byteLength > MAX_CLIP_BYTES) throw new Error(`bad size ${buf.byteLength}`)
  // Caminho determinístico + upsert: duas abas persistindo o mesmo clipe escrevem o MESMO arquivo.
  const path = `clips/${row.user_id}/${row.id}.mp4`
  const { error } = await admin.storage.from(CLIPS_BUCKET).upload(path, buf, { contentType: 'video/mp4', upsert: true })
  if (error) throw new Error(error.message)
  const { data } = admin.storage.from(CLIPS_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('no public url')
  return data.publicUrl
}

// ─── KINEO-ROSTO-QUADRO-CHAVE-2810 — etapa 2 do remix ────────────────────────
const MAX_KEYFRAME_BYTES = 20 * 1024 * 1024 // KINEO-ROSTO-QUADRO-CHAVE-2810

/** O quadro-chave (PNG da fal, URL que expira) vai para o nosso bucket em caminho determinístico (upsert: dois atores, o MESMO arquivo). */
async function persistClipKeyframe(admin: SupabaseClient, row: ClipRow, providerUrl: string): Promise<string> { // KINEO-ROSTO-QUADRO-CHAVE-2810
  const res = await fetch(providerUrl, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS), cache: 'no-store' }) // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (!res.ok) throw new Error(`keyframe download ${res.status}`) // KINEO-ROSTO-QUADRO-CHAVE-2810
  const buf = await res.arrayBuffer() // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (buf.byteLength === 0 || buf.byteLength > MAX_KEYFRAME_BYTES) throw new Error(`keyframe bad size ${buf.byteLength}`) // KINEO-ROSTO-QUADRO-CHAVE-2810
  const ct = res.headers.get('content-type') ?? '' // KINEO-ROSTO-QUADRO-CHAVE-2810
  const contentType = /image\/(png|jpeg|webp)/.test(ct) ? (ct.match(/image\/(?:png|jpeg|webp)/) as RegExpMatchArray)[0] : 'image/png' // KINEO-ROSTO-QUADRO-CHAVE-2810
  const path = faceRemixKeyframePath(row.user_id, row.id) // KINEO-ROSTO-QUADRO-CHAVE-2810
  const { error } = await admin.storage.from(CLIPS_BUCKET).upload(path, buf, { contentType, upsert: true }) // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (error) throw new Error(error.message) // KINEO-ROSTO-QUADRO-CHAVE-2810
  const { data } = admin.storage.from(CLIPS_BUCKET).getPublicUrl(path) // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (!data?.publicUrl) throw new Error('keyframe: no public url') // KINEO-ROSTO-QUADRO-CHAVE-2810
  return data.publicUrl // KINEO-ROSTO-QUADRO-CHAVE-2810
} // KINEO-ROSTO-QUADRO-CHAVE-2810

/** Reserva a etapa 2: troca o modelo para o i2v e ZERA o request_id, condicionado ao modelo da etapa 1 + ao request_id do quadro-chave.
 *  Só um ator move a linha (o outro vê 0 linhas). Enquanto o request_id está nulo, a rede de 10 min (submit_lost) cobre o envio perdido. */
async function claimRemixVideoStage(admin: SupabaseClient, row: ClipRow, videoModel: string): Promise<boolean> { // KINEO-ROSTO-QUADRO-CHAVE-2810
  const { data, error } = await admin // KINEO-ROSTO-QUADRO-CHAVE-2810
    .from(CLIPS_TABLE) // KINEO-ROSTO-QUADRO-CHAVE-2810
    .update({ model: videoModel, fal_request_id: null }) // KINEO-ROSTO-QUADRO-CHAVE-2810
    .eq('id', row.id) // KINEO-ROSTO-QUADRO-CHAVE-2810
    .eq('status', 'processing') // KINEO-ROSTO-QUADRO-CHAVE-2810
    .eq('model', row.model) // KINEO-ROSTO-QUADRO-CHAVE-2810
    .eq('fal_request_id', row.fal_request_id) // KINEO-ROSTO-QUADRO-CHAVE-2810
    .select('id') // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (error) { console.error(`[clips] remix claim failed clip=${row.id}:`, error.message); return false } // KINEO-ROSTO-QUADRO-CHAVE-2810
  return (data ?? []).length > 0 // KINEO-ROSTO-QUADRO-CHAVE-2810
} // KINEO-ROSTO-QUADRO-CHAVE-2810

async function markRemixVideoSubmitted(admin: SupabaseClient, id: string, videoModel: string, requestId: string): Promise<boolean> { // KINEO-ROSTO-QUADRO-CHAVE-2810
  const { data, error } = await admin // KINEO-ROSTO-QUADRO-CHAVE-2810
    .from(CLIPS_TABLE) // KINEO-ROSTO-QUADRO-CHAVE-2810
    .update({ fal_request_id: requestId, submitted_at: new Date().toISOString() }) // KINEO-ROSTO-QUADRO-CHAVE-2810
    .eq('id', id) // KINEO-ROSTO-QUADRO-CHAVE-2810
    .eq('status', 'processing') // KINEO-ROSTO-QUADRO-CHAVE-2810
    .eq('model', videoModel) // KINEO-ROSTO-QUADRO-CHAVE-2810
    .is('fal_request_id', null) // KINEO-ROSTO-QUADRO-CHAVE-2810
    .select('id') // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (error) console.error(`[clips] remix markVideoSubmitted failed clip=${id} request=${requestId}:`, error.message) // KINEO-ROSTO-QUADRO-CHAVE-2810
  return !error && (data ?? []).length > 0 // KINEO-ROSTO-QUADRO-CHAVE-2810
} // KINEO-ROSTO-QUADRO-CHAVE-2810

/** O vídeo da etapa 2: a MESMA entrada do i2v do clipe comum (buildClipFalInput), com o quadro-chave NOSSO como 1º quadro. */
function submitRemixVideo(row: ClipRow, videoModel: string, keyframeUrl: string) { // KINEO-ROSTO-QUADRO-CHAVE-2810
  return submitToFalOnce(videoModel, buildClipFalInput({ engine: row.engine, mode: 'i2v', model: videoModel, seconds: row.seconds, aspect: 'image', prompt: row.prompt, imageUrl: keyframeUrl })) // KINEO-ROSTO-QUADRO-CHAVE-2810
} // KINEO-ROSTO-QUADRO-CHAVE-2810

// ─── Transições condicionais ─────────────────────────────────────────────────
async function markFailed(admin: SupabaseClient, id: string, reason: string, refunded: number): Promise<boolean> {
  const { data, error } = await admin
    .from(CLIPS_TABLE)
    .update({ status: 'failed', failure_reason: reason.slice(0, 60), credits_refunded: refunded, settled_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['pending', 'processing'])
    .select('id')
  if (error) {
    console.error(`[clips] markFailed failed clip=${id}:`, error.message)
    return false
  }
  const moved = (data ?? []).length > 0
  // Corrida de dois atores: quem RECEBEU o estorno (amount > 0) pode não ser quem moveu a linha. O valor devolvido
  // sempre fica registrado.
  if (!moved && refunded > 0) {
    await admin.from(CLIPS_TABLE).update({ credits_refunded: refunded }).eq('id', id).eq('credits_refunded', 0)
  }
  return moved
}

function clipEvent(userId: string) {
  return async (name: string, metadata: Record<string, unknown>) => {
    await writeServerEvent({ name, userId, path: '/api/clips', metadata: { ...metadata, version: 'clips_20260929' } }).catch(() => false)
  }
}

export function settleDepsFor(admin: SupabaseClient, userId: string): ClipSettleDeps {
  return {
    poll: pollFal,
    persist: (row, url) => persistClipVideo(admin, row, url),
    refund: (ref) => refundRenderCredits(ref),
    markDone: async (id, videoUrl) => {
      const { data, error } = await admin
        .from(CLIPS_TABLE)
        .update({ status: 'done', video_url: videoUrl, settled_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'processing')
        .select('id')
      if (error) console.error(`[clips] markDone failed clip=${id}:`, error.message)
      return !error && (data ?? []).length > 0
    },
    markFailed: (id, reason, refunded) => markFailed(admin, id, reason, refunded),
    event: clipEvent(userId),
    now: () => Date.now(),
    // KINEO-ROSTO-QUADRO-CHAVE-2810 — etapa 2 do remix (persistir o quadro-chave → reservar → enviar o vídeo → gravar o request_id).
    keyframe: { // KINEO-ROSTO-QUADRO-CHAVE-2810
      persist: (row, url) => persistClipKeyframe(admin, row, url), // KINEO-ROSTO-QUADRO-CHAVE-2810
      claim: (row, videoModel) => claimRemixVideoStage(admin, row, videoModel), // KINEO-ROSTO-QUADRO-CHAVE-2810
      submitVideo: (row, videoModel, keyframeUrl) => submitRemixVideo(row, videoModel, keyframeUrl), // KINEO-ROSTO-QUADRO-CHAVE-2810
      markVideoSubmitted: (id, videoModel, requestId) => markRemixVideoSubmitted(admin, id, videoModel, requestId), // KINEO-ROSTO-QUADRO-CHAVE-2810
      videoModel: (row) => { const item = faceRemixForRow(row); if (!item) throw new Error('remix: row is not a face remix'); return faceRemixVideoModel(item) }, // KINEO-ROSTO-QUADRO-CHAVE-2810
    }, // KINEO-ROSTO-QUADRO-CHAVE-2810
    queue: clipQueueDepsFor(admin), // KINEO-RECREATE-FILA-KLING-EDIT-1411 — a fila anda em toda liquidação (tela, cron de 1 min, varredura)
    recreateSwap: recreateSwapDepsFor(admin, userId), // KINEO-RECREATE-TRAVA-1011 — a trava "não trocou" em TODO caminho que entrega (tela, /clips, cron, varredura)
  }
}

// KINEO-RECREATE-TRAVA-1011 [fundador 10/11: "tem que fazer tudo funcionar agora. Sem erros"] — fios da trava "não trocou".
// A trava da checagem mora em clips.failure_reason enquanto status='processing' (sem coluna nova): 'swapcheck_<ms>'; quem
// não ganha o UPDATE condicional espera o próximo poll. Trava de 2 min+ (ator morreu no meio) pode ser retomada.
export function recreateSwapDepsFor(admin: SupabaseClient, userId: string): RecreateSwapSettleDeps {
  return {
    applies: (row) => usaTravaNaoTrocou(row.model), // KINEO-RECREATE-SEU-VIDEO-1311 — era: row.model === RECREATE_MODEL (CEO 13/11: o Seedance 2.5 também gera sem trocar e sem erro)
    busy: (row, now) => swapCheckBusy(row.failure_reason, now),
    claim: async (row) => {
      const now = Date.now()
      const lock = swapCheckLock(now, randomUUID().slice(0, 8))
      const { data, error } = await admin
        .from(CLIPS_TABLE)
        .update({ failure_reason: lock })
        .eq('id', row.id)
        .eq('status', 'processing')
        .or(`failure_reason.is.null,and(failure_reason.like.${SWAP_CHECK_LOCK_PREFIX}*,failure_reason.lt.${swapCheckLock(now - SWAP_CHECK_LOCK_STALE_MS)})`)
        .select('id')
      if (error) console.error(`[clips] recreate swap-check claim failed clip=${row.id}:`, error.message)
      return !error && (data ?? []).length > 0 ? lock : null
    },
    check: (row, url) => runSwapCheck(row, url),
    // Atômico: failed só para quem AINDA detém a reserva; o estorno vem depois, só no vencedor (clipFlow).
    markFailed: async (id, reason, lock) => {
      const { data, error } = await admin
        .from(CLIPS_TABLE)
        .update({ status: 'failed', failure_reason: reason.slice(0, 60), credits_refunded: 0, settled_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'processing')
        .eq('failure_reason', lock)
        .select('id')
      if (error) console.error(`[clips] recreate markFailed failed clip=${id}:`, error.message)
      return !error && (data ?? []).length > 0
    },
    setRefunded: async (id, refunded) => {
      const { error } = await admin.from(CLIPS_TABLE).update({ credits_refunded: refunded }).eq('id', id).eq('status', 'failed').eq('credits_refunded', 0)
      if (error) console.error(`[clips] recreate setRefunded failed clip=${id} refunded=${refunded}:`, error.message)
    },
    markDone: async (id, videoUrl, lock) => {
      const { data, error } = await admin
        .from(CLIPS_TABLE)
        .update({ status: 'done', video_url: videoUrl, failure_reason: null, settled_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'processing')
        .eq('failure_reason', lock)
        .select('id')
      if (error) console.error(`[clips] recreate markDone failed clip=${id}:`, error.message)
      return !error && (data ?? []).length > 0
    },
    // KINEO-RECREATE-AUDITORIA-DA-TRAVA-1411 [CEO 14/11] — a saída reprovada, crua (como o motor entregou), no bucket PRIVADO da casa, pasta só
    // desta auditoria, 48 h. Nunca lança: qualquer falha = null (a liquidação segue). Regras puras: lib/recreate/auditoriaDaTrava.ts.
    keepRejected: async (row, providerUrl, gastoMs) => {
      const path = caminhoDaAuditoria(row.id)
      const teto = orcamentoDaCopia(gastoMs)
      if (!path || teto <= 0 || !providerUrl.startsWith('https://')) return null
      // KINEO-RECREATE-FILA-REVISAO-1411 (item 10) — o teto vale para a cópia INTEIRA: o download tem AbortSignal e o upload corre contra o mesmo relógio (um upload
      // pendurado não segura mais ninguém: passou do teto, a cópia é abandonada e devolve null).
      const copia = (async () => {
        const res = await fetch(providerUrl, { signal: AbortSignal.timeout(teto), cache: 'no-store' })
        if (!res.ok) return null
        const buf = await res.arrayBuffer()
        if (buf.byteLength === 0 || buf.byteLength > AUDITORIA_MAX_BYTES) return null
        const { error } = await admin.storage.from(QUARANTINE_BUCKET).upload(path, buf, { contentType: 'video/mp4', upsert: true })
        if (error) { console.error(`[clips] recreate audit copy failed clip=${row.id}:`, error.message); return null }
        return { bucket: QUARANTINE_BUCKET, path, bytes: buf.byteLength, expires_at: venceEm(Date.now()) }
      })().catch(() => null)
      let relogio: ReturnType<typeof setTimeout> | undefined
      const estourou = new Promise<null>((resolve) => { relogio = setTimeout(() => resolve(null), teto) })
      try { return await Promise.race([copia, estourou]) } finally { clearTimeout(relogio) }
    },
    // A cópia foi guardada: evento próprio, depois de tudo (o recreate_swap_check já foi gravado com o caminho previsto).
    recordAudit: async (row, audit) => {
      await writeServerEvent({ name: RECREATE_SWAP_AUDIT_EVENT, userId, path: '/api/recreate/status', metadata: { clip_id: row.id, bucket: audit.bucket, path: audit.path, bytes: audit.bytes, expires_at: audit.expires_at } }).catch(() => false)
    },
    record: async (row, verdict, outcome) => {
      const v = verdict as Partial<SwapVerdict>
      await writeServerEvent({ name: RECREATE_SWAP_CHECK_EVENT, userId, path: '/api/recreate/status', metadata: {
        format: v.format ?? recreateRowContext(row)?.format.id ?? null, clip_id: row.id, result: verdict.result, reason: verdict.reason,
        unverified_reason: verdict.result === 'unverified' ? (v.unverified_reason ?? 'http_error') : null,
        delivered: outcome.delivered, credits: row.credits, credits_refunded: outcome.credits_refunded,
        persons: v.persons ?? [], model: v.model ?? null, usd: v.usd ?? null, ms: v.ms ?? null, version: 'recreate_swap_check_1011b',
        instants: v.instants ?? null, subjects: v.subjects ?? null, pairs_used: v.pairs_used ?? null, rule: v.rule ?? null, // KINEO-RECREATE-TRAVA-ALVO-1411 — os instantes julgados, o alvo e a regra (null = checagem antiga, sem alvo)
        // KINEO-RECREATE-FILA-REVISAO-1411 (item 10) — a cópia roda DEPOIS deste evento: aqui vai o caminho PREVISTO da saída reprovada (privado, 48 h); o evento
        // recreate_swap_audit confirma quando ela foi guardada (com bytes e vencimento). Entregue = sem cópia.
        audit_bucket: outcome.delivered ? null : QUARANTINE_BUCKET, audit_path: outcome.delivered ? null : caminhoDaAuditoria(row.id),
      } }).catch(() => false)
    },
  }
}

// ═══ KINEO-RECREATE-FILA-KLING-EDIT-1411 [CEO 14/11, pedido 3] — os fios da fila de UM pedido por vez no Kling 4.0 edição ═══════════════
// Regras e números: lib/recreate/filaKlingEdit.ts. A vaga é uma linha de id fixo em `events` (o desenho de lib/cronLease); a fila são as
// linhas `pending` do modelo com a marca em failure_reason. Sem tabela, coluna ou cron novos.
const FILA_VAGA_ID = idDaVez(FILA_VAGA_NOME)
/** KINEO-RECREATE-FILA-REVISAO-1411 — fecha um clipe da fila como falha com estorno: failed PRIMEIRO (condicional), depois o estorno idempotente e
 *  o valor na linha. Se o estorno falhar agora, a linha fica failed com 0 e a varredura horária o refaz (FILA_MOTIVOS_DE_ESTORNO). */
async function fecharClipeDaFila(admin: SupabaseClient, clipId: string, motivo: string, condicao: 'aberto' | 'na_fila'): Promise<boolean> {
  let q = admin.from(CLIPS_TABLE).update({ status: 'failed', failure_reason: motivo, credits_refunded: 0, settled_at: new Date().toISOString() }).eq('id', clipId)
  q = condicao === 'na_fila' ? q.eq('status', 'pending').eq('failure_reason', FILA_MARCA) : q.in('status', ['pending', 'processing'])
  const { data, error } = await q.select('id')
  if (error) { console.error(`[clips/fila] close failed clip=${clipId} reason=${motivo}:`, error.message); return false }
  if (!(data ?? []).length) return false // não moveu: outro ator fechou ou mandou
  const lida = await admin.from(CLIPS_TABLE).select(COLUMNS).eq('id', clipId).maybeSingle()
  if (lida.error || !lida.data) { console.error(`[clips/fila] closed row unreadable clip=${clipId}: the hourly sweep refunds it`); return true }
  const fechado = toRow(lida.data as Record<string, unknown>)
  const refunded = await refundRenderCredits(fechado.billing_reference)
  if (refunded > 0) await admin.from(CLIPS_TABLE).update({ credits_refunded: refunded }).eq('id', clipId).eq('status', 'failed').eq('credits_refunded', 0)
  await clipEvent(fechado.user_id)('clip_failed', { ...clipTelemetry(fechado), reason: motivo, credits_refunded: refunded, stage: 'queue' })
  return true
}
function filaIoFor(admin: SupabaseClient): FilaIo {
  return {
    now: () => Date.now(),
    maisAntigoNaFila: async () => {
      const { data, error } = await admin.from(CLIPS_TABLE).select('id').eq('model', KLING4_EDIT_MODEL).eq('status', 'pending').eq('failure_reason', FILA_MARCA)
        .order('created_at', { ascending: true }).order('id', { ascending: true }).limit(1)
      if (error) throw new Error(`queue lookup failed: ${error.message}`)
      const id = (data ?? [])[0]?.id
      return typeof id === 'string' ? id : null
    },
    criarVaga: async (clipId, expiraEm) => {
      const { error } = await admin.from('events').insert({ id: FILA_VAGA_ID, name: FILA_VAGA_EVENTO, path: FILA_VAGA_PATH, metadata: { clip_id: clipId, expira_em: new Date(expiraEm).toISOString(), tomada_em: new Date().toISOString(), versao: 'fila_kling_edit_1411b' } })
      if (!error) return true
      if ((error as { code?: string }).code === '23505') return false
      throw new Error(`queue slot insert failed: ${error.message}`)
    },
    lerVaga: async () => {
      const { data, error } = await admin.from('events').select('metadata, created_at').eq('id', FILA_VAGA_ID).maybeSingle()
      if (error) throw new Error(`queue slot read failed: ${error.message}`)
      const md = (data?.metadata ?? null) as Record<string, unknown> | null
      if (!md || typeof md.clip_id !== 'string') return null
      const expira = Date.parse(String(md.expira_em ?? ''))
      const tomada = Date.parse(String(md.tomada_em ?? (data as { created_at?: unknown } | null)?.created_at ?? ''))
      const expiraEm = Number.isFinite(expira) ? expira : 0
      // Sem data de início legível (vaga gravada pela 1ª versão): o início é o vencimento menos o prazo da vaga — nunca "zero", que faria o teto duro valer na hora.
      return { clipId: md.clip_id, expiraEm, tomadaEm: Number.isFinite(tomada) ? tomada : expiraEm - VAGA_TTL_MS }
    },
    apagarVaga: async (clipId) => {
      const { error } = await admin.from('events').delete().eq('id', FILA_VAGA_ID).eq('metadata->>clip_id', clipId)
      if (error) console.error(`[clips/fila] slot release failed clip=${clipId}:`, error.message)
    },
    renovarVaga: async (clipId, expiraEm) => {
      const atual = await admin.from('events').select('metadata').eq('id', FILA_VAGA_ID).eq('metadata->>clip_id', clipId).maybeSingle()
      if (atual.error || !atual.data) return
      const { error } = await admin.from('events').update({ metadata: { ...((atual.data.metadata ?? {}) as Record<string, unknown>), expira_em: new Date(expiraEm).toISOString() } }).eq('id', FILA_VAGA_ID).eq('metadata->>clip_id', clipId)
      if (error) console.error(`[clips/fila] slot renew failed clip=${clipId}:`, error.message)
    },
    estadoDoDono: async (clipId) => {
      const { data, error } = await admin.from(CLIPS_TABLE).select('status, fal_request_id').eq('id', clipId).maybeSingle()
      if (error) throw new Error(`queue owner read failed: ${error.message}`)
      if (!data || (data.status !== 'pending' && data.status !== 'processing')) return 'fechado'
      return data.status === 'processing' && data.fal_request_id ? 'no_fornecedor' : 'fora_do_fornecedor'
    },
    // KINEO-RECREATE-FILA-REVISAO-1411 (item 2) — o dono da vaga vencida ESTÁ no fornecedor: a liquidação de verdade (consulta; pronto = trava e
    // entrega; falhou = estorno). Nunca "preso" para um pedido que o fornecedor já entregou.
    liquidar: async (clipId) => {
      const { data, error } = await admin.from(CLIPS_TABLE).select(COLUMNS).eq('id', clipId).maybeSingle()
      if (error || !data) return 'fechado'
      const dono = toRow(data as Record<string, unknown>)
      const depois = await settleClip(settleDepsFor(admin, dono.user_id), dono).catch(() => dono)
      return depois.status === 'done' || depois.status === 'failed' ? 'fechado' : 'aberto'
    },
    fecharComEstorno: async (clipId) => { await fecharClipeDaFila(admin, clipId, FILA_MOTIVOS.preso, 'aberto') },
  }
}
export function clipQueueDepsFor(admin: SupabaseClient): ClipQueueDeps {
  const io = filaIoFor(admin)
  return {
    applies: (row) => row.model === KLING4_EDIT_MODEL,
    queued: (row) => naFila(row),
    take: (row, opts) => tomarVaga(io, row.id, opts),
    enqueue: async (id) => {
      const { data, error } = await admin.from(CLIPS_TABLE).update({ failure_reason: FILA_MARCA }).eq('id', id).eq('status', 'pending').is('fal_request_id', null).select('id')
      if (error) console.error(`[clips/fila] enqueue failed clip=${id}:`, error.message)
      return !error && (data ?? []).length > 0
    },
    // KINEO-RECREATE-FILA-REVISAO-1411 (item 4) — sair da fila é UPDATE condicional à marca: um ator só; linha que já saiu, venceu ou fechou = false.
    claimSend: async (id) => {
      const { data, error } = await admin.from(CLIPS_TABLE).update({ failure_reason: FILA_ENVIANDO }).eq('id', id).eq('status', 'pending').eq('failure_reason', FILA_MARCA).is('fal_request_id', null).select('id')
      if (error) console.error(`[clips/fila] claimSend failed clip=${id}:`, error.message)
      return !error && (data ?? []).length > 0
    },
    // Teto de espera: failed condicional à marca (quem está sendo mandado não é tocado); o estorno e o evento são do fluxo, só para quem moveu.
    expire: async (id) => {
      const { data, error } = await admin.from(CLIPS_TABLE).update({ status: 'failed', failure_reason: FILA_MOTIVOS.tempo, credits_refunded: 0, settled_at: new Date().toISOString() })
        .eq('id', id).eq('status', 'pending').eq('failure_reason', FILA_MARCA).select('id')
      if (error) console.error(`[clips/fila] expire failed clip=${id}:`, error.message)
      return !error && (data ?? []).length > 0
    },
    setRefunded: async (id, refunded) => {
      const { error } = await admin.from(CLIPS_TABLE).update({ credits_refunded: refunded }).eq('id', id).eq('status', 'failed').eq('credits_refunded', 0)
      if (error) console.error(`[clips/fila] setRefunded failed clip=${id} refunded=${refunded}:`, error.message)
    },
    // O pedido gravado na impressão da linha, com o mesmo embrulho do envio direto (end_user_id quando o modelo pede; marcas kineo_* fora).
    submit: async (row) => {
      const e = entradaDaLinha(row)
      if (!e) return { ok: false as const, ambiguous: false, error: 'queued request could not be read' }
      return comEndUserDaFal(submitToFalOnce, row.user_id)(e.model, semMarcasDaCasa(e.input))
    },
    markSubmitted: async (id, requestId) => {
      const { data, error } = await admin.from(CLIPS_TABLE).update({ status: 'processing', fal_request_id: requestId, submitted_at: new Date().toISOString(), failure_reason: null })
        .eq('id', id).eq('status', 'pending').eq('failure_reason', FILA_ENVIANDO).select('id')
      if (error) console.error(`[clips/fila] markSubmitted failed clip=${id} request=${requestId}:`, error.message)
      return !error && (data ?? []).length > 0
    },
    release: (id) => io.apagarVaga(id),
    waitLimitMs: FILA_TETO_ESPERA_MS,
  }
}
/**
 * O estado da fila para a tela e para a porta: quantos na fila e se a vaga está ocupada. Com `clipId`, `naFrente` = quantos da fila estão ANTES
 * deste clipe (pela ordem real, criação e depois id: empate de milissegundo não some). Erro = null.
 */
export async function filaKlingEditEstado(admin: SupabaseClient, clipId?: string): Promise<{ naFila: number; naFrente: number; vagaOcupada: boolean } | null> {
  try {
    const { data, error } = await admin.from(CLIPS_TABLE).select('id').eq('model', KLING4_EDIT_MODEL).eq('status', 'pending').eq('failure_reason', FILA_MARCA)
      .order('created_at', { ascending: true }).order('id', { ascending: true }).limit(50)
    if (error) return null
    const ids = (data ?? []).map((r) => String((r as { id: unknown }).id))
    const i = clipId ? ids.indexOf(clipId) : -1
    const vaga = await filaIoFor(admin).lerVaga()
    return { naFila: ids.length, naFrente: i >= 0 ? i : ids.length, vagaOcupada: !!vaga && vaga.expiraEm > Date.now() }
  } catch {
    return null
  }
}
/** KINEO-RECREATE-FILA-REVISAO-1411 (item 9) — o pedido que, DEPOIS de entrar, ficou além do limite (vários passaram juntos pela porta) sai com estorno. */
export const tirarDaFila = (admin: SupabaseClient, clipId: string, motivo: string) => fecharClipeDaFila(admin, clipId, motivo, 'na_fila')
/** Pedidos do "seu vídeo" (Kling edit) ainda ABERTOS desta conta (na fila, saindo ou no fornecedor), do mais antigo ao mais novo. Erro = null. */
export async function seuVideoAbertosDaConta(admin: SupabaseClient, userId: string): Promise<string[] | null> {
  const { data, error } = await admin.from(CLIPS_TABLE).select('id').eq('user_id', userId).eq('model', KLING4_EDIT_MODEL).in('status', ['pending', 'processing'])
    .order('created_at', { ascending: true }).order('id', { ascending: true }).limit(20)
  return error ? null : (data ?? []).map((r) => String((r as { id: unknown }).id))
}

export function submitDepsFor(args: {
  admin: SupabaseClient
  userSupabase: SupabaseClient
  account: ClipAccount
}): ClipSubmitDeps {
  const { admin, userSupabase, account } = args
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    engineAccess: engineAccessFor(account),
    retiredClipRefusal, // KINEO-MOTORES-SAEM-0511
    findByKey: async (userId, key) => {
      const { data, error } = await admin.from(CLIPS_TABLE).select(COLUMNS).eq('user_id', userId).eq('idempotency_key', key).maybeSingle()
      if (error) throw new Error(`clip lookup failed: ${error.message}`)
      return data ? toRow(data as Record<string, unknown>) : null
    },
    countActive: async (userId) => {
      const since = new Date(Date.now() - CLIP_EXPIRE_MS).toISOString()
      const { count, error } = await admin
        .from(CLIPS_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['pending', 'processing'])
        .gt('created_at', since)
      if (error) throw new Error(`clip count failed: ${error.message}`)
      return count ?? 0
    },
    verifyImage: async (url) => { await downloadPublicAnimateImage(url) },
    moderate: async ({ text, imageUrls }) => {
      const verdict = await moderateContent({ surface: 'clip', stage: 'input', userId: account.userId, text, imageUrls })
      if (verdict.ok) { const tema = await moderateTopic({ entry: 'clips', userId: account.userId, text }); if (!tema.ok) return { ok: false, reason: 'blocked', status: tema.status, message: tema.message } } // KINEO-MODERACAO-1410
      if (verdict.ok) return { ok: true }
      return { ok: false, reason: verdict.reason, status: moderationRefusalStatus(verdict.reason), message: moderationRefusalMessage(verdict.reason) }
    },
    getBalance: async () => account.balance,
    newId: () => randomUUID(),
    insertPending: async (row) => {
      const { error } = await admin.from(CLIPS_TABLE).insert({
        id: row.id,
        user_id: row.user_id,
        idempotency_key: row.idempotency_key,
        fingerprint: row.fingerprint,
        billing_reference: row.billing_reference,
        engine: row.engine,
        mode: row.mode,
        model: row.model,
        seconds: row.seconds,
        aspect: row.aspect,
        prompt: row.prompt,
        image_url: row.image_url,
        credits: row.credits,
        fal_usd: row.fal_usd,
        status: 'pending',
      })
      if (!error) return { ok: true }
      return { ok: false, conflict: error.code === '23505', error: error.message }
    },
    debit: async (ref, credits) => {
      const { data, error } = await debitVideoCredits(userSupabase, { userId: account.userId, renderId: ref, cost: credits })
      if (error || data === null) return { ok: false, error: error?.message ?? 'no balance returned' }
      return { ok: true, balance: data }
    },
    refund: (ref) => refundRenderCredits(ref),
    queue: clipQueueDepsFor(admin), // KINEO-RECREATE-FILA-KLING-EDIT-1411 — só age no modelo com fila
    submit: submitToFalOnce,
    markSubmitted: async (id, requestId) => {
      const { data, error } = await admin
        .from(CLIPS_TABLE)
        .update({ status: 'processing', fal_request_id: requestId, submitted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'pending')
        .select('id')
      if (error) console.error(`[clips] markSubmitted failed clip=${id} request=${requestId}:`, error.message)
      return !error && (data ?? []).length > 0
    },
    markFailed: (id, reason, refunded) => markFailed(admin, id, reason, refunded),
    event: clipEvent(account.userId),
    now: () => Date.now(),
    // KINEO-CLIPE-AUTO-3110 — só troca linha ainda 'pending' (antes do markSubmitted): o cron e o status leem o motor/modelo novos.
    switchEngine: async (id, patch) => {
      const { data, error } = await admin.from(CLIPS_TABLE).update(patch).eq('id', id).eq('status', 'pending').select('id')
      if (error) console.error(`[clips] switchEngine failed clip=${id}:`, error.message)
      return !error && (data ?? []).length > 0
    },
  }
}

/**
 * Rede de estorno do clipe (roda no cron horário /api/cron/refund-sweep). Sem ela, fechar a aba deixaria o crédito
 * preso: o estorno ao vivo só acontece quando alguém pergunta o status. `clips-%` sai da varredura genérica
 * (sweepStuckRenderDebits) porque clipe entregue NÃO tem linha em `videos` — a genérica estornaria todo sucesso.
 * Aqui a decisão é do fornecedor e do prazo, com a mesma função da rota de status (settleClip): entregue → persiste e
 * fecha `done`; falha terminal / envio perdido / prazo vencido → estorna e fecha `failed`; no meio do caminho → espera.
 */
export async function sweepClipJobs(): Promise<{ scanned: number; delivered: number; refunded: number; creditsReturned: number; waiting: number }> {
  const result = { scanned: 0, delivered: 0, refunded: 0, creditsReturned: 0, waiting: 0 }
  // Sem chave da fal o poll vira `unknown` (nunca `failed`), então nada é estornado por env faltando — só o prazo decide.
  const admin = clipsAdmin()
  if (!admin) return result
  const olderThan = new Date(Date.now() - CLIP_PENDING_STALE_MS).toISOString()
  const { data, error } = await admin
    .from(CLIPS_TABLE)
    .select(COLUMNS)
    .in('status', ['pending', 'processing'])
    .lt('created_at', olderThan)
    .order('created_at', { ascending: true })
    .limit(50)
  if (error) {
    console.error('[clips/sweep] lookup failed:', error.message)
    return result
  }
  for (const raw of data ?? []) {
    const row = toRow(raw as Record<string, unknown>)
    result.scanned += 1
    const after = await settleClip(settleDepsFor(admin, row.user_id), row)
    if (after.status === 'done') result.delivered += 1
    else if (after.status === 'failed') {
      result.refunded += 1
      result.creditsReturned += after.credits_refunded
    } else result.waiting += 1
  }
  // KINEO-RECREATE-ABRE-1011 — Recreate reprovado pela trava cujo estorno não chegou a rodar (processo morreu entre o
  // failed e o estorno): estorna UMA vez pela billing_reference (RPC idempotente) e grava o valor onde ainda é 0.
  // KINEO-RECREATE-AUDITORIA-DA-TRAVA-1411 — a limpeza das 48 h, nesta varredura que já existe: só a pasta da auditoria, só <uuid>.mp4 vencido.
  try {
    const pasta = await admin.storage.from(QUARANTINE_BUCKET).list(AUDITORIA_PASTA, { limit: 200, sortBy: { column: 'created_at', order: 'asc' } })
    const fora = pasta.error ? [] : vencidos(pasta.data ?? [], Date.now())
    if (pasta.error) console.error('[clips/sweep] recreate audit list failed:', pasta.error.message)
    if (fora.length) { const rm = await admin.storage.from(QUARANTINE_BUCKET).remove(fora); if (rm.error) console.error('[clips/sweep] recreate audit cleanup failed:', rm.error.message) }
  } catch (e) {
    console.error('[clips/sweep] recreate audit cleanup error:', e instanceof Error ? e.message : String(e))
  }
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const orphans = await admin.from(CLIPS_TABLE).select(COLUMNS).eq('status', 'failed').eq('credits_refunded', 0).in('failure_reason', [...SWAP_REFUND_SWEEP_REASONS, ...FILA_MOTIVOS_DE_ESTORNO]).gte('created_at', since).order('created_at', { ascending: true }).limit(50)
  if (orphans.error) console.error('[clips/sweep] recreate refund lookup failed:', orphans.error.message)
  else {
    const swept = await sweepSwapRefunds((orphans.data ?? []).map((raw) => toRow(raw as Record<string, unknown>)), { refund: (ref) => refundRenderCredits(ref), setRefunded: (id, refunded) => recreateSwapDepsFor(admin, '').setRefunded(id, refunded) }, (motivo) => isRecreateNotSwappedReason(motivo) || (typeof motivo === 'string' && FILA_MOTIVOS_DE_ESTORNO.includes(motivo)) /* KINEO-RECREATE-FILA-REVISAO-1411 (item 1) — queue_stuck, queue_timeout e queue_full também fecham failed antes do estorno */)
    result.refunded += swept.refunded
    result.creditsReturned += swept.creditsReturned
  }
  return result
}
// KINEO-FILME-RAPIDO-1710 — o clipe parado com a aba fechada (auditoria 17/10, G8/V7): 4 de 5 clipes grátis de texto
// esperaram de 33 a 126 min, porque só o poll da tela ou a varredura horária (sweepClipJobs, só 10 min+) os olhava. [KINEO-FILME-RAPIDO-1710]
// O cron de 1 min (/api/cron/rapido-ads-clipes) passa aqui: TODO clipe em andamento com 20 s+ ganha a MESMA settleClip da [KINEO-FILME-RAPIDO-1710]
// tela (transições condicionais: tela, cron e varredura juntos nunca entregam nem estornam duas vezes). Os prazos de [KINEO-FILME-RAPIDO-1710]
// estorno continuam os da settleClip (10 min sem envio, 6 h no fornecedor). KINEO-FILME-RAPIDO-1710
export async function advanceActiveClipJobs(opts: { minAgeMs?: number; limit?: number; deadlineMs?: number } = {}): Promise<{ scanned: number; delivered: number; failed: number; waiting: number }> { // KINEO-FILME-RAPIDO-1710
  const result = { scanned: 0, delivered: 0, failed: 0, waiting: 0 } // KINEO-FILME-RAPIDO-1710
  const admin = clipsAdmin() // KINEO-FILME-RAPIDO-1710
  if (!admin) return result // KINEO-FILME-RAPIDO-1710
  const youngest = new Date(Date.now() - (opts.minAgeMs ?? 20_000)).toISOString() // KINEO-FILME-RAPIDO-1710
  const oldest = new Date(Date.now() - CLIP_EXPIRE_MS - 60 * 60 * 1000).toISOString() // KINEO-FILME-RAPIDO-1710 — os vencidos também fecham (estorno), como na varredura
  const { data, error } = await admin.from(CLIPS_TABLE).select(COLUMNS).in('status', ['pending', 'processing']).lte('created_at', youngest).gte('created_at', oldest).order('created_at', { ascending: true }).limit(opts.limit ?? 30) // KINEO-FILME-RAPIDO-1710
  if (error) { console.error('[clips/rapido] lookup failed:', error.message); return result } // KINEO-FILME-RAPIDO-1710
  // KINEO-RECREATE-TRAVA-1011 — o Recreate pronto pode segurar a passada ~40 s (checagem "não trocou"): vai por ÚLTIMO e no
  // máximo 1 por passada; os outros esperam a próxima passada (a aba do cliente também liquida). Ordem dos demais: a de sempre.
  const rows = (data ?? []).map((raw) => toRow(raw as Record<string, unknown>)) // KINEO-RECREATE-TRAVA-1011
  const ordered = [...rows.filter((r) => !usaTravaNaoTrocou(r.model)), ...rows.filter((r) => usaTravaNaoTrocou(r.model)).slice(0, 1)] // KINEO-RECREATE-TRAVA-1011 · KINEO-RECREATE-SEU-VIDEO-1311 — era: r.model !== / === RECREATE_MODEL
  result.waiting += rows.length - ordered.length // KINEO-RECREATE-TRAVA-1011
  // KINEO-RECREATE-FILA-KLING-EDIT-1411 — quem está NA FILA também passa aqui (barato: sem consulta ao fornecedor nem checagem), depois do que
  // está em andamento e do mais antigo para o mais novo: fechou um, o próximo sai na mesma passada, mesmo com a tela do cliente fechada.
  // KINEO-RECREATE-FILA-REVISAO-1411 (item 2) — o Kling edit EM ANDAMENTO sempre entra na passada (é no máximo um: a vaga): antes, um Recreate de catálogo mais
  // antigo ocupava a única vez do grupo, o Kling já entregue pela fal não era liquidado e, aos 8 min, virava "preso".
  const klingEmAndamento = rows.filter((r) => r.model === KLING4_EDIT_MODEL && r.status === 'processing' && !ordered.includes(r))
  ordered.push(...klingEmAndamento)
  result.waiting -= klingEmAndamento.length
  const daFila = rows.filter((r) => naFila(r) && !ordered.includes(r))
  ordered.push(...daFila)
  result.waiting -= daFila.length
  for (const row of ordered) { // KINEO-FILME-RAPIDO-1710 · KINEO-RECREATE-TRAVA-1011 — era: for (const raw of data ?? [])
    if (opts.deadlineMs && Date.now() > opts.deadlineMs) break // KINEO-FILME-RAPIDO-1710
    result.scanned += 1 // KINEO-FILME-RAPIDO-1710
    const after = await settleClip(settleDepsFor(admin, row.user_id), row).catch(() => row) // KINEO-FILME-RAPIDO-1710
    if (after.status === 'done') result.delivered += 1 // KINEO-FILME-RAPIDO-1710
    else if (after.status === 'failed') result.failed += 1 // KINEO-FILME-RAPIDO-1710
    else result.waiting += 1 // KINEO-FILME-RAPIDO-1710
  } // KINEO-FILME-RAPIDO-1710
  return result // KINEO-FILME-RAPIDO-1710
} // KINEO-FILME-RAPIDO-1710
