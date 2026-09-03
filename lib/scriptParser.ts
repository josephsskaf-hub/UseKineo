// Push #235 — User-script parser for Fast Mode.
//
// Root problem this fixes: when a user pastes a fully-authored script that
// already specifies the exact stock footage per beat with `[Pexels: QUERY]`
// markers (and optionally a `speed: 1.05` directive), the old pipeline threw
// all of it away — it truncated the prompt to 400 chars and let GPT invent its
// own scenes, voiceover, and Pexels queries. The result was footage that had
// nothing to do with what the user asked for (e.g. a candle for a rocket
// topic) and narration the user never wrote.
//
// This module extracts the user's intent verbatim so the rest of the Fast Mode
// pipeline can honor it instead of re-generating from scratch.
//
//   parseUserScript(raw) → {
//     hasMarkers,   // true when at least one [Pexels: ...] marker was found
//     segments,     // ordered { voiceover, pexelsQuery } — one per marker
//     narration,    // full spoken text, markers + directives stripped
//     speed,        // parsed "speed: X" directive, or null
//   }

export interface ParsedSegment {
  /** The narration the TTS should speak for this segment (markers stripped). */
  voiceover: string
  /** The exact Pexels search query the user specified for this segment. */
  pexelsQuery: string
}

export interface ParsedScript {
  hasMarkers: boolean
  segments: ParsedSegment[]
  /** Full narration with all markers/directives removed, whitespace collapsed. */
  narration: string
  /** Explicit playback speed from a `speed:` directive (0.7–1.3), or null. */
  speed: number | null
}

// Matches [Pexels: query], [pexels - query], [PEXELS: query], etc. The label is
// case-insensitive and a ':' or '-' separator is optional. Captured group 1 is
// the raw query text.
const PEXELS_MARKER = /\[\s*pexels\s*[:\-–]?\s*([^\]]+?)\s*\]/gi

// Matches a standalone speed directive anywhere in the text:
//   "speed: 1.05", "speed = 1.1", "Speed 0.95"
const SPEED_DIRECTIVE = /\bspeed\s*[:=]?\s*(\d+(?:\.\d+)?)/i

// Lines that are configuration/stage directions, never narration. Dropped from
// the spoken text so the narrator doesn't read "duration 45 seconds" out loud.
// Push #238 adds platform/resolution/orientation and the multi-word "aspect
// ratio" label so a leading metadata header block is stripped line-by-line.
const DIRECTIVE_LINE = /^\s*(speed|duration|voice|music|format|aspect\s*ratio|aspect|ratio|resolution|platform|orientation|style|tone|language|idioma|velocidade)\s*[:=]/i

// Push #238 — video-format spec lines that leak from a user's header block and
// are NEVER narration, e.g. "YouTube Short format, 9:16, 1 legend only",
// "Format: 9:16 vertical", "1 subtitle only". Matches when the line:
//   - contains a 9:16 aspect ratio anywhere ("9:16", "9 : 16") — always a spec,
//   - mentions a "YouTube Short(s) format" directive, or
//   - ends with "<n> legend(s) only" / "subtitle(s) only".
// Kept deliberately narrow so ordinary narration that merely says "YouTube" or
// "format" survives.
const FORMAT_SPEC_LINE = /\b9\s*:\s*16\b|youtube\s+shorts?\s+format|\b(legends?|subtitles?)\s+only\s*[.!]?$/i

// A line that's nothing but dash/em-dash/en-dash decoration ("———", "-----").
const DASH_ONLY_LINE = /^[\s—–-]+$/
// Markdown header line ("## HOOK", "# Introduction").
const MARKDOWN_HEADER_LINE = /^\s*#{1,6}\s+\S/
// Strips an em-dash/en-dash/hyphen fence from both ends ("— HOOK —" → "HOOK").
const FENCED_LINE = /^[—–-]{1,3}\s*([\s\S]*?)\s*[—–-]{1,3}$/
// Push #240 — an editing bullet point ("- Total length: ~52s", "- ZERO black
// frames"). Hyphen + space + text. Never narration. Note: section headers that
// use a hyphen fence ("- HOOK -") are detected as headers BEFORE this rule runs
// in cleanNarration, so this never swallows a header.
const BULLET_LINE = /^\s*-\s+\S/

// Push #240 — section-aware parsing.
//
// A user's full template is divided into named sections fenced like "— HOOK —"
// or "— VOICE (ElevenLabs) —". Some sections are NARRATION (their body text is
// spoken) and some are METADATA (their body is production notes that must never
// be spoken or captioned). The old line-by-line filter missed the metadata
// section bodies because the headers carry mixed-case parentheticals ("VOICE
// (ElevenLabs)", "EDITING (CapCut)") that defeat the ALL-CAPS heuristic, so the
// header AND its content leaked into the narration.
//
// These are the metadata-only section names (normalized: lowercased, dashes →
// spaces, parentheticals and digits stripped). When the parser enters one of
// these sections it drops every line until the next named section header.
const NON_NARRATION_SECTION_KEYWORDS = new Set([
  'on screen legend',
  'legend',
  'voice',
  'editing',
  'capcut',
  'elevenlabs',
  'notes',
  'instructions',
])

/**
 * Normalize a section header body for keyword matching: lowercase, strip
 * parentheticals ("(1 only)", "(ElevenLabs)"), strip digits ("MICRO
 * RECOMPENSA 1" → "micro recompensa"), turn dashes into spaces ("ON-SCREEN" →
 * "on screen"), and collapse whitespace.
 */
function normalizeSectionName(body: string): string {
  return body
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[0-9]+/g, ' ')
    .replace(/[—–-]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * If `line` is a named section header ("— HOOK —", "## VOICE", "- CTA -"),
 * return its normalized name; otherwise null. Pure dash decoration ("———") is
 * NOT a named header — it returns null so it can't reset the section mode.
 */
function sectionHeaderName(line: string): string | null {
  const t = line.trim()
  if (!t) return null
  if (DASH_ONLY_LINE.test(t)) return null
  let body: string | null = null
  const fenced = FENCED_LINE.exec(t)
  if (fenced) {
    body = fenced[1]
  } else if (MARKDOWN_HEADER_LINE.test(t)) {
    body = t.replace(/^#{1,6}\s*/, '')
  }
  if (body === null) return null
  return normalizeSectionName(body)
}

/**
 * True when a (normalized) section name is a metadata-only section whose body
 * must be dropped. Matches an exact keyword, a multi-word keyword as a
 * substring, or a single-word keyword as a whole word (so compound headers like
 * "voiceover notes" still match "notes" without "legend" matching "legendary").
 */
function isNonNarrationSection(name: string): boolean {
  if (!name) return false
  if (NON_NARRATION_SECTION_KEYWORDS.has(name)) return true
  const words = name.split(' ')
  for (const kw of NON_NARRATION_SECTION_KEYWORDS) {
    if (kw.includes(' ')) {
      if (name.includes(kw)) return true
    } else if (words.includes(kw)) {
      return true
    }
  }
  return false
}

/**
 * Push #237 — true when a line is a section header / stage direction rather than
 * narration, so it must be dropped before the text is spoken or captioned.
 * Catches:
 *   - directive lines      (speed:/duration:/voice:/format:/platform:/...)  [DIRECTIVE_LINE]
 *   - format spec lines    ("YouTube Short format, 9:16, 1 legend only")    [FORMAT_SPEC_LINE]
 *   - markdown headers     ("## HOOK", "# Introduction")
 *   - dash-only separators ("———", "-----")
 *   - em-dash headers      ("— MICRO RECOMPENSA —", "— CTA —", "- HOOK -")
 *   - ALL-CAPS stage cues  ("HOOK", "CTA", "BEAT 1", "SCENE 1", "BEAT 1:")
 *
 * An ALL-CAPS cue is detected as: after stripping any surrounding dash fence and
 * leading markdown hashes, the remainder has an uppercase letter and NO lowercase
 * letter — so normal sentence-case narration is never removed. Handles both the
 * em-dash "—" and regular hyphen "-" fence variants.
 */
function isDroppableLine(line: string): boolean {
  if (DIRECTIVE_LINE.test(line)) return true
  if (FORMAT_SPEC_LINE.test(line)) return true
  const t = line.trim()
  if (!t) return false
  if (DASH_ONLY_LINE.test(t)) return true
  if (BULLET_LINE.test(t)) return true
  if (MARKDOWN_HEADER_LINE.test(t)) return true
  const fenced = FENCED_LINE.exec(t)
  const body = (fenced ? fenced[1] : t).replace(/^#{1,6}\s*/, '').trim()
  if (!body) return Boolean(fenced)
  return /[A-Z]/.test(body) && !/[a-z]/.test(body)
}

/**
 * Strip residual bracketed directions (e.g. [HOOK], [Scene 2], leftover
 * markers), directive / section-header / stage-direction lines, metadata
 * section bodies, and collapse whitespace. Turns a raw narration chunk into
 * clean spoken text.
 *
 * Push #240 — section-aware. Walks the lines tracking whether we're inside a
 * metadata-only section ("— VOICE —", "— EDITING —", "— ON-SCREEN LEGEND —").
 * A named section header always drops the header line itself and either enters
 * (metadata) or exits (narration) metadata mode; while in metadata mode EVERY
 * line is dropped until the next named header. Dash-only decoration does not
 * change the mode. This handles mixed-case headers like "VOICE (ElevenLabs)"
 * that the ALL-CAPS line heuristic could not catch.
 */
// Fix 13/06 — INLINE stage prefixes. Lines like "HOOK: [Pexels: x] Five..."
// or "MICRO REWARD 1: Habit one..." contain lowercase narration, so the
// ALL-CAPS line heuristic never dropped them and the TTS spoke "micro reward
// one" aloud (Joseph's gift-video render). This strips an UPPERCASE-ONLY
// stage prefix (EN + PT variants, optional number/parenthetical, ending in
// a colon/dash) from the head of a narration line. Uppercase-only on purpose:
// real narration like "Fact one: octopuses..." is mixed-case and untouched.
const INLINE_STAGE_PREFIX =
  /^\s*(?:HOOK|GANCHO|INTRO|OUTRO|CTA|PAYOFF|PAGAMENTO|ESCALATION|ESCALADA|RHYTHM|RITMO|MICRO\s+(?:REWARD|RECOMPENSA)(?:\s*\d+)?|BEAT(?:\s*\d+)?|SCENE(?:\s*\d+)?|CENA(?:\s*\d+)?|FACT(?:\s*\d+)?|FATO(?:\s*\d+)?|PART(?:\s*\d+)?|STEP(?:\s*\d+)?)\s*(?:\([^)]*\))?\s*[:\-–—]\s*/

// KINEO-VOICEOVER-SALVAGE-2026-08-13 — as três regras que NUNCA são fala,
// contra as regras que são apenas FORMATAÇÃO. `isDroppableLine` mistura as
// duas: `speed: 1.1` nunca é narração, mas `- The ocean is deeper than you
// think` é narração com um traço na frente. No modo tolerante só estas três
// derrubam a linha inteira; o resto é DESEMBRULHADO, não apagado.
function isNeverSpeechLine(line: string): boolean {
  if (DIRECTIVE_LINE.test(line)) return true
  if (FORMAT_SPEC_LINE.test(line)) return true
  return DASH_ONLY_LINE.test(line.trim())
}

// Uma linha que é SÓ o rótulo do beat ("HOOK", "— CTA —", "SCENE 2"). No modo
// tolerante ela continua saindo: salvar palavras não pode virar o TTS lendo
// "hook" em voz alta. É o mesmo vocabulário do INLINE_STAGE_PREFIX, ancorado
// na linha inteira em vez do início dela.
const BARE_STAGE_LINE =
  /^(?:HOOK|GANCHO|INTRO|OUTRO|CTA|PAYOFF|PAGAMENTO|ESCALATION|ESCALADA|RHYTHM|RITMO|MICRO\s+(?:REWARD|RECOMPENSA)(?:\s*\d+)?|BEAT(?:\s*\d+)?|SCENE(?:\s*\d+)?|CENA(?:\s*\d+)?|FACT(?:\s*\d+)?|FATO(?:\s*\d+)?|PART(?:\s*\d+)?|STEP(?:\s*\d+)?)\s*[:.\-–—]?$/i

/** Tira a decoração da linha e devolve as PALAVRAS: "## Hook" → "Hook",
 *  "— CTA —" → "CTA", "- Fact one" → "Fact one", "* Fact one" → "Fact one". */
function unwrapLineDecoration(line: string): string {
  let t = line.trim()
  t = t.replace(/^#{1,6}\s*/, '')
  const fenced = FENCED_LINE.exec(t)
  if (fenced) t = fenced[1].trim()
  t = t.replace(/^[-*•]\s+/, '')
  return t
}


// ═══ KINEO-ROTEIRO-DE-CINEMA-2026-09-03 (sprint-assinaturas #3 / B2) ═══════
//
// O DEFEITO, medido no banco em 03/09 (contas externas, 60 dias):
// 22 pessoas colaram no Studio um ROTEIRO DE CINEMA do ChatGPT — o formato
// padrão que ele devolve quando se pede um Short:
//
//     ### Scene 1 — One Earth | 0–7 sec
//     **Visual:** Earth slowly rotating in space, sunrise across continents.
//     **Voice-over:**
//     “Across this beautiful Earth, people speak different languages…”
//     **On-screen text:**
//
// O parser de hoje derruba `## header`, `speed:` e linha em MAIÚSCULAS — e
// deixa passar TODO o resto. Resultado: o narrador lê em voz alta
// "Visual: Earth slowly rotating in space, sunrise appearing across different
// continents. Voice-over. Across this beautiful Earth…". A pessoa escreveu a
// fala entre aspas, numa linha marcada com o rótulo `Voice-over:`, e o filme
// dela saiu com a direção de arte narrada.
//
// POR QUE ESSAS 22 PESSOAS IMPORTAM MAIS QUE O NÚMERO SUGERE: elas fazem
// 2,45 filmes cada, contra 1,53 do resto da base (mesma janela de 60 dias).
// São o cliente de MAIOR esforço que existe aqui — quem escreve um roteiro
// inteiro no ChatGPT e vem colar. Elas tentam de novo porque o primeiro saiu
// errado. O ChatGPT é o único canal que converte (3 dos 3 últimos assinantes).
//
// A CAUSA MECÂNICA: todo filtro deste arquivo ancora em `^\s*` — e o ChatGPT
// escreve `**Visual:**`, `### 🎬 Scene 1`, `> “fala”`. O asterisco, a cerquilha
// e o emoji na frente do rótulo desarmam sozinhos o DIRECTIVE_LINE inteiro.
// Por isso `style:` era filtrado desde o Push #237 e `**Style:**` nunca foi.
//
// AS QUATRO REGRAS NOVAS (determinísticas, nenhuma chamada de modelo):
//  1. RÓTULO DE PRODUÇÃO nunca é fala: `Visual:`, `Camera:`, `On-screen text:`,
//     `SFX:`, `Prompt:`, `Título:`, `Personagens:` … — depois de DESEMBRULHAR
//     a decoração (`**`, `#`, `>`, `-`, emoji) do começo da linha.
//  2. LINHA DE TEMPO nunca é fala: `0:00–0:04`, `0–8 sec`, `8–18 sec — THE
//     PROBLEM`.
//  3. CABEÇALHO DE CENA nunca é fala: `Scene 1 — …`, `Cena 2:`, `Clip 3`,
//     `ESCENA 1 — EL GANCHO` (o filtro de MAIÚSCULAS só pegava o último).
//  4. PREÂMBULO DE ASSISTENTE nunca é fala, e só no topo do texto:
//     "Absolutely. Below is a **complete content package**…" (1 caso real,
//     30/08). Exige verbo de entrega E substantivo de entregável, para não
//     comer uma narração que comece com "Sure, he said".
//
// E A REGRA QUE DEVOLVE O FILME CERTO (a que vale dinheiro):
//  5. Quando o texto tem DOIS OU MAIS rótulos de FALA (`Voiceover:`,
//     `Narration:`, `Narrador:`, `Diálogo:`…), ele É um roteiro de cinema — a
//     pessoa já nos disse, linha por linha, o que é para falar. Nesse caso a
//     narração passa a ser SÓ o que está sob esses rótulos, e tudo antes do
//     primeiro deles (preâmbulo, lista de personagens, ficha técnica) morre.
//     Dois é o piso de propósito: um rótulo sozinho pode ser a ficha de voz
//     ("Narration: natural male American English voice"), não um roteiro.
//
// TRAVA DE SEGURANÇA: se as regras novas esvaziarem uma narração que o parser
// antigo teria salvo, o resultado ANTIGO volta inteiro. Nenhum roteiro que
// funcionava hoje pode virar string vazia por causa desta mudança — esse é
// exatamente o erro de 13/08 (`voiceover_script is required` na cara do
// usuário, depois de todo o custo) que a salvaguarda tolerante existe para
// impedir.
//
// INTERAÇÃO COM O #1 (degrau de narração, mesmo dia): a régua mede
// `parseUserScript().narration`. Com as regras novas ela passa a medir a FALA
// DE VERDADE, não a direção de arte. Um roteiro de cinema de 60s cuja fala
// real dá 22s agora DESCE para 20s e sai como filme curto e correto, em vez
// de sair com 60s de narrador lendo "Visual dois pontos".

/** Tira a decoração do INÍCIO da linha (markdown, citação, bullet, emoji) sem
 *  tocar no resto — é o que faz `**Visual:**` ser reconhecido como `Visual:`. */
function unwrapLabelHead(line: string): string {
  let t = (line ?? '').toString()
  // Duas passadas: emoji costuma vir DEPOIS do markdown ("### 🎬 Scene 1").
  for (let i = 0; i < 2; i++) {
    t = t.replace(/^[\s>*_`~#•·\-–—]+/, '')
    t = t.replace(/^(?:[←-⯿☀-➿️‍\uD800-\uDFFF]+\s*)+/, '')
  }
  return t.trim()
}

/** Rótulo de produção: a linha descreve imagem, som, texto na tela, ficha
 *  técnica ou instrução — nunca a fala. Casa também "Title/Hook:". */
const STAGE_LABEL_LINE =
  /^(visuals?|visual style|imagem|imagen|camera|c[âa]mera|c[áa]mara|action|acci[óo]n|a[çc][ãa]o|movement|body movement|posture|motion|expression|gesture|shot|angle|lighting|luz|on-?screen(?:\s+text)?|onscreen|text on screen|texto (?:en pantalla|em tela|na tela)|screen|tela|caption|captions|subtitle|subtitles|legend|legenda|sfx|vfx|sound|audio|music|m[úu]sica|bgm|b-?roll|footage|(?:\w+\s+)?prompt|title|t[íi]tulo|theme|tema|length|duration|duraci[óo]n|dura[çc][ãa]o|genre|g[ée]nero|target(?:\s+(?:length|duration|audience|age|group|platform|market|viewer|viewers|format))?|audience|p[úu]blico|style|estilo|tone|tom|mood|character|characters|personagens|personajes|cast|transition|cut|note|notes|nota|notas|hashtags|disclaimer|end suspense|setting|location|props|wardrobe|overlay|logo|graphics?|effects?|voice style|pacing|ritmo|aspect|platform|format|formato|resolution|orientation|output|deliverable)(\s*[\/|]\s*[\w\s]{1,20})?\s*[:：]/i

/** Linha que é só marcação de tempo, com ou sem título colado
 *  ("0:00–0:04", "0–8 sec", "8–18 sec — THE PROBLEM", "(0-5 s)"). */
const TIMECODE_LINE =
  /^\(?\d{1,2}\s*[:.]\s*\d{2}\s*[–—\-~aà]{1,3}\s*\d{1,2}\s*[:.]\s*\d{2}|^\(?\d{1,3}\s*[–—\-~]\s*\d{1,3}\s*(?:sec(?:ond)?s?|s\b|seg(?:undo)?s?|сек|min(?:ute)?s?)/i

/** Cabeçalho de cena em qualquer caixa e em 4 idiomas. */
const SCENE_HEADER_LINE =
  /^(scene|cena|escena|sc[èe]ne|clip|beat|act|ato|acto|episode|epis[óo]dio|episodio|part|parte|step|passo|paso)\s*#?\s*\d+\b/i

/** Rótulo de FALA: a pessoa marcou explicitamente o que é para narrar. */
const SPEECH_LABEL_LINE =
  /^(voice\s?-?\s?over|voiceover|vo|narration|narrator|narrador|narradora|narra[çc][ãa]o|narraci[óo]n|dialogue|di[áa]logo|dialogo|fala|falas|speech|spoken(?:\s+text)?|line|lines|voz)\s*(?:\([^)]{0,60}\))?\s*[:：]/i

/** Preâmbulo de assistente: só vale nas primeiras linhas e exige verbo de
 *  entrega + substantivo de entregável, para nunca comer narração real. */
const ASSISTANT_PREAMBLE_LINE =
  /^(absolutely|sure|certainly|of course|got it|understood|here'?s|here is|below is|here you go|use this as|great choice|perfect|awesome|no problem|happy to help|claro|com certeza|aqu[íi] est[áa]|segue|abaixo est[áa])\b[^\n]{0,240}\b(script|roteiro|guion|gui[óo]n|package|pacote|prompt|video|v[íi]deo|short|shorts|reel|concept|conceito|scene|scenes|version|vers[ãa]o|breakdown|outline|storyboard|copy|ideia|idea)\b/i

/** Índice do entregável, o irmão do preâmbulo: "Each concept includes:
 *  hook, 10 scenes with timing, lyrics…". Só vale na janela do topo, e só
 *  quando o verbo de listagem vem acompanhado de um substantivo de
 *  entregável — assim "The tomb contains gold" continua sendo narração. */
const DELIVERABLE_INDEX_LINE =
  /^(each|every|this|these|the)\b[^\n]{0,60}\b(includes?|contains?|consists of|comes with|is designed for|are designed for)\b[^\n]{0,200}\b(hook|hooks|scene|scenes|script|scripts|roteiro|lyrics|timing|hashtag|hashtags|title|titles|prompt|prompts|concept|concepts|direction|breakdown|caption|captions|voiceover|narration)\b/i

/** Uma das três classes que nunca são fala, já desembrulhada. */
function isStageDirectionLine(line: string): boolean {
  const u = unwrapLabelHead(line)
  if (!u) return false
  if (SPEECH_LABEL_LINE.test(u)) return false
  return STAGE_LABEL_LINE.test(u) || TIMECODE_LINE.test(u) || SCENE_HEADER_LINE.test(u)
}

/** Tira o preâmbulo de assistente do TOPO (no máximo 3 linhas com texto). */
export function stripAssistantPreamble(raw: string): string {
  const lines = (raw ?? '').toString().split(/\r?\n/)
  let i = 0
  let vistas = 0
  while (i < lines.length && vistas < 3) {
    const u = unwrapLabelHead(lines[i])
    if (!u) { i++; continue }
    if (!ASSISTANT_PREAMBLE_LINE.test(u) && !DELIVERABLE_INDEX_LINE.test(u)) break
    vistas++
    i++
  }
  return vistas === 0 ? (raw ?? '').toString() : lines.slice(i).join('\n')
}

/**
 * Regra 5. Devolve SÓ a fala rotulada quando o texto é um roteiro de cinema
 * (dois ou mais rótulos de fala); `null` quando não é — e aí nada muda.
 *
 * Um bloco de fala começa no rótulo (o que vier depois dos dois pontos conta)
 * e vai até a próxima linha rotulada, cabeçalho, cena ou marcação de tempo.
 * Tudo que vem ANTES do primeiro rótulo de fala é ficha técnica e sai.
 */
export function screenplaySpeechOnly(raw: string): string | null {
  const lines = (raw ?? '').toString().split(/\r?\n/)
  const rotulos = lines.filter((l) => {
    const u = unwrapLabelHead(l)
    return Boolean(u) && SPEECH_LABEL_LINE.test(u)
  }).length
  if (rotulos < 2) return null

  const guardadas: string[] = []
  let dentro = false
  for (const line of lines) {
    const u = unwrapLabelHead(line)
    if (!u) continue
    if (SPEECH_LABEL_LINE.test(u)) {
      dentro = true
      const resto = u.replace(SPEECH_LABEL_LINE, '').trim()
      if (resto) guardadas.push(resto)
      continue
    }
    if (isStageDirectionLine(line) || sectionHeaderName(line) !== null) {
      dentro = false
      continue
    }
    if (dentro) guardadas.push(u)
  }
  const junto = guardadas.join('\n').trim()
  return junto ? junto : null
}

function cleanNarration(raw: string, lenient = false, roteiroDeCinema = true): string {
  // KINEO-ROTEIRO-DE-CINEMA-2026-09-03: regra 5 primeiro (fala rotulada manda
  // em tudo); sem rotulo de fala, so o preambulo do assistente sai do topo.
  const base = roteiroDeCinema
    ? (screenplaySpeechOnly(raw) ?? stripAssistantPreamble(raw))
    : raw
  const kept: string[] = []
  let inMetadataSection = false
  for (const line of base.split(/\r?\n/)) {
    const section = sectionHeaderName(line)
    if (section !== null) {
      // Named header: drop the header line, switch mode based on its kind.
      // Vale nos DOIS modos: "— VOICE (ElevenLabs) —" é nota de produção, e
      // salvar palavras nunca pode virar o TTS lendo instrução de edição.
      inMetadataSection = isNonNarrationSection(section)
      continue
    }
    if (inMetadataSection) continue
    // Regras 1-3: rotulo de producao, marcacao de tempo e cabecalho de cena
    // nunca sao fala - nem no modo tolerante, onde salvar palavras jamais
    // pode virar o narrador lendo "Visual dois pontos".
    if (roteiroDeCinema && isStageDirectionLine(line)) continue
    if (lenient ? isNeverSpeechLine(line) : isDroppableLine(line)) continue
    // Inline stage prefix ("HOOK: ...") — strip the label, keep the speech.
    const stripped = (lenient ? unwrapLineDecoration(line) : line).replace(INLINE_STAGE_PREFIX, '')
    if (!stripped.trim()) continue
    if (lenient && BARE_STAGE_LINE.test(stripped.trim())) continue
    kept.push(stripped)
  }
  const limpo = kept
    .join(' ')
    // Remove any remaining bracketed stage directions / markers.
    .replace(/\[[^\]]*\]/g, ' ')
    // Drop markdown emphasis the TTS would otherwise vocalize oddly.
    .replace(/[*_`#>]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  // TRAVA DE SEGURANCA (KINEO-ROTEIRO-DE-CINEMA-2026-09-03): se as regras
  // novas comeram tudo, devolve exatamente o que o parser antigo devolveria.
  // Nenhum roteiro que funcionava pode virar string vazia por causa delas.
  if (roteiroDeCinema && !limpo) return cleanNarration(raw, lenient, false)
  return limpo
}

/**
 * Push #236 — public, idempotent sanitizer for the TTS / caption boundary.
 *
 * Strips every bracketed marker ([Pexels: ...], [Scene 2], [HOOK], [Beat], ...),
 * drops standalone directive lines (speed:/duration:/voice:/music:/...), and
 * removes markdown emphasis so the narrator can never vocalize a stage
 * direction. This is the single function every narration path should pass
 * through before it is spoken or rendered as a caption.
 *
 * Why this exists: in some fall-back paths the RAW user prompt (markers and
 * all) reached OpenAI TTS, so the voice read "[Pexels: rocket launch]" aloud.
 * Running this at each TTS call site guarantees clean speech regardless of how
 * the script was assembled. Safe to call on already-clean text — idempotent.
 */
export function stripScriptMarkers(raw: string): string {
  return cleanNarration((raw ?? '').toString())
}

/**
 * KINEO-VOICEOVER-SALVAGE-2026-08-13 — resgate para o caso em que o
 * saneamento come 100% de um roteiro que TINHA texto.
 *
 * O DEFEITO, medido em produção (13/08, usuário vindo de `chatgpt.com`,
 * 3min40 entre o cadastro e o erro): o cliente garante que `voiceover_script`
 * chega NÃO-VAZIO (KINEO-VOICEOVER-FALLBACK-2026-06-30, três níveis de
 * fallback), e o servidor decide o 400 DEPOIS de sanear. Entre as duas coisas
 * está `cleanNarration`, que derruba a LINHA INTEIRA em `- bullet`, `## header`
 * e linha toda em MAIÚSCULAS. Ou seja: o formato padrão de saída do ChatGPT —
 * cabeçalho markdown + bullets — é apagado por completo, sobra string vazia, e
 * `/api/compose` responde `voiceover_script is required.` na cara do usuário,
 * no estágio `clips_ready`: depois do roteiro, depois do B-roll, depois de todo
 * o custo. Justamente no único canal de aquisição que não decai, e para o qual
 * a casa publicou uma landing page convidando essas pessoas.
 *
 * A correção NÃO afrouxa o saneamento: `stripScriptMarkers` continua idêntica e
 * é sempre tentada primeiro, então todo roteiro que já funcionava segue byte a
 * byte igual. O modo tolerante só existe para o caso "sobrou zero":
 *   - continua derrubando o que NUNCA é fala (`speed:`/`duration:`/`9:16`,
 *     separadores) e as seções de metadados (VOICE/EDITING/NOTES/LEGEND);
 *   - continua derrubando a linha que é só o rótulo do beat ("HOOK", "CTA");
 *   - mas DESEMBRULHA `-`, `*`, `#` e cercas de travessão em vez de apagar a
 *     linha, e mantém as palavras.
 *
 * Devolve '' quando realmente não sobrou nada — aí o chamador decide (o
 * `/api/compose` cai no `topic` do usuário antes de negar).
 */
export function salvageScriptNarration(raw: string): string {
  return cleanNarration((raw ?? '').toString(), true)
}

/**
 * Parse a clamped speed value from the raw script, or null when absent.
 * Clamped to the same 0.7–1.3 band generateTTS() accepts so an out-of-range
 * directive can't push the voice into unnatural territory.
 */
export function parseSpeed(raw: string): number | null {
  const m = (raw ?? '').match(SPEED_DIRECTIVE)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.max(0.7, Math.min(1.3, n))
}

export function parseUserScript(raw: string): ParsedScript {
  const text = (raw ?? '').toString()
  const speed = parseSpeed(text)

  // Push #241 — pair each marker with the narration that FOLLOWS it.
  //
  // The channel's template puts the visual cue at the START of every beat line:
  //   "[Pexels: <query>] <narration for this beat>"
  // The earlier logic paired each marker with the text that PRECEDED it, which
  // is correct only for the inverted "<narration> [Pexels]" layout. On the real
  // marker-first scripts that off-by-one shifted every clip one beat out of sync
  // with its narration: the first marker captured the (empty) metadata header,
  // the hook line attached to the second clip's query, and so on down the whole
  // script. Forward-pairing fixes it so segment N carries BOTH query N and
  // narration N.
  //
  // Each marker owns the text from the end of its bracket up to the next marker
  // (or the end of the script). Anything before the first marker is the metadata
  // header block and is intentionally dropped from the per-segment narration —
  // the full `narration` field below still re-derives the complete spoken text.
  const markers: Array<{ start: number; end: number; query: string }> = []
  let m: RegExpExecArray | null
  PEXELS_MARKER.lastIndex = 0
  while ((m = PEXELS_MARKER.exec(text)) !== null) {
    markers.push({
      start: m.index,
      end: PEXELS_MARKER.lastIndex,
      query: m[1].replace(/\s{2,}/g, ' ').trim(),
    })
  }

  const segments: ParsedSegment[] = []
  for (let i = 0; i < markers.length; i++) {
    const { end, query } = markers[i]
    if (!query) continue
    const followEnd = i + 1 < markers.length ? markers[i + 1].start : text.length
    const voiceover = cleanNarration(text.slice(end, followEnd))
    segments.push({ voiceover, pexelsQuery: query })
  }

  const hasMarkers = segments.length > 0
  const narration = cleanNarration(text)

  return { hasMarkers, segments, narration, speed }
}
