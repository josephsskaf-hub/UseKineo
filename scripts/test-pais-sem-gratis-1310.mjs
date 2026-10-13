// KINEO-PAIS-SEM-GRATIS-2026-10-13 — guardião da OFERTA CLARA NA HORA para quem nasce fora do filme grátis.
//
// O que prova (executando o código real quando dá; lendo a fonte só para a costura das telas):
//   1. regras: a faixa do topo é a superfície 'first_film' do passe de região — mesma régua (region_paid_only, has_paid
//      === false, plano grátis), mesmo preço (o do checkout do pack), campanha region_paid_first_film, eventos de servidor
//      region_paid_offer_shown/_clicked; "primeiro filme" só com 0 vídeos CONTADOS; as outras telas do passe intocadas;
//   2. a rota /api/region-pass REAL: conta os vídeos só na oferta (o clique não lê banco a mais) e grava o evento certo;
//   3. 'blocked' (anti-abuso) nunca recebe oferta de compra: a rota não oferece e o aviso neutro não tem botão nem link;
//   4. a campanha passa no filtro do checkout (senão não chega ao payment_success);
//   5. eventos novos são server-only e nenhum cliente os cita;
//   6. telas: a faixa só pergunta quando PODE aparecer; o filme grátis continua na frente; nenhum preço digitado;
//      nenhum texto da faixa diz "no seu país" (com o filme de região no ar, seria mentira);
//   7. interruptores desligados = hoje.
// Mutantes no fim: cada um prova que foi aplicado e PRECISA ficar vermelho.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
const transpila = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText

let falhas = 0
const checa = (rotulo, ok) => { console.log(`  ${ok ? '✓' : '✗'} ${rotulo}`); if (!ok) falhas++ }
const trocar = (src, de, para) => {
  if (src.split(de).length !== 2) throw new Error('âncora do mutante ausente/ambígua: ' + de.slice(0, 90))
  return src.replace(de, () => para)
}

const POL = 'lib/freeFilmPolicy.ts'
const PASS = 'lib/regionPass.ts'
const ROTA = 'app/api/region-pass/route.ts'
const CHK = 'app/api/stripe/checkout/route.ts'
const EVT = 'app/api/events/route.ts'
const BAN = 'components/RegionPaidOnlyBanner.tsx'
const STRIP = 'components/RegionFirstFilmStrip.tsx'
const BLK = 'components/BlockedNeutralNotice.tsx'
const LAY = 'app/(dashboard)/layout.tsx'
const OFERTA = 'components/RegionPassOffer.tsx'

function carrega({ over = {}, mocks = {} } = {}) {
  return createOfflineLoader({ mocks, source: (rel, text) => over[rel] ?? text })
}
const s = (over, f) => over[f] ?? rd(f)

const REG = { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: 5 }
const BLOQ = { trial_status: 'blocked', has_paid: false, plan: 'free', video_credits: 0 }

// ══ 1. regras puras ══════════════════════════════════════════════════════════════════════════════════════════════════
function provaRegras(over = {}) {
  const p = []
  const PS = carrega({ over })(PASS)
  if (!PS.REGION_PASS_SURFACES.includes('first_film')) p.push('first_film não é superfície do passe')
  if (PS.regionPassIntentCampaign('first_film') !== 'region_paid_first_film') p.push(`campanha da faixa = ${PS.regionPassIntentCampaign('first_film')} (pedido: region_paid_first_film)`)
  for (const t of ['wall', 'pricing', 'after_film']) if (PS.regionPassIntentCampaign(t) !== `region_pass_${t}_v1`) p.push(`campanha de ${t} mudou`)
  const d = (x) => PS.decideRegionPassRequest({ userId: 'u-1', profile: REG, surface: 'first_film', go: false, ipCountry: 'IN', acceptLanguage: 'en-IN', ...x })
  const zero = d({ videosCount: 0 })
  if (!(zero.kind === 'json' && zero.body.eligible === true && zero.body.firstFilm === true)) p.push('0 vídeos não virou "primeiro filme"')
  if (zero.event?.name !== 'region_paid_offer_shown') p.push(`evento da faixa = ${zero.event?.name}`)
  if (zero.event?.metadata?.intent_campaign !== 'region_paid_first_film' || zero.event?.metadata?.first_film !== true) p.push('evento da faixa sem a campanha ou sem first_film')
  if (d({ videosCount: 2 }).body.firstFilm !== false) p.push('com vídeos a faixa diz "primeiro filme"')
  if (d({ videosCount: null }).body.firstFilm !== false) p.push('contagem que falhou virou "primeiro filme"')
  if (d({}).body.firstFilm !== false) p.push('sem contagem virou "primeiro filme"')
  // o preço é o MESMO do passe (o do checkout do pack): IN = USD 4,99; BR = BRL pela fórmula da casa
  const preco = PS.regionPassPrice({ ipCountry: 'IN', acceptLanguage: 'en-IN' })
  if (zero.body.price.label !== preco.label || zero.body.price.amountMinor !== 499 || zero.body.price.currency !== 'usd') p.push(`preço da faixa no IN = ${zero.body.price.label}/${zero.body.price.amountMinor}`)
  const br = d({ ipCountry: 'BR', acceptLanguage: 'pt-BR', videosCount: 0 })
  if (br.body.price.currency !== 'brl' || br.body.price.label !== PS.regionPassPrice({ ipCountry: 'BR', acceptLanguage: 'pt-BR' }).label) p.push('BR não saiu em reais pela mesma fórmula')
  // o clique
  const go = d({ go: true })
  if (!(go.kind === 'redirect' && go.location === '/api/stripe/checkout?pack=starter&return=studio&intent_campaign=region_paid_first_film')) p.push(`clique foi a ${go.location}`)
  if (go.event?.name !== 'region_paid_offer_clicked' || go.event?.metadata?.intent_campaign !== 'region_paid_first_film') p.push('clique sem o evento region_paid_offer_clicked com a campanha')
  if (PS.regionPassGoHref('first_film') !== '/api/region-pass?surface=first_film&go=1') p.push('o botão não passa pela rota que grava o clique')
  // as outras telas do passe seguem com os eventos de sempre
  const wall = d({ surface: 'wall', videosCount: 0 })
  if (wall.event?.name !== 'region_pass_offer_shown' || d({ surface: 'wall', go: true }).event?.name !== 'region_pass_offer_clicked') p.push('a parede trocou de evento')
  if (wall.body.firstFilm !== true) p.push('a parede não sabe que é o primeiro filme')
  // régua: só região sem pagar e plano grátis
  for (const [nome, perfil] of [['blocked', BLOQ], ['pagou', { ...REG, has_paid: true }], ['has_paid nulo', { ...REG, has_paid: null }], ['plano pago', { ...REG, plan: 'starter' }], ['trial comum', { ...REG, trial_status: 'active' }]]) {
    const j = d({ profile: perfil, videosCount: 0 })
    if (j.body.eligible !== false || j.event) p.push(`oferta mostrada a ${nome}`)
    const g = d({ profile: perfil, go: true })
    if (g.location !== PS.PLAIN_PASS_CHECKOUT_HREF || g.event) p.push(`clique de ${nome} gravou evento ou levou a outra campanha`)
  }
  // interruptor do passe desligado = a faixa também some (ela É o passe)
  const off = d({ live: false, videosCount: 0 })
  if (off.body.eligible !== false || off.event) p.push('passe desligado e a faixa ainda oferece')
  return p
}

// ══ 2. a rota REAL ═══════════════════════════════════════════════════════════════════════════════════════════════════
async function provaRota(over = {}) {
  const p = []
  const roda = async (qs, perfil = REG, contagem = { count: 0, error: null }) => {
    const eventos = [], tabelas = []
    const supa = {
      auth: { getUser: async () => ({ data: { user: { id: 'u-1' } } }) },
      from: (t) => {
        tabelas.push(t)
        if (t === 'videos') return { select: () => ({ eq: async () => contagem }) }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: perfil, error: null }) }) }) }
      },
    }
    const R = carrega({ over, mocks: {
      'next/server': { NextResponse: { redirect: (u) => ({ redirect: String(u) }), json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
      '@/lib/supabase/server': { createClient: () => supa },
      '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); return true } },
    } })(ROTA)
    const headers = { 'x-vercel-ip-country': 'EG', 'accept-language': 'ar-EG,en;q=0.8' }
    const res = await R.GET({ nextUrl: new URL('https://www.usekineo.com/api/region-pass' + qs), headers: { get: (n) => headers[String(n).toLowerCase()] ?? null } })
    return { res, eventos, tabelas }
  }
  try {
    const ver = await roda('?surface=first_film')
    if (!(ver.res.status === 200 && ver.res.body.eligible === true && ver.res.body.firstFilm === true)) p.push(`oferta: ${JSON.stringify(ver.res).slice(0, 160)}`)
    if (!(ver.eventos.length === 1 && ver.eventos[0].name === 'region_paid_offer_shown' && ver.eventos[0].userId === 'u-1')) p.push('oferta sem o evento de servidor region_paid_offer_shown')
    if (!ver.tabelas.includes('videos')) p.push('a rota não contou os vídeos')
    const comVideo = await roda('?surface=first_film', REG, { count: 3, error: null })
    if (comVideo.res.body.firstFilm !== false) p.push('com 3 vídeos a rota disse "primeiro filme"')
    const erro = await roda('?surface=first_film', REG, { count: null, error: { message: 'x' } })
    if (erro.res.body.firstFilm !== false || erro.res.body.eligible !== true) p.push('erro na contagem derrubou a oferta ou virou "primeiro filme"')
    const go = await roda('?surface=first_film&go=1')
    if (go.res.redirect !== 'https://www.usekineo.com/api/stripe/checkout?pack=starter&return=studio&intent_campaign=region_paid_first_film') p.push(`clique redirecionou a ${go.res.redirect}`)
    if (!(go.eventos.length === 1 && go.eventos[0].name === 'region_paid_offer_clicked')) p.push('clique sem region_paid_offer_clicked')
    if (go.tabelas.includes('videos')) p.push('o clique leu a tabela de vídeos (banco a mais no caminho da compra)')
    const bloq = await roda('?surface=first_film', BLOQ)
    if (bloq.res.body.eligible !== false || bloq.eventos.length || bloq.tabelas.includes('videos')) p.push('blocked recebeu oferta, evento ou contagem')
  } catch (e) { p.push('rota lançou: ' + e.message) }
  return p
}

// ══ 3. blocked: aviso neutro, sem compra ═════════════════════════════════════════════════════════════════════════════
function provaBlocked(over = {}) {
  const p = []
  const P = carrega({ over })(POL)
  const v = P.blockedNeutralNoticeVisible
  if (v(BLOQ) !== true) p.push('blocked sem pagar não vê o aviso')
  for (const [nome, perfil] of [['blocked pagante', { ...BLOQ, has_paid: true }], ['blocked has_paid nulo', { ...BLOQ, has_paid: null }], ['blocked com plano', { ...BLOQ, plan: 'creator' }], ['região', REG], ['nulo', null]]) {
    if (v(perfil) !== false) p.push(`aviso neutro para ${nome}`)
  }
  if (v(BLOQ, false) !== false) p.push('interruptor desligado e o aviso aparece')
  const comp = semComentarios(s(over, BLK))
  if (/checkout|\/pricing|PLANS_HREF|<Link|<a\s|href=/.test(comp)) p.push('o aviso neutro tem link ou botão de compra')
  for (const lang of ['en', 'pt', 'es']) {
    const c = P.BLOCKED_NEUTRAL_NOTICE?.[lang]
    if (!c?.title || !c?.body) { p.push(`aviso neutro sem texto em ${lang}`); continue }
    if (/abuse|fraud|fingerprint|device|abuso|fraude|aparelho|dispositivo/i.test(c.title + c.body)) p.push(`aviso neutro acusa ou cita o motivo (${lang})`)
  }
  const lay = s(over, LAY)
  if (!/\{user && blockedNeutralNoticeVisible\(profile as \{[^}]*\} \| null\) && <BlockedNeutralNotice \/>\}/.test(lay)) p.push('layout não monta o aviso neutro pela régua do servidor')
  return p
}

// ══ 4. campanha passa no filtro do checkout ══════════════════════════════════════════════════════════════════════════
function provaCampanha(over = {}) {
  const p = []
  const chk = s(over, CHK)
  const ini = chk.indexOf('function intentCampaignFrom(')
  const fim = chk.indexOf('\n}\n', ini)
  if (ini < 0 || fim < 0) return ['intentCampaignFrom não achado no checkout']
  const icf = vm.runInNewContext(transpila(chk.slice(ini, fim + 2) + '\nintentCampaignFrom'), {})
  const PS = carrega({ over })(PASS)
  const c = PS.regionPassIntentCampaign('first_film')
  if (icf({ nextUrl: new URL('https://x.invalid/?intent_campaign=' + c) }) !== c) p.push(`a campanha ${c} é recusada pelo checkout`)
  return p
}

// ══ 5. eventos de servidor ═══════════════════════════════════════════════════════════════════════════════════════════
function varre(dirs) {
  const out = []
  const anda = (d) => {
    for (const nome of readdirSync(join(root, d))) {
      if (nome === 'node_modules' || nome.startsWith('.')) continue
      const rel = d + '/' + nome
      if (statSync(join(root, rel)).isDirectory()) anda(rel)
      else if (/\.(ts|tsx)$/.test(nome)) out.push(rel)
    }
  }
  for (const d of dirs) anda(d)
  return out
}
const ARQUIVOS = varre(['app', 'lib', 'components'])
function provaEventos(over = {}) {
  const p = []
  const NOMES = ['region_paid_offer_shown', 'region_paid_offer_clicked']
  const evt = s(over, EVT)
  const ini = evt.indexOf('const SERVER_ONLY_EVENTS = new Set([')
  const set = evt.slice(ini, evt.indexOf('\n])', ini))
  for (const n of NOMES) if (!set.includes(`  '${n}',`)) p.push(`${n} fora de SERVER_ONLY_EVENTS (o navegador poderia cunhar)`)
  for (const f of ARQUIVOS) {
    const src = s(over, f)
    if (!/^['"]use client['"]/.test(src.trimStart())) continue
    for (const n of NOMES) if (src.includes(`'${n}'`)) p.push(`${f} (cliente) cita ${n}`)
  }
  const PS = carrega({ over })(PASS)
  if (PS.REGION_PAID_OFFER_SHOWN_EVENT !== NOMES[0] || PS.REGION_PAID_OFFER_CLICKED_EVENT !== NOMES[1]) p.push('nome de evento mudou (a medição lê estes)')
  return p
}

// ══ 6. telas ═════════════════════════════════════════════════════════════════════════════════════════════════════════
const semComentarios = (x) => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1')
function provaTelas(over = {}) {
  const p = []
  const ban = s(over, BAN), strip = s(over, STRIP), ofe = s(over, OFERTA)
  if (!ban.includes("  const firstFilmOffer = useRegionFirstFilmOffer(REGION_FIRST_FILM_OFFER_LIVE && !(REGION_FREE_FILM_LIVE && film) && surface !== 'clips')")) p.push('faixa: pergunta ao servidor quando não pode aparecer (evento shown sem faixa) ou sem o interruptor')
  const iFilme = ban.indexOf('  if (REGION_FREE_FILM_LIVE && film) return <RegionFreeFilmStrip />')
  const iOferta = ban.indexOf('    if (firstFilmOffer) return <RegionFirstFilmStrip offer={firstFilmOffer}')
  const iClipe = ban.indexOf('  if (surface) return <FreeClipNotice key={surface} surface={surface} />')
  if (!(iFilme >= 0 && iOferta > iFilme && iClipe > iOferta)) p.push('faixa: a ordem não é filme grátis → oferta → aviso do clipe')
  if (!ban.includes("  if (REGION_FIRST_FILM_OFFER_LIVE && surface !== 'clips') {\n    if (firstFilmOffer === undefined) return null")) p.push('faixa: a oferta não está atrás do interruptor ou pinta a faixa velha enquanto espera (duas faixas)')
  if (!strip.includes("fetch('/api/region-pass?surface=first_film'") || !strip.includes("checkout.launch('region_paid_first_film', offer.href,")) p.push('a faixa não pergunta ao servidor nem navega pelo link que ele devolve')
  if (!/o\.surface === 'first_film'/.test(strip)) p.push('a faixa aceita oferta de outra superfície')
  if (/\$\s?\d|R\$\s?\d|₹|\b4[.,]99\b|\b24[.,]90\b/.test(semComentarios(strip))) p.push('a faixa tem preço digitado')
  if (!/ENGINE_PAGE_LEAD\.find\(\(f\) => f\.engine === 'cinematic_ai'\)/.test(strip)) p.push('o exemplo não é um filme da casa do MESMO motor do passe')
  if (/from '@\/lib\/engineWall'/.test(strip)) p.push('a faixa mexe na curadoria da home (engineWall)')
  if (!ofe.includes("offer.firstFilm === true ? copy.firstTitle(price) : copy.title(price)")) p.push('a parede diz "próximo filme" a quem nunca fez nenhum')
  // textos: en/pt/es completos e nenhum "no seu país" na faixa nova
  const PS = carrega({ over })(PASS)
  for (const lang of ['en', 'pt', 'es']) {
    const c = PS.REGION_PASS_COPY[lang]
    for (const k of ['firstTitle', 'firstCta', 'noFreeFilm', 'freeFilmUsed', 'exampleLabel', 'plans', 'freeClip']) if (!c?.[k]) p.push(`texto ${k} ausente em ${lang}`)
    const txt = [c.firstTitle('X'), c.firstCta('X'), c.noFreeFilm, c.freeFilmUsed].join(' ')
    if (/country|país|pais/i.test(txt)) p.push(`a faixa (${lang}) fala em país — com o filme de região no ar, a conta nova do mesmo país ganha um`)
  }
  return p
}

// ══ 7. desligado = hoje ══════════════════════════════════════════════════════════════════════════════════════════════
function provaInterruptores(over = {}) {
  const p = []
  const pol = semComentarios(s(over, POL))
  for (const nome of ['REGION_FIRST_FILM_OFFER_LIVE', 'BLOCKED_NEUTRAL_NOTICE_LIVE']) {
    if (!new RegExp(`^export const ${nome} = (true|false)$`, 'm').test(pol)) p.push(`${nome} não é uma linha "export const … = true|false" em ${POL}`)
    const declara = ARQUIVOS.filter((f) => new RegExp(`\\b(const|let|var) ${nome}\\b`).test(semComentarios(s(over, f))))
    if (declara.length !== 1 || declara[0] !== POL) p.push(`${nome} declarado fora de ${POL}: ${declara.join(', ')}`)
  }
  // desligado em memória: o aviso neutro some
  const offPol = s(over, POL).replace(/^export const BLOCKED_NEUTRAL_NOTICE_LIVE = true$/m, 'export const BLOCKED_NEUTRAL_NOTICE_LIVE = false')
  const P = carrega({ over: { ...over, [POL]: offPol } })(POL)
  if (P.blockedNeutralNoticeVisible(BLOQ) !== false) p.push('aviso neutro desligado ainda aparece')
  return p
}

// ══ execução ═════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('TESTE país sem filme grátis — oferta clara na hora (13/10)')
const PROVAS = {
  regras: provaRegras,
  rota: provaRota,
  blocked: provaBlocked,
  campanha: provaCampanha,
  eventos: provaEventos,
  telas: provaTelas,
  interruptores: provaInterruptores,
}
const ROTULO = {
  regras: '(1) first_film = o passe de região com campanha region_paid_first_film e eventos próprios; "primeiro" só com 0 vídeos contados; régua estreita; outras telas intocadas',
  rota: '(2) /api/region-pass REAL: conta vídeos só na oferta, grava shown/clicked, blocked fora',
  blocked: '(3) blocked: aviso neutro sem compra, sem acusação; pagou ou desligado → some',
  campanha: '(4) a campanha passa no filtro do checkout (chega ao payment_success)',
  eventos: '(5) eventos novos server-only e nenhum cliente os cita',
  telas: '(6) faixa: filme grátis na frente, pergunta só quando pode aparecer, sem preço digitado, sem "país"; parede diz "primeiro filme"',
  interruptores: '(7) interruptores num lugar só; desligado = hoje',
}
for (const [chave, fn] of Object.entries(PROVAS)) {
  let r
  try { r = await fn() } catch (e) { r = [`lançou: ${e instanceof Error ? e.stack : String(e)}`] }
  checa(`${ROTULO[chave]}${r.length ? ' → ' + r.join(' | ') : ''}`, r.length === 0)
}

console.log('== mutantes ==')
const M = [
  { nome: 'M1 campanha volta ao molde region_pass_first_film_v1', prova: provaRegras, f: PASS, de: "  if (surface === 'first_film') return REGION_PAID_FIRST_FILM_CAMPAIGN // KINEO-PAIS-SEM-GRATIS-2026-10-13\n", para: '' },
  { nome: 'M2 a faixa grava o evento da parede', prova: provaRegras, f: PASS, de: "  return surface === 'first_film' ? REGION_PAID_OFFER_SHOWN_EVENT : REGION_PASS_OFFER_SHOWN_EVENT", para: '  return REGION_PASS_OFFER_SHOWN_EVENT' },
  { nome: 'M3 "primeiro filme" com contagem que falhou', prova: provaRegras, f: PASS, de: '  const firstFilm = input.videosCount === 0 // KINEO-PAIS-SEM-GRATIS-2026-10-13', para: '  const firstFilm = !input.videosCount' },
  { nome: 'M4 o clique conta vídeos (banco a mais na compra)', prova: provaRota, f: ROTA, de: " && req.nextUrl.searchParams.get('go') !== '1') {", para: ') {' },
  { nome: 'M5 aviso neutro ignora has_paid', prova: provaBlocked, f: POL, de: "  if (!live || !row || row.trial_status !== BLOCKED_TRIAL_STATUS) return false\n  if (row.has_paid !== false) return false\n", para: "  if (!live || !row || row.trial_status !== BLOCKED_TRIAL_STATUS) return false\n" },
  { nome: 'M6 aviso neutro ganha botão de planos', prova: provaBlocked, f: BLK, de: "      <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: 'var(--text2)' }}>{copy.body}</div>\n", para: "      <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: 'var(--text2)' }}>{copy.body}</div>\n      <a href=\"/pricing\">See plans</a>\n" },
  { nome: 'M7 eventos fora de SERVER_ONLY_EVENTS', prova: provaEventos, f: EVT, de: "  'region_paid_offer_clicked',\n", para: '' },
  { nome: 'M8 faixa pergunta mesmo com o filme grátis na tela', prova: provaTelas, f: BAN, de: "useRegionFirstFilmOffer(REGION_FIRST_FILM_OFFER_LIVE && !(REGION_FREE_FILM_LIVE && film) && surface !== 'clips')", para: 'useRegionFirstFilmOffer(REGION_FIRST_FILM_OFFER_LIVE)' },
  { nome: 'M9 preço digitado na faixa', prova: provaTelas, f: STRIP, de: '          {pending ? \'…\' : first ? copy.firstCta(price) : copy.cta(price)}', para: "          {pending ? '…' : 'Make my first film · $4.99'}" },
  { nome: 'M10 texto da faixa diz "no seu país"', prova: provaTelas, f: PASS, de: "    noFreeFilm: 'This account doesn’t include a free film.',", para: "    noFreeFilm: 'Free films aren’t available in your country yet.'," },
  { nome: 'M11 a oferta passa à frente do filme grátis', prova: provaTelas, f: BAN, de: "  if (REGION_FREE_FILM_LIVE && film) return <RegionFreeFilmStrip /> // KINEO-SAIDA-REGIAO-2026-10-07\n", para: '' },
  { nome: 'M12 interruptor do aviso neutro declarado fora da política', prova: provaInterruptores, f: BLK, de: "export const BLOCKED_NEUTRAL_NOTICE_VERSION = 'blocked_neutral_notice_v1' as const\n", para: "export const BLOCKED_NEUTRAL_NOTICE_VERSION = 'blocked_neutral_notice_v1' as const\nconst BLOCKED_NEUTRAL_NOTICE_LIVE = true\n" },
]
for (const m of M) {
  let r
  try {
    const mudado = trocar(rd(m.f), m.de, m.para)
    if (!mudado.includes(m.para) && m.para) throw new Error('mutante não aplicado')
    if (mudado === rd(m.f)) throw new Error('mutante não mudou nada')
    r = await m.prova({ [m.f]: mudado })
  } catch (e) { r = null; checa(`mutante ${m.nome} → não aplicou (${e.message})`, false); continue }
  checa(`mutante ${m.nome} → vermelho${r.length ? ' (' + r[0].slice(0, 110) + ')' : ''}`, r.length > 0)
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO VERDE')
process.exit(falhas ? 1 : 0)
