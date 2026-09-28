// KINEO-PLANO-B-OPENAI-2026-09-28 — sonda do plano B de texto (lib/llmFallback.ts).
//
// O plano B manda chat.completions pela fal (roteador OpenRouter compatível com a OpenAI) quando a
// OpenAI cai — 26-27/09 a conta ficou sem crédito e 59 tentativas de 9 pessoas externas morreram no
// roteiro. Os ids 'openai/gpt-4o' e 'openai/gpt-4o-mini' e o response_format json_object NUNCA foram
// verificados no roteador da fal (a documentação não lista ids). Esta rota verifica, logo depois do
// deploy, chamando o cliente do plano B DIRETO (sem passar pela OpenAI, sem o wrapper) com um prompt
// minúsculo, e devolve só {ok, model, ms, sample truncado, error_status}. Não grava evento
// `llm_fallback_used` (sonda não é uso orgânico), não manda e-mail, não lê dado de usuário, não expõe
// chave. Custo: 2 chamadas de ~40 tokens do saldo da fal.
// Uso (logado com conta admin): /api/admin/llm-fallback-probe
// Gate idêntico a todo /api/admin/*: sessão por cookie + allowlist.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '../_shared/db'
import {
  FAL_OPENAI_ROUTER_BASE_URL,
  LLM_FALLBACK_ENABLED,
  falRouterClient,
  isRealChatCompletion,
  primaryStatusOf,
} from '@/lib/llmFallback'

export const dynamic = 'force-dynamic'
// Rota SÓ-GET (KINEO-DATA-CACHE-2026-09-02): sem este interruptor o Data Cache da Vercel serviria a
// primeira resposta para sempre. Declarado antes do primeiro await.
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 60

const PROBE_MODELS = ['openai/gpt-4o-mini', 'openai/gpt-4o'] as const
const PROBE_TIMEOUT_MS = 20_000

type ProbeResult = {
  ok: boolean
  model: string
  ms: number
  json_ok: boolean
  sample: string | null
  error_status?: number | 'connection' | null
  error?: string
}

function semSegredo(text: string, falKey: string): string {
  return text.slice(0, 200).split(falKey).join('[fal-key]')
}

async function probe(model: string, falKey: string): Promise<ProbeResult> {
  const t0 = Date.now()
  try {
    const body = {
      model,
      temperature: 0,
      max_tokens: 40,
      response_format: { type: 'json_object' as const },
      messages: [
        { role: 'system' as const, content: 'You are a health probe. Reply with a single JSON object and nothing else.' },
        { role: 'user' as const, content: 'Return exactly {"ok":true,"probe":"kineo-plano-b"} as JSON.' },
      ],
    }
    const completion = await falRouterClient(falKey).chat.completions.create(body, { timeout: PROBE_TIMEOUT_MS, maxRetries: 0 })
    const content = completion.choices?.[0]?.message?.content ?? ''
    let jsonOk = false
    try {
      const parsed = JSON.parse(content) as { ok?: unknown }
      jsonOk = parsed?.ok === true
    } catch {
      jsonOk = false
    }
    // FIX-REVISAO-2 (KINEO-PLANO-B-OPENAI-2026-09-28) — a sonda aprova pela MESMA régua do plano B (isRealChatCompletion):
    // um 200 com erro no corpo ou finish_reason 'error' não pode dizer "ok" aqui e ser recusado no embrulho.
    return { ok: isRealChatCompletion(completion, body), model, ms: Date.now() - t0, json_ok: jsonOk, sample: content.slice(0, 120) }
  } catch (err) {
    return {
      ok: false,
      model,
      ms: Date.now() - t0,
      json_ok: false,
      sample: null,
      error_status: primaryStatusOf(err),
      error: semSegredo(err instanceof Error ? err.message : String(err), falKey),
    }
  }
}

export async function GET() {
  try {
    const cookieClient = createClient()
    const {
      data: { user },
    } = await cookieClient.auth.getUser()
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const falKey = process.env.FAL_KEY
    if (!falKey) {
      return NextResponse.json({
        ok: false,
        switch_on: LLM_FALLBACK_ENABLED,
        fal_key_present: false,
        base_url: FAL_OPENAI_ROUTER_BASE_URL,
        results: [],
      })
    }

    const results: ProbeResult[] = []
    for (const model of PROBE_MODELS) results.push(await probe(model, falKey))

    return NextResponse.json({
      ok: results.every((r) => r.ok && r.json_ok),
      switch_on: LLM_FALLBACK_ENABLED,
      fal_key_present: true,
      base_url: FAL_OPENAI_ROUTER_BASE_URL,
      checked_at: new Date().toISOString(),
      results,
    })
  } catch (err) {
    console.error('[admin/llm-fallback-probe] unexpected:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
