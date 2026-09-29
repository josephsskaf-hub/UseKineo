// KINEO-E4-SAIDA-B-2026-09-29 — a RECARGA semanal da cota nova (1 Seedance 1.5 de 15 s por semana, só país rico). A
// régua mora em lib/freeWeeklyFilm.ts (pura); aqui só a escrita. Chamada por GET /api/credits — a leitura de saldo que
// o Studio e o /generate fazem ao abrir —, com o país do PEDIDO. Nunca lança; nunca bloqueia a resposta do saldo.
//
// Garantias, nesta ordem:
//   1. elegibilidade (freeWeeklyFilmEligibility): conta grátis, nunca pagou, trial encerrado, fora 'region_paid_only',
//      país do pedido CONHECIDO e na lista; senão nada é lido nem escrito além do perfil;
//   2. topUp = 7 − saldo (freeWeeklyTopUp): saldo ≥ 7 → nada, nem evento — a cota não acumula;
//   3. no máximo UMA recarga a cada 7 dias: o evento FREE_WEEKLY_FILM_GRANTED_EVENT é o carimbo; leitura falhou =
//      não recarrega (falha fechada: é crédito);
//   4. KINEO-E4-CONSERTO-2026-09-29 (achado 4) — o país FICA: o da 1ª recarga/admissão (metadata.country) tem de ser o
//      do pedido (freeWeeklyCountryMatches); leitura falhou = não recarrega;
//   5. KINEO-E4-CONSERTO-2026-09-29 (achado 3) — o CARIMBO VEM ANTES DO CRÉDITO. Era UPDATE e depois evento, com o
//      retorno do evento ignorado (writeServerEvent devolve false, nunca lança): com o insert em `events` falhando
//      (banco instável, como no JWT-skew de 28/08) a conta recebia 7 cr, gastava, e o GET seguinte não achava carimbo e
//      recarregava de novo — crédito sem teto. Agora o carimbo é gravado primeiro e TEM de voltar true; sem ele, nada.
//      O avesso (carimbo gravado e UPDATE que não casa/falha) só perde a semana dessa conta: falha fechada, e o evento
//      FREE_WEEKLY_FILM_GRANT_VOIDED_EVENT deixa o custo medido honesto (recargas = carimbos − anulados);
//   6. UPDATE condicional ao saldo lido (`.eq('video_credits', saldo)`): duas requisições simultâneas não somam — a
//      segunda não casa e sai 'race'.
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  FREE_WEEKLY_FILM_COUNTRY_EVENTS,
  FREE_WEEKLY_FILM_CREDITS,
  FREE_WEEKLY_FILM_GRANTED_EVENT,
  FREE_WEEKLY_FILM_SECONDS,
  FREE_WEEKLY_FILM_WINDOW_MS,
  freeWeeklyCountryMatches,
  freeWeeklyFilmEligibility,
  freeWeeklyTopUp,
} from '@/lib/freeWeeklyFilm'

/** Carimbo gravado mas crédito NÃO dado (UPDATE falhou ou perdeu a corrida). Medição: recargas = carimbos − anulados. */
export const FREE_WEEKLY_FILM_GRANT_VOIDED_EVENT = 'free_weekly_film_grant_voided'

export interface FreeWeeklyGrantResult {
  granted: number
  reason: string
  balanceAfter?: number
}

type EventWriter = (e: { name: string; userId: string; path?: string; metadata?: Record<string, unknown> }) => Promise<unknown>

/** Núcleo com banco e escritor de evento injetados (o guardião passa falsos). */
export async function grantFreeWeeklyFilm(
  db: SupabaseClient | null,
  writeEvent: EventWriter,
  args: { userId: string; country: string | null; now?: number },
): Promise<FreeWeeklyGrantResult> {
  const now = args.now ?? Date.now()
  if (!db || typeof args.userId !== 'string' || !args.userId) return { granted: 0, reason: 'no_db' }
  try {
    const { data: prof, error: profErr } = await db
      .from('profiles')
      .select('video_credits, plan, has_paid, trial_status, created_at')
      .eq('id', args.userId)
      .maybeSingle()
    if (profErr || !prof) return { granted: 0, reason: 'read_failed' }
    const p = prof as { video_credits?: number | null; plan?: string | null; has_paid?: boolean | null; trial_status?: string | null; created_at?: string | null }
    const eligibility = freeWeeklyFilmEligibility(p, args.country, now)
    if (eligibility !== 'eligible') return { granted: 0, reason: eligibility }
    const balance = Math.max(0, Math.floor(Number(p.video_credits ?? 0) || 0))
    const topUp = freeWeeklyTopUp(balance)
    if (topUp <= 0) return { granted: 0, reason: 'has_film_credits', balanceAfter: balance }
    const since = new Date(now - FREE_WEEKLY_FILM_WINDOW_MS).toISOString()
    const { data: recent, error: recentErr } = await db
      .from('events')
      .select('id')
      .eq('user_id', args.userId)
      .eq('name', FREE_WEEKLY_FILM_GRANTED_EVENT)
      .gte('created_at', since)
      .limit(1)
    if (recentErr) return { granted: 0, reason: 'window_read_failed' }
    if (Array.isArray(recent) && recent.length > 0) return { granted: 0, reason: 'week_used', balanceAfter: balance }
    // (4) o país da 1ª vez — o evento mais antigo de recarga/admissão desta conta.
    const { data: first, error: firstErr } = await db
      .from('events')
      .select('metadata')
      .eq('user_id', args.userId)
      .in('name', [...FREE_WEEKLY_FILM_COUNTRY_EVENTS])
      .order('created_at', { ascending: true })
      .limit(1)
    const firstMeta = Array.isArray(first) && first.length > 0 ? (first[0] as { metadata?: Record<string, unknown> | null }).metadata ?? null : null
    const firstCountry = firstMeta && typeof firstMeta.country === 'string' ? firstMeta.country : null
    if (!freeWeeklyCountryMatches({ firstRead: !firstErr, firstCountry, country: args.country })) {
      return { granted: 0, reason: firstErr ? 'first_country_read_failed' : 'country_changed', balanceAfter: balance }
    }
    const after = balance + topUp
    // (5) carimbo ANTES do crédito, e ele TEM de ter sido gravado.
    const stamped = await writeEvent({
      name: FREE_WEEKLY_FILM_GRANTED_EVENT,
      userId: args.userId,
      path: '/api/credits',
      metadata: {
        granted: topUp,
        balance_before: balance,
        balance_after: after,
        film_credits: FREE_WEEKLY_FILM_CREDITS,
        film_seconds: FREE_WEEKLY_FILM_SECONDS,
        country: args.country ?? null,
        first_country: firstCountry,
        trial_status: p.trial_status ?? null,
        stamp_before_credit: true,
      },
    })
    if (stamped !== true) return { granted: 0, reason: 'stamp_failed', balanceAfter: balance }
    const { data: updated, error: updErr } = await db
      .from('profiles')
      .update({ video_credits: after })
      .eq('id', args.userId)
      .eq('video_credits', p.video_credits ?? 0)
      .select('id')
    const outcome = updErr ? 'write_failed' : !Array.isArray(updated) || updated.length === 0 ? 'race' : 'granted'
    if (outcome !== 'granted') {
      await writeEvent({
        name: FREE_WEEKLY_FILM_GRANT_VOIDED_EVENT,
        userId: args.userId,
        path: '/api/credits',
        metadata: { reason: outcome, granted: 0, balance_before: balance, country: args.country ?? null },
      })
      return { granted: 0, reason: outcome }
    }
    return { granted: topUp, reason: 'granted', balanceAfter: after }
  } catch (e) {
    console.warn(`[free-weekly-film] grant threw user=${String(args.userId).slice(0, 8)}:`, e instanceof Error ? e.message : String(e))
    return { granted: 0, reason: 'threw' }
  }
}
