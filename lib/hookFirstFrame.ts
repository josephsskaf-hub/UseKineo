// KINEO-GANCHO-1Q-2026-10-03 — "GANCHO ESCRITO NO PRIMEIRO QUADRO".
//
// Diagnóstico TikTok de 02/10: a maior parte do público sai em 0:02. Nos dois primeiros segundos o filme só tem a
// imagem (no Kineo 1 ela ainda sobe do preto — FAST_OPENING_FADE_SECONDS 0,5 s em lib/compose.ts) e uma legenda de
// 3-4 palavras lá embaixo. Quem rola o feed decide antes de ouvir a frase inteira. Remédio: a frase do gancho (a 1ª frase
// da narração, até 8 palavras) ESCRITA no topo do quadro de 0 a 2,5 s — visível já no frame 0, legível no celular.
//
// Como entra: igual ao logo da marca (lib/brandLogo.ts → withBrandLogo). A rota monta o source com lib/compose (trava
// 8.2, byte-idêntica) e DEPOIS acrescenta um elemento de texto. Nada aqui importa nada: módulo puro, executado pelo
// guardião scripts/test-gancho-1q-2026-10-03.mjs.
//
// De onde vem a frase (documentado também no guardião):
//   · caminho clássico (Kineo 1, Seedance, Kling 2.5, Veo) e export limpo (/api/compose/unlock): `scaledScript` — o
//     texto EXATO que o TTS leu (voiceover_script → stripScriptMarkers → salvage/legendas/topic → scaleVoiceoverScript,
//     ou verbatim). A legenda usa o Whisper desse mesmo áudio com a grafia desse mesmo texto, então a 1ª frase escrita
//     no topo é a 1ª frase que se ouve.
//   · caminho hollywood (Kling 3, H3, Omni, S25): a narração é UM mp3 POR CENA (`narrationBlocks[i].text`). Vale o bloco
//     que começa até 1 s; se a 1ª cena abre com fala nativa (diálogo/host) ou muda, cai no `voiceoverScript` inteiro.
//
// Posição MEDIDA no próprio source (nada de número mágico solto): o topo da pílula fica abaixo do que já existe no alto
// do quadro — marca d'água (trilha 9), barra de cinema do Kineo 1 (trilha 6) e logo da marca (trilha 10) — e abaixo da
// faixa das abas do TikTok (7% da altura). Âncora no topo (y_anchor 0%): quebra de linha cresce para BAIXO, para longe da
// marca d'água. Antes de entrar, a conta confere que o pior caso (linhas estimadas × altura de linha + respiro) termina
// acima da legenda mais alta possível (3 linhas na fonte da legenda, ancorada no piso dela). Se colidir, não entra.
// Em 9:16 sem logo: pílula ≈ 8,2 % → 18-22 % da altura (a faixa de cima, céu/teto/cabeça — não o rosto, que mora
// em ~25-45 % num plano médio). Com logo: desce para baixo do logo (≈ 20 % → 31-33 %).
//
// Só propriedades de texto que lib/compose.ts (legenda/marca d'água) e lib/ads/adV2Montage.ts já mandam em produção:
// type, track, time, duration, text, x, y, x_anchor, y_anchor, width, font_family, font_size, font_weight, line_height,
// fill_color, background_color, background_x_padding, background_y_padding, border_radius. Sem enter/exit_transition:
// o texto precisa estar no frame 0 (é o quadro que o feed mostra) e exit_transition nunca foi exercitada.

/** Interruptor público. false = só contas internas (lib/internalAccounts isInternalEmail) recebem o gancho escrito. */
export const GANCHO_1Q_PUBLIC = false
/** Trilha livre ACIMA do logo da marca (10): lib/compose usa 1–9, o logo 10. */
export const GANCHO_1Q_TRACK = 11
/** Até quando o gancho fica na tela (s). A audiência sai em ~2 s; 2,5 s cobre a decisão. */
export const GANCHO_1Q_SECONDS = 2.5
export const GANCHO_1Q_MAX_WORDS = 8
export const GANCHO_1Q_MAX_LINES = 3
export const GANCHO_1Q_FONT_SIZE = 64
/** Mesma caixa de 78 % da legenda (lib/compose CAPTION_WIDTH): com o respiro de 3 % a pílula fica em [93,5; 986,5] px. */
export const GANCHO_1Q_WIDTH_PCT = 78
/** Em quadro largo a caixa não passa de 842,4 px (os mesmos 78 % de 1080) — senão vira faixa de uma linha só. */
export const GANCHO_1Q_MAX_WIDTH_PX = 842.4
/** Faixa das abas do TikTok/Reels ("Seguindo | Para você", busca) no alto do quadro. */
export const GANCHO_1Q_TOP_UI_PCT = 7
export const GANCHO_1Q_GAP_PCT = 1
export const GANCHO_1Q_PAD_Y_PCT = 1.2
const LINE_HEIGHT = 1.1
/** Avanço médio de um caractere em Montserrat 800 em caixa mista (a marca d'água mediu 0,58 em a 700; folga para 0,6). */
const CHAR_EM = 0.6
/** lib/compose (#100): texto com plaqueta ocupa ±1,023 × fonte em volta do centro. */
const PLATED_HALF_BAND = 1.023
const CAPTION_LINE_HEIGHT = 1.05
const CAPTION_PAD_Y_PCT = 2
const CAPTION_WORST_LINES = 3

export interface HookFirstFrameOptions {
  /** isInternalEmail(user.email) — calculado na rota. */
  interna: boolean
  /** O texto narrado (ver o cabeçalho). */
  narration: string | null | undefined
  /** Fonte da legenda para a língua (captionFontFor(language)) — Montserrat não tem devanágari nem árabe. */
  font?: string | null
  /** Avatar (rosto do apresentador ocupa o quadro) e Studio Ads (montagem própria) ficam de fora. */
  skip?: boolean
}

export interface HookFirstFrameResult {
  applied: boolean
  reason: 'ok' | 'fechado' | 'pulado' | 'sem_frase' | 'sem_source' | 'colide_legenda'
  phrase: string | null
  /** Topo da caixa de texto, em % da altura. */
  y: string | null
}

/** Liberado para esta conta? false + não-interna = filme exatamente como antes. */
export function ganchoLiberado(interna: boolean): boolean {
  return GANCHO_1Q_PUBLIC || interna === true
}

const ABREV = new Set(['mr', 'mrs', 'ms', 'dr', 'st', 'sr', 'sra', 'srta', 'jr', 'vs', 'etc', 'prof', 'dra', 'no', 'nº', 'mt', 'ft', 'approx', 'vol', 'fig'])

/** A 1ª frase do texto: corta em . ! ? … (seguido de espaço/fim) ou quebra de linha; "U.S.", "Mr." e "4.5" não cortam. */
export function firstSentence(text: string | null | undefined): string {
  const t = String(text ?? '').replace(/\r\n?/g, '\n').trim()
  if (!t) return ''
  const firstLine = t.split(/\n+/).map((l) => l.trim()).find((l) => l.length > 0) ?? ''
  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i]
    if (!/[.!?…。！？]/.test(ch)) continue
    // pontuação repetida ("?!", "...") fica junto
    let j = i
    while (j + 1 < firstLine.length && /[.!?…。！？]/.test(firstLine[j + 1])) j++
    const after = firstLine.slice(j + 1)
    const next = after.replace(/^["'”’»)\]]+/, '')
    if (next.length > 0 && !/^\s/.test(next)) { i = j; continue } // "4.5", "usekineo.com"
    if (ch === '.' && j === i) {
      const before = firstLine.slice(0, i)
      const tok = (before.match(/([\p{L}.]+)$/u)?.[1] ?? '').toLowerCase()
      const bare = tok.replace(/\./g, '')
      if (tok.includes('.') || bare.length === 1 || ABREV.has(bare)) { i = j; continue } // U.S. · J. · Mr.
    }
    const closeQuote = (after.match(/^["'”’»)\]]+/)?.[0]) ?? ''
    return (firstLine.slice(0, j + 1) + closeQuote).trim()
  }
  return firstLine
}

const STOP_FINAL = new Set([
  'a', 'an', 'the', 'of', 'to', 'and', 'or', 'but', 'with', 'in', 'on', 'for', 'at', 'by', 'from', 'that', 'this', 'his', 'her', 'their', 'its', 'my', 'your', 'is', 'was', 'were', 'are',
  'o', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'e', 'ou', 'mas', 'com', 'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'que', 'se', 'seu', 'sua',
  'el', 'la', 'los', 'las', 'un', 'una', 'del', 'y', 'con', 'en', 'para', 'por', 'que',
])
const CLAUSE_END = /[,;:]$/
const DASH = /^[—–-]+$/

function tidy(phrase: string): string {
  let p = phrase.replace(/\s+/g, ' ').trim()
  // aspas desemparelhadas (frase cortada no meio de uma citação) saem todas
  for (const [a, b] of [['"', '"'], ['“', '”'], ['«', '»']] as const) {
    const na = p.split(a).length - 1
    const nb = a === b ? na : p.split(b).length - 1
    if ((a === b && na % 2 === 1) || (a !== b && na !== nb)) p = p.split(a).join('').split(b).join('')
  }
  p = p.replace(/[\s,;:.—–-]+$/u, '').trim() // ponto final e vírgula saem; ? ! … ficam
  return p
}

/** A frase do gancho: a 1ª frase até 8 palavras; mais longa → corta numa vírgula/dois-pontos/travessão (3–8 palavras) ou nas 8 primeiras + "…". */
export function hookPhrase(text: string | null | undefined, maxWords: number = GANCHO_1Q_MAX_WORDS): string | null {
  const s = firstSentence(text)
  const words = s.split(/\s+/).filter(Boolean)
  if (words.length === 0) return null
  let out: string
  if (words.length <= maxWords) {
    out = tidy(words.join(' '))
  } else {
    let cut = 0
    for (let k = Math.min(maxWords, words.length - 1); k >= 3; k--) {
      if (CLAUSE_END.test(words[k - 1]) || DASH.test(words[k] ?? '')) { cut = k; break }
    }
    if (cut > 0) {
      out = tidy(words.slice(0, cut).join(' '))
    } else {
      const w = words.slice(0, maxWords)
      while (w.length > 3 && STOP_FINAL.has(w[w.length - 1].toLowerCase().replace(/[^\p{L}]/gu, ''))) w.pop()
      out = tidy(w.join(' ')) + '…'
    }
  }
  const n = out.split(/\s+/).filter(Boolean).length
  if (n < 2 || out.replace(/…$/, '').length < 6) return null
  return out
}

/** Linhas estimadas (quebra gulosa por palavra) numa caixa de `boxPx` com fonte `font`. */
export function estimateLines(phrase: string, boxPx: number, font: number = GANCHO_1Q_FONT_SIZE): number {
  const perLine = Math.max(1, Math.floor(boxPx / (font * CHAR_EM)))
  let lines = 1
  let cur = 0
  for (const w of phrase.split(/\s+/).filter(Boolean)) {
    const len = [...w].length
    if (cur === 0) { cur = len; lines += Math.floor((len - 1) / perLine); cur = ((len - 1) % perLine) + 1; continue }
    if (cur + 1 + len <= perLine) cur += 1 + len
    else { lines++; cur = len }
  }
  return lines
}

/** Encolhe a frase (tira palavras do fim, põe "…") até caber em GANCHO_1Q_MAX_LINES. */
export function fitPhrase(phrase: string, boxPx: number, font: number = GANCHO_1Q_FONT_SIZE): string | null {
  let p = phrase
  while (estimateLines(p, boxPx, font) > GANCHO_1Q_MAX_LINES) {
    const w = p.replace(/…$/, '').split(/\s+/).filter(Boolean)
    if (w.length <= 2) return null
    w.pop()
    while (w.length > 2 && STOP_FINAL.has(w[w.length - 1].toLowerCase().replace(/[^\p{L}]/gu, ''))) w.pop()
    p = tidy(w.join(' ')) + '…'
  }
  return p
}

/** Hollywood: o texto do bloco de narração que começa até 1 s; senão o roteiro inteiro. */
export function hookNarration(blocks: ReadonlyArray<{ time?: unknown; text?: unknown }> | null | undefined, script: string | null | undefined): string {
  const first = (Array.isArray(blocks) ? blocks : [])
    .filter((b) => b && typeof b.text === 'string' && b.text.trim() && Number.isFinite(Number(b.time)))
    .sort((a, b) => Number(a.time) - Number(b.time))[0]
  if (first && Number(first.time) <= 1) return String(first.text)
  return String(script ?? '')
}

const pctNum = (v: unknown): number | null => {
  const m = typeof v === 'string' ? v.trim().match(/^(-?\d+(?:\.\d+)?)%$/) : null
  return m ? Number(m[1]) : null
}
type El = Record<string, unknown>
const r2 = (v: number) => Math.round(v * 100) / 100

/**
 * O que já ocupa o alto do quadro, em px a partir do topo: marca d'água (9), barra de cinema (6, só a de cima), logo (10).
 * Devolve a borda de baixo mais baixa, nunca menos que a faixa das abas do app.
 */
export function topBandBottomPx(elements: ReadonlyArray<El>, H: number): number {
  let bottom = (GANCHO_1Q_TOP_UI_PCT / 100) * H
  for (const e of elements) {
    if (!e || typeof e !== 'object') continue
    const track = Number(e.track)
    const y = pctNum(e.y)
    if (y == null) continue
    if (track === 9 && e.type === 'text') {
      const font = Number(e.font_size) || 40
      bottom = Math.max(bottom, (y / 100) * H + PLATED_HALF_BAND * font)
    } else if ((track === 6 && e.type === 'shape') || (track === 10 && e.type === 'image')) {
      const h = pctNum(e.height)
      if (h == null || y > 50) continue // a barra de BAIXO não conta
      bottom = Math.max(bottom, ((y + h / 2) / 100) * H)
    }
  }
  return bottom
}

/** O topo mais alto possível da legenda que está na tela antes de `until` (3 linhas na fonte dela, ancorada no piso). */
export function captionTopPx(elements: ReadonlyArray<El>, H: number, until: number): number {
  let top = H
  for (const e of elements) {
    if (!e || e.type !== 'text' || ![5, 7].includes(Number(e.track))) continue
    if (!(Number(e.time) < until)) continue
    const y = pctNum(e.y)
    const font = Number(e.font_size)
    if (y == null || !(font > 0)) continue
    const anchoredBottom = e.y_anchor === '100%'
    const floor = (y / 100) * H
    const height = CAPTION_WORST_LINES * font * CAPTION_LINE_HEIGHT
    const t = (anchoredBottom ? floor - height : floor - height / 2) - (CAPTION_PAD_Y_PCT / 100) * H
    top = Math.min(top, t)
  }
  return top
}

/** O elemento de texto do gancho para um source montado (null quando não cabe ou não há frase). */
export function hookFirstFrameElement(
  source: El,
  narration: string | null | undefined,
  font?: string | null,
): { element: El | null; reason: HookFirstFrameResult['reason']; phrase: string | null; y: string | null } {
  const els = (source as { elements?: unknown }).elements
  const total = Number((source as { duration?: unknown }).duration)
  const W = Number((source as { width?: unknown }).width) || 1080
  const H = Number((source as { height?: unknown }).height) || 1920
  if (!Array.isArray(els) || !(total > 0)) return { element: null, reason: 'sem_source', phrase: null, y: null }
  const widthPx = Math.min((GANCHO_1Q_WIDTH_PCT / 100) * W, GANCHO_1Q_MAX_WIDTH_PX)
  const raw = hookPhrase(narration)
  const phrase = raw ? fitPhrase(raw, widthPx) : null
  if (!phrase) return { element: null, reason: 'sem_frase', phrase: null, y: null }
  const duration = r2(Math.min(GANCHO_1Q_SECONDS, total))
  const gap = (GANCHO_1Q_GAP_PCT / 100) * H
  const padY = (GANCHO_1Q_PAD_Y_PCT / 100) * Math.max(W, H) // limite de cima: o respiro medido contra o lado maior
  const pillTop = topBandBottomPx(els as El[], H) + gap
  const textTop = pillTop + padY
  const lines = estimateLines(phrase, widthPx)
  const pillBottom = textTop + lines * GANCHO_1Q_FONT_SIZE * LINE_HEIGHT + padY
  if (pillBottom + gap > captionTopPx(els as El[], H, duration)) return { element: null, reason: 'colide_legenda', phrase, y: null }
  const y = `${r2((textTop / H) * 100)}%`
  const element: El = {
    type: 'text',
    track: GANCHO_1Q_TRACK,
    time: 0,
    duration,
    text: phrase,
    x: '50%',
    y,
    x_anchor: '50%',
    y_anchor: '0%',
    width: `${r2((widthPx / W) * 100)}%`,
    font_family: typeof font === 'string' && font.trim() ? font.trim() : 'Montserrat',
    font_size: GANCHO_1Q_FONT_SIZE,
    font_weight: '800',
    line_height: '110%',
    // Cartão claro com letra escura: o "texto do TikTok" que o público já lê como título — e não como uma 2ª legenda
    // (a legenda é branca em pílula escura; duas iguais empilhadas foi o erro do #277).
    fill_color: '#0b0b0f',
    background_color: 'rgba(255,255,255,0.94)',
    background_x_padding: '3%',
    background_y_padding: `${GANCHO_1Q_PAD_Y_PCT}%`,
    border_radius: 10,
  }
  return { element, reason: 'ok', phrase, y }
}

/** Acrescenta o gancho escrito a um source já montado. Fechado/pulado/sem frase/colisão = source intacto. */
export function withHookFirstFrame(source: Record<string, unknown>, opts: HookFirstFrameOptions): HookFirstFrameResult {
  if (!ganchoLiberado(opts?.interna === true)) return { applied: false, reason: 'fechado', phrase: null, y: null }
  if (opts.skip) return { applied: false, reason: 'pulado', phrase: null, y: null }
  const { element, reason, phrase, y } = hookFirstFrameElement(source, opts.narration, opts.font)
  if (!element) return { applied: false, reason, phrase, y }
  ;((source as { elements: unknown[] }).elements).push(element)
  return { applied: true, reason: 'ok', phrase, y }
}
