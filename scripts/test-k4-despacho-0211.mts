// KINEO-K4-DESPACHO-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião do Kling 4 PAGO.
// Defeito (02/11, 4 filmes pagos de 15 s: e306d742, bc9177cd, af240efa, c13eb147): a fal ACEITOU o clipe do Kling 4
// (kling4_paid_queue_slots state=accepted, request_id gravado), mas a 1ª consulta de status veio do cron de 1 min DEPOIS de
// 8 min, e advanceKling4PaidStatus decidia 'timeout' ANTES de perguntar à fal → Seedance 1.5 de reserva (3 × 5 s) cobrado
// a preço de Kling 4 (45 cr). E o cinematic_dispatch_result do caminho pago dizia attempted 0 / not_attempted 1 /
// invariant_ok false / claim_action unknown — "nunca postou" — para um clipe aceito.
// Sem rede, sem fal, sem banco (db é um Proxy que conta acessos e falha). Rodar: npx tsx scripts/test-k4-despacho-0211.mts
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { advanceKling4PaidStatus } from '../lib/kling4PaidAsyncStatus'
import { KLING4_TRIAL_FALLBACK_AFTER_MS } from '../lib/kling4TrialAsyncStatus'
import { accepted, failed, notAttempted } from '../lib/cinematic/sceneDisposition'
import { resumirPlano, invarianteFecha } from '../lib/cinematic/dispatchScenes'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

const NOW = Date.parse('2026-11-02T15:57:10.000Z')
const ID = '01a19cf2-cec1-7802-99ce-42bf7afe926b'
const URL_K4 = 'https://v3b.fal.media/files/b/0ab0/kling4_output.mp4'
const claimDe = (minAgo: number, extra: Record<string, unknown> = {}) => ({
  id: 'c', userId: 'e92d81bf-0068-46c3-8de7-1f67e2006756', generationId: 'e306d742-9698-4d87-97ce-cd4c10f59ea9',
  status: 'settled', fingerprint: 'f', creditCost: 45, quality: 'cinematic_hollywood', engine: 'kling4-paid-v1', authority: 'a',
  falRequestIds: [ID], falModels: ['kling/v4/image-to-video'], authorizedCompletedUrls: [null],
  response: { duration: 15, voiceover_script: 'O polvo tem três corações e sangue azul.', kling4_paid: {
    version: 'kling4_paid_2810', promo: false, seconds: 15, engine_used: 'kling4',
    submitted_at: new Date(NOW - minAgo * 60_000).toISOString(),
    chunk_scenes: [{ prompt: 'octopus reef', duration: 15 }], fallback_prompts: ['a', 'b', 'c'],
    fallback_budget_reserved: true, ...extra } },
}) as never
const run = async (minAgo: number, status: 'done' | 'processing' | 'pending' | 'failed', extra: Record<string, unknown> = {}) => {
  let polls = 0, dbTouches = 0, submits = 0
  const db = new Proxy({}, { get: () => { dbTouches++; throw new Error('db offline in test') } })
  const r = await advanceKling4PaidStatus({ db: db as never, secret: 's', userId: 'e92d81bf-0068-46c3-8de7-1f67e2006756',
    generationId: 'e306d742-9698-4d87-97ce-cd4c10f59ea9', claim: claimDe(minAgo, extra), now: NOW }, {
    poll: async () => { polls++; return { status, url: status === 'done' ? URL_K4 : null } },
    submit: async () => { submits++; return 'seedance-id' },
  })
  return { r, polls, fallbackTried: dbTouches > 0 || submits > 0 }
}

console.log('== 1. o caso de 02/11: Kling 4 aceito, 1ª consulta aos 8,5 min (cron), clipe PRONTO na fal ==')
{ const x = await run(8.5, 'done')
  ok(x.polls === 1, '1 a fal é consultada antes de qualquer decisão de timeout (origin/main: 0 consultas)')
  ok(x.r.kind === 'ready' && x.r.clips?.[0]?.url === URL_K4, '1 o filme pronto do Kling 4 é entregue (origin/main: reserva Seedance)')
  ok(!x.fallbackTried, '1 a reserva Seedance não é tocada') }

console.log('== 2. o pago tem janela própria (20 min), o grátis segue em 8 min ==')
{ const x = await run(9, 'processing')
  ok(x.r.kind === 'pending' && !x.fallbackTried, '2 aos 9 min ainda processando: espera, sem reserva (origin/main: reserva aos 8 min)') }
{ const x = await run(19.5, 'pending')
  ok(x.r.kind === 'pending' && !x.fallbackTried, '2 aos 19,5 min na fila: espera') }
{ const x = await run(21, 'processing')
  ok(x.polls === 1 && x.fallbackTried, '2 aos 21 min sem clipe: consulta e só então vai à reserva (timeout)') }
{ const x = await run(21, 'done')
  ok(x.r.kind === 'ready' && !x.fallbackTried, '2 aos 21 min com clipe pronto: o Kling 4 atrasado ainda vence a reserva') }
ok(KLING4_TRIAL_FALLBACK_AFTER_MS === 8 * 60_000, '2 relógio do filme GRÁTIS intocado (8 min)')
{ let diffGratis = 'x'
  try { diffGratis = execFileSync('git', ['diff', '--name-only', 'origin/main', '--', 'lib/kling4TrialAsyncStatus.ts', 'lib/kling4Trial.ts', 'lib/kling4TrialScript.ts'], { cwd: raiz, encoding: 'utf8' }).trim() } catch { /* sem git = falha */ }
  ok(diffGratis === '', '2 caminho grátis (status, transporte, portão da voz do 4aba8a177) sem nenhuma mudança') }

console.log('== 3. falha real e reserva já começada continuam como antes ==')
{ const x = await run(3, 'failed')
  ok(x.polls === 1 && x.fallbackTried, '3 a fal disse FAILED aos 3 min: reserva imediata (provider_failed)') }
{ const x = await run(3, 'done', { fallback_started: true, fallback_reason: 'timeout' })
  ok(x.polls === 0 && x.fallbackTried, '3 reserva já começada: não reconsulta o Kling, termina a reserva congelada') }

console.log('== 4. o despacho do Kling 4 pago entra no ledger (cinematic_dispatch_result) ==')
{ const rota = readFileSync(join(raiz, 'app/api/generate-video-cinematic/route.ts'), 'utf8').replace(/\r\n/g, '\n')
  const ramo = rota.slice(rota.indexOf('      if (paidKling4) {\n        // The approved plan'), rota.indexOf('return publishCinematicResponse(response, ids, models)'))
  ok(ramo.includes('kling4PaidPosted[chunk.index] = true') && ramo.includes('c.outcomes = chunks.map((chunk, i) => ids[i] ? acceptedScene(i, chunk.model)'),
    '4 o ramo pago grava a cena aceita (origin/main: c.outcomes vazio → not_attempted 1)')
  ok(ramo.includes("c.claimAction = 'published'"), "4 o ramo pago grava claim_action 'published' (origin/main: 'unknown')")
  // O que o finalizador calcula com o contexto do ramo pago para 1 chunk aceito vs o de origin/main.
  const depois = resumirPlano({ outcomes: [accepted(0, 'kling/v4/image-to-video')], requestIds: [], models: [],
    attempts: [[{ model: 'kling/v4/image-to-video', status: 200, ambiguous: false, accepted: true }]], totalPosts: 1 } as never)
  const antes = resumirPlano({ outcomes: [], requestIds: [], models: [], attempts: [], totalPosts: 1 } as never)
  ok(depois.attempted === 1 && depois.accepted === 1 && invarianteFecha({ ...depois, planned: 1 }), '4 com o ledger: attempted 1, accepted 1, invariant_ok true')
  ok(antes.accepted === 0 && !invarianteFecha({ ...antes, planned: 1 }), '4 sem o ledger (o evento de 02/11): accepted 0, invariant_ok false')
  const amb = resumirPlano({ outcomes: [failed({ scene_index: 0, model: 'kling/v4/image-to-video', status: null, ambiguous: true })], requestIds: [], models: [],
    attempts: [[{ model: 'kling/v4/image-to-video', status: null, ambiguous: true, accepted: false }]], totalPosts: 1 } as never)
  const nao = resumirPlano({ outcomes: [notAttempted(0, 'kling/v4/image-to-video')], requestIds: [], models: [], attempts: [[]], totalPosts: 0 } as never)
  ok(amb.ambiguous === 1 && invarianteFecha({ ...amb, planned: 1 }) && nao.not_attempted === 1 && invarianteFecha({ ...nao, planned: 1 }),
    '4 POST sem recibo = ambíguo; sem POST = não tentado; o invariante fecha nos dois') }

console.log(`\n${fail === 0 ? 'OK' : 'FALHOU'} — ${pass} verdes, ${fail} vermelhas`)
if (fail) process.exit(1)
