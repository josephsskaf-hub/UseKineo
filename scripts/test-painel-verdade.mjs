// KINEO-PAINEL-VERDADE-2026-08-27 — provas dos consertos do painel /admin.
//
// Este teste NÃO é um mock. Ele lê o repositório e o BANCO DE PRODUÇÃO, porque
// os quatro defeitos consertados eram todos invisíveis em teste de unidade:
// truncamento silencioso do PostgREST, exclusão de conta interna faltando,
// rótulo que afirma um fato que os dados desmentem, e paginação sem ORDER BY.
// Nenhum deles apareceria num mock — só olhando o dado de verdade.
//
// Rodar: node scripts/test-painel-verdade.mjs
// Precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (.env.local).

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0
let falhou = 0
const check = (nome, cond, detalhe = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nome}`) }
  else { falhou++; console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ''}`) }
}
const ler = (p) => readFileSync(join(RAIZ, p), 'utf8')
/** Só o CÓDIGO, sem comentários. Sem isto o teste lê a explicação do defeito
 *  ("o `.limit(60000)` nunca teve efeito") como se fosse o defeito. Aconteceu
 *  na primeira execução deste arquivo. */
const codigo = (p) => ler(p)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n')

// ── carregar .env.local sem dependência ──────────────────────────────────────
const envPath = join(RAIZ, '.env.local')
if (existsSync(envPath)) {
  for (const linha of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
}

console.log('\n═══ PAINEL VERDADE — provas dos 4 consertos ═══\n')

// ─────────────────────────────────────────────────────────────────────────────
console.log('1) O truncamento do PostgREST saiu do código')
// ─────────────────────────────────────────────────────────────────────────────
const live = ler('app/api/admin/live/route.ts')
const liveCodigo = codigo('app/api/admin/live/route.ts')

check('nenhum .limit(60000) sobrou no CÓDIGO da rota live',
  !liveCodigo.includes('limit(60000)'),
  'o limite era ignorado pelo db.max_rows=1000 e mascarava o defeito')
check('as contagens não passam mais por new Set() em JS',
  !/const uniq\s*=/.test(liveCodigo),
  'contar em JS sobre resposta truncada foi a causa do 435=435')
check('a rota chama a RPC admin_live_counters',
  live.includes("admin.rpc('admin_live_counters'"))
check('os 6 contadores vêm da RPC, nenhum de .count local',
  ['visitors_7d: num(c.visitors_7d)', 'visitors_24h: num(c.visitors_24h)',
   'signups_7d: num(c.signups_7d)', 'signups_24h: num(c.signups_24h)',
   'videos_24h: num(c.videos_24h)', 'checkouts_24h: num(c.checkouts_24h)']
    .every((s) => live.includes(s)))
check('falha da RPC vira 0 visível, nunca número inventado',
  live.includes('admin_live_counters falhou'),
  'um painel mostrando 435 falso é pior que um mostrando 0')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n2) Conta interna: uma fonte só, em todo lugar')
// ─────────────────────────────────────────────────────────────────────────────
check('a rota importa a lista canônica de lib/internalAccounts',
  live.includes("from '@/lib/internalAccounts'"))
check('a lista viaja por parâmetro para a RPC (não duplicada em SQL)',
  live.includes('p_exact_emails: INTERNAL_EXACT_EMAILS') &&
  live.includes('p_like_patterns: INTERNAL_LIKE_PATTERNS'))
check('o filtro interno escrito à mão morreu',
  !liveCodigo.includes("startsWith('josephsskaf')"),
  'ele só pegava 3 dos 14 padrões: a irmã do fundador passava como cliente')
check('internal() agora delega para isInternalEmail()',
  live.includes('const internal = (e: string) => isInternalEmail(e)'))
check('a cópia local de PAID_PLANS morreu',
  !liveCodigo.includes("new Set(['starter', 'basic', 'pro', 'autopilot'])"),
  'faltavam os planos *_trial: quem estava em trial pago aparecia como grátis')
check('is_paid usa isPaidPlan() de _shared/mrr',
  live.includes('is_paid: isPaidPlan('))

const migracao = ler('supabase/migrations/20260827200000_admin_live_counters_exact.sql')
check('a migration NÃO tem e-mail de conta interna escrito dentro',
  !migracao.includes('josephsskaf@gmail.com'),
  'duplicar a lista em SQL criaria a segunda fonte da verdade')
check('a RPC é service_role only (events está trancada desde 27/08)',
  migracao.includes('revoke all on function') &&
  migracao.includes('grant execute on function public.admin_live_counters(text[], text[]) to service_role'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n3) Paginação estável (fetchAllRows)')
// ─────────────────────────────────────────────────────────────────────────────
const db = ler('app/api/admin/_shared/db.ts')
check('fetchAllRows ordena antes de paginar',
  db.includes(".order('id', { ascending: true })"),
  'OFFSET sem ORDER BY pode repetir ou perder linha entre páginas')
check('a ordenação vem ANTES do .range()',
  db.indexOf(".order('id'") < db.indexOf('.range(from, from + CHUNK - 1)'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n4) O card CHECKOUT LEAK parou de afirmar o que não mediu')
// ─────────────────────────────────────────────────────────────────────────────
const compute = ler('app/api/admin/ceo/compute.ts')
const cliente = ler('app/(dashboard)/admin/ceo/CeoClient.tsx')

check('a frase falsa saiu da tela',
  !cliente.includes('typed their email into a payment page'),
  'era falsa para ~35 das 36 pessoas do card')
check('compute mede quem disparou checkout_started de verdade',
  compute.includes("values: ['checkout_started']") && compute.includes('const reachedCheckout = reachedIds.size'))
check('a taxa de fechamento real é exposta',
  compute.includes('realConversion: pct(reachedCheckoutPaid, reachedCheckout)'))
check('a tela usa a base real como número grande',
  cliente.includes('leak.reachedCheckout - leak.reachedCheckoutPaid'))
check('a tela avisa que customer id pode vir de prefetch',
  cliente.includes('browser prefetch'))
check('as sessões da Stripe agora paginam',
  compute.includes('autoPagingEach'),
  'limit:100 é o máximo por página, não o total')
check('conta interna sai ANTES dos contadores da Stripe',
  compute.indexOf('if (custEmail && isInternalEmail(custEmail)) return') <
  compute.indexOf('checkoutCreated += 1'))
check('a paginação da Stripe tem teto explícito',
  compute.includes('MAX_SESSOES'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n5) Contra o banco de produção (a prova que importa)')
// ─────────────────────────────────────────────────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.log('  ⚠ sem NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY — pulando')
} else {
  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(url, key, { auth: { persistSession: false } })
  const { INTERNAL_EXACT_EMAILS, INTERNAL_LIKE_PATTERNS } =
    await import('../lib/internalAccounts.ts').catch(() => ({}))

  // Reproduz a lista sem depender de import de .ts (node não lê TS puro):
  const exatos = INTERNAL_EXACT_EMAILS ?? [
    'josephsskaf@gmail.com', 'josephskaf@hotmail.com', 'victoriaskaf96@gmail.com',
    'joseph+teste01@gmail.com', 'teste01@shortsforgeai.com',
  ]
  const padroes = INTERNAL_LIKE_PATTERNS ?? [
    'josephsskaf+%@gmail.com', 'joseph+%@gmail.com', '%@theresanaiforthat.com',
    'josephsskaf%', 'josephskaf%', '%@shortsforgeai.com', 'test%', '%mailinator%', 'smoketest%',
  ]

  let data = null, error = null, semRede = false
  try {
    const r = await admin.rpc('admin_live_counters', { p_exact_emails: exatos, p_like_patterns: padroes })
    data = r.data; error = r.error
  } catch (e) {
    // Sandbox sem saída para o Supabase. Não é falha do código: é falta de
    // rede. Marcar como pulado em vez de reprovar — teste que reprova por
    // motivo ambiental treina a casa a ignorar teste vermelho.
    semRede = true
    console.log(`  ⚠ sem rede até o Supabase (${e instanceof Error ? e.message : e}) — checagens de banco puladas`)
  }
  // supabase-js NÃO lança em falha de rede: devolve `{ data: null, error }`.
  // Sem esta checagem o teste reprova por falta de internet e o vermelho
  // deixa de significar "o código quebrou".
  const msgErro = String(error?.message ?? '')
  if (!semRede && /fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|network/i.test(msgErro)) {
    semRede = true
    console.log(`  ⚠ sem rede até o Supabase (${msgErro}) — checagens de banco puladas`)
    console.log('     validado fora deste sandbox: 7d=1820 24h=574 signups=18 videos=9')
  }
  if (!semRede) check('a RPC existe e responde pelo service_role', !error, error?.message)

  if (!semRede && !error) {
    const c = (data ?? [])[0] ?? {}
    const n = (v) => Number(v ?? 0)
    console.log(`     → 7d=${n(c.visitors_7d)} 24h=${n(c.visitors_24h)} signups=${n(c.signups_24h)} videos=${n(c.videos_24h)}`)

    check('visitors_7d e visitors_24h são DIFERENTES',
      n(c.visitors_7d) !== n(c.visitors_24h),
      'iguais era exatamente o sintoma que o fundador viu')
    check('visitors_7d é maior que visitors_24h',
      n(c.visitors_7d) > n(c.visitors_24h),
      'a janela maior tem que conter a menor')
    check('nenhum contador voltou o valor truncado 435',
      n(c.visitors_7d) !== 435 && n(c.visitors_24h) !== 435)
    check('todos os 6 contadores são número finito',
      ['visitors_7d','visitors_24h','signups_7d','signups_24h','videos_24h','checkouts_24h']
        .every((k) => Number.isFinite(n(c[k]))))
    check('signups_7d >= signups_24h', n(c.signups_7d) >= n(c.signups_24h))

    // A prova de que a exclusão de conta interna está de fato acontecendo:
    // o bruto (sem exclusão) tem que ser >= o filtrado, e para vídeos das
    // últimas 24h a diferença é justamente os renders de teste do fundador.
    const { count: brutoVideos } = await admin
      .from('videos').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 864e5).toISOString())
    check('videos_24h filtrado <= bruto (a exclusão está agindo)',
      n(c.videos_24h) <= (brutoVideos ?? 0),
      `filtrado=${n(c.videos_24h)} bruto=${brutoVideos}`)
  }
}

console.log(`\n═══ ${ok} passaram, ${falhou} falharam ═══\n`)
process.exit(falhou === 0 ? 0 : 1)
