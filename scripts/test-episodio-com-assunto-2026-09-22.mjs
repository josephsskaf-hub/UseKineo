// KINEO-EPISODIO-COM-ASSUNTO-2026-09-22 — guardião: o "próximo episódio" recebe o ASSUNTO, não só o gancho.
// Caso balaj.dxb (22/09 11:08Z, Kineo 1, nota 20 — o filme de "25%" do fundador): o filme 1 era um roteiro de drone
// sobre Gizé, Burj Khalifa, Eiffel e Estátua da Liberdade (nota 80); o pedido de continuação levou só o gancho
// "Witness the ultimate cinematic drone journey... a world of wonders in one frame." e o escritor inventou Saara,
// recifes e Amazônia. 14 d: 6 episódios, média 56,7, metade ≤ 50.
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
function roda(src, requireMap = {}) {
  const exports = {}
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports, require: (m) => requireMap[m] ?? {}, console: { log() {}, warn() {}, error() {} }, Math, Date, Number, Set, Map, Array, JSON, Object, RegExp, String, Promise }, { filename: 'x.ts' })
  return exports
}

const S = roda(rd('lib/seriesContinuation.ts'))
const PEDIDO = 'Topic: "Witness the ultimate cinematic drone journey... a world of wonders in one frame.". This is the next episode in the same Short series: same subject, same format, a completely new hook, new facts and a fresh payoff. Do not repeat the previous episode.'
const ANTERIOR = {
  topic: 'Witness the ultimate cinematic drone journey... a world of wonders in one frame.\n\nStart extremely high above the Great Pyramid of Giza, a marvel of ancient architecture.\n\nDescend to orbit the Burj Khalifa, the tallest structure piercing the sky.\n\nCircle the Eiffel Tower, revealing its intricate iron beauty from every angle.\n\nHover towards the Statue of Liberty, capturing its majestic stance against the skyline.',
  narration: 'Witness the ultimate cinematic drone journey... a world of wonders in one frame. Start extremely high above the Great Pyramid of Giza. Descend to orbit the Burj Khalifa. Circle the Eiffel Tower. Hover towards the Statue of Liberty.',
}

console.log('== (1) reconhecer o pedido de continuação ==')
checa('o pedido REAL do balaj é continuação', S.isSeriesContinuationPrompt(PEDIDO) === true)
checa('a forma antiga ("Keep the topic and format recognizable…") também é', S.isSeriesContinuationPrompt('Create the next episode in the same Short series about "X". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff.') === true)
checa('pedido comum NÃO é continuação', S.isSeriesContinuationPrompt('Why are Boeing 737 engines flat on the bottom?') === false && S.isSeriesContinuationPrompt('') === false)
checa('buildSeriesContinuationPrompt continua produzindo um pedido que o detector reconhece (as duas pontas casam)', S.isSeriesContinuationPrompt(S.buildSeriesContinuationPrompt('Witness the ultimate cinematic drone journey')) === true)

console.log('== (2) colar o episódio anterior ==')
const rico = S.enrichSeriesContinuationPrompt(PEDIDO, ANTERIOR)
checa('o pedido enriquecido começa igual (a primeira linha continua sendo o título da biblioteca)', rico.startsWith(PEDIDO))
checa('carrega o cabeçalho, o pedido original e a narração do episódio 1 — Gizé, Burj Khalifa, Eiffel, Liberdade', rico.includes(S.PREVIOUS_EPISODE_HEADER) && rico.includes('Original request: Witness the ultimate') && rico.includes('What it narrated:') && /Giza/.test(rico) && /Burj Khalifa/.test(rico) && /Eiffel/.test(rico) && /Statue of Liberty/.test(rico))
checa('sem episódio anterior o pedido fica intacto; pedido comum fica intacto mesmo com anterior', S.enrichSeriesContinuationPrompt(PEDIDO, null) === PEDIDO && S.enrichSeriesContinuationPrompt('Why are Boeing 737 engines flat?', ANTERIOR) === 'Why are Boeing 737 engines flat?')
checa('idempotente: enriquecer duas vezes não duplica o bloco', S.enrichSeriesContinuationPrompt(rico, ANTERIOR) === rico)
const longo = S.enrichSeriesContinuationPrompt(PEDIDO, { topic: Array(200).fill('word').join(' ') + '. Fim.', narration: null })
checa('o pedido original é aparado em ~600 caracteres com reticência, e sem narração só entra o pedido', longo.includes('Original request: ') && !longo.includes('What it narrated') && longo.length < PEDIDO.length + S.PREVIOUS_EPISODE_HEADER.length + 700)
checa('anterior vazio (sem topic e sem narração) não cola bloco vazio', S.enrichSeriesContinuationPrompt(PEDIDO, { topic: '', narration: '' }) === PEDIDO)

console.log('== (3) a busca do episódio anterior (lib/episodeSubject) ==')
const E = roda(rd('lib/episodeSubject.ts'))
checa('a semente do pedido do balaj é o texto entre aspas, normalizado (≤ 60 chars, sem o andaime)', E.continuationSeed(PEDIDO).startsWith('witness the ultimate cinematic drone journey... a world of') && E.continuationSeed(PEDIDO).length <= 60 && !/next episode/.test(E.continuationSeed(PEDIDO)))
const fakeDb = (rows, fail = false) => ({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: async () => (fail ? { data: null, error: { message: 'x' } } : { data: rows, error: null }) }) }) }) }) }) })
const rows = [
  { id: 'v-novo', title: 'Another film about cats', topic: 'cats being silly', script: 'Cats are silly.', status: 'completed', created_at: '2026-09-22T12:00:00Z' },
  { id: 'v-drone', title: 'Witness the ultimate cinematic drone journey... a world of wonders in one frame.', topic: ANTERIOR.topic, script: ANTERIOR.narration, status: 'completed', created_at: '2026-09-22T10:56:00Z' },
]
const achado = await E.findPreviousEpisode(fakeDb(rows), 'u1', PEDIDO)
checa('acha o filme da série pela semente (não o mais recente, que é outro assunto)', achado?.id === 'v-drone' && achado.matchedBy === 'seed' && /Giza/.test(achado.topic) && /Eiffel/.test(achado.narration))
const semSemente = await E.findPreviousEpisode(fakeDb(rows), 'u1', 'Topic: "Zebra". This is the next episode in the same Short series: same subject, same format, a completely new hook, new facts and a fresh payoff. Do not repeat the previous episode.')
checa('sem casamento pela semente cai no mais recente (matched_by latest)', semSemente?.id === 'v-novo' && semSemente.matchedBy === 'latest')
checa('falha de banco → null (falha aberta)', (await E.findPreviousEpisode(fakeDb([], true), 'u1', PEDIDO)) === null && (await E.findPreviousEpisode(fakeDb([]), 'u1', PEDIDO)) === null)
const encadeado = await E.findPreviousEpisode(fakeDb([{ id: 'v2', title: 't', topic: PEDIDO + '\n\n' + S.PREVIOUS_EPISODE_HEADER + '\nOriginal request: X', script: 'n', status: 'completed', created_at: '2026-09-22T13:00:00Z' }]), 'u1', PEDIDO)
checa('episódio 3 não herda o bloco do episódio 2 dentro do bloco (só a primeira parte do topic)', encadeado?.topic === PEDIDO)

console.log('== (4) as duas rotas de render ligam a peça ==')
for (const [rota, arq] of [['fast', 'app/api/generate-video-fast/route.ts'], ['cinematic', 'app/api/generate-video-cinematic/route.ts']]) {
  const src = rd(arq)
  checa(`${rota}: importa detector/enriquecedor e a busca`, src.includes("import { isSeriesContinuationPrompt, enrichSeriesContinuationPrompt } from '@/lib/seriesContinuation'") && src.includes("import { findPreviousEpisode } from '@/lib/episodeSubject'"))
  checa(`${rota}: o prompt vira let e é enriquecido ANTES do escritor, com evento series_continuation_enriched`, /let prompt = intake\.text/.test(src) && /if \(isSeriesContinuationPrompt\(prompt\)\) \{\s*const anterior = await findPreviousEpisode\(supabase, user\.id, prompt\)\s*const enriched = enrichSeriesContinuationPrompt\(prompt, anterior\)/.test(src) && src.includes("name: 'series_continuation_enriched'") && /prompt = enriched/.test(src))
}
{
  const src = rd('app/api/generate-video-fast/route.ts')
  checa('fast: o enriquecimento vem DEPOIS das recusas (pílula, tela própria) e ANTES do teto de 5000', src.indexOf('if (isBareStarter(prompt)) {') < src.indexOf('if (isSeriesContinuationPrompt(prompt)) {') && src.indexOf('if (isSeriesContinuationPrompt(prompt)) {') < src.indexOf('if (prompt.length > 5000) {'))
}

console.log('== mutantes ==')
{
  const src = rd('lib/seriesContinuation.ts')
  const mut = src.replace("if (!previous || !isSeriesContinuationPrompt(prompt) || prompt.includes(PREVIOUS_EPISODE_HEADER)) return prompt", "if (!previous || prompt.includes(PREVIOUS_EPISODE_HEADER)) return prompt")
  checa('mutante (enriquece qualquer pedido) aplicou e é pego', mut !== src && roda(mut).enrichSeriesContinuationPrompt('Why are Boeing 737 engines flat?', ANTERIOR) !== 'Why are Boeing 737 engines flat?')
}
{
  const src = rd('lib/episodeSubject.ts')
  const mut = src.replace('const pick = bySeed ?? data[0]', 'const pick = data[0]')
  checa('mutante (ignora a semente) aplicado e pego: devolve o filme dos gatos', mut !== src && (await roda(mut).findPreviousEpisode(fakeDb(rows), 'u1', PEDIDO))?.id === 'v-novo')
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
