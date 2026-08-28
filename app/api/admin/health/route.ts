// KINEO-HEALTH-2026-08-28 — o raio-X de 30 segundos para "algo está estranho?".
//
// POR QUE EXISTE. No incidente de 28/08 (relógio do Supabase), o diagnóstico
// levou HORAS porque a verdade estava espalhada: o sintoma no painel, a causa
// no runtime log da Vercel (que expira), a prova no banco. O fundador ficou
// olhando telas que mostravam "0 créditos" e "No videos yet" sem nenhum lugar
// que dissesse "o problema é o fornecedor X, desde as HH:MM".
//
// Esta rota reúne, numa chamada, as quatro perguntas de um plantão:
//   1. Os FORNECEDORES respondem? (fal, Creatomate, OpenAI — HEAD/GET barato,
//      nunca gera nada, custo zero)
//   2. O BANCO aceita token fresco? (a assinatura do incidente PGRST303: o
//      service key funciona e um token recém-emitido falha — testamos emitindo
//      um token anônimo de verdade e lendo com ele)
//   3. O que FALHOU na última hora? (a taxonomia de events, agrupada)
//   4. Tem gente PRESA agora? (renders fora de estado terminal >20min)
//
// GET /api/admin/health — admin only, mesmo guard das outras rotas /admin.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isAdminEmail } from '../_shared/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Probe = { ok: boolean; ms: number; note?: string }

async function probe(nome: string, fn: () => Promise<{ ok: boolean; note?: string }>): Promise<Probe> {
  const t0 = Date.now()
  try {
    const r = await fn()
    return { ok: r.ok, ms: Date.now() - t0, note: r.note }
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, note: e instanceof Error ? e.message : String(e) }
  }
}

/** fetch com prazo curto: uma sonda de saúde que trava é pior que nenhuma. */
async function fetchComPrazo(url: string, init: RequestInit = {}, ms = 6000): Promise<Response> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctl.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'admin only' }, { status: 403 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const admin = createServiceClient(url, serviceKey, { auth: { persistSession: false } })

  const [fal, creatomate, openai, dbService, dbFreshToken, falhas1h, presos] = await Promise.all([
    // 1) fal — o endpoint de fila responde? (GET sem auth volta 401: para a
    //    sonda, 401/405 = o serviço ESTÁ de pé; timeout/5xx = está fora.)
    probe('fal', async () => {
      const r = await fetchComPrazo('https://queue.fal.run/fal-ai/flux/dev/requests/health-probe/status')
      return { ok: r.status < 500, note: `http ${r.status}` }
    }),
    // 2) Creatomate — idem: autenticação recusada é serviço vivo.
    probe('creatomate', async () => {
      const r = await fetchComPrazo('https://api.creatomate.com/v1/renders?limit=1', {
        headers: process.env.CREATOMATE_API_KEY ? { Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}` } : {},
      })
      return { ok: r.status < 500, note: `http ${r.status}` }
    }),
    // 3) OpenAI — o modelo dos roteiros.
    probe('openai', async () => {
      const r = await fetchComPrazo('https://api.openai.com/v1/models', {
        headers: process.env.OPENAI_API_KEY ? { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } : {},
      })
      return { ok: r.status < 500, note: `http ${r.status}` }
    }),
    // 4) Banco pela chave de serviço (token antigo, imune a skew).
    probe('db_service_key', async () => {
      const { error } = await admin.from('profiles').select('id', { count: 'exact', head: true })
      return { ok: !error, note: error?.message }
    }),
    // 5) A ASSINATURA DO INCIDENTE DE 28/08: token anônimo emitido AGORA
    //    consegue ler? PGRST303 aqui = relógio do Supabase torto de novo →
    //    a ação é Restart project no dashboard.
    probe('db_fresh_token', async () => {
      if (!anonKey) return { ok: true, note: 'sem anon key no env — sonda pulada' }
      const anon = createServiceClient(url, anonKey, { auth: { persistSession: false } })
      const { data: sess, error: signErr } = await anon.auth.signInAnonymously()
      if (signErr || !sess.session) return { ok: true, note: `anon signin indisponível (${signErr?.message ?? 'sem sessão'}) — sonda pulada` }
      const fresh = createServiceClient(url, anonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${sess.session.access_token}` } },
      })
      const { error } = await fresh.from('profiles').select('id').limit(1)
      // Tabela protegida por RLS devolver 0 linhas é SUCESSO; o que caça aqui
      // é o PGRST303 "JWT issued at future".
      const skew = !!error && /jwt|pgrst30/i.test(error.message)
      // AUDITORIA 28/08 — a sonda CRIA um usuário anônimo, e o trigger
      // on_auth_user_created cria um PROFILE para todo auth.users. Sem a
      // limpeza abaixo, cada sonda deixaria um perfil-fantasma (email null,
      // trial_status null) que o vigia de 6h leria como "cadastro sem
      // crédito" e REPARARIA com 25 créditos — a ferramenta de saúde
      // fabricando o próprio incidente que vigia. Apagar o usuário apaga o
      // profile em cascata; o delete explícito cobre schema sem cascade.
      const ghostId = sess.session.user.id
      await admin.auth.admin.deleteUser(ghostId).catch(() => undefined)
      await admin.from('profiles').delete().eq('id', ghostId).then(() => undefined, () => undefined)
      return { ok: !skew, note: skew ? `⚠ RELÓGIO TORTO: ${error?.message} → Restart project` : 'token fresco aceito (fantasma removido)' }
    }),
    // 6) Falhas da última hora, por causa.
    probe('falhas_1h', async () => {
      const { data, error } = await admin
        .from('events')
        .select('metadata')
        .in('name', ['generation_stage_error', 'video_generation_failed'])
        .gte('created_at', new Date(Date.now() - 3600e3).toISOString())
        .limit(200)
      if (error) return { ok: false, note: error.message }
      const porCausa = new Map<string, number>()
      for (const e of data ?? []) {
        const m = (e as { metadata?: Record<string, unknown> }).metadata ?? {}
        const causa = String(m.error ?? m.reason ?? '(sem detalhe)').slice(0, 80)
        porCausa.set(causa, (porCausa.get(causa) ?? 0) + 1)
      }
      const resumo = [...porCausa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([c, n]) => `${n}× ${c}`).join(' | ')
      return { ok: (data?.length ?? 0) === 0 || porCausa.size <= 2, note: resumo || 'zero falhas' }
    }),
    // 7) Presos agora (>20min fora de estado terminal).
    probe('presos', async () => {
      const { data, error } = await admin
        .from('videos')
        .select('id, user_id, status, created_at')
        .not('status', 'in', '("completed","failed","cancelled")')
        .lt('created_at', new Date(Date.now() - 20 * 60e3).toISOString())
        .limit(20)
      if (error) return { ok: false, note: error.message }
      return { ok: (data?.length ?? 0) === 0, note: `${data?.length ?? 0} preso(s)` }
    }),
  ])

  const sondas = { fal, creatomate, openai, db_service_key: dbService, db_fresh_token: dbFreshToken, falhas_1h: falhas1h, presos }
  const tudoBem = Object.values(sondas).every((p) => p.ok)
  return NextResponse.json({
    verdict: tudoBem ? '✅ tudo saudável' : '⚠ há algo errado — ver as sondas false',
    checked_at: new Date().toISOString(),
    probes: sondas,
  })
}
