// KINEO-E4-SAIDA-B-2026-09-29 — a RECARGA semanal da cota nova (1 Seedance 1.5 de 15 s por semana, só país rico). A
// régua mora em lib/freeWeeklyFilm.ts (pura); aqui só a escrita. Chamada por GET /api/credits — a leitura de saldo que
// o Studio e o /generate fazem ao abrir —, com o país do PEDIDO. Nunca lança; nunca bloqueia a resposta do saldo.
//
// Garantias, nesta ordem:
//   1. elegibilidade (freeWeeklyFilmEligibility): conta grátis, nunca pagou, trial encerrado, fora 'region_paid_only',
//      país do pedido na lista; senão nada é lido nem escrito além do perfil;
//   2. topUp = 7 − saldo (freeWeeklyTopUp): saldo ≥ 7 → nada, nem evento — a cota não acumula;
//   3. no máximo UMA recarga a cada 7 dias: o evento FREE_WEEKLY_FILM_GRANTED_EVENT é o carimbo; leitura falhou =
//      não recarrega (falha fechada: é crédito);
//   4. UPDATE condicional ao saldo lido (`.eq('video_credits', saldo)`): duas requisições simultâneas não somam — a
//      segunda não casa e sai 'race';
//   5. evento de servidor com o antes/depois (medível: quantas contas recarregam por semana = custo da cota).
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  FREE_WEEKLY_FILM_CREDITS,
  FREE_WEEKLY_FILM_GRANTED_EVENT,
  FREE_WEEKLY_FILM_SECONDS,
  FREE_WEEKLY_FILM_WINDOW_MS,
  freeWeeklyFilmEligibility,
  freeWeeklyTopUp,
} from '@/lib/freeWeeklyFilm'

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
    const after = balance + topUp
    const { data: updated, error: updErr } = await db
      .from('profiles')
      .update({ video_credits: after })
      .eq('id', args.userId)
      .eq('video_credits', p.video_credits ?? 0)
      .select('id')
    if (updErr) return { granted: 0, reason: 'write_failed' }
    if (!Array.isArray(updated) || updated.length === 0) return { granted: 0, reason: 'race' }
    await writeEvent({
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
        trial_status: p.trial_status ?? null,
      },
    })
    return { granted: topUp, reason: 'granted', balanceAfter: after }
  } catch (e) {
    console.warn(`[free-weekly-film] grant threw user=${String(args.userId).slice(0, 8)}:`, e instanceof Error ? e.message : String(e))
    return { granted: 0, reason: 'threw' }
  }
}
