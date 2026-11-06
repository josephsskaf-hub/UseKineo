// KINEO-FIM-NAO-VOLTA-0611 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião do conserto
// "FILME — FINAL_REPETE_ABERTURA" (revisor 05/11, Roland refação 2, generationId 54bc40c3, Seedance 1.5, 90 s pedidos, 11 clipes
// de 10 s, fala de 104,928 s → filme de 105 s): os últimos 3,6 s do filme mostraram a cena de ABERTURA de novo.
//
// O que este guardião executa (sem rede, sem custo, sem render): o buildCreatomateSource REAL de lib/compose.ts, duas vezes —
// o de hoje e o de ANTES desta entrega (o arquivo de hoje com o recibo exato desfeito, test-support/desfaz-fim-nao-volta-0611).
//   (1) CASO REAL: a base reproduz, número a número, a pista de vídeo que a produção mandou ao Creatomate (evento
//       film_source_b_saved de 05/11 23:02 UTC): 12 trechos para 11 clipes, o 12º = clipe 0 em 101,365 s por 3,635 s. Hoje: 11
//       trechos, um por clipe, em ordem, nenhum acima do teto de 10 s, soma = 105 s.
//   (2) O MESMO CASO com o TEXTO REAL da narração espalhado nos 104,928 s (o Whisper daquele render não ficou guardado — limite
//       declarado): a base também volta ao clipe 0; hoje não.
//   (3) CONTROLES byte a byte, base × hoje, em 15/35/60/90 s e durações medidas, 3 a 12 clipes, CLIP_LEN 6/8/9/10, com e sem
//       palavras do Whisper: todo plano que na base NÃO voltava ao clipe 0 sai idêntico (o JSON inteiro); fast stock (Kineo 1)
//       sai idêntico sempre; quando a imagem não cobre a fala (clipes × teto < duração) sai idêntico; quando a base voltava e os
//       clipes cobrem, hoje sai um trecho por clipe, sem vão, sem sobreposição nova, ninguém acima do teto, soma = duração.
//       Nenhuma propriedade nova do Creatomate.
//   (4) MUTANTES: oito estragos no conserto, cada um tem de ser pego por esta mesma bateria.
// Rodar: node scripts/test-fim-nao-volta-0611.mjs
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { semFimNaoVolta0611 } from './test-support/desfaz-fim-nao-volta-0611.mjs'

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const nativeRequire = createRequire(import.meta.url)
const proibido = () => { throw Error('rede, banco e fornecedor são proibidos neste guardião') }
const r3 = (v) => Math.round(v * 1000) / 1000

// ── carregador: lib/compose.ts de verdade (e o que ele importa), transpilado e isolado. `texto` troca só o compose.ts. ──
const dependencias = new Map()
function carregar(texto) {
  const locais = new Map()
  const load = (file) => {
    const ehCompose = path.resolve(file) === path.resolve(RAIZ, 'lib/compose.ts')
    const cache = ehCompose ? locais : dependencias
    if (cache.has(file)) return cache.get(file)
    const box = { exports: {} }; cache.set(file, box.exports)
    const fonte = ehCompose ? texto : fs.readFileSync(file, 'utf8')
    const code = ts.transpileModule(fonte, { compilerOptions: { module: 1, target: 9, esModuleInterop: true } }).outputText
    vm.runInNewContext(code, {
      exports: box.exports, module: box, Buffer, URL, URLSearchParams, TextEncoder, Intl,
      process: { env: {} }, console: { log() {}, warn() {}, error() {} }, fetch: proibido, setTimeout: proibido, clearTimeout() {},
      require(id) {
        if (id === 'node:crypto' || id === 'crypto') return nativeRequire(id)
        if (id === 'openai') return { __esModule: true, default: class { constructor() { proibido() } }, toFile: proibido }
        if (id === '@supabase/supabase-js') return { createClient: proibido }
        if (id === 'server-only') return {}
        const base = id.startsWith('@/') ? path.join(RAIZ, id.slice(2)) : id.startsWith('.') ? path.join(path.dirname(file), id) : null
        if (!base) throw Error('import inesperado ' + id)
        for (const ext of ['.ts', '.tsx']) if (fs.existsSync(base + ext)) return load(base + ext)
        throw Error('dependência ausente ' + base)
      },
    }, { timeout: 20000 })
    return box.exports
  }
  return load(path.join(RAIZ, 'lib/compose.ts'))
}

const FONTE_HOJE = fs.readFileSync(path.join(RAIZ, 'lib/compose.ts'), 'utf8').replace(/\r\n/g, '\n')
const FONTE_BASE = semFimNaoVolta0611(FONTE_HOJE, 'lib/compose.ts').replace(/\r\n/g, '\n')

// ── a pista de vídeo (track 2) de um source ──
const pista = (source) => source.elements.filter((e) => e.track === 2 && (e.type === 'video' || e.type === 'image'))
const urls = (n) => Array.from({ length: n }, (_, i) => `https://fixture.invalid/clipe-${i + 1}.mp4`)
const indiceDoClipe = (e) => Number(String(e.source).match(/clipe-(\d+)\.mp4$/)[1]) - 1
function montar(mod, { n, quality, duration, audio, words, aspect }) {
  return mod.buildCreatomateSource({
    clipUrls: urls(n), voiceoverUrl: 'https://fixture.invalid/voz.mp3', voiceoverScript: 'Narration.', sceneCaptions: [],
    duration, quality, realAudioDuration: audio, whisperWords: words, musicUrl: null, aspect: aspect ?? '9:16',
  })
}
// palavras do Whisper cujos inícios de frase são exatamente `inicios`
const palavrasComInicios = (inicios, fim) => {
  const w = [{ word: 'Opening', start: 0.05, end: 0.4 }]
  for (const t of inicios) { w.push({ word: 'ends.', start: r3(t - 0.6), end: r3(t - 0.15), sentenceEnd: true }); w.push({ word: 'Next', start: t, end: r3(t + 0.3) }) }
  w.push({ word: 'closing.', start: r3(fim - 0.6), end: r3(fim - 0.1), sentenceEnd: true })
  return w
}
// o texto REAL espalhado no tempo real da fala (cada palavra ocupa o tempo proporcional às suas letras + 1)
const palavrasDoTexto = (texto, segundos) => {
  const ws = texto.trim().split(/\s+/)
  const peso = ws.map((x) => x.length + 1), soma = peso.reduce((a, b) => a + b, 0)
  let t = 0
  return ws.map((word, i) => { const d = (peso[i] / soma) * segundos; const o = { word, start: r3(t), end: r3(t + d * 0.9) }; t += d; return o })
}

// ── CASO REAL (lido do Supabase em 06/11, só leitura): cinematic_submission_claim 05/11 22:56:47 UTC, generationId 54bc40c3 ──
const ROLAND_FALA_S = 104.928 // duração do áudio da narração no source enviado ao Creatomate (track 4)
const ROLAND_TEXTO = 'Roland Oznard vs. his smart fridge — the ultimate showdown ignites today! Meet Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair. He\'s convinced technology is plotting against him. His nemesis? A new smart fridge that dared to suggest he buy more kale. Roland\'s distrust only grew when the fridge started tracking his grocery habits, making him feel like a prisoner in his own kitchen. Roland\'s first strike? Attempting to unplug this so-called "Kale Kommander." But the fridge had a secret weapon: a backup battery. Undeterred, Roland launched a campaign to find the ultimate off-switch, armed with a flashlight and determination. He even called in an old buddy to help decipher the fridge\'s manual, which he compared to ancient hieroglyphics. With notebooks filled with conspiracy theories, Roland plotted the fridge\'s "nefarious plans." He became convinced it was communicating with his neighbor\'s smart vacuum, orchestrating a takeover of his peaceful home. This revelation pushed Roland to new levels of absurdity, including wearing aluminum foil hats to block their signals. Determined to win, Roland planned a daring midnight raid to disable the fridge\'s Wi-Fi and finally end its reign of terror. This operation, he believed, would free him from the tyranny of unwanted kale suggestions. Silent. Stealthy. Strategic. But Roland\'s true victory? Uncovering the fridge\'s "evil" plan... was merely an auto-update. The fridge never stood a chance against Roland\'s relentless spirit and creativity. Follow for more tech battles!'
// a pista de vídeo que a PRODUÇÃO mandou ao Creatomate (evento film_source_b_saved, 05/11 23:02:23 UTC): [time, duration, trim_start, clipe]
const ROLAND_PRODUCAO = [
  [0, 9.605, 0.1, 0], [9.545, 9.605, 0.1, 1], [19.09, 8.33, 0.1, 2], [27.36, 9.605, 0.1, 3], [36.905, 8.675, 0.1, 4], [45.52, 9.605, 0.1, 5],
  [55.065, 9.605, 0.1, 6], [64.61, 9.605, 0.1, 7], [74.155, 8.485, 0.1, 8], [82.58, 9.3, 0.1, 9], [91.82, 9.605, 0.1, 10], [101.365, 3.695, 4.335, 0],
]
// os 4 cortes encaixados em início de frase naquele render (os únicos inícios de frase que a produção deixou registrados)
const ROLAND_INICIOS = [27.36, 45.52, 82.58, 91.82]
const ROLAND = { n: 11, quality: 'cinematic_ai', duration: 90, audio: ROLAND_FALA_S, aspect: '16:9' }

// ── grade de controles ──
function* grade() {
  const qualidades = [['cinematic_ai', 10], ['cinematic_kling', 10], ['cinematic_veo', 8], [undefined, null], ['fast', null]] // null: 6 (≤ 50 s) ou 9
  const filmes = [[15, 14.2], [15, 17.7], [35, 33.1], [35, 37.4], [35, 43.3], [60, 52.3], [60, 58.9], [60, 66.8], [90, 78.8], [90, 88.4], [90, 97.2], [90, 104.9], [90, 112.6]]
  for (const [quality] of qualidades) for (const [duration, audio] of filmes) for (let n = 3; n <= 12; n++) {
    const total = Math.max(duration >= 60 ? 61.5 : 5, Math.min(120, Math.ceil(audio * 10) / 10))
    // sem Whisper; frases a cada ~4,3 s; frases raras; frases em rajada no começo (cortes curtos cedo); frases só no fim
    const padroes = [
      null,
      Array.from({ length: Math.floor(total / 4.3) }, (_, k) => r3(2.1 + k * 4.3)).filter((t) => t < total - 0.5),
      Array.from({ length: Math.floor(total / 11.7) }, (_, k) => r3(7.9 + k * 11.7)).filter((t) => t < total - 0.5),
      Array.from({ length: Math.floor(total / 2.9) }, (_, k) => r3(1.3 + k * 2.9)).filter((t) => t < total * 0.6),
      Array.from({ length: Math.floor(total / 3.7) }, (_, k) => r3(total * 0.5 + k * 3.7)).filter((t) => t < total - 0.5),
    ]
    for (let p = 0; p < padroes.length; p++) yield { n, quality, duration, audio, total, padrao: p, words: padroes[p] ? palavrasComInicios(padroes[p], total) : undefined }
  }
}

// ── a bateria: devolve os nomes das checagens que falharam para um par (base, candidato) ──
function bateria(base, hoje) {
  const falhas = []
  let feitas = 0
  const checa = (nome, cond) => { feitas++; if (!cond) falhas.push(nome) }
  const resumo = (els) => els.map((e) => [e.time, e.duration, e.trim_start ?? null, indiceDoClipe(e)])
  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)

  // (1) caso real, com os inícios de frase que a produção registrou
  const w1 = palavrasComInicios(ROLAND_INICIOS, ROLAND_FALA_S)
  const base1 = montar(base, { ...ROLAND, words: w1 }), hoje1 = montar(hoje, { ...ROLAND, words: w1 })
  checa('1.0 o filme do caso real tem 105 s nas duas montagens', base1.duration === 105 && hoje1.duration === 105)
  checa('1.1 BASE reproduz a pista de vídeo que a produção mandou ao Creatomate (12 trechos, número a número)', igual(resumo(pista(base1)), ROLAND_PRODUCAO))
  checa('1.2 BASE: o 12º trecho é o clipe 0 (a abertura), em 101,365 s, por 3,635 s', (() => { const p = pista(base1); const u = p[p.length - 1]; return p.length === 12 && indiceDoClipe(u) === 0 && u.time === 101.365 && r3(u.duration - 0.06) === 3.635 })())
  const p1 = pista(hoje1)
  checa('1.3 HOJE: 11 trechos, um por clipe, na ordem (o fim não volta ao clipe 0)', p1.length === 11 && p1.every((e, k) => indiceDoClipe(e) === k))
  checa('1.4 HOJE: o último trecho é o clipe 11 e fecha em 105 s', p1.length > 0 && indiceDoClipe(p1[p1.length - 1]) === 10 && r3(p1[p1.length - 1].time + p1[p1.length - 1].duration - 0.06) === 105)
  checa('1.5 HOJE: nenhum trecho acima do teto de 10 s; todo clipe entra do seu começo (trim 0,1)', p1.every((e) => r3(e.duration - 0.06) <= 10 && e.trim_start === 0.1))
  checa('1.6 HOJE: os cortes que cabiam ficam onde a produção pôs (27,36 s e 45,52 s); a partir do 7º clipe o corte sobe ao mínimo necessário',
    igual(p1.map((e) => e.time), [0, 9.545, 19.09, 27.36, 36.905, 45.52, 55.065, 65, 75, 85, 95]))
  checa('1.7 HOJE: fora da pista de vídeo, o source é o mesmo da base', igual(base1.elements.filter((e) => e.track !== 2), hoje1.elements.filter((e) => e.track !== 2)) && igual({ ...base1, elements: 0 }, { ...hoje1, elements: 0 }))

  // (2) o mesmo caso com o texto real espalhado no tempo real
  const w2 = palavrasDoTexto(ROLAND_TEXTO, ROLAND_FALA_S)
  const base2 = pista(montar(base, { ...ROLAND, words: w2 })), hoje2 = pista(montar(hoje, { ...ROLAND, words: w2 }))
  checa('2.1 texto real: BASE precisa de mais trechos do que clipes e o trecho final é o clipe 0', base2.length > 11 && indiceDoClipe(base2[base2.length - 1]) === 0)
  checa('2.2 texto real: HOJE são 11 trechos, um por clipe, na ordem, até 105 s, nenhum acima de 10 s',
    hoje2.length === 11 && hoje2.every((e, k) => indiceDoClipe(e) === k && r3(e.duration - 0.06) <= 10) && r3(hoje2[10].time + hoje2[10].duration - 0.06) === 105)

  // (3) controles
  const classes = { identicoNaoVoltava: 0, fast: 0, naoCobre: 0, consertado: 0, soToco: 0 }
  const chavesBase = new Set(), chavesHoje = new Set()
  let pior = null
  for (const c of grade()) {
    const sb = montar(base, c), sh = montar(hoje, c)
    for (const e of sb.elements) for (const k of Object.keys(e)) chavesBase.add(`${e.type}.${k}`)
    for (const e of sh.elements) for (const k of Object.keys(e)) chavesHoje.add(`${e.type}.${k}`)
    const pb = pista(sb), ph = pista(sh)
    const nome = `${c.quality ?? 'legado'} ${c.duration}s fala ${c.audio}s ${c.n} clipes padrão ${c.padrao}`
    const fast = c.quality === 'fast'
    const clipLen = fast || c.quality === undefined ? (sb.duration > 50 ? 9 : 6) : c.quality === 'cinematic_veo' ? 8 : 10
    const slot = Math.min(clipLen, sb.duration / c.n)
    const teto = Math.round(Math.min(clipLen, slot + 2.5) * 1000) / 1000
    const cobre = !fast && Math.round(teto * 1000) * c.n >= Math.round(sb.duration * 1000)
    const voltava = pb.length > c.n
    if (sb.duration !== c.total) { checa(`3.0 duração inesperada em ${nome}`, false); continue }
    if (fast) { classes.fast++; if (!igual(sb, sh)) { checa(`3.b fast stock byte a byte: ${nome}`, false); pior ??= nome } continue }
    if (!voltava) { classes.identicoNaoVoltava++; if (!igual(sb, sh)) { checa(`3.a plano que não voltava ao clipe 0 sai byte a byte: ${nome}`, false); pior ??= nome } continue }
    if (!cobre) { classes.naoCobre++; if (!igual(sb, sh)) { checa(`3.n imagem não cobre a fala: nada muda: ${nome}`, false); pior ??= nome } continue }
    // a base voltava ao clipe 0 e os clipes cobrem a fala: hoje um trecho por clipe
    classes.consertado++
    if (c.words === undefined) classes.soToco++
    const lens = ph.map((e) => r3(e.duration - 0.06))
    const ok = ph.length === c.n && ph.every((e, k) => indiceDoClipe(e) === k && e.trim_start === 0.1) // um por clipe, na ordem, do começo do clipe
      && lens.every((l) => l > 0.4 && l <= teto + 1e-9) // (c) ninguém acima do teto
      && ph.every((e, k) => e.time === (k === 0 ? 0 : r3(ph[k - 1].time + lens[k - 1]))) // (d) sem vão e sem sobreposição além da de 0,06 s
      && r3(ph[ph.length - 1].time + lens[lens.length - 1]) === sb.duration // (d) soma = duração
      && igual(sb.elements.filter((e) => e.track !== 2), sh.elements.filter((e) => e.track !== 2)) // o resto do source não muda
      && ph.every((e, k) => igual({ ...e, time: 0, duration: 0 }, { ...pb[k], time: 0, duration: 0 })) // (e) só tempo e duração mudam nos trechos
    if (!ok) { checa(`3.c a base voltava ao clipe 0 e os clipes cobrem: um trecho por clipe, dentro do teto, soma = duração: ${nome}`, false); pior ??= nome }
    // sem palavras do Whisper a única diferença é o toco de arredondamento: os n−1 primeiros trechos são os da base
    if (c.words === undefined && !(igual(resumo(ph).slice(0, c.n - 1), resumo(pb).slice(0, c.n - 1)) && pb.length === c.n + 1 && r3(pb[c.n].duration - 0.06) <= 0.006)) checa(`3.t sem Whisper só o toco de arredondamento some: ${nome}`, false)
  }
  checa('3.a/3.b/3.n/3.c controles sem divergência' + (pior ? ` (1ª: ${pior})` : ''), pior === null)
  checa(`3.x a grade exercita todas as classes (${JSON.stringify(classes)})`, classes.identicoNaoVoltava >= 200 && classes.fast >= 200 && classes.naoCobre >= 50 && classes.consertado >= 50 && classes.soToco >= 5)
  checa('3.e nenhuma propriedade nova do Creatomate', [...chavesHoje].every((k) => chavesBase.has(k)))

  // (3p) a função pura que o ramo chama (existe só depois do conserto): invariantes diretos
  if (typeof hoje.planClassicClipCuts === 'function') {
    const cortes = (o) => hoje.planClassicClipCuts(o)
    const semFrase = cortes({ totalDuration: 105, clipCount: 11, slotLen: 105 / 11, minCut: 105 / 11 - 1.8, maxCut: 10, beatTimes: [], guardaDoFim: true })
    checa('3p.1 105 s / 11 clipes sem frase: 10 cortes de 9,545 e o último leva 9,55 (sem toco de 0,005 s no clipe 0)', igual(semFrase, [...Array(10).fill(9.545), 9.55]))
    const semGuarda = cortes({ totalDuration: 105, clipCount: 11, slotLen: 105 / 11, minCut: 105 / 11 - 1.8, maxCut: 10, beatTimes: [], guardaDoFim: false })
    checa('3p.2 sem a guarda (fast stock) a conta é a de antes: 11 cortes de 9,545 e o toco de 0,005', igual(semGuarda, [...Array(11).fill(9.545), 0.005]))
    const naoCobre = cortes({ totalDuration: 105, clipCount: 9, slotLen: 10, minCut: 8.2, maxCut: 10, beatTimes: [8.6, 27.4], guardaDoFim: true })
    const naoCobreAntes = cortes({ totalDuration: 105, clipCount: 9, slotLen: 10, minCut: 8.2, maxCut: 10, beatTimes: [8.6, 27.4], guardaDoFim: false })
    checa('3p.3 9 clipes de 10 s para 105 s (a imagem não cobre): a guarda não age', igual(naoCobre, naoCobreAntes) && naoCobre.length > 9)
    const justo = cortes({ totalDuration: 100, clipCount: 10, slotLen: 10, minCut: 8.2, maxCut: 10, beatTimes: [8.6, 18.3, 27.4, 55.5], guardaDoFim: true })
    checa('3p.4 folga zero (10 clipes de 10 s para 100 s): nenhum corte encurta, 10 cortes de 10 s', igual(justo, Array(10).fill(10)))
    const frases = [8.3, 17.2, 26.0, 33.9, 44.4, 52.2, 61.7, 70.1, 79.9, 88.8, 97.3]
    const comFrase = cortes({ totalDuration: 105, clipCount: 11, slotLen: 105 / 11, minCut: 105 / 11 - 1.8, maxCut: 10, beatTimes: frases, guardaDoFim: true })
    let cur = 0
    const fins = comFrase.map((l) => (cur = r3(cur + l)))
    checa('3p.5 com frases: 11 cortes ≤ 10 s que somam 105 s; onde a frase respeita a guarda o corte é na frase', comFrase.length === 11 && comFrase.every((l) => l <= 10) && fins[10] === 105 && fins[0] === 8.3 && fins[1] === 17.2)
  }
  return { falhas, feitas, classes }
}

// ── execução ──
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m) } else { fail++; console.log('  FALHA ' + m) } }

const modHoje = carregar(FONTE_HOJE), modBase = carregar(FONTE_BASE)
console.log('== âncoras ==')
ok(FONTE_BASE !== FONTE_HOJE && !FONTE_BASE.includes('KINEO-FIM-NAO-VOLTA-0611') && !FONTE_BASE.includes('planClassicClipCuts'), 'o recibo desfaz a entrega inteira: a base não tem a função nem a marca')
ok(FONTE_HOJE.includes('const cortes = planClassicClipCuts({ totalDuration, clipCount: cleanClips.length, slotLen, minCut, maxCut, beatTimes, guardaDoFim: !isFastStock })'), 'o ramo clássico chama a função pura com a guarda desligada só no fast stock')
ok((FONTE_HOJE.match(/planClassicClipCuts\(/g) ?? []).length === 2, 'a função tem uma definição e uma chamada (o ramo real usa o código que este guardião executa)')
ok(typeof modHoje.planClassicClipCuts === 'function' && typeof modBase.planClassicClipCuts === 'undefined', 'a função pura é exportada hoje e não existia na base')

console.log('== bateria: base × hoje ==')
const r = bateria(modBase, modHoje)
for (const f of r.falhas) console.log('  FALHA ' + f)
ok(r.falhas.length === 0, `caso real, texto real, controles e invariantes: ${r.feitas} checagens, ${r.falhas.length} falha(s); classes ${JSON.stringify(r.classes)}`)

console.log('== herança: a base, no lugar do conserto, falha no caso real ==')
const rb = bateria(modBase, modBase)
ok(rb.falhas.some((f) => f.startsWith('1.3')) && rb.falhas.some((f) => f.startsWith('2.2')) && rb.falhas.some((f) => f.startsWith('3.c')), `a base reprova 1.3, 2.2 e 3.c (${rb.falhas.length} falha(s))`)
ok(!rb.falhas.some((f) => f.startsWith('1.1') || f.startsWith('1.2') || f.startsWith('2.1')), 'e reproduz o defeito: 1.1, 1.2 e 2.1 passam na base')

console.log('== mutantes: cada estrago no conserto tem de ser pego ==')
const troca = (de, para) => { if (FONTE_HOJE.split(de).length !== 2) throw Error('âncora de mutante ausente ou repetida: ' + de); return FONTE_HOJE.replace(de, () => para) }
const MUTANTES = [
  ['M1 guarda desligada', 'if (cobre && i < clipCount) {', 'if (false) {', ['1.3', '2.2', '3.c']],
  ['M2 a guarda vale também no fast stock (Kineo 1)', 'guardaDoFim: !isFastStock })', 'guardaDoFim: true })', ['3.b']],
  ['M3 o último clipe não leva o resto', 'if (cobre && i < clipCount) {', 'if (cobre && i < clipCount - 1) {', ['3p.1', '3.c']],
  ['M4 o orçamento usa o slot em vez do teto (mexe em plano que não voltava)', '(clipCount - 1 - i) * tetoMs) / 1000', '(clipCount - 1 - i) * Math.round(slotLen * 1000)) / 1000', ['3.a']],
  ['M5 a guarda age mesmo quando a imagem não cobre a fala', 'const cobre = input.guardaDoFim && clipCount > 0 && clipCount * tetoMs >= Math.ceil(totalDuration * 1000 - 1e-6)', 'const cobre = input.guardaDoFim && clipCount > 0', ['3.n', '3p.3']],
  ['M6 sem frase que sirva o corte vai direto ao teto', 'segLen = Math.max(precisa, r3(Math.min(slotLen, remaining)))', 'segLen = tetoMs / 1000', ['1.6']],
  ['M7 a guarda aceita frase que não respeita o orçamento', 'const best = fraseMaisPerto(precisa)', 'const best = fraseMaisPerto(0)', ['1.3', '2.2', '3.c']],
  ['M8 o ramo não passa as frases à função', 'slotLen, minCut, maxCut, beatTimes, guardaDoFim', 'slotLen, minCut, maxCut, beatTimes: [], guardaDoFim', ['1.6', '3.a']],
]
for (const [nome, de, para, esperadas] of MUTANTES) {
  const rm = bateria(modBase, carregar(troca(de, para)))
  const pegas = esperadas.filter((p) => rm.falhas.some((f) => f.startsWith(p)))
  ok(pegas.length > 0, `${nome}: pego por ${rm.falhas.length} checagem(ns) (${rm.falhas.map((f) => f.split(' ')[0]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 6).join(', ')})`)
}

console.log(`\n${pass} ok, ${fail} falha(s); rede 0, render 0, banco 0`)
if (fail) process.exit(1)
