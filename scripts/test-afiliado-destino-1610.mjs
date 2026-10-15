#!/usr/bin/env node
// KINEO-AFILIADO-DESTINO-1610 — guardião do link de afiliado /a/[code] (aprovado pelo fundador em 16/10).
//
// Os 3 furos medidos (docs/PLANO-TRIPLICAR-VISITANTES-2026-10-16.md §3.3):
//   (a) /a/CODIGO sem ?to= caía na HOME SEM etiqueta (ColorMango: 68 cliques/28d viravam "direto");
//   (b) o destino padrão do painel era o gerador de roteiro (2% cadastram) e não o /free-ai-shorts-generator (52%);
//   (c) robô entrava como clique (curl, python-requests, Google-Safety, kuma-check…) e inflava o placar.
//
// O que este guardião EXECUTA (rota e biblioteca reais, Supabase em memória):
//   1. destino padrão = video; ?to= da lista branca respeitado; TODO redirecionamento sai com a etiqueta que o
//      painel lê (utm_source=affiliate, utm_medium=partner, utm_campaign=affiliate_<destino>) + utm_content=<CÓDIGO>;
//   2. open redirect bloqueado (host externo, //, \\, javascript:, ../, codificado) — sempre primeira parte;
//   3. cookie de atribuição (sf_aff + sf_aff_click + sf_aff_hint) gravado NA PRÓPRIA resposta de redirect;
//   4. robô não grava clique nem cookie, mas gera o evento affiliate_link_clicked com is_bot=true e o motivo;
//      gente gera o mesmo evento com is_bot=false e counted=true; o nome é reservado ao servidor;
//   5. mutantes: cada conserto desfeito tem de derrubar alguma prova (e prova-se que o mutante foi aplicado).
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
// reancorado KINEO-AFILIADO-POR-POST-1610 — o conserto mais novo (`&p=` por post + "Your links") sai PRIMEIRO, em memória e
// byte a byte (scripts/test-support/desfaz-afiliado-por-post-1610.mjs); o comportamento dele é provado em test-afiliado-por-post-1610.
import { semAfiliadoPorPost1610 } from './test-support/desfaz-afiliado-por-post-1610.mjs'
// reancorado KINEO-LEVA2-1510 — na leva 2 o KINEO-CHECKOUT-CLAREZA-1610 também pôs um nome reservado (welcome20_deadline_started)
// em app/api/events/route.ts, num trecho disjunto: sai em memória (desfaz exato dele) SÓ na prova byte a byte abaixo; o
// comportamento continua lendo o arquivo de verdade. Sem a camada (árvore sem a marca), semClareza1610 devolve o texto igual.
import { semClareza1610 } from './test-support/desfaz-checkout-clareza-1610.mjs'
const read = (file) => semAfiliadoPorPost1610(file, fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n'))

function compile(source, imports = {}, env = {}) {
  const box = { exports: {} }
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(js, {
    module: box, exports: box.exports, URL, URLSearchParams, Map, Set, Promise, RegExp, Error, JSON, Object, Array,
    String, Number, Boolean, Math, Date,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://offline.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-only', ...env } },
    console: { log() {}, warn() {}, error() {} },
    require: (id) => { if (Object.hasOwn(imports, id)) return imports[id]; throw Error(`import sem dublê: ${id}`) },
  })
  return box.exports
}

const CODE = 'ABCD2345'
const ORIGIN = 'https://www.usekineo.com'
const HUMANS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 10; Cubot X30 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 12; Redmi Note 9 Pro Build/SKQ1.211019.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0 Mobile Safari/537.36',
]
// UAs REAIS que entraram em affiliate_clicks nos 28 dias até 15/10 e não eram gente (+ o UA vazio).
const BOTS = [
  ['curl/8.5.0', 'curl/'],
  ['curl/7.81.0', 'curl/'],
  ['python-requests/2.34.2', 'python-requests'],
  ['Google-Safety', 'google-safety'],
  ['Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.96 Mobile Safari/537.36 (compatible; Google-Safety; +http://www.google.com/bot.html)', 'google-safety'],
  ['kuma-check/1.0', 'kuma-check'],
  ['SubstackContentFetch/1.0 (https://substack.com/)', 'contentfetch'],
  ['', 'empty_user_agent'],
]
const ALLOWED_PATHS = new Set(['/free-script-generator', '/free-ai-shorts-generator', '/faceless-video-generator', '/business-video-content-plan', '/client-video-brief-generator'])

// ── Supabase em memória (o subconjunto que a rota usa) ──
class Query {
  constructor(db, table) { Object.assign(this, { db, table, filters: [], op: 'select' }) }
  select() { return this }
  eq(k, v) { this.filters.push((r) => r[k] === v); return this }
  insert(v) { this.op = 'insert'; this.value = v; return this }
  async run() {
    if (this.db.down) throw Error('banco fora')
    const list = this.db.tables[this.table]
    if (!list) throw Error(`tabela inesperada ${this.table}`)
    if (this.op === 'insert') {
      const row = { id: crypto.randomUUID(), ...this.value }
      list.push(row)
      return { data: [{ id: row.id }], error: null }
    }
    return { data: list.filter((r) => this.filters.every((f) => f(r))).map((r) => ({ ...r })), error: null }
  }
  async maybeSingle() { const r = await this.run(); return { ...r, data: r.data[0] ?? null } }
  async single() { return this.maybeSingle() }
  then(res, rej) { return this.run().then(res, rej) }
}
function newDb() {
  return {
    down: false,
    tables: {
      affiliates: [
        { id: 'aff-active', code: CODE, status: 'active' },
        { id: 'aff-paused', code: 'PQRS2345', status: 'suspended' },
      ],
      affiliate_clicks: [],
    },
    from(t) { return new Query(this, t) },
  }
}

const REAL = {
  destinations: read('lib/affiliateDestinations.ts'),
  route: read('app/a/[code]/route.ts'),
  widget: read('lib/growth/affiliateWidget.ts'),
  events: read('app/api/events/route.ts'),
}

async function problems(S) {
  const p = []
  const fail = (cond, msg) => { if (!cond) p.push(msg) }
  let destinations, route, widget, db, events
  try {
    destinations = compile(S.destinations)
    const code = compile(read('lib/affiliateCode.ts'))
    const attribution = compile(read('lib/affiliateAttribution.ts'), {
      '@supabase/supabase-js': { createClient: () => { throw Error('não usado') } },
      '@/lib/affiliateCode': code,
    })
    widget = compile(S.widget, { '@/lib/affiliateCode': code })
    const mkRedirect = (url) => { const r = { location: String(url), writes: [] }; r.cookies = { set: (name, value, options) => r.writes.push({ name, value, options }) }; return r }
    db = newDb()
    events = []
    route = compile(S.route, {
      'next/server': { NextResponse: { redirect: mkRedirect } },
      crypto,
      '@supabase/supabase-js': { createClient: () => db },
      '@/lib/affiliateDestinations': destinations,
      '@/lib/affiliateAttribution': attribution,
      '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
    }, { AFFILIATE_IP_SALT: 'sal-de-teste' })
  } catch (e) {
    return ['montagem quebrou: ' + e.message]
  }

  const hit = async ({ code = CODE, to, ua = HUMANS[0], cookies = {}, down = false } = {}) => {
    db.down = down
    events.length = 0
    const before = db.tables.affiliate_clicks.length
    const query = to === undefined ? '' : `?to=${encodeURIComponent(to)}`
    const res = await route.GET({
      nextUrl: new URL(`${ORIGIN}/a/${encodeURIComponent(code)}${query}`),
      headers: { get: (k) => (k === 'user-agent' ? ua : k === 'referer' ? 'https://www.colormango.com/product/kineo.html' : k === 'x-forwarded-for' ? '203.0.113.7' : null) },
      cookies: { get: (k) => (cookies[k] ? { value: cookies[k] } : undefined) },
    }, { params: { code } })
    db.down = false
    const url = new URL(res.location)
    return { res, url, jar: Object.fromEntries(res.writes.map((w) => [w.name, w])), newClicks: db.tables.affiliate_clicks.slice(before), events: [...events] }
  }
  const tagged = (url, label) => {
    fail(url.origin === ORIGIN, `${label}: saiu do domínio (${url.origin})`)
    fail(ALLOWED_PATHS.has(url.pathname), `${label}: destino fora da lista branca (${url.pathname})`)
    fail(url.searchParams.get('utm_source') === 'affiliate', `${label}: sem utm_source=affiliate`)
    fail(url.searchParams.get('utm_medium') === 'partner', `${label}: sem utm_medium=partner (o balde Afiliados do painel)`)
    fail(/^affiliate_[a-z_]+$/.test(url.searchParams.get('utm_campaign') ?? ''), `${label}: sem utm_campaign=affiliate_<destino>`)
  }

  // (1) furo (a)+(b): link sem ?to= → página que mais cadastra, com etiqueta + código, e cookie na resposta.
  fail(destinations.RECOMMENDED_AFFILIATE_DESTINATION === 'video', 'destino recomendado do painel não é video')
  {
    const r = await hit()
    tagged(r.url, '/a/CODE sem ?to=')
    fail(r.url.pathname === '/free-ai-shorts-generator', `/a/CODE sem ?to= foi para ${r.url.pathname}, não para /free-ai-shorts-generator`)
    fail(r.url.searchParams.get('utm_campaign') === 'affiliate_video', '/a/CODE sem ?to= sem campanha affiliate_video')
    fail(r.url.searchParams.get('utm_content') === CODE, '/a/CODE sem utm_content=<CÓDIGO> (visita não diz de qual afiliado veio)')
    fail(r.jar.sf_aff?.value === CODE && r.jar.sf_aff?.options?.httpOnly === true, 'cookie sf_aff não gravado na resposta de redirect')
    fail(Boolean(r.jar.sf_aff_click?.value) && r.jar.sf_aff_click.value === r.newClicks[0]?.id, 'cookie sf_aff_click não carrega a prova do clique gravado')
    fail(r.jar.sf_aff_hint?.value === '1', 'dica sf_aff_hint ausente')
    fail(r.newClicks.length === 1 && r.newClicks[0].landing_path === `/a/${CODE}`, 'clique humano sem ?to= não gravou landing_path /a/CODE (o link que o parceiro usa)')
    const ev = r.events.find((e) => e.name === 'affiliate_link_clicked')
    fail(ev && ev.metadata.is_bot === false && ev.metadata.counted === true && ev.metadata.outcome === 'counted', 'clique humano sem evento affiliate_link_clicked (is_bot=false, counted=true)')
    fail(ev && ev.metadata.explicit_to === false && ev.metadata.destination === 'video', 'evento não diz que o destino foi o padrão (video)')
    fail(ev && ev.metadata.referrer_host === 'colormango.com', 'evento sem referrer_host')
    fail(ev && !JSON.stringify(ev.metadata).includes(r.jar.sf_aff_click?.value ?? '§'), 'evento copiou o UUID de prova financeira')
  }

  // (2) ?to= da lista branca continua respeitado, com etiqueta — menos `script`, que desde KINEO-AFILIADO-SCRIPT-ALIAS-1610
  // é alias de `video` (links já publicados: 8 de 13 afiliados copiaram `?to=script` do botão padrão).
  for (const [to, expected] of [['faceless', '/faceless-video-generator'], ['business', '/business-video-content-plan'], ['client_brief', '/client-video-brief-generator'], ['VIDEO', '/free-ai-shorts-generator']]) {
    const r = await hit({ to })
    tagged(r.url, `?to=${to}`)
    fail(r.url.pathname === expected, `?to=${to} não respeitado (${r.url.pathname})`)
    fail(r.url.searchParams.get('utm_content') === CODE, `?to=${to} sem utm_content`)
    fail(r.newClicks[0]?.landing_path === `/a/${CODE}?to=${to.toLowerCase()}`, `?to=${to} landing_path errado`)
    const ev = r.events.find((e) => e.name === 'affiliate_link_clicked')
    fail(ev && ev.metadata.legacy_to === null, `?to=${to} marcado como legacy_to sem ser alias`)
  }
  for (const to of ['script', 'Script']) {
    const r = await hit({ to })
    tagged(r.url, `?to=${to} (alias)`)
    fail(r.url.pathname === '/free-ai-shorts-generator', `?to=${to} já publicado não foi para a página de filme grátis (${r.url.pathname})`)
    fail(r.url.searchParams.get('utm_campaign') === 'affiliate_video', `?to=${to} sem utm_campaign=affiliate_video`)
    fail(r.url.searchParams.get('utm_content') === CODE, `?to=${to} sem utm_content`)
    fail(r.jar.sf_aff?.value === CODE && Boolean(r.jar.sf_aff_click?.value), `?to=${to} perdeu o cookie de atribuição`)
    fail(r.newClicks[0]?.landing_path === `/a/${CODE}?to=script`, `?to=${to}: o clique deixou de gravar o link usado (?to=script)`)
    const ev = r.events.find((e) => e.name === 'affiliate_link_clicked')
    fail(ev && ev.metadata.legacy_to === 'script' && ev.metadata.destination === 'video' && ev.metadata.explicit_to === true, `?to=${to}: evento sem legacy_to='script' + destination=video`)
  }
  {
    const bot = await hit({ to: 'script', ua: 'curl/8.5.0' })
    fail(bot.url.pathname === '/free-ai-shorts-generator', 'robô com ?to=script não seguiu o alias')
    fail(bot.events.some((e) => e.metadata?.legacy_to === 'script' && e.metadata.is_bot === true), 'robô com ?to=script sem legacy_to no evento')
  }

  // (3) open redirect bloqueado: tudo fora da lista cai no padrão, no nosso domínio.
  for (const evil of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '../checkout', '%2F%2Fevil.example', 'video@evil.example', 'video/../../evil', ' https://evil.example/video', 'home', '']) {
    const r = await hit({ to: evil })
    tagged(r.url, `?to=${JSON.stringify(evil)}`)
    fail(r.url.pathname === '/free-ai-shorts-generator', `?to=${JSON.stringify(evil)} não caiu no destino padrão`)
    fail(!r.res.location.includes('evil'), `?to=${JSON.stringify(evil)} vazou para a URL de destino`)
  }

  // (4) etiqueta SEMPRE presente — inclusive onde não há cookie.
  {
    const paused = await hit({ code: 'PQRS2345' })
    tagged(paused.url, 'afiliado suspenso')
    fail(paused.res.writes.length === 0 && paused.newClicks.length === 0, 'afiliado suspenso ganhou cookie/clique')
    const unknown = await hit({ code: 'ZZZZ9999' })
    tagged(unknown.url, 'código desconhecido')
    fail(unknown.res.writes.length === 0, 'código desconhecido ganhou cookie')
    const malformed = await hit({ code: '<script>' })
    tagged(malformed.url, 'código malformado')
    fail(!malformed.url.searchParams.has('utm_content'), 'código malformado virou utm_content')
    const outage = await hit({ down: true })
    tagged(outage.url, 'banco fora')
    fail(outage.res.writes.length === 0, 'banco fora cunhou cookie (fail closed)')
  }

  // (5) furo (c): robô → sem clique, sem cookie, COM evento is_bot + motivo; gente → contada.
  for (const [ua, reason] of BOTS) {
    fail(destinations.affiliateBotReason(ua) === reason, `UA ${JSON.stringify(ua.slice(0, 40))}: motivo ${destinations.affiliateBotReason(ua)} ≠ ${reason}`)
    const r = await hit({ ua })
    tagged(r.url, `robô ${reason}`)
    fail(r.newClicks.length === 0 && r.res.writes.length === 0, `robô ${reason} gravou clique/cookie`)
    const ev = r.events.find((e) => e.name === 'affiliate_link_clicked')
    fail(ev && ev.metadata.is_bot === true && ev.metadata.bot_reason === reason && ev.metadata.counted === false && ev.metadata.affiliate_id === 'aff-active', `robô ${reason} sem evento is_bot=true com motivo`)
  }
  for (const ua of HUMANS) {
    fail(destinations.affiliateBotReason(ua) === null, `gente tratada como robô: ${ua.slice(0, 50)}`)
    const r = await hit({ ua })
    fail(r.newClicks.length === 1 && r.jar.sf_aff?.value === CODE, `gente não contada: ${ua.slice(0, 50)}`)
  }

  // (6) recarga no mesmo navegador provado não infla: evento same_browser_refresh, nenhum clique novo.
  {
    const first = await hit()
    const again = await hit({ cookies: { sf_aff: CODE, sf_aff_click: first.jar.sf_aff_click?.value } })
    fail(again.newClicks.length === 0, 'recarga no mesmo navegador gravou outro clique')
    fail(again.events.some((e) => e.metadata?.outcome === 'same_browser_refresh' && e.metadata.counted === false), 'recarga sem evento same_browser_refresh')
  }

  // (7) widget e nome reservado ao servidor.
  fail(widget.buildAffiliateWidgetCta(CODE.toLowerCase()) === `${ORIGIN}/a/${CODE}?to=video`, 'CTA do widget não usa o destino padrão video')
  fail(/\n\s*'affiliate_link_clicked',/.test(S.events), 'affiliate_link_clicked não está em SERVER_ONLY_EVENTS (o navegador forjaria clique)')
  return p
}

let ok = 0
const verdict = await problems(REAL)
if (verdict.length) {
  console.error('FALHA no código real:\n  - ' + verdict.join('\n  - '))
  process.exit(1)
}
ok++
console.log('  ok  código real: destino padrão video, etiqueta sempre, sem open redirect, cookie no redirect, robô x gente')

// ── Mutantes: cada um desfaz um conserto; tem de ser APLICADO (o texto muda) e DERRUBADO (alguma prova cai). ──
const mutants = [
  ['destino padrão volta ao roteiro', 'destinations', "export const RECOMMENDED_AFFILIATE_DESTINATION: AffiliateDestinationKey = 'video'", "export const RECOMMENDED_AFFILIATE_DESTINATION: AffiliateDestinationKey = 'script'"],
  ['link sem ?to= volta para a home sem etiqueta', 'route', 'const destinationUrl = buildAffiliateRouteDestinationUrl(appUrl, destination.key, code)', "const destinationUrl = requested ? buildAffiliateRouteDestinationUrl(appUrl, destination.key, code) : new URL('/', appUrl)"],
  ['?to= vira caminho (open redirect)', 'route', 'const destinationUrl = buildAffiliateRouteDestinationUrl(appUrl, destination.key, code)', "const destinationUrl = req.nextUrl.searchParams.get('to') && !requested ? new URL(req.nextUrl.searchParams.get('to') as string, appUrl) : buildAffiliateRouteDestinationUrl(appUrl, destination.key, code)"],
  ['utm_content some', 'destinations', "if (AFFILIATE_CODE_SHAPE.test(normalizedCode)) url.searchParams.set('utm_content', normalizedCode)", ''],
  ['utm_medium=partner some', 'destinations', "  url.searchParams.set('utm_medium', 'partner')\n  url.searchParams.set('utm_campaign', destination.campaign)\n  // utm_content", "  url.searchParams.set('utm_campaign', destination.campaign)\n  // utm_content"],
  ['afiliado inativo volta para a home crua', 'route', "    if (!aff || aff.status !== 'active') {\n      return NextResponse.redirect(destinationUrl)", "    if (!aff || aff.status !== 'active') {\n      return NextResponse.redirect(appUrl)"],
  ['banco fora volta para a home crua', 'route', '    return NextResponse.redirect(destinationUrl)\n  }\n}', '    return NextResponse.redirect(appUrl)\n  }\n}'],
  ['cookie sf_aff deixa de ser gravado no redirect', 'route', "      res.cookies.set(COOKIE, code, {", "      void ({"],
  ['curl volta a contar como gente', 'destinations', '|curl\\/|', '|'],
  ['UA vazio volta a contar como gente', 'destinations', "if (!ua) return 'empty_user_agent'", 'if (!ua) return null'],
  ['robô deixa de gerar evento', 'route', "      await clickEvent('bot')\n", ''],
  ['evento marca todo mundo como gente', 'route', 'is_bot: input.botReason !== null,', 'is_bot: false,'],
  ['evento deixa de ser reservado ao servidor', 'events', "  'affiliate_link_clicked',\n", ''],
  ['widget volta ao roteiro', 'widget', '?to=video`', '?to=script`'],
  // KINEO-AFILIADO-SCRIPT-ALIAS-1610
  ['?to=script volta ao gerador de roteiro', 'route', "const LEGACY_TO_ALIASES: Record<string, string> = { script: 'video' }", 'const LEGACY_TO_ALIASES: Record<string, string> = {}'],
  ['evento perde o legacy_to', 'route', '        legacy_to: input.legacyTo,\n', ''],
  ['clique grava o destino em vez do link usado', 'route', 'const landingPath = affiliateClickLandingPath(code, asked)', 'const landingPath = affiliateClickLandingPath(code, explicit ? destination : null)'],
]
let failed = 0
for (const [name, key, from, to] of mutants) {
  const S = { ...REAL }
  if (!S[key].includes(from)) { console.error(`  FALHA mutante "${name}" não se aplica (âncora sumiu)`); failed++; continue }
  S[key] = S[key].replace(from, to)
  if (S[key] === REAL[key]) { console.error(`  FALHA mutante "${name}" não mudou o texto`); failed++; continue }
  const found = await problems(S)
  if (found.length === 0) { console.error(`  FALHA mutante sobreviveu: ${name}`); failed++; continue }
  ok++
  console.log(`  ok  mutante derrubado: ${name} (${found[0].slice(0, 90)})`)
}
assert.equal(failed, 0, `${failed} mutante(s) sobreviveram ou não se aplicaram`)

// ── Desfaz: o diff reverso que os guardiões BYTE A BYTE (ex.: test-ads-fiel-1510 em app/api/events/route.ts) aplicam. ──
{
  const { execFileSync } = await import('node:child_process')
  const { semAfiliadoDestino1610, AFILIADO_DESTINO_1610_ARQUIVOS, AFILIADO_DESTINO_1610_BASE } = await import('./test-support/desfaz-afiliado-destino-1610.mjs')
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 })
  let anc = true
  try { git('merge-base', '--is-ancestor', AFILIADO_DESTINO_1610_BASE, 'HEAD') } catch { anc = false }
  assert.ok(anc, 'a base do desfaz não é ancestral de HEAD')
  // KINEO-AFILIADO-SCRIPT-ALIAS-1610 veio depois: sai PRIMEIRO, e sozinho devolve a base dele (b1a8766f).
  const { semAfiliadoScriptAlias1610, AFILIADO_SCRIPT_ALIAS_1610_ARQUIVOS, AFILIADO_SCRIPT_ALIAS_1610_BASE } = await import('./test-support/desfaz-afiliado-script-alias-1610.mjs')
  try { git('merge-base', '--is-ancestor', AFILIADO_SCRIPT_ALIAS_1610_BASE, 'HEAD') } catch { anc = false }
  assert.ok(anc, 'a base do desfaz do alias não é ancestral de HEAD')
  for (const f of AFILIADO_SCRIPT_ALIAS_1610_ARQUIVOS) {
    const base = git('show', `${AFILIADO_SCRIPT_ALIAS_1610_BASE}:${f}`).replace(/\r\n/g, '\n')
    assert.equal(semAfiliadoScriptAlias1610(f, semClareza1610(f, read(f))), base, `desfeito o alias, ${f} não é EXATAMENTE a base dele`) // reancorado KINEO-LEVA2-1510
  }
  for (const f of AFILIADO_DESTINO_1610_ARQUIVOS) {
    const base = git('show', `${AFILIADO_DESTINO_1610_BASE}:${f}`).replace(/\r\n/g, '\n')
    assert.equal(semAfiliadoDestino1610(f, semAfiliadoScriptAlias1610(f, semClareza1610(f, read(f)))), base, `desfeito, ${f} não é EXATAMENTE a base`) // reancorado KINEO-LEVA2-1510
  }
  const mexidoAlias = read('app/a/[code]/route.ts').replace("{ script: 'video' }", "{ script: 'video' } ")
  assert.notEqual(mexidoAlias, read('app/a/[code]/route.ts'), 'a sonda do desfaz do alias não se aplicou')
  assert.throws(() => semAfiliadoScriptAlias1610('app/a/[code]/route.ts', mexidoAlias), /mudou fora deste conserto/, 'o desfaz do alias engoliu uma mudança dentro do trecho')
  const mexido = read('app/api/events/route.ts').replace("  'affiliate_link_clicked',\n", "  'affiliate_link_clicked' ,\n")
  assert.notEqual(mexido, read('app/api/events/route.ts'), 'a sonda do desfaz não se aplicou')
  assert.throws(() => semAfiliadoDestino1610('app/api/events/route.ts', mexido), /mudou fora deste conserto/, 'o desfaz engoliu uma mudança dentro do trecho')
  ok++
  console.log(`  ok  desfaz: ${AFILIADO_DESTINO_1610_ARQUIVOS.length} arquivos voltam byte a byte à base ${AFILIADO_DESTINO_1610_BASE.slice(0, 8)}; mudança alheia no trecho lança`)
}
console.log(`\nPASS — test-afiliado-destino-1610: ${ok} ok (1 código real + ${mutants.length} mutantes + desfaz)`)
