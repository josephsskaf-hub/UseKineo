// ═══ KINEO-BF-ONDAS-PUBLICO-2411 — o PÚBLICO das ondas da Black Friday (os 4 crons de /api/admin/send-black-friday-2026) ═══════════
//
// DECISÃO DO DONO (16/11, opção B da Black Friday, registrada no quadro): "a carta dos 4 crons vai só para quem baixou filme ou teve
// nota 8+ em 60 dias e donos de canal presenteados, não para a base toda; respeitar quem recebeu e-mail nos últimos 7 dias."
//
// O QUE ESTE MÓDULO DECIDE (puro: sem env, sem banco, sem rede; a rota lê o banco e entrega os fatos):
//   (a) baixou filme em 60 dias  → evento `video_downloaded` (gravado pelo cliente depois do download que terminou), sem robô
//       (metadata.is_bot) e sem clipe (metadata.product 'clip' ou surface 'clips': clipe não é filme);
//   (b) nota ≥ 8 em 60 dias      → linha de film_review_notes_com_motor (nota do revisor, `quando` na janela) cujo `link` é o
//       video_url ou o final_video_url de um vídeo da conta (a ponte de motor_do_link_da_nota; o motor vem nulo);
//   (c) dono de canal presenteado → NÃO CONSTRUÍDO: não há marca legível por SELECT (os presentes de 17/11 saíram da conta do
//       fundador; gift_film_sent nunca foi criado). Fica de fora até existir uma marca; ninguém entra por (c).
//   7 dias                       → último e-mail NOSSO de marketing ou de ciclo de vida nas últimas 168 h (a mesma janela da carta
//       da base, BF_BASE_2311_SUPPRESSION_HOURS), pelas MESMAS fontes da supressão da casa (ledger email_send_log ok e não cedido,
//       trial_emails_log, colunas datadas de profiles, checkout_abandoned.recovery_sent_at, carimbos de e-mail em events) mais o
//       carimbo das próprias ondas (bf2026_emailed). NÃO conta o aviso transacional "seu vídeo está pronto" nem os avisos de entrega
//       (BF2026_TRANSACTIONAL_*). Carimbo de PULO (época Unix) não conta, como na supressão da casa.
// Sem interruptor: a decisão vale para todo envio da rota (cron e link do fundador).
import { BF_BASE_2311_SUPPRESSION_HOURS } from '../lifecycle/bfBase2311'
import { LIFECYCLE_EMAIL_EVENT_NAMES } from '../lifecycle/emailEvents'
import { isRealSendStamp } from '../lifecycle/skipStamp'
import { BF2026_EMAIL_SENT } from './blackFriday2026'

export const BF2026_AUDIENCE_MARK = 'KINEO-BF-ONDAS-PUBLICO-2411' as const
/** Janela do público: 60 dias. */
export const BF2026_AUDIENCE_DAYS = 60
export const BF2026_AUDIENCE_WINDOW_MS = BF2026_AUDIENCE_DAYS * 86_400_000
/** Nota mínima do revisor. */
export const BF2026_AUDIENCE_MIN_NOTE = 8
/** O evento do download que terminou (lib/videoDownload*, gravado com is_bot, product, surface). */
export const BF2026_DOWNLOAD_EVENT = 'video_downloaded' as const
/** 7 dias = a janela da carta da base (mesma constante, não um número novo). */
export const BF2026_RECENT_EMAIL_HOURS = BF_BASE_2311_SUPPRESSION_HOURS
export const BF2026_RECENT_EMAIL_WINDOW_MS = BF2026_RECENT_EMAIL_HOURS * 3_600_000

/** Avisos transacionais "seu vídeo está pronto" que vivem em events (compose/status, send-video-ready, finish-stranded-renders). */
export const BF2026_TRANSACTIONAL_EVENT_NAMES: readonly string[] = [
  'video_ready_email_sent', 'video_ready_nudge_sent', 'stranded_ready_sent', 'stranded_fast_ready_sent',
]
/** A coluna datada de profiles do "your video is ready" (cron/send-video-ready). */
export const BF2026_TRANSACTIONAL_PROFILE_COLUMNS: readonly string[] = ['video_ready_sent_at']
/** Kinds do ledger que são aviso de entrega, não venda (conta de convidado pronta; anúncio escolhido pronto). */
export const BF2026_TRANSACTIONAL_LEDGER_KINDS: readonly string[] = ['guest_account_ready', 'ads_escolha_ready']

/** Os carimbos de e-mail em events que contam para os 7 dias: os da casa, menos os transacionais, mais as próprias ondas. */
export const BF2026_RECENT_EMAIL_EVENT_NAMES: readonly string[] = [
  ...LIFECYCLE_EMAIL_EVENT_NAMES.filter((n) => !BF2026_TRANSACTIONAL_EVENT_NAMES.includes(n)),
  BF2026_EMAIL_SENT,
]

/** As colunas datadas de profiles que contam: as da supressão da casa, menos a do "vídeo pronto". */
export function bf2026RecentEmailProfileColumns(all: readonly string[]): string[] {
  return all.filter((c) => !BF2026_TRANSACTIONAL_PROFILE_COLUMNS.includes(c))
}

const ms = (raw: unknown): number => {
  if (raw === null || raw === undefined || raw === '') return 0
  const t = Date.parse(String(raw))
  return Number.isFinite(t) ? t : 0
}
/** Dentro da janela: depois de (nowMs − janela). Sem teto: um carimbo "no futuro" (relógio do banco adiantado, envio durante a
 *  corrida) CONTA — falha para o lado de suprimir, nunca de reenviar. */
const dentro = (whenMs: number, nowMs: number, windowMs: number): boolean =>
  Number.isFinite(nowMs) && whenMs > 0 && nowMs - whenMs < windowMs

/** (a) contas que baixaram FILME nos últimos 60 dias. */
export function bf2026FilmDownloaders(
  events: readonly { user_id: unknown; name?: unknown; created_at: unknown; metadata?: unknown }[],
  nowMs: number,
): Set<string> {
  const out = new Set<string>()
  for (const e of events) {
    if (e.name !== undefined && e.name !== BF2026_DOWNLOAD_EVENT) continue
    const id = String(e.user_id ?? '').trim()
    if (!id) continue
    const m = (e.metadata && typeof e.metadata === 'object' ? e.metadata : {}) as Record<string, unknown>
    if (m.is_bot === true || m.is_bot === 'true') continue
    if (m.product === 'clip' || m.surface === 'clips') continue
    if (!dentro(ms(e.created_at), nowMs, BF2026_AUDIENCE_WINDOW_MS)) continue
    out.add(id)
  }
  return out
}

/** (b) contas donas de um filme com nota do revisor ≥ 8 nos últimos 60 dias (ponte: link = video_url ou final_video_url). */
export function bf2026HighNoteOwners(
  notes: readonly { link: unknown; nota: unknown; quando: unknown }[],
  videos: readonly { user_id: unknown; video_url?: unknown; final_video_url?: unknown }[],
  nowMs: number,
): Set<string> {
  const links = new Set<string>()
  for (const n of notes) {
    const nota = typeof n.nota === 'number' ? n.nota : Number(n.nota)
    if (!Number.isFinite(nota) || nota < BF2026_AUDIENCE_MIN_NOTE) continue
    if (!dentro(ms(n.quando), nowMs, BF2026_AUDIENCE_WINDOW_MS)) continue
    if (typeof n.link === 'string' && n.link) links.add(n.link)
  }
  const out = new Set<string>()
  for (const v of videos) {
    const id = String(v.user_id ?? '').trim()
    if (!id) continue
    if ((typeof v.video_url === 'string' && links.has(v.video_url)) || (typeof v.final_video_url === 'string' && links.has(v.final_video_url))) out.add(id)
  }
  return out
}

/** As linhas lidas para os 7 dias (a rota já filtra pelas janelas; esta função refiltra e tira o transacional). */
export type Bf2026RecentEmailRows = {
  ledger: readonly { user_id: unknown; sent_at: unknown; kind?: unknown; ok?: unknown; yielded?: unknown }[]
  trial: readonly { user_id: unknown; sent_at: unknown }[]
  events: readonly { user_id: unknown; name: unknown; created_at: unknown }[]
  abandoned: readonly { user_id: unknown; recovery_sent_at: unknown }[]
  profiles: readonly Record<string, unknown>[]
  /** As colunas de profiles a olhar (bf2026RecentEmailProfileColumns da lista da casa). */
  profileColumns: readonly string[]
}

/** Último e-mail de marketing/ciclo de vida por conta (ms), só o que cabe nas 168 h antes de nowMs. */
export function bf2026LastMarketingEmail(rows: Bf2026RecentEmailRows, nowMs: number): Map<string, number> {
  const out = new Map<string, number>()
  const bump = (uid: unknown, raw: unknown) => {
    const id = String(uid ?? '').trim()
    const t = ms(raw)
    if (!id || !isRealSendStamp(t) || !dentro(t, nowMs, BF2026_RECENT_EMAIL_WINDOW_MS)) return
    if (t > (out.get(id) ?? 0)) out.set(id, t)
  }
  for (const r of rows.ledger) {
    if (r.ok === false || r.yielded === true) continue
    if (typeof r.kind === 'string' && BF2026_TRANSACTIONAL_LEDGER_KINDS.includes(r.kind)) continue
    bump(r.user_id, r.sent_at)
  }
  for (const r of rows.trial) bump(r.user_id, r.sent_at)
  for (const r of rows.events) {
    if (typeof r.name !== 'string' || !BF2026_RECENT_EMAIL_EVENT_NAMES.includes(r.name)) continue
    bump(r.user_id, r.created_at)
  }
  for (const r of rows.abandoned) bump(r.user_id, r.recovery_sent_at)
  const cols = rows.profileColumns.filter((c) => !BF2026_TRANSACTIONAL_PROFILE_COLUMNS.includes(c))
  for (const p of rows.profiles) for (const c of cols) bump(p.id, p[c])
  return out
}

export type Bf2026AudienceSkip = 'fora_do_publico' | 'email_7d'
export type Bf2026AudienceEntry = { download: boolean; nota8: boolean }

/** Os fatos de UMA conta para a regra do público. */
export type Bf2026AudienceFacts = {
  /** (a) baixou filme em 60 dias. */
  downloadedFilm: boolean
  /** (b) filme com nota ≥ 8 em 60 dias. */
  highNoteFilm: boolean
  /** último e-mail de marketing/ciclo de vida desta CAIXA (qualquer conta com o mesmo endereço), ms; 0/null = nenhum. */
  lastMarketingEmailMs: number | null
  nowMs: number
}

/** A regra pura: null = entra; senão o motivo. Ordem fixa: público antes dos 7 dias. */
export function bf2026AudienceSkipReason(f: Bf2026AudienceFacts): Bf2026AudienceSkip | null {
  if (!(f.downloadedFilm === true || f.highNoteFilm === true)) return 'fora_do_publico'
  const ultimo = typeof f.lastMarketingEmailMs === 'number' && Number.isFinite(f.lastMarketingEmailMs) ? f.lastMarketingEmailMs : 0
  if (ultimo > 0 && dentro(ultimo, f.nowMs, BF2026_RECENT_EMAIL_WINDOW_MS)) return 'email_7d'
  // Relógio inválido não libera ninguém: sem nowMs finito não dá para saber se passou 7 dias.
  if (!Number.isFinite(f.nowMs)) return 'email_7d'
  return null
}
