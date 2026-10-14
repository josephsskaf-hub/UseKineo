#!/usr/bin/env node
// ═══ GUARDIÃO — KINEO-JOGADAS-VENDA-1510 (jogada 2: a carta quente com o PRÓPRIO filme) ══════════════════════════════
//
// O que ele protege: a carta que sai 30 min–6 h depois de alguém abrir o pagamento e não pagar
// (app/api/admin/send-checkout-hot-nudge) agora
//   · mostra a ÚLTIMA ENTREGA de verdade da pessoa (status 'completed' — nunca um render falho), com a capa e o link da
//     biblioteca logada (nunca /v/, nunca o MP4, nunca o id do vídeo), dizendo se é filme, anúncio ou clipe;
//   · sem entrega, a frase honesta de sempre e o botão da MESMA página;
//   · a quem nasceu 'region_paid_only' (régua do passe) e abandonou uma ASSINATURA, uma linha secundária com o passe de
//     1 filme no preço que a Stripe vai cobrar (regionPassPrice — a fonte única) e o link da rota do passe;
//   · fala português/espanhol pelo país do perfil, inglês no resto — e o inglês continua byte a byte o de 08/10.
//
// COMO: a rota REAL é transpilada e EXECUTADA (Stripe falsa, banco em memória, Resend capturado); a carta
// (lib/lifecycle/cartaQuente.ts) e as réguas de verdade (regionPass, regionFirstFilmEmail, momentumTopic) são carregadas
// pelo loader offline, sem dublê. No fim, mutantes em memória (rota e carta) provam que as travas mordem — e que cada
// mutação aplicou.
//
// Rodar: node scripts/test-jogadas-venda-1510.mjs   (offline: sem rede, sem banco, sem custo)
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import * as nodeCrypto from 'node:crypto'
import { compileOffline, memoryDb } from './test-support/truncamento-dedupe-offline.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const lf = (s) => s.replace(/\r\n/g, '\n')
const ler = (rel) => lf(readFileSync(join(raiz, rel), 'utf8'))

const ROTA_REL = 'app/api/admin/send-checkout-hot-nudge/route.ts'
const LIB_REL = 'lib/lifecycle/cartaQuente.ts'
const ROTA = ler(ROTA_REL)
const LIB = ler(LIB_REL)

let ok = 0
const falhas = []
function check(nome, condicao) {
  if (condicao === true) { ok++; return }
  falhas.push(nome)
}

// ── módulos reais ──────────────────────────────────────────────────────────────────────────────────────────────────
function carregar(transform = null) {
  const load = createOfflineLoader(transform ? { source: transform } : {})
  return { carta: load(LIB_REL), regionPass: load('lib/regionPass.ts'), momentum: load('lib/momentumTopic.ts'), load }
}
const real = carregar()
const C = real.carta
const promoTruth = compileOffline(ler('lib/growth/publicPromoTruth.ts'))
const growthGuest = compileOffline(ler('lib/growth/guestCheckout.ts'))
const readAllMod = compileOffline(ler('lib/supabase/readAll.ts'), { '../serverEvents': { writeServerEvent: async () => true } })

// ── relógio, Stripe falsa e cenário ────────────────────────────────────────────────────────────────────────────────
const NOW = Date.parse('2026-10-15T15:00:00.000Z')
class Clock extends Date { static now() { return NOW } }
const minAtras = (m) => new Date(NOW - m * 60_000).toISOString()
const LIVE = (sid) => `https://checkout.stripe.com/c/pay/${sid}#segredo`
const SITE = 'https://www.usekineo.com'
const CAPA = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/thumbs/fixture.jpg'
const MP4 = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/videos/fixture-segredo.mp4'

function sessao(sid, over = {}, md = {}) {
  return {
    id: sid, status: 'open', payment_status: 'unpaid', url: LIVE(sid), expires_at: Math.floor(NOW / 1000) + 20 * 3600,
    mode: 'subscription', metadata: { tier: 'basic', billing: 'monthly', checkout_origin: 'standard', ...md },
    total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 0 }, ...over,
  }
}
const perfil = (id, over = {}) => ({ id, email: `${id}@fixture.invalid`, email_opted_out: false, has_paid: false, trial_status: 'downgraded', plan: 'free', signup_country: 'US', last_country: null, ...over })
const video = (uid, minutos, over = {}) => ({
  id: `v-${uid}-${minutos}`, user_id: uid, created_at: minAtras(minutos), status: 'completed', quality_mode: 'cinematic_ai',
  title: 'The Lake That Turns Animals To Stone', topic: 'lake natron', thumb_url: CAPA, thumbnail_url: null, video_url: MP4, final_video_url: MP4, ...over,
})

// [perfil, sessão Stripe]
const PESSOAS = [
  [perfil('u_filme'), sessao('cs_filme')],
  [perfil('u_falhou'), sessao('cs_falhou')],
  [perfil('u_br', { trial_status: 'region_paid_only', signup_country: 'BR' }), sessao('cs_br')],
  [perfil('u_passe_abandonado', { trial_status: 'region_paid_only', signup_country: 'IN' }), sessao('cs_passe_abandonado', { mode: 'payment' }, { pack: 'starter10' })],
  [perfil('u_anuncio_mx', { signup_country: 'MX' }), sessao('cs_anuncio_mx')],
  [perfil('u_regiao_nulo', { trial_status: 'region_paid_only', has_paid: null, signup_country: null, last_country: 'NG' }), sessao('cs_regiao_nulo')],
  [perfil('u_clipe', { signup_country: null }), sessao('cs_clipe')],
]
const VIDEOS = [
  // u_filme: o mais novo FALHOU; a entrega é a de antes (com capa)
  video('u_filme', 200), video('u_filme', 50, { status: 'failed', title: 'Broken Render Title Should Never Appear', thumb_url: null }),
  // u_falhou: só falhas
  video('u_falhou', 90, { status: 'failed', title: 'Failed Only Title Never Named' }),
  video('u_falhou', 80, { status: 'processing', title: 'Processing Title Never Named' }),
  // u_anuncio_mx: anúncio entregue
  video('u_anuncio_mx', 300, { quality_mode: 'ads_v2', title: 'Café Aurora Grand Opening', thumb_url: null, thumbnail_url: CAPA }),
  // u_clipe: clipe sem capa, e capa maliciosa num filme mais velho (não é o mais novo, não entra)
  video('u_clipe', 400, { quality_mode: 'clip', title: null, topic: null, thumb_url: null }),
  video('u_clipe', 900, { thumb_url: 'javascript:alert(1)' }),
]

function montarBanco() {
  const events = PESSOAS.map(([p, s]) => ({ id: 'cs-' + p.id, user_id: p.id, name: 'checkout_started', created_at: minAtras(45), metadata: { stripe_session_id: s.id, tier: s.metadata.tier, ua_class: 'browser' } }))
  return { events, profiles: PESSOAS.map(([p]) => p), videos: VIDEOS.map((v) => ({ ...v })) }
}
function stripeFalsa() {
  const porId = Object.fromEntries(PESSOAS.map(([, s]) => [s.id, s]))
  return {
    checkout: { sessions: { retrieve: async (id) => { if (!porId[id]) throw new Error('No such checkout.session'); return porId[id] } } },
    promotionCodes: { list: async () => ({ data: [] }) },
    coupons: { retrieve: async () => null },
  }
}

async function rodar({ fonte = ROTA, carta = C, momentum = real.momentum, confirm = true, tables = montarBanco() } = {}) {
  const db = memoryDb(tables, { maxCalls: 400 })
  const enviados = []
  const rota = compileOffline(fonte, {
    '@/lib/supabase/readAll': readAllMod,
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { email: 'josephsskaf@gmail.com' } } }) } }) },
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/stripe': { stripe: stripeFalsa() },
    '@/lib/emailSuppression': { emailFooterHtml: () => '<!--rodape-->', emailFooterText: () => '[rodape]', unsubscribeHeaders: (id) => ({ 'List-Unsubscribe': `<https://fixture.invalid/u/${id}>` }) },
    '@/lib/lifecycle/suppression': { loadLifecycleSuppression: async () => ({ isSuppressed: () => false, suppressedCount: 0, degraded: false }) },
    '@/lib/momentumTopic': momentum,
    '@/lib/growth/publicPromoTruth': promoTruth,
    '@/lib/growth/guestCheckout': growthGuest,
    '@/lib/stripe/guestCheckout': {
      deterministicEventUuid: (name, key) => nodeCrypto.createHash('sha256').update(`${name}:${key}`).digest('hex').slice(0, 32),
      loadGuestWelcomePromoCandidate: async () => null,
    },
    '@/lib/lifecycle/cartaQuente': carta,
  }, {
    Date: Clock,
    process: { env: { RESEND_API_KEY: 'OFFLINE', STRIPE_SECRET_KEY: 'OFFLINE', NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'OFFLINE' } },
    fetch: async (url, init) => { enviados.push({ url, ...JSON.parse(init.body) }); return { ok: true, status: 200 } },
  })
  const res = await rota.GET({ headers: new Headers(), nextUrl: new URL(`https://fixture.invalid/${confirm ? '?confirm=SEND' : ''}`) })
  const gravados = db.writes.flatMap((w) => [].concat(w.row).map((row) => ({ table: w.table, ...row })))
  return { ...res, enviados, gravados }
}
const para = (r, uid) => r.enviados.find((e) => e.to === `${uid}@fixture.invalid`)
const carimbo = (r, uid) => r.gravados.find((g) => g.name === 'checkout_hot_nudge_emailed_v1' && g.user_id === uid)
const tudo = (e) => (e ? `${e.subject}\n${e.text}\n${e.html}` : '')

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 1. AS FUNÇÕES PURAS
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
check('1.1 ultimaEntrega pula falhou/processando e pega a 1ª completed',
  C.ultimaEntrega([{ status: 'failed' }, { status: 'processing' }, { status: 'completed', id: 'ok' }, { status: 'completed', id: 'velho' }])?.id === 'ok')
check('1.2 ultimaEntrega sem nenhuma completed → null', C.ultimaEntrega([{ status: 'failed' }, { status: null }]) === null && C.ultimaEntrega(null) === null)
check('1.3 tipoDaEntrega: ads_v2 → ad, clip → clip, resto → film',
  C.tipoDaEntrega('ads_v2') === 'ad' && C.tipoDaEntrega('clip') === 'clip' && C.tipoDaEntrega('cinematic_ai') === 'film' && C.tipoDaEntrega(null) === 'film')
check('1.4 capaSegura aceita https e recusa javascript:, http:, aspas e espaço',
  C.capaSegura(CAPA) === CAPA && C.capaSegura('javascript:alert(1)') === null && C.capaSegura('http://x.test/a.jpg') === null &&
  C.capaSegura('https://x.test/a".jpg') === null && C.capaSegura('https://x.test/a b.jpg') === null && C.capaSegura(null, CAPA) === CAPA)
check('1.5 filmeProprioDe só para completed', C.filmeProprioDe({ status: 'failed', thumb_url: CAPA }) === null && C.filmeProprioDe({ status: 'completed', thumb_url: CAPA })?.capa === CAPA)
check('1.6 a biblioteca é a logada (/history), com utm, sem id e sem /v/',
  C.linkDaBiblioteca() === `${SITE}/history?utm_source=lifecycle&utm_medium=email&utm_campaign=checkout_hot_nudge_own_film`)

const regiao = { trial_status: 'region_paid_only', has_paid: false, plan: 'free' }
const precoBR = real.regionPass.regionPassPrice({ ipCountry: 'BR', acceptLanguage: null })
const precoUS = real.regionPass.regionPassPrice({ ipCountry: 'US', acceptLanguage: null })
const pBR = C.passeParaCarta({ perfil: regiao, modoDaSessao: 'subscription', pais: 'BR' })
check('1.7 passe: região + assinatura → entra, no preço da fonte única (BRL para o Brasil)',
  Boolean(pBR) && pBR.preco.label === precoBR.label && pBR.preco.currency === precoBR.currency && pBR.preco.seconds === precoBR.seconds)
check('1.8 passe: país desconhecido cobra como o checkout (US)', C.passeParaCarta({ perfil: regiao, modoDaSessao: 'subscription', pais: null })?.preco.label === precoUS.label)
check('1.9 passe: abandonou o próprio passe (payment) ou sessão desconhecida → não',
  C.passeParaCarta({ perfil: regiao, modoDaSessao: 'payment', pais: 'BR' }) === null && C.passeParaCarta({ perfil: regiao, modoDaSessao: undefined, pais: 'BR' }) === null)
check('1.10 passe: fora da régua (downgraded, has_paid null/true, plano pago) → não',
  C.passeParaCarta({ perfil: { ...regiao, trial_status: 'downgraded' }, modoDaSessao: 'subscription', pais: 'US' }) === null &&
  C.passeParaCarta({ perfil: { ...regiao, has_paid: null }, modoDaSessao: 'subscription', pais: 'US' }) === null &&
  C.passeParaCarta({ perfil: { ...regiao, has_paid: true }, modoDaSessao: 'subscription', pais: 'US' }) === null &&
  C.passeParaCarta({ perfil: { ...regiao, plan: 'basic' }, modoDaSessao: 'subscription', pais: 'US' }) === null)
check('1.11 passe: o interruptor desta carta desliga', C.passeParaCarta({ perfil: regiao, modoDaSessao: 'subscription', pais: 'BR', live: false }) === null)
const linkPasse = new URL(C.linkDoPasseNaCarta())
check('1.12 o link do passe é a rota do passe (grava o clique), superfície first_film, com utm da carta',
  linkPasse.origin === SITE && linkPasse.pathname === '/api/region-pass' && linkPasse.searchParams.get('surface') === 'first_film' &&
  linkPasse.searchParams.get('go') === '1' && linkPasse.searchParams.get('utm_campaign') === 'checkout_hot_nudge_pass')
check('1.13 a língua vem do país do perfil (BR→pt, MX→es, resto/desconhecido→en)',
  C.paisELingua({ signup_country: 'BR' }).lang === 'pt' && C.paisELingua({ signup_country: 'MX' }).lang === 'es' &&
  C.paisELingua({ signup_country: 'IN' }).lang === 'en' && C.paisELingua({}).lang === 'en' && C.paisELingua({ last_country: 'AR' }).lang === 'es')
for (const lang of ['pt', 'es', 'en']) {
  const c = C.CARTA_QUENTE_COPY[lang]
  const textos = Object.values(c).map((v) => (typeof v === 'function' ? [v('X', 'film'), v('X', 'ad'), v(60, '$4.99'), v('Creator'), v(null)].join(' ') : v)).join(' ')
  check(`1.14 ${lang}: o texto não promete crédito, teste grátis, cupom nem urgência`,
    !/cr[eé]dit|trial|teste gr[aá]tis|prueba gratis|cupom|cup[oó]n|coupon|promo code|hurry|last chance|[uú]ltima chance|[uú]ltima oportunidad/i.test(textos))
  const bloco = (LIB.split('export const CARTA_QUENTE_COPY:')[1] ?? '').split(`\n  ${lang}: {\n`)[1]?.split('\n  },')[0] ?? ''
  check(`1.15 ${lang}: o único percentual é o da oferta de boas-vindas importado (bloco de ${bloco.split('\n').length} linhas)`,
    bloco.split('\n').length >= 15 && /\$\{WELCOME20_PERCENT_OFF\}%/.test(bloco) && !/\b\d+\s*%/.test(bloco))
}

// carta traduzida, com oferta (o WELCOME20 está desligado na rota; a estrutura traduzida é provada aqui)
const ptComOferta = C.cartaTraduzida({ lang: 'pt', filme: 'O Lago', temFilme: true, liveUrl: LIVE('cs_x'), oferta: { oferecer: true, plano: 'Creator', link: `${SITE}/api/stripe/checkout?tier=basic` }, extra: { lang: 'pt', proprio: { tipo: 'film', capa: CAPA }, passe: null }, rodape: { text: '[rodape]', html: '<!--rodape-->' } })
check('1.16 pt com oferta: oferta, mesma página, capa, rodapé — nos dois formatos',
  ptComOferta.text.includes(`${SITE}/api/stripe/checkout?tier=basic`) && ptComOferta.text.includes(LIVE('cs_x')) && ptComOferta.text.includes('[rodape]') &&
  ptComOferta.html.includes(`src="${CAPA}"`) && ptComOferta.html.includes(LIVE('cs_x')) && ptComOferta.html.includes('<!--rodape-->') && ptComOferta.html.includes('20% de desconto'))

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 2. A ROTA EXECUTADA (?confirm=SEND)
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const r = await rodar()
check(`2.1 todas as 7 cartas saem (saíram: ${r.enviados.length})`, r.status === 200 && r.body.mode === 'SENT' && r.enviados.length === PESSOAS.length)
const eFilme = para(r, 'u_filme')
check('2.2 filme próprio: nomeia a ENTREGA, nunca o render falho mais novo',
  Boolean(eFilme) && eFilme.subject === 'Your payment page for "The Lake That Turns Animals To Stone" is still open' && !/Broken Render/.test(tudo(eFilme)))
check('2.3 filme próprio: a capa entra com link para a biblioteca logada (html)',
  Boolean(eFilme) && eFilme.html.includes(`<a href="${C.linkDaBiblioteca()}"><img src="${CAPA}"`) && eFilme.html.includes('Watch it again in your library'))
check('2.4 filme próprio: o texto leva o link da biblioteca', Boolean(eFilme) && eFilme.text.includes(`It is saved in your library, private to your account: ${C.linkDaBiblioteca()}`))
check('2.5 nenhuma carta expõe a página pública, o MP4 ou o id do vídeo',
  r.enviados.every((e) => !/\/v\/|\.mp4|segredo\.mp4|v-u_/.test(e.text + e.html)))
check('2.6 o botão principal continua a MESMA página da Stripe', Boolean(eFilme) && eFilme.html.includes(`href="${LIVE('cs_filme')}"`) && eFilme.html.includes('Finish where you left off'))
const eFalhou = para(r, 'u_falhou')
check('2.7 só render falho/rodando: frase honesta, sem filme, sem capa, sem biblioteca',
  Boolean(eFalhou) && eFalhou.text.includes('You got as far as the payment page') && !/You already made|Failed Only|Processing Title|<img|\/history/.test(tudo(eFalhou)) &&
  eFalhou.subject === 'Your Kineo payment page is still open')
const eBR = para(r, 'u_br')
check('2.8 Brasil: carta em português (assunto e corpo)',
  Boolean(eBR) && eBR.subject === 'Sua página de pagamento da Kineo continua aberta' && eBR.text.includes('Nada foi cobrado.') && eBR.html.includes('Concluir de onde parei'))
check('2.9 Brasil região: a linha do passe no preço da fonte única, com o link da rota do passe',
  Boolean(eBR) && eBR.text.includes(precoBR.label) && eBR.text.includes(C.linkDoPasseNaCarta()) && eBR.html.includes(`href="${C.linkDoPasseNaCarta()}"`) &&
  eBR.text.includes(`Um filme de ${precoBR.seconds} segundos por ${precoBR.label}`))
check('2.10 Brasil região: o passe vem DEPOIS do botão da mesma página (secundário)',
  Boolean(eBR) && eBR.html.indexOf(LIVE('cs_br')) > -1 && eBR.html.indexOf(LIVE('cs_br')) < eBR.html.indexOf('/api/region-pass'))
const ePasse = para(r, 'u_passe_abandonado')
check('2.11 quem abandonou o próprio passe não recebe a linha do passe (o botão já é ele)', Boolean(ePasse) && !/api\/region-pass/.test(tudo(ePasse)))
const eMx = para(r, 'u_anuncio_mx')
check('2.12 México: espanhol, e o anúncio diz que é anúncio, com a capa (thumbnail_url)',
  Boolean(eMx) && eMx.subject === 'Tu página de pago de "Café Aurora Grand Opening" sigue abierta' && eMx.text.includes('Ya hiciste el anuncio “Café Aurora Grand Opening”') &&
  eMx.html.includes(`src="${CAPA}"`) && eMx.html.includes('alt="Tu anuncio"'))
check('2.13 has_paid desconhecido na região: sem passe (porta fechada quando não sei)', Boolean(para(r, 'u_regiao_nulo')) && !/api\/region-pass/.test(tudo(para(r, 'u_regiao_nulo'))))
const eClipe = para(r, 'u_clipe')
check('2.14 clipe sem título nem capa: "a clip", link da biblioteca, nenhuma imagem (e a capa maliciosa velha nunca entra)',
  Boolean(eClipe) && eClipe.text.includes('You already made a clip with Kineo') && !/<img|javascript:/.test(eClipe.html) && eClipe.html.includes(C.linkDaBiblioteca()))
check('2.15 fora da região, nenhuma carta oferece o passe',
  ['u_filme', 'u_falhou', 'u_anuncio_mx', 'u_clipe'].every((u) => !/api\/region-pass/.test(tudo(para(r, u)))))
check('2.16 o carimbo diz o que a carta levou',
  carimbo(r, 'u_filme')?.metadata?.copy_version === 'hot_nudge_own_film_1510' && carimbo(r, 'u_filme')?.metadata?.own_film_kind === 'film' &&
  carimbo(r, 'u_filme')?.metadata?.own_film_thumb === true && carimbo(r, 'u_filme')?.metadata?.has_film === true &&
  carimbo(r, 'u_falhou')?.metadata?.has_film === false && carimbo(r, 'u_falhou')?.metadata?.own_film_kind === null &&
  carimbo(r, 'u_br')?.metadata?.lang === 'pt' && carimbo(r, 'u_br')?.metadata?.region_pass_offered === true && carimbo(r, 'u_br')?.metadata?.region_pass_currency === precoBR.currency &&
  carimbo(r, 'u_anuncio_mx')?.metadata?.own_film_kind === 'ad' && carimbo(r, 'u_br')?.metadata?.country === 'BR')
check('2.17 o carimbo mantém a versão de 08/10 (os guardiões do resgate a conferem)', r.gravados.filter((g) => g.name === 'checkout_hot_nudge_emailed_v1').every((g) => g.metadata?.email_version === 'hot_nudge_v2_welcome20'))
check('2.18 nenhuma linha gravada guarda a capa, a página de pagamento ou o link do passe',
  !/supabase\.co\/storage|checkout\.stripe\.com|region-pass|segredo/.test(JSON.stringify(r.gravados)))
check('2.19 toda carta mantém descadastro e resposta direta ao fundador',
  r.enviados.every((e) => e.reply_to === 'joseph@usekineo.com' && Boolean(e.headers?.['List-Unsubscribe']) && (e.text.includes('[rodape]')) && e.html.includes('<!--rodape-->')))

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 3. O ENSAIO (padrão) NÃO ESCREVE NADA E MOSTRA O QUE A CARTA NOVA LEVA
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const d = await rodar({ confirm: false })
check('3.1 sem confirm=SEND: DRY_RUN, nenhum e-mail, nenhuma gravação', d.body.mode === 'DRY_RUN' && d.enviados.length === 0 && d.gravados.length === 0)
check(`3.2 o ensaio conta filme próprio, capa, passe e língua (${JSON.stringify({ f: d.body.com_filme_proprio, c: d.body.com_capa, p: d.body.com_passe, l: d.body.por_lingua })})`,
  d.body.com_filme_proprio === 3 && d.body.com_capa === 2 && d.body.com_passe === 1 && d.body.por_lingua?.pt === 1 && d.body.por_lingua?.es === 1 && d.body.por_lingua?.en === 5)

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 4. PONTAS QUE NÃO PODEM TER MEXIDO
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
check('4.1 a janela de 30 min–6 h é a de sempre', /export const JANELA_MIN_MINUTOS = 30\n/.test(ROTA) && /export const JANELA_MAX_MINUTOS = 360\n/.test(ROTA))
check('4.2 o cron é o de sempre (confirm=SEND, limit=30, de 15 em 15 min)',
  (JSON.parse(ler('vercel.json')).crons ?? []).some((c) => c.path === '/api/admin/send-checkout-hot-nudge?confirm=SEND&limit=30' && c.schedule === '6,21,36,51 * * * *'))
check('4.3 a carta lê o preço do passe da fonte única (regionPassPrice via precoDaCarta), sem número digitado',
  /import \{ linguaDoPais, paisDoPerfil, precoDaCarta, type RegionEmailLang \} from '\.\/regionFirstFilmEmail'/.test(LIB) && !/4[.,]99|24[.,]90|\b499\b/.test(LIB))
check('4.4 nada aqui chama a Stripe para criar produto ou preço', !/prices\.create|products\.create/.test(ROTA + LIB))

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 5. MUTANTES — cada trava tem de MORDER (e cada mutação tem de ter aplicado)
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function mutar(nome, fonte, de, para) {
  const n = fonte.split(de).length - 1
  const out = fonte.split(de).join(para)
  check(`5.0 mutante "${nome}" aplicou (${n} ocorrência)`, n === 1 && out !== fonte && out.includes(para))
  return out
}
{ // M1: a rota volta a pegar o vídeo mais novo de QUALQUER status
  const fonte = mutar('vídeo de qualquer status', ROTA, 'const entregue = ultimaEntrega(lista)', 'const entregue = lista[0] ?? null')
  const m = await rodar({ fonte })
  check('5.1 mutante morto: o render falho voltaria a ser nomeado', /Broken Render Title/.test(tudo(para(m, 'u_filme'))))
}
{ // M2: a carta esquece de conferir o modo da sessão (passe para quem abandonou o próprio passe)
  const libMut = mutar('passe sem conferir a sessão', LIB, "  if (input.modoDaSessao !== 'subscription') return null\n", '')
  const carta = carregar((rel, src) => (rel === LIB_REL ? libMut : src)).carta
  const m = await rodar({ carta })
  check('5.2 mutante morto: quem abandonou o passe receberia o passe duas vezes', /api\/region-pass/.test(tudo(para(m, 'u_passe_abandonado'))))
}
{ // M3: a capa aceita qualquer coisa
  const libMut = mutar('capa sem régua', LIB, "if (t.length > 0 && t.length <= 1000 && /^https:\\/\\/[^\\s\"'<>`]+$/.test(t)) return t", 'if (t.length > 0) return t')
  const carta = carregar((rel, src) => (rel === LIB_REL ? libMut : src)).carta
  check('5.3 mutante morto: javascript: viraria capa', carta.capaSegura('javascript:alert(1)') === 'javascript:alert(1)')
}
{ // M4: a língua ignora o perfil
  const fonte = mutar('língua fixa', ROTA, '        lang: pl.lang,\n', "        lang: 'en' as CartaLang,\n")
  const m = await rodar({ fonte })
  check('5.4 mutante morto: o Brasil voltaria a ler inglês', /payment page/.test(para(m, 'u_br')?.subject ?? ''))
}

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${falhas.length === 0 ? '✅' : '❌'} jogadas-venda-1510: ${ok}/${ok + falhas.length}`)
for (const f of falhas) console.log(`   ✗ ${f}`)
process.exit(falhas.length === 0 ? 0 : 1)
