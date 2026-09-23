// DIRETOR-KINEO-20260923 — sugestão SÓ DE TEXTO para o Diretor Kineo no Studio.
// Garantias desta rota (provadas em scripts/test-diretor-kineo-2026-09-23.mjs):
//  · nunca gera, nunca cobra, nunca arma o token de consentimento do Generate, nunca chama analyze/generate;
//  · o escopo (o que pode mudar) é aplicado em código por lib/diretor/suggest, não confiado ao modelo;
//  · teto de DIRETOR_DAILY_CAP sugestões por pessoa em 24 h, contado ANTES de chamar o modelo;
//  · telemetria sem texto: só modo, motor, duração, idioma, formato, tamanhos e tempo.
// Custo: gpt-4o-mini (mesmo modelo de apply-suggestion), ~US$ 0,001 por sugestão.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { openai } from '@/lib/openai'
import { writeServerEvent } from '@/lib/serverEvents'
import { LANGUAGE_NAMES, narrationLanguage } from '@/lib/textLanguage'
import {
  DIRETOR_DAILY_CAP, DIRETOR_SERVED_EVENT, buildDiretorMessages, diretorScope, parseDiretorOutput, validateDiretorRequest,
} from '@/lib/diretor/suggest'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 })
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'unavailable' }, { status: 503 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }
    const v = validateDiretorRequest(body)
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
    const input = v.input
    const scope = diretorScope(input)
    // Modo literal sem consentimento e sem orientação visual ligada: não há o que o modelo possa mudar.
    if (!scope.mayRewriteText && !scope.mayAddVisual) return NextResponse.json({ error: 'nothing_to_suggest' }, { status: 400 })

    // Teto por pessoa ANTES do modelo (falha aberta só se a leitura falhar — o custo por chamada é de centavos).
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && svc) {
      const admin = createServiceClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
      const since = new Date(Date.now() - 24 * 3600_000).toISOString()
      const { count, error } = await admin.from('events').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('name', DIRETOR_SERVED_EVENT).gte('created_at', since)
      if (!error && (count ?? 0) >= DIRETOR_DAILY_CAP) return NextResponse.json({ error: 'daily_limit' }, { status: 429 })
    }

    const lang = narrationLanguage(input.language) ?? 'en'
    const { system, user: userMsg } = buildDiretorMessages(input, LANGUAGE_NAMES[lang])
    const completion = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
        temperature: 0.6,
        max_tokens: 1400,
        response_format: { type: 'json_object' },
      },
      { timeout: 20000, maxRetries: 0 },
    )
    const suggestion = parseDiretorOutput(completion.choices[0]?.message?.content ?? '', input)

    void writeServerEvent({
      name: DIRETOR_SERVED_EVENT,
      userId: user.id,
      path: '/api/diretor/suggest',
      metadata: {
        mode: input.mode, engine: input.engine, duration: input.duration, language: input.language, aspect: input.aspect,
        rewrite_consent: input.rewriteConsent, in_chars: input.text.length,
        out_chars: suggestion ? suggestion.text.length : 0, text_changed: suggestion?.textChanged ?? false,
        has_visual: Boolean(suggestion?.visual), changes: suggestion?.changes.length ?? 0, ok: Boolean(suggestion), ms: Date.now() - started,
      },
    })
    if (!suggestion) return NextResponse.json({ error: 'no_suggestion' }, { status: 502 })
    return NextResponse.json({ suggestion })
  } catch (e) {
    console.warn('[diretor/suggest] falhou:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'failed' }, { status: 502 })
  }
}
