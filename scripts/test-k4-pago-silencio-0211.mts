// KINEO-K4-PAGO-SILENCIO-0211 (+0211c, 0211d) [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião da régua do Kling 4 PAGO de 15 s.
// Defeito (02/11 20:54 UTC, c391673c): ideia em pt → 28 palavras (faixa 27–31 do KINEO-K4-PAGO-CABE-0211) → 422 plan_silence_inside_scenes
// ("cena 1 fica 1,8 s sem fala", per_scene [1.8, 0.5]) antes do despacho: o portão julgava as cenas do PLANO; o Kling 4 pago de 15 s é UM
// clipe com a fala inteira. 2ª recusa (21:14 UTC, f37872b5, en, 26 palavras): plan_duration_below_request — o plano não é o filme.
// 0211c (revisão): a régua do clipe único usa a voz da MONTAGEM (velocidade pinada) com o fator real RÁPIDO (0,93) no silêncio (cauda
// ≤ 2,5 s) e o LENTO (0,87) contra o que o compose aceita (FALA-CABE: (15 − 0,4) × 1,1 s) — estouro = recusa grátis antes da fal;
// o meta95 volta a ser o da origin/main (o fallback 'curto' ia ao planejador IA, que enche até ~34 palavras sem teto do pago).
// 0211d: a voz é pinada no claim (host_voice) com a velocidade que põe a fala em ~14 s de voz real (0,9–1,1) — régua e compose usam a mesma;
// com a faixa 27–31 toda persona passa nas duas pontas (tabela da seção 9).
// Sem rede e sem fal. Na origin/main este guardião nem carrega (lib/kling4PaidSilence não existe).
// Rodar: npx tsx scripts/test-k4-pago-silencio-0211.mts
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import {
  usaReguaDoKling4Pago, falaDoKling4Pago, reguaDoKling4Pago, faixaDaVozNoKling4Pago, ritmoNominalDaVoz, vozPinadaDoKling4Pago, hostVoiceDoKling4Pago,
  K4_PAGO_FALA_ALVO_S, K4_PAGO_FATOR_REAL_MEDIO, K4_PAGO_VELOCIDADE_MIN, K4_PAGO_VELOCIDADE_MAX,
  segundosDoFilmeNaReguaDeDuracao, K4_PAGO_FATOR_REAL_RAPIDO, K4_PAGO_FATOR_REAL_LENTO, K4_PAGO_SILENCIO_MAX_S, K4_PAGO_FALA_MAX_S,
} from '../lib/kling4PaidSilence'
import { prepareKling4PaidFilm } from '../lib/kling4PaidFilm'
import { faixaDoKling4PagoNoEscritor } from '../lib/kling4TrialScript'
import { fitCinematicPlanFloor, planSilenceReport, SILENCE_SCENE_MAX_SECONDS, SILENCE_TOTAL_MAX_SECONDS, type SilenceScene } from '../lib/cinematic/timelineContract'
import { resolveHollywoodVoice } from '../lib/hollywood/hostVoice'
import { VOICE_PERSONAS } from '../lib/narration/personas'
import { voiceForCharacter, isCharacterVoiceName } from '../lib/hollywood/characterVoice'
import { hollywoodVoiceFromClaim } from '../lib/hollywood/hostVoice'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const palavras = (n: number) => Array.from({ length: n }, () => 'palavra').join(' ')
// Espelho de reguaDoFilme (route.ts): limites por cena e total proporcional (8 s a cada 60 s, nunca < 8) — a régua de antes.
const reguaAntiga = (scenes: SilenceScene[], wps: number) => {
  const rep = planSilenceReport(scenes, wps)
  const filme = scenes.reduce((a, s) => a + (s.seconds || 0), 0)
  const totalMax = Math.round(SILENCE_TOTAL_MAX_SECONDS * Math.max(1, filme / 60) * 10) / 10
  return { ...rep, ok: rep.worst <= SILENCE_SCENE_MAX_SECONDS && rep.total <= totalMax }
}

console.log('1. a tabela ANTES do pino (velocidade natural de cada voz da casa) — mínimo (silêncio, fator 0,93, cauda 2,5 s) e máximo (fator 0,87, 15,5 s | compose 16,06 s)')
// [voz@velocidade, passo nominal, mínimo, máximo a 15,5 s, máximo que o compose aceita (FALA-CABE)]
const TABELA: Array<[string, number, number, number, number, number]> = [
  ['alloy@0.9', 0.9, 2.07, 24, 27, 28], ['onyx@0.92', 0.92, 2.12, 25, 28, 29], ['onyx@0.94', 0.94, 2.16, 26, 29, 30], ['shimmer@0.94', 0.94, 2.16, 26, 29, 30],
  ['echo@0.96', 0.96, 2.21, 26, 29, 30], ['onyx@0.96', 0.96, 2.21, 26, 29, 30], ['nova@0.97', 0.97, 2.23, 26, 30, 31], ['onyx@1', 1, 2.3, 27, 31, 32],
  ['nova@1', 1, 2.3, 27, 31, 32], ['echo@1.02', 1.02, 2.35, 28, 31, 32], ['fable@1.03', 1.03, 2.37, 28, 31, 33], ['nova@1.03', 1.03, 2.37, 28, 31, 33],
  ['alloy@1.04', 1.04, 2.39, 28, 32, 33], ['shimmer@1.06', 1.06, 2.44, 29, 32, 34], ['fable@1.1', 1.1, 2.53, 30, 34, 35],
]
ok(K4_PAGO_FATOR_REAL_RAPIDO === 0.93 && K4_PAGO_FATOR_REAL_LENTO === 0.87 && K4_PAGO_SILENCIO_MAX_S === 2.5 && K4_PAGO_FALA_MAX_S === 16.06, 'constantes: rápido 0,93 · lento 0,87 · cauda 2,5 s · compose (15 − 0,4) × 1,1 = 16,06 s')
{
  const daCasa = new Set<string>()
  for (const p of VOICE_PERSONAS) daCasa.add(`${p.voice}@${p.defaultSpeed}`)
  for (const g of ['male', 'female', 'child'] as const) for (const a of ['young', 'adult', 'elderly'] as const) { const v = voiceForCharacter(g, a); daCasa.add(`${v.voice}@${v.speed}`) }
  ok([...daCasa].every((k) => TABELA.some((t) => t[0] === k)) && TABELA.every((t) => daCasa.has(t[0])), `a tabela cobre exatamente as ${daCasa.size} vozes/velocidades da casa (personas + vozes de personagem)`)
}
for (const [k, s, ritmo, min, max155, maxCompose] of TABELA) {
  const f = faixaDaVozNoKling4Pago(s)
  const m155 = Math.floor(15.5 * ritmo * K4_PAGO_FATOR_REAL_LENTO + 1e-9)
  ok(ritmoNominalDaVoz(s) === ritmo && f.min === min && m155 === max155 && f.max === maxCompose, `${k}: passo ${ritmo} · mín ${min} · máx ${max155} (15,5 s) · máx ${maxCompose} (compose)`)
  const r = (n: number) => reguaDoKling4Pago({ fala: palavras(n), speed: s })
  ok(r(min).ok && !r(min - 1).ok && !r(min - 1).estouro, `${k}: ${min} passa, ${min - 1} recusa por silêncio (cauda > 2,5 s na voz rápida)`)
  ok(r(maxCompose).ok && r(maxCompose + 1).estouro && !r(maxCompose + 1).ok, `${k}: ${maxCompose} cabe, ${maxCompose + 1} estoura (recusa grátis antes da fal)`)
}

console.log('2. na velocidade natural a faixa fixa 27–31 não servia (por isso o pino de 0211d)')
{
  const f = faixaDoKling4PagoNoEscritor('en')
  ok(f.min === 27 && f.max === 31, 'faixa do escritor en/pt/es = 27–31 (intocada)')
  const cabem = TABELA.filter(([, , , min, , maxC]) => f.min >= min && f.max <= maxC).map((t) => t[0])
  ok(JSON.stringify(cabem) === JSON.stringify(['nova@0.97', 'onyx@1', 'nova@1']), `na velocidade natural a faixa inteira cabia só em: ${cabem.join(', ')}`)
  const personas = TABELA.filter((t) => VOICE_PERSONAS.some((p) => `${p.voice}@${p.defaultSpeed}` === t[0]))
  const piso = Math.max(...personas.map((t) => t[3])), teto = Math.min(...personas.map((t) => t[5]))
  ok(piso === 30 && teto === 28, `interseção natural das personas VAZIA (maior mínimo ${piso}, fable@1.1; menor máximo ${teto}, alloy@0.9)`)
}

console.log('3. o defeito c391673c reproduzido na régua antiga e resolvido na nova (voz pinada)')
{
  const rPt = Math.round(2.3 * 0.96 * 100) / 100
  const plano: SilenceScene[] = [{ type: 'cinematic', seconds: 9, voiceover: palavras(16) }, { type: 'cinematic', seconds: 6, voiceover: palavras(12) }]
  const antes = reguaAntiga(plano, rPt)
  ok(!antes.ok && antes.worstScene === 1 && antes.worst === 1.8, `pt 28 palavras na régua antiga (echo@0.96, ${rPt} pal/s, cenas do plano): cena 1 com ${antes.worst} s → recusa`)
  const pt = 'Este animal tem três corações! Sabias que o polvo tem três corações e sangue azul? Dois bombeiam sangue para as brânquias e o terceiro para o corpo inteiro.'
  const v = vozPinadaDoKling4Pago({ fala: pt, language: 'pt' })
  ok(v.voice === 'echo' && v.personaSpeed === 0.96, `pt documentário: a persona é echo@0.96 (a que o compose escolheria) — pinada a ${v.defaultSpeed}`)
  ok(reguaDoKling4Pago({ fala: pt, speed: v.efetiva }).ok, `pt ${pt.split(' ').length} palavras, voz pinada → passa`)
  const en = 'In today’s world, understanding money is crucial. Start by setting a realistic budget you can stick to. Explore investment options. Every small step counts toward a secure future.'
  const ve = vozPinadaDoKling4Pago({ fala: en, language: 'en' })
  ok(ve.voice === 'alloy' && ve.personaSpeed === 0.9 && reguaDoKling4Pago({ fala: en, speed: ve.efetiva }).ok, `en dinheiro: alloy@0.9 → pinada a ${ve.defaultSpeed}, passa`)
}

console.log('4. lado seguro: silêncio na voz rápida, estouro na voz lenta; os outros motores intocados')
for (const [k, s] of TABELA.map((t) => [t[0], t[1]] as const)) {
  const ritmo = ritmoNominalDaVoz(s)
  const n = faixaDaVozNoKling4Pago(s).min
  ok(15 - n / (ritmo * 0.93) >= 15 - n / (ritmo * 0.87), `${k}: a cauda prevista na voz rápida é a maior das duas (não subestima o silêncio)`)
}
ok(usaReguaDoKling4Pago({ paidKling4: true, seconds: 15 }), 'Kling 4 pago · 15 s → régua do clipe único')
for (const s of [30, 60]) ok(!usaReguaDoKling4Pago({ paidKling4: true, seconds: s }), `Kling 4 pago · ${s} s → régua de sempre (1,5 s por cena)`)
ok(!usaReguaDoKling4Pago({ paidKling4: false, seconds: 15 }), 'outros motores a 15 s → régua de sempre (1,5 s por cena)')
ok(SILENCE_SCENE_MAX_SECONDS === 1.5 && SILENCE_TOTAL_MAX_SECONDS === 8, 'limites da régua comum intocados (1,5 s / 8 s)')
{
  const cenas = [{ type: 'cinematic', voiceover: 'um dois' }, { type: 'dialogue', dialogueLine: 'três', voiceover: 'x' }, { type: 'cinematic', voiceover: 'quatro' }]
  ok(falaDoKling4Pago({ verbatim: false, scenes: cenas }) === 'um dois três quatro' && falaDoKling4Pago({ verbatim: true, narration: 'roteiro', scenes: cenas }) === 'roteiro', 'a fala julgada é a do despacho (verbatim → narração do roteiro)')
}

console.log('5. o teto da régua é o que o compose aceita, e o compose fala a voz pinada (fonte)')
{
  const cps = rd('app/api/compose/route.ts')
  ok(cps.includes('const FALA_CABE_RESPIRO_S = 0.4') && cps.includes('const FALA_CABE_MAX_FATOR = 1.1'), 'compose: respiro 0,4 s e re-síntese × 1,1 (KINEO-FALA-CABE) — K4_PAGO_FALA_MAX_S = (15 − 0,4) × 1,1')
  ok(cps.includes('hollywoodPinnedVoice = hollywoodVoiceFromClaim(cinematicBirthClaim?.response?.host_voice)'), 'compose: host_voice do claim vence (sem re-escolha pelo roteiro)')
  ok(cps.includes('speed: hollywoodPinnedVoice.defaultSpeed * (explicitSpeed ?? 1.0),'), 'compose: a velocidade falada = host_voice.speed × speed do cliente (a "efetiva" da régua)')
  for (const voz of new Set(VOICE_PERSONAS.map((p) => p.voice))) ok(isCharacterVoiceName(voz), `${voz}: aceita no host_voice do claim`)
  for (const n of [27, 31]) {
    const v = vozPinadaDoKling4Pago({ fala: palavras(n), language: 'en', velocidadeDoCliente: null })
    const lida = hollywoodVoiceFromClaim(hostVoiceDoKling4Pago(v))
    ok(!!lida && lida.voice === v.voice && lida.defaultSpeed === v.defaultSpeed && lida.personaId === v.personaId, `${n} palavras: o compose lê do claim exatamente a voz e a velocidade que a régua julgou (${v.voice}@${v.defaultSpeed})`)
  }
  const cli = vozPinadaDoKling4Pago({ fala: palavras(29), language: 'en', velocidadeDoCliente: 1.2 })
  ok(Math.abs(cli.efetiva - vozPinadaDoKling4Pago({ fala: palavras(29), language: 'en' }).efetiva) <= 0.01, `speed do cliente (1,2): a pinada desconta (${cli.defaultSpeed}) e a efetiva fica a mesma (${cli.efetiva})`)
}

console.log('6. a régua de duração (plan_duration_below_request) julga o filme despachado: o Kling 4 pago de 15 s tem sempre 15 s')
{
  const plano = (ws: number[]) => fitCinematicPlanFloor(ws.map((w) => ({ type: 'cinematic', seconds: 4, voiceover: palavras(w) })), 15, 10)
  const soma = (ws: number[]) => plano(ws).reduce((a, s) => a + s.seconds, 0)
  ok(soma([13, 13]) === 14, `f37872b5 reproduzido: 26 palavras em 2 cenas → o piso do plano para em ${soma([13, 13])} s (< 15) → 422 na régua antiga`)
  let algumaFaixa = false
  for (let w = 20; w <= 31; w++) { let todas = true; for (let a = 1; a < w; a++) if (soma([a, w - a]) < 15) todas = false; if (todas) algumaFaixa = true }
  ok(!algumaFaixa, 'régua antiga, 2 cenas: nenhuma contagem de 20 a 31 passa em toda divisão — subir o piso da faixa não resolvia')
  for (const ws of [[13, 13], [11, 16], [14, 15, 2]]) {
    const total = ws.reduce((a, b) => a + b, 0)
    const chunks = prepareKling4PaidFilm({ seconds: 15, narration: palavras(total), scenes: plano(ws).map((s) => ({ prompt: 'shot', seconds: s.seconds })) })
    ok(chunks.length === 1 && chunks[0].seconds === 15 && chunks[0].narration.split(' ').length === total, `plano de ${soma(ws)} s → o despacho reescala para UM clipe de 15 s com as ${total} palavras`)
  }
  ok(segundosDoFilmeNaReguaDeDuracao({ paidKling4: true, seconds: 15, plannedSeconds: 14 }) === 15, 'Kling 4 pago de 15 s: a régua de duração vê os 15 s do clipe')
  ok(segundosDoFilmeNaReguaDeDuracao({ paidKling4: true, seconds: 30, plannedSeconds: 28 }) === 28 && segundosDoFilmeNaReguaDeDuracao({ paidKling4: false, seconds: 15, plannedSeconds: 14 }) === 14, 'Kling 4 de 30/60 s e os outros motores: a soma do plano, como sempre')
}

console.log('7. 0211c: o meta95 volta a ser o da origin/main (ideia curta → recusa grátis no portão, nunca o planejador IA sem teto)')
{
  let diff = 'x'
  try { diff = execFileSync('git', ['diff', '--name-only', 'origin/main', '--', 'lib/meta95/ideiaNoEscritor.ts'], { encoding: 'utf8' }).trim() } catch { /* sem git = falha */ }
  ok(diff === '', 'lib/meta95/ideiaNoEscritor.ts sem mudança contra a origin/main')
}

console.log('8. a rota liga a régua nova antes do despacho (fonte)')
{
  const rt = rd('app/api/generate-video-cinematic/route.ts')
  const linha = 'const silence = usaReguaDoKling4Pago({ paidKling4, seconds: duration }) ? (() => { const fala = falaDoKling4Pago({ verbatim, narration: parsedScript.narration, scenes: plan.scenes }); return reguaDoKling4Pago({ fala, speed: vozPinadaDoKling4Pago({ fala, language: hollywoodLanguage, vertical: hollywoodVertical, velocidadeDoCliente: parsedScript.speed }).efetiva }) })() : reguaDoFilme(plan.scenes, ritmoVoz)'
  ok(rt.includes("...(usaReguaDoKling4Pago({ paidKling4, seconds: duration }) ? { host_voice: hostVoiceDoKling4Pago(vozPinadaDoKling4Pago({ fala: narration, language: hollywoodLanguage, vertical: hollywoodVertical, velocidadeDoCliente: parsedScript.speed })) } : {}),"), 'o claim do Kling 4 pago de 15 s leva host_voice = a mesma voz pinada (mesma fala do despacho, língua, vertical e speed)')
  ok(rt.includes("const narration = verbatim ? parsedScript.narration : plan.scenes.map(s => s.type === 'dialogue' ? s.dialogueLine ?? s.voiceover ?? '' : s.voiceover ?? '').join(' ')"), 'a fala do despacho é a mesma que falaDoKling4Pago julga')
  ok(rt.split(linha).length === 3, 'ensaio de $0 e portão pago usam a régua do clipe único no Kling 4 pago de 15 s')
  ok(!/const silence = reguaDoFilme\(plan\.scenes, ritmoVoz\)/.test(rt), 'nenhum ponto ficou com a régua antiga incondicional')
  const iGate = rt.indexOf(linha, rt.indexOf('KINEO-SILENCIO-NA-CENA-2026-09-11 — aprovado pelo fundador'))
  const iEstouro = rt.indexOf("reason: 'kling4_paid_narration_over_clip'")
  const iSilencio = rt.indexOf("reason: 'plan_silence_inside_scenes'")
  const iDespacho = rt.indexOf('if (paidKling4) {\n        // The approved plan and speech guards above are shared.')
  ok(iGate > 0 && iGate < iEstouro && iEstouro < iSilencio && iSilencio < iDespacho, 'ordem: régua → recusa por estouro → recusa por silêncio → despacho pago (nenhum POST sem as duas)')
  ok(rt.includes('const finalPlannedSeconds = segundosDoFilmeNaReguaDeDuracao({ paidKling4, seconds: duration, plannedSeconds: plan.scenes.reduce((sum, scene) => sum + scene.seconds, 0) })'), 'o portão de duração usa os segundos do filme despachado')
  ok(rt.includes('verdict: muteSeconds <= 6 && segundosDoFilmeNaReguaDeDuracao({ paidKling4, seconds: duration, plannedSeconds: totalSeconds }) >= duration'), 'o ensaio de $0 dá o mesmo veredito de duração')
}

console.log('9. a tabela DEPOIS do pino: toda persona, toda contagem da faixa 27–31 — cauda ≤ 2,5 s (voz rápida) e sem estouro (voz lenta)')
ok(K4_PAGO_FALA_ALVO_S === 14 && K4_PAGO_FATOR_REAL_MEDIO === 0.9 && K4_PAGO_VELOCIDADE_MIN === 0.9 && K4_PAGO_VELOCIDADE_MAX === 1.1, 'alvo 14 s · fator do meio 0,90 · velocidade 0,9–1,1')
// [palavras, velocidade pinada, cauda na voz rápida (s), fala na voz lenta (s)] — igual para toda persona (a velocidade é absoluta)
const DEPOIS: Array<[number, number, number, number]> = [[27, 0.93, 1.4, 14.5], [28, 0.97, 1.5, 14.43], [29, 1, 1.4, 14.49], [30, 1.04, 1.5, 14.43], [31, 1.07, 1.4, 14.48]]
for (const p of VOICE_PERSONAS) {
  let todas = true
  const vistos: string[] = []
  for (const [n, vel, cauda, lenta] of DEPOIS) {
    const fala = palavras(n)
    const v = vozPinadaDoKling4Pago({ fala, language: 'en' })
    // a voz DESTA persona pinada na velocidade calculada, lida de volta como o compose lê o claim
    const lida = hollywoodVoiceFromClaim({ persona_id: p.id, voice: p.voice, speed: v.defaultSpeed })
    const r = reguaDoKling4Pago({ fala, speed: lida?.defaultSpeed ?? 0 })
    vistos.push(`${n}:${v.defaultSpeed}/${r.total}/${r.falaLentaSegundos}`)
    if (!(v.defaultSpeed === vel && r.ok && !r.estouro && r.total === cauda && r.total <= 2.5 && r.falaLentaSegundos === lenta && lenta <= K4_PAGO_FALA_MAX_S)) todas = false
  }
  ok(todas, `${p.id} (${p.voice}@${p.defaultSpeed}): 27–31 → pinada 0,93–1,07, cauda 1,4–1,5 s ≤ 2,5, fala lenta 14,4–14,5 s ≤ 16,06 [${vistos.join(' ')}]`)
}
{
  // faixa que a voz pinada aceita (velocidade no limite): fora dela, a recusa grátis é o último recurso
  const passa = (n: number) => { const fala = palavras(n); return reguaDoKling4Pago({ fala, speed: vozPinadaDoKling4Pago({ fala, language: 'en' }).efetiva }) }
  ok(passa(24).ok && !passa(23).ok && !passa(23).estouro, '24 passa; 23 recusa por silêncio (a 0,9 a cauda passaria de 2,5 s)')
  ok(passa(35).ok && passa(36).estouro, '35 cabe; 36 estoura (a 1,1 a fala lenta passaria de 16,06 s) — recusa grátis antes da fal')
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
