// KINEO-CLIPE-AUTO-3110 — guardião da troca automática de motor no clipe (fundador 30/10: "quando há alguma coisa errada o
// sistema escolhe um motor que vai entregar algo certo"). Prova com dependências falsas, sem rede:
//   (1) recusa da fal no Kling 3 → reenvia no Seedance 1.5 com o mesmo texto/foto, duração mais próxima, linha trocada;
//   (2) cobra o MENOR preço: estorna o débito original e debita o Seedance numa referência nova (nunca duas cobranças vivas);
//   (3) sem troca quando: resposta ambígua, pedido já era Seedance, efeito-modelo, motor reserva sem acesso, ou sem switchEngine;
//   (4) se o Seedance também recusar, o cliente recebe o estorno de sempre.
// Rodar: npx tsx scripts/test-clipe-auto-3110.mts
import { submitClip, clipFallbackRequest } from '../lib/clips/clipFlow'
import { clipCreditCost } from '../lib/clips/clipPricing'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const USER = '11111111-2222-3333-4444-555555555555'
const SUPA = 'https://x.supabase.co'
const PHOTO = `${SUPA}/storage/v1/object/public/renders/images/${USER}/a.jpg`

function deps(opts: { firstOk?: boolean; ambiguous?: boolean; secondOk?: boolean; seedanceOk?: boolean; noSwitch?: boolean } = {}) {
  const log: { submits: string[]; debits: [string, number][]; refunds: string[]; switched: unknown[]; events: string[]; failed: string[] } = { submits: [], debits: [], refunds: [], switched: [], events: [], failed: [] }
  const live = new Map<string, number>()
  const d: Record<string, unknown> = {
    supabaseUrl: SUPA,
    engineAccess: (e: string) => (e === 'seedance' && opts.seedanceOk === false ? { ok: false, status: 403, reason: 'paused' } : { ok: true }),
    findByKey: async () => null,
    countActive: async () => 0,
    verifyImage: async () => {},
    moderate: async () => ({ ok: true }),
    getBalance: async () => 500,
    newId: () => 'clip-1',
    insertPending: async () => ({ ok: true }),
    debit: async (ref: string, c: number) => { log.debits.push([ref, c]); live.set(ref, c); return { ok: true, balance: 500 - [...live.values()].reduce((a, b) => a + b, 0) } },
    refund: async (ref: string) => { log.refunds.push(ref); const c = live.get(ref) ?? 0; live.delete(ref); return c },
    submit: async (model: string) => {
      log.submits.push(model)
      if (log.submits.length === 1) return opts.firstOk ? { ok: true, requestId: 'r1' } : { ok: false, ambiguous: !!opts.ambiguous, error: 'fal 422 content policy' }
      return opts.secondOk === false ? { ok: false, ambiguous: false, error: 'fal 422' } : { ok: true, requestId: 'r2' }
    },
    markSubmitted: async () => true,
    markFailed: async (_id: string, reason: string) => { log.failed.push(reason); return true },
    event: async (name: string) => { log.events.push(name) },
    now: () => Date.parse('2026-10-30T12:00:00Z'),
  }
  if (!opts.noSwitch) d.switchEngine = async (_id: string, patch: unknown) => { log.switched.push(patch); return true }
  return { d: d as never, log, live }
}
const body = (engine: string, extra: Record<string, unknown> = {}) => ({ engine, seconds: 15, aspect: '9:16', prompt: 'A man lifts a golden trophy on stage at an awards gala', ...extra })

{
  const { d, log, live } = deps()
  const res = await submitClip(d, { userId: USER, idempotencyKey: 'key-auto-0001', body: body('hollywood') as never })
  const seed = clipCreditCost('seedance', 12, false)
  ok(res.ok && res.status === 202, '(1) recusa no Kling 3 vira clipe aceito (202)')
  ok(res.ok && res.clip.engine === 'seedance' && res.clip.seconds === 12 && res.clip.fal_request_id === 'r2', '(1) linha vai para Seedance 1.5, 15 s → 12 s (o mais perto que ele faz), com o pedido novo')
  ok(log.submits.length === 2 && /seedance\/v1\.5\/pro\/text-to-video/.test(log.submits[1]), '(1) 2º envio no modelo de texto do Seedance 1.5')
  ok(log.refunds.includes('clips-clip-1') && log.debits.some(([r, c]) => r === 'clips-clip-1-auto' && c === seed), `(2) estorna o Kling 3 e debita ${seed} cr do Seedance em referência nova`)
  ok([...live.keys()].join() === 'clips-clip-1-auto' && res.ok && res.clip.credits === seed, '(2) só uma cobrança viva, no preço menor')
  ok(log.switched.length === 1 && log.events.includes('clip_engine_fallback') && !log.failed.length, '(1) troca gravada, evento clip_engine_fallback, nada marcado como falha')
}
{
  const { d, log } = deps()
  const res = await submitClip(d, { userId: USER, idempotencyKey: 'key-auto-0002', body: body('hollywood', { imageUrl: PHOTO, aspect: null }) as never })
  ok(res.ok && res.clip.engine === 'seedance' && res.clip.mode === 'image' && /image-to-video/.test(log.submits[1]), '(1) com foto: a mesma foto vai para o Seedance imagem→vídeo')
}
for (const [label, opts, b] of [
  ['resposta ambígua (pode ter sido aceita)', { ambiguous: true }, body('hollywood')],
  ['pedido já era Seedance', {}, body('seedance', { seconds: 12 })],
  ['Seedance sem acesso (pausa)', { seedanceOk: false }, body('hollywood')],
  ['sem switchEngine', { noSwitch: true }, body('hollywood')],
] as const) {
  const { d, log } = deps(opts as never)
  const res = await submitClip(d, { userId: USER, idempotencyKey: 'key-auto-0003', body: b as never })
  ok(!res.ok && log.submits.length === 1 && log.failed.length === 1, `(3) sem troca: ${label} — erro e estorno de sempre`)
}
{
  const { d, log, live } = deps({ secondOk: false })
  const res = await submitClip(d, { userId: USER, idempotencyKey: 'key-auto-0004', body: body('hollywood') as never })
  ok(!res.ok && log.submits.length === 2 && live.size === 0 && log.failed[0] === 'provider_rejected', '(4) Seedance também recusa → estorno integral e o erro de sempre')
}
ok(clipFallbackRequest({ engine: 'seedance', mode: 't2v', model: 'm', seconds: 5, aspect: '9:16', prompt: 'x', imageUrl: null }) === null, '(3) clipFallbackRequest não troca Seedance por Seedance')

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
