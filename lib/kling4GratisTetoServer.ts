// KINEO-TETO-K4-GRATIS-1111 — o lado de servidor do teto do Kling 4 grátis (regras em lib/kling4GratisTeto.ts). Lê, com a
// chave de serviço: as reservas de Kling 4 grátis (kling4_trial_films, reserved_milliusd = 2355) desta conta e das OUTRAS contas
// na mesma digital de aparelho (trial_signup_fingerprints) nas últimas 24 h. A cada desvio grava UM evento de servidor com o
// motivo. Nunca lança: erro de leitura = motor barato.
import type { SupabaseClient } from '@supabase/supabase-js'
import { writeServerEvent } from '@/lib/serverEvents'
import { isInternalEmail } from '@/lib/internalAccounts'
import {
  KLING4_GRATIS_TETO_1111,
  KLING4_GRATIS_TETO_DESTINO,
  KLING4_GRATIS_TETO_EVENT,
  KLING4_GRATIS_TETO_HORAS,
  KLING4_GRATIS_TETO_VERSION,
  kling4GratisTetoMotivo,
  kling4TetoDesde,
  kling4TetoEhRobo,
  type Kling4TetoProva,
} from '@/lib/kling4GratisTeto'

const RESERVA_MILLIUSD = 2355
const MAX_CONTAS_NO_APARELHO = 50

async function contarEnvios(db: SupabaseClient, userIds: string[], desde: string): Promise<number | null> {
  if (userIds.length === 0) return 0
  try {
    const r = await db.from('kling4_trial_films').select('job_id', { count: 'exact', head: true })
      .in('user_id', userIds).eq('reserved_milliusd', RESERVA_MILLIUSD).gte('reserved_at', desde)
    return r.error || typeof r.count !== 'number' ? null : r.count
  } catch { return null }
}

async function outrasContasNoAparelho(db: SupabaseClient, userId: string): Promise<string[] | null> {
  try {
    const mine = await db.from('trial_signup_fingerprints').select('fingerprint_hash').eq('user_id', userId).limit(10)
    if (mine.error || !Array.isArray(mine.data)) return null
    const hashes = [...new Set((mine.data as Array<{ fingerprint_hash?: string | null }>).map((r) => r.fingerprint_hash).filter((h): h is string => typeof h === 'string' && h.length > 0))]
    if (hashes.length === 0) return [] // sem digital gravada = sem sinal de aparelho (a conta segue contada pelo id)
    const others = await db.from('trial_signup_fingerprints').select('user_id').in('fingerprint_hash', hashes).neq('user_id', userId).limit(MAX_CONTAS_NO_APARELHO)
    if (others.error || !Array.isArray(others.data)) return null
    return [...new Set((others.data as Array<{ user_id?: string | null }>).map((r) => r.user_id).filter((u): u is string => typeof u === 'string'))]
  } catch { return null }
}

/**
 * A candidata ao Kling 4 grátis está DENTRO do teto? false = o MESMO filme grátis sai no motor barato (sem recusa).
 * 'off' = true sem leitura. O robô é desviado antes de qualquer leitura.
 */
export async function kling4GratisDentroDoTeto(db: SupabaseClient, a: {
  userId: string; email: string | null | undefined; generationId: unknown; modoServico: boolean; pago: boolean; now?: number
}): Promise<boolean> {
  if (KLING4_GRATIS_TETO_1111 === 'off') return true
  const robo = kling4TetoEhRobo({ modoServico: a.modoServico, generationId: a.generationId })
  const casa = isInternalEmail(typeof a.email === 'string' ? a.email : null)
  let prova: Kling4TetoProva = { robo, casa, pago: a.pago === true, enviosConta: 0, enviosAparelho: 0 }
  if (!robo && !casa && a.pago !== true) {
    const desde = kling4TetoDesde(a.now ?? Date.now())
    const enviosConta = await contarEnvios(db, [a.userId], desde)
    const outras = enviosConta !== null && enviosConta === 0 ? await outrasContasNoAparelho(db, a.userId) : []
    const enviosAparelho = outras === null ? null : await contarEnvios(db, outras, desde)
    prova = { ...prova, enviosConta, enviosAparelho }
  }
  const motivo = kling4GratisTetoMotivo(prova)
  if (motivo === null) return true
  await writeServerEvent({
    name: KLING4_GRATIS_TETO_EVENT,
    userId: a.userId,
    path: '/api/generate-video-cinematic',
    metadata: {
      motivo,
      generation_id: typeof a.generationId === 'string' ? a.generationId.slice(0, 200) : null,
      envios_conta: prova.enviosConta,
      envios_aparelho: prova.enviosAparelho,
      janela_horas: KLING4_GRATIS_TETO_HORAS,
      destino: KLING4_GRATIS_TETO_DESTINO,
      version: KLING4_GRATIS_TETO_VERSION,
    },
  })
  return false
}
