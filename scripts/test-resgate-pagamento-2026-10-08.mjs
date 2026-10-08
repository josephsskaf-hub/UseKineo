#!/usr/bin/env node
// ═══ GUARDIÃO — KINEO-RESGATE-PAGAMENTO-2026-10-08 ═══════════════════════════════════════════════════════════════════
//
// O que ele protege, em uma frase: a carta que fala com quem abriu o pagamento e não pagou
// (app/api/admin/send-checkout-hot-nudge) não pode voltar a prometer uma porta morta, e a oferta de boas-vindas
// (WELCOME20) só sai para quem tem direito — sem acumular desconto, com o código conferido na Stripe, num clique de volta
// ao MESMO plano — e cada pessoa que cai fora deixa uma linha com o motivo, só no envio de verdade.
//
// COMO: a rota REAL é transpilada e EXECUTADA (Stripe falsa, banco em memória, Resend capturado), com a verificação REAL
// do WELCOME20 (lib/stripe/guestCheckout.ts + lib/growth/publicPromoTruth.ts compilados de verdade). As funções puras
// rodam contra tabelas-verdade. No fim, mutantes em memória provam que as travas mordem (e que cada mutação aplicou).
//
// Estilo readFileSync, sem import com alias `@/` (memória `guardioes-com-alias-nao-rodam`). CRLF normalizado na
// leitura (memória `guardiao-crlf-falso-vermelho`). check(nome, condição) — nesta ordem, com `=== true`.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import * as nodeCrypto from 'node:crypto'
import { compileOffline, memoryDb } from './test-support/truncamento-dedupe-offline.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const lf = (s) => s.replace(/\r\n/g, '\n')
const ler = (rel) => lf(readFileSync(join(raiz, rel), 'utf8'))

const ROTA_REL = 'app/api/admin/send-checkout-hot-nudge/route.ts'
const ROTA_CRU = ler(ROTA_REL)
// O interruptor da oferta é decisão do fundador: os cenários FORÇAM o valor de que precisam (como o guardião da compra
// sem login), para que desligá-lo não deixe este guardião vermelho nem o ligue verde por acaso.
const INTERRUPTOR = /^export const HOT_NUDGE_WELCOME20_LIVE = (?:true|false)$/m
const ROTA = ROTA_CRU.replace(INTERRUPTOR, 'export const HOT_NUDGE_WELCOME20_LIVE = true')
const ROTA_DESLIGADA = ROTA_CRU.replace(INTERRUPTOR, 'export const HOT_NUDGE_WELCOME20_LIVE = false')

let ok = 0
const falhas = []
function check(nome, condicao) {
  if (condicao === true) { ok++; return }
  falhas.push(nome)
}
check('0.1 o interruptor foi achado e os dois estados foram montados',
  INTERRUPTOR.test(ROTA_CRU) && ROTA !== ROTA_DESLIGADA && ROTA.includes('HOT_NUDGE_WELCOME20_LIVE = true') && ROTA_DESLIGADA.includes('HOT_NUDGE_WELCOME20_LIVE = false'))

// ── os módulos de verdade (os puros rodam crus; o do servidor com os vizinhos que a oferta não usa dublados) ──────
const promoTruth = compileOffline(ler('lib/growth/publicPromoTruth.ts'))
const growthGuest = compileOffline(ler('lib/growth/guestCheckout.ts'))
const stripeGuest = compileOffline(ler('lib/stripe/guestCheckout.ts'), {
  'node:crypto': nodeCrypto,
  '@/lib/growth/guestCheckout': growthGuest,
  '@/lib/growth/publicPromoTruth': promoTruth,
  '@/lib/settlementCurrency': {},
  '@/lib/affiliateAttribution': {},
  '@/lib/email/quota': {},
  '@/lib/auth/guestAccess': {},
})
const readAllMod = compileOffline(ler('lib/supabase/readAll.ts'), { '../serverEvents': { writeServerEvent: async () => true } })

// ── relógio, Stripe falsa e cenário ────────────────────────────────────────────────────────────────────────────────
const NOW = Date.parse('2026-10-08T15:00:00.000Z')
class Clock extends Date { static now() { return NOW } }
const minAtras = (m) => new Date(NOW - m * 60_000).toISOString()
const LIVE = (sid) => `https://checkout.stripe.com/c/pay/${sid}#segredo`
const SITE = 'https://www.usekineo.com'
const LINK_CREATOR = `${SITE}/api/stripe/checkout?tier=basic&billing=monthly&promo=WELCOME20&intent_campaign=checkout_hot_nudge_welcome20&utm_source=lifecycle&utm_medium=email&utm_campaign=checkout_hot_nudge`

const WELCOME20_PC = {
  id: 'promo_w20', code: 'WELCOME20', active: true, expires_at: null, max_redemptions: null, times_redeemed: 3,
  restrictions: { first_time_transaction: false, minimum_amount: null, minimum_amount_currency: null, currency_options: {} },
  customer: null, coupon: 'KINEO_WELCOME20',
}
const WELCOME20_COUPON = { id: 'KINEO_WELCOME20', valid: true, percent_off: 20, amount_off: null, duration: 'once', redeem_by: null, currency_options: {}, applies_to: undefined }

function sessao(sid, over = {}, md = {}) {
  return {
    id: sid, status: 'open', payment_status: 'unpaid', url: LIVE(sid), expires_at: Math.floor(NOW / 1000) + 20 * 3600,
    mode: 'subscription',
    metadata: { tier: 'basic', billing: 'monthly', checkout_origin: 'standard', ...md },
    total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 0 },
    ...over,
  }
}

// Cada pessoa: [user_id, has_paid, opt-out, sessão Stripe (ou null = Stripe não acha), metadata do checkout_started]
const PESSOAS = [
  ['u_creator', false, false, sessao('cs_creator'), { tier: 'basic' }],
  ['u_studio', false, false, sessao('cs_studio', {}, { tier: 'pro' }), { tier: 'pro' }],
  ['u_starter', false, false, sessao('cs_starter', {}, { tier: 'starter' }), { tier: 'starter' }],
  // desconto aplicado pelo link (?promo=): a Stripe mostra o valor E a sessão leva o carimbo
  ['u_desconto', false, false, sessao('cs_desconto', { total_details: { amount_discount: 598, amount_shipping: 0, amount_tax: 0 } }, { public_promo_state: 'applied' }), { tier: 'basic' }],
  // código DIGITADO na página da Stripe (allow_promotion_codes): só o valor diz que há desconto — nenhum carimbo nosso
  ['u_digitou', false, false, sessao('cs_digitou', { total_details: { amount_discount: 300, amount_shipping: 0, amount_tax: 0 } }), { tier: 'basic' }],
  ['u_anual', false, false, sessao('cs_anual', {}, { billing: 'annual' }), { tier: 'basic' }],
  ['u_nulo', null, false, sessao('cs_nulo'), { tier: 'basic' }],
  ['u_pagante', true, false, sessao('cs_pagante'), { tier: 'basic' }],
  ['u_optout', false, true, sessao('cs_optout'), { tier: 'basic' }],
  ['u_expirada', false, false, sessao('cs_expirada', { status: 'expired' }), { tier: 'basic' }],
  ['u_ja', false, false, sessao('cs_ja'), { tier: 'basic' }],
  ['u_sup', false, false, sessao('cs_sup'), { tier: 'basic' }],
]
const ENVIAM = ['u_creator', 'u_studio', 'u_starter', 'u_desconto', 'u_digitou', 'u_anual', 'u_nulo']

function montarBanco({ soConvidado = false } = {}) {
  const events = []
  const pessoas = soConvidado ? [] : PESSOAS
  for (const [id, , , s, md] of pessoas) {
    events.push({ id: 'cs-' + id, user_id: id, name: 'checkout_started', created_at: minAtras(60), metadata: { stripe_session_id: s.id, ip_country: 'US', ua_class: 'browser', ...md } })
  }
  // a compra sem login: sem user_id, com a sessão Stripe (o e-mail mora só na Stripe)
  events.push({ id: 'cs-guest', user_id: null, name: 'checkout_started', created_at: minAtras(50), metadata: { stripe_session_id: 'cs_guest', tier: 'pro', guest_checkout: 'true', ua_class: 'browser' } })
  if (!soConvidado) {
    // u_ja recebeu esta carta há 40 dias (o carimbo é vitalício)
    events.push({ id: 'old-sent', user_id: 'u_ja', name: 'checkout_hot_nudge_emailed_v1', created_at: new Date(NOW - 40 * 86_400_000).toISOString(), metadata: {} })
  }
  const profiles = pessoas.map(([id, hasPaid, optout]) => ({ id, email: `${id}@fixture.invalid`, email_opted_out: optout, has_paid: hasPaid }))
  return { events, profiles, videos: [] }
}

function stripeFalsa({ promo = 'ok' } = {}) {
  const lidas = []
  const promoConsultas = []
  const porId = Object.fromEntries(PESSOAS.map(([, , , s]) => [s.id, s]))
  return {
    lidas, promoConsultas,
    checkout: { sessions: { retrieve: async (id) => { lidas.push(id); if (!porId[id]) throw new Error('No such checkout.session'); return porId[id] } } },
    promotionCodes: { list: async ({ code }) => { promoConsultas.push(code); if (promo === 'throws') throw new Error('stripe fora do ar'); return { data: promo === 'missing' ? [] : [WELCOME20_PC] } } },
    coupons: { retrieve: async () => WELCOME20_COUPON },
  }
}

async function rodar({ fonte = ROTA, confirm = true, tables = montarBanco(), promo = 'ok', suprimidos = ['u_sup'] } = {}) {
  const db = memoryDb(tables, { maxCalls: 400 })
  const stripe = stripeFalsa({ promo })
  const enviados = []
  const rota = compileOffline(fonte, {
    '@/lib/supabase/readAll': readAllMod,
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { email: 'josephsskaf@gmail.com' } } }) } }) },
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/stripe': { stripe },
    '@/lib/emailSuppression': { emailFooterHtml: () => '<!--rodape-->', emailFooterText: () => '[rodape]', unsubscribeHeaders: (id) => ({ 'List-Unsubscribe': `<https://fixture.invalid/u/${id}>` }) },
    '@/lib/lifecycle/suppression': { loadLifecycleSuppression: async (_a, ids) => ({ isSuppressed: (id) => suprimidos.includes(id), suppressedCount: ids.filter((i) => suprimidos.includes(i)).length, degraded: false }) },
    '@/lib/momentumTopic': { pickMomentumTopic: () => null },
    '@/lib/growth/publicPromoTruth': promoTruth,
    '@/lib/growth/guestCheckout': growthGuest,
    '@/lib/stripe/guestCheckout': stripeGuest,
  }, {
    Date: Clock,
    process: { env: { RESEND_API_KEY: 'OFFLINE', STRIPE_SECRET_KEY: 'OFFLINE', NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'OFFLINE' } },
    fetch: async (url, init) => { enviados.push({ url, ...JSON.parse(init.body) }); return { ok: true, status: 200 } },
  })
  const res = await rota.GET({ headers: new Headers(), nextUrl: new URL(`https://fixture.invalid/${confirm ? '?confirm=SEND' : ''}`) })
  const gravados = db.writes.flatMap((w) => [].concat(w.row).map((row) => ({ table: w.table, ...row })))
  return { ...res, enviados, gravados, stripe, tables, rota }
}

const uuidDe = (name, key) => {
  const hex = nodeCrypto.createHash('sha256').update(`${name}:${key}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 1. AS FUNÇÕES PURAS — tabela-verdade (a fonte compilada inteira, sem rede)
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const puro = (await rodar({ confirm: false })).rota
const { decidirBoasVindas, linkBoasVindas, motivoDoPerfil, idDoPulo } = puro
const okBase = { ligada: true, hasPaid: false, welcome20Verificado: true, sessao: sessao('cs_x') }
const dec = (over = {}, sessaoOver = undefined) => decidirBoasVindas({ ...okBase, ...over, ...(sessaoOver !== undefined ? { sessao: sessaoOver } : {}) })
const motivo = (d) => (d.oferecer ? 'OFERECE' : d.motivo)

check('1.1 Creator mensal, nunca pagou, sem desconto, código conferido → oferece Creator',
  JSON.stringify(dec()) === JSON.stringify({ oferecer: true, tier: 'basic', plano: 'Creator' }))
check('1.2 Studio mensal → oferece Studio', JSON.stringify(dec({}, sessao('s', {}, { tier: 'pro' }))) === JSON.stringify({ oferecer: true, tier: 'pro', plano: 'Studio' }))
check('1.3 interruptor desligado → nada', motivo(dec({ ligada: false })) === 'oferta_desligada')
check('1.4 has_paid null NÃO recebe oferta (porta fechada quando não sei)', motivo(dec({ hasPaid: null })) === 'pagamento_nao_provado')
check('1.5 has_paid undefined NÃO recebe oferta', motivo(dec({ hasPaid: undefined })) === 'pagamento_nao_provado')
check('1.6 quem já pagou NÃO recebe oferta', motivo(dec({ hasPaid: true })) === 'pagamento_nao_provado')
check('1.7 código não conferido na Stripe → nada', motivo(dec({ welcome20Verificado: false })) === 'welcome20_nao_verificado')
check('1.8 sessão ausente → nada', motivo(dec({}, null)) === 'nao_e_assinatura')
check('1.9 compra avulsa (mode payment) → nada', motivo(dec({}, sessao('s', { mode: 'payment' }))) === 'nao_e_assinatura')
check('1.10 trial de cartão → nada', motivo(dec({}, sessao('s', {}, { card_trial: '1' }))) === 'trial_de_cartao')
check('1.11 volta ao vídeo (post_video_clean_export) → nada', motivo(dec({}, sessao('s', {}, { checkout_origin: 'post_video_clean_export' }))) === 'origem_especial')
check('1.12 origem ausente → nada (fecha)', motivo(dec({}, sessao('s', { metadata: { tier: 'basic', billing: 'monthly' } }))) === 'origem_especial')
check('1.13 anual → nada (o anual já tem o próprio desconto)', motivo(dec({}, sessao('s', {}, { billing: 'annual' }))) === 'periodo_fora_da_oferta')
check('1.14 período ausente → nada (fecha)', motivo(dec({}, sessao('s', { metadata: { tier: 'basic', checkout_origin: 'standard' } }))) === 'periodo_fora_da_oferta')
check('1.15 Starter → nada (o WELCOME20 é Creator/Studio)', motivo(dec({}, sessao('s', {}, { tier: 'starter' }))) === 'plano_fora_da_oferta')
check('1.16 Autopilot → nada', motivo(dec({}, sessao('s', {}, { tier: 'autopilot' }))) === 'plano_fora_da_oferta')
check('1.17 total_details ausente → nada (desconto desconhecido)', motivo(dec({}, sessao('s', { total_details: null }))) === 'desconto_desconhecido')
check('1.18 amount_discount não numérico → nada', motivo(dec({}, sessao('s', { total_details: { amount_discount: undefined } }))) === 'desconto_desconhecido')
check('1.19 página JÁ com desconto → nada (não acumula)', motivo(dec({}, sessao('s', { total_details: { amount_discount: 598 } }))) === 'ja_tem_desconto')
check('1.20 intro aplicado → nada', motivo(dec({}, sessao('s', {}, { intro: '1' }))) === 'ja_tem_desconto')
check('1.21 oferta pública já aplicada → nada', motivo(dec({}, sessao('s', {}, { public_promo_state: 'applied' }))) === 'ja_tem_desconto')
check('1.22 oferta privada (KINEO5) → nada', motivo(dec({}, sessao('s', {}, { offer: 'kineo5_pack_upgrade' }))) === 'ja_tem_desconto')

// o recorte é o MESMO do cobrador: a regra mora em guestWelcomePromoShapeOk, e o checkout recusa fora dela
const checkout = ler('app/api/stripe/checkout/route.ts')
check('1.23 a rota usa o recorte da fonte única (guestWelcomePromoShapeOk), não uma régua nova',
  /guestWelcomePromoShapeOk\(\{ tier, isAnnual: false \}\)/.test(ROTA) && /import \{ guestWelcomePromoShapeOk \} from '@\/lib\/growth\/guestCheckout'/.test(ROTA))
check('1.24 o cobrador ainda recusa o WELCOME20 fora de Creator/Studio mensal (o recorte que a carta copia)',
  /if \(publicPromo === 'WELCOME20' && !privatePackPromo && \(\(tier !== 'basic' && tier !== 'pro'\) \|\| isAnnual\)\)/.test(checkout))
check('1.25 Creator/Studio mensal passa no recorte real; Starter e anual não',
  growthGuest.guestWelcomePromoShapeOk({ tier: 'basic', isAnnual: false }) === true &&
  growthGuest.guestWelcomePromoShapeOk({ tier: 'pro', isAnnual: false }) === true &&
  growthGuest.guestWelcomePromoShapeOk({ tier: 'starter', isAnnual: false }) === false &&
  growthGuest.guestWelcomePromoShapeOk({ tier: 'basic', isAnnual: true }) === false)

// o link: um clique de volta ao MESMO plano, mensal, com o código que o checkout conhece
const link = new URL(linkBoasVindas('basic'))
const sanitizador = /function intentCampaignFrom\(req: NextRequest\): string \| undefined \{\n\s*const raw = [^\n]*\n\s*return \/(\^\[A-Za-z0-9\._~-\]\{1,100\}\$)\/\.test\(raw\)/.exec(checkout)
check('1.26 o link é o do checkout (logado ou não, a mesma porta)', link.origin === SITE && link.pathname === '/api/stripe/checkout')
check('1.27 o link leva o plano escolhido e o mensal', link.searchParams.get('tier') === 'basic' && link.searchParams.get('billing') === 'monthly' && new URL(linkBoasVindas('pro')).searchParams.get('tier') === 'pro')
check('1.28 o código do link é o WELCOME20 da fonte única', link.searchParams.get('promo') === promoTruth.WELCOME20_PROMOTION_CODE && promoTruth.promisedPublicPromoKind(link.searchParams.get('promo'), false) === 'welcome_first_month_20')
check('1.29 a campanha do clique passa no sanitizador do checkout (senão o clique não é medido)',
  Boolean(sanitizador) && new RegExp(sanitizador[1]).test(link.searchParams.get('intent_campaign') ?? '') && link.searchParams.get('intent_campaign') === 'checkout_hot_nudge_welcome20')
check('1.30 utm triplo de e-mail (a carta é o sinal de que a pessoa tem conta)',
  link.searchParams.get('utm_medium') === 'email' && link.searchParams.get('utm_source') === 'lifecycle' && link.searchParams.get('utm_campaign') === 'checkout_hot_nudge')
check('1.31 o link não cria trial nem volta-ao-vídeo nem recuperação', !['trial', 'return', 'recovery', 'intro'].some((k) => link.searchParams.has(k)))

// quem sai pelo perfil — a mesma ordem de sempre
check('1.32 perfil pagante → pagante', motivoDoPerfil({ has_paid: true, email_opted_out: true, email: 'a@b.co' }) === 'pagante')
check('1.33 opt-out → optout', motivoDoPerfil({ has_paid: false, email_opted_out: true, email: 'a@b.co' }) === 'optout')
check('1.34 sem e-mail → email_invalido_ou_interno', motivoDoPerfil({ has_paid: false, email_opted_out: false, email: null }) === 'email_invalido_ou_interno')
check('1.35 e-mail descartável → email_invalido_ou_interno', motivoDoPerfil({ has_paid: false, email: 'x@mailinator.com' }) === 'email_invalido_ou_interno')
check('1.36 conta do fundador → email_invalido_ou_interno', motivoDoPerfil({ has_paid: false, email: 'josephsskaf+t@gmail.com' }) === 'email_invalido_ou_interno')
check('1.37 contato proibido → bloqueado', motivoDoPerfil({ has_paid: false, email: 'akajitin@gmail.com' }) === 'bloqueado')
check('1.38 pessoa comum → null (segue)', motivoDoPerfil({ has_paid: false, email_opted_out: false, email: 'pessoa@gmail.com' }) === null)
check('1.39 has_paid null não é pagante (ela recebe a carta, só não a oferta)', motivoDoPerfil({ has_paid: null, email: 'pessoa@gmail.com' }) === null)

// o id do pulo: determinístico, por sessão × motivo
check('1.40 id do pulo é o UUID determinístico da casa (sha256 de nome:sessão:motivo)',
  idDoPulo('cs_a', 'optout') === uuidDe('checkout_hot_nudge_skipped_v1', 'cs_a:optout'))
check('1.41 sessões ou motivos diferentes → ids diferentes',
  idDoPulo('cs_a', 'optout') !== idDoPulo('cs_b', 'optout') && idDoPulo('cs_a', 'optout') !== idDoPulo('cs_a', 'pagante'))

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 2. A ROTA EXECUTADA — envio de verdade (?confirm=SEND)
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const r1 = await rodar()
const para = (uid) => r1.enviados.find((e) => e.to === `${uid}@fixture.invalid`)
const sentRows = r1.gravados.filter((g) => g.name === 'checkout_hot_nudge_emailed_v1')
const skipRows = r1.gravados.filter((g) => g.name === 'checkout_hot_nudge_skipped_v1')
const sentDe = (uid) => sentRows.find((g) => g.user_id === uid)

check('2.1 a rota respondeu 200 em modo SENT', r1.status === 200 && r1.body.mode === 'SENT')
check(`2.2 saem exatamente as ${ENVIAM.length} cartas certas (saíram: ${r1.enviados.map((e) => e.to).join(', ')})`,
  r1.enviados.length === ENVIAM.length && ENVIAM.every((u) => Boolean(para(u))))
check('2.3 todo envio vai pelo Resend com descadastro e resposta direta ao fundador',
  r1.enviados.every((e) => e.url === 'https://api.resend.com/emails' && e.reply_to === 'joseph@usekineo.com' && Boolean(e.headers?.['List-Unsubscribe'])))

const creator = para('u_creator')
check('2.4 quem tem direito recebe o link de 1 clique com o WELCOME20 (texto)', Boolean(creator) && creator.text.includes(LINK_CREATOR))
check('2.5 …e o botão com o mesmo link (html)', Boolean(creator) && creator.html.includes(`href="${LINK_CREATOR}"`))
check('2.6 …com a frase honesta: 20% só no 1º mês do MESMO plano, sem código para digitar',
  Boolean(creator) && /your first month of Creator is 20% off with our welcome offer\. Same plan, applied automatically, no code to type:/.test(creator.text))
check('2.7 …e a mesma página continua oferecida (nada some)', Boolean(creator) && creator.text.includes(LIVE('cs_creator')) && creator.html.includes(LIVE('cs_creator')))
check('2.8 Studio recebe o link do Studio', Boolean(para('u_studio')) && para('u_studio').text.includes('tier=pro&billing=monthly&promo=WELCOME20'))

for (const uid of ['u_starter', 'u_desconto', 'u_digitou', 'u_anual', 'u_nulo']) {
  const e = para(uid)
  check(`2.9 ${uid}: carta sem oferta nenhuma (sem % off, sem código, sem link de checkout novo)`,
    Boolean(e) && !/% off|WELCOME20|promo=|api\/stripe\/checkout/.test(e.text + e.html))
  check(`2.10 ${uid}: a mesma página, com o botão de sempre`,
    Boolean(e) && e.text.includes(LIVE(`cs_${uid.slice(2)}`)) && e.html.includes('Finish where you left off'))
}
check('2.11 nenhuma carta promete o trial de $1, crédito ou preço digitado',
  r1.enviados.every((e) => !/\$\s?\d|\b7 days\b|trial|credits?\b|\/month|USD/i.test(e.subject + e.text + e.html)))
check('2.12 o assunto descreve o estado real da sessão', r1.enviados.every((e) => /is still open$/.test(e.subject)))

check('2.13 um carimbo de envio por carta', sentRows.length === ENVIAM.length)
check('2.14 o carimbo leva a versão da carta', sentRows.every((g) => g.metadata?.email_version === 'hot_nudge_v2_welcome20'))
check('2.15 o carimbo diz se houve oferta e de qual plano',
  sentDe('u_creator')?.metadata?.welcome20_offered === true && sentDe('u_creator')?.metadata?.welcome20_tier === 'basic' &&
  sentDe('u_studio')?.metadata?.welcome20_tier === 'pro' && sentDe('u_creator')?.metadata?.welcome20_reason === null)
check('2.16 o carimbo diz POR QUE não houve oferta',
  sentDe('u_starter')?.metadata?.welcome20_reason === 'plano_fora_da_oferta' &&
  sentDe('u_desconto')?.metadata?.welcome20_reason === 'ja_tem_desconto' &&
  sentDe('u_digitou')?.metadata?.welcome20_reason === 'ja_tem_desconto' &&
  sentDe('u_anual')?.metadata?.welcome20_reason === 'periodo_fora_da_oferta' &&
  sentDe('u_nulo')?.metadata?.welcome20_reason === 'pagamento_nao_provado' &&
  ['u_starter', 'u_desconto', 'u_digitou', 'u_anual', 'u_nulo'].every((u) => sentDe(u)?.metadata?.welcome20_offered === false))
check('2.17 nenhuma linha gravada guarda a porta de pagamento pessoal (nem o link novo)',
  !/checkout\.stripe\.com|api\/stripe\/checkout|segredo/.test(JSON.stringify(r1.gravados)))
check('2.18 o código WELCOME20 foi conferido na Stripe UMA vez na execução', r1.stripe.promoConsultas.length === 1 && r1.stripe.promoConsultas[0] === 'WELCOME20')

const ESPERADOS = [
  [null, 'cs_guest', 'convidado_sem_email'],
  ['u_pagante', 'cs_pagante', 'pagante'],
  ['u_optout', 'cs_optout', 'optout'],
  ['u_expirada', 'cs_expirada', 'sem_pagina_viva'],
  ['u_ja', 'cs_ja', 'ja_recebeu'],
  ['u_sup', 'cs_sup', 'suprimido_24h'],
]
check(`2.19 quem cai fora ganha UMA linha com o motivo (gravadas: ${skipRows.map((g) => g.metadata?.reason).join(', ')})`,
  skipRows.length === ESPERADOS.length && ESPERADOS.every(([uid, sid, why]) => skipRows.some((g) =>
    g.user_id === uid && g.metadata?.stripe_session_id === sid && g.metadata?.reason === why && g.id === uuidDe('checkout_hot_nudge_skipped_v1', `${sid}:${why}`))))
check('2.20 a compra sem login vira pulo SEM dono e com a sessão (a Stripe não dá o e-mail sem consentimento)',
  skipRows.some((g) => g.user_id === null && g.metadata?.reason === 'convidado_sem_email' && g.metadata?.tier === 'pro'))
check('2.21 o pulo leva quando foi o clique e a versão da carta',
  skipRows.every((g) => g.metadata?.email_version === 'hot_nudge_v2_welcome20' && typeof g.metadata?.minutes_after_click === 'number' && g.path === '/api/admin/send-checkout-hot-nudge'))
check('2.22 a resposta resume os pulos', r1.body.pulos_gravados === ESPERADOS.length && r1.body.pulos_erro === null && r1.body.com_oferta_boas_vindas === 2)

// a segunda passada do cron (15 min depois, mesma janela): nada duplica
const t2 = r1.tables
for (const g of r1.gravados) {
  const { table, ...row } = g
  t2[table].push({ created_at: new Date(NOW).toISOString(), ...row })
}
const r2 = await rodar({ tables: t2 })
const ids1 = new Set(skipRows.map((g) => g.id))
const skip2 = r2.gravados.filter((g) => g.name === 'checkout_hot_nudge_skipped_v1')
check('2.23 2ª passada: nenhuma carta sai de novo (o carimbo é vitalício)', r2.status === 200 && r2.enviados.length === 0)
check('2.24 2ª passada: nenhum pulo já gravado é regravado', skip2.every((g) => !ids1.has(g.id)) && r2.body.pulos_ja_existiam === ESPERADOS.length)
check('2.25 2ª passada: os que receberam agora caem como ja_recebeu (motivo novo, linha nova)',
  skip2.length === ENVIAM.length && skip2.every((g) => g.metadata?.reason === 'ja_recebeu'))

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 3. O ENSAIO NÃO ESCREVE NADA (o padrão é dry-run)
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const d1 = await rodar({ confirm: false })
check('3.1 sem confirm=SEND: modo DRY_RUN', d1.status === 200 && d1.body.mode === 'DRY_RUN')
check('3.2 sem confirm=SEND: nenhum e-mail sai', d1.enviados.length === 0)
check('3.3 sem confirm=SEND: nenhuma linha é gravada (nem envio, nem pulo)', d1.gravados.length === 0)
check('3.4 o ensaio mostra a oferta e os motivos para o fundador aprovar',
  d1.body.com_oferta_boas_vindas === 2 && d1.body.sem_oferta_por_motivo?.plano_fora_da_oferta === 1 &&
  d1.body.pulos_por_motivo?.convidado_sem_email === 1 && d1.body.pulos_por_motivo?.sem_pagina_viva === 1 && d1.body.oferta_boas_vindas_ligada === true)
const g0 = await rodar({ confirm: false, tables: montarBanco({ soConvidado: true }) })
check('3.5 só compra sem login na janela, em ensaio: nada gravado', g0.body.mode === 'DRY_RUN' && g0.gravados.length === 0 && g0.body.pulos_por_motivo?.convidado_sem_email === 1)
const g1 = await rodar({ confirm: true, tables: montarBanco({ soConvidado: true }) })
check('3.6 só compra sem login na janela, de verdade: o pulo é gravado, nenhuma carta sai',
  g1.body.mode === 'SENT' && g1.enviados.length === 0 && g1.gravados.length === 1 && g1.gravados[0].metadata?.reason === 'convidado_sem_email')

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 4. A STRIPE NÃO CONFIRMOU O CÓDIGO → A CARTA SAI SEM OFERTA (nunca promete o que o checkout recusaria)
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
for (const promo of ['missing', 'throws']) {
  const r = await rodar({ promo })
  const c = r.enviados.find((e) => e.to === 'u_creator@fixture.invalid')
  const row = r.gravados.find((g) => g.name === 'checkout_hot_nudge_emailed_v1' && g.user_id === 'u_creator')
  check(`4.1 código ${promo === 'missing' ? 'ausente' : 'com a Stripe fora do ar'}: Creator recebe a carta SEM oferta`,
    Boolean(c) && !/% off|WELCOME20/.test(c.text + c.html) && c.text.includes(LIVE('cs_creator')))
  check(`4.2 código ${promo}: o motivo fica gravado`, row?.metadata?.welcome20_reason === 'welcome20_nao_verificado' && row?.metadata?.welcome20_offered === false)
}
// O interruptor desligado: a carta de sempre para todo mundo, e a Stripe nem é perguntada sobre o código
const rOff = await rodar({ fonte: ROTA_DESLIGADA })
check('4.3 interruptor desligado: as mesmas cartas saem, nenhuma com oferta',
  rOff.enviados.length === ENVIAM.length && rOff.enviados.every((e) => !/% off|WELCOME20|promo=/.test(e.text + e.html)))
check('4.4 interruptor desligado: o motivo gravado é oferta_desligada',
  rOff.gravados.filter((g) => g.name === 'checkout_hot_nudge_emailed_v1').every((g) => g.metadata?.welcome20_reason === 'oferta_desligada'))
check('4.5 interruptor desligado: o código não é consultado na Stripe', rOff.stripe.promoConsultas.length === 0)

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 5. AS PONTAS QUE MORAM EM OUTROS ARQUIVOS (a regra vive em vários arquivos)
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// As listas são lidas como CÓDIGO: tira-se o comentário de cada linha e colhem-se os literais. Assim um nome com
// comentário na frente da vírgula conta, e um nome citado só em comentário não conta (nos dois sentidos).
const nomesDaLista = (trecho) => (trecho.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n').match(/'[^'\n]+'/g) ?? []).map((s) => s.slice(1, -1))
const evt = ler('lib/lifecycle/emailEvents.ts')
const lista = nomesDaLista(evt.slice(evt.indexOf('export const LIFECYCLE_EMAIL_EVENT_NAMES = ['), evt.indexOf('] as const')))
check('5.1 o carimbo de envio entra na supressão de 24h da casa (as outras cartas passam a vê-lo)',
  lista.length > 30 && lista.includes('checkout_hot_nudge_emailed_v1') && lista.includes('checkout_recovery_emailed_v1'))
check('5.2 o PULO não entra (pulo não é envio: calaria a casa por 24h sem e-mail nenhum)',
  !lista.includes('checkout_hot_nudge_skipped_v1'))
const sink = ler('app/api/events/route.ts')
const inicioSink = sink.indexOf('const SERVER_ONLY_EVENTS = new Set([')
const serverOnly = nomesDaLista(sink.slice(inicioSink, sink.indexOf('\n])', inicioSink)))
check('5.3 o navegador não cunha o envio nem o pulo (SERVER_ONLY)',
  inicioSink > 0 && serverOnly.length > 50 && serverOnly.includes('payment_success') &&
  serverOnly.includes('checkout_hot_nudge_emailed_v1') && serverOnly.includes('checkout_hot_nudge_skipped_v1'))
const vercel = JSON.parse(ler('vercel.json'))
const cron = (vercel.crons ?? []).find((c) => String(c.path).startsWith('/api/admin/send-checkout-hot-nudge'))
check('5.4 o cron existe e roda DE VERDADE (confirm=SEND), com o teto de 30',
  Boolean(cron) && cron.path.includes('confirm=SEND') && cron.path.includes('limit=30') && cron.schedule === '6,21,36,51 * * * *')
check('5.5 a rota aceita o segredo do cron (senão o vercel.json toma 403 em silêncio)',
  /Boolean\(cronSecret\) && req\.headers\.get\('authorization'\) === `Bearer \$\{cronSecret\}`/.test(ROTA))
check('5.6 a rota não lê o interruptor do trial de cartão nem promete a porta morta', !/CARD_TRIAL|\$1 for/.test(ROTA))
check('5.7 interruptor único da oferta, booleano literal, declarado uma vez',
  (ROTA_CRU.match(/^export const HOT_NUDGE_WELCOME20_LIVE = (?:true|false)$/gm) ?? []).length === 1)
// A rota não pode nomear os interruptores da compra sem login nem em comentário: o guardião daquela peça trata quem
// os nomeia como consumidor (test-compra-sem-login-2026-10-06, "lê o interruptor da fonte única").
check('5.8 a rota não nomeia GUEST_CHECKOUT_LIVE nem GUEST_WELCOME_PROMO_LIVE', !/\bGUEST_CHECKOUT_LIVE\b|\bGUEST_WELCOME_PROMO_LIVE\b/.test(ROTA_CRU))

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 6. MUTANTES EM MEMÓRIA — cada trava tem de MORDER (e cada mutação tem de ter aplicado)
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function mutar(nome, de, para) {
  const n = ROTA.split(de).length - 1
  const fonte = ROTA.split(de).join(para)
  check(`6.0 mutante "${nome}" aplicou (${n} ocorrência)`, n === 1 && fonte !== ROTA && fonte.includes(para))
  return fonte
}
{
  const fonte = mutar('predicado largo (has_paid !== true)', 'if (input.hasPaid !== false) return', 'if (input.hasPaid === true) return')
  const m = (await rodar({ fonte, confirm: false })).rota
  check('6.1 mutante morto: has_paid null passaria a receber a oferta', m.decidirBoasVindas({ ...okBase, hasPaid: null }).oferecer === true)
}
{
  const fonte = mutar('acumula desconto', 'if (desconto !== 0 || md.intro', 'if (false || md.intro')
  const r = await rodar({ fonte })
  const e = r.enviados.find((x) => x.to === 'u_digitou@fixture.invalid')
  check('6.2 mutante morto: quem digitou um código na Stripe ganharia o WELCOME20 por cima', Boolean(e) && e.text.includes('promo=WELCOME20'))
}
{
  const fonte = mutar('Starter no recorte', "if ((tier !== 'basic' && tier !== 'pro') || !guestWelcomePromoShapeOk({ tier, isAnnual: false })) {", 'if (false) {')
  const r = await rodar({ fonte })
  const e = r.enviados.find((x) => x.to === 'u_starter@fixture.invalid')
  check('6.3 mutante morto: o Starter receberia um código que o checkout recusa', Boolean(e) && /% off/.test(e.text))
}
{
  const fonte = mutar('ignora a Stripe', 'welcome20Verificado: await verificarWelcome20(), sessao', 'welcome20Verificado: true, sessao')
  const r = await rodar({ fonte, promo: 'missing' })
  const e = r.enviados.find((x) => x.to === 'u_creator@fixture.invalid')
  check('6.4 mutante morto: sem conferir a Stripe, a carta prometeria um código ausente', Boolean(e) && e.text.includes('promo=WELCOME20'))
}
{
  const fonte = mutar('ensaio grava', 'const gravacao = confirm ? await gravarPulos(admin, pulos, agora) : null', 'const gravacao = await gravarPulos(admin, pulos, agora)')
  const r = await rodar({ fonte, confirm: false, tables: montarBanco({ soConvidado: true }) })
  check('6.5 mutante morto: o ensaio passaria a gravar pulos', r.gravados.length > 0)
}
{
  const fonte = mutar('porta morta de volta', 'No charge was made.\n\n${feito}', 'No charge was made.\n\n${feito}\n\nCreator is $1 for the first 7 days.')
  const r = await rodar({ fonte })
  check('6.6 mutante morto: a promessa do trial de $1 voltaria à carta', r.enviados.some((e) => /\$1 for the first 7 days/.test(e.text)))
}
{
  const fonte = mutar('pulo sem dedupe', 'const novas = ids.filter((id) => !existentes.has(id))', 'const novas = ids.filter((id) => id.length > 0)')
  const r = await rodar({ fonte, tables: t2 })
  const regravados = r.gravados.filter((g) => g.name === 'checkout_hot_nudge_skipped_v1' && ids1.has(g.id))
  check('6.7 mutante morto: a 2ª passada regravaria os pulos da 1ª', regravados.length > 0)
}

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${falhas.length === 0 ? '✅' : '❌'} resgate-pagamento-2026-10-08: ${ok}/${ok + falhas.length}`)
for (const f of falhas) console.log(`   ✗ ${f}`)
process.exit(falhas.length === 0 ? 0 : 1)
