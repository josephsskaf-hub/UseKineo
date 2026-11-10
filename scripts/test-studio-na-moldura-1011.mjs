// KINEO-STUDIO-NA-MOLDURA-1011 [fundador 10/11: "Quero todas as telas com o design que fizemos no codex"]
// Guardião da aba Film = Studio real na moldura nova. Offline: módulos REAIS transpilados, hooks emulados, cliques chamando os handlers de
// verdade, roteador/rede/eventos/sessionStorage como dublês que só anotam (docs/studio-na-moldura-1011/runtime.cjs). Prova:
//   A. interruptor CREATE_FILM_INPLACE × quem chega (off/internal/public; casa, conta de fora, visitante; só a aba Film);
//   B. desligado = byte a byte a main: StudioSimples sem moldura, CreateShell das 3 abas, e nenhum arquivo do Studio/Generate mexido;
//   C. ligado = o MESMO pedido (rota, query, sessionStorage), os MESMOS eventos campo a campo e as MESMAS recusas que a main produz
//      pelo caminho de hoje (/create/film → Continue → /studio caixa única → Generate);
//   D. o preço é o da função que cobra e aparece SÓ no botão; nenhum nome de motor; nada começa sozinho;
//   E. celular: uma coluna (o CSS do Recreate) e nenhuma largura fixa nova.
// Mutantes no fim provam que o teste morde.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const R = require('../docs/studio-na-moldura-1011/runtime.cjs')
const { aba, baseSrc, BASE, React, read, ROOT, visibleText } = R

const HOUSE = 'josephsskaf@gmail.com'
const CUSTOMER = 'customer@example.org'
const ENGINE_NAMES = /\b(kling|seedance|veo|minimax|h3|omni|nano banana|sora|runway|wan|hailuo|pixverse|luma|flux|lyria|kineo 1)\b/i
const PRICE = /(✦|\bcredits?\b|\$\s?\d|\bUS\$|\bcr\b)/i
const IDEA = 'The ghost ship Mary Celeste'
let passed = 0
const ok = (cond, msg) => { assert(cond, msg); passed++ }
const lf = s => s.replace(/\r\n/g, '\n')
const MAIN = { 'components/studio/StudioSimples.tsx': baseSrc('components/studio/StudioSimples.tsx'), 'components/create/CreateShell.tsx': baseSrc('components/create/CreateShell.tsx') }
const isGen = p => p['data-testid'] === 'studio-simple-generate'

// ─── A. Interruptor ────────────────────────────────────────────────────────────────────────────────────────────────────
const forced = (o, v) => ({ ...o, 'lib/create/release.ts': (o['lib/create/release.ts'] ?? read('lib/create/release.ts')).replace(/CREATE_FILM_INPLACE: InternalRelease = '[a-z]+'/, `CREATE_FILM_INPLACE: InternalRelease = '${v}'`) })
function switchChecks(o) {
  const access = aba(o).m('lib/create/access'), release = aba(o).m('lib/create/release')
  ok(release.CREATE_FILM_INPLACE === 'internal', "o interruptor novo nasce 'internal'")
  ok(release.CREATE_SHELL_RELEASE === 'public', 'CREATE_SHELL_RELEASE intocado (public)')
  ok(access.filmNaMoldura('film', HOUSE) === true && access.filmNaMoldura('film', CUSTOMER) === false && access.filmNaMoldura('film', null) === false, "padrão 'internal': só a casa vê o Studio na moldura")
  for (const t of ['cartoon', 'ads', 'recreate', 'x']) ok(access.filmNaMoldura(t, HOUSE) === false, `${t}: nunca troca (só a aba Film)`)
  const off = aba(forced(o, 'off')).m('lib/create/access'), pub = aba(forced(o, 'public')).m('lib/create/access')
  ok([HOUSE, CUSTOMER, null].every(e => off.filmNaMoldura('film', e) === false), "'off' forçado: ninguém")
  ok(pub.filmNaMoldura('film', CUSTOMER) === true && pub.filmNaMoldura('film', null) === false, "'public' forçado: toda conta logada, nunca visitante")
  ok(access.filmNaMoldura('film', 'test-hacker@example.org') === false, 'e-mail parecido não é allowlist')
  const page = lf(o['app/create/[tab]/page.tsx'] ?? read('app/create/[tab]/page.tsx'))
  const iDecision = page.indexOf("if (decision.kind !== 'show') notFound()"), iFrame = page.indexOf('if (filmNaMoldura(params.tab, user?.email)) return <StudioNaMoldura showRecreate={decision.showRecreate} motor={motorDaCaixa(undefined)} campanha={CREATE_FILM_CAMPAIGN} />')
  ok(iDecision > 0 && iFrame > iDecision, 'a página só troca DEPOIS da porta da tela nova (404/cadastro de sempre), com o motor e a campanha do Continue')
  ok(page.includes('return <CreateShell tab={params.tab as CreateTab} signedIn showRecreate={decision.showRecreate} />'), 'fora do interruptor: a mesma CreateShell de hoje')
  const tabs = aba(o).m('lib/create/tabs'), caixa = aba(o).m('lib/growth/studioSimples')
  const cont = new URL(tabs.filmContinueHref(IDEA, true), 'https://x')
  ok(caixa.campanhaDaCaixa(cont.searchParams.get('intent_campaign')) === tabs.CREATE_FILM_CAMPAIGN && caixa.motorDaCaixa(cont.searchParams.get('engine') ?? undefined) === caixa.motorDaCaixa(undefined), 'campanha e motor = os que o Continue entrega ao /studio')
}

// ─── B. Desligado = byte a byte a main ─────────────────────────────────────────────────────────────────────────────────
function ssr(o, file, props) {
  const t = aba(o)
  t.mount(React.createElement(t.m(file).default, props))
  return t.html()
}
function offChecks(o) {
  const filmes = aba(o).m('lib/growth/filmesDaPorta0511').filmesDaPorta0511()
  for (const props of [{ filmes, motor: 'seedance', campanha: 'create_film', ideiaInicial: IDEA }, { filmes, motor: 'hollywood', campanha: 'studio_simple' }, { filmes: [], motor: 'seedance', campanha: 'x' }]) {
    ok(ssr(o, 'components/studio/StudioSimples', props) === ssr({ ...o, ...MAIN }, 'components/studio/StudioSimples', props), `StudioSimples sem moldura ${props.motor}/${props.campanha}: HTML = ${BASE}`)
  }
  for (const tab of ['film', 'cartoon', 'ads']) for (const showRecreate of [true, false]) {
    ok(ssr(o, 'components/create/CreateShell', { tab, showRecreate }) === ssr({ ...o, 'components/create/CreateShell.tsx': MAIN['components/create/CreateShell.tsx'] }, 'components/create/CreateShell', { tab, showRecreate }), `CreateShell ${tab} (Recreate ${showRecreate}): HTML = ${BASE}`)
  }
  // Comportamento sem moldura: o mesmo pedido e os mesmos eventos da main pelo caminho de hoje.
  ok(JSON.stringify(viaMain(o, {})) === JSON.stringify(viaMain({ ...o, ...MAIN }, {})), 'StudioSimples sem moldura: pedido + eventos = main')
  const changed = execFileSync('git', ['diff', '--name-only', BASE, '--', 'app/(dashboard)', 'lib/credits', 'lib/growth', 'app/api', 'lib/recreate', 'middleware.ts'], { cwd: ROOT, encoding: 'utf8' }).trim()
  ok(changed === '', `Studio, Generate, crédito, rotas e Recreate intocados (${changed})`)
}

// ─── C. Ligado = o mesmo pedido, os mesmos eventos, as mesmas recusas ─────────────────────────────────────────────────
/** Caminho de HOJE: /create/film → Continue → /studio (caixa única com a ideia do link) → Settings → Generate. */
function viaMain(o, { duracao, formato, lingua, verbatim, texto }) {
  const t = aba(o)
  const tabs = t.m('lib/create/tabs'), caixa = t.m('lib/growth/studioSimples'), ideia = t.m('lib/growth/ideiaDaPagina')
  const q = new URL(tabs.filmContinueHref(texto ?? IDEA, true), 'https://x').searchParams
  t.mount(React.createElement(t.m('components/studio/StudioSimples').default, { filmes: [], motor: caixa.motorDaCaixa(q.get('engine') ?? undefined), campanha: caixa.campanhaDaCaixa(q.get('intent_campaign')), ideiaInicial: ideia.ideiaDoLink(q.get('ideia')) }))
  t.click(p => p['data-testid'] === 'studio-simple-settings', 'Settings')
  if (duracao) t.click(p => p.className === 'ksx-opt' && p.children?.[0] === duracao, 'duração')
  if (formato) t.click(p => p.className === 'ksx-opt' && p.children === formato, 'formato')
  if (lingua) t.select(p => p.id === 'ksx-lingua', lingua, 'língua')
  if (verbatim) t.type(p => p.type === 'checkbox', true, 'palavra por palavra')
  t.click(isGen, 'Generate')
  return { pushes: t.log.pushes, events: t.log.events, storage: [...t.log.storage], fetches: t.log.fetches }
}
/** Caminho NOVO: /create/film com o interruptor → escreve no passo 1 → Details → Generate. */
function viaFrame(o, { duracao, formato, lingua, verbatim, texto }) {
  const t = aba(o)
  const caixa = t.m('lib/growth/studioSimples'), tabs = t.m('lib/create/tabs')
  t.mount(React.createElement(t.m('components/create/StudioNaMoldura').default, { showRecreate: true, motor: caixa.motorDaCaixa(undefined), campanha: tabs.CREATE_FILM_CAMPAIGN }))
  t.type(p => p.id === 'sm-idea', texto ?? IDEA, 'passo 1')
  if (duracao) t.click(p => p['data-studio-duration'] === duracao, 'duração')
  if (formato) t.click(p => p['data-studio-format'] === formato, 'formato')
  if (lingua) t.select(p => p.id === 'sm-lingua', lingua, 'língua')
  if (verbatim) t.type(p => p.type === 'checkbox', true, 'palavra por palavra')
  const before = t.html()
  if (t.log.pushes.length !== 0) throw new Error('a moldura navegou antes do clique em Generate')
  t.click(isGen, 'Generate')
  return { pushes: t.log.pushes, events: t.log.events, storage: [...t.log.storage], fetches: t.log.fetches, html: t.html(), before }
}
const only = (evs, names) => evs.filter(([n]) => names.includes(n))
const GEN = ['mrr_generate_clicked', 'studio_simple_generate_clicked', 'sexual_content_refused_client']
function onChecks(o) {
  const cases = [{}, { duracao: 35 }, { duracao: 90, formato: '16:9' }, { duracao: 15, formato: '1:1', lingua: 'pt' }, { formato: '4:5', lingua: 'es', verbatim: true }, { texto: 'Um navio fantasma no Atlântico em 1872' }]
  for (const c of cases) {
    const a = viaMain({ ...o, ...MAIN }, c), b = viaFrame(o, c)
    const tag = JSON.stringify(c)
    ok(a.pushes.length === 1 && JSON.stringify(b.pushes) === JSON.stringify(a.pushes), `${tag}: mesma rota e mesma query (${b.pushes[0]})`)
    ok(new URL(b.pushes[0], 'https://x').pathname === '/studio/create', `${tag}: o Generate vai à casa de máquinas de sempre`)
    ok(JSON.stringify(b.storage) === JSON.stringify(a.storage), `${tag}: o mesmo kineo:studio:go:v1`)
    ok(JSON.stringify(b.fetches) === JSON.stringify(a.fetches), `${tag}: as mesmas chamadas de rede (nenhuma a mais)`)
    // Eventos do Generate: campo a campo; a ÚNICA diferença permitida é page_idea_kept (a ideia não veio de outra página).
    const ga = only(a.events, GEN), gb = only(b.events, GEN)
    const strip = evs => evs.map(([n, meta]) => [n, { ...meta, page_idea_kept: undefined }])
    ok(JSON.stringify(strip(gb)) === JSON.stringify(strip(ga)) && gb.length === 2, `${tag}: mesmos eventos do Generate, campo a campo`)
    const kept = gb.find(([n]) => n === 'studio_simple_generate_clicked')[1].page_idea_kept
    ok(kept === false, `${tag}: page_idea_kept=false (honesto: a ideia foi escrita aqui)`)
    // Eventos de montagem do Studio: os mesmos, + create_tab_viewed da moldura; nenhum create_continue_clicked (não houve "Continue").
    const mount = ['studio_simple_viewed', 'mrr_studio_viewed']
    ok(JSON.stringify(only(b.events, mount)) === JSON.stringify(only(a.events, mount)) && only(b.events, mount).length === 2, `${tag}: mesmos eventos de montagem do Studio, campo a campo`)
    ok(only(b.events, ['mrr_idea_entered']).length === 1, `${tag}: escrever no passo 1 mede mrr_idea_entered uma vez (o mesmo onChange da caixa)`)
    ok(JSON.stringify(only(b.events, ['create_tab_viewed'])) === JSON.stringify([['create_tab_viewed', { tab: 'film' }]]) && only(b.events, ['create_continue_clicked']).length === 0, `${tag}: a moldura só acrescenta create_tab_viewed`)
  }
  // Recusas: mesmo texto, mesmo "não navega", mesmo evento — e o aviso aparece no passo 1.
  const refusals = [['https://chatgpt.com/share/abc', "We can&#x27;t open ChatGPT links"], ['a naked couple in a hotel room having sex on camera', null], ['x'.repeat(20001), 'This text is too long']]
  for (const [texto, expect] of refusals) {
    const a = viaMain({ ...o, ...MAIN }, { texto: texto.length > 2000 ? undefined : texto }), b = viaFrame(o, { texto })
    ok(b.pushes.length === 0, `recusa "${texto.slice(0, 24)}": não navega`)
    ok(/<p class="ct-alert" role="alert">[^<]+<\/p>/.test(b.html) && (!expect || b.html.includes(expect)), `recusa "${texto.slice(0, 24)}": o aviso do Studio aparece no passo 1`)
    if (texto.length <= 2000) ok(JSON.stringify(only(b.events, ['sexual_content_refused_client'])) === JSON.stringify(only(a.events, ['sexual_content_refused_client'])), `recusa "${texto.slice(0, 24)}": mesmo evento da main`)
  }
  // O aviso é o MESMO texto do StudioSimples (lido no componente, não reescrito).
  const simples = lf(read('components/studio/StudioSimples.tsx'))
  ok(simples.includes("if (limite.over) return recusar('This text is too long. Shorten it a little and try again.')") && simples.split('router.push(pedidoDoStudioSimples(').length === 2, 'um só gerar(), um só router.push — no StudioSimples')
  const frameSrc = lf(read('components/create/StudioNaMoldura.tsx'))
  ok(!/fetch\(|router|useRouter|pedidoDoStudioSimples|trackEvent|sessionStorage|useState|useEffect/.test(frameSrc), 'a moldura não tem estado, rede, roteador nem evento próprio (só desenha)')
  // Exemplo da galeria preenche o passo 1 (e mede o clique), nunca gera.
  const t = aba(o)
  t.mount(React.createElement(t.m('components/create/StudioNaMoldura').default, { showRecreate: true, motor: 'seedance', campanha: 'create_film' }))
  const card = t.all(p => typeof p['aria-label'] === 'string' && p['aria-label'].startsWith('Use the idea: '))[1]
  const title = card.props['aria-label'].slice('Use the idea: '.length)
  t.click(p => p === card.props, 'exemplo')
  ok(t.one(p => p.id === 'sm-idea', 'caixa').props.value === title && t.log.pushes.length === 0, 'exemplo: preenche o passo 1 com o título e não gera')
  ok(t.log.events.some(([n, m]) => n === 'create_example_clicked' && m.tab === 'film') && t.log.events.some(([n]) => n === 'mrr_idea_entered'), 'exemplo: create_example_clicked + mrr_idea_entered')
}

// ─── D. Preço só no botão, da função que cobra; sem motor; nada sozinho ─────────────────────────────────────────────────
function priceChecks(o) {
  const cost = aba(o).m('lib/credits/engineCost'), price = aba(o).m('lib/create/filmNaMoldura')
  for (const d of [15, 35, 60, 90]) {
    ok(price.precoDoGenerate('seedance', d) === cost.creditCostForDuration('cinematic_ai', true, d) && cost.creditCostForDuration('cinematic_ai', true, d) === cost.creditCostForDuration('cinematic_ai', false, d), `${d} s: o número = creditCostForDuration (paga ou não paga, o mesmo)`)
  }
  ok(['hollywood', 'h3', 'omni', 's25', 'fast', 'x'].every(mo => price.precoDoGenerate(mo, 60) === null), 'outro motor: sem número (nunca um palpite)')
  for (const d of [15, 35, 60, 90]) {
    const t = aba(o)
    t.mount(React.createElement(t.m('components/create/StudioNaMoldura').default, { showRecreate: true, motor: 'seedance', campanha: 'create_film' }))
    if (d !== 60) t.click(p => p['data-studio-duration'] === d, 'duração')
    const html = t.html()
    const button = html.match(/<button type="button" class="rc-generate"[^>]*>[\s\S]*?<\/button>/)[0]
    ok(button.includes(`Generate<span>✦ ${price.precoDoGenerate('seedance', d)}</span>`), `${d} s: "Generate ✦ ${price.precoDoGenerate('seedance', d)}" no botão`)
    const rest = html.replace(button, '')
    const text = visibleText(rest) + ' ' + [...rest.matchAll(/(?:aria-label|placeholder|title|alt)="([^"]*)"/g)].map(x => x[1]).join(' ')
    ok(!PRICE.test(text), `${d} s: preço/crédito em nenhum outro lugar (${(text.match(PRICE) || [])[0]})`)
    ok(!ENGINE_NAMES.test(text + visibleText(button)), `${d} s: nenhum nome de motor (${((text + visibleText(button)).match(ENGINE_NAMES) || [])[0]})`)
    ok(/disabled=""/.test(button) && html.includes('Write your idea to continue.'), `${d} s: Generate desabilitado sem ideia, com o motivo`)
    ok(t.log.pushes.length === 0 && t.log.fetches.length === 0 && !/autofocus/i.test(html), `${d} s: nada começa sozinho (sem navegação, sem rede, sem autofoco)`)
    ok((html.match(/data-create-tab=/g) || []).length === 4 && html.includes('aria-current="page" data-create-tab="film"'), `${d} s: abas no topo, Film ativa`)
    ok((html.match(/class="rc-step /g) || []).length === 3 && html.includes('<details class="rc-adjustments">') && !html.includes('<details class="rc-adjustments" open'), `${d} s: 3 passos; Details recolhido`)
    ok(html.includes('class="rc-player"') && (html.match(/data-create-example=/g) || []).length >= 3, `${d} s: exemplo grande + Film examples`)
  }
  // Free-film line (aviso que o Studio já tem) continua com o MESMO texto quando /api/credits prova.
  ok(lf(read('components/create/StudioNaMoldura.tsx')).includes('{c.temFilmeGratis ? <p className="rc-next-note" data-testid="studio-free-film-line">{LINHA_DO_FILME_GRATIS}</p> : null}'), 'a linha do filme grátis é a mesma constante')
}

// ─── E. Celular ────────────────────────────────────────────────────────────────────────────────────────────────────────
function mobileChecks(o) {
  const css = lf(read('app/recreate/recreate.css')), mine = lf(o['components/create/create.css'] ?? read('components/create/create.css'))
  ok(/@media\(max-width:640px\)\{[^\n]*\.rc-workspace\{display:flex;flex-direction:column;height:auto\}\.rc-reference\{order:0;[^\n]*\.rc-panel\{order:1;[^\n]*\.rc-gallery\{order:2;/.test(css), 'celular: exemplo, passos, grade (CSS do Recreate)')
  const novo = mine.slice(mine.indexOf('KINEO-STUDIO-NA-MOLDURA-1011'))
  ok(novo.length > 100 && !/(?<![-a-z])(min-)?width:\s*\d{3,}px/.test(novo) && novo.split('\n').slice(1).filter(Boolean).every(l => l.startsWith('.create-shell ')), 'CSS novo: só .create-shell, nenhuma largura fixa')
}

function all(o = {}) { switchChecks(o); offChecks(o); onChecks(o); priceChecks(o); mobileChecks(o) }
all()
const real = passed

const src = p => read(p)
const mutants = [
  ['interruptor público', { 'lib/create/release.ts': src('lib/create/release.ts').replace("CREATE_FILM_INPLACE: InternalRelease = 'internal'", "CREATE_FILM_INPLACE: InternalRelease = 'public'") }],
  ['porta ignora a allowlist', { 'lib/create/access.ts': src('lib/create/access.ts').replace("return tab === 'film' && !!email && releaseVisible(email, release)", "return tab === 'film' && !!email") }],
  ['Cartoon também troca', { 'lib/create/access.ts': src('lib/create/access.ts').replace("return tab === 'film' && ", 'return ') }],
  ['página com outra campanha', { 'app/create/[tab]/page.tsx': src('app/create/[tab]/page.tsx').replace('campanha={CREATE_FILM_CAMPAIGN} />', 'campanha="create_film_v2" />') }],
  ['Generate da moldura não chama o gerar() do Studio', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('onClick={c.gerar}', "onClick={() => c.setDuracao(60)}") }],
  ['escrever não mede a ideia', { 'components/studio/StudioSimples.tsx': src('components/studio/StudioSimples.tsx').replace("const escrever = (v: string) => { setTexto(v); setAviso(null); if (v.trim()) registrar('mrr_idea_entered') }", 'const escrever = (v: string) => { setTexto(v); setAviso(null) }') }],
  ['moldura muda a campanha do pedido', { 'components/studio/StudioSimples.tsx': src('components/studio/StudioSimples.tsx').replace('if (moldura) {', "if (moldura) { campanha = 'moldura';") }],
  ['preço inventado', { 'lib/create/filmNaMoldura.ts': src('lib/create/filmNaMoldura.ts').replace("creditCostForDuration('cinematic_ai', true, duracao)", '40') }],
  ['preço fora do botão', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('<small>{c.duracao} s · {c.formato} ', '<small>{c.duracao} s · {c.formato} · ✦ {preco} ') }],
  ['nome de motor na tela', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('<span>Details</span>', '<span>Details · Seedance</span>') }],
  ['Details aberto por padrão', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('<details className="rc-adjustments">', '<details className="rc-adjustments" open>') }],
  ['recusa sem aviso na moldura', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('{c.aviso ? <p className="ct-alert" role="alert">{c.aviso}</p> : null}', '') }],
  ['CreateShell desligado muda o texto', { 'components/create/CreateShell.tsx': src('components/create/CreateShell.tsx').replace("'Nothing starts until you continue.'", "'Nothing starts until you go on.'") }],
  ['StudioSimples desligado muda', { 'components/studio/StudioSimples.tsx': src('components/studio/StudioSimples.tsx').replace("<h1>What&apos;s your film about?</h1>", '<h1>Your film?</h1>') }],
  ['gera sozinho quando há texto', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('const temTexto = c.texto.trim().length > 0', 'const temTexto = c.texto.trim().length > 0; if (temTexto) c.gerar()') }],
  ['CSS com largura fixa', { 'components/create/create.css': src('components/create/create.css').replace('.create-shell .ct-sel{width:100%;', '.create-shell .ct-sel{width:520px;') }],
]
let bitten = 0
for (const [name, o] of mutants) {
  passed = 0
  let died = false
  try { all(o) } catch (e) { died = true; if (process.env.VERBOSE) console.log(`  ${name} → ${String(e.message).split('\n')[0]}`) }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-studio-na-moldura-1011: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
