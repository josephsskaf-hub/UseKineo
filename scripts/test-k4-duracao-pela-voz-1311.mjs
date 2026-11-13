// KINEO-K4-DURACAO-PELA-VOZ-1311 [CEO 13/11, "nota ≥ 8 no teste grátis — a próxima causa"] — guardião sem rede e sem custo.
// Caso real 9e902872 (cliente, Kling 4 grátis, 15 s, 4 seções): a régua antiga mandou [3,3,4,5] e a imagem ficou uma seção atrás da
// voz (Whisper do filme: a fala troca de seção em 4,0 s e 7,0 s; a régua antiga corta em 3/6/10). Com a voz medida (12 s) as fronteiras
// passam a cair em ±1 s do fim da fala de cada seção (prova paga 13/11: cortes reais 2,08/4,08/7,13 s).
// Desde 13/11 05:11 o interruptor é 'all' (o dono viu o antes e depois com som e escolheu "A"); 'off' reverte para todo mundo.
// Trava: (a) 9e902872 alinha e a régua antiga não; (b) eb108d9a alinha (±1,5 s); (c) soma 15 s e piso 2 s; sem a voz medida o envio é o de
// sempre, byte a byte (é o que 'off' produz: a rota nunca escreve a voz); (d) interruptor 'all' (cliente de fora recebe), 'off' não liga
// ninguém, 'internal' só a casa; (e) voz inválida, seção sem fala ou seções demais voltam à régua antiga, também no envio; (f) a rota só
// liga a voz medida quando a fala CABE e foi medida, pelo interruptor, e o plano por seção não perde o campo.
// Mutantes: build ignora pelaVoz · interruptor 'off' · plano por seção perde pelaVoz · rota ignora "cabe" · voz acima do teto aceita.
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const LIB = 'lib/kling4Trial.ts'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const carrega = (mutar = null) => createOfflineLoader({ source: (rel, t) => (mutar && rel === LIB ? mutar(t) : t) })(LIB)
const cortes = (seg) => seg.slice(0, -1).reduce((acc, s) => [...acc, (acc.at(-1) ?? 0) + s], [])

const FITNESS = ['Want to burn fat fast?', 'They torch calories and build strength.', 'Battle ropes engage your core and boost metabolism.', 'But the ultimate fat blaster is HIIT. Short bursts of intense effort.']
const CUJU = ['Futbolun kökenleri... eski Çin\'e dayanıyor.', 'Çinliler, M.Ö. 2. yüzyılda "cuju" adıyla oynuyordu.', 'Bu oyun, deriden yapılmış bir topla oynanıyordu.', 'Bugün bildiğimiz futbolun kökeni... bu antik oyuna dayanıyor.']
const PROMPTS = ['a', 'b', 'c', 'd']
const PORTAO = "if (kling4Fala?.cabe && typeof kling4Fala.seconds === 'number' && duracaoPelaVozLigada(KLING4_DURACAO_PELA_VOZ, isInternalEmail(user.email))) kling4Timing.pelaVoz = { segundosDaVoz: kling4Fala.seconds }"

function problemas(K, rota) {
  const p = []
  const envio = (falas, pelaVoz) => K.buildKling4TrialInput(PROMPTS.slice(0, falas.length), [], pelaVoz === undefined ? { voiceovers: falas, wordsPerSecond: 2.45 } : { voiceovers: falas, wordsPerSecond: 2.45, pelaVoz })
  const dur = (falas, seg) => envio(falas, seg ? { segundosDaVoz: seg } : null).input.multi_prompt.map((x) => x.duration)
  // (a) 9e902872: fronteiras 2 e 3 (início das seções 3 e 4) a ±1 s de 4,0 e 7,0; a régua antiga erra por 2 s
  const novo = cortes(dur(FITNESS, 12)), velho = cortes(dur(FITNESS, null))
  if (Math.abs(novo[1] - 4.0) > 1 || Math.abs(novo[2] - 7.0) > 1) p.push(`(a) 9e902872 cortes ${novo} longe de 4,0/7,0`)
  if (!(Math.abs(velho[1] - 4.0) > 1)) p.push(`(a) a régua antiga já alinhava? ${velho}`)
  // (b) eb108d9a (voz de 14 s; seções trocam em 3,56 / 7,44 / 10,72)
  const cuju = cortes(dur(CUJU, 14));[3.56, 7.44, 10.72].forEach((t, i) => { if (Math.abs(cuju[i] - t) > 1.5) p.push(`(b) eb108d9a corte ${i + 1} = ${cuju[i]} longe de ${t}`) })
  // (c) soma 15 e piso 2
  for (const seg of [dur(FITNESS, 12), dur(CUJU, 14), dur(['One.', 'Two words.', 'Three little words.'], 4), dur(FITNESS, 15.5), dur(['Only one section here.'], 9)]) {
    if (seg.reduce((s, x) => s + x, 0) !== 15 || seg.some((x) => x < 2)) p.push(`(c) soma/piso: ${seg}`)
  }
  // (c) sem a voz medida ('off', fala que não coube, voz não medida: a rota não escreve o campo) = régua de sempre, byte a byte
  const semCampo = JSON.stringify(envio(FITNESS, undefined))
  if (JSON.stringify(dur(FITNESS, null)) !== JSON.stringify(K.kling4TrialSceneDurations(FITNESS, 2.45))) p.push('(c) sem a voz medida mudou a régua antiga')
  if (JSON.stringify(envio(FITNESS, null)) !== semCampo) p.push('(c) pelaVoz null não é o envio de sempre byte a byte')
  // (d) interruptor
  if (K.KLING4_DURACAO_PELA_VOZ !== 'all') p.push(`(d) interruptor = ${K.KLING4_DURACAO_PELA_VOZ}, esperado 'all' (dono 13/11 05:11, "A")`)
  if (!K.duracaoPelaVozLigada(K.KLING4_DURACAO_PELA_VOZ, false) || !K.duracaoPelaVozLigada(K.KLING4_DURACAO_PELA_VOZ, true)) p.push('(d) com o interruptor de hoje, alguém (casa ou cliente de fora) ficou sem a régua nova')
  if (K.duracaoPelaVozLigada('off', false) || K.duracaoPelaVozLigada('off', true)) p.push("(d) 'off' ainda liga a régua nova")
  if (K.duracaoPelaVozLigada('internal', false) || !K.duracaoPelaVozLigada('internal', true)) p.push("(d) 'internal' deixou de ser só a casa")
  // (e) voz inválida, seção sem fala, seções demais → régua antiga (na função e no envio)
  for (const v of [0, -3, NaN, 15.6, 40]) {
    if (K.kling4TrialSceneDurationsPelaVoz(FITNESS, v) !== null) p.push(`(e) voz ${v} não voltou à régua`)
    if (JSON.stringify(envio(FITNESS, { segundosDaVoz: v })) !== semCampo) p.push(`(e) voz ${v}: o envio não é o de sempre`)
  }
  if (K.kling4TrialSceneDurationsPelaVoz(['Hello there.', '', 'Bye.'], 10) !== null) p.push('(e) seção sem fala não voltou à régua')
  if (K.kling4TrialSceneDurationsPelaVoz(['a b', 'c d', 'e f', 'g h', 'i j', 'k l'], 12) !== null) p.push('(e) 6 seções não voltaram à régua')
  // (f) a rota
  if (!rota.includes(PORTAO)) p.push('(f) a rota não liga a voz medida só quando a fala cabe, foi medida e o interruptor deixa')
  if ((rota.match(/kling4Timing\.pelaVoz = /g) ?? []).length !== 1) p.push('(f) a voz medida é escrita em mais de um lugar')
  if (!rota.includes('timing: { voiceovers: q.falas, wordsPerSecond: a.timing.wordsPerSecond, pelaVoz: a.timing.pelaVoz ?? null }')) p.push('(f) o plano por seção perde pelaVoz')
  return p
}

const ROTA_TXT = readFileSync(ROTA, 'utf8')
let ok = 0, falhas = 0
const atual = problemas(carrega(), ROTA_TXT)
if (atual.length) { console.log('FALHA estado atual:\n  ' + atual.join('\n  ')); process.exit(1) }
console.log("ok  estado atual limpo (9e902872, eb108d9a, soma/piso, régua antiga byte a byte, interruptor 'all', voz inválida, rota)"); ok++
const MUTANTES = [
  ['M1 build ignora pelaVoz', (t) => t.replace('const pelaVoz = timing?.pelaVoz ?', 'const pelaVoz = false ?'), null],
  ["M2 interruptor 'off'", (t) => t.replace("KLING4_DURACAO_PELA_VOZ: 'off' | 'internal' | 'all' = 'all'", "KLING4_DURACAO_PELA_VOZ: 'off' | 'internal' | 'all' = 'off'"), null],
  ['M3 plano por seção perde pelaVoz', null, (r) => r.replace(', pelaVoz: a.timing.pelaVoz ?? null }', ' }')],
  ['M4 rota ignora "cabe"', null, (r) => r.replace("if (kling4Fala?.cabe && typeof kling4Fala.seconds === 'number' && duracaoPelaVozLigada", "if (typeof kling4Fala?.seconds === 'number' && duracaoPelaVozLigada")],
  ['M5 voz acima do teto aceita', (t) => t.replace('segundosDaVoz > 15.5', 'segundosDaVoz > 99'), null],
]
for (const [nome, mLib, mRota] of MUTANTES) {
  let achou = true
  const K = carrega(mLib ? (t) => { const n = mLib(t); achou = n !== t; return n } : null)
  const rota = mRota ? mRota(ROTA_TXT) : ROTA_TXT
  if (mRota && rota === ROTA_TXT) achou = false
  if (!achou) { console.log(`FALHA ${nome}: alvo não encontrado`); falhas++; continue }
  const m = problemas(K, rota)
  if (!m.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++; continue }
  console.log(`ok  ${nome}: vermelho (${m[0]})`); ok++
}
console.log(`${ok} ok · ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
