// KINEO-RESFRIAMENTO-SALDO-1111 — a trava anti-abuso do filme não conta a recusa por SALDO da fal; a frase do filme
// estacionado não promete prazo.
// Trava (Node puro, sem rede/banco): (a) a lib real executada: só os 2 motivos de saldo ficam de fora; (b) o filtro REAL da rota,
// extraído e executado contra linhas de claim: 2 recusas por saldo não trancam, 2 recusas de conteúdo trancam, mistura 1+1 não
// tranca; (c) a frase do estacionado sem "few minutes"/"shortly"/"soon", mantendo salvo/e-mail/crédito de volta.
// Mutantes em memória no fim.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const ts = (await import('typescript')).default
const cjs = (src) => { const m = { exports: {} }; new Function('module', 'exports', ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(m, m.exports); return m.exports }
const SRC = { lib: read('lib/cinematic/resfriamentoSaldo.ts'), route: read('app/api/generate-video-cinematic/route.ts'), fila: read('lib/filaQuedaFal.ts') }
const AUTH = 'a'.repeat(64)
const linha = (reason) => ({ metadata: { status: 'released', authority: AUTH, resolution_reason: reason } })

function problems(S) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let L
  try { L = cjs(S.lib) } catch (e) { return [`lib não executa: ${e.message}`] }
  no(L.estornoPorSaldo('provider_balance_rejected_refunded') !== true || L.estornoPorSaldo('provider_balance_rejected_partial_refunded') !== true, 'lib: recusa por saldo não reconhecida')
  for (const r of ['provider_rejected_refunded', 'provider_failed_refunded', 'provider_all_failed_refunded', 'provider_abandoned_refunded', 'provider_failure_refunded', '', null, undefined, 42])
    no(L.estornoPorSaldo(r) !== false, `lib: ${String(r)} saiu da trava (só saldo pode sair)`)

  // (b) o filtro da rota, executado
  const i = S.route.indexOf('const recentRefundedFailures = (recentClaims ?? []).filter((row) => {')
  const j = S.route.indexOf('}).length', i)
  if (i < 0 || j < 0) return [...p, 'rota: filtro da trava não encontrado']
  const corpo = S.route.slice(i, j + '}).length'.length).replace('const recentRefundedFailures = ', 'return ')
  let conta
  try {
    const js = ts.transpileModule(`function f(recentClaims, estornoPorSaldo) { ${corpo} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
    conta = new Function(`${js}; return f`)()
  } catch (e) { return [...p, `rota: filtro não executa (${e.message})`] }
  const trava = (reasons) => conta(reasons.map(linha), L.estornoPorSaldo) >= 2
  no(trava(['provider_balance_rejected_refunded', 'provider_balance_rejected_refunded']), 'rota: 2 recusas por saldo trancam a pessoa')
  no(trava(['provider_balance_rejected_partial_refunded', 'provider_balance_rejected_refunded']), 'rota: saldo parcial + saldo trancam')
  no(trava(['provider_balance_rejected_refunded', 'provider_rejected_refunded']), 'rota: 1 saldo + 1 recusa de conteúdo trancam (só 1 conta)')
  no(!trava(['provider_rejected_refunded', 'provider_failed_refunded']), 'rota: 2 recusas de conteúdo deixaram de trancar (a trava anti-abuso morreu)')
  no(trava(['empty_plan_rejected_refunded', 'empty_plan_rejected_refunded']), 'rota: plano vazio voltou a contar')
  no(!S.route.includes("import { estornoPorSaldo } from '@/lib/cinematic/resfriamentoSaldo'"), 'rota: não importa a lib')

  // (c) a frase
  const m = S.fila.match(/export const PARKED_MESSAGE =\s*\n?\s*"([^"]+)"/)
  const msg = m ? m[1] : ''
  no(!msg, 'frase: PARKED_MESSAGE ilegível')
  no(/few minutes|shortly|\bsoon\b|in a moment/i.test(msg), `frase: promete prazo ("${msg.slice(0, 60)}")`)
  no(!/engine is paused/.test(msg) || !/Your film is saved/.test(msg) || !/email/.test(msg) || !/back in your account/.test(msg), 'frase: perdeu pausado/salvo/e-mail/crédito de volta')
  return p
}

const atual = problems(SRC)
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo')
const MUT = [
  ['M1 rota sem a exclusão do saldo', 'route', (s) => s.replace(" &&\n          !estornoPorSaldo(metadata.resolution_reason) // KINEO-RESFRIAMENTO-SALDO-1111 — a fal sem saldo é da casa, não da pessoa", '')],
  ['M2 lib tira toda recusa do fornecedor', 'lib', (s) => s.replace("return typeof reason === 'string' && MOTIVOS_DE_SALDO.includes(reason)", "return typeof reason === 'string' && reason.startsWith('provider_')")],
  ['M3 lib esquece o saldo parcial', 'lib', (s) => s.replace(", 'provider_balance_rejected_partial_refunded'", '')],
  ['M4 frase volta a prometer minutos', 'fila', (s) => s.replace('"Our video engine is paused right now.', '"Our video engine is paused for a few minutes.')],
  ['M5 frase perde o crédito de volta', 'fila', (s) => s.replace('your credits are back in your account', 'your credits are held')],
]
for (const [nome, k, f] of MUT) {
  const s2 = f(SRC[k])
  if (s2 === SRC[k]) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const v = problems({ ...SRC, [k]: s2 })
  if (!v.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${v[0]})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
