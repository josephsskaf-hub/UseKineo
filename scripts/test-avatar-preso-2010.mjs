// KINEO-AVATAR-PRESO-2010 [TRAVA 8.2 — vai do fundador 20/10 "vai pra tudo"] — guardião do conserto da montagem PRESA do /avatar.
//
// O CASO REAL (teste de 20/10, render 9087456e, geração bebe-2010-e27670a6c6f44136): o generate-avatar debitou e assinou 70 (preço fixo
// do apresentador); o /api/compose gravou no claim de montagem 18 (creditCostForDuration a 15 s, desde o FIX2 de 21/08); o
// /api/compose/status exigia os dois iguais → "avatar birth/compose billing mismatch" → 503 em loop, e o cron finish-stranded-renders
// batia no mesmo erro. Só um avatar de exatos 60 s passava.
//
// O QUE ELE PROVA (EXECUTANDO lib/avatar/reservation.ts num vm com banco dublê e assinaturas reais, lendo os arquivos e comparando com a base):
//   R. a conferência do status: na BASE o caso real (70 × 18 a 15 s) é recusado (o defeito existe); HOJE passa; o formato novo (igualdade)
//      passa; o formato velho só passa com o número exato da régua para a duração do próprio claim; custo inventado, sem duração, qualidade
//      trocada, débito estornado/divergente ou claim sem assinatura continuam recusados;
//   C. o compose: o avatar pré-pago reserva e grava (claim + intent) o custo do NASCIMENTO em 15/35/52/60/90 s, e esse número passa na
//      conferência do status; na base só 60 s passava; o cinematic (inclusive o resgate com custo de nascimento ≠ régua) e o Kineo 1 seguem
//      com o número de sempre; a checagem do nascimento contra a tabela segue igual;
//   S. nada de cobrança dupla (o status não debita avatar pré-pago), o cron finish-stranded-renders reconhece o preso (fase 3: claim de
//      montagem com render_id, sem filtro de motor, cutuca o status em modo serviço), e o Ads Produção / Apresentador v2 / generate-avatar
//      ficam byte a byte iguais (a função que o Ads Produção usa, loadPrepaidAvatarClaimForGeneration, também);
//   D. desfaz exato (cada arquivo tocado, desfeito, é a base), encadeado como camada mais nova do /api/compose (semMeta95Refazer1910 chama
//      este primeiro), toda linha nova com a marca, o diff só toca a lista e os novos, todo commit da entrega com a marca no assunto;
//   M. mutantes: cada regra acima fica vermelha quando a quebramos de propósito (aplicação provada antes de medir).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  semAvatarPreso2010, MARCA_AVATAR_PRESO_2010, AVATAR_PRESO_2010_BASE, AVATAR_PRESO_2010_ARQUIVOS, AVATAR_PRESO_2010_NOVOS,
  ACRESCIMOS_AVATAR_PRESO_2010, TROCAS_AVATAR_PRESO_2010,
} from './test-support/desfaz-avatar-preso-2010.mjs'
import { semMeta95Refazer1910 } from './test-support/desfaz-meta95-refazer-1910.mjs'
import { semMenuUgc2010 } from './test-support/desfaz-menu-ugc-2010.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
process.chdir(ROOT) // o carregador offline resolve '@/...' a partir do cwd
const MARCA = 'KINEO-AVATAR-PRESO-2010'
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (rel) => { try { return lf(git('show', `${AVATAR_PRESO_2010_BASE}:${rel}`)) } catch { return null } }
let pass = 0
let fail = 0
function ok(cond, msg) { if (cond) { pass++; console.log('  ok  ', msg) } else { fail++; console.log('  FALHA', msg) } }
const tenta = async (fn) => { try { return await fn() } catch (e) { return [`exceção: ${e.message}`] } }

const F = {
  reserva: 'lib/avatar/reservation.ts',
  compose: 'app/api/compose/route.ts',
  status: 'app/api/compose/status/[renderId]/route.ts',
  cron: 'app/api/cron/finish-stranded-renders/route.ts',
  meta95: 'scripts/test-support/desfaz-meta95-refazer-1910.mjs',
}
const INTOCADOS = [
  F.status, F.cron,
  'app/api/generate-avatar/route.ts', 'app/api/avatar-status/route.ts', 'lib/avatar/claim.ts', 'lib/composeClaim.ts', 'lib/credits/engineCost.ts',
  'lib/credits/refund.ts', 'app/api/ads/producao/montage/route.ts', 'lib/ads/producao.ts', 'app/(dashboard)/ads/producao/ProducaoClient.tsx',
  'lib/ads/v2Presenter.ts', 'lib/ads/adV2Montage.ts', 'lib/ads/v2Advance.ts', 'app/(dashboard)/avatar/AvatarStudioClient.tsx',
]

// ─── o caso real, com assinaturas de verdade ─────────────────────────────────
const SECRET = 'segredo-de-teste-avatar-preso-2010'
const USER = '00000000-0000-4000-8000-000000002010'
const GEN = 'bebe-2010-e27670a6c6f44136'
const RENDER = '9087456e-b870-4c57-b628-d066ca47d575'

function carregar(srcReserva) {
  const load = createOfflineLoader({
    mocks: { '@/lib/credits/refund': { refundRenderCredits: async () => 0 } },
    source: (rel, raw) => (rel === F.reserva && typeof srcReserva === 'string' ? srcReserva : raw),
  })
  return { reserva: load('@/lib/avatar/reservation'), claim: load('@/lib/avatar/claim'), compose: load('@/lib/composeClaim'), custo: load('@/lib/credits/engineCost') }
}
const REAL = carregar(null)

/** Linhas do banco para um avatar pago e entregue pelo motor, com o claim de montagem gravado do jeito pedido. */
function linhas({ engine = 'presenter', birthCost = 70, composeQuality = engine === 'presenter' ? 'presenter' : 'avatar', composeCost, duration, debitAmount = birthCost, refunded = null, assinarCompose = true } = {}) {
  const { claim: C, compose: K } = REAL
  const response = { avatar_request_id: 'req-avatar-preso-2010', engine, generationId: GEN, completed_video_url: 'https://v3.fal.media/files/avatar-preso.mp4', voiceover_url: 'https://x.supabase.co/storage/v1/object/public/renders/avatar/voz.mp3' }
  const responseHash = C.avatarValueHash(response)
  const claimId = C.avatarClaimId(USER, GEN)
  const avatar = {
    id: claimId, name: C.AVATAR_CLAIM_EVENT, user_id: USER, path: C.AVATAR_CLAIM_PATH, session_id: GEN,
    metadata: {
      generation_id: GEN, status: 'done', fingerprint: 'fp-avatar-preso', credit_cost: birthCost, response, response_hash: responseHash,
      authority: C.signAvatarClaim(SECRET, { claimId, userId: USER, generationId: GEN, status: 'done', fingerprint: 'fp-avatar-preso', creditCost: birthCost, responseHash }),
      prepaid_billing_reference: `avatar-${claimId}`, prepaid_debited_at: '2026-10-20T18:56:38.587Z',
    },
  }
  const composeId = K.composeClaimId(USER, GEN)
  const md = { generation_id: GEN, status: 'done', render_id: RENDER, quality: composeQuality, cost: composeCost, credit_hold: false }
  if (duration !== undefined) md.duration = duration
  md.authority = K.signComposeClaim(SECRET, { claimId: composeId, userId: USER, generationId: GEN, status: 'done', renderId: RENDER, quality: composeQuality, cost: assinarCompose ? composeCost : composeCost + 1 })
  const compose = { id: composeId, name: K.COMPOSE_CLAIM_EVENT, user_id: USER, path: K.COMPOSE_CLAIM_PATH, session_id: GEN, metadata: md }
  const debit = { render_id: `avatar-${claimId}`, user_id: USER, amount: debitAmount, refunded_at: refunded }
  return { avatar, compose, debit }
}
function bancoFalso(rows) {
  return {
    from(tabela) {
      const f = {}
      const q = {
        select() { return q }, eq(k, v) { f[k] = v; return q }, contains(k, v) { f[`contains:${k}`] = v; return q }, limit() { return q }, order() { return q },
        async maybeSingle() {
          if (tabela === 'events' && f.name === 'compose_submission_claim') {
            const m = f['contains:metadata'] ?? {}
            const c = rows.compose
            return { data: c && c.user_id === f.user_id && c.metadata.render_id === m.render_id && c.metadata.status === m.status ? c : null, error: null }
          }
          if (tabela === 'events' && f.name === 'avatar_submission_claim') return { data: rows.avatar && rows.avatar.id === f.id ? rows.avatar : null, error: null }
          if (tabela === 'credit_debits') return { data: rows.debit && rows.debit.render_id === f.render_id ? rows.debit : null, error: null }
          return { data: null, error: null }
        },
      }
      return q
    },
  }
}
const conferir = (mod, rows) => mod.loadPrepaidAvatarClaimForRender({ db: bancoFalso(rows), secret: SECRET, userId: USER, renderId: RENDER })
const passa = (r) => r && r.ok === true && r.claim && typeof r.claim.creditCost === 'number'
const recusa = (r, frase) => r && r.ok === false && (!frase || r.error === frase)
const MISMATCH = 'avatar birth/compose billing mismatch'

// ─── R. a conferência do /api/compose/status ─────────────────────────────────
async function reservaProblems(srcReserva) {
  const p = []
  const { reserva } = srcReserva === null ? REAL : carregar(srcReserva)
  const real = await conferir(reserva, linhas({ composeCost: 18, duration: 15 }))
  if (!passa(real) || real.claim.creditCost !== 70 || real.claim.quality !== 'presenter') p.push(`R2 caso real 70 × 18 a 15 s: ${JSON.stringify(real)}`)
  if (!passa(await conferir(reserva, linhas({ composeCost: 70, duration: 15 })))) p.push('R3 formato novo (claim de montagem = nascimento) recusado')
  if (!passa(await conferir(reserva, linhas({ engine: 'fabric', birthCost: 110, composeCost: 110, duration: 52 })))) p.push('R3 avatar 110 = 110 recusado')
  for (const [engine, birthCost, duration, composeCost] of [['presenter', 70, 52, 61], ['presenter', 70, 35, 41], ['presenter', 70, 90, 105], ['fabric', 110, 52, 96], ['presenter_pro', 110, 15, 28]]) {
    if (!passa(await conferir(reserva, linhas({ engine, birthCost, composeCost, duration })))) p.push(`R4 claim velho ${engine} ${birthCost} × ${composeCost} a ${duration} s recusado`)
  }
  const negativos = [
    ['custo inventado (17 a 15 s)', linhas({ composeCost: 17, duration: 15 }), MISMATCH],
    ['claim velho sem duração', linhas({ composeCost: 18 }), MISMATCH],
    ['duração que não dá o número (18 a 20 s)', linhas({ composeCost: 18, duration: 20 }), MISMATCH],
    ['duração em texto', linhas({ composeCost: 18, duration: '15' }), MISMATCH],
    ['qualidade trocada (montagem avatar × nascimento presenter)', linhas({ composeQuality: 'avatar', composeCost: 18, duration: 15 }), MISMATCH],
    ['qualidade trocada com o mesmo número (montagem avatar 70 × nascimento presenter 70)', linhas({ composeQuality: 'avatar', composeCost: 70, duration: 15 }), MISMATCH],
    ['montagem maior que a régua (19 a 15 s)', linhas({ composeCost: 19, duration: 15 }), MISMATCH],
    ['débito estornado', linhas({ composeCost: 18, duration: 15, refunded: '2026-10-20T20:00:00Z' }), 'avatar debit was refunded'],
    ['débito com o número da montagem (18)', linhas({ composeCost: 18, duration: 15, debitAmount: 18 }), 'avatar debit is missing or mismatched'],
    ['claim de montagem sem assinatura válida', linhas({ composeCost: 18, duration: 15, assinarCompose: false }), 'invalid compose claim for avatar render'],
  ]
  for (const [nome, rows, frase] of negativos) {
    const r = await conferir(reserva, rows)
    if (!recusa(r, frase)) p.push(`R5 ${nome} deveria ser recusado com "${frase}": ${JSON.stringify(r)}`)
  }
  return p
}

console.log('R. a conferência do /api/compose/status (lib/avatar/reservation.ts executada)')
{
  const B = await carregar(base(F.reserva)).reserva
  const r = await conferir(B, linhas({ composeCost: 18, duration: 15 }))
  ok(recusa(r, MISMATCH), 'R1 na BASE, o caso real (nascimento 70 × montagem 18 a 15 s) é recusado com "avatar birth/compose billing mismatch" — o defeito existe')
  const p = await tenta(() => reservaProblems(null))
  ok(p.length === 0, `R2–R5 hoje: caso real passa; formato novo passa; claim velho só com o número exato da régua; 10 recusas mantidas${p.length ? ' — ' + p.join(' | ') : ''}`)
  const fn = REAL.reserva.avatarComposeCostMatchesBirth
  const tabela = [[70, 70, 'presenter', 15, true], [70, 18, 'presenter', 15, true], [70, 18, 'presenter', undefined, false], [70, 18, 'cinematic_ai', 15, false], [60, 15, 'presenter', 15, false], [110, 28, 'avatar', 15, true], [70, 0, 'presenter', 0, false]]
  ok(typeof fn === 'function' && tabela.every(([b, c, q, d, esperado]) => fn(b, c, q, d) === esperado), 'R6 avatarComposeCostMatchesBirth: igualdade, régua da duração do claim, sem duração/qualidade estranha/nascimento fora da tabela = não')
}

// ─── C. o /api/compose ────────────────────────────────────────────────────────
const RE_DEF = /^ {4}const avatarPrepaidCost: number \| null = (.+?) \/\/ KINEO-AVATAR-PRESO-2010$/m
const RE_RES = /^ {8}const prepaidReservation = await claimGenerationSubmission\((.+?), false\)/m
const RE_INT = /^ {4}const intendedCost = (.+?)(?: \/\/ .*)?$/m
function expressoes(src) {
  const def = src.match(RE_DEF)?.[1] ?? 'undefined'
  const res = src.match(RE_RES)?.[1]
  const int = src.match(RE_INT)?.[1]
  if (!res || !int) throw new Error('expressões da reserva/intent não encontradas')
  const fazer = (expr) => new Function('avatarPrepaidCost', 'cinematicPrepaidCost', 'creditCostForDuration', 'quality', 'duration', 'isFreePlanFast', `return (${expr})`)
  const fDef = new Function('avatarBirthClaim', `return (${def})`)
  return (cx) => {
    const avatarPrepaidCost = fDef(cx.avatarBirthClaim ?? null)
    const args = [avatarPrepaidCost === undefined ? null : avatarPrepaidCost, cx.cinematicPrepaidCost ?? null, REAL.custo.creditCostForDuration, cx.quality, cx.duration, cx.isFreePlanFast ?? false]
    return { reserva: fazer(res)(...args), intent: fazer(int)(...args) }
  }
}
const CASOS_AVATAR = [['presenter', 'presenter', 70, 15], ['presenter', 'presenter', 70, 35], ['presenter', 'presenter', 70, 52], ['presenter', 'presenter', 70, 60], ['presenter', 'presenter', 70, 90], ['fabric', 'avatar', 110, 15], ['fabric', 'avatar', 110, 52], ['fabric', 'avatar', 110, 60]]
async function composeProblems(src) {
  const p = []
  const n = (re) => (src.match(new RegExp(re.source, 'gm')) ?? []).length
  if (n(RE_DEF) !== 1 || !/avatarBirthClaim \? avatarBirthClaim\.creditCost : null/.test(src.match(RE_DEF)?.[1] ?? '')) p.push('C1 avatarPrepaidCost não vem do claim de nascimento (avatarBirthClaim.creditCost)')
  const iSet = src.indexOf('avatarBirthClaim = loadedAvatar.claim'), iDef = src.search(RE_DEF), iRes = src.search(RE_RES), iInt = src.search(RE_INT)
  if (!(iSet > 0 && iDef > iSet && iRes > iDef && iInt > iRes)) p.push('C1 ordem: nascimento conferido → avatarPrepaidCost → reserva → intent')
  const bloco = src.slice(src.indexOf('if (cinematicUpstreamDebited || avatarUpstreamDebited) {'), iRes + 200)
  if (!/claimGenerationSubmission\(avatarPrepaidCost \?\? creditCostForDuration\(quality, true, duration\), false\)/.test(bloco)) p.push('C2 a reserva pré-paga não usa o custo do nascimento')
  if (!/^ {4}const intendedCost = cinematicPrepaidCost \?\? avatarPrepaidCost \?\? creditCostForDuration\(/m.test(src)) p.push('C3 o intent/claim final não usa o custo do nascimento')
  if (!/avatarBirthClaim\.creditCost !== creditCostFor\(quality, true\) \|\|/.test(src)) p.push('C6 a checagem do nascimento contra a tabela (70/110) sumiu')
  const calc = expressoes(src)
  for (const [engine, quality, birth, duration] of CASOS_AVATAR) {
    const v = calc({ avatarBirthClaim: { creditCost: birth }, quality, duration })
    if (v.reserva !== birth || v.intent !== birth) { p.push(`C4 avatar ${engine} ${duration} s: reserva ${v.reserva}, intent ${v.intent} (nascimento ${birth})`); continue }
    const r = await conferir(REAL.reserva, linhas({ engine, birthCost: birth, composeCost: v.intent, duration }))
    if (!passa(r)) p.push(`C5 avatar ${engine} ${duration} s: o número que o compose grava (${v.intent}) não passa na conferência do status`)
  }
  const cdd = REAL.custo.creditCostForDuration
  const cin = calc({ cinematicPrepaidCost: 44, quality: 'cinematic_ai', duration: 35 })
  if (cin.reserva !== cdd('cinematic_ai', true, 35) || cin.intent !== 44) p.push(`C4 cinematic (resgate com nascimento 44 ≠ régua): reserva ${cin.reserva}, intent ${cin.intent} — mudou`)
  const cin2 = calc({ cinematicPrepaidCost: 21, quality: 'cinematic_ai', duration: 35 })
  if (cin2.reserva !== 21 || cin2.intent !== 21) p.push('C4 cinematic comum mudou')
  const fast = calc({ quality: 'fast', duration: 35, isFreePlanFast: false })
  const fastFree = calc({ quality: 'fast', duration: 35, isFreePlanFast: true })
  if (fast.intent !== cdd('fast', true, 35) || fastFree.intent !== 0) p.push('C4 Kineo 1 mudou')
  return p
}
console.log('\nC. o /api/compose (a reserva e o claim de montagem do avatar pré-pago)')
const COMPOSE = rd(F.compose)
{
  const p = await tenta(() => composeProblems(COMPOSE))
  ok(p.length === 0, `C1–C6 avatar reserva e grava o custo do nascimento em 15/35/52/60/90 s e passa no status; cinematic e Kineo 1 iguais${p.length ? ' — ' + p.join(' | ') : ''}`)
  // A prova de que o defeito era o compose: com as expressões da BASE, só 60 s passava.
  const calcBase = expressoes(base(F.compose))
  const B = carregar(base(F.reserva)).reserva
  const resultados = []
  for (const [engine, quality, birth, duration] of CASOS_AVATAR) {
    const v = calcBase({ avatarBirthClaim: { creditCost: birth }, quality, duration })
    resultados.push([duration, passa(await conferir(B, linhas({ engine, birthCost: birth, composeCost: v.intent, duration })))])
  }
  ok(resultados.every(([d, passou]) => passou === (d === 60)), `C7 na BASE (compose + status de antes) só o avatar de exatos 60 s terminava: ${resultados.map(([d, x]) => `${d}s=${x ? 'ok' : 'PRESO'}`).join(' ')}`)
}

// ─── S. sem cobrança dupla, o cron reconhece, os outros caminhos intocados ─────
function statusProblems(src) {
  const p = []
  if (!/const prepaid = await loadPrepaidAvatarClaimForRender\(\{/.test(src)) p.push('S1 o status não confere mais o avatar pelo claim')
  if (!/let creditsDeducted = prepaidCinematicClaim !== null \|\| prepaidAvatarClaim !== null/.test(src)) p.push('S1 avatar pré-pago deixou de contar como já pago')
  if (!/\(!prepaidAvatarClaim && \(quality === 'avatar' \|\| quality === 'presenter'\)\) \|\|/.test(src)) p.push('S1 o status passaria a debitar o avatar pré-pago (cobrança dupla)')
  return p
}
function cronProblems(src) {
  const p = []
  const i3 = src.indexOf('// ═══ FASE 3 — RESGATE DO CAMINHO COMPOSE'), i4 = src.indexOf('// ═══ KINEO-LINHA-PERDIDA-2026-08-28')
  const f3 = i3 > 0 && i4 > i3 ? src.slice(i3, i4) : ''
  if (!f3) return ['S2 fase 3 do cron não encontrada']
  if (!/\.eq\('name', 'compose_submission_claim'\)/.test(f3)) p.push('S2 fase 3 não lê o claim de montagem')
  if (/quality/.test(f3)) p.push('S2 fase 3 passou a filtrar por motor (o avatar ficaria de fora)')
  if (!/const renderId = typeof md\.render_id === 'string' \? md\.render_id : null/.test(f3)) p.push('S2 fase 3 não pega o render_id do claim')
  if (!/if \(existing\?\.status === 'completed'\) continue/.test(f3)) p.push('S2 fase 3 mudou o critério de "já entregue"')
  if (!/new NextRequest\(`\$\{APP_URL\}\/api\/compose\/status\/\$\{renderId\}`, \{ headers: serviceHeaders\(userId\) \}\)\s*\n\s*await composeStatusGet\(statusReq, \{ params: \{ renderId \} \}\)/.test(f3)) p.push('S2 fase 3 não cutuca o status em modo serviço')
  if (!/^const MAX_AGE_MS = 20 \* 60 \* 60 \* 1000$/m.test(src)) p.push('S2 janela do cron mudou (o doc diz 20 h)')
  return p
}
const funcao = (src, nome) => { const i = src.indexOf(`export async function ${nome}(`); if (i < 0) return null; const j = src.indexOf('\n}\n', i); return j < 0 ? null : src.slice(i, j + 2) }
console.log('\nS. cobrança, cron e os caminhos vizinhos')
{
  const st = rd(F.status)
  const p1 = statusProblems(st)
  ok(p1.length === 0, `S1 o status confere o avatar pelo claim e NÃO debita avatar pré-pago (nada de cobrança dupla)${p1.length ? ' — ' + p1.join(' | ') : ''}`)
  const p2 = cronProblems(rd(F.cron))
  ok(p2.length === 0, `S2 finish-stranded-renders fase 3: claim de montagem com render_id, sem filtro de motor, cutuca o status em modo serviço (janela 20 h)${p2.length ? ' — ' + p2.join(' | ') : ''}`)
  const mudados = INTOCADOS.filter((rel) => { const b = base(rel); return b === null || rd(rel) !== b })
  ok(mudados.length === 0, `S3 status, cron, generate-avatar, avatar-status, Ads Produção, Apresentador v2 e o /avatar byte a byte iguais à base${mudados.length ? ' — mudou: ' + mudados.join(', ') : ''}`)
  const R = rd(F.reserva), RB = base(F.reserva)
  const iguais = ['loadPrepaidAvatarClaimForGeneration', 'markAvatarClaimPrepaid', 'confirmAvatarBirthDebit', 'refundAvatarBirthDebit', 'settleAvatarCreditHoldForRender']
    .filter((n) => funcao(R, n) === null || funcao(R, n) !== funcao(RB, n))
  ok(iguais.length === 0, `S4 o que o Ads Produção e o generate-avatar usam em reservation.ts ficou igual (loadPrepaidAvatarClaimForGeneration e cia.)${iguais.length ? ' — mudou: ' + iguais.join(', ') : ''}`)
}

// ─── D. desfaz, encadeamento, diff ───────────────────────────────────────────
console.log('\nD. desfaz, encadeamento e diff')
{
  const ruins = AVATAR_PRESO_2010_ARQUIVOS.filter((rel) => { try { return semAvatarPreso2010(rd(rel), rel) !== base(rel) } catch { return true } })
  ok(ruins.length === 0, `D1 cada arquivo tocado, desfeito, é EXATAMENTE a base ${AVATAR_PRESO_2010_BASE.slice(0, 9)}${ruins.length ? ' — ' + ruins.join(', ') : ''}`)
  ok(AVATAR_PRESO_2010_NOVOS.every((rel) => base(rel) === null && fs.existsSync(path.join(ROOT, rel))), 'D2 os arquivos novos existem e não existiam na base')
  const contagem = AVATAR_PRESO_2010_ARQUIVOS.every((rel) => rd(rel).split('\n').filter((l) => l.includes(MARCA)).length === ACRESCIMOS_AVATAR_PRESO_2010[rel] + (TROCAS_AVATAR_PRESO_2010[rel] ?? []).length)
  const semMarcaNova = AVATAR_PRESO_2010_ARQUIVOS.every((rel) => { const b = base(rel).split('\n'); const bs = new Set(b); return rd(rel).split('\n').every((l) => bs.has(l) || l.includes(MARCA)) })
  ok(contagem && semMarcaNova, 'D3 toda linha nova ou reescrita leva a marca, e a contagem bate (acréscimos + trocas)')
  const M95 = rd(F.meta95)
  ok(/export function semMeta95Refazer1910\(texto, p\) \{\n  texto = semAvatarPreso2010\(texto, p\)/.test(M95) && /^import \{ semAvatarPreso2010 \} from '\.\/desfaz-avatar-preso-2010\.mjs'/m.test(M95), 'D4 encadeado: semMeta95Refazer1910 (a camada mais nova do /api/compose até hoje) chama ESTE primeiro')
  const MU = rd('scripts/test-support/desfaz-menu-ugc-2010.mjs')
  ok(/export function semMenuUgc2010\(texto, p\) \{\n  texto = semAvatarPreso2010NosGuardioes\(texto, p\)/.test(MU) && /^import \{ semAvatarPreso2010NosGuardioes \} from '\.\/desfaz-avatar-preso-2010\.mjs'/m.test(MU), 'D4b encadeado na cabeça da cadeia geral: semMenuUgc2010 tira as reâncoras desta camada (só scripts/) primeiro; o /api/compose segue intacto nela (é a última versão alheia)')
  const guardioes = ['scripts/test-seedance-15s-3x6-2026-09-29.mjs', 'scripts/test-voz-15s-mesma-da-montagem-2026-09-29.mjs']
  ok(guardioes.every((g) => { try { return !semMenuUgc2010(fs.readFileSync(path.join(ROOT, g), 'utf8'), g).includes(MARCA) } catch { return false } }), 'D5b a cadeia geral (semMenuUgc2010) tira as reâncoras desta camada dos guardiões do 15 s (a linha da base volta inteira)')
  ok([F.compose, F.reserva].every((f) => { const t = fs.readFileSync(path.join(ROOT, f), 'utf8'); return semMenuUgc2010(t, f) === t }), 'D5c a cadeia geral NÃO mexe no /api/compose nem na reservation.ts (os guardiões que leem "a última versão alheia" seguem verdes)')
  const viaCadeia = semMeta95Refazer1910(fs.readFileSync(path.join(ROOT, F.compose), 'utf8'), F.compose)
  ok(!viaCadeia.includes(MARCA) && !viaCadeia.includes('KINEO-META95-REFAZER-1910'), 'D5 a cadeia do /api/compose tira esta camada e a de antes (nenhuma marca sobra)')
  ok(!MARCA_AVATAR_PRESO_2010.includes('KINEO-META95') && !'KINEO-META95-REFAZER-1910'.includes(MARCA), 'D6 a marca não contém a de nenhuma camada de antes')
  // diff: o que os commits DESTA entrega tocam + o que ainda não foi commitado
  const commits = git('log', '--format=%H%x09%s', `${AVATAR_PRESO_2010_BASE}..HEAD`).split('\n').filter(Boolean).map((l) => l.split('\t'))
  const nossos = commits.filter(([, s]) => s.includes(MARCA))
  const tocados = new Set()
  for (const [h] of nossos) for (const f of git('diff-tree', '--no-commit-id', '--name-only', '-r', h).split('\n').filter(Boolean)) tocados.add(f)
  for (const f of git('diff', '--name-only', 'HEAD').split('\n').filter(Boolean)) tocados.add(f)
  for (const f of git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean)) tocados.add(f)
  const permitidos = new Set([...AVATAR_PRESO_2010_ARQUIVOS, ...AVATAR_PRESO_2010_NOVOS])
  const fora = [...tocados].filter((f) => !permitidos.has(f))
  ok(fora.length === 0, `D7 o diff da entrega só toca a lista e os novos${fora.length ? ' — fora: ' + fora.join(', ') : ''}`)
  const meus = commits.filter(([h]) => { const fs2 = git('diff-tree', '--no-commit-id', '--name-only', '-r', h).split('\n'); return fs2.some((f) => AVATAR_PRESO_2010_NOVOS.includes(f)) })
  ok(meus.every(([, s]) => s.includes(MARCA) && s.includes('[TRAVA 8.2')), 'D8 todo commit da entrega leva a marca e a [TRAVA 8.2] no assunto')
}

// ─── M. mutantes ─────────────────────────────────────────────────────────────
console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
async function mut(nome, src, de, para, fn) {
  if (!src.includes(de)) { ok(false, `${nome} — âncora do mutante não encontrada`); return }
  const mutado = src.replace(de, para)
  if (mutado === src) { ok(false, `${nome} — mutante não aplicou`); return }
  const r = await tenta(() => fn(mutado))
  ok(r.length > 0, `${nome} → vermelho`)
}
const RES = rd(F.reserva)
await mut('M1 status volta a exigir igualdade (birth.creditCost !== cost)', RES, '!avatarComposeCostMatchesBirth(birth.claim.creditCost, cost, quality, metadata.duration)', 'birth.claim.creditCost !== cost', reservaProblems)
await mut('M2 conferência aceita qualquer número', RES, '  if (composeCost === birthCost) return true // KINEO-AVATAR-PRESO-2010', '  return true // KINEO-AVATAR-PRESO-2010', reservaProblems)
await mut('M3 conferência aceita qualquer número menor que o nascimento', RES, 'composeCost === creditCostForDuration(quality, true, d)', 'composeCost <= birthCost', reservaProblems)
await mut('M4 conferência ignora a duração do claim (usa 60 s)', RES, 'composeCost === creditCostForDuration(quality, true, d)', 'composeCost === creditCostForDuration(quality, true, 60)', reservaProblems)
await mut('M5 conferência deixa de checar a qualidade', RES, 'birth.claim.quality !== quality || ', '', reservaProblems)
await mut('M6 compose: reserva volta à régua de duração', COMPOSE, 'claimGenerationSubmission(avatarPrepaidCost ?? creditCostForDuration(quality, true, duration), false)', 'claimGenerationSubmission(creditCostForDuration(quality, true, duration), false)', composeProblems)
await mut('M7 compose: intent/claim final sem o custo do nascimento', COMPOSE, 'cinematicPrepaidCost ?? avatarPrepaidCost ?? creditCostForDuration(', 'cinematicPrepaidCost ?? creditCostForDuration(', composeProblems)
await mut('M8 compose: avatarPrepaidCost recalculado pela duração', COMPOSE, 'avatarBirthClaim ? avatarBirthClaim.creditCost : null // KINEO-AVATAR-PRESO-2010', 'avatarBirthClaim ? creditCostForDuration(quality, true, duration) : null // KINEO-AVATAR-PRESO-2010', composeProblems)
await mut('M9 compose: o custo do nascimento vaza para o cinematic (reserva = cinematicPrepaidCost)', COMPOSE, 'claimGenerationSubmission(avatarPrepaidCost ?? creditCostForDuration(quality, true, duration), false)', 'claimGenerationSubmission(cinematicPrepaidCost ?? avatarPrepaidCost ?? creditCostForDuration(quality, true, duration), false)', composeProblems)
await mut('M10 compose: checagem do nascimento contra a tabela some', COMPOSE, 'avatarBirthClaim.creditCost !== creditCostFor(quality, true) ||', 'false ||', composeProblems)
const ST = rd(F.status)
await mut('M11 status passa a debitar o avatar pré-pago (cobrança dupla)', ST, "(!prepaidAvatarClaim && (quality === 'avatar' || quality === 'presenter')) ||", "((quality === 'avatar' || quality === 'presenter')) ||", async (s) => statusProblems(s))
const CR = rd(F.cron)
await mut('M12 cron fase 3 filtra por motor (avatar fica de fora)', CR, "      .eq('name', 'compose_submission_claim')\n      .gte('created_at', minIso)", "      .eq('name', 'compose_submission_claim')\n      .eq('metadata->>quality', 'fast')\n      .gte('created_at', minIso)", async (s) => cronProblems(s))
{
  const de = '  texto = semAvatarPreso2010(texto, p)'
  const M95 = rd(F.meta95)
  const quebrado = M95.replace(de, '  // (sem a camada do avatar)')
  ok(M95.includes(de) && quebrado !== M95 && !/export function semMeta95Refazer1910\(texto, p\) \{\n  texto = semAvatarPreso2010\(texto, p\)/.test(quebrado), 'M13 cabeça da cadeia do /api/compose sem chamar esta camada → D4 vermelho')
  const MU = rd('scripts/test-support/desfaz-menu-ugc-2010.mjs')
  const deMU = '  texto = semAvatarPreso2010NosGuardioes(texto, p) // KINEO-AVATAR-PRESO-2010'
  const quebradoMU = MU.replace(deMU, '  // (sem a camada do avatar) //')
  ok(MU.includes(deMU) && quebradoMU !== MU && !/export function semMenuUgc2010\(texto, p\) \{\n  texto = semAvatarPreso2010NosGuardioes\(texto, p\)/.test(quebradoMU), 'M16 cabeça da cadeia geral sem chamar esta camada → D4b vermelho')
  let lancou = false
  try { semAvatarPreso2010(COMPOSE.replace(/\n {4}\/\/ KINEO-AVATAR-PRESO-2010 — \(claim assinado[^\n]*/, ''), F.compose) } catch { lancou = true }
  ok(lancou, 'M14 desfaz com um acréscimo a menos (comentário apagado à mão) lança → D1 vermelho')
  const R = rd(F.reserva), RB = base(F.reserva)
  const mexido = R.replace("if (claim.status !== 'done' && claim.status !== 'settled') {", "if (claim.status !== 'done') {")
  ok(mexido !== R && funcao(mexido, 'loadPrepaidAvatarClaimForGeneration') !== funcao(RB, 'loadPrepaidAvatarClaimForGeneration'), 'M15 mexer na função do Ads Produção (loadPrepaidAvatarClaimForGeneration) → S4 vermelho')
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
