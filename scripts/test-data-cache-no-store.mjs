// sprint-assinaturas #17 — prova viva do Data Cache em rota SO-GET do Next 14.2
// (a) roda o patch-fetch REAL do next com um store igual ao de uma rota GET-only
//     `force-dynamic` (revalidate=false, fetchCache undefined) e mostra que um GET
//     com Authorization e servido do cache na 2a chamada (o banco mudou, a rota nao viu);
// (b) o mesmo store com fetchCache='force-no-store' bate na origem todas as vezes;
// (c) toda rota SO-GET de app/** tem no-store/TTL explicito ou fonte inteira revisada sem fetch de servidor;
// (d) compose grava o custo do NASCIMENTO no claim de compose; stranded grava o erro.
import fs from 'node:fs'
import path from 'node:path'
import { AsyncLocalStorage } from 'node:async_hooks'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const require = createRequire(import.meta.url)
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const { patchFetch } = require('next/dist/server/lib/patch-fetch.js')
async function simulate({ fetchCache, revalidate = false }) {
  let origin = 0
  const store = new Map()
  const als = new AsyncLocalStorage()
  const realFetch = globalThis.fetch
  globalThis.fetch = async () => { origin++; return new Response(JSON.stringify([{ n: origin }]), { status: 200, headers: { 'content-type': 'application/json' } }) }
  patchFetch({ serverHooks: require('next/dist/server/app-render/dynamic-rendering.js'), staticGenerationAsyncStorage: als })
  const incrementalCache = {
    async fetchCacheKey(url, init) { return url + '|' + (init?.headers?.authorization ?? '') },
    async lock() { return async () => {} },
    async get(key) { const v = store.get(key); return v ? { isStale: false, value: v.value, revalidateAfter: false } : null },
    async set(key, value) { store.set(key, { value }) },
    revalidateTag() {},
  }
  const sgStore = { isStaticGeneration: false, forceDynamic: true, revalidate, fetchCache, incrementalCache, urlPathname: '/api/cron/x', tags: [], pendingRevalidates: {} }
  const bodies = []
  await als.run(sgStore, async () => {
    for (let i = 0; i < 2; i++) {
      const r = await fetch('https://db.example/rest/v1/events?select=id&name=eq.stranded_composed', { method: 'GET', headers: { authorization: 'Bearer svc', apikey: 'svc' } })
      bodies.push(await r.text())
    }
  })
  globalThis.fetch = realFetch
  return { origin, bodies }
}
const cached = await simulate({ fetchCache: undefined })
ok(cached.origin === 1 && cached.bodies[0] === cached.bodies[1], `(a) sem interruptor: 2 fetches, ${cached.origin} ida(s) a origem, respostas iguais = leitura VELHA (o defeito do wummm709/be9c6314)`)
const fresh = await simulate({ fetchCache: 'force-no-store' })
ok(fresh.origin === 2 && fresh.bodies[0] !== fresh.bodies[1], `(b) fetchCache='force-no-store': 2 fetches, ${fresh.origin} idas a origem, respostas diferentes = banco de verdade`)
const zeroTtl = await simulate({ revalidate: 0 })
ok(zeroTtl.origin === 2 && zeroTtl.bodies[0] !== zeroTtl.bodies[1], '(b) revalidate=0 desliga o Data Cache; nao e ISR de TTL positivo')

// (c) cobertura
const routes = []
;(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'route.ts') routes.push(p) } })('app')
const getOnly = routes.filter((f) => { const s = fs.readFileSync(f, 'utf8'); return /export (async )?function GET|export const GET/.test(s) && !/export (async )?function (POST|PUT|DELETE|PATCH|OPTIONS)|export const (POST|PUT|DELETE|PATCH|OPTIONS)/.test(s) })
// Exactly reviewed source from sealed 95911ee1: static payloads, pure redirects
// and the browser-only Shopify bootstrap do not perform server data fetches.
// A changed byte or any other GET route still requires the normal cache policy.
const pureRoutes = {
  'app/.well-known/openai-apps-challenge/route.ts': 'a5bd633dcfef62e5d2d4e30f7f24b014c11ec8bfec5a53053febc038a4ab877d',
  'app/agency-production-scope.txt/route.ts': '6b70c6a5dc78fdd01f3e5035dd6e9591a18c8f90796d41cd4f0d5d3b3399c7f6',
  'app/ai-faceless-video-generator/route.ts': '9896018f4f5e777811aaa89bfb7aca875fed9726298eef8fc65ca9d87c0f86cf',
  'app/api/shopify/auth/route.ts': '94f049f8af8dce4e47b9aa0b2aee48e85f8b083fd5164d7b5daba92027b7bf3e',
  'app/s/[channel]/route.ts': '8ac98d43e27e2ab8daa5c4e01c14b2ed5380781ba5ba007ef68f4532767fd9e9',
  'app/shopify/app/route.ts': '781ce79fbfa797964a2d3e4fbfbcb2fc8b7bbce41743f9f23f25eda1c8c0c716',
  'app/short-form-video-vendor-evaluation.csv/route.ts': '8a3ce76c841330776ad25b61a35bab96306663c5f21419ace7c2b21098fb1a7f',
}
const normalized = file => file.replace(/\\/g, '/')
const sourceHash = source => createHash('sha256').update(source.replace(/\r\n/g, '\n')).digest('hex')
function cachePolicy(file, source) {
  if (/export const fetchCache = 'force-no-store'/.test(source)) return 'no-store'
  if (/export const revalidate = \d+/.test(source)) return 'explicit-ttl'
  return pureRoutes[normalized(file)] === sourceHash(source) ? 'reviewed-no-server-fetch' : null
}
const missing = getOnly.filter(file => !cachePolicy(file, fs.readFileSync(file, 'utf8')))
ok(getOnly.length >= 90, `(c) ${getOnly.length} rotas SO-GET encontradas em app/**`)
ok(missing.length === 0, `(c) todas tem no-store, revalidate proposital ou fonte sem fetch selada (faltam: ${missing.join(', ') || 'nenhuma'})`)
for (const [file, hash] of Object.entries(pureRoutes)) ok(getOnly.some(route => normalized(route) === file) && sourceHash(fs.readFileSync(file, 'utf8')) === hash, `(c) excecao sem fetch selada por fonte inteira: ${file}`)
const isr = getOnly.filter(file => Number(fs.readFileSync(file, 'utf8').match(/export const revalidate = (\d+)/)?.[1] ?? 0) > 0).map(normalized).sort()
ok(JSON.stringify(isr) === JSON.stringify(['app/api/showcase-clips/route.ts', 'app/api/stats/public/route.ts']), `(c) so as 2 rotas publicas de vitrine ficam com ISR de TTL positivo (${isr.join(', ')})`)
const protectedRoute = 'app/api/next-action/route.ts', protectedSource = fs.readFileSync(protectedRoute, 'utf8')
const noFlag = protectedSource.replace("export const fetchCache = 'force-no-store'", '')
ok(noFlag !== protectedSource && !cachePolicy(protectedRoute, noFlag), '(M) remover no-store de uma rota real de dados reprova')
ok(!cachePolicy(protectedRoute, protectedSource.replace("fetchCache = 'force-no-store'", "fetchCache = 'force-cache'")), '(M) trocar no-store por cache reprova')
const pureFile = 'app/ai-faceless-video-generator/route.ts', pureSource = fs.readFileSync(pureFile, 'utf8')
ok(!cachePolicy(pureFile, pureSource + '\nfetch("https://fixture.invalid/data")\n'), '(M) acrescentar fetch a excecao selada reprova')
ok(!cachePolicy('app/api/new-unreviewed/route.ts', 'export async function GET() { return fetch("https://fixture.invalid/data") }'), '(M) rota GET nova nao ganha excecao por nome ou conteudo parecido')
for (const f of ['app/api/cron/finish-stranded-renders/route.ts', 'app/api/cron/refund-sweep/route.ts', 'app/api/compose/status/[renderId]/route.ts', 'app/api/cron/trial-lifecycle-emails/route.ts', 'app/api/admin/send-winback-25/route.ts']) {
  const s = fs.readFileSync(f, 'utf8')
  const iFetch = s.indexOf("export const fetchCache = 'force-no-store'")
  const iFirstAwait = s.search(/await /)
  ok(iFetch > 0 && iFetch < iFirstAwait, `(c) ${f}: interruptor declarado no topo do modulo (antes do 1o await)`)
}
// (d) compose + stranded
const compose = fs.readFileSync('app/api/compose/route.ts', 'utf8')
ok(/const cinematicPrepaidCost: number \| null = cinematicBirthClaim \? cinematicBirthClaim\.creditCost : null/.test(compose), '(d) compose: custo pre-pago = creditCost do claim de nascimento')
ok(/const hollywoodCost = cinematicPrepaidCost \?\? creditCostForDuration\(quality, true, duration\)/.test(compose), '(d) compose: caminho hollywood grava o custo do nascimento')
ok(/const intendedCost = cinematicPrepaidCost \?\? avatarPrepaidCost \?\? creditCostForDuration\(quality, quality === 'fast'/.test(compose), '(d) compose: caminho classico preserva nascimento cinematic e avatar antes do custo calculado')
ok(compose.indexOf('const cinematicPrepaidCost') < compose.indexOf('const hollywoodCost') && compose.indexOf('const cinematicPrepaidCost') < compose.indexOf('const intendedCost'), '(d) compose: a constante nasce antes dos dois usos')
ok(/isServiceFinish && cinematicBirthClaim\.creditCost !== creditCostForDuration/.test(compose), '(d) compose: a checagem dura do cliente comum continua (custo x duracao)')
// Execute the actual initializer; do not replace the old source assertions with
// a duplicated cost formula. The canonical engine module supplies the fallback.
const ts = require('typescript'), ast = ts.createSourceFile('compose.ts', compose, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
let costInitializer
function findCost(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'intendedCost') costInitializer = node.initializer?.getText(ast); ts.forEachChild(node, findCost) }
findCost(ast)
ok(typeof costInitializer === 'string', '(d) inicializador real de intendedCost localizado')
const { creditCostForDuration } = createOfflineLoader()('@/lib/credits/engineCost')
const evaluateCost = expression => new Function('cinematicPrepaidCost', 'avatarPrepaidCost', 'creditCostForDuration', 'quality', 'isFreePlanFast', 'duration', 'return (' + expression + ')')
const actualCost = evaluateCost(costInitializer)
const cost = (cinematic, avatar, free = false, expression = actualCost) => expression(cinematic, avatar, creditCostForDuration, 'fast', free, 60)
ok(cost(73, 91) === 73, '(d) nascimento cinematic vence avatar e preco recalculado')
ok(cost(null, 91) === 91, '(d) nascimento avatar vence preco recalculado')
ok(cost(0, 91) === 0, '(d) custo reservado zero e preservado, nao confundido com ausente')
ok(cost(null, null) === creditCostForDuration('fast', true, 60) && cost(null, null, true) === creditCostForDuration('fast', false, 60), '(d) sem nascimento a fonte canonica continua decidindo pago/gratis')
const noCinematic = costInitializer.replace('cinematicPrepaidCost ?? ', ''), noAvatar = costInitializer.replace('avatarPrepaidCost ?? ', '')
ok(noCinematic !== costInitializer && cost(73, 91, false, evaluateCost(noCinematic)) !== 73, '(M) retirar prioridade do nascimento cinematic reprova a mesma prova')
ok(noAvatar !== costInitializer && cost(null, 91, false, evaluateCost(noAvatar)) !== 91, '(M) retirar prioridade do nascimento avatar reprova a mesma prova')
const claim = fs.readFileSync('lib/cinematic/claim.ts', 'utf8')
ok(/birth\.claim\.creditCost !== cost/.test(claim), '(d) status: o juiz birth.creditCost === compose.cost continua — agora os dois numeros sao o mesmo')
const stranded = fs.readFileSync('app/api/cron/finish-stranded-renders/route.ts', 'utf8')
ok(/outcome: `compose_error_\$\{res\.status\}`, error: composeErr\.slice\(0, 200\)/.test(stranded), '(d) stranded: compose_error_NNN grava a frase do compose')
ok(/outcome: 'compose_threw', error: /.test(stranded), '(d) stranded: compose_threw grava a mensagem')
ok(/outcome: r\.outcome\.slice\(0, 120\), \.\.\.\(r\.error \? \{ error: r\.error \} : \{\}\)/.test(stranded), '(d) stranded: stranded_outcome.metadata.error vai pro banco')
console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
