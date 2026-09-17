// KINEO-1-COERENCIA-2026-09-16 — nota automática de coerência do Kineo 1.
//
// Decisão do fundador (16/09, noite): "O mais importante é a gente rever a qualidade do Kineo 1;
// ele precisa ser muito bom para as pessoas assinarem — o que a pessoa escrever precisa estar
// coerente no vídeo." Até hoje a coerência só era vista abrindo filme por filme na mão. Os casos
// abertos hoje mostraram três jeitos de o filme "não ser sobre nada":
//   · a pessoa colou a nossa própria tela (globaloutreach33) → lib/promptGuard.ts;
//   · a pessoa apertou Generate com a pílula sozinha ("The incredible true story of", 28 caracteres:
//     wisadot849 às 18:43; "The unsolved mystery of", 23 caracteres: uldanai148 às 03:16) e o
//     roteirista INVENTOU a história (cidade escondida na Amazônia / hiker sumido em 1967) →
//     isBareStarter em lib/promptGuard.ts, recusa nas duas portas;
//   · o banco de imagens não tem a cena e o filme recicla um clipe de outra cena.
//
// O que este módulo faz: para cada filme do Kineo 1, compara (a) o que a pessoa ESCREVEU com o
// que foi NARRADO e (b) a narração de cada cena com o VISUAL que a cena recebeu (a busca usada,
// a origem do clipe — stock / still gerado / clipe reciclado — e as tags do clipe escolhido).
// Devolve nota 0-100, veredito e problemas nomeados. É um juiz por texto: ele lê o PLANO visual
// (busca + tags), não os pixels — o que hoje é possível sem ffmpeg no servidor, e já pega os
// três defeitos acima. A rota do Kineo 1 grava a EVIDÊNCIA por cena (fast_scene_plan) sem custo
// nem latência; a nota é calculada quando o painel abre (ou por quem chamar scoreFastCoherence)
// e gravada uma vez como evento fast_coherence — nunca no caminho da pessoa.

import { isBareStarter, looksLikeOurOwnUi } from '@/lib/promptGuard'

export const FAST_SCENE_PLAN_EVENT = 'fast_scene_plan'
export const FAST_COHERENCE_EVENT = 'fast_coherence'
// v2 (16/09 noite): (1) ideia curta é para ser DESENVOLVIDA — acrescentar fatos/cenas no mesmo assunto é certo, não
// desvio (a v1 punia "narration adds details not in prompt" em ideias de uma linha); (2) `videos.topic` é cortado em
// 500 caracteres (9 de 21 filmes de hoje tinham despacho de 835-1.756) — o juiz recebe o texto mais longo que existir
// (fast_scene_plan.topic inteiro para filmes novos; claim/vídeo para os antigos) e é avisado quando o texto pode
// estar truncado. Mudar a versão faz o painel julgar de novo (o leitor só aceita nota da versão vigente).
// v3 (16/09 noite, fundador: "estou vendo coisas em outras línguas… tem que deixar tudo em português"): o juiz
// escreve resumo e problemas em PORTUGUÊS e devolve `request_pt` — uma linha, em português, dizendo o que a
// pessoa pediu, seja qual for a língua do prompt (polonês, espanhol, hindi…). O quadro lê isso.
export const FAST_COHERENCE_VERSION = 'k1_coerencia_v3'
export const TOPIC_TRUNCATION_HINT = 500

export type FastSceneEvidence = {
  scene: number
  voiceover: string
  query: string | null
  /** índice do primeiro clipe desta cena em clipSources (preenchido pela rota) */
  from: number
  sources: string[]
  tags: string[]
}

export type CoherenceVerdict = 'coherent' | 'partial' | 'off'

export type FastCoherenceResult = {
  version: string
  score: number
  prompt_vs_narration: number
  narration_vs_visuals: number | null
  verdict: CoherenceVerdict
  problems: string[]
  worst_scene: number | null
  summary: string
  /** v3 — o que a pessoa pediu, em uma linha, em português (qualquer língua de origem) */
  request_pt: string
  has_evidence: boolean
  model: string | null
  ms: number
}

export function verdictFor(score: number): CoherenceVerdict {
  if (score >= 75) return 'coherent'
  if (score >= 50) return 'partial'
  return 'off'
}

const SOURCE_MEANING: Record<string, string> = {
  pixabay: 'stock clip found by the query',
  aiStill: 'image generated from this scene text (matches the line by construction)',
  aiHook: 'AI-generated opener about the topic',
  fallbackA: 'clip RECYCLED from an earlier scene (probably unrelated to this line)',
  stockLibrary: 'generic library clip (weak match)',
  user: "the customer's own footage",
  none: 'no footage at all',
  // R3 — motores de IA (cinematic_dispatch_result): o prompt é a cena inteira; rejeitada = buraco no filme.
  aiVideo: 'AI-generated video clip rendered from exactly this prompt',
  rejected: 'scene REJECTED by the provider — this shot is MISSING from the film',
}

/** R3 — motores de IA: o visual da cena é o prompt exato enviado ao gerador, não uma busca de stock. */
export function isAiEngine(engine: string | null | undefined): boolean {
  return !!engine && engine !== 'fast'
}

const clamp = (n: unknown): number => {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v)))
}

/** Monta as mensagens do juiz. Exportado para o guardião provar o que o modelo lê. */
export function buildCoherenceMessages(input: { prompt: string; narration: string; scenes?: FastSceneEvidence[] | null; promptMayBeTruncated?: boolean; engine?: string | null }) {
  const ai = isAiEngine(input.engine)
  const scenes = input.scenes ?? []
  const sceneLines = scenes
    .map((s) => {
      const src = s.sources.length ? s.sources.map((x) => `${x} (${SOURCE_MEANING[x] ?? x})`).join(' + ') : 'none'
      const tags = s.tags.filter(Boolean).slice(0, 3).join(' | ')
      if (ai) return `Scene ${s.scene}: generation prompt="${s.query ?? '—'}" | footage=${src}`
      return `Scene ${s.scene}: spoken="${s.voiceover.slice(0, 220)}" | query="${s.query ?? '—'}" | footage=${src}${tags ? ` | clip tags: ${tags.slice(0, 240)}` : ''}`
    })
    .join('\n')
  const system =
    'You audit short films made by an AI video tool. The customer typed a request; the tool wrote a narration and picked footage per scene. ' +
    'Judge two things. (1) prompt_vs_narration: does the narration tell the story the customer asked for — same subject, same facts/angle, nothing invented that the customer did not ask for? ' +
    'Two kinds of request exist. A SHORT IDEA (a title, a topic, a few sentences): the tool is SUPPOSED to develop it — adding accurate facts, scenes, a hook and a payoff on the same subject is correct and scores high (85-100); penalize only when the subject, the angle or the named people/places drift, or when claims contradict the request. A FULL SCRIPT (long, sentence by sentence): the narration must follow it closely; rewording, cuts and additions lower the score. ' +
    (ai
      ? '(2) narration_vs_visuals: the film is AI-generated shot by shot; each scene lists the exact generation prompt. Read the narration in order and judge whether the sequence of prompts depicts its subject, the named people/places/objects and the actions being described, in the right order; a prompt about something the narration never mentions, or a key moment of the narration with no shot, lowers the score; a REJECTED scene is a hole in the film. '
      : '(2) narration_vs_visuals: per scene, does the footage plan match what is being said? Footage described as "generated from this scene text" matches by construction; ' +
        '"recycled from an earlier scene" or "generic library clip" usually does not; stock clips match when the query and clip tags describe what the line talks about. ') +
    'Be strict and concrete. Reply ONLY with JSON: {"prompt_vs_narration": 0-100, "narration_vs_visuals": 0-100 or null when no scenes are given, ' +
    '"problems": [up to 4 short strings IN BRAZILIAN PORTUGUESE naming the specific mismatch, empty when none], "worst_scene": scene number or null, "summary": one sentence IN BRAZILIAN PORTUGUESE (max 160 chars), ' +
    '"request_pt": one line IN BRAZILIAN PORTUGUESE (max 140 chars) saying what the customer asked for, whatever language they wrote in}. ' +
    'ALL of summary, problems and request_pt are written in Brazilian Portuguese even when the customer text and the narration are in Spanish, English or any other language.'
  const user =
    `CUSTOMER WROTE${input.promptMayBeTruncated ? ' (stored text may be CUT (the store keeps 500-1,000 characters) — do not penalize narration that plausibly continues it)' : ''}:\n"""${input.prompt.slice(0, 5000)}"""\n\nNARRATION THE FILM USED:\n"""${input.narration.slice(0, 2600)}"""\n\n` +
    (scenes.length ? `SCENES (${ai ? 'generation prompt per shot, in order' : 'spoken line → footage plan'}):\n${sceneLines}` : 'SCENES: not recorded for this film (judge only prompt_vs_narration; set narration_vs_visuals to null).')
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]
}

/** Casos que não precisam de juiz: a resposta é conhecida. */
export function knownCoherenceCase(prompt: string): { result: Omit<FastCoherenceResult, 'ms' | 'has_evidence'> } | null {
  if (looksLikeOurOwnUi(prompt)) {
    return {
      result: {
        version: FAST_COHERENCE_VERSION,
        score: 0,
        prompt_vs_narration: 0,
        narration_vs_visuals: null,
        verdict: 'off',
        problems: ['O prompt era a própria página do Kineo colada na caixa — não havia ideia para ser fiel.'],
        worst_scene: null,
        summary: 'O texto era a nossa própria tela colada; o filme narra a interface.',
        request_pt: 'Colou a tela do Kineo na caixa (não é um pedido).',
        model: null,
      },
    }
  }
  if (isBareStarter(prompt)) {
    return {
      result: {
        version: FAST_COHERENCE_VERSION,
        score: 0,
        prompt_vs_narration: 0,
        narration_vs_visuals: null,
        verdict: 'off',
        problems: ['O prompt era uma frase de abertura inacabada (ex.: "The unsolved mystery of") — a história foi inventada, não pedida.'],
        worst_scene: null,
        summary: 'Frase inacabada (pílula sozinha); o assunto foi inventado pelo roteirista.',
        request_pt: 'Só a frase de abertura, sem assunto.',
        model: null,
      },
    }
  }
  return null
}

/**
 * Nota de coerência de UM filme. Falha aberta: qualquer erro devolve null (nunca lança).
 * Custo: uma chamada gpt-4o-mini (~US$ 0,001). Nunca roda no caminho da pessoa.
 */
export async function scoreFastCoherence(
  input: { prompt: string; narration: string; scenes?: FastSceneEvidence[] | null; promptMayBeTruncated?: boolean; engine?: string | null },
  opts?: { timeoutMs?: number; fetchImpl?: typeof fetch; model?: string },
): Promise<FastCoherenceResult | null> {
  const started = Date.now()
  const hasEvidence = Array.isArray(input.scenes) && input.scenes.length > 0
  const known = knownCoherenceCase(input.prompt)
  if (known) return { ...known.result, has_evidence: hasEvidence, ms: Date.now() - started }
  if (!input.prompt.trim() || !input.narration.trim()) return null
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  const model = opts?.model ?? 'gpt-4o-mini'
  const doFetch = opts?.fetchImpl ?? fetch
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 15_000)
  try {
    const res = await doFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: buildCoherenceMessages(input),
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const raw = data.choices?.[0]?.message?.content ?? ''
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return null
    }
    return normalizeCoherence(parsed, { hasEvidence, model, ms: Date.now() - started })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Do JSON do juiz para a nota final. A NOTA e o VEREDITO nascem AQUI (código), nunca da confiança no modelo. */
export function normalizeCoherence(parsed: Record<string, unknown>, ctx: { hasEvidence: boolean; model: string | null; ms: number }): FastCoherenceResult {
  const pvn = clamp(parsed.prompt_vs_narration)
  const nvvRaw = parsed.narration_vs_visuals
  const nvv = ctx.hasEvidence && nvvRaw != null && Number.isFinite(Number(nvvRaw)) ? clamp(nvvRaw) : null
  const score = nvv == null ? pvn : Math.round(pvn * 0.5 + nvv * 0.5)
  const problems = Array.isArray(parsed.problems)
    ? (parsed.problems as unknown[]).filter((p): p is string => typeof p === 'string' && p.trim().length > 0).map((p) => p.trim().slice(0, 200)).slice(0, 4)
    : []
  const ws = parsed.worst_scene
  const worst = typeof ws === 'number' && Number.isFinite(ws) && ws > 0 ? Math.round(ws) : null
  return {
    version: FAST_COHERENCE_VERSION,
    score,
    prompt_vs_narration: pvn,
    narration_vs_visuals: nvv,
    verdict: verdictFor(score),
    problems,
    worst_scene: worst,
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 200) : '',
    request_pt: typeof parsed.request_pt === 'string' ? parsed.request_pt.trim().slice(0, 160) : '',
    has_evidence: ctx.hasEvidence,
    model: ctx.model,
    ms: ctx.ms,
  }
}
