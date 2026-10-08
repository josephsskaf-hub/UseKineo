// KINEO-GEO-CITACAO-SEMANAL-2026-10-08 — monitor SEMANAL de citação no ChatGPT (aprovado pelo fundador em 08/10).
//
// POR QUÊ: o ChatGPT é o canal que paga (46% dos cadastros e 100% dos pagantes dos últimos 28 dias) e a citação só era
// medida à mão. Toda segunda, 12:00 UTC (09:00 BRT), o cron da Vercel chama esta rota; ela faz as perguntas fixas de
// lib/geo/citationMonitor.ts ao modelo da OpenAI COM busca na web e grava 1 evento `geo_citation_check` por pergunta
// (a Kineo aparece? usekineo.com é citado? quais concorrentes?) e 1 `geo_citation_summary` com os totais da rodada.
// Leitura semana a semana: docs/queries/GEO-CITACOES.sql.
//
// CUSTO (centavos por semana, por construção):
//   · no máximo GEO_MAX_CALLS_PER_RUN (12) chamadas por execução — a lista é cortada no teto, o contador barra a 13ª
//     antes de gastar e cada pergunta faz UMA chamada, com maxRetries 0 (o SDK não repete sozinho) e timeout próprio;
//   · uma execução por semana ISO: o resumo nasce ANTES da 1ª chamada com id determinístico (sha256 da semana, o mesmo
//     truque do annual-credit-refill). Cron entregue duas vezes ou clique repetido → 23505 → nada é chamado.
//     `&force=1` roda de novo na mesma semana (rodada manual depois de um conserto);
//   · preço conferido em 08/10: web_search_preview em modelo não-raciocínio = US$ 25 / 1.000 buscas, gpt-4.1-mini =
//     US$ 0,40 / 1,60 por milhão de tokens → 12 × US$ 0,025 + tokens ≈ US$ 0,31 por semana.
//
// ENSAIO POR PADRÃO: sem `?confirm=SEND` só devolve o plano (perguntas, modelo, teto e custo máximo) — zero chamada à
// OpenAI, zero escrita no banco. O vercel.json agenda COM o token (lição de 01/09: dois crons dormiram 30 dias sem ele).
// Uma pergunta que falha (timeout, 429, 5xx) vira evento ok:false e as outras seguem.
//
// Acesso: CRON_SECRET (Bearer), falha fechada — sem a env, 401 sempre (a Vercel manda o cabeçalho nas rotas do vercel.json).
// Os dois nomes de evento estão no SERVER_ONLY_EVENTS de app/api/events: o navegador não consegue forjar a medição.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createHash, randomUUID } from 'node:crypto'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { openai } from '@/lib/openai'
import {
  GEO_ANSWER_MAX_CHARS,
  GEO_CALL_TIMEOUT_MS,
  GEO_CHECK_EVENT,
  GEO_CONCURRENCY,
  GEO_INSTRUCTIONS,
  GEO_MAX_CALLS_PER_RUN,
  GEO_MAX_OUTPUT_TOKENS,
  GEO_MODEL,
  GEO_MONITOR_VERSION,
  GEO_QUESTIONS,
  GEO_ROUTE_PATH,
  GEO_RUN_BUDGET_MS,
  GEO_SUMMARY_EVENT,
  analyzeCitationAnswer,
  citedHosts,
  estimateGeoUsd,
  flattenResponseOutput,
  geoCostCeilingUsd,
  geoPlan,
  geoWeekStart,
  type GeoCitationAnalysis,
  type GeoQuestion,
} from '@/lib/geo/citationMonitor'

export const dynamic = 'force-dynamic'
// KINEO-DATA-CACHE-2026-09-02 — rota só-GET no Next 14.2: sem isto o supabase-js lê o banco do primeiro pedido para
// sempre. Não remover.
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
// Pior caso: ceil(12 / 3) ondas × 40 s = 160 s de chamadas + as gravações; GEO_RUN_BUDGET_MS (200 s) para de começar
// pergunta nova antes do fim, para o resumo sempre caber.
export const maxDuration = 300

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

/** uuid determinístico: sha256 da chave (mesmo formato do annual-credit-refill). */
function eventIdFor(key: string): string {
  const h = createHash('sha256').update(key).digest('hex').slice(0, 32)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

type CheckOutcome = {
  question: GeoQuestion
  ok: boolean
  error: string | null
  analysis: GeoCitationAnalysis | null
  searches: number
  inputTokens: number
  outputTokens: number
  inserted: boolean
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const write = req.nextUrl.searchParams.get('confirm') === 'SEND'
  const force = req.nextUrl.searchParams.get('force') === '1'
  // Teto 1: a lista fixa cortada em GEO_MAX_CALLS_PER_RUN.
  const plan = geoPlan(GEO_QUESTIONS)
  const week = geoWeekStart(Date.now())

  if (!write) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      version: GEO_MONITOR_VERSION,
      week,
      model: GEO_MODEL,
      max_calls_per_run: GEO_MAX_CALLS_PER_RUN,
      planned: plan.length,
      questions: plan,
      est_usd_max: geoCostCeilingUsd(plan.length),
      openai_key_present: Boolean(process.env.OPENAI_API_KEY),
      hint: 'add ?confirm=SEND to ask the model and write the events',
    })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'service unavailable' }, { status: 503 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 })
  const admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: freshFetch } })

  const started = Date.now()
  const runId = eventIdFor(`${GEO_SUMMARY_EVENT}:${week}${force ? `:force:${randomUUID()}` : ''}`)
  const base = { version: GEO_MONITOR_VERSION, run_id: runId, week, model: GEO_MODEL, forced: force }

  // A trava de 1 rodada por semana: o resumo nasce antes de qualquer chamada paga.
  const claim = await admin.from('events').insert({
    id: runId,
    name: GEO_SUMMARY_EVENT,
    path: GEO_ROUTE_PATH,
    metadata: { ...base, status: 'running', planned: plan.length, started_at: new Date(started).toISOString() },
  })
  if (claim.error) {
    if (claim.error.code === '23505') {
      return NextResponse.json({ ok: true, dry_run: false, skipped: 'already_ran_this_week', week, run_id: runId })
    }
    console.error('[cron/geo-citation-monitor] claim failed:', claim.error.message)
    return NextResponse.json({ ok: false, error: 'events_unavailable' }, { status: 503 })
  }

  let calls = 0
  // Nunca lança: o erro de uma pergunta vira o evento dela (ok:false) e as outras seguem.
  const checkOne = async (question: GeoQuestion): Promise<CheckOutcome> => {
    const out: CheckOutcome = { question, ok: false, error: null, analysis: null, searches: 0, inputTokens: 0, outputTokens: 0, inserted: false }
    const t0 = Date.now()
    let answer: Record<string, unknown> = {}
    if (t0 - started > GEO_RUN_BUDGET_MS) {
      out.error = 'run_budget'
    } else if (calls >= GEO_MAX_CALLS_PER_RUN) {
      // Teto 2: o contador barra a chamada além do teto ANTES de gastar, mesmo que o plano venha maior.
      out.error = 'call_cap'
    } else {
      calls += 1
      try {
        const res = await openai.responses.create(
          {
            model: GEO_MODEL,
            tools: [{ type: 'web_search_preview', search_context_size: 'low' }],
            tool_choice: { type: 'web_search_preview' },
            store: false,
            max_output_tokens: GEO_MAX_OUTPUT_TOKENS,
            instructions: GEO_INSTRUCTIONS,
            input: question.text,
          },
          { timeout: GEO_CALL_TIMEOUT_MS, maxRetries: 0 },
        )
        const flat = flattenResponseOutput((res as { output?: unknown }).output)
        out.searches = flat.searches
        out.inputTokens = Number((res as { usage?: { input_tokens?: number } }).usage?.input_tokens ?? 0) || 0
        out.outputTokens = Number((res as { usage?: { output_tokens?: number } }).usage?.output_tokens ?? 0) || 0
        const status = (res as { status?: unknown }).status
        if (!flat.text.trim()) {
          out.error = `empty_${typeof status === 'string' ? status : 'response'}`
        } else {
          out.ok = true
          out.analysis = analyzeCitationAnswer(flat.text, flat.urls)
          answer = {
            ...out.analysis,
            cited_hosts: citedHosts(flat.urls),
            cited_urls: flat.urls.length,
            response_status: typeof status === 'string' ? status : null,
            truncated: status === 'incomplete',
            answer: flat.text.slice(0, GEO_ANSWER_MAX_CHARS),
          }
        }
      } catch (e) {
        const st = (e as { status?: unknown })?.status
        out.error = typeof st === 'number' ? `openai_${st}` : e instanceof Error && /timeout/i.test(e.name + e.message) ? 'timeout' : 'openai_error'
      }
    }
    try {
      const { error } = await admin.from('events').insert({
        name: GEO_CHECK_EVENT,
        path: GEO_ROUTE_PATH,
        metadata: {
          ...base,
          question_id: question.id,
          question: question.text,
          ok: out.ok,
          ...(out.error ? { error: out.error } : {}),
          ...answer,
          searches: out.searches,
          input_tokens: out.inputTokens,
          output_tokens: out.outputTokens,
          ms: Date.now() - t0,
        },
      })
      out.inserted = !error
      if (error) console.error('[cron/geo-citation-monitor] check insert failed:', question.id, error.message)
    } catch (e) {
      console.error('[cron/geo-citation-monitor] check insert threw:', question.id, e instanceof Error ? e.message : String(e))
    }
    return out
  }

  // Poço de GEO_CONCURRENCY trabalhadores sobre o plano.
  const outcomes: CheckOutcome[] = new Array(plan.length)
  let next = 0
  const worker = async () => {
    for (let i = next++; i < plan.length; i = next++) outcomes[i] = await checkOne(plan[i])
  }
  await Promise.all(Array.from({ length: Math.min(GEO_CONCURRENCY, plan.length) }, worker))

  const answered = outcomes.filter((o) => o.ok)
  const competitors: Record<string, number> = {}
  for (const o of answered) for (const c of o.analysis?.competitors_mentioned ?? []) competitors[c] = (competitors[c] ?? 0) + 1
  const searches = outcomes.reduce((s, o) => s + o.searches, 0)
  const inputTokens = outcomes.reduce((s, o) => s + o.inputTokens, 0)
  const outputTokens = outcomes.reduce((s, o) => s + o.outputTokens, 0)
  const insertErrors = outcomes.filter((o) => !o.inserted).length
  const summary = {
    ...base,
    status: 'done',
    planned: plan.length,
    calls,
    answered: answered.length,
    failed: outcomes.length - answered.length,
    mentions_kineo: answered.filter((o) => o.analysis?.mentions_kineo).length,
    cites_usekineo: answered.filter((o) => o.analysis?.cites_usekineo).length,
    competitors,
    searches,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    est_usd: estimateGeoUsd({ searches, inputTokens, outputTokens }),
    insert_errors: insertErrors,
    started_at: new Date(started).toISOString(),
    finished_at: new Date().toISOString(),
    ms: Date.now() - started,
  }
  const { error: summaryError } = await admin.from('events').update({ metadata: summary }).eq('id', runId)
  if (summaryError) console.error('[cron/geo-citation-monitor] summary update failed:', summaryError.message)
  console.log(`[cron/geo-citation-monitor] week ${week}: ${answered.length}/${plan.length} answered, Kineo in ${summary.mentions_kineo}, usekineo.com cited in ${summary.cites_usekineo}, ~US$ ${summary.est_usd}`)

  const ok = insertErrors === 0 && !summaryError
  return NextResponse.json(
    {
      ok,
      dry_run: false,
      ...summary,
      results: outcomes.map((o) => ({
        id: o.question.id,
        ok: o.ok,
        error: o.error,
        mentions_kineo: o.analysis?.mentions_kineo ?? null,
        cites_usekineo: o.analysis?.cites_usekineo ?? null,
      })),
    },
    { status: ok ? 200 : 500 },
  )
}
