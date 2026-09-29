// [TRAVA 8.2] KLING25-DESCRICOES — guardião: toda cena tem descrição e o fallback NUNCA é a fala (28/09/2026).
//
// FATO (render real 28/09 02:35 UTC, conta do fundador, Kling 2.5 60 s, 18 planos, 18/18 aceitos, filme 72 s, nota 9,5): o
// prompt submetido da cena 18 foi a NARRAÇÃO crua — "That's the thing about a monster like this It doesn't need to hit you
// to stop everything Follow for the next one" + sufixo faceless. As cenas 1-17 tinham descrição ("Wide shot of the stormy
// sea…"). O Kling desenhou um monstro literal (dinossauro) no fim de um filme sobre o furacão Polo. Log de ensaio anterior:
// "#441 cinematic descriptions: 12/12 scenes" — o descritor cobria 12; com 14-18 planos (KLING25-60S-TETO) a última
// cena ficava sem descrição e o chamador caía em stockSearchQuery = as palavras faladas (kling25VisualHint).
//
// Este guardião EXECUTA a lib real (lib/cinematic/sceneDescriptions.ts) e as fatias REAIS da rota (generateCinematicDescriptions
// + o bloco do chamador + o laço do supervisor fala×imagem), com um OpenAI falso que responde por roteiro (sem rede, sem
// banco, sem fornecedor, sem .env), e prova:
//   (1) lib pura: lotes (12 → 1 · 13 → 7+6 · 18 → 9+9), teto de tokens proporcional e ESPELHADO no inline da rota,
//       scrub de CTA/criatura só na fala, sujeito/cauda de uma descrição, enquadramento rotativo, assunto do filme;
//   (2) describeScenesCovered: lotes em paralelo, junção por índice REAL, re-pedido só das faltantes (1 tentativa), lote
//       que falha não derruba o outro;
//   (3) fatia real da rota, 18 cenas com 17 descrições (a fatia do render): a 18ª NÃO contém a fala, nem "Follow for the
//       next one", nem "monster"; contém o sujeito da 17ª com outro enquadramento; o re-pedido pediu SÓ a cena 18; o
//       teto de tokens de cada chamada cresce com o lote; re-pedido que responde é aceito;
//   (4) 12 cenas → idêntico ao de hoje: UMA chamada, mensagens byte-idênticas às da BASE (origin/main), nenhum fallback;
//   (5) descritor fora do ar (toda chamada lança): nenhuma cena sem prompt; CTA-only repete o assunto do filme; sem
//       "monster"; a rota não lança;
//   (6) supervisor fala×imagem: reescrita que devolve a cena de fallback à criatura/CTA é recusada; a de cena do modelo
//       (ou sem artefato) é aplicada — a lib do supervisor (compartilhada com o hollywood) fica byte-idêntica à base;
//   (7) mutantes: fallback = fala (rota e lib) → vermelho; sem lotes → vermelho; teto fixo 1000 de volta → vermelho;
//   (8) estático: os guardiões irmãos continuam válidos (laço de 2 tentativas; `await generateCinematicDescriptions(` só
//       depois de styleAnchor); hollywood intocado (speechImageAlign.ts e klingShots.ts idênticos à base; contagem de
//       hollywoodPath igual).
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { desfaz3x6KlingShots } from './test-support/desfaz-3x6-klingshots.mjs' // reancoragem de 29/09 ([TRAVA 8.2 — "vai" do 3x6])

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.log('  FALHOU: ' + n) } }
const transpila = (src) => ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
const BUILTINS = { JSON, Math, Number, Array, Object, Set, Map, String, Boolean, Promise, RegExp, Error }
const roda = (src, globals = {}) => {
  const exp = {}
  vm.runInNewContext(transpila(src), { exports: exp, console: { log() {}, warn() {}, error() {} }, ...BUILTINS, process: { env: {} }, ...globals })
  return exp
}
const fatia = (src, ini, fim) => { const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fim, a + ini.length); return b < 0 ? null : src.slice(a, b + fim.length) }
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const palavras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean)
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()

// BASE = o "antes" (sem o marcador) e CANDIDATO = o commit introdutor (memória "trava por diff fica verde ao mergear"):
// commit "[TRAVA 8.2] KLING25-DESCRICOES" mais antigo na história de HEAD → base = <sha>^; antes dele existir → HEAD/origin/main.
let BASE = null
let SHA = null
{
  try { const shas = git(['log', '--basic-regexp', '--format=%H', '--grep=^\\[TRAVA 8.2\\] KLING25-DESCRICOES', 'HEAD']).trim().split('\n').filter(Boolean); if (shas.length) SHA = shas[shas.length - 1] } catch { /* sem commit ainda */ }
  const candidatos = SHA ? [SHA + '^'] : []
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (!git(['show', `${ref}:app/api/generate-video-cinematic/route.ts`]).includes('KLING25-DESCRICOES')) { BASE = ref; break } } catch { /* tenta o próximo */ }
  }
  if (SHA && BASE !== SHA + '^') SHA = null
}
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'} · candidato: ${SHA ?? 'worktree'}`)
const rdBase = (p) => { if (!BASE) return null; try { return git(['show', `${BASE}:${p}`]).replace(/\r\n/g, '\n') } catch { return null } }
checa('a base (sem o marcador) está disponível para as comparações', Boolean(BASE))

const ROTA = 'app/api/generate-video-cinematic/route.ts'
const LIB = 'lib/cinematic/sceneDescriptions.ts'
const rota = rd(ROTA)
const libSrc = rd(LIB)
const rotaBase = rdBase(ROTA)
const S = roda(libSrc)
const K = roda(rd('lib/cinematic/klingShots.ts'))

// ═══ a fatia do render ═══
const FALA18 = "That's the thing about a monster like this. It doesn't need to hit you to stop everything. Follow for the next one."
const PISTA18 = K.kling25VisualHint(FALA18) // o que a rota põe em stockSearchQuery no verbatim do Kling 2.5
const D17 = 'Wide shot of the stormy sea under black clouds, slow aerial push-in, cold blue light, ominous mood'
const TOPICO = "Hurricane Polo didn't just hit the coast. It stopped it. " + FALA18
const ENQ = ['Aerial view over', 'Slow push-in on', 'Tracking shot along', 'Macro detail of', 'Low-angle view of', 'High shot of']
const descModelo = (n) => (n === 17 ? D17 : `${ENQ[n % ENQ.length]} the hurricane coast of scene ${n}, torn palms and grey surf, cold blue light`)
const cenas = (n) => Array.from({ length: n }, (_, i) => {
  const fala = i === n - 1 ? FALA18 : `Line ${i + 1}: the hurricane pushed water over the seawall and into the streets.`
  const pista = K.kling25VisualHint(fala)
  return { description: pista, voiceover: fala, caption: '', stockSearchQuery: pista, clipSeconds: 5 }
})
checa('a pista do verbatim (kling25VisualHint) é a fala crua: contém "monster" e "Follow for the next one"', /monster/.test(PISTA18) && /Follow for the next one/.test(PISTA18))

console.log('== (1) lib pura ==')
checa('12 cenas → 1 lote de 12 (idêntico ao de hoje)', eqJ(S.descriptionBatches(12), [Array.from({ length: 12 }, (_, i) => i)]))
checa('13 cenas → 2 lotes 7+6 · 18 → 9+9 · 14 → 7+7 · 0 → []', eqJ(S.descriptionBatches(13).map((l) => l.length), [7, 6]) && eqJ(S.descriptionBatches(18), [Array.from({ length: 9 }, (_, i) => i), Array.from({ length: 9 }, (_, i) => 9 + i)]) && eqJ(S.descriptionBatches(14).map((l) => l.length), [7, 7]) && eqJ(S.descriptionBatches(0), []))
checa('teto de tokens: n ≤ 8 → 1000 · 9 → 1010 · 12 → 1280 · 18 → 1820; nunca decresce', S.descriptionTokenBudget(1) === 1000 && S.descriptionTokenBudget(8) === 1000 && S.descriptionTokenBudget(9) === 1010 && S.descriptionTokenBudget(12) === 1280 && S.descriptionTokenBudget(18) === 1820 && Array.from({ length: 30 }, (_, i) => i + 1).every((n) => S.descriptionTokenBudget(n + 1) >= S.descriptionTokenBudget(n)))
checa('rota: max_tokens = Math.max(1000, 90 * scenes.length + 200) inline (espelho da lib, sem import na função — o visual-contract executa a função com o vm dele)', /max_tokens: Math\.max\(1000, 90 \* scenes\.length \+ 200\)/.test(rota))
checa('espelho lib ≡ rota para n = 1..18', Array.from({ length: 18 }, (_, i) => i + 1).every((n) => S.descriptionTokenBudget(n) === Math.max(1000, 90 * n + 200)))
checa('a base tinha max_tokens: 1000 fixo (a prova compara antes × depois)', Boolean(rotaBase) && /max_tokens: 1000,/.test(rotaBase) && !/max_tokens: 1000,/.test(rota))
const s18 = S.scrubSpeechArtifacts(PISTA18)
checa('scrub tira "a monster like this" e "Follow for the next one" da fala real da cena 18', !/monster|follow/i.test(s18) && /stop everything/.test(s18))
checa('scrub: "giant wave" (adjetivo) fica; "a giant like this" (substantivo) sai; "the beast" sai; "creature of the deep" solto fica', S.scrubSpeechArtifacts('a giant wave hit the pier') === 'a giant wave hit the pier' && !/giant/.test(S.scrubSpeechArtifacts('the sea became a giant like this')) && !/beast/.test(S.scrubSpeechArtifacts('the storm was the beast of the decade')) && /creature/.test(S.scrubSpeechArtifacts('creature of the deep')))
checa('scrub de CTA: subscribe / hit the like button / see you in the next one / stay tuned / link in bio', ['please subscribe for more', 'hit the like button now', 'see you in the next one', 'stay tuned for part two', 'link in bio'].every((t) => palavras(S.scrubSpeechArtifacts(`The storm passed. ${t}`)).length === 3))
checa('hasSpeechArtifacts: fala real = true · descrição do mar = false · "no other characters" = false', S.hasSpeechArtifacts(FALA18) && !S.hasSpeechArtifacts(D17) && !S.hasSpeechArtifacts('Slow push-in on the flooded harbor, no other characters, no animals'))
checa('isSpeechOnlyCta: "Follow for the next one." = true · fala do furacão = false', S.isSpeechOnlyCta('Follow for the next one.') && !S.isSpeechOnlyCta('Hurricane Polo formed over warm Pacific waters'))
checa('sceneSubjectOf tira o enquadramento: "the stormy sea under black clouds"', S.sceneSubjectOf(D17) === 'the stormy sea under black clouds')
checa('shotTailOf devolve luz/clima sem o movimento de câmera', S.shotTailOf(D17) === 'cold blue light, ominous mood')
checa('sceneSubjectOf com "Slow push-in on …", "The camera glides over …", "Aerial view over …"', S.sceneSubjectOf('Slow push-in on a flooded coastal street at dawn, debris floating') === 'a flooded coastal street at dawn' && S.sceneSubjectOf('The camera glides over rooftops torn by wind, grey light') === 'rooftops torn by wind' && S.sceneSubjectOf(descModelo(3)) === 'the hurricane coast of scene 3')
const fb17 = S.describeFromSubject(17, S.sceneSubjectOf(D17), S.shotTailOf(D17), D17)
checa('describeFromSubject(17, …) reaproveita o sujeito com OUTRO enquadramento e a mesma luz', fb17.includes('the stormy sea under black clouds') && fb17.includes('cold blue light') && !fb17.startsWith('Wide shot of') && S.FALLBACK_FRAMINGS.some((f) => fb17.startsWith(f)))
checa('describeFromSubject evita o enquadramento com que a fonte abre (índice 0 × "Wide shot of")', !S.describeFromSubject(0, 'the sea', '', 'Wide shot of the sea, dusk').startsWith('Wide shot of') && S.describeFromSubject(0, 'the sea', '', 'Aerial view of the sea').startsWith('Wide shot of'))
checa('subjectFromTopic: primeira sentença, sem colchetes/CTA/abertura retórica, ≤ 12 palavras', S.subjectFromTopic('[Pexels: storm] Did you know Hurricane Polo stopped an entire coast without touching it? Follow for more. Second sentence here.') === 'Hurricane Polo stopped an entire coast without touching it' && palavras(S.subjectFromTopic('one two three four five six seven eight nine ten eleven twelve thirteen fourteen.')).length === 12)
{
  const comp = S.completeSceneDescriptions({ descriptions: [...Array.from({ length: 17 }, (_, i) => descModelo(i + 1)), null], scenes: cenas(18).map((s) => ({ voiceover: s.voiceover, hint: s.stockSearchQuery })), topic: TOPICO })
  checa('lib, 18 cenas / 17 descrições: as 17 ficam como estão', comp.descriptions.slice(0, 17).every((d, i) => d === descModelo(i + 1)))
  checa('lib: a 18ª não contém a fala, nem "Follow for the next one", nem "monster"', !comp.descriptions[17].includes(PISTA18) && !/follow for the next one|monster/i.test(comp.descriptions[17]))
  checa('lib: a 18ª contém o sujeito da 17ª (o mar tempestuoso) com outro enquadramento e a mesma luz', comp.descriptions[17].includes('the stormy sea under black clouds') && comp.descriptions[17].includes('cold blue light') && !comp.descriptions[17].startsWith('Wide shot of'))
  checa('lib: relato = só a cena 18, fonte previous', eqJ(comp.fallbacks, [{ index: 17, source: 'previous' }]))
  const comp12 = S.completeSceneDescriptions({ descriptions: Array.from({ length: 12 }, (_, i) => descModelo(i + 1)), scenes: cenas(12).map((s) => ({ voiceover: s.voiceover, hint: s.stockSearchQuery })), topic: TOPICO })
  checa('lib, 12 cenas / 12 descrições: idêntico, sem fallback', comp12.fallbacks.length === 0 && comp12.descriptions.every((d, i) => d === descModelo(i + 1)))
  const comp1 = S.completeSceneDescriptions({ descriptions: [null, descModelo(2), descModelo(3)], scenes: cenas(3).map((s) => ({ voiceover: s.voiceover, hint: s.stockSearchQuery })), topic: TOPICO })
  checa('lib: cena 1 sem descrição usa a PRÓXIMA (source next), nunca a fala', comp1.fallbacks[0].source === 'next' && comp1.descriptions[0].includes('the hurricane coast of scene 2') && !comp1.descriptions[0].includes('seawall'))
  const compGap = S.completeSceneDescriptions({ descriptions: [descModelo(1), null, null, null, descModelo(5)], scenes: cenas(5).map((s) => ({ voiceover: s.voiceover, hint: s.stockSearchQuery })), topic: TOPICO })
  checa('lib: três cenas seguidas sem descrição saem com enquadramentos DIFERENTES entre si (nunca 3 prompts iguais)', new Set(compGap.descriptions.slice(1, 4)).size === 3 && compGap.descriptions.slice(1, 4).every((d) => d.includes('the hurricane coast of scene 1')))
  const compZero = S.completeSceneDescriptions({ descriptions: [null, null, null], scenes: [{ voiceover: 'Hurricane Polo formed over warm Pacific waters', hint: 'Hurricane Polo formed over warm Pacific waters' }, { voiceover: FALA18, hint: PISTA18 }, { voiceover: 'Follow for the next one.', hint: K.kling25VisualHint('Follow for the next one.') }], topic: TOPICO })
  checa('lib, descritor fora do ar: nenhuma cena sem prompt (≥ 3 palavras); nenhum traz CTA/monster', compZero.descriptions.every((d) => palavras(d).length >= 3 && !/monster|follow|subscribe/i.test(d)))
  checa('lib, descritor fora do ar: fala que é só CTA repete o assunto do filme', compZero.descriptions[2].includes("Hurricane Polo didn't just hit the coast") && compZero.fallbacks[2].source === 'film_subject')
  checa('lib, descritor fora do ar: pista própria entra só sem os artefatos (own_hint_scrubbed)', compZero.fallbacks[1].source === 'own_hint_scrubbed' && /stop everything/.test(compZero.descriptions[1]))
}

console.log('== (2) describeScenesCovered ==')
{
  const pedidos = []
  const ask = async (idx) => { pedidos.push([...idx]); if (idx.length === 9 && idx[0] === 9) return idx.slice(0, 8).map((i) => `desc ${i + 1}`); if (idx.length === 1) return []; return idx.map((i) => `desc ${i + 1}`) }
  const cov = await S.describeScenesCovered(18, ask)
  checa('18 cenas → 2 lotes (1-9 e 10-18) e re-pedido só da 18', cov.lotes === 2 && pedidos.length === 3 && eqJ(pedidos[0], Array.from({ length: 9 }, (_, i) => i)) && eqJ(pedidos[1], Array.from({ length: 9 }, (_, i) => 9 + i)) && eqJ(pedidos[2], [17]))
  checa('juntou por índice REAL: 17 preenchidas, 18ª nula; repedidas=[17], recuperadas=[]', cov.descriptions[0] === 'desc 1' && cov.descriptions[9] === 'desc 10' && cov.descriptions[16] === 'desc 17' && cov.descriptions[17] === null && eqJ(cov.repedidas, [17]) && eqJ(cov.recuperadas, []) && cov.erros.length === 0)
  const cov2 = await S.describeScenesCovered(18, async (idx) => (idx.length === 1 ? ['desc 18 again'] : idx.length === 9 && idx[0] === 9 ? idx.slice(0, 8).map((i) => `desc ${i + 1}`) : idx.map((i) => `desc ${i + 1}`)))
  checa('re-pedido que responde é aceito: recuperadas=[17], 18/18', cov2.descriptions[17] === 'desc 18 again' && eqJ(cov2.recuperadas, [17]) && cov2.descriptions.every(Boolean))
  const p12 = []
  const cov12 = await S.describeScenesCovered(12, async (idx) => { p12.push([...idx]); return idx.map((i) => `desc ${i + 1}`) })
  checa('12 cenas → 1 lote, 1 pedido, sem re-pedido', cov12.lotes === 1 && p12.length === 1 && cov12.repedidas.length === 0 && cov12.descriptions.every(Boolean))
  const pErr = []
  const covErr = await S.describeScenesCovered(18, async (idx) => { pErr.push([...idx]); if (pErr.length === 1) throw new Error('429 rate limit'); return idx.map((i) => `desc ${i + 1}`) })
  checa('lote que falha não derruba o outro: erro anotado, as 9 do lote caído re-pedidas de uma vez e preenchidas', covErr.erros.length === 1 && /429/.test(covErr.erros[0]) && pErr.length === 3 && eqJ(pErr[2], pErr[0]) && covErr.descriptions.every(Boolean) && covErr.recuperadas.length === 9)
  const covDead = await S.describeScenesCovered(18, async () => { throw new Error('down') })
  checa('descritor fora do ar: nunca lança; 18 nulas; 3 erros (2 lotes + re-pedido)', covDead.descriptions.every((d) => d === null) && covDead.erros.length === 3)
}

console.log('== (3) fatia real da rota: 18 cenas, 17 descrições (a fatia do render) ==')
const FN_INI = 'async function generateCinematicDescriptions('
const fnSrc = fatia(rota, FN_INI, '\n}\n')
const fnBase = rotaBase ? fatia(rotaBase, FN_INI, '\n}\n') : null
checa('função extraída; termina em `return best` (o vigia-descritor continua verde)', Boolean(fnSrc) && /\n  return best\n\}\n$/.test(fnSrc))
const CALL_INI = '    const cenasSemDescricaoDoModelo = new Set<number>()'
const CALL_FIM = "prompt visual nasceu do sujeito, nunca da fala: ${completas.fallbacks.map((f) => `cena ${f.index + 1} (${f.source})`).join(', ')}`)\n    }\n"
const callSrc = fatia(rota, CALL_INI, CALL_FIM)
checa('bloco do chamador extraído da rota', Boolean(callSrc) && callSrc.includes('await describeScenesCovered(scenes.length, async (numeros) => await generateCinematicDescriptions('))
const stubs = () => ({ visualDescriptionDirection: () => 'faceless documentary b-roll, no presenter', aspectSpec: () => ({ promptFraming: 'vertical 9:16 framing' }), NO_TEXT_OBJECT_DIRECTION: 'No text-bearing objects.' })
const fakeOpenai = (politica) => {
  const calls = []
  return { calls, chat: { completions: { create: async (input, opts) => {
    const user = input.messages[1].content
    const nums = [...user.matchAll(/^Scene (\d+):/gm)].map((m) => Number(m[1]))
    calls.push({ nums, max_tokens: input.max_tokens, messages: input.messages, opts })
    const descs = politica(nums, calls.length, user)
    if (descs === 'throw') throw new Error('429 rate limit')
    return { choices: [{ message: { content: JSON.stringify({ descriptions: descs }) } }] }
  } } } }
}
function montaRota(fn, call, lib) {
  const js = transpila(`${fn}\nexports.generateCinematicDescriptions = generateCinematicDescriptions\nexports.run = async (scenes, prompt, classicVisualPolicy, verbatim, planScenes, hollywoodPath) => {\n${call}\nreturn { scenes, semModelo: [...cenasSemDescricaoDoModelo] }\n}`)
  return (openai, logs) => {
    const exp = {}
    const L = lib ?? S
    vm.runInNewContext(js, { exports: exp, console: { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')), error() {} }, ...BUILTINS, process: { env: {} }, ...stubs(), openai, describeScenesCovered: L.describeScenesCovered, completeSceneDescriptions: L.completeSceneDescriptions, hasSpeechArtifacts: L.hasSpeechArtifacts })
    return exp
  }
}
const POLITICA = { mode: 'documentary_faceless', style: { look: 'photoreal', lookPhrase: '', suffix: '' }, character: null, aspect: '9:16' }
const rotaReal = montaRota(fnSrc, callSrc)
// (3a) o render: lote 10-18 devolve 8 (some a 18), re-pedido devolve vazio
const politicaRender = (nums) => (nums.length === 9 && nums[0] === 10 ? nums.slice(0, 8).map(descModelo) : nums.length === 1 && nums[0] === 18 ? [] : nums.map(descModelo))
{
  const oa = fakeOpenai(politicaRender); const logs = []
  const r = await rotaReal(oa, logs).run(cenas(18), TOPICO, POLITICA, true, [], false)
  const p18 = r.scenes[17].aiPrompt
  checa('rota: a 18ª NÃO contém a fala crua, nem "Follow for the next one", nem "monster"', typeof p18 === 'string' && !p18.includes(PISTA18) && !/follow for the next one|monster/i.test(p18))
  checa('rota: a 18ª contém o sujeito da 17ª com outro enquadramento', p18.includes('the stormy sea under black clouds') && !p18.startsWith('Wide shot of'))
  checa('rota: as 17 do modelo ficam byte-iguais', r.scenes.slice(0, 17).every((s, i) => s.aiPrompt === descModelo(i + 1)))
  checa('rota: a narração da 18ª NÃO foi tocada', r.scenes[17].voiceover === FALA18 && r.scenes[17].stockSearchQuery === PISTA18)
  const iniciais = oa.calls.filter((c) => c.nums.length === 9)
  checa('rota: 2 lotes iniciais em paralelo (1-9 e 10-18), rótulos com o número REAL da cena', iniciais.some((c) => eqJ(c.nums, [1, 2, 3, 4, 5, 6, 7, 8, 9])) && iniciais.some((c) => eqJ(c.nums, [10, 11, 12, 13, 14, 15, 16, 17, 18])))
  const rep = oa.calls.filter((c) => eqJ(c.nums, [18]))
  checa('rota: o re-pedido pediu SÓ a cena 18 (com a nota de lote "scenes 18 of a 18-scene film") e cobrou EXACTLY 1', rep.length >= 1 && rep.every((c) => /\(These are scenes 18 of a 18-scene film/.test(c.messages[1].content) && /EXACTLY 1 items/.test(c.messages[0].content)))
  checa('rota: o lote 10-18 cobrou a contagem na 2ª tentativa (laço de sempre) antes de o chamador cair no fallback', oa.calls.filter((c) => eqJ(c.nums, [10, 11, 12, 13, 14, 15, 16, 17, 18])).length === 2 && oa.calls.some((c) => /Your previous answer had 8 descriptions\. Return EXACTLY 9 descriptions/.test(c.messages[1].content)))
  checa('rota: teto de tokens de cada chamada = espelho(n do lote) e ≥ 1000; lote de 9 → 1010', oa.calls.every((c) => c.max_tokens === Math.max(1000, 90 * c.nums.length + 200) && c.max_tokens >= 1000) && iniciais.every((c) => c.max_tokens === 1010))
  checa('rota: nota de lote presente nos lotes (não é a chamada única de sempre)', iniciais.every((c) => /of a 18-scene film; the other scenes are described in a separate call/.test(c.messages[1].content)))
  checa('rota: só a cena 18 marcada como sem descrição do modelo (0-based 17)', eqJ(r.semModelo, [17]))
  checa('rota: log diz 17/18, 2 lotes, re-pedida 18 → 0 recuperada', logs.some((l) => /#441 cinematic descriptions: 17\/18 scenes \(2 lote\(s\); re-pedidas 18 → 0 recuperada\(s\)\)/.test(l)) && logs.some((l) => /KLING25-DESCRICOES: 1 cena\(s\) sem descrição do modelo .* cena 18 \(previous\)/.test(l)))
  checa('rota: a cadeia do prompt continua aiPrompt PRIMEIRO (a fala em stockSearchQuery nunca chega ao construtor quando há aiPrompt)', /const visualPrompt = scene\.aiPrompt \|\| scene\.stockSearchQuery \|\| scene\.description/.test(rota) && r.scenes.every((s) => typeof s.aiPrompt === 'string' && s.aiPrompt.length > 3))
}
// (3b) o re-pedido responde
{
  const oa = fakeOpenai((nums) => (nums.length === 9 && nums[0] === 10 ? nums.slice(0, 8).map(descModelo) : nums.length === 1 && nums[0] === 18 ? ['Slow push-in on the flooded harbor at night, cold blue light'] : nums.map(descModelo))); const logs = []
  const r = await rotaReal(oa, logs).run(cenas(18), TOPICO, POLITICA, true, [], false)
  checa('rota: re-pedido que responde vira a descrição da 18ª; nada marcado como fallback; log 18/18 … 1 recuperada', r.scenes[17].aiPrompt === 'Slow push-in on the flooded harbor at night, cold blue light' && r.semModelo.length === 0 && logs.some((l) => /18\/18 scenes \(2 lote\(s\); re-pedidas 18 → 1 recuperada\(s\)\)/.test(l)))
}
// (3c) prova direta: o teto cresce com 18 na função de sempre (sem lote)
{
  const oa = fakeOpenai((nums) => nums.map(descModelo)); const logs = []
  const api = rotaReal(oa, logs)
  await api.generateCinematicDescriptions(cenas(18), TOPICO, POLITICA)
  await api.generateCinematicDescriptions(cenas(12), TOPICO, POLITICA)
  checa('função direta: 18 cenas → max_tokens 1820 · 12 → 1280 (era 1000 fixo)', oa.calls[0].max_tokens === 1820 && oa.calls[1].max_tokens === 1280)
  if (fnBase) {
    const oaB = fakeOpenai((nums) => nums.map(descModelo))
    const apiB = roda(`${fnBase}\nexports.g = generateCinematicDescriptions`, { ...stubs(), openai: oaB })
    await apiB.g(cenas(18), TOPICO, POLITICA)
    checa('base: 18 cenas → max_tokens 1000 (o teto que não cabia)', oaB.calls[0].max_tokens === 1000)
  }
}

console.log('== (4) 12 cenas → idêntico ao de hoje ==')
{
  const oa = fakeOpenai((nums) => nums.map(descModelo)); const logs = []
  const r = await rotaReal(oa, logs).run(cenas(12), TOPICO, POLITICA, true, [], false)
  checa('12 cenas: UMA chamada, 12 rótulos 1..12, sem re-pedido, sem nota de lote', oa.calls.length === 1 && eqJ(oa.calls[0].nums, Array.from({ length: 12 }, (_, i) => i + 1)) && !/separate call/.test(oa.calls[0].messages[1].content))
  checa('12 cenas: nenhum fallback; aiPrompt = a descrição do modelo, cena a cena', r.semModelo.length === 0 && r.scenes.every((s, i) => s.aiPrompt === descModelo(i + 1)))
  checa('12 cenas: log 12/12 (1 lote(s))', logs.some((l) => /#441 cinematic descriptions: 12\/12 scenes \(1 lote\(s\)\)/.test(l)))
  if (fnBase) {
    const oaB = fakeOpenai((nums) => nums.map(descModelo))
    const apiB = roda(`${fnBase}\nexports.g = generateCinematicDescriptions`, { ...stubs(), openai: oaB })
    await apiB.g(cenas(12), TOPICO, POLITICA)
    checa('12 cenas: as MENSAGENS (system + user) são byte-idênticas às da base; só o teto de tokens subiu (1000 → 1280)', eqJ(oa.calls[0].messages, oaB.calls[0].messages) && oaB.calls[0].max_tokens === 1000 && oa.calls[0].max_tokens === 1280 && eqJ(oa.calls[0].opts, oaB.calls[0].opts))
  }
}

console.log('== (5) descritor fora do ar ==')
{
  const oa = fakeOpenai(() => 'throw'); const logs = []
  const scenesDead = [...cenas(3).slice(0, 2), { description: K.kling25VisualHint('Follow for the next one.'), voiceover: 'Follow for the next one.', caption: '', stockSearchQuery: K.kling25VisualHint('Follow for the next one.'), clipSeconds: 5 }]
  scenesDead[1] = { ...scenesDead[1], voiceover: FALA18, stockSearchQuery: PISTA18, description: PISTA18 }
  let lancou = false
  let r = null
  try { r = await rotaReal(oa, logs).run(scenesDead, TOPICO, POLITICA, true, [], false) } catch { lancou = true }
  checa('rota não lança; toda cena sai com aiPrompt de ≥ 3 palavras', !lancou && r && r.scenes.every((s) => palavras(s.aiPrompt).length >= 3))
  checa('rota: nenhum prompt traz "monster"/"follow"/"subscribe"; a cena só-CTA repete o assunto do filme', r && r.scenes.every((s) => !/monster|follow|subscribe/i.test(s.aiPrompt)) && r.scenes[2].aiPrompt.includes("Hurricane Polo didn't just hit the coast"))
  checa('rota: as 3 marcadas como sem descrição do modelo; log 0/3 com erros', r && eqJ(r.semModelo, [0, 1, 2]) && logs.some((l) => /#441 cinematic descriptions: 0\/3 scenes \(1 lote\(s\); re-pedidas 1,2,3 → 0 recuperada\(s\); erros: /.test(l)))
}

console.log('== (6) supervisor fala×imagem não devolve a cena de fallback à criatura/CTA ==')
{
  const ALIGN_INI = '        for (const c of alinhado.rewritten) {\n          // [TRAVA 8.2] KLING25-DESCRICOES'
  const alignSrc = fatia(rota, ALIGN_INI, '\n        }\n')
  checa('laço do supervisor (clássico) extraído com a guarda', Boolean(alignSrc) && /cenasSemDescricaoDoModelo\.has\(c\.index\) && hasSpeechArtifacts\(c\.shot\)/.test(alignSrc) && /scenes\[c\.index\]\.aiPrompt = scrubInventedSetting\(c\.shot, historiaAlinhada\)\.text/.test(alignSrc))
  const logs = []
  const exp = roda(`exports.run = (alinhado, scenes, cenasSemDescricaoDoModelo, historiaAlinhada) => {\n${alignSrc}\nreturn scenes }`, { console: { log() {}, warn: (...a) => logs.push(a.join(' ')), error() {} }, scrubInventedSetting: (t) => ({ text: t, removed: [] }), hasSpeechArtifacts: S.hasSpeechArtifacts })
  const scenesA = Array.from({ length: 18 }, (_, i) => ({ aiPrompt: `plano ${i + 1}` }))
  const out = exp.run({ rewritten: [
    { index: 17, shot: 'A giant monster rising from the sea, rain, dark sky' },
    { index: 3, shot: 'Close-up of rain hitting a window, cold light' },
    { index: 16, shot: 'A giant monster over the city' },
  ] }, scenesA, new Set([17, 16]), '')
  const out2 = exp.run({ rewritten: [{ index: 17, shot: 'Slow push-in on the flooded harbor at night, cold blue light' }] }, Array.from({ length: 18 }, (_, i) => ({ aiPrompt: `plano ${i + 1}` })), new Set([17]), '')
  checa('reescrita com criatura literal para cena de fallback é RECUSADA (plano do sujeito fica); cena do modelo é reescrita', out[17].aiPrompt === 'plano 18' && out[16].aiPrompt === 'plano 17' && out[3].aiPrompt === 'Close-up of rain hitting a window, cold light' && logs.filter((l) => /reescrita da cena (18|17) recusada/.test(l)).length === 2)
  checa('reescrita SEM artefato para cena de fallback é aplicada (o supervisor continua valendo)', out2[17].aiPrompt === 'Slow push-in on the flooded harbor at night, cold blue light')
  checa('a lib do supervisor (compartilhada com o hollywood) está byte-idêntica à base', rdBase('lib/cinematic/speechImageAlign.ts') === rd('lib/cinematic/speechImageAlign.ts'))
}

console.log('== (7) mutantes ==')
{
  // M1: chamador volta ao fallback antigo (a fala em stockSearchQuery)
  const callM1 = callSrc.replace('scenes = scenes.map((s, i) => ({ ...s, aiPrompt: completas.descriptions[i] }))', 'scenes = scenes.map((s, i) => ({ ...s, aiPrompt: cobertura.descriptions[i] ?? s.stockSearchQuery }))')
  checa('M1 aplicado', callM1 !== callSrc)
  const rM1 = await montaRota(fnSrc, callM1)(fakeOpenai(politicaRender), []).run(cenas(18), TOPICO, POLITICA, true, [], false)
  checa('M1 (fallback = fala na rota) é pego: a 18ª volta a trazer "monster" e "Follow for the next one"', /monster/.test(rM1.scenes[17].aiPrompt) && /Follow for the next one/.test(rM1.scenes[17].aiPrompt))
  // M2: lib devolve a narração no lugar do sujeito
  const libM2 = libSrc.replace('out.push(describeFromSubject(i, sceneSubjectOf(src), shotTailOf(src), src))', "out.push(String(input.scenes[i]?.voiceover ?? ''))")
  checa('M2 aplicado', libM2 !== libSrc)
  const rM2 = await montaRota(fnSrc, callSrc, roda(libM2))(fakeOpenai(politicaRender), []).run(cenas(18), TOPICO, POLITICA, true, [], false)
  checa('M2 (fallback = fala na lib) é pego: a 18ª é a narração literal', rM2.scenes[17].aiPrompt === FALA18)
  // M3: sem lotes
  const libM3 = libSrc.replace('export const DESCRIPTION_BATCH_MAX = 12', 'export const DESCRIPTION_BATCH_MAX = 99')
  const SM3 = roda(libM3)
  const oaM3 = fakeOpenai((nums) => nums.map(descModelo))
  await montaRota(fnSrc, callSrc, SM3)(oaM3, []).run(cenas(18), TOPICO, POLITICA, true, [], false)
  checa('M3 (sem lotes) é pego: 18 cenas numa chamada só', SM3.descriptionBatches(18).length === 1 && oaM3.calls.length === 1 && oaM3.calls[0].nums.length === 18)
  // M4: teto fixo de volta
  const fnM4 = fnSrc.replace('max_tokens: Math.max(1000, 90 * scenes.length + 200)', 'max_tokens: 1000')
  checa('M4 aplicado', fnM4 !== fnSrc)
  const oaM4 = fakeOpenai((nums) => nums.map(descModelo))
  await montaRota(fnM4, callSrc)(oaM4, []).generateCinematicDescriptions(cenas(18), TOPICO, POLITICA)
  checa('M4 (teto 1000 fixo) é pego: 18 cenas com max_tokens 1000', oaM4.calls[0].max_tokens === 1000 && oaM4.calls[0].max_tokens < S.descriptionTokenBudget(18))
  // M5: guarda do supervisor removida
  const ALIGN_INI = '        for (const c of alinhado.rewritten) {\n          // [TRAVA 8.2] KLING25-DESCRICOES'
  const alignM5 = fatia(rota, ALIGN_INI, '\n        }\n').replace(/          if \(cenasSemDescricaoDoModelo\.has\(c\.index\) && hasSpeechArtifacts\(c\.shot\)\) \{[^\n]*\n/, '')
  const expM5 = roda(`exports.run = (alinhado, scenes, cenasSemDescricaoDoModelo, historiaAlinhada) => {\n${alignM5}\nreturn scenes }`, { scrubInventedSetting: (t) => ({ text: t, removed: [] }), hasSpeechArtifacts: S.hasSpeechArtifacts })
  const outM5 = expM5.run({ rewritten: [{ index: 17, shot: 'A giant monster rising from the sea' }] }, Array.from({ length: 18 }, (_, i) => ({ aiPrompt: `plano ${i + 1}` })), new Set([17]), '')
  checa('M5 (sem a guarda do supervisor) é pego: o monstro volta pela reescrita', outM5[17].aiPrompt === 'A giant monster rising from the sea')
}

console.log('== (8) estático: irmãos válidos, hollywood intocado ==')
checa('rota importa a lib', /import \{ describeScenesCovered, completeSceneDescriptions, hasSpeechArtifacts, type DescriptionCoverage \} from '@\/lib\/cinematic\/sceneDescriptions'/.test(rota))
checa('a lib é pura (sem import)', !/^import /m.test(libSrc))
checa('laço de 2 tentativas continua (vigia-descritor): let best / for tentativa < 2 / EXACTLY ${scenes.length}', /let best: string\[\] = \[\]\n\s*for \(let tentativa = 0; tentativa < 2; tentativa\+\+\) \{/.test(rota) && /Return EXACTLY \$\{scenes\.length\} descriptions, one per scene, in order\./.test(rota))
checa('`await generateCinematicDescriptions(` aparece UMA vez, depois de styleAnchor (motores-r2-r6)', rota.split('await generateCinematicDescriptions(').length - 1 === 1 && rota.indexOf('const styleAnchor = deriveStyleAnchor(') < rota.indexOf('await generateCinematicDescriptions('))
checa('≤ 12 cenas: o chamador NÃO passa lote (chamada de sempre); lote só quando parcial', /numeros\.length === scenes\.length \? undefined : \{ numeros: numeros\.map\(\(n\) => n \+ 1\), total: scenes\.length \}/.test(rota))
checa('o bloco só roda no caminho clássico verbatim sem plano de b-roll (hollywood fora)', /const cenasSemDescricaoDoModelo = new Set<number>\(\)[^\n]*\n    if \(verbatim && planScenes\.length === 0 && !hollywoodPath\) \{/.test(rota))
// Reancorado 29/09 ([TRAVA 8.2 — "vai" do 3x6], KINEO-SEEDANCE-15S-3X6): klingShots.ts comparado com a generalização do
// alinhador assinado (passos como parâmetro, só para o Seedance 15 s) desfeita — qualquer outra alteração continua vermelha.
checa('hollywood intocado: klingShots.ts (fora a generalização do alinhador do 3x6) e speechImageAlign.ts idênticos à base; contagem de hollywoodPath igual; o align do hollywood (plan.scenes) igual', rdBase('lib/cinematic/klingShots.ts') === desfaz3x6KlingShots(rd('lib/cinematic/klingShots.ts')) && rdBase('lib/cinematic/speechImageAlign.ts') === rd('lib/cinematic/speechImageAlign.ts') && Boolean(rotaBase) && (rotaBase.split('hollywoodPath').length === rota.split('hollywoodPath').length) && rota.includes('const alinhado = await alignShotsToSpeech({ topic: prompt, scenes: idxs.map((i) => ({ voiceover: plan.scenes[i].voiceover ?? \'\', shot: plan.scenes[i].prompt })) })') && rotaBase.includes('const alinhado = await alignShotsToSpeech({ topic: prompt, scenes: idxs.map((i) => ({ voiceover: plan.scenes[i].voiceover ?? \'\', shot: plan.scenes[i].prompt })) })'))
checa('prosa Seedance/Veo tem a mesma origem de fala em pexelsQuery (o conserto é compartilhado, não só Kling)', /pexelsQuery: visualWords\.join\(' '\) \|\| 'cinematic documentary scene'/.test(rd('lib/cinematic/verbatimBeats.ts')))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
if (falhas.length) { console.log(falhas.map((f) => ' - ' + f).join('\n')); process.exit(1) }
