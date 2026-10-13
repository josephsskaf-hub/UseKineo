#!/usr/bin/env node
// ═══ KINEO-EMAILS-VENDA-2026-10-13 — guardião das AÇÕES 2 e 3 de vendas ═══════════════════════════════════════════════
//
// AÇÃO 2 — admin/send-winback-film-60s ("seu filme está pronto — quer a versão de 60 s?"):
//   · DRY-RUN POR PADRÃO e só ?confirm=SEND (exato) envia — provado EXECUTANDO a rota com um banco simulado;
//   · opt-out, pagante (has_paid, plano pago, payment_success), conta interna e quem já recebeu ficam fora;
//   · dedupe que não trunca: 1.150 perfis no banco simulado, o alvo mora DEPOIS da linha 1000;
//   · nenhum vídeo público: nada de /v/, nada de video_url; o link de ver é a biblioteca logada;
//   · link de compra = Creator mensal, intent_campaign=winback_film_60s, sem ?promo= e sem recovery=1 — e a régua real
//     welcome20AutoSkipReason, executada com esses parâmetros, devolve null (o WELCOME20 automático aplica);
//   · preço da fonte única (buyCreatorPrice), nenhum crédito dado.
// AÇÃO 3 — send-activation-nudge (a carta do 1º filme que JÁ existe, melhorada, não duplicada):
//   · as 3 ideias por nicho são frases VERBATIM da página do nicho; sem nicho, filmes da vitrine;
//   · todo link de ideia abre o Studio com a ideia, Seedance 1.5, 15 s — e lib/creationHandoff.ts lê assim;
//   · nunca create_intent, nenhuma carta nova, nenhum cron novo.
//
// Rodar: node scripts/test-emails-venda-2026-10-13.mjs   (offline: sem rede, sem banco, sem custo)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
let pass = 0
const ok = (cond, name) => { assert.ok(cond, name); pass++ }

const ROTA = 'app/api/admin/send-winback-film-60s/route.ts'
const LIB2 = 'lib/growth/winbackFilm60s.ts'
const LIB3 = 'lib/lifecycle/primeiroFilmeIdeias.ts'
const NUDGE = 'app/api/cron/send-activation-nudge/route.ts'
const rota = read(ROTA), lib2 = read(LIB2), lib3 = read(LIB3), nudge = read(NUDGE)
const semComentario = (s) => s.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')

// ══ AÇÃO 2 · a régua pura ═════════════════════════════════════════════════════════════════════════════════════════════
const load = createOfflineLoader()
const W = load(LIB2)
const promo = load('lib/growth/publicPromoTruth.ts')
const buy = load('lib/growth/buyCreatorOffer.ts')
const good = { id: 'u-good', email: 'maker@example.test', plan: 'free', has_paid: false, email_opted_out: false }
ok(W.winbackProfileOk(good) === true, 'conta grátis comum entra')
for (const [patch, why] of [
  [{ email_opted_out: true }, 'opt-out'], [{ has_paid: true }, 'has_paid'], [{ has_paid: null }, 'has_paid desconhecido'],
  [{ plan: 'creator' }, 'plano pago'], [{ plan: 'basic_trial' }, 'trial pago'], [{ email: 'josephsskaf+x@gmail.com' }, 'interno josephsskaf'],
  [{ email: 'josepghsskaf@gmail.com' }, 'interno josepghsskaf'], [{ email: 'ana@usekineo.com' }, 'interno @usekineo.com'],
  [{ email: 'den.higgins@example.test' }, 'lista nunca-escrever'], [{ email: 'x@mailinator.com' }, 'descartável'], [{ email: 'sem-arroba' }, 'e-mail inválido'],
]) ok(W.winbackProfileOk({ ...good, ...patch }) === false, `fora: ${why}`)

const buyUrl = new URL(W.winbackCheckoutUrl())
ok(buyUrl.origin + buyUrl.pathname === 'https://www.usekineo.com/api/stripe/checkout', 'compra vai à rota do checkout')
ok(buyUrl.searchParams.get('tier') === 'basic' && buyUrl.searchParams.get('billing') === 'monthly', 'Creator mensal')
ok(buyUrl.searchParams.get('intent_campaign') === 'winback_film_60s', 'intent_campaign=winback_film_60s')
ok(/^[A-Za-z0-9._~-]{1,100}$/.test(buyUrl.searchParams.get('intent_campaign')), 'intent_campaign passa no sanitizador do checkout')
ok(!buyUrl.searchParams.has('promo') && !buyUrl.searchParams.has('recovery') && !buyUrl.searchParams.has('trial') && !buyUrl.searchParams.has('intro'),
  'sem promo/recovery/trial/intro (cada um faria o WELCOME20 automático pular)')
// A régua REAL do checkout, com os parâmetros que o link produz (sem cookie de afiliado).
ok(promo.welcome20AutoSkipReason({
  live: promo.WELCOME20_SITE_OFFER_LIVE, tier: buyUrl.searchParams.get('tier'), isAnnual: buyUrl.searchParams.get('billing') === 'annual',
  promoRequested: buyUrl.searchParams.has('promo'), wantsTrial: buyUrl.searchParams.get('trial') === '1', introDiscount: false,
  checkoutRecovery: buyUrl.searchParams.get('recovery') === '1', affiliatePresent: false,
}) === (promo.WELCOME20_SITE_OFFER_LIVE ? null : 'switch_off'), 'welcome20AutoSkipReason(link) = null → WELCOME20 automático aplica')
const route = read('app/api/stripe/checkout/route.ts')
ok(/const checkoutRecovery = req\.nextUrl\.searchParams\.get\('recovery'\) === '1'/.test(route), 'checkout ainda lê recovery assim (o link não o manda)')

const watch = new URL(W.winbackWatchUrl())
ok(watch.pathname === '/history', 'ver o filme = biblioteca logada (/history)')
ok(/protectedPaths = \['\/history', '\/library'\]/.test(read('lib/supabase/middleware.ts')), '/history continua protegido pelo middleware (login)')
ok(!/\/v\//.test(semComentario(lib2)) && !/\/v\//.test(semComentario(rota)), 'nenhum /v/ (página pública) na carta nem na rota')
ok(!/video_url|final_video_url|enhanced_url/.test(rota), 'a rota nem lê a URL do MP4')

const offer = W.winbackOffer()
const price = buy.buyCreatorPrice()
ok(offer.firstMonth === price.firstMonth && offer.full === price.full, 'preço = buyCreatorPrice (fonte única)')
ok(price.firstMonth === null || offer.cta.includes(price.firstMonth), 'CTA mostra o 1º mês da fonte única')
ok(!/\$\d/.test(lib2.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\$\{/g, '')), 'nenhum preço digitado no código do módulo da carta')
const off = W.winbackOffer(false)
ok(off.firstMonth === null && !off.cta.includes('%'), 'interruptor desligado → os 20% somem da carta')
const footer = { text: '\n[unsubscribe]', html: '<!--footer-->' }
const b1 = W.winbackBody('The lake that turns <animals> to stone', 'short', footer)
ok(b1.html.includes('&lt;animals&gt;') && !b1.html.includes('<animals>'), 'título escapado no HTML')
ok(b1.text.includes(W.winbackCheckoutUrl()) && b1.html.includes(W.winbackCheckoutUrl()), 'link de compra nos dois corpos')
ok(b1.text.includes(W.winbackWatchUrl()) && b1.html.includes(W.winbackWatchUrl()), 'link da biblioteca nos dois corpos')
ok(b1.text.endsWith('[unsubscribe]') && b1.html.endsWith('<!--footer-->'), 'rodapé de descadastro nos dois corpos')
ok(!/credit/i.test(b1.text), 'a carta não fala de crédito (crédito não é isca)')
const b2 = W.winbackBody(null, 'retired_engine', footer)
ok(b2.text.includes('your first film') && b2.text.includes('Kineo 1') && b2.text.includes('Seedance 1.5'), 'sem título: não inventa nome; Kineo 1 → Seedance')
ok(W.winbackFilmTitle('Hello\r\nBcc: evil@x.test', null) === null || !String(W.winbackFilmTitle('Hello\r\nBcc: evil@x.test', null)).includes('\n'), 'título sem quebra de linha (injeção de cabeçalho)')
ok(W.winbackFilmKind('fast', 62) === 'retired_engine' && W.winbackFilmKind('cinematic_ai', 16) === 'short' && W.winbackFilmKind('cinematic_ai', 62) === 'short', 'tipo do filme pelo motor')
ok(W.winbackIsFilm({ status: 'completed', quality_mode: 'clip' }) === false && W.winbackIsFilm({ status: 'completed', quality_mode: 'fast' }) === true, 'clipe de efeito não é filme')
const crypto = await import('node:crypto')
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
ok(W.winbackClaimId(sha, 'u1') === W.winbackClaimId(sha, 'u1') && W.winbackClaimId(sha, 'u1') !== W.winbackClaimId(sha, 'u2'), 'reserva determinística por pessoa')
ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/.test(W.winbackClaimId(sha, 'u1')), 'reserva é um UUID válido')

// ══ AÇÃO 2 · a rota EXECUTADA contra um banco simulado ═══════════════════════════════════════════════════════════════
const DAY = 86_400_000
const recent = (d) => new Date(Date.now() - d * DAY).toISOString()
function fixture() {
  const profiles = []
  // 1.100 perfis pagantes antes (ordenados por created_at): o alvo mora depois da linha 1000 — readAll precisa paginar.
  for (let i = 0; i < 1100; i++) profiles.push({ id: `pay-${i}`, email: `p${i}@example.test`, plan: 'creator', has_paid: true, email_opted_out: false, created_at: recent(29) })
  const add = (id, patch = {}) => profiles.push({ id, email: `${id}@example.test`, plan: 'free', has_paid: false, email_opted_out: false, created_at: recent(5), ...patch })
  add('alvo')                                   // entra
  add('alvo2')                                  // entra (sem título)
  add('optout', { email_opted_out: true })
  add('pagou-evt')                              // payment_success na história
  add('ja-recebeu')                             // carimbo antigo desta carta
  add('interno', { email: 'josepghsskaf@gmail.com' })
  add('so-clipe')
  add('sem-filme')
  add('alias', { email: 'alvo@example.test' })  // mesmo e-mail do alvo
  const videos = [
    { id: 'v1', user_id: 'alvo', status: 'completed', quality_mode: 'cinematic_ai', title: 'The Lake That Turns Animals to Stone', topic: null, duration: 16, duration_seconds: null, created_at: recent(1), video_url: 'https://x/secret.mp4' },
    { id: 'v2', user_id: 'alvo2', status: 'completed', quality_mode: 'fast', title: null, topic: null, duration: 62, duration_seconds: null, created_at: recent(2) },
    { id: 'v3', user_id: 'optout', status: 'completed', quality_mode: 'fast', title: 'x', created_at: recent(1) },
    { id: 'v4', user_id: 'pagou-evt', status: 'completed', quality_mode: 'fast', title: 'x', created_at: recent(1) },
    { id: 'v5', user_id: 'ja-recebeu', status: 'completed', quality_mode: 'fast', title: 'x', created_at: recent(1) },
    { id: 'v6', user_id: 'interno', status: 'completed', quality_mode: 'fast', title: 'x', created_at: recent(1) },
    { id: 'v7', user_id: 'so-clipe', status: 'completed', quality_mode: 'clip', title: 'x', created_at: recent(1) },
    { id: 'v8', user_id: 'alias', status: 'completed', quality_mode: 'fast', title: 'x', created_at: recent(1) },
  ]
  const events = [
    { id: 'e1', user_id: 'pagou-evt', name: 'payment_success' },
    { id: 'e2', user_id: 'ja-recebeu', name: 'winback_film_60s_emailed' },
  ]
  return { profiles, videos, events, email_send_log: [] }
}

function makeDb(data) {
  const writes = []
  return {
    writes,
    from(table) {
      const conds = []
      let insertRow = null, range = null, head = false
      const q = {
        select(_c, opts) { if (opts?.head) head = true; return q },
        eq(c, v) { conds.push((r) => r[c] === v); return q },
        gte(c, v) { conds.push((r) => String(r[c] ?? '') >= v); return q },
        in(c, arr) { conds.push((r) => arr.includes(r[c])); return q },
        order() { return q },
        range(a, b) { range = [a, b]; return q },
        insert(row) { insertRow = row; return q },
        maybeSingle() { return q },
        then(resolve, reject) {
          let result
          if (insertRow) {
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

async function runRoute({ qs = '', admin = true, degraded = false, data, source = null } = {}) {
  const db = makeDb(data)
  const sent = []
  const L = createOfflineLoader({
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
      '@/lib/lifecycle/suppression': { loadLifecycleSuppression: async () => ({ degraded, eventsDegraded: false, suppressedCount: 0, isSuppressed: () => false }) },
      '@/lib/emailSuppression': { emailFooterText: () => '\n[unsubscribe]', emailFooterHtml: () => '<!--footer-->', unsubscribeHeaders: () => ({ 'List-Unsubscribe': '<fixture>' }) },
      '@/lib/email/quota': { dailyCap: () => 1000, recordResendResponse: async () => {} },
      '../_shared/mrr': { PAID_PLANS: new Set(['starter', 'basic', 'pro', 'creator', 'studio', 'business']) },
    },
  })
  const api = L(ROTA)
  const res = await api.GET({ nextUrl: { searchParams: new URLSearchParams(qs) } })
  return { res, sent, writes: db.writes }
}

{
  const r = await runRoute({ admin: false, data: fixture() })
  ok(r.res.status === 403 && r.sent.length === 0, 'não-admin → 403, nada enviado')
}
{
  const data = fixture()
  const r = await runRoute({ data })
  ok(r.res.body.mode === 'DRY_RUN', 'sem parâmetro = DRY-RUN')
  ok(r.sent.length === 0, 'DRY-RUN não envia')
  ok(r.writes.every((w) => w.row.name === 'campaign_run_v1'), 'DRY-RUN só grava o relatório da corrida (nenhuma reserva, nenhum carimbo)')
  ok(r.res.body.elegiveis === 2, `exatamente 2 elegíveis (alvo depois da linha 1000 + alvo2) — veio ${r.res.body.elegiveis}`)
  const c = r.res.body.contadores
  ok(c.so_clipe === 1 && c.sem_filme === 1 && c.pagou === 1 && c.ja_recebeu === 1 && c.alias_repetido === 1, 'contadores de cada filtro batem')
  ok(r.res.body.amostra.every((l) => !/optout|pagou-evt|ja-recebeu|josepghsskaf|so-clipe|sem-filme/.test(l)), 'amostra sem nenhum excluído')
  ok(!JSON.stringify(r.res.body).includes('secret.mp4'), 'o dry-run não expõe URL de vídeo')
}
{
  const r = await runRoute({ qs: 'confirm=send&limit=5', data: fixture() })
  ok(r.res.body.mode === 'DRY_RUN' && r.sent.length === 0, '?confirm=send (minúsculo) continua ensaio')
}
{
  const data = fixture()
  const r = await runRoute({ qs: 'confirm=SEND&limit=5', data })
  ok(r.res.body.mode === 'SENT' && r.res.body.enviados === 2 && r.sent.length === 2, 'SEND envia para os 2 elegíveis')
  ok(r.sent.every((s) => s.url === 'https://api.resend.com/emails' && s.body.to.length === 1), '1 destinatário por envio')
  ok(r.sent.every((s) => s.body.from === 'Kineo Team <hello@usekineo.com>'), 'remetente Kineo Team <hello@>')
  ok(new Set(r.sent.map((s) => s.body.to[0])).size === 2 && r.sent.every((s) => /^alvo2?@example\.test$/.test(s.body.to[0])), 'só alvo e alvo2 (alias deduplicado)')
  ok(r.sent.every((s) => s.body.text.includes('intent_campaign=winback_film_60s') && !s.body.text.includes('/v/') && !s.body.text.includes('secret.mp4')), 'carta com o link de compra e sem vídeo público')
  ok(r.sent.some((s) => s.body.subject.includes('The Lake That Turns Animals to Stone')), 'o assunto nomeia o filme DELA')
  const names = r.writes.map((w) => w.row.name)
  ok(names.filter((n) => n === 'winback_film_60s_claimed').length === 2 && names.filter((n) => n === 'winback_film_60s_emailed').length === 2, 'reserva antes, carimbo depois, um de cada por pessoa')
  ok(!r.writes.some((w) => w.table === 'profiles'), 'nenhum crédito dado (nenhuma escrita em profiles)')
  const again = await runRoute({ qs: 'confirm=SEND&limit=5', data })
  ok(again.sent.length === 0, 'segunda corrida não reenvia (dedupe por carimbo/reserva)')
  const dry = await runRoute({ data })
  ok(dry.res.body.elegiveis === 0, 'depois do envio a lista zera')
}
{
  const r = await runRoute({ qs: 'confirm=SEND', degraded: true, data: fixture() })
  ok(r.res.status === 503 && r.sent.length === 0, 'supressão degradada → 503 e nada sai (falha fechada)')
}
// Mutantes: cada trava retirada TEM de ser pega por uma das execuções acima.
async function mutante(nome, from, to, prova) {
  ok(rota.includes(from), `mutante "${nome}" aplicou`)
  let pego = false
  try { pego = !(await prova((s) => s.replace(from, to))) } catch { pego = true }
  ok(pego, `mutante pego: ${nome}`)
}
await mutante('envio sem confirm', "req.nextUrl.searchParams.get('confirm') === 'SEND'", 'true',
  async (src) => (await runRoute({ data: fixture(), source: src })).sent.length === 0)
await mutante('pagante volta', 'if (pagou.has(v.id)) { contadores.pagou++; continue }', '',
  async (src) => (await runRoute({ data: fixture(), source: src })).res.body.elegiveis === 2)
await mutante('quem já recebeu volta', 'if (jaRecebeu.has(v.id)) { contadores.ja_recebeu++; continue }', '',
  async (src) => (await runRoute({ data: fixture(), source: src })).res.body.elegiveis === 2)
await mutante('alias não deduplica', 'if (emailsVistos.has(email)) { contadores.alias_repetido++; continue }', '',
  async (src) => (await runRoute({ data: fixture(), source: src })).res.body.elegiveis === 2)
await mutante('supressão ignorada no envio', 'if (supressaoDegradada) {', 'if (false) {',
  async (src) => (await runRoute({ qs: 'confirm=SEND', degraded: true, data: fixture(), source: src })).sent.length === 0)
// Conta interna tem DUAS camadas (isInternalEmail na rota + WINBACK_INTERNAL_RE na régua pura, já executada acima com
// josepghsskaf/@usekineo.com): tirar uma sozinha não deixa ninguém passar, então as duas são exigidas aqui por leitura.
ok(rota.includes('if (isInternalEmail(email)) { contadores.interno++; continue }'), 'rota: isInternalEmail antes de tudo')
ok(/if \(WINBACK_INTERNAL_RE\.test\(email\)\) return false/.test(lib2), 'régua: josephsskaf|josephskaf|josepghsskaf|@usekineo.com')

// Cadastro estático da campanha na casa.
ok(read('lib/lifecycle/emailEvents.ts').includes("  'winback_film_60s_emailed',\n"), 'carimbo na lista da supressão de 24 h')
ok(!read('lib/lifecycle/emailEvents.ts').includes("'winback_film_60s_claimed'"), 'reserva NÃO é envio (fora da supressão)')
const ev = read('app/api/events/route.ts')
ok(ev.includes("'winback_film_60s_emailed'") && ev.includes("'winback_film_60s_claimed'"), 'carimbo e reserva são server-only (o navegador não cunha)')
ok(!read('vercel.json').includes('send-winback-film-60s'), 'a rota não está no vercel.json (disparo é do fundador)')
ok(!/CRON_SECRET/.test(rota), 'sem porta de cron: só sessão de admin')
ok(!/video_credits|admin_credits_granted/.test(rota), 'a rota não dá crédito')
ok(rota.includes('KINEO-EMAILS-VENDA-2026-10-13') && lib2.includes('KINEO-EMAILS-VENDA-2026-10-13'), 'comentário-marca presente')
ok((rota.match(/readAll\(/g) ?? []).length >= 3 && !/\.limit\(/.test(rota), 'toda leitura de lista por readAll, nenhum .limit()')

// ══ AÇÃO 3 · as ideias do 1º filme ════════════════════════════════════════════════════════════════════════════════════
const I = load(LIB3)
const handoff = load('lib/creationHandoff.ts')
const page = read('app/free-ai-shorts/[niche]/page.tsx')
const slugs = Object.keys(I.NICHE_FIRST_FILM_IDEAS)
ok(slugs.length >= 25, `mapa de nichos lido (${slugs.length})`)
for (const s of slugs) {
  ok(page.includes(`\n  ${s}: {`), `nicho ${s} existe na página`)
  for (const idea of I.NICHE_FIRST_FILM_IDEAS[s].ideas) ok(page.includes(`'${idea}'`) || page.includes(`"${idea}"`), `ideia verbatim da página (${s}): ${idea.slice(0, 30)}`)
}
ok(I.nichoDoCadastro('push63_niche_horror') === 'horror' && I.nichoDoCadastro('PUSH63_NICHE_HORROR ') === 'horror', 'nicho lido do signup_utm_campaign')
ok(I.nichoDoCadastro('push63_niche_localbusiness') === null && I.nichoDoCadastro('seo_engine_seedance') === null && I.nichoDoCadastro(null) === null, 'sem nicho conhecido → null')
const BASE = 'https://www.usekineo.com'
function confereLinks(ideias, campanha) {
  for (const i of ideias) {
    const u = new URL(i.href)
    ok(u.origin + u.pathname === `${BASE}/studio/create`, 'link abre o compositor')
    ok(u.searchParams.get('prompt') === i.titulo, 'a ideia inteira vai na caixa')
    ok(u.searchParams.get('engine') === 'seedance' && u.searchParams.get('duration') === '15', 'Seedance 1.5 de 15 s')
    ok(u.searchParams.get('utm_campaign') === campanha, `campanha ${campanha}`)
    ok(!u.searchParams.has('create_intent'), 'nunca auto-start')
    const h = handoff.readCreationHandoff(u.searchParams)
    ok(h.duration === 15 && h.prompt === i.titulo && h.createIntent === null, 'o Studio lê 15 s e a ideia (creationHandoff)')
  }
}
const n = I.ideiasDoPrimeiroFilme(BASE, 'horror')
ok(n.fonte === 'niche' && n.ideias.length === 3, '3 ideias do nicho')
ok(n.ideias[0].titulo === I.NICHE_FIRST_FILM_IDEAS.horror.ideas[0], 'a 1ª é a 1ª da página de terror')
confereLinks(n.ideias, 'd0_activation_niche')
const v = I.ideiasDoPrimeiroFilme(BASE, null)
ok(v.fonte === 'showcase' && v.ideias.length === 3, 'sem nicho: 3 ideias campeãs da vitrine')
ok(v.ideias.every((i) => i.titulo.length <= 120 && i.gancho.startsWith('From a real Kineo film')), 'campeãs cabem na caixa e citam o filme real')
confereLinks(v.ideias, 'd0_activation_showcase')
ok(I.comMotorDeEntrada(`${BASE}/studio/create?utm_campaign=x&prompt=a`).includes('engine=seedance&duration=15'), 'comMotorDeEntrada acrescenta motor e duração')

// A rota da carta: melhorada, não duplicada.
ok(nudge.includes("from '@/lib/lifecycle/primeiroFilmeIdeias'"), 'a carta do 1º filme usa as ideias novas')
ok(/const escolha = ideiasDoPrimeiroFilme\(APP_URL, nicho\)/.test(nudge), 'ideias escolhidas por pessoa')
ok(/\.select\('signup_utm_campaign'\)\.eq\('id', u\.id\)\.maybeSingle\(\)/.test(nudge), 'nicho lido do perfil, por pessoa')
ok(nudge.indexOf('const escolha = ideiasDoPrimeiroFilme') > nudge.indexOf('if (!podeGerarParaLembrete(') &&
  nudge.indexOf('const escolha = ideiasDoPrimeiroFilme') > nudge.indexOf("in('name', ['generate_started', 'video_generation_started'])"),
  'a leitura do nicho vem DEPOIS de todos os filtros (coorte e pulos intactos)')
ok(/comMotorDeEntrada\(composerUrl\(\{ base: APP_URL, campaign: LEMBRETE_IDEIA_CAMPAIGN, prompt: ideia \}\)\)/.test(nudge), 'a ideia DELA também abre no Seedance 15 s')
ok(!/create_intent|autoanalyze/.test(semComentario(nudge)) && !/create_intent/.test(semComentario(lib3)), 'nunca auto-start')
ok(!/video_credits|admin_credits_granted/.test(semComentario(nudge)), 'nenhum crédito como isca')
const V = JSON.parse(read('vercel.json'))
ok(V.crons.filter((c) => c.path.startsWith('/api/cron/send-activation-nudge')).length === 1, 'nenhum cron novo de ativação')
ok(!/app\/api\/(cron|admin)\/send-first-film/.test(JSON.stringify(V)), 'nenhuma carta de 1º filme paralela')

console.log(`emails-venda 13/10: ${pass} verificações ok (Ação 2: régua + rota executada + 5 mutantes; Ação 3: ideias verbatim + links lidos pelo Studio)`)
