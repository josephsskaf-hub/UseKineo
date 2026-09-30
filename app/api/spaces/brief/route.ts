// KINEO-ESPACOS-2026-09-30 — pesquisa de curadoria do "Espaços" (lib/spaces/spaces.ts tem o porquê).
// POST { description, kind } → { brief: string[], prompt, searches } — como o espaço real daquela marca/estilo é por
// dentro (cores, materiais, móveis, sinalização, luz), via OpenAI Responses + web_search_preview, e o prompt de
// geração já com a régua "mantenha a arquitetura". A tela mostra a curadoria para a pessoa ajustar antes de gerar.
// Ordem: login → interruptor (404 fora da casa enquanto SPACES_PUBLIC=false) → moderação do pedido → teto diário →
// pesquisa (falhou = curadoria vazia, o pedido segue só com a descrição; nunca inventa) → evento.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { openai } from '@/lib/openai'
import { writeServerEvent } from '@/lib/serverEvents'
import { moderateContent } from '@/lib/safety/contentModeration'
import { isAdsInternalEmail } from '@/lib/ads/access'
import {
  SPACES_PUBLIC,
  SPACES_RESEARCH_DAILY_CAP,
  SPACES_RESEARCH_MAX_OUTPUT_TOKENS,
  SPACES_RESEARCH_MODEL,
  SPACES_RESEARCH_TIMEOUT_MS,
  SPACE_DESCRIPTION_MAX,
  SPACE_DESCRIPTION_MIN,
  SPACE_KINDS,
  buildSpaceResearchMessages,
  buildStagingPrompt,
  cleanLine,
  parseSpaceBrief,
  spacesVisibleFor,
  type SpaceKind,
} from '@/lib/spaces/spaces'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 45

const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })

/** Texto da resposta do Responses API + quantas buscas o modelo fez. */
function responseText(output: unknown): { text: string; searches: number } {
  let text = ''
  let searches = 0
  for (const it of Array.isArray(output) ? output : []) {
    const item = it as { type?: string; content?: unknown }
    if (item?.type === 'web_search_call') { searches++; continue }
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue
    for (const c of item.content as { type?: string; text?: string }[]) if (c?.type === 'output_text' && typeof c.text === 'string') text += c.text + '\n'
  }
  return { text, searches }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('unauthenticated', 401)
    if (!spacesVisibleFor(SPACES_PUBLIC, isAdsInternalEmail(user.email))) return fail('not_found', 404)

    const body = (await req.json().catch(() => null)) as { description?: unknown; kind?: unknown } | null
    const description = cleanLine(body?.description, SPACE_DESCRIPTION_MAX)
    if (description.length < SPACE_DESCRIPTION_MIN) return fail('description_required', 400)
    const kind: SpaceKind = SPACE_KINDS.includes(body?.kind as SpaceKind) ? (body!.kind as SpaceKind) : 'other'

    const verdict = await moderateContent({ surface: 'spaces', stage: 'input', userId: user.id, text: description })
    if (!verdict.ok) return fail(verdict.reason === 'blocked' ? 'blocked' : 'moderation_unavailable', verdict.reason === 'blocked' ? 422 : 503)

    // Teto diário por conta (conta os eventos das últimas 24 h; leitura falhou = não pesquisa).
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return fail('not_configured', 500)
    const admin = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const since = new Date(Date.now() - 24 * 3_600_000).toISOString()
    const cap = await admin.from('events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('name', 'spaces_brief_researched').gte('created_at', since)
    if (cap.error) return fail('research_failed', 502)
    if ((cap.count ?? 0) >= SPACES_RESEARCH_DAILY_CAP) return fail('daily_limit', 429)

    const msgs = buildSpaceResearchMessages(description, kind)
    let brief: string[] = []
    let searches = 0
    let why: string | null = null
    try {
      const res = await openai.responses.create(
        {
          model: SPACES_RESEARCH_MODEL,
          tools: [{ type: 'web_search_preview', search_context_size: 'low' }],
          tool_choice: { type: 'web_search_preview' },
          store: false,
          max_output_tokens: SPACES_RESEARCH_MAX_OUTPUT_TOKENS,
          instructions: msgs.instructions,
          input: msgs.input,
        },
        { timeout: SPACES_RESEARCH_TIMEOUT_MS, maxRetries: 0 },
      )
      const out = responseText((res as { output?: unknown }).output)
      searches = out.searches
      brief = parseSpaceBrief(out.text)
      if (!brief.length) why = 'nothing_found'
    } catch (e) {
      const status = (e as { status?: unknown })?.status
      why = typeof status === 'number' ? `openai_${status}` : 'openai_error'
    }

    await writeServerEvent({
      name: 'spaces_brief_researched',
      userId: user.id,
      path: '/api/spaces/brief',
      metadata: { kind, items: brief.length, searches, why, description_chars: description.length },
    })
    return NextResponse.json(
      { brief, prompt: buildStagingPrompt({ description, kind, brief }), searches, why },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    console.warn('[spaces/brief] falhou:', e instanceof Error ? e.message : String(e))
    return fail('research_failed', 502)
  }
}
