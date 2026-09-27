// KINEO-SUCESSO-STUDIO-ADS-2026-09-27 — guardião do item S (ciclo C da sprint de 16 h, dom 27/09, alvo MRR): a tela de
// sucesso do checkout passa a contar a quem ACABOU DE ASSINAR que o Studio Ads já está no plano. Fato medido: 0 dos 10
// assinantes pagos tocou /ads em 30 dias; o acesso é fato de lib/ads/access.ts (ADS_SUBSCRIBER_PLANS → 'subscriber') e
// ninguém dizia isso no minuto mais quente. O bloco é SECUNDÁRIO (abaixo do CTA principal, nunca no lugar dele), só com
// assinatura confirmada (selfServeReady + plano em ADS_SUBSCRIBER_PLANS + sem ?pack= + passe ligado); o "35" e o custo
// nascem de lib/ (ADS_MODELS mais curto; KINEO1_35S_CREDITS), nunca digitados; a impressão vai no evento que já existia
// (checkout_success_entitlement_ready.ads_block) e o clique vira checkout_success_ads_clicked {plan}.
// Só readFileSync (sem alias @/, sem rede); o que é executado roda pelo loader offline. Mutantes em memória no bloco 8.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
const count = (s, needle) => s.split(needle).length - 1
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
const load = createOfflineLoader()

const PAGE = rd('app/checkout/success/page.tsx')
const WIZARD = rd('app/(dashboard)/ads/new/AdsWizardClient.tsx') // só leitura
const RENDER = rd('app/api/ads/render/route.ts') // só leitura
const COMPOSE = rd('app/api/compose/route.ts') // só leitura
const CREDITS = rd('app/api/credits/route.ts') // só leitura
const CHECKOUT = rd('app/api/stripe/checkout/route.ts') // só leitura

const COND = "const adsBlockShown = selfServeReady && !packPurchase && accountPlan !== null && ADS_SUBSCRIBER_PLANS.includes(accountPlan) && adsPassLive()"
const DERIV = 'const ADS_SHORTEST_SECONDS = Math.min(...ADS_MODELS.map((m) => m.seconds))'
const COPY = 'Paste your website link or write one sentence; the AI writes, narrates and cuts a vertical ad with captions, music and your logo. A {ADS_SHORTEST_SECONDS}-second ad costs {KINEO1_35S_CREDITS} credits from the same balance.'
const GATE = '{adsBlockShown && (\n            <div\n              data-kineo="checkout-success-studio-ads"'
const HREF_LINE = /const CHECKOUT_SUCCESS_ADS_HREF = '([^']*)'/
const TYPED = /\b35-second\b|\b35 s\b|\b3 credits\b|costs 3\b|\b3 cr\b/
const blockOf = (src) => { const i = src.indexOf(GATE); if (i < 0) return null; const j = src.indexOf('Make a business ad →', i); return j < 0 ? null : src.slice(i, j) }

// ── 1. a página importa a fonte de cada fato (acesso, custo, interruptor, modelos) ──
checa('1a. importa ADS_SUBSCRIBER_PLANS de @/lib/ads/access', PAGE.includes("import { ADS_SUBSCRIBER_PLANS } from '@/lib/ads/access'"))
checa('1b. importa KINEO1_35S_CREDITS e adsPassLive de @/lib/ads/offer', PAGE.includes("import { KINEO1_35S_CREDITS, adsPassLive } from '@/lib/ads/offer'"))
checa('1c. importa ADS_MODELS de @/lib/ads/models (fonte do "35")', PAGE.includes("import { ADS_MODELS } from '@/lib/ads/models'"))
checa('1d. os três módulos são puros: nenhum import de servidor (supabase, next/headers, server-only, chave secreta) em access/offer/models/internalAccounts', ['lib/ads/access.ts', 'lib/ads/offer.ts', 'lib/ads/models.ts', 'lib/internalAccounts.ts'].every((p) => !/supabase|next\/headers|server-only|process\.env\.[A-Z_]*(KEY|SECRET)/.test(rd(p))))
checa('1e. a página continua client component (o clique é medido com trackEvent no onClick)', PAGE.startsWith("'use client'"))

// ── 2. nada digitado: o "35" e o custo nascem de lib/ ──
checa('2a. ADS_SHORTEST_SECONDS derivado do modelo mais curto de ADS_MODELS', count(PAGE, DERIV) === 1)
checa('2b. a frase interpola {ADS_SHORTEST_SECONDS}-second e {KINEO1_35S_CREDITS} credits (texto exato)', count(PAGE, COPY) === 1)
const block = blockOf(PAGE)
checa('2c. nenhum "35-second", "35 s", "3 credits" digitado dentro do bloco', !!block && !TYPED.test(block))
const models = load('lib/ads/models.ts')
const offer = load('lib/ads/offer.ts')
const ec = load('lib/credits/engineCost.ts')
const minS = Math.min(...models.ADS_MODELS.map((m) => m.seconds))
checa('2d. EXECUTADO: o modelo mais curto de ADS_MODELS tem 35 s (a fonte do "35" é lib/ads/models.ts)', minS === 35 && models.ADS_MODELS.filter((m) => m.seconds === minS).length >= 1 && models.ADS_MODELS.length >= 2)
checa('2e. EXECUTADO: todo modelo de 35 s cobra KINEO1_35S_CREDITS (lib/ads/offer.ts) — o custo da frase é o custo do modelo', models.ADS_MODELS.filter((m) => m.seconds === minS).every((m) => m.credits === offer.KINEO1_35S_CREDITS))
checa("2f. EXECUTADO: creditCostForDuration('fast', true, 35) === KINEO1_35S_CREDITS — e é essa a chamada de /api/ads/render (linha lida)", ec.creditCostForDuration('fast', true, minS) === offer.KINEO1_35S_CREDITS && RENDER.includes("const cost = creditCostForDuration('fast', true, seconds)"))
checa('2g. FATO "from the same balance": /api/ads/render lê profiles.video_credits e /api/credits lê a MESMA coluna', RENDER.includes(".select('video_credits')") && CREDITS.includes(".select('video_credits, plan')"))

// ── 3. o href: /ads/new com utm triplo e a campanha do dia; o Link usa a constante ──
const hrefM = PAGE.match(HREF_LINE)
const hrefParams = hrefM ? (hrefM[1].split('?')[1] ?? '').split('&') : []
checa('3a. CHECKOUT_SUCCESS_ADS_HREF = /ads/new?utm_source=checkout_success&utm_medium=studio_ads&utm_campaign=sprint0927', !!hrefM && hrefM[1].startsWith('/ads/new?') && ['utm_source=checkout_success', 'utm_medium=studio_ads', 'utm_campaign=sprint0927'].every((p) => hrefParams.includes(p)))
checa('3b. o Link do bloco usa a constante (href={CHECKOUT_SUCCESS_ADS_HREF}) e o texto é "Make a business ad →"', !!block && block.includes('href={CHECKOUT_SUCCESS_ADS_HREF}') && PAGE.includes('Make a business ad →'))

// ── 4. a condição: só assinatura CONFIRMADA (prova pela condição no JSX e pela política executada) ──
checa('4a. a condição completa existe uma vez: selfServeReady && !packPurchase && plano em ADS_SUBSCRIBER_PLANS && adsPassLive()', count(PAGE, COND) === 1)
checa('4b. o JSX do bloco está atrás de adsBlockShown (e só dele)', count(PAGE, GATE) === 1)
checa("4c. selfServeReady segue = isSelfServe && selfServeState === 'ready' (fluxo self_serve + /api/credits: entitlementsResolved, hasPaid, plano pago)", PAGE.includes("const selfServeReady = isSelfServe && selfServeState === 'ready'") && PAGE.includes("const isSelfServe = flow?.kind === 'self_serve'") && PAGE.includes('const selfServeState = selfServeEntitlementState({\n    entitlementsResolved,\n    hasPaid: accountHasPaid,\n    plan: accountPlan,\n  })'))
const ent = load('lib/growth/checkoutSuccessEntitlement.ts')
const access = load('lib/ads/access.ts')
checa("4d. EXECUTADO: sem hasPaid ou sem plano pago a política NÃO fica 'ready' (o bloco nunca aparece antes da confirmação)", ent.selfServeEntitlementState({ entitlementsResolved: true, hasPaid: true, plan: 'starter' }) === 'ready' && ent.selfServeEntitlementState({ entitlementsResolved: true, hasPaid: false, plan: 'starter' }) !== 'ready' && ent.selfServeEntitlementState({ entitlementsResolved: true, hasPaid: true, plan: 'free' }) !== 'ready' && ent.selfServeEntitlementState({ entitlementsResolved: false, hasPaid: true, plan: 'starter' }) !== 'ready')
checa("4e. EXECUTADO: a checagem ADS_SUBSCRIBER_PLANS é NECESSÁRIA — 'starter_trial' fica 'ready' na política de sucesso mas dá 'none' no Studio Ads", ent.selfServeEntitlementState({ entitlementsResolved: true, hasPaid: true, plan: 'starter_trial' }) === 'ready' && !access.ADS_SUBSCRIBER_PLANS.includes('starter_trial') && access.adsAccessReason({ plan: 'starter_trial', ads_access_until: null }, 'someone@example.com') === 'none')
checa("4f. FATO \"included in your plan\": todo plano de ADS_SUBSCRIBER_PLANS dá adsAccessReason === 'subscriber'", access.ADS_SUBSCRIBER_PLANS.length >= 5 && access.ADS_SUBSCRIBER_PLANS.every((p) => access.adsAccessReason({ plan: p, ads_access_until: null }, 'someone@example.com') === 'subscriber'))
checa('4g. pack avulso fica fora: packPurchase lê ?pack= da URL no mount, e a success_url do pack (route.ts, só leitura) carrega pack=', PAGE.includes('const [packPurchase, setPackPurchase] = useState(false)') && PAGE.includes("setPackPurchase(new URLSearchParams(window.location.search).has('pack'))") && CHECKOUT.includes('/checkout/success?success=true&pack=starter&'))
checa('4h. Autopilot fica fora: o bloco vem DEPOIS do fecho do ternário do CTA, que começa em {isAutopilot ? (', (() => { const gate = PAGE.indexOf(GATE); const tern = PAGE.lastIndexOf(') : null}', gate); const auto = PAGE.indexOf('{isAutopilot ? ('); return gate > tern && tern > auto && auto > 0 })())
checa('4i. adsPassLive() é o interruptor único (NEXT_PUBLIC_ADS_PASS_LIVE=0 desliga) e está ligado em código hoje', offer.adsPassLive() === true && rd('lib/ads/offer.ts').includes("if (env === '0') return false"))

// ── 5. posição: abaixo do CTA principal, nunca no lugar dele ──
const iPrimary = PAGE.indexOf("{freshDraft ? 'Back to your script →' : 'Go to Generate Video'}")
const iGate = PAGE.indexOf(GATE)
const iMyVideos = PAGE.indexOf('href="/my-videos"')
checa('5a. CTA principal intacto ("Go to Generate Video" / "Back to your script →", 1 vez) e "View My Videos" intacto', iPrimary > 0 && count(PAGE, "'Go to Generate Video'") === 1 && count(PAGE, 'View My Videos') === 1)
checa('5b. o bloco vem DEPOIS do CTA principal e ANTES de "View My Videos"', iPrimary > 0 && iGate > iPrimary && iMyVideos > iGate)
checa('5c. copy sem Markdown e sem promessa que o código não cumpre (saved/unlimited/free ad/24 h)', !!block && !/\*\*|__|\]\(|saved|unlimited|free ad|24 h|within 24/i.test(block))

// ── 6. medição: impressão no evento que já existia (ads_block) e clique próprio ──
const readyStart = PAGE.indexOf("void trackEvent('checkout_success_entitlement_ready', {")
const readyBlock = PAGE.slice(readyStart, PAGE.indexOf('})', readyStart))
checa('6a. checkout_success_entitlement_ready carrega ads_block: adsBlockShown e adsBlockShown entra nas dependências', readyStart > 0 && readyBlock.includes('ads_block: adsBlockShown,') && PAGE.includes('}, [selfServeReady, adsBlockShown])'))
checa('6b. nenhum evento NOVO de impressão (só o clique é novo): checkout_success_ads_* aparece 1 vez e é o clique', count(PAGE, "trackEvent('checkout_success_ads_") === 1 && count(PAGE, "trackEvent('checkout_success_ads_clicked', { version: CHECKOUT_SUCCESS_ADS_VERSION, plan: accountPlan })") === 1)
checa('6c. o evento canônico de visita continua exatamente 1 vez', count(PAGE, "trackEvent('checkout_success_viewed'") === 1)
checa("6d. a janela de 260 chars após 'checkout_success_entitlement_ready' segue sem session_id/email/url/price/amount/credits (contrato do guardião irmão)", (() => { const s = PAGE.indexOf("'checkout_success_entitlement_ready'"); const w = PAGE.slice(s, s + 260); return ['session_id', 'stripe_session_id', 'email', 'url', 'price', 'amount', 'credits'].every((f) => !w.includes(f)) })())

// ── 7. cada frase da copy é fato que o código cumpre (linhas lidas, nunca presumidas) ──
checa('7a. "Paste your website link": AdsWizardClient tem <input type="url"> "Start from your website or product link"', WIZARD.includes('<input type="url" inputMode="url" placeholder="https://yourshop.com/product"') && WIZARD.includes('Start from your website or product link'))
checa('7b. "write one sentence": o assistente aceita texto curto ("one or two sentences") e o modo IA-faz existe (ads_auto_started)', WIZARD.includes('Write one or two sentences: what you sell, the offer, and how customers reach you.') && rd('lib/ads/events.ts').includes("'ads_auto_started'"))
checa('7c. "writes": app/api/ads/script existe e lib/ads/models.ts diz que é ele quem escreve a prosa', rd('app/api/ads/script/route.ts').length > 0 && rd('lib/ads/models.ts').includes('Quem escreve a prosa é\n// /api/ads/script'))
checa('7d. "narrates and cuts a vertical ad": render manda user_voiceover_url e aspect padrão 9:16 ao /api/compose', RENDER.includes('user_voiceover_url: voiceUrl,') && RENDER.includes("aspect: input.aspect ?? '9:16',"))
checa('7e. "captions": ligadas por padrão — só saem com captions:false (render e compose)', RENDER.includes('...(input.captions === false ? { captions: false } : {}),') && COMPOSE.includes('if (body.captions === false) {'))
checa('7f. "music": o compose escolhe trilha (selectMusicForScript) no caminho clássico do Kineo 1', count(COMPOSE, 'selectMusicForScript({') >= 1)
checa('7g. "your logo": o cartão final com o logo é pinado à lista de clipes (cardUrl: card.url) e todo modelo exige logo', RENDER.includes('cardUrl: card.url') && models.ADS_MODELS.every((m) => m.inputs.logo === 'required'))

// ── 8. mutantes em memória: o guardião pega o que promete pegar ──
const audit = (src) => {
  const p = []
  const b = blockOf(src)
  if (!b) p.push('jsx-gate')
  else if (TYPED.test(b)) p.push('typed')
  if (count(src, DERIV) !== 1 || count(src, COPY) !== 1) p.push('derivation')
  if (count(src, COND) !== 1) p.push('condition')
  const h = src.match(HREF_LINE)
  const params = h ? (h[1].split('?')[1] ?? '').split('&') : []
  if (!h || !h[1].startsWith('/ads/new?') || !params.includes('utm_campaign=sprint0927')) p.push('href')
  if (!src.includes("import { ADS_SUBSCRIBER_PLANS } from '@/lib/ads/access'") || !src.includes("import { KINEO1_35S_CREDITS, adsPassLive } from '@/lib/ads/offer'")) p.push('imports')
  const rs = src.indexOf("void trackEvent('checkout_success_entitlement_ready', {")
  if (rs < 0 || !src.slice(rs, src.indexOf('})', rs)).includes('ads_block: adsBlockShown,')) p.push('impression')
  return p
}
checa('8a. o auditor aprova o arquivo real', audit(PAGE).length === 0)
const mutCost = PAGE.replace('{KINEO1_35S_CREDITS} credits from the same balance.', '3 credits from the same balance.')
checa('8b. MUTANTE custo digitado ("3 credits") fica vermelho', mutCost !== PAGE && audit(mutCost).includes('typed') && audit(mutCost).includes('derivation'))
const mut35 = PAGE.replace('A {ADS_SHORTEST_SECONDS}-second ad', 'A 35-second ad')
checa('8c. MUTANTE "35" digitado fica vermelho', mut35 !== PAGE && audit(mut35).includes('typed'))
const mutPlan = PAGE.replace(COND, 'const adsBlockShown = selfServeReady && adsPassLive()')
checa('8d. MUTANTE bloco sem a condição de plano (ADS_SUBSCRIBER_PLANS) fica vermelho', mutPlan !== PAGE && audit(mutPlan).includes('condition'))
const mutLive = PAGE.replace(' && adsPassLive()', '')
checa('8e. MUTANTE bloco sem o interruptor adsPassLive() fica vermelho', mutLive !== PAGE && audit(mutLive).includes('condition'))
const mutPack = PAGE.replace(' && !packPurchase', '')
checa('8f. MUTANTE bloco sem a exclusão do pack avulso fica vermelho', mutPack !== PAGE && audit(mutPack).includes('condition'))
const mutGate = PAGE.replace(GATE, GATE.replace('{adsBlockShown && (', '{selfServeReady && ('))
checa('8g. MUTANTE JSX atrás de selfServeReady em vez de adsBlockShown fica vermelho', mutGate !== PAGE && audit(mutGate).includes('jsx-gate'))
const mutHref = PAGE.replace('&utm_campaign=sprint0927', '')
checa('8h. MUTANTE href sem utm_campaign=sprint0927 fica vermelho', mutHref !== PAGE && audit(mutHref).includes('href'))
const mutImp = PAGE.replace('      ads_block: adsBlockShown,\n', '')
checa('8i. MUTANTE impressão sem ads_block fica vermelho', mutImp !== PAGE && audit(mutImp).includes('impression'))
const mutImport = PAGE.replace("import { ADS_SUBSCRIBER_PLANS } from '@/lib/ads/access'", "const ADS_SUBSCRIBER_PLANS = ['starter', 'creator', 'pro', 'studio']")
checa('8j. MUTANTE lista de planos redigitada na página (sem importar lib/ads/access) fica vermelho', mutImport !== PAGE && audit(mutImport).includes('imports'))

console.log(`test-sucesso-studio-ads-2026-09-27: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
