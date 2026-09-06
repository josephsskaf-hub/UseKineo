// sprint-assinaturas #24 — rodape do e-mail "Your Short is ready" por situacao:
// assinante (sem preco, episodio 2), trial com saldo (episodio 2 antes do
// plano), sem saldo (plano em filmes como este), custo desconhecido (copy de
// hoje). Roda a funcao REAL (transpileModule) + le a rota para provar o caller.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createRequire } from 'node:module'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(root, 'node_modules/typescript'))
let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }
// sprint-assinaturas #1 (05/09) — normaliza CRLF. As asserçoes que leem a rota
// comparam contra literais com `\n`; no checkout Windows o arquivo vem com
// `\r\n` e DUAS delas ficavam vermelhas para sempre aqui e verdes na CI. Um
// guardiao que vive vermelho e um guardiao que ninguem le.
const read = (p) => readFileSync(path.join(root, p), 'utf8').split('\r\n').join('\n')
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
const { videoReadyFooter, NEXT_VIDEO_MIN_CREDITS } = loadTs('lib/lifecycle/videoReadyFooter.ts', {
  '@/lib/checkoutPricing': checkout, '@/lib/lifecycle/trialFilmPlans': filmPlans, '@/lib/seriesContinuation': series, '@/lib/marketingPrice': marketing,
})
const APP = 'https://www.usekineo.com'
const starter = checkout.formatCheckoutMoney('usd', checkout.TIER_PRICES.starter.usd)
const base = { cost: 25, topic: 'The lake that turns animals to stone', durationSeconds: 62, appUrl: APP }

// 1) assinante
const sub = videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: 155 })
ok(sub.kind === 'subscriber_next', 'assinante → subscriber_next')
ok(!/\$\d|\/month|Starter is|pricing/.test(sub.html), 'assinante: NENHUM preco, nenhum "Starter is", nenhum link de pricing')
ok(!/clean export/.test(sub.html), 'assinante: nao fala em "clean export" (o export dele ja e limpo)')
ok(sub.html.includes('155 credits</strong> left'), 'assinante: saldo real do RPC')
ok(sub.html.includes('Episode 2: The lake that turns animals to stone'), 'assinante: episodio 2 com o tema dela')
ok(sub.html.includes('continuation_source=video_ready_email'), 'link de continuacao com a fonte nova video_ready_email')
ok(sub.html.includes('utm_campaign=video_ready_subscriber_episode2'), 'utm proprio do assinante')
ok(sub.html.includes('%22The+lake+that+turns+animals+to+stone%22') || sub.html.includes('The+lake+that+turns+animals+to+stone'), 'prompt do episodio 2 carrega o tema')
const subNoTopic = videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: 155, topic: '' })
ok(!subNoTopic.html.includes('Episode 2'), 'sem tema = sem bloco de episodio (falha aberta)')
ok(subNoTopic.html.includes('one click away'), 'sem tema ainda convida para o proximo')
const subNoBal = videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: null })
ok(!/credit/.test(subNoBal.html), 'saldo desconhecido = nao afirma saldo')

// 2) trial com saldo
const tr = videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: 25 })
ok(tr.kind === 'trial_episode2', 'nao paga + 25cr → trial_episode2')
ok(tr.html.indexOf('Episode 2:') < tr.html.indexOf('Plans from'), 'episodio 2 vem ANTES do plano')
ok(tr.html.includes('utm_campaign=video_ready_trial_episode2'), 'utm proprio do trial')
ok(tr.html.includes('This 62-second film cost <strong style="color:#fff">25 credits</strong>'), 'custo real do claim + segundos reais')
ok(tr.html.includes(`Starter &mdash; ${Math.floor(checkout.TIER_CREDITS.starter / 25)} film`), 'Starter medido em filmes como este (TIER_CREDITS/custo)')
ok(tr.html.includes(`Studio &mdash; ${Math.floor(checkout.TIER_CREDITS.pro / 25)} films like this a month`), 'Studio medido em filmes como este')
ok(tr.html.includes(`Plans from ${starter}/month`), 'preco vem de TIER_PRICES/formatCheckoutMoney')
ok(tr.html.includes('intent_campaign=video_ready_email_plan_truth_v1'), 'intent_campaign do Codex preservado no link de preco')
ok(!/clean export/.test(tr.html), 'trial com saldo: nao vende "clean export" antes do 2o video')
const edge = videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: NEXT_VIDEO_MIN_CREDITS })
ok(edge.kind === 'trial_episode2' && NEXT_VIDEO_MIN_CREDITS === 5, 'exatamente 5cr (Kineo 1) ainda compra o proximo → episodio 2')
ok(videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: 4.9 }).kind === 'plan_films', '4.9cr → floor 4 → nao compra → plano')

// 3) sem saldo
const burn = videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: 0 })
ok(burn.kind === 'plan_films', 'nao paga + 0cr → plan_films')
ok(!burn.html.includes('Episode 2'), 'sem saldo: nao manda fazer o episodio 2 que ela nao pode pagar')
ok(!burn.html.includes('credits</strong> left'), 'sem saldo: nao diz "0 credits left"')
ok(burn.html.includes('utm_campaign=video_ready_plan_films'), 'utm proprio do sem-saldo')
ok(!/Fast Shorts/.test(burn.html), 'sem saldo: nao fala em "Fast Shorts" que ela nao fez')
const cheap = videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: 0, cost: 5, durationSeconds: null })
ok(cheap.html.includes('This film cost <strong style="color:#fff">5 credits'), 'duracao desconhecida = "film", nunca inventa segundos')
const big = videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: 0, cost: 150 })
ok(!big.html.includes('Starter &mdash; 0'), 'plano que compra 0 filmes some da linha (nunca "0 films")')
ok(big.html.includes('Studio &mdash;'), 'custo 150: Studio ainda aparece')

// 4) custo desconhecido
const unk = videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: 0, cost: 0 })
ok(unk.kind === 'plan_generic', 'custo 0/desconhecido → copy de hoje')
ok(unk.html.includes(`${marketing.videosForCredits(checkout.TIER_CREDITS.starter, 'fast')} more Fast Shorts`) && unk.html.includes(`Starter is ${starter}/month`), 'copy de hoje com numero e preco das funcoes canonicas')
// sprint-assinaturas #1 (05/09) — CONTRATO ALTERADO DE PROPOSITO, e nao
// afrouxado. Ate hoje `creditsRemaining: null` caia no ramo de quem esta SEM
// saldo e PERDIA a porta do episodio 2; medido no banco (marco 03/09, 43h),
// 22 dos 26 e-mails `plan_films` sairam com saldo NULL e 17 das 20 pessoas
// tinham >= 5 creditos na mao. Saldo desconhecido nao e saldo zero. O que a
// assercao original protegia — "sem numero, a linha de plano e a copy de hoje,
// com os numeros canonicos" — continua protegido abaixo, agora explicitamente.
const nada = videoReadyFooter({ ...base, isSubscriber: false, creditsRemaining: null, cost: NaN })
ok(nada.kind === 'unknown_balance_episode2', 'saldo desconhecido: a porta do episodio 2 nao pode sumir')
ok(nada.html.includes(`${marketing.videosForCredits(checkout.TIER_CREDITS.starter, 'fast')} more Fast Shorts`) && nada.html.includes(`Starter is ${starter}/month`), 'custo desconhecido: a linha de plano CONTINUA sendo a copy de hoje, com os numeros canonicos')
ok(!/You have <strong[^>]*>\d+ credits?<\/strong> left/i.test(nada.html), 'saldo desconhecido nunca afirma um numero de saldo')
// Sem tema nao ha porta para abrir: ai sim continua a copy de hoje, como antes.
ok(videoReadyFooter({ ...base, topic: '', isSubscriber: false, creditsRemaining: null, cost: NaN }).kind === 'plan_generic', 'saldo E custo desconhecidos, SEM tema → copy de hoje (inalterado)')

// XSS / escape
const xss = videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: 10, topic: '<img src=x onerror=alert(1)> "quotes"' })
ok(!xss.html.includes('<img'), 'tema com HTML e escapado no rotulo')
ok(xss.html.includes('Episode 2: &lt;img src=x onerror=alert(1)&gt; quotes &rarr;'), 'rotulo vira texto escapado (nao tag)')
ok(!/<(?!\/?(p|a|strong)\b)/.test(xss.html), 'nenhuma tag alem de p/a/strong no HTML (nada do tema virou tag)')

// caller: a rota
const route = read('app/api/compose/status/[renderId]/route.ts')
ok(route.includes("import { videoReadyFooter } from '@/lib/lifecycle/videoReadyFooter'"), 'rota importa o rodape')
ok(!route.includes("Starter is $${(TIER_PRICES.starter.usd / 100).toFixed(2)}/month"), 'rodape antigo (Starter para todo mundo) saiu da rota')
ok(!route.includes("import { TIER_CREDITS, TIER_PRICES } from '@/lib/checkoutPricing'") && !route.includes('videosForCredits'), 'imports mortos removidos')
ok(route.includes('${readyFooter.html}'), 'HTML do e-mail usa o rodape decidido')
ok(route.includes('readyEmailIsSubscriber =\n            (planRow as { has_paid?: boolean } | null)?.has_paid === true ||\n            PAID_PLANS.has(planName)'), 'assinante = has_paid OU plano pago (sem isTrialActive)')
ok(route.includes('let readyEmailIsSubscriber = false'), 'falha de leitura do perfil = nao-assinante = rodape de hoje (falha aberta)')
// sprint-assinaturas #1 (05/09) — o saldo deixou de ser SO o retorno do RPC.
// Nos motores cinematicos o credito e consumido na abertura do job e o RPC nao
// devolve nada, entao `creditsRemaining` vinha `null` e o rodape lia isso como
// "sem saldo" (22 de 26 e-mails `plan_films`, 17 das 20 pessoas com credito na
// mao). Agora cai para o saldo do perfil, lido no mesmo `planRow` que ja
// existia. O custo e o topicFinal continuam vindo de onde vinham.
ok(route.includes('const readyCredits = creditsRemaining ?? readyEmailCreditsFallback'), 'saldo = RPC quando existe, senao o do perfil (nunca mais null tratado como zero)')
ok(route.includes('creditsRemaining: readyCredits,\n              cost,\n              topic: topicFinal,'), 'saldo resolvido, custo do claim e topicFinal (nao topic cru) entram no rodape')
ok(route.includes("name: 'video_ready_email_sent'") && route.includes('footer: readyFooter.kind'), 'carimbo video_ready_email_sent grava qual rodape saiu')
ok(route.indexOf("name: 'video_ready_email_sent'") > route.indexOf('} else {\n              // sprint-assinaturas #24'), 'carimbo so depois do 2xx do Resend')
const sc = read('lib/seriesContinuation.ts')
ok(sc.includes("| 'video_ready_email'"), 'SeriesContinuationSource ganhou video_ready_email')
console.log(`\n${n - fail}/${n} ok${fail ? ` — ${fail} FALHAS` : ''}`)
process.exit(fail ? 1 : 0)
