// KINEO-FALA-X-IMAGEM-2026-09-16 — a cena mostra o que a fala diz.
//
// Fundador (16/09, noite): "os vídeos não estão coerentes, essa é a minha maior preocupação."
// O quadro /admin/coerencia mostrou ONDE: a narração é fiel ao pedido (texto 90-100), mas a
// imagem de cada cena não mostra o que a fala daquela cena diz (visual 50-60 em 5 dos 22 Seedance
// de 48 h). Casos reais de 16/09:
//   · aadarshvy29 — fala: "In 2024, more than 10 million educated young Indians entered the job
//     market… Mumbai…"; cenas: "19th-century Indian ink pot", "mahogany conference table with a
//     gold-embossed name badge", "IBM typewriter on a polished mahogany desk". Nada disso é a fala.
//   · lennartdenstad — fala: "a pink supercar crashes through the glass doors of a bank"; cena 1:
//     "close-up of shattered glass and neon reflections, the aftermath". A ação virou resíduo.
// A causa é a instrução do roteirista visual ("EXTREMELY cinematic… camera, lighting, palette,
// atmosphere"): para ser "cinematográfico" o modelo inventa objetos, épocas e cenários que a fala
// não tem. O filtro determinístico (scrubInventedSetting) só pega ano/nome próprio; o contrato de
// cena (sceneTruth) só conhece 5 entidades. Nenhum dos dois vê "ink pot" numa fala sobre emprego.
//
// Este módulo é o supervisor de continuidade: UMA chamada por filme, antes de qualquer gasto no
// fornecedor, recebe cada cena (fala + plano) e devolve KEEP ou REWRITE. Regra única: quem vê o
// plano sem som precisa entender a fala — mesmo sujeito, mesmo lugar/época, mesma ação/objeto.
// Cinematográfico é câmera e luz SOBRE a coisa dita, nunca outra coisa. Corrige em vez de bloquear
// (lição do #349), falha aberta (qualquer erro = planos originais), custo ~US$ 0,002, ~3-6 s.

export type AlignScene = { voiceover: string; shot: string }
// KINEO-LIVRO-DE-ESTADO-2026-09-19 — o estado de cada personagem/objeto recorrente, cena a cena, como o supervisor
// o leu ("big sock: blue; small sock: red"). Vai para o evento scene_speech_alignment (states) e alimenta o juiz.
export type AlignRewrite = { index: number; before: string; shot: string; why: string; state?: string }
export type AlignState = { index: number; state: string }
export type AlignReport = { scenes: number; rewritten: number; kept: number; examples: Array<{ scene: number; why: string; before: string; after: string }>; ms: number; model: string }
export type AlignResult = { rewritten: AlignRewrite[]; relato: AlignReport; states: AlignState[] }

// KINEO-SEM-LETRAS-2026-09-21 — cópia LITERAL de sceneStyle.NO_TEXT_OBJECT_DIRECTION (este módulo é puro, sem imports:
// o guardião o executa em sandbox). test-sem-letras confere que as duas cópias são idênticas.
const NO_TEXT_OBJECT_DIRECTION =
  'Never make a text-bearing object the subject of a shot (newspaper, headline, article, document, map with labels, sign, ' +
  'sonar or radar readout, chart, screen, phone display, coordinates): video models cannot write and produce garbled ' +
  'foreign letters. Show such things as texture or light instead — aged paper out of focus, glowing seabed terrain without ' +
  'labels, the glow of a screen on a face, a hand over a blurred page — and never describe words, numbers or captions inside the frame.'

export const SPEECH_IMAGE_ALIGN_EVENT = 'scene_speech_alignment'
// v2 (19/09, fundador: "vai, sobe o livro de estado"): caso das meias (Axel, Veo, 00:39 BRT) — a cena 4 dizia "large
// WHITE sock" quando a história já a tinha pintado de azul; a cena 6 dizia "transforming from blue back to white" e o
// still que semeia o Veo saiu AZUL, o vídeo não completou a mudança e o filme terminou com as meias azuis; o gerador
// ainda enfeitou a sala com um cachorro. Três regras novas: (1) estado herdado — cada plano mostra o estado que vale
// NAQUELE momento da história; (2) mudança = resultado — plano de transformação é rendido já no estado final, nunca
// "de X para Y" (o still é o primeiro quadro; o gerador raramente termina a mudança); (3) sem enfeite — nada de
// personagem, bicho, gente ou objeto que a história não tem. O supervisor devolve o estado por cena.
export const SPEECH_IMAGE_ALIGN_VERSION = 'fala_x_imagem_v2_estado'

export const SPEECH_IMAGE_ALIGN_ENABLED = !['0', 'false', 'no', 'off'].includes(
  (process.env.KINEO_SPEECH_IMAGE_ALIGN ?? '').trim().toLowerCase(),
)

/** Mensagens do supervisor. Exportado para o guardião provar o que o modelo lê. */
export function buildAlignMessages(input: { topic: string; scenes: AlignScene[] }) {
  const system =
    'You are the continuity supervisor of a short narrated film made shot by shot by an AI video generator. ' +
    'For each scene you get the SPOKEN LINE (the narration the viewer hears during that shot) and the current SHOT description (the prompt the generator will render). ' +
    'THE RULE: a viewer with the sound off must still understand the spoken line from the shot alone — same subject (who/what), same place and era, the same action or object the line talks about. ' +
    'Cinematic means camera and light ON the thing being said, never a different thing. ' +
    'REWRITE the shot when it depicts something the line does not talk about (invented props, another era, generic luxury/vintage/office objects, an unrelated place, an "aftermath" instead of the action), or when it misses the line\'s key action or object. ' +
    'KEEP the shot when it already shows the line; do not rewrite for taste. ' +
    // KINEO-LIVRO-DE-ESTADO-2026-09-19 — ver o cabeçalho da versão v2.
    'STATE LEDGER: first list every recurring character or object of the story and its visible state (color, size, condition, position) as the lines declare it; carry each state FORWARD until a later line changes it. ' +
    'Every shot must show the state in force AT THAT LINE (a sock that turned blue two lines ago is still blue now). ' +
    'When a line CHANGES a state (turns blue, becomes white again, breaks, grows), describe the shot in the RESULT state with the change already complete — never "transforming from X to Y": the generator seeds the shot from a still of the first frame and rarely finishes a change. ' +
    'The LAST scene must show the FINAL state of every recurring character exactly as the story ends. ' +
    'NO EXTRAS: when the subjects are objects or characters, the shot must not add other characters, animals, people or props the story does not mention; append "no other characters, no animals, no people, no added props" to such shots. ' +
    'A shot in the wrong state or with extras counts as a REWRITE. ' +
    // KINEO-SEM-LETRAS-2026-09-21 — o supervisor reescrevia cenas pedindo mapa/artigo/jornal (Atlantis) → letras inventadas.
    NO_TEXT_OBJECT_DIRECTION + ' A shot whose subject is a text-bearing object counts as a REWRITE. ' +
    'When rewriting: one clear subject doing the action of the line, concrete and literal, in the era and place the line implies, max 55 words, English, no on-screen text, keep any existing "faceless / no real face / silhouette / from behind" constraint and keep it for named real people. Keep the film\'s established look if the current shot states one (e.g. "photorealistic", "3D animated"). ' +
    'Reply ONLY with JSON: {"scenes":[{"i":<scene number>,"action":"keep"|"rewrite","shot":"<new shot when rewrite, else empty>","why":"<max 12 words>","state":"<visible state of each recurring character/object at this line, e.g. big sock: blue; small sock: red — empty when the story has none>"}]} with exactly one entry per scene.'
  const lines = input.scenes
    .map((s, i) => `Scene ${i + 1}\n  spoken: "${s.voiceover.replace(/\s+/g, ' ').trim().slice(0, 400)}"\n  shot: "${s.shot.replace(/\s+/g, ' ').trim().slice(0, 500)}"`)
    .join('\n')
  const user = `FILM TOPIC (what the customer asked for): """${input.topic.replace(/\s+/g, ' ').trim().slice(0, 1200)}"""\n\nSCENES:\n${lines}`
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]
}

/** Do JSON do modelo para a lista de reescritas aceitas. Exportado para o guardião. */
export function parseAlignReply(raw: string, scenes: AlignScene[]): AlignRewrite[] {
  return parseAlignReplyFull(raw, scenes).rewritten
}
/** KINEO-LIVRO-DE-ESTADO-2026-09-19 — reescritas + estado por cena (o estado vale para KEEP e REWRITE). */
export function parseAlignReplyFull(raw: string, scenes: AlignScene[]): { rewritten: AlignRewrite[]; states: AlignState[] } {
  let parsed: { scenes?: unknown }
  try {
    parsed = JSON.parse(raw) as { scenes?: unknown }
  } catch {
    return { rewritten: [], states: [] }
  }
  if (!Array.isArray(parsed.scenes)) return { rewritten: [], states: [] }
  const out: AlignRewrite[] = []
  const states: AlignState[] = []
  for (const item of parsed.scenes as Array<Record<string, unknown>>) {
    const i = typeof item?.i === 'number' ? Math.round(item.i) - 1 : -1
    if (i < 0 || i >= scenes.length) continue
    const state = typeof item.state === 'string' ? item.state.replace(/\s+/g, ' ').trim().slice(0, 200) : ''
    if (state && !states.some((x) => x.index === i)) states.push({ index: i, state })
    if (item.action !== 'rewrite') continue
    const shot = typeof item.shot === 'string' ? item.shot.replace(/\s+/g, ' ').trim() : ''
    // Reescrita vazia, curta demais ou idêntica não vale; só uma por cena.
    if (shot.length < 15 || shot === scenes[i].shot.trim()) continue
    if (out.some((o) => o.index === i)) continue
    out.push({ index: i, before: scenes[i].shot, shot: shot.slice(0, 600), why: typeof item.why === 'string' ? item.why.slice(0, 120) : '', ...(state ? { state } : {}) })
  }
  return { rewritten: out, states }
}

/**
 * Alinha os planos à fala. Devolve null quando não há o que fazer ou quando algo falha (os planos
 * originais seguem). Nunca lança.
 */
export async function alignShotsToSpeech(
  input: { topic: string; scenes: AlignScene[] },
  opts?: { timeoutMs?: number; fetchImpl?: typeof fetch; model?: string },
): Promise<AlignResult | null> {
  if (!SPEECH_IMAGE_ALIGN_ENABLED) return null
  const started = Date.now()
  const scenes = input.scenes.filter((s) => s.voiceover.trim() && s.shot.trim())
  if (scenes.length === 0 || scenes.length !== input.scenes.length) return null
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  const model = opts?.model ?? 'gpt-4o-mini'
  const doFetch = opts?.fetchImpl ?? fetch
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 9_000)
  try {
    const res = await doFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1400,
        response_format: { type: 'json_object' },
        messages: buildAlignMessages({ topic: input.topic, scenes }),
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const { rewritten, states } = parseAlignReplyFull(data.choices?.[0]?.message?.content ?? '', scenes)
    const ms = Date.now() - started
    return {
      rewritten,
      states,
      relato: {
        scenes: scenes.length,
        rewritten: rewritten.length,
        kept: scenes.length - rewritten.length,
        examples: rewritten.slice(0, 3).map((r) => ({ scene: r.index + 1, why: r.why, before: r.before.slice(0, 140), after: r.shot.slice(0, 140) })),
        ms,
        model,
      },
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
