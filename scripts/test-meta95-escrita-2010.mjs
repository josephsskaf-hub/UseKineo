import { semIdiomasFormatos2410 } from './test-support/desfaz-idiomas-formatos-2410.mjs' // KINEO-IDIOMAS-FORMATOS-2410 — restore newest layer before every historical reader/undo.
// [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] KINEO-META95-ESCRITA-2010 — guardião da legenda na escrita do roteiro.
//
//     node scripts/test-meta95-escrita-2010.mjs
//
// Sem rede, sem banco, sem OpenAI, sem env: lê arquivos, transpila e roda numa VM (git só para a base do desfaz).
//
// O DEFEITO (régua 95 de 20/10: 2 de 10 filmes de clientes com "legenda na língua/escrita errada"): roteiro em hindi
// (devanágari), legenda em urdu (árabe-persa); roteiro em bengali, legenda em devanágari. A CAUSA, provada com as palavras
// REAIS do cache público de voz (scripts/test-support/meta95-escrita-2010.json): o Whisper era chamado sem `language` e
// escolhia a escrita de ouvido; lib/captionScriptSpelling.ts não acha nenhuma âncora entre escritas diferentes e devolve o
// Whisper sem mudança — e é ele que vai para a tela.
//
// O QUE ESTE ARQUIVO PROVA:
//   A. a causa, com o código REAL (alinharGrafiaDoRoteiro + as fatias reais do chunker e dos cortes de lib/compose.ts):
//      Whisper real do d97e1546 (hindi) e do 4ecb02ab (bengali) → 0 âncoras → legenda montada em urdu / devanágari;
//   B. a lib nova (lib/escritaDaLegenda.ts): escrita dominante, idioma do Whisper pela escrita (hi/bn/ur/fa/ar/ja/zh…,
//      latim e cirílico NUNCA forçam), divergência, rede final e o orquestrador com transcritores dublês (idioma certo,
//      erro, vazio, ainda errado → a de sempre; latim → só a de sempre);
//   C. o conserto de ponta a ponta COMO ESTÁ LIGADO: lê qual transcritor a rota chama e simula a montagem — legenda em
//      devanágari com a grafia do roteiro (hindi) e em bengali (bengali, pelo plano B se preciso);
//   L. a ligação: os 6 pontos que transcrevem TTS fora do hollywood (que só narra en/pt/es) passam pelo wrapper com o texto que a voz leu; o cache com escrita
//      errada é ignorado; a rede final alimenta o montador e o Faceless 15; o unlock; o wrapper usa a MESMA chamada do
//      compose com `language`; lib/compose.ts intocada;
//   D. desfaz exato (cada arquivo tocado, desfeito, é a base), encadeado como camada mais nova (semMeta95Personagem2010, a cabeça, chama este
//      primeiro), diff só na lista, todo commit com a marca;
//   M. mutantes em memória (cada um provado aplicado; todos têm de deixar algo vermelho).
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import {
  semMeta95Escrita2010, desfazMeta95Escrita2010, MARCA_META95_ESCRITA_2010, META95_ESCRITA_2010_BASE, META95_ESCRITA_2010_ARQUIVOS,
  META95_ESCRITA_2010_NOVOS, TROCAS_META95_ESCRITA_2010, ACRESCIMOS_META95_ESCRITA_2010,
} from './test-support/desfaz-meta95-escrita-2010.mjs'
import { semMenuUgc2010 } from './test-support/desfaz-menu-ugc-2010.mjs'
import { semBebeQueFala2010 } from './test-support/desfaz-bebe-que-fala-2010.mjs' // reancorado KINEO-BEBE-QUE-FALA-2010 — o AI Kids Cartoon Stories (20/10) entrou depois na fila e reancorou 3 guardiões desta lista: sai em memória antes do D1
import { semMeta95Personagem2010 } from './test-support/desfaz-meta95-personagem-2010.mjs'
import { semUgcAjustes2010 } from './test-support/desfaz-ugc-ajustes-2010.mjs'
import { semAvatarPreso2010 } from './test-support/desfaz-avatar-preso-2010.mjs' // reancorado KINEO-AVATAR-PRESO-2010 [TRAVA 8.2 — vai do fundador 20/10 "vai pra tudo"]: a camada do avatar preso sai em memória

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '..')
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const MARCA = MARCA_META95_ESCRITA_2010
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => semIdiomasFormatos2410(lf(fs.readFileSync(path.join(ROOT, rel), 'utf8')), rel)
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (rel) => { try { return lf(git('show', `${META95_ESCRITA_2010_BASE}:${rel}`)) } catch { return null } }
let pass = 0
let fail = 0
function ok(cond, msg) { if (cond) { pass++; console.log('  ok  ', msg) } else { fail++; console.log('  FALHA', msg) } }

const P = {
  lib: 'lib/escritaDaLegenda.ts', wrap: 'lib/whisperNaEscrita.ts', grafia: 'lib/captionScriptSpelling.ts', compose: 'lib/compose.ts', openai: 'lib/openai.ts',
  route: 'app/api/compose/route.ts', unlock: 'app/api/compose/unlock/route.ts', clique: 'lib/audioNoCliqueServer.ts', prewarm: 'app/api/prewarm-voiceover/route.ts', ads: 'app/api/ads/render/route.ts',
}
const LIB = rd(P.lib)
const WRAP = rd(P.wrap)
const GRAFIA = rd(P.grafia)
const COMPOSE = rd(P.compose)
const OPENAI = rd(P.openai)
const ROUTE = rd(P.route)
const UNLOCK = rd(P.unlock)
const CLIQUE = rd(P.clique)
const PREWARM = rd(P.prewarm)
const ADS = rd(P.ads)
const FX = JSON.parse(rd('scripts/test-support/meta95-escrita-2010.json'))

// ── código real: a lib nova, a lib da grafia e as fatias de lib/compose.ts/lib/openai.ts que montam a legenda ──
function fatia(src, abre, fecha, rotulo) {
  const ini = src.indexOf(abre)
  if (ini < 0) throw new Error(`fatia "${rotulo}": abertura não encontrada`)
  const fim = src.indexOf(fecha, ini)
  if (fim < 0) throw new Error(`fatia "${rotulo}": fechamento não encontrado`)
  return src.slice(ini, fim + fecha.length)
}
const F = {
  offset: COMPOSE.match(/^const CAPTION_SYNC_OFFSET = [^\n]+$/m)?.[0],
  normalize: fatia(COMPOSE, '\nfunction normalizeCaptionWord(w: string): string {', '\n}\n', 'normalizeCaptionWord'),
  round3: fatia(COMPOSE, '\nfunction round3(v: number): number {', '\n}\n', 'round3'),
  build: fatia(COMPOSE, '\nexport function buildCaptionsFromWhisperWords(', '\n}\n', 'buildCaptionsFromWhisperWords'),
  starts: fatia(COMPOSE, '\nexport function sentenceStartTimes(words: WhisperWord[]): number[] {', '\n}\n', 'sentenceStartTimes'),
  candidates: fatia(OPENAI, '\nconst HIGHLIGHT_CANDIDATES = [', '\n]\n', 'HIGHLIGHT_CANDIDATES'),
  stopwords: fatia(OPENAI, '\nconst STOPWORDS = new Set([', '\n])\n', 'STOPWORDS'),
  cleanWord: fatia(OPENAI, '\nfunction cleanWord(w: string): string {', '\n}\n', 'cleanWord'),
  pick: fatia(OPENAI, '\nexport function pickHighlightWord(caption: string): string | null {', '\n}\n', 'pickHighlightWord'),
}
const CWPC = Number(COMPOSE.match(/^const CAPTION_WORDS_PER_CHUNK = (\d+)$/m)?.[1])
const EMPHASIS_LIT = COMPOSE.match(/^const FAST_EMPHASIS_RE =\n\s+(\/.+\/[a-z]*)$/m)?.[1]
if (!F.offset || !Number.isFinite(CWPC) || !EMPHASIS_LIT) throw new Error('constantes do chunker não encontradas em lib/compose.ts')
const FAST_EMPHASIS_RE = vm.runInNewContext(`(${EMPHASIS_LIT})`)
function transpila(src, rotulo, extra = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, console: { log() {}, warn() {} }, Promise, ...extra, require: () => { throw new Error(`require proibido (${rotulo})`) } })
  return exp
}
const CHUNKER = transpila([F.candidates, F.stopwords, F.cleanWord, F.pick, F.offset, F.normalize, F.round3, F.build, F.starts].join('\n'), 'fatias de lib/compose.ts', { CAPTION_WORDS_PER_CHUNK: CWPC, FAST_EMPHASIS_RE })
const G = transpila(GRAFIA, P.grafia)
const E0 = transpila(LIB, P.lib)

// A legenda que o montador põe na tela: chunker real sobre as palavras (o texto de cada bloco, concatenado).
const textoNaTela = (words, dur) => CHUNKER.buildCaptionsFromWhisperWords(words, dur, 0, 1).map((c) => String(c.text ?? '')).join(' ')
// Por propriedade de escrita (o danda "।" é Common: serve ao hindi e ao bengali e não decide nada).
const ARABE = /\p{Script=Arabic}/u
const DEVA = /\p{Script=Devanagari}/u
const BENG = /\p{Script=Bengali}/u
const HI = FX.hindi
const BN = FX.bengali

// ─── A. a causa, com as palavras REAIS ────────────────────────────────────────
console.log('\nA. a causa (Whisper real do cache, código real)\n')
{
  const g = G.alinharGrafiaDoRoteiro(HI.whisper_sem_idioma, HI.roteiro)
  const tela = textoNaTela(g.words, HI.audio_duracao)
  ok(HI.whisper_sem_idioma.length === 47 && HI.whisper_sem_idioma.every((w) => ARABE.test(w.word) && !DEVA.test(w.word)), 'A1 d97e1546: as 47 palavras do Whisper (sem language) estão em escrita árabe — nenhuma em devanágari')
  ok(DEVA.test(HI.roteiro) && !ARABE.test(HI.roteiro), 'A2 d97e1546: o roteiro (videos.topic, verbatim) está em devanágari')
  ok(!g.aplicada && g.motivo === 'poucas_ancoras' && g.ancoras === 0 && g.words === HI.whisper_sem_idioma, `A3 alinharGrafiaDoRoteiro real: 0 âncoras → devolve o Whisper sem mudança (${g.motivo}, ${g.ancoras}/${g.palavrasDoRoteiro})`)
  ok(ARABE.test(tela) && !DEVA.test(tela), 'A4 legenda montada pelo chunker real (sem o conserto) = escrita urdu — o que o juiz viu nos 8 quadros')
  const gb = G.alinharGrafiaDoRoteiro(BN.whisper_sem_idioma, BN.roteiro)
  const telab = textoNaTela(gb.words, BN.audio_duracao)
  ok(BENG.test(BN.roteiro) && !gb.aplicada && gb.ancoras === 0 && DEVA.test(telab) && !BENG.test(telab), `A5 4ecb02ab: roteiro em bengali, Whisper em devanágari, 0 âncoras → legenda em devanágari (${gb.motivo})`)
}

// ─── B. a lib nova ─────────────────────────────────────────────────────────────
function provaLib(E) {
  const f = []
  const eq = (a, b, r) => { if (a !== b) f.push(`${r}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`) }
  eq(E.escritaDominante(HI.roteiro), 'Devanagari', 'roteiro hindi')
  eq(E.escritaDominante(HI.whisper_sem_idioma.map((w) => w.word).join(' ')), 'Arabic', 'whisper hindi')
  eq(E.idiomaWhisperDaEscrita(HI.roteiro), 'hi', 'idioma hindi')
  eq(E.idiomaWhisperDaEscrita(`HOOK (0-2s): [Pexels: ancient stone observatory] ${HI.roteiro}`), 'hi', 'marcação [Pexels: …] não conta')
  eq(E.idiomaWhisperDaEscrita('[Pexels: ancient stone observatory in Jaipur at golden hour, cinematic drone shot] भारत में एक जगह है'), 'hi', 'marcação longa não decide a escrita')
  eq(E.idiomaWhisperDaEscrita(BN.roteiro), 'bn', 'idioma bengali')
  eq(E.escritaDominante(BN.whisper_sem_idioma.map((w) => w.word).join(' ')), 'Devanagari', 'whisper bengali')
  eq(E.idiomaWhisperDaEscrita('موہنجو داڑو کا وہ راز جو تاریخ کی کتابوں میں نہیں لکھا'), 'ur', 'urdu')
  eq(E.idiomaWhisperDaEscrita('این یک داستان کوتاه درباره پدر و مادر است'), 'fa', 'persa')
  eq(E.idiomaWhisperDaEscrita('هذه قصة قصيرة عن الأهرامات في مصر'), 'ar', 'árabe')
  eq(E.idiomaWhisperDaEscrita('これは東京の古い神社の物語です'), 'ja', 'japonês (kana + kanji)')
  eq(E.idiomaWhisperDaEscrita('这是一个关于长城的故事'), 'zh', 'chinês')
  eq(E.idiomaWhisperDaEscrita('이것은 서울의 이야기입니다'), 'ko', 'coreano')
  eq(E.idiomaWhisperDaEscrita('The Bermuda Triangle swallowed Flight 19 in 1945.'), null, 'inglês não força')
  eq(E.idiomaWhisperDaEscrita('O Triângulo das Bermudas engoliu o voo 19 em 1945.'), null, 'português não força')
  eq(E.idiomaWhisperDaEscrita('Это история о Чернобыле.'), null, 'cirílico não força')
  eq(E.idiomaWhisperDaEscrita('This is the story of a temple called मंदिर in the heart of Delhi.'), null, 'latim com 1 palavra em hindi não força')
  eq(E.idiomaWhisperDaEscrita(''), null, 'vazio')
  eq(E.escritaDivergente(HI.whisper_sem_idioma, HI.roteiro), true, 'divergente hindi × urdu')
  eq(E.escritaDivergente(BN.whisper_sem_idioma, BN.roteiro), true, 'divergente bengali × devanágari')
  eq(E.escritaDivergente(HI.whisper_com_idioma_hi, HI.roteiro), false, 'devanágari × devanágari')
  eq(E.escritaDivergente([{ word: 'Flight', start: 0, end: 1 }, { word: 'nineteen', start: 1, end: 2 }], 'Flight 19 vanished.'), false, 'inglês × inglês')
  eq(E.escritaDivergente([], HI.roteiro), false, 'sem palavras')
  eq(E.escritaDivergente(HI.whisper_sem_idioma, ''), false, 'sem roteiro')
  eq(E.legendaNaEscritaDoRoteiro(HI.whisper_sem_idioma, HI.roteiro), undefined, 'rede: urdu sobre hindi não vai para a tela')
  eq(E.legendaNaEscritaDoRoteiro(HI.whisper_com_idioma_hi, HI.roteiro), HI.whisper_com_idioma_hi, 'rede: devanágari passa igual')
  eq(E.legendaNaEscritaDoRoteiro(undefined, HI.roteiro), undefined, 'rede: undefined')
  return f
}
async function provaOrquestrador(E) {
  const f = []
  const dub = (respHi) => {
    const log = { padrao: 0, idiomas: [] }
    return { log, t: { padrao: async () => { log.padrao++; return HI.whisper_sem_idioma }, comIdioma: async (i) => { log.idiomas.push(i); return respHi(i) } } }
  }
  let d = dub(() => HI.whisper_com_idioma_hi)
  let r = await E.transcreverNaEscritaCom(HI.roteiro, d.t)
  if (r !== HI.whisper_com_idioma_hi || d.log.padrao !== 0 || d.log.idiomas.join() !== 'hi') f.push(`hindi: ${JSON.stringify(d.log)}`)
  d = dub(() => HI.whisper_com_idioma_hi)
  await E.transcreverNaEscritaCom(BN.roteiro, d.t)
  if (d.log.idiomas.join() !== 'bn') f.push(`bengali pediu ${d.log.idiomas.join()}`)
  d = dub(() => { throw new Error('nunca') })
  r = await E.transcreverNaEscritaCom('The Bermuda Triangle swallowed Flight 19.', d.t)
  if (d.log.idiomas.length !== 0 || d.log.padrao !== 1 || r !== HI.whisper_sem_idioma) f.push(`latim: ${JSON.stringify(d.log)}`)
  d = dub(() => { throw new Error('timeout') })
  r = await E.transcreverNaEscritaCom(HI.roteiro, d.t)
  if (d.log.padrao !== 1 || r !== HI.whisper_sem_idioma) f.push('erro com idioma não voltou para a de sempre')
  d = dub(() => [])
  r = await E.transcreverNaEscritaCom(HI.roteiro, d.t)
  if (d.log.padrao !== 1 || r !== HI.whisper_sem_idioma) f.push('vazio com idioma não voltou para a de sempre')
  d = dub(() => HI.whisper_sem_idioma)
  r = await E.transcreverNaEscritaCom(HI.roteiro, d.t)
  if (d.log.padrao !== 1) f.push('ainda em urdu com idioma não voltou para a de sempre')
  return f
}
console.log('\nB. lib/escritaDaLegenda.ts\n')
{
  const fl = provaLib(E0)
  ok(fl.length === 0, `B1 escrita dominante, idioma pela escrita (hi/bn/ur/fa/ar/ja/zh/ko; latim e cirílico nunca), divergência e rede final (${fl.join(' · ') || '27 casos'})`)
  const fo = await provaOrquestrador(E0)
  ok(fo.length === 0, `B2 orquestrador: hindi → language=hi uma vez e só ela; bengali → bn; latim → só a de sempre; erro/vazio/ainda errado → a de sempre (${fo.join(' · ') || 'ok'})`)
  ok(!/^import /m.test(LIB) && !/process\.env|fetch\(/.test(LIB), 'B3 lib pura: sem import, sem env, sem rede')
}

// ─── C. ponta a ponta, como a rota está ligada ───────────────────────────────
// Lê o transcritor do ponto clássico da rota e a linha da legenda; simula Whisper (sem language = urdu, como o real;
// com language=hi = devanágari) → alinharGrafiaDoRoteiro real → rede (se ligada) → chunker real; sem palavras = plano B
// (o texto do roteiro, que é o que buildCreatomateSource usa sem Whisper).
async function pontaAPonta(route, E, caso) {
  const usaWrapper = /\? transcreverNaEscritaDoRoteiro\(audioBuffer, scaledScript\)/.test(route)
  const usaPadrao = /\? transcribeTTSWithTimestamps\(audioBuffer\)\n/.test(route)
  if (usaWrapper === usaPadrao) return { erro: 'ponto clássico da rota irreconhecível' }
  const t = { padrao: async () => caso.whisper_sem_idioma, comIdioma: async (i) => (i === 'hi' && caso.whisper_com_idioma_hi ? caso.whisper_com_idioma_hi : caso.whisper_sem_idioma) }
  const whisperWords = usaWrapper ? await E.transcreverNaEscritaCom(caso.roteiro, t) : await t.padrao()
  const g = G.alinharGrafiaDoRoteiro(whisperWords, caso.roteiro)
  const daLinha = g.words
  const rede = /const legendaWords: WhisperWord\[\] \| undefined = legendaNaEscritaDoRoteiro\(grafia \? grafia\.words : whisperWords, scaledScript\)/.test(route)
  const legendaWords = rede ? E.legendaNaEscritaDoRoteiro(daLinha, caso.roteiro) : daLinha
  const tela = legendaWords && legendaWords.length > 0 ? textoNaTela(legendaWords, caso.audio_duracao) : caso.roteiro
  return { tela, grafia: g, planoB: !legendaWords }
}
console.log('\nC. ponta a ponta (rota como está no disco)\n')
{
  const h = await pontaAPonta(ROUTE, E0, HI)
  ok(!h.erro && DEVA.test(h.tela) && !ARABE.test(h.tela), `C1 d97e1546 com o conserto: legenda em devanágari (${h.erro ?? `${h.grafia.motivo} ${h.grafia.ancoras}/${h.grafia.palavrasDoRoteiro}`})`)
  ok(!h.erro && h.grafia.aplicada && !h.planoB && /रहस्यमयी/.test(h.tela) && /अद्वितीय/.test(h.tela) && /जंतर-मंतर/.test(h.tela),
    'C2 …e com a GRAFIA DO ROTEIRO no tempo do Whisper (रहस्यमयी, अद्वितीय, जंतर-मंतर — os erros de ouvido somem)')
  const b = await pontaAPonta(ROUTE, E0, BN)
  ok(!b.erro && BENG.test(b.tela) && !DEVA.test(b.tela), `C3 4ecb02ab: legenda em bengali (o Whisper com language=bn, ou o plano B com o texto do roteiro) — nunca devanágari`)
  const semConserto = await pontaAPonta(semMeta95Escrita2010(rd(P.route), P.route).replace(/\r\n/g, '\n'), E0, HI)
  ok(!semConserto.erro && ARABE.test(semConserto.tela), 'C4 a mesma simulação na rota SEM esta camada (desfaz) volta a dar legenda em urdu — a prova antes/depois')
}

// ─── L. a ligação ─────────────────────────────────────────────────────────────
console.log('\nL. ligação\n')
// Os pontos que transcrevem TTS fora do hollywood (o hollywood narra só en/pt/es — escrita latina, o wrapper não forçaria
// idioma nenhum — e fica com a transcrição de sempre; L8 prova a premissa).
const SITIOS = [
  [P.route, '        ? transcreverNaEscritaDoRoteiro(audioBuffer, scaledScript)', 'clássico (Kineo 1, Seedance 1.5, Veo, Kling 2.5) e Studio Ads'],
  [P.unlock, '      const words = await transcreverNaEscritaDoRoteiro(audioBuffer, scaledScript)', 'export limpo pago'],
  [P.clique, '    const words = await transcreverNaEscritaDoRoteiro(audio, a.script).catch(() => [])', 'voz do clique'],
  [P.prewarm, '    const words = await transcreverNaEscritaDoRoteiro(audio, script).catch(() => [])', 'aquecimento de voz'],
  [P.ads, '    let words = await transcreverNaEscritaDoRoteiro(voiceBuf, narration).catch(() => [])', 'Studio Ads v1'],
  [P.ads, '    if (words.length === 0) words = await transcreverNaEscritaDoRoteiro(voiceBuf, narration).catch(() => [])', 'Studio Ads v1 (2ª tentativa)'],
]
// Cada falha nasce com o prefixo do item (L1…L4) — o filtro por item não depende do texto.
function provaLigacao(T) {
  const f = []
  for (const [rel, linha, rot] of SITIOS) {
    const l = T[rel].split('\n').find((x) => x.startsWith(linha))
    if (!l || !l.includes(MARCA)) f.push(`L1 sem o wrapper: ${rot}`)
  }
  for (const rel of [P.route, P.unlock, P.clique, P.prewarm, P.ads]) {
    const diretas = T[rel].match(/transcribeTTSWithTimestamps\([^)]*\)/g) ?? []
    const esperadas = rel === P.route ? 2 : rel === P.clique ? 1 : 0 // só as do hollywood, sempre sobre `buf`
    if (diretas.length !== esperadas || diretas.some((d) => d !== 'transcribeTTSWithTimestamps(buf)')) f.push(`L1 ${rel} chama a transcrição sem idioma fora do hollywood: ${diretas.join(', ')}`)
    if (!T[rel].includes("import { transcreverNaEscritaDoRoteiro } from '@/lib/whisperNaEscrita'")) f.push(`L1 ${rel} sem import do wrapper`)
  }
  const R = T[P.route]
  const iVoz = R.indexOf('if (!cachedVoiceover) cachedVoiceover = await audioDoClique.voz(voiceoverCacheKey)')
  const iCache = R.indexOf('if (cachedVoiceover && escritaDivergente(cachedVoiceover.words, scaledScript)) {')
  const iUso = R.indexOf('let realAudioDuration = cachedVoiceover')
  if (!(iVoz > 0 && iCache > iVoz && iUso > iCache && /escritaDivergente\(cachedVoiceover\.words, scaledScript\)\) \{[^\n]*cachedVoiceover = null \}/.test(R))) f.push('L2 cache em outra escrita não é ignorado entre a busca e o uso')
  const iLeg = R.indexOf('const legendaWords: WhisperWord[] | undefined = legendaNaEscritaDoRoteiro(grafia ? grafia.words : whisperWords, scaledScript)')
  const iGrafia = R.indexOf('const grafia = legendaPelaGrafiaDoRoteiro && whisperWords ? alinharGrafiaDoRoteiro(whisperWords, scaledScript) : null')
  if (!(iGrafia > 0 && iLeg > iGrafia)) f.push('L3 rede final não está na linha da legenda (depois da grafia)')
  if (!R.includes('whisperWords: legendaWords, // KINEO-LEGENDA-GRAFIA-DO-ROTEIRO-2026-09-28') || !R.includes('aplicarFaceless15(source, faceless15, { whisperWords: legendaWords ?? null')) f.push('L3 montador/Faceless 15 não recebem legendaWords')
  const U = T[P.unlock]
  const iU = U.indexOf('const words = await transcreverNaEscritaDoRoteiro(audioBuffer, scaledScript)')
  const iUn = U.indexOf('if (whisperWords && escritaDivergente(whisperWords, scaledScript)) whisperWords = undefined')
  if (!(iU > 0 && iUn > iU && U.indexOf('grafiaDoRoteiro(whisperWords, scaledScript)', iUn) > iUn)) f.push('L4 unlock sem a rede depois da transcrição')
  return f
}
const TEXTOS = { [P.route]: ROUTE, [P.unlock]: UNLOCK, [P.clique]: CLIQUE, [P.prewarm]: PREWARM, [P.ads]: ADS }
const doItem = (fl, item) => fl.filter((x) => x.startsWith(`${item} `))
{
  const fl = provaLigacao(TEXTOS)
  ok(doItem(fl, 'L1').length === 0, `L1 os 6 pontos que transcrevem TTS fora do hollywood passam pelo wrapper com o texto que a voz leu; chamada sem idioma só nas 3 do hollywood (${doItem(fl, 'L1').join(' · ') || 'ok'})`)
  ok(doItem(fl, 'L2').length === 0, 'L2 voz em cache (ou do clique) com o Whisper em outra escrita é ignorada entre a busca e o uso — sintetiza de novo e regrava a chave')
  ok(doItem(fl, 'L3').length === 0, 'L3 rede final na linha da legenda; montador e Faceless 15 recebem a legenda já conferida')
  ok(doItem(fl, 'L4').length === 0, 'L4 export limpo: rede logo depois da transcrição, antes da grafia')
  ok(/^export const HOLLYWOOD_LANGUAGES = \['en', 'pt', 'es'\] as const$/m.test(rd('lib/textLanguage.ts')) &&
    ['The ship sank at dawn.', 'O navio afundou de madrugada.', 'El barco se hundió al amanecer.'].every((t) => E0.idiomaWhisperDaEscrita(t) === null),
    'L8 hollywood fica com a transcrição de sempre porque só narra en/pt/es (escrita latina → o wrapper não forçaria idioma)')
  const chamada = /model: AI_TRANSCRIPTION_MODEL,[\s\S]*response_format: 'verbose_json',\n\s+timestamp_granularities: \['word', 'segment'\],\n\s+language: idioma,[\s\S]*\{ timeout: OPENAI_WHISPER_TIMEOUT_MS, maxRetries: 0 \}\)/.test(WRAP)
  ok(chamada && /markSentenceEnds\(words, segments\)/.test(WRAP) && /padrao: \(\) => transcribeTTSWithTimestamps\(buffer\)/.test(WRAP) && /comIdioma: \(idioma\) => whisperComIdioma\(buffer, idioma\)/.test(WRAP) && /catch \{\n\s+return \[\]\n\s+\}/.test(WRAP),
    'L5 wrapper: a de sempre é transcribeTTSWithTimestamps; com idioma, a MESMA chamada (modelo, verbose_json, word+segment, timeout, sem retry) + language, fronteiras pelo markSentenceEnds; nunca lança')
  ok(/^export const AI_TRANSCRIPTION_MODEL = 'whisper-1' as const$/m.test(rd('lib/aiModels.ts')) && /model: 'whisper-1',\n\s+file: file/.test(COMPOSE), 'L6 o modelo do wrapper é o mesmo whisper-1 do compose')
  ok(!COMPOSE.includes(MARCA) && !/language:/.test(fatia(COMPOSE, '\nexport async function transcribeTTSWithTimestamps(', '\n}\n', 'transcribe')) && base(P.compose) === COMPOSE, 'L7 lib/compose.ts intocada (byte a byte igual à base)')
}

// ─── D. desfaz ────────────────────────────────────────────────────────────────
console.log('\nD. desfaz\n')
{
  const difs = []
  for (const f of META95_ESCRITA_2010_ARQUIVOS) {
    const b = base(f)
    if (b === null) { difs.push(`${f}: fora da base`); continue }
    let out
    try { out = semMeta95Escrita2010(semAvatarPreso2010(semBebeQueFala2010(rd(f), f), f), f) /* reancorado KINEO-BEBE-QUE-FALA-2010 */ } catch (e) { difs.push(`${f}: ${e.message}`); continue } // reancorado KINEO-AVATAR-PRESO-2010: sem a camada do avatar preso (mais nova), em memória
    if (lf(out) !== b) difs.push(f)
  }
  ok(difs.length === 0, `D1 ${META95_ESCRITA_2010_ARQUIVOS.length} arquivos tocados, desfeitos, = base ${META95_ESCRITA_2010_BASE.slice(0, 9)} (${difs.join('; ') || 'ok'})`)
  ok(META95_ESCRITA_2010_NOVOS.every((f) => fs.existsSync(path.join(ROOT, f)) && base(f) === null), `D2 os ${META95_ESCRITA_2010_NOVOS.length} arquivos novos existem e não existiam na base`)
  const trocasOk = Object.entries(TROCAS_META95_ESCRITA_2010).every(([f, t]) => META95_ESCRITA_2010_ARQUIVOS.includes(f) && t.every(([nova, velha]) => nova.includes(MARCA) && !velha.includes(MARCA)))
  ok(trocasOk && Object.values(ACRESCIMOS_META95_ESCRITA_2010).every((n) => Number.isInteger(n) && n >= 0), 'D3 trocas: linha nova com a marca, linha da base sem; contagens inteiras')
  const DESFAZ_MENU = rd('scripts/test-support/desfaz-meta95-personagem-2010.mjs')
  const cadeia = /export function semMeta95Personagem2010\(texto, p\) \{\n  texto = semMeta95Escrita2010\(texto, p\)/.test(DESFAZ_MENU)
  const igual = META95_ESCRITA_2010_ARQUIVOS.every((f) => {
    const raw = semBebeQueFala2010(rd(f), f), semEste = semMeta95Escrita2010(raw, f) // reancorado KINEO-BEBE-QUE-FALA-2010 — sem a camada de 20/10 (mais nova), em memória
    return semMeta95Personagem2010(raw, f) === semMeta95Personagem2010(semEste, f) && semMenuUgc2010(raw, f) === semMenuUgc2010(semEste, f) && semUgcAjustes2010(raw, f) === semUgcAjustes2010(semEste, f)
  })
  ok(cadeia && igual, 'D4 encadeamento: semMeta95Personagem2010 (a cabeça das cadeias) tira esta camada PRIMEIRO; menu-ugc e ugc-ajustes herdam')
  let lancou = false
  try { semMeta95Escrita2010(rd(P.route) + `\n// linha nova ${MARCA}`, P.route) } catch { lancou = true }
  ok(semMeta95Escrita2010('sem marca', P.route) === 'sem marca' && semMeta95Escrita2010(ROUTE, 'outro/arquivo.ts') === ROUTE && desfazMeta95Escrita2010(P.route, null) === null && lancou,
    'D5 idempotente fora da lista / sem a marca / null; acréscimo a mais lança')
  const TOPO = git('log', '--format=%H', `--grep=${MARCA}`, '-1', 'HEAD').trim() || 'HEAD' // inclui o merge da main nesta entrega (a base é a main mesclada)
  const tocados = new Set([...git('diff', '--name-only', META95_ESCRITA_2010_BASE, TOPO).trim().split('\n'), ...git('diff', '--name-only', 'HEAD').trim().split('\n')].filter(Boolean))
  const permitidos = new Set([...META95_ESCRITA_2010_ARQUIVOS, ...META95_ESCRITA_2010_NOVOS])
  const fora = [...tocados].filter((f) => !permitidos.has(f))
  const semMarca = META95_ESCRITA_2010_ARQUIVOS.filter((f) => { const b = new Set((base(f) ?? '').split('\n')); return !semAvatarPreso2010(semBebeQueFala2010(rd(f), f) /* reancorado KINEO-BEBE-QUE-FALA-2010 */, f).split('\n').every((l) => b.has(l) || l.includes(MARCA)) }) // reancorado KINEO-AVATAR-PRESO-2010: as linhas do avatar preso não são desta entrega
  ok(tocados.size > 0 && fora.length === 0 && semMarca.length === 0 && ![...tocados].some((f) => /engineCost|pricing|lib\/credits\//.test(f)),
    `D6 o diff da base só toca a lista e os novos; toda linha nova traz a marca; nada de cobrança ou preço (${[...fora.map((f) => `fora: ${f}`), ...semMarca.map((f) => `sem marca: ${f}`)].join('; ') || 'ok'})`)
  const assuntos = git('log', '--no-merges', '--format=%s', `${META95_ESCRITA_2010_BASE}..${TOPO}`).trim().split('\n').filter(Boolean)
  ok(assuntos.every((s) => s.includes(MARCA)), `D7 todo commit da entrega traz a marca no assunto (${assuntos.length})`)
}

// ─── M. mutantes ──────────────────────────────────────────────────────────────
console.log('\nM. mutantes (cada um provado aplicado; todos têm de ficar vermelhos)\n')
const muta = (src, de, para) => { const out = src.split(de).join(para); return out === src ? null : out }
async function libMuda(de, para, rotulo, comoProva) {
  const src = muta(LIB, de, para)
  if (!src) { ok(false, `${rotulo}: âncora do mutante sumiu`); return }
  let vermelho
  try {
    const E = transpila(src, rotulo)
    const fl = [...provaLib(E), ...(await provaOrquestrador(E))]
    const h = await pontaAPonta(ROUTE, E, HI)
    const b = await pontaAPonta(ROUTE, E, BN)
    vermelho = fl.length > 0 || !DEVA.test(h.tela) || ARABE.test(h.tela) || DEVA.test(b.tela)
  } catch { vermelho = true } // exceção também é vermelho
  ok(vermelho, `${rotulo} → vermelho (${comoProva})`)
}
await libMuda("  Devanagari: 'hi', // o caso do defeito", "  Devanagari: null as unknown as string, // o caso do defeito", 'M1 devanágari sem idioma', 'B1/C1')
await libMuda("  Bengali: 'bn',", '', 'M2 bengali sem idioma', 'B1/B2')
await libMuda('  return dasPalavras !== doRoteiro', '  return false', 'M3 divergência sempre falsa', 'B1/B2')
await libMuda('&& !escritaDivergente(words, roteiro)) return words', ') return words', 'M4 orquestrador aceita a escrita errada', 'B2')
await libMuda("  ['Latin', /[\\p{Script=Latin}]/u],", "  ['Devanagari', /[\\p{Script=Latin}]/u],", 'M5 latim contado como devanágari (forçaria idioma em inglês)', 'B1/B2')
await libMuda('  } catch (err) {\n    console.warn(`[legenda-escrita] Whisper com language=${idioma} falhou', '  } finally {\n    console.warn(`[legenda-escrita] Whisper com language=${idioma} falhou', 'M6 erro com idioma não volta para a de sempre', 'B2')
await libMuda("  const limpo = String(texto ?? '').replace(/\\[[^\\]]*\\]/g, ' ')", "  const limpo = String(texto ?? '')", 'M7 marcação [Pexels: …] passa a contar', 'B1')
await libMuda("    if (LETRA_DO_URDU.test(t)) return 'ur'\n", '', 'M8 urdu vira persa', 'B1')
await libMuda('  return escritaDivergente(words, roteiro) ? undefined : words', '  return words', 'M9 rede final desligada', 'B1')
{
  const fluxo = (rel, de, para, rotulo) => {
    const T = { ...TEXTOS }
    const src = muta(T[rel], de, para)
    if (!src) { ok(false, `${rotulo}: âncora do mutante sumiu`); return null }
    T[rel] = src
    return T
  }
  let T = fluxo(P.route, '        ? transcreverNaEscritaDoRoteiro(audioBuffer, scaledScript)', '        ? transcribeTTSWithTimestamps(audioBuffer)\n', 'M10')
  if (T) { const h = await pontaAPonta(T[P.route], E0, HI); ok(provaLigacao(T).length > 0 && (h.planoB || !h.grafia.aplicada), 'M10 rota clássica volta para a transcrição sem idioma → L1 vermelho e C2 perde a grafia') }
  T = fluxo(P.route, 'if (cachedVoiceover && escritaDivergente(cachedVoiceover.words, scaledScript)) {', 'if (false) {', 'M11')
  if (T) ok(doItem(provaLigacao(T), 'L2').length > 0, 'M11 cache em outra escrita volta a ser reaproveitado → L2 vermelho')
  T = fluxo(P.route, 'legendaNaEscritaDoRoteiro(grafia ? grafia.words : whisperWords, scaledScript)', '(grafia ? grafia.words : whisperWords)', 'M12')
  if (T) { const s = await pontaAPonta(T[P.route], { ...E0, transcreverNaEscritaCom: async (r, t) => t.padrao() }, HI); ok(doItem(provaLigacao(T), 'L3').length > 0 && ARABE.test(s.tela), 'M12 rede final fora da linha da legenda → L3 vermelho (e, se o Whisper ainda vier em urdu, a tela volta a urdu)') }
  T = fluxo(P.unlock, 'if (whisperWords && escritaDivergente(whisperWords, scaledScript)) whisperWords = undefined', 'void 0', 'M13')
  if (T) ok(doItem(provaLigacao(T), 'L4').length > 0, 'M13 unlock sem a rede → L4 vermelho')
  T = fluxo(P.clique, '    const words = await transcreverNaEscritaDoRoteiro(audio, a.script).catch(() => [])', '    const words = await transcribeTTSWithTimestamps(audio).catch(() => [])', 'M14')
  if (T) ok(provaLigacao(T).length > 0, 'M14 voz do clique volta a gravar o cache sem idioma → L1 vermelho')
  T = fluxo(P.prewarm, 'transcreverNaEscritaDoRoteiro(audio, script)', 'transcreverNaEscritaDoRoteiro(audio, "")', 'M15')
  if (T) ok(provaLigacao(T).length > 0, 'M15 aquecimento com o texto errado (vazio) → L1 vermelho')
  const w2 = muta(WRAP, '    language: idioma,\n', '')
  ok(w2 && !/language: idioma,/.test(w2) && !(/timestamp_granularities: \['word', 'segment'\],\n\s+language: idioma,/.test(w2)), 'M16 wrapper sem `language` → L5 vermelho')
  const sem = (() => { try { return semMeta95Escrita2010(rd(P.route).replace(/\n[^\n]*cachedVoiceover = null \} \/\/ KINEO-META95-ESCRITA-2010[^\n]*/, ''), P.route) } catch { return 'lancou' } })()
  ok(sem === 'lancou', 'M17 acréscimo marcado a menos no compose → o desfaz lança (contagem exata)')
  const quebrado = muta(rd('scripts/test-support/desfaz-meta95-personagem-2010.mjs'), '  texto = semMeta95Escrita2010(texto, p)', '  void 0')
  ok(quebrado && !/export function semMeta95Personagem2010\(texto, p\) \{\n  texto = semMeta95Escrita2010\(texto, p\)/.test(quebrado), 'M18 cabeça da cadeia sem chamar esta camada → D4 vermelho')
  const ca = muta(LIB, '  if (!escrita) return null\n  if (escrita === \'Arabic\') {', '  if (!escrita) return null\n  if (escrita === \'Devanagari\') return \'ur\'\n  if (escrita === \'Arabic\') {')
  if (ca) { const E = transpila(ca, 'M19'); const h = await pontaAPonta(ROUTE, E, HI); ok(provaLib(E).length > 0 && h.grafia && !h.grafia.aplicada, 'M19 devanágari pede urdu (escrita trocada de propósito) → B1 vermelho e a grafia não aplica') } else ok(false, 'M19 âncora sumiu')
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} ok, ${fail} falha(s)`)
process.exit(fail === 0 ? 0 : 1)
