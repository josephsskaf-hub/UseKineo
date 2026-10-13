#!/usr/bin/env node
// ═══ KINEO-EMAILS-REGIAO-2026-10-13 — guardião das duas mudanças de e-mail das contas 'region_paid_only' ═══════════════
//
// (1) send-activation-nudge: a conta 'region_paid_only' com o filme grátis de região NO SALDO recebe a MESMA carta do 1º
//     filme; 'blocked' nunca; sem crédito no saldo, a recusa de 03/10 continua; leitura que falha = recusa (falha fechada).
// (2) admin/send-region-first-film, EXECUTADA contra um banco simulado com > 1.100 perfis da região (o alvo mora depois
//     da linha 1000): DRY-RUN por padrão, só ?confirm=SEND (exato) envia; blocked/pagante/opt-out/interno/quem já fez filme
//     /quem já recebeu ficam fora; dedupe por perfil (reserva) e por e-mail (alias); o preço da carta é regionPassPrice() —
//     a mesma chamada do checkout do pack — e nenhum preço é digitado; o link do passe é o do banner (intent_campaign
//     region_paid_first_film, provado pela régua real decideRegionPassRequest); o exemplo é a vitrine pública, nunca /v/.
//
// Rodar: node scripts/test-emails-regiao-1310.mjs   (offline: sem rede, sem banco, sem custo)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import crypto from 'node:crypto'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
let pass = 0
const ok = (cond, name) => { assert.ok(cond, name); pass++ }
const semComentario = (s) => s.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')

const ROTA = 'app/api/admin/send-region-first-film/route.ts'
const LIB = 'lib/lifecycle/regionFirstFilmEmail.ts'
const NUDGE = 'app/api/cron/send-activation-nudge/route.ts'
const rota = read(ROTA), lib = read(LIB), nudge = read(NUDGE)

const load = createOfflineLoader()
const R = load(LIB)
const L = load('lib/lifecycle/lembreteComIdeia.ts')
const FF = load('lib/freeFilmPolicy.ts')
const RP = load('lib/regionPass.ts')
const SC = load('lib/settlementCurrency.ts')
const CP = load('lib/checkoutPricing.ts')
const handoff = load('lib/creationHandoff.ts')

// ══ 1 · a régua do cron (podeGerarParaLembrete + filmeDeRegiaoNoSaldo) ═══════════════════════════════════════════════
console.log('1 · cron do 1º filme')
ok(L.podeGerarParaLembrete({ trial_status: 'region_paid_only' }) === false, 'região sem o parâmetro: recusa de 03/10 intacta')
ok(L.podeGerarParaLembrete({ trial_status: 'region_paid_only' }, true) === true, 'região COM o filme no saldo: recebe a carta')
ok(L.podeGerarParaLembrete({ trial_status: ' REGION_PAID_ONLY ' }, true) === true, 'grafia normalizada')
ok(L.podeGerarParaLembrete({ trial_status: 'blocked' }, true) === false && L.podeGerarParaLembrete({ trial_status: 'blocked' }) === false, "'blocked' nunca, nem com o parâmetro")
ok(L.podeGerarParaLembrete({ trial_status: 'region_paid_only' }, 'true') === false, 'só o booleano true abre (string não)')
ok(L.podeGerarParaLembrete({ trial_status: null }) === true && L.podeGerarParaLembrete(null) === true, 'conta comum segue recebendo')

function adminFalso(linha, { erro = false, lanca = false } = {}) {
  const chamadas = []
  return {
    chamadas,
    from(t) {
      chamadas.push(t)
      const q = {
        select() { return q }, eq() { return q },
        maybeSingle() { if (lanca) throw new Error('boom'); return Promise.resolve(erro ? { data: null, error: { message: 'x' } } : { data: linha, error: null }) },
      }
      return q
    },
  }
}
const regiao14 = { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: FF.REGION_FREE_FILM_CREDITS + FF.REGION_FREE_CLIP_CREDITS }
{
  const a = adminFalso(regiao14)
  ok(await R.filmeDeRegiaoNoSaldo(a, { id: 'u', trial_status: 'region_paid_only' }) === true, 'região com 14 cr: tem o filme')
  ok(a.chamadas.length === 1 && a.chamadas[0] === 'profiles', 'lê o saldo do próprio perfil (1 consulta)')
}
ok(await R.filmeDeRegiaoNoSaldo(adminFalso({ ...regiao14, video_credits: FF.REGION_FREE_FILM_CREDITS - 1 }), { id: 'u', trial_status: 'region_paid_only' }) === false, 'saldo abaixo de 1 filme: sem a carta')
ok(await R.filmeDeRegiaoNoSaldo(adminFalso({ ...regiao14, has_paid: true }), { id: 'u', trial_status: 'region_paid_only' }) === false, 'pagou: fora')
ok(await R.filmeDeRegiaoNoSaldo(adminFalso(regiao14, { erro: true }), { id: 'u', trial_status: 'region_paid_only' }) === false, 'leitura com erro = recusa (falha fechada)')
ok(await R.filmeDeRegiaoNoSaldo(adminFalso(regiao14, { lanca: true }), { id: 'u', trial_status: 'region_paid_only' }) === false, 'leitura que lança = recusa')
{
  const a = adminFalso(regiao14)
  ok(await R.filmeDeRegiaoNoSaldo(a, { id: 'u', trial_status: 'blocked' }) === false && a.chamadas.length === 0, "'blocked': false sem consultar o banco")
  ok(await R.filmeDeRegiaoNoSaldo(a, { id: 'u', trial_status: null }) === false && a.chamadas.length === 0, 'conta comum: nenhuma consulta a mais')
}
// a rota do cron chama a régua ANTES da recusa e passa o resultado; nenhum crédito escrito; nenhum cron novo.
const iSaldo = nudge.indexOf('const regiaoComFilme = await filmeDeRegiaoNoSaldo(admin, u as')
const iPode = nudge.indexOf('if (!podeGerarParaLembrete(u as { trial_status?: string | null }, regiaoComFilme)) {')
ok(iSaldo > 0 && iPode > iSaldo, 'cron: saldo lido e passado à recusa')
ok(iPode < nudge.indexOf("const res = await fetch('https://api.resend.com/emails'"), 'cron: recusa antes do envio')
ok(nudge.indexOf('const regiaoComFilme') > nudge.indexOf('if (!email || isTestEmail(email)) {'), 'cron: só depois dos filtros de conta de teste')
ok(!/video_credits|admin_credits_granted/.test(semComentario(nudge)), 'cron: nenhum crédito na rota')
ok(/\.gte\('created_at', from\)\s*\n\s*\.lte\('created_at', to\)/.test(nudge) && /6 \* 60 \* 60 \* 1000/.test(nudge), 'cron: mesma janela de 1–6 h (os antigos não recebem)')
const V = JSON.parse(read('vercel.json'))
ok(V.crons.filter((c) => c.path.startsWith('/api/cron/send-activation-nudge')).length === 1, 'nenhum cron novo')
ok(!JSON.stringify(V).includes('send-region-first-film'), 'a campanha de admin não está no vercel.json')

// ══ 2 · a régua pura das cartas ════════════════════════════════════════════════════════════════════════════════════════
console.log('2 · régua das cartas')
ok(R.varianteDaCarta(regiao14, 0) === 'free_film', '14 cr e nenhum vídeo: filme grátis')
ok(R.varianteDaCarta({ ...regiao14, video_credits: 5 }, 0) === 'pass', 'antiga com o clipe de 5 cr: passe')
ok(R.varianteDaCarta({ ...regiao14, video_credits: 9 }, 1) === 'pass', 'nova que fez o clipe: o filme grátis não é mais admissível → passe')
ok(R.varianteDaCarta({ ...regiao14, has_paid: true }, 0) === null && R.varianteDaCarta({ ...regiao14, plan: 'basic' }, 0) === null, 'pagante: nenhuma carta')
ok(R.varianteDaCarta({ ...regiao14, has_paid: null, video_credits: 0 }, 0) === null, 'has_paid desconhecido: nenhuma carta de compra')
ok(R.varianteDaCarta({ ...regiao14, trial_status: 'blocked' }, 0) === null, "'blocked': nenhuma carta")
ok(R.varianteDaCarta(regiao14, null) === null, 'contagem de vídeos que falhou: nenhuma carta')
ok(R.REGION_FIRST_FILM_CREDITS_FOR_FILM === FF.REGION_FREE_FILM_CREDITS, 'saldo do filme vem da política (freeFilmPolicy)')

// preço: a MESMA conta do checkout do pack (resolveSettlementCurrency + settlementAmountMinor sobre PACK_PRICE_MINOR.usd)
for (const [pais, moeda] of [['BR', 'brl'], ['IN', 'usd'], [null, 'usd'], ['CO', 'usd']]) {
  const p = R.precoDaCarta(pais)
  const s = SC.resolveSettlementCurrency({ ipCountry: pais ?? 'US', acceptLanguage: null })
  ok(p.currency === moeda && s.currency === moeda, `moeda ${pais ?? '?'} = ${moeda}`)
  ok(p.amountMinor === SC.settlementAmountMinor(CP.PACK_PRICE_MINOR.usd, moeda), `valor ${pais ?? '?'} = checkout do pack`)
  ok(p.label === SC.formatSettlementMoney(moeda, p.amountMinor) && p.credits === CP.PACK_CREDITS.starter && p.seconds === CP.PACK_ADVERTISED_SECONDS.starter, `rótulo/créditos/segundos ${pais ?? '?'} da fonte`)
  ok(JSON.stringify(p) === JSON.stringify(RP.regionPassPrice({ ipCountry: pais, acceptLanguage: null })), `precoDaCarta = regionPassPrice (${pais ?? '?'})`)
}
ok(!/\$\s?\d|R\$|4[.,]99|24[.,]90/.test(semComentario(lib).replace(/\$\{/g, '')), 'nenhum preço digitado no módulo das cartas')
ok(R.linguaDoPais('BR') === 'pt' && R.linguaDoPais('CO') === 'es' && R.linguaDoPais('IN') === 'en' && R.linguaDoPais(null) === 'en', 'língua pelo país do perfil')
ok(R.paisDoPerfil({ signup_country: 'xx', last_country: 'br' }) === 'BR' && R.paisDoPerfil({}) === null, 'país: signup, senão last; XX ignorado')

// o link do passe é o do banner, e a régua REAL da rota leva ao checkout com intent_campaign=region_paid_first_film
const go = new URL(R.linkDoPasse())
ok(go.origin + go.pathname === 'https://www.usekineo.com/api/region-pass' && go.searchParams.get('surface') === 'first_film' && go.searchParams.get('go') === '1', 'link = /api/region-pass?surface=first_film&go=1')
const dec = RP.decideRegionPassRequest({ userId: 'u', profile: { trial_status: 'region_paid_only', has_paid: false, plan: 'free' }, surface: go.searchParams.get('surface'), go: go.searchParams.get('go') === '1', ipCountry: 'IN', acceptLanguage: null })
ok(dec.kind === 'redirect' && dec.location.includes('pack=starter') && dec.location.includes('intent_campaign=region_paid_first_film'), 'clique → checkout do passe com intent_campaign=region_paid_first_film')
ok(dec.event && dec.event.name === 'region_paid_offer_clicked', 'clique grava region_paid_offer_clicked (servidor)')
// exemplo: vitrine pública, filme da casa, nunca /v/
const ex = R.exemploDaVitrine()
ok(ex && new URL(ex.href).pathname === '/showcase', 'exemplo leva à vitrine pública /showcase')
ok(/export const SHOWCASE_PUBLIC = true/.test(read('lib/showcaseTelemetry.ts')), 'a vitrine está pública')
const lead = read('lib/publicExamples.ts')
ok(lead.includes(`title: '${ex.title}'`) && read('lib/showcase.ts').includes("'90bd8367-60c6-4811-8fdd-3a5b0200eec6'") && lead.includes("id: '90bd8367-60c6-4811-8fdd-3a5b0200eec6', title: '" + ex.title), 'o exemplo é o filme líder do Seedance e está na vitrine')
ok(!/\/v\//.test(semComentario(lib)) && !/\/v\//.test(semComentario(rota)), 'nenhum /v/ (vídeo de cliente) na carta nem na rota')

// as cartas
const footer = { text: '\n[unsubscribe]', html: '<!--footer-->' }
const pBR = R.precoDaCarta('BR'), pIN = R.precoDaCarta('IN')
const cPass = R.cartaDoPasse('en', pIN, footer)
ok(R.assuntoDaCarta('pass', 'en', pIN) === `Your first Kineo film for ${pIN.label}`, 'assunto do passe (en)')
ok(R.assuntoDaCarta('pass', 'pt', pBR) === `Seu primeiro filme na Kineo por ${pBR.label}` && pBR.label.includes('R$'), 'assunto do passe (pt, em reais)')
ok(cPass.text.includes(R.linkDoPasse()) && cPass.html.includes(R.linkDoPasse().replace(/&/g, '&amp;')), 'link do passe nos dois corpos')
ok(cPass.text.includes(pIN.label) && cPass.text.includes(String(pIN.seconds)) && cPass.text.includes('Charged in USD'), 'carta do passe: preço, 60 s e moeda')
ok(cPass.text.includes(ex.href) && cPass.text.includes(ex.title), 'carta do passe: exemplo real')
ok(cPass.text.endsWith('[unsubscribe]') && cPass.html.endsWith('<!--footer-->'), 'rodapé de descadastro nos dois corpos (passe)')
ok(/subscription|assinatura|suscripción/i.test(R.cartaDoPasse('es', pIN, footer).text), 'passe diz "sem assinatura"')
const ideias = R.ideiasDaCarta('horror')
ok(ideias.fonte === 'niche' && ideias.ideias.length === 3, 'carta grátis: 3 ideias do nicho (mesmo gerador)')
ok(R.ideiasDaCarta(null).fonte === 'showcase' && R.ideiasDaCarta(null).ideias.length === 3, 'sem nicho: 3 ideias da vitrine')
for (const i of [...ideias.ideias, ...R.ideiasDaCarta(null).ideias]) {
  const u = new URL(i.href)
  ok(u.pathname === '/studio/create' && u.searchParams.get('engine') === 'seedance' && u.searchParams.get('duration') === '15', 'ideia abre o Studio no Seedance 15 s')
  ok(u.searchParams.get('utm_campaign') === 'region_free_film_waiting' && !u.searchParams.has('create_intent'), 'campanha própria, nunca auto-start')
  const h = handoff.readCreationHandoff(u.searchParams)
  ok(h.duration === 15 && h.prompt === i.titulo && h.createIntent === null, 'o Studio lê 15 s e a ideia')
}
const own = new URL(R.linkDoCompositor())
ok(own.searchParams.get('engine') === 'seedance' && own.searchParams.get('duration') === '15' && !own.searchParams.has('prompt'), 'compositor livre no Seedance 15 s')
const cFree = R.cartaDoFilmeGratis('en', ideias.ideias, footer)
ok(R.assuntoDaCarta('free_film', 'en', pIN) === 'Your free film is waiting', 'assunto do filme grátis (en)')
ok(cFree.text.includes(ideias.ideias[0].href) && cFree.text.includes(R.linkDoCompositor()), 'carta grátis: as 3 ideias e o compositor')
ok(!/\$\d|R\$|credit|pack=|region-pass/i.test(cFree.text), 'carta grátis: sem preço, sem crédito, sem compra')
ok(/watermark/.test(cFree.text), 'carta grátis: diz que sai com marca d’água')
const cEsc = R.cartaDoFilmeGratis('pt', [{ titulo: '<b>x</b>', gancho: '', href: 'https://www.usekineo.com/studio/create?prompt=x' }, { titulo: 'b', gancho: '', href: 'https://x.test/b' }, { titulo: 'c', gancho: '', href: 'https://x.test/c' }], footer)
ok(cEsc.html.includes('&lt;b&gt;x&lt;/b&gt;') && !cEsc.html.includes('<b>x</b>'), 'título escapado no HTML')
ok(!R.cartaDoFilmeGratis('en', [], footer).text.includes('Three ideas'), 'sem 3 ideias: a carta sai só com o compositor')
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
ok(R.reservaDaCarta(sha, 'u1') === R.reservaDaCarta(sha, 'u1') && R.reservaDaCarta(sha, 'u1') !== R.reservaDaCarta(sha, 'u2'), 'reserva determinística por pessoa')
ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/.test(R.reservaDaCarta(sha, 'u1')), 'reserva é um UUID válido')

// ══ 3 · a rota EXECUTADA contra um banco simulado ════════════════════════════════════════════════════════════════════
console.log('3 · rota de admin executada')
const H = 3_600_000, DAY = 24 * H
const ago = (ms) => new Date(Date.now() - ms).toISOString()
function fixture() {
  const profiles = []
  // 1.100 contas da região que JÁ PAGARAM, mais antigas: os alvos moram depois da linha 1000 — readAll precisa paginar.
  for (let i = 0; i < 1100; i++) profiles.push({ id: `pay-${i}`, email: `p${i}@example.test`, plan: 'creator', has_paid: true, email_opted_out: false, created_at: ago(30 * DAY), trial_status: 'region_paid_only', video_credits: 0 })
  const add = (id, patch = {}) => profiles.push({ id, email: `${id}@example.test`, plan: 'free', has_paid: false, email_opted_out: false, created_at: ago(9 * DAY), trial_status: 'region_paid_only', video_credits: 5, signup_country: 'IN', last_country: null, signup_utm_campaign: null, ...patch })
  add('antiga')                                                     // passe (US$)
  add('antiga-br', { signup_country: 'BR' })                        // passe (R$, pt)
  add('nova', { created_at: ago(2 * DAY), video_credits: 14, signup_utm_campaign: 'push63_niche_horror' }) // filme grátis
  add('nova-clipe', { created_at: ago(2 * DAY), video_credits: 9 }) // fez o clipe → passe
  add('bloqueada', { trial_status: 'blocked' })
  add('pagou', { has_paid: true })
  add('pagou-evt')
  add('optout', { email_opted_out: true })
  add('interna', { email: 'josephsskaf+regiao@gmail.com' })
  add('alias', { email: 'antiga@example.test' })
  add('fez-filme')
  add('so-falhou', { created_at: ago(3 * DAY), video_credits: 14 }) // render falho não conta: filme grátis
  add('na-janela', { created_at: ago(2 * H), video_credits: 14 })
  add('cron-mandou', { created_at: ago(1 * DAY), video_credits: 14 })
  add('ja-recebeu')
  const videos = [
    { id: 'v1', user_id: 'nova-clipe', status: 'completed', quality_mode: 'clip' },
    { id: 'v2', user_id: 'fez-filme', status: 'completed', quality_mode: 'cinematic_ai' },
    { id: 'v3', user_id: 'so-falhou', status: 'failed', quality_mode: 'cinematic_ai' },
  ]
  const events = [
    { id: 'e1', user_id: 'pagou-evt', name: 'payment_success' },
    { id: 'e2', user_id: 'ja-recebeu', name: 'region_first_film_emailed' },
    { id: 'e3', user_id: 'cron-mandou', name: 'activation_nudge_sent' },
  ]
  return { profiles, videos, events, email_send_log: [] }
}
const ESPERADOS = ['nova', 'so-falhou', 'antiga', 'antiga-br', 'nova-clipe']

function makeDb(data) {
  const writes = []
  return {
    writes,
    from(table) {
      const conds = []
      let insertRow = null, range = null, head = false, update = null
      const q = {
        select(_c, opts) { if (opts?.head) head = true; return q },
        eq(c, v) { conds.push((r) => r[c] === v); return q },
        neq(c, v) { conds.push((r) => r[c] !== v); return q },
        gte(c, v) { conds.push((r) => String(r[c] ?? '') >= v); return q },
        in(c, arr) { conds.push((r) => arr.includes(r[c])); return q },
        order() { return q },
        range(a, b) { range = [a, b]; return q },
        insert(row) { insertRow = row; return q },
        update(row) { update = row; return q },
        maybeSingle() { return q },
        then(resolve, reject) {
          let result
          if (update) { writes.push({ table, row: update, update: true }); result = { data: null, error: null } }
          else if (insertRow) {
            writes.push({ table, row: insertRow })
            const rows = data[table] ?? (data[table] = [])
            if (insertRow.id && rows.some((r) => r.id === insertRow.id)) result = { data: null, error: { code: '23505' } }
            else { rows.push({ id: insertRow.id ?? `auto-${rows.length}`, ...insertRow }); result = { data: null, error: null } }
          } else {
            let rows = (data[table] ?? []).filter((r) => conds.every((f) => f(r)))
            if (head) result = { data: null, error: null, count: rows.length }
            else { if (range) rows = rows.slice(range[0], range[1] + 1); result = { data: rows, error: null } }
          }
          return Promise.resolve(result).then(resolve, reject)
        },
      }
      return q
    },
  }
}

async function runRoute({ qs = '', admin = true, degraded = false, suppressed = [], data, source = null } = {}) {
  const db = makeDb(data)
  const sent = []
  const Lr = createOfflineLoader({
    source: source ? (p, s) => (p === ROTA ? source(s) : s) : null,
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.test', SUPABASE_SERVICE_ROLE_KEY: 'offline-fixture-not-a-secret', RESEND_API_KEY: 'offline-fixture' },
    globals: {
      setTimeout: (fn) => { fn(); return 0 },
      fetch: async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return { ok: true, status: 200, json: async () => ({ id: 'r' }) } },
    },
    mocks: {
      'next/server': { NextResponse: { json: (body, o) => ({ body, status: o?.status ?? 200 }) } },
      '@supabase/supabase-js': { createClient: () => db },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: admin ? { id: 'adm', email: 'josephsskaf@gmail.com' } : { id: 'x', email: 'stranger@example.test' } } }) } }) },
      '@/lib/lifecycle/suppression': { loadLifecycleSuppression: async () => ({ degraded, eventsDegraded: false, suppressedCount: suppressed.length, isSuppressed: (id) => suppressed.includes(id) }) },
      '@/lib/emailSuppression': { emailFooterText: () => '\n[unsubscribe]', emailFooterHtml: () => '<!--footer-->', unsubscribeHeaders: () => ({ 'List-Unsubscribe': '<fixture>' }) },
      '@/lib/email/quota': { dailyCap: () => 1000, recordResendResponse: async () => {} },
      '../_shared/mrr': { PAID_PLANS: new Set(['starter', 'basic', 'pro', 'creator', 'studio', 'business']) },
    },
  })
  const api = Lr(ROTA)
  const res = await api.GET({ nextUrl: { searchParams: new URLSearchParams(qs) } })
  return { res, sent, writes: db.writes }
}

{
  const r = await runRoute({ admin: false, data: fixture() })
  ok(r.res.status === 403 && r.sent.length === 0, 'não-admin → 403, nada enviado')
}
{
  const r = await runRoute({ data: fixture() })
  ok(r.res.body.mode === 'DRY_RUN', 'sem parâmetro = DRY-RUN')
  ok(r.sent.length === 0, 'DRY-RUN não envia')
  ok(r.writes.every((w) => w.row.name === 'campaign_run_v1'), 'DRY-RUN só grava o relatório da corrida')
  ok(r.res.body.elegiveis === ESPERADOS.length, `exatamente ${ESPERADOS.length} elegíveis (alvos depois da linha 1000) — veio ${r.res.body.elegiveis}`)
  ok(r.res.body.por_carta.free_film === 2 && r.res.body.por_carta.pass === 3, `2 filme grátis + 3 passe — veio ${JSON.stringify(r.res.body.por_carta)}`)
  ok(r.res.body.por_lingua.pt === 1 && r.res.body.por_moeda_do_passe.brl === 1 && r.res.body.por_moeda_do_passe.usd === 2, 'BR em português e reais; o resto em dólar')
  const c = r.res.body.contadores
  ok(c.regiao === 1100 + 14 && c.plano_pago === 1100, 'leu as 1.114 contas da região (paginado) e tirou os 1.100 pagantes')
  ok(c.perfil_recusado === 2 && c.interno === 1 && c.alias_repetido === 1 && c.ja_fez_filme === 1 && c.pagou === 1 && c.ja_recebeu === 1 && c.na_janela_do_cron === 1 && c.ja_recebeu_carta_do_cron === 1,
    `contadores de cada filtro batem — ${JSON.stringify(c)}`)
  ok(r.res.body.amostra.every((l) => !/bloqueada|pagou|optout|josephsskaf|fez-filme|na-janela|cron-mandou|ja-recebeu|alias/.test(l)), 'amostra sem nenhum excluído')
  ok(r.res.body.amostra[0].startsWith('nova@') || r.res.body.amostra[0].startsWith('so-falhou@'), 'filme grátis parado vem primeiro no lote')
  ok(r.res.body.links.passe === R.linkDoPasse() && /\/showcase\?/.test(r.res.body.links.exemplo), 'links de ensaio expostos no dry-run')
}
{
  const r = await runRoute({ qs: 'confirm=send&limit=5', data: fixture() })
  ok(r.res.body.mode === 'DRY_RUN' && r.sent.length === 0, '?confirm=send (minúsculo) continua ensaio')
}
{
  const r = await runRoute({ qs: 'variant=pass', data: fixture() })
  ok(r.res.body.elegiveis === 3 && r.res.body.contadores.outra_variante === 2, '?variant=pass filtra a carta')
}
{
  const r = await runRoute({ suppressed: ['nova'], data: fixture() })
  ok(r.res.body.elegiveis === ESPERADOS.length - 1 && r.res.body.suprimidos_24h === 1, 'supressão de 24 h tira a pessoa')
}
{
  const data = fixture()
  const r = await runRoute({ qs: 'confirm=SEND&limit=10', data })
  ok(r.res.body.mode === 'SENT' && r.res.body.enviados === ESPERADOS.length && r.sent.length === ESPERADOS.length, 'SEND envia para os elegíveis')
  ok(r.sent.every((s) => s.url === 'https://api.resend.com/emails' && s.body.to.length === 1 && s.body.from === 'Kineo Team <hello@usekineo.com>'), '1 destinatário por envio, remetente da casa')
  const to = (id) => r.sent.find((s) => s.body.to[0] === `${id}@example.test`)
  ok(ESPERADOS.every((id) => to(id)), 'cada alvo recebeu (e só eles)')
  ok(new Set(r.sent.map((s) => s.body.to[0])).size === r.sent.length, 'ninguém recebeu duas')
  ok(to('nova').body.subject === 'Your free film is waiting' && to('nova').body.text.includes('engine=seedance'), 'nova: carta do filme grátis')
  ok(ideias.ideias.every((i) => to('nova').body.text.includes(i.titulo)), 'nova: ideias do nicho DELA (terror)')
  ok(to('antiga').body.subject === `Your first Kineo film for ${pIN.label}` && to('antiga').body.text.includes('/api/region-pass?surface=first_film&go=1'), 'antiga: passe em dólar com o link do banner')
  ok(to('antiga-br').body.subject === `Seu primeiro filme na Kineo por ${pBR.label}` && to('antiga-br').body.text.includes('Cobrado em BRL'), 'antiga-br: passe em reais, em português')
  ok(to('nova-clipe').body.subject.startsWith('Your first Kineo film for'), 'quem fez o clipe recebe o passe (filme grátis não admissível)')
  ok(r.sent.every((s) => !/\/v\//.test(s.body.text) && !/\/v\//.test(s.body.html)), 'nenhum /v/ nas cartas')
  ok(r.sent.every((s) => s.body.text.endsWith('[unsubscribe]') && s.body.headers['List-Unsubscribe']), 'descadastro em toda carta')
  const names = r.writes.map((w) => w.row.name)
  ok(names.filter((n) => n === 'region_first_film_claimed').length === ESPERADOS.length && names.filter((n) => n === 'region_first_film_emailed').length === ESPERADOS.length, 'reserva antes, carimbo depois, um de cada por pessoa')
  const iClaim = r.writes.findIndex((w) => w.row.name === 'region_first_film_claimed'), iSent = r.writes.findIndex((w) => w.row.name === 'region_first_film_emailed')
  ok(iClaim >= 0 && iClaim < iSent, 'a reserva vem antes do carimbo')
  ok(r.writes.filter((w) => w.row.name === 'region_first_film_emailed').every((w) => !JSON.stringify(w.row.metadata).includes('@')), 'carimbo sem e-mail (sem PII)')
  ok(!r.writes.some((w) => w.table === 'profiles' || w.update), 'nenhum crédito dado (nenhuma escrita em profiles)')
  const again = await runRoute({ qs: 'confirm=SEND&limit=10', data })
  ok(again.sent.length === 0, 'segunda corrida não reenvia (dedupe por carimbo/reserva)')
  ok((await runRoute({ data })).res.body.elegiveis === 0, 'depois do envio a lista zera')
}
{
  const data = fixture()
  const r = await runRoute({ qs: 'confirm=SEND&limit=2', data })
  ok(r.sent.length === 2 && r.res.body.restantes === ESPERADOS.length - 2, 'limit=2 manda 2 e diz quantos restam')
  ok(/inteiro\(req\.nextUrl\.searchParams\.get\('limit'\), REGION_FIRST_FILM_EMAIL_BATCH_DEFAULT, REGION_FIRST_FILM_EMAIL_BATCH_MAX\)/.test(rota) && R.REGION_FIRST_FILM_EMAIL_BATCH_DEFAULT === 30 && R.REGION_FIRST_FILM_EMAIL_BATCH_MAX === 60, 'lote padrão 30, teto 60')
}
{
  const r = await runRoute({ qs: 'confirm=SEND', degraded: true, data: fixture() })
  ok(r.res.status === 503 && r.sent.length === 0, 'supressão degradada → 503 e nada sai (falha fechada)')
}
{
  // a reserva de outra aba já existe para 'antiga': ela é pulada, as outras saem.
  const data = fixture()
  data.events.push({ id: R.reservaDaCarta(sha, 'antiga'), user_id: 'zz-outro', name: 'campaign_run_v1' })
  const r = await runRoute({ qs: 'confirm=SEND&limit=10', data })
  ok(r.res.body.pulados === 1 && !r.sent.some((s) => s.body.to[0] === 'antiga@example.test'), 'reserva existente (2º clique) → pula, não reenvia')
}

// Mutantes: cada trava retirada TEM de ser pega por uma das execuções acima.
async function mutante(nome, from, to, prova) {
  ok(rota.includes(from), `mutante "${nome}" aplicou`)
  let pego = false
  try { pego = !(await prova((s) => s.replace(from, to))) } catch { pego = true }
  ok(pego, `mutante pego: ${nome}`)
}
const N = ESPERADOS.length
await mutante('envio sem confirm', "req.nextUrl.searchParams.get('confirm') === 'SEND'", 'true',
  async (src) => (await runRoute({ data: fixture(), source: src })).sent.length === 0)
{
  // 'blocked' tem TRÊS camadas: a consulta (.eq), a defesa no laço e a régua pura (varianteDaCarta). Tiradas as duas
  // primeiras, a terceira ainda barra — e tirada a terceira também, ela entra (prova de que o fixture a exercita).
  const sem2 = (s) => s.replace(".eq('trial_status', REGION_PAID_ONLY_TRIAL_STATUS)", '').replace('if (p.trial_status !== REGION_PAID_ONLY_TRIAL_STATUS) { contadores.nao_regiao++; continue }', '')
  ok(rota.includes(".eq('trial_status', REGION_PAID_ONLY_TRIAL_STATUS)") && rota.includes('if (p.trial_status !== REGION_PAID_ONLY_TRIAL_STATUS) { contadores.nao_regiao++; continue }'), 'blocked: as duas camadas da rota existem')
  const r2 = await runRoute({ data: fixture(), source: sem2 })
  ok(r2.res.body.elegiveis === N && r2.res.body.contadores.fora_das_cartas === 1, "sem consulta e defesa, a régua pura ainda barra 'blocked'")
  const r3 = await runRoute({ data: fixture(), source: (s) => sem2(s).replace('const variant = varianteDaCarta(v.row as never, videosNaoFalhos.get(v.id) ?? 0)', "const variant = 'pass' as RegionFirstFilmVariant") })
  ok(r3.res.body.elegiveis > N, "sem as três camadas 'blocked' entraria (o fixture exercita o caso)")
}
await mutante('pagante volta', 'if (pagou.has(v.id)) { contadores.pagou++; continue }', '',
  async (src) => (await runRoute({ data: fixture(), source: src })).res.body.elegiveis === N)
await mutante('quem já recebeu volta', 'if (jaRecebeu.has(v.id)) { contadores.ja_recebeu++; continue }', '',
  async (src) => (await runRoute({ data: fixture(), source: src })).res.body.elegiveis === N)
await mutante('alias não deduplica', 'if (emailsVistos.has(email)) { contadores.alias_repetido++; continue }', '',
  async (src) => (await runRoute({ data: fixture(), source: src })).res.body.elegiveis === N)
await mutante('quem fez filme volta', 'if (fezFilme.has(v.id)) { contadores.ja_fez_filme++; continue }', '',
  async (src) => (await runRoute({ data: fixture(), source: src })).res.body.elegiveis === N)
await mutante('janela do cron ignorada', "if (String(p.created_at ?? '') > fimDaJanelaDoCron) { contadores.na_janela_do_cron++; continue }", '',
  async (src) => (await runRoute({ data: fixture(), source: src })).res.body.elegiveis === N)
await mutante('carta do cron ignorada', "if (variant === 'free_film' && cartaDoCron.has(v.id)) { contadores.ja_recebeu_carta_do_cron++; continue }", '',
  async (src) => (await runRoute({ data: fixture(), source: src })).res.body.elegiveis === N)
await mutante('opt-out/pagante da régua ignorados', 'if (!winbackProfileOk(p)) { contadores.perfil_recusado++; continue }', '',
  async (src) => (await runRoute({ data: fixture(), source: src })).res.body.elegiveis === N)
await mutante('supressão ignorada no envio', 'if (supressaoDegradada) {', 'if (false) {',
  async (src) => (await runRoute({ qs: 'confirm=SEND', degraded: true, data: fixture(), source: src })).sent.length === 0)
await mutante('reserva ignorada', "if (reserva.error) { pulados++;", "if (false) { pulados++;",
  async (src) => { const d = fixture(); d.events.push({ id: R.reservaDaCarta(sha, 'antiga'), user_id: 'zz', name: 'x' }); return !(await runRoute({ qs: 'confirm=SEND&limit=10', data: d, source: src })).sent.some((s) => s.body.to[0] === 'antiga@example.test') })
// conta interna: duas camadas (isInternalEmail + a régua WINBACK_INTERNAL_RE já testada no guardião de 13/10) — exigidas por leitura.
ok(rota.includes('if (isInternalEmail(email)) { contadores.interno++; continue }'), 'rota: isInternalEmail antes de tudo')

// ══ 4 · cadastro estático ══════════════════════════════════════════════════════════════════════════════════════════════
console.log('4 · cadastro')
const evs = read('lib/lifecycle/emailEvents.ts')
ok(evs.includes("  'region_first_film_emailed',\n") && !evs.includes("'region_first_film_claimed'"), 'carimbo na supressão de 24 h; reserva fora')
const evRoute = read('app/api/events/route.ts')
ok(evRoute.includes("  'region_first_film_claimed',\n") && evRoute.includes("  'region_first_film_emailed',\n"), 'carimbo e reserva são server-only (SERVER_ONLY_EVENTS)')
ok(R.REGION_FIRST_FILM_EMAIL_SENT === 'region_first_film_emailed' && R.REGION_FIRST_FILM_EMAIL_CLAIM === 'region_first_film_claimed', 'os nomes batem com o módulo')
ok(!/CRON_SECRET/.test(rota), 'sem porta de cron: só sessão de admin')
ok(!/\.update\(\{|video_credits:|admin_credits_granted/.test(semComentario(rota)), 'a rota não escreve perfil nem dá crédito')
ok((rota.match(/readAll\(/g) ?? []).length >= 3 && !/\.limit\(/.test(rota), 'toda leitura de lista por readAll, nenhum .limit()')
ok(rota.includes("priority: 'growth'") && rota.includes('Math.floor(dailyCap() * 0.6)'), "cota diária de e-mails de crescimento ('growth', 60%)")
ok(rota.includes('KINEO-EMAILS-REGIAO-2026-10-13') && lib.includes('KINEO-EMAILS-REGIAO-2026-10-13') && nudge.includes('KINEO-EMAILS-REGIAO-2026-10-13') && read('lib/lifecycle/lembreteComIdeia.ts').includes('KINEO-EMAILS-REGIAO-2026-10-13'), 'comentário-marca presente')

console.log(`emails-regiao 13/10: ${pass} verificações ok (cron + régua + rota executada com 1.114 perfis + 11 mutantes/camadas)`)
