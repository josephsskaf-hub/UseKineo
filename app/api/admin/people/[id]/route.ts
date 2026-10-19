// KINEO-ADMIN-PESSOA-1910 — a TELA DA PESSOA em JSON: GET /api/admin/people/<id ou e-mail>. Mesmo portão de todo
// /api/admin/*: sessão + allowlist isAdminEmail, checado ANTES de criar o cliente service role. Só leitura — a rota só tem
// GET e a montagem (lib/admin/pessoaTela.ts) não grava nada. A página /admin/people/[id] usa a MESMA função no servidor.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../../_shared/db'
import { carregarTelaPessoa } from '@/lib/admin/pessoaTela'
import { lerChavePessoa } from '@/lib/admin/pessoaTelaRegras'

export const dynamic = 'force-dynamic'
// Rota SO-GET no Next 14.2: sem isto o supabase-js iria para o Data Cache da Vercel (KINEO-DATA-CACHE-2026-09-02). Não remover.
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const chave = lerChavePessoa(params?.id)
    if (!chave) return NextResponse.json({ error: 'id ou e-mail inválido' }, { status: 400 })
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    const tela = await carregarTelaPessoa(admin, chave)
    if (!tela) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json(tela)
  } catch (e) {
    console.error('[admin/people/[id]] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Failed to load person.' }, { status: 500 })
  }
}
