// KINEO-K4-GRATIS-20S-1711 [dono 17/11, opção A] — guardião sem rede e sem custo do caminho "Kling 4 grátis até 20 s".
// O clipe do Kling 4 grátis passa a nascer do tamanho da voz MEDIDA, atrás de KLING4_TRIAL_MAX_SECONDS (lib/kling4TrialPolicy.ts).
// Trava: (a) a constante está em 15 (desligada) e, em 15, tudo é o de hoje: teto da fala 15,5 s, clipe 15, a decisão da fala igual à
// antiga, o envio à fal byte a byte; (b) com teto 20, voz de 17 s = Kling 4 com clipe de 17 s (17,2 s → 18), os planos somam o clipe,
// cada plano ≥ 2 s, mesmas 3 cenas (nada repetido), o último plano termina no fim do clipe; 20,4 s → 20; 20,6 s → reserva;
// (c) o claim: sem `clip_duration` = 15, com 18 = 18, valor fora de 16–30 = 15, motor de reserva = 15; (d) a montagem: sem o campo
// (ou com 15) o RenderScript é o de hoje byte a byte; com 18 o clipe toca inteiro até a voz acabar; (e) a rota: o ensaio só para
// isDryRunAccount com k4_gratis_ensaio, o teto só vai à medição acima de 15, o claim e a montagem leem o mesmo campo.
// Mutantes: constante em 20 · clipe ignora clipSeconds · teto ignorado na medição · ensaio sem isDryRunAccount · compose ignora o campo.
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const POL = 'lib/kling4TrialPolicy.ts', K4 = 'lib/kling4Trial.ts', SCR = 'lib/kling4TrialScript.ts', CLAIM = 'lib/kling4TrialClaim.ts', COMP = 'lib/compose.ts'
const ROTA = 'app/api/generate-video-cinematic/route.ts', ROTA_COMPOSE = 'app/api/compose/route.ts'
const carrega = (mutar) => { const L = createOfflineLoader({ source: (rel, t) => (mutar ? mutar(rel.replace(/\\/g, '/'), t) : t) }); return (m) => L(m) }

const FALAS = ['Why did a whole town vanish overnight in 1872?', 'The maps still show the streets, the church and the mill by the river.', 'Divers found the answer under the new lake: the town was flooded on purpose to build a dam.']
const PROMPTS = ['An empty 1870s main street at dawn, fog over wooden houses', 'An old paper map on a desk, a finger tracing the river', 'A diver with a torch swims past a sunken church tower']

function problemas(load, rota, rotaCompose) {
  const p = []
  const P = load(POL), K = load(K4), S = load(SCR), C = load(CLAIM)
  // (a) desligado = hoje
  if (P.KLING4_TRIAL_MAX_SECONDS !== 15) p.push(`(a) KLING4_TRIAL_MAX_SECONDS = ${P.KLING4_TRIAL_MAX_SECONDS}, esperado 15 (desligado até o teste pago da CEO)`)
  if (P.kling4TrialTetoDaFala(15) !== S.K4_TETO_MEDIDO_SEGUNDOS || P.kling4TrialTetoDaFala() !== 15.5) p.push(`(a) teto da fala em 15 = ${P.kling4TrialTetoDaFala(15)}, esperado 15,5`)
  for (const v of [4.2, 11, 14.9, 15, 15.5]) if (P.kling4TrialClipSeconds(v, 15) !== 15) p.push(`(a) voz ${v} s em 15 → clipe ${P.kling4TrialClipSeconds(v, 15)}, esperado 15`)
  for (const v of [15.51, 16, 17, 19.9, 25, null, NaN, 0]) if (P.kling4TrialClipSeconds(v, 15) !== null) p.push(`(a) voz ${v} em 15 → clipe ${P.kling4TrialClipSeconds(v, 15)}, esperado null (reserva, como hoje)`)
  for (const v of [null, 3, 12.3, 15.5, 15.51, 17, 22]) {
    const antes = JSON.stringify(S.kling4TrialFalaCabe(v)), agora = JSON.stringify(S.kling4TrialFalaCabe(v, P.kling4TrialTetoDaFala(P.KLING4_TRIAL_MAX_SECONDS)))
    if (antes !== agora) p.push(`(a) decisão da fala ${v} s mudou com a constante: ${antes} → ${agora}`)
  }
  const envio = (extra) => JSON.stringify(K.buildKling4TrialInput(PROMPTS, [], { voiceovers: FALAS, wordsPerSecond: 2.4, ...extra }))
  const hoje = envio({}), hojeVoz = envio({ pelaVoz: { segundosDaVoz: 14.2 } })
  if (envio({ clipSeconds: 15 }) !== hoje || envio({ clipSeconds: undefined }) !== hoje || envio({ clipSeconds: 14 }) !== hoje || envio({ clipSeconds: 31 }) !== hoje) p.push('(a) clipSeconds 15/ausente/inválido mudou o envio de hoje')
  if (envio({ pelaVoz: { segundosDaVoz: 14.2 }, clipSeconds: 15 }) !== hojeVoz) p.push('(a) com a voz medida, clipSeconds 15 mudou o envio de hoje')
  if (JSON.parse(hoje).input.duration !== 15) p.push('(a) o envio de hoje não pede 15 s')
  if (JSON.stringify(K.kling4TrialSceneDurations(FALAS, 2.4)) !== JSON.stringify(K.kling4TrialSceneDurations(FALAS, 2.4, 15))) p.push('(a) kling4TrialSceneDurations mudou em 15')
  // (b) ligado em 20
  const casos = [[17, 17], [17.2, 18], [15.6, 16], [19.9, 20], [20.4, 20], [20.6, null], [23, null]]
  for (const [voz, esperado] of casos) {
    const clip = P.kling4TrialClipSeconds(voz, 20)
    if (clip !== esperado) p.push(`(b) voz ${voz} s com teto 20 → clipe ${clip}, esperado ${esperado}`)
    const fala = S.kling4TrialFalaCabe(voz, P.kling4TrialTetoDaFala(20))
    if (fala.cabe !== (esperado !== null)) p.push(`(b) voz ${voz} s com teto 20: cabe=${fala.cabe}, esperado ${esperado !== null}`)
    if (!esperado) { if (fala.reason !== 'narration_over_kling4_15s') p.push(`(b) voz ${voz} acima do teto com motivo ${fala.reason} (o selo lê narration_over_kling4_15s)`); continue }
    for (const pelaVoz of [null, { segundosDaVoz: voz }]) {
      const e = K.buildKling4TrialInput(PROMPTS, [], { voiceovers: FALAS, wordsPerSecond: 2.4, pelaVoz, clipSeconds: clip }).input
      const seg = e.multi_prompt.map((x) => x.duration)
      if (e.duration !== clip) p.push(`(b) voz ${voz}: duration na fal ${e.duration}, esperado ${clip}`)
      if (seg.reduce((s, x) => s + x, 0) !== clip) p.push(`(b) voz ${voz}${pelaVoz ? ' (pela voz)' : ''}: planos ${seg} não somam ${clip} (fim amputado ou sobra)`)
      if (seg.some((x) => x < 2)) p.push(`(b) voz ${voz}: plano abaixo de 2 s ${seg}`)
      if (e.multi_prompt.length !== 3 || new Set(e.multi_prompt.map((x) => x.prompt)).size !== 3) p.push(`(b) voz ${voz}: planos repetidos ou cena a mais/menos`)
    }
  }
  if (P.kling4TrialClipCostUsd(17) !== 2.669 || P.kling4TrialClipCostUsd(20) !== 3.14 || P.kling4TrialClipCostUsd(15) !== 2.355) p.push('(b) custo previsto fora de US$ 0,157/s')
  // (c) claim
  const claim = (extra, engine = 'kling4') => ({ duration: 15, quality: 'cinematic_ai', aspect: '9:16', kling4_trial: { version: 'kling4_trial_2810', engine_used: engine, ...extra } })
  if (C.kling4TrialClipSecondsFromClaim(claim({})) !== 15) p.push('(c) claim sem clip_duration ≠ 15')
  if (C.kling4TrialClipSecondsFromClaim(claim({ clip_duration: 18 })) !== 18) p.push('(c) claim com clip_duration 18 ≠ 18')
  for (const bad of [18.5, 31, 15, 2, '18']) if (C.kling4TrialClipSecondsFromClaim(claim({ clip_duration: bad })) !== 15) p.push(`(c) clip_duration ${JSON.stringify(bad)} aceito`)
  if (C.kling4TrialClipSecondsFromClaim(claim({ clip_duration: 18 }, 'seedance15_fallback')) !== 15) p.push('(c) reserva leu clip_duration')
  if (C.kling4TrialClipSecondsFromClaim(null) !== 15) p.push('(c) sem claim ≠ 15')
  // (d) montagem
  try {
    const M = load(COMP)
    const base = { clipUrls: ['https://fal.media/k4.mp4'], voiceoverUrl: 'https://x.test/v.mp3', voiceoverScript: FALAS.join(' '), sceneCaptions: [''], duration: 15, quality: 'cinematic_ai', aspect: '9:16', kling4TrialEngine: 'kling4' }
    const fonte = (extra) => JSON.stringify(M.buildCreatomateSource({ ...base, ...extra }))
    for (const audio of [14.6, 15.4]) {
      const h = fonte({ realAudioDuration: audio })
      if (fonte({ realAudioDuration: audio, kling4TrialClipSeconds: 15 }) !== h || fonte({ realAudioDuration: audio, kling4TrialClipSeconds: null }) !== h) p.push(`(d) voz ${audio} s: a montagem com 15/null não é a de hoje`)
    }
    const k4 = (s) => JSON.parse(s).elements.filter((e) => e.type === 'video' && e.track === 2 && e.source === base.clipUrls[0])
    const longo = k4(fonte({ realAudioDuration: 17.3, kling4TrialClipSeconds: 18 }))
    if (longo.length !== 1 || longo[0].trim_start !== 0 || Math.abs(longo[0].duration - 17.3) > 0.05) p.push(`(d) clipe de 18 s com voz de 17,3 s: ${JSON.stringify(longo.map((e) => [e.time, e.duration, e.trim_start]))}, esperado um trecho 0–17,3 s`)
    const curto = k4(fonte({ realAudioDuration: 17.3 }))
    if (curto.length < 2) p.push('(d) referência: sem o campo, voz de 17,3 s devia ter a cauda de hoje (clipe de 15 s)')
  } catch (e) { p.push(`(d) lib/compose.ts não carregou offline: ${e instanceof Error ? e.message.slice(0, 160) : e}`) }
  // (e) rota
  const precisa = (txt, alvo, msg) => { if (!txt.includes(alvo)) p.push(msg) }
  precisa(rota, 'const k4GratisEnsaio = body.k4_gratis_ensaio === true && isDryRunAccount(user.email)', '(e) o ensaio não está preso a isDryRunAccount')
  precisa(rota, 'const k4GratisMaxSeconds = k4GratisEnsaio ? KLING4_TRIAL_MAX_SECONDS_ENSAIO : KLING4_TRIAL_MAX_SECONDS', '(e) o teto da rota não vem da constante')
  precisa(rota, '...(k4GratisMaxSeconds > 15 ? { tetoSegundos: kling4TrialTetoDaFala(k4GratisMaxSeconds) } : {})', '(e) a medição recebe teto também em 15 (ou não recebe acima)')
  precisa(rota, 'const clipK4 = kling4Fala?.cabe ? kling4TrialClipSeconds(kling4Fala.seconds, k4GratisMaxSeconds) : null; if (clipK4 !== null && clipK4 > 15) kling4Timing.clipSeconds = clipK4', '(e) o clipe não nasce da voz medida que cabe')
  precisa(rota, 'if (q && a.timing.clipSeconds) Object.assign(r.timing, { clipSeconds: a.timing.clipSeconds })', '(e) o plano por seção perde o total do clipe')
  precisa(rota, 'clip_seconds: [kling4TrialClipTotal(kling4Timing.clipSeconds)]', '(e) o claim não assina o clipe real')
  precisa(rota, '...(kling4Timing.clipSeconds ? { clip_duration: kling4Timing.clipSeconds,', '(e) o marcador não leva clip_duration')
  precisa(rota, "    else if (KLING4_TRIAL_LIVE && seedanceShortFilm && !isPaidUser && currentProfile.has_paid !== true &&", '(e) a porta de hoje do filme grátis mudou')
  if ((rota.match(/kling4Timing\.clipSeconds = /g) ?? []).length !== 1) p.push('(e) o total do clipe é escrito em mais de um lugar')
  precisa(rotaCompose, 'kling4TrialClipSeconds: kling4TrialClipSecondsFromClaim(cinematicBirthClaim?.response)', '(e) a montagem não lê o clipe do claim')
  return p
}

const R = readFileSync(ROTA, 'utf8'), RC = readFileSync(ROTA_COMPOSE, 'utf8')
let ok = 0, falhas = 0
const atual = problemas(carrega(), R, RC)
if (atual.length) { console.log('FALHA estado atual:\n  ' + atual.join('\n  ')); process.exit(1) }
console.log('ok  estado atual limpo (15 = hoje byte a byte; teto 20: 17 s → 17, 17,2 → 18, 20,6 → reserva; claim; montagem; rota)'); ok++
const MUTANTES = [
  ['M1 constante ligada em 20', (rel, t) => rel === POL ? t.replace('export const KLING4_TRIAL_MAX_SECONDS: number = 15', 'export const KLING4_TRIAL_MAX_SECONDS: number = 20') : t, null],
  ['M2 clipe ignora clipSeconds', (rel, t) => rel === K4 ? t.replace('const total = kling4TrialClipTotal(timing?.clipSeconds)', 'const total = 15') : t, null],
  ['M3 teto ignorado na medição', (rel, t) => rel === SCR ? t.replace('cabe: s <= teto,', 'cabe: s <= K4_TETO_MEDIDO_SEGUNDOS,') : t, null],
  ['M4 ensaio sem isDryRunAccount', null, (r) => r.replace('body.k4_gratis_ensaio === true && isDryRunAccount(user.email)', 'body.k4_gratis_ensaio === true')],
  ['M5 montagem ignora o campo', (rel, t) => rel === COMP ? t.replace('kling4TrialClipSeconds > 15 && kling4TrialClipSeconds <= 30 ? kling4TrialClipSeconds : 15', 'false ? 0 : 15') : t, null],
  ['M6 arredonda para baixo', (rel, t) => rel === POL ? t.replace('Math.ceil(falaSeconds - 1e-9)', 'Math.floor(falaSeconds)') : t, null],
]
for (const [nome, mLib, mRota] of MUTANTES) {
  let achou = !mLib
  const load = carrega(mLib ? (rel, t) => { const n = mLib(rel, t); if (n !== t) achou = true; return n } : null)
  const rota = mRota ? mRota(R) : R
  let m
  try { m = problemas(load, rota, RC) } catch (e) { m = [`lançou: ${e instanceof Error ? e.message : e}`] }
  if (mRota && rota === R) achou = false
  if (!achou) { console.log(`FALHA ${nome}: alvo não encontrado`); falhas++; continue }
  if (!m.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++; continue }
  console.log(`ok  ${nome}: vermelho (${m[0]})`); ok++
}
console.log(`${ok} ok · ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
