// KINEO-K4-PAGO-CABE-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião do Kling 4 PAGO de 15 s.
// Defeito (02/11, dois filmes pagos estornados: bc9177cd 35 palavras, af240efa 40): a ideia solta ia ao escritor com engine
// 'hollywood' a 15 s e a régua hollywood com cobertura 1,0 pedia ≥ 35 palavras (⌈15 × 2,3⌉). A voz falou 2,05 e 2,14 pal/s
// (compose_refused: 12 palavras em 5,86 s; 14 em 6,53 s) → 16–19 s de fala num clipe de 15 s → scene_speech_exceeds_footage
// DEPOIS do POST pago. Aqui, sem rede e sem fal: a faixa do escritor (faixaDoKling4PagoNoEscritor) em en/pt/es tem teto cuja
// fala prevista cabe em K4_TETO_MEDIDO_SEGUNDOS (15,5 s, o mesmo teto do grátis) na voz real mais lenta, e piso acima do portão
// pago — e a rota do escritor usa a faixa (instrução, piso, teto e teto duro). Na origin/main a régua do escritor dá 35–42 → reprova.
// Rodar: npx tsx scripts/test-k4-pago-cabe-0211.mts
import fs from 'node:fs'
import { faixaDoKling4PagoNoEscritor, faixaDoKling4PagoParaOPedido, faixaDoKling4NoEscritor, instrucaoDoKling4NoEscritor, K4_TETO_MEDIDO_SEGUNDOS, K4_FATOR_REAL_PADRAO, palavrasNoPortao } from '../lib/kling4TrialScript'
import { RITMO_HOLLYWOOD, fatorDoRitmoDoIdioma, checarFalaCurtaDoMotor } from '../lib/durationByEngine'
import { narrationFitAt, speechRateFor } from '../lib/speechRate'
import { minWordsFor, writerRateFor } from '../lib/scriptWriterRate'
import { pisoDoPortao, avaliarRoteiroEscrito } from '../lib/meta95/ideiaNoEscritor'
import { fitShortFilmScript } from '../lib/shortFilmScript'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

// As duas vozes reais do defeito (pal/s medidos no compose_refused de 02/11) e a régua prevista do teto (2,3 × língua × 0,87).
const VOZES_DO_DEFEITO = [12 / 5.86, 14 / 6.53]
const passoReal = (l: string) => RITMO_HOLLYWOOD * fatorDoRitmoDoIdioma(l) * K4_FATOR_REAL_PADRAO
const hollywood = (l: string) => speechRateFor({ family: 'hollywood', language: l })

console.log('1. a faixa do escritor do Kling 4 pago de 15 s cabe no clipe (en/pt/es)')
for (const l of ['en', 'pt', 'es']) {
  const f = faixaDoKling4PagoNoEscritor(l)
  const prevista = f.max / passoReal(l)
  ok(prevista <= K4_TETO_MEDIDO_SEGUNDOS, `${l}: teto ${f.max} palavras ÷ ${passoReal(l).toFixed(3)} pal/s = ${prevista.toFixed(2)} s ≤ ${K4_TETO_MEDIDO_SEGUNDOS} s`)
  for (const v of VOZES_DO_DEFEITO) ok(f.max / v <= K4_TETO_MEDIDO_SEGUNDOS, `${l}: teto ${f.max} na voz real do defeito (${v.toFixed(2)} pal/s) = ${(f.max / v).toFixed(2)} s ≤ ${K4_TETO_MEDIDO_SEGUNDOS} s`)
  // o piso passa no portão pago (narrationFitAt hollywood, kling4_paid_script_duration_mismatch) e no meta95 (pisoDoPortao)
  const texto = (n: number) => `HOOK: [Pexels: city] ${Array.from({ length: n }, () => 'money').join(' ')}.`
  const fala = (n: number) => `${Array.from({ length: n }, () => 'money').join(' ')}.` // o portão lê a narração sem marcadores (parsedScript.narration)
  ok(narrationFitAt(fala(f.min), 15, hollywood(l)).ok, `${l}: piso ${f.min} passa no portão pago de 15 s (narrationFitAt hollywood)`)
  ok(!narrationFitAt(fala(f.min - 2), 15, hollywood(l)).ok, `${l}: piso − 2 = ${f.min - 2} já reprovaria no portão (margem de 1 palavra, não de mais)`)
  ok(f.min > pisoDoPortao({ engine: 'hollywood', seconds: 15, language: l }), `${l}: piso ${f.min} > pisoDoPortao do meta95 (${pisoDoPortao({ engine: 'hollywood', seconds: 15, language: l })}) — a ideia nunca cai em 'curto'`)
  ok(f.max > f.min && f.max - f.min >= 3, `${l}: faixa ${f.min}–${f.max} com espaço para o corte por frases inteiras`)
  ok(f.max <= checarFalaCurtaDoMotor({ engine: 'hollywood', seconds: 15, verbatim: true, narration: texto(f.max).replace(/^.*\] /, ''), language: l }).limitSeconds * RITMO_HOLLYWOOD, `${l}: teto dentro da guarda de roteiro longo da rota`)
  // a fala do teto, dividida por igual nos 3 × 5 s do Seedance de reserva, cabe com a aceleração ×1,1 do compose
  const porCena = Math.ceil(f.max / 3)
  ok(Math.min(...VOZES_DO_DEFEITO) > 0 && porCena / Math.min(...VOZES_DO_DEFEITO) / 1.1 <= 5.01, `${l}: reserva 3 × 5 s — ${porCena} palavras por cena na voz mais lenta do defeito cabem a ×1,1`)
}

console.log('2. a régua de antes (a que a origin/main usa) reprovava — o defeito reproduzido')
{
  const r = writerRateFor('hollywood', 'money tips', 'en')
  const antes = minWordsFor(15, r.wordsPerSecond, r.coverage)
  ok(antes === 35, `régua do escritor hollywood a 15 s = ${antes} palavras (o writer_min_words: 35 do evento)`)
  ok(antes / passoReal('en') > K4_TETO_MEDIDO_SEGUNDOS && antes / Math.max(...VOZES_DO_DEFEITO) > 15, `${antes} palavras = ${(antes / passoReal('en')).toFixed(1)} s previstos — não cabe; a faixa nova fica abaixo`)
  ok(faixaDoKling4PagoNoEscritor('en').max < antes, 'o teto novo fica abaixo do piso antigo')
  for (const [id, palavras] of [['bc9177cd', 35], ['af240efa', 40]] as const) ok(palavras > faixaDoKling4PagoNoEscritor('en').max, `${id}: ${palavras} palavras ficariam acima do teto (o corte por frases tira até caber)`)
}

console.log('3. o predicado: só o Kling 4 pago de 15 s (engine hollywood com KLING4_PAID_LIVE)')
ok(faixaDoKling4PagoParaOPedido({ engine: 'hollywood', seconds: 15, language: 'en', live: true })?.max === faixaDoKling4PagoNoEscritor('en').max, 'hollywood · 15 s · ligado → faixa')
ok(faixaDoKling4PagoParaOPedido({ engine: 'hollywood', seconds: 15, language: 'en', live: false }) === null, 'interruptor desligado (Kling 3) → sem faixa (o filme segue a fala)')
for (const s of [30, 35, 60]) ok(faixaDoKling4PagoParaOPedido({ engine: 'hollywood', seconds: s, language: 'en', live: true }) === null, `${s} s → sem faixa (outras durações ficam como estão)`)
for (const e of ['h3', 'omni', 's25', 'seedance', 'cinematic_ai', 'fast', 'kling', 'veo', null]) ok(faixaDoKling4PagoParaOPedido({ engine: e, seconds: 15, language: 'en', live: true }) === null, `${String(e)} a 15 s → sem faixa (plano segue a fala ou faixa própria)`)
ok(JSON.stringify(faixaDoKling4NoEscritor('en', null)) === JSON.stringify({ min: 31, max: 32, language: 'en', voiceWordsPerSecond: null }), 'faixa do filme grátis intocada (en 31–32)')

console.log('4. o corte por frases com teto duro = teto da faixa nunca devolve acima do teto')
{
  const f = faixaDoKling4PagoNoEscritor('en')
  const roteiro = `HOOK: [Pexels: private jet interior] Ninety percent of people miss this about money.\nMICRO REWARD 1: [Pexels: luxury watch closeup] Setting a budget is like owning time. Control it and you control your life.\nMICRO REWARD 2: [Pexels: trading screens office] Cutting unnecessary expenses frees up cash for what truly matters.\nPAYOFF: [Pexels: penthouse city view] Explore investing. Every dollar invested today could mean a luxurious tomorrow.`
  const conta = (t: string) => palavrasNoPortao(t)
  const r = fitShortFilmScript(roteiro, { maxWords: f.max, minWords: f.min, countWords: conta, hardMaxWords: f.max })
  ok(conta(roteiro) > f.max && r.words <= f.max && !r.overCeiling, `${conta(roteiro)} → ${r.words} palavras (≤ ${f.max}), por frases inteiras`)
  ok(avaliarRoteiroEscrito({ script: r.script, engine: 'hollywood', seconds: 15, language: 'en' }).ok, 'o roteiro cortado entra pelo meta95 (marcadores, piso do portão, guarda)')
  ok(/15-second shot/.test(instrucaoDoKling4NoEscritor(f)) && instrucaoDoKling4NoEscritor(f).includes(`${f.min}-${f.max} spoken words`), 'a instrução do escritor leva a faixa do pago')
}

console.log('5. a rota do escritor usa a faixa do pago (fonte)')
{
  const gs = rd('app/api/generate-script/route.ts')
  ok(/const faixaK4Pago = filmeCurto && !colado\.pasted \? faixaDoKling4PagoParaOPedido\(\{ engine: body\.engine, seconds: alvoSegundos, language \}\) : null/.test(gs), 'faixaK4Pago calculada no filme curto escrito pela IA (roteiro colado fica fora)')
  ok(/const faixaK4 = faixaK4Pago \?\? \(filmeCurto && !colado\.pasted \? await faixaDoKling4ParaOPedido\(/.test(gs), 'faixaK4 = pago ?? grátis — piso, teto, instrução e "curto para o alvo" seguem a mesma faixa')
  ok(/if \(faixaK4Pago\) tetoDuroFilmeCurto = faixaK4Pago\.max/.test(gs), 'no pago o teto duro do corte = teto da faixa (sem medição da voz, passar do teto não tem rede)')
  ok(/let tetoDuroFilmeCurto = /.test(gs), 'tetoDuroFilmeCurto virou let')
  ok(gs.indexOf('if (faixaK4Pago) tetoDuroFilmeCurto') < gs.indexOf('const fim = finishShortFilmScript(t, { maxWords: tetoFilmeCurto, minWords: pisoFilmeCurto'), 'o teto duro muda ANTES do fecho do filme curto')
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
