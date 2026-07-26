// KINEO-AUTOPILOT-2026-07-26 — de que o Short de hoje vai falar.
//
// Ordem de preferência:
//   1. niche_trends — a tabela que o cron refresh-niche-trends já popula 1x/dia
//      com temas frescos derivados de manchetes reais. Reusar isso é de graça e
//      mantém o Autopilot alinhado ao que está em alta HOJE.
//   2. OpenAI (gpt-4o-mini), mesmo modelo/estilo de prompt do refresh-niche-
//      trends, com lista de "não repita".
//   3. Fallback determinístico a partir do nicho — o Autopilot NUNCA fica sem
//      tema; um dia pulado por falta de assunto é um dia que o cliente pagou e
//      não recebeu.
//
// Anti-repetição: os últimos N temas daquela schedule entram como lista de
// exclusão em todos os três caminhos.

import type { SupabaseClient } from '@supabase/supabase-js'
import { openai } from '@/lib/openai'
import { buildSeriesContinuationPrompt, normalizeSeriesSeed } from '@/lib/seriesContinuation'

export interface TopicPick {
  topic: string
  source: 'niche_trends' | 'openai' | 'fallback'
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function isFresh(candidate: string, avoid: string[]): boolean {
  const c = normalize(candidate)
  if (c.length < 8) return false
  return !avoid.some((a) => {
    const n = normalize(a)
    return n.length > 0 && (n === c || n.includes(c) || c.includes(n))
  })
}

/** Últimos temas já usados por esta schedule (mais recente primeiro). */
export async function recentTopicsForSchedule(
  db: SupabaseClient,
  scheduleId: string,
  limit: number,
): Promise<string[]> {
  const { data, error } = await db
    .from('autopilot_runs')
    .select('topic')
    .eq('schedule_id', scheduleId)
    .not('topic', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.warn('[autopilot/topics] recent topics read failed:', error.message)
    return []
  }
  return (data ?? [])
    .map((r) => (r as { topic?: string | null }).topic ?? '')
    .filter((t) => t.length > 0)
}

async function fromNicheTrends(
  db: SupabaseClient,
  niche: string,
  avoid: string[],
): Promise<string | null> {
  if (!niche) return null
  const { data, error } = await db
    .from('niche_trends')
    .select('topic, run_at')
    .eq('vertical', niche)
    .order('run_at', { ascending: false })
    .limit(60)
  if (error || !data) return null
  for (const row of data) {
    const topic = ((row as { topic?: string | null }).topic ?? '').trim()
    if (topic && isFresh(topic, avoid)) return topic
  }
  return null
}

async function fromOpenAi(args: {
  niche: string
  tone: string
  language: string
  avoid: string[]
}): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null
  try {
    const avoidLine = args.avoid.length > 0
      ? `\n\nDo NOT repeat or closely paraphrase any of these already-used topics:\n- ${args.avoid.join('\n- ')}`
      : ''
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.9,
      max_tokens: 80,
      messages: [
        {
          role: 'system',
          content:
            'You write YouTube Short topic ideas for a US audience aged 18-34. One line, max 12 words, concrete and curiosity-driven (a specific fact, number, place, or question) — never a vague headline. Output EXACTLY 1 line, no numbering, no quotes, no extra text.',
        },
        {
          role: 'user',
          content: `Niche: ${args.niche || 'general curiosity'}\nTone: ${args.tone || 'punchy and factual'}\nLanguage: ${args.language || 'en'}${avoidLine}\n\nWrite 1 fresh Short topic idea for this niche.`,
        },
      ],
    })
    const raw = (completion.choices[0]?.message?.content ?? '')
      .split('\n')
      .map((l) => l.replace(/^[\s\-*•\d.)]+/, '').replace(/^["']|["']$/g, '').trim())
      .find((l) => l.length > 0)
    if (raw && isFresh(raw, args.avoid)) return raw.slice(0, 180)
    return null
  } catch (e) {
    console.warn('[autopilot/topics] openai pick failed:', e instanceof Error ? e.message : String(e))
    return null
  }
}

// Último recurso: nunca deixa a run sem tema. O sufixo com o dia mantém o
// prompt diferente do de ontem mesmo quando tudo acima falhou.
function fallbackTopic(niche: string, avoid: string[]): string {
  const base = niche.trim() || 'surprising facts'
  const angles = [
    `One thing almost nobody knows about ${base}`,
    `The most surprising fact about ${base}`,
    `Why ${base} works differently than you think`,
    `Three quick lessons about ${base}`,
    `The biggest myth about ${base}`,
  ]
  const fresh = angles.find((a) => isFresh(a, avoid))
  if (fresh) return fresh
  return `${angles[new Date().getUTCDate() % angles.length]} (${new Date().toISOString().slice(0, 10)})`
}

export async function pickTopic(args: {
  db: SupabaseClient
  scheduleId: string
  niche: string | null
  tone: string | null
  language: string | null
  avoid: string[]
}): Promise<TopicPick> {
  const niche = (args.niche ?? '').trim().toLowerCase()

  const trend = await fromNicheTrends(args.db, niche, args.avoid)
  if (trend) return { topic: trend, source: 'niche_trends' }

  const ai = await fromOpenAi({
    niche,
    tone: (args.tone ?? '').trim(),
    language: (args.language ?? 'en').trim(),
    avoid: args.avoid,
  })
  if (ai) return { topic: ai, source: 'openai' }

  return { topic: fallbackTopic(niche, args.avoid), source: 'fallback' }
}

/**
 * Prompt enviado ao pipeline de geração. Quando já existe um tema anterior,
 * reusa buildSeriesContinuationPrompt (lib/seriesContinuation.ts) para o canal
 * soar como uma SÉRIE contínua em vez de vídeos avulsos — é o mesmo texto que
 * o botão "next episode" do dashboard usa.
 */
export function buildAutopilotPrompt(args: {
  topic: string
  tone: string | null
  language: string | null
  previousTopic: string | null
}): string {
  const tone = (args.tone ?? '').trim()
  const language = (args.language ?? 'en').trim().toLowerCase()

  const seed = normalizeSeriesSeed(args.previousTopic)
  const continuation = seed ? buildSeriesContinuationPrompt(seed) : ''

  const parts = [`Create a YouTube Short about: ${args.topic}.`]
  if (continuation) {
    parts.push(
      `This channel is an ongoing series. ${continuation} The new episode's subject is "${args.topic}".`,
    )
  }
  if (tone) parts.push(`Tone: ${tone}.`)
  if (language && language !== 'en') parts.push(`Write the narration in language code "${language}".`)
  parts.push('Open with a hook in the first 2 seconds and end with a payoff.')
  return parts.join(' ')
}
