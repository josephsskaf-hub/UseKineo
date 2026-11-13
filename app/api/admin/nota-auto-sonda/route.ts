// KINEO-NOTA-AUTO-1MIN-1311 — SONDA do Vercel AI Gateway para o juiz da nota automática (pedido da CEO, 13/11 16:42).
//
// Faz UMA chamada mínima ao gateway (POST /v1/messages, ~20 tokens) com o token desta requisição e responde ok ou o erro.
// Autenticação (documentação da Vercel, vercel.com/docs/ai-gateway/authentication-and-byok/oidc): AI_GATEWAY_API_KEY tem
// precedência; senão o token OIDC que a Vercel põe no cabeçalho `x-vercel-oidc-token` de cada requisição à função implantada.
// A resposta diz QUAL origem foi usada (api_key / oidc_cabecalho / oidc_ambiente / nenhuma), nunca o token. Também lista os ids
// "anthropic/*" que o gateway oferece (GET /v1/models), para confirmar o nome exato do modelo antes de ligar o provedor.
// Uso (logado com conta admin): /api/admin/nota-auto-sonda  ·  ?modelo=anthropic/claude-opus-5.5 para testar outro.
// Gate idêntico a todo /api/admin/*: sessão por cookie + allowlist. Não grava evento, não lê dado de usuário.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '../_shared/db'
import { CLAUDE_NO_GATEWAY, GATEWAY_MODELOS_URL, GATEWAY_URL, lerProvedorNotaAuto, tokenDoGateway } from '@/lib/regua95/visaoProvedor'
import { lerModoNotaAuto } from '@/lib/regua95/notaRevisor'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  try {
    const cookieClient = createClient()
    const { data: { user } } = await cookieClient.auth.getUser()
    if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const modelo = (req.nextUrl.searchParams.get('modelo') || CLAUDE_NO_GATEWAY.haiku).slice(0, 80)
    const auth = tokenDoGateway(req)
    const config = { modo: lerModoNotaAuto(), ...lerProvedorNotaAuto() }
    if (!auth) return NextResponse.json({ ok: false, origem: 'nenhuma', config, erro: 'sem AI_GATEWAY_API_KEY e sem x-vercel-oidc-token nesta requisição (OIDC desligado no projeto?)' })

    const t0 = Date.now()
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 25_000)
    let status: number | 'conexao' = 'conexao'
    let amostra: string | null = null
    let erro: string | null = null
    try {
      const res = await fetch(GATEWAY_URL, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}`, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: modelo, max_tokens: 64, messages: [{ role: 'user', content: 'Reply with the single word: ok' }] }),
        cache: 'no-store',
      })
      status = res.status
      const txt = await res.text()
      if (res.ok) {
        try {
          const j = JSON.parse(txt) as { content?: Array<{ type?: string; text?: string }> }
          amostra = (j.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join(' ').slice(0, 80)
        } catch {
          amostra = txt.slice(0, 80)
        }
      } else {
        erro = txt.split(auth.token).join('[token]').slice(0, 300)
      }
    } catch (e) {
      erro = e instanceof Error ? e.message.slice(0, 160) : 'falha de conexão'
    } finally {
      clearTimeout(timer)
    }
    const ms = Date.now() - t0

    let modelosAnthropic: string[] | null = null
    try {
      const m = await fetch(GATEWAY_MODELOS_URL, { headers: { Authorization: `Bearer ${auth.token}` }, cache: 'no-store' })
      if (m.ok) {
        const j = (await m.json()) as { data?: Array<{ id?: string }> }
        modelosAnthropic = (j.data ?? []).map((x) => String(x.id ?? '')).filter((id) => id.startsWith('anthropic/')).sort()
      }
    } catch {
      /* a lista é só informação */
    }
    return NextResponse.json({ ok: status === 200 && !erro, origem: auth.origem, modelo, status, ms, amostra, erro, config, modelosAnthropic })
  } catch (e) {
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message.slice(0, 160) : 'erro' }, { status: 500 })
  }
}
