// KINEO-LEGENDA-MILHAR-0211 — guardião do pedido do revisor de 02/11: a narração dizia "2,600 tracks" e a legenda queimada
// mostrou "600 TRACKS" — o Whisper partiu o número em "2," + "600" e a vírgula de "2," fechava o pedaço. Prova, com as
// funções REAIS de lib/compose e lib/filmes/faceless15:
//   (A) "2,600 tracks" e "1.500 pessoas" ficam num pedaço só, como UM token, com o texto do roteiro;
//   (B) as formas "2" + ",600" e "1,000," + "000" também colam; o agrupador do filme grátis herda a cola;
//   (C) controles: "In 1999, 600 people" (ano + vírgula), vírgula com pausa e frase que acaba em "3." seguem cortando como antes.
// Rodar: npx tsx scripts/test-legenda-milhar-0211.mts
import fs from 'node:fs'
import { buildCaptionsFromWhisperWords, type WhisperWord } from '../lib/compose'
import { agruparLegendaFaceless15 } from '../lib/filmes/faceless15'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

const CWPC = Number(fs.readFileSync('lib/compose.ts', 'utf8').match(/^const CAPTION_WORDS_PER_CHUNK = (\d+)$/m)?.[1])
ok(Number.isFinite(CWPC) && CWPC >= 2, `CAPTION_WORDS_PER_CHUNK lido de lib/compose.ts (${CWPC})`)

/** Whisper sintético: 0,35 s por token, sem pausa (ou `pausa` s depois do token marcado), fim de frase no ponto final. */
function whisper(tokens: string[], opts: { pausaDepois?: string; pausa?: number; fimDeFrase?: string[] } = {}): WhisperWord[] {
  const out: WhisperWord[] = []
  let t = 0
  for (const p of tokens) {
    const se = (opts.fimDeFrase ?? []).includes(p) || /[.!?]$/.test(p) && p === tokens[tokens.length - 1]
    out.push({ word: p, start: t, end: t + 0.3, sentenceEnd: se })
    t += 0.35 + (p === opts.pausaDepois ? (opts.pausa ?? 0) : 0)
  }
  return out
}
const caps = (ws: WhisperWord[], max = CWPC) => buildCaptionsFromWhisperWords(ws, ws.at(-1)!.end + 0.3, 0, max)
const textos = (ws: WhisperWord[], max = CWPC) => caps(ws, max).map((c) => c.text)

// ── (A) os três casos do pedido ──────────────────────────────────────────────────────────────────────────────────
for (const [tokens, numero, frase] of [
  [['Then', '2,', '600', 'tracks', 'vanished', 'that', 'year.'], '2,600', '2,600 tracks'],
  [['Mais', 'de', '1.', '500', 'pessoas', 'foram', 'embora.'], '1.500', '1.500 pessoas'],
] as const) {
  const ws = whisper([...tokens])
  const cs = caps(ws)
  const t = cs.map((c) => c.text)
  const comNumero = cs.filter((c) => c.text.includes(numero))
  ok(comNumero.length === 1 && comNumero[0].text.includes(frase), `(A) "${frase}" num pedaço só — ${t.join(' | ')}`)
  ok(!t.some((x) => /\d[.,]$/.test(x)) && !t.some((x) => /^\d/.test(x) && !x.startsWith(numero)), `(A) nenhum pedaço acaba em "${numero.slice(0, 2)}" nem começa pela metade do número`)
  ok(comNumero.length === 1 && comNumero[0].words.some((w) => w.word === numero && Math.abs(w.start - ws[tokens.indexOf(numero.slice(0, 2) as never)].start) < 0.001), `(A) "${numero}" é UM token karaokê, com o início da 1ª metade`)
  ok(t.join(' ') === tokens.join(' ').replace(`${numero.slice(0, 2)} ${numero.slice(2)}`, numero), '(A) nenhuma outra palavra some nem troca de ordem')
  // com 1 palavra por pedaço (o normalizador que o filme grátis usa) o número continua inteiro
  ok(textos(ws, 1).includes(numero), `(A) max=1: "${numero}" ainda é um pedaço só`)
}

// ── (B) outras formas de partir ─────────────────────────────────────────────────────────────────────────────────
ok(textos(whisper(['About', '2', ',600', 'tracks', 'survived.'])).some((x) => x.includes('2,600 tracks')), '(B) "2" + ",600" cola')
ok(textos(whisper(['Over', '1,000,', '000', 'people', 'watched.'])).some((x) => x.includes('1,000,000 people')), '(B) "1,000," + "000" cola')
{
  const ws = whisper(['The', 'label', 'released', '2,', '600', 'tracks', 'that', 'year.'])
  const blocos = agruparLegendaFaceless15(ws, ws.at(-1)!.end + 0.3)
  ok(blocos.some((b) => b.text.includes('2,600')) && !blocos.some((b) => /(^|\s)2,$/.test(b.text)), `(B) agrupador do filme grátis: "2,600" inteiro — ${blocos.map((b) => b.text).join(' | ')}`)
}

// ── (C) controles: o que cortava antes continua cortando ───────────────────────────────────────────────────────
// datas e enumerações (revisão adversarial 02/11): depois da vírgula só cola grupo de milhar de 3 algarismos
for (const [tokens, proibido] of [
  [['On', 'June', '6,', '1944,', 'Allied', 'troops', 'landed.'], '6,1944'],
  [['Rules', '1,', '2,', 'and', '3', 'matter.'], '1,2'],
  [['Chapters', '3,', '4', 'and', '5', 'today.'], '3,4'],
  [['Top', '10,', '20', 'or', '30', 'songs.'], '10,20'],
  [['He', 'was', 'only', '9.', '2', 'years', 'later', 'he', 'left.'], '9.2'],
  [['Step', '1.', '2', 'cups', 'of', 'flour.'], '1.2'],
] as Array<[string[], string]>) {
  ok(!textos(whisper(tokens)).some((x) => x.includes(proibido)), `(C) "${tokens.join(' ')}" não vira "${proibido}"`)
}
{
  const t = textos(whisper(['In', '1999,', '600', 'people', 'left.']))
  ok(t[0] === 'In 1999,' && t[1] === '600 people left.', `(C) ano + vírgula: corte de antes — ${t.join(' | ')}`)
}
{
  const t = textos(whisper(['They', 'had', '2,', '600', 'more', 'came.'], { pausaDepois: '2,', pausa: 0.4 }))
  ok(t[0] === 'They had 2,' && t[1].startsWith('600'), `(C) vírgula com pausa audível: corte de antes — ${t.join(' | ')}`)
}
{
  const t = textos(whisper(['The', 'score', 'was', '3.', '5', 'teams', 'qualified.'], { fimDeFrase: ['3.'] }))
  ok(t[0] === 'The score was 3.' && t[1].startsWith('5 '), `(C) fim de frase medido em "3.": corte de antes — ${t.join(' | ')}`)
}
{
  const t = textos(whisper(['Red,', 'green,', 'blue', 'lights.']))
  ok(JSON.stringify(t) === JSON.stringify(['Red,', 'green,', 'blue lights.']), `(C) vírgula entre palavras: corte de antes — ${t.join(' | ')}`)
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
