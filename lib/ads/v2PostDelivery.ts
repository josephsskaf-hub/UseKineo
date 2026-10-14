// KINEO-ADS-POS-ENTREGA-1510 — o que a agência faz DEPOIS da entrega do anúncio v2 (fundador 15/10: "perfeito para agência usar
// sozinha, hoje"). Três ferramentas, todas sobre os MESMOS clipes já gerados (nada volta à fal, nada de IA):
//   1. EDITAR: frases de tela, cartão final (título/chamada/contato/preço/logo — o PNG redesenhado no navegador), música (da
//      biblioteca ou nenhuma) e a ORDEM dos planos (tirar um plano é opcional). Aplicar = montar de novo no Creatomate.
//   2. APROVAÇÃO do cliente: link privado e assinado (lib/ads/v2ApprovalToken.ts), página sem login com o vídeo e o nome da marca.
//   3. FORMATOS: 9:16 + 4:5 + 1:1 de uma vez — a mesma montagem em outro quadro; plano que só existe em 9:16 (efeito, ator) vai com
//      fundo suave (adsV2FillVideoElements em lib/ads/adV2Montage.ts) em vez de corte duro.
// Cada aplicação vira uma VERSÃO nova (tabela ads_v2_versions, migrations_pending/20261015120000_ads_v2_pos_entrega.sql) e uma
// linha nova em `videos`: as anteriores ficam na biblioteca.
//
// A NARRAÇÃO FICA TRAVADA: trocar o texto falado exige voz nova (MiniMax Speech-2.8 HD, que passa pela fal) — e este caminho
// promete "zero fal". Com ator, a voz é o próprio vídeo falado (boca e voz casadas). A tela diz isso (copy.edit.voiceLocked).
//
// PREÇO: o Creatomate cobra a montagem (lib/ads/v2Tiers.ts ADS_V2_FIXED_USD_PARTS.creatomate = US$ 0,13 por 15 s em 1080×1920,
// fórmula de pixels × segundos de lib/creatomateQuota.ts). Proposta: 1 crédito por montagem. Sai GRÁTIS (ADS_V2_EDIT_CREDITS = 0)
// por decisão de preço que é do fundador; nenhuma linha daqui debita — o caminho de dinheiro do anúncio fica byte a byte o mesmo.
//
// LIB PURA: só funções puras de libs puras (montagem, música, listas de planos, variações, ator).
import type { AdV2MontageInput, AdV2MontageShot } from '@/lib/ads/adV2Montage'
import { ADS_V2_MUSIC_STARTS, adsV2LibraryTrack, adsV2MusicTrimStart, adsV2SwapLibraryTrack } from '@/lib/ads/v2Music'
import { ADS_V2_CARD_SECONDS, isAdsV2Format, type AdsV2Format } from '@/lib/ads/v2ShotLists'

export const ADS_V2_POS_ENTREGA_MARK = 'KINEO-ADS-POS-ENTREGA-1510'

// ── preço e limites ──────────────────────────────────────────────────────────────────────────────────────────────────
/** Créditos por montagem de edição/formato COBRADOS hoje: zero (o preço é decisão do fundador). */
export const ADS_V2_EDIT_CREDITS = 0
/** Proposta (não cobrada): 1 crédito por montagem — cobre os ~US$ 0,13-0,26 do Creatomate com margem. */
export const ADS_V2_EDIT_CREDITS_PROPOSED = 1
/** Custo de referência do Creatomate por 15 s em 1080×1920 (ESPELHO de ADS_V2_FIXED_USD_PARTS.creatomate). */
export const ADS_V2_EDIT_USD_PER_15S = 0.13
/** Versões por anúncio (cada uma é um render do Creatomate): teto contra clique repetido. */
export const ADS_V2_EDIT_MAX_VERSIONS = 20
/** Montagens em andamento ao mesmo tempo por conta. */
export const ADS_V2_EDIT_MAX_RENDERING = 3
/** POST ao Creatomate sem id depois disto = ambíguo vencido → falha (nunca reenvio às cegas). */
export const ADS_V2_EDIT_AMBIGUOUS_MS = 15 * 60 * 1000
/** Render que não termina depois disto = falha. */
export const ADS_V2_EDIT_RENDER_MAX_MS = 45 * 60 * 1000
/** Frases de tela: ESPELHO de ADS_V2_EDIT_OVERLAY_MAX_CHARS (lib/ads/v2Contract.ts) e do máximo da montagem (3). */
export const ADS_V2_EDIT_OVERLAY_MAX_CHARS = 42
export const ADS_V2_EDIT_MAX_OVERLAYS = 3
/** O cartão pode crescer para caber a voz quando um plano sai (ESPELHO de ADS_V2_CARD_MAX_SECONDS em lib/ads/v2Advance.ts). */
export const ADS_V2_EDIT_CARD_MAX_SECONDS = ADS_V2_CARD_SECONDS + 4
/** Voz começa em 0,3 s e o cartão espera 0,2 s depois dela (ESPELHO de lib/ads/v2Advance.ts prepareAndSubmit). */
export const ADS_V2_EDIT_VOICE_START = 0.3
export const ADS_V2_EDIT_VOICE_TAIL = 0.2
/** Base pública da biblioteca de música (ESPELHO de SUPABASE_MUSIC_BASE em lib/pixabayMusic.ts). */
export const ADS_V2_EDIT_MUSIC_BASE = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/music'
/** As faixas que a pessoa pode escolher: só as medidas e aprovadas para anúncio (lib/ads/v2Music.ts). */
export const ADS_V2_EDIT_TRACKS: readonly string[] = Object.keys(ADS_V2_MUSIC_STARTS).sort()
/** O 2º prefixo de cobrança do videos.render_id da versão ('adsv2%' fica fora da varredura genérica de estorno). */
export const ADS_V2_EDIT_RENDER_PREFIX = 'adsv2edit-'

/** US$ estimado de UMA montagem no Creatomate (pixels × segundos, a régua de lib/creatomateQuota.ts). */
export function adsV2EditUsd(seconds: number, width = 1080, height = 1920): number {
  const s = Number(seconds)
  if (!Number.isFinite(s) || s <= 0) return 0
  const px = (width * height) / (1080 * 1920)
  return Math.round(ADS_V2_EDIT_USD_PER_15S * (s / 15) * px * 1000) / 1000
}

// ── o pedido da edição ──────────────────────────────────────────────────────────────────────────────────────────────
export type AdsV2EditMusic = 'keep' | 'none' | string
export interface AdsV2EditSpec {
  /** Textos das frases de tela, na ordem do plano; null = os de agora. Frase vazia sai. */
  overlays: string[] | null
  /** Cartão final novo (PNG desenhado no navegador e enviado pelo /api/footage); null = o de agora. */
  cardFootageId: string | null
  music: AdsV2EditMusic
  /** Ordem dos planos (os idx do plano); null = a de agora. Faltar um idx = plano tirado. */
  order: number[] | null
}
export interface AdsV2EditBody {
  orderId: string
  /** Versão de partida (as edições dela entram por baixo das novas); null = o anúncio entregue. */
  baseVersionId: string | null
  spec: AdsV2EditSpec
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isEditUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v)
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null)
const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

export type AdsV2EditParsed<T> = { ok: true; value: T } | { ok: false; error: string }

/** Pedido de edição vindo da tela. Pura: só formato e limites (o dono, o plano e o arquivo do cartão são conferidos na rota). */
export function sanitizeAdsV2EditBody(raw: unknown): AdsV2EditParsed<AdsV2EditBody> {
  const b = obj(raw)
  if (!b) return { ok: false, error: 'bad_body' }
  if (!isEditUuid(b.order_id)) return { ok: false, error: 'bad_order_id' }
  let baseVersionId: string | null = null
  if (b.base_version_id !== undefined && b.base_version_id !== null) {
    if (!isEditUuid(b.base_version_id)) return { ok: false, error: 'bad_base_version_id' }
    baseVersionId = (b.base_version_id as string).toLowerCase()
  }
  let overlays: string[] | null = null
  if (b.overlays !== undefined && b.overlays !== null) {
    if (!Array.isArray(b.overlays) || b.overlays.length > ADS_V2_EDIT_MAX_OVERLAYS) return { ok: false, error: 'bad_overlays' }
    overlays = []
    for (const t of b.overlays) {
      if (typeof t !== 'string') return { ok: false, error: 'bad_overlays' }
      const c = clean(t)
      if (c.length > ADS_V2_EDIT_OVERLAY_MAX_CHARS) return { ok: false, error: 'overlay_too_long' }
      overlays.push(c)
    }
  }
  let cardFootageId: string | null = null
  if (b.card_footage_id !== undefined && b.card_footage_id !== null) {
    if (!isEditUuid(b.card_footage_id)) return { ok: false, error: 'bad_card_footage_id' }
    cardFootageId = (b.card_footage_id as string).toLowerCase()
  }
  let music: AdsV2EditMusic = 'keep'
  if (b.music !== undefined && b.music !== null) {
    if (b.music !== 'keep' && b.music !== 'none' && !(typeof b.music === 'string' && ADS_V2_EDIT_TRACKS.includes(b.music))) return { ok: false, error: 'bad_music' }
    music = b.music as AdsV2EditMusic
  }
  let order: number[] | null = null
  if (b.order !== undefined && b.order !== null) {
    if (!Array.isArray(b.order) || b.order.length === 0 || b.order.length > 32) return { ok: false, error: 'bad_order' }
    const seen = new Set<number>()
    for (const i of b.order) {
      if (!Number.isInteger(i) || (i as number) < 0 || (i as number) > 31 || seen.has(i as number)) return { ok: false, error: 'bad_order' }
      seen.add(i as number)
    }
    order = [...(b.order as number[])]
  }
  return { ok: true, value: { orderId: (b.order_id as string).toLowerCase(), baseVersionId, spec: { overlays, cardFootageId, music, order } } }
}

/** Pedido dos formatos: o anúncio (e a versão de partida, opcional). */
export function sanitizeAdsV2FormatsBody(raw: unknown): AdsV2EditParsed<{ orderId: string; baseVersionId: string | null }> {
  const b = obj(raw)
  if (!b || !isEditUuid(b.order_id)) return { ok: false, error: 'bad_order_id' }
  if (b.base_version_id !== undefined && b.base_version_id !== null && !isEditUuid(b.base_version_id)) return { ok: false, error: 'bad_base_version_id' }
  return { ok: true, value: { orderId: (b.order_id as string).toLowerCase(), baseVersionId: isEditUuid(b.base_version_id) ? (b.base_version_id as string).toLowerCase() : null } }
}

// ── a montagem de partida (o que foi entregue), sem banco ───────────────────────────────────────────────────────────────
export interface AdsV2EditClip {
  /** idx do plano. */
  idx: number
  shot: AdV2MontageShot
  /** O clipe só existe em 9:16 (plano do estilo/efeito): noutro quadro vai com fundo suave, nunca corte duro. */
  nineOnly: boolean
}
export interface AdsV2EditBase {
  /** O formato em que os clipes foram GERADOS (o do plano). */
  format: AdsV2Format
  clips: AdsV2EditClip[]
  overlays: { text: string; start: number; end: number }[]
  cardUrl: string
  musicUrl: string | null
  voiceUrl: string | null
  voiceSeconds: number | null
  tint: string | null
  overlayPlacement: 'lower_third' | null
  /** Ator pronto: a trilha base (a voz é dele); `insertIdx` = idx dos planos na ordem preferida dos inserts. */
  presenter: { url: string; measuredSeconds: number; insertIdx: number[] } | null
}

/** O que a edição já resolveu (o cartão vira URL do banco na rota; a música vira URL aqui). */
export interface AdsV2EditResolved {
  overlays: string[] | null
  cardUrl: string | null
  music: AdsV2EditMusic
  order: number[] | null
}

const r3 = (n: number): number => Math.round(n * 1000) / 1000

/** URL da faixa escolhida: a da biblioteca no MESMO bucket da música de agora (ou na base pública). 'keep' = a de agora. */
export function adsV2EditMusicUrl(current: string | null, choice: AdsV2EditMusic): string | null {
  if (choice === 'keep') return current
  if (choice === 'none') return null
  if (!ADS_V2_EDIT_TRACKS.includes(choice)) throw new Error('ads_v2_edit_bad_music')
  if (current && adsV2LibraryTrack(current) !== null) return adsV2SwapLibraryTrack(current, choice)
  return `${ADS_V2_EDIT_MUSIC_BASE}/${choice}`
}

/** Junta duas edições (a da versão de partida por baixo, a nova por cima): o que a nova não tocou, fica o da base. */
export function mergeAdsV2Edits(under: Partial<AdsV2EditResolved> | null | undefined, over: AdsV2EditResolved): AdsV2EditResolved {
  const u = under ?? {}
  return {
    overlays: over.overlays ?? (Array.isArray(u.overlays) ? u.overlays : null),
    cardUrl: over.cardUrl ?? (typeof u.cardUrl === 'string' ? u.cardUrl : null),
    music: over.music !== 'keep' ? over.music : typeof u.music === 'string' ? u.music : 'keep',
    order: over.order ?? (Array.isArray(u.order) ? u.order : null),
  }
}

/** Uma edição que não muda nada (a tela não deixa aplicar; a rota recusa). */
export function adsV2EditIsEmpty(e: AdsV2EditResolved): boolean {
  return e.overlays === null && e.cardUrl === null && e.music === 'keep' && e.order === null
}

/**
 * A entrada da montagem da VERSÃO: os MESMOS clipes (mesma URL, mesmo trecho), na ordem pedida, com as frases, o cartão e a
 * música novos, no quadro pedido. Lança 'ads_v2_edit_*' quando a edição não cabe (plano desconhecido, nenhum plano, frases em
 * número diferente do plano, voz que deixaria de caber). Sem ator, o cartão cresce para a voz caber (a regra da entrega).
 */
export function adsV2EditMontageInput(
  base: AdsV2EditBase,
  edit: AdsV2EditResolved,
  frame: { width: number; height: number; fontFamily: string; format: AdsV2Format },
): AdV2MontageInput {
  if (!isAdsV2Format(frame.format)) throw new Error('ads_v2_edit_bad_format')
  const byIdx = new Map(base.clips.map((c) => [c.idx, c] as const))
  const order = edit.order ?? base.clips.map((c) => c.idx)
  if (order.length === 0) throw new Error('ads_v2_edit_no_shots')
  const seen = new Set<number>()
  const picked: AdsV2EditClip[] = []
  for (const idx of order) {
    const c = byIdx.get(idx)
    if (!c || seen.has(idx)) throw new Error(`ads_v2_edit_unknown_shot:${idx}`)
    seen.add(idx)
    picked.push(c)
  }
  const other = frame.format !== base.format
  const shots: AdV2MontageShot[] = picked.map((c) => (other && c.nineOnly ? { ...c.shot, fill: true } : { ...c.shot }))

  // Frases: o texto novo nas MESMAS janelas do plano; se planos saíram, as janelas encolhem na mesma proporção.
  const oldSeconds = base.clips.reduce((s, c) => s + c.shot.cutSeconds, 0)
  const newSeconds = picked.reduce((s, c) => s + c.shot.cutSeconds, 0)
  if (edit.overlays !== null && edit.overlays.length !== base.overlays.length) throw new Error('ads_v2_edit_overlays_mismatch')
  const k = oldSeconds > 0 ? newSeconds / oldSeconds : 1
  const overlays = base.overlays
    .map((o, i) => ({ text: (edit.overlays ? edit.overlays[i] : o.text).trim(), start: r3(o.start * k), end: r3(Math.min(o.end * k, newSeconds)) }))
    .filter((o) => o.text && o.end > o.start)

  const musicUrl = adsV2EditMusicUrl(base.musicUrl, edit.music)
  const cardUrl = edit.cardUrl ?? base.cardUrl
  const common = {
    width: frame.width,
    height: frame.height,
    shots,
    overlays,
    fontFamily: frame.fontFamily,
    cardUrl,
    musicUrl,
    musicTrimStart: adsV2MusicTrimStart(musicUrl),
    tint: base.tint,
  }
  if (base.presenter) {
    const pos = new Map(picked.map((c, i) => [c.idx, i] as const))
    const insertOrder = base.presenter.insertIdx.map((idx) => pos.get(idx)).filter((i): i is number => typeof i === 'number')
    return {
      ...common,
      cardSeconds: ADS_V2_CARD_SECONDS,
      voiceUrl: null,
      voiceSeconds: null,
      presenter: { url: base.presenter.url, measuredSeconds: base.presenter.measuredSeconds, insertOrder, ...(frame.format !== '9:16' ? { fill: true } : {}) },
    }
  }
  let cardSeconds = ADS_V2_CARD_SECONDS
  if (base.voiceUrl && base.voiceSeconds) {
    const voiceEnd = ADS_V2_EDIT_VOICE_START + base.voiceSeconds + ADS_V2_EDIT_VOICE_TAIL
    cardSeconds = Math.max(cardSeconds, r3(voiceEnd - newSeconds))
    if (cardSeconds > ADS_V2_EDIT_CARD_MAX_SECONDS) throw new Error('ads_v2_edit_voice_too_long')
  }
  return {
    ...common,
    cardSeconds,
    voiceUrl: base.voiceUrl,
    voiceSeconds: base.voiceSeconds,
    ...(base.overlayPlacement ? { overlayPlacement: base.overlayPlacement } : {}),
  }
}

/** A mesma entrada SEM ator (a regra da entrega: montagem com ator que não passa = o anúncio de sempre). */
export function adsV2EditWithoutPresenter(base: AdsV2EditBase): AdsV2EditBase {
  return { ...base, presenter: null }
}

/** As URLs dos clipes de uma entrada de montagem (a prova "mesmos clipes"). */
export function adsV2MontageClipUrls(input: Pick<AdV2MontageInput, 'shots' | 'presenter'>): string[] {
  const urls = (input.shots ?? []).map((s) => s.url.trim())
  if (input.presenter) urls.push(input.presenter.url.trim())
  return urls
}

// ── formatos ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const ADS_V2_EXPORT_FORMATS: readonly AdsV2Format[] = ['9:16', '4:5', '1:1']
/** Os formatos que faltam para fechar 9:16 + 4:5 + 1:1 (o da versão de partida já existe). */
export function adsV2MissingFormats(have: AdsV2Format): AdsV2Format[] {
  return ADS_V2_EXPORT_FORMATS.filter((f) => f !== have)
}

// ── aprovação ────────────────────────────────────────────────────────────────────────────────────────────────────────
export type AdsV2ApprovalStatus = 'pending' | 'approved' | 'changes_requested' | 'revoked'
export const ADS_V2_APPROVAL_BRAND_MAX = 60
export const ADS_V2_APPROVAL_COMMENT_MAX = 1000
/** Validade do link (dias). */
export const ADS_V2_APPROVAL_DAYS = 30

/** O nome que a página mostra: texto simples, sem e-mail, telefone nem link (a página não vaza dado de ninguém). */
export function sanitizeApprovalBrand(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = clean(raw).replace(/[<>]/g, '')
  if (!t || t.length > ADS_V2_APPROVAL_BRAND_MAX) return null
  if (/@|https?:\/\/|www\./i.test(t) || /\d{6,}/.test(t.replace(/[\s().+-]/g, ''))) return null
  return t
}

export type AdsV2ApprovalDecision = 'approve' | 'changes'
export function sanitizeApprovalDecision(raw: unknown): AdsV2EditParsed<{ token: string; decision: AdsV2ApprovalDecision; comment: string | null }> {
  const b = obj(raw)
  if (!b || typeof b.token !== 'string' || b.token.length > 200) return { ok: false, error: 'bad_token' }
  if (b.decision !== 'approve' && b.decision !== 'changes') return { ok: false, error: 'bad_decision' }
  let comment: string | null = null
  if (b.comment !== undefined && b.comment !== null) {
    if (typeof b.comment !== 'string') return { ok: false, error: 'bad_comment' }
    const c = b.comment.replace(/\r\n/g, '\n').trim()
    if (c.length > ADS_V2_APPROVAL_COMMENT_MAX) return { ok: false, error: 'comment_too_long' }
    comment = c || null
  }
  if (b.decision === 'changes' && !comment) return { ok: false, error: 'comment_required' }
  return { ok: true, value: { token: b.token.trim(), decision: b.decision, comment } }
}

/**
 * A vista PÚBLICA da aprovação: só o vídeo, o nome da marca, o estado e a língua. Nada de id de conta, e-mail, pedido, brief,
 * preço ou créditos — a lista de chaves é FECHADA (o guardião confere chave por chave).
 */
export const ADS_V2_APPROVAL_PUBLIC_KEYS = ['brand', 'video_url', 'status', 'lang', 'decided'] as const
export interface AdsV2ApprovalPublic {
  brand: string
  video_url: string
  status: AdsV2ApprovalStatus
  lang: string
  decided: boolean
}
export function adsV2ApprovalPublicView(row: { brand_name: string; share_video_url: string; status: string; lang: string | null }): AdsV2ApprovalPublic {
  const status = (['pending', 'approved', 'changes_requested', 'revoked'] as const).find((s) => s === row.status) ?? 'pending'
  return { brand: row.brand_name, video_url: row.share_video_url, status, lang: row.lang || 'en', decided: status === 'approved' || status === 'changes_requested' }
}

/** O caminho do vídeo dentro do bucket `renders` (para copiar para um nome que não carrega o id da conta). null = fora do bucket. */
export function adsV2RendersPath(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const mark = '/storage/v1/object/public/renders/'
  const i = url.indexOf(mark)
  if (i < 0 || !/^https:\/\//i.test(url)) return null
  const rest = url.slice(i + mark.length).split(/[?#]/)[0]
  if (!rest || rest.split('/').some((s) => !s || s === '.' || s === '..') || /%2e|%2f|\\/i.test(rest)) return null
  return rest
}

/** A mensagem de um erro lançado (sem `instanceof Error`, que falha entre contextos). */
export function posErr(e: unknown): string {
  return e && typeof (e as { message?: unknown }).message === 'string' ? (e as { message: string }).message : String(e)
}
