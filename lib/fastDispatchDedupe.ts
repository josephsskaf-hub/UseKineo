// ═══ PEDIDO-REPETIDO-2026-09-24 — autorização nominal do fundador ("vai no pedido repetido", 24/09) ═══
// Caso blackmanager284 (24/09 03:32Z): a rede da pessoa derrubava a resposta do /api/generate-video-fast em ~16 s,
// enquanto o servidor terminava em ~34 s. O navegador repetiu o MESMO pedido 6 vezes; cada repetição planejou tudo de
// novo e encomendou clipes de IA de novo (18 clipes, ~US$ 2,34) e deixou 6 filmes prontos para montar.
// Agora cada pedido tem uma impressão digital (pessoa + texto + duração + língua + formato + modo). Um pedido IGUAL que
// chega enquanto o gêmeo ainda está sendo feito (ou acabou de terminar) ESPERA o resultado do gêmeo e devolve o mesmo
// filme (mesmo generationId → o /api/compose monta e cobra uma vez só). Falha aberta: sem banco, sem gêmeo ou sem
// resultado a tempo, a rota segue exatamente como antes.
import { createHash } from 'crypto'

export const FAST_DEDUPE_WINDOW_MS = 3 * 60 * 1000
export const FAST_DEDUPE_WAIT_MS = 60 * 1000
export const FAST_DEDUPE_STEP_MS = 2000
/** Um gêmeo mais velho que isto já passou do tempo máximo da função (maxDuration 120 s): não há o que esperar. */
export const FAST_TWIN_MAX_AGE_MS = 120 * 1000
export const FAST_DEDUPE_EVENT = 'fast_dispatch_deduplicated'
export const FAST_DEDUPE_VERSION = 'pedido_repetido_v1_20260924'

export interface FastRequestIdentity {
  userId: string
  prompt: string
  duration: unknown
  language: unknown
  aspect: unknown
  scriptMode: unknown
}

/** Impressão digital do pedido (sem texto em claro — só o hash vai para o banco). */
export function fastRequestFingerprint(r: FastRequestIdentity): string {
  const partes = [r.userId, r.prompt, String(r.duration ?? ''), String(r.language ?? ''), String(r.aspect ?? ''), String(r.scriptMode ?? '')]
  return createHash('sha256').update(partes.join('\u0001')).digest('hex').slice(0, 32)
}

type EventRow = { session_id?: string | null; created_at?: string; metadata?: Record<string, unknown> | null }

// `db` é o cliente Supabase de serviço (a tabela events é fechada ao público); tipado solto para o guardião simular.
async function eventos(db: unknown, userId: string, name: string, fingerprint: string | null, sinceIso: string, path?: string): Promise<EventRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (db as any).from('events').select('session_id, created_at, metadata')
    .eq('user_id', userId).eq('name', name)
  if (fingerprint) q = q.eq('metadata->>fingerprint', fingerprint)
  if (path) q = q.eq('path', path)
  q = q.gte('created_at', sinceIso).order('created_at', { ascending: true }).limit(5)
  const { data, error } = await q
  if (error || !Array.isArray(data)) return []
  return data as EventRow[]
}

/** Há um pedido gêmeo recebido na janela? Devolve quando ele chegou (ISO), ou null. */
export async function findRecentTwin(db: unknown, userId: string, fingerprint: string, nowMs: number = Date.now()): Promise<string | null> {
  try {
    const rows = await eventos(db, userId, 'generation_dispatch_received', fingerprint, new Date(nowMs - FAST_DEDUPE_WINDOW_MS).toISOString())
    return rows[0]?.created_at ?? null
  } catch { return null }
}

/** Espera o gêmeo deixar o filme pronto para montar; devolve a linha (com generationId em session_id) ou null. */
export async function waitForTwinResult(
  db: unknown, userId: string, fingerprint: string, sinceIso: string,
  opts: { waitMs?: number; stepMs?: number; sleep?: (ms: number) => Promise<void>; now?: () => number } = {},
): Promise<EventRow | null> {
  const waitMs = opts.waitMs ?? FAST_DEDUPE_WAIT_MS
  const stepMs = opts.stepMs ?? FAST_DEDUPE_STEP_MS
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const now = opts.now ?? (() => Date.now())
  // Espera até o que vier primeiro: o prazo próprio ou o fim da vida possível do gêmeo.
  const nascimento = Date.parse(sinceIso)
  const fim = Number.isFinite(nascimento) ? Math.min(now() + waitMs, nascimento + FAST_TWIN_MAX_AGE_MS) : now() + waitMs
  for (;;) {
    try {
      const rows = await eventos(db, userId, 'fast_compose_recoverable', fingerprint, sinceIso)
      const pronto = rows.find((r) => r.session_id && r.metadata && typeof r.metadata === 'object' && (r.metadata as { payload?: unknown }).payload)
      if (pronto) return pronto
      // O servidor RECUSOU o gêmeo (narração curta, clipes demais…): não vai haver filme para devolver — não esperar à
      // toa; a rota segue normal e devolve a mesma recusa honesta na hora.
      const recusa = await eventos(db, userId, 'generation_stage_error', null, sinceIso, '/api/generate-video-fast')
      if (recusa.length > 0) return null
      // A recusa do portão de narração (narração curta / clipes demais) grava narration_guard_blocked, não
      // generation_stage_error (achado do levantamento de 25/09): sem esta linha, o pedido repetido esperava até 60 s.
      const portao = await eventos(db, userId, 'narration_guard_blocked', null, sinceIso, '/api/generate-video-fast')
      if (portao.length > 0) return null
    } catch { /* falha aberta */ }
    if (now() >= fim) return null
    await sleep(stepMs)
  }
}

/** A resposta que o cliente espera, reconstruída do resultado do gêmeo (mesmo filme, mesmo generationId). */
export function responseFromTwin(row: EventRow, prompt: string): Record<string, unknown> | null {
  const md = (row.metadata ?? {}) as Record<string, unknown>
  const p = (md.payload ?? {}) as Record<string, unknown>
  const clips = Array.isArray(p.clip_urls) ? p.clip_urls : null
  if (!row.session_id || !clips || clips.length === 0 || typeof p.voiceover_script !== 'string') return null
  return {
    mode: 'fast',
    generationId: row.session_id,
    prompt,
    duration: p.duration,
    scenes: Array.isArray(md.scenes) ? md.scenes : [],
    scene_captions: Array.isArray(p.scene_captions) ? p.scene_captions : [],
    voiceover_script: p.voiceover_script,
    clip_urls: clips,
    verbatim: md.verbatim === true,
    speed: typeof md.speed === 'number' ? md.speed : (typeof p.speed === 'number' ? p.speed : null),
    ai_scene_index: typeof md.ai_scene_index === 'number' ? md.ai_scene_index : null,
    deduplicated: true,
  }
}
