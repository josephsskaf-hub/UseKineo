// KINEO-ADS-MODO-SIMPLES-2026-09-29 — pesquisa na web do modo simples do /ads/v2 ("eu quero que o resto todo você
// descubra" — fundador, 29/09). NÃO COBRA crédito do cliente e o /start não depende dela.
//
// Ordem das travas: login → acesso ao Studio Ads → v2 → corpo → pedido DO DONO em rascunho/planejado e no modo simples →
// pesquisa já gravada volta SEM chamar a OpenAI → teto diário (evento ads_v2_research_served, ANTES do modelo) →
// moderação da consulta → TRAVA condicional no pedido (brief.research nulo; quem perde a corrida recebe o gravado) →
// OpenAI Responses com web_search_preview forçada, store:false, sem localização nem id do usuário → fatos só com a
// anotação url_citation como fonte (lib/ads/v2Research.ts) → grava no pedido → evento só com contagens.
// Enquanto a pesquisa roda, o /plan recusa com 409 research_running: não existe plano (nem cobrança) antes dela acabar.
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/openai'
import { writeServerEvent } from '@/lib/serverEvents'
import { moderateContent } from '@/lib/safety/contentModeration'
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'
import { LANGUAGE_NAMES, narrationLanguage, resolveNarrationLanguage } from '@/lib/textLanguage'
import { adsGate, isMissingAdsTable, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsV2Visible } from '@/lib/ads/v2Access'
import { sanitizeResearchBody } from '@/lib/ads/v2Contract'
import { loadAdsV2Order } from '@/lib/ads/v2Advance'
import { adsV2LinkText } from '@/lib/ads/v2Link'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'
import {
  ADS_V2_RESEARCH_DAILY_CAP,
  ADS_V2_RESEARCH_MAX_OUTPUT_TOKENS,
  ADS_V2_RESEARCH_MODEL,
  ADS_V2_RESEARCH_TIMEOUT_MS,
  buildResearchMessages,
  estimateResearchUsd,
  factsFromPageText,
  firstLinkInSentence,
  flattenResearchOutput,
  parseResearchOutput,
  researchQuery,
  researchState,
  storedResearchFacts,
  type AdsV2ResearchDropped,
  type AdsV2ResearchFact,
} from '@/lib/ads/v2Research'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

/** O que a tela recebe: o estado e os fatos gravados (nunca o texto cru do modelo). */
function view(orderId: string, research: unknown, now: number) {
  const status = researchState(research, now)
  return v2Json({ order_id: orderId, status, facts: status === 'ok' ? storedResearchFacts(research) : [] })
}

export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    if (!process.env.OPENAI_API_KEY) return v2Fail('unavailable', 503)
    const { admin, reason } = await loadAdsAccess(user.id, user.email)
    const gate = adsGate(reason)
    if (gate !== 'ok') {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/api/ads/v2/research', metadata: { reason: gate } })
      return v2Fail(gate === 'closed' ? 'closed' : 'no_access', 403)
    }
    if (!adsV2Visible(user.email)) return v2Fail('v2_closed', 403)

    const parsed = sanitizeResearchBody(await req.json().catch(() => null))
    if (!parsed.ok) return v2Fail(parsed.error, 400)

    const { order, error } = await loadAdsV2Order(admin, parsed.value.order_id, user.id)
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('research_failed', 502)
    if (!order) return v2Fail('order_not_found', 404)
    if (order.status !== 'draft' && order.status !== 'planned') return v2Fail('not_editable', 409)
    const brief0 = (order.brief ?? {}) as Record<string, unknown>
    if (brief0.mode !== 'simple') return v2Fail('mode_mismatch', 400)

    // Já pesquisado (ou copiado de um rascunho anterior com a mesma frase): devolve o gravado, sem chamar o modelo.
    if (researchState(brief0.research, Date.now()) !== 'none') return view(order.id, brief0.research, Date.now())

    // Só a FRASE gravada no pedido vai à busca — nunca o preço nem o contato dos campos próprios.
    const sentence = typeof brief0.sentence === 'string' ? brief0.sentence : ''
    const query = researchQuery(sentence)
    if (query.length < 3) return v2Fail('research_needs_text', 400)

    // Teto diário ANTES do modelo.
    const since = new Date(Date.now() - 24 * 3600_000).toISOString()
    const cap = await admin.from('events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('name', 'ads_v2_research_served').gte('created_at', since)
    if (!cap.error && (cap.count ?? 0) >= ADS_V2_RESEARCH_DAILY_CAP) return v2Fail('daily_limit_research', 429)

    const safety = await moderateContent({ surface: 'ads_brief', stage: 'input', userId: user.id, text: query, meta: { order_id: order.id, v2: true, research: true } })
    if (!safety.ok) {
      return v2Fail(safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}`, moderationRefusalStatus(safety.reason), { message: moderationRefusalMessage(safety.reason) })
    }

    // TRAVA: só uma pesquisa por pedido. Condicional (dono + rascunho/planejado + research nulo); quem perde, lê o gravado.
    const lock = await admin
      .from('ads_v2_orders')
      .update({ brief: { ...brief0, research: { status: 'running', at: new Date().toISOString() } } })
      .eq('id', order.id)
      .eq('user_id', user.id)
      .in('status', ['draft', 'planned'])
      .is('brief->research', null)
      .select('id')
      .maybeSingle()
    if (lock.error) return isMissingAdsTable(lock.error.code) ? v2Fail('not_ready', 503) : v2Fail('research_failed', 502)
    if (!lock.data) {
      const again = await loadAdsV2Order(admin, order.id, user.id)
      return view(order.id, (again.order?.brief as Record<string, unknown> | null)?.research ?? null, Date.now())
    }

    const language = narrationLanguage(order.language) ?? resolveNarrationLanguage(undefined, sentence).language
    const msgs = buildResearchMessages(query, LANGUAGE_NAMES[language])
    let facts: AdsV2ResearchFact[] = []
    let dropped: AdsV2ResearchDropped | null = null
    let found = 0
    let searches = 0
    let inputTokens = 0
    let outputTokens = 0
    let why: string | null = null
    let source: 'web' | 'link' = 'web'
    try {
      const res = await openai.responses.create(
        {
          model: ADS_V2_RESEARCH_MODEL,
          tools: [{ type: 'web_search_preview', search_context_size: 'low' }],
          tool_choice: { type: 'web_search_preview' },
          store: false,
          max_output_tokens: ADS_V2_RESEARCH_MAX_OUTPUT_TOKENS,
          instructions: msgs.instructions,
          input: msgs.input,
        },
        { timeout: ADS_V2_RESEARCH_TIMEOUT_MS, maxRetries: 0 },
      )
      const flat = flattenResearchOutput((res as { output?: unknown }).output)
      searches = flat.searches
      inputTokens = Number((res as { usage?: { input_tokens?: number } }).usage?.input_tokens ?? 0) || 0
      outputTokens = Number((res as { usage?: { output_tokens?: number } }).usage?.output_tokens ?? 0) || 0
      const out = parseResearchOutput(flat.text, flat.annotations)
      facts = out.facts
      dropped = out.dropped
      found = out.found
      if (!facts.length) why = found ? 'all_dropped' : 'nothing_found'
    } catch (e) {
      const status = (e as { status?: unknown })?.status
      why = typeof status === 'number' ? `openai_${status}` : e instanceof Error && /timeout/i.test(e.name + e.message) ? 'timeout' : 'openai_error'
      // Plano B: a OpenAI recusou a ferramenta/o modelo (400) e a frase trazia o link do negócio → o que a página diz.
      const link = status === 400 ? firstLinkInSentence(sentence) : null
      if (link) {
        const page = await adsV2LinkText(link).catch(() => null)
        if (page) {
          const out = factsFromPageText(page.text, link)
          facts = out.facts
          dropped = out.dropped
          found = out.found
          source = 'link'
        }
      }
    }

    const ms = Date.now() - started
    const ok = facts.length > 0
    const stored = ok
      ? { status: 'ok', at: new Date().toISOString(), facts, model: ADS_V2_RESEARCH_MODEL, source, ms }
      : { status: 'failed', at: new Date().toISOString(), facts: [], model: ADS_V2_RESEARCH_MODEL, source, ms, why }
    await admin
      .from('ads_v2_orders')
      .update({ brief: { ...brief0, research: stored } })
      .eq('id', order.id)
      .eq('user_id', user.id)
      .in('status', ['draft', 'planned'])
    await writeServerEvent({
      name: 'ads_v2_research_served',
      userId: user.id,
      path: '/api/ads/v2/research',
      metadata: {
        order_id: order.id,
        ok,
        facts: facts.length,
        found,
        dropped,
        searches,
        ms,
        model: ADS_V2_RESEARCH_MODEL,
        source,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        usd_estimate: estimateResearchUsd({ searches, inputTokens, outputTokens }),
        why,
      },
    })
    return v2Json({ order_id: order.id, status: ok ? 'ok' : 'failed', facts })
  } catch (e) {
    console.warn('[ads/v2/research] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('research_failed', 502)
  }
}
