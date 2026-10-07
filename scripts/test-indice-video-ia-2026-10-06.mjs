// KINEO-INDICE-VIDEO-IA-2026-10-06 — guardião do "Kineo AI Video Index" (/ai-video-index, fundador 06/10: "vai índice").
// O que ele prova — tudo EXECUTADO sobre o código real (readFileSync + typescript + vm + react-dom/server), sem rede, sem
// banco e sem alias '@/' no próprio guardião (o carregador mínimo resolve caminhos relativos e '@/…' para arquivos):
//   1. A PÁGINA LÊ O JSON: o server HTML é renderizado a partir de data/ai-video-index/<edição>.json; trocar um número no
//      JSON (controle) muda a página; trocar o custo da fal em lib/clips/clipPriceVsMarket.ts muda a coluna do fornecedor.
//      O PREÇO DA KINEO por vídeo NÃO se repete (sessão CEO 06/10): a página linka /seedance-kling-veo-in-one-place (a
//      tabela de preço por motor da rodada 1), com o caminho travado contra HUB_PAGES.oneplace.
//      Nenhum dígito em texto de JSX e nenhum valor do JSON (nem os totais derivados) digitado na página, na lib ou no
//      módulo da edição.
//   2. n < 10 MARCADO: toda medida (duração, tempo, entrega, coerência; clientes e casa) com 0 < n < 10 sai com o selo
//      "indicative" — contado no HTML contra a conta independente feita aqui a partir do JSON.
//   3. SEM DADO PESSOAL no JSON: só chaves conhecidas, nenhum e-mail, id/UUID, URL, prompt ou texto de cliente.
//   4. SITEMAP E LLMS.TXT: entrada no sitemap com a data da edição; a linha do índice no FIM do llms.txt (depois de
//      "## Citation"), com o link e números iguais aos do JSON; link discreto "Real cost and render time" nas duas
//      páginas de motor.
//   5. SCHEMA: Article + Dataset (+ FAQPage) no HTML, coerentes com a edição.
//   + a consulta salva ao lado é só leitura, tem a mesma janela do JSON e a MESMA lista de contas da casa de
//     lib/internalAccounts.ts; o módulo da edição aponta para o JSON mais novo da pasta; os motores batem com o catálogo.
// Cada regra tem mutante EM MEMÓRIA (o mutante prova que aplicou: a âncora tem de existir e o texto tem de mudar) que
// precisa ficar VERMELHO pelo motivo certo, e 2 controles que precisam ficar VERDES com o valor novo.
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'package.json'))
const ts = require('typescript')
const React = require('react')
const jsxRuntime = require('react/jsx-runtime')
const { renderToStaticMarkup } = require('react-dom/server')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')

let ok = 0
const falhas = []
const checa = (nome, cond) => {
  if (cond) { ok += 1; console.log('  ✓ ' + nome); return }
  falhas.push(nome)
  console.error('  ✗ ' + nome)
}

const PAGE = 'app/ai-video-index/page.tsx'
const LIB = 'lib/seo/aiVideoIndex.ts'
const EDITION_MOD = 'lib/seo/aiVideoIndexEdition.ts'
const HEADLINE = 'lib/seo/aiVideoIndexHeadline.ts'
const FOOTER = 'components/Footer.tsx'
const DATA_DIR = 'data/ai-video-index'
const SITEMAP = 'app/sitemap.ts'
const LLMS = 'app/llms.txt/route.ts'
const ENGINE_PAGES = ['app/ai-video-generator/[engine]/page.tsx', 'app/ai-video-generator/seedance-2-5/page.tsx']
const CATALOG = 'lib/growth/enginePageCatalog.ts'
const INTERNAL = 'lib/internalAccounts.ts'
const COHERENCE = 'lib/fastCoherence.ts'
const RULE_N = 10 // o pedido do fundador: amostra com n < 10 aparece marcada
const BASE = 'https://www.usekineo.com'

// ── carregador mínimo: TS/TSX/JSON, só relativos, '@/…' e os stubs declarados; `over` troca a fonte (mutantes) ─────────
function carregador(over = {}) {
  const cache = new Map()
  const stubs = {
    react: React,
    'react/jsx-runtime': jsxRuntime,
    'next/link': { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { href: String(href), ...rest }, children) },
    '@/components/Footer': { __esModule: true, default: () => null },
  }
  const src = (rel) => (Object.prototype.hasOwnProperty.call(over, rel) ? over[rel] : rd(rel))
  const existe = (rel) => Object.prototype.hasOwnProperty.call(over, rel) || existsSync(join(root, rel))
  const resolve = (spec, de) => {
    const base = spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? posix.normalize(posix.join(posix.dirname(de), spec)) : null
    if (base === null) throw new Error(`import inesperado em ${de}: ${spec}`)
    for (const ext of ['', '.ts', '.tsx', '.json']) {
      const c = base + ext
      if (/\.(tsx?|json)$/.test(c) && existe(c)) return c
    }
    throw new Error(`não achei ${spec} (em ${de})`)
  }
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const mod = { exports: {} }
    cache.set(rel, mod)
    const texto = src(rel)
    if (rel.endsWith('.json')) { mod.exports = JSON.parse(texto); return mod.exports }
    const js = ts.transpileModule(texto, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: rel,
    }).outputText
    const req = (spec) => (Object.prototype.hasOwnProperty.call(stubs, spec) ? stubs[spec] : load(resolve(spec, rel)))
    vm.runInNewContext(js, { exports: mod.exports, module: mod, require: req, process: { env: { NODE_ENV: 'test' } }, console: { log() {}, warn() {}, error() {} }, URL, URLSearchParams, Intl }, { filename: rel })
    return mod.exports
  }
  return load
}

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const textoDe = (html) => decode(html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const MESES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const dataHumana = (iso) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return `${MESES[m - 1]} ${d}, ${y}` }
const pctOf = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)
const fmt = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1))

// ── o "mundo": edição vigente (o arquivo que o módulo da edição importa) + listagem da pasta (sobrescrevível) ──────────
function edicaoImportada(over) {
  const m = (over[EDITION_MOD] ?? rd(EDITION_MOD)).match(/^import\s+\w+\s+from\s+'\.\.\/\.\.\/data\/ai-video-index\/(\d{4}-\d{2})\.json'/m)
  return m ? m[1] : null
}
function listaPasta(world) {
  return world.dir ?? readdirSync(join(root, DATA_DIR)).sort()
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// As regras. Cada uma devolve a lista de falhas ([] = verde) para um mundo { over, dir }.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

/** 3. JSON sem dado pessoal (e só chaves conhecidas). */
const CHAVES = new Set(['schema', 'edition', 'measuredAt', 'window', 'start', 'end', 'days', 'houseAccounts', 'engines', 'qualityMode', 'engine', 'windowNote', 'customers', 'house', 'films', 'creators', 'durationSeconds', 'minutesToFilm', 'requests', 'coherence', 'n', 'median', 'min', 'max', 'p90', 'mean', 'below50', 'delivered', 'stoppedByChecks', 'failed', 'noOutcomeRecorded'])
const PROIBIDA = /email|e_mail|user|^id$|_id$|Id$|uuid|prompt|topic|narration|script|title|ip_hash|country|url|session|render|generation/i
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
function regraSemPii(world) {
  const f = []
  const rel = `${DATA_DIR}/${edicaoImportada(world.over) ?? 'x'}.json`
  let data
  try { data = JSON.parse(world.over[rel] ?? rd(rel)) } catch (e) { return [`JSON ilegível: ${e.message}`] }
  const anda = (v, caminho) => {
    if (Array.isArray(v)) { v.forEach((x, i) => anda(x, `${caminho}[${i}]`)); return }
    if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (!CHAVES.has(k)) f.push(`chave desconhecida ${caminho}.${k}`)
        if (PROIBIDA.test(k)) f.push(`chave de dado pessoal ${caminho}.${k}`)
        anda(x, `${caminho}.${k}`)
      }
      return
    }
    if (typeof v === 'string') {
      if (v.includes('@')) f.push(`"@" em ${caminho}`)
      if (UUID.test(v)) f.push(`UUID em ${caminho}`)
      if (/https?:\/\//i.test(v)) f.push(`URL em ${caminho}`)
      if (v.length > 160) f.push(`texto longo demais em ${caminho} (${v.length})`)
    }
  }
  anda(data, '$')
  return f
}

/** A consulta salva: só leitura, mesma janela/edição do JSON, mesma régua de contas da casa e do juiz. */
function regraSql(world) {
  const f = []
  const ed = edicaoImportada(world.over)
  const sqlRel = `${DATA_DIR}/${ed}.sql`
  const jsonRel = `${DATA_DIR}/${ed}.json`
  if (!(world.over[sqlRel] !== undefined || existsSync(join(root, sqlRel)))) return [`sem ${sqlRel} ao lado do JSON`]
  const sql = world.over[sqlRel] ?? rd(sqlRel)
  const data = JSON.parse(world.over[jsonRel] ?? rd(jsonRel))
  const semComentario = sql.replace(/--[^\n]*/g, '')
  const escrita = [/\binsert\s+into\b/i, /\bdelete\s+from\b/i, /\bupdate\s+[\w.]+\s+set\b/i, /\b(drop|alter|truncate|grant|revoke|copy)\b/i, /\bcreate\s+(table|function|or|index|view|policy|trigger|schema|extension)\b/i]
  for (const re of escrita) if (re.test(semComentario)) f.push(`a consulta escreve no banco (${re})`)
  const iso = (s) => s.replace('T', ' ').replace('Z', '+00')
  if (!semComentario.includes(`timestamptz '${iso(data.window.start)}'`)) f.push('início da janela da consulta ≠ JSON')
  if (!semComentario.includes(`timestamptz '${iso(data.window.end)}'`)) f.push('fim da janela da consulta ≠ JSON')
  if (!semComentario.includes(`'${data.edition}'::text`)) f.push('edição da consulta ≠ JSON')
  const ia = carregador(world.over)(INTERNAL)
  const exatos = (semComentario.match(/lower\(pr\.email\) in \(([^)]*)\)/) ?? [])[1]
  const listaExata = exatos ? [...exatos.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort() : []
  const likes = [...semComentario.matchAll(/lower\(pr\.email\) like '([^']+)'/g)].map((m) => m[1]).sort()
  if (JSON.stringify(listaExata) !== JSON.stringify([...ia.INTERNAL_EXACT_EMAILS].map((e) => e.toLowerCase()).sort())) f.push('e-mails exatos da casa na consulta ≠ lib/internalAccounts.ts')
  if (JSON.stringify(likes) !== JSON.stringify([...ia.INTERNAL_LIKE_PATTERNS].sort())) f.push('padrões LIKE da casa na consulta ≠ lib/internalAccounts.ts')
  const versao = (rd(COHERENCE).match(/export const FAST_COHERENCE_VERSION = '([^']+)'/) ?? [])[1]
  if (!versao || !semComentario.includes(`'${versao}'`)) f.push('versão do juiz de coerência na consulta ≠ lib/fastCoherence.ts')
  if (!/coalesce\(e\.metadata->>'dry_run', 'false'\) <> 'true'/.test(semComentario)) f.push('a consulta não tira os ensaios dry_run')
  // as réguas de método que a página CITA são as mesmas da consulta e do juiz (espelhos travados)
  let lib
  try { lib = carregador(world.over)(LIB) } catch (e) { return [...f, `lib não carrega: ${e.message}`] }
  const corte = (rd(COHERENCE).match(/if \(score >= (\d+)\) return 'partial'/) ?? [])[1]
  if (Number(corte) !== lib.COHERENCE_OFF_BELOW) f.push(`COHERENCE_OFF_BELOW (${lib.COHERENCE_OFF_BELOW}) ≠ verdictFor de lib/fastCoherence.ts (${corte})`)
  if (!semComentario.includes(`s.score < ${lib.COHERENCE_OFF_BELOW}`)) f.push('a consulta conta "below50" com outro corte')
  const janelas = [...semComentario.matchAll(/coalesce\(fl\.plan_at, fl\.claim_at\) - interval '(\d+) minutes'|pl\.plan_at - interval '(\d+) minutes'/g)].map((x) => Number(x[1] ?? x[2]))
  if (janelas.length !== 2 || janelas.some((x) => x !== lib.FAST_REQUEST_LINK_MINUTES)) f.push(`janela pedido→plano do Kineo 1 na consulta (${janelas.join(', ')}) ≠ FAST_REQUEST_LINK_MINUTES (${lib.FAST_REQUEST_LINK_MINUTES})`)
  return f
}

/** O módulo da edição importa o JSON MAIS NOVO da pasta, e todo JSON tem a .sql ao lado. */
function regraEdicaoVigente(world) {
  const f = []
  const arquivos = listaPasta(world)
  const edicoes = arquivos.filter((a) => /^\d{4}-\d{2}\.json$/.test(a)).map((a) => a.slice(0, 7)).sort()
  if (!edicoes.length) return ['nenhuma edição em ' + DATA_DIR]
  const ed = edicaoImportada(world.over)
  if (ed !== edicoes[edicoes.length - 1]) f.push(`a página lê ${ed}, mas a edição mais nova da pasta é ${edicoes[edicoes.length - 1]}`)
  for (const e of edicoes) if (!arquivos.includes(`${e}.sql`)) f.push(`${e}.json sem ${e}.sql ao lado`)
  const mod = world.over[EDITION_MOD] ?? rd(EDITION_MOD)
  if (!new RegExp(`AI_VIDEO_INDEX_DATA_FILE = '${DATA_DIR}/${ed}\\.json'`).test(mod)) f.push('AI_VIDEO_INDEX_DATA_FILE ≠ arquivo importado')
  if (!/export const AI_VIDEO_INDEX_EDITION = parseEdition\(edition\)/.test(mod)) f.push('a edição não passa por parseEdition')
  return f
}

/** Os motores do índice = o catálogo das páginas de motor (nome, slug, quality_mode). */
function regraCatalogo(world) {
  const f = []
  let lib
  try { lib = carregador(world.over)(LIB) } catch (e) { return [`lib não carrega: ${e.message}`] }
  const cat = world.over[CATALOG] ?? rd(CATALOG)
  for (const e of lib.INDEX_ENGINES) {
    const chave = e.slug ?? 'kineo-1'
    const ini = cat.search(new RegExp(`^\\s+(?:'${chave}'|${chave.replace(/-/g, '\\-')}): \\{`, 'm'))
    if (ini < 0) { f.push(`catálogo sem o motor ${chave}`); continue }
    const bloco = cat.slice(ini, ini + 400)
    if (!bloco.includes(`qualityMode: '${e.qualityMode}'`)) f.push(`${chave}: quality_mode ≠ catálogo`)
    if (!bloco.includes(`name: '${e.name}'`)) f.push(`${chave}: nome "${e.name}" ≠ catálogo`)
  }
  if (!/RETIRED_ENGINE_SLUGS: readonly string\[\] = \['kineo-1'\]/.test(cat)) f.push('o Kineo 1 sem página (slug null) não bate com RETIRED_ENGINE_SLUGS')
  if (lib.INDEX_ENGINES.length !== new Set(lib.INDEX_ENGINES.map((e) => e.qualityMode)).size) f.push('motor repetido no índice')
  return f
}

/** Renderiza a página (server HTML) no mundo dado. */
function renderiza(world) {
  const load = carregador(world.over)
  const page = load(PAGE)
  const html = renderToStaticMarkup(React.createElement(page.default))
  return { html, load, page }
}

/** Conta independente (a partir do JSON) das medidas que precisam do selo. */
function esperadosIndicativos(data) {
  let k = 0
  const peq = (n) => n > 0 && n < RULE_N
  for (const e of data.engines) {
    const c = e.customers
    for (const n of [c.durationSeconds.n, c.minutesToFilm.n, c.requests.n, c.coherence.n]) if (peq(n)) k++
    for (const n of [e.house.durationSeconds.n, e.house.minutesToFilm.n]) if (peq(n)) k++
  }
  return k
}

/** 1 + 2 + 5. A página lê o JSON, marca n < 10 e publica o schema. */
function regraPagina(world) {
  const f = []
  let r
  try { r = renderiza(world) } catch (e) { return [`a página não renderiza: ${e.message}`] }
  const { html, load } = r
  const ed = edicaoImportada(world.over)
  const data = JSON.parse(world.over[`${DATA_DIR}/${ed}.json`] ?? rd(`${DATA_DIR}/${ed}.json`))
  const txt = textoDe(html)
  const lib = load(LIB)
  // H1 e "Last updated" nascem da edição
  const [y, m] = data.edition.split('-').map(Number)
  const h1 = `${lib.AI_VIDEO_INDEX_NAME} — ${MESES[m - 1]} ${y}`
  if (!new RegExp(`<h1>${h1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h1>`).test(html)) f.push(`H1 ≠ "${h1}"`)
  if (!txt.includes(`Last updated ${dataHumana(data.measuredAt)}`)) f.push('sem "Last updated <data da leitura>"')
  // os números do JSON aparecem na tabela, por motor (conta independente feita aqui)
  const linhas = [...html.matchAll(/<tr><th scope="row">([\s\S]*?)<\/tr>/g)].map((x) => textoDe(x[1]))
  const pacotes = data.engines.map((e) => ({ e, linha: linhas.find((l) => l.startsWith(lib.INDEX_ENGINES.find((x) => x.qualityMode === e.qualityMode)?.name ?? '§')) }))
  for (const { e, linha } of pacotes) {
    const c = e.customers
    if (!linha) { f.push(`sem linha na tabela para ${e.engine}`); continue }
    if (c.films > 0 && !linha.includes(String(c.films))) f.push(`${e.engine}: filmes ${c.films} fora da linha`)
    if (c.minutesToFilm.median !== null && !linha.includes(`${fmt(c.minutesToFilm.median)} min`)) f.push(`${e.engine}: mediana de tempo fora da linha`)
    if (c.durationSeconds.median !== null && !linha.includes(`${fmt(c.durationSeconds.median)} s`)) f.push(`${e.engine}: mediana de duração fora da linha`)
    if (c.requests.n > 0 && !linha.includes(`${pctOf(c.requests.delivered, c.requests.n)}%`)) f.push(`${e.engine}: taxa de entrega fora da linha`)
    if (c.coherence.mean !== null && !linha.includes(fmt(c.coherence.mean))) f.push(`${e.engine}: coerência fora da linha`)
  }
  // 2. n < 10 marcado: no HTML (contagem) e na vista (célula a célula)
  const esperado = esperadosIndicativos(data)
  const noHtml = (html.match(/class="avi-ind"/g) ?? []).length
  if (noHtml !== esperado) f.push(`selos "indicative" no HTML: ${noHtml}, esperado ${esperado} (toda medida com 0 < n < ${RULE_N})`)
  const view = lib.buildIndexView(lib.parseEdition(data))
  for (const row of view.rows) {
    for (const [nome, cel] of [['length', row.length], ['time', row.time], ['delivery', row.delivery], ['coherence', row.coherence]]) {
      if (cel.indicative !== (cel.n > 0 && cel.n < RULE_N)) f.push(`${row.meta.name}.${nome}: selo ≠ regra n < ${RULE_N} (n = ${cel.n})`)
    }
  }
  if (view.smallRequestNote && !view.smallRequestNote.includes('indicative')) f.push('nota de amostras pequenas sem "indicative"')
  // achados: 5–7, com número, no topo (antes da tabela)
  const achados = (html.match(/class="avi-finding"/g) ?? []).length
  if (achados < 5 || achados > 7) f.push(`achados: ${achados} (esperado 5–7)`)
  if (html.indexOf('class="avi-finding"') < 0 || html.indexOf('class="avi-finding"') > html.indexOf('class="avi-table"')) f.push('os achados não vêm antes da tabela')
  for (const s of [...html.matchAll(/<p class="avi-stat">([^<]*)<\/p>/g)].map((x) => decode(x[1]))) if (!/\d/.test(s)) f.push(`achado sem número: "${s}"`)
  // metodologia e FAQ presentes
  if (!/id="avi-method-title"/.test(html) || (html.match(/<li>/g) ?? []).length < 5) f.push('sem metodologia')
  if ((html.match(/<article><h3>/g) ?? []).length < 3) f.push('FAQ com menos de 3 perguntas')
  // 5. schema
  const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => { try { return JSON.parse(x[1]) } catch { return null } })
  const tipo = (t) => lds.find((l) => l && l['@type'] === t)
  const art = tipo('Article')
  const ds = tipo('Dataset')
  const fq = tipo('FAQPage')
  if (!art) f.push('sem JSON-LD Article')
  else {
    if (art.headline !== h1) f.push('Article.headline ≠ H1')
    if (art.dateModified !== data.measuredAt.slice(0, 10)) f.push('Article.dateModified ≠ leitura da edição')
  }
  if (!ds) f.push('sem JSON-LD Dataset')
  else {
    if (ds.license !== 'https://creativecommons.org/licenses/by/4.0/') f.push('Dataset sem licença CC BY 4.0')
    const fim = new Date(Date.parse(data.window.end) - 1).toISOString().slice(0, 10)
    if (ds.temporalCoverage !== `${data.window.start.slice(0, 10)}/${fim}`) f.push('Dataset.temporalCoverage ≠ janela da edição')
    if (!Array.isArray(ds.variableMeasured) || ds.variableMeasured.length < data.engines.length) f.push('Dataset.variableMeasured curto')
    if (ds.url !== `${BASE}${lib.AI_VIDEO_INDEX_PATH}`) f.push('Dataset.url ≠ canônica')
    if (ds.dateModified !== data.measuredAt.slice(0, 10)) f.push('Dataset.dateModified ≠ leitura da edição')
  }
  if (!fq || !Array.isArray(fq.mainEntity) || fq.mainEntity.length < 3) f.push('sem JSON-LD FAQPage')
  return f
}

/** 1. Nada digitado: sem dígito em texto de JSX/literais da página; nenhum valor do JSON (nem total derivado) no código. */
function literaisDaPagina(src) {
  const sf = ts.createSourceFile('page.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const jsx = []
  const lits = []
  const anda = (n) => {
    if (ts.isImportDeclaration(n)) return
    if (ts.isVariableDeclaration(n) && n.name.getText(sf) === 'PAGE_CSS') return // CSS (px, %) não é número publicado
    if (n.kind === ts.SyntaxKind.JsxText) jsx.push(n.text)
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) lits.push(n.text)
    if (ts.isTemplateExpression(n)) { lits.push(n.head.text); for (const s of n.templateSpans) lits.push(s.literal.text) }
    if (ts.isJsxAttribute(n) && n.initializer && ts.isStringLiteral(n.initializer)) lits.push(n.initializer.text)
    ts.forEachChild(n, anda)
  }
  anda(sf)
  return { jsx, lits }
}
function numerosNoCodigo(src, kind) {
  const sf = ts.createSourceFile('x.' + kind, src, ts.ScriptTarget.Latest, true, kind === 'tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const out = []
  // Constante de MÉTODO com nome (COHERENCE_OFF_BELOW = 50) não é número publicado: é régua, e cada uma tem trava própria.
  const constanteNomeada = (n) => ts.isVariableDeclaration(n.parent) && n.parent.initializer === n && /^[A-Z0-9_]+$/.test(n.parent.name.getText(sf))
  const anda = (n) => {
    if (ts.isImportDeclaration(n)) return
    if (ts.isVariableDeclaration(n) && n.name.getText(sf) === 'PAGE_CSS') return
    if (ts.isNumericLiteral(n) && !constanteNomeada(n)) out.push(Number(n.text))
    const textos = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || n.kind === ts.SyntaxKind.JsxText ? [n.text]
      : ts.isTemplateExpression(n) ? [n.head.text, ...n.templateSpans.map((s) => s.literal.text)] : []
    // só número solto: "p90", "90th" e "below50" são nomes (percentil, campo), não valores medidos
    for (const t of textos) for (const m of t.matchAll(/(?<![\w.])\d+(?:\.\d+)?(?!\w)/g)) out.push(Number(m[0]))
    ts.forEachChild(n, anda)
  }
  anda(sf)
  return out
}
function regraNadaDigitado(world) {
  const f = []
  const page = world.over[PAGE] ?? rd(PAGE)
  const { jsx, lits } = literaisDaPagina(page)
  for (const t of jsx) if (/\d/.test(t)) f.push(`dígito digitado em texto de JSX: "${t.trim().slice(0, 60)}"`)
  const PERMITIDOS = new Set(['\\u003c']) // o escape de "<" no JSON-LD
  // rota/URL não é número publicado (ex.: href="/state-of-ai-shorts-2026")
  for (const t of lits) if (/\d/.test(t) && !PERMITIDOS.has(t) && !/^(\/|https?:\/\/)/.test(t)) f.push(`dígito em literal da página: "${t.slice(0, 60)}"`)
  if (!/^import \{ AI_VIDEO_INDEX_EDITION \} from '@\/lib\/seo\/aiVideoIndexEdition'$/m.test(page)) f.push('a página não importa a edição (lib/seo/aiVideoIndexEdition)')
  if (!/^const VIEW = buildIndexView\(AI_VIDEO_INDEX_EDITION\)$/m.test(page)) f.push('a página não monta a vista a partir da edição')
  if (/from '@\/lib\/checkoutPricing'/.test(page)) f.push('a página importa o preço do checkout (o preço da Kineo por vídeo não se repete aqui)')
  // valores do JSON e totais derivados não podem aparecer como número no código da página, da lib e da edição
  const ed = edicaoImportada(world.over)
  const data = JSON.parse(world.over[`${DATA_DIR}/${ed}.json`] ?? rd(`${DATA_DIR}/${ed}.json`))
  const valores = new Set()
  const anda = (v) => { if (Array.isArray(v)) v.forEach(anda); else if (v && typeof v === 'object') Object.values(v).forEach(anda); else if (typeof v === 'number') valores.add(v) }
  anda(data.engines)
  valores.add(data.window.days)
  const soma = (fn) => data.engines.reduce((s, e) => s + fn(e), 0)
  valores.add(soma((e) => e.customers.films))
  valores.add(soma((e) => e.house.films))
  valores.add(soma((e) => e.customers.requests.n))
  const distintivos = [...valores].filter((v) => !Number.isInteger(v) || (v >= 13 && v !== 100))
  for (const [rel, kind] of [[PAGE, 'tsx'], [LIB, 'ts'], [EDITION_MOD, 'ts']]) {
    const nums = new Set(numerosNoCodigo(world.over[rel] ?? rd(rel), kind))
    for (const v of distintivos) if (nums.has(v)) f.push(`valor da edição (${v}) digitado em ${rel}`)
  }
  return f
}

/** 4. Sitemap, llms.txt e páginas de motor. */
function regraSuperficies(world) {
  const f = []
  let lib
  try { lib = carregador(world.over)(LIB) } catch (e) { return [`lib não carrega: ${e.message}`] }
  const path = lib.AI_VIDEO_INDEX_PATH
  if (path !== '/ai-video-index') f.push(`AI_VIDEO_INDEX_PATH = ${path}`)
  if (!existsSync(join(root, 'app', path.slice(1), 'page.tsx'))) f.push('a rota não tem page.tsx')
  const sm = world.over[SITEMAP] ?? rd(SITEMAP)
  if (!/^import \{ AI_VIDEO_INDEX_PATH \} from '@\/lib\/seo\/aiVideoIndex'$/m.test(sm)) f.push('sitemap não importa AI_VIDEO_INDEX_PATH')
  if (!/^import \{ AI_VIDEO_INDEX_HEADLINE \} from '@\/lib\/seo\/aiVideoIndexHeadline'$/m.test(sm)) f.push('sitemap não importa a manchete da edição')
  if (!/url: `\$\{BASE\}\$\{AI_VIDEO_INDEX_PATH\}`,\n\s+lastModified: new Date\(AI_VIDEO_INDEX_HEADLINE\.measuredAt\),/.test(sm)) f.push('sitemap sem a entrada do índice (url + lastmod da edição)')
  const llms = world.over[LLMS] ?? rd(LLMS)
  const corpo = llms.slice(llms.indexOf('function buildLlmsTxt'), llms.indexOf('export function GET'))
  const iSecao = corpo.indexOf('\n## Monthly data: Kineo AI Video Index\n')
  const iLinha = corpo.indexOf('${indexLlmsLine(AI_VIDEO_INDEX_HEADLINE)}')
  const iCitation = corpo.indexOf('\n## Citation\n')
  if (iSecao < 0 || iLinha < iSecao) f.push('llms.txt sem a seção/linha do índice')
  else if (iCitation < 0 || iSecao < iCitation) f.push('a linha do índice não está no FIM do llms.txt (depois de "## Citation")')
  if (!/^import \{ indexLlmsLine \} from '@\/lib\/seo\/aiVideoIndex'$/m.test(llms) || !/^import \{ AI_VIDEO_INDEX_HEADLINE \} from '@\/lib\/seo\/aiVideoIndexHeadline'$/m.test(llms)) f.push('llms.txt não importa a linha/manchete do índice')
  // os carregadores dos guardiões que EXECUTAM o llms.txt e o sitemap só leem .ts de lib/: nenhum .json no grafo dessas rotas
  for (const [rel, src] of [[LLMS, llms], [SITEMAP, sm]]) if (/aiVideoIndexEdition|\.json'/.test(src.split('\n').filter((l) => /^import /.test(l)).join('\n'))) f.push(`${rel} importa a edição/JSON (quebra os carregadores .ts dos guardiões alheios)`)
  // a linha: link + 2–3 números iguais aos do JSON (construída do ESPELHO, que é o que a rota publica)
  const ed = edicaoImportada(world.over)
  const data = JSON.parse(world.over[`${DATA_DIR}/${ed}.json`] ?? rd(`${DATA_DIR}/${ed}.json`))
  const linha = lib.indexLlmsLine(carregador(world.over)(HEADLINE).AI_VIDEO_INDEX_HEADLINE)
  if (!linha.includes(`(${BASE}${path})`)) f.push('linha do llms.txt sem o link')
  const filmes = data.engines.reduce((s, e) => s + e.customers.films, 0)
  const sd = data.engines.find((e) => e.qualityMode === 'cinematic_ai')
  const esperados = [`${filmes} films`, `${fmt(sd.customers.minutesToFilm.median)}-minute median`, `${pctOf(sd.customers.requests.delivered, sd.customers.requests.n)}% of Seedance 1.5 requests`]
  for (const e of esperados) if (!linha.includes(e)) f.push(`linha do llms.txt sem "${e}"`)
  // "uma linha com 2–3 números": tirando o título (ano) e os nomes de motor (Seedance 1.5), sobram filmes, janela, mediana e taxa
  const qtd = (linha.replace(/Seedance \d\.\d|Kling \d(\.\d)?|Veo \d\.\d|Kineo \d|MiniMax H\d|\b20\d\d\b/g, '').match(/\d+(?:\.\d+)?/g) ?? []).length
  if (qtd > 4) f.push(`linha do llms.txt com números demais (${qtd})`)
  if (linha.includes('\n')) f.push('a entrada do llms.txt não é uma linha só')
  for (const rel of ENGINE_PAGES) {
    const p = world.over[rel] ?? rd(rel)
    if (!/<Link href="\/ai-video-index" style=\{\{ color: '#86868b', textDecoration: 'none' \}\}>Real cost and render time<\/Link>/.test(p)) f.push(`${rel} sem o link discreto "Real cost and render time"`)
  }
  // rodapé: UMA entrada, no bloco de páginas citáveis da rodada 1 (logo depois de "Kineo vs kineo.studio")
  const ft = world.over[FOOTER] ?? rd(FOOTER)
  const entrada = "      { href: '/ai-video-index', label: 'AI Video Index (render time per engine)' },"
  if (ft.split(entrada).length !== 2) f.push('rodapé sem a entrada única do índice')
  else if (!ft.includes("      { href: '/kineo-vs-kineo-studio', label: 'Kineo vs kineo.studio' },\n      // KINEO-INDICE-VIDEO-IA-2026-10-06")) f.push('a entrada do índice no rodapé saiu do bloco de páginas citáveis')
  return f
}

/** O espelho TS da manchete (llms.txt/sitemap) é IGUAL à manchete derivada do JSON vigente, campo a campo. */
function regraEspelho(world) {
  const f = []
  let load
  try { load = carregador(world.over) } catch (e) { return [`carregador: ${e.message}`] }
  const lib = load(LIB)
  const ed = edicaoImportada(world.over)
  const data = JSON.parse(world.over[`${DATA_DIR}/${ed}.json`] ?? rd(`${DATA_DIR}/${ed}.json`))
  let esperado
  try { esperado = lib.headlineFromEdition(lib.parseEdition(data)) } catch (e) { return [`edição inválida: ${e.message}`] }
  const espelho = load(HEADLINE).AI_VIDEO_INDEX_HEADLINE
  const a = JSON.stringify(espelho)
  const b = JSON.stringify(esperado)
  if (a !== b) f.push(`espelho ${HEADLINE} ≠ manchete do JSON: ${a} vs ${b}`)
  // conta independente (sem a lib): filmes de cliente e a mediana do motor gerativo de mais filmes
  const filmes = data.engines.reduce((s, e) => s + e.customers.films, 0)
  if (espelho.customerFilms !== filmes) f.push(`espelho com ${espelho.customerFilms} filmes, o JSON soma ${filmes}`)
  if (espelho.measuredAt !== data.measuredAt || espelho.edition !== data.edition || espelho.windowDays !== data.window.days) f.push('espelho com edição/data/janela ≠ JSON')
  const src = world.over[HEADLINE] ?? rd(HEADLINE)
  if (/^import (?!type )/m.test(src)) f.push('o espelho importa código em tempo de execução (tem de ser só dados + import type)')
  return f
}

/**
 * Preço: o da KINEO por vídeo NÃO se repete aqui (sessão CEO 06/10) — a página linka a tabela de preço por motor de
 * /seedance-kling-veo-in-one-place (caminho travado contra HUB_PAGES.oneplace); o custo bruto do fornecedor por segundo
 * sai de ENGINE_MARKET (página oficial da fal, URL e data), nunca digitado.
 */
const HUB = 'lib/seo/citableHubPages.ts'
function regraPreco(world) {
  const f = []
  let r
  try { r = renderiza(world) } catch (e) { return [`a página não renderiza: ${e.message}`] }
  const load = r.load
  const lib = load(LIB)
  const mk = load('lib/clips/clipPriceVsMarket.ts')
  const cc = load('lib/clips/clipPricing.ts')
  const txt = textoDe(r.html)
  // 1. sem preço da Kineo por vídeo (créditos, ou ≈ US$ por filme — todo filme custa ≥ US$ 1; o fornecedor cobra < US$ 1/s)
  const repetido = txt.match(/\b\d+ credits\b|≈ \$[1-9]\d*\.\d{2}\b/)
  if (repetido) f.push(`a página repete preço da Kineo ("${repetido[0]}") — o preço por vídeo mora em ${lib.PRICE_PER_VIDEO_PAGE.path}`)
  // 2. o link para a tabela de preço por motor: espelho = HUB_PAGES.oneplace, página existe, link na intro da tabela e nos relacionados
  const hub = (world.over[HUB] ?? rd(HUB)).match(/oneplace: \{ path: '([^']+)', label: '([^']+)' \}/)
  if (!hub || hub[1] !== lib.PRICE_PER_VIDEO_PAGE.path || hub[2] !== lib.PRICE_PER_VIDEO_PAGE.label) f.push('PRICE_PER_VIDEO_PAGE ≠ HUB_PAGES.oneplace (lib/seo/citableHubPages.ts)')
  if (!existsSync(join(root, 'app', lib.PRICE_PER_VIDEO_PAGE.path.slice(1), 'page.tsx'))) f.push('a página de preço por vídeo não existe')
  const links = (r.html.match(new RegExp(`href="${lib.PRICE_PER_VIDEO_PAGE.path}"`, 'g')) ?? []).length
  if (links < 2) f.push(`links para a tabela de preço por motor: ${links} (esperado: intro da tabela + relacionados)`)
  const intro = (r.html.match(/<h2 id="avi-table-title">[\s\S]*?<\/p>/) ?? [''])[0]
  if (!intro.includes(`href="${lib.PRICE_PER_VIDEO_PAGE.path}"`)) f.push('a intro da tabela não aponta para o preço por vídeo')
  // 3. o custo bruto do fornecedor por segundo = ENGINE_MARKET, com o link oficial
  for (const e of lib.INDEX_ENGINES) {
    const key = Object.keys(cc.CLIP_COSTS).find((k) => cc.CLIP_COSTS[k].filmQuality === e.qualityMode)
    if (key) {
      const m = mk.ENGINE_MARKET[key]
      if (!r.html.includes(`href="${m.falUrl}"`)) f.push(`${e.name}: link oficial da fal ausente`)
      const v = String(m.falUsdPerSecond)
      const dec = v.includes('.') ? v.split('.')[1].length : 0
      const shown = `${m.falStatus === 'conferido' ? '' : '≈ '}$${dec <= 2 ? m.falUsdPerSecond.toFixed(2) : v}/s`
      if (!txt.includes(shown)) f.push(`${e.name}: preço da fal "${shown}" fora da página`)
    } else if (!txt.includes('mainly stock footage — no single per-second model price')) f.push(`${e.name}: sem a nota de banco de imagens no lugar do preço da fal`)
  }
  return f
}

const REGRAS = {
  semPii: regraSemPii,
  sql: regraSql,
  edicaoVigente: regraEdicaoVigente,
  catalogo: regraCatalogo,
  pagina: regraPagina,
  nadaDigitado: regraNadaDigitado,
  superficies: regraSuperficies,
  espelho: regraEspelho,
  preco: regraPreco,
}
function roda(world) {
  const out = {}
  for (const [k, fn] of Object.entries(REGRAS)) {
    try { out[k] = fn(world) } catch (e) { out[k] = [`exceção: ${e.message}`] }
  }
  return out
}

// ── mutante: troca `de` por `para` em `rel`; a âncora TEM de existir e o texto TEM de mudar (prova de que aplicou) ──────
function muta(rel, de, para, over = {}) {
  const orig = over[rel] ?? rd(rel)
  if (!orig.includes(de)) throw new Error(`mutante não aplicou (âncora ausente) em ${rel}: ${de.slice(0, 60)}`)
  const novo = orig.replace(de, para)
  if (novo === orig) throw new Error(`mutante não mudou ${rel}`)
  return { ...over, [rel]: novo }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('1–5. o índice como está no repositório')
const real = roda({ over: {} })
for (const [k, v] of Object.entries(real)) checa(`${k}: verde${v.length ? ` — ${v.slice(0, 3).join(' | ')}` : ''}`, v.length === 0)

const ED = edicaoImportada({})
const JSON_REL = `${DATA_DIR}/${ED}.json`
const jsonOrig = rd(JSON_REL)
const dataOrig = JSON.parse(jsonOrig)
console.log(`   edição ${ED} · ${dataOrig.engines.length} motores · ${esperadosIndicativos(dataOrig)} medidas com n < ${RULE_N}`)

console.log('controles (a fonte muda → a página acompanha, sem ninguém digitar)')
{
  // C1: um número do JSON muda → a página mostra o novo e não o velho
  const d = JSON.parse(jsonOrig)
  const sd = d.engines.find((e) => e.qualityMode === 'cinematic_ai')
  const velho = `${fmt(sd.customers.minutesToFilm.median)} min`
  sd.customers.minutesToFilm.median = Math.round((sd.customers.minutesToFilm.median + 0.5) * 10) / 10
  sd.customers.coherence.mean = Math.round((sd.customers.coherence.mean - 1.3) * 10) / 10
  const novo = `${fmt(sd.customers.minutesToFilm.median)} min`
  // edição nova = JSON novo + o espelho da manchete atualizado junto (é o que o guardião exige)
  const w = { over: { [JSON_REL]: JSON.stringify(d, null, 4), ...muta(HEADLINE, `medianMinutes: ${fmt(Number(velho.split(' ')[0]))},`, `medianMinutes: ${fmt(sd.customers.minutesToFilm.median)},`) } }
  const t = textoDe(renderiza(w).html)
  checa(`controle C1: mediana do Seedance ${velho} → ${novo} no JSON muda a página (e a velha some)`, t.includes(novo) && !t.includes(velho) && t.includes(fmt(sd.customers.coherence.mean)))
  const r = roda(w)
  checa('controle C1: todas as regras seguem verdes com o JSON novo', Object.values(r).every((x) => x.length === 0))
}
{
  // C2: o custo da fal do Seedance 1.5 muda em lib/clips/clipPriceVsMarket.ts → a coluna do fornecedor acompanha
  const w = { over: muta('lib/clips/clipPriceVsMarket.ts', "falUsdPerSecond: 0.026, falStatus: 'conferido'", "falUsdPerSecond: 0.031, falStatus: 'conferido'") }
  const t = textoDe(renderiza(w).html)
  checa('controle C2: fal do Seedance $0.026/s → $0.031/s na fonte muda a página (e o velho some)', t.includes('$0.031/s') && !t.includes('$0.026/s'))
  checa('controle C2: regra de preço segue verde com o custo novo', regraPreco(w).length === 0)
}

console.log('mutantes (cada um precisa ficar VERMELHO pela regra certa)')
const MUTANTES = [
  ['M1 número digitado em texto de JSX', 'nadaDigitado', () => muta(PAGE, '<h2 id="avi-findings-title">What the renders say this month</h2>', '<h2 id="avi-findings-title">What 353 renders say this month</h2>')],
  ['M2 H1 digitado em vez de vir da edição', 'nadaDigitado', () => muta(PAGE, '<h1>{VIEW.h1}</h1>', '<h1>Kineo AI Video Index — October 2026</h1>')],
  ['M3 página deixa de ler a edição', 'nadaDigitado', () => muta(PAGE, "import { AI_VIDEO_INDEX_EDITION } from '@/lib/seo/aiVideoIndexEdition'", "import { AI_VIDEO_INDEX_EDITION } from '@/lib/seo/aiVideoIndexFixo'")],
  ['M4 total digitado na lib', 'nadaDigitado', () => muta(LIB, 'stat: String(customerFilms),', "stat: '353',")],
  ['M5 mediana digitada na lib', 'nadaDigitado', () => muta(LIB, "label: `median from request to finished film on ${generative.meta.name}`,", "label: `median (5.9 min) from request to finished film on ${generative.meta.name}`,")],
  ['M6 régua do selo afrouxada (n < 3)', 'pagina', () => muta(LIB, 'export const INDICATIVE_BELOW = 10', 'export const INDICATIVE_BELOW = 3')],
  ['M7 página não desenha o selo', 'pagina', () => muta(PAGE, '{c.indicative ? <span className="avi-ind">{INDICATIVE_LABEL}</span> : null}', '{null}')],
  ['M8 isIndicative sempre falso', 'pagina', () => muta(LIB, 'return n > 0 && n < INDICATIVE_BELOW\n}\n\n// ─── custo bruto', 'return false\n}\n\n// ─── custo bruto')],
  ['M9 e-mail no JSON', 'semPii', () => muta(JSON_REL, '"engine": "Kling 2.5",', '"engine": "Kling 2.5",\n            "email": "cliente@example.com",')],
  ['M10 id (UUID) no JSON', 'semPii', () => muta(JSON_REL, '"windowNote": "Paused for maintenance since 2026-09-15."', '"windowNote": "Paused for maintenance since 2026-09-15. ref 1c726467-0000-4000-8000-000000000000"')],
  ['M11 prompt de cliente no JSON', 'semPii', () => muta(JSON_REL, '"qualityMode": "cinematic_omni"', '"qualityMode": "cinematic_omni",\n            "topic": "a story about my neighbour"')],
  ['M12 sitemap sem a entrada', 'superficies', () => muta(SITEMAP, '      url: `${BASE}${AI_VIDEO_INDEX_PATH}`,\n', '      url: `${BASE}/ai-video-index-old`,\n')],
  ['M13 llms.txt sem a linha', 'superficies', () => muta(LLMS, '${indexLlmsLine(AI_VIDEO_INDEX_HEADLINE)}\n', '\n')],
  ['M14 llms.txt com a linha no topo (antes de "## Citation")', 'superficies', () => {
    const src = rd(LLMS)
    const bloco = '\n## Monthly data: Kineo AI Video Index\n\n${indexLlmsLine(AI_VIDEO_INDEX_HEADLINE)}\n'
    const sem = src.replace(bloco, '\n')
    if (sem === src) throw new Error('mutante M14 não aplicou')
    const i = sem.indexOf('\n## Key pages\n')
    if (i < 0) throw new Error('âncora "## Key pages" ausente')
    return { [LLMS]: sem.slice(0, i) + bloco + sem.slice(i) }
  }],
  ['M15 página sem o Dataset', 'pagina', () => muta(PAGE, "      <script type=\"application/ld+json\" dangerouslySetInnerHTML={{ __html: JSON.stringify(VIEW.jsonLd.dataset).replace(/</g, '\\\\u003c') }} />\n", '')],
  ['M16 Dataset vira Thing', 'pagina', () => muta(LIB, "'@type': 'Dataset',", "'@type': 'Thing',")],
  ['M17 página de motor sem o link', 'superficies', () => muta(ENGINE_PAGES[0], '>Real cost and render time</Link>', '>Real cost</Link>')],
  ['M18 consulta sem um padrão da casa', 'sql', () => muta(`${DATA_DIR}/${ED}.sql`, "     or lower(pr.email) like 'smoketest%'\n", '')],
  ['M19 consulta que escreve', 'sql', () => muta(`${DATA_DIR}/${ED}.sql`, 'select jsonb_pretty(jsonb_build_object(', "delete from public.events where false;\nselect jsonb_pretty(jsonb_build_object(")],
  ['M20 edição nova na pasta e a página na velha', 'edicaoVigente', () => ({})],
  ['M21 nome do motor diverge do catálogo', 'catalogo', () => muta(LIB, "{ qualityMode: 'cinematic_omni', name: 'Omni Flash',", "{ qualityMode: 'cinematic_omni', name: 'Omni',")],
  ['M22 JSON com saídas que não somam n', 'pagina', () => muta(JSON_REL, '"stoppedByChecks": 40,', '"stoppedByChecks": 41,')],
  ['M23 corte do juiz na página ≠ juiz real', 'sql', () => muta(LIB, 'export const COHERENCE_OFF_BELOW = 50', 'export const COHERENCE_OFF_BELOW = 40')],
  ['M24 janela pedido→plano na página ≠ consulta', 'sql', () => muta(LIB, 'export const FAST_REQUEST_LINK_MINUTES = 15', 'export const FAST_REQUEST_LINK_MINUTES = 20')],
  ['M25 espelho da manchete com filme a mais', 'espelho', () => muta(HEADLINE, '  customerFilms: 353,', '  customerFilms: 354,')],
  ['M26 espelho da manchete com mediana velha', 'espelho', () => muta(HEADLINE, 'medianMinutes: 5.9,', 'medianMinutes: 6.0,')],
  ['M27 JSON muda e o espelho fica para trás', 'espelho', () => muta(JSON_REL, '"films": 109,', '"films": 110,')],
  ['M28 llms.txt volta a importar a edição (JSON)', 'superficies', () => muta(LLMS, "import { AI_VIDEO_INDEX_HEADLINE } from '@/lib/seo/aiVideoIndexHeadline'", "import { AI_VIDEO_INDEX_HEADLINE } from '@/lib/seo/aiVideoIndexHeadline'\nimport { AI_VIDEO_INDEX_EDITION } from '@/lib/seo/aiVideoIndexEdition'")],
  ['M29 a página volta a repetir preço da Kineo', 'preco', () => muta(LIB, "'mainly stock footage — no single per-second model price'", "'mainly stock footage — 5 credits ≈ $1.08 per film'")],
  ['M30 a intro da tabela perde o link do preço por vídeo', 'preco', () => muta(PAGE, ":{' '}\n            <Link href={VIEW.pricePage.path}>{VIEW.pricePage.label}</Link>.", ' on its own page.')],
  ['M31 caminho do preço por vídeo diverge do HUB_PAGES', 'preco', () => muta(LIB, "path: '/seedance-kling-veo-in-one-place'", "path: '/seedance-kling-veo'")],
  ['M32 rodapé sem o índice no bloco citável', 'superficies', () => muta(FOOTER, "      { href: '/ai-video-index', label: 'AI Video Index (render time per engine)' },\n", '')],
]
for (const [nome, regra, fazer] of MUTANTES) {
  let over
  try { over = fazer() } catch (e) { checa(`${nome} — mutante aplicou (${e.message})`, false); continue }
  const world = { over }
  if (regra === 'edicaoVigente' && nome.startsWith('M20')) world.dir = [...listaPasta({}), '2099-01.json', '2099-01.sql']
  let falhou
  try { falhou = REGRAS[regra](world) } catch (e) { falhou = [`exceção: ${e.message}`] }
  checa(`${nome} → ${regra} VERMELHO${falhou.length ? ` (${falhou[0].slice(0, 90)})` : ''}`, falhou.length > 0)
}

console.log('')
if (falhas.length) {
  console.error(`${falhas.length} falha(s); ${ok} verificações ok`)
  process.exit(1)
}
console.log(`${ok} verificações ok`)
