#!/usr/bin/env node
// ═══ GUARDIÃO — KINEO-ABANDONO-RAPIDO-1610 (o e-mail de quem abriu o checkout e não pagou: 1–3 h, filme e garantia) ═════
//
// O que ele protege (decisão do fundador de 16/10):
//   A. a carta rápida (app/api/admin/send-checkout-hot-nudge) continua saindo entre 30 e 360 min depois do clique de
//      comprar (a janela de sempre — atrasar seria piora) — bordas inclusivas, 29 e 361 ficam fora;
//   B. leva a GARANTIA verdadeira da página aberta (mensal = os 7 dias do FAQ/termos; anual = ANNUAL_REFUND_DAYS) com o
//      nome do plano pela fonte única (PLANS); Business e passe avulso não ganham linha inventada;
//   C. quem não tem filme entregue e cujo teste paga o filme de 15 s AGORA ganha o convite com a última ideia; quem não
//      pode (teste vencido, sem saldo, sem folga no teto, has_paid desconhecido) não ganha promessa;
//   D. a casa reconfere NO ENVIO (perfil, payment_success, sessão Stripe): quem pagou entre a seleção e o envio não recebe;
//   E. 1 carta por pessoa: o carimbo vitalício lido em fatias paginadas E a reserva por chave primária antes do envio
//      (Resend falhou = a reserva é apagada); nenhum `.in()` com mais de 200 ids, nenhum corte silencioso em 1000;
//   F. o e-mail de ~24 h (app/api/cron/send-recovery) vira o SEGUNDO toque: pula quem voltou ao site depois da carta
//      rápida (evento de navegador com session_id), segue para quem não voltou e para quem nunca levou a rápida;
//   G. o desfaz dos guardiões antigos devolve EXATAMENTE a base (sha256) — a reancoragem não esconde nada.
//
// COMO: os módulos reais (abandonoRapido, cartaQuente, momentumTopic, reverseTrial, pricing…) carregados pelo loader
// offline; a rota REAL transpilada e EXECUTADA com Stripe falsa, banco em memória com chave primária, Resend capturado.
// No fim, mutantes em memória provam que cada trava morde — e que cada mutação aplicou.
//
// Rodar: node scripts/test-abandono-rapido-1610.mjs   (offline: sem rede, sem banco, sem custo)
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process' // reancorado KINEO-LEVA2-1510 (seção G: prova do desfaz do admin hotmail)
import ts from 'typescript'
import { compileOffline } from './test-support/truncamento-dedupe-offline.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { desfazAbandonoRapido1610, BASE_SHA256_ABANDONO_RAPIDO_1610 } from './test-support/desfaz-abandono-rapido-1610.mjs'
// reancorado KINEO-LEVA2-1510 — na leva 2 o admin hotmail (cd1e693b) pôs um e-mail na ADMIN_EMAILS da rota: sai em memória,
// pelo desfaz exato dele, ANTES do desfaz deste conserto (seção G); a seção G também prova que esse desfaz é exato.
import { semAdminHotmail1510, ADMIN_HOTMAIL_1510_ARQUIVOS, ADMIN_HOTMAIL_1510_COMMIT, ADMIN_HOTMAIL_1510_BASE } from './test-support/desfaz-admin-hotmail-1510.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const lf = (s) => s.replace(/\r\n/g, '\n')
const ler = (rel) => lf(readFileSync(join(raiz, rel), 'utf8'))

const ROTA_REL = 'app/api/admin/send-checkout-hot-nudge/route.ts'
const LIB_REL = 'lib/lifecycle/abandonoRapido.ts'
const CARTA_REL = 'lib/lifecycle/cartaQuente.ts'
const REC_REL = 'app/api/cron/send-recovery/route.ts'
const ROTA = ler(ROTA_REL)
const LIB = ler(LIB_REL)
const REC = ler(REC_REL)

let ok = 0
const falhas = []
function check(nome, condicao) {
  if (condicao === true) { ok++; return }
  falhas.push(nome)
}

// ── módulos reais ──────────────────────────────────────────────────────────────────────────────────────────────────
const ENV = { KINEO_REVERSE_TRIAL_ENABLED: 'true' }
function carregar(transform = null) {
  const load = createOfflineLoader({ env: ENV, ...(transform ? { source: transform } : {}) })
  return { A: load(LIB_REL), carta: load(CARTA_REL), momentum: load('lib/momentumTopic.ts'), cp: load('lib/checkoutPricing.ts'), fto: load('lib/freeTierOffer.ts') }
}
const real = carregar()
const A = real.A
const promoTruth = compileOffline(ler('lib/growth/publicPromoTruth.ts'))
const growthGuest = compileOffline(ler('lib/growth/guestCheckout.ts'))
const readAllMod = compileOffline(ler('lib/supabase/readAll.ts'), { '../serverEvents': { writeServerEvent: async () => true } })
const uuid = (name, key) => {
  const hex = createHash('sha256').update(`${name}:${key}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// ── relógio e banco em memória (com chave primária, delete, gt, not, is) ───────────────────────────────────────────
const NOW = Date.parse('2026-10-16T15:00:00.000Z')
class Clock extends Date { constructor(...a) { super(...(a.length ? a : [NOW])) } static now() { return NOW } }
const minAtras = (m) => new Date(NOW - m * 60_000).toISOString()
let seq = 0
function bancoFalso(tables, { falharLeitura = null } = {}) {
  const calls = [], writes = [], deletes = [], inLens = []
  const T = (n) => (tables[n] ??= [])
  return {
    calls, writes, deletes, inLens, tables,
    from(table) {
      const filters = [], order = []
      let bounds = [0, 999], op = 'select', payload = null
      const q = {
        select: () => q,
        eq(k, v) { filters.push((r) => r[k] === v); return q },
        in(k, vs) { inLens.push({ table, k, n: vs.length }); filters.push((r) => vs.includes(r[k])); return q },
        gte(k, v) { filters.push((r) => r[k] >= v); return q },
        lte(k, v) { filters.push((r) => r[k] <= v); return q },
        gt(k, v) { filters.push((r) => r[k] > v); return q },
        not(k, o, v) { if (o !== 'is' || v !== null) throw new Error('not() fora do suportado'); filters.push((r) => r[k] !== null && r[k] !== undefined); return q },
        is(k, v) { filters.push((r) => (v === null ? r[k] == null : r[k] === v)); return q },
        order(k, { ascending = true } = {}) { order.push([k, ascending]); return q },
        range(a, b) { bounds = [a, b]; return q },
        limit(n) { bounds = [0, Math.min(n, 1000) - 1]; return q },
        insert(row) { op = 'insert'; payload = row; return q },
        update(row) { op = 'update'; payload = row; return q },
        delete() { op = 'delete'; return q },
        then(res, rej) { return Promise.resolve().then(exec).then(res, rej) },
      }
      function exec() {
        if (op === 'insert') {
          const rows = [].concat(payload)
          for (const r of rows) if (r.id && T(table).some((x) => x.id === r.id)) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "events_pkey"' } }
          for (const r of rows) T(table).push({ session_id: null, created_at: new Date(NOW).toISOString(), ...r, id: r.id ?? `auto-${String(++seq).padStart(6, '0')}` })
          writes.push({ table, row: payload })
          return { data: null, error: null }
        }
        const sel = T(table).filter((r) => filters.every((f) => f(r)))
        if (op === 'delete') { tables[table] = T(table).filter((r) => !sel.includes(r)); deletes.push({ table, ids: sel.map((r) => r.id) }); return { data: null, error: null } }
        if (op === 'update') { for (const r of sel) Object.assign(r, payload); writes.push({ table, row: payload, update: true }); return { data: null, error: null } }
        calls.push({ table, bounds: [...bounds] })
        if (calls.length > 5000) throw new Error('Leitura sem progresso')
        if (falharLeitura && falharLeitura(table, calls.length)) return { data: null, error: { message: 'leitura indisponível' } }
        const rows = [...sel].sort((a, b) => { for (const [k, asc] of order) { const n = a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0; if (n) return asc ? n : -n } return 0 })
        return { data: rows.slice(bounds[0], Math.min(bounds[1] + 1, bounds[0] + 1000)), error: null }
      }
      return q
    },
  }
}

// ── cenário ────────────────────────────────────────────────────────────────────────────────────────────────────────
const LIVE = (sid) => `https://checkout.stripe.com/c/pay/${sid}#segredo`
const SITE = 'https://www.usekineo.com'
const CAPA = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/thumbs/fixture.jpg'
const IDEIA = 'Why the Roman Empire really fell'
const sessao = (sid, md = {}, over = {}) => ({
  id: sid, status: 'open', payment_status: 'unpaid', url: LIVE(sid), expires_at: Math.floor(NOW / 1000) + 20 * 3600,
  mode: 'subscription', metadata: { tier: 'basic', billing: 'monthly', checkout_origin: 'standard', ...md },
  total_details: { amount_discount: 0 }, ...over,
})
const trialAtivo = { trial_status: 'active', trial_ends_at: new Date(NOW + 3 * 86400_000).toISOString(), trial_credits_used: 0, trial_credits_granted: 10, video_credits: 10 }
const perfil = (id, over = {}) => ({ id, email: `${id}@fixture.invalid`, email_opted_out: false, has_paid: false, trial_status: 'downgraded', plan: 'free', signup_country: 'US', last_country: null, trial_ends_at: null, trial_credits_used: 0, trial_credits_granted: 10, video_credits: 0, ...over })
const video = (uid, minutos, over = {}) => ({ id: `v-${uid}-${minutos}`, user_id: uid, created_at: minAtras(minutos), status: 'completed', quality_mode: 'cinematic_ai', title: 'The Lake That Turns Animals To Stone', topic: 'lake natron', thumb_url: CAPA, thumbnail_url: null, ...over })

// [perfil, sessão, minutos desde o clique]
const PESSOAS = [
  [perfil('u_filme'), sessao('cs_filme'), 90],
  [perfil('u_semfilme', trialAtivo), sessao('cs_semfilme'), 120],
  [perfil('u_borda30'), sessao('cs_borda30', { tier: 'starter' }), 30],
  [perfil('u_borda360'), sessao('cs_borda360'), 360],
  [perfil('u_29'), sessao('cs_29'), 29],
  [perfil('u_45'), sessao('cs_45'), 45],
  [perfil('u_361'), sessao('cs_361'), 361],
  [perfil('u_anual'), sessao('cs_anual', { tier: 'pro', billing: 'annual' }), 100],
  [perfil('u_business'), sessao('cs_business', { tier: 'business' }), 100],
  [perfil('u_br', { signup_country: 'BR' }), sessao('cs_br'), 100],
  [perfil('u_flip'), sessao('cs_flip'), 100],
  [perfil('u_falha'), sessao('cs_falha'), 100],
  [perfil('u_ja'), sessao('cs_ja'), 100],
  [perfil('u_dup'), sessao('cs_dup'), 100],
  [perfil('u_sem_folga', { ...trialAtivo, trial_credits_used: 2 }), sessao('cs_sem_folga'), 100],
]
const VIDEOS = [
  video('u_filme', 300),
  video('u_semfilme', 130, { status: 'failed', title: null, topic: IDEIA }),
  video('u_br', 400),
]
function montarBanco() {
  const events = PESSOAS.map(([p, s, m]) => ({ id: 'cs-' + p.id, user_id: p.id, name: 'checkout_started', created_at: minAtras(m), session_id: null, metadata: { stripe_session_id: s.id, tier: s.metadata.tier, ua_class: 'browser' } }))
  // u_ja: carimbo ANTIGO (90 dias, id aleatório — de antes da reserva por chave primária) → a leitura vitalícia o pega.
  events.push({ id: 'old-stamp-u_ja', user_id: 'u_ja', name: 'checkout_hot_nudge_emailed_v1', created_at: new Date(NOW - 90 * 86400_000).toISOString(), session_id: null, metadata: {} })
  // u_dup: carimbo gravado pela reserva nova (id determinístico) — a chave primária é a última barreira.
  events.push({ id: uuid('checkout_hot_nudge_emailed_v1', 'user:u_dup'), user_id: 'u_dup', name: 'checkout_hot_nudge_emailed_v1', created_at: new Date(NOW - 40 * 86400_000).toISOString(), session_id: null, metadata: {} })
  return { events, profiles: PESSOAS.map(([p]) => ({ ...p })), videos: VIDEOS.map((v) => ({ ...v })) }
}
function stripeFalsa(tables) {
  const porId = Object.fromEntries(PESSOAS.map(([, s]) => [s.id, s]))
  const leituras = {}
  return {
    leituras,
    checkout: { sessions: { retrieve: async (id) => {
      leituras[id] = (leituras[id] ?? 0) + 1
      if (!porId[id]) throw new Error('No such checkout.session')
      // u_flip PAGA entre a seleção (1ª leitura) e o envio: a casa só descobre se reler no envio.
      if (id === 'cs_flip' && leituras[id] === 1) tables.events.push({ id: 'pay-u_flip', user_id: 'u_flip', name: 'payment_success', created_at: new Date(NOW).toISOString(), session_id: null, metadata: {} })
      return porId[id]
    } } },
    promotionCodes: { list: async () => ({ data: [] }) },
    coupons: { retrieve: async () => null },
  }
}

async function rodar({ fonte = ROTA, mods = real, confirm = true, tables = montarBanco(), limit = null } = {}) {
  const db = bancoFalso(tables)
  const stripe = stripeFalsa(tables)
  const enviados = []
  const rota = compileOffline(fonte, {
    '@/lib/supabase/readAll': readAllMod,
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { email: 'josephsskaf@gmail.com' } } }) } }) },
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/stripe': { stripe },
    '@/lib/emailSuppression': { emailFooterHtml: () => '<!--rodape-->', emailFooterText: () => '[rodape]', unsubscribeHeaders: (id) => ({ 'List-Unsubscribe': `<https://fixture.invalid/u/${id}>` }) },
    '@/lib/lifecycle/suppression': { loadLifecycleSuppression: async () => ({ isSuppressed: () => false, suppressedCount: 0, degraded: false }) },
    '@/lib/momentumTopic': mods.momentum,
    '@/lib/growth/publicPromoTruth': promoTruth,
    '@/lib/growth/guestCheckout': growthGuest,
    '@/lib/stripe/guestCheckout': { deterministicEventUuid: uuid, loadGuestWelcomePromoCandidate: async () => null },
    '@/lib/lifecycle/cartaQuente': mods.carta,
    '@/lib/lifecycle/abandonoRapido': mods.A,
  }, {
    Date: Clock,
    process: { env: { RESEND_API_KEY: 'OFFLINE', STRIPE_SECRET_KEY: 'OFFLINE', NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'OFFLINE' } },
    fetch: async (url, init) => {
      const b = JSON.parse(init.body)
      if (b.to === 'u_falha@fixture.invalid') return { ok: false, status: 500 }
      enviados.push({ url, ...b }); return { ok: true, status: 200 }
    },
  })
  const qs = `${confirm ? '?confirm=SEND' : '?'}${limit ? `&limit=${limit}` : ''}`
  const res = await rota.GET({ headers: new Headers(), nextUrl: new URL(`https://fixture.invalid/${qs}`) })
  return { ...res, enviados, db, stripe, tables, rota }
}
const para = (r, uid) => r.enviados.find((e) => e.to === `${uid}@fixture.invalid`)
const carimbos = (r, uid) => r.tables.events.filter((e) => e.name === 'checkout_hot_nudge_emailed_v1' && e.user_id === uid)

// ═══ A. a janela ═══════════════════════════════════════════════════════════════════════════════════════════════════
check('A: a janela é a de sempre, 30–360 min (não atrasa a carta que já saía em 31–45 min)', A.ABANDONO_JANELA_MIN_MINUTOS === 30 && A.ABANDONO_JANELA_MAX_MINUTOS === 360)
check('A: a rota usa as constantes do módulo (não um número solto)',
  /export const JANELA_MIN_MINUTOS = ABANDONO_JANELA_MIN_MINUTOS\n/.test(ROTA) && /export const JANELA_MAX_MINUTOS = ABANDONO_JANELA_MAX_MINUTOS\n/.test(ROTA))
check('A: o cron da carta continua com confirm=SEND e passa de 15 em 15 min (passa ~22 vezes pela janela)',
  (JSON.parse(ler('vercel.json')).crons ?? []).some((c) => c.path === '/api/admin/send-checkout-hot-nudge?confirm=SEND&limit=30' && c.schedule === '6,21,36,51 * * * *'))

const r = await rodar()
check('rota: 200 e modo SENT', r.status === 200 && r.body?.mode === 'SENT')
for (const u of ['u_filme', 'u_semfilme', 'u_borda30', 'u_borda360', 'u_45', 'u_anual', 'u_business', 'u_br']) check(`A: ${u} recebe`, Boolean(para(r, u)))
for (const u of ['u_29', 'u_361']) check(`A: ${u} (fora da janela) NÃO recebe`, !para(r, u) && carimbos(r, u).length === 0)

// ═══ B. a garantia ═════════════════════════════════════════════════════════════════════════════════════════════════
const faq = ler('app/pricing/PricingClient.tsx')
const termos = ler('app/terms/page.tsx')
const valor = ler('lib/growth/checkoutValueContext.ts')
// reancorado KINEO-LEVA2-1510 — desde KINEO-CHECKOUT-CLAREZA-1610 o FAQ não digita mais a garantia: mostra a frase única
// MONEY_BACK_GUARANTEE (lib/checkoutPricing.ts), cujos dias são MONTHLY_REFUND_DAYS / ANNUAL_REFUND_DAYS. A carta lê a MESMA
// constante (nada digitado no módulo); termos e checkout ainda escrevem o número e têm de bater com ela.
const diasFrase = Number(/within (\d+) days of your first monthly payment \((\d+) days on annual plans\)/.exec(real.cp.MONEY_BACK_GUARANTEE)?.[1])
const diasFraseAnual = Number(/within (\d+) days of your first monthly payment \((\d+) days on annual plans\)/.exec(real.cp.MONEY_BACK_GUARANTEE)?.[2])
const faqUsaFrase = /a: `Yes\. \$\{MONEY_BACK_GUARANTEE\}`,/.test(faq) && /^\s*MONEY_BACK_GUARANTEE,.*$/m.test(faq) && !/\d+-day money-back guarantee\. If you're not satisfied/.test(faq)
const diasTermos = Number(/within (\d+) days of the first charge/.exec(termos.replace(/\s+/g, ' '))?.[1])
const diasValor = Number(/'Cancel anytime from Account\. (\d+)-day money-back guarantee\.'/.exec(valor)?.[1])
check('B: a garantia mensal da carta é a MESMA do FAQ, dos termos e do checkout (7 dias)',
  A.MONTHLY_MONEY_BACK_DAYS === 7 && A.MONTHLY_MONEY_BACK_DAYS === real.cp.MONTHLY_REFUND_DAYS && A.MONTHLY_MONEY_BACK_DAYS === diasFrase &&
  diasFraseAnual === real.cp.ANNUAL_REFUND_DAYS && faqUsaFrase && A.MONTHLY_MONEY_BACK_DAYS === diasTermos && A.MONTHLY_MONEY_BACK_DAYS === diasValor)
check('B: a carta lê os dias do mensal da fonte única (MONTHLY_REFUND_DAYS de lib/checkoutPricing, sem número digitado)',
  /^import \{ MONTHLY_REFUND_DAYS \} from '\.\.\/checkoutPricing'$/m.test(LIB) && /^export const MONTHLY_MONEY_BACK_DAYS: number = MONTHLY_REFUND_DAYS$/m.test(LIB))
// Os planos: a frase única aparece sob o botão de pagar dos cartões do /pricing (PlanValueStage), que são exatamente
// Starter, Creator e Studio; o bloco do Business não a mostra. A carta dá a garantia a esses três e a mais nenhum.
const stage = ler('components/pricing/PlanValueStage.tsx')
const biz = ler('components/pricing/PricingBusinessBlock.tsx')
const tiersDoCartao = (/^export type PlanValueTier = ((?:'[a-z]+'(?: \| )?)+)$/m.exec(stage)?.[1] ?? '').split(' | ').map((t) => t.replace(/'/g, ''))
check('B: a garantia sai exatamente sob os cartões Starter, Creator e Studio (os planos com garantia na carta)',
  /\{MONEY_BACK_GUARANTEE\}/.test(stage) && /data-testid="plan-guarantee"/.test(stage) && !/MONEY_BACK_GUARANTEE|money-back/i.test(biz) &&
  JSON.stringify(tiersDoCartao) === JSON.stringify([...A.PLANOS_COM_GARANTIA]) &&
  JSON.stringify([...A.PLANOS_COM_GARANTIA].map((t) => A.nomeDoPlano(t))) === JSON.stringify(['Starter', 'Creator', 'Studio']))
check('B: o anual lê ANNUAL_REFUND_DAYS da fonte única (sem número digitado no módulo)',
  /import \{ ANNUAL_REFUND_DAYS \} from '\.\.\/checkoutPricing'/.test(LIB) && !/\b14 ?(days|dias|días|-day)/.test(LIB.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n')) && A.garantiaDaSessao(sessao('x', { tier: 'pro', billing: 'annual' })).dias === real.cp.ANNUAL_REFUND_DAYS)
const G = A.garantiaDaSessao
check('B: Creator mensal → 7 dias', JSON.stringify(G(sessao('x'))) === JSON.stringify({ plano: 'Creator', periodo: 'monthly', dias: 7 }))
check('B: Starter mensal → Starter', G(sessao('x', { tier: 'starter' }))?.plano === 'Starter')
check('B: Business → sem linha', G(sessao('x', { tier: 'business' })) === null)
check('B: passe avulso (mode payment) → sem linha', G(sessao('x', {}, { mode: 'payment' })) === null)
check('B: período desconhecido → sem linha', G(sessao('x', { billing: undefined })) === null)
check('B: tier desconhecido/protótipo → sem linha', G(sessao('x', { tier: 'constructor' })) === null && G(sessao('x', { tier: '' })) === null)
check('B: sessão nula → sem linha', G(null) === null && G(undefined) === null)

const fFilme = para(r, 'u_filme')
const fSem = para(r, 'u_semfilme')
const fAnual = para(r, 'u_anual')
const fBiz = para(r, 'u_business')
const fBr = para(r, 'u_br')
const GAR_EN = 'Creator comes with a 7-day money-back guarantee: if it is not for you, email support@usekineo.com within 7 days of your first charge and we refund 100%.'
check('B: a carta (texto) leva a garantia do Creator', fFilme?.text.includes(GAR_EN) === true)
check('B: a carta (html) leva a garantia com o e-mail clicável', fFilme?.html.includes('mailto:support@usekineo.com') === true && fFilme?.html.includes('7-day money-back guarantee') === true)
check('B: a garantia vem DEPOIS do link da página de pagamento', (fFilme?.text.indexOf(GAR_EN) ?? -1) > (fFilme?.text.indexOf(LIVE('cs_filme')) ?? 99999))
check('B: o anual diz o prazo do anual', fAnual?.text.includes(`The annual Studio plan is refundable in full within ${real.cp.ANNUAL_REFUND_DAYS} days of purchase.`) === true && !fAnual?.text.includes('7-day'))
check('B: Business sai SEM linha de garantia', Boolean(fBiz) && !/money-back|refundable/.test(fBiz.text + fBiz.html))
check('B: português no Brasil', fBr?.text.includes('O Creator tem garantia de 7 dias') === true && fBr?.text.includes('Você já fez') === true)
check('B: nenhuma carta promete desconto ou preço novo', r.enviados.every((e) => !/\$\d|% off|discount|desconto|descuento/i.test(e.text)))

// ═══ C. o convite do filme grátis ══════════════════════════════════════════════════════════════════════════════════
check('C: sem filme + teste que paga o 15 s → convite com a última ideia', fSem?.text.includes('your trial still covers one free 15-second film (Seedance 1.5)') === true && fSem?.text.includes(`Your last idea is ready to go: “${IDEIA}”`) === true)
check('C: o link do convite só PREENCHE o Studio (sem autoanalyze/create_intent)',
  fSem?.text.includes(`${SITE}/studio/create?prompt=Why+the+Roman+Empire+really+fell&utm_source=lifecycle&utm_medium=email&utm_campaign=checkout_fast_free_film`) === true && !/autoanalyze|create_intent/.test(fSem?.text ?? 'x'))
check('C: o convite vem ANTES do link de pagamento (o botão de comprar continua na carta)',
  (fSem?.text.indexOf('free 15-second film') ?? 99999) < (fSem?.text.indexOf(LIVE('cs_semfilme')) ?? -1))
check('C: o botão do convite no html', fSem?.html.includes('Make my free 15-second film') === true)
check('C: quem tem filme NÃO recebe convite', fFilme && !fFilme.text.includes('free 15-second film'))
check('C: teste sem folga no teto (usou 2 de 10, o filme custa 9) → sem convite', !para(r, 'u_sem_folga')?.text.includes('free 15-second film'))
check('C: o custo é o da função que cobra (TRIAL_FREE_FILM_CREDITS)', real.fto.TRIAL_FREE_FILM_CREDITS === 9 && /TRIAL_FREE_FILM_CREDITS/.test(LIB))
const CV = (perfil, extra = {}) => A.conviteDoFilmeGratis({ temFilme: false, perfil, ideia: IDEIA, agoraMs: NOW, ...extra })
check('C: has_paid desconhecido → sem convite', CV({ ...trialAtivo, has_paid: null }) === null)
check('C: teste vencido → sem convite', CV({ ...trialAtivo, has_paid: false, trial_ends_at: new Date(NOW - 1000).toISOString() }) === null)
check('C: saldo abaixo do custo → sem convite', CV({ ...trialAtivo, has_paid: false, video_credits: 8 }) === null)
check('C: trial rebaixado → sem convite', CV({ ...trialAtivo, has_paid: false, trial_status: 'downgraded' }) === null)
check('C: temFilme true → sem convite', A.conviteDoFilmeGratis({ temFilme: true, perfil: { ...trialAtivo, has_paid: false }, ideia: IDEIA, agoraMs: NOW }) === null)
check('C: sem ideia legível → convite sem ideia', CV({ ...trialAtivo, has_paid: false }, { ideia: 'ab' })?.ideia === null)
const semFlag = createOfflineLoader({ env: {} })(LIB_REL)
check('C: com o teste reverso DESLIGADO o convite não existe', semFlag.conviteDoFilmeGratis({ temFilme: false, perfil: { ...trialAtivo, has_paid: false }, ideia: IDEIA, agoraMs: NOW }) === null)
check('C: nenhuma língua promete "sem marca d\'água" nem "sem cartão"',
  Object.values(A.ABANDONO_RAPIDO_COPY).every((c) => !/watermark|marca d|marca de agua|no card|sem cartão|sin tarjeta/i.test(c.convite(15))))

// ═══ D. a conferência no envio ═════════════════════════════════════════════════════════════════════════════════════
check('D: u_flip (pagou entre a seleção e o envio) NÃO recebe', !para(r, 'u_flip') && carimbos(r, 'u_flip').length === 0)
check('D: o pulo é registrado como pagou_antes_do_envio', r.body?.pulos_por_motivo?.pagou_antes_do_envio === 1 && r.body?.pulados_na_conferencia_do_envio === 1)
check('D: a sessão Stripe foi relida no envio (2 leituras por enviado)', r.stripe.leituras.cs_filme === 2)
const P = A.podeEnviarAgora
check('D: tabela-verdade de podeEnviarAgora',
  P({ hasPaid: false, pagamentos: 0, paginaViva: 'u', leituraOk: true }) === null &&
  P({ hasPaid: true, pagamentos: 0, paginaViva: 'u', leituraOk: true }) === 'pagou_antes_do_envio' &&
  P({ hasPaid: null, pagamentos: 0, paginaViva: 'u', leituraOk: true }) === 'pagou_antes_do_envio' &&
  P({ hasPaid: false, pagamentos: 1, paginaViva: 'u', leituraOk: true }) === 'pagou_antes_do_envio' &&
  P({ hasPaid: false, pagamentos: 0, paginaViva: null, leituraOk: true }) === 'sem_pagina_viva_no_envio' &&
  P({ hasPaid: false, pagamentos: null, paginaViva: 'u', leituraOk: true }) === 'conferencia_falhou' &&
  P({ hasPaid: false, pagamentos: 0, paginaViva: 'u', leituraOk: false }) === 'conferencia_falhou')

// ═══ E. uma carta por pessoa ═══════════════════════════════════════════════════════════════════════════════════════
check('E: u_ja (carimbo de 90 dias) não recebe', !para(r, 'u_ja'))
check('E: u_dup (reserva determinística existente) não recebe', !para(r, 'u_dup') && carimbos(r, 'u_dup').length === 1)
check('E: cada enviado tem UM carimbo, com o id determinístico da pessoa',
  r.enviados.every((e) => { const uid = e.to.split('@')[0]; const c = carimbos(r, uid); return c.length === 1 && c[0].id === uuid('checkout_hot_nudge_emailed_v1', `user:${uid}`) && c[0].id === r.rota.idDaCartaRapida(uid) }))
check('E: o carimbo leva versão, janela, garantia e convite (a ideia só como booleano)',
  (() => { const m = carimbos(r, 'u_semfilme')[0]?.metadata; return m?.abandono_version === 'abandono_rapido_1610' && JSON.stringify(m.window_minutes) === '[30,360]' && m.guarantee_days === 7 && m.plan_name === 'Creator' && m.free_film_invite === true && m.free_film_idea === true && !JSON.stringify(m).includes(IDEIA) && m.send_time_check === 'ok' })())
check('E: Resend falhou → a reserva é apagada (a próxima rodada tenta de novo)', !para(r, 'u_falha') && carimbos(r, 'u_falha').length === 0 && r.db.deletes.some((d) => d.ids.includes(uuid('checkout_hot_nudge_emailed_v1', 'user:u_falha'))))
check('E: falhas contadas', r.body?.falhas === 1)
check('E: nenhuma leitura usa .in() com mais de 200 ids', r.db.inLens.every((x) => x.n <= 200))
check('E: o corte silencioso ids.slice(0, 1000) saiu da rota', !ROTA.includes('ids.slice(0, 1000)'))

// dry-run: nada gravado, nada enviado, e o fundador vê garantia e convite
const d = await rodar({ confirm: false })
check('dry-run: modo DRY_RUN, zero envio, zero escrita, zero delete', d.body?.mode === 'DRY_RUN' && d.enviados.length === 0 && d.db.writes.length === 0 && d.db.deletes.length === 0)
check('dry-run: mostra a janela 30–360 e as contagens de garantia/convite', JSON.stringify(d.body?.janela_minutos) === '[30,360]' && d.body?.com_garantia >= 5 && d.body?.com_convite_filme_gratis === 1)

// escala: 1.200 pessoas na janela — a seleção inteira chega (nenhum perfil_ausente) e nenhuma URL leva mais de 200 ids
const grande = { events: [], profiles: [], videos: [] }
for (let i = 0; i < 1200; i++) {
  const id = `g${String(i).padStart(5, '0')}`
  grande.events.push({ id: `cs-${id}`, user_id: id, name: 'checkout_started', created_at: minAtras(90), session_id: null, metadata: { stripe_session_id: `cs_${id}`, tier: 'basic' } })
  grande.profiles.push(perfil(id))
}
const g = await rodar({ confirm: false, tables: grande })
check('escala: 1.200 pessoas → 1.200 candidatas (sem corte em 1000)', g.body?.candidatos_apos_filtros === 1200 && !g.body?.pulos_por_motivo?.perfil_ausente)
check('escala: nenhuma leitura com .in() acima de 200 ids', g.db.inLens.length > 0 && g.db.inLens.every((x) => x.n <= 200))

// ═══ F. o e-mail de ~24 h vira o segundo toque ═════════════════════════════════════════════════════════════════════
const S = A.decidirSegundoToque24h
check('F: tabela-verdade de decidirSegundoToque24h',
  S({ cartaRapidaEm: null, voltou: null }) === 'enviar' &&
  S({ cartaRapidaEm: 't', voltou: false }) === 'enviar' &&
  S({ cartaRapidaEm: 't', voltou: true }) === 'pular_voltou' &&
  S({ cartaRapidaEm: 't', voltou: undefined }) === 'adiar' &&
  S({ cartaRapidaEm: undefined, voltou: true }) === 'adiar')
check('F: a busca da carta rápida começa sessão + 6 h antes da expiração',
  A.inicioDaBuscaDaCartaRapida('2026-10-16T12:00:00.000Z', 24) === '2026-10-15T06:00:00.000Z' && A.inicioDaBuscaDaCartaRapida(null, 24) === null)
check('F: CARTA_RAPIDA_EVENT é o carimbo da rota', A.CARTA_RAPIDA_EVENT === /const SENT_EVENT = '([^']+)'/.exec(ROTA)?.[1])

// A função REAL do send-recovery, extraída do AST e executada contra o banco em memória.
const recAst = ts.createSourceFile(REC_REL, REC, ts.ScriptTarget.Latest, true)
const fnNode = recAst.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === 'segundoToque')
check('F: o send-recovery tem a função segundoToque', Boolean(fnNode))
function compilarSegundoToque(fonteFn, mods = real) {
  const mod = compileOffline(`export ${fonteFn}`, {}, { RECURRING_CHECKOUT_WINDOW_HOURS: 24, inicioDaBuscaDaCartaRapida: mods.A.inicioDaBuscaDaCartaRapida, decidirSegundoToque24h: mods.A.decidirSegundoToque24h, CARTA_RAPIDA_EVENT: mods.A.CARTA_RAPIDA_EVENT })
  return mod.segundoToque
}
const FN = fnNode ? fnNode.getText(recAst) : ''
const EXP = '2026-10-16T12:00:00.000Z'
const ev = (over) => ({ id: `e${++seq}`, user_id: 'u', name: 'page_view', created_at: '2026-10-15T20:00:00.000Z', session_id: 's1', ...over })
const cenarios = {
  sem_carta: [ev({ name: 'page_view' })],
  voltou: [ev({ name: 'checkout_hot_nudge_emailed_v1', created_at: '2026-10-15T14:00:00.000Z', session_id: null }), ev({ created_at: '2026-10-15T15:00:00.000Z' })],
  so_servidor: [ev({ name: 'checkout_hot_nudge_emailed_v1', created_at: '2026-10-15T14:00:00.000Z', session_id: null }), ev({ name: 'trial_downgraded', created_at: '2026-10-15T18:00:00.000Z', session_id: null })],
  voltou_antes: [ev({ created_at: '2026-10-15T13:00:00.000Z' }), ev({ name: 'checkout_hot_nudge_emailed_v1', created_at: '2026-10-15T14:00:00.000Z', session_id: null })],
  carta_velha: [ev({ name: 'checkout_hot_nudge_emailed_v1', created_at: '2026-09-01T14:00:00.000Z', session_id: null }), ev({ created_at: '2026-10-15T15:00:00.000Z' })],
}
async function toque(fn, nome, opts = {}) { return fn(bancoFalso({ events: cenarios[nome].map((e) => ({ ...e })) }, opts), 'u', EXP) }
if (fnNode) {
  const fn = compilarSegundoToque(FN)
  check('F: sem carta rápida → enviar (1º toque, como sempre)', (await toque(fn, 'sem_carta')) === 'enviar')
  check('F: carta rápida + volta pelo navegador depois → pular_voltou', (await toque(fn, 'voltou')) === 'pular_voltou')
  check('F: carta rápida + só evento de SERVIDOR depois → enviar (2º toque)', (await toque(fn, 'so_servidor')) === 'enviar')
  check('F: volta ANTES da carta não conta → enviar', (await toque(fn, 'voltou_antes')) === 'enviar')
  check('F: carta de OUTRO abandono (fora da busca) → enviar', (await toque(fn, 'carta_velha')) === 'enviar')
  check('F: leitura falhou → adiar (sem carimbo)', (await toque(fn, 'voltou', { falharLeitura: () => true })) === 'adiar')
  // mutante: sem o filtro de navegador, evento de servidor passaria por "voltou"
  const semNav = FN.replace(".not('session_id', 'is', null)", '')
  check('F mutante aplicado: sem o filtro session_id', semNav !== FN)
  check('F mutante MORTO: sem o filtro, evento de servidor calaria o 2º toque', (await toque(compilarSegundoToque(semNav), 'so_servidor')) === 'pular_voltou')
}
check('F: o laço chama segundoToque ANTES de montar o e-mail', (() => { const a = REC.indexOf('const toque = await segundoToque(admin, userId, cand.expiredAt)'); const b = REC.indexOf('const planName = planNameFor(cand.tier)'); return a > 0 && b > a })())
check('F: quem voltou leva o SENTINELA de pulo (nunca a data de envio)', /if \(toque === 'pular_voltou'\) \{[\s\S]{0,200}recovery_sent_at: LIFECYCLE_SKIP_STAMP/.test(REC))
check('F: adiar não carimba nada', /if \(toque === 'adiar'\) \{\n\s+deferredSecondTouch\+\+\n\s+continue\n\s+\}/.test(REC))
check('F: o payload do cron mostra os dois contadores novos', /skipped_returned_after_fast_letter: skippedReturnedAfterFastLetter/.test(REC) && /deferred_second_touch_check: deferredSecondTouch/.test(REC))

// ═══ G. o desfaz devolve exatamente a base ═════════════════════════════════════════════════════════════════════════
const sha = (s) => createHash('sha256').update(s).digest('hex')
// reancorado KINEO-LEVA2-1510 — o admin hotmail (camada irmã, linha disjunta) sai primeiro; sem ele na árvore, volta igual.
check('G: desfazer a rota devolve a base byte a byte', sha(desfazAbandonoRapido1610(ROTA_REL, semAdminHotmail1510(ROTA_REL, ROTA))) === BASE_SHA256_ABANDONO_RAPIDO_1610[ROTA_REL])
{
  const git = (...a) => execFileSync('git', ['-C', raiz, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 })
  const ruins = ADMIN_HOTMAIL_1510_ARQUIVOS.filter((f) => { try { return semAdminHotmail1510(f, git('show', `${ADMIN_HOTMAIL_1510_COMMIT}:${f}`)) !== lf(git('show', `${ADMIN_HOTMAIL_1510_BASE}:${f}`)) } catch { return true } })
  check('G: o desfaz do admin hotmail é exato (46 arquivos: blob do cd1e693b desfeito = blob do b1a8766f)', ADMIN_HOTMAIL_1510_ARQUIVOS.length === 46 && ruins.length === 0)
  const mexida = ROTA.replace("'joseph-test@shortsforgeai.com', 'josephskaf@hotmail.com',", "'joseph-test@shortsforgeai.com', 'josephskaf@hotmail.com', 'x@y.z',")
  let lancou = false
  try { semAdminHotmail1510(ROTA_REL, mexida) } catch (e) { lancou = /mudou fora deste conserto/.test(String(e && e.message)) }
  check('G: mudança alheia na linha do admin hotmail faz o desfaz dele lançar', mexida !== ROTA && lancou)
}
check('G: desfazer a carta devolve a base byte a byte', sha(desfazAbandonoRapido1610(CARTA_REL, ler(CARTA_REL))) === BASE_SHA256_ABANDONO_RAPIDO_1610[CARTA_REL])
check('G: os 4 guardiões antigos reancorados usam o desfaz',
  ['test-checkout-hot-nudge', 'test-hot-nudge-janela-campanhas', 'test-jogadas-venda-1510', 'test-resgate-pagamento-2026-10-08']
    .every((f) => ler(`scripts/${f}.mjs`).includes("from './test-support/desfaz-abandono-rapido-1610.mjs'")))

// ═══ mutantes (rota) ═══════════════════════════════════════════════════════════════════════════════════════════════
async function mutante(nome, de, para_, provar) {
  const n = ROTA.split(de).length - 1
  check(`mutante aplicado (${nome})`, n === 1)
  if (n !== 1) return
  const m = await rodar({ fonte: ROTA.split(de).join(para_) })
  check(`mutante MORTO (${nome})`, provar(m) === true)
}
await mutante('janela atrasada para 60 min', 'export const JANELA_MIN_MINUTOS = ABANDONO_JANELA_MIN_MINUTOS', 'export const JANELA_MIN_MINUTOS = 60', (m) => !para(m, 'u_45') && !para(m, 'u_borda30'))
await mutante('janela encurtada para 3 h', 'export const JANELA_MAX_MINUTOS = ABANDONO_JANELA_MAX_MINUTOS', 'export const JANELA_MAX_MINUTOS = 180', (m) => !para(m, 'u_borda360'))
await mutante('janela sem piso (29 min recebe)', 'export const JANELA_MIN_MINUTOS = ABANDONO_JANELA_MIN_MINUTOS', 'export const JANELA_MIN_MINUTOS = 0', (m) => Boolean(para(m, 'u_29')))
await mutante('sem conferência no envio', 'const motivoNoEnvio = await conferirNoEnvio(c)', 'const motivoNoEnvio = null as MotivoNoEnvio | null', (m) => Boolean(para(m, 'u_flip')))
await mutante('sem apagar a reserva quando o Resend falha', "try { await admin.from('events').delete().eq('id', idReserva) } catch { /* fica reservado: falha fechada */ }", '', (m) => carimbos(m, 'u_falha').length === 1)
// a chave primária é a última barreira: sem a leitura vitalícia, ela ainda segura u_dup…
await mutante('sem a leitura vitalícia (a reserva segura)', ".eq('name', SENT_EVENT).in('user_id', fatia)", ".eq('name', '__nada__').in('user_id', fatia)", (m) => !para(m, 'u_dup') && m.body?.pulos_por_motivo?.ja_recebeu >= 1)
// …e sem a leitura E sem o id determinístico, u_dup recebe a segunda carta — prova que era a chave que segurava.
{
  const de1 = ".eq('name', SENT_EVENT).in('user_id', fatia)", de2 = '        id: idReserva,\n'
  const fonte = ROTA.split(de1).join(".eq('name', '__nada__').in('user_id', fatia)").split(de2).join('')
  check('mutante aplicado (sem leitura e sem reserva)', fonte !== ROTA && !fonte.includes(de2))
  const m = await rodar({ fonte })
  check('mutante MORTO (sem leitura e sem reserva → segunda carta)', Boolean(para(m, 'u_dup')))
}
{
  const de = 'export const FATIA_IDS = 200'
  check('mutante aplicado (fatia de 5000)', ROTA.includes(de))
  const m = await rodar({ fonte: ROTA.split(de).join('export const FATIA_IDS = 5000'), confirm: false, tables: grande })
  check('mutante MORTO (fatia de 5000 → .in() com 1.200 ids)', m.db.inLens.some((x) => x.n > 200))
}

// ═══ mutantes (módulo) ═════════════════════════════════════════════════════════════════════════════════════════════
function mutanteLib(nome, de, para_, provar) {
  const n = LIB.split(de).length - 1
  check(`mutante aplicado (${nome})`, n === 1)
  if (n !== 1) return
  const mods = carregar((rel, s) => (rel === LIB_REL ? s.split(de).join(para_) : s))
  check(`mutante MORTO (${nome})`, provar(mods.A) === true)
}
mutanteLib('Business ganha garantia', "export const PLANOS_COM_GARANTIA = ['starter', 'basic', 'pro'] as const", "export const PLANOS_COM_GARANTIA = ['starter', 'basic', 'pro', 'business'] as const", (M) => M.garantiaDaSessao(sessao('x', { tier: 'business' })) !== null)
mutanteLib('has_paid largo no envio', 'if (input.hasPaid !== false || input.pagamentos > 0)', 'if (input.hasPaid === true || input.pagamentos > 0)', (M) => M.podeEnviarAgora({ hasPaid: null, pagamentos: 0, paginaViva: 'u', leituraOk: true }) === null)
mutanteLib('convite sem a folga do teto', '  if (trialCapFor(p) - trialCreditsUsed(p) < custo) return null\n', '', (M) => M.conviteDoFilmeGratis({ temFilme: false, perfil: { ...trialAtivo, has_paid: false, trial_credits_used: 2 }, ideia: IDEIA, agoraMs: NOW }) !== null)
mutanteLib('segundo toque ignora a volta', "  if (input.voltou === true) return 'pular_voltou'\n", '', (M) => M.decidirSegundoToque24h({ cartaRapidaEm: 't', voltou: true }) !== 'pular_voltou')
mutanteLib('garantia mensal digitada (8) em vez de lida', 'export const MONTHLY_MONEY_BACK_DAYS: number = MONTHLY_REFUND_DAYS', 'export const MONTHLY_MONEY_BACK_DAYS: number = 8', (M) => M.garantiaDaSessao(sessao('x')).dias !== real.cp.MONTHLY_REFUND_DAYS)
{ // reancorado KINEO-LEVA2-1510 — mexer na fonte única (MONTHLY_REFUND_DAYS 7 → 10) muda a carta junto: prova de que ela LÊ
  const de = 'export const MONTHLY_REFUND_DAYS = 7\n'
  const n = ler('lib/checkoutPricing.ts').split(de).length - 1
  check('mutante aplicado (fonte única 7 → 10)', n === 1)
  if (n === 1) {
    const mods = carregar((rel, s) => (rel === 'lib/checkoutPricing.ts' ? s.replace(/\r\n/g, '\n').split(de).join('export const MONTHLY_REFUND_DAYS = 10\n') : s))
    check('mutante MORTO (fonte única 7 → 10: a carta passa a dizer 10 dias)', mods.cp.MONTHLY_REFUND_DAYS === 10 && mods.A.garantiaDaSessao(sessao('x')).dias === 10 && mods.A.MONTHLY_MONEY_BACK_DAYS === 10)
  }
}
mutanteLib('período desconhecido vira mensal', "  if (md.billing === 'monthly') return", "  if (md.billing !== 'annual') return", (M) => M.garantiaDaSessao(sessao('x', { billing: undefined })) !== null)

console.log(falhas.length ? `\n🔴 FALHAS:\n${falhas.map((f) => `   ✗ ${f}`).join('\n')}` : '')
console.log(`\n${falhas.length === 0 ? '✅' : '🔴'} abandono-rapido-1610: ${ok}/${ok + falhas.length}`)
process.exit(falhas.length === 0 ? 0 : 1)
