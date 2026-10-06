// KINEO-CLIPE-MARCA-2026-10-06 — O CLIPE GRÁTIS VIRA ANÚNCIO (fundador, "1 sim"): todo clipe de quem NÃO paga sai com a
// marca "usekineo.com" queimada no MP4, e todo clipe ganha o botão "Post it" com a legenda pronta. Cada post vira anúncio.
// Pago nunca recebe marca.
//
// MÓDULO PURO (nenhum import): interruptor, regra de quem recebe, desenho da marca, RenderScript do Creatomate, leitura das
// dimensões do MP4 e a ORDEM da entrega com as dependências injetadas. O guardião (scripts/test-clipe-marca-2026-10-06.mjs)
// EXECUTA tudo isto. A fiação real mora em lib/clips/freeClipWatermarkServer.ts (Creatomate, bucket, banco — carregado só
// com o interruptor ligado) e lib/clips/clipServer.ts (o interruptor no persist e o limpo para quem assinou depois).
//
// POR QUE CREATOMATE (e não a fal):
//   · é o caminho da casa para queimar marca: a marca dos filmes ("usekineo.com/free", lib/compose.ts) é um elemento de
//     texto do Creatomate, em produção desde #384 — mesma fonte, mesmas cores, mesma chave, mesmo submit/poll;
//   · fal-ai/ffmpeg-api/compose (US$ 0,0002/s) não documenta como sobrepõe imagem (posição, escala, alfa) e não tem texto —
//     um palpite errado entregaria TODO clipe grátis quebrado, sem como provar antes de gastar;
//   · custo: créditos = largura × altura × fps × segundos / 1e8 (lib/renderProfile.ts). Clipe de 5 s em 720×1280 a 24 fps
//     = 1,1 crédito; em 1080×1920 = 2,5. O ciclo de 30 mil créditos estava em ~14 mil em 06/10.
//
// QUEM RECEBE (clipOwnerPays): espelho de isPayingProfile (lib/reverseTrial.ts — has_paid OU plano diferente de ''/'free')
// com UMA diferença deliberada: plano *_trial SEM trilho de pagamento (Stripe/PayPal/Paddle) não paga. Esse plano é dado à
// mão — cortesia e pacote de parceiro (lib/courtesy.ts: creator_trial/studio_trial) — e quem recebe cortesia é justamente
// quem mais posta; a marca ali é o anúncio que a cortesia existe para gerar. O *_trial que vem da Stripe (trial com cartão)
// nasce com has_paid=true e assinatura (webhook) — esse paga e nunca recebe marca. Plano desconhecido conta como PAGANTE e
// perfil que não deu para ler NÃO recebe marca: o erro caro é marcar o filme de quem pagou, não deixar de marcar um grátis.
// A lista FORCE_WATERMARK_EMAILS dos filmes NÃO vale aqui: os clipes da conta do fundador são vitrine (49 dos 51 da história).
//
// O ORIGINAL LIMPO fica guardado num caminho que só o servidor sabe montar (HMAC, clipServer.clipCleanToken): quem assinar
// depois passa a receber o limpo no GET /api/clips (publicClipsForViewer). O banco é legível pelo dono (RLS de SELECT), então
// o caminho limpo nunca é escrito na linha enquanto a marca está sendo feita.
//
// FALHA NUNCA SEGURA O CLIPE: qualquer erro depois de a cópia limpa estar no bucket (leitura do MP4, Creatomate recusou,
// render falhou, passou de FREE_CLIP_MARK_MAX_MS) entrega o LIMPO e grava clip_watermark_failed. Antes da cópia limpa existir,
// o erro faz o mesmo que o caminho sem marca: espera o próximo poll.
//
// ESTADO SEM COLUNA NOVA: enquanto a linha está `processing`, `video_url` (que o público só vê com status `done`, ver
// toPublicClip) guarda a marca de andamento `kineo-brand:v1:<fase>:<motivo>:<início>:<render>`. A primeira gravação é
// compare-and-set (`video_url IS NULL`): duas abas e o cron juntos nunca pedem dois renders do mesmo clipe. markDone
// sobrescreve com a URL final.

/** ⚠ INTERRUPTOR DO FUNDADOR. false = nenhuma marca, para ninguém: o clipe sai byte a byte como antes. */
export const FREE_CLIP_WATERMARK_LIVE = false

/** O texto queimado no canto inferior direito. */
export const FREE_CLIP_WATERMARK_TEXT = 'usekineo.com'

/** A legenda pronta do botão "Post it" (vai para a folha de compartilhar e para a área de transferência). */
export const CLIP_SHARE_CAPTION = 'Made with Kineo · usekineo.com #madewithkineo'

/** Eventos de servidor da marca (writeServerEvent). started carrega o custo estimado do render no Creatomate. */
export const FREE_CLIP_WATERMARK_EVENTS = {
  started: 'clip_watermark_started',
  applied: 'clip_watermark_applied',
  failed: 'clip_watermark_failed',
} as const
export type FreeClipWatermarkEventName = (typeof FREE_CLIP_WATERMARK_EVENTS)[keyof typeof FREE_CLIP_WATERMARK_EVENTS]

/** Eventos do navegador do botão "Post it" (trackClosedEvent, o mesmo mecanismo da telemetria da tela de clipes). */
export const CLIP_POST_EVENTS = {
  clicked: 'clip_post_clicked',
  shared: 'clip_post_shared',
  fallback: 'clip_post_fallback',
} as const

/** Frases da tela (lib/ui/refinementCopy.json, 16 línguas). */
export const CLIP_POST_COPY = {
  button: 'Post it',
  preparing: 'Preparing…',
  again: 'Tap again to post',
  shared: 'Caption copied — paste it when you post.',
  downloaded: 'Video downloaded. Caption copied — paste it when you post.',
  manual: 'Copy this caption when you post:',
} as const

/** Uma marca 'starting' mais velha que isto é de um ator que morreu no meio: outro pode assumir. */
export const FREE_CLIP_MARK_STARTING_STALE_MS = 60_000
/** Teto da marca depois de pedida: passou disto, entrega o limpo. */
export const FREE_CLIP_MARK_MAX_MS = 3 * 60_000
/** Clipe a menos disto do prazo de estorno (CLIP_EXPIRE_MS) não começa marca: a marca nunca pode virar estorno. */
export const FREE_CLIP_MARK_EXPIRE_GUARD_MS = 30 * 60_000

// ─── Quem recebe ─────────────────────────────────────────────────────────────
export interface ClipOwnerProfile {
  plan?: unknown
  has_paid?: unknown
  stripe_subscription_id?: unknown
  paypal_subscription_id?: unknown
  paddle_subscription_id?: unknown
}

/** As colunas de profiles que a regra lê (uma constante, nunca a lista redigitada em cada leitura). */
export const CLIP_OWNER_PROFILE_COLUMNS = 'plan,has_paid,stripe_subscription_id,paypal_subscription_id,paddle_subscription_id'

const filled = (v: unknown) => typeof v === 'string' && v.trim() !== ''
const planOf = (row: ClipOwnerProfile) => (typeof row.plan === 'string' ? row.plan.trim().toLowerCase() : '')

/** A conta paga? Espelho de isPayingProfile + plano *_trial sem trilho de pagamento = cortesia/parceiro = não paga. */
export function clipOwnerPays(row: ClipOwnerProfile): boolean {
  if (row.has_paid === true) return true
  const plan = planOf(row)
  if (plan === '' || plan === 'free') return false
  if (plan.endsWith('_trial')) {
    return filled(row.stripe_subscription_id) || filled(row.paypal_subscription_id) || filled(row.paddle_subscription_id)
  }
  return true
}

export type FreeClipMarkReason = 'free' | 'courtesy'
export type FreeClipWatermarkDecision =
  | { brand: true; reason: FreeClipMarkReason }
  | { brand: false; reason: 'switch_off' | 'paying' | 'profile_unreadable' }

export function freeClipWatermarkDecision(args: { live: boolean; profile: ClipOwnerProfile | null | undefined }): FreeClipWatermarkDecision {
  if (!args.live) return { brand: false, reason: 'switch_off' }
  if (!args.profile) return { brand: false, reason: 'profile_unreadable' }
  if (clipOwnerPays(args.profile)) return { brand: false, reason: 'paying' }
  return { brand: true, reason: planOf(args.profile).endsWith('_trial') ? 'courtesy' : 'free' }
}

// ─── Caminhos no bucket ──────────────────────────────────────────────────────
export const BRANDED_CLIP_SUFFIX = '.kineo.mp4'

/** O arquivo COM marca: é a URL que a pessoa recebe. */
export function brandedClipPath(userId: string, clipId: string): string {
  return `clips/${userId}/${clipId}${BRANDED_CLIP_SUFFIX}`
}

/** O original LIMPO: o token é um HMAC que só o servidor monta (o dono não deduz o caminho a partir da URL com marca). */
export function cleanClipSourcePath(userId: string, clipId: string, token: string): string {
  return `clips/${userId}/${clipId}.src-${token}.mp4`
}

/** A URL é de um clipe entregue COM marca? */
export function isBrandedClipUrl(url: unknown): boolean {
  return typeof url === 'string' && /\/clips\/[^/?#]+\/[0-9a-f-]{36}\.kineo\.mp4(?:[?#].*)?$/i.test(url)
}

// ─── Marca de andamento (video_url enquanto `processing`) ────────────────────
const MARKER_PREFIX = 'kineo-brand:v1:'

export interface BrandMarker {
  phase: 'starting' | 'rendering'
  reason: FreeClipMarkReason
  startedAt: number
  renderId: string | null
}

export function brandMarker(m: BrandMarker): string {
  return `${MARKER_PREFIX}${m.phase}:${m.reason}:${Math.round(m.startedAt)}:${m.renderId ?? '-'}`
}

export function parseBrandMarker(value: unknown): BrandMarker | null {
  if (typeof value !== 'string' || !value.startsWith(MARKER_PREFIX)) return null
  const m = /^(starting|rendering):(free|courtesy):(\d{10,16}):([A-Za-z0-9-]{8,80}|-)$/.exec(value.slice(MARKER_PREFIX.length))
  if (!m) return null
  const renderId = m[4] === '-' ? null : m[4]
  if (m[1] === 'rendering' && !renderId) return null
  return { phase: m[1] as BrandMarker['phase'], reason: m[2] as FreeClipMarkReason, startedAt: Number(m[3]), renderId }
}

// ─── O desenho da marca ──────────────────────────────────────────────────────
// Canto inferior direito, fora do assunto. Tudo proporcional ao lado CURTO do quadro, então 9:16, 16:9 e 1:1 recebem a
// mesma marca no mesmo tamanho aparente. Plaqueta escura translúcida: a lição do #100 dos filmes ("1px de contorno sem
// plaqueta some sobre imagem clara") vale aqui. Fonte, peso e cores = a marca dos filmes, um degrau mais discreta.
export const FREE_CLIP_WATERMARK_STYLE = {
  fontFamily: 'Montserrat',
  fontWeight: '700',
  /** tamanho da fonte = 3,4% do lado curto (720 → 24 px; 1080 → 37 px). */
  fontShortSideRatio: 0.034,
  /** distância da plaqueta até a borda = 3,5% do lado curto. */
  marginShortSideRatio: 0.035,
  /** folgas da plaqueta em % da fonte (Creatomate: background_*_padding é % do tamanho da fonte). */
  padXPercent: 30,
  padYPercent: 18,
  radiusPercent: 25,
  /** line_height padrão do Creatomate (115%): a caixa do texto tem 1,15 × fonte de altura. */
  lineHeightPercent: 115,
  fill: 'rgba(255,255,255,0.92)',
  stroke: 'rgba(0,0,0,0.35)',
  strokeWidth: 1,
  plate: 'rgba(13,13,20,0.45)',
} as const

export interface ClipVideoInfo {
  width: number
  height: number
  /** null = o MP4 não disse (fragmentado); o render usa 24. */
  fps: number | null
  durationSeconds: number | null
}

export interface FreeClipWatermarkLayout {
  fontSize: number
  margin: number
  padX: number
  padY: number
  radius: number
  /** canto inferior direito da CAIXA DO TEXTO (âncora 100%/100%); a plaqueta passa padX/padY para fora dele. */
  x: number
  y: number
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function freeClipWatermarkLayout(info: Pick<ClipVideoInfo, 'width' | 'height'>): FreeClipWatermarkLayout {
  const S = FREE_CLIP_WATERMARK_STYLE
  const short = Math.min(info.width, info.height)
  const fontSize = Math.max(14, Math.round(short * S.fontShortSideRatio))
  const margin = Math.max(8, Math.round(short * S.marginShortSideRatio))
  const padX = round1((fontSize * S.padXPercent) / 100)
  const padY = round1((fontSize * S.padYPercent) / 100)
  return {
    fontSize,
    margin,
    padX,
    padY,
    radius: round1((fontSize * S.radiusPercent) / 100),
    x: round1(info.width - margin - padX),
    y: round1(info.height - margin - padY),
  }
}

/** fps do render: o do arquivo, inteiro, entre 12 e 60; sem leitura, 24 (o fps dos motores de clipe). */
export function creatomateFrameRate(fps: number | null): number {
  if (typeof fps !== 'number' || !Number.isFinite(fps) || fps <= 0) return 24
  return Math.min(60, Math.max(12, Math.round(fps)))
}

/** Créditos do Creatomate pela fórmula do fornecedor (lib/renderProfile.ts), 2 casas. Sem duração: null. */
export function creatomateCreditsEstimate(info: ClipVideoInfo): number | null {
  if (typeof info.durationSeconds !== 'number' || !(info.durationSeconds > 0)) return null
  return Math.round(((info.width * info.height * creatomateFrameRate(info.fps) * info.durationSeconds) / 1e8) * 100) / 100
}

/**
 * O RenderScript: o clipe limpo no tamanho e fps do próprio arquivo (nada recortado, nada reescalado) + o texto da marca.
 * Sem `duration`: o Creatomate mede o vídeo, e o texto (sem duração) vai até o fim. Mesmo dialeto da marca dos filmes.
 */
export function buildFreeClipWatermarkSource(cleanUrl: string, info: ClipVideoInfo): Record<string, unknown> {
  const S = FREE_CLIP_WATERMARK_STYLE
  const L = freeClipWatermarkLayout(info)
  return {
    output_format: 'mp4',
    width: info.width,
    height: info.height,
    frame_rate: creatomateFrameRate(info.fps),
    elements: [
      { type: 'video', track: 1, time: 0, source: cleanUrl },
      {
        type: 'text',
        track: 2,
        time: 0,
        text: FREE_CLIP_WATERMARK_TEXT,
        x: L.x,
        y: L.y,
        x_anchor: '100%',
        y_anchor: '100%',
        font_family: S.fontFamily,
        font_weight: S.fontWeight,
        font_size: L.fontSize,
        fill_color: S.fill,
        stroke_color: S.stroke,
        stroke_width: S.strokeWidth,
        background_color: S.plate,
        background_x_padding: `${S.padXPercent}%`,
        background_y_padding: `${S.padYPercent}%`,
        background_border_radius: `${S.radiusPercent}%`,
      },
    ],
  }
}

// ─── Leitura do MP4 (sem ffprobe) ────────────────────────────────────────────
// Mesma técnica de lib/mp4Duration.ts: caminha nas caixas do moov. Da trilha de VÍDEO (hdlr 'vide'): largura/altura do
// tkhd, timescale do mdhd e as amostras do stts (fps). Arquivo girado (matriz ≠ identidade) devolve null: sem certeza do
// quadro, não há marca (o clipe sai limpo).
export function probeClipVideo(bytes: ArrayBuffer | Uint8Array): ClipVideoInfo | null {
  try {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
    const kind = (o: number) => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3])
    type Box = { type: string; start: number; end: number }
    const children = (start: number, end: number): Box[] => {
      const out: Box[] = []
      let o = start
      while (o + 8 <= end) {
        let size = dv.getUint32(o)
        let header = 8
        if (size === 1) {
          if (o + 16 > end) break
          size = dv.getUint32(o + 8) * 4294967296 + dv.getUint32(o + 12)
          header = 16
        } else if (size === 0) size = end - o
        if (size < header || o + size > end) break
        out.push({ type: kind(o + 4), start: o + header, end: o + size })
        o += size
      }
      return out
    }
    const find = (boxes: Box[], type: string) => boxes.find((b) => b.type === type) ?? null
    const moov = find(children(0, u8.byteLength), 'moov')
    if (!moov) return null
    let movieDuration: number | null = null
    const mvhd = find(children(moov.start, moov.end), 'mvhd')
    if (mvhd) {
      const v1 = u8[mvhd.start] === 1
      const ts = dv.getUint32(mvhd.start + (v1 ? 20 : 12))
      const dur = v1 ? dv.getUint32(mvhd.start + 24) * 4294967296 + dv.getUint32(mvhd.start + 28) : dv.getUint32(mvhd.start + 16)
      if (ts > 0 && dur > 0) movieDuration = dur / ts
    }
    for (const trak of children(moov.start, moov.end).filter((b) => b.type === 'trak')) {
      const parts = children(trak.start, trak.end)
      const mdia = find(parts, 'mdia')
      const tkhd = find(parts, 'tkhd')
      if (!mdia || !tkhd) continue
      const media = children(mdia.start, mdia.end)
      const hdlr = find(media, 'hdlr')
      if (!hdlr || kind(hdlr.start + 8) !== 'vide') continue
      const v1 = u8[tkhd.start] === 1
      const matrixAt = tkhd.start + 4 + (v1 ? 32 : 20) + 16
      const a = dv.getInt32(matrixAt), b = dv.getInt32(matrixAt + 4), c = dv.getInt32(matrixAt + 12), d = dv.getInt32(matrixAt + 16)
      if (b !== 0 || c !== 0 || a <= 0 || d <= 0) return null
      const width = Math.round(dv.getUint32(matrixAt + 36) / 65536)
      const height = Math.round(dv.getUint32(matrixAt + 40) / 65536)
      if (!(width >= 64 && height >= 64 && width <= 4096 && height <= 4096)) return null
      let fps: number | null = null
      let duration = movieDuration
      const mdhd = find(media, 'mdhd')
      const timescale = mdhd ? dv.getUint32(mdhd.start + (u8[mdhd.start] === 1 ? 20 : 12)) : 0
      const minf = find(media, 'minf')
      const stbl = minf ? find(children(minf.start, minf.end), 'stbl') : null
      const stts = stbl ? find(children(stbl.start, stbl.end), 'stts') : null
      if (stts && timescale > 0) {
        const entries = dv.getUint32(stts.start + 4)
        let samples = 0
        let ticks = 0
        for (let i = 0; i < entries && stts.start + 8 + i * 8 + 8 <= stts.end; i++) {
          const count = dv.getUint32(stts.start + 8 + i * 8)
          samples += count
          ticks += count * dv.getUint32(stts.start + 12 + i * 8)
        }
        if (samples > 0 && ticks > 0) {
          fps = Math.round(((samples * timescale) / ticks) * 1000) / 1000
          duration = ticks / timescale
        }
      }
      return { width, height, fps, durationSeconds: duration !== null ? Math.round(duration * 1000) / 1000 : null }
    }
    return null
  } catch {
    return null
  }
}

// ─── A entrega com marca, com as dependências injetadas ──────────────────────
/** "Ainda não": a linha fica `processing` e o próximo poll (aba ou cron) continua. Nunca vira estorno: ver os tetos acima. */
export class FreeClipNotReady extends Error {
  readonly why: string
  constructor(why: string) {
    super(`free clip mark not ready: ${why}`)
    this.name = 'FreeClipNotReady'
    this.why = why
  }
}

export type BrandClaim = 'claimed' | 'taken' | 'error'
export type BrandRenderState = { status: 'succeeded'; url: string } | { status: 'failed'; error: string | null } | { status: 'pending' }

export interface FreeClipBrandDeps {
  now(): number
  /** compare-and-set de `video_url` NULL → marca, só com a linha `processing`. */
  claim(marker: string): Promise<BrandClaim>
  /** compare-and-set de uma marca para a próxima (null = solta a trava). */
  swap(from: string, to: string | null): Promise<boolean>
  /** bytes do MP4 do fornecedor (lança se falhar). */
  download(url: string): Promise<Uint8Array>
  /** sobe o original LIMPO no caminho do HMAC e devolve a URL pública dele (lança se falhar). */
  uploadClean(bytes: Uint8Array): Promise<string>
  /** a URL pública do original limpo (determinística, sem rede). */
  cleanUrl(): string
  /** pede o render ao Creatomate e devolve o id (lança se recusar). */
  submit(source: Record<string, unknown>): Promise<string>
  poll(renderId: string): Promise<BrandRenderState>
  /** copia o MP4 com marca para o nosso bucket (a URL do Creatomate expira) e devolve a URL pública NOSSA. */
  copyBranded(url: string): Promise<string>
  event(name: FreeClipWatermarkEventName, metadata: Record<string, unknown>): Promise<void>
}

export interface FreeClipBrandRow {
  id: string
  engine: string
  seconds: number
  video_url: string | null
}

const shortError = (error: unknown) => (error instanceof Error ? error.message : error == null ? null : String(error))?.slice(0, 160) ?? null

/**
 * A URL que a linha recebe ao virar `done` — com marca, ou o LIMPO quando qualquer passo depois da cópia limpa falha.
 * null = este clipe segue o caminho de sempre, sem marca (sem decisão, perto do prazo, ou a trava não pôde ser gravada).
 * Lança FreeClipNotReady enquanto o render anda; lança o erro de rede se nem a cópia limpa pôde ser feita.
 */
export async function brandFreeClip(
  deps: FreeClipBrandDeps,
  args: { row: FreeClipBrandRow; providerUrl: string; reason: FreeClipMarkReason | null; ageMs: number; expireMs: number },
): Promise<string | null> {
  const { row } = args
  const base = { clip_id: row.id, engine: row.engine, seconds: row.seconds }
  const marker = parseBrandMarker(row.video_url)

  const deliverClean = async (clean: string, stage: string, error: unknown, extra: Record<string, unknown>): Promise<string> => {
    await deps.event(FREE_CLIP_WATERMARK_EVENTS.failed, { ...base, ...extra, stage, error: shortError(error), delivered: 'clean' })
    return clean
  }
  const ofMarker = (m: BrandMarker) => ({ reason: m.reason, render_id: m.renderId, elapsed_ms: Math.max(0, deps.now() - m.startedAt) })

  const start = async (starting: string, reason: FreeClipMarkReason, startedAt: number): Promise<string> => {
    let bytes: Uint8Array
    let clean: string
    try {
      bytes = await deps.download(args.providerUrl)
      clean = await deps.uploadClean(bytes)
    } catch (error) {
      // Sem a cópia limpa no NOSSO bucket não há o que entregar: solta a trava e o próximo poll tenta de novo — a mesma
      // regra do caminho sem marca (persist que falha espera o próximo poll).
      await deps.swap(starting, null).catch(() => false)
      throw error
    }
    const info = probeClipVideo(bytes)
    if (!info) return deliverClean(clean, 'probe', null, { reason })
    let renderId: string
    try {
      renderId = await deps.submit(buildFreeClipWatermarkSource(clean, info))
    } catch (error) {
      return deliverClean(clean, 'submit', error, { reason })
    }
    await deps.event(FREE_CLIP_WATERMARK_EVENTS.started, {
      ...base,
      reason,
      render_id: renderId,
      width: info.width,
      height: info.height,
      fps: info.fps,
      duration_s: info.durationSeconds,
      creatomate_credits_est: creatomateCreditsEstimate(info),
    })
    const rendering = brandMarker({ phase: 'rendering', reason, startedAt, renderId })
    if (!(await deps.swap(starting, rendering))) throw new FreeClipNotReady('marker_lost')
    throw new FreeClipNotReady('rendering')
  }

  if (!marker) {
    // Linha `processing` com outra coisa em video_url não é desta peça: caminho de sempre (o markDone sobrescreve).
    if (row.video_url) return null
    if (!args.reason) return null
    if (Number.isFinite(args.ageMs) && args.ageMs > args.expireMs - FREE_CLIP_MARK_EXPIRE_GUARD_MS) return null
    const startedAt = deps.now()
    const starting = brandMarker({ phase: 'starting', reason: args.reason, startedAt, renderId: null })
    const claim = await deps.claim(starting)
    if (claim === 'error') {
      await deps.event(FREE_CLIP_WATERMARK_EVENTS.failed, { ...base, stage: 'claim', error: null, delivered: 'clean' })
      return null
    }
    if (claim === 'taken') throw new FreeClipNotReady('claimed_elsewhere')
    return start(starting, args.reason, startedAt)
  }

  if (marker.phase === 'starting') {
    if (deps.now() - marker.startedAt < FREE_CLIP_MARK_STARTING_STALE_MS) throw new FreeClipNotReady('starting_elsewhere')
    // O ator que marcou 'starting' morreu no meio (lambda encerrada): assume, com compare-and-set na marca velha.
    const startedAt = deps.now()
    const starting = brandMarker({ phase: 'starting', reason: marker.reason, startedAt, renderId: null })
    if (!(await deps.swap(row.video_url as string, starting))) throw new FreeClipNotReady('takeover_lost')
    return start(starting, marker.reason, startedAt)
  }

  // 'rendering': pergunta ao Creatomate; pronto → copia para o bucket; falhou ou passou do teto → limpo.
  const clean = deps.cleanUrl()
  const elapsed = deps.now() - marker.startedAt
  let state: BrandRenderState | null = null
  try {
    state = await deps.poll(marker.renderId as string)
  } catch {
    state = null
  }
  if (state?.status === 'succeeded') {
    try {
      const url = await deps.copyBranded(state.url)
      await deps.event(FREE_CLIP_WATERMARK_EVENTS.applied, { ...base, reason: marker.reason, render_id: marker.renderId, elapsed_ms: Math.max(0, elapsed) })
      return url
    } catch (error) {
      if (elapsed < FREE_CLIP_MARK_MAX_MS) throw new FreeClipNotReady('copy_retry')
      return deliverClean(clean, 'copy', error, ofMarker(marker))
    }
  }
  if (state?.status === 'failed') return deliverClean(clean, 'render', state.error, ofMarker(marker))
  if (elapsed >= FREE_CLIP_MARK_MAX_MS) return deliverClean(clean, 'timeout', null, ofMarker(marker))
  throw new FreeClipNotReady('rendering')
}
