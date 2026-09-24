// KINEO-STUDIO-ADS-2026-09-25 — guardião da FUNDAÇÃO do Studio Ads (módulos puros + migration).
// Decisões do fundador (24/09): nome Studio Ads · passe US$19 (1990 c) + 60 cr · assinante entra ·
// entrega imediata + revisão humana 24 h · trava 8.2 só ii e iv. Estilo da casa: readFileSync +
// regex para o que importa alias '@/', transpile+vm para os módulos puros; `check(nome, condição)`.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const check = (nome, condicao) => { if (condicao) ok++; else falhas.push(nome) }
const roda = (src, env = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, console, Map, Set, Array, Object, String, RegExp, Number, Math, Date, process: { env } })
  return exp
}

// ── 1. offer.ts ───────────────────────────────────────────────────────────────────────────────
const offerSrc = rd('lib/ads/offer.ts')
check('offer.ts é puro (sem import)', !/^import /m.test(offerSrc))
const offer = roda(offerSrc)
check('nome Studio Ads · SKU ads_pass · 1990 centavos · 60 créditos · 365 dias (decisões 1 e 2)',
  offer.ADS_PRODUCT_NAME === 'Studio Ads' && offer.ADS_PASS_ID === 'ads_pass' && offer.ADS_PASS_USD_MINOR === 1990 && offer.ADS_PASS_CREDITS === 60 && offer.ADS_PASS_ACCESS_DAYS === 365)
check('1990 não colide com nenhum one-time da casa (1900 é o bulk10)', !offer.ONE_TIME_USD_MINOR_OCCUPIED.includes(offer.ADS_PASS_USD_MINOR) && offer.ONE_TIME_USD_MINOR_OCCUPIED.includes(1900) && offer.ONE_TIME_USD_MINOR_OCCUPIED.includes(3500) && offer.ONE_TIME_USD_MINOR_OCCUPIED.includes(7500))
check('a lista de ocupados bate com o código de cobrança (bulk 1900/3500/4900/7500, packs 290/490, DFY 3500/7500/10000)', (() => {
  const cp = rd('lib/checkoutPricing.ts'); const wh = rd('app/api/stripe/webhook/route.ts'); const dfy = rd('lib/growth/dfyOffer.ts')
  return /1900/.test(cp) && /3500/.test(cp) && /4900/.test(cp) && /7500/.test(cp) && /490/.test(cp) && /priceMinor: 3500/.test(dfy) && /priceMinor: 7500/.test(dfy) && /DFY_LEGACY_PRICE_USD_MINOR = 10000/.test(dfy) && /DFY_ACCEPTED_AMOUNTS_USD_MINOR/.test(wh)
})())
check('preço por crédito do passe (US$0,3317) fica ACIMA do plano mais barato (Starter US$9,90/60 = 0,165) — passe nunca canibaliza assinatura', (offer.ADS_PASS_USD_MINOR / 100) / offer.ADS_PASS_CREDITS > 990 / 100 / 60)
check('60 créditos cobrem 20 anúncios de 35 s ou 12 de 60 s no Kineo 1 (5 cr/60 s, 3 cr/35 s de engineCost)', offer.adsCoveredByPass(35) === 20 && offer.adsCoveredByPass(60) === 12 && /return isPaidUser \? 5 : 0/.test(rd('lib/credits/engineCost.ts')))
check('rótulo "US$19.90" (nunca "US$19" nem "19.9")', offer.adsPassPriceLabel() === 'US$19.90' && offer.adsPassPriceLabel(3500) === 'US$35')
check('interruptor: só NEXT_PUBLIC_ADS_PASS_LIVE=1 liga; ausente/"true"/"0" = desligado', roda(offerSrc, {}).adsPassLive() === false && roda(offerSrc, { NEXT_PUBLIC_ADS_PASS_LIVE: 'true' }).adsPassLive() === false && roda(offerSrc, { NEXT_PUBLIC_ADS_PASS_LIVE: '1' }).adsPassLive() === true)
check('adsAccessUntil soma dias inteiros em UTC', offer.adsAccessUntil(new Date('2026-09-25T00:00:00Z')).toISOString() === '2027-09-25T00:00:00.000Z')
const copy = offer.adsPassCopy()
check('copy do passe é executável e honesta: diz o que NÃO inclui; nunca "hundreds of formats"/"instant"/"no human"/"unlimited"', copy.excludes.length >= 2 && copy.includes.some((s) => /human editor reviews your first ad within 24 hours/.test(s)) && !/hundreds of formats|instant|no human|unlimited/i.test(JSON.stringify(copy)))
check('a copy do passe promete exatamente o que o crédito paga (20/12 anúncios)', copy.includes[0].includes('20 ads of 35 s') && copy.includes[0].includes('12 of 60 s'))

// ── 2. models.ts ──────────────────────────────────────────────────────────────────────────────
const modelsSrc = rd('lib/ads/models.ts')
check('models.ts é puro (sem import)', !/^import /m.test(modelsSrc))
const models = roda(modelsSrc)
const M = models.ADS_MODELS
check('exatamente 8 modelos, ids únicos, todos Kineo 1 (fast) — dia 1 sem motor novo', M.length === 8 && new Set(M.map((m) => m.id)).size === 8 && M.every((m) => m.engine === 'fast'))
check('durações só 35 ou 60 (piso de 35 s da rota fast; 20 s NÃO foi liberado na trava 8.2)', M.every((m) => m.seconds === 35 || m.seconds === 60) && /export type AdsSeconds = 35 \| 60/.test(modelsSrc))
check('créditos por modelo = custo do Kineo 1 (3 em 35 s, 5 em 60 s)', M.every((m) => (m.seconds === 35 && m.credits === 3) || (m.seconds === 60 && m.credits === 5)))
check('a soma das batidas é igual à duração em TODOS os modelos', M.every((m) => models.adsModelBeatSeconds(m) === m.seconds))
check('a última batida é sempre o cartão final (logo + CTA)', M.every((m) => m.beats[m.beats.length - 1].media === 'card' && /logo/i.test(m.beats[m.beats.length - 1].screen)))
check('todo modelo exige logo, tem CTA de exemplo e régua de palavras (100-115 / 175-195)', M.every((m) => m.inputs.logo === 'required' && m.ctaExample.length > 8 && ((m.seconds === 35 && m.words[0] === 100 && m.words[1] === 115) || (m.seconds === 60 && m.words[0] === 175 && m.words[1] === 195))))
check('stock só onde o modelo permite (dor/ilustração): vitrine, depoimento, antes-depois, fundador e contagem são 100% mídia do cliente', M.filter((m) => ['vitrine_fotos', 'depoimento_cartao', 'antes_depois', 'historia_fundador', 'contagem_prazo'].includes(m.id)).every((m) => m.beats.every((b) => b.media !== 'stock')))
check('adsModelMissingInputs bloqueia sem logo/fotos e libera com o mínimo', (() => {
  const v = models.adsModelById('vitrine_fotos'); const p = models.adsModelById('problema_solucao')
  return models.adsModelMissingInputs(v, { photos: 6, videos: 0, logo: true }).length === 0 && models.adsModelMissingInputs(v, { photos: 2, videos: 0, logo: false }).length === 2 && models.adsModelMissingInputs(p, { photos: 3, videos: 0, logo: true }).length === 0 && models.adsModelById('nao-existe') === null
})())
check('nenhuma fala inventa número: moldes usam [colchetes] para N, preço, prazo', M.every((m) => m.beats.filter((b) => b.media !== 'card').some((b) => /\[/.test(b.speech))))
check('copy dos modelos sem promessas proibidas', !/hundreds of formats|instant|no human|unlimited|avatar|cloned voice is included/i.test(modelsSrc))

// ── 3. events.ts ──────────────────────────────────────────────────────────────────────────────
const eventsSrc = rd('lib/ads/events.ts')
check('events.ts é puro', !/^import /m.test(eventsSrc))
const ev = roda(eventsSrc)
check('25 eventos, únicos, todos com prefixo ads_', ev.ADS_EVENTS.length === 25 && new Set(ev.ADS_EVENTS).size === 25 && ev.ADS_EVENTS.every((n) => n.startsWith('ads_')))
check('os eventos do funil existem: viewed → cta → checkout → access_granted → brief → media → template → script → preview → render_requested → render_served → delivered → download', ['ads_page_viewed', 'ads_cta_clicked', 'ads_checkout_started', 'ads_access_granted', 'ads_brief_saved', 'ads_media_uploaded', 'ads_template_selected', 'ads_script_served', 'ads_preview_confirmed', 'ads_render_requested', 'ads_render_served', 'ads_delivered', 'ads_download_clicked', 'ads_qa_decided', 'ads_open_orders_capped'].every((n) => ev.isAdsEvent(n)))
check('eventos só de servidor incluem grant/deny/render_served/delivered/qa', ['ads_access_granted', 'ads_access_denied', 'ads_render_served', 'ads_delivered', 'ads_qa_decided'].every((n) => ev.ADS_SERVER_ONLY_EVENTS.includes(n)) && ev.ADS_SERVER_ONLY_EVENTS.every((n) => ev.isAdsEvent(n)))
check('teto de 5 revisões abertas (decisão 5)', ev.ADS_MAX_OPEN_REVIEWS === 5)

// ── 4. access.ts (por regex: importa o predicado do cobrador, não o redigita) ─────────────────
const accessSrc = rd('lib/ads/access.ts')
check('access.ts importa isPayingProfile de @/lib/reverseTrial (predicado do cobrador não se redigita)', /import \{ isPayingProfile, type PayingProfileFields \} from '@\/lib\/reverseTrial'/.test(accessSrc) && !/has_paid === true/.test(accessSrc) && !/plan !== 'free'/.test(accessSrc))
check('três portas na ordem passe > pagante > interna; trial/free nunca entram; nada de !isSubscriber', /if \(until && until\.getTime\(\) > now\.getTime\(\)\) return 'pass'/.test(accessSrc) && /if \(isPayingProfile\(row\)\) return 'paying'/.test(accessSrc) && /if \(isInternalEmail\(row\.email\)\) return 'internal'/.test(accessSrc) && /return 'none'/.test(accessSrc) && !/isSubscriber|treatAsPaid|trial_status|isTrial|trialCap/.test(accessSrc.replace(/\/\/.*$/gm, '')))
check('a coluna vem de ADS_ACCESS_COLUMN (offer.ts) e é lida por nome, não por literal', /import \{ ADS_ACCESS_COLUMN \} from '@\/lib\/ads\/offer'/.test(accessSrc) && /row\[ADS_ACCESS_COLUMN\]/.test(accessSrc) && !/row\.ads_access_until/.test(accessSrc))
check('perfil ausente = none (falha fechada)', /if \(!row\) return 'none'/.test(accessSrc))

// ── 5. migration ──────────────────────────────────────────────────────────────────────────────
const migPath = 'migrations_pending/2026-09-25_studio_ads.sql'
check('migration existe', existsSync(join(RAIZ, migPath)))
const mig = existsSync(join(RAIZ, migPath)) ? rd(migPath) : ''
check('coluna profiles.ads_access_until timestamptz, mesmo nome do offer.ts', /add column if not exists ads_access_until timestamptz/.test(mig) && offer.ADS_ACCESS_COLUMN === 'ads_access_until')
check('tabela ads_orders com os estados do types.ts, seconds em (35, 60), RLS ligado e NENHUMA policy pública', /create table if not exists public\.ads_orders/.test(mig) && /check \(status in \('draft', 'rendering', 'delivered', 'reviewed', 'failed', 'cancelled'\)\)/.test(mig) && /seconds in \(35, 60\)/.test(mig) && /alter table public\.ads_orders enable row level security/.test(mig) && !/create policy/i.test(mig))
const typesSrc = rd('lib/ads/types.ts')
check('types.ts tem os mesmos 6 estados e o storyboard mapeia mídia por ID', ['draft', 'rendering', 'delivered', 'reviewed', 'failed', 'cancelled'].every((s) => typesSrc.includes(`'${s}'`)) && /footageId: string \| null\s+\/\/ por ID, nunca por posição/.test(typesSrc))

// ── 6. nada disto toca a trava 8.2 ────────────────────────────────────────────────────────────
check('a fundação não importa nem menciona lib/compose, lib/hollywood, lib/cinematic, lib/broll, analyze-idea, generate-script ou generate-video-* como dependência', ![offerSrc, modelsSrc, eventsSrc, accessSrc, typesSrc].some((s) => /^import .* from '@\/lib\/(compose|hollywood|cinematic|broll|lyriaMusic|narrationFit)/m.test(s) || /^import .*api\/(analyze-idea|generate-script|generate-video-)/m.test(s)))

console.log(`test-ads-fundacao-2026-09-25: ${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  FAIL ' + f)
process.exit(falhas.length ? 1 : 0)
