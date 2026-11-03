// KINEO-FRENTE-A-SEM-LOOP-0311 [TRAVA 8.2 — fundador 03/11: "vamos pegar todos esses defeitos que já são conhecidos e arrumar todos, universalizar"] — guardião.
// Defeito (revisor: "mesmo plano repetido", MAPA-DEFEITOS-0311 item 10; FILA-DEFEITOS item 7 "o compose do hollywood ainda usa
// loop:true quando falta clipe"): a montagem do hollywood põe cada b-roll com loop:true. Quando o clipe da fal é mais curto que a
// janela da cena (a fal arredonda 7,4 s para um clipe de 7 s; o crossfade estende 0,25 s por baixo da cena seguinte), o clipe
// RECOMEÇA e o quadro de abertura pisca de novo antes do corte.
// Prova OFFLINE, EXECUTANDO o código REAL transpilado (lib/compose.ts e lib/mp4Duration.ts; rede trocada por um fetch de mentira):
//   A. clipe de b-roll mais curto que a janela (duração real conhecida): toca UMA vez (loop:false, duração = arquivo) e a sobra é o
//      FIM do próprio clipe (trim_start = real − sobra, mudo, empurrão lento) até fechar a janela; nenhum trecho com loop:true;
//   B. nada muda quando a duração é desconhecida, quando o clipe cobre a janela, e em cena de fala nativa (diálogo/apresentador);
//      a timeline (time/duration das cenas seguintes) é a mesma;
//   C. a sonda lê o mvhd do cabeçalho (moov no começo E no fim do arquivo, via Range), e falha aberta (null) sem rede/formato;
//   D. o /api/compose sonda só os clipes de b-roll e passa mediaSeconds à montagem;
//   M. mutantes ficam VERMELHOS.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const globals = { AbortController, AbortSignal, setTimeout: () => 0, clearTimeout() {} }
const mundo = (mutar = {}) => createOfflineLoader({ mocks: { '@fal-ai/client': { fal: { config() {} } } }, globals, source: (rel, text) => (mutar[rel] ? mutar[rel](text) : text) })

const A = 'https://cdn.example/a.mp4', B = 'https://cdn.example/b.mp4', C = 'https://cdn.example/c.mp4', D = 'https://cdn.example/d.mp4'
const montar = (L, clips) => L('lib/compose.ts').buildHollywoodCreatomateSource({ clips, requestedDuration: 0, narrationBlocks: [] }).elements.filter((e) => e.track === 2)
const sem = (clips) => clips.map(({ mediaSeconds, ...c }) => c)

function provasMontagem(L) {
  const erros = []
  // caso real de forma: cena de apoio planejada em 7,4 s com clipe de 7,0 s, seguida de cena de 5 s com clipe de 5 s (só o crossfade passa)
  const clips = [
    { url: A, engine: 'support', seconds: 7.4, caption: '', mediaSeconds: 7.0 },
    { url: B, engine: 'support', seconds: 5, caption: '', mediaSeconds: 5.0 },
    { url: C, engine: 'cinematic', seconds: 8, caption: '' },
  ]
  const el = montar(L, clips)
  const a = el.filter((e) => e.source === A), b = el.filter((e) => e.source === B)
  if (a.some((e) => e.loop === true) || b.some((e) => e.loop === true)) erros.push('A clipe curto ainda com loop:true')
  if (a[0]?.duration !== 7 || a[0]?.time !== 0) erros.push('A o clipe não toca uma vez inteiro')
  const fimA = Math.max(...a.map((e) => Math.round((e.time + e.duration) * 1000) / 1000))
  if (fimA !== 7.4 + 0.25 || a.slice(1).some((e) => Math.abs(e.trim_start + e.duration - 7) > 0.001 || e.volume !== '0%')) erros.push('A a sobra não é o fim do próprio clipe até fechar a janela: ' + JSON.stringify(a.slice(1)))
  if (b.length !== 2 || Math.abs(b[1].trim_start - 4.75) > 0.001) erros.push('A a sobra do crossfade (0,25 s) não segura o fim do clipe de 5 s')
  // B — sem duração conhecida / clipe que cobre / fala nativa: idêntico
  const base = JSON.stringify(montar(L, sem(clips)))
  if (JSON.stringify(montar(L, clips.map((c) => ({ ...c, mediaSeconds: 20 })))) !== base) erros.push('B clipe que cobre a janela mudou a montagem')
  if (JSON.stringify(montar(L, clips.map((c) => ({ ...c, mediaSeconds: null })))) !== base) erros.push('B duração desconhecida mudou a montagem')
  const fala = [{ url: D, engine: 'dialogue', seconds: 10, caption: '', dialogueLine: 'hello there', speechWords: [{ word: 'hello', start: 0.2, end: 0.6 }, { word: 'there', start: 0.7, end: 1.1 }], mediaSeconds: 4 }, { url: C, engine: 'cinematic', seconds: 8, caption: '' }]
  if (JSON.stringify(montar(L, fala)) !== JSON.stringify(montar(L, sem(fala)))) erros.push('B cena de fala nativa mudou')
  const cenas = (lista) => lista.filter((e) => e.source === C).map((e) => [e.time, e.duration]).join()
  if (cenas(el) !== cenas(montar(L, sem(clips)))) erros.push('B a timeline da cena seguinte mudou')
  return erros
}

// MP4 mínimo: ftyp + mdat (lixo) + moov/mvhd v0 (timescale 1000, duração 7000 → 7 s)
const caixa = (tipo, corpo) => { const b = Buffer.alloc(8 + corpo.length); b.writeUInt32BE(8 + corpo.length, 0); b.write(tipo, 4, 'latin1'); corpo.copy(b, 8); return b }
const mvhd = () => { const c = Buffer.alloc(100); c[0] = 0; c.writeUInt32BE(1000, 12); c.writeUInt32BE(7000, 16); return caixa('mvhd', c) }
const moov = caixa('moov', mvhd())
const ftyp = caixa('ftyp', Buffer.from('isom0000isomiso2', 'latin1'))
const mdat = caixa('mdat', Buffer.alloc(400000, 7))
const NO_COMECO = Buffer.concat([ftyp, moov, mdat]), NO_FIM = Buffer.concat([ftyp, mdat, moov])
const fetchDe = (arquivo, log = []) => async (url, init) => {
  const m = /bytes=(\d+)-(\d+)/.exec(init?.headers?.Range ?? '')
  log.push(init?.headers?.Range)
  const ini = Number(m[1]), fim = Math.min(Number(m[2]), arquivo.length - 1)
  const corpo = arquivo.subarray(ini, fim + 1)
  return new Response(corpo, { status: 206, headers: { 'content-range': `bytes ${ini}-${fim}/${arquivo.length}` } })
}
async function provasSonda(L) {
  const erros = []
  const M = L('lib/mp4Duration.ts')
  if (M.duracaoMvhdNoTrecho(NO_COMECO.subarray(0, 300)) !== 7) erros.push('C mvhd no começo não lido')
  if (M.duracaoMvhdNoTrecho(NO_FIM.subarray(NO_FIM.length - 200)) !== 7) erros.push('C mvhd num trecho do fim não lido')
  if (M.duracaoMvhdNoTrecho(Buffer.alloc(5000, 1)) !== null) erros.push('C lixo deu duração')
  const log = []
  if (await M.sondarDuracaoDoClipe(A, fetchDe(NO_FIM, log)) !== 7 || log.length !== 2) erros.push('C moov no fim: não leu o fim pelo Range ' + JSON.stringify(log))
  if (await M.sondarDuracaoDoClipe(A, fetchDe(NO_COMECO)) !== 7) erros.push('C moov no começo não lido')
  if (await M.sondarDuracaoDoClipe(A, async () => { throw Error('sem rede') }) !== null) erros.push('C sem rede não deu null')
  if (await M.sondarDuracaoDoClipe('http://inseguro/a.mp4', fetchDe(NO_COMECO)) !== null) erros.push('C url não-https aceita')
  const todos = await M.sondarDuracaoDosClipes([A, null, B], fetchDe(NO_COMECO))
  if (JSON.stringify(todos) !== '[7,null,7]') erros.push('C sondarDuracaoDosClipes ' + JSON.stringify(todos))
  return erros
}

console.log('A-B) a montagem real')
const eM = provasMontagem(mundo())
checa('b-roll curto toca uma vez e segura o fim; nada muda sem duração, com clipe que cobre e em fala nativa' + (eM.length ? ' — ' + eM.join(' | ') : ''), eM.length === 0)
console.log('C) a sonda real')
const eS = await provasSonda(mundo())
checa('a sonda lê o mvhd (começo e fim pelo Range) e falha aberta' + (eS.length ? ' — ' + eS.join(' | ') : ''), eS.length === 0)
console.log('D) o /api/compose')
const rota = lf(fs.readFileSync('app/api/compose/route.ts', 'utf8'))
const i0 = rota.indexOf('const originalFootageSeconds = hollywoodClips.map(cinematicSceneSeconds)')
const trecho = rota.slice(i0, i0 + 1800)
checa('o compose sonda só os b-rolls (support/cinematic) depois da verificação de fala e grava mediaSeconds', i0 > 0 && /sondarDuracaoDosClipes\(hollywoodClips\.map\(\(c\) => \(c\.engine === 'support' \|\| c\.engine === 'cinematic' \? c\.url : null\)\)\)/.test(trecho) && /c\.mediaSeconds = d/.test(trecho) && rota.indexOf('buildHollywoodCreatomateSource(') > i0)

console.log('M) mutantes')
const mut = [
  ['montagem sem segurar o fim (volta o laço)', { 'lib/compose.ts': (t) => t.replace('    seguraOFimDoClipeCurto(elements, clip, nativeSpeech(clip)) // KINEO-FRENTE-A-SEM-LOOP-0311\n', '') }, () => provasMontagem],
  ['sobra a partir do quadro zero', { 'lib/compose.ts': (t) => t.replace('      trim_start: round3(real - len),', '      trim_start: 0,') }, () => provasMontagem],
  ['sonda que não procura no fim do arquivo', { 'lib/mp4Duration.ts': (t) => t.replace('    if (!inicio.total || inicio.total <= SONDA_BYTES) return null', '    return null') }, () => provasSonda],
]
for (const [nome, mutar, prova] of mut) {
  const mudou = Object.entries(mutar).every(([rel, f]) => f(lf(fs.readFileSync(rel, 'utf8'))) !== lf(fs.readFileSync(rel, 'utf8')))
  const e = await prova()(mundo(mutar))
  checa(`mutante "${nome}" fica VERMELHO`, mudou && e.length > 0)
}

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { console.log('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
