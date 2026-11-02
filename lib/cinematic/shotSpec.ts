// KINEO-TRES-MODOS-2026-09-11 — "ISSO É UM PLANO, NÃO UMA HISTÓRIA."
//
// Caso real de 11/09 (render 802f024e, cliente do ChatGPT): a pessoa colou um
// bloco JSON com clip/duration/action/camera/vfx/combat_logic (Luffy desviando
// dos punhos de magma do Akainu, 10 segundos). A Kineo só sabia narrar: fez 5
// cenas de 35 s e a narradora LEU O JSON em voz alta. 15 créditos, a pessoa
// não voltou. Ordem do fundador: três modos — a IA escreve a história; você
// traz a história pronta; ou "só cria as imagens do que eu descrevi".
//
// Este módulo é a parte PURA do terceiro modo: reconhece um prompt de plano
// (shot spec) e o transforma num único prompt cinematográfico + segundos.
// Sem I/O, sem GPT. O guardião executa com o texto real do caso.

export interface ShotSpec {
  isShotSpec: boolean
  /** Segundos pedidos (4–12, teto do Seedance); 10 quando o texto não diz. */
  seconds: number
  /** Prompt único, em prosa, para o motor de vídeo. */
  prompt: string
  /** Chaves reconhecidas (para telemetria e para a mensagem ao cliente). */
  keys: string[]
  /** Por que foi classificado assim. */
  reason: 'json_shot_spec' | 'keyed_shot_spec' | 'camera_language' | 'narrative'
}

const SHOT_KEYS = ['clip', 'shot', 'scene', 'duration', 'action', 'camera', 'vfx', 'lighting', 'style', 'subject', 'motion', 'combat_logic', 'environment', 'mood', 'lens', 'composition']
const SHOT_KEY_RE = new RegExp('^\\s*"?(' + SHOT_KEYS.join('|') + ')"?\\s*[:=]\\s*(.+)$', 'i')
const CAMERA_RE = /\b(fpv|drone shot|tracking shot|dolly|crane shot|handheld|slow[- ]motion|slow-mo|close[- ]up|wide shot|overhead shot|low angle|pan(?:s|ning)? (?:over|across)|zoom(?:s|ing)? in)\b/i
const NARRATIVE_RE = /\b(once upon|my name is|i was|i am|he said|she said|story|because|years ago|in \d{4}|today|the truth is|did you know|here'?s why|this is how)\b/i
const SECONDS_RE = /(\d{1,2})\s*(?:s|sec|secs|seconds?|segundos?)\b/i

export const CLIP_MIN_SECONDS = 4
export const CLIP_MAX_SECONDS = 12
export const CLIP_DEFAULT_SECONDS = 10

function clampSeconds(n: number): number {
  if (!Number.isFinite(n)) return CLIP_DEFAULT_SECONDS
  return Math.max(CLIP_MIN_SECONDS, Math.min(CLIP_MAX_SECONDS, Math.round(n)))
}

function humanize(key: string): string {
  return key.replace(/_/g, ' ')
}

function stripQuotes(v: string): string {
  return v.trim().replace(/^["'“”]+|["'“”,]+$/g, '').trim()
}

/** Tenta ler o texto como JSON (com ou sem chaves externas, com quebras de linha soltas). */
function parseLooseJson(text: string): Record<string, unknown> | null {
  const t = text.trim()
  const candidates = [t, t.startsWith('{') ? t : `{${t}}`]
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
    } catch { /* tenta o próximo */ }
  }
  return null
}

/**
 * Classifica o texto. Regra: é plano quando (a) é JSON com ≥2 chaves de plano,
 * ou (b) ≥2 linhas "chave: valor" com chaves de plano, ou (c) tem linguagem de
 * câmera E nenhuma frase narrativa E menos de 60 palavras. Tudo o mais é história.
 */
export function detectShotSpec(text: string): ShotSpec {
  const raw = String(text ?? '').trim()
  const narrative = { isShotSpec: false, seconds: CLIP_DEFAULT_SECONDS, prompt: raw, keys: [], reason: 'narrative' as const }
  if (!raw) return narrative

  // (a) JSON
  const json = parseLooseJson(raw)
  if (json) {
    const keys = Object.keys(json).filter((k) => SHOT_KEYS.includes(k.toLowerCase()))
    if (keys.length >= 2) {
      const fields = Object.entries(json)
        .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
        .map(([k, v]) => [k.toLowerCase(), String(v).trim()] as const)
      const durationField = fields.find(([k]) => k === 'duration')?.[1] ?? ''
      const secs = clampSeconds(Number((durationField.match(SECONDS_RE) || [])[1] ?? NaN))
      const prompt = fields
        .filter(([k, v]) => k !== 'duration' && k !== 'clip' && k !== 'shot' && v)
        .map(([k, v]) => (k === 'action' || k === 'subject' ? v : `${humanize(k)}: ${v}`))
        .join('. ')
      return { isShotSpec: true, seconds: secs, prompt: prompt || raw, keys, reason: 'json_shot_spec' }
    }
  }

  // (b) linhas chave: valor
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const keyed = lines.map((l) => l.match(SHOT_KEY_RE)).filter((m): m is RegExpMatchArray => Boolean(m))
  if (keyed.length >= 2) {
    const keys = keyed.map((m) => m[1].toLowerCase())
    const durationLine = keyed.find((m) => m[1].toLowerCase() === 'duration')?.[2] ?? ''
    const secs = clampSeconds(Number((durationLine.match(SECONDS_RE) || [])[1] ?? NaN))
    const prompt = keyed
      .filter((m) => !['duration', 'clip', 'shot'].includes(m[1].toLowerCase()))
      .map((m) => (['action', 'subject'].includes(m[1].toLowerCase()) ? stripQuotes(m[2]) : `${humanize(m[1].toLowerCase())}: ${stripQuotes(m[2])}`))
      .join('. ')
    return { isShotSpec: true, seconds: secs, prompt: prompt || raw, keys, reason: 'keyed_shot_spec' }
  }

  // (c) linguagem de câmera, curto, sem narrativa
  const words = raw.split(/\s+/).filter(Boolean).length
  if (words <= 60 && CAMERA_RE.test(raw) && !NARRATIVE_RE.test(raw)) {
    const secs = clampSeconds(Number((raw.match(SECONDS_RE) || [])[1] ?? NaN))
    return { isShotSpec: true, seconds: secs, prompt: raw, keys: ['camera'], reason: 'camera_language' }
  }

  return narrative
}

/** Créditos de um clipe único (Seedance 1.5, 720p, 4–12 s). Decisão de preço do fundador pendente; 5 cobre o custo com folga. */
export const CLIP_CREDITS = 5

// KINEO-CLIPE-SEM-LETRAS-0111 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — revisor 01/11, Modo Clipe
// (cumiasammanis27, Seedance 1.5, 5 s, 2D de terror, prompt de 1.282 caracteres): tela do celular e último quadro com letras falsas
// ("G hcwy", "Siny Stoite"). A moldura só dizia "no readable text" como fragmento no FIM de um prompt longo, e o corte em 1.800
// caracteres podia levar até isso embora (o Studio aceita 6.000). O Seedance 1.5 NÃO tem negative_prompt no schema da fal (lido
// em 01/11), então a proteção vai no texto, em frase afirmativa: legenda/título inventado nunca, tela/placa/papel só com formas
// ou desfoque. Texto PEDIDO pelo cliente ("uma placa escrito ABERTO") fica — vira a única escrita legível, soletrada como veio.
// O módulo é executado isolado pelos guardiões (sem require), então a régua vem COPIADA de lib/clips/clipSemLetras.ts; o
// guardião scripts/test-clipe-sem-letras-0111.mts compara as duas cópias byte a byte e na saída.
export interface ProtecaoLetras {
  frase: string
  textos: string[]
  pedido: boolean
  jaProibe: boolean
}

// INÍCIO-CÓPIA protecaoContraLetras
// KINEO-CLIPE-SEM-LETRAS-0111c — revisão adversarial 01/11: o texto pedido saía cortado ("a sign reading THE END" → "END",
// "a sign that says Welcome Home" → "Welcome"), prosa virava texto pedido ("a note that says he is coming" → "he") e
// "a book titled The Shining" era borrado. Regras agora: artigo só cai em minúscula; frase em Título vai inteira (até
// pontuação ou preposição solta); minúscula sem aspas só em superfície que carrega letreiro (placa, cartaz, camiseta, bilhete —
// não tela/celular, onde "says" é narração), até 3 palavras, sem pronome, negação, artigo ou verbo auxiliar. Na dúvida, não é
// texto pedido: a tela fica borrada, que é o defeito menor.
const PL_SUPERFICIE = /\b(?:mirrors?|reflections?|phones?|smartphones?|cell ?phones?|screens?|monitors?|laptops?|computers?|tablets?|tv|television|signs?|signboards?|billboards?|posters?|banners?|neon|labels?|menus?|maps?|gps|apps?|notifications?|messages?|texts?|chats?|shirts?|t-shirts?|hoodies?|notes?|letters?|books?|diary|journal|documents?|newspapers?|papers?|pages?|cards?|tombstones?|gravestones?|espelhos?|reflexos?|celular(?:es)?|telas?|televis[aã]o|computador(?:es)?|placas?|letreiros?|cartaz(?:es)?|faixas?|etiquetas?|mapas?|notifica[çc][aã]o|notifica[çc][õo]es|mensage(?:m|ns)|camisetas?|camisas?|bilhetes?|cartas?|cart[aã]o|livros?|di[aá]rio|jornal|pap[eé]is|p[aá]ginas?|l[aá]pides?|espejos?|reflejos?|tel[eé]fonos?|m[oó]vil(?:es)?|pantallas?|letreros?|carteles?|mensajes?|libros?|peri[oó]dicos?|tarjetas?|ponsel|layar|papan|spanduk)\b/i
// superfícies onde "says/diz" costuma ser NARRAÇÃO ("her phone says nothing", "the screen says loading"): minúscula sem aspas não conta
const PL_SUP_DINAMICA = /\b(?:phones?|smartphones?|cell ?phones?|screens?|monitors?|laptops?|computers?|tablets?|tv|television|apps?|notifications?|messages?|texts?|chats?|gps|maps?|celular(?:es)?|telas?|televis[aã]o|computador(?:es)?|notifica[çc][aã]o|notifica[çc][õo]es|mensage(?:m|ns)|mapas?|tel[eé]fonos?|m[oó]vil(?:es)?|pantallas?|mensajes?|ponsel|layar)\b/i
const PL_SOBREPOSICAO = /\b(?:videos?|v[ií]deos?|story|stories|storytelling|trailers?|intro|opening|ending|episodes?|hist[oó]rias?|contos?|cuentos?|tr[aá]iler|epis[oó]dios?|cerita)\b/i
// "no text messages", "no letters from him" não são proibição de escrita
const PL_JA_PROIBE = /\bno (?:readable )?(?:text|letters|words|writing)\b(?![ -](?:messages?|msgs?|box(?:es)?|fields?|bubbles?|editors?|from|arrived|came|yet)\b)/i
const PL_PEDE_LEGENDA = /\b(?:with|add|adding|include|including|show|showing|put|com|adicione|adicionar|inclua|incluir|mostre|mostrar|con|a[ñn]ade|a[ñn]adir|incluye|incluir|dengan|tambahkan)\s+(?:[\p{L}-]+\s+){0,3}?(?:captions?|subtitles?|on-screen text|onscreen text|text overlays?|title cards?|titles?|legendas?|subt[ií]tulos?|t[ií]tulos?|texto na tela|texto en pantalla|teks)\b/iu
// artigo só cai quando é minúsculo e vem antes de minúscula/aspas: "reading THE END" e "escrito O FIM" ficam inteiros
const PL_DEPOIS_DA_DEIXA = /^\s*(?:(?:[Tt]hat|[Ww]hich|que|yang)\s+)?(?:(?:the|a|an|um|uma|o|el|la|los|las)\s+(?=[\p{Ll}"“«„']))?[:\-–—]?\s*/u
const PL_DEIXA_FORTE = /\b(?:says?|saying|reads?|reading|written|writes|writing|labell?ed|titled|entitled|spell(?:s|ed|ing)|escrit[oa]s?|escrevendo|dizendo|diz|que dice|que diga|diciendo|bertuliskan|tulisan)\b/giu
const PL_DEIXA_MINUSCULA = /^(?:says?|saying|written|escrit[oa]s?|dizendo|que dice|que diga|bertuliskan)$/iu
const PL_SUP_COLADA = new RegExp('(?:' + PL_SUPERFICIE.source + ')\\s+(?:(?:that|which|que|yang)\\s+)?$', 'i')
const PL_SUP_DINAMICA_COLADA = new RegExp('(?:' + PL_SUP_DINAMICA.source + ')\\s+(?:(?:that|which|que|yang)\\s+)?$', 'i')
const PL_DEIXA_NOME = /\b(?:with the|com o|com a|com as|com os|con el|con la|con las|con los|the|o|a|el|la)\s+(?:text|words?|phrase|slogan|message|caption|title|texto|palavras?|frase|mensagem|legenda|t[ií]tulo|palabras?|mensaje)\s*[:\-–—]?\s*(?=["“«„']|[A-ZÀ-Ý0-9]{2,})/gu
const PL_ASPAS = /["“«„]([^"“”«»„\n]{1,60})["”»“]|(?:^|[\s:(])'([^'\n]{1,40})'(?=[\s.,;:!?)]|$)/
const PL_CAIXA_ALTA = /^((?:[A-ZÀ-Ý0-9][A-ZÀ-Ý0-9%!&.'-]*)(?:\s+[A-ZÀ-Ý0-9][A-ZÀ-Ý0-9%!&.'-]*){0,5})(?=$|[\s,.;:!?)])/u
const PL_PARADA = /^(?:on|in|at|with|and|but|while|as|of|for|to|above|below|over|under|near|behind|beside|by|from|into|inside|outside|across|next|against|through|em|na|no|nas|nos|num|numa|com|e|mas|enquanto|de|do|da|para|sobre|acima|perto|atr[aá]s|embaixo|sob|ao|[aà]|en|con|y|pero|del|encima|debajo|cerca|detr[aá]s|junto|di|dan|yang|dengan)$/i
// minúscula dentro de um título ("Romeo and Juliet", "Welcome to NYC", "Lord of the Rings"): só vale se vier maiúscula depois
const PL_CONECTOR = /^(?:of|the|and|to|for|in|at|on|a|an|de|do|da|dos|das|e|em|no|na|y|del|la|el|los|las|o|en|di|dan)$/
// pronome, negação, indefinido, verbo auxiliar: sinal de prosa ("says he is coming", "says nothing"), não de letreiro
const PL_PROSA = /^(?:i|he|she|it|they|we|you|him|her|his|its|their|them|me|my|our|your|this|that|these|those|there|here|nothing|something|everything|anything|nobody|somebody|someone|everyone|no|not|none|never|is|are|was|were|will|would|has|have|had|ele|ela|eles|elas|eu|n[oó]s|voc[eê]s?|isso|isto|aquilo|nada|algo|tudo|ningu[eé]m|algu[eé]m|n[aã]o|nunca|[eé]|est[aá]|era|foi|vai|[eé]l|ella|ellos|ellas|yo|nosotros|eso|esto|todo|nadie|alguien|es|fue|va|dia|mereka|saya|kami|kita|tidak|ada)$/i
const PL_ARTIGO = /^(?:the|a|an|um|uma|o|el|la|los|las)$/i
const PL_FRASE_SOBREPOSICAO = 'No title cards, captions, subtitles, credits or on-screen text overlays at any moment, including the last frame.'
const PL_FRASE_SUPERFICIE = 'Every screen, phone, sign, page, label and reflection shows only abstract shapes, icons, soft glow or blur, never letters, words or numbers.'
const PL_FRASE_TEXTO_FIM = ', spelled exactly like that; every other screen, phone, sign, page, label or reflection shows only abstract shapes, icons or soft blur, never other letters or words.'
const PL_FRASE_TEXTO_INICIO = 'The only legible writing in the clip is exactly '
// as frases da própria casa saem antes da leitura ("title cards" não é superfície do cliente): aplicar duas vezes dá o mesmo texto
const PL_FRASES_DA_CASA = new RegExp([PL_FRASE_SOBREPOSICAO, PL_FRASE_SUPERFICIE].map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + '|' + PL_FRASE_TEXTO_INICIO + '[\\s\\S]{1,600}?' + PL_FRASE_TEXTO_FIM.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
export function protecaoContraLetras(prompt: string, opts: { sempre?: boolean } = {}): ProtecaoLetras {
  const p = String(prompt ?? '').replace(PL_FRASES_DA_CASA, ' ')
  const textos: string[] = []
  const guarda = (t: string) => {
    const limpo = t.trim().replace(/[.,;:!?]+$/, '').trim()
    if (limpo && /[\p{L}\p{N}]/u.test(limpo) && !textos.includes(limpo)) textos.push(limpo)
  }
  const maiuscula = (t: string) => /^[\p{Lu}\p{N}]/u.test(t)
  // frase em Título: as maiúsculas seguidas, com conector antes de maiúscula, unidade depois de número ("Pizza 10 dollars") e
  // palavra solta antes de maiúscula ("I love NY"); para em pontuação ou preposição solta
  const titulo = (tok: string[]): string => {
    if (!tok.length || !maiuscula(tok[0])) return ''
    const run = [tok[0]]
    let unidade = false
    for (let i = 1; i < tok.length && run.length < 6; i++) {
      const t = tok[i]
      if (maiuscula(t)) { run.push(t); continue }
      if (PL_CONECTOR.test(t)) {
        let j = i
        while (j < tok.length && PL_CONECTOR.test(tok[j])) j++
        if (j < tok.length && maiuscula(tok[j]) && run.length + (j - i) < 6) { run.push(...tok.slice(i, j)); i = j - 1; continue }
        break
      }
      if (PL_PARADA.test(t)) break
      if (!unidade && /\p{N}/u.test(run[run.length - 1])) { unidade = true; run.push(t); continue }
      if (i + 1 < tok.length && maiuscula(tok[i + 1])) { run.push(t); continue }
      return '' // minúscula solta depois do nome ("Maria is dead", "Dracula sits"): prosa ou frase sem Título — decide a regra abaixo
    }
    return run.length === 1 && PL_PROSA.test(run[0]) ? '' : run.join(' ')
  }
  const ler = (resto: string, forte: boolean, antes: string) => {
    const r = resto.replace(PL_DEPOIS_DA_DEIXA, '')
    const aspas = PL_ASPAS.exec(r)
    if (aspas && aspas.index <= 1) return guarda(aspas[1] ?? aspas[2] ?? '')
    const caixa = PL_CAIXA_ALTA.exec(r)
    if (caixa && /\p{L}{2,}|\p{N}/u.test(caixa[1]) && caixa[1].length >= 2) return guarda(caixa[1])
    if (!PL_SUP_COLADA.test(antes)) return
    const trecho = r.split(/[,.;:!?()\n"“”«»„]/)[0] ?? ''
    const tok: string[] = []
    for (const t of trecho.split(/\s+/).filter(Boolean)) { if (!/^[\p{L}\p{N}%&'’-]+$/u.test(t)) break; tok.push(t) }
    const t1 = titulo(tok)
    if (t1) return guarda(t1)
    // sem Título: só deixa forte ("says/escrito"), só superfície de letreiro, até 3 palavras, nada de prosa ("placa escrito aberto",
    // "a sign that says Welcome home"); mais de 1 palavra só fechando em pontuação/fim — frase longa sem aspas não vira ordem de escrita
    if (!forte || PL_SUP_DINAMICA_COLADA.test(antes)) return
    const run: string[] = []
    let parou = false
    for (const t of tok) { if (PL_PARADA.test(t)) { parou = true; break } run.push(t) }
    if (!run.length || run.length > 3 || (parou && run.length > 1) || (!parou && tok.length < trecho.split(/\s+/).filter(Boolean).length)) return
    if (run.some((t) => PL_PROSA.test(t) || PL_ARTIGO.test(t))) return
    guarda(run.join(' '))
  }
  for (const re of [PL_DEIXA_FORTE, PL_DEIXA_NOME]) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(p))) {
      const fim = m.index + m[0].length
      const antes = p.slice(Math.max(0, m.index - 48), m.index)
      if (/\b(?:no|without|sem|sin|tanpa|nunca|never)\s+(?:\S+\s+){0,2}$/i.test(antes)) continue
      ler(p.slice(fim, fim + 80), re === PL_DEIXA_FORTE && PL_DEIXA_MINUSCULA.test(m[0]), antes)
    }
  }
  // superfície + texto entre aspas logo depois ('a neon sign "OPEN"', 'placa "ABERTO"')
  const reSup = new RegExp(PL_SUPERFICIE.source, 'gi')
  let s: RegExpExecArray | null
  while ((s = reSup.exec(p))) {
    const depois = p.slice(s.index + s[0].length, s.index + s[0].length + 40)
    const a = /^\s*(?:[\p{L}-]+\s+){0,2}?["“«„]([^"“”«»„\n]{1,60})["”»“]/u.exec(depois)
    if (a) guarda(a[1])
  }
  const pedeLegenda = PL_PEDE_LEGENDA.test(p)
  const pedido = textos.length > 0 || pedeLegenda
  const jaProibe = PL_JA_PROIBE.test(p) && !pedido
  if (jaProibe) return { frase: '', textos, pedido, jaProibe }
  if (textos.length > 0) {
    const lista = textos.map((t) => `"${t}"`).join(' and ')
    return { frase: `${PL_FRASE_TEXTO_INICIO}${lista}${PL_FRASE_TEXTO_FIM}`, textos, pedido, jaProibe }
  }
  const partes: string[] = []
  if (!pedeLegenda && (opts.sempre || PL_SOBREPOSICAO.test(p))) partes.push(PL_FRASE_SOBREPOSICAO)
  if (PL_SUPERFICIE.test(p)) partes.push(PL_FRASE_SUPERFICIE)
  return { frase: partes.join(' '), textos, pedido, jaProibe }
}
// FIM-CÓPIA protecaoContraLetras

/** Teto do prompt que vai ao motor (o corte sai do texto do cliente, nunca da moldura da casa). */
export const CLIP_PROMPT_ENGINE_MAX = 1800

/** O prompt final que vai ao motor: a prosa do plano + a moldura da casa. */
export function buildClipPrompt(spec: ShotSpec, aspect: '9:16' | '16:9' | '1:1'): string {
  const frame = aspect === '16:9' ? '16:9 widescreen framing' : aspect === '1:1' ? '1:1 square framing' : '9:16 vertical framing'
  const letras = protecaoContraLetras(spec.prompt, { sempre: true }) // KINEO-CLIPE-SEM-LETRAS-0111
  const antiTexto = letras.pedido ? 'no watermark, no logo' : 'no readable text, no watermark, no logo, no subtitles'
  const casa = `${frame}, cinematic, sharp focus, ${antiTexto}${letras.frase ? `. ${letras.frase}` : ''}`
  const inteiro = `${spec.prompt}. ${casa}`.replace(/\.\s*\./g, '.')
  if (inteiro.length <= CLIP_PROMPT_ENGINE_MAX) return inteiro
  const cabe = Math.max(0, CLIP_PROMPT_ENGINE_MAX - casa.length - 2)
  return `${spec.prompt.slice(0, cabe).replace(/[\s.]+$/, '')}. ${casa}`.replace(/\.\s*\./g, '.').slice(0, CLIP_PROMPT_ENGINE_MAX)
}
