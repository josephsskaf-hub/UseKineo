// sprint16h-e W (27/09/2026) — STUDIO ADS NO E-MAIL "YOUR SHORT IS READY" DO ASSINANTE.
//
// FATO: 0 dos 10 assinantes tocaram /ads em 30 dias. O e-mail de video pronto e o
// que chega "no minuto de maior boa vontade" (cabecalho de
// lib/lifecycle/videoReadyFooter.ts) e o rodape do assinante (kind
// 'subscriber_next') so pedia o episodio 2.
//
// O QUE ESTE GUARDIAO PROVA (funcao REAL via transpileModule, sem alias @/ no
// proprio guardiao, sem rede — memoria `guardioes-com-alias-nao-rodam`):
//   a) assinante com plano em ADS_SUBSCRIBER_PLANS → a linha entra, DEPOIS do
//      episodio 2, com link /ads/new?utm_source=video_ready e adsLine=true;
//   b) comprador de pack (isSubscriber=true por has_paid, plan='free') → SEM
//      linha, adsLine=false — "included" para ele seria mentira medivel;
//   c) plano desconhecido (null/ausente) → sem linha (falha fechada);
//   d) isSubscriber=false com plano pago (impossivel na pratica) → kind nao e
//      subscriber_next e a linha nao vaza para outro ramo;
//   e) os numeros da linha sao DERIVADOS: creditos === KINEO1_35S_CREDITS (o que
//      /api/ads/render cobra via creditCostForDuration('fast', true, seconds)) e
//      segundos === min(ADS_MODELS.seconds); nenhum literal digitado na fonte;
//   f) interruptor adsPassLive() desligado → sem linha;
//   g) os DOIS chamadores passam `plan` do perfil JA LIDO (zero consulta nova) e
//      carimbam ads_line no evento; o cron dos stranded e rodado de verdade;
//   h) 6 mutantes em memoria morrem (has_paid no lugar do plano; sem a condicao
//      de plano; numero digitado; linha fora do subscriber_next; interruptor
//      ignorado; carimbo sem a linha).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(root, 'node_modules/typescript'))

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }
// CRLF normalizado na leitura (memoria `guardiao-crlf-falso-vermelho`).
const read = (p) => readFileSync(path.join(root, p), 'utf8').split('\r\n').join('\n')

function loadTs(p, mocks = {}, srcOverride = null) {
  const src = srcOverride ?? read(p)
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: p }).outputText
  const m = { exports: {} }
  new Function('require', 'module', 'exports', out)((id) => { if (id in mocks) return mocks[id]; throw new Error(`${p}: unexpected import ${id}`) }, m, m.exports)
  return m.exports
}

// Tudo carregado REAL: o ponto do guardiao e que nenhum numero e digitado.
const engine = loadTs('lib/credits/engineCost.ts')
const autopilot = loadTs('lib/autopilot/config.ts', { '@/lib/credits/engineCost': engine })
const checkout = loadTs('lib/checkoutPricing.ts', { '@/lib/credits/engineCost': engine, '@/lib/autopilot/config': autopilot })
const filmPlans = loadTs('lib/lifecycle/trialFilmPlans.ts', { '@/lib/checkoutPricing': checkout })
const series = loadTs('lib/seriesContinuation.ts')
const marketing = loadTs('lib/marketingPrice.ts', { '@/lib/checkoutPricing': checkout, '@/lib/credits/engineCost': engine })
const trialFee = loadTs('lib/lifecycle/trialEntryFee.ts', { '@/lib/checkoutPricing': checkout })
const adsOffer = loadTs('lib/ads/offer.ts')
const adsModels = loadTs('lib/ads/models.ts')
const internalAccounts = loadTs('lib/internalAccounts.ts')
const adsAccess = loadTs('lib/ads/access.ts', { '@/lib/internalAccounts': internalAccounts, '@/lib/ads/offer': adsOffer })
const FOOTER_MOCKS = {
  '@/lib/checkoutPricing': checkout,
  '@/lib/lifecycle/trialFilmPlans': filmPlans,
  '@/lib/seriesContinuation': series,
  '@/lib/marketingPrice': marketing,
  '@/lib/lifecycle/trialEntryFee': trialFee,
  '@/lib/ads/access': adsAccess,
  '@/lib/ads/models': adsModels,
  '@/lib/ads/offer': adsOffer,
}
const LIB = 'lib/lifecycle/videoReadyFooter.ts'
const { videoReadyFooter } = loadTs(LIB, FOOTER_MOCKS)

const APP = 'https://www.usekineo.com'
const base = { cost: 25, topic: 'The lake that turns animals to stone', durationSeconds: 62, appUrl: APP }
const LINE = 'Studio Ads is included'
const LINK = '/ads/new?utm_source=video_ready'
const hasLine = (r) => r.html.includes(LINE) && r.html.includes(LINK)
const { ADS_SUBSCRIBER_PLANS } = adsAccess
const { KINEO1_35S_CREDITS, adsPassLive } = adsOffer
const shortest = Math.min(...adsModels.ADS_MODELS.map((m) => m.seconds))

console.log('\n── 0. Pre-condicoes: o interruptor esta ligado e a lista de planos e a do portao')
ok(adsPassLive() === true, 'adsPassLive() ligado neste ambiente (senao as provas abaixo nao dizem nada)')
ok(Array.isArray(ADS_SUBSCRIBER_PLANS) && ADS_SUBSCRIBER_PLANS.includes('starter') && !ADS_SUBSCRIBER_PLANS.includes('free'), 'ADS_SUBSCRIBER_PLANS tem starter e NAO tem free (a lista do portao de /ads)')
ok(engine.creditCostForDuration('fast', true, shortest) === KINEO1_35S_CREDITS, 'o custo que /api/ads/render cobra (creditCostForDuration fast/own/menor modelo) === KINEO1_35S_CREDITS')

console.log('\n── a) assinante com plano pago: a linha entra DEPOIS do episodio 2')
for (const plan of ADS_SUBSCRIBER_PLANS) {
  const r = videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: 155, hasPaid: true, plan })
  ok(r.kind === 'subscriber_next' && hasLine(r) && r.adsLine === true, `plan='${plan}' → subscriber_next + linha do Studio Ads + adsLine=true`)
}
const a = videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: 155, hasPaid: true, plan: 'starter' })
ok(a.html.indexOf('Episode 2:') > -1 && a.html.indexOf('Episode 2:') < a.html.indexOf(LINE), 'a linha vem DEPOIS do bloco do episodio 2 (o episodio continua sendo o primeiro pedido)')
ok(a.html.includes('utm_source=video_ready&amp;utm_medium=footer&amp;utm_campaign=sprint0927'), 'utm triplo da campanha do dia, escapado como os links vizinhos')
ok(a.html.includes('Make a business ad &rarr;</a>'), 'CTA "Make a business ad"')
ok(!/\$\d|\/month|pricing|passe|pass\b/i.test(a.html), 'assinante continua sem preco, sem pricing e sem falar do passe (ele ja tem)')
ok(videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: 155, hasPaid: true, plan: ' Starter ' }).adsLine === true, 'plano com espaco/maiuscula normaliza como o portao (trim + lowercase)')
ok(videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: 155, hasPaid: true, plan: 'starter', topic: '' }).adsLine === true, 'sem tema (sem episodio 2) a linha ainda entra')
ok(!/<(?!\/?(p|a|strong)\b)/.test(a.html), 'nenhuma tag alem de p/a/strong (padrao do arquivo)')

console.log('\n── b) comprador de pack: has_paid=true, plan=free → SEM linha')
const pack = videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: 40, hasPaid: true, plan: 'free' })
ok(pack.kind === 'subscriber_next', 'comprador de pack e assinante para o rodape (has_paid) — kind subscriber_next')
ok(!hasLine(pack) && pack.adsLine === false, 'mas NAO ganha a linha: o portao de /ads recusa plan=free, "included" seria mentira')
ok(pack.html.includes('Episode 2:'), 'o episodio 2 dele continua igual')
for (const plan of ['starter_trial', 'creator_trial', 'trial', 'ads_pass', '']) {
  ok(videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: 40, hasPaid: true, plan }).adsLine === false, `plan='${plan}' (fora de ADS_SUBSCRIBER_PLANS) → sem linha`)
}

console.log('\n── c) plano desconhecido: null/ausente → sem linha (falha fechada)')
ok(videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: 155, hasPaid: true, plan: null }).adsLine === false, 'plan=null → sem linha')
const semPlan = videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: 155, hasPaid: true })
ok(!hasLine(semPlan) && semPlan.adsLine === false, 'plan AUSENTE → sem linha (chamador antigo continua byte a byte)')
ok(semPlan.html === videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: 155, hasPaid: true, plan: null }).html, 'ausente e null produzem o MESMO html')

console.log('\n── d) isSubscriber=false com plano pago: a linha nao vaza para outro ramo')
for (const [input, kind] of [
  [{ ...base, isSubscriber: false, creditsRemaining: 25, hasPaid: false, plan: 'starter' }, 'trial_episode2'],
  [{ ...base, isSubscriber: false, creditsRemaining: null, hasPaid: false, plan: 'starter' }, 'unknown_balance_episode2'],
  [{ ...base, isSubscriber: false, creditsRemaining: 0, hasPaid: false, plan: 'starter' }, 'plan_films'],
  [{ ...base, isSubscriber: false, creditsRemaining: 0, hasPaid: false, plan: 'starter', cost: 0 }, 'plan_generic'],
]) {
  const r = videoReadyFooter(input)
  ok(r.kind === kind && !hasLine(r) && r.adsLine === false, `${kind}: kind certo, sem linha, adsLine=false — a ordem das condicoes e isSubscriber primeiro`)
}

console.log('\n── e) numeros DERIVADOS, nunca digitados')
const m = a.html.match(/A (\d+)-second ad costs (\d+) credits from the same balance/)
ok(!!m, 'a frase de custo existe na linha')
ok(m && Number(m[1]) === shortest, `segundos na linha (${m && m[1]}) === min(ADS_MODELS.seconds) (${shortest})`)
ok(m && Number(m[2]) === KINEO1_35S_CREDITS, `creditos na linha (${m && m[2]}) === KINEO1_35S_CREDITS (${KINEO1_35S_CREDITS})`)
const fonte = read(LIB)
const corpo = fonte.slice(fonte.indexOf('function studioAdsLineHtml'), fonte.indexOf('// A PORTA DE $1 NO E-MAIL DE ENTREGA'))
ok(corpo.length > 200, 'o corpo da linha foi recortado (a ancora existe)')
const semTemplates = corpo.replace(/\$\{[^}]*\}/g, '')
ok(!/\d+ credits|\d+-second/.test(semTemplates), 'nenhum "N credits" nem "N-second" digitado dentro de studioAdsLineHtml')
ok(!/3 credits|35-second/.test(fonte.replace(/\/\/[^\n]*\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '')), "nem '3 credits' nem '35-second' como literal em nenhum lugar do codigo (fora comentarios)")
ok(/KINEO1_35S_CREDITS/.test(corpo) && /ADS_SHORTEST_SECONDS/.test(corpo), 'creditos e segundos vem das constantes derivadas')
ok(/const ADS_SHORTEST_SECONDS = Math\.min\(\.\.\.ADS_MODELS\.map\(\(m\) => m\.seconds\)\)/.test(fonte), 'ADS_SHORTEST_SECONDS = Math.min(...ADS_MODELS.map(m => m.seconds))')
ok(/ADS_SUBSCRIBER_PLANS\.includes\(p\)/.test(corpo), 'a condicao e o PLANO em ADS_SUBSCRIBER_PLANS')
ok(!/hasPaid|has_paid/.test(corpo), 'has_paid NAO aparece na condicao da linha')
ok(/if \(!adsPassLive\(\)\) return null/.test(corpo), 'interruptor adsPassLive() e a primeira trava')
ok(/import \{ ADS_SUBSCRIBER_PLANS \} from '@\/lib\/ads\/access'/.test(fonte) && /import \{ KINEO1_35S_CREDITS, adsPassLive \} from '@\/lib\/ads\/offer'/.test(fonte) && /import \{ ADS_MODELS \} from '@\/lib\/ads\/models'/.test(fonte), 'os tres imports vem de lib/ads (nada copiado)')
ok((fonte.match(/adsLine: false/g) ?? []).length === 4 && fonte.includes('adsLine: ads !== null') && (fonte.match(/adsLine: boolean/g) ?? []).length === 1, 'adsLine em TODOS os 5 retornos: 4 vezes false, 1 vez derivado da linha; 1 campo na interface')

console.log('\n── f) interruptor desligado → sem linha')
{
  const before = process.env.NEXT_PUBLIC_ADS_PASS_LIVE
  process.env.NEXT_PUBLIC_ADS_PASS_LIVE = '0'
  const off = videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: 155, hasPaid: true, plan: 'starter' })
  ok(adsPassLive() === false && !hasLine(off) && off.adsLine === false, 'NEXT_PUBLIC_ADS_PASS_LIVE=0 → adsPassLive() false → sem linha, adsLine=false')
  if (before === undefined) delete process.env.NEXT_PUBLIC_ADS_PASS_LIVE; else process.env.NEXT_PUBLIC_ADS_PASS_LIVE = before
  ok(videoReadyFooter({ ...base, isSubscriber: true, creditsRemaining: 155, hasPaid: true, plan: 'starter' }).adsLine === true, 'religado → linha volta')
}

console.log('\n── g) os dois chamadores: plano do perfil JA LIDO, zero consulta nova, carimbo ads_line')
const status = read('app/api/compose/status/[renderId]/route.ts')
ok(status.includes('let readyEmailPlan: string | null = null'), 'status: hoisted como readyEmailHasPaid (leitura falha = null = sem linha)')
ok(status.includes("const planCol = (planRow as { plan?: string | null } | null)?.plan\n          readyEmailPlan = typeof planCol === 'string' ? planName : null"), 'status: plano vem do MESMO planRow (coluna nao-string vira null, nunca "free")')
ok(status.includes('hasPaid: readyEmailHasPaid,\n              plan: readyEmailPlan,\n            })'), 'status: videoReadyFooter recebe plan logo apos hasPaid (um campo a mais, nada alem)')
ok(status.includes('trial_door: readyFooter.trialDoor,') && status.includes('ads_line: readyFooter.adsLine,'), 'status: o carimbo video_ready_email_sent ganha ads_line ao lado do trial_door')
ok(status.indexOf('ads_line: readyFooter.adsLine,') > status.indexOf("name: 'video_ready_email_sent'"), 'status: ads_line dentro do evento video_ready_email_sent')
ok((status.match(/\.from\('profiles'\)/g) ?? []).length === 4, 'status: 4 leituras de profiles — as MESMAS de antes (zero consulta nova)')
const stranded = read('app/api/cron/finish-stranded-renders/route.ts')
ok(stranded.includes("hasPaid: typeof prof?.has_paid === 'boolean' ? prof.has_paid : null,") && stranded.includes("plan: typeof prof?.plan === 'string' ? prof.plan.toLowerCase() : null,\n  })"), 'stranded: readyFooterFor passa plan do mesmo prof (select ja pedia plan)')
ok((stranded.match(/ads_line: footer\.adsLine/g) ?? []).length === 2 && (stranded.match(/trial_door: footer\.trialDoor/g) ?? []).length === 2, 'stranded: as DUAS fases carimbam ads_line (como o trial_door)')
ok((stranded.match(/\.from\('profiles'\)/g) ?? []).length === 4, 'stranded: 4 leituras de profiles — as MESMAS de antes (zero consulta nova)')
ok(!/\$\s?\d/.test(stranded.slice(stranded.indexOf('const READY_PAID_PLANS'), stranded.indexOf('async function sendEmail('))), 'stranded: nenhum preco digitado no trecho (trava do guardiao irmao continua verde)')
// O cron dos stranded rodado DE VERDADE (mesmo recorte do guardiao irmao test-stranded-ready-footer.mjs).
{
  const start = stranded.indexOf('const READY_PAID_PLANS')
  const end = stranded.indexOf('/** A rota de status já mandou')
  ok(start > 0 && end > start, 'stranded: trecho puro (READY_PAID_PLANS … readyFooterFor) existe')
  const pure = `const APP_URL = '${APP}'\nimport { videoReadyFooter, type VideoReadyFooter } from '@/lib/lifecycle/videoReadyFooter'\n` + stranded.slice(start, end) + `\nexport { readyFooterFor }\n`
  const out = ts.transpileModule(pure, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: 'pure.ts' }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', out)((id) => { if (id === '@/lib/lifecycle/videoReadyFooter') return loadTs(LIB, FOOTER_MOCKS); throw new Error('unexpected import ' + id) }, mod, mod.exports)
  const vid = { title: 'Seven kilometres beneath the Indian Ocean', topic: null, credits_used: 25, duration: 85 }
  const s1 = mod.exports.readyFooterFor({ has_paid: true, plan: 'Starter', video_credits: 50 }, vid)
  ok(s1.kind === 'subscriber_next' && hasLine(s1) && s1.adsLine === true, 'stranded REAL: assinante starter → linha do Studio Ads')
  const s2 = mod.exports.readyFooterFor({ has_paid: true, plan: 'free', video_credits: 50 }, vid)
  ok(s2.kind === 'subscriber_next' && !hasLine(s2) && s2.adsLine === false, 'stranded REAL: comprador de pack (has_paid, free) → sem linha')
  const s3 = mod.exports.readyFooterFor({ has_paid: true, plan: null, video_credits: 50 }, vid)
  ok(!hasLine(s3) && s3.adsLine === false, 'stranded REAL: plano nulo → sem linha')
}

console.log('\n── h) MUTANTES (cada um conferido como ESCRITO antes de rodar)')
const subStarter = { ...base, isSubscriber: true, creditsRemaining: 155, hasPaid: true, plan: 'starter' }
const packFree = { ...base, isSubscriber: true, creditsRemaining: 40, hasPaid: true, plan: 'free' }
const mutantes = [
  {
    nome: 'decidir por has_paid em vez do plano (comprador de pack ganharia "included")',
    de: "    const ads = studioAdsLineHtml(appUrl, input.plan)",
    para: "    const ads = input.hasPaid === true ? studioAdsLineHtml(appUrl, 'starter') : null",
    prova: (f) => f(packFree).adsLine === false && !hasLine(f(packFree)),
  },
  {
    nome: 'apagar a condicao de plano (linha para todo assinante)',
    de: "  if (!ADS_SUBSCRIBER_PLANS.includes(p)) return null\n",
    para: "",
    prova: (f) => f(packFree).adsLine === false && f({ ...subStarter, plan: null }).adsLine === false,
  },
  {
    nome: 'digitar os numeros a mao',
    de: "`A ${ADS_SHORTEST_SECONDS}-second ad costs ${KINEO1_35S_CREDITS} credits from the same balance. `",
    para: "`A 35-second ad costs 3 credits from the same balance. `",
    prova: (f, src) => {
      const c = src.slice(src.indexOf('function studioAdsLineHtml'), src.indexOf('// A PORTA DE $1 NO E-MAIL DE ENTREGA'))
      return !/\d+ credits|\d+-second/.test(c.replace(/\$\{[^}]*\}/g, ''))
    },
  },
  {
    nome: 'linha fora do subscriber_next (vazar para o trial com saldo)',
    de: "${ep2}${door ?? ''}${plan}`,\n      trialDoor: door !== null,\n      adsLine: false,",
    para: "${ep2}${door ?? ''}${plan}${studioAdsLineHtml(appUrl, input.plan) ?? ''}`,\n      trialDoor: door !== null,\n      adsLine: false,",
    prova: (f) => !hasLine(f({ ...base, isSubscriber: false, creditsRemaining: 25, hasPaid: false, plan: 'starter' })),
  },
  {
    nome: 'ignorar o interruptor adsPassLive()',
    de: "  if (!adsPassLive()) return null\n",
    para: "",
    prova: (f) => {
      const before = process.env.NEXT_PUBLIC_ADS_PASS_LIVE
      process.env.NEXT_PUBLIC_ADS_PASS_LIVE = '0'
      const r = f(subStarter)
      if (before === undefined) delete process.env.NEXT_PUBLIC_ADS_PASS_LIVE; else process.env.NEXT_PUBLIC_ADS_PASS_LIVE = before
      return !hasLine(r) && r.adsLine === false
    },
  },
  {
    nome: 'carimbar adsLine=true sem por a linha no HTML',
    de: "      adsLine: ads !== null,",
    para: "      adsLine: true,",
    prova: (f) => { const r = f(packFree); return r.adsLine === hasLine(r) },
  },
]
const original = read(LIB)
for (const mut of mutantes) {
  if (!original.includes(mut.de)) { n++; fail++; console.log('FAIL', n, `mutante NAO ANCOROU: ${mut.nome}`); continue }
  const mutado = original.replace(mut.de, () => mut.para)
  if (mutado === original) { n++; fail++; console.log('FAIL', n, `mutante NAO ALTEROU NADA: ${mut.nome}`); continue }
  let sobreviveu
  try {
    const mod = loadTs(LIB, FOOTER_MOCKS, mutado)
    sobreviveu = mut.prova(mod.videoReadyFooter, mutado)
  } catch {
    sobreviveu = false // mutante que nem compila esta morto do mesmo jeito
  }
  ok(!sobreviveu, `mutante MORRE: ${mut.nome}`)
}

console.log(`\ntest-video-ready-studio-ads-2026-09-27: ${n - fail}/${n} ok${fail ? ` — ${fail} FALHAS` : ''}`)
process.exit(fail ? 1 : 0)
