// KINEO-ADS-FONTE-LINK-2810 — A FONTE SEGUE O TEXTO, NÃO A LÍNGUA DO PEDIDO.
//
// Casos reais (24-26/10): pedido 557293e7 (hindi) e 866fd276 (árabe). A montagem escolhia UMA fonte por pedido
// (captionFontFor(language) → "Noto Sans Devanagari" / "Noto Sans Arabic") e a aplicava a TODO texto do vídeo. As legendas
// (texto em devanágari/árabe) saíam certas; mas o cartão final (título "Beardo", chamada "Visit us today" — o CTA_KIND
// 'visit' só tem en/pt/es) e a marca-d'água da amostra ("Made with Kineo · usekineo.com") são texto LATINO puro, e no
// Creatomate texto latino puro numa Noto de outra escrita sai em caixinhas (□□□□). A legenda mista do hindi ("यह है Daily
// Defence…") desenhou o latim — o que falha é o elemento SÓ latino numa fonte de outra escrita.
//
// A régua (pura, sem import): cada elemento de texto ganha a fonte da escrita que ele USA.
//   · tem letra de uma escrita não latina (devanágari, bengali, árabe/urdu/persa, hebraico, tailandês, CJK, grego…) → a Noto
//     daquela escrita (a escrita com mais letras manda; CJK mantém a Noto CJK do pedido quando já é uma);
//   · só latim/cirílico/números/pontuação → se a fonte do elemento é uma Noto de outra escrita, volta para Montserrat (a
//     fonte padrão das legendas, que tem latim, latim estendido, vietnamita e cirílico); fonte latina fica como está.
// adsV2ScriptSafeFonts(source) aplica a régua em TODO elemento de texto de uma fonte do Creatomate (inclusive dentro de
// composições) logo antes do POST — cartão final, botão, marca-d'água, frases de tela e legendas, em todos os caminhos.

/** A fonte padrão das legendas (≡ DEFAULT_CAPTION_FONT de lib/textLanguage.ts; o guardião confere). */
export const ADS_V2_LATIN_FONT = 'Montserrat'

interface ScriptRange { font: string; ranges: ReadonlyArray<readonly [number, number]> }
/** As escritas que a Montserrat NÃO desenha e a Noto (Google Fonts) de cada uma. */
export const ADS_V2_SCRIPT_FONTS: Readonly<Record<string, ScriptRange>> = {
  devanagari: { font: 'Noto Sans Devanagari', ranges: [[0x0900, 0x097f], [0xa8e0, 0xa8ff]] },
  bengali: { font: 'Noto Sans Bengali', ranges: [[0x0980, 0x09ff]] },
  gurmukhi: { font: 'Noto Sans Gurmukhi', ranges: [[0x0a00, 0x0a7f]] },
  gujarati: { font: 'Noto Sans Gujarati', ranges: [[0x0a80, 0x0aff]] },
  tamil: { font: 'Noto Sans Tamil', ranges: [[0x0b80, 0x0bff]] },
  telugu: { font: 'Noto Sans Telugu', ranges: [[0x0c00, 0x0c7f]] },
  kannada: { font: 'Noto Sans Kannada', ranges: [[0x0c80, 0x0cff]] },
  malayalam: { font: 'Noto Sans Malayalam', ranges: [[0x0d00, 0x0d7f]] },
  sinhala: { font: 'Noto Sans Sinhala', ranges: [[0x0d80, 0x0dff]] },
  thai: { font: 'Noto Sans Thai', ranges: [[0x0e00, 0x0e7f]] },
  lao: { font: 'Noto Sans Lao', ranges: [[0x0e80, 0x0eff]] },
  myanmar: { font: 'Noto Sans Myanmar', ranges: [[0x1000, 0x109f]] },
  khmer: { font: 'Noto Sans Khmer', ranges: [[0x1780, 0x17ff]] },
  arabic: { font: 'Noto Sans Arabic', ranges: [[0x0600, 0x06ff], [0x0750, 0x077f], [0x08a0, 0x08ff], [0xfb50, 0xfdff], [0xfe70, 0xfeff]] },
  hebrew: { font: 'Noto Sans Hebrew', ranges: [[0x0590, 0x05ff], [0xfb1d, 0xfb4f]] },
  armenian: { font: 'Noto Sans Armenian', ranges: [[0x0530, 0x058f]] },
  georgian: { font: 'Noto Sans Georgian', ranges: [[0x10a0, 0x10ff]] },
  ethiopic: { font: 'Noto Sans Ethiopic', ranges: [[0x1200, 0x137f]] },
  greek: { font: 'Noto Sans', ranges: [[0x0370, 0x03ff], [0x1f00, 0x1fff]] },
  hangul: { font: 'Noto Sans KR', ranges: [[0x1100, 0x11ff], [0x3130, 0x318f], [0xac00, 0xd7af]] },
  kana: { font: 'Noto Sans JP', ranges: [[0x3040, 0x30ff], [0x31f0, 0x31ff]] },
  han: { font: 'Noto Sans SC', ranges: [[0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xf900, 0xfaff]] },
}
const CJK_FONTS = new Set(['Noto Sans SC', 'Noto Sans TC', 'Noto Sans JP', 'Noto Sans KR', 'Noto Sans HK'])
/** As fontes de UMA escrita não latina (as Noto acima + as CJK do catálogo): texto só latino nelas sai em caixinhas. */
export const ADS_V2_NON_LATIN_FONTS: ReadonlySet<string> = new Set([...Object.values(ADS_V2_SCRIPT_FONTS).map((s) => s.font).filter((f) => f !== 'Noto Sans'), ...CJK_FONTS])

/** A escrita não latina com mais letras no texto (null = só latim/cirílico/números/pontuação). Pura. */
export function adsV2TextScript(text: unknown): string | null {
  const counts = new Map<string, number>()
  for (const ch of String(text ?? '')) {
    const cp = ch.codePointAt(0) ?? 0
    if (cp < 0x0370) continue // KINEO-ADS-FONTE-LINK-2810 — ASCII + latim estendido: a Montserrat desenha
    for (const [name, s] of Object.entries(ADS_V2_SCRIPT_FONTS)) {
      if (s.ranges.some(([a, b]) => cp >= a && cp <= b)) { counts.set(name, (counts.get(name) ?? 0) + 1); break }
    }
  }
  let best: string | null = null, n = 0
  for (const [name, c] of counts) if (c > n) { best = name; n = c }
  if (best === 'han' && counts.has('kana')) return 'kana' // KINEO-ADS-FONTE-LINK-2810 — kanji + kana = japonês
  return best
}

/** A fonte que desenha ESTE texto, partindo da fonte que o elemento tem. Pura. */
export function adsV2FontForText(text: unknown, current: unknown): string {
  const cur = typeof current === 'string' && current.trim() ? current.trim() : ADS_V2_LATIN_FONT
  const script = adsV2TextScript(text)
  if (script) {
    if (script === 'han' && CJK_FONTS.has(cur)) return cur // KINEO-ADS-FONTE-LINK-2810 — chinês tradicional/japonês do pedido ficam
    if (script === 'greek' && !ADS_V2_NON_LATIN_FONTS.has(cur) && cur !== ADS_V2_LATIN_FONT && cur !== 'Inter') return cur // KINEO-ADS-FONTE-LINK-2810 — Noto Sans (e outra fonte com grego) ficam
    return ADS_V2_SCRIPT_FONTS[script].font
  }
  return ADS_V2_NON_LATIN_FONTS.has(cur) ? ADS_V2_LATIN_FONT : cur
}

/** Todo elemento de texto da fonte do Creatomate (também dentro de composições) com a fonte da escrita que ele usa. Devolve a MESMA fonte quando nada muda. Pura. */
export function adsV2ScriptSafeFonts<T>(source: T): T {
  const fix = (els: unknown): { out: unknown; changed: boolean } => {
    if (!Array.isArray(els)) return { out: els, changed: false }
    let changed = false
    const out = els.map((e) => {
      if (!e || typeof e !== 'object') return e
      const el = e as Record<string, unknown>
      let next = el
      if (el.type === 'text' && typeof el.text === 'string') {
        const font = adsV2FontForText(el.text, el.font_family)
        if (font !== el.font_family && (typeof el.font_family === 'string' || adsV2TextScript(el.text))) next = { ...next, font_family: font } // sem fonte e só latim = o padrão do Creatomate fica
      }
      if (Array.isArray(el.elements)) {
        const inner = fix(el.elements)
        if (inner.changed) next = { ...next, elements: inner.out }
      }
      if (next !== el) changed = true
      return next
    })
    return { out: changed ? out : els, changed }
  }
  if (!source || typeof source !== 'object') return source
  const s = source as Record<string, unknown>
  const r = fix(s.elements)
  return (r.changed ? { ...s, elements: r.out } : source) as T
}
