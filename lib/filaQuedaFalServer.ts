// KINEO-FILA-QUEDA-FAL-2810 — o alarme HORÁRIO do fundador quando a fal recusa por saldo (lado servidor: banco + e-mail).
//
// Difere do lib/falAlert (1 e-mail por janela fixa de 6 h, assunto em inglês) de propósito: em 28/10 o primeiro e-mail saiu
// às 06:40 com estado "pending" (teto de 3 s) e o segundo só às 12:57; o saldo voltou ~16:30. Aqui: no máximo UM por hora
// enquanto houver recusa, em português, com o placar (recusas, filmes estacionados) e o caminho da recarga. Nunca sugere
// top-up por conta própria (regra do fundador: ele recarrega à mão). Zero token de IA.
//
// Rastro e corrida: a leitura do último `founder_alert_fal_balance` decide o throttle; a reserva com id determinístico da
// hora do relógio fecha a corrida entre lambdas (23505 = outra já mandou). O e-mail sai por notifyFounder (lib/supplier/notify,
// Resend, destinatário = KINEO_ALERT_EMAIL, o endereço do fundador), só e-mail. Teto de 3 s para não segurar a resposta do
// cliente; o envio segue no ar e grava o desfecho quando termina. Nunca lança.
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { notifyFounder } from '@/lib/supplier/notify'
import {
  FOUNDER_FAL_ALERT_EVENT, PARKED_EVENT, PARKED_CLOSED_EVENT, PARKED_TTL_MS,
  deveAlertarFundador, janelaDoAlertaDoFundador, textoDoAlertaDoFundador, uuidDeHex,
} from '@/lib/filaQuedaFal'

export const FOUNDER_ALERT_TIMEOUT_MS = 3000
export type FounderAlertOutcome = 'sent' | 'pending' | 'failed' | 'throttled' | 'duplicate' | 'error'

export function idDoAlertaDoFundador(nowMs: number): string {
  return uuidDeHex(createHash('sha256').update(`kineo:founder-alert-fal-balance:v1:${janelaDoAlertaDoFundador(nowMs)}`).digest('hex').slice(0, 32))
}

function adminDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function alertarFundadorFalSemSaldo(input: { engine?: string | null; db?: SupabaseClient | null; nowMs?: number }): Promise<FounderAlertOutcome> {
  try {
    const db = input.db ?? adminDb()
    if (!db) return 'error'
    const nowMs = input.nowMs ?? Date.now()
    const { data: ultimo } = await db.from('events').select('created_at').eq('name', FOUNDER_FAL_ALERT_EVENT).order('created_at', { ascending: false }).limit(1)
    const lastAlertAtMs = ultimo && ultimo[0] ? Date.parse(String(ultimo[0].created_at)) : null
    if (!deveAlertarFundador({ lastAlertAtMs: Number.isFinite(lastAlertAtMs as number) ? lastAlertAtMs : null, nowMs })) return 'throttled'
    const desde = new Date(nowMs - PARKED_TTL_MS).toISOString()
    const [{ count: recusas }, { data: estacionados }, { data: fechados }] = await Promise.all([
      db.from('events').select('id', { count: 'exact', head: true }).eq('name', 'fal_balance_exhausted').gte('created_at', desde),
      db.from('events').select('session_id').eq('name', PARKED_EVENT).gte('created_at', desde).limit(500),
      db.from('events').select('session_id').eq('name', PARKED_CLOSED_EVENT).gte('created_at', desde).limit(500),
    ])
    const fechado = new Set((fechados ?? []).map((r) => String(r.session_id)))
    const parked = (estacionados ?? []).filter((r) => !fechado.has(String(r.session_id))).length
    const { subject, text } = textoDoAlertaDoFundador({ nowMs, refusals: typeof recusas === 'number' ? recusas : 0, parked, engine: input.engine ?? null })
    const id = idDoAlertaDoFundador(nowMs)
    const { error: reservaErr } = await db.from('events').insert({ id, name: FOUNDER_FAL_ALERT_EVENT, path: '/lib/filaQuedaFalServer', metadata: { state: 'reserved', refusals: recusas ?? null, parked, engine: input.engine ?? null, window: janelaDoAlertaDoFundador(nowMs) } })
    if (reservaErr) return (reservaErr as { code?: string }).code === '23505' ? 'duplicate' : 'error'
    const envio = notifyFounder(subject, text, { emailOnly: true, idempotencyKey: `founder-fal-balance-${id}` })
      .then((r) => r.email === 'sent' ? 'sent' as const : 'failed' as const)
      .catch(() => 'failed' as const)
    void envio.then((state) => db.from('events').update({ metadata: { state, refusals: recusas ?? null, parked, engine: input.engine ?? null, window: janelaDoAlertaDoFundador(nowMs) } }).eq('id', id).then(() => undefined, () => undefined))
    const vencedor = await Promise.race([envio, new Promise<'pending'>((r) => setTimeout(() => r('pending'), FOUNDER_ALERT_TIMEOUT_MS))])
    return vencedor
  } catch (e) {
    console.error('[fila-queda-fal] alarme do fundador falhou:', e instanceof Error ? e.message : String(e))
    return 'error'
  }
}
