// sprint-assinaturas #10 — verificacoes do e-mail para assinante dormindo.
// Le os arquivos reais e prova os guard rails (nao mexe em credito/plano,
// dry-run por padrao, 1x por 30d, URL de 1 clique com os params que o
// /studio realmente le).
import { readFileSync } from 'node:fs'
const lib = readFileSync(new URL('../lib/lifecycle/subscriberIdle.ts', import.meta.url), 'utf8')
const route = readFileSync(new URL('../app/api/admin/send-subscriber-idle/route.ts', import.meta.url), 'utf8')
const studio = readFileSync(new URL('../app/(dashboard)/studio/StudioClient.tsx', import.meta.url), 'utf8')
let n = 0, bad = 0
const ok = (cond, msg) => { n++; if (!cond) { bad++; console.log('  FAIL', msg) } else console.log('  ok  ', msg) }

console.log('route: guard rails')
ok(route.includes("searchParams.get('confirm') === 'SEND'"), 'dry-run por padrao; so ?confirm=SEND envia')
ok(!/\.update\(\s*\{\s*video_credits/.test(route), 'NUNCA escreve video_credits')
ok(!/\.update\(\s*\{\s*plan/.test(route) && !route.includes('stripe.subscriptions'), 'NUNCA mexe em plano/assinatura')
ok(route.includes("ADMIN_EMAILS.has(adminEmail)"), 'so admin logado')
ok(route.includes(".eq('has_paid', true)"), 'coorte parte de has_paid')
ok(route.includes('PAID_PLANS.has(plan)') && route.includes('hasSub'), 'exige plano pago E id de assinatura')
ok(route.includes('isInternalEmail(email)') && route.includes('p.email_opted_out'), 'exclui internos e opt-out')
ok(route.includes(".eq('name', STAMP)") && route.includes('RESEND_DAYS'), 'stamp lido com janela de re-envio')
ok(route.includes('HOT_HOURS') && route.includes('quente.has'), 'pula quem esteve ativo nas ultimas horas')
ok(route.includes('t.daysIdle == null || t.daysIdle >= IDLE_DAYS'), 'so quem esta ha >= IDLE_DAYS sem video (ou nunca fez)')
ok(route.includes('.range(from, from + 999)') && route.includes('data.length < 1000'), 'paginacao anti-1000')
ok(route.includes("name: STAMP") && route.includes('days_idle: a.daysIdle'), 'evento subscriber_idle_sent com days_idle/credits/plan')
ok(route.indexOf('if (!res.ok)') < route.indexOf('name: STAMP') && /if \(!res\.ok\) \{.*continue \}/.test(route), 'stamp so depois do Resend aceitar')
ok(route.includes('Math.min(limitParam, MAX_BATCH)'), 'teto de lote')
const exportsRoute = [...route.matchAll(/^export (?:const|async function|function) (\w+)/gm)].map((m) => m[1])
ok(exportsRoute.every((e) => ['GET', 'maxDuration', 'dynamic'].includes(e)), `route.ts so exporta handler/config (${exportsRoute.join(',')})`)

console.log('lib: constantes e copy')
ok(/export const IDLE_DAYS = 10/.test(lib), 'IDLE_DAYS = 10')
ok(/export const RESEND_DAYS = 30/.test(lib), 'RESEND_DAYS = 30')
ok(/export const MAX_BATCH = 20/.test(lib), 'MAX_BATCH = 20')
ok(lib.includes("basic: 'Creator'") && lib.includes("pro: 'Studio'"), 'nomes de plano como o site mostra (basic=Creator, pro=Studio)')
ok(lib.includes("creditCostFor('cinematic_ai', true)") && lib.includes("creditCostFor('fast', true)"), 'filmes calculados pela tabela real de custo, nunca numero chumbado')
const libCopy = lib.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n').replace(/\$31,500/g, '')
ok(!/\$\d+(\.\d+)?\b/.test(libCopy), 'copy sem preco (preco publico e pista do Codex)')
ok(!/discount|coupon|% off/i.test(lib), 'sem desconto/cupom')
ok(!/priority queue|1080p|premium voice|12 characters|forever storage/i.test(lib), 'sem promessa da lista de copy-que-mente')
ok(lib.includes('Lyria 3') && lib.includes('MiniMax 2.8 HD') && lib.includes('Kling 3') && lib.includes('Omni Flash') && lib.includes('Nano Banana Pro'), 'novidades = os motores que estao no ar (CLAUDE.md 01/09)')
ok(lib.includes('hit reply'), 'convite a responder (SLA: responder em <=48h)')
ok(lib.includes('emailFooterHtml(t.id)') && lib.includes('emailFooterText(t.id)'), 'rodape com unsubscribe')
ok(lib.includes("you haven't made a video yet"), 'variante para quem nunca fez video (Emilio)')
ok(lib.includes('Part 2 of "'), '1a ideia = continuacao do proprio ultimo video')
ok(lib.includes('.slice(0, 3)'), 'sempre 3 ideias')

console.log('URL de 1 clique bate com o que o /studio le')
for (const p of ['engine', 'prompt', 'script_mode', 'duration']) {
  ok(studio.includes(`sp.get('${p}')`) && lib.includes(`${p}:`) || (p === 'prompt' && lib.includes('prompt,')), `/studio le ?${p}=`)
}
ok(/requestedDuration === 60/.test(studio) && lib.includes("duration: '60'"), 'duration=60 e um valor aceito')
ok(/requestedScriptMode === 'ai'/.test(studio) && lib.includes("script_mode: 'ai'"), "script_mode=ai e aceito (ideia de 1 linha = 'Let AI structure')")
ok(/x\.key === e/.test(studio) && studio.includes("key: 'seedance'") && lib.includes("engine: 'seedance'"), 'engine=seedance existe no seletor')
ok(lib.includes('utm_campaign: \'subscriber_idle\''), 'utm_campaign=subscriber_idle para medir cliques')

console.log(`\n${n - bad}/${n} verificacoes${bad ? ' — FALHOU' : ''}`)
process.exit(bad ? 1 : 0)
