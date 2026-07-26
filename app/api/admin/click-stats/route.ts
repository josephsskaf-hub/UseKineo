// Push #233 — Admin click-stats API.
// Returns total Basic / Pro checkout-button clicks from public.click_events
// for the admin metrics dashboard. Gated to the admin emails; everyone else
// gets 403. Reads via the service role so it works regardless of RLS.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = new Set([
  'josephsskaf@gmail.com',
  'josephskaf@gmail.com',
  'joseph-test@shortsforgeai.com',
])

async function safeCount(
  // KINEO-TSC-2026-07-26 — PostgrestFilterBuilder é um *thenable*, não uma
  // Promise: não tem .catch/.finally. Tipar o parâmetro como Promise fazia
  // TODA chamada de safeCount virar erro de tsc (5 aqui, 5 em metrics).
  // PromiseLike é o contrato que a função realmente usa — ela só faz await.
  fn: () => PromiseLike<{ count: number | null; error: unknown }>
): Promise<number | null> {
  try {
    const { count, error } = await fn()
    if (error) return null
    return typeof count === 'number' ? count : null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const email = user?.email?.toLowerCase() ?? ''
    if (!user || !ADMIN_EMAILS.has(email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ available: false, basic: null, pro: null })
    }

    const admin = createServiceClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Probe table existence so the dashboard can show "not tracked yet"
    // rather than a hard error when the migration hasn't been run.
    const probe = await admin
      .from('click_events')
      .select('id', { head: true, count: 'exact' })
      .limit(1)
    if (probe.error) {
      const code = (probe.error as { code?: string }).code ?? ''
      if (code === '42P01' || /does not exist|relation/.test(probe.error.message ?? '')) {
        return NextResponse.json({ available: false, basic: null, pro: null })
      }
    }

    // KINEO-PILOT-99-2026-07-26 — a rota contava SÓ basic e pro. Mesmo depois
    // do #102 fazer trackCheckoutClick aceitar 'autopilot', o número nunca
    // aparecia: quem conta é este arquivo. Sem isto, a intenção de compra do
    // SKU de $299 e do piloto de $99 — exatamente os dois que este sprint
    // existe para vender — continuaria invisível no único painel que mede
    // intenção. Contagens novas em campos NOVOS; `basic` e `pro` seguem no
    // mesmo lugar para não quebrar nenhum leitor existente.
    const [basic, pro, starter, autopilot, autopilotPilot] = await Promise.all([
      safeCount(() =>
        admin.from('click_events').select('id', { head: true, count: 'exact' }).eq('plan', 'basic')
      ),
      safeCount(() =>
        admin.from('click_events').select('id', { head: true, count: 'exact' }).eq('plan', 'pro')
      ),
      safeCount(() =>
        admin.from('click_events').select('id', { head: true, count: 'exact' }).eq('plan', 'starter')
      ),
      safeCount(() =>
        admin.from('click_events').select('id', { head: true, count: 'exact' }).eq('plan', 'autopilot')
      ),
      safeCount(() =>
        admin.from('click_events').select('id', { head: true, count: 'exact' }).eq('plan', 'autopilot_pilot')
      ),
    ])

    return NextResponse.json({
      available: true,
      basic,
      pro,
      starter,
      autopilot,
      autopilot_pilot: autopilotPilot,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[admin/click-stats] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
