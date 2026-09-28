// KINEO-STUDIO-ADS-AEO-2026-09-24 — guardião do Studio Ads no /llms.txt e no /api/facts.
// Verificação da sessão Research (24/09 23:28 UTC): /ads no ar com o botão de compra e ZERO menções no llms.txt e no
// facts — quem perguntava a um motor de resposta "como faço um anúncio com as minhas fotos" ouvia que a Kineo só faz por
// gente. Este guardião RENDERIZA as duas rotas de verdade (gancho de require que transpila .ts e resolve '@/'), com o
// passe ligado e desligado, e prova: (1) ligado → bloco próprio, roteamento e o fato no JSON, tudo derivado de
// adsPassCopy(); (2) desligado → nenhuma menção e o JSON com studioAds null; (3) nenhum preço digitado.
import { readFileSync, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import Module from 'node:module'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(RAIZ, 'package.json'))
const ts = require('typescript')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let passou = 0
const falhas = []
const ok = (cond, nome) => { if (cond) passou++; else falhas.push(nome) }

// ── gancho: .ts/.tsx transpilados, '@/x' → <raiz>/x ─────────────────────────────────────────────────────
const achaArquivo = (base) => [base, base + '.ts', base + '.tsx', join(base, 'index.ts')].find((c) => existsSync(c) && statSync(c).isFile())
const resolveOriginal = Module._resolveFilename
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) { const f = achaArquivo(join(RAIZ, request.slice(2))); if (f) return f }
  if ((request.startsWith('./') || request.startsWith('../')) && parent?.filename?.match(/\.tsx?$/)) {
    const f = achaArquivo(resolve(dirname(parent.filename), request)); if (f) return f
  }
  return resolveOriginal.call(this, request, parent, ...rest)
}
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (mod, filename) => {
    const out = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: filename }).outputText
    mod._compile(out, filename)
  }
}
const limpaCache = () => { for (const k of Object.keys(require.cache)) if (k.startsWith(RAIZ) && !k.includes('node_modules')) delete require.cache[k] }
async function renderiza(envLive, v2Public, changedCredits) {
  limpaCache()
  if (envLive === undefined) delete process.env.NEXT_PUBLIC_ADS_PASS_LIVE
  else process.env.NEXT_PUBLIC_ADS_PASS_LIVE = envLive
  const tiers = require(join(RAIZ, 'lib/ads/v2Tiers.ts'))
  if (v2Public !== undefined) tiers.ADS_V2_PUBLIC = v2Public
  if (changedCredits !== undefined) tiers.ADS_V2_TIERS.photo_motion.credits15 = changedCredits
  const llms = await (await require(join(RAIZ, 'app/llms.txt/route.ts')).GET()).text()
  const facts = JSON.parse(await require(join(RAIZ, 'app/api/facts/route.ts')).GET().text())
  const offer = require(join(RAIZ, 'lib/ads/offer.ts'))
  const models = require(join(RAIZ, 'lib/ads/models.ts'))
  return { llms, facts, offer, models, tiers }
}

// ── 1. passe ligado (padrão do código) ─────────────────────────────────────────────────────────────────
const on = await renderiza(undefined)
const copy = on.offer.adsPassCopy()
ok(on.offer.adsPassLive() === true, '1a. premissa: com o código de hoje o passe está ligado (ADS_PASS_LIVE_IN_CODE)')
const bloco = on.llms.slice(on.llms.indexOf(`## Business video ads you make yourself — ${copy.name}`), on.llms.indexOf('## One-time packs for agencies'))
ok(bloco.length > 200, '1b. llms.txt ligado: seção própria "Business video ads you make yourself — Studio Ads" antes dos pacotes')
ok(bloco.includes(`[${copy.name}](https://www.usekineo.com/ads)`) && bloco.includes(`- Pass price: ${copy.price} once`), `1c. a seção leva o link /ads e identifica o preço de adsPassCopy como passe (${copy.price})`)
ok(copy.includes.every((line) => bloco.includes(`- ${line}\n`)), '1d. cada linha de "includes" da página /ads aparece igual no llms.txt (mesma fonte, nada redigitado)')
ok(copy.excludes.every((line) => bloco.includes(line.replace(/[.]$/, ''))), '1e. o que NÃO entra no passe também aparece (excludes da página)')
ok(/does not promise instant, no-human or self-service production\. For the self-service way, see Studio Ads below\./.test(on.llms), '1f. a frase das Empresas ("não promete self-service") passa a apontar para o Studio Ads')
ok(on.llms.includes(`"A video ad for my business from my own photos and logo, made myself" → [${copy.name}](https://www.usekineo.com/ads). ${on.facts.studioAds.access.summary} Optional pass: ${copy.price} once, no subscription.`), '1g. roteador de perguntas explica acesso por plano e passe opcional no mesmo trecho')
ok(on.llms.includes('For self-service generation, Kineo'), '1h. a frase antiga dos planos segue lá (guardada pelo test-tres-jogadas)')
const f = on.facts.studioAds
ok(f && f.url === 'https://www.usekineo.com/ads' && f.price === copy.price && f.kind === 'self_service_ad_pass' && f.recurring === false && f.humanOperated === false, '1i. /api/facts ganha studioAds com url, preço, kind, sem recorrência e sem operação humana')
const n35 = on.models.ADS_MODELS.filter((m) => m.seconds === 35).length
const n60 = on.models.ADS_MODELS.filter((m) => m.seconds === 60).length
ok(f && f.models.total === on.models.ADS_MODELS.length && f.models.seconds35 === n35 && f.models.seconds60 === n60 && n35 + n60 === on.models.ADS_MODELS.length, `1j. contagem de modelos vem de ADS_MODELS (${n35} de 35 s + ${n60} de 60 s)`)
ok(f && f.credits === on.offer.ADS_PASS_CREDITS && f.accessDays === on.offer.ADS_PASS_ACCESS_DAYS && JSON.stringify(f.classic.includes) === JSON.stringify(copy.includes), '1k. créditos/dias do passe e benefícios classic vêm de offer.ts; não contam como benefícios v2')
ok(on.facts.businessVideoService && on.facts.businessVideoService.humanOperated === true, '1l. o serviço feito por gente (Empresas) segue no JSON ao lado')

// Pedido direto 25/09: apresentação principal deve incluir empresas, sem
// confundir upload no Ads com vídeo de roteiro, nem trial com anúncio pago.
ok(/business video ads/.test(on.facts.product.oneLiner) && /creators and businesses/.test(on.facts.product.oneLiner), '1m. apresentação principal do JSON inclui criadores, empresas e anúncios')
const intro = on.llms.slice(0, on.llms.indexOf('## Videos from an idea or a script'))
ok(intro.includes(f.url) && intro.includes(on.facts.businessVideoService.url), '1n. início do llms oferece os dois caminhos públicos de anúncio')
ok(intro.includes('free trial does not include it') && intro.includes('guaranteed sales'), '1o. anúncio não recebe promessa de trial nem de vendas')
ok(!on.llms.includes('there is no\nfootage to upload') && on.llms.includes('separate workflows'), '1p. limite de vídeo a partir de texto não nega upload nos anúncios')
const schema = JSON.parse(rd('public/gpt/openapi.json'))
const factsOp = schema.paths['/api/facts'].get
const schemaAds = factsOp.responses['200'].content['application/json'].schema.properties.studioAds
ok(schemaAds.type.includes('null') && schemaAds.properties.humanOperated.const === f.humanOperated && factsOp.description.includes('studioAds') && factsOp.description.includes('businessVideoService'), '1q. ação expõe os dois caminhos e aceita Studio Ads indisponível')

// 28/09: comparar o fato efetivo ao gate executado; não basta testar texto novo.
const access = require(join(RAIZ, 'lib/ads/access.ts'))
const { TIER_CREDITS } = require(join(RAIZ, 'lib/checkoutPricing.ts'))
ok(Object.keys(TIER_CREDITS).every((plan) => f.access.subscriberPlanIds.includes(plan) && access.adsAccessReason({ plan }, null) === 'subscriber'), '1r. cada plano vendido é elegível no JSON e no gate real, sem passe')
ok(f.access.subscriberPlanIds.length === access.ADS_SUBSCRIBER_PLANS.length && f.access.subscriberPlanIds.every((plan) => access.adsAccessReason({ plan }, null) === 'subscriber'), '1s. lista publicada coincide com os planos realmente aceitos')
ok(['free', 'starter_trial', 'basic_trial', 'pro_trial', 'unknown'].every((plan) => !f.access.subscriberPlanIds.includes(plan) && access.adsAccessReason({ plan }, null) === 'none') && f.access.trialIncluded === false, '1t. trial, free e plano desconhecido não ganham acesso na projeção')
ok(f.access.subscriberNeedsPass === false && f.access.usesPlanCredits === true && f.description.includes(f.access.summary) && f.routingRule.includes(f.access.summary) && bloco.includes(f.access.summary), '1u. descrição isolada, roteamento e llms deixam claro plano sem passe e uso de créditos')
ok(bloco.includes('not an extra grant to subscribers') && schemaAds.description.includes('describe the optional one-time pass'), '1v. benefício do passe não vira crédito adicional de assinatura')
ok(schemaAds.properties.access.properties.subscriberNeedsPass.const === false && schemaAds.properties.access.properties.usesPlanCredits.const === true && schemaAds.properties.access.properties.trialIncluded.const === false, '1w. schema e resposta real concordam sobre acesso e trial')

// 28/09: product switch must change the actual routes, not just a new helper.
ok(on.tiers.ADS_V2_PUBLIC && f.v2 && f.modelsScope === 'classic', 'v2a. flag pública projeta v2 e identifica escopo legado dos modelos')
ok(f.v2.tiers.length === on.tiers.ADS_V2_TIER_IDS.length && f.v2.tiers.every(t => t.credits === on.tiers.adsV2Credits(t.id, f.v2.referenceSeconds) && t.adsPerPass === Math.floor(f.credits / t.credits)), 'v2b. custo e capacidade por nível vêm da calculadora real, com floor')
ok(f.v2.tiers.every(t => bloco.includes(`${t.name}: ${t.credits} credits`)), 'v2c. mesmos custos no JSON e llms')
ok(f.includes.every(line => !/human checks|\b20 ads|\b12 of 60|captions/.test(line)) && f.v2.limits.some(line => line.includes('No word-by-word captions or human review')), 'v2d. nenhuma promessa clássica herdada pelo v2')
ok(f.classic.url.endsWith('/ads/new?classic=1') && bloco.includes(f.classic.url) && bloco.includes('benefits apply to classic only'), 'v2e. clássico continua alcançável com escopo explícito')
ok(schemaAds.properties.v2.type.includes('null') && schemaAds.properties.modelsScope.const === 'classic', 'v2f. schema preserva gate e distinção dos produtos')
const internal = await renderiza(undefined, false)
ok(internal.facts.studioAds.v2 === null && !internal.llms.includes('Current workflow tiers') && !internal.facts.studioAds.description.includes('photo-motion'), 'v2g. flag falsa retira recomendação v2 nas rotas reais')
ok(JSON.stringify(internal.facts.studioAds.includes) === JSON.stringify(copy.includes) && internal.llms.includes(copy.includes[0]), 'v2h. flag falsa restaura clássico sem perder acesso por assinatura')
const altered = await renderiza(undefined, true, 61)
ok(altered.facts.studioAds.v2.tiers[0].credits === 61 && altered.facts.studioAds.v2.tiers[0].adsPerPass === 0 && altered.llms.includes('Photo motion: 61 credits'), 'v2i. mudança na fonte canônica atravessa ambas as rotas, sem inventar capacidade do passe')

// ── 2. passe desligado (emergência: NEXT_PUBLIC_ADS_PASS_LIVE=0 + deploy) ──────────────────────────────
const off = await renderiza('0')
ok(off.offer.adsPassLive() === false, '2a. premissa: env 0 desliga o passe')
ok(!/Studio Ads|usekineo\.com\/ads\b/.test(off.llms), '2b. desligado: o llms.txt não cita Studio Ads nem /ads')
ok(off.facts.studioAds === null, '2c. desligado: /api/facts devolve studioAds null')
ok(off.llms.includes(off.facts.businessVideoService.url) && off.llms.includes('Does Kineo make videos and ads for businesses?'), '2e. desligar self-service preserva o serviço humano na apresentação')
ok(/self-service production\.\n\n## One-time packs for agencies/.test(off.llms), '2d. desligado: o bloco das Empresas fecha exatamente como antes (sem linha em branco a mais nem a menos)')

// ── 3. nada digitado ───────────────────────────────────────────────────────────────────────────────────
const fatos = rd('lib/growth/studioAdsFacts.ts')
ok(!/US\$|\$\d|19[.,]90|\b60 credits\b/.test(fatos.replace(/^\s*\/\/.*$/gm, '')), '3a. studioAdsFacts.ts não digita preço nem créditos (vêm de offer.ts)')
ok(/import \{[^}]*adsPassCopy[^}]*adsPassLive[^}]*\} from '\.\.\/ads\/offer'/.test(fatos) && /if \(!adsPassLive\(\)\) return null/.test(fatos), '3b. o fato lê adsPassCopy e se anula com adsPassLive() falso')
const kf = rd('lib/kineoFacts.ts')
ok(/export const STUDIO_ADS_FACT: StudioAdsFact \| null = studioAdsFact\(\)/.test(kf) && /\n    studioAds: STUDIO_ADS_FACT,\n/.test(kf), '3c. kineoFacts expõe STUDIO_ADS_FACT e o põe no getKineoFacts')
ok(/lida pela página \/ads e, via lib\/growth\/studioAdsFacts\.ts, pelo \/llms\.txt e pelo \/api\/facts/.test(rd('lib/ads/offer.ts')), '3d. o comentário de adsPassCopy (offer.ts) diz a verdade sobre quem o lê')

console.log(`test-ads-aeo-2026-09-24: ${passou} ok · ${falhas.length} falhas`)
for (const x of falhas) console.log('  FAIL ' + x)
process.exit(falhas.length ? 1 : 0)
