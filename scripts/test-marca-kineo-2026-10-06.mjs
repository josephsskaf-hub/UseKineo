#!/usr/bin/env node
// KINEO-MARCA-2026-10-06 — guardião das LACUNAS de marca que a rodada 1 de visibilidade (fcf5dd10) deixou.
//
// POR QUE EXISTE: em 06/10 o ChatGPT (busca ligada) respondeu "What is Kineo AI video maker?" com o kineo.studio,
// outra empresa. A rodada 1 (fcf5dd10) já pôs o alias "Kineo (usekineo.com)", a frase BRAND_DISAMBIGUATION no schema
// global e da home, o H1 e a linha do /llms.txt e a página /kineo-vs-kineo-studio (com FAQPage) — tudo isso é provado
// por scripts/test-visibilidade-chatgpt-2026-10-06.mjs e NÃO é repetido aqui. Este guardião prova só o que faltava:
//   (a) /api/facts abre com "name" = "Kineo (usekineo.com)" e "disambiguation" = a mesma frase do schema;
//   (b) og:site_name e application-name "Kineo (usekineo.com)" nas 6 páginas que trazem tráfego do ChatGPT, com os
//       títulos intactos byte a byte (/, /state-of-ai-shorts-2026, /ai-video-generator/kineo-1,
//       /free-ai-shorts-generator, /text-to-video-shorts, /ai-video-generator/seedance);
//   (d) sameAs no Organization (global e da home) só com perfil nosso: a ficha do TAAFT, nunca o Product Hunt.
//   (+) nenhuma promessa nova: o /api/facts só reexpõe a frase existente, que não promete nada.
// Lê arquivo + transpile (sem import com alias @/, sem rede). Depois roda MUTANTES: cada um prova (busca exata) que
// foi aplicado e tem de deixar o guardião vermelho.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(join(root, 'package.json'))('typescript')
const disk = (rel) => readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')

const SITE_NAME = 'Kineo (usekineo.com)'
const TAAFT = 'https://theresanaiforthat.com/ai/kineo/'

// Os 6 títulos protegidos, copiados da base (7b4417ce = fcf5dd10 nestes arquivos). Mudar um deles é decisão do fundador.
const HOME_TITLE = 'Kineo — AI Shorts Engines: Veo 3.1, Kling 3, Seedance | Faceless YouTube Shorts'
const LAYOUT_TITLE = 'Kineo — AI YouTube Shorts Generator (Official Site)' // og:title e twitter:title da home (herdados)
const STATE_TITLE = (n) => `State of AI Shorts 2026 — Original Data from ${n} AI-Generated Videos`
const ENGINE_TITLE_SOURCE = 'const title = pause\n    ? `${e.name} — Temporarily Paused | Kineo`\n    : `${e.name} AI Video Generator for YouTube Shorts | Kineo`'
const ENGINE_NAMES = { 'kineo-1': 'Kineo 1', seedance: 'Seedance 1.5' }
const FREE_GEN = { title: 'Free AI Shorts Generator - Create Faceless Shorts With No Card | Kineo', og: 'Free AI Shorts Generator - Kineo', tw: 'Free AI Shorts Generator | Kineo' }
const TEXT_TO_VIDEO = { title: 'Text to Video Shorts Generator - AI YouTube Shorts From Text | Kineo', og: 'Text to Video Shorts Generator - Kineo', tw: 'Text to Video Shorts Generator | Kineo' }

const PROMISE = /\bfree\b|unlimited|guarantee|#\s?1\b|\bbest\b|\bno\.?\s?1\b|official partner|forever|instant|no card|cheap|\$\s?\d|\d+\s*credits?|\btrial\b|discount|cancel anytime/i
const DISPARAGE = /scam|fake|copycat|\bclone|imitat|impersonat|worse|inferior|knock-?off|beware|fraud|stole/i

// ── AST e avaliação de trechos (sem resolver import nenhum) ──────────────────────────────────────────
const sourceFile = (rel, text) => ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
function walk(node, visit) { visit(node); ts.forEachChild(node, (child) => walk(child, visit)) }
function varInit(sf, name) {
  let found = null
  walk(sf, (n) => { if (!found && ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name) found = n.initializer })
  return found
}
const fnDecl = (sf, name) => sf.statements.find((s) => ts.isFunctionDeclaration(s) && s.name?.text === name) ?? null
const propName = (p) => (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : null)
function prop(obj, name) {
  while (obj && (ts.isAsExpression(obj) || ts.isParenthesizedExpression(obj))) obj = obj.expression
  if (!obj || !ts.isObjectLiteralExpression(obj)) return null
  const p = obj.properties.find((x) => ts.isPropertyAssignment(x) && propName(x) === name)
  return p ? p.initializer : null
}
const lit = (n) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null)
const text = (sf, n) => (n ? n.getText(sf) : null)
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b) // objetos de outro realm (vm): comparar por JSON
const transpile = (code) => ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
function evalExpr(code, globals) {
  const exports = {}
  vm.runInNewContext(transpile(`exports.value = (${code});`), { exports, ...globals }, { timeout: 2000 })
  return exports.value
}
function evalFunctions(sf, names, globals) {
  const exports = {}
  vm.runInNewContext(transpile(names.map((n) => fnDecl(sf, n).getText(sf)).join('\n')), { exports, URL, ...globals }, { timeout: 2000 })
  return exports
}
function loadPure(rel, src) {
  // lib/brandIdentity.ts tem de continuar SEM import: qualquer require aqui é falha.
  const module = { exports: {} }
  vm.runInNewContext(transpile(src), { module, exports: module.exports, require: (id) => { throw new Error(`${rel}: import inesperado ${id}`) } }, { timeout: 2000 })
  return module.exports
}

// ── a verificação inteira, como função da fonte (para os mutantes) ────────────────────────────────────
async function verify(read) {
  const fails = []
  let checks = 0
  const check = (cond, label) => { checks++; if (!cond) fails.push(label) }
  const attempt = async (label, fn) => { try { await fn() } catch (e) { checks++; fails.push(`${label}: ${e.message}`) } }

  // (0) a fonte única — pura, sem import
  let B = null
  await attempt('lib/brandIdentity.ts carrega sem import', () => { B = loadPure('lib/brandIdentity.ts', read('lib/brandIdentity.ts')) })
  if (!B) return { fails, checks }
  check(B.BRAND_WITH_DOMAIN === SITE_NAME, 'BRAND_WITH_DOMAIN = "Kineo (usekineo.com)" (o nome que vai no og:site_name e no /api/facts)')
  check(Array.isArray(B.BRAND_SAME_AS) && B.BRAND_SAME_AS.length === 1 && B.BRAND_SAME_AS[0] === TAAFT, 'sameAs = só a ficha do TAAFT (perfil nosso)')
  check(!JSON.stringify(B.BRAND_SAME_AS ?? []).includes('producthunt'), 'sameAs nunca aponta para o Product Hunt (é da kineo.studio)')
  check(read('lib/seo/citableHubPages.ts').includes(`url: '${TAAFT}'`), 'sameAs bate com KINEO_OWN_PROFILES (lib/seo/citableHubPages.ts)')
  const D = B.BRAND_DISAMBIGUATION
  check(typeof D === 'string' && !PROMISE.test(D) && !DISPARAGE.test(D), 'a frase que o /api/facts passa a expor não promete nada nem fala mal de ninguém')

  // (a) /api/facts: as duas primeiras chaves do JSON
  const kfRel = 'lib/kineoFacts.ts', kfSrc = read(kfRel), kf = sourceFile(kfRel, kfSrc)
  const facts = fnDecl(kf, 'getKineoFacts')?.body.statements.find((s) => ts.isReturnStatement(s))?.expression
  const first = facts && ts.isObjectLiteralExpression(facts) ? facts.properties.slice(0, 3).map((p) => p.getText(kf)) : []
  check(first[0] === 'name: BRAND_WITH_DOMAIN' && first[1] === 'disambiguation: BRAND_DISAMBIGUATION' && first[2] === 'product: PRODUCT', '/api/facts: "name" e "disambiguation" são as duas primeiras chaves, antes de "product"')
  check(/import \{ BRAND_DISAMBIGUATION, BRAND_WITH_DOMAIN \} from '\.\/brandIdentity'/.test(kfSrc), 'lib/kineoFacts.ts lê nome e frase da fonte única (sem texto novo)')
  check(/\n  name: typeof BRAND_WITH_DOMAIN\n  disambiguation: typeof BRAND_DISAMBIGUATION\n  product: typeof PRODUCT\n/.test(kfSrc), 'KineoFactsPayload declara as duas chaves no topo')
  check(read('app/api/facts/route.ts').includes('JSON.stringify(getKineoFacts(), null, 2)'), '/api/facts ainda serializa getKineoFacts()')

  // (b) os 6 títulos protegidos — byte a byte — e a marca no og:site_name / application-name
  const home = sourceFile('app/page.tsx', read('app/page.tsx'))
  check(lit(prop(varInit(home, 'metadata'), 'title')) === HOME_TITLE, '/ : <title> intacto')
  const lm = varInit(sourceFile('app/layout.tsx', read('app/layout.tsx')), 'metadata')
  check(lit(prop(lm, 'title')) === LAYOUT_TITLE && lit(prop(prop(lm, 'openGraph'), 'title')) === LAYOUT_TITLE && lit(prop(prop(lm, 'twitter'), 'title')) === LAYOUT_TITLE, '/ : og:title e twitter:title herdados do layout intactos')
  check(lit(prop(prop(lm, 'openGraph'), 'siteName')) === SITE_NAME, '/ (e herdeiras do layout): og:site_name = "Kineo (usekineo.com)"')
  check(lit(prop(lm, 'applicationName')) === SITE_NAME, 'toda página: application-name = "Kineo (usekineo.com)"')

  const st = sourceFile('app/state-of-ai-shorts-2026/page.tsx', read('app/state-of-ai-shorts-2026/page.tsx'))
  // KINEO-GEO-RODADA2-2026-10-08 — reancorado com motivo (sessão CEO 08/10, regra v2 do índice: SEM VOLUME ABSOLUTO DE CLIENTE).
  // O título protegido era `State of AI Shorts 2026 — Original Data from ${N} AI-Generated Videos` — uma contagem de vídeos de
  // cliente no <title>. Ele passa a vir da edição mensal (lib/seo/stateOfAiShorts.ts: `${STATE_NAME} — Original Data, ${seal}`,
  // ex. "… — Original Data, Updated October 2026"): o prefixo de marca fica, a contagem sai. A trava continua: o <title> e o
  // og:title são o título da edição, o twitter:title segue "State of AI Shorts 2026" e o og:site_name segue com o domínio.
  await attempt('/state-of-ai-shorts-2026 generateMetadata avalia', async () => {
    const VIEW = { metaTitle: 'TITULO-DA-EDICAO', metaDescription: 'DESCRICAO-DA-EDICAO' }
    const { generateMetadata } = evalFunctions(st, ['generateMetadata'], {
      CANONICAL: 'https://www.usekineo.com/state-of-ai-shorts-2026',
      VIEW,
    })
    const m = await generateMetadata()
    check(m.title === VIEW.metaTitle && m.openGraph.title === VIEW.metaTitle && m.twitter.title === 'State of AI Shorts 2026', '/state-of-ai-shorts-2026: títulos = os da edição (twitter:title intacto)')
    check(m.openGraph.siteName === SITE_NAME, '/state-of-ai-shorts-2026: og:site_name com domínio')
    const lib = read('lib/seo/stateOfAiShorts.ts')
    check(/\n  const metaTitle = `\$\{STATE_NAME\} — Original Data, \$\{seal\}`\n/.test(lib) && lib.includes("export const STATE_NAME = 'State of AI Shorts 2026'") && lib.includes('const seal = `Updated ${editionLabel}`'), '/state-of-ai-shorts-2026: o título da edição mantém o prefixo "State of AI Shorts 2026 — Original Data" e troca a contagem pelo selo do mês')
  })

  const enRel = 'app/ai-video-generator/[engine]/page.tsx', en = sourceFile(enRel, read(enRel))
  let titleStmt = null
  const enGen = fnDecl(en, 'generateMetadata')
  if (enGen) walk(enGen, (n) => { if (!titleStmt && ts.isVariableStatement(n) && n.declarationList.declarations[0]?.name.getText(en) === 'title') titleStmt = n })
  check(titleStmt && titleStmt.declarationList.getText(en) === ENGINE_TITLE_SOURCE, '/ai-video-generator/[engine]: a fonte do título é byte a byte a da base')
  const catalog = read('lib/growth/enginePageCatalog.ts')
  check(catalog.match(/\n  'kineo-1': \{[\s\S]*?\n    name: '([^']+)'/)?.[1] === ENGINE_NAMES['kineo-1'] && catalog.match(/\n  seedance: \{[\s\S]*?\n    name: '([^']+)'/)?.[1] === ENGINE_NAMES.seedance, 'catálogo: nomes do Kineo 1 e do Seedance 1.5 intactos')
  await attempt('/ai-video-generator/[engine] generateMetadata avalia', () => {
    for (const paused of [false, true]) {
      const ENGINES = Object.fromEntries(Object.entries(ENGINE_NAMES).map(([slug, name]) => [slug, { name, param: slug, tier: 'Free', creditCost: 5 }]))
      const { generateMetadata } = evalFunctions(en, ['generateMetadata', 'engineCostLabel'], {
        ENGINES, BASE: 'https://www.usekineo.com', TRIAL_CREDITS_SHOWN: 10, LOCALIZED_ENGINE_SLUGS: [], engineAlternates: () => ({}),
        enginePaused: () => (paused ? { alternative: { label: 'Seedance 1.5' } } : null),
      })
      for (const [slug, name] of Object.entries(ENGINE_NAMES)) {
        const m = generateMetadata({ params: { engine: slug } })
        const want = paused ? `${name} — Temporarily Paused | Kineo` : `${name} AI Video Generator for YouTube Shorts | Kineo`
        check(m.title === want && m.openGraph.title === want && m.twitter.title === want, `/ai-video-generator/${slug}${paused ? ' (pausado)' : ''}: títulos intactos`)
        check(m.openGraph.siteName === SITE_NAME, `/ai-video-generator/${slug}: og:site_name com domínio`)
      }
    }
  })

  for (const [rel, want, label] of [['app/free-ai-shorts-generator/page.tsx', FREE_GEN, '/free-ai-shorts-generator'], ['app/text-to-video-shorts/page.tsx', TEXT_TO_VIDEO, '/text-to-video-shorts']]) {
    const m = varInit(sourceFile(rel, read(rel)), 'metadata')
    check(lit(prop(m, 'title')) === want.title && lit(prop(prop(m, 'openGraph'), 'title')) === want.og && lit(prop(prop(m, 'twitter'), 'title')) === want.tw, `${label}: títulos intactos`)
    check(lit(prop(prop(m, 'openGraph'), 'siteName')) === SITE_NAME, `${label}: og:site_name com domínio`)
  }

  // (d) sameAs no Organization — global (toda página) e da home
  const sd = sourceFile('components/StructuredData.tsx', read('components/StructuredData.tsx'))
  await attempt('Organization global avalia', () => {
    const org = evalExpr(text(sd, varInit(sd, 'organizationSchema')), { ...B })
    check(org['@type'] === 'Organization' && sameJson(org.sameAs, [TAAFT]), 'Organization global: sameAs = [TAAFT]')
  })
  await attempt('Organization da home avalia', () => {
    const org = evalExpr(text(home, varInit(home, 'BRAND_JSON_LD')), { ...B })['@graph'].find((x) => x['@type'] === 'Organization')
    check(sameJson(org?.sameAs, [TAAFT]), 'Organization da home: sameAs = [TAAFT]')
  })
  return { fails, checks }
}

// ── 1. a árvore real tem de passar ────────────────────────────────────────────────────────────────────
const real = await verify(disk)
if (real.fails.length) {
  console.error(`marca-kineo: ${real.fails.length} falha(s) em ${real.checks} verificações`)
  for (const f of real.fails) console.error('  ✗ ' + f)
  process.exit(1)
}

// ── 2. mutantes: cada um tem de ser aplicado (busca exata) e deixar o guardião vermelho ───────────────
const MUTANTS = [
  ['M1 /api/facts perde "disambiguation"', 'lib/kineoFacts.ts', '    disambiguation: BRAND_DISAMBIGUATION,\n    product: PRODUCT,', '    product: PRODUCT,'],
  ['M2 /api/facts: nome desce para depois de "product"', 'lib/kineoFacts.ts', '    name: BRAND_WITH_DOMAIN,\n    disambiguation: BRAND_DISAMBIGUATION,\n    product: PRODUCT,', '    disambiguation: BRAND_DISAMBIGUATION,\n    product: PRODUCT,\n    name: BRAND_WITH_DOMAIN,'],
  ['M3 /api/facts ganha texto novo com promessa', 'lib/kineoFacts.ts', '    disambiguation: BRAND_DISAMBIGUATION,\n    product: PRODUCT,', "    disambiguation: 'Kineo is the #1 free AI video maker.',\n    product: PRODUCT,"],
  ['M4 título da home ganha o domínio', 'app/page.tsx', `title: '${HOME_TITLE}'`, `title: '${HOME_TITLE} (usekineo.com)'`],
  ['M5 og:title da home (layout) muda', 'app/layout.tsx', "    title: '" + LAYOUT_TITLE + "',\n    description:\n      `Launch a repeatable AI Shorts show with the same face, voice and style. ${ft(OFFER, 'Try up", "    title: 'Kineo (usekineo.com) — AI YouTube Shorts Generator',\n    description:\n      `Launch a repeatable AI Shorts show with the same face, voice and style. ${ft(OFFER, 'Try up"],
  ['M6 título do motor (kineo-1/seedance) ganha o domínio', 'app/ai-video-generator/[engine]/page.tsx', 'AI Video Generator for YouTube Shorts | Kineo`', 'AI Video Generator for YouTube Shorts | Kineo (usekineo.com)`'],
  ['M7 título do /free-ai-shorts-generator muda', 'app/free-ai-shorts-generator/page.tsx', `title: '${FREE_GEN.title}'`, "title: 'Free AI Shorts Generator | Kineo (usekineo.com)'"],
  ['M8 título do /text-to-video-shorts muda', 'app/text-to-video-shorts/page.tsx', `title: '${TEXT_TO_VIDEO.title}'`, "title: 'Text to Video Shorts Generator | Kineo (usekineo.com)'"],
  ['M9 título do estudo muda', 'app/state-of-ai-shorts-2026/page.tsx', '  const title = VIEW.metaTitle\n', '  const title = `${VIEW.metaTitle} | Kineo (usekineo.com)`\n'], // KINEO-GEO-RODADA2-2026-10-08 — reancorado: o título vem da edição
  ['M10 og:site_name do layout volta a "Kineo"', 'app/layout.tsx', "siteName: 'Kineo (usekineo.com)',", "siteName: 'Kineo',"],
  ['M11 application-name some', 'app/layout.tsx', "  applicationName: 'Kineo (usekineo.com)',\n", ''],
  ['M12 og:site_name some da página de motor', 'app/ai-video-generator/[engine]/page.tsx', "url, siteName: 'Kineo (usekineo.com)', type: 'website' }", "url, type: 'website' }"],
  ['M13 og:site_name some do estudo', 'app/state-of-ai-shorts-2026/page.tsx', "url: CANONICAL, siteName: 'Kineo (usekineo.com)', type: 'article'", "url: CANONICAL, type: 'article'"],
  ['M14 og:site_name some do /free-ai-shorts-generator', 'app/free-ai-shorts-generator/page.tsx', "    siteName: 'Kineo (usekineo.com)', // KINEO-MARCA-2026-10-06\n", ''],
  ['M15 og:site_name some do /text-to-video-shorts', 'app/text-to-video-shorts/page.tsx', "    siteName: 'Kineo (usekineo.com)', // KINEO-MARCA-2026-10-06\n", ''],
  ['M16 Organization global perde o sameAs', 'components/StructuredData.tsx', '  sameAs: BRAND_SAME_AS,\n', ''],
  ['M17 Organization da home perde o sameAs', 'app/page.tsx', '      sameAs: BRAND_SAME_AS, // KINEO-MARCA-2026-10-06 — mesma lista do Organization global\n', ''],
  ['M18 sameAs ganha o Product Hunt (que é da kineo.studio)', 'lib/brandIdentity.ts', "['https://theresanaiforthat.com/ai/kineo/']", "['https://theresanaiforthat.com/ai/kineo/', 'https://www.producthunt.com/products/kineo']"],
]
let killed = 0
for (const [name, rel, from, to] of MUTANTS) {
  const original = disk(rel)
  const hits = original.split(from).length - 1
  assert.equal(hits, 1, `${name}: o mutante não se aplica (achei ${hits} ocorrências de ${JSON.stringify(from.slice(0, 60))})`)
  const mutated = original.split(from).join(to)
  const r = await verify((p) => (p === rel ? mutated : disk(p)))
  assert.ok(r.fails.length > 0, `${name}: mutante SOBREVIVEU — o guardião não pegou`)
  if (process.argv.includes('--verbose')) console.log(`  ${name} → ${r.fails[0]}${r.fails.length > 1 ? ` (+${r.fails.length - 1})` : ''}`)
  killed++
}
console.log(`marca-kineo: ${real.checks}/${real.checks} verificações passaram · ${killed}/${MUTANTS.length} mutantes mortos`)
