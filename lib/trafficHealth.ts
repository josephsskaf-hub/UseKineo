// KINEO-TRAFEGO-2310 — monitor independente da escrita no banco e sem novo cron.
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { notifyFounder } from '@/lib/supplier/notify'

export const TRAFFIC_SILENCE_MS = 15 * 60_000
export const TRAFFIC_QUERY_TIMEOUT_MS = 4000
export const TRAFFIC_ALERT_EVENT = 'traffic_health_alert'
// Eventos já emitidos por pessoas nas entradas e no produto. Cron/lease/alarme
// nunca entram: um monitor não pode provar a saúde lendo a própria batida.
export const TRAFFIC_ACTIVITY_EVENTS = [
  'landing_session_started', 'homepage_view', 'generate_page_view',
  'studio_tiles_shown', 'ads_page_viewed', 'email_signup_completed',
  'auth_callback_completed', 'checkout_started', 'video_generation_completed',
] as const

type HealthReason = 'healthy' | 'database_unavailable' | 'no_recent_activity'
export interface TrafficHealthResult {
  reason: HealthReason
  email: 'sent' | 'failed' | 'skipped' | null
  recorded: boolean
}

export async function checkTrafficHealth(admin: SupabaseClient | null, now = Date.now()): Promise<TrafficHealthResult> {
  let reason: HealthReason = 'database_unavailable'
  if (admin) {
    try {
      const { data, error } = await admin.from('events').select('created_at')
        .in('name', [...TRAFFIC_ACTIVITY_EVENTS])
        .gte('created_at', new Date(now - TRAFFIC_SILENCE_MS).toISOString())
        .lte('created_at', new Date(now).toISOString())
        .limit(1).abortSignal(AbortSignal.timeout(TRAFFIC_QUERY_TIMEOUT_MS))
      reason = error ? 'database_unavailable' : data?.length ? 'healthy' : 'no_recent_activity'
    } catch { /* rede/timeout: o aviso abaixo NÃO depende do banco */ }
  }
  if (reason === 'healthy') return { reason, email: null, recorded: false }

  // Resend deduplica também quando o banco caiu e entre lambdas concorrentes.
  // Mesmo corpo na mesma chave: dados voláteis causariam conflito no Resend.
  const hour = new Date(now).toISOString().slice(0, 13)
  const idempotencyKey = `kineo-traffic-2310/${reason}/${hour}`
  const subject = reason === 'database_unavailable'
    ? '🚨 Kineo: banco indisponível na checagem de tráfego'
    : '⚠️ Kineo: sem evento de atividade nos últimos 15 minutos'
  const text = [
    `Janela de alerta: ${hour}:00 UTC.`,
    reason === 'database_unavailable'
      ? 'A consulta de saúde ao banco falhou ou não respondeu em 4 segundos (ou a configuração do banco está ausente). O aviso foi enviado sem depender de uma gravação no banco.'
      : 'O banco respondeu, mas não há evento de entrada, uso, cadastro, checkout ou entrega nos últimos 15 minutos. Isso é sinal para investigar: ausência de tráfego e falha de instrumentação também podem causar silêncio; não comprova indisponibilidade.',
    'Verifique https://www.usekineo.com, os logs do cron finish-orphan-jobs e a saúde do banco. Não há alteração de crédito, preço ou pedido por este monitor.',
    'Checagem no cron existente a cada 10 minutos; limiar de silêncio de 15 minutos. E-mail deduplicado por motivo e hora UTC, com nova tentativa se o transporte falhar.',
  ].join('\n\n')
  console.error(`[traffic-health] ${reason}; hour=${hour}`)
  let email: TrafficHealthResult['email'] = 'failed'
  try {
    const notified = await notifyFounder(subject, text, { idempotencyKey, emailOnly: true })
    email = notified.email
  } catch { console.error('[traffic-health] transporte de alerta falhou') }

  let recorded = false
  if (admin) {
    try {
      const hex = createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 32)
      const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
      const { error } = await admin.from('events').insert({
        id, name: TRAFFIC_ALERT_EVENT, path: '/api/cron/finish-orphan-jobs',
        metadata: { version: 'KINEO-TRAFEGO-2310', reason, hour, first_attempt_email: email, threshold_minutes: 15 },
      }).abortSignal(AbortSignal.timeout(TRAFFIC_QUERY_TIMEOUT_MS))
      recorded = !error || error.code === '23505'
    } catch { /* o log e o e-mail continuam independentes do banco */ }
  }
  return { reason, email, recorded }
}
