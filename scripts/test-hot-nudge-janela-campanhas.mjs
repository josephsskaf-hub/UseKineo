// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO va-r15 — a exclusão "já entrou em outra campanha" TEM PRAZO
// ═══════════════════════════════════════════════════════════════════════════
//
// O QUE ELE PROVA, e por quê:
//
// Até 08/09 o send-checkout-hot-nudge consultava OUTRAS_CAMPANHAS sem nenhum
// corte de data. Uma carta de agosto calava PARA SEMPRE a carta que fala em
// 30 minutos: 74 das 99 pessoas com nome que bateram no checkout em 30 dias
// estavam fora por isso. Este guardião amarra o conserto à CHAMADA que decide
// (`.gte('created_at', corteOutrasCampanhas(agora))`), não à prosa do arquivo,
// e exercita a função pura nos dois lados da fronteira.
//
// Estilo readFileSync de propósito: guardião com alias `@/` morre no import
// antes da primeira verificação (memória `guardioes-com-alias-nao-rodam`).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import ts from 'typescript'
import { compileOffline, memoryDb } from './test-support/truncamento-dedupe-offline.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROTA = join(raiz, 'app/api/admin/send-checkout-hot-nudge/route.ts')
const src = readFileSync(ROTA, 'utf8')

let ok = 0
let falhou = 0
function check(nome, condicao) {
  // Ordem (nome, condição) fixa e conferida: `check(condicao, nome)` invertido
  // faz trava passar sem avaliar nada (memória `guardiao-vermelho-pode-estar-parado`).
  if (condicao === true) { ok++; return }
  falhou++
  console.log(`  🔴 ${nome}`)
}

// ── 1. A CHAMADA QUE DECIDE ────────────────────────────────────────────────
// Sem espaço-agnóstico não adianta: o checkout do Windows entrega \r\n.
const texto = src.replace(/\r\n/g, '\n')
const ast = ts.createSourceFile(ROTA, texto, ts.ScriptTarget.Latest, true)
function queriesIn(source, tree = ts.createSourceFile(ROTA, source, ts.ScriptTarget.Latest, true)) {
  const queries = []
  function methods(node, out = []) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      out.push({ name: node.expression.name.text, args: node.arguments.map((a) => a.getText(tree)) })
      methods(node.expression.expression, out)
    }
    return out
  }
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'readAll' && ts.isArrowFunction(node.arguments[0])) {
      queries.push({ node, builder: node.arguments[0].body, methods: methods(node.arguments[0].body) })
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return queries
}
const queries = queriesIn(texto, ast)
const named = (method, value) => queries.find((q) => q.methods.some((m) => m.name === method && m.args[0] === "'name'" && m.args[1] === value))
const outrasQuery = named('in', 'OUTRAS_CAMPANHAS')
const sentQuery = named('eq', 'SENT_EVENT')
const paidQuery = named('eq', "'payment_success'")
const dated = (query) => query?.methods.some((m) => ['gte', 'gt', 'lte', 'lt'].includes(m.name) && m.args[0] === "'created_at'")

check('a consulta de OUTRAS_CAMPANHAS existe no AST', Boolean(outrasQuery))
check(
  'a consulta de OUTRAS_CAMPANHAS é cortada por data',
  Boolean(outrasQuery?.methods.some((m) => m.name === 'gte' && m.args[0] === "'created_at'" && m.args[1] === 'corteOutrasCampanhas(agora)')),
)
check(
  'o corte usa o MESMO relógio do resto da rota (agora), não um new Date() solto',
  Boolean(outrasQuery?.methods.some((m) => m.name === 'gte' && m.args[1] === 'corteOutrasCampanhas(agora)')),
)
check('a janela é exportada (o guardião consegue importá-la)', /export const OUTRAS_CAMPANHAS_JANELA_DIAS/.test(texto))
check('a função de corte é exportada', /export function corteOutrasCampanhas\(/.test(texto))

// ── 2. AS TRAVAS QUE NÃO PODEM TER AFROUXADO JUNTO ─────────────────────────
// Este conserto ALARGA quem pode receber. Se alargar as outras cinco, vira defeito.
check(
  'o carimbo 1×-para-sempre (SENT_EVENT) continua SEM corte de data',
  Boolean(sentQuery && !dated(sentQuery) && sentQuery.methods.some((m) => m.name === 'in' && m.args[0] === "'user_id'" && m.args[1] === 'baseIds')),
)
check(
  'payment_success continua SEM corte de data (pagante nunca recebe)',
  Boolean(paidQuery && !dated(paidQuery)),
)
check('a supressão de 24h da casa continua chamada', /loadLifecycleSuppression\(/.test(texto))
check('a supressão continua filtrando os candidatos', /isSuppressed\(/.test(texto))
check('o opt-out continua excluindo', /email_opted_out === true/.test(texto))
check('os bloqueados continuam excluídos', /isBloqueado\(/.test(texto))
check('o filtro de pagante continua', /has_paid === true/.test(texto))
check('os 4 contatos proibidos do fundador continuam nomeados',
  ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin'].every((c) => texto.includes(c)))

// ── 3. A TELA DE APROVAÇÃO DIZ A VERDADE NOVA ──────────────────────────────
check('o dry-run publica a janela em dias', /outras_campanhas_janela_dias:\s*OUTRAS_CAMPANHAS_JANELA_DIAS/.test(texto))
check('a descrição da coorte deixou de prometer "nenhuma outra campanha" sem prazo',
  !/nunca pagou · nenhuma outra campanha · opt-in/.test(texto))

// ── 4. A FUNÇÃO PURA, NOS DOIS LADOS DA FRONTEIRA ──────────────────────────
// Extrai declarações AST e transpila a função REAL, sem carregar Stripe.
const pureNodes = ast.statements.filter((n) =>
  ts.isFunctionDeclaration(n) && n.name?.text === 'corteOutrasCampanhas' ||
  ts.isVariableStatement(n) && n.declarationList.declarations.some((d) => d.name.getText(ast) === 'OUTRAS_CAMPANHAS_JANELA_DIAS'))
check('janela e função reais foram localizadas no AST', pureNodes.length === 2)
const pure = compileOffline(pureNodes.map((n) => n.getText(ast)).join('\n'))
const dias = pure.OUTRAS_CAMPANHAS_JANELA_DIAS
check('a janela é um número positivo', Number.isFinite(dias) && dias > 0)
check('a janela NÃO é eterna (o defeito que este guardião mata)', Number.isFinite(dias) && dias < 3650)
check('a janela é curta o bastante para a carta quente valer (<= 30 dias)',
  Number.isFinite(dias) && dias <= 30)

const corte = pure.corteOutrasCampanhas
const agora = Date.parse('2026-09-08T03:00:00.000Z')
check('o corte fica ANTES de agora', Date.parse(corte(agora)) < agora)
check('a distância do corte é exatamente a janela em dias',
  Math.abs((agora - Date.parse(corte(agora))) / 86_400_000 - dias) < 1e-6)
// A fronteira, com a janela REAL do fonte: um dia a menos cala, um dia a mais não.
const corteReal = Date.parse(corte(agora))
check('carta de (janela - 1) dias atrás continua excluindo',
  agora - (dias - 1) * 86_400_000 >= corteReal)
check('carta de (janela + 1) dias atrás deixa de excluir',
  agora - (dias + 1) * 86_400_000 < corteReal)
check('carta de exatamente a janela está na borda inclusiva do .gte',
  agora - dias * 86_400_000 >= corteReal)
check('o corte é ISO-8601 com Z (o PostgREST exige)', /^\d{4}-\d{2}-\d{2}T.*Z$/.test(corte(agora)))

// ── 5. GET REAL: CARIMBO ANTIGO DEPOIS DA LINHA 1000 NÃO REENVIA ───────────
const now = Date.parse('2026-10-07T12:00:00Z')
class Clock extends Date { static now() { return now } }
const readAllSource = readFileSync(join(raiz, 'lib/supabase/readAll.ts'), 'utf8')
async function executeRoute(source, dbOptions = {}) {
  const events = Array.from({ length: 1201 }, (_, i) => ({
    id: String(i).padStart(6, '0'), name: 'checkout_hot_nudge_emailed_v1',
    user_id: i === 1200 ? 'old-recipient' : 'recent-recipient',
    created_at: new Date(now - (i === 1200 ? 90 * 86400000 : 3600000)).toISOString(),
  }))
  for (const user_id of ['old-recipient', 'recent-recipient']) events.push({ id: 'checkout-' + user_id, user_id, name: 'checkout_started', created_at: new Date(now - 60 * 60000).toISOString(), metadata: { stripe_session_id: 'cs_' + user_id, tier: 'starter' } })
  const profiles = ['old-recipient', 'recent-recipient'].map((id) => ({ id, email: id + '@fixture.invalid', email_opted_out: false, has_paid: false }))
  const db = memoryDb({ events, profiles, videos: [] }, dbOptions)
  const sent = [], stripeReads = []
  const readAll = compileOffline(readAllSource, { '../serverEvents': { writeServerEvent: async () => true } })
  const route = compileOffline(source, {
    '@/lib/supabase/readAll': readAll,
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { email: 'josephsskaf@gmail.com' } } }) } }) },
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/stripe': { stripe: { checkout: { sessions: { retrieve: async (id) => { stripeReads.push(id); return { status: 'open', url: 'https://fixture.invalid/session' } } } } } },
    '@/lib/emailSuppression': { emailFooterHtml: () => '', emailFooterText: () => '', unsubscribeHeaders: () => ({}) },
    '@/lib/lifecycle/suppression': { loadLifecycleSuppression: async () => ({ isSuppressed: () => false, suppressedCount: 0, degraded: false }) },
    '@/lib/momentumTopic': { pickMomentumTopic: () => null },
    '@/lib/checkoutPricing': { CARD_TRIAL_THEN_LABEL: 'FIXTURE/mo' },
  }, {
    Date: Clock,
    process: { env: { RESEND_API_KEY: 'OFFLINE', STRIPE_SECRET_KEY: 'OFFLINE', NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'OFFLINE' } },
    fetch: async (_url, init) => { sent.push(JSON.parse(init.body)); return { ok: true } },
  })
  const result = await route.GET({ headers: new Headers(), nextUrl: new URL('https://fixture.invalid/?confirm=SEND') })
  return { ...result, sent, db, stripeReads }
}
const complete = await executeRoute(texto)
check('GET real: envio de 90 dias atrás, linha 1201, impede reenvio', complete.status === 200 && complete.body.enviados === 0 && complete.sent.length === 0 && complete.stripeReads.length === 0)
check('GET real: dedupe efetivamente visitou segunda página com ORDER id', complete.db.calls.some((c) => c.table === 'events' && c.bounds[0] === 1000 && c.order.some(([k]) => k === 'id')))
const failure = await executeRoute(texto, { failTable: 'events', failFrom: 1000 })
check('GET real: erro na segunda página aborta sem enviar nem gravar', failure.status === 500 && failure.sent.length === 0 && failure.db.writes.length === 0)
if (!sentQuery) throw new Error('Não é possível testar mutante sem localizar a consulta SENT_EVENT')
const windowed = texto.slice(0, sentQuery.builder.end) + ".gte('created_at', corteOutrasCampanhas(agora))" + texto.slice(sentQuery.builder.end)
check('mutante de janela aplicado só à consulta SENT_EVENT', windowed !== texto && queriesIn(windowed).some((q) => q.methods.some((m) => m.name === 'eq' && m.args[1] === 'SENT_EVENT') && dated(q)))
const unsafe = await executeRoute(windowed)
check('mutante morto: janela indevida remove carimbo antigo e provoca exatamente um reenvio', unsafe.status === 200 && unsafe.body.enviados === 1 && unsafe.sent.length === 1 && unsafe.sent[0].to === 'old-recipient@fixture.invalid')

console.log(`\n${falhou === 0 ? '✅' : '🔴'} ${ok} verdes, ${falhou} vermelhas`)
process.exit(falhou === 0 ? 0 : 1)
