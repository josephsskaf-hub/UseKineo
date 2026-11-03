// KINEO-NUMEROS-FALADOS-0311 [TRAVA 8.2 — fundador 03/11: "vamos pegar todos esses defeitos que já são conhecidos e arrumar todos, universalizar"] — guardião.
// Pesquisa A1 (MAPA-DEFEITOS-0311 item 5): a TTS erra algarismo/ano/símbolo; a prática é a forma FALADA por extenso só para a voz,
// com a legenda no texto de exibição (mapeamento 1:1).
// Prova OFFLINE, EXECUTANDO o código REAL transpilado (OpenAI e fal trocadas por gravadores, nenhuma chamada sai):
//   A. falarNumerosParaTts: o caso Petrov ("In 1983") e os outros casos reais (2,600 tracks; 40%; $5 million; R$ 50; 1º/2ª; "em 1983")
//      viram forma falada; o que é arriscado fica intocado (Boeing 747, COVID-19, 4K, 1939-1945, $4.99, 3.5%, "1500 pessoas", fr);
//      sem número, o MESMO texto;
//   B. generateTTS e synthesizeHostSpeech mandam à voz (tts-1-hd, MiniMax) a forma falada; sem número, o pedido é byte a byte o de
//      antes; sem língua declarada no hollywood, o texto vai como sempre foi;
//   C. restaurarNumerosNaLegenda: o Whisper que escreveu por extenso volta à grafia do roteiro com o tempo medido; o Whisper que já
//      escreveu algarismo fica igual; a conferência de fala (verifyObservedSpeech) aceita o resultado;
//   D. o /api/compose restaura a legenda nas duas estradas (clássica depois da evidência de legenda; hollywood nos blocos de narração
//      e nas falas nativas), e a chave do cache de voz continua sendo o texto de exibição (a fala medida do Kling 4 = a da montagem);
//   M. mutantes ficam VERMELHOS.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const globals = { AbortController, setTimeout: () => 0, clearTimeout() {} }
const gravado = { openai: [], minimax: [] }
const openai = { audio: { speech: { create: async (input) => { gravado.openai.push(input); return { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer } } } } }
const mocks = {
  '@/lib/openai': { openai, OPENAI_TTS_TIMEOUT_MS: 1 },
  '@/lib/ttsFallback': { synthesizeTtsFallback: async (texto, ctx) => { gravado.minimax.push({ texto, ctx }); return Buffer.from([1]) } },
  '@fal-ai/client': { fal: { config() {} } },
}
const mundo = (mutar = {}) => createOfflineLoader({ mocks, globals, source: (rel, text) => (mutar[rel] ? mutar[rel](text) : text) })

const PETROV = 'In 1983, Stanislav Petrov saw five missiles on his screen.'
function provasTexto(L) {
  const erros = []
  const N = L('lib/falaNumeros.ts')
  const f = (t, l) => N.falarNumerosParaTts(t, l).texto
  const esperados = [
    [PETROV, 'en', 'In nineteen eighty-three, Stanislav Petrov saw five missiles on his screen.'],
    ['Over 2,600 tracks and 40% of fans paid $5 million in the 1980s.', 'en', 'Over two thousand six hundred tracks and forty percent of fans paid five million dollars in the nineteen eighties.'],
    ['He finished 21st, then 2nd; it cost $1 and $2.5 billion in 2005.', 'en', 'He finished twenty-first, then second; it cost one dollar and two point five billion dollars in two thousand five.'],
    ['Em 1983, 40% pagaram R$ 50 e R$ 2 milhões. Ele foi o 1º e ela a 2ª, desde 2024.', 'pt', 'Em mil novecentos e oitenta e três, quarenta por cento pagaram cinquenta reais e dois milhões de reais. Ele foi o primeiro e ela a segunda, desde dois mil e vinte e quatro.'],
    ['En 1492, el 21% pagó $21.', 'es', 'En mil cuatrocientos noventa y dos, el veintiuno por ciento pagó veintiún dólares.'],
  ]
  for (const [t, l, e] of esperados) if (f(t, l) !== e) erros.push(`A ${l} "${t}" → "${f(t, l)}"`)
  const intocados = [
    ['A Boeing 747, COVID-19, 4K video, 1939-1945, 1939 - 1945, $4.99, 3.5% and 9:16.', 'en'],
    ['Foram 1500 pessoas e 2.600 faixas, R$ 1.500 e 3,5%.', 'pt'],
    ['En 1983, 40%.', 'fr'],
  ]
  for (const [t, l] of intocados) if (f(t, l) !== t) erros.push(`A arriscado mexido (${l}): "${f(t, l)}"`)
  const semNumero = 'Nothing to say here.'
  const r = N.falarNumerosParaTts(semNumero, 'en')
  if (r.texto !== semNumero || r.trocas.length !== 0) erros.push('A sem número mudou o texto')
  return erros
}

async function provasVoz(L) {
  const erros = []
  const C = L('lib/compose.ts')
  gravado.openai.length = 0; gravado.minimax.length = 0
  await C.generateTTS(PETROV, 1.0, undefined, 'free', 'en')
  if (gravado.openai[0]?.input !== 'In nineteen eighty-three, Stanislav Petrov saw five missiles on his screen.') erros.push('B generateTTS (tts-1-hd) não mandou a forma falada: ' + gravado.openai[0]?.input)
  await C.generateTTS('No numbers in this one.', 1.0, undefined, 'free', 'en')
  if (gravado.openai[1]?.input !== 'No numbers in this one.') erros.push('B generateTTS sem número mudou o pedido')
  await C.generateTTS('Em 1983, o mundo quase acabou.', 1.0, undefined, 'free', 'pt')
  if (gravado.minimax[0]?.texto !== 'Em mil novecentos e oitenta e três, o mundo quase acabou.') erros.push('B generateTTS (MiniMax pt) não mandou a forma falada: ' + gravado.minimax[0]?.texto)
  const H = L('lib/hollywood/hostVoice.ts')
  gravado.openai.length = 0; gravado.minimax.length = 0
  await H.synthesizeHostSpeech({ text: PETROV, voice: 'onyx', speed: 1, language: 'en' })
  await H.synthesizeHostSpeech({ text: PETROV, voice: 'onyx', speed: 1 })
  await H.synthesizeHostSpeech({ text: 'Em 1983, 40% sumiram.', voice: 'nova', speed: 1, language: 'pt' })
  if (gravado.openai[0]?.input !== 'In nineteen eighty-three, Stanislav Petrov saw five missiles on his screen.') erros.push('B synthesizeHostSpeech en não mandou a forma falada')
  if (gravado.openai[1]?.input !== PETROV) erros.push('B synthesizeHostSpeech sem língua mudou o texto')
  if (gravado.minimax[0]?.texto !== 'Em mil novecentos e oitenta e três, quarenta por cento sumiram.') erros.push('B synthesizeHostSpeech pt (MiniMax) sem a forma falada: ' + gravado.minimax[0]?.texto)
  return erros
}

const w = (s, t0 = 0) => s.split(' ').map((x, i) => ({ word: x, start: t0 + i * 0.4, end: t0 + i * 0.4 + 0.35 }))
function provasLegenda(L) {
  const erros = []
  const N = L('lib/falaNumeros.ts'), S = L('lib/cinematic/speechContract.ts')
  const texto = 'In 1983, Petrov saved 40% of 2,600 people.'
  const ouvido = w('In nineteen eighty-three, Petrov saved forty percent of two thousand six hundred people.')
  const r = N.restaurarNumerosNaLegenda(ouvido, texto, 'en')
  if (r.map((x) => x.word).join(' ') !== texto) erros.push('C a legenda não voltou à grafia: ' + r.map((x) => x.word).join(' '))
  const ano = r.find((x) => x.word === '1983,')
  if (!ano || ano.start !== ouvido[1].start || ano.end !== ouvido[2].end) erros.push('C o tempo do número não é o medido (início da 1ª, fim da última)')
  if (!S.verifyObservedSpeech(texto, r).ok) erros.push('C a conferência de fala recusou a legenda restaurada')
  const jaDigito = w('In 1983, Petrov saved 40% of 2,600 people.')
  if (JSON.stringify(N.restaurarNumerosNaLegenda(jaDigito, texto, 'en')) !== JSON.stringify(jaDigito)) erros.push('C Whisper com algarismo mudou')
  const partido = N.restaurarNumerosNaLegenda(w('They found 2, 600 tracks.'), 'They found 2,600 tracks.', 'en').map((x) => x.word).join(' ')
  if (partido !== 'They found 2,600 tracks.') erros.push('C "2," + "600" não colou: ' + partido)
  const pt = N.restaurarNumerosNaLegenda(w('Em mil novecentos e oitenta e três, o mundo.'), 'Em 1983, o mundo.', 'pt').map((x) => x.word).join(' ')
  if (pt !== 'Em 1983, o mundo.') erros.push('C pt não voltou: ' + pt)
  const lista = w('Nada aqui.')
  if (N.restaurarNumerosNaLegenda(lista, 'Nada aqui.', 'pt') !== lista) erros.push('C sem número não devolveu o mesmo array')
  return erros
}

console.log('A) a forma falada')
const eA = provasTexto(mundo())
checa('ano/milhar/%/moeda/ordinal por extenso; arriscado e sem número intocados' + (eA.length ? ' — ' + eA.join(' | ') : ''), eA.length === 0)
console.log('B) o que vai à voz (generateTTS e synthesizeHostSpeech reais)')
const eB = await provasVoz(mundo())
checa('a TTS recebe a forma falada (tts-1-hd e MiniMax); sem número e sem língua, o pedido de antes' + (eB.length ? ' — ' + eB.join(' | ') : ''), eB.length === 0)
console.log('C) a legenda volta à grafia do roteiro')
const eC = provasLegenda(mundo())
checa('o Whisper por extenso vira "1983"/"40%"/"2,600" com o tempo medido; a conferência de fala aceita' + (eC.length ? ' — ' + eC.join(' | ') : ''), eC.length === 0)

console.log('D) o /api/compose e o cache de voz')
const rota = lf(fs.readFileSync('app/api/compose/route.ts', 'utf8'))
const iEvid = rota.indexOf('const captionEvidence = assessOwnTtsCaptionEvidence({'), iRest = rota.indexOf('if (legendaPelaGrafiaDoRoteiro) whisperWords = restaurarNumerosNaLegenda(whisperWords, scaledScript, language)'), iGrafia = rota.indexOf('const grafia = legendaPelaGrafiaDoRoteiro && whisperWords ? alinharGrafiaDoRoteiro(whisperWords, scaledScript) : null')
checa('clássica: a legenda é restaurada DEPOIS da evidência de legenda (Whisper bruto) e ANTES da grafia do roteiro, só com TTS do scaledScript', iEvid > 0 && iRest > iEvid && iGrafia > iRest)
checa('hollywood: os blocos de narração levam as palavras restauradas pelo texto da cena', rota.includes('words: restaurarNumerosNaLegenda(m.words, m.text, language),'))
checa('hollywood: a fala nativa restaura a grafia DEPOIS da conferência (o veredito não muda)', /c\.speechWords = words\n\s+if \(c\.dialogueLine\) c\.speechWords = restaurarNumerosNaLegenda\(words, c\.dialogueLine, language\)/.test(rota))
const comp = lf(fs.readFileSync('lib/compose.ts', 'utf8'))
const corpoTts = comp.slice(comp.indexOf('export async function generateTTS('), comp.indexOf('// OpenAI tts-1 emits constant-bitrate MP3'))
checa('o cache de voz continua chaveado pelo texto de exibição (computeVoiceoverCacheKey intocado; a normalização mora DENTRO da síntese)', /computeVoiceoverCacheKey\(\{\s*script: scaledScript,/.test(rota) && corpoTts.includes('const falado = falarNumerosParaTts(cleaned, language).texto') && !/computeVoiceoverCacheKey[\s\S]{0,200}falarNumeros/.test(rota))
const k4 = lf(fs.readFileSync('lib/audioNoCliqueServer.ts', 'utf8'))
checa('a fala medida do Kling 4 (aquecível) sintetiza pelo MESMO generateTTS da montagem', /await generateTTS\(a\.script, a\.speed, a\.vertical, tier, a\.language\)/.test(k4))

console.log('M) mutantes')
const mut = [
  ['generateTTS manda o texto de exibição', { 'lib/compose.ts': (t) => t.replace('const input = falado.length > 3800 ? falado.slice(0, 3800) : falado', 'const input = cleaned.length > 3800 ? cleaned.slice(0, 3800) : cleaned') }, provasVoz],
  ['a legenda não é restaurada', { 'lib/falaNumeros.ts': (t) => t.replace('  if (!trocas.length) return palavras\n', '  return palavras\n') }, provasLegenda],
  ['ano inglês lido como quantidade', { 'lib/falaNumeros.ts': (t) => t.replace('if (l === \'en\') falado = anoEn(a)', 'if (l === \'en\') falado = cardinalEn(a)') }, provasTexto],
]
for (const [nome, mutar, prova] of mut) {
  const mudou = Object.entries(mutar).every(([rel, f]) => f(lf(fs.readFileSync(rel, 'utf8'))) !== lf(fs.readFileSync(rel, 'utf8')))
  const e = await prova(mundo(mutar))
  checa(`mutante "${nome}" fica VERMELHO`, mudou && e.length > 0)
}

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { console.log('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
