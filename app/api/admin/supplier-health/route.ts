// KINEO-SUPPLIER-ALARM-2026-08-11 — o painel do fornecedor, em JSON.
//
// READ-ONLY POR CONSTRUÇÃO: este arquivo só faz SELECT. Não escreve evento, não
// dispara e-mail, não muda plano nem cota. Quem alerta é o cron
// (/api/cron/supplier-watch); esta rota só mostra a MESMA conta, calculada
// pelos MESMOS módulos (lib/supplier/burn.ts, lib/supplier/generationHealth.ts).
//
// Isso não é preciosismo: o repositório já teve duas telas de dinheiro
// discordando porque cada uma tinha a própria cópia da fórmula (ver o cabeçalho
// de app/api/admin/ceo/compute.ts). Painel de fornecedor que discorda do alarme
// de fornecedor seria a mesma armadilha, na véspera do terceiro apagão.
//
// Gate idêntico a todo /api/admin/*: sessão por cookie + allowlist.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'
import { readSupplierBurn } from '@/lib/supplier/burn'
import { readGenerationHealth } from '@/lib/supplier/generationHealth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const cookieClient = createClient()
    const {
      data: { user },
    } = await cookieClient.auth.getUser()
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = serviceClient()
    if (!admin) {
      return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })
    }

    const now = new Date()
    const [suppliers, health] = await Promise.all([
      readSupplierBurn(admin, now),
      readGenerationHealth(admin, now),
    ])

    return NextResponse.json({
      generatedAt: now.toISOString(),
      suppliers,
      health,
    })
  } catch (err) {
    console.error('[admin/supplier-health] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
