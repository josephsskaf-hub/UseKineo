// KINEO-ADS-CONSERTOS-1410 — DESFAZ, em memória, o conserto "a frase crua vira a marca" no núcleo do /plan
// (lib/ads/v2PlanCore.ts), para os guardiões que conferem o /plan BYTE A BYTE contra uma base antiga (via desfazExtracao em
// shopify-extracao-v2-1310.mjs). Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Toda linha nova ou mudada carrega a marca KINEO-ADS-CONSERTOS-1410. As NOVAS saem (o import, 2 comentários, sentenceFull,
// sentenceCopy); as 4 MUDADAS voltam ao texto exato de antes (let text, moderação, língua, sentence da extração). Uma linha
// marcada que não é nenhuma destas = lança (o guardião fica vermelho em vez de engolir uma mudança nova).
// scripts/test-ads-consertos-1410.mjs confere que as linhas marcadas são EXATAMENTE estas e que nenhuma toca dinheiro.
export const MARCA_CONSERTOS_1410 = 'KINEO-ADS-CONSERTOS-1410'

const VOLTA = [
  [/^    let text = sentenceCopy \/\/ KINEO-ADS-CONSERTOS-1410$/, "    let text = typeof brief0.sentence === 'string' ? brief0.sentence.trim() : ''"],
  [
    /^    const safety = await moderateContent\(\{ surface: 'ads_brief', stage: 'input', userId: user\.id, text: \[text, \.\.\.\(sentenceFull !== sentenceCopy \? \[sentenceFull\] : \[\]\), \.\.\.factTexts\]\.join\('\\n'\), meta: \{ order_id: order\.id, v2: true \} \}\) \/\/ KINEO-ADS-CONSERTOS-1410 .*$/,
    "    const safety = await moderateContent({ surface: 'ads_brief', stage: 'input', userId: user.id, text: [text, ...factTexts].join('\\n'), meta: { order_id: order.id, v2: true } })",
  ],
  [
    /^    const language = narrationLanguage\(order\.language\) \?\? narrationLanguage\(pageLang\) \?\? resolveNarrationLanguage\(undefined, sentenceFull !== sentenceCopy \? `\$\{text\}\\n\$\{sentenceFull\}` : text\)\.language \/\/ KINEO-ADS-CONSERTOS-1410 .*$/,
    '    const language = narrationLanguage(order.language) ?? narrationLanguage(pageLang) ?? resolveNarrationLanguage(undefined, text).language',
  ],
  [
    /^      \.\.\.\(simple \? \{ overlays: overlaysOn, facts: factTexts, sentence: sentenceCopy \} : \{\}\), \/\/ KINEO-ADS-CONSERTOS-1410 .*$/,
    "      ...(simple ? { overlays: overlaysOn, facts: factTexts, sentence: typeof brief0.sentence === 'string' ? brief0.sentence.trim() : '' } : {}),",
  ],
]
const SAI = [
  /^import \{ adsV2SentenceForCopy \} from '@\/lib\/ads\/v2Scene' \/\/ KINEO-ADS-CONSERTOS-1410 .*$/,
  /^    \/\/ KINEO-ADS-CONSERTOS-1410 — QA 14\/10: .*$/,
  /^    \/\/ KINEO-ADS-CONSERTOS-1410 — pedido de produto com cena na frase: .*$/,
  /^    const sentenceFull = typeof brief0\.sentence === 'string' \? brief0\.sentence\.trim\(\) : '' \/\/ KINEO-ADS-CONSERTOS-1410 .*$/,
  /^    const sentenceCopy = adsV2SentenceForCopy\(brief0, input\.sector\) \/\/ KINEO-ADS-CONSERTOS-1410 .*$/,
]

/** O núcleo do /plan de ANTES deste conserto (LF). Idempotente: sem linha marcada, devolve o texto igual (só LF). */
export function semConsertos1410(s) {
  const out = []
  for (const l of String(s).replace(/\r\n/g, '\n').split('\n')) {
    if (!l.includes(MARCA_CONSERTOS_1410)) { out.push(l); continue }
    if (SAI.some((re) => re.test(l))) continue
    const v = VOLTA.find(([re]) => re.test(l))
    if (!v) throw new Error('semConsertos1410: linha marcada inesperada: ' + l.slice(0, 120))
    out.push(v[1])
  }
  return out.join('\n')
}

/** Quantas linhas marcadas o núcleo deve ter (5 que saem + 4 que voltam). */
export const CONSERTOS_1410_LINHAS_CORE = SAI.length + VOLTA.length
