// KINEO-ADMIN-JORNADA-1510 — guardião da aba "Clientes" do /admin (a jornada dos últimos cadastros, 10 por página).
// OFFLINE: executa o código real (página, leitura, regras e JSX) contra um banco FALSO em memória. Nenhuma credencial, rede,
// .env ou escrita. Provas:
//   J1  só ADMIN: a página /admin/clientes devolve 403 a quem não está no ADMIN_EMAILS sem criar o cliente service role
//       nem ler nada; admin lê. /admin?aba=clientes vai para a aba ANTES de calcular a Visão geral; /admin sem aba segue
//       calculando a Visão geral com as abas em cima; quem não é admin não recebe nada.
//   J2  internas FORA por padrão, no BANCO (antes do range): régua ~* '(josephsskaf|josephskaf|josepghsskaf|@usekineo\.com)'
//       + INTERNAL_EXACT_EMAILS; "mostrar internas" traz e marca.
//   J3  10 por página, mais novo primeiro, count exato, range [0,9]/[10,19]; leitura por pessoa: user_id + janela + limite
//       < 1.000; nenhum .in() gigante (≤ 5 sessões, ≤ 12 vídeos); só leitura (insert/update/upsert/delete/rpc = falha).
//   J4  régua do funil com os eventos certos (nomes conferidos nos emissores do código), anônimo ligado conta, fatos de
//       tabela completam (cadastro, entrega, has_paid) e nada se infere de passo posterior.
//   J5  trilha de páginas: anônima ligada pela sessão do navegador, /api fora, repetidas juntas, query removida, 40 + ver mais.
//   J6  nota de coerência = evento fast_coherence da versão vigente, casado por metadata.video_id (a fonte do /admin/coerencia).
//   J7  filtros: fez (videos!inner), pagou (has_paid), nada (anti-join videos is null).
//   J8  tela: AdminShell com o atalho "Clientes" (1 item ativo), abas, 10 cartões, régua com 9 passos, ▶ em nova aba.
//   J9  o DESFAZ (scripts/test-support/desfaz-admin-jornada-1510.mjs) devolve o menu do admin e o /admin EXATAMENTE como o pai do
//       1º commit com a marca (os guardiões antigos que conferem byte a byte leem por ele); estrito: trecho mexido = lança.
//   M   mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { renderPage } from './preview-ux-complete.mjs'
import { execFileSync } from 'node:child_process'
import { semAdminJornada1510, ARQUIVOS_ADMIN_JORNADA_1510, MARCA_ADMIN_JORNADA_1510 } from './test-support/desfaz-admin-jornada-1510.mjs'

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
const tenta = async (fn) => { try { return !!(await fn()) } catch (e) { if (process.env.DEBUG_JORNADA) console.log('       (lançou: ' + (e && e.stack) + ')'); return false } }

const F = {
  regras: 'lib/admin/clientesJornadaRegras.ts',
  leitura: 'lib/admin/clientesJornada.ts',
  pagina: 'app/admin/clientes/page.tsx',
  home: 'app/admin/page.tsx',
  tela: 'components/admin/ClientesJornada.tsx',
  abas: 'components/admin/AdminAbas.tsx',
  shell: 'components/admin/AdminShell.tsx',
}
let PAI = null
try { const shas = execFileSync('git', ['log', '--no-merges', '--format=%H', `--grep=${MARCA_ADMIN_JORNADA_1510}`, 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim().split(String.fromCharCode(10)).filter(Boolean); PAI = shas.length ? execFileSync('git', ['rev-parse', `${shas[shas.length - 1]}~1`], { cwd: ROOT, encoding: 'utf8' }).trim() : null } catch { PAI = null }
console.log(`   pai do 1º commit da aba: ${PAI}`)
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, rd(v)]))
const VERSAO = /FAST_COHERENCE_VERSION = '([^']+)'/.exec(rd('lib/fastCoherence.ts'))[1]
const EVENTO_NOTA = /FAST_COHERENCE_EVENT = '([^']+)'/.exec(rd('lib/fastCoherence.ts'))[1]
const ADMINS = new Set([...rd('app/api/admin/_shared/db.ts').split('export const ADMIN_EMAILS = new Set([')[1].split('])')[0].matchAll(/'([^']+)'/g)].map((m) => m[1].toLowerCase()))

// ═══ banco FALSO: filtros reais do supabase-js usados aqui, teto silencioso de 1000, toda escrita registrada e recusada ═══
function banco(tabelas) {
  const log = { chamadas: [], escritas: [] }
  const temVideo = (p) => (tabelas.videos ?? []).some((v) => v.user_id === p.id)
  const valor = (r, expr) => {
    const m = /^(\w+)->>?(\w+)$/.exec(expr)
    if (m) { const v = r[m[1]]?.[m[2]]; return v == null ? null : expr.includes('->>') ? String(v) : v }
    return r[expr]
  }
  const projetar = (r, cols) => {
    if (cols === '*') return { ...r }
    const o = {}
    for (const tok of cols.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (tok.includes('(')) continue
      const [alias, expr] = tok.includes(':') ? tok.split(':') : [tok, tok]
      o[alias] = valor(r, expr)
    }
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
      let lim = null, rng = null, cols = '*', opts = {}
      const q = {
        select(c, o = {}) { cols = c; opts = o; ch.ops.push(['select', c, o]); return q },
        insert: escrever('insert'), update: escrever('update'), upsert: escrever('upsert'), delete: escrever('delete'),
        eq(k, v) { ch.ops.push(['eq', k, v]); filtros.push((r) => valor(r, k) === v); return q },
        is(k, v) { ch.ops.push(['is', k, v]); filtros.push(k === 'videos' ? (r) => !temVideo(r) : (r) => (valor(r, k) ?? null) === v); return q },
        in(k, vs) { ch.ops.push(['in', k, vs.length]); filtros.push((r) => vs.includes(valor(r, k))); return q },
        gte(k, v) { ch.ops.push(['gte', k, v]); filtros.push((r) => valor(r, k) >= v); return q },
        gt(k, v) { ch.ops.push(['gt', k, v]); filtros.push((r) => valor(r, k) > v); return q },
        lte(k, v) { ch.ops.push(['lte', k, v]); filtros.push((r) => valor(r, k) <= v); return q },
        not(k, op, v) {
          ch.ops.push(['not', k, op, v])
          if (op === 'ilike') { const re = new RegExp('^' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i'); filtros.push((r) => !re.test(String(valor(r, k) ?? ''))) }
          else if (op === 'in') { const lista = v.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/"/g, '').trim().toLowerCase()); filtros.push((r) => !lista.includes(String(valor(r, k) ?? '').toLowerCase())) }
          else throw new Error('not.' + op + ' sem suporte no banco falso')
          return q
        },
        or(expr) {
          ch.ops.push(['or', expr])
          const m = /^quality_mode\.is\.null,quality_mode\.not\.in\.\(([^)]*)\)$/.exec(expr)
          if (!m) throw new Error('or sem suporte: ' + expr)
          const fora = m[1].split(',')
          filtros.push((r) => r.quality_mode == null || !fora.includes(r.quality_mode))
          return q
        },
        order(k, { ascending = true } = {}) { ords.push([k, ascending]); return q },
        limit(n, o) { ch.ops.push(['limit', n, o ?? null]); if (!o?.referencedTable) lim = n; return q },
        range(a, b) { ch.ops.push(['range', a, b]); rng = [a, b]; return q },
        then(res, rej) {
          return Promise.resolve().then(() => {
            let rows = (tabelas[tabela] ?? []).filter((r) => filtros.every((f) => f(r)))
            if (/videos!inner/.test(cols)) rows = rows.filter(temVideo)
            rows = rows.slice().sort((a, b) => { for (const [k, asc] of ords) { const x = valor(a, k), y = valor(b, k); if (x < y) return asc ? -1 : 1; if (x > y) return asc ? 1 : -1 } return 0 })
            const count = rows.length
            if (rng) rows = rows.slice(rng[0], Math.min(rng[1] + 1, rng[0] + 1000))
            else rows = rows.slice(0, Math.min(lim ?? 1000, 1000))
            if (opts.head) return { data: null, count, error: null }
            return { data: rows.map((r) => projetar(r, cols)), count: opts.count ? count : null, error: null }
          }).then(res, rej)
        },
      }
      return q
    },
  }
}

// ═══ fixture: 12 clientes + 5 internos (os internos são os MAIS NOVOS — se a exclusão fosse depois do range, a página 1 viria curta) ═══
const AGORA = new Date('2026-10-15T23:00:00Z')
const h = (horas) => new Date(AGORA.getTime() - horas * 3_600_000).toISOString()
function fixture() {
  const profiles = []
  const add = (id, email, horas, extra = {}) => profiles.push({ id, email, created_at: h(horas), plan: 'free', has_paid: false, trial_status: null, video_credits: 10, signup_country: 'US', last_country: 'US', signup_utm_source: null, signup_utm_medium: null, signup_utm_campaign: null, signup_referrer: null, utm_source: null, signup_surface: null, gclid: null, ...extra })
  add('int-1', 'josephsskaf+teste9@gmail.com', 0.2)
  add('int-2', 'ana@usekineo.com', 0.3)
  add('int-3', 'victoriaskaf96@gmail.com', 0.4)
  add('int-4', 'josepghsskaf@gmail.com', 0.5)
  add('int-5', 'teste01@shortsforgeai.com', 0.6)
  for (let i = 0; i < 12; i++) add(`c${i}`, `cliente${i}@exemplo.com`, 1 + i * 5)
  profiles.find((p) => p.id === 'c0').signup_utm_source = 'ai_assistant_likely'
  Object.assign(profiles.find((p) => p.id === 'c1'), { has_paid: true, plan: 'creator', signup_utm_source: 'chatgpt' })
  const c0 = profiles.find((p) => p.id === 'c0').created_at
  const t = (minDepois) => new Date(Date.parse(c0) + minDepois * 60_000).toISOString()
  const ev = (user_id, name, quando, path, session_id, metadata = {}) => ({ id: `${name}-${quando}-${Math.random()}`, user_id, name, created_at: quando, path, session_id, metadata })
  const events = [
    // c0: chegou anônimo por uma página de conteúdo, cadastrou, abriu o Studio, gerou, filme pronto, baixou, viu planos, abriu checkout; NÃO pagou
    ev(null, 'landing_session_started', t(-20), '/vs/invideo?utm=x&email=a@b.com', 's-c0'),
    ev(null, 'pricing_view', t(-15), '/pricing', 's-c0'),
    ev(null, 'homepage_view', t(-15), '/pricing', 's-outra-pessoa'),
    ev('c0', 'mrr_studio_viewed', t(2), '/studio', 's-c0'),
    ev('c0', 'nav_item_clicked', t(3), '/studio', 's-c0'),
    ev('c0', 'mrr_idea_entered', t(4), '/studio', 's-c0'),
    ev('c0', 'mrr_generate_clicked', t(5), '/studio', 's-c0'),
    ev('c0', 'generate_started', t(5), '/api/generate-video-cinematic', null),
    ev('c0', 'generation_stage_error', t(6), '/api/compose', null, { error: 'compose_not_ok: motor ocupado' }),
    ev('c0', 'generate_completed', t(12), '/studio', 's-c0'),
    ev('c0', 'video_downloaded', t(14), '/library', 's-c0'),
    ev('c0', 'upgrade_modal_opened', t(16), '/library', 's-c0'),
    ev('c0', 'checkout_started', t(18), '/api/stripe/checkout', 's-c0'),
    ev('c0', 'generate_page_view', t(60 * 24 * 60), '/studio', 's-c0-tarde'), // fora da janela de 45 dias
  ]
  // c2: 8 sessões de navegador (o .in das sessões tem de parar em 5) e 50 páginas (40 + ver mais)
  const c2 = profiles.find((p) => p.id === 'c2').created_at
  for (let i = 0; i < 50; i++) events.push(ev('c2', 'nav_item_clicked', new Date(Date.parse(c2) + (i + 1) * 60_000).toISOString(), `/pagina-${i}`, `s-c2-${i % 8}`))
  const videos = [
    { id: 'v-c0-1', user_id: 'c0', created_at: t(12), quality_mode: 'cinematic_ai', duration: 35, credits_used: 15, status: 'completed', video_url: 'https://x/renders/c0/1.mp4', thumbnail_url: null, topic: 'A cidade que sumiu' },
    { id: 'v-c0-2', user_id: 'c0', created_at: t(30), quality_mode: 'fast', duration: 60, credits_used: 5, status: 'completed', video_url: 'https://x/renders/c0/2.mp4', thumbnail_url: 'https://x/t.jpg', topic: 'Outro' },
    { id: 'v-c0-ad', user_id: 'c0', created_at: t(40), quality_mode: 'ads_v2', duration: 15, credits_used: 30, status: 'completed', video_url: 'https://x/renders/c0/ad.mp4', thumbnail_url: null, topic: 'ad' },
    { id: 'v-c0-clip', user_id: 'c0', created_at: t(50), quality_mode: 'clip', duration: 5, credits_used: 3, status: 'completed', video_url: 'https://x/renders/c0/clip.mp4', thumbnail_url: null, topic: 'clip' },
    { id: 'v-c1-1', user_id: 'c1', created_at: h(5), quality_mode: null, duration: 30, credits_used: 5, status: 'completed', video_url: 'https://x/renders/c1/1.mp4', thumbnail_url: null, topic: 'sem motor' },
    { id: 'v-int-1', user_id: 'int-1', created_at: h(0.1), quality_mode: 'fast', duration: 30, credits_used: 5, status: 'completed', video_url: 'https://x/i.mp4', thumbnail_url: null, topic: 'casa' },
  ]
  events.push(ev('c0', EVENTO_NOTA, t(70), '/admin/coerencia', 'gen-1', { score: 82, verdict: 'coherent', version: VERSAO, video_id: 'v-c0-1' }))
  events.push(ev('c0', EVENTO_NOTA, t(71), '/admin/coerencia', 'gen-2', { score: 12, verdict: 'off', version: 'versao-velha', video_id: 'v-c0-2' }))
  const ads_v2_orders = [
    { id: 'ad-1', user_id: 'c0', created_at: t(35), status: 'delivered', tier: 'comercial', seconds: 15, sector: 'restaurante', card_url: 'https://x/card.jpg', video_id: 'v-c0-ad', error: null },
    { id: 'ad-2', user_id: 'c0', created_at: t(36), status: 'planned', tier: 'comercial', seconds: 15, sector: 'restaurante', card_url: null, video_id: null, error: null },
  ]
  const images = [{ id: 'i1', user_id: 'c0', created_at: t(80) }, { id: 'i2', user_id: 'c0', created_at: t(81) }]
  return { profiles, events, videos, ads_v2_orders, images, audios: [] }
}

// ═══ carregadores ═══
function carregarLeitura(over = {}) {
  const fonte = (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : text)
  const load = createOfflineLoader({
    mocks: {
      '@/lib/fastCoherence': { FAST_COHERENCE_EVENT: EVENTO_NOTA, FAST_COHERENCE_VERSION: VERSAO },
      '@/lib/admin/fastCoherence': { ENGINE_LABEL: { fast: 'Kineo 1', cinematic_ai: 'Seedance 1.5' } },
    },
    source: fonte,
  })
  return { leitura: load(F.leitura), regras: load(F.regras) }
}
// .tsx da página: transpila com JSX e roda com dependências injetadas (as de verdade onde importa)
function carregarTsx(rel, deps, over = {}) {
  const src = Object.hasOwn(over, rel) ? over[rel] : SRC[Object.keys(F).find((k) => F[k] === rel)]
  const code = ts.transpileModule(src, { fileName: rel, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, URLSearchParams, require: (id) => { if (id === 'react/jsx-runtime') return require('react/jsx-runtime'); if (Object.hasOwn(deps, id)) return deps[id]; throw new Error('dependência inesperada: ' + id) } }, { filename: rel })
  return exports
}

// ═══ as provas (rodam com a fonte real ou com um mutante) ═══
async function provas(over = {}) {
  const res = []
  const prova = async (nome, fn) => res.push([nome, await tenta(fn)])
  const { leitura, regras } = (() => { try { return carregarLeitura(over) } catch { return { leitura: null, regras: null } } })()
  const rodar = async (params, tabelas = fixture()) => { const db = banco(tabelas); const pagina = await leitura.carregarClientes(db, { pagina: 1, filtro: 'todos', internas: false, ...params }, AGORA); return { db, pagina } }

  // J1 — portão da /admin/clientes e a aba no /admin
  const paginaCom = (email) => {
    const espias = { service: 0, carregar: 0 }
    const deps = {
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: email ? { email } : null } }) } }) },
      '@/app/api/admin/_shared/db': { isAdminEmail: (e) => ADMINS.has(String(e ?? '').trim().toLowerCase()), serviceClient: () => { espias.service++; return {} } },
      '@/lib/admin/clientesJornada': { carregarClientes: async () => { espias.carregar++; return { params: {}, total: 0, clientes: [], geradoEm: '', erro: null } } },
      '@/lib/admin/clientesJornadaRegras': regras,
      '@/components/admin/AdminAbas': { __esModule: true, default: () => null },
      '@/components/admin/ClientesJornada': { __esModule: true, default: () => null },
    }
    return { mod: carregarTsx(F.pagina, deps, over), espias }
  }
  await prova('J1a não-admin = 403 sem service role e sem leitura', async () => {
    for (const email of [null, 'cliente@exemplo.com', 'josephsskaf+outro@gmail.com']) {
      const { mod, espias } = paginaCom(email)
      const html = renderToStaticMarkup(await mod.default({ searchParams: {} }))
      if (!html.includes('403') || espias.service !== 0 || espias.carregar !== 0) return false
    }
    return true
  })
  await prova('J1b admin lê a página', async () => {
    const { mod, espias } = paginaCom([...ADMINS][0])
    await mod.default({ searchParams: { p: '2' } })
    return espias.service === 1 && espias.carregar === 1
  })
  await prova('J1c portão vem antes do service role no código da página', () => {
    const s = over[F.pagina] ?? SRC.pagina
    const g = s.indexOf('isAdminEmail(email)'), c = s.indexOf('serviceClient()'), l = s.indexOf('carregarClientes(admin')
    return g > 0 && c > g && l > c
  })
  const homeCom = (email, searchParams) => {
    const espias = { ceo: 0, redirect: null }
    const deps = {
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: email ? { email } : null } }) } }) },
      '@/app/api/admin/_shared/db': { isAdminEmail: (e) => ADMINS.has(String(e ?? '').trim().toLowerCase()) },
      '@/app/api/admin/ceo/compute': { computeCeoData: async () => { espias.ceo++; return { ok: true } } },
      '@/app/(dashboard)/admin/ceo/CeoClient': { __esModule: true, default: (p) => React.createElement('div', { 'data-ceo': p.denied ? 'negado' : 'visao' }) },
      'next/navigation': { redirect: (u) => { espias.redirect = u; throw new Error('NEXT_REDIRECT') } },
      '@/components/admin/AdminAbas': { __esModule: true, default: (p) => React.createElement('nav', { 'data-aba': p.atual }) },
    }
    return { mod: carregarTsx(F.home, deps, over), espias }
  }
  await prova('J1d /admin?aba=clientes vai para a aba sem calcular a Visão geral (e leva p/f/internas)', async () => {
    const { mod, espias } = homeCom([...ADMINS][0], { aba: 'clientes', p: '3', f: 'pagou' })
    try { await mod.default({ searchParams: { aba: 'clientes', p: '3', f: 'pagou' } }) } catch { /* redirect */ }
    return espias.redirect === '/admin/clientes?p=3&f=pagou' && espias.ceo === 0
  })
  await prova('J1e /admin sem aba: Visão geral calculada, abas em cima; não-admin não recebe nada', async () => {
    const a = homeCom([...ADMINS][0], {})
    const html = renderToStaticMarkup(await a.mod.default({ searchParams: {} }))
    const b = homeCom('cliente@exemplo.com', { aba: 'clientes' })
    const html2 = renderToStaticMarkup(await b.mod.default({ searchParams: { aba: 'clientes' } }))
    return a.espias.ceo === 1 && html.includes('data-aba="visao"') && html.includes('data-ceo="visao"') && html.indexOf('data-aba') < html.indexOf('data-ceo') &&
      b.espias.ceo === 0 && b.espias.redirect === null && html2.includes('data-ceo="negado"')
  })

  // J2 — internas fora no banco
  await prova('J2a internas fora por padrão (exclusão antes do range: página 1 tem 10 clientes, nenhum interno)', async () => {
    const { pagina, db } = await rodar({})
    const prof = db.log.chamadas.find((c) => c.tabela === 'profiles')
    const nots = prof.ops.filter((o) => o[0] === 'not')
    return pagina.clientes.length === 10 && pagina.total === 12 && pagina.clientes.every((c) => c.email.startsWith('cliente') && !c.interna) &&
      ['%josephsskaf%', '%josephskaf%', '%josepghsskaf%', '%@usekineo.com%'].every((p) => nots.some((o) => o[2] === 'ilike' && o[3] === p)) &&
      nots.some((o) => o[2] === 'in' && /victoriaskaf96@gmail\.com/.test(o[3]) && /teste01@shortsforgeai\.com/.test(o[3]))
  })
  await prova('J2b "mostrar internas" traz as 5 e marca como interna', async () => {
    const { pagina } = await rodar({ internas: true })
    const internas = pagina.clientes.filter((c) => c.interna)
    return pagina.total === 17 && internas.length === 5 && pagina.clientes[0].email === 'josephsskaf+teste9@gmail.com'
  })
  await prova('J2c régua de interna = regex do painel + lista exata', () => {
    const ex = ['josephsskaf@gmail.com', 'victoriaskaf96@gmail.com']
    return regras.ehContaInterna('JosephSkaf@Hotmail.com', ex) && regras.ehContaInterna('x@usekineo.com', ex) && regras.ehContaInterna('josepghsskaf@x.com', ex) &&
      regras.ehContaInterna('victoriaskaf96@gmail.com', ex) && !regras.ehContaInterna('cliente@exemplo.com', ex) && !regras.ehContaInterna('kineo@gmail.com', ex)
  })

  // J3 — 10 por página e leitura magra
  await prova('J3a 10 por página, mais novo primeiro, range [0,9] e [10,19], count exato', async () => {
    const p1 = await rodar({})
    const p2 = await rodar({ pagina: 2 })
    const r1 = p1.db.log.chamadas.find((c) => c.tabela === 'profiles').ops.find((o) => o[0] === 'range')
    const r2 = p2.db.log.chamadas.find((c) => c.tabela === 'profiles').ops.find((o) => o[0] === 'range')
    const sel = p1.db.log.chamadas.find((c) => c.tabela === 'profiles').ops.find((o) => o[0] === 'select')
    return regras.CLIENTES_POR_PAGINA === 10 && p1.pagina.clientes.length === 10 && p1.pagina.clientes[0].id === 'c0' && p1.pagina.clientes[9].id === 'c9' &&
      p2.pagina.clientes.map((c) => c.id).join() === 'c10,c11' && r1[1] === 0 && r1[2] === 9 && r2[1] === 10 && r2[2] === 19 && sel[2].count === 'exact'
  })
  await prova('J3b por pessoa: user_id + limite < 1000; events com janela; .in() pequeno; nenhuma escrita', async () => {
    const { db } = await rodar({})
    const outras = db.log.chamadas.filter((c) => c.tabela !== 'profiles')
    const semDono = outras.filter((c) => !c.ops.some((o) => (o[0] === 'eq' && o[1] === 'user_id') || (o[0] === 'is' && o[1] === 'user_id')))
    const semTeto = outras.filter((c) => !c.ops.some((o) => o[0] === 'limit' && o[1] < 1000) && !c.ops.some((o) => o[0] === 'select' && o[2]?.head))
    const evs = outras.filter((c) => c.tabela === 'events' && !c.ops.some((o) => o[0] === 'eq' && o[1] === 'name'))
    const semJanela = evs.filter((c) => !(c.ops.some((o) => o[0] === 'gte' && o[1] === 'created_at') && c.ops.some((o) => o[0] === 'lte' && o[1] === 'created_at')))
    const ins = outras.flatMap((c) => c.ops.filter((o) => o[0] === 'in').map((o) => [c.tabela, o[1], o[2]]))
    const insOk = ins.every(([t, k, n]) => (k === 'session_id' && n <= regras.SESSOES_LIGADAS_MAX) || (k === 'id' && t === 'videos' && n <= regras.ANUNCIOS_POR_PESSOA) || (k === 'name' && n <= 10))
    return semDono.length === 0 && semTeto.length === 0 && evs.length > 0 && semJanela.length === 0 && ins.some(([, k]) => k === 'session_id') && insOk && db.log.escritas.length === 0 &&
      regras.EVENTOS_POR_PESSOA < 1000 && ins.filter(([, k]) => k === 'session_id').every(([, , n]) => n <= 5)
  })
  await prova('J3c o código de leitura não grava (sem insert/update/upsert/delete/rpc/readUnpaginated)', () => {
    const s = (over[F.leitura] ?? SRC.leitura).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
    return !/\.(insert|update|upsert|delete|rpc)\(/.test(s) && !/readUnpaginated|writeServerEvent/.test(s)
  })

  // J4 — régua
  await prova('J4a régua do c0: anônimo conta, 8 passos ✓ e pagou ✗', async () => {
    const { pagina } = await rodar({})
    const c0 = pagina.clientes.find((c) => c.id === 'c0')
    const m = Object.fromEntries(c0.regua.map((p) => [p.chave, p]))
    return c0.regua.length === 9 && m.visitou.ok && /antes do cadastro/.test(m.visitou.fonte) && m.cadastrou.ok && m.cadastrou.fonte === 'profiles.created_at' &&
      m.studio.ok && m.studio.fonte === 'mrr_studio_viewed' && m.gerar.ok && m.pronto.ok && m.baixou.ok && m.baixou.fonte === 'video_downloaded' &&
      m.planos.ok && /pricing_view/.test(m.planos.fonte) && m.checkout.ok && m.checkout.fonte === 'checkout_started' && !m.pagou.ok
  })
  await prova('J4b sem evento: has_paid fecha "pagou" (fonte profiles), checkout fica ✗; quem não fez nada só tem o cadastro', async () => {
    const { pagina } = await rodar({})
    const c1 = Object.fromEntries(pagina.clientes.find((c) => c.id === 'c1').regua.map((p) => [p.chave, p]))
    const c5 = pagina.clientes.find((c) => c.id === 'c5').regua
    return c1.pagou.ok && c1.pagou.fonte === 'profiles.has_paid' && !c1.checkout.ok && c1.pronto.ok && c1.pronto.fonte === 'videos / ads_v2_orders' &&
      c5.filter((p) => p.ok).map((p) => p.chave).join() === 'cadastrou'
  })
  await prova('J4c cada evento da régua é emitido pelo código (nome exato em app/lib/components)', () => {
    const nomes = regras.NOMES_DA_REGUA
    const arquivos = []
    const andar = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') andar(p) } else if (/\.(ts|tsx)$/.test(e.name) && !p.includes('clientesJornadaRegras')) arquivos.push(fs.readFileSync(p, 'utf8')) } }
    for (const d of ['app', 'lib', 'components']) andar(path.join(ROOT, d))
    const tudo = arquivos.join('\n')
    return nomes.length >= 20 && nomes.every((n) => tudo.includes(`'${n}'`) || tudo.includes(`"${n}"`)) &&
      ['payment_success', 'checkout_started', 'upgrade_modal_opened', 'video_downloaded', 'mrr_studio_viewed', 'mrr_generate_clicked', 'landing_session_started', 'ads_v2_delivered'].every((n) => nomes.includes(n))
  })

  // J5 — trilha
  await prova('J5a trilha: anônimo ligado pela sessão, /api fora, repetidas juntas, query removida, janela de 45 dias', async () => {
    const { pagina } = await rodar({})
    const c0 = pagina.clientes.find((c) => c.id === 'c0')
    const t = c0.trilha
    return t[0].path === '/vs/invideo' && t[0].anonimo && t[1].path === '/pricing' && t[1].anonimo && t[1].vezes === 1 &&
      t.every((p) => !p.path.startsWith('/api/')) && t.find((p) => p.path === '/studio' && !p.anonimo)?.vezes === 5 &&
      c0.anonimosLigados === 2 && c0.entrada?.path === '/vs/invideo' && c0.entrada.antesDoCadastro && !t.some((p) => p.em > new Date(Date.parse(c0.criadoEm) + 46 * 86_400_000).toISOString())
  })
  await prova('J5b 50 páginas: 40 de cara + "ver mais" (tela), .in de sessões ≤ 5', async () => {
    const { pagina, db } = await rodar({})
    const c2 = pagina.clientes.find((c) => c.id === 'c2')
    const html = renderPage(F.tela, false, {}, { pagina: { ...pagina, clientes: [c2] }, abrirPrimeiro: true })
    const ins = db.log.chamadas.filter((c) => c.tabela === 'events').flatMap((c) => c.ops.filter((o) => o[0] === 'in' && o[1] === 'session_id'))
    const blocoTrilha = html.split('data-kineo="trilha"')[1].split('</ol>')[0]
    return c2.trilha.length === 50 && regras.PASSOS_VISIVEIS === 40 && (blocoTrilha.match(/<li/g) || []).length === 40 && html.includes('ver mais (10)') && ins.every((o) => o[2] <= 5)
  })

  // J6 — nota de coerência
  await prova('J6 nota = fast_coherence da versão vigente por video_id; versão velha não vale; anúncio e clipe fora da lista de filmes', async () => {
    const { pagina } = await rodar({})
    const c0 = pagina.clientes.find((c) => c.id === 'c0')
    const f1 = c0.filmes.find((f) => f.id === 'v-c0-1'), f2 = c0.filmes.find((f) => f.id === 'v-c0-2')
    const c1 = pagina.clientes.find((c) => c.id === 'c1')
    return f1?.nota?.score === 82 && f2 && f2.nota === null && c0.filmesTotal === 2 && !c0.filmes.some((f) => f.id === 'v-c0-ad' || f.id === 'v-c0-clip') &&
      c0.anuncios.length === 2 && c0.anuncios.find((a) => a.id === 'ad-1').url === 'https://x/renders/c0/ad.mp4' && c0.anuncios.find((a) => a.id === 'ad-2').status === 'rascunho' &&
      c0.contadores.clipes === 1 && c0.contadores.imagens === 2 && c1.filmesTotal === 1 && c0.falhas[0]?.erro.startsWith('compose_not_ok')
  })

  // J7 — filtros
  await prova('J7 filtros: fez = videos!inner; pagou = has_paid; nada = anti-join', async () => {
    const fez = await rodar({ filtro: 'fez' })
    const pagou = await rodar({ filtro: 'pagou' })
    const nada = await rodar({ filtro: 'nada' })
    const ids = (r) => r.pagina.clientes.map((c) => c.id).join()
    return ids(fez) === 'c0,c1' && ids(pagou) === 'c1' && nada.pagina.total === 10 && !nada.pagina.clientes.some((c) => c.id === 'c0' || c.id === 'c1') &&
      regras.lerParametros({ f: 'qualquer', p: '-3' }).filtro === 'todos' && regras.lerParametros({ p: '-3' }).pagina === 1 &&
      regras.hrefClientes({ pagina: 2, filtro: 'fez', internas: true }) === '/admin/clientes?p=2&f=fez&internas=1'
  })

  // J8 — tela
  // (renderPage lê o AdminShell do disco; o mutante do menu é pego pela leitura da fonte, sem escrever arquivo)
  await prova('J8a AdminShell: atalho "Clientes" no grupo Pessoas, 1 item ativo em /admin/clientes', () => {
    const shell = over[F.shell] ?? SRC.shell
    const html = renderPage(F.shell, false, { pathname: '/admin/clientes' }, { children: 'X' })
    const pessoas = shell.split("label: 'Pessoas'")[1]?.split('\n')[0] ?? ''
    return pessoas.includes("['/admin/clientes', 'Clientes']") && (html.match(/aria-current="page"/g) || []).length === 1 && /href="\/admin\/clientes"[^>]*aria-current="page"/.test(html)
  })
  await prova('J8b tela: abas, 10 cartões, régua de 9, ▶ em nova aba, nota visível, filtros e paginação', async () => {
    const { pagina } = await rodar({})
    const html = renderPage(F.tela, false, {}, { pagina, abrirPrimeiro: true })
    const abas = renderPage(F.abas, false, {}, { atual: 'clientes' })
    return (html.match(/data-kineo="cliente"/g) || []).length === 10 && (html.split('data-kineo="regua"')[1].split('</ol>')[0].match(/<li/g) || []).length === 9 &&
      /href="https:\/\/x\/renders\/c0\/1\.mp4" target="_blank" rel="noreferrer"/.test(html) && html.includes('nota 82') &&
      html.includes('mostrar internas') && html.includes('/admin/clientes?p=2') && html.includes('assistente de IA provável') &&
      /href="\/admin"/.test(abas) && /href="\/admin\/clientes" aria-current="page"/.test(abas)
  })
  // J9 — o desfaz da aba devolve o pai byte a byte
  await prova('J9 desfaz devolve o pai byte a byte (menu do admin e /admin); trecho alterado = lança', () => {
    if (!PAI) return false
    const lanca = (fn) => { try { fn(); return false } catch { return true } }
    return ARQUIVOS_ADMIN_JORNADA_1510.length === 2 && ARQUIVOS_ADMIN_JORNADA_1510.every((f) => {
      const vivo = over[f] ?? rd(f)
      const pai = lf(execFileSync('git', ['show', `${PAI}:${f}`], { cwd: ROOT, encoding: 'utf8' }))
      return vivo.includes(MARCA_ADMIN_JORNADA_1510) && lf(semAdminJornada1510(f, vivo)) === pai && !pai.includes(MARCA_ADMIN_JORNADA_1510)
    }) && lanca(() => semAdminJornada1510(F.shell, rd(F.shell).replace("['/admin/clientes', 'Clientes']", "['/admin/clientes', 'Clientes ']")))
  })
  return res
}

console.log('── provas (código real)')
const base = await provas()
for (const [n, v] of base) ok(v, n)

console.log('\n── mutantes (cada um provado aplicado; cada um deixa ao menos uma prova vermelha)')
const trocar = (k, de, para) => { const src = SRC[k]; if (src.split(de).length !== 2) throw new Error('âncora não única: ' + de.slice(0, 70)); const o = src.split(de).join(para); if (o === src) throw new Error('não aplicou'); return { [F[k]]: o } }
const trocarVarios = (k, pares) => { let o = SRC[k]; for (const [de, para] of pares) { if (o.split(de).length !== 2) throw new Error('âncora não única: ' + de.slice(0, 70)); o = o.split(de).join(para) } if (o === SRC[k]) throw new Error('não aplicou'); return { [F[k]]: o } }
const MUTANTES = [
  ['página sem o portão do admin', () => trocar('pagina', "  if (!user || !isAdminEmail(email)) {\n    return <div style={{ padding: 40, color: 'var(--text2)' }}>403</div>\n  }\n", '')],
  ['aba Clientes calculando a Visão geral antes', () => trocar('home', "  const aba = Array.isArray(searchParams?.aba)", "  await computeCeoData()\n  const aba = Array.isArray(searchParams?.aba)")],
  ['internas não saem por padrão', () => trocar('leitura', '  if (!params.internas) {', '  if (false) {')],
  ['internas filtradas DEPOIS do range (página curta)', () => trocarVarios('leitura', [['  if (!params.internas) {', '  if (false) {'], ['  const perfis = ((data ?? []) as unknown as PerfilRow[]).slice(0, CLIENTES_POR_PAGINA)', '  const perfis = ((data ?? []) as unknown as PerfilRow[]).filter((p) => params.internas || !ehContaInterna(p.email, INTERNAL_EXACT_EMAILS)).slice(0, CLIENTES_POR_PAGINA)']])],
  ['50 por página', () => trocar('regras', 'export const CLIENTES_POR_PAGINA = 10', 'export const CLIENTES_POR_PAGINA = 50')],
  ['teto de eventos acima do limite silencioso', () => trocar('regras', 'export const EVENTOS_POR_PESSOA = 800', 'export const EVENTOS_POR_PESSOA = 5000')],
  ['events sem janela de tempo', () => trocar('leitura', ".eq('user_id', uid).gte('created_at', desde).lte('created_at', fimJanela)\n", ".eq('user_id', uid)\n")],
  ['.in() com todas as sessões (gigante)', () => trocar('leitura', '  const sessoes = sessoesParaLigar(eventos)', '  const sessoes = Array.from(new Set(eventos.map((e) => e.session_id).filter((s): s is string => !!s)))')],
  ['régua com nome de evento errado (checkout)', () => trocar('regras', "eventos: ['checkout_started', 'checkout_attempted']", "eventos: ['checkout_viewed', 'checkout_attempted']")],
  ['régua infere pagou do checkout', () => trocar('regras', "    if (def.chave === 'pagou' && fatos.pagou)", "    if (def.chave === 'pagou' && (fatos.pagou || primeiro.has('checkout_started')))")],
  ['sem a navegação anônima ligada', () => trocar('leitura', '  if (sessoes.length > 0) {', '  if (false) {')],
  ['trilha com rotas /api', () => trocar('regras', "  return p.startsWith('/') && !p.startsWith('/api/') && !p.startsWith('/_next/')", "  return p.startsWith('/')")],
  ['nota de versão velha aceita', () => trocar('leitura', "    if (!n.video_id || n.version !== FAST_COHERENCE_VERSION || notaPorVideo.has(n.video_id)) continue", "    if (!n.video_id || notaPorVideo.has(n.video_id)) continue")],
  ['filtro "fez" sem o inner', () => trocar('leitura', "params.filtro === 'fez' ? ', videos!inner(id)'", "params.filtro === 'fez' ? ', videos(id)'")],
  ['a leitura grava', () => trocar('leitura', '  const sessoes = sessoesParaLigar(eventos)', "  await admin.from('events').insert({ name: 'admin_clientes_aberto' })\n  const sessoes = sessoesParaLigar(eventos)")],
  ['menu sem o atalho Clientes', () => trocar('shell', "[['/admin/clientes', 'Clientes'], ", '[')],
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
