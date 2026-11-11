// KINEO-TELA-NOVA-1011 [fundador 10/11: "Eu quero no ar os fluxos novos que a gente desenhou para o Recreate, para todos os outros fluxos"]
// Guardião da tela nova (/create/film · /create/cartoon · /create/ads + abas no Recreate). Offline: módulos REAIS transpilados, React SSR,
// sem rede, sem credencial, sem banco. Prova: interruptor × quem chega; cada "Continue" vai a rota que EXISTE usando só o que o destino lê
// (lendo o arquivo do destino); nenhuma aba fala motor, preço ou crédito; exemplos existem em disco; o Recreate sem acesso ao /create é
// conserva campos, destinos, permissões e catálogo da versão anterior. Mutantes no fim exercitam os contratos.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { loader, read, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
const { studioRenderContract, parse } = require('./test-support/studio-render-contract.cjs')
const postcss = require('postcss')
const React = require(join(ROOT, 'node_modules/react'))
const { renderToStaticMarkup } = require(join(ROOT, 'node_modules/react-dom/server'))

const BASE = '15c3180ac' // origin/main antes desta obra (Recreate aprovado)
const HOUSE = 'josephsskaf@gmail.com'
const CUSTOMER = 'customer@example.org'
const RELEASES = ['off', 'internal', 'public']
const ENGINE_NAMES = /\b(kling|seedance|veo|minimax|h3|omni|nano banana|sora|runway|wan|hailuo|pixverse|luma|flux|lyria)\b/i
const PRICE_WORDS = /(\$\s?\d|\bUS\$|\bcredits?\b|\bcr\b|✦|\bunlimited\b|\bfree\b|\bper month\b|\/mo\b|\bhurry\b|\bcountdown\b|\bends in\b|\blast chance\b|\bmade with\b)/i
let passed = 0
const ok = (cond, msg) => { assert(cond, msg); passed++ }
const link = { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { ...rest, href }, children) }
const analytics = { trackClosedEvent: async () => 'stored', trackEvent: async () => true }
const stubs = { 'next/link': link, '@/lib/analytics': analytics }
const baseSrc = p => execFileSync('git', ['show', `${BASE}:${p}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })

const forcedSwitch = (o, value) => loader(stubs, { ...o, 'lib/create/release.ts': read('lib/create/release.ts').replace(/CREATE_SHELL_RELEASE: InternalRelease = '[a-z]+'/, `CREATE_SHELL_RELEASE: InternalRelease = '${value}'`) })

// ─── A. Interruptor × visitante / conta de fora / casa ───────────────────────────────────────────────────────────────
function switchChecks(o = {}) {
  const m = loader(stubs, o)
  const access = m('lib/create/access'), release = m('lib/create/release')
  // KINEO-TELA-NOVA-ABRE-1011 [fundador 10/11: "Quero todas as telas com o design que fizemos no codex"] — o padrão agora é 'public'.
  ok(release.CREATE_SHELL_RELEASE === 'public', 'o interruptor está public (aberto em 10/11)')
  for (const tab of ['film', 'cartoon', 'ads']) {
    // Padrão (sem forçar nada): conta logada vê; visitante vai ao cadastro com retorno para a aba.
    ok(access.createShellDecision(tab, { email: CUSTOMER }).kind === 'show' && access.createShellDecision(tab, { email: HOUSE }).kind === 'show', `padrão: conta logada vê ${tab}`)
    const v = access.createShellDecision(tab, null)
    ok(v.kind === 'signup' && v.href === `/signup?redirect=%2Fcreate%2F${tab}`, `padrão: visitante vai ao cadastro e volta para ${tab}`)
    // O caminho de volta, FORÇANDO o valor no arquivo (não só pelo parâmetro).
    const internal = forcedSwitch(o, 'internal')('lib/create/access'), off = forcedSwitch(o, 'off')('lib/create/access')
    ok(internal.createShellDecision(tab, null).kind === 'not_found' && internal.createShellDecision(tab, { email: CUSTOMER }).kind === 'not_found' && internal.createShellDecision(tab, { email: HOUSE }).kind === 'show', `volta 'internal': ${tab} só para a casa`)
    ok([null, { email: CUSTOMER }, { email: HOUSE }].every(u => off.createShellDecision(tab, u).kind === 'not_found'), `volta 'off': ${tab} = 404 para todos`)
  }
  for (const tab of ['film', 'cartoon', 'ads']) {
    for (const r of RELEASES) {
      const visitor = access.createShellDecision(tab, null, r), outsider = access.createShellDecision(tab, { email: CUSTOMER }, r), house = access.createShellDecision(tab, { email: HOUSE }, r)
      if (r === 'off') { ok([visitor, outsider, house].every(d => d.kind === 'not_found'), `off: ${tab} = 404 para todos`) }
      if (r === 'internal') {
        ok(visitor.kind === 'not_found' && outsider.kind === 'not_found', `internal: ${tab} = 404 para visitante e conta de fora`)
        ok(house.kind === 'show', `internal: a casa vê ${tab}`)
      }
      if (r === 'public') {
        ok(visitor.kind === 'signup' && visitor.href === `/signup?redirect=%2Fcreate%2F${tab}`, `public: visitante vai ao cadastro e volta para ${tab}`)
        ok(outsider.kind === 'show' && house.kind === 'show', `public: conta logada vê ${tab}`)
        const recreateAccess = m('lib/recreate/access')
        ok(outsider.showRecreate === recreateAccess.recreateVisible(CUSTOMER) && house.showRecreate === true, 'public: a aba Recreate segue o interruptor do Recreate (nunca leva a 404)')
        const internalRecreate = loader(stubs, { ...o, 'lib/recreate/release.ts': read('lib/recreate/release.ts').replace(/RECREATE_RELEASE: InternalRelease = '[a-z]+'/, "RECREATE_RELEASE: InternalRelease = 'internal'") })('lib/create/access')
        ok(internalRecreate.createShellDecision(tab, { email: CUSTOMER }, 'public').showRecreate === false, 'public + Recreate internal: conta de fora não recebe a aba Recreate')
      }
    }
  }
  ok(['recreate', 'x', 'studio', ''].every(t => access.createShellDecision(t, { email: HOUSE }).kind === 'not_found' && access.createShellDecision(t, null).kind === 'not_found'), 'aba desconhecida = 404 (padrão)')
  ok(access.createShellVisible(CUSTOMER) === true && access.createShellVisible(HOUSE) === true && access.createShellVisible(null) === false, 'createShellVisible padrão: toda conta logada, nunca visitante')
  const internal = forcedSwitch(o, 'internal')('lib/create/access'), off = forcedSwitch(o, 'off')('lib/create/access')
  ok(internal.createShellVisible(CUSTOMER) === false && internal.createShellVisible('test-hacker@example.org') === false && internal.createShellVisible(HOUSE) === true, "volta 'internal': só a casa (padrão de métrica não é allowlist)")
  ok(off.createShellVisible(HOUSE) === false && off.createShellVisible(CUSTOMER) === false, "volta 'off': ninguém")
}

// ─── B. Cada Continue: rota que existe + só parâmetro que o destino lê ──────────────────────────────────────────────────
function destinationChecks(o = {}) {
  const m = loader(stubs, o)
  const tabs = m('lib/create/tabs'), shell = m('components/create/CreateShell')
  const caixa = m('lib/growth/studioSimples'), ideia = m('lib/growth/ideiaDaPagina'), rascunho = m('lib/ads/rascunhoDoVisitante'), kids = m('lib/kidsCartoon/kidsCartoon')
  const studioPage = read('app/(dashboard)/studio/page.tsx')
  // Film
  const idea = 'The ghost ship   Mary Celeste'
  const film = new URL(tabs.filmContinueHref(idea, true), 'https://x')
  ok(film.pathname === '/studio' && existsSync(join(ROOT, 'app/(dashboard)/studio/page.tsx')), 'Film → /studio (rota existe)')
  const params = Object.fromEntries(film.searchParams)
  ok(caixa.usarCaixaUnica(params) === true, 'Film: só parâmetros de quem "só chegou" (a caixa única abre)')
  ok(studioPage.includes('usarCaixaUnica(searchParams)') && studioPage.includes('ideiaInicial={ideiaDoLink(searchParams.ideia)}') && studioPage.includes('campanha={campanhaDaCaixa(searchParams.intent_campaign)}'), 'Film: o /studio lê ideia e intent_campaign (lido no arquivo do destino)')
  ok(ideia.ideiaDoLink(params.ideia) === 'The ghost ship Mary Celeste', 'Film: a ideia chega na caixa')
  ok(caixa.campanhaDaCaixa(params.intent_campaign) === 'create_film', 'Film: a campanha é aceita pelo destino')
  ok(ideia.ideiaDoLink('a'.repeat(tabs.FILM_IDEA_MAX_CHARS)) !== '' && ideia.ideiaDoLink('a'.repeat(tabs.FILM_IDEA_MAX_CHARS + 1)) === '', 'Film: o limite da caixa = o limite real do destino (2.000)')
  ok(tabs.filmContinueHref('x', false) === '/signup?redirect=' + encodeURIComponent('/studio?intent_campaign=create_film&ideia=x'), 'Film: sem login passa por viaSignup')
  // Cartoon
  ok(tabs.cartoonContinueHref(true) === '/kids-cartoon' && existsSync(join(ROOT, 'app/(dashboard)/kids-cartoon/page.tsx')), 'Cartoon → /kids-cartoon (rota existe, sem parâmetro que ela não lê)')
  const template = read('components/kidsCartoon/KidsCartoonTemplate.tsx')
  ok(!/useSearchParams|searchParams/.test(template) && template.includes('const r = lerRascunhoDoDesenho()') && template.includes("if (typeof r.idea === 'string') setIdea(r.idea)"), 'Cartoon: o template não lê URL; relê o rascunho (lido no arquivo do destino)')
  const store = new Map()
  globalThis.sessionStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }
  rascunho.guardarRascunhoDoDesenho(tabs.cartoonDraft('  A little dragon  '))
  const back = rascunho.lerRascunhoDoDesenho()
  ok(back && back.idea === 'A little dragon', 'Cartoon: a ideia volta no template')
  ok(!kids.KIDS_CHARACTERS.some(c => c.id === back.character) && !kids.isKidsCartoonLanguage(back.language) && !kids.KIDS_CARTOON_DURATIONS.includes(back.duration), 'Cartoon: personagem, língua e duração vazios — o template mantém os padrões dele')
  ok(tabs.CARTOON_IDEA_MAX_CHARS === kids.KIDS_IDEA_MAX_CHARS && kids.KIDS_IDEA_MAX_CHARS === 300 && template.includes('maxLength={KIDS_IDEA_MAX_CHARS}'), 'Cartoon: limite = o do template (300)')
  delete globalThis.sessionStorage
  // Ads
  const ads = new URL(tabs.adsContinueHref(true), 'https://x')
  const adsPage = read('app/(dashboard)/ads/new/page.tsx')
  ok(ads.pathname === '/ads/new' && existsSync(join(ROOT, 'app/(dashboard)/ads/new/page.tsx')), 'Ads → /ads/new (rota existe)')
  ok([...ads.searchParams.keys()].join() === 'utm_source' && adsPage.includes("for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'])") && /\^\[A-Za-z0-9\._~-\]\{1,100\}\$/.test(adsPage) && /^[A-Za-z0-9._~-]{1,100}$/.test(ads.searchParams.get('utm_source')), 'Ads: só utm_source, que o /ads/new lê e repassa')
  // KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"] — o menu "Product ads" passa pela entrada única
  // (createEntryHref('ads', '/ads/new')): o destino ANTIGO do menu continua sendo o mesmo /ads/new que o "Make your ad" entrega.
  ok(m('lib/clipesNos2Lugares').CRIAR_ANUNCIO_HREF === '/ads/new' && read('app/KineoLanding.tsx').includes("href={createEntryHref('ads', '/ads/new', isSignedIn)} data-nav-item=\"business\" className=\"nav-primary\"") && m('lib/create/entry').LEGACY_ENTRY_PATH.ads === m('lib/clipesNos2Lugares').CRIAR_ANUNCIO_HREF, 'Ads: o mesmo destino do menu "Product ads"')
  // O botão renderizado aponta para o builder
  for (const tab of ['film', 'cartoon', 'ads']) ok(shell.continueHref(tab, idea, true) === (tab === 'film' ? tabs.filmContinueHref(idea, true) : tab === 'cartoon' ? '/kids-cartoon' : '/ads/new?utm_source=create_ads'), `continueHref(${tab})`)
}

// ─── C. Render das 3 abas: abas, passos, nada de motor/preço, botão desabilitado com motivo ─────────────────────────────
function renderShell(m, tab, props = {}) { return renderToStaticMarkup(React.createElement(m('components/create/CreateShell').default, { tab, ...props })) }
const visibleText = html => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
function shellChecks(o = {}) {
  const m = loader(stubs, o)
  const tabs = m('lib/create/tabs')
  for (const tab of ['film', 'cartoon', 'ads']) {
    const html = renderShell(m, tab)
    const workspace = html.slice(html.indexOf('</header>') + '</header>'.length)
    const text = visibleText(workspace) + ' ' + [...workspace.matchAll(/(?:aria-label|placeholder|title)="([^"]*)"/g)].map(x => x[1]).join(' ')
    ok(!ENGINE_NAMES.test(text), `${tab}: nenhum nome de motor (${(text.match(ENGINE_NAMES) || [])[0]})`)
    ok(!PRICE_WORDS.test(text), `${tab}: nenhum preço, crédito, ilimitado, urgência ou "made with" (${(text.match(PRICE_WORDS) || [])[0]})`)
    const tabLinks = [...html.matchAll(/data-create-tab="([a-z]+)"/g)].map(x => x[1])
    ok(tabLinks.join() === 'film,cartoon,ads,recreate', `${tab}: abas Film · Cartoon · Ads · Recreate`)
    ok(html.includes(`aria-current="page" data-create-tab="${tab}"`) && (html.match(/aria-current="page"/g) || []).length === 1, `${tab}: só a aba ativa marcada`)
    ok((html.match(/class="rc-step /g) || []).length === 3 && html.includes('rc-step-number'), `${tab}: três passos numerados com o CSS do Recreate`)
    ok(html.includes('class="rc-player"') && html.includes('class="rc-grid"'), `${tab}: player próprio + grade`)
    const n = tabs.CREATE_EXAMPLES[tab].length
    // Catálogo completo mesmo com menos capas visíveis por vez.
    ok((html.match(/data-create-example=/g) || []).length === n && tabs.CREATE_EXAMPLES_MIN === 8 && n >= tabs.CREATE_EXAMPLES_MIN, `${tab}: ${n} exemplos na fileira (mínimo ${tabs.CREATE_EXAMPLES_MIN})`)
    const button = html.match(/<button type="button" class="rc-generate"[^>]*>/)[0]
    if (tab === 'ads') ok(!button.includes('disabled') && html.includes('data-create-continue="/ads/new?utm_source=create_ads"'), 'ads: "Make your ad" leva a /ads/new')
    else {
      ok(button.includes('disabled=""'), `${tab}: Continue desabilitado com a ideia vazia`)
      ok(/id="ct-continue-reason" role="status">Write your (story )?idea to continue\./.test(html), `${tab}: o motivo numa linha`)
      ok(html.includes(`maxLength="${tab === 'film' ? 2000 : 300}"`), `${tab}: limite real no textarea`)
    }
  }
  const film = renderShell(m, 'film')
  ok(film.includes('<h1>Create a film</h1>'), 'Film: título da tela parada')
  ok(!renderShell(m, 'film', { showRecreate: false }).includes('data-create-tab="recreate"'), 'sem acesso ao Recreate, a aba Recreate some')
  ok(!/autoFocus|autofocus/.test(film) && !/fetch\(/.test(read('components/create/CreateShell.tsx')), 'nada começa sozinho: sem fetch, sem autofoco')
  ok(tabs.continueBlocker('film', 'https://x.com/a') !== null && tabs.continueBlocker('film', 'idea') === null && tabs.continueBlocker('cartoon', '  ') !== null && tabs.continueBlocker('ads', '') === null, 'motivos do botão')
}

// ─── D. Exemplos existem em disco; os 6 anúncios são exatamente os 'Ad example' ─────────────────────────────────────────
function exampleChecks(o = {}) {
  const m = loader(stubs, o)
  const tabs = m('lib/create/tabs'), clipes = m('lib/clipesNos2Lugares')
  for (const [tab, list] of Object.entries(tabs.CREATE_EXAMPLES)) for (const e of list) {
    ok(existsSync(join(ROOT, 'public', e.video)) && existsSync(join(ROOT, 'public', e.poster)), `${tab}/${e.id}: vídeo e pôster em disco`)
    ok(e.video.endsWith('.mp4') && /\.(webp|jpg)$/.test(e.poster), `${tab}/${e.id}: formatos`)
  }
  // KINEO-TELA-NOVA-ACABAMENTO-1011 — os 6 'Ad example' primeiro, depois os 3 anúncios de produto do card da home (arquivos que já estão no ar).
  const adEx = clipes.CLIPES_NOVOS.filter(c => c.selo === 'Ad example').map(c => c.id)
  ok(adEx.length === 6 && tabs.CREATE_EXAMPLES.ads.slice(0, 6).map(e => e.id).join() === adEx.join(), 'Ads: os 6 Ad example primeiro')
  const homeCards = read('lib/ui/homeThreeCards.ts')
  ok(tabs.CREATE_EXAMPLES.ads.slice(6).every(e => /^\/previews\/home-card-novo-[a-z_]+\.mp4$/.test(e.video) && homeCards.includes(`preview('${e.video.slice('/previews/'.length, -4)}'`)), 'Ads: o resto são clipes que giram nos cards da home')
  for (const [tab, list] of Object.entries(tabs.CREATE_EXAMPLES)) {
    ok(new Set(list.map(e => e.id)).size === list.length && new Set(list.map(e => e.video)).size === list.length, `${tab}: nenhum exemplo repetido`)
    if (tab !== 'ads') ok(list.every(e => e.idea === e.title), `${tab}: a ideia do clique é o título do vídeo`)
    // Só arquivos do catálogo da casa (nada novo): vitrine/galeria, seleção de 24/09, cards da home, card de Cartoon (Leo).
    ok(list.every(e => /^\/previews\/(galeria\/|examples-hd-sep24\/|home-card-novo-|home-card-kids-cartoon-leo\.mp4$)/.test(e.video)), `${tab}: só arquivos do catálogo da casa`)
  }
  const fora = clipes.FORA_DE_ESTACAO.clipes.concat(['pumpkin', 'werewolf'])
  ok(Object.values(tabs.CREATE_EXAMPLES).flat().every(e => !fora.some(f => e.video.includes(f))), 'nenhum exemplo fora de estação (Halloween)')
  const sel = read('lib/ui/examplesSelectionSep24.ts')
  ok(tabs.CREATE_EXAMPLES.film.filter(e => e.video.startsWith('/previews/examples-hd-sep24/')).every(e => sel.includes(`asset: '${e.id}'`) || sel.includes(`'${e.id}'`) || sel.includes(`${e.id}.mp4`)) && tabs.CREATE_EXAMPLES.film.filter(e => e.video.startsWith('/previews/examples-hd-sep24/')).every(e => sel.includes(e.title) || read('lib/publicExamples.ts').includes(`title: '${e.title}'`)),'Film: títulos e arquivos da seleção da casa')
  ok(tabs.CREATE_EXAMPLES.ads.every(e => e.idea === null), 'Ads: exemplo não preenche nada (só troca o vídeo)')
  ok(['filme-mary-celeste', 'filme-anticitera', 'filme-porta-do-inferno'].every(id => tabs.CREATE_EXAMPLES.film.some(e => e.id === id)), 'Film: os 3 Narrated film')
  ok(['dragaozinho', 'boneco-de-neve'].every(id => tabs.CREATE_EXAMPLES.cartoon.some(e => e.id === id)), 'Cartoon: dragão e boneco de neve')
}

// ─── E. Recreate: controles e catálogo históricos; a barra segue o acesso ao /create ──────────────────────────────
function renderRecreate(o, props) {
  let state = 0
  const react = { ...React, useEffect: () => {}, useRef: value => ({ current: value }), useState: init => { state++; return [typeof init === 'function' ? init() : init, () => {}] } }
  const m = loader({ react, 'next/link': link }, o)
  return renderToStaticMarkup(React.createElement(m('app/recreate/RecreateClient').default, props))
}
function recreateChecks(o = {}) {
  // KINEO-RECREATE-ELEVADOR-1011 [fundador 10/11: "não quero esse termo de agree" · "só precisa ter a opção de um homem"] — a referência é o
  // RecreateClient de BASE com EXATAMENTE a camada do Elevator/consentimento aplicada (scripts/test-support/camada-recreate-elevador-1011.json:
  // texto de BASE -> texto de hoje; trecho que não casa = erro). O contrato (campos, cobrança, ações) continua comparado; outra diferença = vermelho.
  const camadaElevador = src => JSON.parse(read('scripts/test-support/camada-recreate-elevador-1011.json')).reduce((s, [a, b]) => { if (!s.includes(a)) throw new Error('camada ELEVADOR: trecho de BASE ausente: ' + a.slice(0, 60)); return s.replace(a, () => b) }, src.split(String.fromCharCode(13)).join(''))
  const before = { 'app/recreate/RecreateClient.tsx': camadaElevador(baseSrc('app/recreate/RecreateClient.tsx')) }
  for (const props of [{ initialId: 'elevador' }, { initialId: 'effect-kiss' }, {}, { initialId: 'elevador', formatIds: ['elevador', 'effect-kiss'] }]) {
    const old = renderRecreate(before, props), now = renderRecreate(o, props), explicit = renderRecreate(o, { ...props, createTabs: false })
    ok(now === explicit, 'omitir createTabs equivale a false')
    assert.deepEqual(studioRenderContract(now), studioRenderContract(old), `Recreate ${JSON.stringify(props)}: mesmos formatos, arquivos, campos, consentimento, cobrança e ações do ${BASE}`)
    const tabbed = renderRecreate(o, { ...props, createTabs: true })
    ok((tabbed.match(/data-create-tab=/g) || []).length === 4 && tabbed.includes('aria-current="page" data-create-tab="recreate"'), `Recreate ${JSON.stringify(props)}: com acesso, as 4 abas e Recreate ativa`)
  }
  ok(read('app/recreate/recreate.css') === baseSrc('app/recreate/recreate.css').replace(/\r\n/g, '\n') || read('app/recreate/recreate.css').replace(/\r\n/g, '\n') === baseSrc('app/recreate/recreate.css').replace(/\r\n/g, '\n'), 'recreate.css intocado')
  // O novo layout do player é conferido em acabamentoChecks, inclusive com mutantes.
  // Com 'public' todo logado recebe as abas; a tela SEM abas (mesmas ações, provadas acima com createTabs=false) é o que a conta
  // de fora vê com o interruptor forçado em 'internal', e o que TODOS veem em 'off'.
  for (const [value, emails] of [['internal', [CUSTOMER, 'test-hacker@example.org']], ['off', [CUSTOMER, HOUSE]]]) {
    const forced = forcedSwitch(o, value)('lib/create/access')
    for (const email of emails) {
      ok(forced.createShellVisible(email) === false, `'${value}' forçado: ${email} sem abas no Recreate`)
      assert.deepEqual(studioRenderContract(renderRecreate(o, { initialId: 'elevador', createTabs: forced.createShellVisible(email) })), studioRenderContract(renderRecreate(before, { initialId: 'elevador' })), `'${value}': ações e catálogo de ${BASE}, sem expor abas`)
    }
  }
  ok(renderRecreate(o, { initialId: 'elevador', createTabs: loader(stubs, o)('lib/create/access').createShellVisible(CUSTOMER) }).includes('data-create-tab="film"'), "padrão 'public': a conta de fora passa a ver as abas no Recreate")
  for (const p of ['app/recreate/page.tsx', 'app/recreate/[id]/page.tsx']) ok(read(p).includes('createTabs={createShellVisible(user.email)}'), `${p}: abas só para quem vê o /create`)
  const page = read('app/create/[tab]/page.tsx')
  ok(page.includes('robots: { index: false, follow: false }') && page.includes('createShellDecision(params.tab, user, undefined, query)') /* KINEO-ENTRADAS-TELA-NOVA-1011: + a query de chegada */ && page.includes('notFound()') && page.includes('redirect(decision.href)'), '/create/[tab]: noindex + porta')
  ok(!/\/create\//.test(read('app/sitemap.ts')), 'fora do sitemap')
  const legacy = read('app/(dashboard)/create/page.tsx')
  ok(legacy.includes("if (createShellVisible(user?.email)) redirect('/create/film')") && legacy.includes('<CreateClient />'), '/create: quem vê a tela nova vai a /create/film; os demais seguem na tela antiga')
  // KINEO-TELA-NOVA-ABRE-1011 — com 'public', TODA conta logada que abrir /create vai a /create/film.
  // KINEO-CREATE-VISITANTE-1111 — o visitante não segue mais na tela antiga: vai ao cadastro (scripts/test-create-visitante-1111.mjs).
  ok(loader(stubs, o)('lib/create/access').createShellVisible(CUSTOMER) === true && loader(stubs, o)('lib/create/access').createShellVisible(null) === false, "/create em 'public': conta logada → /create/film; visitante → cadastro (createShellDecision)")
  // Ninguém linka a tela antiga: nenhum href/push/redirect para "/create" puro em app/, components/ e lib/ (só o título da aba e o robots).
  const hits = execFileSync('git', ['grep', '-nE', `["'\`]/create(["'\`?#])`, '--', 'app', 'components', 'lib'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(l => !/^[^:]+:\d+:\s*\/\//.test(l)).filter(l => !/^app\/robots\.ts:|^lib\/ui\/workspaceFocus\.ts:|^app\/\(dashboard\)\/DashboardShell\.tsx:.*'Create Video'/.test(l))
  ok(hits.length === 0, `nenhum link para a tela antiga /create (${hits.join(' | ')})`)
}

// ─── F. Medição: nomes livres no /api/events, metadados fechados, sem o texto ───────────────────────────────────────────
function eventChecks() {
  const route = read('app/api/events/route.ts'), src = read('components/create/CreateShell.tsx')
  const serverOnly = route.slice(route.indexOf('const SERVER_ONLY_EVENTS'), route.indexOf('])', route.indexOf('const SERVER_ONLY_EVENTS')))
  for (const n of ['create_tab_viewed', 'create_example_clicked', 'create_continue_clicked']) ok(!serverOnly.includes(`'${n}'`), `${n}: aceito pelo /api/events (não é SERVER_ONLY)`)
  const calls = [...src.matchAll(/trackClosedEvent\((CREATE_EVENTS\.[a-zA-Z]+, \{[^}]*\})\)/g)].map(x => x[1])
  ok(calls.length === 3, 'três chamadas de evento')
  ok(calls.some(c => c.includes('CREATE_EVENTS.tabViewed, { tab }')) && calls.some(c => c.includes('CREATE_EVENTS.exampleClicked, { tab, example: e.id }')) && calls.some(c => c.includes('CREATE_EVENTS.continueClicked, { tab, has_text: idea.trim().length > 0 }')), 'metadados fechados: tab / example / has_text (nunca o texto)')
}

// ─── G. Celular: uma coluna (exemplo → passos → grade), abas roláveis ───────────────────────────────────────────────────
function mobileChecks() {
  const css = read('app/recreate/recreate.css'), mine = read('components/create/create.css')
  ok(/@media\(max-width:640px\)\{[^\n]*\.rc-workspace\{display:flex;flex-direction:column;height:auto\}\.rc-reference\{order:0;[^\n]*\.rc-panel\{order:1;[^\n]*\.rc-gallery\{order:2;/.test(css), 'celular: exemplo, passos, grade (CSS do Recreate)')
  ok(/\.ct-tabs\{[^}]*overflow-x:auto/.test(mine) && /\.ct-tab\{[^}]*white-space:nowrap/.test(mine), 'abas roláveis na horizontal')
  ok(!/(?<![-a-z])(min-)?width:\s*\d{3,}px/.test(mine), 'nenhuma largura fixa grande no CSS novo')
  ok(!/\.rc-[a-z-]+\{/.test(mine.replace(/\.create-shell \.rc-[a-z-]+|\.rc-library-only \.ct-tabs/g, '')), 'o CSS novo não redefine classe rc-* fora da tela nova (nem fora dos 3 acabamentos)')
}

// ─── H. Apresentação aprovada do Palco e da galeria, com todas as mídias do catálogo original ───
function acabamentoChecks(o = {}) {
  const m = loader(stubs, o)
  const key = 'app/recreate/studio-media.css'
  const styles = postcss.parse(o[key] ?? read(key))
  const props = (selector, prop) => {
    const values = []
    styles.walkRules(selector, r => r.walkDecls(prop, declaration => values.push(declaration.value)))
    return values
  }
  const player = '.recreate .rc-player[data-presentation="stage"]'
  const row = '.recreate .rc-workspace:not(.rc-library-only) .rc-grid'
  ok(props('.recreate .rc-stage', 'background').includes('transparent') && props(player, 'background').every(v => v.includes('var(--rc-card)')), 'palco segue a superfície do tema')
  ok(props(player + ' > video', 'object-fit').includes('contain') && ['width', 'height'].every(k => props(player + ' > video', k).includes('auto')), 'preserva o quadro nativo sem esticar ou recortar')
  ok(props(row, 'grid-auto-flow').includes('column') && props(row, 'overflow-x').includes('auto') && props(row, 'grid-auto-columns').some(v => v.includes('var(--rc-cols, 2)')), 'fileira rola com duas colunas no celular')
  ok(props(row, '--rc-cols').join() === '3,4', 'galeria chega a quatro capas amplas')
  const controls = '.recreate .rc-player[data-presentation] .rc-player-controls'
  ok(props(controls, 'position').includes('static') && props('.recreate .rc-card .rc-card-bottom', 'position').includes('static'), 'controles e títulos ficam fora do vídeo')
  ok(props(controls + ' svg', 'width').some(v => /^1[4-8]px$/.test(v)) && ['min-width', 'min-height'].every(k => props(controls + ' button', k).some(v => v === '44px')), 'ícone pequeno com área de toque de 44px')
  const media = ['film', 'cartoon', 'ads'].map(tab => renderShell(m, tab))
  media.push(renderRecreate(o, { initialId: 'elevador', createTabs: true }))
  for (const html of media) {
    const root = parse(html), stage = root.querySelector('.rc-stage'), cards = root.querySelectorAll('.rc-card')
    ok(stage.querySelectorAll('video').length === 1 && stage.querySelector('.rc-media-info h2')?.text.trim(), 'um vídeo principal com título externo')
    ok(!stage.querySelector('.rc-preview-tag, .rc-duration, video[controls]') && stage.querySelector('.rc-media-info .rc-player-controls button[aria-label]'), 'sem selo sobreposto ou controles nativos do navegador')
    ok(cards.length > 0 && cards.every(card => card.querySelector('.rc-card-bottom h3')?.text.trim() && card.querySelector('button.rc-example-cover[aria-label] video[preload="none"]') && !card.querySelector('video[autoplay]')), 'capas acionáveis sem autoplay, títulos após a mídia')
  }
}

// Mount the real components with every gallery video visible. Then click a real cover and confirm
// the selected preview changes without generating a film or charging the account.
function galleryInteraction(o = {}) {
  const { aba } = require('../docs/studio-na-moldura-1011/runtime.cjs')
  for (const tab of ['film', 'cartoon', 'ads', 'recreate']) {
    const t = aba(o)
    let automaticPlays = 0
    const visibleVideo = { play: async () => { automaticPlays++ }, pause() {} }
    globalThis.document.querySelectorAll = selector => selector === '.rc-grid video' ? [visibleVideo] : []
    globalThis.window.history = { replaceState() {} }
    globalThis.IntersectionObserver = class {
      constructor(callback) { this.callback = callback }
      observe(target) { this.callback([{ target, isIntersecting: true }]) }
      disconnect() {}
    }
    const recreate = tab === 'recreate'
    const component = t.m(recreate ? 'app/recreate/RecreateClient' : 'components/create/CreateShell').default
    t.mount(React.createElement(component, recreate ? { initialId: 'elevador', createTabs: true } : { tab }))
    ok(automaticPlays === 0, `${tab}: abrir a página não dá play nas capas visíveis`)
    const srcBefore = parse(t.html()).querySelector('.rc-stage video').getAttribute('src')
    const card = t.all(p => p.className === 'rc-example-cover').find(cover => cover.props.children.props.src !== srcBefore)
    ok(!!card, `${tab}: outro exemplo disponível`)
    t.click(p => p === card.props, 'capa clicável')
    const after = parse(t.html()), selected = after.querySelector('.rc-stage video')
    ok(selected.getAttribute('src') === card.props.children.props.src && !t.log.pushes.length, `${tab}: a capa escolhe o vídeo certo sem redirecionar`)
    if (tab === 'film' || tab === 'cartoon') ok(after.querySelector('#ct-idea').text === after.querySelector('.rc-media-info h2').text, `${tab}: capa preenche a ideia do exemplo`)
    if (tab === 'ads') ok(!after.querySelector('#ct-idea'), 'Ads: selecionar só visualiza a prévia')
    ok(t.log.fetches.every(([, method]) => method === 'GET'), `${tab}: seleção sem POST ou render`)
  }
}

function all(o = {}) { switchChecks(o); destinationChecks(o); shellChecks(o); exampleChecks(o); recreateChecks(o); eventChecks(); mobileChecks(); acabamentoChecks(o) }
all()
galleryInteraction()
const real = passed

// ─── Mutantes: cada um TEM de derrubar o guardião ───────────────────────────────────────────────────────────────────────
const src = p => read(p)
const mutants = [
  ['interruptor fechado de volta em internal', { 'lib/create/release.ts': src('lib/create/release.ts').replace("CREATE_SHELL_RELEASE: InternalRelease = 'public'", "CREATE_SHELL_RELEASE: InternalRelease = 'internal'") }],
  ['interruptor desligado', { 'lib/create/release.ts': src('lib/create/release.ts').replace("CREATE_SHELL_RELEASE: InternalRelease = 'public'", "CREATE_SHELL_RELEASE: InternalRelease = 'off'") }],
  ['visitante vê sem login no public', { 'lib/create/access.ts': src('lib/create/access.ts').replace("if (!user) return release === 'public' ?", "if (!user) return { kind: 'show', showRecreate: false }; if (false) return release === 'public' ?") }],
  ['conta de fora vê no internal', { 'lib/create/access.ts': src('lib/create/access.ts').replace('return !!email && releaseVisible(email, release)', "return !!email && (release !== 'off')") }],
  ['Film manda ?prompt= (o Studio simples não lê)', { 'lib/create/tabs.ts': src('lib/create/tabs.ts').replace("q.set('ideia', ", "q.set('prompt', ") }],
  ['Film com limite maior que o destino', { 'lib/create/tabs.ts': src('lib/create/tabs.ts').replace('FILM_IDEA_MAX_CHARS = 2000', 'FILM_IDEA_MAX_CHARS = 4000') }],
  ['Cartoon com parâmetro inventado', { 'lib/create/tabs.ts': src('lib/create/tabs.ts').replace('return viaSignup(KIDS_CARTOON_TEMPLATE_PATH, signedIn)', "return viaSignup(KIDS_CARTOON_TEMPLATE_PATH + '?idea=x', signedIn)") }],
  ['nome de motor na copy', { 'lib/create/tabs.ts': src('lib/create/tabs.ts').replace("title: 'Create a film'", "title: 'Create a film with Kling'") }],
  ['preço na copy', { 'lib/create/tabs.ts': src('lib/create/tabs.ts').replace("note: 'Nothing starts until you confirm on the next screen.'", "note: 'From 40 credits.'") }],
  ['exemplo inexistente', { 'lib/create/tabs.ts': src('lib/create/tabs.ts').replace("'/previews/examples-hd-sep24/plane-1942.mp4'", "'/previews/examples-hd-sep24/plane-1943.mp4'") }],
  ['Recreate sempre com abas', { 'app/recreate/RecreateClient.tsx': src('app/recreate/RecreateClient.tsx').replace("formatIds, createTabs = false }", 'formatIds, createTabs = true }') }],
  ['botão sempre habilitado', { 'components/create/CreateShell.tsx': src('components/create/CreateShell.tsx').replace('disabled={!ready}', 'disabled={false}') }],
  // KINEO-TELA-NOVA-ACABAMENTO-1011
  ['fileira com menos itens que o mínimo (Cartoon volta aos 3)', { 'lib/create/tabs.ts': src('lib/create/tabs.ts').replace(/\n\s*cardDaHome\('(baby_puppy|knight_kitten|fox|penguin|skatedog)'[^\n]*/g, '') }],
  ['fileira com menos itens que o mínimo (Film perde a seleção da casa)', { 'lib/create/tabs.ts': src('lib/create/tabs.ts').replace(/\n\s*filmeDaCasa\([^\n]*/g, '') }],
  ['mínimo rebaixado', { 'lib/create/tabs.ts': src('lib/create/tabs.ts').replace('CREATE_EXAMPLES_MIN = 8', 'CREATE_EXAMPLES_MIN = 3') }],
  ['exemplo repetido', { 'lib/create/tabs.ts': src('lib/create/tabs.ts').replace("filmeDaCasa('castle', 'The castle hiding inside a university building')", "filmeDaCasa('volcano-selected', 'The volcano watcher')") }],
  ['exemplo de Halloween de volta', { 'lib/create/tabs.ts': src('lib/create/tabs.ts').replace("cardDaHome('skatedog', 'The skateboarding puppy')", "cardDaHome('pumpkin', 'The pumpkin')") }],
  ['galeria volta a nove colunas', { 'app/recreate/studio-media.css': src('app/recreate/studio-media.css').replace('--rc-cols: 4;', '--rc-cols: 9;') }],
  ['superfície do palco volta ao preto fixo', { 'app/recreate/studio-media.css': src('app/recreate/studio-media.css').replace(/(\.recreate \.rc-stage \{[^}]*background:) transparent;/, '$1 black;') }],
  ['vídeo preenche cortando pessoas', { 'app/recreate/studio-media.css': src('app/recreate/studio-media.css').replace('object-fit: contain;', 'object-fit: cover;') }],
  ['controles novamente por cima do vídeo', { 'app/recreate/studio-media.css': src('app/recreate/studio-media.css').replace('position: static;', 'position: absolute;') }],
  ['toda a galeria toca ao abrir', { 'app/recreate/RecreatePlayer.tsx': src('app/recreate/RecreatePlayer.tsx').replace('preload="none"', 'preload="auto" autoPlay') }],
]
let bitten = 0
for (const [name, o] of mutants) {
  passed = 0
  let died = false
  try { all(o) } catch (e) { died = true; if (process.env.VERBOSE) console.log(`  ${name} → ${String(e.message).split('\n')[0]}`) }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
// These regressions only affect behavior after mounting the page.
for (const [name, o] of [
  ['capa sem ação', { 'app/recreate/RecreatePlayer.tsx': src('app/recreate/RecreatePlayer.tsx').replace('onClick={onSelect}', 'onClick={() => {}}') }],
  ['abertura toca todas as capas', { 'components/create/CreateShell.tsx': src('components/create/CreateShell.tsx').replace('function choose(e: CreateExample)', "useEffect(() => { for (const video of document.querySelectorAll('.rc-grid video')) void video.play() }, []); function choose(e: CreateExample)") }],
]) {
  assert.throws(() => galleryInteraction(o), { code: 'ERR_ASSERTION' }, name)
  bitten++
}
console.log(`test-tela-nova-1011: ${real} verificações verdes · ${bitten}/${mutants.length + 2} mutantes mortos`)
