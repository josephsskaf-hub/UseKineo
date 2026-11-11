// KINEO-STUDIO-NA-MOLDURA-1011 [fundador 10/11: "Quero todas as telas com o design que fizemos no codex"]
// Guardião da aba Film = Studio real na moldura nova. Offline: módulos REAIS transpilados, hooks emulados, cliques chamando os handlers de
// verdade, roteador/rede/eventos/sessionStorage como dublês que só anotam (docs/studio-na-moldura-1011/runtime.cjs). Prova:
//   A. interruptor CREATE_FILM_INPLACE × quem chega (off/internal/public; casa, conta de fora, visitante; só a aba Film);
//   B. desligado: StudioSimples sem moldura idêntico à main, CreateShell conserva ações/catálogo e os arquivos do gerador seguem protegidos;
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
const { studioRenderContract } = require('./test-support/studio-render-contract.cjs')
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
const semCabecalho = html => html.replace(/<header class="rc-nav[^"]*">[\s\S]*?<\/header>/, '<header/>') // KINEO-TELA-NOVA-CABECALHO-1011
const BADGE_FETCH = ['/api/credits', 'GET'] // a leitura de saldo do cabeçalho (NavCreditsBadge), a mesma de toda tela do app

// ─── A. Interruptor ────────────────────────────────────────────────────────────────────────────────────────────────────
const forced = (o, v) => ({ ...o, 'lib/create/release.ts': (o['lib/create/release.ts'] ?? read('lib/create/release.ts')).replace(/CREATE_FILM_INPLACE: InternalRelease = '[a-z]+'/, `CREATE_FILM_INPLACE: InternalRelease = '${v}'`) })
function switchChecks(o) {
  const access = aba(o).m('lib/create/access'), release = aba(o).m('lib/create/release')
  ok(release.CREATE_FILM_INPLACE === 'public', "KINEO-STUDIO-NA-MOLDURA-ABRE-1011: o interruptor está 'public' (aberto em 10/11)")
  ok(release.CREATE_SHELL_RELEASE === 'public', 'CREATE_SHELL_RELEASE intocado (public)')
  ok(access.filmNaMoldura('film', HOUSE) === true && access.filmNaMoldura('film', CUSTOMER) === true && access.filmNaMoldura('film', null) === false, "padrão 'public': toda conta logada vê o Studio na moldura; visitante nunca")
  const internal = aba(forced(o, 'internal')).m('lib/create/access')
  ok(internal.filmNaMoldura('film', HOUSE) === true && internal.filmNaMoldura('film', CUSTOMER) === false && internal.filmNaMoldura('film', null) === false, "volta 'internal' forçado: só a casa")
  for (const t of ['cartoon', 'ads', 'recreate', 'x']) ok(access.filmNaMoldura(t, HOUSE) === false, `${t}: nunca troca (só a aba Film)`)
  const off = aba(forced(o, 'off')).m('lib/create/access'), pub = aba(forced(o, 'public')).m('lib/create/access')
  ok([HOUSE, CUSTOMER, null].every(e => off.filmNaMoldura('film', e) === false), "'off' forçado: ninguém")
  ok(pub.filmNaMoldura('film', CUSTOMER) === true && pub.filmNaMoldura('film', null) === false, "'public' forçado: toda conta logada, nunca visitante")
  ok(internal.filmNaMoldura('film', 'test-hacker@example.org') === false, "'internal': e-mail parecido não é allowlist")
  const page = lf(o['app/create/[tab]/page.tsx'] ?? read('app/create/[tab]/page.tsx'))
  // KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"] — a aba passa a ler a campanha e a ideia do link
  // como o /studio lê (campanhaDaCaixa · ideiaDoLink); SEM intent_campaign a campanha segue a do Continue (CREATE_FILM_CAMPAIGN); motor: o padrão.
  const iDecision = page.indexOf("if (decision.kind !== 'show') notFound()"), iCamp = page.indexOf('const campanha = searchParams.intent_campaign === undefined ? CREATE_FILM_CAMPAIGN : campanhaDaCaixa(searchParams.intent_campaign)'), iFrame = page.indexOf('if (filmNaMoldura(params.tab, user?.email)) return <><StudioIdeaArrival /><StudioNaMoldura showRecreate={decision.showRecreate} motor={motorDaCaixa(undefined)} campanha={campanha} ideiaInicial={ideiaDoLink(searchParams.ideia)} /></>')
  ok(iDecision > 0 && iCamp > iDecision && iFrame > iCamp, 'a página só troca DEPOIS da porta da tela nova (404/cadastro de sempre), com o motor e a campanha do Continue')
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
    const props = { tab, showRecreate }
    const current = studioRenderContract(ssr(o, 'components/create/CreateShell', props))
    const previous = studioRenderContract(ssr({ ...o, 'components/create/CreateShell.tsx': MAIN['components/create/CreateShell.tsx'] }, 'components/create/CreateShell', props))
    assert.deepEqual(current, previous, `CreateShell ${tab}: abas, campos, bloqueio, destino e catálogo de ${BASE}`)
  }
  // Comportamento sem moldura: o mesmo pedido e os mesmos eventos da main pelo caminho de hoje.
  ok(JSON.stringify(viaMain(o, {})) === JSON.stringify(viaMain({ ...o, ...MAIN }, {})), 'StudioSimples sem moldura: pedido + eventos = main')
  // KINEO-REGIAO-PAGA-1011 [CEO 10/11, publicado em fb3235afb] — a faixa da prévia recusada mexeu, de propósito, nestes 4 arquivos protegidos.
  // A referência deles passa a ser o arquivo COMO ESTÁ na origin/main fb3235afb (byte a byte); qualquer outra mudança neles, ou em
  // qualquer outro arquivo protegido desde o BASE, segue vermelha.
  const REGIAO_PAGA_REF = 'fb3235afb'
  const REGIAO_PAGA = ['app/(dashboard)/studio/previa/ScenePreviewClient.tsx', 'app/api/events/route.ts', 'app/api/scene-preview/pricing-strip/route.ts', 'lib/growth/regiaoPaga1011.ts']
  const desdeRef = f => execFileSync('git', ['diff', '--name-only', REGIAO_PAGA_REF, '--', f], { cwd: ROOT, encoding: 'utf8' }).trim()
  const changed = execFileSync('git', ['diff', '--name-only', BASE, '--', 'app/(dashboard)', 'lib/credits', 'lib/growth', 'app/api', 'lib/recreate', 'middleware.ts'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean)
    .filter(f => !(REGIAO_PAGA.includes(f) && desdeRef(f) === ''))
    .filter(f => !(f === 'middleware.ts' && lf(read(f)) === lf(baseSrc(f)).replace('_next/image|favicon.ico', '_next/image|fonts/manrope-v23/|favicon.ico')))
    .join(', ')
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
    ok(JSON.stringify(b.fetches) === JSON.stringify([...a.fetches, BADGE_FETCH]), `${tag}: as mesmas chamadas de rede + só a leitura de saldo do cabeçalho`)
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

// ─── D. Preço: só para pagante, só quando a duração é a cobrada, só no botão; sem motor; nada sozinho ───────────────────
// KINEO-STUDIO-NA-MOLDURA-ABRE-1011 — corpos de GET /api/credits (os campos que a rota devolve; ver app/api/credits/route.ts).
const SESSION = 'sb-abc-auth-token=x'
const PAID = { credits: 400, hasPaid: true, isStarter: false, isCreator: false, isStudio: true, entitlementsResolved: true, filmsDelivered: 3, trial: { phase: 'none' } }
const STARTER = { credits: 60, hasPaid: false, isStarter: true, isCreator: false, isStudio: false, entitlementsResolved: true, filmsDelivered: 0, trial: { phase: 'none' } }
const TRIAL = { credits: 10, hasPaid: false, isStarter: false, isCreator: false, isStudio: false, entitlementsResolved: true, filmsDelivered: 0, trial: { phase: 'active', creditsGranted: 10, msLeft: 86_400_000, creditsUsedForDisplay: 0 } }
const FREE = { credits: 0, hasPaid: false, isStarter: false, isCreator: false, isStudio: false, entitlementsResolved: true, filmsDelivered: 1, trial: { phase: 'none' } }
const button = html => html.match(/<button type="button" class="rc-generate"[^>]*>[\s\S]*?<\/button>/)[0]
async function frameWith(o, opts, steps = () => {}) {
  const t = aba(o, opts)
  t.mount(React.createElement(t.m('components/create/StudioNaMoldura').default, { showRecreate: true, motor: 'seedance', campanha: 'create_film' }))
  await t.settle()
  steps(t)
  return t
}
async function priceChecks(o) {
  const cost = aba(o).m('lib/credits/engineCost'), price = aba(o).m('lib/create/filmNaMoldura'), cpt = aba(o).m('lib/growth/contaPagaNaTela')
  const base = { motor: 'seedance', contaPaga: true, palavraPorPalavra: false, texto: 'A ship found adrift', opcoesDuracao: [15, 35, 60, 90] }
  for (const d of [15, 35, 60, 90]) {
    ok(price.precoDoGenerate({ ...base, duracao: d }) === cost.creditCostForDuration('cinematic_ai', true, d) && cost.creditCostForDuration('cinematic_ai', true, d) === cost.creditCostForDuration('cinematic_ai', false, d), `${d} s pagante: o número = creditCostForDuration`)
    ok(price.precoDoGenerate({ ...base, duracao: d, contaPaga: false }) === null, `${d} s conta sem prova de plano pago: sem número`)
    ok(price.precoDoGenerate({ ...base, duracao: d, palavraPorPalavra: true }) === null, `${d} s palavra por palavra (autofit pode subir): sem número`)
  }
  ok(price.precoDoGenerate({ ...base, duracao: 60, texto: 'Make it a 90-second film about the Titanic' }) === null, 'duração escrita no texto ≠ escolhida: sem número (o /studio/create troca)')
  ok(price.precoDoGenerate({ ...base, duracao: 90, texto: 'Make it a 90-second film about the Titanic' }) === cost.creditCostForDuration('cinematic_ai', true, 90), 'duração escrita = escolhida: número')
  // KINEO-MOTOR-OPCIONAL-1011 — motor ESCOLHIDO no passo Details: o número é o da função que cobra para a quality dele; fora da lista
  // da caixa (aposentado, Kineo 1, inventado) segue sem número; Kling 4.0 sem a leitura do Studio (kling4) também (nunca um palpite).
  ok(['omni', 'fast', 'x', 'veo', 'kling'].every(mo => price.precoDoGenerate({ ...base, motor: mo, duracao: 60 }) === null), 'motor fora da lista: sem número (nunca um palpite)')
  ok(['h3', 'h3max', 's25'].every(mo => price.precoDoGenerate({ ...base, motor: mo, duracao: 60 }) === cost.creditCostForDuration(`cinematic_${mo}`, true, 60)), 'motor escolhido: o número = creditCostForDuration da quality dele')
  ok(price.precoDoGenerate({ ...base, motor: 'hollywood', duracao: 60 }) === null, 'Kling 4.0 sem a leitura de disponibilidade: sem número')
  // "Pagante" = contaPagaNaTela sobre o corpo de /api/credits — nenhuma regra nova.
  for (const [nome, corpo] of [['PAID', PAID], ['STARTER', STARTER], ['TRIAL', TRIAL], ['FREE', FREE], ['null', null], ['vazio', {}], ['hasPaid "true"', { hasPaid: 'true' }]]) {
    const regra = corpo && typeof corpo === 'object' ? cpt.contaPagaNaTela({ hasPaid: corpo.hasPaid === true, isStarter: corpo.isStarter === true, isCreator: corpo.isCreator === true, isStudio: corpo.isStudio === true, planoLido: false, provadoQueNaoPaga: false }) === true : false
    ok(price.contaPagaDoSaldo(corpo) === regra && regra === (nome === 'PAID' || nome === 'STARTER'), `contaPagaDoSaldo(${nome}) = contaPagaNaTela`)
  }
  // Na tela: pagante vê o número no botão e só lá; os outros veem "Generate" puro, como a caixa de hoje.
  for (const d of [15, 35, 60, 90]) {
    const t = await frameWith(o, { cookie: SESSION, credits: PAID }, t => { if (d !== 60) t.click(p => p['data-studio-duration'] === d, 'duração') })
    const html = t.html(), b = button(html), n = cost.creditCostForDuration('cinematic_ai', true, d)
    ok(b.includes(`Generate<span>✦ ${n}</span>`), `${d} s pagante: "Generate ✦ ${n}" no botão`)
    const rest = semCabecalho(html).replace(b, '')
    const text = visibleText(rest) + ' ' + [...rest.matchAll(/(?:aria-label|placeholder|title|alt)="([^"]*)"/g)].map(x => x[1]).join(' ')
    ok(!PRICE.test(text), `${d} s: preço/crédito em nenhum outro lugar (${(text.match(PRICE) || [])[0]})`)
    ok(!ENGINE_NAMES.test(text + visibleText(b)), `${d} s: nenhum nome de motor (${((text + visibleText(b)).match(ENGINE_NAMES) || [])[0]})`)
    ok(/disabled=""/.test(b) && html.includes('Write your idea to continue.'), `${d} s: Generate desabilitado sem ideia, com o motivo`)
    ok(t.log.pushes.length === 0 && JSON.stringify(t.log.fetches) === JSON.stringify([['/api/credits', 'GET'], BADGE_FETCH]) && !/autofocus/i.test(html), `${d} s: nada começa sozinho (só a leitura de saldo de sempre, sem navegação, sem autofoco)`)
    ok((html.match(/data-create-tab=/g) || []).length === 4 && html.includes('aria-current="page" data-create-tab="film"'), `${d} s: abas no topo, Film ativa`)
    ok((html.match(/class="rc-step /g) || []).length === 3 && html.includes('<details class="rc-adjustments">') && !html.includes('<details class="rc-adjustments" open'), `${d} s: 3 passos; Details recolhido`)
    ok(html.includes('class="rc-player"') && (html.match(/data-create-example=/g) || []).length >= 3, `${d} s: exemplo grande + Film examples`)
    const v = await frameWith(o, { cookie: SESSION, credits: PAID }, t => { if (d !== 60) t.click(p => p['data-studio-duration'] === d, 'duração'); t.type(p => p.type === 'checkbox', true, 'palavra por palavra') })
    ok(!/✦/.test(button(v.html())), `${d} s pagante + palavra por palavra: sem número na tela`)
  }
  for (const [nome, opts] of [['teste grátis', { cookie: SESSION, credits: TRIAL }], ['conta free', { cookie: SESSION, credits: FREE }], ['leitura falhou', { cookie: SESSION, credits: null }], ['sem cookie de sessão', { credits: PAID }]]) {
    const t = await frameWith(o, opts)
    const html = t.html()
    ok(/<button type="button" class="rc-generate"[^>]*>Generate<\/button>/.test(html) && !PRICE.test(visibleText(semCabecalho(html))), `${nome}: botão "Generate" sem número, nenhum preço na tela`)
    const linha = html.includes('data-testid="studio-free-film-line"')
    ok(linha === (nome === 'teste grátis') && (!linha || html.includes(`>${aba(o).m('lib/growth/filmeGratisNaCaixa').LINHA_DO_FILME_GRATIS}<`)), `${nome}: linha do filme grátis só com prova, com o MESMO texto do Studio`)
  }
  const t = await frameWith(o, { cookie: SESSION, credits: PAID }, t => t.type(p => p.id === 'sm-idea', 'Make it a 90-second film about the Titanic', 'ideia'))
  ok(!/✦/.test(button(t.html())), 'pagante com "90-second" escrito e 60 s escolhido: sem número na tela')
  // Sem moldura (o /studio de sempre), com a leitura de saldo real: HTML, rede e eventos = main, para pagante, teste grátis e free.
  for (const corpo of [PAID, TRIAL, FREE]) {
    const run = async ov => { const t = aba(ov, { cookie: SESSION, credits: corpo }); t.mount(React.createElement(t.m('components/studio/StudioSimples').default, { filmes: [], motor: 'seedance', campanha: 'create_film', ideiaInicial: IDEA })); await t.settle(); return JSON.stringify([t.html(), t.log.fetches, t.log.events]) }
    ok(await run(o) === await run({ ...o, ...MAIN }), `StudioSimples sem moldura com /api/credits ${corpo === PAID ? 'pagante' : corpo === TRIAL ? 'teste grátis' : 'free'}: HTML + rede + eventos = main`)
  }
}


// ─── E. Celular ────────────────────────────────────────────────────────────────────────────────────────────────────────
function mobileChecks(o) {
  const css = lf(read('app/recreate/recreate.css')), mine = lf(o['components/create/create.css'] ?? read('components/create/create.css'))
  ok(/@media\(max-width:640px\)\{[^\n]*\.rc-workspace\{display:flex;flex-direction:column;height:auto\}\.rc-reference\{order:0;[^\n]*\.rc-panel\{order:1;[^\n]*\.rc-gallery\{order:2;/.test(css), 'celular: exemplo, passos, grade (CSS do Recreate)')
  const novo = mine.slice(mine.indexOf('KINEO-STUDIO-NA-MOLDURA-1011'), mine.indexOf('/* KINEO-TELA-NOVA-ACABAMENTO-1011')) // o bloco do acabamento tem guardião próprio (test-tela-nova-1011 H)
  ok(novo.length > 100 && !/(?<![-a-z])(min-)?width:\s*\d{3,}px/.test(novo) && novo.split('\n').slice(1).filter(Boolean).every(l => l.startsWith('.create-shell ')), 'CSS novo: só .create-shell, nenhuma largura fixa')
}

// ─── F. Cabeçalho (KINEO-TELA-NOVA-CABECALHO-1011): saldo da fonte real · Pricing · My videos, em todas as abas e no Recreate ──────────
async function headerChecks(o) {
  const nav = html => (html.match(/<header class="rc-nav ct-nav">[\s\S]*?<\/header>/) || [''])[0]
  const screens = [
    ['Film (Studio na moldura)', t => React.createElement(t.m('components/create/StudioNaMoldura').default, { showRecreate: true, motor: 'seedance', campanha: 'create_film' })],
    ...['film', 'cartoon', 'ads'].map(tab => [`CreateShell ${tab}`, t => React.createElement(t.m('components/create/CreateShell').default, { tab })]),
    ['Recreate com abas', t => React.createElement(t.m('app/recreate/RecreateClient').default, { initialId: 'elevador', createTabs: true })],
  ]
  for (const [nome, el] of screens) {
    for (const saldo of [0, 7, 1234]) {
      const t = aba(o, { cookie: SESSION, credits: { ...PAID, credits: saldo } })
      t.mount(el(t)); await t.settle()
      const h = nav(t.html()), txt = visibleText(h).replace(/\s+/g, ' ')
      ok(h !== '' && new RegExp(`> ?${saldo} credits?<`).test(h.replace(/<!-- -->/g, '')) && t.log.fetches.some(f => f[0] === '/api/credits'), `${nome}: saldo ${saldo} = o campo credits de GET /api/credits`)
      ok(/<a [^>]*data-create-nav="pricing"[^>]*href="\/pricing"[^>]*>Pricing</.test(h) && /<a [^>]*href="\/library"[^>]*>My videos ↗</.test(h) && aba(o).m('components/create/CreateNavConta').CREATE_NAV_VIDEOS_HREF === '/library', `${nome}: Pricing → /pricing e My videos → /library`) // KINEO-ENTRADAS-SO-LOGADO-1011 — era /clips (só clipes); os filmes da aba Film moram na /library
      ok(/<details class="ct-credit-menu"[\s\S]+<summary[\s\S]+<\/summary>[\s\S]+data-create-nav="pricing"[\s\S]+<\/details>/.test(h), `${nome}: saldo abre Pricing no próprio menu`)
      ok(!/(\d+\s?%|\boff\b|hurry|ends in|last chance|\d{1,2}:\d{2}|countdown|deal|sale|free)/i.test(txt), `${nome}: sem promoção nem relógio no cabeçalho (${txt})`)
    }
    const falhou = aba(o, { cookie: SESSION, credits: null })
    falhou.mount(el(falhou)); await falhou.settle()
    ok(!/credits?</.test(nav(falhou.html())) && nav(falhou.html()).includes('>Pricing<'), `${nome}: leitura que falhou = sem saldo (nunca "0" inventado), Pricing segue`)
  }
  // O badge é o espelho do cabeçalho do dashboard: mesma rota, mesmo campo, evento creditsChanged e realtime de profiles.
  const badge = lf(read('components/NavCreditsBadge.tsx'))
  ok(badge.includes("fetch('/api/credits'") && badge.includes("typeof data.credits === 'number'") && badge.includes("'creditsChanged'") && badge.includes("table: 'profiles'"), 'saldo = GET /api/credits + creditsChanged + realtime (a fonte do TopBar)')
  ok(lf(read('components/TopBar.tsx')).includes("fetch('/api/credits'"), 'o TopBar do dashboard lê a MESMA rota')
  const conta = lf(o['components/create/CreateNavConta.tsx'] ?? read('components/create/CreateNavConta.tsx'))
  ok(!/\b\d+\s*credits?\b/i.test(conta) && conta.includes('<NavCreditsBadge labelOnly />'), 'nenhum número de saldo fixo no código do cabeçalho')
  const menu = lf(read('components/MobileNav.tsx'))
  ok(menu.includes("href: '/pricing'") && aba(o).m('components/create/CreateNavConta').CREATE_NAV_PRICING_HREF === '/pricing', 'Pricing = o destino que o menu já usa')
  const panelCss = lf(o['components/create/studio-panel.css'] ?? read('components/create/studio-panel.css'))
  ok(panelCss.includes('flex-wrap: wrap') && panelCss.includes('order: 3; flex-basis: 100%'), 'celular: saldo e marca em cima, abas na segunda linha')
  // Recreate sem abas: cabeçalho de antes (byte a byte já provado por scripts/test-tela-nova-1011.mjs).
  const rc = lf(read('app/recreate/RecreateClient.tsx'))
  ok(rc.includes("{createTabs ? <CreateNavConta /> : <Link href=\"/clips\">My videos ↗</Link>}") && rc.includes("className={createTabs ? 'rc-nav ct-nav' : 'rc-nav'}"), 'Recreate: cabeçalho novo só junto com as abas')
}

// ─── G. KINEO-TELA-NOVA-ACABAMENTO-1011 [fundador 10/11: "em More Options você vai para a tela antiga… acho que está errado"] ─────────
// O passo Details abre AQUI: duração e formato (o que o resumo "60 s · 9:16" promete) mudam na própria moldura, sem navegar; o efeito no
// pedido é o da main (provado em C com viaFrame). O Studio antigo só por um link discreto "Advanced studio" no rodapé do passo.
async function detailsChecks(o) {
  const passo = html => (html.match(/<section class="rc-step [^"]*"[^>]*aria-label="Details">[\s\S]*?<\/section>/) || [''])[0]
  const t = await frameWith(o, { cookie: SESSION, credits: PAID })
  const s = passo(t.html())
  const summary = (s.match(/<summary>[\s\S]*?<\/summary>/) || [''])[0]
  ok(s !== '' && /<small>60(?:<!-- -->)? s · (?:<!-- -->)?9:16/.test(summary) && !/<a /.test(summary), 'Details: o resumo "60 s · 9:16" abre o passo aqui (sem link no resumo)')
  const simples = lf(read('components/studio/StudioSimples.tsx'))
  ok(simples.includes('const DURACOES = [15, 35, 60, 90] as const') && simples.includes("const FORMATOS = ['9:16', '16:9', '1:1', '4:5'] as const") && [...s.matchAll(/data-studio-duration="(\d+)"/g)].map(x => +x[1]).join() === '15,35,60,90' && [...s.matchAll(/data-studio-format="([^"]+)"/g)].map(x => x[1]).join() === '9:16,16:9,1:1,4:5', 'Details: as durações e formatos que o Studio simples aceita (DURACOES/FORMATOS)')
  const links = [...s.matchAll(/<a [^>]*>[\s\S]*?<\/a>/g)].map(x => x[0])
  ok(links.length === 1 && /^<a href="\/studio\?avancado=1&amp;engine=seedance&amp;intent_campaign=create_film" data-kineo="studio-advanced">Advanced studio ↗<\/a>$/.test(links[0]), `Details: um só link para o Studio antigo, "Advanced studio" (${links.join(' | ')})`)
  ok(/<p class="ct-advanced"><a [^>]*data-kineo="studio-advanced"[^>]*>Advanced studio ↗<\/a><span> · logo, camera, star of the film<\/span><\/p><\/div><\/details>/.test(s) /* KINEO-MOTOR-OPCIONAL-1011: o motor saiu da lista do Advanced */, 'Details: o link fica no rodapé do passo, depois dos ajustes')
  ok(!/More options/.test(s) && !/data-kineo="studio-simple-more"/.test(t.html()), 'Details: "More options" não existe mais na moldura')
  // Trocar duração e formato no passo: o resumo muda e nada navega.
  t.click(p => p['data-studio-duration'] === 35, 'duração 35')
  t.click(p => p['data-studio-format'] === '16:9', 'formato 16:9')
  const s2 = passo(t.html())
  ok(/<small>35(?:<!-- -->)? s · (?:<!-- -->)?16:9/.test(s2) && /aria-pressed="true" data-studio-duration="35"/.test(s2) && /aria-pressed="true" data-studio-format="16:9"/.test(s2) && t.log.pushes.length === 0, 'Details: duração e formato escolhidos ali mesmo; o resumo acompanha; nada navega')
  // O link leva o texto escrito ao Studio antigo (o mesmo maisOpcoes do StudioSimples, nada inventado).
  t.type(p => p.id === 'sm-idea', IDEA, 'ideia')
  const href = (passo(t.html()).match(/href="([^"]+)" data-kineo="studio-advanced"/) || [])[1]?.replace(/&amp;/g, '&')
  ok(href && new URL(href, 'https://x').pathname === '/studio' && new URL(href, 'https://x').searchParams.get('avancado') === '1' && new URL(href, 'https://x').searchParams.get('prompt') === IDEA, 'Advanced studio: o destino antigo, com o texto')
  ok(lf(read('components/studio/StudioSimples.tsx')).includes("const q = new URLSearchParams({ avancado: '1', engine: motor, intent_campaign: campanha })"), 'Advanced studio = o maisOpcoes do StudioSimples (fonte única)')
  const css = lf(o['components/create/create.css'] ?? read('components/create/create.css'))
  ok(/\.create-shell \.ct-advanced\{[^}]*font-size:12px/.test(css) && /\.create-shell \.ct-advanced a\{[^}]*color:var\(--rc-muted\)/.test(css) && !css.includes('.ct-more'), 'Advanced studio: discreto (12 px, cor apagada)')
}

async function all(o = {}) { switchChecks(o); offChecks(o); onChecks(o); await priceChecks(o); mobileChecks(o); await headerChecks(o); await detailsChecks(o) }
await all()
const real = passed

const src = p => read(p)
const mutants = [
  ['saldo fixo no cabeçalho', { 'components/create/CreateNavConta.tsx': src('components/create/CreateNavConta.tsx').replace('<NavCreditsBadge labelOnly />', '<span>400 credits</span>') }],
  ['Pricing aponta para outro lugar', { 'components/create/CreateNavConta.tsx': src('components/create/CreateNavConta.tsx').replace("CREATE_NAV_PRICING_HREF = '/pricing'", "CREATE_NAV_PRICING_HREF = '/pricing?promo=1'") }],
  ['Recreate sem o cabeçalho novo', { 'app/recreate/RecreateClient.tsx': src('app/recreate/RecreateClient.tsx').replace('{createTabs ? <CreateNavConta /> :', '{false ? <CreateNavConta /> :') }],
  ['abas sem o cabeçalho novo', { 'components/create/CreateShell.tsx': src('components/create/CreateShell.tsx').replace('<CreateNavConta />', '<Link href="/clips">My videos ↗</Link>') }],
  ['My videos volta para /clips (só clipes)', { 'components/create/CreateNavConta.tsx': src('components/create/CreateNavConta.tsx').replace("CREATE_NAV_VIDEOS_HREF = '/library'", "CREATE_NAV_VIDEOS_HREF = '/clips'") }], // KINEO-ENTRADAS-SO-LOGADO-1011
  ['cabeçalho com promoção', { 'components/create/CreateNavConta.tsx': src('components/create/CreateNavConta.tsx').replace('>Pricing</Link>', '>Pricing · 50% off</Link>') }],
  ['cabeçalho quebra no celular', { 'components/create/studio-panel.css': src('components/create/studio-panel.css').replace('flex-wrap: wrap', 'flex-wrap: nowrap') }],
  ['interruptor de volta a internal', { 'lib/create/release.ts': src('lib/create/release.ts').replace("CREATE_FILM_INPLACE: InternalRelease = 'public'", "CREATE_FILM_INPLACE: InternalRelease = 'internal'") }],
  ['interruptor desligado', { 'lib/create/release.ts': src('lib/create/release.ts').replace("CREATE_FILM_INPLACE: InternalRelease = 'public'", "CREATE_FILM_INPLACE: InternalRelease = 'off'") }],
  ['número para quem não paga', { 'lib/create/filmNaMoldura.ts': src('lib/create/filmNaMoldura.ts').replace('if (!f.contaPaga || f.palavraPorPalavra', 'if (f.palavraPorPalavra') }],
  ['pagante inventado (hasPaid truthy)', { 'lib/create/filmNaMoldura.ts': src('lib/create/filmNaMoldura.ts').replace('hasPaid: d.hasPaid === true', 'hasPaid: !!d.hasPaid') }],
  ['número ignora palavra por palavra', { 'lib/create/filmNaMoldura.ts': src('lib/create/filmNaMoldura.ts').replace('if (!f.contaPaga || f.palavraPorPalavra ||', 'if (!f.contaPaga ||') }],
  ['número ignora a duração escrita', { 'lib/create/filmNaMoldura.ts': src('lib/create/filmNaMoldura.ts').replace('if (pedida !== null && pedida !== f.duracao) return null', '') }],
  ['moldura não recebe o pagante', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('contaPaga: c.contaPaga', 'contaPaga: false') }],
  ['linha do filme grátis some', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('{c.temFilmeGratis ? <p', '{false ? <p') }],
  ['porta ignora a allowlist', { 'lib/create/access.ts': src('lib/create/access.ts').replace("return tab === 'film' && !!email && releaseVisible(email, release)", "return tab === 'film' && !!email") }],
  ['Cartoon também troca', { 'lib/create/access.ts': src('lib/create/access.ts').replace("return tab === 'film' && ", 'return ') }],
  ['página com outra campanha', { 'app/create/[tab]/page.tsx': src('app/create/[tab]/page.tsx').replace('? CREATE_FILM_CAMPAIGN : campanhaDaCaixa', '? "create_film_v2" : campanhaDaCaixa') /* KINEO-ENTRADAS-TELA-NOVA-1011: a campanha padrão mora na linha const campanha */ }],
  ['Generate da moldura não chama o gerar() do Studio', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('onClick={c.gerar}', "onClick={() => c.setDuracao(60)}") }],
  ['escrever não mede a ideia', { 'components/studio/StudioSimples.tsx': src('components/studio/StudioSimples.tsx').replace("const escrever = (v: string) => { setTexto(v); setAviso(null); if (v.trim()) registrar('mrr_idea_entered') }", 'const escrever = (v: string) => { setTexto(v); setAviso(null) }') }],
  ['moldura muda a campanha do pedido', { 'components/studio/StudioSimples.tsx': src('components/studio/StudioSimples.tsx').replace('if (moldura) {', "if (moldura) { campanha = 'moldura';") }],
  ['preço inventado', { 'lib/create/filmNaMoldura.ts': src('lib/create/filmNaMoldura.ts').replace("creditCostForDuration('cinematic_ai', true, f.duracao)", '40') }],
  ['preço fora do botão', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('<small>{c.duracao} s · {c.formato} ', '<small>{c.duracao} s · {c.formato} · ✦ {preco} ') }],
  ['nome de motor na tela', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('<span>Details</span>', '<span>Details · Seedance</span>') }],
  ['Details aberto por padrão', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('<details className="rc-adjustments">', '<details className="rc-adjustments" open>') }],
  ['recusa sem aviso na moldura', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('{c.aviso ? <p className="ct-alert" role="alert">{c.aviso}</p> : null}', '') }],
  ['CreateShell desligado perde o destino do Continue', { 'components/create/CreateShell.tsx': src('components/create/CreateShell.tsx').replace('data-create-continue={continueHref(tab, idea, signedIn)}', 'data-create-continue="/library"') }],
  ['StudioSimples desligado muda', { 'components/studio/StudioSimples.tsx': src('components/studio/StudioSimples.tsx').replace("<h1>What&apos;s your film about?</h1>", '<h1>Your film?</h1>') }],
  ['gera sozinho quando há texto', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('const temTexto = c.texto.trim().length > 0', 'const temTexto = c.texto.trim().length > 0; if (temTexto) c.gerar()') }],
  ['CSS com largura fixa', { 'components/create/create.css': src('components/create/create.css').replace('.create-shell .ct-sel{width:100%;', '.create-shell .ct-sel{width:520px;') }],
  // KINEO-TELA-NOVA-ACABAMENTO-1011
  ['Details apontando para /studio', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('<summary>{marker(2)}<span>Details</span>', '<summary>{marker(2)}<a href={c.maisOpcoes}>Details</a>') }],
  ['"More options" de volta no passo', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('<p className="ct-advanced"><a href={c.maisOpcoes} data-kineo="studio-advanced">Advanced studio ↗</a><span> · logo, camera, star of the film</span></p>', '<a className="ct-more" href={c.maisOpcoes} data-kineo="studio-simple-more">More options ↗</a>') }],
  ['Advanced studio some (logo/estrela sem caminho)', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('<p className="ct-advanced"><a href={c.maisOpcoes} data-kineo="studio-advanced">Advanced studio ↗</a><span> · logo, camera, star of the film</span></p>', '') }],
  ['Details sem a duração', { 'components/create/StudioNaMoldura.tsx': src('components/create/StudioNaMoldura.tsx').replace('<div><span className="ct-lab">Length</span>', '<div hidden><span className="ct-lab">Length</span>').replace('{c.opcoesDuracao.map(d =>', '{[].map(d =>') }],
  ['Advanced studio em destaque', { 'components/create/create.css': src('components/create/create.css').replace('.create-shell .ct-advanced a{color:var(--rc-muted);', '.create-shell .ct-advanced a{color:var(--rc-accent);') }],
]
let bitten = 0
for (const [name, o] of mutants) {
  passed = 0
  let died = false
  try { await all(o) } catch (e) { died = true; if (process.env.VERBOSE) console.log(`  ${name} → ${String(e.message).split('\n')[0]}`) }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-studio-na-moldura-1011: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
