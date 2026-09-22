// KINEO-CENA-PRESA-2026-09-22 — guardião: a cena que não volta do fornecedor vira recusa e entra no retry existente.
// Render H3 22/09 03:16Z: 4/5 prontas em 4 min, a 5ª IN_PROGRESS por 50 min; o cliente esperava FAL_POLL_DEADLINE_MS.
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
const roda = (src) => { const exports = {}; vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText, { exports, require: () => ({}), console, Math, Number, Date, Array, Promise, JSON }); return exports }
const S = roda(rd('lib/stuckScene.ts'))

console.log('== (1) decisão pura — o caso H3 de 22/09 ==')
const H3 = ['done', 'done', 'processing', 'done', 'done']
checa('4 prontas + 1 processando aos 4 min → nada (H3 normal leva ~4 min)', S.stuckSceneIndexes(H3, 4).length === 0)
checa('aos 11,9 min → ainda nada; aos 12 min → a cena 3 (índice 2) é declarada presa', S.stuckSceneIndexes(H3, 11.9).length === 0 && JSON.stringify(S.stuckSceneIndexes(H3, 12)) === '[2]')
checa('duas presas viram duas recusas juntas', JSON.stringify(S.stuckSceneIndexes(['done', 'pending', 'processing', 'done'], 15)) === '[1,2]')
checa('sem NENHUMA pronta, o teto é 20 min (fornecedor pode estar lento para todas)', S.stuckSceneIndexes(['processing', 'pending'], 15).length === 0 && JSON.stringify(S.stuckSceneIndexes(['processing', 'pending'], 20)) === '[0,1]')
checa('tudo terminal → nada; relógio desconhecido (0) → nada', S.stuckSceneIndexes(['done', 'failed'], 60).length === 0 && S.stuckSceneIndexes(H3, 0).length === 0)
checa('constantes: 12 min com progresso, 20 sem; nomes dos eventos', S.STUCK_SCENE_WITH_PROGRESS_MINUTES === 12 && S.STUCK_SCENE_NO_PROGRESS_MINUTES === 20 && S.CINEMATIC_SCENE_STUCK_EVENT === 'cinematic_scene_stuck' && S.HOLLYWOOD_SCENE_RETRIED_EVENT === 'hollywood_scene_retried')

console.log('== (2) o relógio reinicia no retry ==')
const t0 = '2026-09-22T03:16:34.000Z', t1 = '2026-09-22T03:30:00.000Z'
checa('claim settled → relógio = completedAt', S.stuckClockStart(t0, '2026-09-22T03:16:00.000Z', null) === Date.parse(t0))
checa('retry depois do claim → relógio = retry', S.stuckClockStart(t0, null, t1) === Date.parse(t1))
checa('sem completedAt cai no startedAt; sem nada → 0', S.stuckClockStart(null, t0, null) === Date.parse(t0) && S.stuckClockStart(null, null, null) === 0)
const fakeDb = (rows, fail = false) => ({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: async () => (fail ? { data: null, error: { message: 'x' } } : { data: rows, error: null }) }) }) }) }) }) })
checa('lastSceneRetryAt lê o último evento; falha/vazio → null', (await S.lastSceneRetryAt(fakeDb([{ created_at: t1 }]), 'g')) === t1 && (await S.lastSceneRetryAt(fakeDb([]), 'g')) === null && (await S.lastSceneRetryAt(fakeDb([], true), 'g')) === null)

console.log('== (3) a rota de status liga a peça ANTES de registrar as recusas terminais ==')
const st = rd('app/api/cinematic-clip-status/route.ts')
checa('importa a decisão pura', st.includes("import { stuckSceneIndexes, stuckClockStart, lastSceneRetryAt, CINEMATIC_SCENE_STUCK_EVENT } from '@/lib/stuckScene'"))
const iBloco = st.indexOf('const presas = stuckSceneIndexes(clips.map((c) => c.status), elapsedMin)')
checa('relógio = claim.completedAt/startedAt vs último retry; a cena presa vira failed mantendo o id (o claim registra a recusa terminal)', iBloco > 0 && st.includes('const clock = stuckClockStart(claim.completedAt, claim.startedAt, lastRetry)') && st.includes("clips[i] = { id: antes.id, status: 'failed', url: null }"))
checa('acontece DEPOIS do poll das cenas e ANTES de authorizeCinematicTerminalFailures/allDone', iBloco > st.indexOf('const clips = await Promise.all(') && iBloco < st.indexOf('const failed = clips.filter(') && iBloco < st.indexOf('const allDone = '))
checa('grava cinematic_scene_stuck com scene_index, request_id, model, elapsed_min, any_done', st.includes("name: CINEMATIC_SCENE_STUCK_EVENT, userId: user.id, path: '/api/cinematic-clip-status', sessionId: generationId, metadata: { scene_index: i, request_id: antes.id, model: claim.falModels[i], elapsed_min: Math.round(elapsedMin), any_done:"))

console.log('== (4) o retry carimba a ressubmissão (senão a cena nova seria presa no poll seguinte) ==')
const rt = rd('app/api/retry-hollywood-scene/route.ts')
checa('retry grava hollywood_scene_retried ESPERADO, com session_id = generationId, depois do retarget e antes da resposta', /await writeServerEvent\(\{ name: HOLLYWOOD_SCENE_RETRIED_EVENT, userId: birth\.userId, path: '\/api\/retry-hollywood-scene', sessionId: args\.generationId,[^\n]*\n\s+return NextResponse\.json\(\{ requestId, model: slot\.model \}\)/.test(rt) && rt.indexOf('await writeServerEvent({ name: HOLLYWOOD_SCENE_RETRIED_EVENT') > rt.indexOf('const retargeted = await retargetCinematicRequestId('))
checa('o cliente já re-submete cena recusada (duas rodadas) — a peça reaproveita, não duplica', rd('app/(dashboard)/generate/GenerateClient.tsx').includes("const rr = await fetch('/api/retry-hollywood-scene'") && rd('app/(dashboard)/generate/GenerateClient.tsx').includes('hollyRetriedRef.current < 2'))

console.log('== mutantes ==')
{
  const src = rd('lib/stuckScene.ts')
  const mut = src.replace("if (s === 'pending' || s === 'processing') out.push(i)", "if (s === 'pending') out.push(i)")
  checa('mutante (só pending) aplicou e é pego: a cena processando do H3 escapa', mut !== src && roda(mut).stuckSceneIndexes(H3, 12).length === 0)
}
{
  const src = rd('lib/stuckScene.ts')
  const mut = src.replace('return Math.max(base, Number.isFinite(r) ? r : 0)', 'return base')
  checa('mutante (relógio ignora o retry) é pego', mut !== src && roda(mut).stuckClockStart(t0, null, t1) === Date.parse(t0))
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
