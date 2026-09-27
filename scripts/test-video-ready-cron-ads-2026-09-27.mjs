// sprint16h-f X (27/09/2026) — O 3º E-MAIL DE VIDEO PRONTO (cron send-video-ready)
// TAMBEM ANUNCIA O STUDIO ADS AO ASSINANTE.
//
// FATO: o item W (86e9f794) pos a linha "Studio Ads is included in your plan"
// no rodape 'subscriber_next' de lib/lifecycle/videoReadyFooter.ts e ligou os
// chamadores compose/status e cron finish-stranded. O revisor apontou: o cron
// send-video-ready monta o rodape por `videoReadyFooterFromRows`, que lia
// `prof.plan` para decidir "assinante" mas NAO repassava o plano a
// videoReadyFooter() → esse e-mail saia sem a linha e sem carimbo.
//
// O QUE ESTE GUARDIAO PROVA (funcao REAL via transpileModule, sem alias @/ no
// proprio guardiao, sem rede — memoria `guardioes-com-alias-nao-rodam`):
//   a) videoReadyFooterFromRows com plan em ADS_SUBSCRIBER_PLANS → a linha entra,
//      DEPOIS do episodio 2, adsLine=true; maiuscula/espaco normalizam;
//   b) plan free (comprador de pack), null, AUSENTE, nao-string, perfil nulo →
//      sem linha, adsLine=false (falha fechada), nunca lanca;
//   c) send-video-ready: passa o plano do perfil JA LIDO (o select de profiles
//      ja pedia `plan`; zero consulta nova: .from('profiles') === 3 como antes)
//      e carimba ads_line ao lado do trial_door, dentro do evento
//      video_ready_nudge_sent;
//   d) o mapeamento linha→rodape do cron e o objeto `metadata` do carimbo sao
//      RODADOS de verdade (recorte do route.ts): ads_line === footer.adsLine;
//   e) send-recovery esta FORA do alcance por fato medido: nao monta rodape
//      nenhum (0 chamadas a videoReadyFooter*) e PULA todo plano pago — todo
//      plano de ADS_SUBSCRIBER_PLANS esta em PAID_PLANS dele. Se um dia passar a
//      montar o rodape, este guardiao fica vermelho e alguem passa plan + carimbo;
//   f) 6 mutantes em memoria morrem (cron sem plan; lib sem plan = o estado de
//      ANTES do X; has_paid no lugar do plano na lib E no cron; carimbo literal;
//      select sem plan).
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

// Tudo carregado REAL (mesma cadeia do guardiao irmao test-video-ready-studio-ads-2026-09-27.mjs).
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
const CRON = 'app/api/cron/send-video-ready/route.ts'
const RECOVERY = 'app/api/cron/send-recovery/route.ts'
const libMod = loadTs(LIB, FOOTER_MOCKS)
const { videoReadyFooter, videoReadyFooterFromRows } = libMod

const APP = 'https://www.usekineo.com'
const VID = { title: 'The lake that turns animals to stone', topic: null, credits_used: 25, duration: 62 }
const LINE = 'Studio Ads is included'
const LINK = '/ads/new?utm_source=video_ready'
const hasLine = (r) => r.html.includes(LINE) && r.html.includes(LINK)
const { ADS_SUBSCRIBER_PLANS } = adsAccess
const { adsPassLive } = adsOffer

console.log('\n── 0. Pre-condicoes')
ok(adsPassLive() === true, 'adsPassLive() ligado neste ambiente (senao as provas abaixo nao dizem nada)')
ok(Array.isArray(ADS_SUBSCRIBER_PLANS) && ADS_SUBSCRIBER_PLANS.includes('starter') && !ADS_SUBSCRIBER_PLANS.includes('free'), 'ADS_SUBSCRIBER_PLANS tem starter e NAO tem free (a lista do portao de /ads)')
ok(typeof videoReadyFooterFromRows === 'function', 'videoReadyFooterFromRows exportada (a funcao que o cron send-video-ready chama)')

console.log('\n── a) videoReadyFooterFromRows com plano em ADS_SUBSCRIBER_PLANS → linha + adsLine=true')
for (const plan of ADS_SUBSCRIBER_PLANS) {
  const r = videoReadyFooterFromRows({ has_paid: true, plan, video_credits: 155 }, VID, APP)
  ok(r.kind === 'subscriber_next' && hasLine(r) && r.adsLine === true, `rows plan='${plan}' (has_paid) → subscriber_next + linha + adsLine=true`)
}
const a = videoReadyFooterFromRows({ has_paid: true, plan: 'starter', video_credits: 155 }, VID, APP)
ok(a.html.indexOf('Episode 2:') > -1 && a.html.indexOf('Episode 2:') < a.html.indexOf(LINE), 'a linha vem DEPOIS do bloco do episodio 2')
ok(videoReadyFooterFromRows({ has_paid: false, plan: 'starter', video_credits: 155 }, VID, APP).adsLine === true, 'assinante SO pelo plano (has_paid=false, plan=starter) tambem recebe a linha — a condicao e o plano')
ok(videoReadyFooterFromRows({ has_paid: true, plan: ' Starter ', video_credits: 155 }, VID, APP).adsLine === true, "plan=' Starter ' normaliza (lowercase aqui + trim no portao)")
ok(videoReadyFooterFromRows({ has_paid: true, plan: 'STARTER', video_credits: 155 }, VID, APP).adsLine === true, "plan='STARTER' → linha (toLowerCase antes de repassar)")
{
  const direto = videoReadyFooter({ isSubscriber: true, creditsRemaining: 155, cost: 25, topic: VID.title, durationSeconds: 62, appUrl: APP, hasPaid: true, plan: 'starter' })
  ok(a.html === direto.html && a.adsLine === direto.adsLine && a.kind === direto.kind, 'FromRows(starter) === videoReadyFooter(...plan) byte a byte: o wrapper so repassa, nao inventa nada')
}
ok(videoReadyFooterFromRows({ has_paid: true, plan: 'starter', video_credits: 155 }, { ...VID, title: '', topic: null }, APP).adsLine === true, 'sem tema (sem episodio 2) a linha ainda entra')

console.log('\n── b) sem plano elegivel → sem linha, adsLine=false (falha fechada), nunca lanca')
const pack = videoReadyFooterFromRows({ has_paid: true, plan: 'free', video_credits: 40 }, VID, APP)
ok(pack.kind === 'subscriber_next' && !hasLine(pack) && pack.adsLine === false, 'comprador de pack (has_paid=true, plan=free) → subscriber_next SEM linha: "included" para ele seria mentira')
ok(pack.html.includes('Episode 2:'), 'o episodio 2 dele continua igual')
ok(videoReadyFooterFromRows({ has_paid: true, plan: null, video_credits: 155 }, VID, APP).adsLine === false, 'plan=null → sem linha')
const semPlan = videoReadyFooterFromRows({ has_paid: true, video_credits: 155 }, VID, APP)
ok(!hasLine(semPlan) && semPlan.adsLine === false, 'plan AUSENTE na linha → sem linha')
ok(semPlan.html === videoReadyFooterFromRows({ has_paid: true, plan: null, video_credits: 155 }, VID, APP).html, 'ausente e null produzem o MESMO html')
{
  const nulo = videoReadyFooterFromRows(null, null, APP)
  ok(nulo.kind === 'plan_generic' && nulo.adsLine === false && !hasLine(nulo), 'perfil e video nulos → plan_generic, sem linha, nunca lanca')
}
for (const plan of ['starter_trial', 'creator_trial', 'trial', 'ads_pass', '']) {
  ok(videoReadyFooterFromRows({ has_paid: true, plan, video_credits: 40 }, VID, APP).adsLine === false, `plan='${plan}' (fora de ADS_SUBSCRIBER_PLANS) → sem linha`)
}
{
  const free = videoReadyFooterFromRows({ has_paid: false, plan: 'free', video_credits: 20 }, VID, APP)
  ok(free.kind !== 'subscriber_next' && free.adsLine === false && !hasLine(free), 'trial (free, sem has_paid) → outro ramo, sem linha')
}
{
  const before = process.env.NEXT_PUBLIC_ADS_PASS_LIVE
  process.env.NEXT_PUBLIC_ADS_PASS_LIVE = '0'
  const off = videoReadyFooterFromRows({ has_paid: true, plan: 'starter', video_credits: 155 }, VID, APP)
  ok(adsPassLive() === false && !hasLine(off) && off.adsLine === false, 'interruptor NEXT_PUBLIC_ADS_PASS_LIVE=0 → FromRows sem linha')
  if (before === undefined) delete process.env.NEXT_PUBLIC_ADS_PASS_LIVE; else process.env.NEXT_PUBLIC_ADS_PASS_LIVE = before
}

console.log('\n── c) lib: o repasse do plano e a unica linha nova, sem numero digitado')
const lib = read(LIB)
const fromRows = lib.slice(lib.indexOf('export function videoReadyFooterFromRows'))
ok(fromRows.length > 100 && fromRows.includes('return videoReadyFooter({'), 'videoReadyFooterFromRows existe e chama videoReadyFooter({')
ok(fromRows.includes("    hasPaid: typeof prof?.has_paid === 'boolean' ? prof.has_paid : null,\n"), 'a linha do hasPaid (ancora do guardiao da porta de $1) continua byte a byte')
ok(fromRows.includes("    plan: typeof prof?.plan === 'string' ? prof.plan.toLowerCase() : null,\n  })\n}"), 'plan repassado logo apos hasPaid: string → lowercase, senao null (mesmo padrao do stranded no W)')
ok(!/has_paid/.test(fromRows.slice(fromRows.indexOf('plan: typeof'))), 'has_paid NAO participa da decisao do plano')
ok(!/\$\s?\d|\d+ credits|\d+-second/.test(fromRows.replace(/\/\/[^\n]*\n/g, '\n')), 'nenhum numero/preco digitado em videoReadyFooterFromRows')
ok((lib.match(/adsLine: false/g) ?? []).length === 4 && lib.includes('adsLine: ads !== null') && (lib.match(/adsLine: boolean/g) ?? []).length === 1, 'os 5 retornos e a interface do W ficaram como estavam')

console.log('\n── d) cron send-video-ready: plano do perfil JA LIDO, zero consulta nova, carimbo ads_line')
const cron = read(CRON)
const SELECT = ".select('id, email, video_ready_sent_at, has_paid, plan, video_credits')"
const PROF_LINE = "    const prof: ReadyProfileRow = { has_paid: u.has_paid as boolean | null, plan: u.plan as string | null, video_credits: u.video_credits as number | null }"
const FOOTER_LINE = '    const footer = videoReadyFooterFromRows(prof, { title: video.title, topic: null, credits_used: video.creditsUsed, duration: video.duration }, APP_URL)'
ok((cron.match(/\.from\('profiles'\)/g) ?? []).length === 3, "3 toques em profiles (1 select + 2 update) — os MESMOS de origin/main, zero consulta nova")
ok(cron.split(SELECT).length - 1 === 1 && cron.indexOf(SELECT) > cron.indexOf(".from('profiles')"), 'o select de profiles ja pedia `plan` (nenhuma coluna acrescentada)')
ok(cron.includes(PROF_LINE + '\n'), 'prof leva `plan: u.plan` da MESMA linha do select')
ok(cron.includes(FOOTER_LINE + '\n'), 'o rodape sai de videoReadyFooterFromRows(prof, …) — logo o plano chega por prof.plan')
ok(cron.indexOf(PROF_LINE) < cron.indexOf(FOOTER_LINE), 'prof montado antes do rodape')
ok((cron.match(/ads_line: footer\.adsLine,/g) ?? []).length === 1, 'carimbo ads_line: footer.adsLine — uma vez, derivado do rodape (nunca literal)')
ok(cron.includes('              trial_door: footer.trialDoor,\n') && cron.indexOf('ads_line: footer.adsLine,') > cron.indexOf('trial_door: footer.trialDoor,'), 'ads_line vem logo depois do trial_door (mesmo padrao do W)')
const iEvent = cron.indexOf('name: NUDGE_EVENT,')
const iMeta = cron.indexOf('metadata: {', iEvent)
const iMetaEnd = cron.indexOf('\n            },\n          })', iMeta)
ok(iEvent > 0 && iMeta > iEvent && iMetaEnd > iMeta, 'o insert do evento video_ready_nudge_sent tem um bloco metadata delimitado')
ok(cron.indexOf('ads_line: footer.adsLine,') > iMeta && cron.indexOf('ads_line: footer.adsLine,') < iMetaEnd, 'ads_line esta DENTRO do metadata do evento (nao solto na rota)')
ok((cron.match(/ads_line/g) ?? []).length <= 2, 'ads_line so no carimbo (e no comentario ao lado) — nenhum outro uso')
ok(cron.includes("const NUDGE_EVENT = 'video_ready_nudge_sent'"), 'o nome do evento e video_ready_nudge_sent (o carimbo que o painel le)')

// O mapeamento linha→rodape do cron e o objeto metadata do carimbo, RODADOS.
function cronMapper(cronSrc, libOverride = null) {
  const profLine = cronSrc.match(/^ *const prof: ReadyProfileRow = .*$/m)?.[0]
  const footerLine = cronSrc.match(/^ *const footer = videoReadyFooterFromRows\(.*$/m)?.[0]
  if (!profLine || !footerLine) throw new Error('recorte do cron nao ancorou')
  const pure =
    `import { videoReadyFooterFromRows, isSubscriberProfile, type ReadyProfileRow } from '@/lib/lifecycle/videoReadyFooter'\n` +
    `export function mapRow(u: any, video: any, APP_URL: string) {\n${profLine}\n${footerLine}\n  return { prof, footer }\n}\n`
  const out = ts.transpileModule(pure, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: 'pure.ts' }).outputText
  const mod = { exports: {} }
  const libLoaded = libOverride ? loadTs(LIB, FOOTER_MOCKS, libOverride) : libMod
  new Function('require', 'module', 'exports', out)((id) => { if (id === '@/lib/lifecycle/videoReadyFooter') return libLoaded; throw new Error('unexpected import ' + id) }, mod, mod.exports)
  const s = cronSrc.indexOf('metadata: {', cronSrc.indexOf('name: NUDGE_EVENT,'))
  const e = cronSrc.indexOf('\n            },\n          })', s)
  if (s < 0 || e < 0) throw new Error('metadata do carimbo nao ancorou')
  const body = cronSrc.slice(s + 'metadata: {'.length, e)
  const metadata = new Function('video', 'ctx', 'footer', 'prof', 'lastReady', 'isSubscriberProfile', `return {${body}\n}`)
  return {
    map: (u, video) => mod.exports.mapRow(u, video, APP),
    stamp: (u, video) => {
      const { prof, footer } = mod.exports.mapRow(u, video, APP)
      return { footer, meta: metadata({ id: 'v1', creditsUsed: video.credits_used }, { sawIt: false, pack: null }, footer, prof, undefined, libLoaded.isSubscriberProfile) }
    },
  }
}
const U_STARTER = { id: 'u1', has_paid: true, plan: 'starter', video_credits: 50 }
const U_PACK = { id: 'u2', has_paid: true, plan: 'free', video_credits: 50 }
const U_NULL = { id: 'u3', has_paid: true, plan: null, video_credits: 50 }
{
  const real = cronMapper(cron)
  const s1 = real.map(U_STARTER, VID).footer
  ok(s1.kind === 'subscriber_next' && hasLine(s1) && s1.adsLine === true, 'cron REAL: assinante starter → rodape com a linha do Studio Ads')
  const s2 = real.map(U_PACK, VID).footer
  ok(s2.kind === 'subscriber_next' && !hasLine(s2) && s2.adsLine === false, 'cron REAL: comprador de pack (has_paid, free) → sem linha')
  const s3 = real.map(U_NULL, VID).footer
  ok(!hasLine(s3) && s3.adsLine === false, 'cron REAL: plano nulo → sem linha')
  const st1 = real.stamp(U_STARTER, VID)
  ok(st1.meta.ads_line === true && st1.meta.ads_line === st1.footer.adsLine && st1.meta.trial_door === st1.footer.trialDoor && st1.meta.footer === 'subscriber_next', 'carimbo REAL (starter): ads_line=true, trial_door e footer.kind do MESMO rodape')
  const st2 = real.stamp(U_PACK, VID)
  ok(st2.meta.ads_line === false && st2.meta.subscriber === true && st2.meta.has_paid === true, 'carimbo REAL (pack): ads_line=false com subscriber=true e has_paid=true — o carimbo separa os dois')
  const st3 = real.stamp(U_NULL, VID)
  ok(st3.meta.ads_line === false, 'carimbo REAL (plano nulo): ads_line=false')
}

console.log('\n── e) send-recovery: fora do alcance por FATO medido (nao monta rodape; pula todo plano pago)')
const rec = read(RECOVERY)
ok((rec.match(/videoReadyFooter\(/g) ?? []).length === 0 && !rec.includes('videoReadyFooterFromRows'), 'send-recovery NAO chama videoReadyFooter nem videoReadyFooterFromRows (nada para passar plan)')
ok(rec.includes("import { NEXT_VIDEO_MIN_CREDITS } from '@/lib/lifecycle/videoReadyFooter'"), 'o unico laco com a lib e o piso NEXT_VIDEO_MIN_CREDITS')
ok(rec.includes('if (email && !isTestEmail(email) && (PAID_PLANS.has(plan) || optedOut)) {'), 'send-recovery PULA quem tem plano pago (PAID_PLANS)')
{
  const m = rec.match(/const PAID_PLANS = new Set\(\[([^\]]*)\]\)/)
  const paid = m ? new Function(`return [${m[1]}]`)() : []
  const r = lib.match(/const READY_PAID_PLANS = new Set\(\[([^\]]*)\]\)/)
  const readyPaid = r ? new Function(`return [${r[1]}]`)() : []
  ok(paid.length > 0 && readyPaid.length > 0 && readyPaid.every((p) => paid.includes(p)), `todo plano de READY_PAID_PLANS da lib (${readyPaid.join(',')}) esta em PAID_PLANS do send-recovery → o assinante que a lib reconhece nao recebe esse e-mail`)
  // FATO MEDIDO, nao bloqueante (fora do X): planos que abrem o /ads mas o
  // send-recovery NAO pula. Nao muda o veredito — a rota nao monta rodape.
  const foraDoPulo = ADS_SUBSCRIBER_PLANS.filter((p) => !paid.includes(p))
  console.log(`info  ADS_SUBSCRIBER_PLANS fora de PAID_PLANS do send-recovery: ${foraDoPulo.length ? foraDoPulo.join(',') : '(nenhum)'}`)
}
ok((rec.match(/\.from\('profiles'\)/g) ?? []).length === 1 && rec.includes(".select('id, email, plan, email_opted_out, video_credits')"), 'send-recovery: 1 leitura de profiles, a mesma de antes (intocada)')
ok(!rec.includes('ads_line'), 'send-recovery sem carimbo ads_line — correto enquanto nao monta rodape (se este check cair, passe plan e carimbe)')

console.log('\n── f) MUTANTES (cada um conferido como ESCRITO antes de rodar)')
const mutantes = [
  {
    nome: 'cron sem plan (prof nasce sem a coluna que o select ja traz)',
    alvo: 'cron',
    de: 'plan: u.plan as string | null, ',
    para: '',
    prova: (m) => m.map(U_STARTER, VID).footer.adsLine === true,
  },
  {
    nome: 'lib sem plan (= o estado de ANTES do X: FromRows nao repassava o plano)',
    alvo: 'lib',
    de: "    plan: typeof prof?.plan === 'string' ? prof.plan.toLowerCase() : null,\n",
    para: '',
    prova: (m) => m.map(U_STARTER, VID).footer.adsLine === true,
  },
  {
    nome: 'lib decide por has_paid em vez do plano (comprador de pack ganharia "included")',
    alvo: 'lib',
    de: "    plan: typeof prof?.plan === 'string' ? prof.plan.toLowerCase() : null,\n",
    para: "    plan: prof?.has_paid === true ? 'starter' : null,\n",
    prova: (m) => m.map(U_PACK, VID).footer.adsLine === false,
  },
  {
    nome: 'cron decide por has_paid em vez do plano',
    alvo: 'cron',
    de: 'plan: u.plan as string | null, ',
    para: "plan: (u.has_paid ? 'starter' : null) as string | null, ",
    prova: (m) => m.map(U_PACK, VID).footer.adsLine === false,
  },
  {
    nome: 'cron carimba ads_line literal (true) sem olhar o rodape',
    alvo: 'cron',
    de: 'ads_line: footer.adsLine,',
    para: 'ads_line: true,',
    prova: (m) => { const s = m.stamp(U_PACK, VID); return s.meta.ads_line === s.footer.adsLine },
  },
  {
    nome: 'cron tira plan do select (a coluna deixa de vir do banco)',
    alvo: 'cron',
    de: "has_paid, plan, video_credits')",
    para: "has_paid, video_credits')",
    prova: (m, src) => src.includes(SELECT) && m.map({ ...U_STARTER, plan: undefined }, VID).footer.adsLine === true,
  },
]
for (const mut of mutantes) {
  const original = mut.alvo === 'lib' ? lib : cron
  if (!original.includes(mut.de)) { n++; fail++; console.log('FAIL', n, `mutante NAO ANCOROU: ${mut.nome}`); continue }
  const mutado = original.replace(mut.de, () => mut.para)
  if (mutado === original) { n++; fail++; console.log('FAIL', n, `mutante NAO ALTEROU NADA: ${mut.nome}`); continue }
  let sobreviveu
  try {
    const m = mut.alvo === 'lib' ? cronMapper(cron, mutado) : cronMapper(mutado)
    sobreviveu = mut.prova(m, mutado)
  } catch {
    sobreviveu = false // mutante que nem compila esta morto do mesmo jeito
  }
  ok(!sobreviveu, `mutante MORRE: ${mut.nome}`)
}

console.log(`\ntest-video-ready-cron-ads-2026-09-27: ${n - fail}/${n} ok${fail ? ` — ${fail} FALHAS` : ''}`)
process.exit(fail ? 1 : 0)
