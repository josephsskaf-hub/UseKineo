// KINEO-OFERTA-3H-0411 — a leitura da barra das 3 h no servidor, para ela já vir no HTML (sem pulo de tela: nada entra depois do 1º desenho).
// Conta com mais de 3 h não custa nenhuma consulta: só a data da sessão decide. Qualquer falha = sem barra.
import { cookies } from 'next/headers'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import {
  ANNUAL_WELCOME_BAR_DISMISS_COOKIE,
  annualWelcomeBarState,
  annualWelcomeOpen,
  type AnnualWelcomeBarInitial,
} from '@/lib/billing/annualWelcomeOffer'
import { bf2026Open } from '@/lib/billing/blackFriday2026'

export async function readAnnualWelcomeBar(supabase: Pick<SupabaseClient, 'from'>, user: Pick<User, 'id' | 'created_at'> | null): Promise<AnnualWelcomeBarInitial | null> {
  if (!user) return null
  const nowMs = Date.now()
  if (!annualWelcomeOpen({ accountCreatedAt: user.created_at, hasPaid: false, nowMs })) return null
  try {
    const dismissed = cookies().get(ANNUAL_WELCOME_BAR_DISMISS_COOKIE)?.value === '1'
    const { data, error } = await supabase.from('profiles').select('has_paid').eq('id', user.id).single()
    return annualWelcomeBarState({
      signedIn: true,
      accountCreatedAt: user.created_at,
      hasPaid: (data as { has_paid?: boolean | null } | null)?.has_paid ?? null,
      profileRead: !error && Boolean(data),
      bfOpen: bf2026Open(nowMs),
      dismissed,
      nowMs,
    })
  } catch {
    return null
  }
}
