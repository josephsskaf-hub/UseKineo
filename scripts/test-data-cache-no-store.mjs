// sprint-assinaturas #17 — prova viva do Data Cache em rota SO-GET do Next 14.2
// (a) roda o patch-fetch REAL do next com um store igual ao de uma rota GET-only
//     `force-dynamic` (revalidate=false, fetchCache undefined) e mostra que um GET
//     com Authorization e servido do cache na 2a chamada (o banco mudou, a rota nao viu);
// (b) o mesmo store com fetchCache='force-no-store' bate na origem todas as vezes;
// (c) toda rota SO-GET de app/** carrega o interruptor (ou revalidate proposital);
// (d) compose grava o custo do NASCIMENTO no claim de compose; stranded grava o erro.
import fs from 'node:fs'
import path from 'node:path'
import { AsyncLocalStorage } from 'node:async_hooks'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const { patchFetch } = require('next/dist/server/lib/patch-fetch.js')
async function simulate({ fetchCache }) {
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
  const sgStore = { isStaticGeneration: false, forceDynamic: true, revalidate: false, fetchCache, incrementalCache, urlPathname: '/api/cron/x', tags: [], pendingRevalidates: {} }
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

// (c) cobertura
const routes = []
;(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'route.ts') routes.push(p) } })('app')
const getOnly = routes.filter((f) => { const s = fs.readFileSync(f, 'utf8'); return /export (async )?function GET|export const GET/.test(s) && !/export (async )?function (POST|PUT|DELETE|PATCH|OPTIONS)|export const (POST|PUT|DELETE|PATCH|OPTIONS)/.test(s) })
const missing = getOnly.filter((f) => { const s = fs.readFileSync(f, 'utf8'); return !/export const fetchCache = 'force-no-store'/.test(s) && !/export const revalidate = \d+/.test(s) })
ok(getOnly.length >= 90, `(c) ${getOnly.length} rotas SO-GET encontradas em app/**`)
ok(missing.length === 0, `(c) todas carregam fetchCache='force-no-store' ou revalidate proposital (faltam: ${missing.join(', ') || 'nenhuma'})`)
const isr = getOnly.filter((f) => /export const revalidate = \d+/.test(fs.readFileSync(f, 'utf8')))
ok(isr.length === 2 && isr.every((f) => /showcase-clips|stats\/public/.test(f)), `(c) so as 2 rotas publicas de vitrine ficam com ISR proposital (${isr.map((f) => f.replace(/\\/g, '/')).join(', ')})`)
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
ok(/const intendedCost = cinematicPrepaidCost \?\? creditCostForDuration\(quality, quality === 'fast'/.test(compose), '(d) compose: caminho classico grava o custo do nascimento')
ok(compose.indexOf('const cinematicPrepaidCost') < compose.indexOf('const hollywoodCost') && compose.indexOf('const cinematicPrepaidCost') < compose.indexOf('const intendedCost'), '(d) compose: a constante nasce antes dos dois usos')
ok(/isServiceFinish && cinematicBirthClaim\.creditCost !== creditCostForDuration/.test(compose), '(d) compose: a checagem dura do cliente comum continua (custo x duracao)')
const claim = fs.readFileSync('lib/cinematic/claim.ts', 'utf8')
ok(/birth\.claim\.creditCost !== cost/.test(claim), '(d) status: o juiz birth.creditCost === compose.cost continua — agora os dois numeros sao o mesmo')
const stranded = fs.readFileSync('app/api/cron/finish-stranded-renders/route.ts', 'utf8')
ok(/outcome: `compose_error_\$\{res\.status\}`, error: composeErr\.slice\(0, 200\)/.test(stranded), '(d) stranded: compose_error_NNN grava a frase do compose')
ok(/outcome: 'compose_threw', error: /.test(stranded), '(d) stranded: compose_threw grava a mensagem')
ok(/outcome: r\.outcome\.slice\(0, 120\), \.\.\.\(r\.error \? \{ error: r\.error \} : \{\}\)/.test(stranded), '(d) stranded: stranded_outcome.metadata.error vai pro banco')
console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
