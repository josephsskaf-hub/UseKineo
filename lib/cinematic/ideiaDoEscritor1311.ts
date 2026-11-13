// KINEO-APARENCIA-DO-PEDIDO-1311 (peça 1) — só servidor (node:crypto). O porquê e o alcance: lib/cinematic/aparenciaDoPedido1311.ts.
import { createHash } from 'node:crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// ── 1. a ideia do roteiro que o nosso escritor escreveu ─────────────────────────────────────────────────────────────────────────────
/** O hash do roteiro como a tela o despacha (sgData.script.trim()): quebras de linha normalizadas, sem espaço nas pontas. */
export function shaDoRoteiro(texto: unknown): string {
  return createHash('sha256').update(String(texto ?? '').replace(/\r\n?/g, '\n').trim()).digest('hex')
}
export const IDEIA_DO_ROTEIRO_JANELA_MS = 6 * 3600_000
export const IDEIA_DO_ROTEIRO_MAX_CHARS = 600 // o mesmo corte da tela (GenerateClient: ideia.slice(0, 600))
export interface ScriptWrittenEvento { created_at: string; metadata: { original_idea?: unknown; script_sha256?: unknown } | null }
/**
 * A ideia de onde o roteiro despachado nasceu, ou null. Só o par exato: o `script_written` mais recente da janela com o mesmo hash.
 * Roteiro editado, condensado, colado ou escrito por outro lugar não casa — e fica como estava.
 */
export function ideiaDoRoteiroEscrito(roteiroDespachado: unknown, eventos: ReadonlyArray<ScriptWrittenEvento>, agoraMs: number): string | null {
  const texto = String(roteiroDespachado ?? '').trim()
  if (!texto) return null
  const alvo = shaDoRoteiro(texto)
  const casado = [...(eventos ?? [])]
    .filter((e) => {
      const t = Date.parse(String(e?.created_at ?? ''))
      return Number.isFinite(t) && t <= agoraMs + 60_000 && t >= agoraMs - IDEIA_DO_ROTEIRO_JANELA_MS && e.metadata?.script_sha256 === alvo
        && typeof e.metadata?.original_idea === 'string' && !!(e.metadata.original_idea as string).trim()
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]
  return casado ? String(casado.metadata!.original_idea).slice(0, IDEIA_DO_ROTEIRO_MAX_CHARS) : null
}


// ── a leitura no banco (rota do filme): os script_written da pessoa na janela; nunca lança, falha = null (nada muda) ───────────────────
type LeitorDeEventos = { from: (t: string) => any }
export async function recuperarIdeiaDoEscritor(userId: string, roteiroDespachado: unknown, opts: { admin?: LeitorDeEventos | null; agoraMs?: number } = {}): Promise<string | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const db: LeitorDeEventos | null = opts.admin ?? (url && key ? (createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as LeitorDeEventos) : null)
    if (!db || !userId || typeof roteiroDespachado !== 'string' || !roteiroDespachado.trim()) return null
    const agora = opts.agoraMs ?? Date.now()
    const { data, error } = await db.from('events').select('created_at, metadata').eq('user_id', userId).eq('name', 'script_written')
      .gte('created_at', new Date(agora - IDEIA_DO_ROTEIRO_JANELA_MS).toISOString()).order('created_at', { ascending: false }).limit(20)
    if (error || !Array.isArray(data)) return null
    return ideiaDoRoteiroEscrito(roteiroDespachado, data as ScriptWrittenEvento[], agora)
  } catch {
    return null
  }
}
