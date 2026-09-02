// sprint-assinaturas #25 — o e-mail de resgate ("Your video is ready 🎬" do
// cron finish-stranded-renders) parava de ser copia muda: (1) se a rota de
// status ja mandou o "⚡ Your Short is ready" (carimbo video_ready_email_sent
// do #24) o cron NAO manda o 2o; (2) quando manda, leva o rodape por situacao
// do #24 (assinante / trial com saldo / sem saldo); (3) Fase 2 e Fase 3 nao
// avisam o mesmo render duas vezes. Le a rota real + roda a funcao real do
// rodape com as MESMAS entradas que a rota monta (perfil + linha de videos).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createRequire } from 'node:module'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(root, 'node_modules/typescript'))
let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }
const read = (p) => readFileSync(path.join(root, p), 'utf8')
function loadTs(p, mocks = {}) {
  const out = ts.transpileModule(read(p), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: p }).outputText
  const m = { exports: {} }
  new Function('require', 'module', 'exports', out)((id) => { if (id in mocks) return mocks[id]; throw new Error(`${p}: unexpected import ${id}`) }, m, m.exports)
  return m.exports
}
const engine = loadTs('lib/credits/engineCost.ts')
const autopilot = loadTs('lib/autopilot/config.ts', { '@/lib/credits/engineCost': engine })
const checkout = loadTs('lib/checkoutPricing.ts', { '@/lib/credits/engineCost': engine, '@/lib/autopilot/config': autopilot })
const filmPlans = loadTs('lib/lifecycle/trialFilmPlans.ts', { '@/lib/checkoutPricing': checkout })
const series = loadTs('lib/seriesContinuation.ts')
const marketing = loadTs('lib/marketingPrice.ts', { '@/lib/checkoutPricing': checkout, '@/lib/credits/engineCost': engine })
const footerMod = loadTs('lib/lifecycle/videoReadyFooter.ts', {
  '@/lib/checkoutPricing': checkout, '@/lib/lifecycle/trialFilmPlans': filmPlans, '@/lib/seriesContinuation': series, '@/lib/marketingPrice': marketing,
})

const ROUTE = 'app/api/cron/finish-stranded-renders/route.ts'
const route = read(ROUTE)

// ── A) as funcoes novas da rota, extraidas e rodadas de verdade ─────────────
// Recorta so o trecho puro (sem next/server, sem supabase) e transpila.
const start = route.indexOf('const READY_PAID_PLANS')
const end = route.indexOf('/** A rota de status já mandou')
ok(start > 0 && end > start, 'trecho puro do #25 existe na rota (READY_PAID_PLANS ... statusRouteAlreadyEmailed)')
const pure = `const APP_URL = 'https://www.usekineo.com'\nimport { videoReadyFooter, type VideoReadyFooter } from '@/lib/lifecycle/videoReadyFooter'\n` +
  route.slice(start, end) + `\nexport { readyFooterFor, readyIsSubscriber }\n`
const out = ts.transpileModule(pure, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: 'pure.ts' }).outputText
const m = { exports: {} }
new Function('require', 'module', 'exports', out)((id) => { if (id === '@/lib/lifecycle/videoReadyFooter') return footerMod; throw new Error('unexpected import ' + id) }, m, m.exports)
const { readyFooterFor, readyIsSubscriber } = m.exports

const vid = { title: 'Seven kilometres beneath the Indian Ocean', topic: null, credits_used: 25, duration: 85 }
// assinante pro com 130cr (caso real 62aa2fcc de 01/09)
const sub = readyFooterFor({ has_paid: true, plan: 'pro', video_credits: 130 }, vid)
ok(sub.kind === 'subscriber_next', 'assinante pro → subscriber_next (sem preco)')
ok(!/\$\d|\/month|Starter is|pricing/.test(sub.html), 'assinante: nenhum preco/pricing no rodape do resgate')
ok(sub.html.includes('130 credits</strong> left'), 'assinante: saldo real de profiles.video_credits')
ok(sub.html.includes('Episode 2: Seven kilometres beneath the Indian Ocean'), 'assinante: episodio 2 com o TITULO do video resgatado')
// trial com 20cr (caso real 1410cb70, Kineo 1 de 5cr)
const tr = readyFooterFor({ has_paid: false, plan: 'free', video_credits: 20 }, { title: 'Run with a lion', topic: null, credits_used: 5, duration: 62 })
ok(tr.kind === 'trial_episode2', 'trial com 20cr → episodio 2 antes do plano')
ok(tr.html.indexOf('Episode 2:') < tr.html.indexOf('Plans from'), 'episodio 2 vem ANTES do plano')
ok(tr.html.includes('This 62-second film cost <strong style="color:#fff">5 credits</strong>'), 'custo e segundos vem da linha de videos (credits_used/duration)')
// trial que queimou tudo (caso real c4ccb01e: 25cr, 0 sobrando)
const burn = readyFooterFor({ has_paid: false, plan: 'free', video_credits: 0 }, { title: '', topic: 'Create a 60-second YouTube Short about:', credits_used: 25, duration: 62 })
ok(burn.kind === 'plan_films', 'trial com 0cr → plano medido em filmes como este')
ok(!burn.html.includes('Episode 2'), 'sem saldo: nao manda fazer episodio 2')
ok(!burn.html.includes('0 credits'), 'sem saldo: nao diz "0 credits left"')
// falhas abertas
ok(readyFooterFor(null, null).kind === 'plan_generic', 'perfil e video nulos → copy de hoje (falha aberta, nunca lanca)')
ok(readyFooterFor({ has_paid: false, plan: 'free', video_credits: null }, { credits_used: null, duration: null }).kind === 'plan_generic', 'custo/saldo desconhecidos → copy generica com numero canonico')
ok(readyIsSubscriber({ has_paid: true, plan: 'free' }) === true, 'has_paid=true conta como assinante mesmo com plan=free')
ok(readyIsSubscriber({ has_paid: false, plan: 'studio' }) === true, 'plano pago conta como assinante')
ok(readyIsSubscriber({ has_paid: false, plan: 'free' }) === false, 'free sem pagamento nao e assinante')
ok(readyIsSubscriber(null) === false, 'perfil nulo → nao assinante (falha fechada para o lado que nao esconde preco)')
// titulo vazio cai no topic; topic vazio = sem episodio 2
const noTopic = readyFooterFor({ has_paid: true, plan: 'pro', video_credits: 130 }, { title: '', topic: '', credits_used: 25, duration: 85 })
ok(!noTopic.html.includes('Episode 2'), 'titulo E topic vazios → sem bloco de episodio, sem inventar tema')
const fromTopic = readyFooterFor({ has_paid: true, plan: 'pro', video_credits: 130 }, { title: null, topic: 'Killer clowns', credits_used: 4, duration: 45 })
ok(fromTopic.html.includes('Episode 2: Killer clowns'), 'titulo nulo → usa topic')

// ── B) a rota: quem chama o que ─────────────────────────────────────────────
ok(route.includes("import { videoReadyFooter, type VideoReadyFooter } from '@/lib/lifecycle/videoReadyFooter'"), 'rota importa o rodape canonico do #24 (nenhum numero digitado)')
ok(route.includes("const STATUS_READY_STAMP = 'video_ready_email_sent'"), 'carimbo consultado e o MESMO que a rota de status grava (#24)')
ok(route.includes(".eq('metadata->>render_id', renderId)"), 'consulta do carimbo e por render_id (nao por pessoa: a pessoa pode ter outro video)')
ok((route.match(/statusRouteAlreadyEmailed\(admin, userId, renderId\)/g) || []).length === 2, 'Fase 2 E Fase 3 consultam o carimbo antes de mandar')
ok(route.includes("if (statusMail === 'lookup_failed') { results.push({ generation: gen8, outcome: 'ready_status_stamp_lookup_failed' }); continue }"), 'Fase 2: consulta falhou = NAO manda (fail-closed, mesmo padrao do #4)')
ok(route.includes("outcome: 'fast_ready_status_stamp_lookup_failed'"), 'Fase 3: consulta falhou = NAO manda')
ok(route.includes("metadata: { render_id: renderId, email: 'status_route' }") && (route.match(/email: 'status_route'/g) || []).length === 2, 'quando a rota de status ja avisou, o cron marca o render como notificado (nunca reconsidera) nas duas fases')
ok(route.includes("outcome: 'ready_notified_by_status'") && route.includes("outcome: 'fast_ready_notified_by_status'"), 'desfecho novo visivel no JSON/log: notificado pela rota de status')
ok((route.match(/const footer = readyFooterFor\(prof, vid\)/g) || []).length === 2, 'rodape montado do perfil + linha de videos nas duas fases')
ok((route.match(/readyHtml\([^)]*, userId, footer\)/g) || []).length === 2, 'readyHtml recebe o rodape nas duas chamadas (nenhuma chamada antiga sem rodape)')
ok(!/readyHtml\([^,]+, userId\)/.test(route), 'nenhuma chamada antiga readyHtml(url, userId) sobrou')
ok(route.includes("select('email, email_opted_out, has_paid, plan, video_credits')") && (route.match(/has_paid, plan, video_credits/g) || []).length === 2, 'perfil le has_paid/plan/video_credits nas duas fases')
ok((route.match(/select\('id, status, video_url, final_video_url, title, topic, credits_used, duration'\)/g) || []).length === 2, 'linha de videos le title/topic/credits_used/duration nas duas fases')
ok(route.includes('footer: footer.kind, subscriber: readyIsSubscriber(prof), cost: vid?.credits_used ?? null, credits_remaining: prof?.video_credits ?? null'), 'carimbo do envio grava qual rodape saiu (footer/subscriber/cost/credits_remaining) — igual ao #24')
ok(route.indexOf('const statusMail = await statusRouteAlreadyEmailed') > route.indexOf("const verdict = await alreadySentDirect(admin, { eventName: READY_EVENT"), 'ordem Fase 2: dedupe do proprio cron (#4) primeiro, carimbo da rota de status depois, envio por ultimo')
ok(route.includes(".in('name', [RESCUE_EVENT, ATTEMPT_EVENT, READY_EVENT, FAST_READY_EVENT, COMPOSED_EVENT, OUTCOME_EVENT])"), 'lote da Fase 2 tambem enxerga o aviso da Fase 3')
ok(route.includes('else if (m.name === READY_EVENT || m.name === FAST_READY_EVENT) readySent.add(sid)'), 'aviso da Fase 3 conta como "ja avisado" na Fase 2 (3 filmes em 14d levaram 2 avisos)')
ok(route.includes(".in('name', [FAST_READY_EVENT, READY_EVENT]).in('session_id', fastGenIds.slice(0, 200))"), 'lote da Fase 3 tambem enxerga o aviso da Fase 2')
ok(route.includes('background:#161618;color:#fff;padding:4px 20px 20px;border-radius:12px') && route.indexOf('background:#161618') > route.indexOf('Watch my video'), 'rodape vai num cartao escuro DEPOIS do botao (o #24 usa strong branco — no fundo branco o saldo sumiria)')
ok(route.includes('+3 credits back') && read('lib/postToEarn.ts').includes('3 credits'), 'promessa "+3 credits back" continua e e real (lib/postToEarn.ts)')
ok(route.includes('Ready for the next one? ${APP_URL}/studio'), 'versao texto ganha o proximo passo sem inventar preco')
ok(!/\$\s?\d|\b7\/month|\$7\b/.test(route.slice(start, route.indexOf('async function sendEmail('))), 'nenhum preco digitado no trecho novo')
ok(route.includes('const { data: prof }') && route.indexOf('const footer = readyFooterFor(prof, vid)') > route.indexOf("select('email, email_opted_out, has_paid, plan, video_credits')"), 'o perfil lido com plano e o mesmo usado no rodape (sem consulta extra)')

console.log(`\n${n - fail}/${n} ok${fail ? ` — ${fail} FALHA(S)` : ''}`)
process.exit(fail ? 1 : 0)
