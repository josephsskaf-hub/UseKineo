#!/usr/bin/env node
// ═══ KINEO-BILLING-MISMATCH-2026-09-03 — divergencia de custo vira SINAL ═════
//
// O caso (docs/BILLING-MISMATCH-2026-09-03.md): o preco do filme e calculado
// DUAS vezes — no nascimento pela duracao PEDIDA, no compose pela duracao
// ENTREGUE — e `loadSettledCinematicClaimForRender` recusava a entrega quando
// os dois numeros nao batiam. Medido no banco em 03/09: dos 6 pares
// nascimento x compose que nunca viraram linha em `videos`, 5 tinham custo
// divergente (o mais recente em 02/09 03:31, wummm709, nascimento 19 x
// compose 15, com o credito JA estornado e 0 filmes na vida). O guarda cobrava
// 100% da entrega por 0% de risco financeiro: cobranca dobrada continua
// impossivel pela idempotencia de `debit_video_credits` (PK render_id) e pelo
// guarda da linha em `videos`.
//
// Este teste prova, com o modulo REAL compilado (nada de reimplementacao):
//   1. custo divergente ENTREGA o filme e grava UM `cinematic_cost_drift`;
//   2. o id do evento e deterministico — 20 polls do /api/compose/status nao
//      viram 20 linhas iguais em `events`;
//   3. falha de escrita do evento NUNCA derruba a entrega;
//   4. o que prova POSSE continua duro: quality, prefixo `cinematic-`,
//      assinatura do claim de compose, `composeId` derivado do usuario;
//   5. a lista explicita de razoes de estorno entrega as 9 conhecidas e recusa
//      qualquer razao nova (decisao humana antes de liberar entrega);
//   6. o codigo-fonte nao tem mais `creditCost !== cost` na recusa.
//
// Rodar: node scripts/test-billing-drift.mjs   (sem rede, sem custo)

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

function acharTsc(base) {
  const tentativas = []
  let dir = base
  for (let i = 0; i < 6; i++) {
    tentativas.push(join(dir, 'node_modules', 'typescript', 'bin', 'tsc'))
    const pai = dirname(dir)
    if (pai === dir) break
    dir = pai
  }
  for (const t of tentativas) if (existsSync(t)) return t
  console.error('Nao achei o typescript. Rode `npm install` na pasta do projeto.\nProcurei em:\n  ' + tentativas.join('\n  '))
  process.exit(1)
}
const TSC = acharTsc(raiz)

// claim.ts so importa `@/lib/composeClaim` (codigo) e o TIPO SupabaseClient
// (apagado na emissao). Trocamos os dois por arquivos locais e compilamos.
const saida = mkdtempSync(join(tmpdir(), 'kineo-drift-'))
const requerer = createRequire(join(saida, 'x.cjs'))
mkdirSync(join(saida, 'src'), { recursive: true })
const fonteClaim = readFileSync(join(raiz, 'lib/cinematic/claim.ts'), 'utf8')
writeFileSync(
  join(saida, 'src', 'claim.ts'),
  fonteClaim
    .replace("from '@/lib/composeClaim'", "from './composeClaim'")
    .replace("import type { SupabaseClient } from '@supabase/supabase-js'", "import type { SupabaseClient } from './supabaseStub'"),
)
writeFileSync(join(saida, 'src', 'composeClaim.ts'), readFileSync(join(raiz, 'lib/composeClaim.ts'), 'utf8'))
writeFileSync(join(saida, 'src', 'supabaseStub.ts'), 'export type SupabaseClient = any\n')
try {
  execFileSync(process.execPath, [
    TSC,
    join(saida, 'src', 'claim.ts'),
    join(saida, 'src', 'composeClaim.ts'),
    join(saida, 'src', 'supabaseStub.ts'),
    '--outDir', join(saida, 'out'), '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--skipLibCheck', '--strict', '--rootDir', join(saida, 'src'),
  ], { stdio: 'pipe' })
  writeFileSync(join(saida, 'out', 'package.json'), JSON.stringify({ type: 'commonjs' }))
} catch (e) {
  console.error('Nao consegui compilar:\n', e.stdout?.toString() || e.message)
  process.exit(1)
}

const claimMod = requerer(join(saida, 'out', 'claim.js'))
const composeMod = requerer(join(saida, 'out', 'composeClaim.js'))
const {
  loadSettledCinematicClaimForRender,
  cinematicClaimId,
  cinematicValueHash,
  signCinematicClaim,
  CINEMATIC_CLAIM_EVENT,
  CINEMATIC_CLAIM_PATH,
  CINEMATIC_COST_DRIFT_EVENT,
  CINEMATIC_DELIVERABLE_REFUND_REASONS,
} = claimMod
const { composeClaimId, signComposeClaim, COMPOSE_CLAIM_EVENT, COMPOSE_CLAIM_PATH } = composeMod

let ok = 0
const falhas = []
function conferir(nome, condicao, detalhe) {
  if (condicao) { ok++; return }
  falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ''}`)
}

// ─── fixtures ───────────────────────────────────────────────────────────────
const SEGREDO = 'segredo-de-teste-nao-e-o-de-producao'
const USER = '11111111-2222-3333-4444-555555555555'
const GEN = 'gen_wummm709_0902'
const RENDER = 'render-abc-123'
const HASH64 = 'a'.repeat(64)

function claimAuthorityLocal(claim) {
  return {
    claimId: claim.id,
    userId: claim.userId,
    generationId: claim.generationId,
    status: claim.status,
    fingerprint: claim.fingerprint,
    creditCost: claim.creditCost,
    quality: claim.quality,
    engine: claim.engine,
    falRequestIds: claim.falRequestIds,
    falModels: claim.falModels,
    authorizedCompletedUrls: claim.authorizedCompletedUrls,
    ...(claim.responseHash ? { responseHash: claim.responseHash } : {}),
    ...(claim.resolutionReason ? { resolutionReason: claim.resolutionReason } : {}),
    ...(claim.resolutionReference ? { resolutionReference: claim.resolutionReference } : {}),
  }
}

function linhaNascimento(opcoes) {
  const {
    creditCost, quality = 'cinematic_ai', status = 'released',
    reason = 'provider_abandoned_refunded', reference = `cinematic-${RENDER}`,
    userId = USER, generationId = GEN,
  } = opcoes
  const engine = 'fal-ai/bytedance/seedance'
  const falRequestIds = ['req-1', 'req-2']
  const falModels = [engine, engine]
  const authorizedCompletedUrls = ['https://v3b.fal.media/um.mp4', 'https://v3b.fal.media/dois.mp4']
  const response = {
    generationId,
    quality,
    fal_request_ids: falRequestIds,
    fal_models: falModels,
  }
  const responseHash = cinematicValueHash(response)
  const claim = {
    id: cinematicClaimId(userId, generationId),
    userId,
    generationId,
    status,
    fingerprint: HASH64,
    creditCost,
    quality,
    engine,
    falRequestIds,
    falModels,
    authorizedCompletedUrls,
    response,
    responseHash,
    resolutionReason: reason,
    resolutionReference: reference,
    startedAt: '2026-09-02T03:20:00.000Z',
    completedAt: '2026-09-02T03:29:00.000Z',
    resolvedAt: '2026-09-02T03:31:00.000Z',
    authority: '',
  }
  claim.authority = signCinematicClaim(SEGREDO, claimAuthorityLocal(claim))
  return {
    id: claim.id,
    user_id: userId,
    name: CINEMATIC_CLAIM_EVENT,
    path: CINEMATIC_CLAIM_PATH,
    session_id: generationId,
    created_at: '2026-09-02T03:20:00.000Z',
    metadata: {
      generation_id: generationId,
      status,
      fingerprint: claim.fingerprint,
      credit_cost: creditCost,
      quality,
      engine,
      fal_request_ids: falRequestIds,
      fal_models: falModels,
      authorized_completed_urls: authorizedCompletedUrls,
      response,
      response_hash: responseHash,
      resolution_reason: reason,
      resolution_reference: reference,
      started_at: claim.startedAt,
      completed_at: claim.completedAt,
      resolved_at: claim.resolvedAt,
      authority: claim.authority,
    },
  }
}

function linhaCompose(opcoes) {
  const {
    cost, quality = 'cinematic_ai', userId = USER, generationId = GEN,
    renderId = RENDER, duration = null, assinaturaBoa = true, idBom = true,
  } = opcoes
  const claimId = composeClaimId(userId, generationId)
  const authority = signComposeClaim(SEGREDO, {
    claimId, userId, generationId, status: 'done', renderId, quality, cost,
  })
  return {
    id: idBom ? claimId : composeClaimId('outro-usuario', generationId),
    user_id: userId,
    name: COMPOSE_CLAIM_EVENT,
    path: COMPOSE_CLAIM_PATH,
    session_id: generationId,
    created_at: '2026-09-02T03:31:00.000Z',
    metadata: {
      status: 'done',
      render_id: renderId,
      generation_id: generationId,
      quality,
      cost,
      ...(duration === null ? {} : { duration }),
      authority: assinaturaBoa ? authority : 'f'.repeat(64),
    },
  }
}

// ─── banco de mentira ───────────────────────────────────────────────────────
function bancoFalso(linhas, opcoes = {}) {
  const gravadas = []
  const db = {
    gravadas,
    from() {
      const estado = { filtros: {}, contains: null }
      const construtor = {
        select: () => construtor,
        eq: (coluna, valor) => { estado.filtros[coluna] = valor; return construtor },
        contains: (_coluna, objeto) => { estado.contains = objeto; return construtor },
        limit: () => construtor,
        maybeSingle: async () => {
          if (opcoes.erroDeLeitura) return { data: null, error: { message: opcoes.erroDeLeitura } }
          const achada = linhas.find((linha) => {
            for (const [coluna, valor] of Object.entries(estado.filtros)) {
              if (linha[coluna] !== valor) return false
            }
            if (estado.contains) {
              for (const [chave, valor] of Object.entries(estado.contains)) {
                if (linha.metadata?.[chave] !== valor) return false
              }
            }
            return true
          })
          return { data: achada ?? null, error: null }
        },
        insert: (linha) => {
          if (opcoes.insertExplode) throw new Error('events insert explodiu')
          const duplicada = gravadas.some((g) => g.id === linha.id)
          if (!duplicada) gravadas.push(linha)
          const resultado = duplicada
            ? { data: null, error: { code: '23505', message: 'duplicate key' } }
            : { data: linha, error: null }
          const encadeavel = {
            select: () => encadeavel,
            maybeSingle: async () => resultado,
            then: (resolver) => Promise.resolve(resultado).then(resolver),
          }
          return encadeavel
        },
      }
      return construtor
    },
  }
  return db
}

const carregar = (db, extras = {}) => loadSettledCinematicClaimForRender({
  db, secret: SEGREDO, userId: USER, renderId: RENDER, ...extras,
})

// ─── 1. o caso real: nascimento 19 x compose 15, released+refunded ─────────
{
  const db = bancoFalso([linhaNascimento({ creditCost: 19 }), linhaCompose({ cost: 15, duration: 35 })])
  const r = await carregar(db)
  conferir('wummm709: entrega o filme', r.ok === true && !!r.claim, JSON.stringify(r).slice(0, 200))
  conferir('wummm709: autoridade do custo e o NASCIMENTO', r.claim?.creditCost === 19)
  conferir('wummm709: 1 evento de drift', db.gravadas.length === 1, `gravou ${db.gravadas.length}`)
  const ev = db.gravadas[0]
  conferir('drift: nome do evento', ev?.name === CINEMATIC_COST_DRIFT_EVENT)
  conferir('drift: dono', ev?.user_id === USER)
  conferir('drift: session_id = generation', ev?.session_id === GEN)
  conferir('drift: custo do nascimento', ev?.metadata?.birth_credit_cost === 19)
  conferir('drift: custo do compose', ev?.metadata?.compose_credit_cost === 15)
  conferir('drift: delta assinado', ev?.metadata?.drift === -4)
  conferir('drift: render id', ev?.metadata?.render_id === RENDER)
  conferir('drift: razao do estorno', ev?.metadata?.resolution_reason === 'provider_abandoned_refunded')
  conferir('drift: status do nascimento', ev?.metadata?.birth_status === 'released')
  conferir('drift: duracao do compose quando existe', ev?.metadata?.compose_duration === 35)
  conferir('drift: marca que ENTREGOU', ev?.metadata?.delivered === true)
  conferir('drift: id em formato uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(ev?.id ?? ''))
  conferir('drift: id NAO e o id do claim', ev?.id !== cinematicClaimId(USER, GEN))
}

// ─── 2. o outro caso real (compose MAIOR): tsatsraljess 27 x 45 ───────────
{
  const db = bancoFalso([
    linhaNascimento({ creditCost: 27, quality: 'cinematic_h3' }),
    linhaCompose({ cost: 45, quality: 'cinematic_h3' }),
  ])
  const r = await carregar(db)
  conferir('tsatsraljess: entrega o filme', r.ok === true && r.claim?.creditCost === 27)
  conferir('tsatsraljess: delta positivo', db.gravadas[0]?.metadata?.drift === 18)
  conferir('tsatsraljess: sem duracao no compose, sem campo', !('compose_duration' in (db.gravadas[0]?.metadata ?? {})))
}

// ─── 3. 20 polls = 1 linha (id deterministico) ─────────────────────────────
{
  const db = bancoFalso([linhaNascimento({ creditCost: 19 }), linhaCompose({ cost: 15 })])
  const ids = new Set()
  for (let i = 0; i < 20; i++) {
    const r = await carregar(db)
    conferir(`poll ${i + 1} entrega`, r.ok === true && !!r.claim)
    ids.add(db.gravadas[0]?.id)
  }
  conferir('20 polls gravam 1 linha so', db.gravadas.length === 1, `gravou ${db.gravadas.length}`)
  conferir('20 polls usam o mesmo id', ids.size === 1)
}

// ─── 4. custos iguais: entrega e NAO grava nada ────────────────────────────
{
  const db = bancoFalso([linhaNascimento({ creditCost: 20 }), linhaCompose({ cost: 20 })])
  const r = await carregar(db)
  conferir('custos iguais: entrega', r.ok === true && !!r.claim)
  conferir('custos iguais: zero evento', db.gravadas.length === 0)
}

// ─── 5. observabilidade nunca derruba entrega ──────────────────────────────
{
  const db = bancoFalso(
    [linhaNascimento({ creditCost: 19 }), linhaCompose({ cost: 15 })],
    { insertExplode: true },
  )
  const r = await carregar(db)
  conferir('insert explodindo: filme entregue mesmo assim', r.ok === true && !!r.claim)
}

// ─── 6. o que prova POSSE continua duro ────────────────────────────────────
{
  const db = bancoFalso([
    linhaNascimento({ creditCost: 19, quality: 'cinematic_ai' }),
    linhaCompose({ cost: 15, quality: 'cinematic_kling' }),
  ])
  const r = await carregar(db)
  conferir('quality diferente: RECUSA', r.ok === false, JSON.stringify(r).slice(0, 120))
  conferir('quality diferente: nao grava drift', db.gravadas.length === 0)
}
{
  const db = bancoFalso([
    linhaNascimento({ creditCost: 19, reference: 'avatar-render-abc-123' }),
    linhaCompose({ cost: 15 }),
  ])
  const r = await carregar(db)
  conferir('referencia sem prefixo cinematic-: RECUSA', r.ok === false)
}
{
  const db = bancoFalso([linhaNascimento({ creditCost: 19 }), linhaCompose({ cost: 15, assinaturaBoa: false })])
  const r = await carregar(db)
  conferir('claim de compose com assinatura falsa: RECUSA', r.ok === false)
}
{
  const db = bancoFalso([linhaNascimento({ creditCost: 19 }), linhaCompose({ cost: 15, idBom: false })])
  const r = await carregar(db)
  conferir('claim de compose com id de outro usuario: RECUSA', r.ok === false)
}
{
  const db = bancoFalso([linhaNascimento({ creditCost: 19, status: 'done', reason: '', reference: '' }), linhaCompose({ cost: 15 })])
  const r = await carregar(db)
  conferir('nascimento nem debitado nem estornado: RECUSA', r.ok === false)
}

// ─── 7. a lista de razoes: as 9 conhecidas entregam ────────────────────────
const RAZOES_ESPERADAS = [
  'provider_all_failed_refunded',
  'provider_failed_refunded',
  'provider_abandoned_refunded',
  'provider_rejected_refunded',
  'provider_balance_rejected_refunded',
  'explicit_pre_provider_failure_refunded',
  'stale_pending_refunded',
  'narration_too_short_no_charge_refunded',
  'dry_run_no_charge_refunded',
]
for (const razao of RAZOES_ESPERADAS) {
  const db = bancoFalso([linhaNascimento({ creditCost: 19, reason: razao }), linhaCompose({ cost: 15 })])
  const r = await carregar(db)
  conferir(`razao ${razao}: entrega`, r.ok === true && !!r.claim)
  conferir(`razao ${razao}: na constante exportada`, CINEMATIC_DELIVERABLE_REFUND_REASONS.has(razao))
}
conferir('a constante tem exatamente as 9 razoes', CINEMATIC_DELIVERABLE_REFUND_REASONS.size === RAZOES_ESPERADAS.length,
  `tem ${CINEMATIC_DELIVERABLE_REFUND_REASONS.size}`)
for (const razao of ['trial_cap_refunded', 'credits_refunded', 'provider_qualquer_coisa_refunded', 'refunded']) {
  const db = bancoFalso([linhaNascimento({ creditCost: 19, reason: razao }), linhaCompose({ cost: 15 })])
  const r = await carregar(db)
  conferir(`razao desconhecida ${razao}: RECUSA (decisao humana antes)`, r.ok === false)
}

// ─── 8. nada de claim = nada de erro (contrato antigo intacto) ─────────────
{
  const db = bancoFalso([])
  const r = await carregar(db)
  conferir('sem claim de compose: ok com claim nulo', r.ok === true && r.claim === null)
}
{
  const db = bancoFalso([linhaNascimento({ creditCost: 19 }), linhaCompose({ cost: 15 })], { erroDeLeitura: 'PGRST000' })
  const r = await carregar(db)
  conferir('erro de leitura: propaga como falha (503 la em cima)', r.ok === false)
}
{
  const r = await carregar(bancoFalso([]), { renderId: '' })
  conferir('render id vazio: ok com claim nulo', r.ok === true && r.claim === null)
}

// ─── 9. o fonte: a linha da recusa morreu, a ordem esta certa ──────────────
{
  const fonte = fonteClaim
  const trechoGuarda = fonte.slice(fonte.indexOf('const isDebited ='), fonte.indexOf('async function recordCinematicCostDrift'))
  const recusa = trechoGuarda.slice(trechoGuarda.indexOf('  if ('), trechoGuarda.indexOf("billing mismatch'"))
  conferir('fonte: `creditCost !== cost` saiu da condicao de recusa', !recusa.includes('creditCost !== cost'), recusa.trim().slice(0, 200))
  conferir('fonte: quality continua na recusa', recusa.includes('birth.claim.quality !== quality'))
  conferir('fonte: prefixo cinematic- continua na recusa', recusa.includes("startsWith('cinematic-')"))
  conferir('fonte: o regex de 3 razoes morreu no guarda', !fonte.includes('_refunded$/.test(birth.claim.resolutionReason)'))
  conferir('fonte: a constante e usada no isRefunded', trechoGuarda.includes('CINEMATIC_DELIVERABLE_REFUND_REASONS.has(birth.claim.resolutionReason)'))
  const iRecusa = fonte.indexOf("return { ok: false, error: 'cinematic birth/compose billing mismatch' }")
  const iDrift = fonte.indexOf('await recordCinematicCostDrift(')
  conferir('fonte: o drift so e gravado DEPOIS das checagens de posse', iRecusa > 0 && iDrift > iRecusa)
  const iRetorno = fonte.indexOf('return { ok: true, claim: birth.claim }')
  conferir('fonte: o drift e gravado ANTES de devolver o claim', iDrift > 0 && iDrift < iRetorno)
  conferir('fonte: id deterministico com namespace proprio', fonte.includes("'kineo:cinematic-cost-drift:v1'"))
  conferir('fonte: o insert do drift esta dentro de try/catch', /try \{\s*await args\.db\.from\('events'\)\.insert/.test(fonte))
  conferir('fonte: releaseCinematicClaim NAO foi afrouxado (settled ainda exige provider_*)',
    fonte.includes('settled claim can only be released after its provider debit is refunded'))
}

// ─── placar ────────────────────────────────────────────────────────────────
console.log(`\n${ok} verificacoes OK, ${falhas.length} falhas`)
if (falhas.length) {
  for (const f of falhas) console.log('  x ' + f)
  process.exit(1)
}
console.log('OK A2: divergencia de custo entrega o filme e vira sinal; posse continua dura.')
