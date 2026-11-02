// KINEO-K4-PAGO-SILENCIO-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião da régua de silêncio do Kling 4 PAGO de 15 s.
// Defeito (02/11 20:54 UTC, c391673c): ideia em pt → 28 palavras (faixa 27–31 do KINEO-K4-PAGO-CABE-0211) → 422 plan_silence_inside_scenes
// ("cena 1 fica 1,8 s sem fala", per_scene [1.8, 0.5]) antes do despacho. O portão julgava as cenas do PLANO no passo nominal da voz pinada
// (echo@0.96 → 2,21 pal/s em pt/es), mas o Kling 4 pago de 15 s é UM clipe com a fala inteira, e a faixa foi medida na voz REAL (2,0 pal/s).
// Aqui, sem rede e sem fal: em en/pt/es a faixa do escritor ⊂ [mínimo da régua do portão, máximo que cabe em 15,5 s na voz real]; a régua
// antiga reproduz a recusa; só o Kling 4 pago de 15 s muda; a rota liga a régua nova nos DOIS pontos (ensaio de $0 e portão pago).
// 2ª régua (21:14 UTC, f37872b5, en, 26 palavras): plan_duration_below_request — fitCinematicPlanFloor estica cada cena só até
// ⌈palavras ÷ 2,3⌉ + 1 e o plano de 2 cenas parou em 14 s; mas prepareKling4PaidFilm reescala o plano para o clipe único de 15 s.
// Na origin/main este guardião nem carrega (lib/kling4PaidSilence não existe).
// Rodar: npx tsx scripts/test-k4-pago-silencio-0211.mts
import fs from 'node:fs'
import { passoRealDoKling4Pago, usaReguaDoKling4Pago, filmeDoKling4PagoParaARegua, segundosDoFilmeNaReguaDeDuracao, pisoDoMeta95NoKling4Pago } from '../lib/kling4PaidSilence'
import { avaliarRoteiroEscrito } from '../lib/meta95/ideiaNoEscritor'
import { prepareKling4PaidFilm } from '../lib/kling4PaidFilm'
import { faixaDoKling4PagoNoEscritor, K4_TETO_MEDIDO_SEGUNDOS, K4_FATOR_REAL_PADRAO, K4_FATOR_REAL_POR_VOZ } from '../lib/kling4TrialScript'
import { RITMO_HOLLYWOOD, fatorDoRitmoDoIdioma } from '../lib/durationByEngine'
import { fitCinematicPlanFloor, planSilenceReport, SILENCE_SCENE_MAX_SECONDS, SILENCE_TOTAL_MAX_SECONDS, type SilenceScene } from '../lib/cinematic/timelineContract'
import { resolveHollywoodVoice } from '../lib/hollywood/hostVoice'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const palavras = (n: number) => Array.from({ length: n }, () => 'palavra').join(' ')

// Espelho de reguaDoFilme (app/api/generate-video-cinematic/route.ts): limites por cena e total proporcional (8 s a cada 60 s, nunca < 8).
const regua = (scenes: SilenceScene[], wps: number) => {
  const rep = planSilenceReport(scenes, wps)
  const filme = scenes.reduce((a, s) => a + (s.seconds || 0), 0)
  const totalMax = Math.round(SILENCE_TOTAL_MAX_SECONDS * Math.max(1, filme / 60) * 10) / 10
  return { ...rep, ok: rep.worst <= SILENCE_SCENE_MAX_SECONDS && rep.total <= totalMax }
}
const reguaNova = (n: number, l: string, verbatim = true) =>
  regua(filmeDoKling4PagoParaARegua({ verbatim, narration: palavras(n), scenes: [{ type: 'cinematic', voiceover: palavras(n) }] }), passoRealDoKling4Pago(l))
const minimoDoPortao = (l: string) => { for (let n = 1; n <= 60; n++) if (reguaNova(n, l).ok) return n; return Infinity }
const ritmoVozDe = (texto: string, l: string) => { const v = resolveHollywoodVoice(texto, l as 'en', undefined, null); return Math.round(2.3 * Math.max(0.85, Math.min(1.1, v.defaultSpeed)) * 100) / 100 }
const TEXTOS: Record<string, string> = {
  pt: 'Este animal tem três corações! Sabias que o polvo tem três corações e sangue azul? Dois bombeiam sangue para as brânquias e o terceiro para o corpo.',
  es: 'Este animal tiene tres corazones. ¿Sabías que el pulpo tiene tres corazones y sangre azul? Dos bombean sangre a las branquias y el tercero al cuerpo.',
  en: 'Want to master money in seconds? Start by setting a realistic budget you can stick to. Explore investment options. Every small step counts toward a secure future.',
}

console.log('1. faixa do escritor ⊂ [mínimo do portão, máximo na voz real] (en/pt/es)')
for (const l of ['en', 'pt', 'es']) {
  const f = faixaDoKling4PagoNoEscritor(l)
  const min = minimoDoPortao(l)
  const passo = passoRealDoKling4Pago(l)
  ok(f.min >= min, `${l}: piso da faixa ${f.min} ≥ mínimo do portão ${min} (clipe único de 15 s a ${passo.toFixed(3)} pal/s)`)
  ok(f.max / passo <= K4_TETO_MEDIDO_SEGUNDOS, `${l}: teto ${f.max} ÷ ${passo.toFixed(3)} = ${(f.max / passo).toFixed(2)} s ≤ ${K4_TETO_MEDIDO_SEGUNDOS} s (nada de scene_speech_exceeds_footage)`)
  let todas = true
  for (let n = f.min; n <= f.max; n++) if (!reguaNova(n, l).ok) todas = false
  ok(todas, `${l}: toda contagem de ${f.min} a ${f.max} passa no portão`)
  ok(!reguaNova(f.min - 2, l).ok, `${l}: ${f.min - 2} palavras (abaixo do portão pago de 26) seguem reprovando — o portão não virou carimbo`)
  // a voz real medida da voz pinada de pt/es (echo@0.96, fator 0,89) é MAIS LENTA que o passo da régua: o portão não aprova silêncio maior que o previsto
  const echoReal = 2.3 * 0.96 * K4_FATOR_REAL_POR_VOZ['echo@0.96']
  ok(echoReal <= passo + 1e-9, `${l}: echo@0.96 real ${echoReal.toFixed(3)} pal/s ≤ passo da régua ${passo.toFixed(3)} (prever mais rápido = mais silêncio previsto, nunca menos)`)
}

console.log('2. o passo da régua é o MESMO do teto da faixa (uma conta só)')
for (const l of ['en', 'pt', 'es', 'de', 'tr']) {
  const p = RITMO_HOLLYWOOD * fatorDoRitmoDoIdioma(l) * K4_FATOR_REAL_PADRAO
  ok(passoRealDoKling4Pago(l) === p, `${l}: passoRealDoKling4Pago = 2,3 × ${fatorDoRitmoDoIdioma(l).toFixed(3)} × ${K4_FATOR_REAL_PADRAO} = ${p.toFixed(3)}`)
  const f = faixaDoKling4PagoNoEscritor(l)
  ok(f.max === Math.max(f.min + 1, Math.floor(K4_TETO_MEDIDO_SEGUNDOS * p + 1e-9)), `${l}: teto da faixa ${f.max} sai do mesmo passo`)
}

console.log('3. a régua antiga reproduz o defeito (c391673c) e explica o inglês que passou (dc79fc17)')
{
  const rPt = ritmoVozDe(TEXTOS.pt, 'pt'), rEs = ritmoVozDe(TEXTOS.es, 'es'), rEn = ritmoVozDe(TEXTOS.en, 'en')
  ok(rPt === 2.21 && rEs === 2.21, `pt/es: voz pinada echo@0.96 → ritmoVoz ${rPt}/${rEs} pal/s (o passo do portão antigo)`)
  ok(rEn === 2.07, `en (dinheiro): alloy@0.9 → ritmoVoz ${rEn} pal/s`)
  // plano de 2 cenas que soma 15 s com as 28 palavras do pt (16 + 12 em 9 + 6 s)
  const plano: SilenceScene[] = [{ type: 'cinematic', seconds: 9, voiceover: palavras(16) }, { type: 'cinematic', seconds: 6, voiceover: palavras(12) }]
  const antes = regua(plano, rPt)
  ok(!antes.ok && antes.worstScene === 1 && antes.worst === 1.8, `pt 28 palavras na régua antiga: cena 1 com ${antes.worst} s mudos → recusa (o 422 de 02/11)`)
  ok(regua(plano, rEn).ok, 'o MESMO plano na voz do inglês (2,07) passa — a recusa era sorte da voz, não do roteiro')
  ok(reguaNova(28, 'pt').ok, 'pt 28 palavras na régua nova (clipe único de 15 s, passo real) → passa')
  // a faixa inteira na régua antiga, no melhor plano possível (cena única), recusa em pt/es
  for (const l of ['pt', 'es']) ok(!regua([{ type: 'cinematic', seconds: 15, voiceover: palavras(faixaDoKling4PagoNoEscritor(l).min) }], 2.21).ok, `${l}: o piso ${faixaDoKling4PagoNoEscritor(l).min} recusava na régua antiga mesmo num clipe único (15 − ${faixaDoKling4PagoNoEscritor(l).min}/2,21 > 1,5 s)`)
}

console.log('4. só o Kling 4 pago de 15 s muda')
ok(usaReguaDoKling4Pago({ paidKling4: true, seconds: 15 }), 'Kling 4 pago · 15 s → régua do clipe único')
for (const s of [30, 35, 60, 90]) ok(!usaReguaDoKling4Pago({ paidKling4: true, seconds: s }), `Kling 4 pago · ${s} s → régua de sempre`)
for (const s of [15, 60]) ok(!usaReguaDoKling4Pago({ paidKling4: false, seconds: s }), `não-Kling 4 (Kling 3/H3/Omni/S25) · ${s} s → régua de sempre`)
{
  const cenas = [{ type: 'cinematic', voiceover: 'um dois' }, { type: 'dialogue', dialogueLine: 'três', voiceover: 'x' }, { type: 'cinematic', voiceover: 'quatro' }]
  ok(filmeDoKling4PagoParaARegua({ verbatim: false, scenes: cenas })[0].voiceover === 'um dois três quatro', 'sem verbatim: a fala é a do despacho (falas do plano, diálogo pela linha falada)')
  const v = filmeDoKling4PagoParaARegua({ verbatim: true, narration: 'a narração do roteiro', scenes: cenas })
  ok(v.length === 1 && v[0].seconds === 15 && v[0].voiceover === 'a narração do roteiro', 'verbatim: uma cena de 15 s com a narração do roteiro (parsedScript.narration)')
}

console.log('5. a rota liga a régua nova nos dois pontos, com a mesma fala do despacho (fonte)')
{
  const rt = rd('app/api/generate-video-cinematic/route.ts')
  const linha = "const silence = usaReguaDoKling4Pago({ paidKling4, seconds: duration }) ? reguaDoFilme(filmeDoKling4PagoParaARegua({ verbatim, narration: parsedScript.narration, scenes: plan.scenes }), passoRealDoKling4Pago(hollywoodLanguage)) : reguaDoFilme(plan.scenes, ritmoVoz)"
  ok(rt.split(linha).length === 3, 'ensaio de $0 e portão pago usam a régua do clipe único no Kling 4 pago de 15 s')
  ok(!/const silence = reguaDoFilme\(plan\.scenes, ritmoVoz\)/.test(rt), 'nenhum ponto ficou com a régua antiga incondicional')
  ok(rt.includes("const narration = verbatim ? parsedScript.narration : plan.scenes.map(s => s.type === 'dialogue' ? s.dialogueLine ?? s.voiceover ?? '' : s.voiceover ?? '').join(' ')"), 'o despacho pago segue entregando a mesma fala (verbatim → parsedScript.narration) a prepareKling4PaidFilm')
  ok(rt.indexOf(linha, rt.indexOf('KINEO-SILENCIO-NA-CENA-2026-09-11 — aprovado pelo fundador')) < rt.indexOf('if (paidKling4) {\n        // The approved plan and speech guards above are shared.'), 'o portão roda ANTES do despacho pago (nenhum POST sem a régua)')
}

console.log('6. a régua de duração (plan_duration_below_request) julga o filme despachado: o Kling 4 pago de 15 s tem sempre 15 s')
{
  const plano = (ws: number[]) => fitCinematicPlanFloor(ws.map((w) => ({ type: 'cinematic', seconds: 4, voiceover: palavras(w) })), 15, 10)
  const soma = (ws: number[]) => plano(ws).reduce((a, s) => a + s.seconds, 0)
  ok(soma([13, 13]) === 14, `f37872b5 reproduzido: 26 palavras em 2 cenas → o piso do plano para em ${soma([13, 13])} s (< 15) → 422 na régua antiga`)
  ok(soma([11, 16]) < 15, `na régua antiga até o piso da faixa (27 = 11 + 16) para em ${soma([11, 16])} s, conforme a divisão do plano`)
  // régua antiga: nenhuma contagem que caiba em 15,5 s de voz real (≤ 31) passa em TODA divisão do plano em 2 cenas (cena
  // cinematográfica tem teto de 8 s e cada cena só estica até ⌈wᵢ/2,3⌉ + 1) — nenhuma faixa inteira resolvia: a régua tinha de mudar
  let algumaFaixa = false
  for (let w = 20; w <= 31; w++) { let todas = true; for (let a = 1; a < w; a++) if (soma([a, w - a]) < 15) todas = false; if (todas) algumaFaixa = true }
  ok(!algumaFaixa, 'régua antiga, 2 cenas: nenhuma contagem de 20 a 31 passa em toda divisão — subir o piso da faixa não resolvia')
  let minEquilibrado = Infinity
  for (let w = 20; w <= 40 && minEquilibrado === Infinity; w++) if (soma([Math.floor(w / 2), Math.ceil(w / 2)]) >= 15) minEquilibrado = w
  ok(minEquilibrado === 27, `régua antiga, divisão ao meio: passa a partir de ${minEquilibrado} — o 26 do f37872b5 caía, o 27 passava por sorte da divisão`)
  for (const ws of [[13, 13], [11, 16], [14, 15, 2]]) {
    const total = ws.reduce((a, b) => a + b, 0)
    const chunks = prepareKling4PaidFilm({ seconds: 15, narration: palavras(total), scenes: plano(ws).map((s) => ({ prompt: 'shot', seconds: s.seconds })) })
    ok(chunks.length === 1 && chunks[0].seconds === 15 && chunks[0].narration.split(' ').length === total, `plano de ${soma(ws)} s → o despacho reescala para UM clipe de 15 s com as ${total} palavras`)
  }
  ok(segundosDoFilmeNaReguaDeDuracao({ paidKling4: true, seconds: 15, plannedSeconds: 14 }) === 15, 'Kling 4 pago de 15 s: a régua de duração vê os 15 s do clipe')
  ok(segundosDoFilmeNaReguaDeDuracao({ paidKling4: true, seconds: 30, plannedSeconds: 28 }) === 28 && segundosDoFilmeNaReguaDeDuracao({ paidKling4: false, seconds: 15, plannedSeconds: 14 }) === 14, 'Kling 4 de 30/60 s e os outros motores: a soma do plano, como sempre')
  for (const l of ['en', 'pt', 'es']) {
    const f = faixaDoKling4PagoNoEscritor(l)
    let todas = true
    for (let n = f.min; n <= f.max; n++) for (let a = 1; a < n; a++) {
      if (!(reguaNova(n, l).ok && segundosDoFilmeNaReguaDeDuracao({ paidKling4: true, seconds: 15, plannedSeconds: soma([a, n - a]) }) >= 15)) todas = false
    }
    ok(todas && f.max / passoRealDoKling4Pago(l) <= K4_TETO_MEDIDO_SEGUNDOS, `${l}: faixa ${f.min}–${f.max} passa nas DUAS réguas do portão em qualquer divisão do plano e cabe em 15,5 s de voz real`)
  }
  ok(!reguaNova(26, 'en').ok, 'f37872b5 (26 palavras, ABAIXO da faixa) segue recusado — agora pela régua de silêncio (2,0 s mudos no clipe)')
  const rt = rd('app/api/generate-video-cinematic/route.ts')
  ok(rt.includes('const finalPlannedSeconds = segundosDoFilmeNaReguaDeDuracao({ paidKling4, seconds: duration, plannedSeconds: plan.scenes.reduce((sum, scene) => sum + scene.seconds, 0) })'), 'rota: o portão de duração usa os segundos do filme despachado')
  ok(rt.includes('verdict: muteSeconds <= 6 && segundosDoFilmeNaReguaDeDuracao({ paidKling4, seconds: duration, plannedSeconds: totalSeconds }) >= duration'), 'rota: o ensaio de $0 dá o mesmo veredito de duração')
}

console.log('7. KINEO-K4-PAGO-SILENCIO-0211b — o meta95 aceita a ideia do Kling 4 pago de 15 s a partir do piso da faixa')
{
  const roteiro = (n: number) => {
    const ws = palavras(n).split(' ')
    const q = Math.ceil(n / 3)
    return `HOOK: [Pexels: city] ${ws.slice(0, q).join(' ')}.\nMICRO REWARD 1: [Pexels: street] ${ws.slice(q, 2 * q).join(' ')}.\nPAYOFF: [Pexels: sky] ${ws.slice(2 * q).join(' ')}.`
  }
  for (const l of ['en', 'pt', 'es']) {
    const f = faixaDoKling4PagoNoEscritor(l)
    ok(pisoDoMeta95NoKling4Pago({ engine: 'hollywood', seconds: 15, language: l, live: true }) === f.min, `${l}: piso do meta95 no Kling 4 pago de 15 s = piso da faixa (${f.min})`)
    const abaixo = avaliarRoteiroEscrito({ script: roteiro(f.min - 1), engine: 'hollywood', seconds: 15, language: l, kling4PagoLive: true })
    ok(!abaixo.ok && abaixo.motivo === 'curto' && abaixo.piso === f.min, `${l}: ${f.min - 1} palavras (o f37872b5) → fallback 'curto' (caminho de antes, sem 422), não 'used'`)
    ok(avaliarRoteiroEscrito({ script: roteiro(f.min), engine: 'hollywood', seconds: 15, language: l, kling4PagoLive: true }).ok, `${l}: ${f.min} palavras → entra`)
    ok(avaliarRoteiroEscrito({ script: roteiro(f.min - 1), engine: 'hollywood', seconds: 15, language: l, kling4PagoLive: false }).ok, `${l}: interruptor do Kling 4 pago desligado (Kling 3) → piso de sempre (${f.min - 1} entra)`)
  }
  for (const [engine, s] of [['hollywood', 30], ['hollywood', 60], ['h3', 15], ['seedance', 15], ['omni', 15]] as const) {
    ok(pisoDoMeta95NoKling4Pago({ engine, seconds: s, language: 'en', live: true }) === null, `${engine} · ${s} s → piso do meta95 de sempre`)
  }
  ok(!reguaNova(faixaDoKling4PagoNoEscritor('en').min - 1, 'en').ok, 'o que o meta95 passa a recusar é exatamente o que a régua do clipe recusaria depois')
  const m95 = rd('lib/meta95/ideiaNoEscritor.ts')
  ok(m95.includes('const piso = Math.max(pisoDoPortao(args), pisoDoMeta95NoKling4Pago({ engine: args.engine, seconds: args.seconds, language: args.language, live: args.kling4PagoLive }) ?? 0)'), 'meta95: o piso de aceitação é o maior entre o do portão e o da faixa do Kling 4 pago')
  ok((m95.match(/args\.escritor\(/g) ?? []).length === 1, 'meta95: uma chamada ao escritor (a nova tentativa segue dentro do generate-script) — sem laço novo')
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
