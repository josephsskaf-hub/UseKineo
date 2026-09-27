// KINEO-COPY-HONESTA-C-2026-09-27 — guardião do item T (ciclo C da sprint de 16 h, dom 27/09, alvo MRR): três linhas de
// copy que passam a dizer só o que o código cumpre.
//   (a) /pricing "Compare plans" ganha a linha "Studio Ads (business video ads)"; cada célula nasce de ADS_SUBSCRIBER_PLANS
//       (lib/ads/access.ts adsAccessReason → 'subscriber'; lib/ads/serverAccess.ts adsGate → 'ok' com o passe ligado em
//       lib/ads/offer.ts ADS_PASS_LIVE_IN_CODE). Nenhuma célula digitada por coluna.
//   (b) TrialActiveBanner: "Creator trial" = 0 — o CTA logo abaixo diz "Continue on Starter after the trial" desde o V3 e o
//       trial de hoje é grátis, sem cartão (lib/reverseTrial.ts TRIAL_CREDIT_CAP "SEM tocar em Stripe"; CARD_TRIAL_LIVE = false).
//   (c) /ads porta Starter: o gnote "You sign in (or create your account) first" só para quem NÃO está logado
//       (viewer.signedIn); o checkout GET só manda anônimo para /login. A DoorCta do passe fica como estava.
// Cada prova trava o literal antigo (= 0) e prova o novo por derivação; mutantes em memória no bloco 4. Só readFileSync
// (sem alias @/, sem rede); ADS_SUBSCRIBER_PLANS real vem pelo loader offline.
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

const PRICING = rd('app/pricing/PricingClient.tsx')
const BANNER = rd('components/TrialActiveBanner.tsx')
const DOOR = rd('app/ads/page.tsx')
const ACCESS = rd('lib/ads/access.ts')
const SERVER_ACCESS = rd('lib/ads/serverAccess.ts')
const OFFER = rd('lib/ads/offer.ts') // só leitura (pinado byte a byte por test-credit-minutes-ui)
const REVERSE = rd('lib/reverseTrial.ts')
const CP = rd('lib/checkoutPricing.ts') // só leitura
const CHECKOUT = rd('app/api/stripe/checkout/route.ts') // só leitura

// ── (a) /pricing: linha Studio Ads derivada de ADS_SUBSCRIBER_PLANS ──────────────────────────────────────────────────
const ROW_LABEL = "label: 'Studio Ads (business video ads)',"
const HELPER_RE = /const adsCell = \(plan: string\): string => \((.+)\)\n/
const TABLE_START = PRICING.indexOf('Compare plans')
const TABLE_END = PRICING.indexOf('].map((row) => (', TABLE_START)
const tabela = PRICING.slice(TABLE_START, TABLE_END)

function provasPricing(src, tab) {
  const m = src.match(HELPER_RE)
  const helperExpr = m ? m[1] : ''
  const rowIdx = tab.indexOf(ROW_LABEL)
  const charsIdx = tab.indexOf("label: '🎭 Saved characters (same face every video)',")
  const creditsIdx = tab.indexOf("label: 'Monthly credits',")
  const rowBlock = rowIdx >= 0 ? tab.slice(rowIdx, tab.indexOf('},', rowIdx)) : ''
  return {
    importOnce: count(src, "import { ADS_SUBSCRIBER_PLANS } from '@/lib/ads/access'") === 1 && count(src, "from '@/lib/ads/offer'") === 0,
    helperDerives: /ADS_SUBSCRIBER_PLANS\.includes\(plan\)/.test(helperExpr),
    helperExpr,
    rowOnce: count(tab, ROW_LABEL) === 1,
    rowAfterCharsBeforeCredits: charsIdx >= 0 && rowIdx > charsIdx && creditsIdx > rowIdx,
    cellsDerived: ["free: adsCell('free'),", "starter: adsCell('starter'),", "basic: adsCell('basic'),", "pro: adsCell('pro'),"].every((c) => count(rowBlock, c) === 1),
    noTypedIncludedInRow: count(rowBlock, 'included') === 0 && count(rowBlock, '✅') === 0 && count(rowBlock, '—') === 0,
    includedLiteralOnlyInHelper: count(src, "'✅ included'") === 1,
  }
}
const pa = provasPricing(PRICING, tabela)
checa('1a. PricingClient importa ADS_SUBSCRIBER_PLANS de lib/ads/access (1x) e NÃO importa lib/ads/offer.ts (pinado)', pa.importOnce)
checa('1b. adsCell deriva de ADS_SUBSCRIBER_PLANS.includes(plan) — nada decidido por coluna', pa.helperDerives)
checa('1c. a linha "Studio Ads (business video ads)" existe uma vez na tabela Compare plans', pa.rowOnce)
checa('1d. a linha entra depois de "Saved characters" e antes de "Monthly credits"', pa.rowAfterCharsBeforeCredits)
checa('1e. as 4 células chamam adsCell(free|starter|basic|pro); nenhuma digitada (sem check/traço/included na linha)', pa.cellsDerived && pa.noTypedIncludedInRow)
checa("1f. o literal '✅ included' existe só no helper (1x no arquivo)", pa.includedLiteralOnlyInHelper)
checa('1g. lib/ads/access.ts é puro: sem server-only e sem supabase (pode entrar no client component)', count(ACCESS, 'server-only') === 0 && count(ACCESS, 'supabase') === 0)

// derivação executada: o helper real com o array real
const access = load('lib/ads/access.ts')
const PLANS = access.ADS_SUBSCRIBER_PLANS
const cellFn = new Function('ADS_SUBSCRIBER_PLANS', 'plan', 'return (' + pa.helperExpr + ')')
const cell = (plans, plan) => cellFn(plans, plan)
checa('1h. ADS_SUBSCRIBER_PLANS real contém starter, basic e pro (as 3 colunas pagas) e não contém free', ['starter', 'basic', 'pro'].every((p) => PLANS.includes(p)) && !PLANS.includes('free'))
checa("1i. célula real: starter/basic/pro = '✅ included'", ['starter', 'basic', 'pro'].every((p) => cell(PLANS, p) === '✅ included'))
checa("1j. célula real: free = '—' e um plano *_trial = '—' (trial e free não entram)", cell(PLANS, 'free') === '—' && cell(PLANS, 'creator_trial') === '—')
checa("1k. adsAccessReason real: plan 'starter' → 'subscriber'; 'free' → 'none'; 'creator_trial' → 'none'", access.adsAccessReason({ plan: 'starter', ads_access_until: null }, 'x@example.com') === 'subscriber' && access.adsAccessReason({ plan: 'free', ads_access_until: null }, 'x@example.com') === 'none' && access.adsAccessReason({ plan: 'creator_trial', ads_access_until: null }, 'x@example.com') === 'none')
// o fato que "included" cumpre: assinante passa no portão e o passe está ligado em código
checa("1l. lib/ads/access.ts: if (ADS_SUBSCRIBER_PLANS.includes(plan)) return 'subscriber'", count(ACCESS, "if (ADS_SUBSCRIBER_PLANS.includes(plan)) return 'subscriber'") === 1)
checa("1m. lib/ads/serverAccess.ts adsGate: só 'none' vira no_access; ligado, o resto é 'ok'", count(SERVER_ACCESS, "if (reason === 'none') return 'no_access'") === 1 && count(SERVER_ACCESS, "if (!adsPassLive() && reason !== 'internal') return 'closed'") === 1 && count(SERVER_ACCESS, "return 'ok'") === 1)
checa('1n. lib/ads/offer.ts: ADS_PASS_LIVE_IN_CODE = true (se desligar, esta linha da tabela mente e este guardião fica vermelho de propósito)', count(OFFER, 'export const ADS_PASS_LIVE_IN_CODE = true') === 1)
checa('1o. nenhuma outra célula mudou: linhas Saved characters e Monthly credits intactas', /pro: charCell\(characterLimits\?\.pro\),\n\s*\},\n\s*\{\n\s*\/\/ KINEO-COPY-HONESTA-C-2026-09-27[^\n]*\n\s*label: 'Studio Ads \(business video ads\)',/.test(tabela) && /label: 'Monthly credits',\n\s*free: ft\(OFFER, '0', `\$\{TRIAL_GRANT_CREDITS_COPY\} free, once`\),\n\s*starter: String\(TIER_CREDITS\.starter\),/.test(tabela))

// ── (b) TrialActiveBanner: "Creator trial" = 0 ────────────────────────────────────────────────────────────────────────
function provasBanner(src) {
  return {
    creatorZero: count(src, 'Creator trial') === 0,
    ariaFree: count(src, 'aria-label="Free trial status"') === 1,
    headlineFree: count(src, "You&apos;re on your free trial — ends {timeLeft}") === 1,
    ctaStarter: count(src, '`Continue on ${primaryTierName} after the trial`') === 1,
  }
}
const pb = provasBanner(BANNER)
checa('2a. "Creator trial" = 0 no banner (literal antigo travado)', pb.creatorZero)
checa('2b. aria-label="Free trial status" (1x)', pb.ariaFree)
checa("2c. manchete \"You're on your free trial — ends {timeLeft}\" (1x)", pb.headlineFree)
checa('2d. o CTA logo abaixo continua "Continue on ${primaryTierName} after the trial" (Starter primeiro, V3)', pb.ctaStarter)
checa('2e. fato: o trial é grátis — lib/reverseTrial.ts concede TRIAL_CREDIT_CAP no cadastro "SEM tocar em Stripe"', /export const TRIAL_CREDIT_CAP = \d+/.test(REVERSE) && count(REVERSE, 'export const TRIAL_GRANT_CREDITS = TRIAL_CREDIT_CAP') === 1 && count(REVERSE, 'SEM tocar em Stripe') >= 1)
checa('2f. fato: sem cartão — lib/checkoutPricing.ts CARD_TRIAL_LIVE = false e o próprio banner diz "No card required."', count(CP, 'export const CARD_TRIAL_LIVE = false') === 1 && count(BANNER, 'No card required.') >= 1)

// ── (c) /ads porta Starter: gnote condicionado a viewer.signedIn ─────────────────────────────────────────────────────
const OLD_NOTE = '<p className="gnote">Secure Stripe checkout. You sign in (or create your account) first.</p>'
const NEW_NOTE = "<p className=\"gnote\">{viewer.signedIn ? 'Secure Stripe checkout.' : 'Secure Stripe checkout. You sign in (or create your account) first.'}</p>"
function provasDoor(src) {
  const a = src.indexOf('data-kineo="ads-door-plan"')
  const b = src.indexOf('<div className="cost ads-price">', a)
  const plano = a >= 0 && b > a ? src.slice(a, b) : ''
  const doorCta = src.slice(src.indexOf('function DoorCta('), src.indexOf('export default async function StudioAdsPage'))
  return {
    oldZeroInPlan: plano.length > 0 && count(plano, OLD_NOTE) === 0,
    newOnceInPlan: count(plano, NEW_NOTE) === 1,
    newOnceInFile: count(src, NEW_NOTE) === 1,
    passUntouched: count(doorCta, OLD_NOTE) === 1 && count(src, '<div className="ads-cta"><DoorCta cta={cta} placement="price" price={price} /></div>') === 1 && count(src, '<DoorCta cta={cta} placement="hero" price={price} />') === 1 && count(src, '<DoorCta cta={cta} placement="end" price={price} />') === 1,
    signedInIsBoolean: count(src, "type Viewer = { signedIn: boolean; gate: 'ok' | 'no_access' | 'closed' | null; internal: boolean }") === 1 && count(src, 'const viewer = await withTimeout(readViewer(), ANONYMOUS)') === 1,
  }
}
const pc = provasDoor(DOOR)
checa('3a. porta Starter: o gnote incondicional antigo = 0 dentro do bloco ads-door-plan (literal travado)', pc.oldZeroInPlan)
checa('3b. porta Starter: gnote condicionado — logado "Secure Stripe checkout."; anônimo a frase inteira (1x no bloco, 1x no arquivo)', pc.newOnceInPlan && pc.newOnceInFile)
checa('3c. viewer.signedIn é boolean lido no servidor (readViewer/getUser), não palpite do cliente', pc.signedInIsBoolean)
checa('3d. o passe fica como estava: DoorCta e as 3 chamadas (hero/price/end) intactas', pc.passUntouched)
checa('3e. fato: o checkout GET só manda para /login quem não tem sessão (redirect com reason=checkout)', count(CHECKOUT, '/login?reason=checkout&redirect=') >= 1)
checa('3f. a porta do plano continua condicionada a planOffer (gate !== ok) — o logado sem acesso VÊ este gnote', count(DOOR, "const planOffer = live && viewer.gate !== 'ok'") === 1 && count(DOOR, '{planOffer ? (') === 1)

// ── 4. mutantes em memória ───────────────────────────────────────────────────────────────────────────────────────────
// M1: array sem 'starter' → a célula do Starter muda para '—' (a copy segue o código, não o contrário)
checa("M1. array sem 'starter' → adsCell('starter') = '—' (a célula muda com o array)", cell(PLANS.filter((p) => p !== 'starter'), 'starter') === '—' && cell(PLANS.filter((p) => p !== 'starter'), 'basic') === '✅ included')
// M2: array com 'free' → a coluna Free viraria '✅ included' (prova que a célula Free também é derivada)
checa("M2. array com 'free' → adsCell('free') = '✅ included' (a coluna Free não é digitada)", cell([...PLANS, 'free'], 'free') === '✅ included')
// M3: célula do Starter digitada à mão na linha → 1e cai
const m3 = provasPricing(PRICING, tabela.replace("starter: adsCell('starter'),", "starter: '✅ included',"))
checa('M3. linha com starter digitado à mão ("✅ included") reprova em 1e', !(m3.cellsDerived && m3.noTypedIncludedInRow))
// M4: helper sem derivação (sempre '✅ included') → 1b cai
const m4 = provasPricing(PRICING.replace(HELPER_RE, "const adsCell = (plan: string): string => ('✅ included')\n"), tabela)
checa('M4. helper que devolve "✅ included" para todo plano reprova em 1b', !m4.helperDerives)
// M5: banner com "Creator trial" de volta → 2a cai
const m5 = provasBanner(BANNER.replace("You&apos;re on your free trial — ends {timeLeft}", "You&apos;re on the Creator trial — ends {timeLeft}"))
checa('M5. banner com "Creator trial" de volta reprova em 2a e 2c', !m5.creatorZero && !m5.headlineFree)
// M6: porta Starter com o gnote incondicional de volta → 3a/3b caem
const m6 = provasDoor(DOOR.replace(NEW_NOTE, OLD_NOTE))
checa('M6. porta Starter com o gnote incondicional de volta reprova em 3a e 3b', !m6.oldZeroInPlan && !m6.newOnceInPlan)
// M7: condicional invertida (logado vê a frase inteira) → 3b cai
const m7 = provasDoor(DOOR.replace(NEW_NOTE, "<p className=\"gnote\">{viewer.signedIn ? 'Secure Stripe checkout. You sign in (or create your account) first.' : 'Secure Stripe checkout.'}</p>"))
checa('M7. condicional invertida reprova em 3b', !m7.newOnceInPlan)

console.log(`\ntest-copy-honesta-c-2026-09-27: ${ok} ok, ${falhas.length} falhas`)
if (falhas.length) process.exit(1)
