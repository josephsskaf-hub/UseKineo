// KINEO-CLIPE-SEM-LETRAS-0111 — revisor 01/11 (cumiasammanis27, Modo Clipe do Studio, Seedance 1.5, 5 s, 2D de terror): o estilo
// saiu bom, mas a tela do celular e o último quadro mostraram letras falsas ("G hcwy", "Siny Stoite"). Os motores de vídeo não
// escrevem: palavra que aparece na imagem sai inventada. A casa só mandava "no readable text" como fragmento no FIM de um prompt
// longo (e o corte em 1.800 caracteres podia levar até isso embora); o /clips só protegia quando havia espelho/tela/placa.
//
// MÓDULO PURO (sem import): o /clips (lib/clips/clipCatalog.ts) importa daqui; o Modo Clipe do Studio (lib/cinematic/shotSpec.ts)
// é executado isolado pelos guardiões, sem require, e leva uma CÓPIA EXATA de protecaoContraLetras — o guardião
// scripts/test-clipe-sem-letras-0111.mts prova que as duas dão a mesma resposta no mesmo corpus.
//
// REGRA DO TEXTO PEDIDO: "uma placa escrito ABERTO" mantém ABERTO — vira a ÚNICA escrita legível, soletrada como está, e o resto
// segue ilegível. Pedido genérico de legenda/título ("with subtitles") não ganha a proibição de legenda; telas e placas continuam
// protegidas. Quem já escreveu "no text" fica byte a byte igual (os efeitos do catálogo trazem "No text, no captions…").
//
// NEGATIVE_PROMPT (schema OpenAPI da fal lido em 01/11/2026, https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<id>):
//   aceitam  → kling-video/v3/pro/text-to-video, kling-video/v2.5-turbo/pro/{text,image}-to-video (padrão "blur, distort, and low
//              quality", mantido no começo), veo3.1/fast e veo3.1/fast/image-to-video (padrão nulo).
//   não têm  → bytedance/seedance/v1.5/pro (t2v e i2v), kling-video/o3/pro/image-to-video, minimax/h3 (t2v e i2v),
//              google/gemini-omni-flash/image-to-video, seedance-2.5/text-to-video — esses recebem só a instrução no texto.

export const MOTORES_COM_NEGATIVE_PROMPT: readonly string[] = [
  'fal-ai/kling-video/v3/pro/text-to-video',
  'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
  'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
  'fal-ai/veo3.1/fast',
  'fal-ai/veo3.1/fast/image-to-video',
]
/** O padrão do schema do Kling: quem manda negative_prompt substitui o padrão, então ele vai junto, no começo. */
export const KLING_NEGATIVE_PADRAO = 'blur, distort, and low quality'
export const NEGATIVO_SEM_LETRAS = 'text, letters, words, writing, readable text, gibberish text, random characters, captions, subtitles, title card, watermark, logo'
export const NEGATIVO_TEXTO_PEDIDO = 'gibberish text, misspelled words, random characters, garbled letters, watermark'

export interface ProtecaoLetras {
  /** Instrução a acrescentar ao prompt ('' = nada a acrescentar). */
  frase: string
  /** Textos que o cliente pediu explicitamente (mantidos, soletrados como vieram). */
  textos: string[]
  /** O cliente pediu legenda/título/texto na tela de forma genérica, ou um texto exato. */
  pedido: boolean
  /** O cliente já proibiu texto com as próprias palavras (o prompt fica igual). */
  jaProibe: boolean
}

// ⚠ CÓPIA EXATA em lib/cinematic/shotSpec.ts (de "INÍCIO-CÓPIA" a "FIM-CÓPIA") — mexeu aqui, mexe lá; o guardião compara.
// INÍCIO-CÓPIA protecaoContraLetras
const PL_SUPERFICIE = /\b(?:mirrors?|reflections?|phones?|smartphones?|cell ?phones?|screens?|monitors?|laptops?|computers?|tablets?|tv|television|signs?|signboards?|billboards?|posters?|banners?|neon|labels?|menus?|maps?|gps|apps?|notifications?|messages?|texts?|chats?|shirts?|t-shirts?|hoodies?|notes?|letters?|books?|diary|journal|documents?|newspapers?|papers?|pages?|cards?|tombstones?|gravestones?|espelhos?|reflexos?|celular(?:es)?|telas?|televis[aã]o|computador(?:es)?|placas?|letreiros?|cartaz(?:es)?|faixas?|etiquetas?|mapas?|notifica[çc][aã]o|notifica[çc][õo]es|mensage(?:m|ns)|camisetas?|camisas?|bilhetes?|cartas?|cart[aã]o|livros?|di[aá]rio|jornal|pap[eé]is|p[aá]ginas?|l[aá]pides?|espejos?|reflejos?|tel[eé]fonos?|m[oó]vil(?:es)?|pantallas?|letreros?|carteles?|mensajes?|libros?|peri[oó]dicos?|tarjetas?|ponsel|layar|papan|spanduk)\b/i
const PL_SOBREPOSICAO = /\b(?:videos?|v[ií]deos?|story|stories|storytelling|trailers?|intro|opening|ending|episodes?|hist[oó]rias?|contos?|cuentos?|tr[aá]iler|epis[oó]dios?|cerita)\b/i
const PL_JA_PROIBE = /\bno (?:readable )?(?:text|letters|words|writing)\b/i
const PL_PEDE_LEGENDA = /\b(?:with|add|adding|include|including|show|showing|put|com|adicione|adicionar|inclua|incluir|mostre|mostrar|con|a[ñn]ade|a[ñn]adir|incluye|incluir|dengan|tambahkan)\s+(?:[\p{L}-]+\s+){0,3}?(?:captions?|subtitles?|on-screen text|onscreen text|text overlays?|title cards?|titles?|legendas?|subt[ií]tulos?|t[ií]tulos?|texto na tela|texto en pantalla|teks)\b/iu
const PL_DEPOIS_DA_DEIXA = /^\s*(?:(?:that|which|que|o|a|the|a|an|um|uma|el|la|los|las)\s+)?[:\-–—]?\s*/i
const PL_DEIXA_FORTE = /\b(?:says?|saying|reads?|reading|written|writes|writing|labell?ed|titled|entitled|spell(?:s|ed|ing)|escrit[oa]s?|escrevendo|dizendo|diz|que dice|que diga|diciendo|bertuliskan|tulisan)\b/giu
const PL_DEIXA_MINUSCULA = /^(?:says?|saying|written|escrit[oa]s?|dizendo|que dice|que diga|bertuliskan)$/iu
const PL_SUP_COLADA = new RegExp('(?:' + PL_SUPERFICIE.source + ')\\s+(?:(?:that|which|que|yang)\\s+)?$', 'i')
const PL_DEIXA_NOME = /\b(?:with the|com o|com a|com as|com os|con el|con la|con las|con los|the|o|a|el|la)\s+(?:text|words?|phrase|slogan|message|caption|title|texto|palavras?|frase|mensagem|legenda|t[ií]tulo|palabras?|mensaje)\s*[:\-–—]?\s*(?=["“«„']|[A-ZÀ-Ý0-9]{2,})/gu
const PL_ASPAS = /["“«„]([^"“”«»„\n]{1,60})["”»“]|(?:^|[\s:(])'([^'\n]{1,40})'(?=[\s.,;:!?)]|$)/
const PL_CAIXA_ALTA = /^((?:[A-ZÀ-Ý0-9][A-ZÀ-Ý0-9%!&.'-]*)(?:\s+[A-ZÀ-Ý0-9][A-ZÀ-Ý0-9%!&.'-]*){0,5})(?=$|[\s,.;:!?)])/u
const PL_PARADA = /^(?:on|in|at|with|and|but|while|as|of|for|to|em|na|no|nas|nos|com|e|mas|enquanto|de|do|da|para|en|con|y|pero|del|para|di|dan|yang|dengan)$/i
export function protecaoContraLetras(prompt: string, opts: { sempre?: boolean } = {}): ProtecaoLetras {
  const p = String(prompt ?? '')
  const textos: string[] = []
  const guarda = (t: string) => {
    const limpo = t.trim().replace(/[.,;:!?]+$/, '').trim()
    if (limpo && /[\p{L}\p{N}]/u.test(limpo) && !textos.includes(limpo)) textos.push(limpo)
  }
  const ler = (resto: string, forte: boolean, antes: string) => {
    const r = resto.replace(PL_DEPOIS_DA_DEIXA, '')
    const aspas = PL_ASPAS.exec(r)
    if (aspas && aspas.index <= 1) return guarda(aspas[1] ?? aspas[2] ?? '')
    const caixa = PL_CAIXA_ALTA.exec(r)
    if (caixa && /\p{L}{2,}|\p{N}/u.test(caixa[1]) && caixa[1].length >= 2) return guarda(caixa[1])
    if (!forte || !PL_SUP_COLADA.test(antes)) return
    // sem aspas e sem caixa alta, só UMA palavra ("placa escrito aberto", "a sign that says open"); frase inteira pede aspas
    const nua = (r.split(/\s+/)[0] ?? '').replace(/[.,;:!?)]+$/, '')
    if (nua && !PL_PARADA.test(nua) && /^[\p{L}\p{N}'-]+$/u.test(nua)) guarda(nua)
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
    return { frase: `The only legible writing in the clip is exactly ${lista}, spelled exactly like that; every other screen, phone, sign, page, label or reflection shows only abstract shapes, icons or soft blur, never other letters or words.`, textos, pedido, jaProibe }
  }
  const partes: string[] = []
  if (!pedeLegenda && (opts.sempre || PL_SOBREPOSICAO.test(p))) partes.push('No title cards, captions, subtitles, credits or on-screen text overlays at any moment, including the last frame.')
  if (PL_SUPERFICIE.test(p)) partes.push('Every screen, phone, sign, page, label and reflection shows only abstract shapes, icons, soft glow or blur, never letters, words or numbers.')
  return { frase: partes.join(' '), textos, pedido, jaProibe }
}
// FIM-CÓPIA protecaoContraLetras

/** O prompt com a proteção no fim (idempotente: aplicar duas vezes dá o mesmo texto). */
export function promptComProtecaoContraLetras(prompt: string, opts: { sempre?: boolean } = {}): string {
  const p = String(prompt ?? '')
  const { frase } = protecaoContraLetras(p, opts)
  if (!frase || p.includes(frase)) return p
  return `${p.replace(/\s+$/, '')} ${frase}`
}

/** negative_prompt para o endpoint da fal, ou null quando o schema dele não tem o campo (aí só vale a instrução no texto).
 *  Prompt que já proíbe texto (os efeitos do catálogo: "No text, no captions…") também fica sem: o payload deles segue o mesmo. */
export function negativePromptSemLetras(endpoint: string, prompt: string): string | null {
  if (!MOTORES_COM_NEGATIVE_PROMPT.includes(endpoint)) return null
  const { pedido, jaProibe } = protecaoContraLetras(prompt)
  if (jaProibe) return null
  const termos = pedido ? NEGATIVO_TEXTO_PEDIDO : NEGATIVO_SEM_LETRAS
  return endpoint.startsWith('fal-ai/kling-video/') ? `${KLING_NEGATIVE_PADRAO}, ${termos}` : termos
}
