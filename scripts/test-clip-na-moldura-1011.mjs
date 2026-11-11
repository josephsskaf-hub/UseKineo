// KINEO-CLIP-NA-MOLDURA-1011 [fundador 10/11: clicou num clipe da home e caiu na tela ANTIGA de Clips — "quero a tela nova"]
// Guardião da aba Clip (/create/clip) = o ClipsClient de hoje dentro da moldura. Offline: módulos REAIS transpilados, React SSR, sem rede,
// sem banco, sem chamada paga. Prova:
//   A. interruptor CREATE_CLIP_INPLACE nasce 'internal'; off/internal/public × casa/conta de fora/visitante;
//   B. sem moldura, o /clips é byte a byte o da main (HTML do ClipsClient) e o código só foi REPOSICIONADO (as linhas da main seguem lá, na
//      ordem; as únicas trocas são o import, a assinatura e o rótulo do <details>) — logo, mesmas rotas, eventos, preço, upload e polling;
//   C. a entrada: logado com a aba → /create/clip com a MESMA query; visitante, conta sem a aba e outro href → o de hoje; o /clips aplica a
//      entrada DEPOIS da porta do Recreate; /create/clip devolve ao /clips quem não tem a aba;
//   D. na moldura: abas Film · Clip · Cartoon · Ads · Recreate (Clip ativa), a caixa, "Details" FECHADO, My clips, fileira de tendências;
//      custo só no botão (nada de crédito/preço fora dele); sem a aba, as outras telas não mudam.
// Mutantes no fim provam que o teste morde.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { loader, read, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
const React = require(join(ROOT, 'node_modules/react'))
const { renderToStaticMarkup } = require(join(ROOT, 'node_modules/react-dom/server'))
const lf = s => s.replace(/\r\n/g, '\n')
let passed = 0
const ok = (c, m) => { assert(c, m); passed++ }
const BASE = '689db340ba916cc7a9439f3e8c9a3a1b34de696f' // origin/main antes desta obra
const baseSrc = p => execFileSync('git', ['show', `${BASE}:${p}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
const HOUSE = 'josephsskaf@gmail.com', CUSTOMER = 'customer@example.org'
const CLIENT = 'app/(dashboard)/clips/ClipsClient.tsx'
const link = { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { ...rest, href }, children) }
const stubs = { 'next/link': link, '@/lib/analytics': { trackClosedEvent: async () => 'stored', trackEvent: async () => true }, 'next/navigation': { useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams(), usePathname: () => '/clips' } }
const ssr = (o, file, props = {}) => renderToStaticMarkup(React.createElement(loader(stubs, o)(file).default, props))
const visible = html => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
const src = (o, p) => lf(o[p] ?? read(p))

// ─── A. Interruptor ──────────────────────────────────────────────────────────────────────────────────────────────────
function switchChecks(o) {
  const c = loader(stubs, o)('lib/create/clipNaMoldura')
  ok(c.CREATE_CLIP_INPLACE === 'internal', "A o interruptor nasce 'internal' (só a casa)")
  ok(c.clipNaMolduraVisivel(HOUSE) && !c.clipNaMolduraVisivel(CUSTOMER) && !c.clipNaMolduraVisivel(null) && !c.clipNaMolduraVisivel(''), 'A padrão: só a casa; conta de fora e visitante não')
  ok([HOUSE, CUSTOMER, null].every(e => !c.clipNaMolduraVisivel(e, 'off')), "A 'off': ninguém")
  ok(c.clipNaMolduraVisivel(CUSTOMER, 'public') === loader(stubs, o)('lib/clips/clipLaunch').clipsVisible(CUSTOMER) && !c.clipNaMolduraVisivel(null, 'public'), "A 'public': toda conta que já vê o /clips; visitante nunca")
}

// ─── B. Sem moldura = main ───────────────────────────────────────────────────────────────────────────────────────────
function offChecks(o) {
  const before = { [CLIENT]: baseSrc(CLIENT) }
  ok(ssr(o, CLIENT, {}) === ssr({ ...o, ...before }, CLIENT, {}) && ssr(o, CLIENT, { measurementActor: 'u1' }) === ssr({ ...o, ...before }, CLIENT, { measurementActor: 'u1' }), 'B /clips sem moldura: HTML = main')
  // O código só foi reposicionado: toda linha da main segue no arquivo, na mesma ordem, menos as 3 trocas conhecidas.
  const now = src(o, CLIENT).split('\n').map(l => l.trim()).filter(Boolean)
  const TROCAS = [/^import \{ useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent \} from 'react'$/, /^export default function ClipsClient\(/, /^<summary><strong>\{clipsTelaMaisOpcoes\(language\)\}<\/strong>/, /^return \($/, /^<div className="stu clips-workspace kps-page">$/, /^<h1>\{t\('title'\)\}<\/h1>$/, /^<p className="sub">\{t\('sub'\)\}<\/p>$/, /^\)$/, /^<\/div>$/, /* KINEO-CLIP-NA-MOLDURA-1111 — linhas que ganharam a condição semMotor (moldura sem nome de motor nem preço fora do botão) */ /^<div className="sum"><UiLabel>\{(remix|effect)\.title\}<\/UiLabel> · \{t\('madeWith'/, /^<span className="tag">\{(target\.label|fx\.engine_label)\}<\/span>$/, /^<span className="fx-foot"><span className="tag">\{rx\.engine_label\}/, /^\{fx\.preview && <span className="fx-note">/, /^<div className="clip-meta">\{c\.label\} · /, /^<span className="fx-foot">$/, /^<\/span>$/]
  const base = lf(baseSrc(CLIENT)).split('\n').map(l => l.trim()).filter(Boolean)
  let i = 0, faltando = []
  for (const l of base) { if (TROCAS.some(r => r.test(l))) continue; const j = now.indexOf(l, i); if (j >= 0) i = j + 1; else faltando.push(l.slice(0, 80)) }
  ok(faltando.length === 0, `B ClipsClient só reposicionado (linhas da main que sumiram: ${faltando.slice(0, 3).join(' | ')})`)
  const rotas = s => [...s.matchAll(/fetch\((['`])([^'`]+)\1/g)].map(x => x[2]).sort().join()
  const eventos = s => [...s.matchAll(/track(?:Closed)?Event\(([A-Z_.a-zA-Z']+)/g)].map(x => x[1]).sort().join()
  ok(rotas(src(o, CLIENT)) === rotas(lf(baseSrc(CLIENT))) && eventos(src(o, CLIENT)) === eventos(lf(baseSrc(CLIENT))), 'B mesmas rotas (/api/clips, status, upload, créditos) e mesmos eventos')
  // As outras abas e o Recreate não mudam sem a aba Clip.
  for (const tab of ['film', 'cartoon', 'ads']) ok(ssr(o, 'components/create/CreateShell', { tab }) === ssr({ ...o, 'components/create/CreateShell.tsx': baseSrc('components/create/CreateShell.tsx'), 'components/create/CreateTabs.tsx': baseSrc('components/create/CreateTabs.tsx'), 'lib/create/tabs.ts': baseSrc('lib/create/tabs.ts') }, 'components/create/CreateShell', { tab }), `B ${tab} sem a aba Clip: HTML = main`)
}

// ─── C. Entrada ──────────────────────────────────────────────────────────────────────────────────────────────────────
function entryChecks(o) {
  const e = loader(stubs, o)('lib/create/entry')
  const links = ['/clips', '/clips?engine=hollywood&prompt=Backstage+of+a+glamorous+awards+gala', '/clips?effect=pet_bee', '/clips?remix=golden-ball&intent_campaign=home&utm_source=x', '/clips?trend=ice&foto=1']
  for (const l of links) {
    const q = l.includes('?') ? l.slice(l.indexOf('?')) : ''
    ok(e.clipEntryHref(l, HOUSE) === '/create/clip' + q, `C casa: ${l} → /create/clip com a mesma query`)
    ok(e.clipEntryHref(l, CUSTOMER) === l && e.clipEntryHref(l, null) === l && e.clipEntryHref(l, HOUSE, 'off') === l, `C conta sem a aba / visitante / off: ${l} intacto`)
    ok(e.clipEntryHref(l, CUSTOMER, 'public') === '/create/clip' + q && e.clipEntryHref(l, null, 'public') === l, `C 'public': conta logada vai; visitante fica (${l})`)
  }
  for (const l of ['/studio?engine=x', '/recreate/effect-hug', '/signup?redirect=%2Fclips', 'https://x.com/clips', '//x.com/clips', '/clipsx']) ok(e.clipEntryHref(l, HOUSE) === l, `C outro href intacto (${l})`)
  const page = src(o, 'app/(dashboard)/clips/page.tsx')
  const ir = page.indexOf('if (recreateFormat(id)) redirect(`/recreate/${id}`)'), cl = page.indexOf("const destino = clipEntryHref('/clips' + (query ? '?' + query : ''), user?.email)")
  ok(ir > 0 && cl > ir && !page.slice(0, ir).includes('create/clip') && page.includes("if (destino.startsWith('/create/clip')) redirect(destino)") && page.indexOf('if (!clipsVisible(user?.email ?? null)) notFound()') < cl, 'C /clips: porta do Clips → Recreate → aba Clip (nesta ordem), query inteira')
  const create = src(o, 'app/create/[tab]/page.tsx')
  ok(create.includes("if (params.tab === 'clip') {") && create.includes("if (!clipNaMolduraVisivel(u?.email)) redirect('/clips' + (query ? '?' + query : ''))") && create.indexOf("if (params.tab === 'clip') {") < create.indexOf('filmParamsSupported(searchParams'), 'C /create/clip: sem a aba (ou visitante) volta ao /clips com a query')
  ok(create.includes('if (recreateFormat(id)) redirect(`/recreate/${id}`)'), 'C /create/clip: efeito do Recreate vai ao Recreate (a mesma porta do /clips)')
  ok(!/clipEntryHref|create\/clip/.test(lf(read('components/home/HomeMosaic.tsx'))), 'C cartões da home intocados: o desvio mora no /clips (um lugar só)')
}

// ─── D. Na moldura ───────────────────────────────────────────────────────────────────────────────────────────────────
function frameChecks(o) {
  const html = ssr(o, 'components/create/ClipNaMoldura', { showRecreate: true })
  ok([...html.matchAll(/data-create-tab="([a-z]+)"/g)].map(x => x[1]).join() === 'film,clip,cartoon,ads,recreate' && html.includes('aria-current="page" data-create-tab="clip"'), 'D abas Film · Clip · Cartoon · Ads · Recreate, Clip ativa')
  ok(!ssr(o, 'components/create/ClipNaMoldura', { showRecreate: false }).includes('data-create-tab="recreate"'), 'D sem Recreate, sem a aba Recreate')
  ok(html.includes('class="recreate create-shell create-clip"') && html.includes('class="rc-panel"') && html.includes('ct-clip-stage') && html.includes('ct-clip-gallery'), 'D moldura do Recreate: painel, palco, fileira')
  ok(/<textarea[^>]*maxLength="1000"/.test(html) && html.includes('data-kineo="clips-mais-opcoes"'), 'D a caixa do Clips (mesmo textarea, mesmo <details>)')
  const det = (html.match(/<details class="clip-more"[^>]*>/) || [''])[0]
  ok(det !== '' && !/\sopen(=|\s|>)/.test(det) && /<summary><strong>Details<\/strong>/.test(html), 'D "Details" fechado por padrão (motor, duração e formato lá dentro)')
  ok(html.includes('class="clip-meus"') && (html.indexOf('ct-clip-stage') < html.indexOf('class="clip-meus"')), 'D My clips no palco')
  ok((html.match(/<style>/g) || []).length === (ssr(o, CLIENT).match(/<style>/g) || []).length, 'D os estilos do Clips entram uma vez')
  // Custo só no botão: fora do botão de gerar, nenhum crédito/preço.
  const sem = html.replace(/<button type="button" data-clip-action="generate"[\s\S]*?<\/button>/g, ' ').replace(/<header class="rc-nav[^"]*">[\s\S]*?<\/header>/, ' ') // o cabeçalho (menu "Credits" da casa) é o mesmo de todas as abas
  ok(!/(✦|\bcredits?\b|\$\s?\d|\bper month\b)/i.test(visible(sem)), `D nenhum preço fora do botão (${(visible(sem).match(/(✦|\bcredits?\b|\$\s?\d)/i) || [])[0]})`)
  // KINEO-CLIP-NA-MOLDURA-1111 [dono: "nenhum nome de motor em cartão ou botão"; "preço só no botão de gerar"] — na moldura, os selos de motor dos
  // cartões, o motor do resumo de Details, o "made with" da revisão e o motor/créditos de "My clips" só existem fora dela (semMotor).
  const cc = src(o, CLIENT)
  const conta = t => cc.split(t).length - 1
  ok(cc.includes('const semMotor = !!moldura') && conta('<span className="tag">') === 5 /* 1 é o "photo only" dentro de Details */ && conta('{semMotor ? null : <span className="tag">') === 3 && conta('{semMotor ? null : <span className="fx-foot">') === 1
    && cc.includes("${semMotor ? '' : engine.label + ' · '}${seconds} s") && conta("{semMotor ? null : <> · {t('madeWith'") === 2 && cc.includes('{fx.preview && !semMotor && <span className="fx-note">')
    && cc.includes("<div className=\"clip-meta\">{semMotor ? null : <>{c.label} · </>}{c.seconds} s · {c.aspect === 'image' ? t('samePhoto') : c.aspect}{semMotor ? null : <> · {c.credits} cr</>}</div>"),
    'D na moldura: nenhum motor em cartão, resumo de Details, revisão ou My clips; créditos só no botão')
  const nav = src(o, 'components/create/ClipNaMoldura.tsx')
  ok(!/useState|useEffect|fetch\(|router|trackEvent|trackClosedEvent/.test(nav), 'D a moldura não tem estado, rede nem evento próprio')
}

function all(o = {}) { switchChecks(o); offChecks(o); entryChecks(o); frameChecks(o) }
all()
const real = passed

const s = p => read(p)
const mutants = [
  ['interruptor nasce public', { 'lib/create/clipNaMoldura.ts': s('lib/create/clipNaMoldura.ts').replace("CREATE_CLIP_INPLACE: InternalRelease = 'internal'", "CREATE_CLIP_INPLACE: InternalRelease = 'public'") }],
  ['visitante vai para a tela nova', { 'lib/create/clipNaMoldura.ts': s('lib/create/clipNaMoldura.ts').replace('return !!email && release', 'return release') }],
  ['query perdida na entrada', { 'lib/create/entry.ts': s('lib/create/entry.ts').replace('return CLIP_TAB_HREF + u.search', 'return CLIP_TAB_HREF') }],
  ['/clips sem moldura muda', { [CLIENT]: s(CLIENT).replace(`<p className="sub">{t('sub')}</p>`, `<p className="sub">{t('title')}</p>`) }],
  ['rota trocada no ClipsClient', { [CLIENT]: s(CLIENT).replace("fetch('/api/clips/effect-upsell'", "fetch('/api/clips/upsell'") }],
  ['preço fora do botão na moldura', { 'components/create/ClipNaMoldura.tsx': s('components/create/ClipNaMoldura.tsx').replace("title: 'One scene. Your idea in motion.'", "title: 'One scene. From 8 credits a clip.'") }],
  ['Details aberto por padrão', { [CLIENT]: s(CLIENT).replace('open={opcoesAbertas}', 'open={moldura ? true : opcoesAbertas}') }],
  ['/create/clip sem porta', { 'app/create/[tab]/page.tsx': s('app/create/[tab]/page.tsx').replace("if (!clipNaMolduraVisivel(u?.email)) redirect('/clips' + (query ? '?' + query : ''))", '') }],
  ['selo de motor volta no cartão de tendência', { [CLIENT]: s(CLIENT).replace('{semMotor ? null : <span className="tag">{target.label}</span>}', '<span className="tag">{target.label}</span>') }], // KINEO-CLIP-NA-MOLDURA-1111
  ['motor volta no resumo de Details', { [CLIENT]: s(CLIENT).replace("${semMotor ? '' : engine.label + ' · '}", "${engine.label + ' · '}") }], // KINEO-CLIP-NA-MOLDURA-1111
  ['créditos voltam em My clips', { [CLIENT]: s(CLIENT).replace('{semMotor ? null : <> · {c.credits} cr</>}', ' · {c.credits} cr') }], // KINEO-CLIP-NA-MOLDURA-1111
  ['aba Clip para todos', { 'components/create/CreateTabs.tsx': s('components/create/CreateTabs.tsx').replace("&& (showClip || t.id !== 'clip')", '') }],
  ['/clips desvia antes da porta do Recreate', { 'app/(dashboard)/clips/page.tsx': s('app/(dashboard)/clips/page.tsx').replace('  if (recreateVisible(user?.email) && typeof searchParams?.effect', "  if (clipEntryHref('/clips', user?.email) !== '/clips') redirect('/create/clip')\n  if (recreateVisible(user?.email) && typeof searchParams?.effect") }],
]
let bitten = 0
for (const [name, o] of mutants) {
  if (Object.entries(o).some(([p, v]) => v === s(p))) throw new Error(`mutante não aplicou: ${name}`)
  passed = 0
  let died = false
  try { all(o) } catch (e) { died = true; if (process.env.VERBOSE) console.log(`  ${name} → ${String(e.message).split('\n')[0]}`) }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-clip-na-moldura-1011: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
