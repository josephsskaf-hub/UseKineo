// KINEO-LEGENDA-NUMERO-RTL-0111 — guardião do pedido do revisor de 31/10 05:11 BRT (render 8d314182, Kling 4 grátis, árabe,
// 1º vídeo, nota 6): a narração "جريمة هزت ألمانيا عام ١٩٢٢..." saiu na legenda com o ano invertido ("٢٢٩١") e o ano caiu no
// pedaço SEGUINTE, longe de "عام". Prova, com as funções REAIS (lib/textLanguage, lib/compose, lib/filmes/faceless15,
// lib/free15CanonicalCaptions, lib/captionScriptSpelling):
//   (A) a nossa cadeia nunca inverte nada: o pedaço carrega "١٩٢٢" na ordem lógica, um token só; o elemento RTL sai com o ano
//       em algarismos ASCII ("1922", a forma que o Creatomate dispõe na ordem certa com text_direction 'rtl') — e nunca "٢٢٩١";
//   (B) os 2 chunkers (o clássico de 4 do Whisper e o agrupador do filme grátis) nunca separam "عام" de "١٩٢٢";
//   (C) Whisper que parte o ano ("19" "22") volta a um token só pela grafia do roteiro;
//   (D) separadores (١٫٥ · ١٬٩٢٢ · 1,922) e algarismos persas (۱۹۵۳);
//   (E) controle LTR (inglês, hindi com ३) e hebraico com ASCII: byte a byte como antes.
// Rodar: npx tsx scripts/test-legenda-numero-rtl-0111.mts
import fs from 'node:fs'
import { algarismosDaLegendaRtl, ehNumeroDaLegenda, numeroPresoAPalavraRtl, textDirectionOf } from '../lib/textLanguage'
import { buildCaptionElements, buildCaptionsFromWhisperWords, type WhisperWord } from '../lib/compose'
import { agruparLegendaFaceless15 } from '../lib/filmes/faceless15'
import { buildFree15CanonicalCaptions } from '../lib/free15CanonicalCaptions'
import { grafiaDoRoteiro } from '../lib/captionScriptSpelling'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

const CWPC = Number(fs.readFileSync('lib/compose.ts', 'utf8').match(/^const CAPTION_WORDS_PER_CHUNK = (\d+)$/m)?.[1])
ok(Number.isFinite(CWPC) && CWPC >= 2, `CAPTION_WORDS_PER_CHUNK lido de lib/compose.ts (${CWPC})`)

// A frase do render 8d314182 (abertura exata) + a continuação: 8 tokens, o que põe o corte cego logo depois de "عام".
const ARABE = 'جريمة هزت ألمانيا عام ١٩٢٢ ولا تزال لغزا.'
const ANO = '١٩٢٢'
const INVERTIDO = '٢٢٩١'

/** Palavras do Whisper sintéticas: 0,35 s cada, sem pausa, fim de frase na pontuação final. */
function whisper(texto: string, partir: Record<string, string[]> = {}): WhisperWord[] {
  const out: WhisperWord[] = []
  let t = 0
  for (const w of texto.split(/\s+/u).filter(Boolean)) {
    for (const p of partir[w] ?? [w]) { out.push({ word: p, start: t, end: t + 0.3, sentenceEnd: /[.!?؟۔]$/u.test(p) }); t += 0.35 }
  }
  return out
}
const juntos = (texto: string) => texto.includes(`عام ${ANO}`)

// ── (A) ordem: nada nosso inverte; o elemento RTL leva o ano em ASCII ───────────────────────────────────────────────
{
  const ws = whisper(ARABE)
  const caps = buildCaptionsFromWhisperWords(ws, ws.at(-1)!.end + 0.3, 0, CWPC)
  const comAno = caps.filter(c => c.text.includes(ANO))
  ok(comAno.length === 1 && !caps.some(c => c.text.includes(INVERTIDO)), '(A) o pedaço do chunker leva "١٩٢٢" na ordem lógica, uma vez, nunca "٢٢٩١"')
  ok(comAno.length === 1 && comAno[0].words.some(w => w.word === ANO), '(A) "١٩٢٢" é UM token (não um algarismo por palavra)')
  for (const c of caps) {
    const els = buildCaptionElements({ text: c.text, time: c.time, duration: c.duration, highlight: c.highlight, karaokeWords: c.words })
    ok(els.length === 1 && els[0].text_direction === 'rtl' && !/\[color/.test(String(els[0].text)), `(A) "${c.text}": um elemento, text_direction rtl, sem span`)
    if (c.text.includes(ANO)) {
      const t = String(els[0].text)
      ok(t.includes('1922') && !t.includes(INVERTIDO) && !t.includes('2291') && !/[٠-٩]/u.test(t), `(A) elemento com o ano: "${t}" — 1922 em ASCII, na ordem`)
      ok(t === c.text.toUpperCase().replace(ANO, '1922'), '(A) só os algarismos mudam; as palavras árabes ficam byte a byte, na ordem lógica')
    }
  }
  // pedaço que COMEÇA pelo número continua RTL (o algarismo árabe é letra forte para o detector) e sai em ASCII
  const soNumero = buildCaptionElements({ text: `${ANO} ولا تزال`, time: 0, duration: 1 })
  ok(textDirectionOf(`${ANO} ولا`) === true && soNumero[0].text_direction === 'rtl' && String(soNumero[0].text).startsWith('1922 '), '(A) pedaço que começa pelo ano: rtl + "1922" no começo lógico')
}

// ── (B) chunking: "عام" e "١٩٢٢" nunca se separam ─────────────────────────────────────────────────────────────────
{
  ok(numeroPresoAPalavraRtl('عام', ANO), '(B) regra: "عام" + "١٩٢٢" é par preso')
  ok(!numeroPresoAPalavraRtl('عام،', ANO) && !numeroPresoAPalavraRtl('ألمانيا.', ANO), '(B) depois de vírgula/ponto o corte continua natural')
  const ws = whisper(ARABE)
  const caps = buildCaptionsFromWhisperWords(ws, ws.at(-1)!.end + 0.3, 0, CWPC)
  ok(caps.some(c => juntos(c.text)), `(B) chunker clássico (${CWPC}): "عام ١٩٢٢" no mesmo pedaço — ${caps.map(c => c.text).join(' | ')}`)
  ok(!caps.some(c => c.text.startsWith(ANO)) && !caps.some(c => /(^|\s)عام$/u.test(c.text)), '(B) chunker clássico: nenhum pedaço começa pelo ano nem termina em "عام"')
  ok(caps.map(c => c.text).join(' ') === ARABE, '(B) chunker clássico: nenhuma palavra some nem troca de ordem')
  const blocos = agruparLegendaFaceless15(ws, ws.at(-1)!.end + 0.3)
  ok(blocos.some(b => juntos(b.text)) && blocos.map(b => b.text).join(' ') === ARABE, `(B) agrupador do filme grátis (F1): junto e completo — ${blocos.map(b => b.text).join(' | ')}`)
  // o caminho REAL do filme grátis Kling 4 / Seedance 15 s: legenda canônica do roteiro (tempo proporcional)
  const canon = buildFree15CanonicalCaptions({ script: ARABE, audioSeconds: 6, source: { elements: [] } }) as Array<Record<string, unknown>>
  const textos = canon.map(e => String(e.text))
  ok(canon.length >= 2 && canon.every(e => e.text_direction === 'rtl'), `(B) legenda canônica do filme grátis: ${canon.length} elementos, todos rtl`)
  ok(textos.some(t => t.includes('عام 1922')) && !textos.some(t => t.startsWith('1922')) && !textos.some(t => t.includes(INVERTIDO)), `(B) legenda canônica: "عام 1922" juntos — ${textos.join(' | ')}`)
}

// ── (C) Whisper que parte o ano em dois tokens: a grafia do roteiro devolve um token só ───────────────────────────
{
  const ws = whisper(ARABE.replace(ANO, '1922'), { '1922': ['19', '22'] })
  const g = grafiaDoRoteiro(ws, ARABE)
  ok(g.filter(w => w.word === ANO).length === 1 && !g.some(w => w.word === '19' || w.word === '22'), `(C) "19"+"22" do Whisper viram "١٩٢٢" (um token) — ${g.map(w => w.word).join(' ')}`)
  const caps = buildCaptionsFromWhisperWords(g, g.at(-1)!.end + 0.3, 0, CWPC)
  ok(caps.some(c => juntos(c.text)), `(C) e o pedaço mantém "عام ١٩٢٢" — ${caps.map(c => c.text).join(' | ')}`)
}

// ── (D) separadores e algarismos persas ───────────────────────────────────────────────────────────────────────────
ok(algarismosDaLegendaRtl('١٫٥ مليون') === '1.5 مليون', '(D) ١٫٥ → 1.5 (separador decimal árabe)')
ok(algarismosDaLegendaRtl('١٬٩٢٢ شخص') === '1,922 شخص', '(D) ١٬٩٢٢ → 1,922 (milhar árabe)')
ok(algarismosDaLegendaRtl('در سال ۱۹۵۳') === 'در سال 1953', '(D) persa ۱۹۵۳ → 1953')
ok(algarismosDaLegendaRtl('في عام 2005') === 'في عام 2005', '(D) ASCII fica como está (o render d3e87ab5 já mostrava 2005 certo)')
ok(algarismosDaLegendaRtl('١٢٣ ریال، ٤٥٦') === '123 ریال، 456', '(D) vírgula árabe entre números não vira separador')
for (const n of [ANO, `${ANO}،`, '1,922', '١٫٥', '$9.90', '٥٠٪', '۱۹۵۳']) ok(ehNumeroDaLegenda(n), `(D) "${n}" é número`)
for (const n of ['عام', 'COVID-19', '3D', '']) ok(!ehNumeroDaLegenda(n), `(D) "${n}" não é número`)

// ── (E) controle LTR + hebraico com ASCII ────────────────────────────────────────────────────────────────────────
{
  const EN = 'A crime shook Germany in the year 1922 and remains a mystery.'
  ok(!numeroPresoAPalavraRtl('year', '1922') && !numeroPresoAPalavraRtl('ठीक', '३'), '(E) LTR: a regra nova nunca dispara')
  const ws = whisper(EN)
  const caps = buildCaptionsFromWhisperWords(ws, ws.at(-1)!.end + 0.3, 0, CWPC)
  // a régua de antes, escrita à mão: teto de CWPC, artigo/preposição no fim desce para o pedaço seguinte
  const esperado = CWPC === 4 ? ['A crime shook Germany', 'in the year 1922', 'and remains a mystery.'] : null
  ok(esperado == null || JSON.stringify(caps.map(c => c.text)) === JSON.stringify(esperado), `(E) inglês: cortes de antes — ${caps.map(c => c.text).join(' | ')}`)
  const el = buildCaptionElements({ text: 'in the year 1922', time: 0, duration: 1 })[0]
  ok(el.text === 'IN THE YEAR 1922' && el.text_direction === undefined, '(E) inglês: elemento byte a byte (sem text_direction, texto igual)')
  const hi = buildCaptionElements({ text: 'रात के ठीक ३ बजे', time: 0, duration: 1 })[0]
  ok(hi.text === 'रात के ठीक ३ बजे'.toUpperCase() && hi.text_direction === undefined, '(E) hindi com ३: algarismo nativo intacto (LTR não passa pela conversão)')
  const he = buildCaptionElements({ text: 'בשנת 1953 הגיעו', time: 0, duration: 1 })[0]
  ok(he.text === 'בשנת 1953 הגיעו' && he.text_direction === 'rtl', '(E) hebraico com ASCII: rtl e texto igual')
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
