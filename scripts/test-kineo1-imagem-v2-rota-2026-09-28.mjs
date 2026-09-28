// KINEO1-IMAGEM-V2-2026-09-28 (parte B, commit [TRAVA 8.2]) — guardião da ROTA do Kineo 1 com a imagem nova ligada.
//
// Kineo 1 faz 93% dos filmes de cliente; desde 19/09 o juiz dá 53 na IMAGEM (63 de 131 filmes com 40). A parte A
// (67912def) e a B.1 (f8a43fb2) deixaram as peças prontas e inertes; este commit as liga em
// app/api/generate-video-fast/route.ts atrás de KINEO1_IMAGEM_V2. Este guardião EXECUTA as fatias reais da rota — os
// interruptores (constantes), as funções de apoio do topo do arquivo, o laço inteiro das cenas (do plano de buscas ao
// evento fast_ai_clips_pending), o bloco da instrução colada e o relatório do ensaio — com as libs reais
// (lib/kineo1/sceneQueries.ts, lib/fastAiClips.ts, lib/fastAiScene.ts, lib/kineo1/pastedBrief.ts, lib/scriptParser.ts)
// e só a rede falsa (Pixabay, cofre, fal, banco). Prova:
//   (a) planSceneQueries: UMA chamada por filme, antes do laço, com a busca do plano de B-roll de cada cena; nulo →
//       o filme sai com as buscas de hoje (sem plano de câmera) e a cena fraca ainda é medida pela origem;
//   (b) opções v2: Pixabay com { v2, headFallback, onReport }, cofre com { v2, sceneText, sceneNeedsPeople },
//       characterStoryName com { v2: true }; as buscas do plano vão NA FRENTE; a vírgula inventada sai;
//   (c) cena fraca DEPOIS da busca e clipe de IA DENTRO do laço (o pedido da cena k sai antes da busca da cena k+1),
//       a cena fraca fica com UM stock, o evento pendente leva replace_index = a posição desse stock no clip_urls
//       entregue, a duração é a de planAiClipForSlot, e o encaixe real (spliceAiClips) troca o stock pelo clipe;
//   (d) teto: hook + clipes + reserva dos stills ≤ US$ 0,65; nunca mais de 4 clipes de cena fraca; teto/orçamento
//       ficam registrados na evidência;
//   (e) evidência: origem (pool/cadeia/cofre/reciclado/ai), candidatos, sujeito/stockable, buscas inteiras;
//   (f) quem NÃO muda: conta sem clipe (não elegível), roteiro com [Pexels:], filme desenhado, e o interruptor
//       desligado (a rota volta ao caminho de 22c8e70e: nenhuma chamada nova, clipes escolhidos antes do laço);
//   (g) instrução colada: a fala do autor fica PALAVRA POR PALAVRA; briefing sem fala vira "a IA estrutura";
//       revisão pós-auditoria (28/09): 17dd0c7a (briefing com gancho/fecho entre aspas) vira "a IA estrutura" em vez de
//       filme cobrado lendo instrução; 8b23d27a narra só a fala do autor; roteiro de UM parágrafo segue verbatim;
//   (h) o ensaio (dry-run) mostra a instrução que saiu e as buscas do plano.
// REVISÃO 2 (28/09, FIX-REVISAO-2): (d) KINEO1-SEM-LACO — nenhum clipe de IA que o montador leria em laço: sem orçamento
//   para a duração sem laço a cena fica no stock ("budget_loop"; o recuo antigo comprava 5 s e reentrava), e o stock que a
//   troca tira não volta no vão/extensão/reciclagem seguinte; (g) KINEO1-BRIEF-PORTAO — roteiro de dicas para criador, uma
//   dica por linha, segue verbatim pelo bloco real da rota (os 3 casos do revisor: 60→35 s, brief_only, 422).
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
const J = (x) => JSON.stringify(x)
const r3 = (v) => Math.round(v * 1000) / 1000

// ── carregador das libs reais (mesmo desenho de scripts/test-kineo1-imagem-v2-2026-09-28.mjs) ──
const ALIAS = {
  './clipVault': 'lib/clipVault.ts', '@/lib/clipVault': 'lib/clipVault.ts',
  './pixabay': 'lib/pixabay.ts', '@/lib/pixabay': 'lib/pixabay.ts',
  '@/lib/aspect': 'lib/aspect.ts', './broll/aesthetic-score': 'lib/broll/aesthetic-score.ts',
}
function mundo({ stubs = {}, env = {} } = {}) {
  const cache = new Map()
  const quieto = { log: () => {}, warn: () => {}, error: () => {} }
  function carregar(id) {
    if (cache.has(id)) return cache.get(id).exports
    const mod = { exports: {} }
    cache.set(id, mod)
    const js = ts.transpileModule(rd(id), { compilerOptions: { module: 1, target: 9 } }).outputText
    const req = (m) => (m in stubs ? stubs[m] : ALIAS[m] ? carregar(ALIAS[m]) : {})
    vm.runInNewContext(js, { exports: mod.exports, module: mod, require: req, process: { env }, console: quieto, Math, Date, Number, Set, Map, Array, JSON, Object, RegExp, String, Promise, Buffer, Error, setTimeout, clearTimeout, URL, URLSearchParams, AbortSignal, AbortController }, { filename: id })
    return mod.exports
  }
  return { carregar }
}
const Q = mundo({ stubs: { '@/lib/openai': { openai: {} }, './clipVault': { vaultClipAsync: () => {} } } }).carregar('lib/kineo1/sceneQueries.ts')
const C = mundo({ stubs: { '@fal-ai/client': { fal: { config() {} } }, './fastAiHook': {} } }).carregar('lib/fastAiClips.ts')
const S = mundo().carregar('lib/fastAiScene.ts')
const PB = mundo().carregar('lib/kineo1/pastedBrief.ts')
const SP = mundo().carregar('lib/scriptParser.ts')

// ── as fatias reais da rota ──
const rota = rd('app/api/generate-video-fast/route.ts')
const cortar = (ini, fim) => { const a = rota.indexOf(ini); const b = a < 0 ? -1 : rota.indexOf(fim, a); return a < 0 || b < 0 ? null : rota.slice(a, b) }
const CONST = cortar('const FAST_CLIPS_PER_SCENE = 2', '// KINEO-AI-HOOK — bounded budget')
// KINEO1-BRIEF-COLADO-DESLIGADO-2026-09-28 — o filtro de instrução colada está DESLIGADO na rota: a fala própria segue
// palavra por palavra como na origin/main. A lógica continua exercitada abaixo com o interruptor LIGADO (para quando um
// portão que não erre voltar); a constante de produção é conferida à parte.
const CONST_BRIEF_ON = (CONST ?? '').replace('const KINEO1_BRIEF_COLADO = false', 'const KINEO1_BRIEF_COLADO = true')
const AJUDA = cortar('function sceneHasPeopleVocabulary(', '// PUSH #96 — the client recorded 1428')
const LACO = cortar('    // ═══ KINEO1-IMAGEM-V2-2026-09-28 — as buscas nascem da FALA', '    // Push #355 — Compute B-roll quality metrics')
const BRIEF = cortar('    const parsedScript = parseUserScript(prompt)\n', '    // ═══ KINEO-IDIOMA-DO-TEXTO-2026-09-12')
const LINHAS_FALA = cortar("    const ownScript = verbatim || body.script_mode === 'verbatim'\n", '    if (ownScript) {\n')
console.log('== âncoras da rota ==')
checa('KINEO1-BRIEF-COLADO-DESLIGADO: na rota o filtro de instrução colada está desligado — a fala própria é a de origin/main, palavra por palavra', CONST.includes('const KINEO1_BRIEF_COLADO = false') && CONST_BRIEF_ON !== CONST)
checa('fatias encontradas: interruptores, apoio, laço das cenas, instrução colada, fala própria', [CONST, AJUDA, LACO, BRIEF, LINHAS_FALA].every(Boolean))
checa('interruptores: imagem v2 ligada, regra 5 ligada, até 4 clipes de cena fraca, teto US$ 0,65 — e o compose lê hook + 4', /const KINEO1_IMAGEM_V2 = true\n/.test(CONST) && /const KINEO1_GATE_HEAD_FALLBACK = true\n/.test(CONST) && /const KINEO1_AI_WEAK_CLIPS_MAX = 4\n/.test(CONST) && /const KINEO1_AI_BUDGET_USD = 0\.65\n/.test(CONST) && C.AI_CLIPS_PER_FILM_MAX === 5)
checa('o plano de buscas é chamado UMA vez no texto do laço (antes do `for`), e o fechamento da cena roda no topo de cada cena e depois da última', (LACO.match(/await planSceneQueries\(/g) || []).length === 1 && LACO.indexOf('await planSceneQueries(') < LACO.indexOf('for (let idx = 0; idx < scenes.length; idx++) {') && LACO.includes('for (let idx = 0; idx < scenes.length; idx++) {\n      await fecharCenaV2()') && LACO.indexOf('    await fecharCenaV2() // KINEO1-IMAGEM-V2 — a última cena') > LACO.indexOf('for (let idx = 0;'))

const PARAMS = ['planSceneQueries', 'scenes', 'alignedMeta', 'contextoDoPlano', 'verbatim', 'prosaVerbatim', 'duration', 'ownScript', 'falaPropria', 'fastRate',
  'fastAiScenesMax', 'fastStillSeed', 'prompt', 'characterStoryName', 'CHARACTER_STORY_MAX_STILLS', 'primeiroFilmeDaConta', 'FIRST_FILM_MAX_STILLS', 'filmeDesenhado',
  'aiHookHandle', 'FIRST_FILM_AI_CLIPS_ENABLED', 'CHARACTER_STORY_STILLS_WITH_CLIPS_MAX', 'FIRST_FILM_STILLS_WITH_CLIPS_MAX', 'firstFilmAiClipCount', 'pickWeakScenes',
  'buildSceneClipPrompt', 'desenhoLook', 'submitSceneClip', 'generateFastSceneStill', 'buildFastStillPrompt', 'aspect', 'FIRST_FILM_STILL_USD', 'SEEDANCE_720P_5S_USD',
  'planAiClipForSlot', 'weakSceneReason', 'pixabayTagsForUrl', 'notePickedClipTags', 'pickLibraryClips', 'splitCommaQueries', 'planFirstQueries', 'decideFastAiScene',
  'searchVault', 'getPixabayClipsForScene', 'writeServerEvent', 'user', 'awaitAiHook', 'persistHookClip', 'AI_HOOK_AWAIT_BUDGET_MS', 'recordFastFailure', 'NextResponse',
  'randomUUID', 'FAST_SCENE_PLAN_EVENT', 'FIRST_FILM_AI_CLIPS_EVENT', 'FIRST_FILM_BUDGET_USD', 'AI_CLIPS_PER_FILM_MAX', 'briefColado', 'process']
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console: { log: () => {}, warn: () => {}, error: () => {} }, JSON, Math, Set, Map, Array, Number, String, Object, RegExp, Promise, Error, ...globals }); return exp }
function montarLaco(constSrc = CONST) {
  const src = `${constSrc}\n${AJUDA}\nexport async function rodar(ctx: any) {\n  const { ${PARAMS.join(', ')} } = ctx\n${LACO}\n  return { clipUrls, clipSources, sceneEvidence, aiClipsSubmitted, filtered, personagem, planoCenas, gastoIaUsd, reservaStillsUsd, generationId, filmeEstimadoS }\n}`
  return roda(src, { PEOPLE_LIFESTYLE_RE: /\b(people|person|man|woman|men|women|businessman)\b/i }).rodar
}

// ── o filme de prova: 7 cenas, 60 s, modo IA. Cada cena exercita uma origem do stock ──
const CENAS = [
  { vo: 'S1 The cone snail hides in the reef and waits.', q: 'close-up macro cone snail on coral', plan: { subject: 'cone snail', queries: ['cone snail reef', 'cone snail shell'], stockable: true, aiPrompt: 'A cone snail on a reef.' } },
  { vo: 'S2 A burger from a Parisian diner, drenched in anchovy.', q: 'parisian diner', plan: { subject: 'burger', queries: ['burger diner plate', 'burger close'], stockable: true, aiPrompt: 'A greasy burger on a diner plate, steam rising.' } },
  { vo: 'S3 Cold water triggers a 300 percent spike in norepinephrine.', q: 'dopamine norepinephrine brain', plan: { subject: 'cold water', queries: ['cold water plunge'], stockable: true, aiPrompt: 'A person plunging into icy water, bubbles.' } },
  { vo: 'S4 Wolf tracks cross the fresh snow under the moon.', q: 'close-up macro wolf tracks snow moonlight', plan: { subject: 'wolf tracks', queries: ['wolf tracks snow'], stockable: true, aiPrompt: 'Wolf tracks in fresh snow at night.' } },
  { vo: 'S5 Jeff Bezos preferred to start the day with eggs and toast.', q: 'businessman breakfast', broll: 'space needle, eggs breakfast table, skyline', plan: { subject: 'breakfast', queries: ['businessman eating breakfast', 'eggs toast plate', 'breakfast table morning'], stockable: false, aiPrompt: 'A businessman eating eggs and toast at dawn.' } },
  { vo: 'S6 The tiger stalks through the jungle at dusk.', q: 'tiger stalking jungle', plan: { subject: 'tiger', queries: ['tiger stalking jungle'], stockable: true, aiPrompt: 'A tiger in the jungle.' } },
  { vo: 'S7 And at the end, only the lighthouse keeps its light on.', q: 'lighthouse night', plan: { subject: 'lighthouse', queries: ['lighthouse night sea'], stockable: false, aiPrompt: 'A lone lighthouse at night.' } },
]
const TAGS_POOL = { S1: 'coral, reef, sea, fish, underwater', S2: 'paris, fountain, city, square, france', S4: null, S5: 'breakfast, eggs, toast, plate, table', S6: 'tiger, jungle, predator, stalking', S7: 'lighthouse, sea, night, coast' }
function filme(o = {}) {
  const linha = []
  const tags = new Map()
  const chamadas = { plan: [], pix: [], vault: [], submit: [], chars: [], eventos: [] }
  let n = 0
  const cenas = CENAS.map((c) => ({ description: `scene about ${c.q}`, searchKeywords: c.q, stockSearchQuery: c.q, voiceover: c.vo, caption: c.vo.slice(0, 20), visualCategory: 'general_documentary', scenePurpose: 'EXPLANATION' }))
  const ctx = {
    planSceneQueries: async (entrada, contexto) => { chamadas.plan.push({ entrada, contexto }); linha.push('plan'); return o.planoNulo ? null : CENAS.map((c, i) => ({ ...c.plan, ...(o.planos?.[i] ?? {}) })) },
    scenes: cenas,
    alignedMeta: CENAS.map((c) => (c.broll ? { pexelsQuery: c.broll, pexelsQueries: [c.broll, c.q] } : undefined)),
    contextoDoPlano: { language: 'en', topic: 'deadly animals and odd facts' },
    verbatim: o.verbatim ?? false, prosaVerbatim: false, duration: 60, ownScript: false, falaPropria: '', fastRate: { wordsPerSecond: 2.6 },
    fastAiScenesMax: S.fastAiScenesMax, fastStillSeed: S.fastStillSeed, prompt: 'deadly animals and odd facts',
    characterStoryName: (t, op) => { chamadas.chars.push(op ?? null); return S.characterStoryName(t, op) },
    CHARACTER_STORY_MAX_STILLS: S.CHARACTER_STORY_MAX_STILLS, primeiroFilmeDaConta: false, FIRST_FILM_MAX_STILLS: S.FIRST_FILM_MAX_STILLS, filmeDesenhado: o.desenho ?? false,
    aiHookHandle: o.semHook ? null : { requestId: 'hook-1', prompt: 'HOOK PROMPT about deadly animals' }, FIRST_FILM_AI_CLIPS_ENABLED: true,
    CHARACTER_STORY_STILLS_WITH_CLIPS_MAX: C.CHARACTER_STORY_STILLS_WITH_CLIPS_MAX, FIRST_FILM_STILLS_WITH_CLIPS_MAX: C.FIRST_FILM_STILLS_WITH_CLIPS_MAX, firstFilmAiClipCount: C.firstFilmAiClipCount, pickWeakScenes: C.pickWeakScenes,
    buildSceneClipPrompt: C.buildSceneClipPrompt, desenhoLook: null,
    submitSceneClip: async (prompt, seconds) => { n++; chamadas.submit.push({ prompt, seconds }); linha.push('submit'); return o.submitFalha ? null : `req-${n}` },
    generateFastSceneStill: async () => null, buildFastStillPrompt: S.buildFastStillPrompt, aspect: '9:16',
    FIRST_FILM_STILL_USD: C.FIRST_FILM_STILL_USD, SEEDANCE_720P_5S_USD: C.SEEDANCE_720P_5S_USD, planAiClipForSlot: C.planAiClipForSlot, weakSceneReason: Q.weakSceneReason,
    pixabayTagsForUrl: (u) => tags.get(u) ?? null, notePickedClipTags: (u, t) => { tags.set(u, t) },
    pickLibraryClips: () => [{ url: 'https://lib/fallback.mp4', tags: ['city'] }],
    splitCommaQueries: Q.splitCommaQueries, planFirstQueries: Q.planFirstQueries, decideFastAiScene: S.decideFastAiScene,
    searchVault: async (q, op) => {
      const cena = (CENAS.findIndex((c) => op?.sceneText === c.vo || (!op?.v2 && q && (c.q === q || c.plan.queries.includes(q)))) + 1) || 0
      chamadas.vault.push({ q, op }); linha.push(`vault:${cena}`)
      if (cena !== 4 || o.semCofre) return []
      const hits = [1, 2].slice(0, op?.limit ?? 2).map((k) => ({ storageUrl: `https://supa/broll/vault/lobo${k}.mp4`, tags: 'wolf, tracks, snow, winter', score: 20, durationSec: 12 }))
      return hits
    },
    getPixabayClipsForScene: async (queries, needsPeople, hint, op) => {
      const cena = CENAS.findIndex((c) => hint.startsWith(c.vo.slice(0, 3))) + 1
      chamadas.pix.push({ cena, queries, op }); linha.push(`pix:${cena}`)
      const t = { ...TAGS_POOL, ...(o.tags ?? {}) }[`S${cena}`]
      if (!t) { op?.onReport?.({ origin: 'none', queries, picks: [] }); return [] }
      const urls = Array.from({ length: op?.maxClips ?? 2 }, (_, k) => `https://cdn.pixabay.com/v/s${cena}-${k}.mp4`)
      for (const u of urls) tags.set(u, t)
      op?.onReport?.({ origin: 'pool', queries, picks: urls.map((u) => ({ url: u, tags: t, score: 40, query: queries[0] })), candidates: [{ tags: t, score: 40, query: queries[0] }, { tags: 'other, clip', score: 22, query: queries[0] }] })
      return urls
    },
    writeServerEvent: async (e) => { chamadas.eventos.push(e); return true }, user: { id: 'u1' },
    awaitAiHook: async () => null, persistHookClip: async () => null, AI_HOOK_AWAIT_BUDGET_MS: 15000, recordFastFailure: () => {},
    NextResponse: { json: (b, i) => ({ status: i?.status ?? 200, body: b }) }, randomUUID: () => 'gen-1',
    FAST_SCENE_PLAN_EVENT: 'fast_scene_plan', FIRST_FILM_AI_CLIPS_EVENT: C.FIRST_FILM_AI_CLIPS_EVENT, FIRST_FILM_BUDGET_USD: C.FIRST_FILM_BUDGET_USD, AI_CLIPS_PER_FILM_MAX: C.AI_CLIPS_PER_FILM_MAX,
    briefColado: null, process: { env: {} },
  }
  return { ctx, linha, chamadas, tags }
}
const evento = (ch, nome) => ch.eventos.find((e) => e.name === nome)
const somaUsd = (clips) => r3(clips.reduce((a, c) => a + c.usd, 0))

console.log('== (a)(b) plano de buscas, opções v2 e ordem das buscas ==')
const rodar = montarLaco()
const F = filme()
const R = await rodar(F.ctx)
checa('o filme sai (sem 502) com clip_urls entregue', Array.isArray(R.filtered) && R.filtered.length >= 7)
checa('planSceneQueries: UMA chamada, com as 7 falas e a busca do plano de B-roll de cada cena (a da cena 5 é a da vírgula), antes de qualquer busca', F.chamadas.plan.length === 1 && F.chamadas.plan[0].entrada.length === 7 && F.chamadas.plan[0].entrada[4].planQuery === 'space needle, eggs breakfast table, skyline' && F.chamadas.plan[0].entrada[0].voiceover === CENAS[0].vo && F.linha[0] === 'plan')
checa('Pixabay com { v2: true, headFallback: true, onReport } e o modo ficção de sempre (strictSubject)', F.chamadas.pix.length > 0 && F.chamadas.pix.every((c) => c.op.v2 === true && c.op.headFallback === true && typeof c.op.onReport === 'function' && c.op.strictSubject === false && c.op.exact === false))
checa('cofre com { v2: true, sceneText = a fala, sceneNeedsPeople }', F.chamadas.vault.length > 0 && F.chamadas.vault.every((c) => c.op.v2 === true && typeof c.op.sceneText === 'string' && CENAS.some((x) => x.vo === c.op.sceneText) && typeof c.op.sceneNeedsPeople === 'boolean'))
checa('characterStoryName com { v2: true } (Google/Earth/Moon deixam de ser personagem)', J(F.chamadas.chars) === J([{ v2: true }]))
const pix = (cena) => F.chamadas.pix.find((c) => c.cena === cena)
checa('as buscas do plano novo vêm NA FRENTE; a busca de hoje segue depois, SEM o plano de câmera; no máximo 4 por cena (a cadeia de reserva tenta todas)', F.chamadas.pix.every((c) => c.queries.length <= 4) && F.chamadas.pix.some((c) => c.queries.length === 4) && J(pix(1).queries.slice(0, 2)) === J(['cone snail reef', 'cone snail shell']) && pix(1).queries.includes('cone snail on coral') && !pix(1).queries.some((q) => /close-up|macro/.test(q)))
// A guarda do gancho guardava a string INTEIRA quando UM token batia ("eggs"): a vírgula agora só deixa o pedaço da fala.
checa('a vírgula inventada ("space needle, … skyline" para os ovos do Bezos) não chega à Pixabay; o pedaço que a fala menciona fica', !J(pix(5).queries).includes('space needle') && !J(pix(5).queries).includes('skyline') && pix(5).queries.includes('eggs breakfast table') && pix(5).queries[0] === 'businessman eating breakfast')
checa('a busca que valeu (ev.query) é a primeira do plano novo', R.sceneEvidence[1].query === 'burger diner plate')

console.log('== (c)(d) cena fraca depois da busca, clipe DENTRO do laço, troca, teto ==')
const pend = evento(F.chamadas, C.FIRST_FILM_AI_CLIPS_EVENT)
const clips = pend?.metadata?.clips ?? []
checa('evento pendente: hook + os clipes das cenas fracas pedidos dentro do laço', clips[0]?.request_id === 'hook-1' && clips[0]?.at_index === 0 && clips.length === 1 + R.aiClipsSubmitted.length && R.aiClipsSubmitted.length >= 1)
const iSub = F.linha.indexOf('submit')
checa('o pedido do clipe da cena 2 sai DEPOIS da busca da cena 2 e ANTES da busca da cena 3 (dentro do laço)', iSub > F.linha.indexOf('pix:2') && iSub < F.linha.indexOf('pix:3'))
const c2 = clips.find((c) => c.scene === 2) ?? {}
checa('cena 2 (Paris no lugar do hambúrguer: sujeito não é tag exata) pede clipe no modo TROCA, com replace_index e segundos', !!c2.request_id && typeof c2.replace_index === 'number' && typeof c2.seconds === 'number' && R.sceneEvidence[1].weak === 'subject_not_exact')
checa('replace_index aponta para o stock da cena 2 no clip_urls ENTREGUE, e a cena ficou com UM stock', R.filtered[c2.replace_index] === 'https://cdn.pixabay.com/v/s2-0.mp4' && !R.filtered.includes('https://cdn.pixabay.com/v/s2-1.mp4') && R.clipSources.slice(R.sceneEvidence[1].from, R.sceneEvidence[2].from).length === 1)
const esperado2 = C.planAiClipForSlot({ filmSeconds: Math.min(90, Math.max(61.5, Math.max(60, CENAS.map((c) => c.vo).join(' ').split(/\s+/).filter(Boolean).length / 2.6) * 1.1)), clipCount: c2.replace_index + 1 + (7 - 2), index: c2.replace_index, maxUsd: r3(0.65 - 0.13 - R.reservaStillsUsd) })
checa('a duração e o custo são os de planAiClipForSlot (sem laço na volta de reciclagem) e a fal recebe esses segundos', esperado2.mode === 'replace' && c2.seconds === esperado2.seconds && c2.usd === esperado2.usd && F.chamadas.submit[0]?.seconds === esperado2.seconds)
const pronto = [{ scene: 1, at_index: 0, url: 'HOOK', ms: 1 }, ...clips.slice(1).map((c) => ({ scene: c.scene, at_index: c.at_index, url: `AI${c.scene}`, ms: 1, ...(typeof c.replace_index === 'number' ? { replace_index: c.replace_index } : {}) }))]
const final = C.spliceAiClips(R.filtered, pronto)
checa('encaixe real: o hook abre o filme, o clipe da cena 2 SUBSTITUI o stock dela (o stock some) e a contagem só cresce pelas inserções', final[0] === 'HOOK' && final.includes('AI2') && !final.includes('https://cdn.pixabay.com/v/s2-0.mp4') && final.length === R.filtered.length + pronto.filter((p) => typeof p.replace_index !== 'number').length)
const c3 = clips.find((c) => c.scene === 3) ?? null
// KINEO1-SEM-LACO-2026-09-28 (FIX-REVISAO-2) — a revisão 2 provou este caso: reentries=3, 11 s necessários, US$ 0,144 livres,
// e a rota comprava um clipe de 5 s que o montador relia de 3,3 s a 5,96 s (loop:true). Agora a cena fica no stock.
checa('cena 3 (o banco não deu nada: clipe RECICLADO) é fraca por no_stock; o teto não paga os 11 s que cobrem a reentrada → a cena fica no stock ("budget_loop"), NENHUM clipe de 5 s comprado', R.sceneEvidence[2].stock_origin === 'recycled' && R.sceneEvidence[2].weak === 'no_stock' && R.sceneEvidence[2].ai_clip?.skipped === 'budget_loop' && c3 === null && F.chamadas.submit.every((s) => typeof s.seconds === 'number'))
checa('sem laço: todo clipe de cena fraca pedido é TROCA com a duração que cobre a pior reentrada (nenhuma inserção de 5 s)', clips.length > 1 && clips.slice(1).every((c) => typeof c.replace_index === 'number' && typeof c.seconds === 'number' && c.seconds >= C.planAiClipForSlot({ filmSeconds: R.filmeEstimadoS, clipCount: c.replace_index + 1 + (7 - c.scene), index: c.replace_index, maxUsd: 99 }).seconds))
checa('teto duro: hook + clipes + reserva dos stills ≤ US$ 0,65; o que não coube ficou registrado como "budget" (ou "budget_loop", quando a fatia reentra)', r3(somaUsd(clips) + R.reservaStillsUsd) <= 0.65 && R.sceneEvidence.filter((e) => e.ai_clip?.skipped === 'budget' || e.ai_clip?.skipped === 'budget_loop').length >= 1 && pend.metadata.budget_usd === 0.65)
checa('a reserva é a dos 3 stills do híbrido que um 1º filme com clipes ainda pode gerar (3 × US$ 0,03), e sai do orçamento dos clipes', R.reservaStillsUsd === r3(3 * C.FIRST_FILM_STILL_USD) && pend.metadata.stills_reserved_usd === R.reservaStillsUsd)
checa('duração provável do filme: a fala no ritmo da voz, +10%, piso de 61,5 s do TIKTOK-61 (60 s pedidos → 66 s)', R.filmeEstimadoS === Math.min(90, Math.max(61.5, 60 * 1.1)))
checa('cena 1 fraca não pede clipe: o hook já abre a cena ("hook_scene")', R.sceneEvidence[0].weak === 'subject_not_exact' && R.sceneEvidence[0].ai_clip?.skipped === 'hook_scene' && !R.aiClipsSubmitted.some((c) => c.scene === 1))
checa('gasto registrado no evento pendente (est_usd = soma real) e na evidência', pend.metadata.est_usd === Math.round(somaUsd(clips) * 100) / 100 && evento(F.chamadas, 'fast_scene_plan').metadata.image_v2.ai_spent_usd === Math.round(R.gastoIaUsd * 100) / 100)
// Teto de 4 clipes: com orçamento folgado (a constante mutada na fatia), as 5 cenas fracas pedem só 4; a 5ª fica "cap".
{
  const rodarRico = montarLaco(CONST.replace('const KINEO1_AI_BUDGET_USD = 0.65', 'const KINEO1_AI_BUDGET_USD = 50'))
  const Fr = filme()
  const Rr = await rodarRico(Fr.ctx)
  const fracas = Rr.sceneEvidence.filter((e) => e.weak && e.scene !== 1).map((e) => e.scene)
  checa('teto de clipes: com dinheiro sobrando, 5 cenas fracas → 4 clipes (KINEO1_AI_WEAK_CLIPS_MAX) e a última fica "cap"; o compose lê os 5 (hook + 4)', fracas.length === 5 && Rr.aiClipsSubmitted.length === 4 && Rr.sceneEvidence.find((e) => e.scene === fracas.at(-1)).ai_clip?.skipped === 'cap' && C.parsePendingAiClips(evento(Fr.chamadas, C.FIRST_FILM_AI_CLIPS_EVENT).metadata).length === 5)
  checa('com dinheiro, toda cena fraca elegível troca (replace_index em todas as 4)', evento(Fr.chamadas, C.FIRST_FILM_AI_CLIPS_EVENT).metadata.clips.slice(1).every((c) => typeof c.replace_index === 'number' && Rr.filtered[c.replace_index] !== undefined))
  // Sem laço, e sem pagar à toa: num filme de 35 s a fatia de uma cena do fim não reentra (5 s bastam) e a do começo
  // reentra (a duração cobre a volta). A contagem de clipes que a rota assume é o PISO (1 por cena que falta).
  // Variante: cenas 1-3 e 5-6 fortes; fracas só a 4 (índice 5, faltam 3 cenas) e a 7 (a última).
  const F35 = filme({ semCofre: true, tags: { S1: 'cone snail, snail, reef', S2: 'burger, diner, plate', S3: 'cold water, water, ice', S4: 'wolf, tracks, snow', S5: 'breakfast, eggs, toast' }, planos: [null, null, null, { stockable: false }, { stockable: true }, null, null] })
  F35.ctx.duration = 35
  const R35 = await rodarRico(F35.ctx)
  const trocas35 = evento(F35.chamadas, C.FIRST_FILM_AI_CLIPS_EVENT).metadata.clips.slice(1)
  checa('35 s: cada troca tem a duração de planAiClipForSlot com o PISO de clipes (1 por cena que falta): a cena 4 (índice 5, faltam 3) reentra → 11 s; a 7 (a última) não reentra → 5 s', J(trocas35.map((c) => c.scene)) === '[4,7]' && trocas35.every((c) => c.seconds === C.planAiClipForSlot({ filmSeconds: R35.filmeEstimadoS, clipCount: c.replace_index + 1 + (7 - c.scene), index: c.replace_index, maxUsd: 40 }).seconds) && J(trocas35.map((c) => c.seconds)) === '[11,5]' && trocas35[0].replace_index === 5)
}

{
  // KINEO1-SEM-LACO-2026-09-28 (FIX-REVISAO-2) — a revisão 2: cena 2 fraca (Paris no lugar do hambúrguer) é TROCADA; a
  // cena 3 é um vão < 3 s do plano de B-roll (Push #349) e copiava clipUrls[último] = o stock que o clipe de IA tira →
  // no encaixe real, o chafariz julgado errado tocava logo depois do AI2. Agora o vão copia o último clipe que FICA.
  const Fg = filme()
  Fg.ctx.alignedMeta = Fg.ctx.alignedMeta.map((m, i) => (i === 2 ? { ...(m ?? {}), durationSeconds: 2 } : m))
  const Rg = await rodar(Fg.ctx)
  const pendG = evento(Fg.chamadas, C.FIRST_FILM_AI_CLIPS_EVENT)
  const c2g = pendG?.metadata?.clips?.find((c) => c.scene === 2) ?? null
  const trocado = c2g ? Rg.filtered[c2g.replace_index] : null
  const prontoG = (pendG?.metadata?.clips ?? []).map((c) => ({ scene: c.scene, at_index: c.at_index, url: `AI${c.scene}`, ms: 1, ...(typeof c.replace_index === 'number' ? { replace_index: c.replace_index } : {}) }))
  const finalG = C.spliceAiClips(Rg.filtered, prontoG)
  checa('vão < 3 s logo depois da cena trocada: copia o último clipe que FICA — o stock que o AI2 substitui não volta no filme entregue', Rg.sceneEvidence[2].origin === 'gap' && trocado === 'https://cdn.pixabay.com/v/s2-0.mp4' && finalG.includes('AI2') && !finalG.includes(trocado) && Rg.clipUrls[Rg.sceneEvidence[2].from] !== trocado)
  checa('vão, extensão (#350) e reciclagem (#352) escolhem entre os clipes que ficam (semTrocados); sem troca no filme o conjunto é vazio e tudo é como antes', (LACO.match(/findPreviousRelevantClip\(semTrocados\(clipUrls\), usedPexelsUrls, idx\)/g) || []).length === 2 && !/findPreviousRelevantClip\(clipUrls,/.test(LACO) && LACO.includes('const clipesQueFicam = semTrocados(clipUrls)') && LACO.includes('const semTrocados = (urls: string[]) => (stockTrocado.size === 0 ? urls : urls.filter((u) => !stockTrocado.has(u)))') && LACO.includes("if (plan.mode === 'replace' && clipUrls[rawStock]) stockTrocado.add(clipUrls[rawStock])"))
}

console.log('== (e) evidência ==')
const plano = evento(F.chamadas, 'fast_scene_plan')
const cenasEv = plano?.metadata?.scenes ?? []
checa('fast_scene_plan: origem de cada cena (pool, ai, reciclado, cofre) e a origem do stock', cenasEv[0].origin === 'pool' && cenasEv[1].origin === 'ai' && cenasEv[1].stock_origin === 'pool' && cenasEv[2].stock_origin === 'recycled' && cenasEv[3].stock_origin === 'vault' && cenasEv[3].weak === 'vault_only')
checa('fast_scene_plan: candidatos do pool (tags, nota), sujeito/stockable do plano novo e TODAS as buscas', J(cenasEv[1].candidates[0]) === J({ tags: TAGS_POOL.S2, score: 40, query: 'burger diner plate' }) && cenasEv[1].subject === 'burger' && cenasEv[4].stockable === false && J(cenasEv[1].queries.slice(0, 2)) === J(['burger diner plate', 'burger close']))
checa('fast_scene_plan: o clipe de IA da cena (modo, segundos, custo, motivo) e o resumo image_v2', cenasEv[1].ai_clip?.mode === 'replace' && cenasEv[1].ai_clip?.reason === 'subject_not_exact' && plano.metadata.image_v2.on === true && plano.metadata.image_v2.plan_ok === true && J(plano.metadata.image_v2.weak_scenes) === J(cenasEv.filter((e) => e.weak).map((e) => e.scene)))
checa('o juiz continua lendo o que lia (fala, busca, origens, tags) — os campos novos são extras', cenasEv.every((e) => typeof e.voiceover === 'string' && 'query' in e && Array.isArray(e.sources) && Array.isArray(e.tags) && !('from' in e)))

console.log('== (a) falha aberta do plano de buscas ==')
{
  const Fn = filme({ planoNulo: true })
  const Rn = await rodar(Fn.ctx)
  const p1 = Fn.chamadas.pix.find((c) => c.cena === 1)
  checa('plano nulo: o filme sai, as buscas são as de hoje sem o plano de câmera, e a cena fraca ainda é medida pela origem (reciclada → clipe)', Rn.filtered.length >= 7 && p1.queries[0] === 'cone snail on coral' && Rn.sceneEvidence[2].weak === 'no_stock' && Rn.aiClipsSubmitted.some((c) => c.scene === 3) && evento(Fn.chamadas, 'fast_scene_plan').metadata.image_v2.plan_ok === false)
}

console.log('== roteiro próprio em prosa: a busca de reserva passa a ser a do plano ==')
{
  const Fp = filme()
  Fp.ctx.prosaVerbatim = true
  Fp.ctx.ownScript = true
  Fp.ctx.falaPropria = CENAS.map((c) => c.vo).join(' ')
  // lib/proseBlocks fallbackStockQuery: as 4 primeiras palavras do bloco ("long before people played" → Long Beach)
  Fp.ctx.scenes.forEach((sc, i) => { sc.stockSearchQuery = CENAS[i].vo.split(' ').slice(1, 5).join(' ').toLowerCase(); sc.searchKeywords = sc.stockSearchQuery })
  const Rp = await rodar(Fp.ctx)
  checa('prosa própria: a busca de enchimento ("a burger from a") some; a da cena é a do plano; a fala não muda uma letra', Rp.sceneEvidence[1].query === 'burger diner plate' && !Fp.chamadas.pix.find((c) => c.cena === 2).queries.includes('a burger from a') && Fp.ctx.scenes[1].stockSearchQuery === 'burger diner plate' && Fp.ctx.scenes.every((sc, i) => sc.voiceover === CENAS[i].vo))
}

console.log('== (f) quem não muda ==')
{
  const Fs = filme({ semHook: true })
  const Rs = await rodar(Fs.ctx)
  checa('conta sem clipe (filme grátis depois do primeiro): nenhum pedido à fal, cenas fracas registradas como "not_eligible", nenhum evento pendente', Fs.chamadas.submit.length === 0 && Rs.sceneEvidence.some((e) => e.ai_clip?.skipped === 'not_eligible') && !evento(Fs.chamadas, C.FIRST_FILM_AI_CLIPS_EVENT))
  const Fv = filme({ verbatim: true })
  const Rv = await rodar(Fv.ctx)
  const pv = evento(Fv.chamadas, C.FIRST_FILM_AI_CLIPS_EVENT)
  checa('roteiro com [Pexels:] (verbatim): sem plano de buscas, sem opções v2, clipes escolhidos ANTES do laço como hoje (sem replace_index)', Fv.chamadas.plan.length === 0 && Fv.chamadas.pix.every((c) => c.op.v2 === undefined && c.op.onReport === undefined && c.op.exact === true) && Fv.linha.indexOf('submit') < Fv.linha.findIndex((x) => x.startsWith('pix:')) && pv.metadata.clips.every((c) => c.replace_index === undefined) && pv.metadata.budget_usd === C.FIRST_FILM_BUDGET_USD && Rv.sceneEvidence.every((e) => e.origin === undefined))
  const Fd = filme({ desenho: true })
  const Rd = await rodar(Fd.ctx)
  checa('filme desenhado: o caminho de 21/09 (clipes antes do laço, abrindo a cena); a cena fraca fica registrada como drawn_film', Fd.linha.indexOf('submit') < Fd.linha.findIndex((x) => x.startsWith('pix:')) && evento(Fd.chamadas, C.FIRST_FILM_AI_CLIPS_EVENT).metadata.clips.every((c) => c.replace_index === undefined) && Rd.sceneEvidence.filter((e) => e.weak && e.scene > 1).every((e) => e.ai_clip?.skipped === 'drawn_film'))
  const rodarDesligado = montarLaco(CONST.replace('const KINEO1_IMAGEM_V2 = true', 'const KINEO1_IMAGEM_V2 = false'))
  const Fo = filme()
  const Ro = await rodarDesligado(Fo.ctx)
  const po = evento(Fo.chamadas, C.FIRST_FILM_AI_CLIPS_EVENT)
  checa('interruptor DESLIGADO = o caminho de 22c8e70e: nenhuma chamada nova, nenhuma opção v2, personagem v1, 2 clipes antes do laço, orçamento de 0,50, evidência sem campos novos', Fo.chamadas.plan.length === 0 && Fo.chamadas.pix.every((c) => c.op.v2 === undefined && c.op.onReport === undefined) && Fo.chamadas.vault.every((c) => c.op.v2 === undefined) && J(Fo.chamadas.chars) === J([{ v2: false }]) && Fo.linha.indexOf('submit') < Fo.linha.findIndex((x) => x.startsWith('pix:')) && po.metadata.clips.length === 3 && po.metadata.budget_usd === 0.5 && po.metadata.version === undefined && Ro.sceneEvidence.every((e) => e.origin === undefined && e.candidates === undefined) && evento(Fo.chamadas, 'fast_scene_plan').metadata.image_v2 === undefined)
  checa('desligado: a busca de hoje chega à Pixabay como hoje (com o plano de câmera: quem tira é o v2 dentro da lib)', Fo.chamadas.pix.find((c) => c.cena === 1).queries[0] === 'close-up macro cone snail on coral' && Fo.chamadas.pix.find((c) => c.cena === 2).queries[0] === 'parisian diner')
}

console.log('== (g) instrução colada: a fala do autor fica palavra por palavra ==')
const LUA = 'Crie um vídeo vertical 9:16 de 45–60 segundos, estilo YouTube Shorts viral, sobre: “O que aconteceria se a Lua desaparecesse de repente?”\n\nComece nos primeiros 2 segundos com um gancho muito forte. Use narração natural em inglês americano e legendas grandes e dinâmicas em inglês, destacando palavras importantes.\n\nMostre consequências cada vez mais surpreendentes: mudanças nas marés, noites muito mais escuras, impacto nos animais e possíveis efeitos de longo prazo na Terra.\n\nTroque as cenas a cada 2–3 segundos, usando imagens realistas e cinematográficas, movimentos de câmera, cortes rápidos e música de suspense.\n\nNão use avatar, introdução ou “like and subscribe”.\n\nO vídeo deve parecer profissional e feito por um criador humano, não um vídeo genérico de IA. Termine com uma informação surpreendente que faça a pessoa querer comentar.'
const GEMEOS = '"Esto le pasó a dos gemelos que nunca se conocieron. Los separaron al nacer. Cuando se reencontraron, a los 39 años, ambos se llamaban Jim. Ambos se habían casado con una Linda, luego con una Betty, y tenían un perro llamado Toy. Los científicos los estudiaron durante años. ¿Genética, casualidad... o algo más?"\n\nEstilo visual: ilustración minimalista, fondo azul marino profundo, acentos dorados y lavanda, siluetas sin rostros, hilos de luz dorada conectando figuras, atmósfera calmada y misteriosa. Sin personas reales ni caras detalladas.\n\nSubtítulos: grandes, blancos con contorno azul marino, en el centro-superior de la pantalla, nunca abajo.\n\nMúsica: ambiental suave y baja, sin letra.\n\nSin logos ni marcas de agua.'
function fala(constSrc = CONST_BRIEF_ON) {
  const src = `${constSrc}\nexport function rodar(ctx: any) {\n  const { prompt, body, user, parseUserScript, splitPastedBrief, isDryRunAccount, writeServerEvent, PASTED_BRIEF_EVENT, PASTED_BRIEF_VERSION } = ctx\n${BRIEF}\n  const verbatim = marcadoresValidos\n${LINHAS_FALA}\n  return { ownScript, prosaVerbatim, falaPropria, briefColado, script_mode: body.script_mode }\n}`
  return (prompt, scriptMode = 'verbatim', eventos = []) => roda(src).rodar({ prompt, body: { script_mode: scriptMode }, user: { id: 'u1', email: 'x@y.z' }, parseUserScript: SP.parseUserScript, splitPastedBrief: PB.splitPastedBrief, isDryRunAccount: () => false, writeServerEvent: (e) => { eventos.push(e); return Promise.resolve(true) }, PASTED_BRIEF_EVENT: PB.PASTED_BRIEF_EVENT, PASTED_BRIEF_VERSION: PB.PASTED_BRIEF_VERSION })
}
{
  const f = fala()
  const ev = []
  const g = f(GEMEOS, 'verbatim', ev)
  checa('gêmeos (b3b3e101): a fala narrada é a fala entre aspas, exatamente como o parser de hoje a limpa; nenhuma palavra de "Estilo visual/Subtítulos/Sin logos"', g.ownScript === true && g.prosaVerbatim === true && g.falaPropria === SP.parseUserScript(GEMEOS.split('\n')[0]).narration && !/Estilo visual|Subtítulos|Sin logos|Música/.test(g.falaPropria) && g.falaPropria.includes('ambos se llamaban Jim'))
  checa('evento pasted_brief_detected só com contagens (nunca o texto)', ev.length === 1 && ev[0].name === 'pasted_brief_detected' && ev[0].metadata.mode === 'narration_kept' && ev[0].metadata.lines_removed === 4 && !J(ev[0].metadata).includes('Estilo'))
  const l = f(LUA)
  checa('a Lua (2ff93c15): briefing sem fala → "a IA estrutura" (script_mode ai, ownScript false): quem escreve a narração é o escritor de cenas, lendo o briefing inteiro', l.ownScript === false && l.prosaVerbatim === false && l.script_mode === 'ai' && l.briefColado.mode === 'brief_only')
  const NARR = 'Use this trick to save money every month. Start your day with cold water.\nShow me a man who never failed, and I will show you a man who never tried.'
  const n = f(NARR)
  checa('narração de verdade (imperativos ao espectador): a fala é a de hoje, sem evento', n.ownScript === true && n.falaPropria === SP.parseUserScript(NARR).narration && n.briefColado.mode === 'none')
  const ai = f(GEMEOS, 'ai')
  checa('modo "a IA estrutura": a peça nem roda (o texto já é tema)', ai.briefColado === null && ai.ownScript === false)
  const off = fala(CONST.replace('const KINEO1_IMAGEM_V2 = true', 'const KINEO1_IMAGEM_V2 = false'))(GEMEOS)
  checa('interruptor desligado: a fala é a de 22c8e70e (com as instruções dentro, como era)', off.briefColado === null && off.falaPropria === SP.parseUserScript(GEMEOS).narration && /Estilo visual/.test(off.falaPropria))
}
{
  // Revisão pós-auditoria (28/09) — pelo bloco REAL da rota, com a peça real.
  // D1 — 17dd0c7a/2fa42114 (24/09): em 22c8e70e 108 s de fala → 422 sem cobrança; a v1 da peça deixava 102 palavras
  // (duas linhas de instrução + as aspas) e a duração descia a 35 s: filme cobrado lendo "Conte a história…".
  const LUA17 = 'Crie um vídeo vertical (9:16) altamente envolvente de 35 a 45 segundos, desenvolvido para YouTube Shorts e Instagram Reels, com foco máximo em retenção.\n\nTema: O que aconteceria se a Lua desaparecesse de repente?\n\nComece imediatamente, sem introdução, com uma imagem impactante e o seguinte gancho:\n\n“Se a Lua desaparecesse hoje à noite, a Terra mudaria mais rápido do que você imagina.”\n\nO vídeo deve ter aparência de um documentário científico cinematográfico misturado com o ritmo rápido de um vídeo viral.\n\nUse imagens realistas e cinematográficas da Terra, Lua, oceanos, marés, cidades durante a noite, animais noturnos e espaço. Evite imagens genéricas com aparência óbvia de IA, objetos deformados, planetas irreais ou cenas repetidas.\n\nTroque o visual a cada 2–3 segundos. Use movimentos de câmera, aproximações, mudanças de escala, cortes rápidos e transições suaves para manter a atenção.\n\nConte a história aumentando progressivamente as consequências: primeiro a Lua desaparece; depois mostre o efeito sobre as marés; noites muito mais escuras; impacto sobre animais que dependem da luz da Lua; possíveis efeitos de longo prazo sobre a estabilidade do eixo da Terra; e termine com a consequência mais surpreendente.\n\nUse narração em inglês americano natural, com voz de documentário moderna, energética e convincente. As frases devem ser curtas e diretas.\n\nColoque legendas grandes e dinâmicas em inglês, perfeitamente sincronizadas com a narração. Destaque palavras importantes em amarelo. As legendas devem ser fáceis de ler em um celular e não devem cobrir os elementos principais das imagens.\n\nAdicione efeitos sonoros cinematográficos sutis e uma música de suspense que aumente gradualmente ao longo do vídeo.\n\nNão use apresentador ou avatar de IA. Não coloque introdução, logo, enrolação, “like and subscribe” ou conclusão genérica.\n\nTermine com:\n\n“And the strangest effects might not appear for thousands of years.”\n\nO resultado final deve parecer um YouTube Short profissional e viral, editado por uma pessoa, e não uma sequência genérica de imagens geradas por IA.'
  const f = fala()
  const ev = []
  const l17 = f(LUA17, 'verbatim', ev)
  checa('D1 17dd0c7a pela rota: briefing → "a IA estrutura" (script_mode ai, ownScript false): nenhuma linha do texto é narrada como está, o escritor lê o briefing inteiro com o gancho e o fecho', l17.ownScript === false && l17.prosaVerbatim === false && l17.script_mode === 'ai' && l17.briefColado.mode === 'brief_only' && l17.briefColado.kinds.filter((k) => k === 'residual').length === 2)
  checa('D1 17dd0c7a: o evento diz brief_only e as formas (residual incluso), sem texto', ev.length === 1 && ev[0].metadata.mode === 'brief_only' && ev[0].metadata.kinds.includes('residual') && ev[0].metadata.lines_removed === 13 && !J(ev[0].metadata).includes('Conte'))
  // 8b23d27a (ES, tênis, filme REAL): a fala narrada perde as 4 linhas de direção e nada da fala do autor.
  const TENIS = '¿Por qué los tenistas cambian pelotas que parecen completamente nuevas?\n\n¡No es por capricho!\n\nCon cada golpe, el fieltro de la pelota se desgasta y cambia cómo se mueve por el aire y cómo bota.\n\nPor eso, en los torneos profesionales, las pelotas se cambian siguiendo una regla: después de los primeros siete juegos y, normalmente, cada nueve juegos más.\n\nY cuando escuchas al juez decir «¡pelotas nuevas!», ya sabes por qué.\n\nOjito con esto… porque puede que todo, no lo supieras.\n\nEstilo documental deportivo moderno, dinámico y visualmente atractivo. Utiliza imágenes o vídeos de stock relacionados directamente con el tenis: primeros planos de pelotas nuevas y usadas, jugadores sacando, pelotas botando en pista y recogepelotas.\n\nLa narración debe sonar natural en español de España, con ritmo ágil y tono de sorpresa. Añade subtítulos grandes, claros y sincronizados. Cambia de plano con frecuencia, pero evita transiciones exageradas y movimientos de cámara artificiales.\n\nEl primer segundo debe mostrar una pelota de tenis y presentar directamente la pregunta del guion. No incluyas una introducción, logo animado ni despedida larga.\n\nNo inventes escenas de un torneo específico ni presentes imágenes genéricas como si fueran de un partido real. No añadas estadísticas, textos ni afirmaciones que no estén en el guion. Termina justo después de la última frase.'
  const tn = f(TENIS)
  const falaDoAutor = TENIS.split('\n\n').slice(0, 6).join('\n\n')
  checa('D1 8b23d27a pela rota: a fala narrada é a do autor (6 linhas, pelo mesmo parser), sem "Utiliza imágenes", "La narración debe", "No incluyas", "No inventes"', tn.ownScript === true && tn.script_mode === 'verbatim' && tn.falaPropria === (SP.parseUserScript(falaDoAutor).narration || falaDoAutor) && !/Utiliza im|La narración debe|No incluyas|No inventes/.test(tn.falaPropria) && tn.falaPropria.includes('cada nueve juegos'))
  // D2 — roteiro de um parágrafo: "Use my script as is" continua palavra por palavra, sem evento.
  const PARAGRAFO = 'Este vídeo vai mudar a forma como você enxerga o dinheiro. A maioria das pessoas trabalha a vida inteira e nunca fica rica. O motivo é simples: elas gastam primeiro e investem o que sobra. Os ricos fazem o contrário. Eles pagam a si mesmos primeiro, investem pelo menos dez por cento de tudo que ganham e só depois gastam. Em dez anos, essa única decisão separa quem vive de salário de quem vive de renda. Comece hoje, mesmo com pouco. Você não precisa ganhar mais para ficar rico, precisa guardar antes de gastar.'
  const ev2 = []
  const p = f(PARAGRAFO, 'verbatim', ev2)
  const t = f('Start every video with a hook. Use captions, because 85% of people watch on mute. Show your face in the first 3 seconds. Post at the same time every day.', 'verbatim', ev2)
  checa('D2 pela rota: roteiro de UM parágrafo ("Este vídeo vai…", "Start every video with a hook…") continua verbatim (script_mode verbatim, a fala de hoje), sem evento', p.ownScript === true && p.script_mode === 'verbatim' && p.briefColado.mode === 'none' && p.falaPropria === (SP.parseUserScript(PARAGRAFO).narration || PARAGRAFO) && t.script_mode === 'verbatim' && t.briefColado.mode === 'none' && ev2.length === 0)
  // KINEO1-BRIEF-PORTAO-2026-09-28 (FIX-REVISAO-2) — os 3 casos do revisor, pelo bloco REAL: roteiro de dicas para
  // criador, UMA dica por linha. A peça de e750656c: (a) 60 s → 5 dicas cortadas → 35 s com UMA; (b) brief_only → a IA
  // reescrevia; (c) 63 palavras → 422. Agora: a fala é a mesma do interruptor desligado (o parser de hoje), verbatim.
  const DICAS = [
    ['Two years ago I had eleven followers and a phone with a cracked screen.', 'Today my videos reach millions of people every single week, and nothing about my gear has changed.', 'What changed was a short list of habits I picked up from the creators who were already winning.', 'Here they are, in the order I learned them.', 'Start every video with a hook. The first two seconds decide whether anyone stays.', 'Use captions on every clip. Most people scroll with the sound off, on the bus or in bed.', 'Change the scene every three seconds. A still frame is the fastest way to lose a viewer.', 'Add trending music at low volume. The algorithm notices the sound before it notices you.', 'Show your face in the first three seconds. People follow people, not logos or landscapes.', 'Cut every pause and every breath. Silence feels twice as long on a phone.', 'None of this costs money, and none of it needs a new camera or a studio.', 'It only needs you to post, look at what worked, and do a little more of that tomorrow.', 'Give it thirty days and then come back and tell me what happened to your numbers.'].join('\n'),
    ['Seven rules the biggest creators never break.', 'Start every video with a hook. The first second decides if anyone stays to watch the rest.', 'Use captions on every clip. Most people scroll with the sound off, on the bus or in bed.', 'Change the scene every three seconds. A frozen frame is the fastest way to lose a viewer.', 'Add music at low volume. The right sound makes a boring clip feel like a movie trailer.', 'Show your face in the first three seconds. People follow people, not logos or empty landscapes.', 'Avoid long intros on TikTok. Nobody waits for your logo animation to finish before they swipe.', 'Create videos every single day. Consistency beats talent, and the algorithm rewards people who show up.'].join('\n'),
    ['Want more views on TikTok? Most creators get this completely wrong, and it quietly kills their reach.', 'Start every video with a hook in the first two seconds.', 'Use captions on every clip, because most people watch on mute.', 'Change the scene every three seconds so the eye never gets bored.', 'Add trending music at low volume under your voice.', 'Show your face early, because people follow people, not logos.', 'Post at the same time every day, so the algorithm learns when to push you.', 'Reply to every comment in the first hour, because early replies tell the app your post is worth showing.', 'Do this for thirty days and watch what happens to your views.'].join('\n'),
    'In 1992 a retired teacher from Ohio bought the same lottery numbers every week for thirty years.\nHer family laughed at her every single Sunday, and she never missed a draw.\nThe week she finally won, she gave almost everything away to the school where she had taught.\nThis video must be shared with everyone who says luck does not exist.',
  ]
  const desligada = fala(CONST.replace('const KINEO1_IMAGEM_V2 = true', 'const KINEO1_IMAGEM_V2 = false'))
  const ev3 = []
  const pelaRota = DICAS.map((d) => ({ on: f(d, 'verbatim', ev3), off: desligada(d) }))
  checa('REVISÃO 2 pela rota: as dicas do revisor (60 s, 7 regras, lista de 35 s) e o fecho "This video must be shared…" seguem "Use my script as is": script_mode verbatim, nenhuma linha tirada, a fala = a do interruptor desligado, sem evento', pelaRota.every(({ on, off }) => on.ownScript === true && on.script_mode === 'verbatim' && on.briefColado?.mode === 'none' && on.falaPropria === off.falaPropria) && ev3.length === 0)
}

console.log('== (h) o ensaio (dry-run) mostra a instrução que saiu e as buscas do plano ==')
{
  const ENSAIO = cortar('      // KINEO1-IMAGEM-V2-2026-09-28 — o ensaio mostra o que a imagem nova faria', '    }\n\n    // KINEO-AI-HOOK — FIRST-VIDEO cinematic opener.')
  checa('fatia do relatório do ensaio encontrada', !!ENSAIO)
  if (ENSAIO) {
    const src = `${CONST}\nexport async function rodar(ctx: any) {\n  const { planSceneQueries, scenes, contextoDoPlano, briefColado, verbatim, NextResponse, portao, ownScript, wordsPerSceneFor, duration, clipCount, fastReport, vereditoDoPortao } = ctx\n${ENSAIO}\n}`
    const chamou = []
    const base = { planSceneQueries: async (e) => { chamou.push(e.length); return [{ subject: 'moon', queries: ['full moon night'], stockable: true, aiPrompt: 'x' }] }, scenes: [{ voiceover: 'The Moon vanished.', stockSearchQuery: 'moon' }], contextoDoPlano: {}, NextResponse: { json: (b) => b }, portao: null, ownScript: true, wordsPerSceneFor: () => [1, 2], duration: 35, clipCount: 4, fastReport: { verdict: 'PASS', pass: true }, vereditoDoPortao: null }
    const r = await roda(src).rodar({ ...base, verbatim: false, briefColado: PB.splitPastedBrief(GEMEOS) })
    checa('ensaio da prosa própria: pasted_brief (as linhas que saíram) e scene_queries (sujeito, stockable, buscas) no relatório', r.dry_run === true && r.pasted_brief?.mode === 'narration_kept' && r.pasted_brief.removed.length === 4 && J(r.scene_queries) === J([{ scene: 1, subject: 'moon', stockable: true, queries: ['full moon night'] }]) && chamou.length === 1)
    const rv = await roda(src).rodar({ ...base, verbatim: true, briefColado: null })
    checa('ensaio com [Pexels:]: o planejador nem é chamado', rv.scene_queries === null && rv.pasted_brief === null && chamou.length === 1)
  }
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
