// KINEO-META95-REGUA-1910 — JUIZ DE COERÊNCIA v2 (a régua da meta 95; fundador 19/10: "Vai pra meta do 95").
//
// Por que existe (docs/DIAGNOSTICO-META-95-2026-10-19.md, itens C3/C4 e §3): o juiz v5 (lib/fastCoherence.ts, evento
// fast_coherence) não serve de régua para 95:
//   · teto de código: filme só gerado tem o visual limitado a 90 ("GENERATED FOOTAGE RULE") → 95 virou a nota máxima prática;
//   · em roteiro colado, a metade "texto" compara o roteiro com ELE MESMO (99,8 de média em 80 filmes) → a nota vira 50 + visual/2;
//   · lê 240 caracteres por cena (cinematic_dispatch_result.submitted_prompts) e, na cena 1, o prefixo fixo "Opening shot…"
//     come ~160 deles → o juiz culpa a cena 1 em 63% dos filmes com cena apontada (a cena que o juiz de still diz ser a MELHOR);
//   · oscila 90↔95 com a mesma entrada (3 de 19) e com a mesma entrada lida inteira (3 de 6).
//
// O que a v2 muda (só MEDIÇÃO — roda depois da entrega, no cron /api/cron/regua-95; nunca no caminho do cliente):
//   1. lê o prompt INTEIRO de cada cena (cinematic_submission_claim.response.scene_fal_inputs[i].prompt — o que foi de fato à
//      fal — ou scene_prompts[i]) SEM o prefixo fixo de abertura, e a FALA de cada cena (response.scenes[i] /
//      scene_narrations[i]);
//   2. julga a narração e as cenas contra a IDEIA ORIGINAL que a pessoa digitou (script_written.original_idea, gravado por
//      /api/generate-script desde esta entrega), não contra o roteiro que a própria IA escreveu; quando a ideia não existe
//      (roteiro colado / ChatGPT), isso fica DITO no evento (idea_source) e o painel separa;
//   3. escala 0–100 sem teto artificial (100 é permitido quando tudo bate);
//   4. temperatura 0 e MÉDIA DE 2 LEITURAS (a oscilação ±5 do 90↔95 cai pela metade na média e o desvio fica gravado).
// Grava o evento `coherence_v2` (session_id = chave da entrega) sem tocar no fast_coherence antigo (para comparar).
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { knownCoherenceCase, narrationCutSeconds, verdictFor, type CoherenceVerdict } from '@/lib/fastCoherence'

export const COHERENCE_V2_EVENT = 'coherence_v2'
export const COHERENCE_V2_VERSION = 'regua95_coerencia_v2'
/** Leituras por filme (média). 2 = o pedido do fundador; o custo é ~US$ 0,001 por leitura (gpt-4o-mini). */
export const COHERENCE_V2_READINGS = 2
/** Teto por cena do que o juiz lê — 1.500 caracteres cabem o prompt inteiro de hoje (o maior visto: 1.305) com folga. */
export const COHERENCE_V2_SCENE_CHARS = 1500

/** O prefixo fixo da cena 1 (lib/cinematic/visualPromptPolicy.ts) — texto de política, não conteúdo da cena. */
export const OPENING_SHOT_PREFIX =
  'Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. '

/** Tira o prefixo fixo de abertura (exato, ou a mesma frase com espaço/pontuação diferente). Nunca toca no resto. */
export function stripFixedPrefix(prompt: string): string {
  const p = String(prompt ?? '')
  if (p.startsWith(OPENING_SHOT_PREFIX)) return p.slice(OPENING_SHOT_PREFIX.length).trim()
  return p.replace(/^\s*Opening shot:\s*show the described subject and action immediately in the first frame,\s*clearly readable;\s*no unrelated establishing landscape or slow fade-in\.\s*/i, '').trim()
}

export type ProdutoRegua = 'filme' | 'ads' | 'ugc' | 'clipe'
/**
 * De onde veio a "ideia original":
 *  · script_written ... o que a pessoa digitou antes da IA do cliente escrever o roteiro (casado pelo começo do roteiro);
 *  · script_written_janela ... idem, casado só pela janela de 3 h antes do nascimento (sem o começo do roteiro);
 *  · pedido_direto .... o caminho verbatim=false: o prompt É a ideia (a IA do servidor escreveu a fala);
 *  · roteiro .......... só existe o roteiro (colado, ChatGPT, ou filme anterior a esta entrega) — fidelidade à ideia NÃO medida.
 */
export type IdeaSource = 'script_written' | 'script_written_janela' | 'pedido_direto' | 'roteiro'

export type CoherenceV2Scene = { scene: number; spoken: string; prompt: string; disposition?: string | null }

export type CoherenceV2Input = {
  idea: string
  ideaSource: IdeaSource
  narration: string
  scenes: CoherenceV2Scene[]
  engine?: string | null
  filmSeconds?: number | null
}

export type CoherenceV2Reading = {
  idea_fidelity: number
  narration_vs_scenes: number | null
  score: number
  problems: string[]
  worst_scene: number | null
  summary: string
}

export type CoherenceV2Result = {
  version: string
  score: number
  verdict: CoherenceVerdict
  idea_fidelity: number
  narration_vs_scenes: number | null
  /** as leituras individuais (média = score); spread = maior − menor */
  readings: number[]
  spread: number
  problems: string[]
  worst_scene: number | null
  summary: string
  idea_source: IdeaSource
  /** true = a ideia original não existe; a metade "ideia" foi julgada contra o próprio roteiro e NÃO prova fidelidade */
  idea_is_script: boolean
  narration_cut: boolean
  model: string | null
  usd: number
  ms: number
}

/**
 * cinematic_submission_claim.response → evidência INTEIRA por cena (item 1 da meta 95). O nascimento já grava tudo o que
 * a v5 jogava fora (medido 19/10: 122/122 Seedance de 7 d têm scene_fal_inputs; o caminho hollywood tem scene_prompts
 * inteiros de ~1.300 caracteres e scene_narrations):
 *   · prompt da cena: scene_fal_inputs[i].prompt (o que foi à fal) → scene_prompts[i];
 *   · fala da cena: scene_narrations[i] (hollywood) → narração partida em clip_word_starts (clássico: o índice da palavra em
 *     que cada clipe começa) → scenes[i] (no clássico antigo é a fala; quando o roteiro tem marcadores é a dica de busca).
 */
export function evidenceFromBirth(response: Record<string, unknown> | null | undefined): {
  prompt: string
  narration: string
  scenes: CoherenceV2Scene[]
  verbatim: boolean | null
  duration: number | null
} | null {
  if (!response || typeof response !== 'object') return null
  const str = (x: unknown) => (typeof x === 'string' ? x : '')
  const arr = (x: unknown) => (Array.isArray(x) ? (x as unknown[]) : [])
  const narration = str(response.voiceover_script).trim()
  const falPrompts = arr(response.scene_fal_inputs).map((x) => (x && typeof x === 'object' ? str((x as Record<string, unknown>).prompt) : ''))
  const scenePrompts = arr(response.scene_prompts).map(str)
  const n = Math.max(falPrompts.length, scenePrompts.length)
  const narr = arr(response.scene_narrations).map(str)
  const cws = arr(response.clip_word_starts).map((x) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? x : null))
  const words = narration ? narration.split(/\s+/) : []
  const byCws: string[] = []
  if (cws.length === n && n > 0 && cws.every((x) => x !== null) && words.length > 0) {
    for (let i = 0; i < n; i++) byCws.push(words.slice(cws[i] as number, i + 1 < n ? (cws[i + 1] as number) : words.length).join(' '))
  }
  const legacy = arr(response.scenes).map(str)
  const scenes: CoherenceV2Scene[] = []
  for (let i = 0; i < n; i++) {
    const spoken = (narr[i] ?? '').trim() || (byCws[i] ?? '').trim() || (legacy[i] ?? '').trim()
    scenes.push({ scene: i + 1, spoken, prompt: (falPrompts[i] || scenePrompts[i] || '').trim() })
  }
  const d = Number(response.duration)
  return {
    prompt: str(response.prompt),
    narration,
    scenes,
    verbatim: response.verbatim === true ? true : response.verbatim === false ? false : null,
    duration: Number.isFinite(d) && d > 0 ? d : null,
  }
}

const clamp = (n: unknown): number => {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v)))
}

/** Evidência por cena para o juiz: fala + prompt inteiro sem o prefixo, cortado em COHERENCE_V2_SCENE_CHARS. */
export function sceneLinesV2(scenes: CoherenceV2Scene[]): string {
  return scenes
    .map((s) => {
      const prompt = stripFixedPrefix(s.prompt).replace(/\s+/g, ' ').slice(0, COHERENCE_V2_SCENE_CHARS)
      const disp = s.disposition && s.disposition !== 'accepted' ? ` | status=${s.disposition === 'rejected' ? 'REJECTED (this shot is MISSING from the film)' : s.disposition}` : ''
      return `Scene ${s.scene}:\n  spoken="${String(s.spoken ?? '').replace(/\s+/g, ' ').trim().slice(0, 600)}"\n  generation prompt="${prompt}"${disp}`
    })
    .join('\n')
}

/** Mensagens do juiz v2. Exportado para o guardião provar o que o modelo lê (sem prefixo, sem teto, ideia original). */
export function buildCoherenceV2Messages(input: CoherenceV2Input) {
  const ideaIsScript = input.ideaSource === 'roteiro'
  const system =
    'You audit short narrated films made by an AI video tool, to measure if each film is a 95+/100 film. ' +
    'You get (a) the ORIGINAL IDEA the customer typed BEFORE any AI rewrote it, (b) the narration the film used, and (c) per scene, the line spoken during that scene and the FULL generation prompt that produced the shot. ' +
    'Score two things on a 0-100 scale. There is NO cap: give 100 when everything matches, 95-99 for a film with only a cosmetic nitpick, 85-94 for one real but minor mismatch, 60-84 for a scene that clearly does not show what is said or a drifted angle, below 60 for a film about something else. ' +
    '(1) idea_fidelity: does the narration tell what the customer\'s ORIGINAL IDEA asked for — same subject, same angle, the named people/places/numbers kept? A short idea is SUPPOSED to be developed with accurate facts, a hook and a payoff on the same subject — that is correct and scores high. Penalize drift, invented subject, missing key element the idea named, sentences with HOLES (a removed year/name leaving "In the year," or "in ,"), meta-text ("this scene has no narration"), or a story visibly cut short. ' +
    (ideaIsScript ? 'Here the original idea was NOT recorded: what you get as idea is the script itself; judge idea_fidelity only for holes, meta-text and broken sentences, and say so in summary. ' : '') +
    '(2) narration_vs_scenes: scene by scene, does the generation prompt depict the SUBJECT and the ACTION of the line spoken during that scene (the named person/animal/object, the place, the era), in the right order, with recurring characters kept the same (same species/age/look; a character turning into another, e.g. a dinosaur becoming a human child, is a MISMATCH)? A key spoken moment with no shot, a shot contradicting the line (e.g. "no wreckage" over a wreck), or a REJECTED scene lowers the score. Judge the CONTENT of each prompt; ignore generic style boilerplate (lighting, lens, "no text", aspect ratio). ' +
    'Be strict and concrete, and judge every scene with the same care (do not blame the first scene by default). Reply ONLY with JSON: {"idea_fidelity": 0-100, "narration_vs_scenes": 0-100 or null when no scenes are given, ' +
    '"problems": [up to 4 short strings IN BRAZILIAN PORTUGUESE naming the specific mismatch and the scene, empty when none], "worst_scene": scene number or null when no scene is worse, "summary": one sentence IN BRAZILIAN PORTUGUESE (max 160 chars)}.'
  const user =
    `ORIGINAL IDEA (${input.ideaSource}):\n"""${String(input.idea ?? '').slice(0, 4000)}"""\n\nNARRATION THE FILM USED:\n"""${String(input.narration ?? '').slice(0, 3000)}"""\n\n` +
    (input.scenes.length ? `SCENES (in order):\n${sceneLinesV2(input.scenes)}` : 'SCENES: not recorded (set narration_vs_scenes to null; the absence is not a defect).')
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]
}

/** Uma leitura do JSON do modelo → números. A NOTA nasce aqui (código): média simples das duas metades, SEM teto. */
export function normalizeReadingV2(parsed: Record<string, unknown>, hasScenes: boolean): CoherenceV2Reading {
  const idea = clamp(parsed.idea_fidelity)
  const nvsRaw = parsed.narration_vs_scenes
  const nvs = hasScenes && nvsRaw != null && Number.isFinite(Number(nvsRaw)) ? clamp(nvsRaw) : null
  const problems = Array.isArray(parsed.problems)
    ? (parsed.problems as unknown[]).filter((p): p is string => typeof p === 'string' && p.trim().length > 0).map((p) => p.trim().slice(0, 220)).slice(0, 4)
    : []
  const ws = parsed.worst_scene
  return {
    idea_fidelity: idea,
    narration_vs_scenes: nvs,
    score: nvs == null ? idea : Math.round((idea + nvs) / 2),
    problems,
    worst_scene: typeof ws === 'number' && Number.isFinite(ws) && ws > 0 ? Math.round(ws) : null,
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 200) : '',
  }
}

/** Junta as leituras: nota = média (arredondada); flags de código por cima (narração cortada = teto 40, como na v5). */
export function combineReadingsV2(
  readings: CoherenceV2Reading[],
  ctx: { ideaSource: IdeaSource; narration: string; filmSeconds?: number | null; model: string | null; usd: number; ms: number },
): CoherenceV2Result | null {
  if (readings.length === 0) return null
  const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
  const scores = readings.map((r) => r.score)
  const nvsList = readings.map((r) => r.narration_vs_scenes).filter((x): x is number => x != null)
  let score = mean(scores)
  // a leitura de nota mais baixa explica o problema (é a que viu o defeito); empate = a primeira.
  const worst = readings.reduce((a, b) => (b.score < a.score ? b : a), readings[0])
  let problems = worst.problems
  const words = String(ctx.narration ?? '').trim() ? String(ctx.narration).trim().split(/\s+/).length : 0
  const corte = narrationCutSeconds({ words, filmSeconds: ctx.filmSeconds ?? null })
  if (corte.cut) {
    score = Math.min(score, 40)
    problems = [`narração cortada: ~${corte.speechSeconds} s de fala para um filme de ${corte.filmSeconds} s — a história termina no meio`, ...problems].slice(0, 4)
  }
  return {
    version: COHERENCE_V2_VERSION,
    score,
    verdict: verdictFor(score),
    idea_fidelity: mean(readings.map((r) => r.idea_fidelity)),
    narration_vs_scenes: nvsList.length ? mean(nvsList) : null,
    readings: scores,
    spread: Math.max(...scores) - Math.min(...scores),
    problems,
    worst_scene: worst.worst_scene,
    summary: worst.summary,
    idea_source: ctx.ideaSource,
    idea_is_script: ctx.ideaSource === 'roteiro',
    narration_cut: corte.cut,
    model: ctx.model,
    usd: Math.round(ctx.usd * 1e6) / 1e6,
    ms: ctx.ms,
  }
}

/** gpt-4o-mini: US$ 0,15/M de entrada, US$ 0,60/M de saída. */
export function usdFromUsage(usage: { prompt_tokens?: number; completion_tokens?: number } | null | undefined, rates = { inPerM: 0.15, outPerM: 0.6 }): number {
  if (!usage) return 0
  return ((usage.prompt_tokens ?? 0) * rates.inPerM + (usage.completion_tokens ?? 0) * rates.outPerM) / 1e6
}

/**
 * Nota v2 de UM filme. Falha aberta: erro → null (nunca lança). Casos conhecidos (recusa do roteirista, nossa tela colada,
 * pílula sozinha) dão 0 sem gastar modelo, como na v5. `readings` leituras em PARALELO, temperatura 0.
 */
export async function scoreCoherenceV2(
  input: CoherenceV2Input,
  opts?: { timeoutMs?: number; fetchImpl?: typeof fetch; model?: string; readings?: number; apiKey?: string },
): Promise<CoherenceV2Result | null> {
  const started = Date.now()
  const known = knownCoherenceCase(input.idea, input.narration)
  if (known) {
    return {
      version: COHERENCE_V2_VERSION, score: 0, verdict: 'off', idea_fidelity: 0, narration_vs_scenes: null, readings: [0], spread: 0,
      problems: known.result.problems, worst_scene: null, summary: known.result.summary, idea_source: input.ideaSource,
      idea_is_script: input.ideaSource === 'roteiro', narration_cut: false, model: null, usd: 0, ms: Date.now() - started,
    }
  }
  if (!String(input.idea ?? '').trim() || !String(input.narration ?? '').trim()) return null
  const key = opts?.apiKey ?? process.env.OPENAI_API_KEY
  if (!key) return null
  const model = opts?.model ?? AI_TEXT_MODELS.utility // o id barato do registro (lib/aiModels.ts; migração de 2027 troca lá)
  const doFetch = opts?.fetchImpl ?? fetch
  const n = Math.max(1, Math.min(3, opts?.readings ?? COHERENCE_V2_READINGS))
  const messages = buildCoherenceV2Messages(input)
  const hasScenes = input.scenes.length > 0
  let usd = 0
  const one = async (): Promise<CoherenceV2Reading | null> => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 30_000)
    try {
      const res = await doFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, temperature: 0, max_tokens: 500, response_format: { type: 'json_object' }, messages }),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
      usd += usdFromUsage(data.usage)
      try {
        return normalizeReadingV2(JSON.parse(data.choices?.[0]?.message?.content ?? '') as Record<string, unknown>, hasScenes)
      } catch {
        return null
      }
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }
  try {
    const readings = (await Promise.all(Array.from({ length: n }, () => one()))).filter((r): r is CoherenceV2Reading => r !== null)
    return combineReadingsV2(readings, { ideaSource: input.ideaSource, narration: input.narration, filmSeconds: input.filmSeconds ?? null, model, usd, ms: Date.now() - started })
  } catch {
    return null
  }
}
