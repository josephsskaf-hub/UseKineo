// KINEO-RETOMADA-SEM-RAJADA-2511 — o lado de servidor da retomada espaçada (a cadência pura está em lib/filaQuedaFal.ts):
//   · o saldo da fal, lido pela API de cobrança (GET /v1/account/billing?expand=credits, documentação pública da fal), SÓ com a variável
//     FAL_BILLING_KEY (uma chave com o preset BILLING, criada pelo dono). Sem ela: nada é lido, nenhum evento, e a retomada por saldo segue a escada
//     de hora em hora. O valor da chave nunca é gravado, nunca vai a log e nunca vai ao navegador (esta função só roda na cron);
//   · o aviso de saldo baixo: no máximo uma leitura por hora (id da hora: duas lambdas caem no 23505), e UM evento por dia abaixo de US$ 75;
//   · o evento do dia dos filmes de CLIENTE estacionados por saldo: UM por dia UTC (id do dia), atualizado com o máximo do dia; sem e-mail, sem push.
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { uuidDeHex, SALDO_BAIXO_USD_2511, RETOMADA_ESPACADA_2511_VERSAO } from '@/lib/filaQuedaFal'
import { contaDaCasaExata } from '@/lib/internalAccounts'

export const FAL_BILLING_URL_2511 = 'https://api.fal.ai/v1/account/billing?expand=credits'
export const EVENTO_SALDO_DA_HORA_2511 = 'fal_saldo_lido'
export const EVENTO_SALDO_BAIXO_2511 = 'fal_saldo_baixo'
export const EVENTO_ESTACIONADO_POR_SALDO_2511 = 'parked_saldo_do_dia'
const CAMINHO = '/api/cron/resume-parked-renders'
const HORA = 3_600_000
export const idDoEvento2511 = (...partes: string[]) => uuidDeHex(createHash('sha256').update(JSON.stringify(['kineo:retomada-sem-rajada:v1', ...partes])).digest('hex').slice(0, 32))
const diaUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export type SaldoLido2511 = { estado: 'sem_chave' } | { estado: 'ok'; usd: number } | { estado: 'erro'; http: number | null }
/** UMA leitura do saldo. Nunca lança; nunca devolve nem registra a chave. */
export async function lerSaldoDaFal2511(deps: { chave?: string | null; fetchImpl?: typeof fetch } = {}): Promise<SaldoLido2511> {
  const chave = deps.chave !== undefined ? deps.chave : (process.env.FAL_BILLING_KEY ?? null)
  if (!chave || !chave.trim()) return { estado: 'sem_chave' }
  try {
    const r = await (deps.fetchImpl ?? fetch)(FAL_BILLING_URL_2511, { headers: { Authorization: `Key ${chave.trim()}` }, signal: AbortSignal.timeout(5_000), cache: 'no-store' })
    if (!r.ok) return { estado: 'erro', http: r.status }
    const j = (await r.json().catch(() => null)) as { credits?: { current_balance?: unknown; currency?: unknown } } | null
    const v = j?.credits?.current_balance
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || (j?.credits?.currency !== undefined && j.credits.currency !== 'USD')) return { estado: 'erro', http: r.status }
    return { estado: 'ok', usd: v }
  } catch { return { estado: 'erro', http: null } }
}

/** O saldo desta passada: lido em toda passada enquanto houver filme estacionado por saldo (a retomada sai até 5 min depois da recarga); sem isso,
 *  no máximo uma leitura por hora, para o aviso. null = sem chave, leitura que falhou, ou esta hora já lida por outra passada. */
export async function saldoDaPassada2511(admin: SupabaseClient, i: { nowMs: number; haPorSaldo: boolean; ler?: () => Promise<SaldoLido2511> }): Promise<number | null> {
  const ler = i.ler ?? (() => lerSaldoDaFal2511())
  if (!i.ler && !(process.env.FAL_BILLING_KEY ?? '').trim()) return null // sem a chave: nada é lido, nenhum evento
  if (!i.haPorSaldo) {
    const hora = Math.floor(i.nowMs / HORA)
    const { error } = await admin.from('events').insert({ id: idDoEvento2511('saldo-hora', String(hora)), name: EVENTO_SALDO_DA_HORA_2511, path: CAMINHO, metadata: { versao: RETOMADA_ESPACADA_2511_VERSAO, hora_utc: new Date(hora * HORA).toISOString() } })
    if (error) return null // outra passada já leu nesta hora (23505) ou o banco falhou: sem leitura
  }
  const s = await ler()
  if (s.estado !== 'ok') return null
  if (s.usd < SALDO_BAIXO_USD_2511) {
    const dia = diaUtc(i.nowMs)
    await admin.from('events').insert({ id: idDoEvento2511('saldo-baixo', dia), name: EVENTO_SALDO_BAIXO_2511, path: CAMINHO, metadata: { versao: RETOMADA_ESPACADA_2511_VERSAO, dia, saldo_usd: s.usd, limite_usd: SALDO_BAIXO_USD_2511 } }) // 23505 = já avisado hoje
  }
  return s.usd
}

type Estacionado = { user_id: string | null; session_id: string | null; created_at: string }
/** O evento do dia dos filmes de CLIENTE estacionados por saldo (a casa, pela lista exata, fica fora). Um por dia UTC: nasce na 1ª passada e é
 *  atualizado com o máximo do dia. Nunca lança. */
export async function registrarDiaDoSaldo2511(admin: SupabaseClient, i: { porSaldo: readonly Estacionado[]; nowMs: number; saldoUsd: number | null }): Promise<'novo' | 'atualizado' | 'igual' | 'sem_cliente' | 'erro'> {
  try {
    const ids = [...new Set(i.porSaldo.map((r) => String(r.user_id ?? '')).filter(Boolean))]
    if (ids.length === 0) return 'sem_cliente'
    const { data: perfis, error: pErr } = await admin.from('profiles').select('id, email').in('id', ids)
    if (pErr) return 'erro'
    const casa = new Set((perfis ?? []).filter((p: { id: string; email?: string | null }) => contaDaCasaExata(p.email ?? null)).map((p: { id: string }) => String(p.id)))
    const clientes = i.porSaldo.filter((r) => r.user_id && !casa.has(String(r.user_id)))
    if (clientes.length === 0) return 'sem_cliente'
    const dia = diaUtc(i.nowMs), id = idDoEvento2511('estacionado-por-saldo', dia)
    const maisAntigo = Math.max(...clientes.map((r) => Math.round((i.nowMs - Date.parse(r.created_at)) / 60_000)).filter(Number.isFinite))
    const agora = { versao: RETOMADA_ESPACADA_2511_VERSAO, dia, filmes: clientes.length, contas: [...new Set(clientes.map((r) => String(r.user_id).slice(0, 8)))].sort(), mais_antigo_min: maisAntigo, saldo_usd: i.saldoUsd }
    const { error } = await admin.from('events').insert({ id, name: EVENTO_ESTACIONADO_POR_SALDO_2511, path: CAMINHO, metadata: agora })
    if (!error) return 'novo'
    if ((error as { code?: string }).code !== '23505') return 'erro'
    const { data: antes } = await admin.from('events').select('metadata').eq('id', id).eq('name', EVENTO_ESTACIONADO_POR_SALDO_2511).maybeSingle()
    const m = ((antes as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as { filmes?: number; contas?: string[]; mais_antigo_min?: number; saldo_usd?: number | null }
    const junto = { ...agora, filmes: Math.max(agora.filmes, Number(m.filmes) || 0), contas: [...new Set([...(Array.isArray(m.contas) ? m.contas : []), ...agora.contas])].sort(),
      mais_antigo_min: Math.max(agora.mais_antigo_min, Number(m.mais_antigo_min) || 0), saldo_usd: agora.saldo_usd ?? (typeof m.saldo_usd === 'number' ? m.saldo_usd : null) }
    if (JSON.stringify(junto) === JSON.stringify(m)) return 'igual'
    const u = await admin.from('events').update({ metadata: junto }).eq('id', id).eq('name', EVENTO_ESTACIONADO_POR_SALDO_2511)
    return u.error ? 'erro' : 'atualizado'
  } catch { return 'erro' }
}
