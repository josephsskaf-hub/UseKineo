// KINEO-APARENCIA-DO-PEDIDO-1311 (peça 1) — só servidor. O porquê e o alcance: lib/cinematic/aparenciaDoPedido1311.ts.
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const IDEIA_DO_ROTEIRO_JANELA_MS = 6 * 3600_000
export const IDEIA_DO_ROTEIRO_MAX_CHARS = 600 // o mesmo corte da tela (GenerateClient: ideia.slice(0, 600))
export const CABECA_GRAVADA_CHARS = 200 // o /api/generate-script grava script_head = script.slice(0, 200)
export const CABECA_MIN_CHARS = 40 // começo curto demais não prova nada
export interface ScriptWrittenEvento { created_at: string; metadata: { original_idea?: unknown; script_head?: unknown } | null }
const norma = (t: unknown) => String(t ?? '').replace(/\r\n?/g, '\n').trim()
/**
 * A ideia de onde o roteiro despachado nasceu, ou null. O `script_written` mais recente da janela cujo começo gravado é, inteiro, o começo
 * do roteiro despachado: roteiro de até 200 caracteres = o MESMO texto; maior = os 200 primeiros iguais. Roteiro reescrito desde o começo,
 * colado ou de outro lugar não casa — e fica como estava.
 */
export function ideiaDoRoteiroEscrito(roteiroDespachado: unknown, eventos: ReadonlyArray<ScriptWrittenEvento>, agoraMs: number): string | null {
  const texto = norma(roteiroDespachado)
  if (texto.length < CABECA_MIN_CHARS) return null
  const casado = [...(eventos ?? [])]
    .filter((e) => {
      const t = Date.parse(String(e?.created_at ?? ''))
      if (!Number.isFinite(t) || t > agoraMs + 60_000 || t < agoraMs - IDEIA_DO_ROTEIRO_JANELA_MS) return false
      if (typeof e.metadata?.original_idea !== 'string' || !e.metadata.original_idea.trim()) return false
      const cabeca = norma(e.metadata?.script_head)
      if (cabeca.length < CABECA_MIN_CHARS) return false
      // cabeça gravada inteira (< 200: o roteiro todo) = o roteiro despachado inteiro; com 200, o começo dele.
      // KINEO-IDEIA-VIAJA-1311 — o tamanho que decide é o GRAVADO (cru): a cabeça de 200 que termina em espaço ("…MICRO REWARD ") perdia 1
      // caractere no trim, virava "roteiro curto" e exigia o texto inteiro igual — 7 dos 12 filmes grátis de 7 dias não casavam por isso.
      return String(e.metadata?.script_head ?? '').length < CABECA_GRAVADA_CHARS ? texto === cabeca : texto.startsWith(cabeca)
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]
  return casado ? String(casado.metadata!.original_idea).slice(0, IDEIA_DO_ROTEIRO_MAX_CHARS) : null
}

// ── KINEO-IDEIA-VIAJA-1311 — a medida: de onde veio a ideia de CADA filme ────────────────────────────────────────────────────────────
export const FILM_IDEA_STATUS_EVENT = 'film_idea_status'
export const FILM_IDEA_STATUS_VERSAO = 'ideia_viaja_1311_v1'
export type OrigemDaIdeia = 'tela' | 'recuperada' | 'ausente'
/**
 * O registro de um filme: `origem` = a tela mandou a ideia / o servidor a recuperou / não há ideia (roteiro colado, conector, escritor sem
 * evento…); `ideia_e_o_roteiro` = a tela mandou o próprio roteiro como ideia (defeito de tela: não é a ideia de onde ele nasceu). PURA.
 */
export function statusDaIdeiaDoFilme(a: { daTela: unknown; final: unknown; roteiro: unknown; generationId?: unknown; dryRun?: boolean; servico?: boolean }) {
  const tela = typeof a.daTela === 'string' && a.daTela.trim() ? a.daTela : null
  const final = typeof a.final === 'string' && a.final.trim() ? a.final : null
  const origem: OrigemDaIdeia = tela ? 'tela' : final ? 'recuperada' : 'ausente'
  const roteiro = norma(a.roteiro)
  return {
    version: FILM_IDEA_STATUS_VERSAO,
    origem,
    chars: final ? final.length : 0,
    ideia_e_o_roteiro: !!tela && !!roteiro && norma(tela) === roteiro,
    roteiro_chars: roteiro.length,
    generation_id: typeof a.generationId === 'string' ? a.generationId : null,
    dry_run: a.dryRun === true,
    servico: a.servico === true,
  }
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
