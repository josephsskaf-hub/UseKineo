// KINEO1-PRIMEIRO-FILME-VIDEO-2026-09-17 — guardião do pedido do fundador (17/09): "um pedaço de Seedance nas
// cenas fracas do primeiro vídeo… max 0.5 teto!!". Prova: (a) o orçamento é aritmética com o preço real da fal
// (US$ 0,13/clipe sem áudio) e nunca passa de US$ 0,50; (b) a escolha das cenas fracas nunca pega a cena 1 e
// segue a relevância do plano; (c) o encaixe abre a cena certa e desloca os seguintes; (d) a rota fast SUBMETE e
// não espera (0 de 142 hooks chegaram em 12 dias com a espera de 15 s), grava o evento com await; (e) o compose
// espera onde o tempo já existe, lê o evento pelo generation_id + user_id, encaixa e falha aberto.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
function load(file, env = {}) {
  const exports = {}
  const js = ts.transpileModule(rd(file), { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports, require: () => ({}), process: { env }, console, Math, Date, Number, Set, Map, Array, JSON, Promise, setTimeout, clearTimeout }, { filename: file })
  return exports
}

console.log('== (a) orçamento ==')
const C = load('lib/fastAiClips.ts')
checa('preço real da fal: 0,13/clipe (720p 5 s SEM áudio); still 0,03; teto 0,50', C.SEEDANCE_720P_5S_USD === 0.13 && C.FIRST_FILM_STILL_USD === 0.03 && C.FIRST_FILM_BUDGET_USD === 0.5)
checa('3 clipes + 3 stills = 0,48 ≤ 0,50 (o filme inteiro cabe no teto)', 3 * C.SEEDANCE_720P_5S_USD + C.FIRST_FILM_STILLS_WITH_CLIPS_MAX * C.FIRST_FILM_STILL_USD <= C.FIRST_FILM_BUDGET_USD + 1e-9 && C.FIRST_FILM_STILLS_WITH_CLIPS_MAX === 3)
checa('firstFilmAiClipCount: com 3 stills → 3 clipes; com 6 stills → 2; com 0 → 3 (teto de 3)', C.firstFilmAiClipCount(3) === 3 && C.firstFilmAiClipCount(6) === 2 && C.firstFilmAiClipCount(0) === 3)
checa('nasce LIGADO; KINEO_FIRST_FILM_AI_CLIPS=off desliga', C.FIRST_FILM_AI_CLIPS_ENABLED === true && load('lib/fastAiClips.ts', { KINEO_FIRST_FILM_AI_CLIPS: 'off' }).FIRST_FILM_AI_CLIPS_ENABLED === false)
checa('espera no compose ≤ 60 s (o TTS/Whisper já consumiu 30-60 s; Seedance fecha em 60-120 s)', C.FIRST_FILM_AI_CLIPS_AWAIT_MS === 60_000)

console.log('== (b) cenas fracas ==')
const notas = [{ scene: 1, relevance: 40 }, { scene: 2, relevance: 90 }, { scene: 3, relevance: 55 }, { scene: 4, relevance: 55 }, { scene: 5, relevance: 80 }]
checa('nunca a cena 1 (é o hook); pega as 2 mais fracas; empate → a mais tardia; devolve em ordem', JSON.stringify(C.pickWeakScenes(notas, 2)) === '[3,4]' && JSON.stringify(C.pickWeakScenes(notas, 1)) === '[4]')
checa('sem nota nenhuma (verbatim) → meio e fim do filme', JSON.stringify(C.pickWeakScenes([1, 2, 3, 4, 5, 6, 7].map((s) => ({ scene: s, relevance: null })), 2)) === '[4,7]')
checa('0 clipes ou só 1 cena → nada', C.pickWeakScenes(notas, 0).length === 0 && C.pickWeakScenes([{ scene: 1, relevance: 10 }], 2).length === 0)
checa('prompt da cena: sem rosto, movimento de câmera, sem texto; "girl" vira silhueta', /distant silhouetted figure/.test(C.buildSceneClipPrompt('a little girl with a rabbit', '', '')) && /slow camera movement/.test(C.buildSceneClipPrompt('bar interior', '', '')) && /no recognizable human faces/.test(C.buildSceneClipPrompt('', 'fala', 'query')))

console.log('== (c) encaixe ==')
const base = ['s1', 's2', 's3', 's4', 's5']
checa('clipe abre a cena: entra ANTES do índice; dois clipes deslocam certo; nulos ignorados', JSON.stringify(C.spliceAiClips(base, [{ scene: 1, at_index: 0, url: 'H', ms: 1 }, { scene: 3, at_index: 3, url: 'A', ms: 1 }, { scene: 5, at_index: 4, url: null, ms: 1 }])) === JSON.stringify(['H', 's1', 's2', 's3', 'A', 's4', 's5']))
checa('índice fora do alcance é preso ao fim; original intocado', C.spliceAiClips(base, [{ scene: 9, at_index: 99, url: 'Z', ms: 0 }]).at(-1) === 'Z' && base.length === 5)
checa('parsePendingAiClips: só linhas válidas, máximo 3', C.parsePendingAiClips({ clips: [{ request_id: 'r1', scene: 1, at_index: 0 }, { request_id: '', scene: 2, at_index: 1 }, { scene: 3, at_index: 2 }, { request_id: 'r4', scene: 4, at_index: 3 }, { request_id: 'r5', scene: 5, at_index: 4 }, { request_id: 'r6', scene: 6, at_index: 5 }] }).length === 3 && C.parsePendingAiClips(null).length === 0)

console.log('== (d) rota fast: submete, não espera ==')
const ft = rd('app/api/generate-video-fast/route.ts')
const iAligned = ft.indexOf('const alignedMeta: (BrollSceneMeta | undefined)[]')
const iSubmit = ft.indexOf('for (const sceneNo of pickWeakScenes(notas, extras))')
const iLoop = ft.indexOf('for (let idx = 0; idx < scenes.length; idx++) {')
checa('cenas fracas escolhidas DEPOIS do alinhamento do plano (notas) e ANTES do laço de clipes', iAligned > 0 && iSubmit > iAligned && iLoop > iSubmit)
checa('só no primeiro filme de conta gratuita (o mesmo sinal do hook) e com o interruptor', ft.includes('if (primeiroFilmeComClipes) {\n      if (!filmeDesenhado) aiStillsMax = Math.min(aiStillsMax, FIRST_FILM_STILLS_WITH_CLIPS_MAX)')) // KINEO1-FILME-DESENHADO-2026-09-21: desenho mantém still em toda cena
checa('extras = teto − 1 (a cena 1 é o hook); relevância vem de alignedMeta', ft.includes('const extras = Math.max(0, firstFilmAiClipCount(FIRST_FILM_STILLS_WITH_CLIPS_MAX) - 1)') && ft.includes("relevance: typeof alignedMeta[i]?.relevanceScore === 'number'"))
checa('a espera de 15 s só sobrevive com o interruptor DESLIGADO', ft.includes('const primeiroFilmeComClipes = !!aiHookHandle && FIRST_FILM_AI_CLIPS_ENABLED') && ft.includes('const deferAiClipsToCompose = primeiroFilmeComClipes') && ft.includes('if (aiHookHandle && !deferAiClipsToCompose) {'))
checa('evento pendente escrito com AWAIT (void antes do return morre na Vercel), com hook em at_index 0 e posição sobre o clip_urls ENTREGUE', ft.includes('await writeServerEvent({\n        name: FIRST_FILM_AI_CLIPS_EVENT,') && ft.includes('{ request_id: aiHookHandle.requestId, scene: 1, at_index: 0,') && ft.includes('at_index: keptBefore(sceneEvidence[c.scene - 1]?.from ?? 0)') && ft.indexOf('name: FIRST_FILM_AI_CLIPS_EVENT') > ft.indexOf('const generationId = randomUUID()'))

console.log('== (d2) KINEO1-MUNDO-DA-ENTIDADE — "vídeos próximos a ele", custo zero ==')
checa('cena com visual gerado (still ou Seedance) leva UM clipe de stock', ft.includes("const perScene = cenasComClipeIA.has(sceneNo) ? 1 : idx === 0 ? FAST_CLIPS_PER_SCENE + 1 : FAST_CLIPS_PER_SCENE") && ft.includes('cenasComClipeIA.add(sceneNo)') && ft.includes('const cenasComClipeIA = new Set<number>([...(primeiroFilmeComClipes ? [1] : []), ...aiClipsSubmitted.map((c) => c.scene)])'))
checa('filme de entidade nomeada e cena com visual gerado NÃO puxam do cofre (busca fresca)', ft.includes('if (!verbatim && !filmeDeEntidade && !cenasComClipeIA.has(sceneNo)) {\n            const vaultHits = await searchVault(') && ft.includes('const filmeDeEntidade = !!personagem'))
checa('dedupe por assinatura de tags (mesmo gráfico com outra URL); se todos repetem, fica o primeiro', ft.includes('const pixInedito = pixUrls.filter((u) => { const sig = tagSig(pixabayTagsForUrl(u)); return !sig || !usedTagSigs.has(sig) })') && ft.includes('const pixFinal = pixInedito.length > 0 ? pixInedito : cenasComClipeIA.has(sceneNo) ? [] : pixUrls.slice(0, 1)') && ft.includes('for (const pixUrl of pixFinal) {'))
const be = rd('lib/broll/broll-engine.ts')
checa('planejador: ENTITY WORLD RULE (mundo da entidade antes do vocabulário do nicho; nunca a mesma query em duas cenas)', be.includes('ENTITY WORLD RULE — when the video is about a named person, company or product') && be.includes('The niche vocabulary above (stock chart, coins, office, bank) is a LAST resort') && be.includes('Never reuse the same pexelsQuery in two scenes of the same video') && be.indexOf('ENTITY WORLD RULE') > be.indexOf('VISUAL WORLD (aesthetic pack for this niche)'))

console.log('== (e) compose: espera onde o tempo existe ==')
const cp = rd('app/api/compose/route.ts')
const iWhisper = cp.lastIndexOf('whisperWords = words')
const iMerge = cp.indexOf("if (quality === 'fast' && !avatarMode && generationId) {")
const iBuild = cp.indexOf('source = buildCreatomateSource({')
checa('bloco depois do Whisper e antes do montador; só Kineo 1 sem avatar', iWhisper > 0 && iMerge > iWhisper && iBuild > iMerge)
checa('lê o evento pelo nome + user_id + session_id (nunca pelo corpo do cliente)', cp.includes(".eq('name', FIRST_FILM_AI_CLIPS_EVENT)\n          .eq('user_id', authenticatedUserId)\n          .eq('session_id', generationId)"))
checa('espera com o teto da lib, encaixa e entrega ao montador', cp.includes('const ready = await awaitPendingAiClips(pending, FIRST_FILM_AI_CLIPS_AWAIT_MS)') && cp.includes('composeClipUrls = spliceAiClips(clipUrls, ready)') && cp.includes('clipUrls: composeClipUrls,'))
checa('falha aberta: catch devolve o clip_urls original; resultado vira evento fast_ai_clips_result', cp.includes("console.warn('[ai-clips] compose merge failed (non-blocking):'") && cp.includes('composeClipUrls = clipUrls\n      }') && cp.includes('name: FIRST_FILM_AI_CLIPS_RESULT_EVENT,'))
const hk = rd('lib/fastAiHook.ts')
checa('persistHookClip aceita pasta (ai-scene) com regex segura', hk.includes("folder: string = 'ai-hook',") && hk.includes("const safeFolder = /^[a-z0-9-]{1,32}$/.test(folder) ? folder : 'ai-hook'"))
checa('clipes de cena SEM áudio (é o que faz custar 0,13 e não 0,26)', rd('lib/fastAiClips.ts').includes("resolution: '720p', duration: '5', generate_audio: false"))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
