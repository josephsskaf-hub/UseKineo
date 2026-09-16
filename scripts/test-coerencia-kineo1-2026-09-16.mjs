// KINEO-1-COERENCIA-2026-09-16 — guardião da nota de coerência do Kineo 1 e da recusa da pílula sozinha.
// Fundador (16/09): "o que a pessoa escrever precisa estar coerente no vídeo". Prova: (a) a pílula
// sozinha é reconhecida e recusada nas duas portas e trava o botão do Studio; (b) o juiz lê prompt ×
// narração × plano visual e a NOTA nasce do código (não do modelo); (c) a rota grava a evidência por
// cena com o mesmo generation_id do claim; (d) o painel por pessoa e o quadro /admin/coerencia leem.
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
const cache = new Map()
function load(file, env = {}) {
  if (cache.has(file)) return cache.get(file)
  const exports = {}
  cache.set(file, exports)
  const req = (id) => { if (id.startsWith('@/lib/')) return load(id.slice(2) + '.ts', env); throw new Error('import inesperado ' + id) }
  const js = ts.transpileModule(rd(file), { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports, require: req, process: { env }, console, Math, Date, Number, Set, Map, Array, JSON, AbortController, setTimeout, clearTimeout, fetch: undefined }, { filename: file })
  return exports
}

console.log('== (a) pílula sozinha ==')
const G = load('lib/promptGuard.ts')
checa('"The incredible true story of" (caso wisadot849, 28 caracteres) é frase inacabada', G.isBareStarter('The incredible true story of ') === true)
checa('"The unsolved mystery of" (caso uldanai148) e "5 shocking facts about" idem', G.isBareStarter('The unsolved mystery of') === true && G.isBareStarter('5 shocking facts about') === true)
checa('regra geral: curto e terminando em palavra que pede continuação ("The history of", "Facts about the")', G.isBareStarter('The history of') === true && G.isBareStarter('Facts about the') === true)
checa('frase completa NÃO dispara ("The unsolved mystery of the Dyatlov Pass")', G.isBareStarter('The unsolved mystery of the Dyatlov Pass') === false)
checa('ideia de uma palavra ou tema normal NÃO dispara ("Volcanoes", "5 morning habits Jeff Bezos used before Amazon hit $1 trillion")', G.isBareStarter('Volcanoes') === false && G.isBareStarter('5 morning habits Jeff Bezos used before Amazon hit $1 trillion') === false)
checa('texto longo que por acaso termina em "of" NÃO dispara (> 6 palavras)', G.isBareStarter('This is the story that nobody ever heard of') === false)
checa('vazio não dispara; mensagem diz o que fazer e que nada foi cobrado', G.isBareStarter('') === false && /Finish the sentence/.test(G.BARE_STARTER_MESSAGE) && /Nothing was charged/.test(G.BARE_STARTER_MESSAGE) && G.BARE_STARTER_REASON === 'prompt_bare_starter')

const an = rd('app/api/analyze-idea/route.ts')
checa('analyze-idea recusa a pílula sozinha com 400 logo depois da recusa de tela colada', an.includes('if (isBareStarter(prompt)) {') && an.indexOf('if (isBareStarter(prompt)) {') > an.indexOf('if (looksLikeOurOwnUi(prompt)) {') && an.includes('{ error: BARE_STARTER_MESSAGE, reason: BARE_STARTER_REASON }'))
const ft = rd('app/api/generate-video-fast/route.ts')
checa('generate-video-fast recusa ANTES de classificar/planejar/cobrar, sem custo', ft.includes("recordFastFailure('generating', BARE_STARTER_REASON, 400, user.id)") && ft.indexOf('if (isBareStarter(prompt)) {') < ft.indexOf("name: 'generation_dispatch_received'") && ft.includes('reason: BARE_STARTER_REASON, charged: false'))
const st = rd('app/(dashboard)/studio/StudioClient.tsx')
checa('Studio: generate() não navega com a pílula sozinha (devolve o foco), dica sob a caixa; o atributo disabled da base fica intacto (trava de handlers 6f6eca73)', st.includes("const bareStarter = scriptMode !== 'clip' && isBareStarter(prompt)") && st.includes('if (bareStarter) { promptRef.current?.focus(); return }') && st.indexOf('if (bareStarter) {') > st.indexOf('if (limit.over) return') && st.includes('data-kineo="pilula-sozinha"') && st.includes('disabled={!prompt.trim() || limit.over} className'))

console.log('== (b) o juiz ==')
const C = load('lib/fastCoherence.ts')
checa('caso conhecido: tela colada → nota 0, veredito off, sem chamar modelo', (() => { const k = C.knownCoherenceCase('Studio\n\nEnglish\n\n10 credits\n\nYour idea first. Review the settings, then generate.\n\n✨ Let AI structure it\n\n📝 Use my script as is\n\nWhat’s your video about?'); return k && k.result.score === 0 && k.result.verdict === 'off' && k.result.model === null })())
checa('caso conhecido: pílula sozinha → nota 0, off, problema nomeado', (() => { const k = C.knownCoherenceCase('The unsolved mystery of'); return k && k.result.verdict === 'off' && /unfinished starter/.test(k.result.problems[0]) })())
checa('ideia normal NÃO é caso conhecido (vai ao juiz)', C.knownCoherenceCase('5 morning habits Jeff Bezos used before Amazon hit $1 trillion') === null)
const msgs = C.buildCoherenceMessages({ prompt: '5 morning habits Jeff Bezos used', narration: 'Jeff Bezos wakes at 5 AM. He reads the paper.', scenes: [
  { scene: 1, voiceover: 'Jeff Bezos wakes at 5 AM.', query: 'sunrise bedroom alarm clock', from: 0, sources: ['pixabay', 'pixabay'], tags: ['alarm, clock, morning'] },
  { scene: 2, voiceover: 'He reads the paper.', query: 'man reading newspaper', from: 2, sources: ['fallbackA'], tags: [] },
] })
checa('mensagens levam prompt, narração, e cada cena com fala · busca · origem traduzida · tags', msgs.length === 2 && msgs[1].content.includes('CUSTOMER WROTE') && msgs[1].content.includes('Scene 2: spoken="He reads the paper."') && msgs[1].content.includes('RECYCLED from an earlier scene') && msgs[1].content.includes('clip tags: alarm, clock, morning'))
checa('sem cenas o juiz é instruído a julgar só texto (narration_vs_visuals null)', C.buildCoherenceMessages({ prompt: 'a', narration: 'b' })[1].content.includes('set narration_vs_visuals to null'))
const n1 = C.normalizeCoherence({ prompt_vs_narration: 90, narration_vs_visuals: 40, problems: ['scene 2 recycled clip', 7, '', 'x', 'y', 'z'], worst_scene: 2, summary: 'ok' }, { hasEvidence: true, model: 'gpt-4o-mini', ms: 12 })
checa('nota = média de texto e visual (90,40 → 65 partial), problemas filtrados a ≤4 strings, pior cena 2', n1.score === 65 && n1.verdict === 'partial' && n1.problems.length === 4 && n1.problems[0] === 'scene 2 recycled clip' && n1.worst_scene === 2)
const n2 = C.normalizeCoherence({ prompt_vs_narration: 82, narration_vs_visuals: 10 }, { hasEvidence: false, model: 'm', ms: 1 })
checa('sem evidência o visual é ignorado mesmo que o modelo invente (82 → coherent)', n2.narration_vs_visuals === null && n2.score === 82 && n2.verdict === 'coherent')
checa('valores fora do intervalo são presos a 0-100; lixo vira 0', C.normalizeCoherence({ prompt_vs_narration: 240, narration_vs_visuals: -5 }, { hasEvidence: true, model: 'm', ms: 1 }).score === 50 && C.normalizeCoherence({ prompt_vs_narration: 'abc' }, { hasEvidence: false, model: 'm', ms: 1 }).score === 0)
checa('vereditos: ≥75 coherent · 50-74 partial · <50 off', C.verdictFor(75) === 'coherent' && C.verdictFor(74) === 'partial' && C.verdictFor(50) === 'partial' && C.verdictFor(49) === 'off')
checa('sem chave de API o juiz devolve null (falha aberta), nunca lança', await C.scoreFastCoherence({ prompt: 'x y z topic', narration: 'some narration' }) === null)
// juiz com fetch falso: prova o caminho inteiro sem rede
const fakeFetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ prompt_vs_narration: 30, narration_vs_visuals: 20, problems: ['invented subject'], worst_scene: 1, summary: 's' }) } }] }) })
cache.clear() // instância nova, agora COM chave — a anterior (sem chave) provou a falha aberta
const CK = load('lib/fastCoherence.ts', { OPENAI_API_KEY: 'k' })
checa('com resposta do modelo, a nota nasce do código: 30/20 → 25 off, problema preservado', await (async () => { const r = await CK.scoreFastCoherence({ prompt: 'the boiling river of peru', narration: 'n', scenes: [{ scene: 1, voiceover: 'v', query: 'q', from: 0, sources: ['pixabay'], tags: [] }] }, { fetchImpl: fakeFetch }); return r !== null && r.score === 25 && r.verdict === 'off' && r.problems[0] === 'invented subject' && r.has_evidence === true })())
checa('resposta que não é JSON → null (falha aberta); HTTP não-2xx → null', (await CK.scoreFastCoherence({ prompt: 'p q r', narration: 'n' }, { fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'not json' } }] }) }) })) === null && (await CK.scoreFastCoherence({ prompt: 'p q r', narration: 'n' }, { fetchImpl: async () => ({ ok: false, json: async () => ({}) }) })) === null)

console.log('== (c) a rota grava a evidência ==')
checa('evidência por cena nasce no topo do laço e fecha a busca que valeu depois do hook-guard', ft.includes('const ev: FastSceneEvidence = { scene: sceneNo, voiceover:') && ft.includes('ev.query = pixQueries[0] ?? ev.query') && ft.indexOf('ev.query = pixQueries[0]') > ft.indexOf('[hook-guard] scene=1 all planned queries off-topic'))
checa('origens e tags fecham ANTES do hook (unshift) e o evento leva session_id = generationId', ft.indexOf('sceneEvidence[i].sources = clipSources.slice(a, b)') < ft.indexOf("clipUrls.unshift(hookClipUrl)") && ft.includes('name: FAST_SCENE_PLAN_EVENT') && ft.includes('sessionId: generationId,\n        path: \'/api/generate-video-fast\'') && ft.indexOf('name: FAST_SCENE_PLAN_EVENT') > ft.indexOf('const generationId = randomUUID()'))
checa('tags do clipe escolhido ficam consultáveis pela URL (Pixabay e cofre)', rd('lib/pixabay.ts').includes('export function pixabayTagsForUrl(url: string): string | null') && rd('lib/pixabay.ts').includes('for (const c of pickedCands) notePickedClipTags(c.url, c.tags)') && ft.includes('notePickedClipTags(hit.storageUrl, hit.tags)'))

checa('o checkpoint do servidor (fast_compose_recoverable source:server) e a evidência são ESPERADOS, não `void` — a Vercel congela a função depois da resposta (8 de 88 chegavam)', ft.includes('await writeServerEvent({\n        name: RECOVERABLE_EVENT,') && ft.includes('await writeServerEvent({\n        name: FAST_SCENE_PLAN_EVENT,') && !ft.includes('void writeServerEvent({\n        name: RECOVERABLE_EVENT,'))

console.log('== (d) painel ==')
const la = rd('lib/admin/fastCoherence.ts')
checa('leitor junta vídeo → claim (render_id) → plano (generation_id) → nota, e julga só o que falta', la.includes("eq('name', 'compose_submission_claim')") && la.includes("eq('name', FAST_SCENE_PLAN_EVENT).in('session_id', genIds)") && la.includes('const pending = rows.filter((r) => !r.coherence && r.generation_id && r.narration && r.topic)') && la.includes('name: FAST_COHERENCE_EVENT'))
const pg = rd('app/admin/coerencia/page.tsx')
checa('/admin/coerencia: gate admin, média/fora/parciais, escreveu × narrou × cena a cena, link do filme', pg.includes('isAdminEmail(email)') && pg.includes('fora do pedido') && pg.includes('Cena a cena') && pg.includes('▶ abrir filme'))
const pm = rd('app/api/admin/person-media/route.ts')
checa('painel por pessoa devolve coherence por vídeo (30 dias, até 4 julgados por abertura, falha aberta)', pm.includes('listFastCoherence(admin, { hours: 24 * 30, limit: 60, userId: uid, maxCompute: 4 })') && pm.includes('coherence: coerenciaPorVideo.get(v.id as string) ?? null'))
checa('card da pessoa mostra "coerência N · texto · visual" e o primeiro problema', rd('app/admin/people/PeopleClient.tsx').includes('data-kineo="coerencia"') && rd('app/(dashboard)/admin/ceo/CeoClient.tsx').includes("href: '/admin/coerencia'"))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
