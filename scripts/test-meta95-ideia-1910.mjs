// [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] KINEO-META95-IDEIA-1910 — guardião da ALAVANCA A2 da meta 95:
// a ideia solta passa pelo escritor marcado do /api/generate-script e, dali em diante, as falas são VERBATIM.
// OFFLINE: executa o código real de lib/meta95/ideiaNoEscritor.ts (e das libs que ele usa) com escritor FALSO; nenhuma rede,
// chave, banco ou render. Os textos dos casos são os dos renders do diagnóstico, reproduzidos à mão.
// Provas:
//   P1  ideia solta = o MESMO predicado de "verbatim" da rota (marcadores OU "as is" que não é brief); só ela passa aqui;
//   P2  o escritor é o POST do /api/generate-script, chamado com o tamanho do filme e o motor (régua da casa: clássicos
//       3,1 pal/s — 35 s = 100-115, 60 s = 175-195 —, hollywood 2,3); sem motor = Seedance, como a rota;
//   P3  dali em diante a fala é VERBATIM: o pedido vira "[Idea: …]" + roteiro marcado, a rota segue verbatim e o filtro
//       anti-invenção (que só roda com verbatim=false) não apaga mais palavra ("In 1872…" fica inteiro); o defeito antigo
//       ("In the year, a mysterious disappearance…") é reproduzido no filtro para provar o que deixou de acontecer;
//   P4  meta-texto do roteirista (5cb320bb: "This particular scene does not include any voiceover narration…") sai como
//       FRASE INTEIRA, nunca palavra; roteiro todo meta = caminho de antes; narração de verdade não é tocada;
//   P5  brief longo em 15 s (67431ef0: "Create a 45-second story…"): o roteiro nasce no tamanho do filme (o pedido de
//       tamanho vira 15 s; ideia longa vai como "condense a história inteira") e grava aviso; roteiro longo demais para o
//       filme não entra (nunca amputamos o fim — volta o caminho de antes);
//   P6  só entra roteiro acima do piso do portão de narração (ficar abaixo é defeito); fail-open em todo tropeço;
//   P7  a linha da ideia nunca é falada: fala e blocos do pedido = os do roteiro;
//   R   a rota: imports e linhas marcadas, a troca do pedido ANTES do parse, o escritor = POST do generate-script, a guarda
//       de meta-texto no caminho antigo; desfeitas as linhas marcadas a rota é EXATAMENTE a base (pai do 1º commit);
//   M   mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
let pass = 0
let fail = 0
const checa = (nome, ok, detalhe = '') => { if (ok) { pass++; console.log('  ok  ' + nome) } else { fail++; console.log('  FAIL ' + nome + (detalhe ? ' — ' + detalhe : '')) } }

const F = {
  lib: 'lib/meta95/ideiaNoEscritor.ts',
  rota: 'app/api/generate-video-cinematic/route.ts',
  script: 'app/api/generate-script/route.ts',
  fidelidade: 'lib/hollywood/fidelidade.ts',
  regua: 'lib/scriptWriterRate.ts',
  desfaz: 'scripts/test-support/desfaz-meta95-ideia-1910.mjs',
}
const MARCA = 'KINEO-META95-IDEIA-1910'

// ── Os textos dos casos (reproduzidos à mão dos renders do diagnóstico) ──────────────────────────────────────────────
const IDEIA_MARY = 'the mystery of the Mary Celeste ghost ship'
const ROTEIRO_MARY = [
  'HOOK (0-2s): [Pexels: ghost ship fog ocean] A ship found sailing with no one aboard.',
  '',
  'MICRO REWARD 1: [Pexels: old sailing ship deck] In 1872, the Mary Celeste was found drifting near the Azores, sails half set, cargo intact.',
  '',
  'MICRO REWARD 2: [Pexels: old captain logbook] The last log entry was written nine days earlier, and the lifeboat was gone.',
  '',
  'MICRO REWARD 3: [Pexels: wooden barrels cargo hold] Nine of the 1,701 barrels of alcohol on board were empty — red oak, not white.',
  '',
  'ESCALATION: [Pexels: stormy sea night] Ten people vanished from a seaworthy ship, with six months of food still in the galley.',
  '',
  'RHYTHM: [Pexels: waves crashing hull] No storm. No blood. No bodies.',
  '',
  'PAYOFF: [Pexels: ship sailing away horizon] The leading theory... alcohol fumes from the leaking red oak barrels sparked a panicked evacuation, and the lifeboat drifted away forever — the ship sailed on without them.',
  'Follow for the next mystery.',
].join('\n')
// 5cb320bb — o roteirista narrou a própria instrução
const META_5CB = 'This particular scene does not include any voiceover narration, focusing instead on the visuals of the abandoned submarine.'
const ROTEIRO_TODO_META = [
  `HOOK: [Pexels: submarine underwater] ${META_5CB}`,
  'PAYOFF: [Pexels: ocean depth dark] The camera slowly pans across the empty control room. Cut to black.',
].join('\n')
// 67431ef0 — brief de 45 s pedido num filme de 15 s
const BRIEF_67431 = 'Create a 45-second story about a lighthouse keeper who discovers a message in a bottle that predicts the next storm.'
const BRIEF_LONGO_15S = 'Create a 45-second story about a lighthouse keeper on a remote island who, every night for forty years, lights the lamp alone; one winter he finds a message in a bottle written in his own handwriting, dated thirty years in the future, warning him that the next storm will take the lighthouse, and he has to decide whether to leave the island or stay and keep the light burning for the ships.'
const ROTEIRO_15S = [
  'HOOK: [Pexels: lighthouse night storm] A bottle washed ashore — in his own handwriting.',
  'MICRO REWARD 1: [Pexels: old man lighthouse lamp] For forty years, he lit the lamp alone.',
  'MICRO REWARD 2: [Pexels: message in bottle beach] The note was dated thirty years ahead and warned of the storm.',
  'PAYOFF: [Pexels: lighthouse beam over waves] He stayed... and the light kept every ship safe that night.',
].join('\n')
const ROTEIRO_15S_LONGO = ROTEIRO_15S + '\n' + 'PAYOFF: [Pexels: sea at dawn] ' + 'And when the morning came the island was quiet again and the sea was calm and the old keeper climbed down the stairs one last time to read the note again and smile at the sun. '.repeat(1)
// o caminho antigo (generateScenes + filtro): a fala do escritor com data/lugar fora do pedido
const FALA_ANTIGA_ANO = 'In the year 1958, a mysterious disappearance shocked the town of Dyatlov Pass.'

const respOk = (script, extra = {}) => ({ status: 200, json: { script, alreadyStructured: false, words: 0, minWords: 0, family: 'classic', ...extra } })
function escritorFalso(resposta) {
  const chamadas = []
  const f = async (corpo) => { chamadas.push(corpo); if (resposta === 'throw') throw new Error('boom'); return typeof resposta === 'function' ? resposta(corpo) : resposta }
  f.chamadas = chamadas
  return f
}
function registro() {
  const eventos = []
  const f = async (name, metadata) => { eventos.push({ name, metadata }) }
  f.eventos = eventos
  return f
}
const palavras = (t) => String(t).split(/\s+/).filter(Boolean).length

async function provas(L) {
  const r = {}
  const tenta = async (k, fn) => { try { r[k] = !!(await fn()) } catch (e) { if (process.env.DEBUG_IDEIA) console.log(k, e && e.stack); r[k] = false } }
  const { lib } = L

  // P1 — o predicado da rota
  await tenta('P1', () =>
    lib.ehIdeiaSolta({ prompt: IDEIA_MARY, scriptMode: 'ai' }) === true &&
    lib.ehIdeiaSolta({ prompt: IDEIA_MARY }) === true &&
    lib.ehIdeiaSolta({ prompt: 'My grandfather built boats. Every summer he took me to the harbor at dawn.', scriptMode: 'verbatim' }) === false &&
    lib.ehIdeiaSolta({ prompt: 'Character: a shy robot, 10 years old, blue eyes.\nCreate a 60-second video about him.\nMake the tone warm and funny.', scriptMode: 'verbatim' }) === true &&
    lib.ehIdeiaSolta({ prompt: ROTEIRO_MARY, scriptMode: 'ai' }) === false &&
    lib.ehIdeiaSolta({ prompt: '   ', scriptMode: 'ai' }) === false)

  // P2 — o escritor: tamanho do filme, motor, régua
  await tenta('P2', async () => {
    const e1 = escritorFalso(respOk(ROTEIRO_MARY))
    await lib.escreverIdeiaNoServidor({ prompt: IDEIA_MARY, scriptMode: 'ai', engine: null, seconds: 60, language: 'en', escritor: e1 })
    const e2 = escritorFalso(respOk(ROTEIRO_MARY))
    await lib.escreverIdeiaNoServidor({ prompt: IDEIA_MARY, scriptMode: 'ai', engine: 'hollywood', seconds: 35, language: 'pt', escritor: e2 })
    const c1 = e1.chamadas[0] ?? {}, c2 = e2.chamadas[0] ?? {}
    const R = L.regua
    const cl = R.writerRateFor('seedance', IDEIA_MARY, 'en'), hw = R.writerRateFor('hollywood', IDEIA_MARY, 'en')
    const m35 = R.minWordsFor(35, cl.wordsPerSecond, cl.coverage), m60 = R.minWordsFor(60, cl.wordsPerSecond, cl.coverage)
    return e1.chamadas.length === 1 && c1.engine === 'seedance' && c1.targetSeconds === 60 && c1.language === 'en' && c1.topic === IDEIA_MARY &&
      c2.engine === 'hollywood' && c2.targetSeconds === 35 && c2.language === 'pt' &&
      cl.wordsPerSecond === 3.1 && hw.wordsPerSecond === 2.3 && m35 >= 100 && m35 <= 115 && m60 >= 175 && m60 <= 195
  })

  // P3 — verbatim dali em diante
  await tenta('P3', async () => {
    const reg = registro()
    const out = await lib.escreverIdeiaNoServidor({ prompt: IDEIA_MARY, scriptMode: 'ai', engine: 'seedance', seconds: 35, language: 'en', escritor: escritorFalso(respOk(ROTEIRO_MARY)), registrar: reg })
    const narr = L.parse(out.prompt).narration
    const evento = reg.eventos.find((e) => e.name === lib.IDEIA_ESCRITA_EVENTO)
    // o defeito antigo: o filtro, com o pedido como contexto, apaga palavras da fala e deixa buraco
    const antigo = L.fid.removerDatasInventadas(FALA_ANTIGA_ANO, 'a mysterious disappearance in the mountains')
    return out.usar === true && out.outcome === 'used' && out.prompt.startsWith('[Idea: the mystery of the Mary Celeste ghost ship]\n') &&
      lib.ehIdeiaSolta({ prompt: out.prompt, scriptMode: 'ai' }) === false &&
      narr.includes('In 1872, the Mary Celeste was found drifting near the Azores') && narr.includes('Nine of the 1,701 barrels') &&
      narr === L.parse(ROTEIRO_MARY).narration &&
      evento && evento.metadata.outcome === 'used' && evento.metadata.version === 'meta95_ideia_1910' &&
      antigo.removidas.length > 0 && antigo.texto.startsWith('In the year, a mysterious disappearance')
  })

  // P4 — meta-texto
  await tenta('P4', async () => {
    const reais = ['The camera never lies.', 'There was no dialogue between the two nations for ten years.', 'A 30-second clip of the crash went viral.', 'He walked into the scene of the crime.', 'In 1872, the Mary Celeste was found drifting near the Azores.']
    const misto = ROTEIRO_MARY.replace('No storm. No blood. No bodies.', 'No storm. No blood. No bodies. The camera slowly pans across the empty deck.')
    const limpo = lib.roteiroSemMetaTexto(misto)
    const reg = registro()
    const todoMeta = await lib.escreverIdeiaNoServidor({ prompt: 'the lost submarine', scriptMode: 'ai', engine: 'seedance', seconds: 35, language: 'en', escritor: escritorFalso(respOk(ROTEIRO_TODO_META)), registrar: reg })
    const cenas = [{ voiceover: `The submarine vanished in 1968. ${META_5CB}`, caption: 'x' }, { voiceover: 'Ninety-nine men were aboard.', caption: 'y' }]
    const g = lib.cenasSemMetaTexto(cenas, (t) => 'L:' + t)
    return lib.ehMetaTextoDeFala(META_5CB) && lib.ehMetaTextoDeFala('Voiceover: the ship sinks.') && lib.ehMetaTextoDeFala('[Pexels: submarine]') &&
      lib.ehMetaTextoDeFala('Esta cena não tem narração, só imagens.') && lib.ehMetaTextoDeFala('Cut to black.') &&
      reais.every((f) => !lib.ehMetaTextoDeFala(f)) &&
      limpo.removidas.length === 1 && limpo.removidas[0] === 'The camera slowly pans across the empty deck.' && limpo.script === ROTEIRO_MARY &&
      todoMeta.usar === false && todoMeta.prompt === 'the lost submarine' && reg.eventos.some((e) => e.name === lib.IDEIA_ESCRITA_EVENTO && e.metadata.outcome === 'fallback') &&
      g.cenas.join() === '0' && cenas[0].voiceover === 'The submarine vanished in 1968.' && cenas[0].caption === 'L:The submarine vanished in 1968.' && cenas[1].voiceover === 'Ninety-nine men were aboard.' && cenas[1].caption === 'y'
  })

  // P5 — brief longo em 15 s
  await tenta('P5', async () => {
    const t1 = lib.temaParaOEscritor({ ideia: BRIEF_67431, seconds: 15, engine: 'seedance', language: 'en' })
    const t2 = lib.temaParaOEscritor({ ideia: BRIEF_LONGO_15S, seconds: 15, engine: 'seedance', language: 'en' })
    const t3 = lib.temaParaOEscritor({ ideia: 'Crie um vídeo de 1 minuto sobre o Titanic', seconds: 35, engine: 'kling', language: 'pt' })
    const t4 = lib.temaParaOEscritor({ ideia: 'the story of how a 30-second clip of the crash went viral', seconds: 15, engine: 'seedance', language: 'en' })
    const reg = registro()
    const e = escritorFalso(respOk(ROTEIRO_15S))
    const usado = await lib.escreverIdeiaNoServidor({ prompt: BRIEF_67431, scriptMode: 'ai', engine: 'seedance', seconds: 15, language: 'en', escritor: e, registrar: reg })
    const aviso = reg.eventos.find((x) => x.name === lib.IDEIA_TAMANHO_AVISO_EVENTO)
    const longo = await lib.escreverIdeiaNoServidor({ prompt: BRIEF_67431, scriptMode: 'ai', engine: 'seedance', seconds: 15, language: 'en', escritor: escritorFalso(respOk(ROTEIRO_15S_LONGO)) })
    return t1.tema === 'Create a 15-second story about a lighthouse keeper who discovers a message in a bottle that predicts the next storm.' && t1.segundosNoTexto === 45 && t1.duracaoAjustada && !t1.condensada &&
      t2.condensada && t2.tema.startsWith('Condense this whole story into a 15-second film of at most ') && t2.tema.includes('[Create a 15-second story about a lighthouse keeper') && t2.tema.trim().endsWith('ships.]') &&
      t3.tema === 'Crie um vídeo de 35 segundos sobre o Titanic' && t3.segundosNoTexto === 60 &&
      t4.tema === 'the story of how a 30-second clip of the crash went viral' && t4.segundosNoTexto === null &&
      e.chamadas[0].topic === t1.tema && usado.usar === true &&
      aviso && aviso.metadata.seconds_in_text === 45 && aviso.metadata.film_seconds === 15 && aviso.metadata.length_adjusted === true &&
      longo.usar === false && longo.motivo === 'longo_para_o_filme' && palavras(L.parse(ROTEIRO_15S_LONGO).narration) > 56
  })

  // P6 — piso do portão e fail-open
  await tenta('P6', async () => {
    const curto = ROTEIRO_MARY.split('\n').slice(0, 5).join('\n') // HOOK + MR1 + MR2 ≈ 40 palavras para 60 s
    const a = await lib.escreverIdeiaNoServidor({ prompt: IDEIA_MARY, scriptMode: 'ai', engine: 'seedance', seconds: 60, language: 'en', escritor: escritorFalso(respOk(curto)) })
    const b = await lib.escreverIdeiaNoServidor({ prompt: IDEIA_MARY, scriptMode: 'ai', engine: 'seedance', seconds: 60, language: 'en', escritor: escritorFalso('throw') })
    const c = await lib.escreverIdeiaNoServidor({ prompt: IDEIA_MARY, scriptMode: 'ai', engine: 'seedance', seconds: 60, language: 'en', escritor: escritorFalso({ status: 422, json: { error: 'x', reason: 'model_refused_topic' } }) })
    const d = await lib.escreverIdeiaNoServidor({ prompt: IDEIA_MARY, scriptMode: 'ai', engine: 'seedance', seconds: 35, language: 'en', escritor: escritorFalso(respOk(ROTEIRO_MARY)), registrar: async () => { throw new Error('banco fora') } })
    const e = escritorFalso(respOk(ROTEIRO_MARY))
    const reg = registro()
    const nao = await lib.escreverIdeiaNoServidor({ prompt: ROTEIRO_MARY, scriptMode: 'ai', engine: 'seedance', seconds: 60, language: 'en', escritor: e, registrar: reg })
    const p60 = lib.pisoDoPortao({ engine: 'seedance', seconds: 60, language: 'en' })
    const p35 = lib.pisoDoPortao({ engine: 'seedance', seconds: 35, language: 'en' })
    const h60 = lib.pisoDoPortao({ engine: 'hollywood', seconds: 60, language: 'en' })
    const narrMary = palavras(L.parse(ROTEIRO_MARY).narration)
    return a.usar === false && a.motivo === 'curto' && b.usar === false && b.motivo === 'writer_threw' && c.usar === false && c.motivo === 'writer_http_422' &&
      d.usar === true && nao.outcome === 'not_idea' && e.chamadas.length === 0 && reg.eventos.length === 0 &&
      h60 === Math.ceil(60 * 0.95 * 2.3 - 1e-9) && p60 >= 140 && p60 <= 170 && narrMary >= p35 && narrMary < p60 && a.prompt === IDEIA_MARY
  })

  // P7 — a linha da ideia nunca é falada
  await tenta('P7', () => {
    const ideia = 'Make a "spooky" story [dark] about NARRATOR: the Mary Celeste — "no one survived"'
    const p = lib.promptComRoteiro(ideia, ROTEIRO_MARY)
    const a = L.parse(p), b = L.parse(ROTEIRO_MARY)
    return p.startsWith('[Idea: Make a spooky story dark about NARRATOR: the Mary Celeste — no one survived]\n') && lib.mesmaFalaQueORoteiro(p, ROTEIRO_MARY) &&
      a.narration === b.narration && a.segments.length === b.segments.length && !a.narration.includes('Idea') && !a.narration.includes('spooky')
  })
  return r
}

// ── P: o código real ─────────────────────────────────────────────────────────────────────────────────────────────────
console.log('P. lib/meta95/ideiaNoEscritor.ts (código real, escritor falso)')
function carregarTudo(source) {
  const load = createOfflineLoader({ source })
  return { lib: load(F.lib), regua: load(F.regua), fid: load(F.fidelidade), parse: load('lib/scriptParser.ts').parseUserScript }
}
const real = await provas(carregarTudo(null))
for (const [k, v] of Object.entries(real)) checa(k, v)

// ── R: a rota ────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log('\nR. a rota do cinematic')
const rota = rd(F.rota)
const linhasMarcadas = rota.split('\n').filter((l) => l.includes(MARCA))
function provasDaRota(src) {
  const r = {}
  const iParse = src.indexOf('    const parsedScript = parseUserScript(prompt)\n')
  const iChamada = src.indexOf('    const ideiaNoEscritor = await escreverIdeiaNoServidor({')
  const iTroca = src.indexOf('    if (ideiaNoEscritor.usar) prompt = ideiaNoEscritor.prompt // ' + MARCA)
  const iVerbatim = src.indexOf('    const verbatim = (parsedScript.hasMarkers && parsedScript.segments.length > 0) || (userSaysVerbatim && !briefDetected)')
  const iBrief = src.indexOf('    const briefDetected = userSaysVerbatim && !parsedScript.hasMarkers && looksLikeBrief(prompt)')
  r.R1 = src.includes("import { escreverIdeiaNoServidor, cenasSemMetaTexto, CENA_META_TEXTO_EVENTO } from '@/lib/meta95/ideiaNoEscritor' // " + MARCA) &&
    src.includes("import { POST as escritorMarcadoDoGenerateScript } from '@/app/api/generate-script/route' // " + MARCA)
  // a troca vem ANTES do parse; o predicado da rota (que a lib espelha) segue o mesmo
  r.R2 = iChamada > 0 && iTroca > iChamada && iParse > iTroca && iBrief > iParse && iVerbatim > iBrief
  const chamada = iChamada > 0 ? src.slice(iChamada, src.indexOf('\n', iChamada)) : ''
  r.R3 = chamada.includes('prompt, scriptMode: body.script_mode, engine: typeof body.engine === \'string\' ? body.engine : null, seconds: duration, language: narrationLanguage.language') &&
    chamada.includes("escritorMarcadoDoGenerateScript(new NextRequest(new URL('/api/generate-script', req.url), { method: 'POST'") && chamada.includes('JSON.stringify(corpo)') &&
    chamada.includes("path: '/api/generate-video-cinematic'") && chamada.includes('generation_id: generationId')
  // o filtro anti-invenção da fala só existe no ramo verbatim=false (que a ideia escrita não visita mais); a guarda de meta-texto
  // roda só com verbatim=false (o roteiro do cliente nunca é tocado), depois dos construtores e do resgate de zero cenas, antes do L2B
  const iSe = src.indexOf('    if (verbatim) {\n      // #369')
  const iSenao = src.indexOf('    } else {\n      const generated = await generateScenes(', iSe)
  const iFiltro = src.indexOf('          const r = removerDatasInventadas(sc.voiceover, contextoFalaClassica)', iSenao)
  const iZero = src.indexOf('    if (scenes.length === 0 && prompt.trim().length > 0) {', iSenao)
  const iGuarda = src.indexOf('    if (!verbatim) { const metaDasCenas = cenasSemMetaTexto(scenes, shortCaptionFromVoiceover); if (metaDasCenas.removidas.length) void writeServerEvent({ name: CENA_META_TEXTO_EVENTO,', iSenao)
  const iL2B = src.indexOf('    // L2B - prefer the smart BrollPlan per-scene cinematic prompt when provided')
  r.R4 = iSe > iTroca && iSenao > iSe && iFiltro > iSenao && iZero > iFiltro && iGuarda > iZero && iL2B > iGuarda && src.slice(iGuarda, iL2B).split('\n').length === 2 && (src.match(/removerDatasInventadas\(sc\.voiceover/g) ?? []).length === 1
  return r
}
const rr = provasDaRota(rota)
for (const [k, v] of Object.entries(rr)) checa(k, v)
checa('R5 toda linha nova da rota carrega a marca (5 linhas: 2 imports, chamada, troca, guarda)', linhasMarcadas.length === 5, String(linhasMarcadas.length))
// desfaz: a rota sem as linhas marcadas = a base (pai do 1º commit com a marca)
{
  const SUP = await import(pathToFileURL(path.join(ROOT, F.desfaz)).href)
  // base = a origin/main do último merge desta entrega (2º pai do merge marcado mais novo); sem merge, o pai do 1º commit marcado
  let BASE = null
  try {
    const merges = git('log', '--format=%H', '--merges', '--grep=' + MARCA, 'HEAD').trim().split('\n').filter(Boolean)
    const shas = git('log', '--format=%H', '--grep=' + MARCA, 'HEAD').trim().split('\n').filter(Boolean)
    BASE = merges.length ? merges[0] + '^2' : shas.length ? shas[shas.length - 1] + '^' : 'HEAD'
  } catch { BASE = null }
  let base = null
  try { base = lf(git('show', `${BASE}:${F.rota}`)) } catch { base = null }
  checa(`R6 desfeitas as linhas marcadas, a rota = base ${String(BASE).slice(0, 10)}`, base !== null && SUP.semMeta95Ideia1910(rota, F.rota) === base)
  checa('R7 o desfaz é idempotente, só mexe na rota do cinematic e lança com a marca fora do lugar',
    SUP.semMeta95Ideia1910('a\nb', F.rota) === 'a\nb' && SUP.semMeta95Ideia1910('a\nb // ' + MARCA + '\nc', 'outro.ts') === 'a\nb // ' + MARCA + '\nc' &&
    (() => { try { SUP.semMeta95Ideia1910('a\nx // ' + MARCA + '\nc', F.rota); return false } catch { return true } })())
  const filmeRapido = rd('scripts/test-support/desfaz-filme-rapido-1710.mjs')
  const FR = await import(pathToFileURL(path.join(ROOT, 'scripts/test-support/desfaz-filme-rapido-1710.mjs')).href)
  const assunto = rd('scripts/test-support/desfaz-meta95-assunto-1910.mjs')
  checa('R8 encadeado: semMeta95Assunto1910 (chamado por semFilmeRapido1710) tira PRIMEIRO esta camada (a mais nova da rota) e linhaDoFilmeRapido1710 a aceita como "de depois da base"',
    assunto.includes('  texto = semMeta95Ideia1910(texto, p)') && assunto.includes("from './desfaz-meta95-ideia-1910.mjs'") && filmeRapido.includes("from './desfaz-meta95-ideia-1910.mjs'") &&
    FR.linhaDoFilmeRapido1710('+x // ' + MARCA) === true && FR.linhaDoFilmeRapido1710('+x') === false &&
    FR.semFilmeRapido1710(rota, F.rota) === FR.semFilmeRapido1710(SUP.semMeta95Ideia1910(rota, F.rota), F.rota))
  const trilha = rd('scripts/test-trilha-15s-1610.mjs')
  checa('R8b a reâncora do selo no guardião da trilha é uma linha só, marcada, e o desfaz a tira', trilha.split('\n').filter((l) => l.includes(MARCA)).length === 1 && !SUP.semMeta95Ideia1910(trilha, 'scripts/test-trilha-15s-1610.mjs').includes(MARCA))
  checa('R9 o roteirista (/api/generate-script) não foi tocado por esta entrega', !rd(F.script).includes(MARCA))
  const assuntos = (() => { try { return git('log', '--format=%s', '--grep=' + MARCA, 'HEAD').trim().split('\n').filter(Boolean) } catch { return [] } })()
  checa('R10 todo commit da entrega traz a marca e o selo da TRAVA 8.2 no assunto', assuntos.every((s) => s.includes('[TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]')), assuntos.find((s) => !s.includes('[TRAVA 8.2')) ?? '')
}

// ── M: mutantes ──────────────────────────────────────────────────────────────────────────────────────────────────────
console.log('\nM. mutantes (aplicados e VERMELHOS)')
const libFonte = lf(fs.readFileSync(path.join(ROOT, F.lib), 'utf8'))
const mutantesDaLib = [
  ['M1 predicado: "as is" vira ideia solta', 'P1', 'return !verbatim', 'return true'],
  ['M2 o escritor não recebe o tamanho do filme', 'P2', 'targetSeconds: args.seconds, engine })', 'targetSeconds: 60, engine })'],
  ['M3 sem motor não vira Seedance', 'P2', "export const MOTOR_PADRAO_DO_CINEMATIC = 'seedance'", "export const MOTOR_PADRAO_DO_CINEMATIC = 'hollywood'"],
  ['M4 o pedido não leva o roteiro (fala volta a ser escrita na rota)', 'P3', 'return { usar: true, prompt: novoPrompt,', 'return { usar: true, prompt: prompt,'],
  ['M5 a guarda de meta-texto esquece "voiceover"', 'P4', String.raw`  /\bvoice[\s-]?overs?\b/i,`, '  /ZZZ-nunca/,'],
  ['M6 meta-texto sai palavra a palavra (não a frase)', 'P4', "return { texto: frases.filter((f) => !ehMetaTextoDeFala(f, pistaSozinha)).join(' '), removidas }", "return { texto: String(texto ?? '').replace(/voice[\\s-]?over/gi, ''), removidas }"],
  ['M7 o tamanho pedido no texto não vira o do filme', 'P5', 'return { texto: saida, segundosNoTexto, ajustado: saida !== texto }', 'return { texto, segundosNoTexto, ajustado: false }'],
  ['M8 roteiro longo para o filme curto entra assim mesmo', 'P5', "if (!guardaSeedance.ok || !guardaMotor.ok) return nao('longo_para_o_filme')", 'void guardaSeedance; void guardaMotor'],
  ['M9 sem piso: roteiro curto entra', 'P6', "if (palavras < piso) return nao('curto')", 'void piso'],
  ['M10 o escritor que lança derruba o filme', 'P6', "return fallback('writer_threw', { error_name: e instanceof Error ? e.name : 'unknown' })", 'throw e'],
  ['M11 a ideia vai com aspas (vira rótulo/fala)', 'P7', String.raw`.replace(/[[\]"“”«»]/g, ' ')`, String.raw`.replace(/[[\]]/g, ' ')`],
]
for (const [nome, prova, de, para] of mutantesDaLib) {
  const aplicou = libFonte.includes(de)
  let r = null
  if (aplicou) {
    const mut = libFonte.replace(de, para)
    r = await provas(carregarTudo((rel, txt) => (rel === F.lib ? mut : txt)))
  }
  checa(`${nome} → ${prova} vermelho`, aplicou && r && r[prova] === false, aplicou ? '' : 'mutante não aplicou')
}
const mutantesDaRota = [
  ['M12 a troca do pedido depois do parse', 'R2', (s) => { const linha = '    if (ideiaNoEscritor.usar) prompt = ideiaNoEscritor.prompt // ' + MARCA + '\n'; return s.includes(linha) ? s.replace(linha, '').replace('    const parsedScript = parseUserScript(prompt)\n', '    const parsedScript = parseUserScript(prompt)\n' + linha) : null }],
  ['M13 o escritor deixa de ser o POST do generate-script', 'R3', (s) => (s.includes("escritorMarcadoDoGenerateScript(new NextRequest(new URL('/api/generate-script', req.url)") ? s.replace("escritorMarcadoDoGenerateScript(new NextRequest(new URL('/api/generate-script', req.url)", "escritorMarcadoDoGenerateScript(new NextRequest(new URL('/api/analyze-idea', req.url)") : null)],
  ['M14 a guarda de meta-texto sai do caminho antigo', 'R4', (s) => { const i = s.indexOf('    if (!verbatim) { const metaDasCenas = cenasSemMetaTexto('); return i > 0 ? s.slice(0, i) + s.slice(s.indexOf('\n', i) + 1) : null }],
  ['M15 a guarda de meta-texto passa a mexer no roteiro do cliente (verbatim)', 'R4', (s) => (s.includes('    if (!verbatim) { const metaDasCenas = cenasSemMetaTexto(') ? s.replace('    if (!verbatim) { const metaDasCenas = cenasSemMetaTexto(', '    if (true) { const metaDasCenas = cenasSemMetaTexto(') : null)],
]
for (const [nome, prova, fn] of mutantesDaRota) {
  const mut = fn(rota)
  checa(`${nome} → ${prova} vermelho`, mut !== null && mut !== rota && provasDaRota(mut)[prova] === false, mut === null ? 'mutante não aplicou' : '')
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
