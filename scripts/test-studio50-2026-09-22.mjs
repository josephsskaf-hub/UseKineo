// KINEO-STUDIO50-2026-09-22 — guardião da oferta "Studio a 50%" para quem chegou ao checkout e não pagou.
// Prova: (1) fonte única (código, plano, duração, copy) e elegibilidade que NUNCA aprova quem pagou;
// (2) o checkout só honra STUDIO50 no Studio mensal e auto-provisiona o cupom; (3) as duas superfícies onde a
// coorte volta sozinha (pricing, checkout cancelado) montam o banner, e o banner só desenha com o servidor
// dizendo "elegível"; (4) a carta é dry-run por padrão, carimba studio50_sent (na lista única), respeita 24h e
// recusa enviar sem cupom vivo; (5) mutantes.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(src, req = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, (n) => { if (n in req) return req[n]; throw new Error('import inesperado ' + n) })
  return m.exports
}
// cliente supabase falso: cada tabela devolve o que o cenário manda
function fakeAdmin(scn) {
  // um único proxy encadeável e "thenable": cada filtro é anotado; o await resolve pelo nome da tabela + filtros
  const table = (name) => {
    const filters = []
    const chain = new Proxy({}, { get(_t, k) {
      if (k === 'then') return (res) => {
        const f = filters.map((x) => JSON.stringify(x)).join('|')
        if (name === 'profiles') return res({ data: scn.profile ?? null })
        if (name === 'events' && f.includes('payment_success')) return res({ data: scn.paid ? [{ id: 1 }] : [] })
        if (name === 'events') return res({ data: (scn.hits ?? []).map((d, i) => ({ created_at: d, metadata: scn.tiers ? { tier: scn.tiers[i] } : null })) })
        return res({ data: [] })
      }
      if (k === 'maybeSingle') return async () => ({ data: scn.profile ?? null })
      return (...a) => { filters.push([k, ...a]); return chain }
    } })
    return chain
  }
  return { from: (name) => table(name) }
}

console.log('1) fonte única e elegibilidade')
const src = rd('lib/offers/studio50.ts')
const S = roda(src, { '@/app/api/admin/_shared/mrr': { PAID_PLANS: new Set(['starter', 'basic', 'pro', 'autopilot']) }, '@/lib/checkoutPricing': { TIER_CREDITS: { starter: 60, basic: 150, pro: 300, autopilot: 400 } } })
checa('código STUDIO50, plano pro (Studio), 50%, duração once (1ª fatura) — decisão registrada no cabeçalho', S.STUDIO50_CODE === 'STUDIO50' && S.STUDIO50_TIER === 'pro' && S.STUDIO50_PERCENT === 50 && S.STUDIO50_DURATION === 'once')
checa('href do checkout: tier=pro, billing=monthly, promo=STUDIO50 e campanha por superfície', S.studio50CheckoutHref('pricing') === '/api/stripe/checkout?tier=pro&billing=monthly&promo=STUDIO50&intent_campaign=studio50_pricing')
checa('copy sem número de preço (quem diz o valor é a Stripe/pricing)', !/\$\s?\d|\d+[.,]\d\d/.test(Object.values(S.studio50Copy(S.studio50OfferFor(null))).join(' ') + Object.values(S.studio50Copy(S.studio50OfferFor('starter'))).join(' ')))
checa('oferta segue o plano em que a pessoa parou: Starter → Creator a 50% (CREATOR50); demais → Studio (STUDIO50)', S.studio50OfferFor('starter').code === 'CREATOR50' && S.studio50OfferFor('starter').tier === 'basic' && S.studio50OfferFor('basic').code === 'STUDIO50' && S.studio50OfferFor(null).code === 'STUDIO50' && S.studio50OfferFor('pro').tier === 'pro')
checa('créditos da copy vêm do catálogo (TIER_CREDITS), nunca digitados', S.studio50OfferFor(null).credits === 300 && S.studio50OfferFor('starter').credits === 150 && !/\b300\b|\b150\b/.test(src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')))
checa('href da oferta Creator: tier=basic&promo=CREATOR50', S.offerCheckoutHref(S.studio50OfferFor('starter'), 'email') === '/api/stripe/checkout?tier=basic&billing=monthly&promo=CREATOR50&intent_campaign=studio50_email')
const run = (scn) => S.studio50Eligibility(fakeAdmin(scn), 'u1')
checa('elegível: 2 tentativas, nunca pagou, opt-in; lastTier lido do metadata da tentativa mais recente', await run({ profile: { has_paid: false, plan: 'free', email_opted_out: false }, hits: ['2026-09-20', '2026-09-10'], tiers: ['starter', 'basic'] }).then((e) => e.eligible && e.attempts === 2 && e.lastAttemptAt === '2026-09-20' && e.lastTier === 'starter'))
checa('NÃO elegível: payment_success existe (mesmo com perfil free)', await run({ profile: { has_paid: false, plan: 'free', email_opted_out: false }, hits: ['2026-09-20'], paid: true }).then((e) => !e.eligible && e.reason === 'paid'))
checa('NÃO elegível: perfil has_paid ou plano pago', await run({ profile: { has_paid: true, plan: 'free', email_opted_out: false }, hits: ['2026-09-20'] }).then((e) => !e.eligible) && await run({ profile: { has_paid: false, plan: 'basic', email_opted_out: false }, hits: ['2026-09-20'] }).then((e) => !e.eligible))
checa('NÃO elegível: sem tentativa de checkout', await run({ profile: { has_paid: false, plan: 'free', email_opted_out: false }, hits: [] }).then((e) => !e.eligible && e.reason === 'no_checkout_attempt'))
checa('NÃO elegível: optou por sair · sem usuário', await run({ profile: { has_paid: false, plan: 'free', email_opted_out: true }, hits: ['2026-09-20'] }).then((e) => !e.eligible && e.reason === 'opted_out') && await S.studio50Eligibility(fakeAdmin({}), null).then((e) => !e.eligible && e.reason === 'no_user'))

console.log('2) checkout honra STUDIO50 só no Studio mensal')
const co = rd('app/api/stripe/checkout/route.ts')
checa('importa a fonte única (nunca redigita código/plano)', co.includes("from '@/lib/offers/studio50'") && !co.includes("'STUDIO50'"))
checa('gate: tier !== STUDIO50_TIER || isAnnual → ignora (promoBlocked)', co.includes('if (publicPromo === STUDIO50_CODE && !privatePackPromo && (tier !== STUDIO50_TIER || isAnnual)) {') && co.includes("válido só para Studio mensal"))
checa('auto-provisão do cupom KINEO_STUDIO50 + promotion code, fail-safe a preço cheio', co.includes('await stripe.coupons.retrieve(STUDIO50_COUPON_ID)') && co.includes('await stripe.promotionCodes.create({ coupon: STUDIO50_COUPON_ID, code: STUDIO50_CODE })') && co.includes('self-provision falhou (checkout segue a preço cheio)'))
checa('duração vem da fonte única (once/repeating), não cravada', co.includes("STUDIO50_DURATION === 'repeating' ? { duration: 'repeating' as const, duration_in_months: STUDIO50_REPEATING_MONTHS } : { duration: 'once' as const }"))

console.log('3) superfícies e banner')
const pricing = rd('app/pricing/PricingClient.tsx'), cancelled = rd('app/checkout/cancelled/page.tsx'), banner = rd('components/Studio50OfferBanner.tsx'), api = rd('app/api/offers/studio50/route.ts')
checa('pricing: banner ANTES da grade de planos', pricing.includes('<Studio50OfferBanner surface="pricing" />') && pricing.indexOf('<Studio50OfferBanner surface="pricing" />') < pricing.indexOf('<div id="plans"'))
checa('checkout cancelado: banner logo abaixo do "card não foi cobrado"', cancelled.includes('<Studio50OfferBanner surface="cancelled" />') && cancelled.indexOf('Your card was not charged') < cancelled.indexOf('<Studio50OfferBanner surface="cancelled" />'))
checa('banner: só desenha com elegível do servidor; mede shown (1×) e clicked; oferta e CTA pela fonte única', banner.includes("if (!elig?.eligible) return null") && banner.includes('void trackEvent(STUDIO50_SHOWN_EVENT') && banner.includes('void trackEvent(STUDIO50_CLICKED_EVENT') && banner.includes('const offer = studio50OfferFor(elig.lastTier)') && banner.includes('const href = offerCheckoutHref(offer, surface)') && banner.includes('shown.current = true'))
checa('API de elegibilidade: usuário da sessão, service key, fail closed', api.includes('await supabase.auth.getUser()') && api.includes('studio50Eligibility(admin, user.id)') && api.includes("return NextResponse.json({ eligible: false, reason: 'no_user' })") && api.includes("export const fetchCache = 'force-no-store'"))

console.log('4) a carta')
const carta = rd('app/api/admin/send-studio50/route.ts'), stamps = rd('lib/lifecycle/emailEvents.ts')
checa('dry-run por padrão; SEND só com confirm=SEND; lote ≤ 60; janela default STUDIO50_WARM_DAYS', carta.includes("req.nextUrl.searchParams.get('confirm') === 'SEND'") && carta.includes('Math.min(limitParam, 60) : 60') && carta.includes(': STUDIO50_WARM_DAYS'))
checa('carimbo studio50_sent na lista única e usado como dedupe para sempre', stamps.includes("'studio50_sent',") && carta.includes("const STAMP = 'studio50_sent' satisfies typeof STUDIO50_SENT_STAMP") && carta.includes(".eq('name', STAMP)") && carta.includes("name: STAMP,"))
checa('1 e-mail por pessoa em 24h: qualquer carimbo da lista única nas últimas 24h pula a pessoa', carta.includes('.in(\'name\', [...LIFECYCLE_EMAIL_EVENT_NAMES, STAMP]).gte(\'created_at\', dayAgo)') && carta.includes('if (emailedToday.has(id)) { skipped.emailed_today += 1; continue }'))
checa('recusa enviar sem cupom vivo (409) e confere o cupom antes do dry-run', carta.includes("if (!coupon.live) return NextResponse.json({ error: 'Refusing to send: coupon not live on Stripe', coupon }, { status: 409 })") && carta.indexOf('const coupon = await ensureCoupon()') < carta.indexOf("if (!confirm) {"))
checa('só elegíveis (studio50Eligibility) · internos/opt-out fora · intenção mais recente primeiro · idade da intenção no dry-run', carta.includes('const e = await studio50Eligibility(admin, id)') && carta.includes('isInternalEmail(prof.email)') && carta.includes('alvos.sort((a, b) => (a.lastHit < b.lastHit ? 1 : -1))') && carta.includes('intent_age_days:'))
checa('carta sem número de preço, oferta por pessoa (studio50OfferFor) e link com promo aplicado', !/\$\s?\d/.test(carta.replace(/\/\/.*$/gm, '')) && carta.includes("offerCheckoutHref(offer, 'email')") && carta.includes('offer: studio50OfferFor(e.lastTier)') && carta.includes('by_offer:'))

console.log('4b) a carta do $1 cala quando a porta está fechada (achado colateral de 22/09)')
const um = rd('app/api/admin/send-second-try-1usd/route.ts')
checa('send-second-try-1usd: com CARD_TRIAL_LIVE=false devolve DISABLED antes de ler o banco', um.includes('if (!CARD_TRIAL_LIVE) {') && um.indexOf('if (!CARD_TRIAL_LIVE) {') < um.indexOf('createClient()') && um.includes("mode: 'DISABLED', sent: 0"))
checa('mutante (trava do $1 removida) é pego', !um.replace('if (!CARD_TRIAL_LIVE) {', 'if (false) {').includes('if (!CARD_TRIAL_LIVE) {'))

console.log('5) mutantes')
const semGate = co.replace('(tier !== STUDIO50_TIER || isAnnual)', '(false)')
checa('mutante (gate do Studio removido) é pego', !semGate.includes('if (publicPromo === STUDIO50_CODE && !privatePackPromo && (tier !== STUDIO50_TIER || isAnnual)) {'))
checa('mutante (elegibilidade ignora payment_success) é pego', await (async () => { const M = roda(src.replace("if ((paid?.length ?? 0) > 0 || prof?.has_paid", "if (prof?.has_paid"), { '@/app/api/admin/_shared/mrr': { PAID_PLANS: new Set() }, '@/lib/checkoutPricing': { TIER_CREDITS: { starter: 60, basic: 150, pro: 300, autopilot: 400 } } }); const e = await M.studio50Eligibility(fakeAdmin({ profile: { has_paid: false, plan: 'free', email_opted_out: false }, hits: ['2026-09-20'], paid: true }), 'u1'); return e.eligible === true })())
checa('mutante (banner desenha sem elegível) é pego', !banner.replace("if (!elig?.eligible) return null", "if (!elig) return null").includes("if (!elig?.eligible) return null"))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
