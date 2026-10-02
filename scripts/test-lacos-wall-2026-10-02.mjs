// KINEO-LACOS-WALL-2026-10-02 — guardião (laços C5): o /wall ganha "Latest public films" sem vazar filme de cliente.
// Prova executando app/wall/page.tsx com módulos falsos: (1) a seção lista as /v/ publicadas que
// listIndexablePublicVideos devolve, com link para /v/<id>; (2) sem filmes, erro ou demora a seção SOME e o mural
// continua; (3) a página não consulta `videos` por conta própria — a seleção é a do sitemap, que aplica
// lib/publicSurfacePolicy.ts (trava global desligada ⇒ só linha com published_at); (4) mutantes. Estilo
// readFileSync + transpile.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const SRC = read('app/wall/page.tsx')
function loadPage(listImpl, src = SRC) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText
  const mod = { exports: {} }
  const Link = function Link() { return null }
  const mocks = {
    'next/link': { __esModule: true, default: Link },
    'next/cache': { unstable_cache: (fn) => fn },
    '@/components/wall/WallSubmitLink': { __esModule: true, default: function WallSubmitLink() { return null } },
    '@/components/wall/WallThumb': { __esModule: true, default: function WallThumb() { return null } },
    '@/lib/wallOfProof': {
      getWallData: async () => ({ items: [], totalAllTime: 0, viewsPending: false, totalViews: 0 }),
      formatViews: String, relativeDay: String, PUBLIC_BASE_URL: 'https://www.usekineo.com', WALL_WEEK_DAYS: 7,
    },
    '@/lib/publicVideos': { listIndexablePublicVideos: listImpl },
  }
  vm.runInNewContext(js, {
    module: mod, exports: mod.exports, URL, URLSearchParams, Promise, JSON, Array, String, Math, Error,
    // Prazo encurtado para o teste: 2.500 ms viram 30 ms (a lógica de corrida é a mesma).
    setTimeout: (fn) => setTimeout(fn, 30), clearTimeout,
    console: { log() {}, warn() {}, error() {} },
    React: { createElement: (type, props, ...children) => ({ type, props: { ...(props ?? {}), children } }) },
    require: (id) => { if (Object.hasOwn(mocks, id)) return mocks[id]; throw new Error('import inesperado: ' + id) },
  })
  return mod.exports
}
function find(node, pred, out = []) {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) { node.forEach((n) => find(n, pred, out)); return out }
  if (pred(node)) out.push(node)
  find(node.props?.children, pred, out)
  return out
}
const film = (id, title) => ({ id, title, thumbnailUrl: `https://www.usekineo.com/v/${id}/opengraph-image`, durationSeconds: 64, pageUrl: `https://www.usekineo.com/v/${id}` })
async function render(listImpl) {
  const M = loadPage(listImpl)
  const tree = await M.default({ searchParams: {} })
  const sec = find(tree, (n) => typeof n.type === 'function' && n.type.name === 'LatestPublicFilms')[0]
  const rendered = sec ? sec.type(sec.props) : null
  return { tree, sec, rendered }
}

console.log('== 1. a seção mostra as /v/ publicadas ==')
{
  let pedido = null
  const { sec, rendered, tree } = await render(async (n) => { pedido = n; return [film('11111111-1111-4111-8111-111111111111', 'The river that boils'), film('22222222-2222-4222-8222-222222222222', 'Lake Natron turns animals to stone')] })
  ok(sec && sec.props.films.length === 2 && pedido > 0 && pedido <= 12, 'a página pede a lista canônica (com limite) e passa os filmes à seção')
  const h2 = find(rendered, (n) => n.type === 'h2')[0]
  ok(h2 && h2.props.children.includes('Latest public films'), 'título "Latest public films"')
  const cards = find(rendered, (n) => typeof n.type === 'function' && n.type.name === 'PublicFilmCard')
  const card = cards[0] && cards[0].type(cards[0].props)
  const link = card && find(card, (n) => n.props && typeof n.props.href === 'string')[0]
  ok(cards.length === 2 && link && link.props.href === '/v/11111111-1111-4111-8111-111111111111', 'cada cartão abre a /v/<id> do filme')
  ok(find(tree, (n) => n.props && n.props.id === 'paste').length === 1, 'o resto do mural (âncora #paste do e-mail) continua')
}

console.log('== 2. falha silenciosa ==')
{
  const { sec, rendered } = await render(async () => [])
  ok(sec && rendered === null, 'sem filme publicado: a seção não aparece')
}
{
  const { sec, rendered, tree } = await render(async () => { throw new Error('supabase fora do ar') })
  ok(sec && sec.props.films.length === 0 && rendered === null && find(tree, (n) => n.props && n.props.id === 'paste').length === 1, 'erro na leitura: a seção some e a página renderiza')
}
{
  const t0 = Date.now()
  const { sec, rendered } = await render(() => new Promise(() => {}))
  ok(sec && rendered === null && Date.now() - t0 < 2000, 'leitura que não responde: o prazo corta e a seção some (a página não fica pendurada)')
}
ok(/const LATEST_FILMS_TIMEOUT_MS = 2_500/.test(SRC) && /Promise\.race\(\[listIndexablePublicVideos\(LATEST_FILMS_LIMIT\), prazo\]\)/.test(SRC), 'fonte: prazo de 2,5 s em corrida com a leitura')

console.log('== 3. privacidade: a seleção é a do sitemap ==')
ok(/import \{ listIndexablePublicVideos, type PublicVideo \} from '@\/lib\/publicVideos'/.test(SRC), 'o /wall lê pelos filmes da função canônica')
ok(!/from\('videos'\)/.test(SRC) && !/@\/lib\/supabase/.test(SRC) && !/createClient/.test(SRC), 'o /wall não consulta `videos` nem abre cliente do banco por conta própria')
const pv = read('lib/publicVideos.ts')
const lista = pv.slice(pv.indexOf('export async function listIndexablePublicVideos('))
ok(/const global = CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED as boolean/.test(lista) && /if \(!global\) query = query\.not\('published_at', 'is', null\)/.test(lista), 'a função canônica aplica a política: trava global desligada ⇒ só linha com published_at')
ok(/if \(!v\.isIndexable\)/.test(lista), 'e só o que passa o portão de qualidade (o mesmo do sitemap)')
ok(/export function publicSurfaceAllowsRow\(publishedAt/.test(read('lib/publicSurfacePolicy.ts')), 'a política por linha (publicSurfaceAllowsRow) continua sendo a regra da casa')

console.log('== 4. mutantes ==')
{
  const mut = SRC.replace('  if (films.length === 0) return null\n', '')
  const M = loadPage(async () => [])
  const M2 = loadPage(async () => [], mut)
  const t1 = await M.default({ searchParams: {} })
  const t2 = await M2.default({ searchParams: {} })
  const s1 = find(t1, (n) => typeof n.type === 'function' && n.type.name === 'LatestPublicFilms')[0]
  const s2 = find(t2, (n) => typeof n.type === 'function' && n.type.name === 'LatestPublicFilms')[0]
  ok(mut !== SRC && s1.type(s1.props) === null && s2.type(s2.props) !== null, 'mutante: sem a guarda de vazio, a seção apareceria vazia — pego')
}
{
  const mut = SRC.replace("  } catch {\n    return []\n  }\n}\n\n// O root layout", "  } finally {}\n}\n\n// O root layout")
  let quebrou = false
  try { await loadPage(async () => { throw new Error('x') }, mut).default({ searchParams: {} }) } catch { quebrou = true }
  ok(mut !== SRC && quebrou, 'mutante: sem o catch, um erro de leitura derrubaria o /wall inteiro — pego')
}

console.log(`\n  ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
