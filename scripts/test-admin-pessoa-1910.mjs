// KINEO-ADMIN-PESSOA-1910 — guardião da TELA DA PESSOA do /admin (/admin/people/<id>): "clicar no nome da pessoa e abrir uma
// tela somente da pessoa" (fundador 19/10).
// OFFLINE: executa o código real (página, rota, leitura, regras e JSX) contra um banco FALSO em memória. Nenhuma credencial,
// rede, .env ou escrita. Provas:
//   P1  portão: página e rota devolvem 403 a quem não é ADMIN sem criar o cliente service role nem ler nada; admin lê. O portão
//       vem ANTES do serviceClient() no código das duas; a rota só tem GET.
//   P2  só leitura: o código de leitura não tem insert/update/upsert/delete/rpc/writeServerEvent nem o juiz que grava nota
//       (listFastCoherence); rodando, o banco falso não recebe nenhuma escrita.
//   P3  leitura magra: toda consulta é da pessoa (user_id, ou o afiliado/ids dela), com teto < 1.000 ou count head; o único
//       .in() é de nomes de evento (lista fixa) ou de ≤ 60 ids; nada da outra pessoa vaza.
//   P4  tela: as 6 seções NESTA ordem (cabeçalho, afiliado, créditos, compras, tudo que fez, vídeos); vídeo só baixa ao tocar
//       (preload="none"); nota de coerência (95 = perfeito ★), "sem nota", juiz do anúncio; plano ANUAL lido da cobrança.
//   P5  créditos: cada concessão com motivo e quem deu; trial pelo evento (sem contar duas vezes); débito estornado não é uso.
//   P6  compras: checkout contado por sessão real (attempted+started da mesma aba = 1; sessão paga fora; sem sessão = fora).
//   P7  links: o e-mail vira link da tela em /admin/people, painel ao vivo (WHO), overview, coerência, clientes, leads,
//       pagantes e CEO; o "escrever e-mail" virou o ✉ ao lado.
//   P8  afiliado: é afiliado (código, cliques, cadastros, comissões) e veio de link de afiliado (de quem).
//   P9  linha do tempo por dia (Brasília), sem page_view, com o erro de geração e repetidos juntos (×N).
//   M   mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const require = createRequire(path.join(ROOT, 'package.json'))
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const tenta = async (fn) => { try { return !!(await fn()) } catch (e) { if (process.env.DEBUG_PESSOA) console.log('       (lançou: ' + (e && e.stack) + ')'); return false } }

const F = {
  regras: 'lib/admin/pessoaTelaRegras.ts',
  leitura: 'lib/admin/pessoaTela.ts',
  pagina: 'app/admin/people/[id]/page.tsx',
  rota: 'app/api/admin/people/[id]/route.ts',
  tela: 'components/admin/PessoaTela.tsx',
  link: 'components/admin/PessoaLink.tsx',
  people: 'app/admin/people/PeopleClient.tsx',
  peopleApi: 'app/api/admin/people/route.ts',
  live: 'components/LiveNowPanel.tsx',
  overview: 'app/admin/overview/page.tsx',
  coerencia: 'app/admin/coerencia/page.tsx',
  clientes: 'components/admin/ClientesJornada.tsx',
  leads: 'app/admin/leads/LeadsClient.tsx',
  paying: 'app/admin/paying/page.tsx',
  ceo: 'app/(dashboard)/admin/ceo/CeoClient.tsx',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, rd(v)]))
const ADMINS = new Set([...rd('app/api/admin/_shared/db.ts').split('export const ADMIN_EMAILS = new Set([')[1].split('])')[0].matchAll(/'([^']+)'/g)].map((m) => m[1].toLowerCase()))
const VERSAO = 'versao-vigente'

// ═══ banco FALSO: os filtros do supabase-js usados aqui, teto silencioso de 1000, toda escrita registrada e recusada ═══
function banco(tabelas) {
  const log = { chamadas: [], escritas: [] }
  const valor = (r, k) => r[k]
  const projetar = (r, cols) => {
    const o = {}
    for (const tok of cols.split(',').map((s) => s.trim()).filter(Boolean)) o[tok] = r[tok]
    return o
  }
  const escrever = (nome) => () => { log.escritas.push(nome); throw new Error('escrita proibida: ' + nome) }
  return {
    log,
    rpc: escrever('rpc'),
    from(tabela) {
      const ch = { tabela, ops: [] }
      log.chamadas.push(ch)
      const filtros = []
      const ords = []
      let lim = null, cols = '*', opts = {}, um = false
      const q = {
        select(c, o = {}) { cols = c; opts = o; ch.ops.push(['select', c, o]); return q },
        insert: escrever('insert'), update: escrever('update'), upsert: escrever('upsert'), delete: escrever('delete'),
        eq(k, v) { ch.ops.push(['eq', k, v]); filtros.push((r) => valor(r, k) === v); return q },
        in(k, vs) { ch.ops.push(['in', k, vs.length]); filtros.push((r) => vs.includes(valor(r, k))); return q },
        or(expr) {
          ch.ops.push(['or', expr])
          const m = /^quality_mode\.is\.null,quality_mode\.not\.in\.\(([^)]*)\)$/.exec(expr)
          if (!m) throw new Error('or sem suporte: ' + expr)
          const fora = m[1].split(',')
          filtros.push((r) => r.quality_mode == null || !fora.includes(r.quality_mode))
          return q
        },
        order(k, { ascending = true } = {}) { ords.push([k, ascending]); return q },
        limit(n) { ch.ops.push(['limit', n]); lim = n; return q },
        maybeSingle() { um = true; return q },
        then(res, rej) {
          return Promise.resolve().then(() => {
            let rows = (tabelas[tabela] ?? []).filter((r) => filtros.every((f) => f(r)))
            rows = rows.slice().sort((a, b) => { for (const [k, asc] of ords) { const x = valor(a, k), y = valor(b, k); if (x < y) return asc ? -1 : 1; if (x > y) return asc ? 1 : -1 } return 0 })
            const count = rows.length
            rows = rows.slice(0, Math.min(lim ?? 1000, 1000))
            if (opts.head) return { data: null, count, error: null }
            const data = rows.map((r) => (cols === '*' ? { ...r } : projetar(r, cols)))
            if (um) return { data: data[0] ?? null, error: null }
            return { data, count: opts.count ? count : null, error: null }
          }).then(res, rej)
        },
      }
      return q
    },
  }
}

// ═══ fixture: a pessoa u-1 (paga, virou anual, é afiliada E veio de afiliado) e outra pessoa u-2 que não pode vazar ═══
const AGORA = new Date('2026-10-19T18:00:00Z')
const t = (dia, hh = 12, mm = 0) => new Date(Date.UTC(2026, 9, dia, hh, mm)).toISOString()
function fixture() {
  const prof = (id, email, extra = {}) => ({ id, email, name: null, plan: 'free', has_paid: false, video_credits: 0, created_at: t(10, 9), signup_country: null, last_country: null, signup_utm_source: null, signup_utm_medium: null, signup_utm_campaign: null, signup_referrer: null, utm_source: null, signup_surface: null, gclid: null, trial_status: null, trial_credits_granted: null, trial_credits_used: null, trial_ends_at: null, plan_expires_at: null, referred_by: null, affiliate_id: null, ...extra })
  const profiles = [
    prof('u-1', 'ana@exemplo.com', { name: 'Ana', plan: 'starter', has_paid: true, video_credits: 40, signup_country: 'BR', last_country: 'PT', signup_utm_source: 'chatgpt', trial_status: 'downgraded', trial_credits_granted: 10, trial_credits_used: 10 }),
    prof('u-2', 'outra@exemplo.com', { video_credits: 5, trial_credits_granted: 10 }),
    prof('u-3', 'afiliado.pedro@exemplo.com'),
  ]
  let n = 0
  const ev = (user_id, name, created_at, metadata = {}, session_id = null) => ({ id: `e${++n}`, user_id, name, created_at, session_id, path: '/studio', metadata })
  const events = [
    ev('u-1', 'organic_signup_completed', t(10, 9, 1), { utm_source: 'chatgpt' }, 's-0'),
    ev('u-1', 'trial_credits_granted', t(10, 9, 2), { credits: 10, variant: '7d' }),
    ev('u-1', 'page_view', t(10, 9, 3), {}, 's-0'),
    ev('u-1', 'mrr_idea_entered', t(10, 9, 4), { device: 'mobile' }, 's-0'),
    ev('u-1', 'mrr_idea_entered', t(10, 9, 5), {}, 's-0'),
    ev('u-1', 'mrr_idea_entered', t(10, 9, 6), {}, 's-0'),
    ev('u-1', 'generation_stage_error', t(10, 9, 8), { error: 'Motor lento agora — nada foi cobrado.' }, 's-0'),
    ev('u-1', 'checkout_attempted', t(11, 14), { tier: 'starter', billing: 'monthly' }, 's-1'),
    ev('u-1', 'checkout_started', t(11, 14, 1), { tier: 'starter', billing: 'monthly', stripe_session_id: 'cs_0' }, 's-1'),
    ev('u-1', 'checkout_started', t(11, 15), { tier: 'starter' }, null), // sem sessão nenhuma: não prova gente
    ev('u-1', 'checkout_attempted', t(12, 10), { tier: 'starter', billing: 'monthly' }, 's-2'),
    ev('u-1', 'checkout_started', t(12, 10, 1), { tier: 'starter', billing: 'monthly', stripe_session_id: 'cs_1' }, 's-2'),
    ev('u-1', 'payment_success', t(12, 10, 3), { tier: 'starter', billing: 'monthly', amount_total: 990, currency: 'usd', credits_granted: 60, stripe_session_id: 'cs_1', checkout_mode: 'subscription' }, null),
    ev('u-1', 'plan_switched_to_annual', t(14, 8), { tier: 'starter', annual_minor: 7100, amount_charged_minor: 6785, currency: 'usd', credits_granted: true, credits_before: 2, credits_after: 60, invoice_status: 'paid', switched_by: 'josephsskaf@gmail.com' }),
    ev('u-1', 'admin_credits_granted', t(15, 11), { amount: 25, reason: 'Desculpa: filme saiu com defeito nosso', granted_by: 'josephsskaf@gmail.com' }),
    ev('u-1', 'checkout_payment_failed', t(16, 3), { tier: 'starter', is_renewal: true, reason_category: 'insufficient_funds', amount_minor: 990, currency: 'usd' }),
    ev('u-1', 'film_feedback', t(13, 9), { verdict: 'up' }, 'v-1'),
    ev('u-1', 'generate_started', t(13, 8, 0), { quality: 'cinematic_ai' }, 's-3'),
    ev('u-1', 'video_generation_started', t(13, 8, 0), { quality: 'cinematic_ai' }, 's-3'), // o mesmo fato por dois nomes
    ev('u-1', 'affiliate_signup_attribution_result', t(10, 9, 1), { outcome: 'attributed', affiliate_id: 'af-2', referrer_host: 'youtube.com' }),
    ev('u-1', 'fast_coherence', t(13, 10), { video_id: 'v-1', score: 96, verdict: 'coherent', version: VERSAO }),
    ev('u-1', 'fast_coherence', t(13, 10, 1), { video_id: 'v-2', score: 40, verdict: 'off', version: 'versao-velha' }),
    ev('u-1', 'ads_v2_product_locked', t(17, 10), { order_id: 'ad-1', idx: 1, verdict: { ok: true } }),
    ev('u-1', 'ads_v2_product_locked', t(17, 10, 1), { order_id: 'ad-1', idx: 2, verdict: { ok: false, fails: ['label'] } }),
    ev('u-1', 'ads_v2_product_locked', t(17, 10, 2), { order_id: 'ad-1', idx: 3, verdict: { ok: true } }),
    // a outra pessoa: nada disto pode aparecer na tela da u-1
    ev('u-2', 'payment_success', t(12, 11), { tier: 'pro', amount_total: 3990, currency: 'usd', credits_granted: 320, stripe_session_id: 'cs_9x' }),
    ev('u-2', 'admin_credits_granted', t(12, 12), { amount: 999, reason: 'NAO-PODE-VAZAR', granted_by: 'x' }),
  ]
  const credit_debits = [
    { render_id: 'cinematic-aaa', user_id: 'u-1', kind: 'video', amount: 15, created_at: t(13, 8), refunded_at: null },
    { render_id: 'cinematic-bbb', user_id: 'u-1', kind: 'video', amount: 15, created_at: t(13, 7), refunded_at: t(13, 7, 30) },
    { render_id: 'adsv2-ccc', user_id: 'u-1', kind: 'video', amount: 41, created_at: t(17, 9), refunded_at: null },
    { render_id: 'clips-ddd', user_id: 'u-1', kind: 'video', amount: 5, created_at: t(18, 9), refunded_at: null },
    { render_id: 'cinematic-zzz', user_id: 'u-2', kind: 'video', amount: 777, created_at: t(13, 8), refunded_at: null },
  ]
  const videos = [
    { id: 'v-1', user_id: 'u-1', created_at: t(13, 9), quality_mode: 'cinematic_ai', duration: 39, credits_used: 15, status: 'completed', video_url: 'https://x/v1.mp4', thumbnail_url: 'https://x/v1.jpg', topic: 'A cidade que sumiu' },
    { id: 'v-2', user_id: 'u-1', created_at: t(13, 11), quality_mode: 'fast', duration: 60, credits_used: 5, status: 'completed', video_url: 'https://x/v2.mp4', thumbnail_url: null, topic: 'Outro filme' },
    { id: 'v-ad', user_id: 'u-1', created_at: t(17, 11), quality_mode: 'ads_v2', duration: 15, credits_used: 41, status: 'completed', video_url: 'https://x/ad.mp4', thumbnail_url: null, topic: 'ad' },
    { id: 'v-clip', user_id: 'u-1', created_at: t(18, 10), quality_mode: 'clip', duration: 5, credits_used: 5, status: 'completed', video_url: 'https://x/clip.mp4', thumbnail_url: null, topic: 'clip' },
    { id: 'v-outra', user_id: 'u-2', created_at: t(13, 9), quality_mode: 'fast', duration: 30, credits_used: 5, status: 'completed', video_url: 'https://x/NAO-PODE-VAZAR.mp4', thumbnail_url: null, topic: 'NAO-PODE-VAZAR' },
  ]
  const ads_v2_orders = [
    { id: 'ad-1', user_id: 'u-1', created_at: t(17, 9), status: 'delivered', tier: 'comercial', seconds: 15, sector: 'restaurante', card_url: null, video_id: 'v-ad', error: null, credits_charged: 41, billing_ref: 'adsv2-ccc' },
    { id: 'ad-2', user_id: 'u-1', created_at: t(17, 8), status: 'failed', tier: 'comercial', seconds: 15, sector: 'restaurante', card_url: null, video_id: null, error: 'motor recusou a foto', credits_charged: 41, billing_ref: 'adsv2-eee' },
  ]
  const clips = [{ id: 'c-1', user_id: 'u-1', created_at: t(18, 9), engine: 'hug', model: null, mode: 'effect', seconds: 5, credits: 5, credits_refunded: 0, status: 'completed', video_url: 'https://x/c1.mp4', prompt: 'abraço', failure_reason: null }]
  const images = [{ id: 'i-1', user_id: 'u-1', created_at: t(18, 11), model: 'flux', url: 'https://x/i1.png', upscaled_url: null }]
  const audios = [{ id: 'a-1', user_id: 'u-1', created_at: t(18, 12), model: 'minimax', url: 'https://x/a1.mp3', duration_ms: 12000 }]
  const affiliates = [
    { id: 'af-1', user_id: 'u-1', email: 'ana@exemplo.com', name: 'Ana', code: 'ANA', commission_rate: 0.4, coupon_code: 'ANA20', status: 'active', partner_type: 'creator', created_at: t(14, 9) },
    { id: 'af-2', user_id: 'u-3', email: 'afiliado.pedro@exemplo.com', name: 'Pedro Afiliado', code: 'PEDRO', commission_rate: 0.3, coupon_code: null, status: 'active', partner_type: 'agency', created_at: t(1, 9) },
  ]
  const affiliate_clicks = [1, 2, 3].map((i) => ({ id: `ck${i}`, affiliate_id: 'af-1', created_at: t(15, i) })).concat([{ id: 'ck9', affiliate_id: 'af-2', created_at: t(9, 1) }])
  const affiliate_referrals = [
    { id: 'r1', affiliate_id: 'af-1', referred_user_id: 'u-9', email: 'trazido@exemplo.com', status: 'signed_up', first_touch_at: t(16, 9), converted_at: null },
    { id: 'r2', affiliate_id: 'af-2', referred_user_id: 'u-1', email: 'ana@exemplo.com', status: 'converted', first_touch_at: t(10, 9), converted_at: t(12, 10) },
  ]
  const affiliate_commissions = [{ id: 'cm1', affiliate_id: 'af-1', commission_amount: 500, currency: 'usd', status: 'paid' }]
  const courtesy_grants = []
  const checkout_abandoned = [
    { id: 'ab0', user_id: 'u-1', expired_at: t(12, 14), tier: 'starter', amount_total: 990, currency: 'usd', stripe_session_id: 'cs_0' },
    { id: 'ab9', user_id: 'u-1', expired_at: t(16, 14), tier: 'basic', amount_total: 1990, currency: 'usd', stripe_session_id: 'cs_77' },
  ]
  return { profiles, events, credit_debits, videos, ads_v2_orders, clips, images, audios, affiliates, affiliate_clicks, affiliate_referrals, affiliate_commissions, courtesy_grants, checkout_abandoned, done_for_you_orders: [] }
}

// ═══ carregadores ═══
const MOCK_MRR = {
  MRR_PAID_EVENT_NAMES: ['payment_success', 'subscription_invoice_paid', 'plan_switched_to_annual'],
  isPayingPlan: (p) => ['starter', 'basic', 'pro', 'business', 'autopilot'].includes(String(p ?? '').toLowerCase()),
  planLabel: (p) => ({ starter: 'Starter', basic: 'Creator', pro: 'Studio' })[String(p ?? '').toLowerCase()] ?? 'Free',
  // a régua única de verdade é exercitada pelo guardião do MRR; aqui basta o contrato: a troca para o anual marca 'annual'
  paidMonthlyUsdByUser: (evs) => { const m = new Map(); for (const e of [...evs].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))) { if (e.name === 'plan_switched_to_annual') m.set(e.user_id, { billing: 'annual' }); else if (e.name === 'payment_success') m.set(e.user_id, { billing: e.metadata?.billing === 'annual' ? 'annual' : 'monthly' }) } return m },
}
function carregarLeitura(over = {}) {
  const fonte = (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : text)
  const load = createOfflineLoader({
    mocks: {
      '@/lib/fastCoherence': { FAST_COHERENCE_EVENT: 'fast_coherence', FAST_COHERENCE_VERSION: VERSAO },
      '@/lib/admin/fastCoherence': { ENGINE_LABEL: { fast: 'Kineo 1', cinematic_ai: 'Seedance 1.5' } },
      '@/app/api/admin/_shared/mrr': MOCK_MRR,
      '@/lib/internalAccounts': { isInternalEmail: (e) => /josephsskaf|@usekineo\.com/i.test(String(e ?? '')) },
    },
    source: fonte,
  })
  return { leitura: load(F.leitura), regras: load(F.regras), clientesRegras: load('lib/admin/clientesJornadaRegras.ts') }
}
function carregarTsx(rel, deps, over = {}) {
  const src = Object.hasOwn(over, rel) ? over[rel] : rd(rel)
  const code = ts.transpileModule(src, { fileName: rel, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, URLSearchParams, require: (id) => { if (id === 'react/jsx-runtime') return require('react/jsx-runtime'); if (id === 'react') return React; if (Object.hasOwn(deps, id)) return deps[id]; throw new Error('dependência inesperada: ' + id) } }, { filename: rel })
  return exports
}
const LinkFalso = { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { href, ...rest }, children) }
const semComentario = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

// ═══ as provas ═══
async function provas(over = {}) {
  const res = []
  const prova = async (nome, fn) => res.push([nome, await tenta(fn)])
  const S = (k) => (over[F[k]] ?? SRC[k])
  let L = null
  try { L = carregarLeitura(over) } catch (e) { if (process.env.DEBUG_PESSOA) console.log(e) }
  const rodar = async (chave = { id: 'u-1' }) => { const db = banco(fixture()); const tela = await L.leitura.carregarTelaPessoa(db, chave, AGORA); return { db, tela } }
  const renderTela = async () => {
    const { tela } = await rodar()
    const Tela = carregarTsx(F.tela, { 'next/link': LinkFalso, '@/lib/admin/clientesJornadaRegras': L.clientesRegras, '@/lib/admin/pessoaTelaRegras': L.regras }, over).default
    return { tela, html: renderToStaticMarkup(React.createElement(Tela, { t: tela })) }
  }

  // P1 — portão
  const paginaCom = (email, id = 'u-1') => {
    const espias = { service: 0, carregar: 0 }
    const deps = {
      'next/navigation': { notFound: () => { throw new Error('NEXT_NOT_FOUND') } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: email ? { email } : null } }) } }) },
      '@/app/api/admin/_shared/db': { isAdminEmail: (e) => ADMINS.has(String(e ?? '').trim().toLowerCase()), serviceClient: () => { espias.service++; return {} } },
      '@/lib/admin/pessoaTela': { carregarTelaPessoa: async () => { espias.carregar++; return { id } } },
      '@/lib/admin/pessoaTelaRegras': L.regras,
      '@/components/admin/PessoaTela': { __esModule: true, default: () => React.createElement('div', { 'data-tela': '1' }) },
    }
    return { mod: carregarTsx(F.pagina, deps, over), espias }
  }
  await prova('P1a página: não-admin = 403 sem service role e sem leitura; admin lê', async () => {
    for (const email of [null, 'cliente@exemplo.com', 'josephsskaf+outro@gmail.com']) {
      const { mod, espias } = paginaCom(email)
      const html = renderToStaticMarkup(await mod.default({ params: { id: 'u-1' } }))
      if (!html.includes('403') || espias.service !== 0 || espias.carregar !== 0) return false
    }
    const a = paginaCom([...ADMINS][0])
    const html = renderToStaticMarkup(await a.mod.default({ params: { id: '6f38e3f5-5ed8-4a22-8ac9-a8b2ad5dec94' } }))
    return html.includes('data-tela') && a.espias.service === 1 && a.espias.carregar === 1
  })
  const rotaCom = (email) => {
    const espias = { service: 0, carregar: 0 }
    const deps = {
      'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: email ? { email } : null } }) } }) },
      '../../_shared/db': { isAdminEmail: (e) => ADMINS.has(String(e ?? '').trim().toLowerCase()), serviceClient: () => { espias.service++; return {} } },
      '@/lib/admin/pessoaTela': { carregarTelaPessoa: async () => { espias.carregar++; return { id: 'u-1' } } },
      '@/lib/admin/pessoaTelaRegras': L.regras,
    }
    return { mod: carregarTsx(F.rota, deps, over), espias }
  }
  await prova('P1b rota: não-admin = 403 sem service role; admin recebe a tela; só GET', async () => {
    const n = rotaCom('cliente@exemplo.com')
    const r = await n.mod.GET({}, { params: { id: 'ana@exemplo.com' } })
    const a = rotaCom([...ADMINS][0])
    const r2 = await a.mod.GET({}, { params: { id: 'ana%40exemplo.com' } })
    const r3 = await a.mod.GET({}, { params: { id: "x' or 1=1" } })
    const metodos = Object.keys(a.mod).filter((k) => /^(GET|POST|PUT|PATCH|DELETE)$/.test(k))
    return r.status === 403 && n.espias.service === 0 && n.espias.carregar === 0 && r2.status === 200 && r2.body.id === 'u-1' && r3.status === 400 && metodos.join() === 'GET'
  })
  await prova('P1c portão vem antes do serviceClient() na página e na rota', () => {
    for (const k of ['pagina', 'rota']) {
      const s = S(k)
      const g = s.search(/isAdminEmail\((email|user\.email)\)/), c = s.indexOf('serviceClient()'), l = s.indexOf('carregarTelaPessoa(admin')
      if (!(g > 0 && c > g && l > c)) return false
    }
    return true
  })

  // P2 — só leitura
  await prova('P2a o código de leitura não grava nem julga (sem insert/update/upsert/delete/rpc/writeServerEvent/listFastCoherence)', () => {
    const s = semComentario(S('leitura')) + semComentario(S('regras'))
    return !/\.(insert|update|upsert|delete|rpc)\(/.test(s) && !/writeServerEvent|listFastCoherence|readUnpaginated|service_role_key/i.test(s)
  })
  await prova('P2b rodando: nenhuma escrita no banco', async () => { const { db, tela } = await rodar(); return db.log.escritas.length === 0 && tela && tela.id === 'u-1' })

  // P3 — leitura magra e da pessoa
  await prova('P3a toda consulta é da pessoa, com teto < 1000 (ou count head); .in() só de nomes/ids pequenos; e-mail também abre', async () => {
    const { db } = await rodar({ email: 'ana@exemplo.com' })
    const dono = (c) => c.ops.some((o) => o[0] === 'eq' && ['user_id', 'id', 'email', 'affiliate_id', 'referred_user_id'].includes(o[1])) || c.ops.some((o) => o[0] === 'in' && o[1] === 'id')
    const semDono = db.log.chamadas.filter((c) => !dono(c))
    const semTeto = db.log.chamadas.filter((c) => !c.ops.some((o) => o[0] === 'limit' && o[2] === undefined && o[1] < 1000) && !c.ops.some((o) => o[0] === 'select' && o[2]?.head))
    const ins = db.log.chamadas.flatMap((c) => c.ops.filter((o) => o[0] === 'in').map((o) => [c.tabela, o[1], o[2]]))
    const insOk = ins.every(([tb, k, n]) => (k === 'name' && tb === 'events' && n <= 60) || (k === 'id' && n <= L.regras.ANUNCIOS_MAX))
    const eventosSemUser = db.log.chamadas.filter((c) => c.tabela === 'events' && !c.ops.some((o) => o[0] === 'eq' && o[1] === 'user_id'))
    const tetos = [L.regras.EVENTOS_DINHEIRO_MAX, L.regras.EVENTOS_LINHA_MAX, L.regras.EVENTOS_RECENTES_MAX, L.regras.DEBITOS_MAX, L.regras.VIDEOS_MAX, L.regras.NOTAS_MAX].every((x) => x < 1000)
    return semDono.length === 0 && semTeto.length === 0 && insOk && eventosSemUser.length === 0 && tetos && db.log.chamadas.length >= 15
  })
  await prova('P3b nada da outra pessoa vaza (vídeo, débito, concessão, compra)', async () => {
    const { html, tela } = await renderTela()
    return !html.includes('NAO-PODE-VAZAR') && !JSON.stringify(tela).includes('NAO-PODE-VAZAR') && !tela.creditos.debitos.some((d) => d.renderId === 'cinematic-zzz') && !html.includes('777')
  })
  await prova('P3c chave da URL: uuid ou e-mail; qualquer outra coisa é inválida', () => {
    const k = L.regras.lerChavePessoa
    return k('6F38E3F5-5ED8-4A22-8AC9-A8B2AD5DEC94')?.id === '6f38e3f5-5ed8-4a22-8ac9-a8b2ad5dec94' && k('Ana%40Exemplo.com')?.email === 'ana@exemplo.com' && k('drop table') === null && k('') === null && k('%%') === null
  })

  // P4 — a tela
  await prova('P4a as 6 seções presentes e NESTA ordem', async () => {
    const { html } = await renderTela()
    const ordem = ['pessoa-cabecalho', 'pessoa-afiliado', 'pessoa-creditos', 'pessoa-compras', 'pessoa-linha', 'pessoa-videos'].map((s) => html.indexOf(`data-kineo="${s}"`))
    return ordem.every((i) => i > 0) && ordem.every((i, j) => j === 0 || i > ordem[j - 1])
  })
  await prova('P4b cabeçalho: e-mail, nome, plano ANUAL (da cobrança), pagante, país com bandeira e último país, origem, dispositivo, ✉', async () => {
    const { html } = await renderTela()
    return html.includes('ana@exemplo.com') && html.includes('Ana') && /Starter · ANUAL/.test(html) && html.includes('>pagante<') && html.includes('🇧🇷 BR') && html.includes('🇵🇹 PT') && html.includes('chatgpt') && html.includes('celular') && /href="mailto:ana@exemplo\.com"/.test(html)
  })
  await prova('P4c vídeos: filmes sem anúncio/clipe na grade de filmes; vídeo só baixa ao tocar; nota 96 ★, versão velha = sem nota; 👍 da pessoa', async () => {
    const { html, tela } = await renderTela()
    const players = html.match(/<video[^>]*>/g) ?? []
    return tela.filmes.map((f) => f.id).join() === 'v-2,v-1' && players.length >= 4 && players.every((p) => /preload="none"/.test(p)) &&
      /nota 96 ★/.test(html) && tela.filmes.find((f) => f.id === 'v-2').nota === null && html.includes('sem nota') && html.includes('👍') && L.regras.NOTA_PERFEITA === 95
  })
  await prova('P4d anúncios: o vídeo entregue e o juiz do produto (2/3); o que falhou com a frase do erro; clipe, imagem e áudio', async () => {
    const { html, tela } = await renderTela()
    const ad1 = tela.anuncios.find((a) => a.id === 'ad-1')
    return ad1.url === 'https://x/ad.mp4' && ad1.status === 'entregue' && /juiz 2\/3/.test(html) && html.includes('motor recusou a foto') && tela.clipes.length === 1 && tela.imagens.length === 1 && tela.audios.length === 1 && /<audio[^>]*preload="none"/.test(html)
  })

  // P5 — créditos
  await prova('P5a ganhou = trial 10 + Starter 60 + anual 58 + bônus 25; usou = 15+41+5 (estornado fora); saldo 40', async () => {
    const { tela } = await rodar()
    const r = tela.creditos.resumo
    return r.ganhou === 153 && r.usou === 61 && r.estornado === 15 && r.saldo === 40 && r.diferenca === 40 - (153 - 61) &&
      tela.creditos.concessoes.filter((c) => c.tipo === 'trial').length === 1 && r.usouPorProduto.find((u) => u.produto === 'anuncio')?.creditos === 41
  })
  await prova('P5b cada concessão com motivo e quem deu; débito estornado marcado; filme estornado listado', async () => {
    const { html, tela } = await renderTela()
    const b = tela.creditos.concessoes.find((c) => c.tipo === 'bonus')
    return b.motivo === 'Desculpa: filme saiu com defeito nosso' && b.quem === 'josephsskaf@gmail.com' && html.includes('Desculpa: filme saiu com defeito nosso') && html.includes('por josephsskaf@gmail.com') &&
      tela.creditos.debitos.find((d) => d.renderId === 'cinematic-bbb').estornado && tela.filmesEstornados.map((d) => d.renderId).join() === 'cinematic-bbb'
  })
  await prova('P5c trial sem evento (conta antiga) entra pela coluna; com evento, não conta duas vezes', () => {
    const R = L.regras
    const sem = R.resumoCreditos([], [], { saldo: 3, trialGranted: 10, cadastroEm: t(1) })
    const com = R.resumoCreditos(R.concessoesDosEventos([{ name: 'trial_credits_granted', created_at: t(1), metadata: { credits: 10 } }]), [], { saldo: 3, trialGranted: 10, cadastroEm: t(1) })
    return sem.resumo.ganhou === 10 && com.resumo.ganhou === 10 && com.concessoes.length === 1
  })

  // P6 — compras
  await prova('P6a checkout por sessão real: s-1 (attempted+started) = 1, s-2 pago fora, sem sessão fora, cs_77 expirado = 1 → 2', async () => {
    const { tela } = await rodar()
    const c = tela.compras
    return c.checkoutsSemPagar === 2 && c.itens.filter((i) => i.tipo === 'checkout_aberto').length === 2 && c.pagamentos === 1 && c.falhasCartao === 1 && c.itens.some((i) => i.tipo === 'anual' && i.valor === 'US$ 67,85') && c.itens.some((i) => i.tipo === 'falha_cartao' && i.detalhe === 'saldo insuficiente')
  })

  // P7 — links nos lugares do painel
  await prova('P7a PessoaLink leva a /admin/people/<id> (e-mail também); ✉ é mailto com assunto', () => {
    const regras = L.regras
    const mod = carregarTsx(F.link, { 'next/link': LinkFalso, '@/lib/admin/pessoaTelaRegras': regras }, over)
    const a = renderToStaticMarkup(React.createElement(mod.PessoaLink, { id: 'u-1', email: 'ana@exemplo.com' }, 'ana'))
    const b = renderToStaticMarkup(React.createElement(mod.PessoaLink, { email: 'ana@exemplo.com' }, 'ana'))
    const c = renderToStaticMarkup(React.createElement(mod.EmailBotao, { email: 'ana@exemplo.com', assunto: 'Oi' }))
    return a.includes('href="/admin/people/u-1"') && b.includes('href="/admin/people/ana%40exemplo.com"') && c.includes('href="mailto:ana@exemplo.com?subject=Oi"')
  })
  await prova('P7b /admin/people: e-mail com o id da pessoa vira link; a API manda o id', () => {
    const s = S('people'), api = S('peopleApi')
    return (s.match(/<Mono key="e" text=\{p\.email\} id=\{p\.id\}/g) ?? []).length === 2 && s.includes('{id || text ? <PessoaLink id={id} email={text}') &&/<EmailBotao email=\{text\} \/>/.test(s) &&
      /^\s+id: string$/m.test(api) && /^\s+id: p\.id, \/\/ KINEO-ADMIN-PESSOA-1910$/m.test(api)
  })
  await prova('P7c painel ao vivo (WHO): o e-mail abre a pessoa e o mailto com assunto virou o ✉ ao lado', () => {
    const s = S('live')
    return /<PessoaLink id=\{v\.user_id\} email=\{v\.email\}/.test(s) && /<EmailBotao email=\{v\.email\} assunto=\{mailtoSubjectFor\(v\)\}/.test(s) && !/href=\{mailtoFor\(v\)\}/.test(s)
  })
  await prova('P7d overview (3 tabelas), coerência, clientes, leads, pagantes e CEO com o link da pessoa', () => {
    return (S('overview').match(/<PessoaLink id=\{(t|e)\.id\}>\{(t|e)\.email\}<\/PessoaLink>/g) ?? []).length === 3 &&
      /<PessoaLink id=\{r\.user_id\}/.test(S('coerencia')) && /<PessoaLink id=\{c\.id\}>/.test(S('clientes')) &&
      /<PessoaLink email=\{text\}/.test(S('leads')) && /<EmailBotao email=\{text\} assunto=\{mailtoSubject\}/.test(S('leads')) &&
      /<PessoaLink email=\{r\.email\}>\{r\.email\}<\/PessoaLink>/.test(S('paying')) && /<PessoaLink email=\{u\.email\}>\{u\.email\}<\/PessoaLink>/.test(S('ceo'))
  })

  // P8 — afiliado
  await prova('P8a é afiliado: código, 3 cliques, 1 cadastro, comissão paga; veio do afiliado PEDRO', async () => {
    const { tela, html } = await renderTela()
    const a = tela.afiliado[0]
    const v = tela.veioDeAfiliado
    return tela.afiliado.length === 1 && a.codigo === 'ANA' && a.cliques === 3 && a.cadastrosTotal === 1 && a.comissoes.pagas === 500 &&
      v.length >= 1 && v[0].afiliado?.codigo === 'PEDRO' && /affiliate_referrals/.test(v[0].registro) && html.includes('Pedro Afiliado') && html.includes('é afiliado') && html.includes('veio de afiliado')
  })

  // P9 — linha do tempo
  await prova('P9a por dia (Brasília), sem page_view, erro com a frase, ideias repetidas ×3, pagamento em destaque', async () => {
    const { tela, html } = await renderTela()
    const d10 = tela.linha.find((d) => d.dia === '2026-10-10')
    return tela.linha[0].dia > tela.linha[tela.linha.length - 1].dia && d10 && d10.itens.some((i) => i.rotulo === 'Escreveu uma ideia ×3') && d10.outras === 0 && tela.linha.find((d) => d.dia === '2026-10-13').itens.filter((i) => i.rotulo.startsWith('Começou um filme')).map((i) => i.rotulo).join() === 'Começou um filme' && !html.includes('page_view') &&
      d10.itens.some((i) => i.tom === 'erro' && i.detalhe === 'Motor lento agora — nada foi cobrado.') && tela.linha.some((d) => d.itens.some((i) => i.rotulo.startsWith('PAGOU')))
  })
  return res
}

console.log('── provas (código real)')
const base = await provas()
for (const [n, v] of base) ok(v, n)

console.log('\n── mutantes (cada um provado aplicado; cada um deixa ao menos uma prova vermelha)')
const trocar = (k, de, para) => { const src = SRC[k]; if (src.split(de).length !== 2) throw new Error('âncora não única: ' + de.slice(0, 70)); const o = src.split(de).join(para); if (o === src) throw new Error('não aplicou'); return { [F[k]]: o } }
const MUTANTES = [
  ['página sem o portão do admin', () => trocar('pagina', "  if (!user || !isAdminEmail(email)) {\n    return <div style={{ padding: 40, color: 'var(--text2)' }}>403</div>\n  }\n", '')],
  ['rota sem o portão do admin', () => trocar('rota', "    if (!user || !isAdminEmail(user.email)) {\n      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })\n    }\n", '')],
  ['a leitura grava', () => trocar('leitura', '  const uid = p.id\n', "  const uid = p.id\n  await admin.from('events').insert({ name: 'admin_pessoa_aberta' })\n")],
  ['eventos recentes sem teto', () => trocar('leitura', ".eq('user_id', uid).order('created_at', { ascending: false }).limit(EVENTOS_RECENTES_MAX),", ".eq('user_id', uid).order('created_at', { ascending: false }),")],
  ['débitos de todo mundo', () => trocar('leitura', ".select('render_id, kind, amount, created_at, refunded_at').eq('user_id', uid)", ".select('render_id, kind, amount, created_at, refunded_at')")],
  ['estorno contado como uso', () => trocar('regras', '  const usados = debitos.filter((d) => !d.estornado)', '  const usados = debitos.filter(() => true)')],
  ['trial contado duas vezes', () => trocar('regras', "  if (!lista.some((c) => c.tipo === 'trial') && (perfil.trialGranted ?? 0) > 0) {", '  if ((perfil.trialGranted ?? 0) > 0) {')],
  ['checkout contado por evento (não por sessão)', () => trocar('regras', '        if (!checkoutsVistos.has(chave)) {', '        if (true) {')],
  ['checkout sem sessão conta', () => trocar('regras', "  const chaveDoCheckout = (e: EventoPessoa): string | null => (e.session_id ? `sessao:${e.session_id}` : str(md(e).stripe_session_id))", "  const chaveDoCheckout = (e: EventoPessoa): string | null => (e.session_id ? `sessao:${e.session_id}` : str(md(e).stripe_session_id) ?? `evento:${e.created_at}`)")],
  ['vídeo baixa sem tocar', () => trocar('tela', '<video data-kineo="player" src={url} poster={thumb ?? undefined} preload="none"', '<video data-kineo="player" src={url} poster={thumb ?? undefined} preload="auto"')],
  ['nota de versão velha aceita', () => trocar('leitura', "    if (!vid || m.version !== FAST_COHERENCE_VERSION || notaPorVideo.has(vid)) continue", '    if (!vid || notaPorVideo.has(vid)) continue')],
  ['anúncio na grade de filmes', () => trocar('leitura', "      .or('quality_mode.is.null,quality_mode.not.in.(ads_v2,clip)')", "      .or('quality_mode.is.null,quality_mode.not.in.(clip)')")],
  ['seção de compras some', () => trocar('tela', '<Secao id="compras"', '<Secao id="compras-x"')],
  ['painel ao vivo volta ao mailto no e-mail', () => trocar('live', '<PessoaLink id={v.user_id} email={v.email}', '<PessoaLink id={null} email={null}')],
  ['/admin/people sem o id no e-mail', () => trocar('people', '{id || text ? <PessoaLink id={id} email={text}', '{false ? <PessoaLink id={id} email={text}')],
  ['linha do tempo com page_view', () => trocar('regras', "  return /(page_view|heartbeat|", "  return /(heartbeat|")],
  ['linha do tempo sem juntar repetidos', () => trocar('regras', "    if (ult && ult.rotulo === r.rotulo && ult.tom !== 'erro' && ult.tom !== 'dinheiro') {", '    if (false) {')],
  ['mesmo fato por dois nomes contado duas vezes', () => trocar('regras', '    if (ult && ult.rotulo === r.rotulo && ult.nome !== e.name && Math.abs(', '    if (false && ult && ult.rotulo === r.rotulo && ult.nome !== e.name && Math.abs(')],
  ['afiliado sem contar cliques', () => trocar('leitura', "      cliques: typeof cliquesR.count === 'number' ? cliquesR.count : null,", '      cliques: null,')],
  ['veio de afiliado ignorado', () => trocar('leitura', "    ...referidos.map((r) => ({ afiliado:", "    ...referidos.filter(() => false).map((r) => ({ afiliado:")],
  ['anual não lido da cobrança', () => trocar('leitura', '  const cobranca = pagos.get(uid)?.billing ?? null', '  const cobranca = null')],
]
for (const [nome, mk] of MUTANTES) {
  let over
  try { over = mk() } catch (e) { ok(false, `mutante "${nome}" aplicado — ${e.message}`); continue }
  const changed = Object.entries(over).some(([rel, txt]) => txt !== rd(rel))
  if (!changed) { ok(false, `mutante "${nome}" não mudou nada`); continue }
  const r = await provas(over)
  const vermelhas = r.filter(([, v]) => !v).map(([n]) => n.split(' ')[0])
  ok(vermelhas.length > 0, `mutante "${nome}" → vermelho (${vermelhas.join(' ') || 'nenhuma'})`)
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
