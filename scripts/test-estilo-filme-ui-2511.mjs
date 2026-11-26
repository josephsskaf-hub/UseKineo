import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { renderPage } from './preview-ux-complete.mjs'

const require = createRequire(import.meta.url)
const { aba, React, read, loader } = require('../docs/studio-na-moldura-1011/runtime.cjs')
const SIMPLE = 'components/studio/StudioSimples.tsx'
const LINK = 'lib/growth/studioSimples.ts'
const ENTRY = 'app/(dashboard)/studio/create/page.tsx'
const STUDIO = 'app/(dashboard)/studio/page.tsx'
const ADVANCED = 'app/(dashboard)/studio/StudioClient.tsx'
const CREATE_FILM = 'app/create/[tab]/page.tsx'
const DISPATCH = 'app/(dashboard)/generate/GenerateClient.tsx'
const BASE = '9270f6e05'
const voiceFile = 'lib/cinematic/filmVoice2511.ts'
const voiceRollback = { [voiceFile]: read(voiceFile).replace("'off' | 'on' = 'on'", "'off' | 'on' = 'off'") }
const BASE_UI = Object.fromEntries([SIMPLE, LINK].map(file => [file, fromGit(file)]))
const load = createOfflineLoader()
const gate = load('@/lib/cinematic/filmLook2511Server')
const internal = load('@/lib/internalAccounts').INTERNAL_EXACT_EMAILS[0]
const external = 'test-external@example.invalid'
const mode = 'seedance'
const ordinary = 'A guard opens the old gate.'
const cartoon = 'A cartoon guard opens the old gate.'
const anime = 'Anime detective at a train station.'
const labels = ['Realistic', 'Cartoon', 'Anime']

function fromGit(file) {
  return execFileSync('git', ['show', BASE + ':' + file], { encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 })
}
function runJS(source, globals) {
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return vm.runInNewContext(js, globals, { timeout: 3000 })
}
function namedExpression(source, name, file) {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const matches = []
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(parsed) === name) matches.push(node.initializer)
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  assert.equal(matches.length, 1, 'uma declaração de ' + name)
  return matches[0].getText(parsed)
}
function runEntry(query, email, authError, source = read(ENTRY)) {
  const searchParams = Object.fromEntries([...query.keys()].map(key => {
    const all = query.getAll(key)
    return [key, all.length > 1 ? all : all[0]]
  }))
  return runJS(namedExpression(source, 'filmLook', ENTRY), { searchParams, user: email ? { email } : null, authError, ...gate })
}
function postExpression(source) {
  const parsed = ts.createSourceFile(DISPATCH, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const matches = []
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(parsed) === 'fetch' &&
      ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === '/api/generate-video-cinematic') matches.push(node)
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  assert.equal(matches.length, 1, 'o POST real da geração cinematográfica')
  return matches[0].getText(parsed)
}
function interceptPost(filmLook, source = read(DISPATCH)) {
  let call
  const payload = namedExpression(source, 'cinematicPayload', DISPATCH)
  runJS('const cinematicPayload = ' + payload + '\n' + postExpression(source), {
    filmLook, resumedStyle: () => undefined, voiceMode: 'narrator', voiceForFilm: () => 'narrator', voiceModeFields: load('@/lib/cinematic/filmVoice2511').voiceModeFields,
    cinematicGenerationId: 'synthetic-attempt', trimmed: ordinary, duration: 60, language: 'en', aspectRequested: '9:16',
    scriptMode: 'ai', analysis: null, aiEngine: mode, cineBrollScenes: undefined, cineUsable: false,
    ideiaDoRoteiroRef: { current: null }, estrelaRef: { current: null }, kidsCartoonId: null,
    dispatchTimeoutSignal: () => undefined, CINEMATIC_DISPATCH_TIMEOUT_MS: 10000,
    fetch: (path, request) => { call = { path, ...request } },
  })
  assert.equal(call.path, '/api/generate-video-cinematic')
  assert.equal(call.method, 'POST')
  return call.body
}
function mount(surface, showFilmStyle, overrides = {}, idea = '', entry = {}) {
  const tab = aba(overrides)
  const leaf = surface === 'simple' ? SIMPLE : 'components/create/StudioNaMoldura.tsx'
  const props = { filmes: [], campanha: 'studio_simple', motor: mode, ideiaInicial: idea, showFilmStyle, caixaNova: surface === 'box', ...entry }
  tab.mount(React.createElement(tab.m(leaf).default, props))
  return tab
}
const styleButton = (p, tag) => tag === 'button' && labels.includes(p.children)
function marked(tab) {
  const buttons = tab.all(styleButton)
  assert.deepEqual(buttons.map(b => b.props.children), labels, 'as três opções estão visíveis')
  const active = buttons.filter(button => button.props['aria-pressed'])
  assert.equal(active.length, 1, 'uma única opção está selecionada')
  return active[0].props.children
}
const textField = (p, tag) => tag === 'textarea' && (p['aria-label'] === 'Your idea' || p.id === 'sm-idea')
const generate = (p, tag) => tag === 'button' && /^studio-(simple|moldura)-generate$/.test(p['data-testid'] ?? '')
const type = (tab, text) => tab.type(textField, text, 'Your idea')
const submit = tab => {
  tab.click(generate, 'Generate')
  assert.equal(tab.log.pushes.length, 1, 'o clique navega uma vez')
  return new URL(tab.log.pushes[0], 'https://example.invalid')
}
const styleEvents = tab => tab.log.events.filter(([name]) => name === 'studio_film_style_submitted').map(([, props]) => JSON.parse(JSON.stringify(props)))

function manual(surface, overrides) {
  const tab = mount(surface, true, overrides)
  assert.equal(marked(tab), 'Realistic')
  type(tab, cartoon)
  assert.equal(marked(tab), 'Cartoon')
  type(tab, anime)
  assert.equal(marked(tab), 'Anime')
  tab.click((p, tag) => styleButton(p, tag) && p.children === 'Realistic', 'Realistic')
  type(tab, cartoon)
  assert.equal(marked(tab), 'Realistic', 'edição posterior não desfaz a escolha explícita')
  assert.deepEqual(styleEvents(tab), [], 'digitação e seleção sozinhas não contam envio')
  if (surface === 'simple') {
    tab.click(p => p['data-testid'] === 'studio-simple-settings', 'Settings')
    const more = tab.one(p => p['data-kineo'] === 'studio-simple-more', 'More options')
    assert.equal(new URL(more.props.href, 'https://example.invalid').searchParams.get('look'), 'photoreal')
  }
  const url = submit(tab)
  assert.equal(url.pathname, '/studio/create')
  assert.equal(url.searchParams.get('prompt'), cartoon)
  assert.equal(url.searchParams.get('look'), 'photoreal', 'URL preserva a seleção explícita')
  assert.deepEqual(styleEvents(tab), [{ initial_look: 'anime', chosen_look: 'photoreal', changed: true }], 'evento registra o primeiro padrão visto na seleção')
  return url.searchParams
}
for (const surface of ['simple', 'steps', 'box']) {
  const params = manual(surface)
  assert.equal(JSON.parse(interceptPost(runEntry(params, internal))).look, 'photoreal', 'POST real contém a escolha da caixa')
  const auto = mount(surface, true, {}, cartoon)
  assert.equal(marked(auto), 'Cartoon')
  assert.equal(submit(auto).searchParams.has('look'), false, 'a sugestão visível não autoriza look')
  assert.deepEqual(styleEvents(auto), [{ initial_look: 'animated3d', chosen_look: null, changed: false }])
  const off = mount(surface, false, voiceRollback, ordinary)
  const existing = mount(surface, false, { ...BASE_UI, ...voiceRollback }, ordinary)
  // Each harness shares the globals it installs. Compare markup before the click and keep the requests independent.
  assert.equal(off.html(), existing.html(), 'OFF preserva o HTML da base')
  assert.equal(submit(off).href, submit(existing).href, 'OFF preserva o pedido da base byte a byte')
  assert.deepEqual(styleEvents(off), [])
}

const UNCOVERED_STYLES = [
  'A film noir detective walks in the rain',
  'Black and white story of a lonely sailor',
  'A watercolor storybook fox finds a lantern',
  'An illustrated fairy tale about a brave mouse',
  'A bedtime story about the moon',
  'A painterly journey through Kyoto',
]
function untouched(surface, overrides = {}) {
  const tab = mount(surface, true, overrides)
  const base = load(LINK)
  for (const text of UNCOVERED_STYLES) {
    type(tab, text)
    if (surface === 'simple' && text === UNCOVERED_STYLES[0]) {
      tab.click(p => p['data-testid'] === 'studio-simple-settings', 'Settings')
      const more = tab.one(p => p['data-kineo'] === 'studio-simple-more', 'More options')
      assert.equal(new URL(more.props.href, 'https://example.invalid').searchParams.has('look'), false, 'More options não transforma sugestão em escolha')
    }
    tab.log.pushes.length = 0
    const url = submit(tab)
    assert.equal(url.searchParams.has('look'), false, 'sem toque, a URL não leva look')
    assert.equal(url.searchParams.get('voice_mode'), 'narrator', 'voz padrão explícita')
    url.searchParams.delete('voice_mode')
    assert.equal(url.pathname + url.search, base.pedidoDoStudioSimples({ motor: mode, texto: text, duracao: 60, formato: '9:16', lingua: 'auto', palavraPorPalavra: false, campanha: 'studio_simple' }))
    assert.equal(runEntry(url.searchParams, internal), undefined, 'sem toque, o POST continua sem estilo explícito')
  }
}
for (const surface of ['simple', 'steps', 'box']) untouched(surface)

const dispatched = JSON.parse(interceptPost(runEntry(new URLSearchParams('look=animated3d'), internal)))
assert.equal(dispatched.look, 'animated3d')
const none = JSON.stringify({ voice_mode: 'narrator', ...JSON.parse(interceptPost(undefined, fromGit(DISPATCH))) })
for (const [query, email, authError] of [
  ['', internal], ['look=anime', external], ['look=photoreal', null],
  ['look=animated3d', internal, new Error('auth unavailable')],
  ['look=anime&look=photoreal', internal], ['look=invalid', internal],
]) {
  assert.equal(interceptPost(runEntry(new URLSearchParams(query), email, authError)), none, 'ausente/fora da casa ou inválido: bytes da main')
}

const romance = 'An anime romance between two adults on their first date.'
const romanceNotice = p => p.role === 'status' && p.children === 'Romance films use Realistic.'
const pair = mount('box', true, {}, ordinary)
pair.click((p, tag) => styleButton(p, tag) && p.children === 'Anime', 'Anime')
assert.equal(marked(pair), 'Anime', 'um toque muda o estilo sem editar o texto')
assert.equal(pair.all(romanceNotice).length, 0)
type(pair, romance)
assert.equal(pair.all(romanceNotice).length, 1, 'o estilo efetivo em romance fica explícito')
assert.equal(marked(pair), 'Anime', 'a opção pedida continua armazenada durante o romance')
type(pair, ordinary)
assert.equal(pair.all(romanceNotice).length, 0)
assert.equal(marked(pair), 'Anime', 'sair do romance restaura a escolha sem outro clique')

const pinned = mount('simple', true, {}, ordinary)
pinned.click(p => p.children === 'Realistic' && p['aria-pressed'] === true, 'Realistic já marcado')
type(pinned, anime)
assert.equal(marked(pinned), 'Realistic', 'clicar na sugestão já marcada também fixa a escolha')
assert.equal(submit(pinned).searchParams.get('look'), 'photoreal')
assert.deepEqual(styleEvents(pinned), [{ initial_look: 'photoreal', chosen_look: 'photoreal', changed: false }])

function leafProps(element, name) {
  if (!React.isValidElement(element)) return undefined
  if (element.type.name === name) return element.props
  for (const child of React.Children.toArray(element.props.children)) {
    const match = leafProps(child, name)
    if (match) return match
  }
}
async function entryProps(file, email, searchParams, error = null, overrides = {}) {
  function Simple() { return null }
  function Advanced() { return null }
  function Frame() { return null }
  const noop = { __esModule: true, default: () => null }
  const modules = loader({
    'next/headers': { headers: () => new Headers() },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: email ? { id: 'synthetic', email } : null }, error }) } }) },
    '@/lib/auth/signedInFounder': { signedInFounder: async () => false },
    '@/lib/engineWall': { getHouseEngineExamples: () => [] },
    '@/lib/growth/filmesDaPorta0511': { filmesDaPorta0511: () => [] },
    '@/components/StudioIdeaArrival': noop,
    '@/components/studio/StudioSimples': { __esModule: true, default: Simple },
    '@/components/create/StudioNaMoldura': { __esModule: true, default: Frame },
    '@/app/(dashboard)/ads/v2/AdsV2Workspace': noop,
    '@/components/ads/PessoaFalandoPainel': noop,
    '@/components/create/ClipNaMoldura': noop,
    '@/components/create/CreateShell': noop,
    './StudioClient': { __esModule: true, default: Advanced },
    './AbaComChegada': noop,
    'next/navigation': { redirect: url => { throw new Error(url) }, notFound: () => { throw new Error('Not found') } },
  }, overrides)
  const tree = await modules(file).default({ params: { tab: 'film' }, searchParams })
  return leafProps(tree, file === CREATE_FILM ? 'Frame' : 'Simple') ?? leafProps(tree, 'Advanced')
}
for (const page of [STUDIO, CREATE_FILM]) {
  assert.equal((await entryProps(page, internal, {})).showFilmStyle, true, 'a página habilita só a conta autenticada e exata')
  assert.equal((await entryProps(page, external, {})).showFilmStyle, false)
  assert.equal((await entryProps(page, internal, {}, new Error('auth'))).showFilmStyle, false)
}
assert.equal((await entryProps(STUDIO, null, {})).showFilmStyle, false)
const offFlag = { 'lib/cinematic/filmLook2511.ts': read('lib/cinematic/filmLook2511.ts').replace("FILM_LOOK_2511: FilmLookMode = 'internal'", "FILM_LOOK_2511: FilmLookMode = 'off'") }
assert.equal((await entryProps(STUDIO, internal, {}, null, offFlag)).showFilmStyle, false)
assert.equal((await entryProps(STUDIO, external, { prompt: cartoon, look: 'anime' })).initialFilmLook, undefined)

function homeFilmHref(signedIn) {
  const html = renderPage('app/KineoLanding.tsx', false, { pathname: '/' }, { initialUser: signedIn ? { id: 'synthetic' } : null })
  const primary = html.match(/<a\b(?=[^>]*\bdata-nav-item="video")(?=[^>]*\bclass="nav-primary")[^>]*>/)?.[0]
  const href = primary?.match(/\bhref="([^"]+)"/)?.[1].replaceAll('&amp;', '&')
  assert.ok(href, 'o link Films da home existe no HTML')
  return new URL(href, 'https://example.invalid')
}
const homeHref = homeFilmHref(true)
assert.equal(homeHref.pathname, '/create/film')
assert.equal(homeFilmHref(false).pathname, '/studio', 'visitante conserva a mesma entrada')
const homeQuery = Object.fromEntries(homeHref.searchParams)
const homeBox = await entryProps(CREATE_FILM, internal, homeQuery)
assert.equal(homeBox.caixaNova, true, 'a home logada abre What do you want to make?')
const fromHome = mount('box', true, {}, '', homeBox)
assert.match(fromHome.html(), /What do you want to make\?/)
await fromHome.settle()
type(fromHome, ordinary)
fromHome.click((p, tag) => styleButton(p, tag) && p.children === 'Cartoon', 'Cartoon')
const homeSend = submit(fromHome).searchParams
assert.equal(homeSend.get('intent_campaign'), homeHref.searchParams.get('intent_campaign'))
assert.equal(JSON.parse(interceptPost(runEntry(homeSend, internal))).look, 'animated3d', 'a caixa aberta pela home manda ao POST o estilo escolhido')
for (const [email, override] of [[external, {}], [internal, offFlag]]) {
  const standard = await entryProps(CREATE_FILM, email, homeQuery, null, override)
  const unchanged = mount('box', false, override, ordinary, { ...standard, ideiaInicial: ordinary })
  await unchanged.settle()
  assert.equal(unchanged.all(styleButton).length, 0)
  assert.equal(submit(unchanged).searchParams.has('look'), false)
}

const original = new URLSearchParams({ prompt: cartoon, look: 'animated3d' })
const { previaPath, previaResumeStudioHref } = load('@/lib/scenePreview')
const { voltaParaCaixa } = load('@/lib/growth/ideiaDaPagina')
const parse = href => Object.fromEntries(new URL(href, 'https://example.invalid').searchParams)
const previewQuery = parse(previaPath({ prompt: cartoon, look: runEntry(original, internal) }))
assert.equal(previewQuery.look, 'animated3d', 'a prévia recebe o enum já autorizado')
const resume = parse(previaResumeStudioHref({ t: Date.now(), idea: cartoon, script: ordinary, language: 'en', look: previewQuery.look }))
assert.equal(resume.script_mode, 'verbatim')
const fromPreview = await entryProps(STUDIO, internal, resume)
assert.equal(fromPreview.initialFilmLook, 'animated3d', 'ao retomar após a prévia o Studio avançado recebe o estilo')
const advancedSource = read(ADVANCED)
const advancedQ = namedExpression(advancedSource, 'q', ADVANCED)
const carryLook = advancedSource.match(/    if \(filmLook\) \{[\s\S]*?\n    }/)?.[0]
assert.ok(carryLook, 'a montagem do Studio avançado inclui o estilo')
const advancedParams = runJS('const q = ' + advancedQ + '\n' + carryLook + '\nq', {
  URLSearchParams, engine: mode, finalPrompt: ordinary, duration: 15, scriptMode: 'verbatim', campaignRef: { current: 'scene_preview' },
  filmLook: fromPreview.initialFilmLook, initialFilmLook: fromPreview.initialFilmLook, filmLookChanged: false, trackEvent() {},
})
assert.equal(JSON.parse(interceptPost(runEntry(advancedParams, internal))).look, 'animated3d', 'a retomada chega ao POST com a seleção')
const fromEmptyPreview = await entryProps(STUDIO, internal, parse(voltaParaCaixa(cartoon, previewQuery.look)))
assert.equal(fromEmptyPreview.ideiaInicial, cartoon)
assert.equal(fromEmptyPreview.initialFilmLook, 'animated3d', 'sem prévia pronta, volta à caixa curta preservando a escolha')

function mutate(file, before, after) {
  const source = read(file)
  assert.equal(source.split(before).length, 2, 'âncora inequívoca do mutante ' + file)
  return source.replace(before, after)
}
assert.throws(() => manual('simple', { [SIMPLE]: mutate(SIMPLE, 'selectedLook ?? suggestedLook', 'suggestedLook') }), /edição posterior não desfaz/)
assert.throws(() => manual('box', { [LINK]: mutate(LINK, "if (p.look) q.set('look', p.look)", 'void p.look') }), /URL preserva/)
assert.throws(() => untouched('box', { [SIMPLE]: mutate(SIMPLE, '...(selectedLook ? { look: selectedLook } : {})', '...(look ? { look } : {})') }), /sem toque, a URL/)
const mutant = mutate(DISPATCH, '...(filmLook ? { look: filmLook } : {})', '...{}')
assert.throws(() => assert.equal(JSON.parse(interceptPost('anime', mutant)).look, 'anime', 'POST precisa do enum'), /POST precisa do enum/)
const anonymous = mutate(ENTRY, 'authError ? null : user?.email', "'" + internal + "'")
assert.throws(() => assert.equal(runEntry(new URLSearchParams('look=anime'), external, null, anonymous), undefined, 'conta externa não recebe enum'), /conta externa não recebe enum/)
console.log('Film style UI: home logada, três molduras, acesso SSR, retomada da prévia, escolha persistente, telemetria, POST interceptado, 18 casos sem toque, OFF byte a byte e cinco mutantes.')
