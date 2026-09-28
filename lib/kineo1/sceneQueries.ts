// ═══ KINEO1-IMAGEM-V2-2026-09-28 — as buscas de stock nascem da FALA da cena (peça INERTE: a rota liga na parte B) ═══
//
// Contexto (fundador, 27/09: "o Kineo 1 precisa chegar a 9 de 10"): Kineo 1 faz 93% dos filmes de cliente e, desde
// 19/09, o juiz de coerência dá 69 no geral, 89 na fala e 53 na IMAGEM (63 de 131 filmes com 40, 56 com 60, 13 com
// 80+). Na taxonomia das 136 cenas reprovadas de 40 filmes nota 40 (21-27/09, docs/KINEO1-IMAGEM-V2-2026-09-28.md):
//   · 36 cenas: a BUSCA estava errada para a fala — 11 genéricas, 9 feitas de palavra de enchimento (o roteiro
//     próprio vira "long before people played", "google says bring more", "news seconds launched tts" — as 4
//     primeiras palavras do bloco, lib/proseBlocks.ts) e 16 do plano com marcos inventados ("space needle,
//     brainstorming, skyline" para "Bezos preferia ovos e torrada"; "woman removing ring, praça do comércio, couple
//     laughing"; 12,7% das buscas dos filmes nota 40 têm vírgula, contra 1,4% nos filmes 80+);
//   · 23 cenas: o assunto é algo que o banco não tem (pessoa, evento, produto, personagem com nome);
//   · 19 cenas: fala abstrata (números, conceitos).
// Esta peça faz UMA chamada gpt-4o-mini (JSON, temperatura baixa) para o filme inteiro e devolve, por cena: o sujeito
// filmável em inglês (1-3 palavras), 3 buscas de 2-4 palavras sem nome próprio e sem plano de câmera, se o banco
// consegue mostrar a cena (stockable) e um prompt de IA para a cena que o banco não tem. Falha aberta: qualquer erro
// devolve null e quem chamou fica com as buscas de hoje. Custo ~US$ 0,001 por filme.
//
// Também moram aqui as duas regras puras que a rota (parte B) e o replay (/api/admin/kineo1-replay) usam iguais:
// commaPlanQueryParts (a busca do plano com vírgula só guarda o pedaço que a fala menciona) e weakSceneReason /
// pickAiClipScenesV2 (qual cena é fraca DEPOIS da busca e merece o clipe de IA).
import { openai } from '@/lib/openai'
import { headMatchesTagExactly, stripCameraPhrases, subjectPhraseV2 } from '@/lib/pixabay'

export type SceneQueryInput = { voiceover: string; planQuery?: string | null }
export type SceneQueryPlan = {
  /** sujeito filmável, em inglês, 1-3 palavras ("cone snail", "tennis court") */
  subject: string
  /** até 3 buscas de 2-4 palavras, sem nome próprio e sem plano de câmera, a mais literal primeiro */
  queries: string[]
  /** false = pessoa/evento/produto/personagem com nome ou ideia abstrata: o banco não mostra isso */
  stockable: boolean | null
  /** prompt em inglês para um clipe de IA 9:16 da cena (sem texto, sem rosto falando para a câmera) */
  aiPrompt: string
}

export const SCENE_QUERY_MODEL = 'gpt-4o-mini'
export const SCENE_QUERY_TIMEOUT_MS = 12_000
const MAX_SCENES = 24

/** Palavras de câmera/estilo que sobram depois de stripCameraPhrases e nunca são assunto de busca. */
const CAMERA_WORDS = new Set(['cinematic', 'shot', 'shots', 'footage', 'video', 'clip', 'closeup', 'macro', 'aerial', 'pov', 'vertical', '4k', 'hd', 'stock'])

/** Mensagens da chamada (puras — o guardião lê o que o modelo recebe). */
export function buildSceneQueryMessages(scenes: SceneQueryInput[], ctx: { language?: string | null; topic?: string | null }) {
  const lines = scenes.slice(0, MAX_SCENES).map((s, i) => {
    const fala = (s.voiceover ?? '').replace(/\s+/g, ' ').trim().slice(0, 320)
    const plano = (s.planQuery ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
    return `${i + 1}. line="${fala}"${plano ? ` | planner="${plano}"` : ''}`
  })
  const system =
    'You choose stock-footage searches for a short vertical documentary film. For EACH numbered scene you get the narration line (any language) and sometimes the planner\'s search. ' +
    'Reply ONLY with JSON: {"scenes":[{"scene":1,"subject":"...","queries":["...","...","..."],"stockable":true,"ai_prompt":"..."}, ...]} with one entry per scene, in order. ' +
    'subject: the concrete, filmable thing the line talks about, in English, 1-3 words, a noun phrase (e.g. "cone snail", "tennis court", "cold shower", "burger"). ' +
    'queries: exactly 3 English stock-video searches of 2-4 words, the most literal first, each naming the subject or a directly filmable part of it. ' +
    'NO proper names: people, brands, products, places, events and titles are described generically ("Jeff Bezos eating breakfast" -> "businessman eating breakfast"; "Wimbledon" -> "grass tennis court"; "Kawasaki KLR650" -> "adventure motorcycle desert"). ' +
    'NO camera or style words (close-up, macro, aerial, drone, wide, establishing, shot, angle, POV, slow motion, cinematic). NO abstract words (success, concept, idea, number, facts). ' +
    'If the planner search fits the line, reuse its concrete nouns; if it names landmarks or things the line does not mention, ignore it. ' +
    'stockable: false when the line is about a specific named person, a specific historical event, a named product or brand, a fictional or cartoon character, or an abstract idea/number that stock footage cannot literally show; otherwise true. ' +
    'ai_prompt: one English sentence (max 40 words) describing a cinematic 9:16 vertical shot that shows exactly what the line says; no text, no captions, no logos, no faces talking to the camera, no real person\'s likeness.'
  const user =
    `Film topic: ${(ctx.topic ?? '').replace(/\s+/g, ' ').trim().slice(0, 400) || '(not given)'}\n` +
    `Narration language: ${ctx.language || 'auto-detect'}\n` +
    `Scenes:\n${lines.join('\n')}`
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]
}

function cleanQuery(q: unknown): string {
  if (typeof q !== 'string') return ''
  const semPlano = stripCameraPhrases(q.toLowerCase())
  const palavras = semPlano
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^-+|-+$/g, ''))
    .filter((w) => w.length > 0 && !CAMERA_WORDS.has(w))
  return palavras.slice(0, 4).join(' ')
}

/** Do JSON do modelo para o plano por cena (puro). Entrada inválida → null na cena; nada utilizável → null. */
export function parseSceneQueryPlan(raw: unknown, sceneCount: number): Array<SceneQueryPlan | null> | null {
  let obj: unknown = raw
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw) } catch { return null }
  }
  const lista = Array.isArray(obj) ? obj : Array.isArray((obj as { scenes?: unknown } | null)?.scenes) ? (obj as { scenes: unknown[] }).scenes : null
  if (!lista) return null
  const n = Math.max(0, Math.min(MAX_SCENES, sceneCount))
  const out: Array<SceneQueryPlan | null> = Array.from({ length: n }, () => null)
  lista.forEach((e, pos) => {
    if (!e || typeof e !== 'object') return
    const o = e as Record<string, unknown>
    // número de cena presente manda (fora do alcance = lixo, ignorado); ausente, vale a posição na lista
    const idx = o.scene === undefined || o.scene === null ? pos : typeof o.scene === 'number' && Number.isInteger(o.scene) && o.scene >= 1 && o.scene <= n ? o.scene - 1 : -1
    if (idx < 0 || idx >= n || out[idx]) return
    const queries = Array.from(new Set((Array.isArray(o.queries) ? o.queries : []).map(cleanQuery).filter((q) => q.length > 0))).slice(0, 3)
    const subject = cleanQuery(o.subject).split(' ').slice(0, 3).join(' ') || (queries[0] ?? '').split(' ').slice(0, 3).join(' ')
    if (!subject && queries.length === 0) return
    const aiRaw = typeof o.ai_prompt === 'string' ? o.ai_prompt : typeof o.aiPrompt === 'string' ? o.aiPrompt : ''
    const aiPrompt = aiRaw.replace(/\s+/g, ' ').trim().slice(0, 400) || `${subject}, cinematic vertical shot`
    out[idx] = { subject, queries: queries.length > 0 ? queries : [subject], stockable: typeof o.stockable === 'boolean' ? o.stockable : null, aiPrompt }
  })
  return out.some(Boolean) ? out : null
}

type CreateFn = (body: Record<string, unknown>, opts: { timeout: number; maxRetries: number }) => Promise<{ choices?: Array<{ message?: { content?: string | null } }> }>

/**
 * UMA chamada gpt-4o-mini para o filme inteiro. Falha aberta: sem chave, erro, tempo esgotado ou JSON ruim → null
 * (quem chamou mantém as buscas de hoje). `opts.create` existe para o replay/guardião injetarem a chamada.
 */
export async function planSceneQueries(
  scenes: SceneQueryInput[],
  ctx: { language?: string | null; topic?: string | null },
  opts?: { timeoutMs?: number; create?: CreateFn },
): Promise<Array<SceneQueryPlan | null> | null> {
  try {
    if (!Array.isArray(scenes) || scenes.length === 0) return null
    if (!opts?.create && !process.env.OPENAI_API_KEY) return null
    const create: CreateFn = opts?.create ?? ((body, o) => openai.chat.completions.create(body as never, o) as never)
    const n = Math.min(MAX_SCENES, scenes.length)
    const res = await create(
      {
        model: SCENE_QUERY_MODEL,
        temperature: 0.2,
        max_tokens: Math.min(4000, 160 + 120 * n),
        response_format: { type: 'json_object' },
        messages: buildSceneQueryMessages(scenes, ctx),
      },
      // lib/openai.ts: um timeout é RETENTADO — quem está no caminho da pessoa passa maxRetries 0.
      { timeout: opts?.timeoutMs ?? SCENE_QUERY_TIMEOUT_MS, maxRetries: 0 },
    )
    return parseSceneQueryPlan(res?.choices?.[0]?.message?.content ?? '', n)
  } catch (err) {
    console.warn('[scene-queries] fail-open (buscas de hoje):', err instanceof Error ? err.message : String(err))
    return null
  }
}

// ── A busca do plano com vírgula (entity world) ──────────────────────────────────────────────────────────────
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'these', 'those', 'over', 'under', 'about', 'after', 'before', 'was', 'were', 'are', 'his', 'her', 'their', 'its', 'our', 'your', 'you', 'they', 'she', 'him', 'has', 'have', 'had', 'but', 'not', 'all', 'one', 'two', 'can', 'will', 'just', 'than', 'then', 'when', 'what', 'who', 'how', 'why', 'there', 'here', 'more', 'most', 'very', 'even', 'only'])
function stem(w: string): string {
  return w.length >= 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w
}
function contentWords(text: string): Set<string> {
  return new Set(
    (text ?? '')
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 3 && !STOP.has(w))
      .map(stem),
  )
}
/**
 * A busca do plano vem com vírgulas e marcos inventados pela regra de "mundo da entidade" (lib/broll, travado):
 * "space needle, brainstorming, skyline" para "Bezos preferred eggs and toast". A rota guardava a string INTEIRA se
 * UM token batesse com a cena. Aqui cada pedaço (sem plano de câmera) só fica se dividir uma palavra de conteúdo com
 * a FALA da cena; nenhum pedaço fica → [] (quem chamou usa as buscas de planSceneQueries).
 */
export function commaPlanQueryParts(planQuery: string | null | undefined, voiceover: string | null | undefined): string[] {
  const fala = contentWords(voiceover ?? '')
  if (fala.size === 0) return []
  const partes = (planQuery ?? '').split(',').map((p) => stripCameraPhrases(p).trim()).filter(Boolean)
  return partes.filter((p) => Array.from(contentWords(p)).some((w) => fala.has(w)))
}

/**
 * KINEO1-IMAGEM-V2-2026-09-28 (parte B) — a lista de buscas que a rota recebe do plano de B-roll: busca SEM vírgula
 * passa como está; busca COM vírgula ("space needle, brainstorming, skyline" para os ovos do Bezos) vira só os pedaços
 * que a fala menciona (commaPlanQueryParts). Até hoje a guarda do gancho guardava a string INTEIRA se um token batesse.
 */
export function splitCommaQueries(queries: string[], voiceover: string | null | undefined): string[] {
  return (queries ?? []).flatMap((q) => (typeof q === 'string' && q.includes(',') ? commaPlanQueryParts(q, voiceover) : typeof q === 'string' ? [q] : []))
}

/**
 * KINEO1-IMAGEM-V2-2026-09-28 (parte B) — a ordem das buscas da cena: as do plano novo (planSceneQueries, feitas da
 * FALA) NA FRENTE, depois as de hoje sem o plano de câmera; sem repetir (caixa baixa); e a busca que já abriu outra cena
 * vai para o fim (a regra KINEO1-BUSCA-DA-FALA de 18/09, agora valendo também para a busca do plano novo).
 */
export function planFirstQueries(planQueries: string[] | null | undefined, legacy: string[], used?: Set<string>): string[] {
  const vistas = new Set<string>()
  const todas: string[] = []
  for (const q of [...(planQueries ?? []), ...(legacy ?? []).map((l) => stripCameraPhrases(l ?? ''))]) {
    const t = (q ?? '').replace(/\s+/g, ' ').trim()
    const k = t.toLowerCase()
    if (!t || vistas.has(k)) continue
    vistas.add(k)
    todas.push(t)
  }
  if (!used || used.size === 0) return todas
  const ineditas = todas.filter((q) => !used.has(q.toLowerCase()))
  return ineditas.length > 0 ? [...ineditas, ...todas.filter((q) => used.has(q.toLowerCase()))] : todas
}

// ── Cena fraca DEPOIS da busca (quem ganha o clipe de IA) ───────────────────────────────────────────────────────
/** De onde veio o stock da cena: pool/cadeia da Pixabay, cofre, ou nada (a rota recicla um clipe ou usa a biblioteca). */
export type StockOrigin = 'pool' | 'chain' | 'vault' | 'recycled' | 'library' | 'none'
export type WeakReason = 'no_stock' | 'not_stockable' | 'vault_only' | 'subject_not_exact'
const PRIORIDADE: Record<WeakReason, number> = { no_stock: 0, not_stockable: 1, vault_only: 2, subject_not_exact: 3 }

/** A cabeça do sujeito é uma tag EXATA do clipe escolhido? (plural simples pela regra 3 do portão v2) */
export function subjectIsExactTag(subject: string | null | undefined, tags: string | null | undefined): boolean {
  const head = subjectPhraseV2(subject ?? '').head
  if (!head) return true // sujeito sem palavra específica: nada a exigir
  const words = (tags ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  return headMatchesTagExactly(head, words, { v2: true })
}

/**
 * Regra da parte B (medida na amostra de 40 filmes: 38 de 103 cenas reprovadas já tinham clipe de IA — escolhido pela
 * relevância do PLANO, antes de qualquer busca). A cena é fraca quando, DEPOIS da busca: o banco não deu nada (clipe
 * reciclado/biblioteca), o banco não tem o assunto (stockable=false), o clipe veio só do cofre, ou a cabeça do sujeito
 * não é tag exata do clipe escolhido.
 */
export function weakSceneReason(input: { origin: StockOrigin; stockable?: boolean | null; subject?: string | null; pickedTags?: string | null }): WeakReason | null {
  if (input.origin === 'recycled' || input.origin === 'library' || input.origin === 'none') return 'no_stock'
  if (input.stockable === false) return 'not_stockable'
  if (input.origin === 'vault') return 'vault_only'
  if (input.subject && input.pickedTags != null && !subjectIsExactTag(input.subject, input.pickedTags)) return 'subject_not_exact'
  return null
}

/** Até `max` cenas fracas para o clipe de IA: a pior razão primeiro; empate → a mais tardia (o fim decide o compartilhamento). */
export function pickAiClipScenesV2(scenes: Array<{ scene: number; reason: WeakReason | null }>, max: number, opts?: { skipScene1?: boolean }): number[] {
  if (!(max > 0)) return []
  return scenes
    .filter((s) => s.reason !== null && !(opts?.skipScene1 && s.scene === 1))
    .sort((a, b) => PRIORIDADE[a.reason as WeakReason] - PRIORIDADE[b.reason as WeakReason] || b.scene - a.scene)
    .slice(0, Math.floor(max))
    .map((s) => s.scene)
    .sort((a, b) => a - b)
}
