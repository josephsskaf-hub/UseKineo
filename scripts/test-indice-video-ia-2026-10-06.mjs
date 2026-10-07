// KINEO-INDICE-VIDEO-IA-2026-10-06 — guardião do "Kineo AI Video Index" (/ai-video-index, fundador 06/10: "vai índice").
// O que ele prova — tudo EXECUTADO sobre o código real (readFileSync + typescript + vm + react-dom/server), sem rede, sem
// banco e sem alias '@/' no próprio guardião (o carregador mínimo resolve caminhos relativos e '@/…' para arquivos):
//   1. A PÁGINA LÊ O JSON: o server HTML é renderizado a partir de data/ai-video-index/<edição>.json; trocar um número no
//      JSON (controle) muda a página; trocar o custo da fal em lib/clips/clipPriceVsMarket.ts muda a tabela do fornecedor.
//      O PREÇO DA KINEO por vídeo NÃO se repete: a página linka /seedance-kling-veo-in-one-place (travado contra
//      HUB_PAGES.oneplace). Nenhum dígito em texto de JSX e nenhum valor do JSON digitado na página, na lib ou na edição.
//   2. n < 10 MARCADO: toda medida exibida com amostra "<10" sai com o selo "indicative" (contagem independente do JSON).
//   3. SEM DADO PESSOAL no JSON: só chaves conhecidas, nenhum e-mail, id/UUID, URL, prompt ou texto de cliente.
//   4. SITEMAP E LLMS.TXT: entrada no sitemap com a data da edição; a linha do índice no FIM do llms.txt (depois de
//      "## Citation"), com o link e números iguais aos do JSON; link discreto "Real cost and render time" nas páginas de
//      motor; uma entrada no bloco de páginas citáveis do rodapé.
//   5. SCHEMA: Article + Dataset (+ FAQPage) no HTML, coerentes com a edição.
// V2 (sessão CEO 06/10, antes de publicar):
//   6. SEM VOLUME ABSOLUTO no JSON, no espelho da manchete, na página (texto e JSON-LD) e no llms.txt: nenhuma contagem
//      ("353 films", "n = 109"), nenhuma participação de uso ("98.6% of films came from…"); a amostra só como faixa
//      ("100+", "10-99", "<10") e a faixa escrita SÓ na metodologia.
//   7. KINEO 1 FORA: nenhum motor 'fast' no JSON nem no índice; "Kineo 1" aparece UMA vez na página, na frase exata de
//      exclusão; nunca no JSON-LD nem no llms.txt.
//   8. DESCONHECIDO > 20% = "not enough data": a célula de confiabilidade diz "not enough data" e a taxa não aparece em
//      lugar nenhum (página, FAQ, JSON-LD, llms.txt) — mesmo que o JSON traga o número.
//   9. "Kineo internal test renders, indicative": motor sem bloco de cliente só aparece ali, com tempo e duração e NENHUMA
//      taxa; 4–5 achados no topo (tempo com p90, duração, coerência com a régua, custo do fornecedor com fonte e data, link
//      do preço por filme).
//   + a consulta salva ao lado é só leitura, tem a mesma janela do JSON, a MESMA lista de contas da casa de
//     lib/internalAccounts.ts e os MESMOS cortes da lib (juiz, desconhecido, faixas); o módulo da edição aponta para o JSON
//     mais novo da pasta; os motores batem com o catálogo.
// Cada regra tem mutante EM MEMÓRIA (o mutante prova que aplicou: a âncora tem de existir e o texto tem de mudar) que
// precisa ficar VERMELHO pelo motivo certo, e controles que precisam ficar VERDES com o valor novo.
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
const HUB = 'lib/seo/citableHubPages.ts'
const BASE = 'https://www.usekineo.com'
// As decisões, escritas AQUI de forma independente da lib (a lib tem de bater com elas, nunca o contrário):
const RULE_N = 10 // pedido do fundador: amostra com n < 10 aparece marcada; sessão CEO: abaixo disso, sem bloco de cliente
const UNKNOWN_MAX = 20 // sessão CEO 06/10: desfecho desconhecido acima de 20% dos renders = "not enough data"
const NOT_COVERED = 'Kineo 1 (stock-footage assembly) is not a generative engine and is not covered.'
const TEST_LABEL = 'Kineo internal test renders, indicative'
const BANDAS = { '100+': 'n ≥ 100', '10-99': `n ${RULE_N}–99`, '<10': `n < ${RULE_N} — indicative` }

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
const fmt = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1))
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** O trecho <section>…</section> que contém o id dado ('' se não houver). */
function secao(html, id) {
  const i = html.indexOf(`id="${id}"`)
  if (i < 0) return ''
  const ini = html.lastIndexOf('<section', i)
  const fim = html.indexOf('</section>', i)
  return ini < 0 || fim < 0 ? '' : html.slice(ini, fim + '</section>'.length)
}
/** Linhas de tabela de uma seção: { html, texto, celulas[] } (texto começa pelo nome do motor). */
function linhas(sec) {
  return [...sec.matchAll(/<tr><th scope="row">([\s\S]*?)<\/tr>/g)].map((x) => ({
    html: x[1],
    texto: textoDe(x[1]),
    celulas: [...x[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => textoDe(c[1])),
  }))
}
function jsonLds(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => { try { return JSON.parse(x[1]) } catch { return null } })
}
/** Todas as strings de um objeto (para varrer o JSON-LD como texto público). */
function strings(v, out = []) {
  if (Array.isArray(v)) v.forEach((x) => strings(x, out))
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out))
  else if (typeof v === 'string') out.push(v)
  return out
}

// ── volume: o que conta como "volume absoluto" em texto público ─────────────────────────────────────────────────────
const NOMES_DE_MOTOR = /Seedance \d\.\d|Kling \d(?:\.\d)?|Veo \d\.\d|MiniMax H\d|Kineo \d/g
const VOLUME_CONTAGEM = /(?<![\w.$≈/-])\d[\d,]*(?:\.\d+)?\s+(?:customer\s+|house\s+|delivered\s+|finished\s+|test\s+|scored\s+|started\s+)?(?:films?|videos?|renders?|requests?|creators?|people|persons?|customers?|accounts?|users?|generations?|clips?|movies?)\b/gi
const N_IGUAL = /\bn\s*=\s*\d/gi
const PARTICIPACAO = /\d+(?:\.\d+)?\s*%\s+(?:of\s+(?:all\s+)?(?:the\s+)?(?:customer\s+|house\s+|delivered\s+|finished\s+)?(?:films|videos|renders|requests|generations|usage|creators|customers|users|accounts)\b|(?:came|come|comes)\s+from\b|(?:were|was)\s+(?:made|rendered|generated|created)\s+(?:on|with|by|in)\b)/gi
const FAIXA_ESCRITA = /\bn\s*(?:≥|>=|<|≤|<=)\s*\d|\bn \d+\s*[–-]\s*\d+/
function volumeNoTexto(texto) {
  const t = texto.replace(NOMES_DE_MOTOR, ' ')
  return [...t.matchAll(VOLUME_CONTAGEM), ...t.matchAll(N_IGUAL), ...t.matchAll(PARTICIPACAO)].map((m) => m[0].trim())
}
const CHAVE_DE_VOLUME = /^(n|films?|creators?|requests?|delivered|failed|started|unknown|stoppedByChecks|noOutcomeRecorded|below\d+|count|total|houseAccounts|share|accounts|users|people|customerFilms|timedFilms|sampleSize)$/i

// ── o "mundo": edição vigente (o arquivo que o módulo da edição importa) + listagem da pasta (sobrescrevível) ──────────
function edicaoImportada(over) {
  const m = (over[EDITION_MOD] ?? rd(EDITION_MOD)).match(/^import\s+\w+\s+from\s+'\.\.\/\.\.\/data\/ai-video-index\/(\d{4}-\d{2})\.json'/m)
  return m ? m[1] : null
}
function listaPasta(world) {
  return world.dir ?? readdirSync(join(root, DATA_DIR)).sort()
}
function dadosDa(world) {
  const ed = edicaoImportada(world.over)
  return JSON.parse(world.over[`${DATA_DIR}/${ed}.json`] ?? rd(`${DATA_DIR}/${ed}.json`))
}
/** O motor-manchete: o primeiro do índice (ordem da lib) com bloco de cliente. */
function motorManchete(lib, data) {
  for (const m of lib.INDEX_ENGINES) {
    const e = data.engines.find((x) => x.qualityMode === m.qualityMode)
    if (e && e.customers) return { meta: m, e }
  }
  return null
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// As regras. Cada uma devolve a lista de falhas ([] = verde) para um mundo { over, dir }.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

/** 3. JSON sem dado pessoal (e só chaves conhecidas). */
const CHAVES = new Set(['schema', 'edition', 'measuredAt', 'window', 'start', 'end', 'days', 'engines', 'qualityMode', 'engine', 'windowNote', 'customers', 'house', 'durationSeconds', 'minutesToFilm', 'reliability', 'coherence', 'median', 'p90', 'mean', 'pct', 'unknownPct', 'offPct', 'sample'])
const PROIBIDA = /email|e_mail|user|^id$|_id$|Id$|uuid|prompt|topic|narration|script|title|ip_hash|country|url|session|render|generation/i
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
function regraSemPii(world) {
  const f = []
  let data
  try { data = dadosDa(world) } catch (e) { return [`JSON ilegível: ${e.message}`] }
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

/** 6. Sem volume absoluto: JSON, espelho da manchete, texto da página, JSON-LD e llms.txt; faixa só na metodologia. */
function regraSemVolume(world) {
  const f = []
  let data
  try { data = dadosDa(world) } catch (e) { return [`JSON ilegível: ${e.message}`] }
  // JSON: nenhuma chave de contagem; toda amostra é faixa
  const anda = (v, caminho) => {
    if (Array.isArray(v)) { v.forEach((x, i) => anda(x, `${caminho}[${i}]`)); return }
    if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (CHAVE_DE_VOLUME.test(k)) f.push(`contagem no JSON: ${caminho}.${k}`)
        if (k === 'sample' && !Object.hasOwn(BANDAS, x)) f.push(`amostra que não é faixa em ${caminho}.sample: ${JSON.stringify(x)}`)
        anda(x, `${caminho}.${k}`)
      }
    }
  }
  anda(data, '$')
  // espelho da manchete (llms.txt/sitemap): nenhuma chave de contagem
  let load
  try { load = carregador(world.over) } catch (e) { return [...f, `carregador: ${e.message}`] }
  try {
    const espelho = load(HEADLINE).AI_VIDEO_INDEX_HEADLINE
    anda(espelho, 'AI_VIDEO_INDEX_HEADLINE')
  } catch (e) { f.push(`espelho não carrega: ${e.message}`) }
  // página: texto e JSON-LD
  let html
  try { html = renderToStaticMarkup(React.createElement(load(PAGE).default)) } catch (e) { return [...f, `a página não renderiza: ${e.message}`] }
  const txt = textoDe(html)
  for (const v of volumeNoTexto(txt)) f.push(`volume no texto da página: "${v}"`)
  const ldTexto = jsonLds(html).flatMap((l) => strings(l)).join(' \n ')
  for (const v of volumeNoTexto(ldTexto)) f.push(`volume no JSON-LD: "${v}"`)
  // faixa de amostra escrita SÓ na metodologia (que precisa ter a legenda e a faixa de cada motor)
  const metodo = secao(html, 'avi-method-title')
  const fora = textoDe(html.replace(metodo, ' '))
  const faixaFora = fora.match(FAIXA_ESCRITA)
  if (faixaFora) f.push(`faixa de amostra fora da metodologia: "${faixaFora[0]}"`)
  if (FAIXA_ESCRITA.test(ldTexto)) f.push('faixa de amostra no JSON-LD (só na metodologia)')
  const tMetodo = textoDe(metodo)
  for (const b of Object.values(BANDAS)) if (!tMetodo.includes(b)) f.push(`a metodologia não dá a legenda "${b}"`)
  let lib
  try { lib = load(LIB) } catch (e) { return [...f, `lib não carrega: ${e.message}`] }
  for (const m of lib.INDEX_ENGINES) {
    const e = data.engines.find((x) => x.qualityMode === m.qualityMode)
    if (!e) continue
    const amostras = e.customers
      ? [e.customers.minutesToFilm.sample, e.customers.durationSeconds.sample, e.customers.reliability?.sample, e.customers.coherence?.sample].filter(Boolean)
      : e.house ? [e.house.minutesToFilm.sample, e.house.durationSeconds.sample] : []
    if (!amostras.length) continue
    const unicas = [...new Set(amostras)]
    if (unicas.length === 1) {
      const trecho = e.customers ? `${m.name}, customer renders: ${BANDAS[unicas[0]]}` : null
      if (trecho && !tMetodo.includes(trecho)) f.push(`a metodologia não dá a faixa de ${m.name} ("${trecho}")`)
      if (!e.customers && !new RegExp(`${esc(m.name)}[^;]*Kineo internal test renders: ${esc(BANDAS[unicas[0]])}`).test(tMetodo)) f.push(`a metodologia não dá a faixa dos renders de teste de ${m.name}`)
    } else if (!tMetodo.includes(m.name)) f.push(`a metodologia não dá as faixas de ${m.name}`)
  }
  // llms.txt: a linha publicada (construída do espelho)
  try {
    const linha = lib.indexLlmsLine(load(HEADLINE).AI_VIDEO_INDEX_HEADLINE)
    for (const v of volumeNoTexto(linha)) f.push(`volume na linha do llms.txt: "${v}"`)
    if (FAIXA_ESCRITA.test(linha)) f.push('faixa de amostra na linha do llms.txt')
  } catch (e) { f.push(`linha do llms.txt: ${e.message}`) }
  return f
}

/** 7. Kineo 1 fora: nada no JSON nem no índice; uma única menção, a frase exata de exclusão, só na metodologia. */
function regraSemKineo1(world) {
  const f = []
  let data
  try { data = dadosDa(world) } catch (e) { return [`JSON ilegível: ${e.message}`] }
  if (data.engines.some((e) => e.qualityMode === 'fast')) f.push('o JSON traz o Kineo 1 (quality_mode fast)')
  if (/Kineo 1\b/.test(JSON.stringify(data))) f.push('o JSON menciona o Kineo 1')
  const load = carregador(world.over)
  let lib
  try { lib = load(LIB) } catch (e) { return [...f, `lib não carrega: ${e.message}`] }
  if (lib.INDEX_ENGINES.some((e) => e.qualityMode === 'fast' || /Kineo 1\b/.test(e.name))) f.push('INDEX_ENGINES traz o Kineo 1')
  if (lib.NOT_COVERED_LINE !== NOT_COVERED) f.push(`NOT_COVERED_LINE ≠ a frase decidida ("${NOT_COVERED}")`)
  let html
  try { html = renderToStaticMarkup(React.createElement(load(PAGE).default)) } catch (e) { return [...f, `a página não renderiza: ${e.message}`] }
  const txt = textoDe(html)
  const vezes = (txt.match(/Kineo 1\b/g) ?? []).length
  if (vezes !== 1) f.push(`"Kineo 1" aparece ${vezes}× na página (esperado: 1, a frase de exclusão)`)
  if (!textoDe(secao(html, 'avi-method-title')).includes(NOT_COVERED)) f.push('a metodologia não tem a frase exata de exclusão do Kineo 1')
  if (/Kineo 1\b/.test(jsonLds(html).flatMap((l) => strings(l)).join(' '))) f.push('o JSON-LD menciona o Kineo 1')
  try {
    const espelho = load(HEADLINE).AI_VIDEO_INDEX_HEADLINE
    if (/Kineo 1\b/.test(lib.indexLlmsLine(espelho))) f.push('a linha do llms.txt menciona o Kineo 1')
  } catch (e) { f.push(`espelho: ${e.message}`) }
  return f
}

/** 8. Desfecho desconhecido acima de 20% dos renders = "not enough data" (e a taxa não aparece em lugar nenhum). */
function regraDesconhecido(world) {
  const f = []
  let data
  try { data = dadosDa(world) } catch (e) { return [`JSON ilegível: ${e.message}`] }
  const load = carregador(world.over)
  let lib
  try { lib = load(LIB) } catch (e) { return [`lib não carrega: ${e.message}`] }
  if (lib.UNKNOWN_SHARE_MAX !== UNKNOWN_MAX) f.push(`UNKNOWN_SHARE_MAX = ${lib.UNKNOWN_SHARE_MAX}; a decisão é ${UNKNOWN_MAX}%`)
  if (lib.NOT_ENOUGH_DATA !== 'not enough data') f.push('NOT_ENOUGH_DATA ≠ "not enough data"')
  let html
  try { html = renderToStaticMarkup(React.createElement(load(PAGE).default)) } catch (e) { return [...f, `a página não renderiza: ${e.message}`] }
  const txt = textoDe(html)
  const rows = linhas(secao(html, 'avi-table-title'))
  const lds = jsonLds(html)
  const ds = lds.find((l) => l && l['@type'] === 'Dataset')
  const faqTxt = strings(lds.find((l) => l && l['@type'] === 'FAQPage') ?? {}).join(' ')
  let linha = ''
  try { linha = lib.indexLlmsLine(load(HEADLINE).AI_VIDEO_INDEX_HEADLINE) } catch (e) { f.push(`espelho: ${e.message}`) }
  const manchete = motorManchete(lib, data)
  for (const e of data.engines) {
    const rel = e.customers?.reliability
    if (!rel) continue
    const row = rows.find((r) => r.texto.startsWith(e.engine))
    if (!row) { f.push(`${e.engine}: sem linha na tabela de clientes`); continue }
    const celula = row.celulas[2] ?? ''
    const semDado = rel.pct === null || rel.unknownPct > UNKNOWN_MAX
    if (semDado) {
      if (!celula.startsWith('not enough data')) f.push(`${e.engine}: ${fmt(rel.unknownPct)}% sem desfecho (> ${UNKNOWN_MAX}%) e a célula diz "${celula.slice(0, 40)}"`)
      if (rel.pct !== null) {
        const taxa = `${fmt(rel.pct)}%`
        if (txt.includes(taxa)) f.push(`${e.engine}: a taxa ${taxa} aparece na página mesmo com desconhecido acima do corte`)
        if (faqTxt.includes(taxa)) f.push(`${e.engine}: a taxa ${taxa} aparece no FAQ (JSON-LD)`)
        if (manchete && manchete.e === e && linha.includes(taxa)) f.push(`${e.engine}: a taxa ${taxa} aparece no llms.txt`)
      }
      if ((ds?.variableMeasured ?? []).some((v) => String(v.name).startsWith(e.engine) && /reliability/i.test(String(v.name)))) f.push(`${e.engine}: confiabilidade no Dataset mesmo sem dado`)
      if (manchete && manchete.e === e && /reliability/i.test(linha)) f.push(`${e.engine}: confiabilidade na linha do llms.txt mesmo sem dado`)
    } else if (!celula.startsWith(`${fmt(rel.pct)}%`)) f.push(`${e.engine}: confiabilidade ${fmt(rel.pct)}% fora da célula ("${celula.slice(0, 40)}")`)
  }
  return f
}

/** A consulta salva: só leitura, mesma janela/edição do JSON, mesma régua de contas da casa, do juiz e dos cortes. */
function regraSql(world) {
  const f = []
  const ed = edicaoImportada(world.over)
  const sqlRel = `${DATA_DIR}/${ed}.sql`
  if (!(world.over[sqlRel] !== undefined || existsSync(join(root, sqlRel)))) return [`sem ${sqlRel} ao lado do JSON`]
  const sql = world.over[sqlRel] ?? rd(sqlRel)
  const data = dadosDa(world)
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
  if (/'fast'/.test(semComentario)) f.push('a consulta ainda lista o Kineo 1 (fast)')
  // a saída não tem contagem (as contagens vivem nas CTEs e não saem)
  const saida = semComentario.slice(semComentario.indexOf('select jsonb_pretty('))
  const chaveContagem = saida.match(/'(n|films|creators|requests|delivered|failed|started|unknown|stoppedByChecks|noOutcomeRecorded|below50|houseAccounts|count|total)'\s*,/)
  if (chaveContagem) f.push(`a saída da consulta publica contagem ('${chaveContagem[1]}')`)
  // as réguas que a página CITA são as mesmas da consulta e do juiz (espelhos travados)
  let lib
  try { lib = carregador(world.over)(LIB) } catch (e) { return [...f, `lib não carrega: ${e.message}`] }
  if (!saida.includes(`'schema', '${lib.AI_VIDEO_INDEX_SCHEMA}'`)) f.push('schema da consulta ≠ AI_VIDEO_INDEX_SCHEMA')
  const corte = (rd(COHERENCE).match(/if \(score >= (\d+)\) return 'partial'/) ?? [])[1]
  if (Number(corte) !== lib.COHERENCE_OFF_BELOW) f.push(`COHERENCE_OFF_BELOW (${lib.COHERENCE_OFF_BELOW}) ≠ verdictFor de lib/fastCoherence.ts (${corte})`)
  if (!semComentario.includes(`s.score < ${lib.COHERENCE_OFF_BELOW}`)) f.push('a consulta conta "off" com outro corte')
  if (!semComentario.includes(`when 100.0 * rc.unknown / rc.started > ${lib.UNKNOWN_SHARE_MAX} then null`)) f.push(`corte do desconhecido na consulta ≠ UNKNOWN_SHARE_MAX (${lib.UNKNOWN_SHARE_MAX})`)
  if (!semComentario.includes(`coalesce(fc.time_n, 0) >= ${lib.INDICATIVE_BELOW} then`) || !semComentario.includes(`coalesce(fc.time_n, 0) < ${lib.INDICATIVE_BELOW} and`)) f.push(`corte do bloco de cliente na consulta ≠ INDICATIVE_BELOW (${lib.INDICATIVE_BELOW})`)
  if (!semComentario.includes(`(${lib.INDICATIVE_BELOW}, 99, '10-99'), (1, ${lib.INDICATIVE_BELOW - 1}, '<10')`)) f.push('faixas da consulta ≠ INDICATIVE_BELOW')
  if (lib.INDICATIVE_BELOW !== RULE_N) f.push(`INDICATIVE_BELOW = ${lib.INDICATIVE_BELOW}; a regra é n < ${RULE_N}`)
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

/** Os motores do índice = o catálogo das páginas de motor (nome, slug, quality_mode) — só os gerativos. */
function regraCatalogo(world) {
  const f = []
  let lib
  try { lib = carregador(world.over)(LIB) } catch (e) { return [`lib não carrega: ${e.message}`] }
  const cat = world.over[CATALOG] ?? rd(CATALOG)
  for (const e of lib.INDEX_ENGINES) {
    const chave = e.slug
    const ini = cat.search(new RegExp(`^\\s+(?:'${esc(chave)}'|${esc(chave)}): \\{`, 'm'))
    if (ini < 0) { f.push(`catálogo sem o motor ${chave}`); continue }
    const bloco = cat.slice(ini, ini + 400)
    if (!bloco.includes(`qualityMode: '${e.qualityMode}'`)) f.push(`${chave}: quality_mode ≠ catálogo`)
    if (!bloco.includes(`name: '${e.name}'`)) f.push(`${chave}: nome "${e.name}" ≠ catálogo`)
  }
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

/** Conta independente (a partir do JSON) das medidas exibidas que precisam do selo. */
function esperadosIndicativos(data) {
  let k = 0
  for (const e of data.engines) {
    const amostras = e.customers
      ? [e.customers.minutesToFilm.sample, e.customers.durationSeconds.sample, e.customers.reliability?.sample, e.customers.coherence?.sample]
      : e.house ? [e.house.minutesToFilm.sample, e.house.durationSeconds.sample] : []
    for (const s of amostras) if (s === '<10') k++
  }
  return k
}

/** 1 + 2 + 5 + 9. A página lê o JSON, separa cliente de teste, marca n < 10, traz os achados certos e o schema. */
function regraPagina(world) {
  const f = []
  let r
  try { r = renderiza(world) } catch (e) { return [`a página não renderiza: ${e.message}`] }
  const { html, load } = r
  const data = dadosDa(world)
  const txt = textoDe(html)
  const lib = load(LIB)
  // H1 e "Last updated" nascem da edição
  const [y, m] = data.edition.split('-').map(Number)
  const h1 = `${lib.AI_VIDEO_INDEX_NAME} — ${MESES[m - 1]} ${y}`
  if (!new RegExp(`<h1>${esc(h1)}</h1>`).test(html)) f.push(`H1 ≠ "${h1}"`)
  if (!txt.includes(`Last updated ${dataHumana(data.measuredAt)}`)) f.push('sem "Last updated <data da leitura>"')
  // tabela de CLIENTES: só motor com bloco de cliente, com tempo (mediana e p90), duração e coerência do JSON
  const cli = linhas(secao(html, 'avi-table-title'))
  const teste = linhas(secao(html, 'avi-test-title'))
  for (const e of data.engines) {
    const naCli = cli.find((l) => l.texto.startsWith(e.engine))
    const noTeste = teste.find((l) => l.texto.startsWith(e.engine))
    if (e.customers) {
      const c = e.customers
      for (const s of [c.minutesToFilm.sample, c.durationSeconds.sample, c.reliability?.sample, c.coherence?.sample]) if (s === '<10') f.push(`${e.engine}: bloco de cliente com amostra < ${RULE_N} (abaixo disso o motor só aparece nos renders de teste)`)
      if (!naCli) { f.push(`${e.engine}: sem linha na tabela de clientes`); continue }
      if (noTeste) f.push(`${e.engine}: tem bloco de cliente e aparece nos renders de teste`)
      if (!naCli.texto.includes(`${fmt(c.minutesToFilm.median)} min`) || !naCli.texto.includes(`p90 ${fmt(c.minutesToFilm.p90)} min`)) f.push(`${e.engine}: tempo (mediana/p90) fora da linha`)
      if (!naCli.texto.includes(`${fmt(c.durationSeconds.median)} s`)) f.push(`${e.engine}: duração fora da linha`)
      if (c.coherence && !(naCli.celulas[3] ?? '').startsWith(fmt(c.coherence.mean))) f.push(`${e.engine}: coerência fora da linha`)
    } else {
      if (naCli) f.push(`${e.engine}: sem bloco de cliente e aparece na tabela de clientes`)
      if (!e.house) continue
      if (!noTeste) { f.push(`${e.engine}: sem linha nos renders de teste`); continue }
      if (!noTeste.texto.includes(`${fmt(e.house.minutesToFilm.median)} min`) || !noTeste.texto.includes(`${fmt(e.house.durationSeconds.median)} s`)) f.push(`${e.engine}: tempo/duração dos renders de teste fora da linha`)
      if (noTeste.celulas.length !== 2) f.push(`${e.engine}: renders de teste com ${noTeste.celulas.length} colunas (só tempo e duração — nenhuma taxa)`)
      if (/%/.test(noTeste.texto)) f.push(`${e.engine}: taxa (%) nos renders de teste`)
    }
  }
  if (!new RegExp(`<h2 id="avi-test-title">${esc(TEST_LABEL)}</h2>`).test(html)) f.push(`a tabela da casa não se chama "${TEST_LABEL}"`)
  const cabTeste = [...secao(html, 'avi-test-title').matchAll(/<th scope="col">([^<]*)/g)].map((x) => x[1].trim())
  if (cabTeste.length !== 3 || cabTeste.some((c) => /reliab|coheren|deliver|rate/i.test(c))) f.push(`colunas dos renders de teste: ${cabTeste.join(' | ')} (só motor, tempo e duração)`)
  // 2. n < 10 marcado: contagem de selos no HTML = conta independente feita aqui
  const esperado = esperadosIndicativos(data)
  const noHtml = (html.match(/class="avi-ind"/g) ?? []).length
  if (noHtml !== esperado) f.push(`selos "indicative" no HTML: ${noHtml}, esperado ${esperado} (toda medida exibida com amostra < ${RULE_N})`)
  // 9. achados: 4–5, no topo; tempo com p90, duração, coerência com a régua, custo do fornecedor com fonte e data, e o link
  const fsec = secao(html, 'avi-findings-title')
  const cards = [...fsec.matchAll(/<article class="avi-finding(?: is-wide)?">([\s\S]*?)<\/article>/g)].map((x) => ({ html: x[1], texto: textoDe(x[1]), stat: decode((x[1].match(/<p class="avi-stat">([^<]*)<\/p>/) ?? [])[1] ?? '') }))
  if (cards.length < 4 || cards.length > 5) f.push(`achados: ${cards.length} (esperado 4–5)`)
  if (cards.filter((c) => /\d/.test(c.stat)).length < 4 && cards.length >= 4) f.push('menos de 4 achados com número')
  if (html.indexOf('class="avi-finding"') < 0 || html.indexOf('class="avi-finding"') > html.indexOf('class="avi-table')) f.push('os achados não vêm antes das tabelas')
  const lead = motorManchete(lib, data)
  if (lead) {
    const c = lead.e.customers
    const achado = (stat) => cards.find((k) => k.stat === stat)
    const tempo = achado(`${fmt(c.minutesToFilm.median)} min`)
    if (!tempo || !tempo.texto.includes(`${fmt(c.minutesToFilm.p90)} min (p90)`)) f.push('falta o achado do tempo até o filme (mediana + p90)')
    if (!achado(`${fmt(c.durationSeconds.median)} s`)) f.push('falta o achado da duração mediana')
    if (c.coherence) {
      const coh = achado(`${fmt(c.coherence.mean)} / 100`)
      if (!coh || !coh.texto.includes(`${lib.COHERENCE_COHERENT_FROM} or more reads as coherent`) || !coh.texto.includes(`under ${lib.COHERENCE_OFF_BELOW} as off`)) f.push('falta o achado da coerência com a régua explicada')
    }
  }
  const mk = load('lib/clips/clipPriceVsMarket.ts')
  const cc = load('lib/clips/clipPricing.ts')
  const precos = lib.INDEX_ENGINES.map((e) => Object.keys(cc.CLIP_COSTS).find((k) => cc.CLIP_COSTS[k].filmQuality === e.qualityMode)).filter(Boolean).map((k) => ({ k, m: mk.ENGINE_MARKET[k] }))
  const menor = [...precos].sort((a, b) => a.m.falUsdPerSecond - b.m.falUsdPerSecond)[0]
  if (menor) {
    const v = String(menor.m.falUsdPerSecond)
    const dec = v.includes('.') ? v.split('.')[1].length : 0
    const custo = cards.find((k) => k.stat === `$${dec <= 2 ? menor.m.falUsdPerSecond.toFixed(2) : v}/s`)
    const datas = [...new Set(precos.map((p) => (p.k === 's25' ? mk.MARKET_CHECKED_ON_S25 : mk.MARKET_CHECKED_ON)))].map(dataHumana)
    if (!custo || !custo.texto.includes('fal.ai') || datas.some((d) => !custo.texto.includes(d))) f.push('falta o achado do custo do fornecedor por segundo com fonte (fal.ai) e data')
  }
  if (!cards.some((k) => k.html.includes(`href="${lib.PRICE_PER_VIDEO_PAGE.path}"`))) f.push('falta o achado com o link do preço por filme')
  // metodologia e FAQ presentes; a confiabilidade explica o que ficou de fora e por quê
  const metodo = textoDe(secao(html, 'avi-method-title'))
  if ((secao(html, 'avi-method-title').match(/<li>/g) ?? []).length < 5) f.push('sem metodologia')
  for (const trecho of ['finished films ÷ (finished films + renders that failed with a recorded error)', 'only renders that actually started', 'account checks (plan, quota, credit balance)', 'an unknown outcome is not a failure', `exceed ${UNKNOWN_MAX}% of an engine’s started renders`]) if (!metodo.includes(trecho)) f.push(`a metodologia não diz "${trecho}"`)
  if ((html.match(/<article><h3>/g) ?? []).length < 3) f.push('FAQ com menos de 3 perguntas')
  // 5. schema
  const lds = jsonLds(html)
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

/** 1. Nada digitado: sem dígito em texto de JSX/literais da página; nenhum valor do JSON no código. */
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
  // valores do JSON não podem aparecer como número no código da página, da lib e da edição
  const data = dadosDa(world)
  const valores = new Set()
  const anda = (v) => { if (Array.isArray(v)) v.forEach(anda); else if (v && typeof v === 'object') Object.values(v).forEach(anda); else if (typeof v === 'number') valores.add(v) }
  anda(data.engines)
  valores.add(data.window.days)
  const distintivos = [...valores].filter((v) => !Number.isInteger(v) || (v >= 13 && v !== 100))
  for (const [rel, kind] of [[PAGE, 'tsx'], [LIB, 'ts'], [EDITION_MOD, 'ts']]) {
    const nums = new Set(numerosNoCodigo(world.over[rel] ?? rd(rel), kind))
    for (const v of distintivos) if (nums.has(v)) f.push(`valor da edição (${v}) digitado em ${rel}`)
  }
  return f
}

/** 4. Sitemap, llms.txt, páginas de motor e rodapé. */
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
  // a linha: link + até 3 números iguais aos do JSON (construída do ESPELHO, que é o que a rota publica)
  const data = dadosDa(world)
  const linha = lib.indexLlmsLine(carregador(world.over)(HEADLINE).AI_VIDEO_INDEX_HEADLINE)
  if (!linha.includes(`(${BASE}${path})`)) f.push('linha do llms.txt sem o link')
  const lead = motorManchete(lib, data)
  if (lead) {
    const c = lead.e.customers
    const esperados = [`${fmt(c.minutesToFilm.median)}-minute median from request to finished film on ${lead.meta.name}`, `${fmt(c.durationSeconds.median)}-second median film length`]
    const rel = c.reliability
    if (rel && rel.pct !== null && rel.unknownPct <= UNKNOWN_MAX) esperados.push(`${fmt(rel.pct)}% reliability`)
    for (const e of esperados) if (!linha.includes(e)) f.push(`linha do llms.txt sem "${e}"`)
  }
  // "uma linha com 2–3 números": tirando o título (ano) e os nomes de motor (Seedance 1.5), sobram no máximo 3
  const qtd = (linha.replace(NOMES_DE_MOTOR, '').replace(/\b20\d\d\b/g, '').match(/\d+(?:\.\d+)?/g) ?? []).length
  if (qtd > 3) f.push(`linha do llms.txt com números demais (${qtd})`)
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
  const data = dadosDa(world)
  let esperado
  try { esperado = lib.headlineFromEdition(lib.parseEdition(data)) } catch (e) { return [`edição inválida: ${e.message}`] }
  const espelho = load(HEADLINE).AI_VIDEO_INDEX_HEADLINE
  const a = JSON.stringify(espelho)
  const b = JSON.stringify(esperado)
  if (a !== b) f.push(`espelho ${HEADLINE} ≠ manchete do JSON: ${a} vs ${b}`)
  // conta independente (sem a lib): a mediana, a duração e a confiabilidade publicável do motor-manchete
  const lead = motorManchete(lib, data)
  if (lead) {
    const c = lead.e.customers
    const rel = c.reliability && c.reliability.pct !== null && c.reliability.unknownPct <= UNKNOWN_MAX ? c.reliability.pct : null
    if (espelho.lead?.engine !== lead.meta.name || espelho.lead?.medianMinutes !== c.minutesToFilm.median || espelho.lead?.medianSeconds !== c.durationSeconds.median || espelho.lead?.reliabilityPct !== rel) f.push('espelho com motor/mediana/duração/confiabilidade ≠ JSON')
  } else if (espelho.lead !== null) f.push('espelho com manchete, mas o JSON não tem bloco de cliente')
  if (espelho.measuredAt !== data.measuredAt || espelho.edition !== data.edition || espelho.windowDays !== data.window.days) f.push('espelho com edição/data/janela ≠ JSON')
  const src = world.over[HEADLINE] ?? rd(HEADLINE)
  if (/^import (?!type )/m.test(src)) f.push('o espelho importa código em tempo de execução (tem de ser só dados + import type)')
  return f
}

/**
 * Preço: o da KINEO por vídeo NÃO se repete aqui — a página linka a tabela de preço por motor de
 * /seedance-kling-veo-in-one-place (caminho travado contra HUB_PAGES.oneplace); o custo bruto do fornecedor por segundo
 * sai de ENGINE_MARKET (página oficial da fal, URL e data), nunca digitado.
 */
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
  // 2. o link para a tabela de preço por motor: espelho = HUB_PAGES.oneplace, página existe, link na intro da tabela, no achado e nos relacionados
  const hub = (world.over[HUB] ?? rd(HUB)).match(/oneplace: \{ path: '([^']+)', label: '([^']+)' \}/)
  if (!hub || hub[1] !== lib.PRICE_PER_VIDEO_PAGE.path || hub[2] !== lib.PRICE_PER_VIDEO_PAGE.label) f.push('PRICE_PER_VIDEO_PAGE ≠ HUB_PAGES.oneplace (lib/seo/citableHubPages.ts)')
  if (!existsSync(join(root, 'app', lib.PRICE_PER_VIDEO_PAGE.path.slice(1), 'page.tsx'))) f.push('a página de preço por vídeo não existe')
  const links = (r.html.match(new RegExp(`href="${lib.PRICE_PER_VIDEO_PAGE.path}"`, 'g')) ?? []).length
  if (links < 3) f.push(`links para a tabela de preço por motor: ${links} (esperado: achado + intro da tabela + relacionados)`)
  const intro = (r.html.match(/<h2 id="avi-table-title">[\s\S]*?<\/p>/) ?? [''])[0]
  if (!intro.includes(`href="${lib.PRICE_PER_VIDEO_PAGE.path}"`)) f.push('a intro da tabela de clientes não aponta para o preço por vídeo')
  // 3. o custo bruto do fornecedor por segundo = ENGINE_MARKET, com o link oficial, para todo motor do índice
  const prov = linhas(secao(r.html, 'avi-provider-title'))
  for (const e of lib.INDEX_ENGINES) {
    const key = Object.keys(cc.CLIP_COSTS).find((k) => cc.CLIP_COSTS[k].filmQuality === e.qualityMode)
    if (!key) { f.push(`${e.name}: sem preço do fornecedor na tabela da casa`); continue }
    const m = mk.ENGINE_MARKET[key]
    const linha = prov.find((l) => l.texto.startsWith(e.name))
    if (!linha) { f.push(`${e.name}: fora da tabela do fornecedor`); continue }
    if (!linha.html.includes(`href="${m.falUrl}"`)) f.push(`${e.name}: link oficial da fal ausente`)
    const v = String(m.falUsdPerSecond)
    const dec = v.includes('.') ? v.split('.')[1].length : 0
    const shown = `${m.falStatus === 'conferido' ? '' : '≈ '}$${dec <= 2 ? m.falUsdPerSecond.toFixed(2) : v}/s`
    if (!linha.texto.includes(shown)) f.push(`${e.name}: preço da fal "${shown}" fora da linha`)
    const data = dataHumana(key === 's25' ? mk.MARKET_CHECKED_ON_S25 : mk.MARKET_CHECKED_ON)
    if (!linha.texto.includes(`checked ${data}`)) f.push(`${e.name}: sem a data da conferência (${data})`)
  }
  return f
}

const REGRAS = {
  semPii: regraSemPii,
  semVolume: regraSemVolume,
  semKineo1: regraSemKineo1,
  desconhecido: regraDesconhecido,
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
console.log('1–9. o índice como está no repositório')
const real = roda({ over: {} })
for (const [k, v] of Object.entries(real)) checa(`${k}: verde${v.length ? ` — ${v.slice(0, 3).join(' | ')}` : ''}`, v.length === 0)

const ED = edicaoImportada({})
const JSON_REL = `${DATA_DIR}/${ED}.json`
const jsonOrig = rd(JSON_REL)
const dataOrig = JSON.parse(jsonOrig)
console.log(`   edição ${ED} · ${dataOrig.engines.length} motores gerativos · ${esperadosIndicativos(dataOrig)} medidas marcadas "indicative"`)

/** Edição com a confiabilidade do Seedance 1.5 trocada (o resto igual) + o espelho no estado que a lib correta produz. */
function mundoConfiabilidade(pct, unknownPct, espelhoPct) {
  const d = JSON.parse(jsonOrig)
  const sd = d.engines.find((e) => e.qualityMode === 'cinematic_ai')
  sd.customers.reliability.pct = pct
  sd.customers.reliability.unknownPct = unknownPct
  const velho = rd(HEADLINE).match(/reliabilityPct: ([^ }]+)/)[0]
  return { [JSON_REL]: JSON.stringify(d, null, 4), ...muta(HEADLINE, velho, `reliabilityPct: ${espelhoPct}`) }
}

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
  const w = { over: { [JSON_REL]: JSON.stringify(d, null, 4), ...muta(HEADLINE, `medianMinutes: ${velho.split(' ')[0]},`, `medianMinutes: ${novo.split(' ')[0]},`) } }
  const t = textoDe(renderiza(w).html)
  checa(`controle C1: mediana do Seedance ${velho} → ${novo} no JSON muda a página (e a velha some)`, t.includes(novo) && !t.includes(velho) && t.includes(fmt(sd.customers.coherence.mean)))
  const r = roda(w)
  checa(`controle C1: todas as regras seguem verdes com o JSON novo${Object.values(r).flat().length ? ` — ${Object.values(r).flat().slice(0, 2).join(' | ')}` : ''}`, Object.values(r).every((x) => x.length === 0))
}
{
  // C2: o custo da fal do Seedance 1.5 muda em lib/clips/clipPriceVsMarket.ts → a tabela do fornecedor acompanha
  const w = { over: muta('lib/clips/clipPriceVsMarket.ts', "falUsdPerSecond: 0.026, falStatus: 'conferido'", "falUsdPerSecond: 0.031, falStatus: 'conferido'") }
  const t = textoDe(renderiza(w).html)
  checa('controle C2: fal do Seedance $0.026/s → $0.031/s na fonte muda a página (e o velho some)', t.includes('$0.031/s') && !t.includes('$0.026/s'))
  checa('controle C2: regras de preço e de achados seguem verdes com o custo novo', regraPreco(w).length === 0 && regraPagina(w).length === 0)
}
const SEED_PCT = dataOrig.engines.find((e) => e.qualityMode === 'cinematic_ai').customers.reliability.pct
{
  // C3: desconhecido acima do corte, como a consulta grava (pct null) → "not enough data" e a taxa some de tudo
  const w = { over: mundoConfiabilidade(null, 23.5, 'null') }
  const html = renderiza(w).html
  const t = textoDe(html)
  checa(`controle C3: 23.5% sem desfecho (pct null) → célula "not enough data" e ${fmt(SEED_PCT)}% some da página`, t.includes('not enough data') && !t.includes(`${fmt(SEED_PCT)}%`))
  const r = roda(w)
  checa(`controle C3: todas as regras verdes${Object.values(r).flat().length ? ` — ${Object.values(r).flat().slice(0, 2).join(' | ')}` : ''}`, Object.values(r).every((x) => x.length === 0))
}
{
  // C4: o JSON traz a taxa MESMO com desconhecido acima do corte → a lib segura sozinha ("not enough data")
  const w = { over: mundoConfiabilidade(SEED_PCT, 23.5, 'null') }
  const t = textoDe(renderiza(w).html)
  checa(`controle C4: pct ${fmt(SEED_PCT)} com 23.5% sem desfecho → a lib mostra "not enough data" e esconde a taxa`, t.includes('not enough data') && !t.includes(`${fmt(SEED_PCT)}%`))
  const r = roda(w)
  checa(`controle C4: todas as regras verdes${Object.values(r).flat().length ? ` — ${Object.values(r).flat().slice(0, 2).join(' | ')}` : ''}`, Object.values(r).every((x) => x.length === 0))
}

console.log('mutantes (cada um precisa ficar VERMELHO pela regra certa)')
const KINEO1_BLOCO = '{"qualityMode": "fast", "engine": "Kineo 1", "windowNote": null, "customers": null, "house": {"minutesToFilm": {"median": 4.5, "p90": 9.1, "sample": "100+"}, "durationSeconds": {"median": 39.0, "sample": "100+"}}},\n        '
const MUTANTES = [
  // ── a página lê o JSON / nada digitado ──
  ['M1 número digitado em texto de JSX', 'nadaDigitado', () => muta(PAGE, '<h2 id="avi-findings-title">What the renders say this month</h2>', '<h2 id="avi-findings-title">What 109 renders say this month</h2>')],
  ['M2 H1 digitado em vez de vir da edição', 'nadaDigitado', () => muta(PAGE, '<h1>{VIEW.h1}</h1>', '<h1>Kineo AI Video Index — October 2026</h1>')],
  ['M3 página deixa de ler a edição', 'nadaDigitado', () => muta(PAGE, "import { AI_VIDEO_INDEX_EDITION } from '@/lib/seo/aiVideoIndexEdition'", "import { AI_VIDEO_INDEX_EDITION } from '@/lib/seo/aiVideoIndexFixo'")],
  ['M4 duração digitada na lib', 'nadaDigitado', () => muta(LIB, 'stat: `${num(c1.durationSeconds.median)} s`,', "stat: '43 s',")],
  ['M5 mediana digitada na lib', 'nadaDigitado', () => muta(LIB, 'label: `median from request to finished film — ${name}`,', 'label: `median (5.9 min) from request to finished film — ${name}`,')],
  // ── n < 10 marcado ──
  ['M6 régua do selo afrouxada (n < 3)', 'sql', () => muta(LIB, 'export const INDICATIVE_BELOW = 10', 'export const INDICATIVE_BELOW = 3')],
  ['M7 página não desenha o selo', 'pagina', () => muta(PAGE, '{c.indicative ? <span className="avi-ind">{INDICATIVE_LABEL}</span> : null}', '{null}')],
  ['M8 isIndicative sempre falso', 'pagina', () => muta(LIB, "return band === '<10'", 'return false')],
  // ── sem dado pessoal ──
  ['M9 e-mail no JSON', 'semPii', () => muta(JSON_REL, '"engine": "Kling 2.5",', '"engine": "Kling 2.5",\n            "email": "cliente@example.com",')],
  ['M10 id (UUID) no JSON', 'semPii', () => muta(JSON_REL, '"windowNote": "Paused for maintenance since 2026-09-15."', '"windowNote": "Paused for maintenance since 2026-09-15. ref 1c726467-0000-4000-8000-000000000000"')],
  ['M11 prompt de cliente no JSON', 'semPii', () => muta(JSON_REL, '"qualityMode": "cinematic_omni"', '"qualityMode": "cinematic_omni",\n            "topic": "a story about my neighbour"')],
  // ── superfícies ──
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
  ['M22 corte do juiz na página ≠ juiz real', 'sql', () => muta(LIB, 'export const COHERENCE_OFF_BELOW = 50', 'export const COHERENCE_OFF_BELOW = 40')],
  ['M23 espelho da manchete com mediana velha', 'espelho', () => muta(HEADLINE, 'medianMinutes: 5.9,', 'medianMinutes: 6.0,')],
  ['M24 JSON muda e o espelho fica para trás', 'espelho', () => muta(JSON_REL, '"median": 5.9,', '"median": 6.1,')],
  ['M25 llms.txt volta a importar a edição (JSON)', 'superficies', () => muta(LLMS, "import { AI_VIDEO_INDEX_HEADLINE } from '@/lib/seo/aiVideoIndexHeadline'", "import { AI_VIDEO_INDEX_HEADLINE } from '@/lib/seo/aiVideoIndexHeadline'\nimport { AI_VIDEO_INDEX_EDITION } from '@/lib/seo/aiVideoIndexEdition'")],
  ['M26 rodapé sem o índice no bloco citável', 'superficies', () => muta(FOOTER, "      { href: '/ai-video-index', label: 'AI Video Index (render time per engine)' },\n", '')],
  // ── preço da Kineo não se repete; custo do fornecedor com fonte ──
  ['M27 a página volta a repetir preço da Kineo', 'preco', () => muta(LIB, "detail: 'Kept on one page and read from the same source that charges — not repeated here.',", "detail: 'From 15 credits ≈ $1.50 per film.',")],
  ['M28 a intro da tabela perde o link do preço por vídeo', 'preco', () => muta(PAGE, ":{' '}\n            <Link href={VIEW.pricePage.path}>{VIEW.pricePage.label}</Link>.", ' on its own page.')],
  ['M29 caminho do preço por vídeo diverge do HUB_PAGES', 'preco', () => muta(LIB, "path: '/seedance-kling-veo-in-one-place'", "path: '/seedance-kling-veo'")],
  ['M30 tabela do fornecedor perde a data da conferência', 'preco', () => muta(LIB, "sub: `${provider.resolution}, no audio · checked ${humanDate(provider.checkedOn)}`,", "sub: `${provider.resolution}, no audio`,")],
  // ── V2: sem volume absoluto ──
  ['V1 JSON volta a ter contagem de filmes', 'semVolume', () => muta(JSON_REL, '"customers": {\n                "coherence": {', '"customers": {\n                "films": 109,\n                "coherence": {')],
  ['V2 amostra sai como contagem em vez de faixa', 'semVolume', () => muta(JSON_REL, '"sample": "100+"', '"sample": 109')],
  ['V3 achado com volume absoluto', 'semVolume', () => muta(LIB, "detail: 'Read from the finished MP4, not from the length that was ordered. Customer renders.',", "detail: 'Read from the finished MP4, not from the length that was ordered. 109 customer films.',")],
  ['V4 participação de uso na metodologia', 'semVolume', () => muta(LIB, "    'Aggregates only — no individual creator, prompt or account appears anywhere.',", "    '98.6% of customer films came from Kineo 1 and Seedance 1.5. Aggregates only — no individual creator, prompt or account appears anywhere.',")],
  ['V5 linha do llms.txt com contagem', 'semVolume', () => muta(LIB, 'house accounts kept apart${parts.length', '353 customer films, house accounts kept apart${parts.length')],
  ['V6 faixa de amostra fora da metodologia (célula)', 'semVolume', () => muta(LIB, "return cell(`${num(d.median)} s`, 'finished MP4', d.sample)", "return cell(`${num(d.median)} s`, 'finished MP4 · n ≥ 100', d.sample)")],
  ['V7 espelho da manchete com contagem', 'semVolume', () => muta(HEADLINE, '  windowDays: 30,', '  windowDays: 30,\n  customerFilms: 353,')],
  ['V8 JSON-LD com contagem', 'semVolume', () => muta(LIB, "'reliability among started renders, automatic coherence score and provider list price per second.", "'Based on 353 customer films: reliability among started renders, automatic coherence score and provider list price per second.")],
  ['V9 consulta volta a publicar contagem', 'sql', () => muta(`${DATA_DIR}/${ED}.sql`, "        'durationSeconds', jsonb_build_object('median', fc.duration_median,", "        'films', fc.duration_n,\n        'durationSeconds', jsonb_build_object('median', fc.duration_median,")],
  // ── V2: Kineo 1 fora ──
  ['K1 JSON com bloco do Kineo 1', 'semKineo1', () => muta(JSON_REL, '"engines": [\n        {', `"engines": [\n        ${KINEO1_BLOCO}{`)],
  ['K2 INDEX_ENGINES ganha o Kineo 1', 'semKineo1', () => muta(LIB, "  { qualityMode: 'cinematic_ai', name: 'Seedance 1.5', slug: 'seedance' },", "  { qualityMode: 'fast' as Quality, name: 'Kineo 1', slug: 'kineo-1' },\n  { qualityMode: 'cinematic_ai', name: 'Seedance 1.5', slug: 'seedance' },")],
  ['K3 número do Kineo 1 na metodologia', 'semKineo1', () => muta(LIB, '    NOT_COVERED_LINE,\n', "    NOT_COVERED_LINE,\n    'Kineo 1 took a median 4.5 min from request to film.',\n")],
  ['K4 a frase de exclusão do Kineo 1 some', 'semKineo1', () => muta(LIB, '    NOT_COVERED_LINE,\n', '')],
  ['K5 a frase de exclusão muda de sentido', 'semKineo1', () => muta(LIB, "'Kineo 1 (stock-footage assembly) is not a generative engine and is not covered.'", "'Kineo 1 (stock-footage assembly) is covered on its own page.'")],
  ['K6 consulta volta a listar o Kineo 1', 'sql', () => muta(`${DATA_DIR}/${ED}.sql`, "    (1, 'cinematic_ai',        'seedance',  'Seedance 1.5', null),", "    (0, 'fast',                'fast',      'Kineo 1',      null),\n    (1, 'cinematic_ai',        'seedance',  'Seedance 1.5', null),")],
  // ── V2: desconhecido > 20% = "not enough data" ──
  ['D1 a lib ignora o desconhecido (JSON com 23.5% sem desfecho e a taxa)', 'desconhecido', () => muta(LIB, 'return rel.unknownPct > UNKNOWN_SHARE_MAX ? null : rel.pct', 'return rel.pct', mundoConfiabilidade(SEED_PCT, 23.5, 'null'))],
  ['D2 corte do desconhecido afrouxado na lib (20 → 30)', 'desconhecido', () => muta(LIB, 'export const UNKNOWN_SHARE_MAX = 20', 'export const UNKNOWN_SHARE_MAX = 30', mundoConfiabilidade(SEED_PCT, 23.5, 'null'))],
  ['D3 corte do desconhecido afrouxado na consulta (20 → 50)', 'sql', () => muta(`${DATA_DIR}/${ED}.sql`, 'when 100.0 * rc.unknown / rc.started > 20 then null', 'when 100.0 * rc.unknown / rc.started > 50 then null')],
  ['D4 célula mostra a taxa e "not enough data" só no rodapé da célula', 'desconhecido', () => muta(LIB, "if (value === null) return cell(NOT_ENOUGH_DATA, `${num(rel.unknownPct)}%", "if (value === null) return cell(`${num(rel.pct ?? 0)}%`, `${NOT_ENOUGH_DATA}: ${num(rel.unknownPct)}%", mundoConfiabilidade(SEED_PCT, 23.5, 'null'))],
  // ── V2: renders de teste e achados ──
  ['T1 renders de teste ganham uma taxa', 'pagina', () => muta(PAGE, "<td data-label={testCol('length')}><Measure c={r.length} /></td>", "<td data-label={testCol('length')}><Measure c={r.length} /></td>\n                    <td data-label={testCol('length')}><Measure c={r.time} /></td>")],
  ['T2 a tabela da casa perde o rótulo decidido', 'pagina', () => muta(LIB, "export const TEST_RENDERS_LABEL = 'Kineo internal test renders, indicative'", "export const TEST_RENDERS_LABEL = 'House renders'")],
  ['T3 bloco de cliente com amostra < 10', 'pagina', () => muta(JSON_REL, '"p90": 16.2,\n                    "median": 5.9,\n                    "sample": "100+"', '"p90": 16.2,\n                    "median": 5.9,\n                    "sample": "<10"')],
  ['F1 some o achado da coerência', 'pagina', () => muta(LIB, '    if (c1.coherence) {\n      findings.push({', '    if (false) {\n      findings.push({')],
  ['F2 volta um achado de volume (6 achados)', 'pagina', () => muta(LIB, "  findings.push({\n    stat: 'Price per film',", "  findings.push({ stat: 'Films', label: 'delivered to customers', detail: '' })\n  findings.push({\n    stat: 'Price per film',")],
  ['F3 achado do custo sem fonte e data', 'pagina', () => muta(LIB, '`Source: the inference provider’s (fal.ai) official price pages, checked ${providerChecked} — raw clips', '`Raw clips')],
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
