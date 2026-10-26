// [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] KINEO-META95-IDEIA-1910 — a IDEIA SOLTA passa pelo escritor
// marcado do /api/generate-script, e dali em diante as falas são VERBATIM.
//
// Diagnóstico da meta 95 (19/10, 7 dias): quando a pessoa digita uma ideia solta e o roteiro era escrito pela IA DENTRO da
// rota do cinematic (verbatim=false → generateScenes escreve fala E imagem cena a cena), NENHUM filme chegou a 95 (33 filmes,
// média 80). Os caminhos em que o roteiro nasce marcado (HOOK/MICRO REWARD/ESCALATION/RHYTHM/PAYOFF, falas parseadas EM
// CÓDIGO e o GPT só dirige a câmera) ficam entre 33 % e 57 % ≥ 95. Defeitos medidos no caminho antigo:
//   (a) a fala deriva do pedido (cada cena reescreve a história);
//   (b) o filtro anti-invenção (removerDatasInventadas + scrubInventedSetting) apaga PALAVRAS da fala do escritor e deixa
//       buracos: "No Oceano, em, um submarino desaparece… O : uma área…", "In the year, a mysterious disappearance…";
//   (c) meta-texto do roteirista narrado: "This particular scene does not include any voiceover narration…" (5cb320bb);
//   (d) brief longo ("Create a 45-second story…") num filme de 15 s: ~21 s de fala cortados no fim (67431ef0).
//
// O conserto, aqui (puro, sem rede: o escritor e o rastro chegam injetados pela rota):
//   1. ehIdeiaSolta — o MESMO predicado de "verbatim" da rota (marcadores [Pexels] OU "as is" que não é brief); só a ideia
//      solta passa por aqui. Roteiro colado, ChatGPT, marcado do cliente: nada muda.
//   2. temaParaOEscritor — o tamanho que o TEXTO pede ("45-second story") vira o do FILME escolhido (o roteiro nasce no
//      tamanho do filme); ideia mais longa que o teto do filme curto vai como "condense a história inteira" (condensar,
//      nunca amputar o fim). Os dois casos gravam aviso (idea_length_warning).
//   3. O escritor é o do /api/generate-script (a rota chama o POST dele: mesmo prompt, mesma régua por motor — clássicos
//      3,1 pal/s, hollywood 2,3 —, mesma guarda de recusa, mesmo fecho do filme curto, mesmo script_written com a ideia).
//   4. roteiroSemMetaTexto — fala que descreve cena/instrução/"voiceover"/pista sai como FRASE INTEIRA (nunca palavra a
//      palavra), no molde da guarda de recusa (lib/modelRefusal.ts).
//   5. avaliarRoteiroEscrito — só entra o roteiro que a rota vai aceitar: marcadores, nenhuma recusa nem meta-texto, fala
//      acima do piso do portão de narração (o pior caso: a persona clássica mais rápida, ou 2,3 na hollywood; "ficar abaixo
//      é defeito") e, no filme curto, dentro da faixa e das guardas da rota. Senão: o caminho de antes, com o motivo no rastro.
//   6. promptComRoteiro — o pedido da rota vira "[Idea: <ideia>]" + o roteiro marcado: a ideia entre colchetes nunca é falada
//      (o parser tira colchetes), mas continua visível para quem lê o pedido (estilo, ficha, elenco, lugar, o planejador);
//      a fala e os blocos são EXATAMENTE os do roteiro (conferido aqui; se não forem, vai o roteiro sozinho).
// Com marcadores, a rota segue o caminho verbatim — o mesmo do "IA no cliente" — e o filtro anti-invenção do caminho
// clássico (que só roda com verbatim=false) não toca mais a fala. O filtro em si é de outra entrega (KINEO-META95-ASSUNTO-1910).
import { parseUserScript, looksLikeBrief } from '@/lib/scriptParser'
import { looksLikeModelRefusal } from '@/lib/modelRefusal'
import { MIN_COVERAGE } from '@/lib/narrationFit'
import { speechFamilyForQuality, speechRateFor } from '@/lib/speechRate'
import { fastestClassicPersonaRate } from '@/lib/scriptWriterRate'
import { isShortFilmTarget } from '@/lib/shortFilmScript'
import { checarFalaDoFilmeCurto, checarFalaCurtaDoMotor, faixaAceitaNoFilmeCurtoDoMotor, maxWordsCurtoDoMotor } from '@/lib/durationByEngine'
import { PASTED_SCRIPT_MIN_WORDS } from '@/lib/pastedScript'

export const META95_IDEIA_VERSAO = 'meta95_ideia_1910'
export const IDEIA_ESCRITA_EVENTO = 'idea_written_on_server'
export const IDEIA_TAMANHO_AVISO_EVENTO = 'idea_length_warning'
export const CENA_META_TEXTO_EVENTO = 'scene_meta_text_removed'
/** O motor que a rota do cinematic assume sem `engine` (o costQuality cai em 'cinematic_ai' = Seedance 1.5). */
export const MOTOR_PADRAO_DO_CINEMATIC = 'seedance'
/** Quanto da ideia original viaja no pedido, entre colchetes (contexto de estilo/ficha; nunca falado). */
export const IDEIA_NO_PEDIDO_MAX_CHARS = 600

const contarPalavras = (t: string): number => String(t ?? '').replace(/\[[^\]]*\]/g, ' ').split(/\s+/).filter(Boolean).length

// ═══ 1. É ideia solta? ═══════════════════════════════════════════════════════════════════════════════════════════════

/** O MESMO predicado da rota (const verbatim = …): é ideia solta quando a rota NÃO iria pelo caminho verbatim. */
export function ehIdeiaSolta(args: { prompt: string; scriptMode?: unknown }): boolean {
  const prompt = String(args.prompt ?? '')
  if (!prompt.trim()) return false
  const parsed = parseUserScript(prompt)
  const userSaysVerbatim = (typeof args.scriptMode === 'string' ? args.scriptMode : '').toLowerCase() === 'verbatim'
  if (userSaysVerbatim) return false // PEDIDO-FIEL-2610 — a brief requires review at intake, never silent rewriting.
  const brief = userSaysVerbatim && !parsed.hasMarkers && looksLikeBrief(prompt)
  const verbatim = (parsed.hasMarkers && parsed.segments.length > 0) || (userSaysVerbatim && !brief)
  return !verbatim
}

// ═══ 2. O tamanho que o texto pede × o tamanho do filme ══════════════════════════════════════════════════════════════

const UNIDADE_SEG = String.raw`(?:seconds?|secs?|s|segundos?|segs?)`
const UNIDADE_MIN = String.raw`(?:minutes?|mins?|minutos?)`
const OBRA = String.raw`(?:video|vídeo|story|stories|história|historia|short|shorts|film|filme|movie|clip|clipe|reel|script|roteiro|tiktok|narration|narração|curta)`
const NUM_MIN = String.raw`(\d{1,2}|one|a|an|um|uma)`
// "a 45-second story", "45 second video", "45s short", "1-minute video", "one minute story" (número ANTES, obra logo depois)
const ANTES = new RegExp(String.raw`\b(\d{1,3})\s*-?\s*${UNIDADE_SEG}\s+(?:long\s+)?(?:[\p{L}-]+\s+)?${OBRA}\b|\b${NUM_MIN}\s*-?\s*${UNIDADE_MIN}\s+(?:long\s+)?(?:[\p{L}-]+\s+)?${OBRA}\b`, 'giu')
// "vídeo de 45 segundos", "story of 45 seconds", "história de 1 minuto" (obra ANTES, número depois)
const DEPOIS = new RegExp(String.raw`\b${OBRA}\s+(?:de|of|com|with)\s+(\d{1,3})\s*${UNIDADE_SEG}\b|\b${OBRA}\s+(?:de|of|com|with)\s+${NUM_MIN}\s*${UNIDADE_MIN}\b`, 'giu')

const minutos = (s: string): number => (/^\d+$/.test(s) ? Number(s) : 1)
/** Verbo de PEDIDO (en/pt/es) antes do tamanho, na mesma frase: é instrução ao escritor, não fato da história. */
const VERBO_DE_PEDIDO = /\b(?:create|make|write|generate|produce|give me|i want|i need|turn|crie|criar|cria|fa[çc]a|fazer|faz|escreva|escrever|gere|gerar|quero|preciso|monte|transforme|crea|crear|haz|hacer|escribe|genera|quiero|necesito)\b/i

interface PedidoDeTamanho { inicio: number; fim: number; segundos: number }

/**
 * Os trechos do texto que pedem um TAMANHO DE FILME ("a 45-second story", "vídeo de 1 minuto"). Só conta quando é pedido:
 * há verbo de pedido antes, na mesma frase, ou o trecho abre o texto (até 3 palavras antes). "a 30-second clip went viral"
 * no meio da história é FATO da história e fica intocado.
 */
function pedidosDeTamanho(texto: string): PedidoDeTamanho[] {
  const t = String(texto ?? '')
  const achados: PedidoDeTamanho[] = []
  for (const re of [ANTES, DEPOIS]) {
    re.lastIndex = 0
    for (const m of t.matchAll(re)) {
      const inicio = m.index ?? 0
      const antes = t.slice(0, inicio)
      const frase = antes.slice(Math.max(antes.lastIndexOf('.'), antes.lastIndexOf('!'), antes.lastIndexOf('?'), antes.lastIndexOf('\n')) + 1)
      const abreOTexto = antes.trim().split(/\s+/).filter(Boolean).length <= 3
      if (!VERBO_DE_PEDIDO.test(frase) && !abreOTexto) continue
      const segundos = m[1] ? Number(m[1]) : minutos(String(m[2] ?? '').toLowerCase()) * 60
      if (!achados.some((a) => inicio < a.fim && a.inicio < inicio + m[0].length)) achados.push({ inicio, fim: inicio + m[0].length, segundos })
    }
  }
  return achados.sort((a, b) => a.inicio - b.inicio)
}

/** O primeiro tamanho de filme que o texto PEDE ("Create a 45-second story" → 45), em segundos; null sem pedido de tamanho. */
export function duracaoPedidaNoTexto(texto: string): number | null {
  const p = pedidosDeTamanho(texto)
  return p.length ? p[0].segundos : null
}

/** Troca, no texto, o tamanho pedido pelo do filme ("45-second story" → "15-second story"). Só o número e a unidade mudam. */
export function ajustarDuracaoDaIdeia(ideia: string, segundosDoFilme: number): { texto: string; segundosNoTexto: number | null; ajustado: boolean } {
  const texto = String(ideia ?? '')
  const pedidos = pedidosDeTamanho(texto)
  const segundosNoTexto = pedidos.length ? pedidos[0].segundos : null
  if (segundosNoTexto === null || pedidos.every((p) => p.segundos === segundosDoFilme)) return { texto, segundosNoTexto, ajustado: false }
  const pt = (u: string) => /^seg|^min.*o/i.test(u)
  const novo = (u: string) => (pt(u) ? `${segundosDoFilme} segundos` : `${segundosDoFilme}-second`)
  const troca = (trecho: string): string =>
    trecho
      .replace(new RegExp(String.raw`\b(\d{1,3})\s*-?\s*(${UNIDADE_SEG})\b`, 'iu'), (_m, _n, u: string) => novo(u))
      .replace(new RegExp(String.raw`\b${NUM_MIN}\s*-?\s*(${UNIDADE_MIN})\b`, 'iu'), (_m, _n, u: string) => novo(u))
  let saida = ''
  let cursor = 0
  for (const p of pedidos) {
    saida += texto.slice(cursor, p.inicio) + troca(texto.slice(p.inicio, p.fim))
    cursor = p.fim
  }
  saida += texto.slice(cursor)
  return { texto: saida, segundosNoTexto, ajustado: saida !== texto }
}

export interface TemaDoEscritor {
  /** O texto que vai como `topic` ao /api/generate-script. */
  tema: string
  /** O tamanho que o texto pedia (null = não pedia). */
  segundosNoTexto: number | null
  /** O pedido de tamanho foi trocado pelo do filme. */
  duracaoAjustada: boolean
  /** A ideia era maior que o teto do filme curto e foi como "condense a história inteira". */
  condensada: boolean
  palavrasDaIdeia: number
  tetoDoFilmeCurto: number | null
}

/**
 * O tema que o escritor recebe. Filme curto (≤ 20 s) com ideia acima do teto de fala do motor: a ideia inteira vai entre
 * colchetes atrás de "Condense this whole story…" — o escritor CONDENSA (começo, fatos-chave e fim), em vez de manter as
 * frases da pessoa (regra do roteiro colado, que dispara a partir de 45 palavras) e o fecho cortar frases depois.
 */
export function temaParaOEscritor(args: { ideia: string; seconds: number; engine?: string | null; language?: string | null }): TemaDoEscritor {
  const aj = ajustarDuracaoDaIdeia(args.ideia, args.seconds)
  const palavrasDaIdeia = contarPalavras(aj.texto)
  const curto = isShortFilmTarget(args.seconds)
  const teto = curto ? maxWordsCurtoDoMotor(args.engine ?? MOTOR_PADRAO_DO_CINEMATIC, args.seconds, args.language ?? undefined) : null
  // A partir de PASTED_SCRIPT_MIN_WORDS (45) o escritor trata o texto como roteiro colado ("mantenha as frases da pessoa",
  // lib/pastedScript.ts) — num filme curto isso é exatamente o que faz a fala passar do filme e o fecho cortar frases.
  if (teto !== null && palavrasDaIdeia >= Math.min(teto, PASTED_SCRIPT_MIN_WORDS)) {
    const semColchetes = aj.texto.replace(/[[\]]/g, ' ').replace(/\s+/g, ' ').trim()
    const tema = `Condense this whole story into a ${args.seconds}-second film of at most ${teto} spoken words — keep its beginning, its key facts and its ending; never cut it off midway:\n[${semColchetes}]`
    return { tema, segundosNoTexto: aj.segundosNoTexto, duracaoAjustada: aj.ajustado, condensada: true, palavrasDaIdeia, tetoDoFilmeCurto: teto }
  }
  return { tema: aj.texto, segundosNoTexto: aj.segundosNoTexto, duracaoAjustada: aj.ajustado, condensada: false, palavrasDaIdeia, tetoDoFilmeCurto: teto }
}

// ═══ 4. Meta-texto na fala (molde de lib/modelRefusal.ts) ════════════════════════════════════════════════════════════

/** Frases que descrevem a cena, dão instrução ou falam do próprio áudio — nunca são narração. */
const META_TEXTO: ReadonlyArray<RegExp> = [
  // "This particular scene does not include any voiceover narration" (5cb320bb), "no narration", "without voiceover"
  /\bvoice[\s-]?overs?\b/i,
  /\b(?:no|without(?: any)?|(?:does(?:n['’]t| not)|will not|won['’]t) (?:include|have|contain|feature) any)\s+(?:narration|narrator|spoken (?:words|lines))\b/i,
  /\b(?:this|the|each|every|next|following)\s+(?:particular\s+)?(?:scene|shot|clip|frame|segment|beat|sequence)\s+(?:does(?:n['’]t| not)|has no|contains?|includes?|shows?|will (?:show|feature|open|begin|end)|features?|depicts?|opens?|begins?|ends?|cuts?)\b/i,
  // direção de câmera e de montagem
  /\b(?:the\s+)?camera\s+(?:pans?|zooms?|cuts?|tilts?|tracks?|dollies|pulls back|pushes in|follows|slowly|moves|focuses)\b/i,
  /\b(?:cut to|fade (?:in|out|to black)|close-?up (?:of|on)|wide shot|aerial shot|establishing shot|b-?roll|stock footage|on-?screen text|text on screen|title card)\b/i,
  /^\s*(?:pexels|footage|visuals?|camera|shot|scene\s*\d*|caption|sfx|music|transition)\s*[:\-–]/i,
  // instrução ao modelo / sobre o próprio vídeo
  /\b(?:the|this) (?:video|short|clip|film) (?:will|should|must) (?:show|feature|start|open|end|include)\b/i,
  /\b(?:insert|add|display)\s+(?:the\s+)?(?:text|caption|title|footage|b-?roll|a shot|music)\b/i,
  // pt / es
  /\b(?:sem|nenhuma?)\s+(?:narra[çc][ãa]o|locu[çc][ãa]o|voz em off)\b/i,
  /\b(?:esta|essa|nesta|nessa|a pr[óo]xima)\s+(?:cena|tomada)\s+(?:n[ãa]o|mostra|tem|cont[ée]m|inclui|abre|come[çc]a|termina)\b/i,
  /\b(?:a\s+)?c[âa]mera\s+(?:se\s+)?(?:aproxima|afasta|corta|segue|gira|desliza)\b/i,
  /\bsin\s+(?:narraci[óo]n|voz en off|locuci[óo]n)\b/i,
  /\b(?:esta|en esta|la siguiente)\s+escena\s+(?:no|muestra|tiene|contiene|incluye)\b/i,
]

/**
 * A frase (avaliada sem as pistas entre colchetes) é meta-texto do roteirista, não narração. `pistaSozinha` (padrão true,
 * a fala de uma cena): frase que era SÓ pista ("[Pexels: …]" no lugar da fala) também é meta-texto. No roteiro marcado a
 * pista é estrutura e a rota a lê; ali roteiroSemMetaTexto passa false.
 */
export function ehMetaTextoDeFala(frase: string | null | undefined, pistaSozinha = true): boolean {
  const bruta = String(frase ?? '').trim()
  if (!bruta) return false
  const t = bruta.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t) return pistaSozinha && /\[[^\]]*\]/.test(bruta)
  return META_TEXTO.some((re) => re.test(t))
}

/** Frases da fala, na ordem (corte depois de . ! ? … seguido de espaço). */
export function frasesDaFala(texto: string): string[] {
  return String(texto ?? '').split(/(?<=[.!?…])\s+/).map((f) => f.trim()).filter(Boolean)
}

/** Tira da fala as frases de meta-texto, INTEIRAS. As outras frases ficam exatamente como estão (nenhuma palavra muda). */
export function semMetaTexto(texto: string, pistaSozinha = true): { texto: string; removidas: string[] } {
  const frases = frasesDaFala(texto)
  const removidas = frases.filter((f) => ehMetaTextoDeFala(f, pistaSozinha))
  if (removidas.length === 0) return { texto: String(texto ?? ''), removidas }
  return { texto: frases.filter((f) => !ehMetaTextoDeFala(f, pistaSozinha)).join(' '), removidas }
}

const CABECALHO_E_PISTAS = /^(\s*(?:(?:HOOK|MICRO\s+REWARD\s*\d*|ESCALATION|RHYTHM|PAYOFF)\b[^:\n[]*:\s*)?(?:\[[^\]]*\]\s*)*)([\s\S]*)$/i
const SO_CABECALHO = /^\s*(?:HOOK|MICRO\s+REWARD\s*\d*|ESCALATION|RHYTHM|PAYOFF)\b[^:\n[]*:?\s*$/i

/**
 * O roteiro marcado sem meta-texto: linha a linha, o cabeçalho (HOOK…:) e as pistas [Pexels: …] do começo ficam; da fala
 * saem só frases inteiras de meta-texto. Linha cuja fala era toda meta-texto sai inteira, cabeçalho e pista juntos (nenhum
 * bloco mudo); quem decide se o que sobrou ainda é filme é avaliarRoteiroEscrito.
 */
export function roteiroSemMetaTexto(script: string): { script: string; removidas: string[] } {
  const crlf = String(script ?? '').includes('\r\n')
  const linhas = String(script ?? '').replace(/\r\n/g, '\n').split('\n')
  const removidas: string[] = []
  const saida: string[] = []
  for (const linha of linhas) {
    if (!linha.trim() || SO_CABECALHO.test(linha)) { saida.push(linha); continue }
    const m = CABECALHO_E_PISTAS.exec(linha)
    const prefixo = m ? m[1] : ''
    const fala = m ? m[2] : linha
    const r = semMetaTexto(fala, false)
    if (r.removidas.length === 0) { saida.push(linha); continue }
    removidas.push(...r.removidas)
    if (!r.texto.trim()) continue
    saida.push(prefixo + r.texto)
  }
  const out = saida.join('\n')
  return { script: crlf ? out.replace(/\n/g, '\r\n') : out, removidas }
}

/**
 * Guarda das cenas do caminho antigo (generateScenes, quando o escritor marcado não serve): a fala de meta-texto nunca é
 * narrada — sai como frase inteira; a legenda acompanha. Muda as cenas no lugar; devolve o que saiu e de quais cenas.
 */
export function cenasSemMetaTexto<T extends { voiceover: string; caption: string }>(cenas: T[], legenda: (fala: string) => string): { removidas: string[]; cenas: number[] } {
  const removidas: string[] = []
  const indices: number[] = []
  cenas.forEach((c, i) => {
    if (typeof c.voiceover !== 'string' || !c.voiceover.trim()) return
    const r = semMetaTexto(c.voiceover)
    if (r.removidas.length === 0) return
    removidas.push(...r.removidas)
    indices.push(i)
    c.voiceover = r.texto
    c.caption = legenda(r.texto)
  })
  return { removidas, cenas: indices }
}

// ═══ 5. O roteiro escrito serve? ═════════════════════════════════════════════════════════════════════════════════════

export type MotivoDaRecusaDoRoteiro = 'sem_marcadores' | 'recusa_do_modelo' | 'meta_texto' | 'curto' | 'longo_para_o_filme'

export type AvaliacaoDoRoteiro =
  | { ok: true; palavras: number; piso: number; blocos: number }
  | { ok: false; motivo: MotivoDaRecusaDoRoteiro; palavras: number; piso: number; blocos: number }

/** Piso de palavras do portão de narração da rota, no pior caso (a voz mais rápida que a rota pode escolher). */
export function pisoDoPortao(args: { engine?: string | null; seconds: number; language?: string | null }): number {
  const engine = args.engine ?? MOTOR_PADRAO_DO_CINEMATIC
  const lang = args.language ?? 'en'
  if (isShortFilmTarget(args.seconds)) return faixaAceitaNoFilmeCurtoDoMotor(engine, args.seconds, MIN_COVERAGE, lang).min
  const ritmo = speechFamilyForQuality(engine) === 'hollywood'
    ? speechRateFor({ family: 'hollywood', language: lang }).wordsPerSecond
    : fastestClassicPersonaRate(lang).wordsPerSecond
  return Math.ceil(args.seconds * MIN_COVERAGE * ritmo - 1e-9)
}

/** O roteiro marcado que o escritor devolveu entra no filme? (só o que a rota vai aceitar: nenhum 422 novo para a ideia solta) */
export function avaliarRoteiroEscrito(args: { script: string; engine?: string | null; seconds: number; language?: string | null }): AvaliacaoDoRoteiro {
  const parsed = parseUserScript(String(args.script ?? ''))
  const palavras = parsed.narration.split(/\s+/).filter(Boolean).length
  const piso = pisoDoPortao(args)
  const blocos = parsed.segments.length
  const nao = (motivo: MotivoDaRecusaDoRoteiro): AvaliacaoDoRoteiro => ({ ok: false, motivo, palavras, piso, blocos })
  if (!parsed.hasMarkers || blocos === 0) return nao('sem_marcadores')
  if (looksLikeModelRefusal(parsed.narration)) return nao('recusa_do_modelo')
  if (frasesDaFala(parsed.narration).some((f) => ehMetaTextoDeFala(f))) return nao('meta_texto')
  if (palavras < piso) return nao('curto')
  const engine = args.engine ?? MOTOR_PADRAO_DO_CINEMATIC
  const guardaSeedance = checarFalaDoFilmeCurto({ engine, seconds: args.seconds, verbatim: true, narration: parsed.narration, language: args.language ?? undefined })
  const guardaMotor = checarFalaCurtaDoMotor({ engine, seconds: args.seconds, verbatim: true, narration: parsed.narration, language: args.language ?? undefined })
  if (!guardaSeedance.ok || !guardaMotor.ok) return nao('longo_para_o_filme')
  return { ok: true, palavras, piso, blocos }
}

// ═══ 6. O pedido que a rota passa a ler ══════════════════════════════════════════════════════════════════════════════

/** "[Idea: <ideia>]" + o roteiro marcado. A ideia vai sem colchetes, aspas e quebras (nunca vira fala nem rótulo de fala). */
export function promptComRoteiro(ideia: string, roteiro: string): string {
  const limpa = String(ideia ?? '').replace(/[[\]"“”«»]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, IDEIA_NO_PEDIDO_MAX_CHARS).trim()
  return limpa ? `[Idea: ${limpa}]\n${roteiro}` : roteiro
}

/** A fala e os blocos do pedido são EXATAMENTE os do roteiro (a linha da ideia não muda nada do que é falado). */
export function mesmaFalaQueORoteiro(prompt: string, roteiro: string): boolean {
  const a = parseUserScript(prompt)
  const b = parseUserScript(roteiro)
  return a.narration === b.narration && a.segments.length === b.segments.length && a.segments.every((s, i) => s.voiceover === b.segments[i].voiceover && s.pexelsQuery === b.segments[i].pexelsQuery)
}

// ═══ 7. A orquestração (a rota injeta o escritor e o rastro) ═════════════════════════════════════════════════════════

export interface RespostaDoEscritor { status: number; json: unknown }
export type Escritor = (corpo: { topic: string; language: string; targetSeconds: number; engine: string }) => Promise<RespostaDoEscritor>
export type Registrar = (name: string, metadata: Record<string, unknown>) => Promise<unknown>

export interface IdeiaNoEscritor {
  /** true = a rota troca o pedido por `prompt` (caminho verbatim com o roteiro marcado). */
  usar: boolean
  prompt: string
  outcome: 'not_idea' | 'used' | 'fallback'
  motivo: string | null
  roteiro: string | null
  metaRemovidas: string[]
  tema: TemaDoEscritor | null
}

/**
 * Ideia solta → escritor marcado → roteiro verbatim. Nunca lança e nunca bloqueia: qualquer tropeço (escritor fora, recusa,
 * roteiro curto, longo, sem marcadores) devolve `usar: false` e a rota segue o caminho de antes, com o motivo no rastro.
 */
export async function escreverIdeiaNoServidor(args: { prompt: string; scriptMode?: unknown; engine?: string | null; seconds: number; language: string; escritor: Escritor; registrar?: Registrar }): Promise<IdeiaNoEscritor> {
  const prompt = String(args.prompt ?? '')
  const nada: IdeiaNoEscritor = { usar: false, prompt, outcome: 'not_idea', motivo: null, roteiro: null, metaRemovidas: [], tema: null }
  if (!ehIdeiaSolta({ prompt, scriptMode: args.scriptMode })) return nada
  const engine = args.engine && args.engine.trim() ? args.engine.trim() : MOTOR_PADRAO_DO_CINEMATIC
  const registrar: Registrar = args.registrar ?? (async () => undefined)
  const rastro = async (name: string, metadata: Record<string, unknown>) => { try { await registrar(name, { ...metadata, version: META95_IDEIA_VERSAO }) } catch { /* rastro nunca derruba o filme */ } }
  const tema = temaParaOEscritor({ ideia: prompt, seconds: args.seconds, engine, language: args.language })
  if (tema.duracaoAjustada || tema.condensada) {
    await rastro(IDEIA_TAMANHO_AVISO_EVENTO, { film_seconds: args.seconds, seconds_in_text: tema.segundosNoTexto, length_adjusted: tema.duracaoAjustada, condensed: tema.condensada, idea_words: tema.palavrasDaIdeia, short_film_ceiling: tema.tetoDoFilmeCurto, engine })
  }
  const fallback = async (motivo: string, extra: Record<string, unknown> = {}): Promise<IdeiaNoEscritor> => {
    await rastro(IDEIA_ESCRITA_EVENTO, { outcome: 'fallback', reason: motivo, film_seconds: args.seconds, engine, language: args.language, condensed: tema.condensada, length_adjusted: tema.duracaoAjustada, ...extra })
    return { ...nada, outcome: 'fallback', motivo, tema }
  }
  let resposta: RespostaDoEscritor
  try {
    resposta = await args.escritor({ topic: tema.tema, language: args.language, targetSeconds: args.seconds, engine })
  } catch (e) {
    return fallback('writer_threw', { error_name: e instanceof Error ? e.name : 'unknown' })
  }
  const corpo = (resposta && typeof resposta.json === 'object' && resposta.json !== null ? resposta.json : {}) as Record<string, unknown>
  const escrito = typeof corpo.script === 'string' ? corpo.script.trim() : ''
  if (!resposta || resposta.status !== 200 || !escrito) return fallback(`writer_http_${resposta?.status ?? 'none'}`, { writer_reason: typeof corpo.reason === 'string' ? corpo.reason : null })
  const limpo = roteiroSemMetaTexto(escrito)
  const aval = avaliarRoteiroEscrito({ script: limpo.script, engine, seconds: args.seconds, language: args.language })
  if (!aval.ok) return fallback(aval.motivo, { words: aval.palavras, floor: aval.piso, blocks: aval.blocos, meta_removed: limpo.removidas.length })
  const comIdeia = promptComRoteiro(prompt, limpo.script)
  const novoPrompt = mesmaFalaQueORoteiro(comIdeia, limpo.script) ? comIdeia : limpo.script
  await rastro(IDEIA_ESCRITA_EVENTO, { outcome: 'used', reason: null, film_seconds: args.seconds, engine, language: args.language, words: aval.palavras, floor: aval.piso, blocks: aval.blocos, meta_removed: limpo.removidas.length, condensed: tema.condensada, length_adjusted: tema.duracaoAjustada, idea_line: novoPrompt !== limpo.script, writer_min_words: typeof corpo.minWords === 'number' ? corpo.minWords : null, writer_family: typeof corpo.family === 'string' ? corpo.family : null })
  return { usar: true, prompt: novoPrompt, outcome: 'used', motivo: null, roteiro: limpo.script, metaRemovidas: limpo.removidas, tema }
}
