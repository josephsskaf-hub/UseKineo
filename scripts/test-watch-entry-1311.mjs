// Offline WATCH entry contract. Executes source helpers and actual receiving expressions; no app/API/server/env.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const args = process.argv.slice(2)
assert(args.length === 0 || args.length === 2 && args[0] === '--repo', 'Use --repo <repository>')
const ROOT = path.resolve(args[1] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))
const ts = require(require.resolve('typescript', { paths: [ROOT] }))
const rd = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n')
const HELPER = 'lib/home/watchEntry.ts'
const STARTERS = 'lib/home/watchStarters.ts'
const PREVIEW = 'lib/recreate/seuVideoPreviewRelease.ts'
const STUDIO = 'app/(dashboard)/studio/page.tsx'
const ADVANCED = 'app/(dashboard)/studio/StudioClient.tsx'
const CARTOON = 'app/(dashboard)/kids-cartoon/page.tsx'
const TEMPLATE = 'components/kidsCartoon/KidsCartoonTemplate.tsx'
const ADS = 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx'
let count = 0
function check(id, value, message) { assert(value, '[' + id + '] ' + message); count++ }

function world(overrides = {}) {
  const cache = new Map(), read = file => overrides[file] ?? rd(file)
  function load(file) {
    file = file.replace(/\\/g, '/')
    if (!/\.(?:ts|tsx|json)$/.test(file)) file += '.ts'
    if (cache.has(file)) return cache.get(file)
    if (file.endsWith('.json')) return JSON.parse(read(file))
    const exports = {}; cache.set(file, exports)
    const code = ts.transpileModule(read(file), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    vm.runInNewContext(code, { exports, require(name) {
      if (name.startsWith('@/')) return load(name.slice(2))
      if (name.startsWith('.')) return load(path.posix.normalize(path.posix.join(path.posix.dirname(file), name)))
      throw new Error('External dependency forbidden: ' + name)
    }, URL, URLSearchParams, process: { env: Object.freeze({}) }, fetch() { throw new Error('Network forbidden') } }, { filename: file, timeout: 5000 })
    return exports
  }
  function ast(file) { return ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX) }
  const nodes = (node, predicate) => { const found = []; function visit(n) { if (predicate(n)) found.push(n); ts.forEachChild(n, visit) } visit(node); return found }
  function run(code, bindings) {
    const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
    return vm.runInNewContext(js, { URLSearchParams, ...bindings }, { timeout: 5000 })
  }
  const expression = (node, bindings) => run('(' + node.getText() + ')', bindings)
  return { read, load, ast, nodes, run, expression }
}

function verify(overrides = {}) {
  const w = world(overrides), entry = w.load(HELPER), data = w.load('lib/clipesNos2Lugares.ts')
  const recreate = w.load('lib/recreate/entry.ts'), gallery = w.load('lib/homeGaleria.ts')
  const preview = w.load(PREVIEW), catalog = w.load('lib/recreate/seuVideoCatalog.ts'), starters = w.load(STARTERS).WATCH_PUBLIC_STARTERS
  const newReference = item => preview.SEU_VIDEO_PREVIEW_ENABLED && item.produto === 'clip' && catalog.seuVideoCatalogItem(item.id)
  const expectedSeed = item => (item.prompt || starters[item.id] || item.title).trim().slice(0, item.produto === 'cartoon' ? 300 : item.produto === 'ads' ? 1200 : 2000)
  const clip = id => data.CLIPES_NOVOS.find(item => item.id === id)
  check('top', data.CLIPES_NO_TOPO.length === 6 && new Set(data.CLIPES_NO_TOPO).size === 6 && data.CLIPES_NO_TOPO.every(id => clip(id)), 'top six are unique canonical IDs')
  for (const item of data.CLIPES_NOVOS) {
    for (const signed of [false, true]) {
      const href = entry.watchClipHref(item, signed)
      if (item.produto === 'clip') {
        if (newReference(item)) {
          const url = new URL(href, 'https://local.invalid')
          check('preview', url.pathname === preview.SEU_VIDEO_PREVIEW_PATH && url.searchParams.get('example') === item.id && [...url.searchParams.keys()].join() === 'example', item.id + ': approved reference opens the real editor before signup with its exact public ID')
          check('preview', entry.watchClipLabel(item) === 'Recreate', item.id + ': new reference card label agrees with its editor')
        } else check('route', href === gallery.viaSignup(recreate.publicRecreatePath(item.id) ?? data.clipeNovoDestino(item), signed), item.id + ': other clip/effect gates retained')
        continue
      }
      const url = new URL(href, 'https://local.invalid')
      check('route', url.pathname === ({ film: '/studio', cartoon: '/kids-cartoon', ads: '/ads/v2' })[item.produto], item.id + ': real public form, before signup')
      check('identity', url.searchParams.get('example') === item.id, item.id + ': public identity retained')
      check('privacy', [...url.searchParams.keys()].sort().join() === (item.produto === 'film' ? ['example', 'intent_campaign'] : item.produto === 'ads' ? ['entry', 'example', 'utm_source'] : ['example', 'utm_source']).sort().join(), item.id + ': no text, credential, photo or autostart in card URL')
      if (item.produto === 'ads') check('mode', url.searchParams.get('entry') === (item.adsEntry ?? 'product'), item.id + ': canonical Ads entry retained')
      check('seed', entry.watchExampleIdea(item.id, item.produto) === expectedSeed(item), item.id + ': public canonical idea resolves in full')
      check('draft', entry.watchExampleText('  My own draft  ', item.id, item.produto) === '  My own draft  ', 'existing text survives the public starter')
    }
    check('label', !/\$|\bcredits?\b|Kling|Seedance|MiniMax/i.test(entry.watchClipLabel(item)), 'no price or engine in action')
    if (entry.watchClipLabel(item) === 'Recreate') check('honesty', Boolean(newReference(item) || recreate.publicRecreatePath(item.id)), 'Recreate needs the new reference allowlist or the legacy public approval gate')
  }
  const off = world({ ...overrides, [PREVIEW]: w.read(PREVIEW).replace('SEU_VIDEO_PREVIEW_ENABLED = true', 'SEU_VIDEO_PREVIEW_ENABLED = false') })
  const offEntry = off.load(HELPER), formats = w.load('lib/recreate/formats.ts')
  for (const item of data.CLIPES_NOVOS.filter(item => item.produto === 'clip')) {
    for (const signed of [false, true]) check('release', offEntry.watchClipHref(item, signed) === gallery.viaSignup(recreate.publicRecreatePath(item.id) ?? data.clipeNovoDestino(item), signed), item.id + ': closing preview restores the exact legacy destination')
    const legacyLabel = recreate.publicRecreatePath(item.id) ? formats.recreateFormat(item.id)?.type === 'swap' ? 'Recreate' : 'Use effect' : item.prompt ? 'Use idea' : 'Make a video'
    check('release', offEntry.watchClipLabel(item) === legacyLabel, item.id + ': closing preview restores the exact legacy label')
  }
  for (const id of ['unknown-reference', 'duelo-de-danca', 'friday-groove', 'https://private.invalid/video.mp4']) {
    const invented = { ...clip('selfie-confete'), id }
    check('preview-allowlist', entry.watchClipHref(invented, false) === '/recreate' && entry.watchClipHref(invented, true) === '/recreate' && entry.watchClipLabel(invented) !== 'Recreate', 'unknown/archived IDs never open the first reference as a fallback')
  }
  const canonicalLabel = clip('selfie-confete')
  check('preview-allowlist', entry.watchClipLabel({ ...canonicalLabel, produto: 'ads' }) === entry.watchClipLabel(canonicalLabel), 'card label uses canonical metadata as the URL does')
  check('mode', new URL(entry.watchClipHref(clip('anuncio-creme-selfie')), 'https://k').searchParams.get('entry') === 'ugc' && new URL(entry.watchClipHref(clip('anuncio-burger-camera-lenta')), 'https://k').searchParams.get('entry') === 'product', 'top product and UGC do not collapse into one entry')
  const allCurated = w.load('lib/ui/homeFeaturedFilms.ts').HOME_FEATURED_PLAYLISTS.flat(), curated = allCurated.slice(0, 6)
  check('featured', entry.WATCH_FEATURED_FILMS.length === 6 && new Set(entry.WATCH_FEATURED_FILMS.map(item => item.id)).size === 6 && entry.WATCH_FEATURED_FILMS.every((item, i) => item.id === curated[i].id && item.title === curated[i].title), 'six narrated films preserve the existing curated source and order')
  for (const film of curated) {
    const alias = 'home-' + film.id, href = entry.watchFilmExampleHref(film.id), url = new URL(href, 'https://local.invalid')
    check('route', url.pathname === '/studio' && url.searchParams.get('intent_campaign') === 'home_card', film.id + ': narrated-film card opens the real public form')
    check('identity', url.searchParams.get('example') === alias, film.id + ': public home-UUID alias travels intact')
    check('privacy', [...url.searchParams.keys()].sort().join() === 'example,intent_campaign' && !href.includes(film.title), film.id + ': narrated-film URL contains no title, customer text or autostart')
    check('seed', entry.watchExampleIdea(alias, 'film') === starters[alias] && entry.watchExampleText('', alias, 'film') === starters[alias], film.id + ': curated alias fills the full editorial starter')
    check('draft', entry.watchExampleText('Existing narrated-film draft', alias, 'film') === 'Existing narrated-film draft', film.id + ': curated alias cannot overwrite an edit')
    check('allowlist', entry.watchExampleIdea(alias, 'cartoon') === '' && entry.watchExampleIdea(alias, 'ads') === '' && entry.watchExampleIdea(film.id, 'film') === '' && entry.watchExampleIdea([alias, alias], 'film') === '', film.id + ': alias is Film-only, explicit and scalar')
  }
  for (const invalidAlias of ['home-not-a-public-film', 'home-00000000-0000-0000-0000-000000000000', 'home-carta-do-front', 'home-']) for (const product of ['film', 'cartoon', 'ads']) check('allowlist', entry.watchExampleIdea(invalidAlias, product) === '', 'unknown home alias stays blank')
  for (const excluded of allCurated.slice(6)) check('allowlist', entry.watchExampleIdea('home-' + excluded.id, 'film') === '', 'a curated film outside the six WATCH cards is not an active alias')
  const active = data.CLIPES_NOVOS.filter(item => ['film', 'cartoon', 'ads'].includes(item.produto) && item.prompt === null)
  const required = [...active.map(item => item.id), ...curated.map(item => 'home-' + item.id)]
  check('starter-content', Object.keys(starters).sort().join() === required.sort().join() && required.length === 23, 'all 17 active null-prompt examples and six curated films have one starter; no inactive kit retag')
  for (const item of [...active, ...curated.map(film => ({ ...film, id: 'home-' + film.id, produto: 'film' }))]) {
    const text = starters[item.id], max = item.produto === 'cartoon' ? 300 : item.produto === 'ads' ? 1200 : 2000
    check('starter-content', typeof text === 'string' && text.length > 80 && text.length <= max && text !== item.title && text.split(/[.!?]/).filter(s => s.trim()).length >= 2, item.id + ': useful complete editable directions, never a title or truncated seed')
    if (item.produto === 'ads') check('starter-content', !/\b(?:Halo|Veil|Orra)\b|\$\s*\d|\bSPF\s*\d/i.test(text), item.id + ': sample brands, prices and SPF numbers do not become customer claims')
  }
  check('starter-content', /soldier.*letter.*tent/i.test(starters['carta-do-front']) && /fox.*lantern.*forest/i.test(starters['raposa-lanterna']) && /bun.*cheese.*steam/i.test(starters['anuncio-burger-camera-lenta']), 'representative starters retain their actual recipe scenes')
  for (const product of ['film', 'cartoon', 'ads']) for (const bad of [undefined, null, '', 'not-a-public-clip', ['carta-do-front', 'carta-do-front'], { id: 'carta-do-front' }]) check('allowlist', entry.watchExampleIdea(bad, product) === '', 'unknown/repeated/non-scalar seed is rejected')
  check('allowlist', entry.watchExampleIdea('raposa-lanterna', 'film') === '' && entry.watchExampleIdea('carta-do-front', 'ads') === '', 'cross-product example is rejected')
  const simple = w.load('lib/growth/studioSimples.ts')
  check('simple', simple.usarCaixaUnica({ intent_campaign: 'home_card', example: 'carta-do-front' }) && !simple.usarCaixaUnica({ example: 'carta-do-front', autostart: '1' }), 'public ID keeps the simple form; no autostart widening')

  function receivingProps(file, tag) {
    const ast = w.ast(file)
    check('wire', w.nodes(ast, n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === '@/lib/home/watchEntry').length === 1, file + ': receiving helper is imported')
    return w.nodes(ast, n => (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText() === tag).map(node => node.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.text === 'ideiaInicial')?.initializer?.expression)
  }
  const filmProp = receivingProps(STUDIO, 'StudioSimples')[0]
  check('film', Boolean(filmProp), 'simple Studio receives the public starter')
  const ideia = w.load('lib/growth/ideiaDaPagina.ts')
  for (const existing of ['', 'My arrival idea']) check('film', w.expression(filmProp, { ...entry, ...ideia, searchParams: { ideia: existing, example: 'carta-do-front' } }) === (existing || expectedSeed(clip('carta-do-front'))), 'arrival idea wins; otherwise the full seed reaches StudioSimples')
  const toonProps = receivingProps(CARTOON, 'KidsCartoonTemplate')
  check('cartoon', toonProps.length === 2 && toonProps.every(Boolean), 'guest and member both receive the starter')
  for (const prop of toonProps) check('cartoon', w.expression(prop, { ...entry, searchParams: { example: 'raposa-lanterna' } }) === expectedSeed(clip('raposa-lanterna')), 'Cartoon guest/member prop has the full public seed')
  const ideaDeclaration = w.nodes(w.ast(TEMPLATE), n => ts.isVariableDeclaration(n) && ts.isArrayBindingPattern(n.name) && n.name.elements[0]?.getText() === 'idea')[0]
  const initializer = ideaDeclaration?.initializer?.arguments?.[0]
  check('cartoon', initializer && w.expression(initializer, { ideiaInicial: 'Public cartoon starter' }) === 'Public cartoon starter', 'Cartoon initializes its real editable idea with the seed')

  const advancedAst = w.ast(ADVANCED)
  const promptBranch = w.nodes(advancedAst, n => ts.isIfStatement(n) && n.expression.getText() === 'p' && n.thenStatement.getText().includes('setPrompt(p)') && n.elseStatement?.getText().includes('watchExampleText'))[0]
  check('advanced', Boolean(promptBranch), 'advanced Studio only seeds as an arrival fallback')
  for (const [query, saved, expected] of [['example=carta-do-front', '', expectedSeed(clip('carta-do-front'))], ['example=carta-do-front', 'Edited in Studio', 'Edited in Studio'], ['prompt=Explicit&example=carta-do-front', '', 'Explicit'], ['example=carta-do-front&example=carta-do-front', '', '']]) {
    let current = saved
    const sp = new URLSearchParams(query)
    w.run(promptBranch.getText(), { ...entry, sp, p: sp.get('prompt'), setPrompt(next) { current = typeof next === 'function' ? next(current) : next } })
    check('advanced', current === expected, 'advanced real setter preserves edit/arrival/duplicate rules')
  }
  const adsAst = w.ast(ADS)
  const adSetter = w.nodes(adsAst, n => ts.isCallExpression(n) && n.expression.getText() === 'setForm' && n.arguments[0] && n.arguments[0].getText().includes('watchExampleText'))[0]?.arguments[0]
  check('ads', Boolean(adSetter), 'Ads actual form has a public fallback setter')
  const setAd = w.expression(adSetter, { ...entry, arrival: new URLSearchParams('example=anuncio-creme-selfie') })
  for (const frase of ['', 'Restored customer description']) {
    const original = { frase, foto: 'existing-photo', language: 'pt', formato: 'ugc' }, next = setAd(original)
    check('ads', next.frase === (frase || expectedSeed(clip('anuncio-creme-selfie'))) && next.foto === original.foto && next.language === 'pt' && next.formato === 'ugc', 'seed preserves restored Ads text/photo/language/format')
  }
  const adParent = (() => { for (let n = adSetter; n; n = n.parent) if (ts.isIfStatement(n) && n.expression.getText().includes("getAll('example')")) return n })()
  check('ads', Boolean(adParent) && !w.expression(adParent.expression, { arrival: new URLSearchParams('example=anuncio-creme-selfie&example=anuncio-creme-selfie') }), 'Ads rejects repeated example parameters')
  const helperAst = w.ast(HELPER)
  check('pure', !w.nodes(helperAst, n => ts.isCallExpression(n) && /^(?:fetch|setTimeout|setInterval|eval|Function)$/.test(n.expression.getText())).length, 'entry helpers never request, generate or execute URL text')
}

verify()
const baseline = count
const mutations = [
  ['signup before preview', 'preview', { [HELPER]: rd(HELPER).replace('if (recreate) return recreate', 'if (recreate) return viaSignup(recreate, signedIn)') }],
  ['reference loses public identity', 'preview', { [HELPER]: rd(HELPER).replace('new URLSearchParams({ example: id })', 'new URLSearchParams({})') }],
  ['preview release ignored', 'release', { [HELPER]: rd(HELPER).replace('SEU_VIDEO_PREVIEW_ENABLED && seuVideoCatalogItem(id)', 'true && seuVideoCatalogItem(id)') }],
  ['clip starter falls back to title', 'seed', { [HELPER]: rd(HELPER).replace('clip.prompt || WATCH_PUBLIC_STARTERS[clip.id] || clip.title', 'clip.prompt || clip.title') }],
  ['curated film starter falls back to title', 'seed', { [HELPER]: rd(HELPER).replace("WATCH_PUBLIC_STARTERS['home-' + film.id] || film.title", 'film.title') }],
  ['unknown reference opens first editor', 'preview-allowlist', { [HELPER]: rd(HELPER).replace("if (!canonical) return '/recreate'", "if (!canonical) return '/recreate-preview?example=selfie-confete'") }],
  ['canonical starter missing', 'starter-content', { [STARTERS]: rd(STARTERS).replace("'filme-anticitera':", "'unlisted-anticitera':") }],
  ['account before idea', 'route', { [HELPER]: rd(HELPER).replaceAll("return '/studio?'", "return '/signup?'") }],
  ['unknown identity accepted', 'allowlist', { [HELPER]: rd(HELPER).replace("if (typeof example !== 'string') return null", "if (typeof example !== 'string') return CLIPES_NOVOS.find(clip => clip.produto === produto) ?? null") }],
  ['draft erased by seed', 'draft', { [HELPER]: rd(HELPER).replace("return current.trim() ? current : watchExampleIdea(example, produto)", 'return watchExampleIdea(example, produto)') }],
  ['film seed missing', 'film', { [STUDIO]: rd(STUDIO).replace("watchExampleText(ideiaDoLink(searchParams.ideia), searchParams.example, 'film')", "ideiaDoLink(searchParams.ideia)") }],
  ['Cartoon remains blank', 'cartoon', { [TEMPLATE]: rd(TEMPLATE).replace('const [idea, setIdea] = useState(ideiaInicial)', "const [idea, setIdea] = useState('')") }],
  ['Ads remains blank', 'ads', { [ADS]: rd(ADS).replace("watchExampleText(f.frase, arrival.get('example'), 'ads')", 'f.frase') }],
]
for (const [name, id, changes] of mutations) {
  for (const [file, value] of Object.entries(changes)) assert.notEqual(value, rd(file), 'Mutant did not apply: ' + name)
  let failure
  try { verify(changes) } catch (error) { failure = error }
  assert(failure instanceof assert.AssertionError, name + ': only AssertionError counts, never VM/execution errors: ' + failure?.stack)
  assert(failure.message.startsWith('[' + id + ']'), name + ': wrong guard: ' + failure.message)
  console.log('MUTANT REJECTED [' + id + '] ' + name)
}
console.log('WATCH entry: ' + baseline + ' offline assertions; ' + mutations.length + '/' + mutations.length + ' targeted mutants rejected; no account/API/render started')
