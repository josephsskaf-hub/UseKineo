// KINEO-PAGINAS-CONECTOR-2110 — provas sobre componentes executados em memória + mutantes aplicados.
// Offline: nenhum build, render de vídeo, segredo, rede ou banco. O desfaz não mascara o comportamento atual nas provas.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { ROOT, rd, loadGuideFixture, nodes, textOf, guideDistribution } from './test-support/connector-guide-fixture.mjs'
import { semHomeCardsClaros2010 } from './test-support/desfaz-home-cards-claros-2010.mjs'
import { semPaginasConector2110, MARCA_PAGINAS_CONECTOR_2110 as MARCA, PAGINAS_CONECTOR_2110_BASE as BASE, PAGINAS_CONECTOR_2110_ARQUIVOS as FILES, PAGINAS_CONECTOR_2110_NOVOS as NEW, TROCAS_PAGINAS_CONECTOR_2110 as SWAPS } from './test-support/desfaz-paginas-conector-2110.mjs'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (file) => { try { return git('show', `${BASE}:${file}`).replace(/\r\n/g, '\n') } catch { return null } }
let pass = 0, fail = 0
function ok(condition, label) { condition ? pass++ : fail++; console.log(`  ${condition ? 'ok' : 'FALHA'} ${label}`) }
const EXPECTED = [
  ['chatgpt', 'en', '/make-ai-videos-in-chatgpt'], ['chatgpt', 'pt', '/criar-videos-com-ia-no-chatgpt'],
  ['claude', 'en', '/make-ai-videos-in-claude'], ['claude', 'pt', '/criar-videos-com-ia-no-claude'],
]
const sources = Object.fromEntries(['lib/seo/connectorGuides.ts', 'components/ConnectorGuidePage.tsx', 'lib/claudeConnect.ts', 'app/claude-connector/ConnectPanel.tsx', 'app/claude-connector/ShowcaseGrid.tsx', 'app/claude-connector/page.tsx', 'app/sitemap.ts', 'app/llms.txt/route.ts', 'components/Footer.tsx', ...EXPECTED.map(([, , p]) => `app${p}/page.tsx`)].map((file) => [file, rd(file)]))
const names = (tree, type) => nodes(tree, (node) => node.type === type)

function routePaths(src) {
  const ast = ts.createSourceFile('sitemap.ts', src, ts.ScriptTarget.Latest, true)
  const found = []
  function walk(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'routes' && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      for (const item of node.initializer.elements) if (ts.isObjectLiteralExpression(item)) {
        const prop = item.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(ast) === 'path')
        if (prop && ts.isStringLiteral(prop.initializer)) found.push(prop.initializer.text)
      }
    }
    ts.forEachChild(node, walk)
  }
  walk(ast)
  return found
}

const distributionCache = new Map()
async function proofs(src) {
  const e = []
  const check = (condition, message) => { if (!condition) e.push(message) }
  const fixture = loadGuideFixture(src), { model } = fixture
  const expectedUrl = 'https://www.usekineo.com/api/mcp/studio'
  check(model.CONNECTOR_GUIDES.length === 4, 'catálogo tem exatamente quatro guias')
  check(model.CONNECTOR_GUIDES_REVIEWED === '2026-10-21', 'data da revisão')
  const sitemap = routePaths(src['app/sitemap.ts'])
  check(!model.connectorGuideLlmsLines('https://www.usekineo.com', false).includes('Studio Ads') && model.connectorGuideLlmsLines('https://www.usekineo.com', true).includes('Studio Ads'), 'llms respeita anúncios pausados, mantendo os quatro guias de filmes')
  const key = [src['app/sitemap.ts'], src['app/llms.txt/route.ts'], src['lib/seo/connectorGuides.ts']].join('\0')
  if (!distributionCache.has(key)) distributionCache.set(key, guideDistribution(src))
  const distribution = await distributionCache.get(key)
  const llmsLines = distribution.llms
  for (const [client, lang, route] of EXPECTED) {
    const pt = lang === 'pt', guide = model.connectorGuide(client, lang), meta = model.connectorGuideMetadata(client, lang)
    const tree = fixture.page({ client, lang }), text = textOf(tree)
    check(guide.path === route, `${route}: rota e par corretos`)
    const page = fixture.load(`app${route}/page.tsx`)
    const root = page.default()
    check(root.type === 'ConnectorGuidePage' && root.props.client === client && root.props.lang === lang && page.dynamic === 'force-static', `${route}: página chama componente com cliente/idioma certos`)
    check(tree.type === 'main' && tree.props.lang === lang && names(tree, 'h1').length === 1 && textOf(names(tree, 'h1')[0]) === guide.title, `${route}: um H1 direto, idioma explícito`)
    check(meta.alternates.canonical === `https://www.usekineo.com${route}` && JSON.stringify(page.metadata) === JSON.stringify(meta), `${route}: canonical próprio`)
    for (const language of ['en', 'pt']) check(meta.alternates.languages[language] === `https://www.usekineo.com${model.connectorGuide(client, language).path}`, `${route}: hreflang recíproco ${language}`)
    check(meta.openGraph.url === meta.alternates.canonical && meta.openGraph.title.includes(guide.title) && meta.openGraph.locale === (pt ? 'pt_BR' : 'en_US') && meta.openGraph.images[0].url.includes('/og-card.png') && meta.twitter.card === 'summary_large_image' && meta.description === guide.description, `${route}: metadata/OG/Twitter locais`)
    const ol = names(tree, 'ol')
    check(ol.length === 1 && names(ol[0], 'li').length === 4, `${route}: quatro passos numerados`)
    check(text.includes('OAuth') && text.includes('Allow'), `${route}: login OAuth e consentimento`)
    check(client !== 'chatgpt' || (text.includes(pt ? 'plano pago do ChatGPT' : 'paid ChatGPT plan') && text.includes(pt ? 'Modo desenvolvedor' : 'Developer mode') && text.includes(pt ? 'Adicionar servidor MCP personalizado' : 'Add custom MCP server') && model.connectorGuideSteps(client, lang).flat().join(' ').includes(pt ? 'ChatGPT pago' : 'paid ChatGPT')), `${route}: requisitos pagos e criação MCP do ChatGPT`)
    check(client !== 'claude' || text.includes(pt ? 'Personalizar → Conectores → Adicionar conector personalizado' : 'Customize → Connectors → Add custom connector'), `${route}: passos próprios do Claude`)
    const copy = names(tree, 'CopyField')
    check(copy.length === 1 && copy[0].props.value === expectedUrl && copy[0].props.locale === lang, `${route}: URL copiável Studio, fonte única, idioma certo`)
    check([names(tree, 'header')[0], names(tree, 'section').find((node) => node.props['aria-labelledby'] === 'credits-title')].every((part) => textOf(part).includes(pt ? 'Você paga com os créditos da sua conta Kineo.' : 'You pay with the credits in your Kineo account.')), `${route}: custo em créditos, sem preço inventado`)
    const articles = names(tree, 'article')
    check(articles.length === 3 && textOf(articles[2]).includes(pt ? 'Em breve' : 'Coming soon') && textOf(articles[2]).includes(pt ? 'Ainda não disponível pelo conector' : 'Not yet available through the connector'), `${route}: desenho 3D claramente em breve`)
    check(textOf(articles[1]).includes('Studio Ads') && textOf(articles[1]).includes(pt ? 'não gera nem cobra' : 'does not generate or charge'), `${route}: anúncio continua no Studio Ads, sem prometer geração MCP`)
    const faq = names(tree, 'details')
    check(faq.length === 5 && textOf(faq).includes(pt ? 'revogar' : 'revoke') && textOf(faq).includes(pt ? 'gastar os créditos' : 'spend your account credits') && textOf(faq).includes(pt ? 'Nunca envie sua senha' : 'Never send your password') && textOf(faq).toLowerCase().includes(pt ? 'desconect' : 'disconnect'), `${route}: FAQ pago, permissões reais, senha e revogação`)
    const showcase = names(tree, 'ShowcaseGrid')
    check(showcase.length === 1 && showcase[0].props.locale === lang && src['components/ConnectorGuidePage.tsx'].includes("@/app/claude-connector/palette") && src['components/ConnectorGuidePage.tsx'].includes("@/app/claude-connector/ShowcaseGrid"), `${route}: reuso da paleta clara e vitrine`)
    check(names(tree, 'Link').filter((node) => node.props.href?.startsWith('/signup?')).length === 2, `${route}: CTAs de criar conta`)
    check(sitemap.filter((p) => p === route).length === 1 && distribution.sitemap.filter((entry) => entry.url === `https://www.usekineo.com${route}`).length === 1, `${route}: entrada única no sitemap`)
    check(llmsLines.split(`](https://www.usekineo.com${route})`).length === 2 && src['app/llms.txt/route.ts'].includes('connectorGuideLlmsLines(BASE, Boolean(STUDIO_ADS_FACT))'), `${route}: entrada no llms.txt`)
    check(src['components/Footer.tsx'].includes(`href: '${route}'`) && src['app/claude-connector/page.tsx'].includes('CONNECTOR_GUIDES.map((guide) =>') && src['app/claude-connector/page.tsx'].includes('href={guide.path}'), `${route}: link no rodapé e no conector`)
    check(!/\$\s*\d|R\$|guaranteed income|renda garantida|100% safe|100% seguro/i.test(text), `${route}: sem preço literal, renda ou segurança absoluta`)
  }
  check(src['app/sitemap.ts'].includes("new Date('2026-10-21T12:00:00.000Z')"), 'sitemap carimbado com a data da entrega')
  for (const lang of ['en', 'pt']) {
    const showcase = fixture.load('app/claude-connector/ShowcaseGrid.tsx').default({ locale: lang })
    const videos = names(showcase, 'video')
    check(videos.length === 9 && videos.every((v) => v.props.poster && !v.props.src && v.props.preload === 'none' && v.props.muted && v.props.playsInline), `${lang}: vitrine real com nove vídeos, pôsteres e carregamento adiado`)
    check(names(showcase, 'figure').every((figure) => figure.props.children[0].type === 'div' && figure.props.children[0].props.style.aspectRatio === '9 / 16' && figure.props.children[1].type === 'figcaption'), `${lang}: quadro 9:16 inteiro e título abaixo do vídeo`)
    check(textOf(showcase).includes(lang === 'pt' ? 'Anúncios UGC' : 'UGC ads'), `${lang}: vitrine localizada`)
  }
  return e
}

console.log(`${MARCA} — provas`)
try { const errors = await proofs(sources); ok(errors.length === 0, `P: quatro rotas, conteúdo, componentes, SEO e distribuição (${errors.join(' | ') || 'ok'})`) } catch (error) { ok(false, `P: ${error.stack}`) }

// Executa o botão de cópia real. Nenhuma cópia/telemetria ocorre antes do gesto.
{
  const fixture = loadGuideFixture()
  const component = fixture.load('app/claude-connector/ConnectPanel.tsx').CopyField
  const value = 'https://www.usekineo.com/api/mcp/studio'
  const tree = component({ value, label: 'URL Kineo Studio', locale: 'pt' })
  ok(fixture.clipboard.length === 0 && names(tree, 'code')[0].props.children === value && textOf(names(tree, 'button')[0]).trim() === 'Copiar', 'C1 URL selecionável e botão PT; sem ação antes do clique')
  await names(tree, 'button')[0].props.onClick()
  ok(fixture.clipboard.length === 1 && fixture.clipboard[0] === value && fixture.stateUpdates[0] === true, 'C2 clique copia exatamente a URL Studio e confirma sucesso')
}

console.log('D — desfaz exato e cadeia')
for (const file of FILES) {
  const current = rd(file), original = base(file)
  let error = ''
  try {
    if (semPaginasConector2110(current, file) !== original) error = 'LF diferente da base'
    if (semPaginasConector2110(current.replace(/\n/g, '\r\n'), file).replace(/\r\n/g, '\n') !== original) error = 'CRLF diferente da base'
    if (semPaginasConector2110(semPaginasConector2110(current, file), file) !== original) error = 'não idempotente'
  } catch (caught) { error = caught.message }
  ok(!error && original !== null, `D1 ${file}: ${error || 'desfeito = base, LF/CRLF/idempotência'}`)
}
ok(NEW.every((file) => fs.existsSync(path.join(ROOT, file)) && base(file) === null), 'D2 todos os novos existem e não existiam na base')
ok(/export function semHomeCardsClaros2010\(texto, p\) \{\n  texto = semPaginasConector2110\(texto, p\)/.test(rd('scripts/test-support/desfaz-home-cards-claros-2010.mjs')) && !/from ['"]\.\/desfaz-/.test(rd('scripts/test-support/desfaz-paginas-conector-2110.mjs')), 'D3 camada mais nova é chamada primeiro e não cria ciclo')
for (const file of FILES) ok(semHomeCardsClaros2010(rd(file), file) === semHomeCardsClaros2010(semPaginasConector2110(rd(file), file), file), `D4 cadeia tira camada nova primeiro: ${file}`)
for (const file of ['app/KineoLanding.tsx', 'lib/ui/homeRemodela2010.ts', 'lib/engineWall.ts', 'lib/homeVideoCuration.ts']) ok(rd(file) === base(file), `I intocado: ${file}`)
const changed = [...new Set([...git('diff', '--name-only', BASE).trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard').trim().split('\n')].filter(Boolean))]
ok(changed.every((file) => [...FILES, ...NEW].includes(file)), `D5 escopo declarado: ${changed.filter((file) => ![...FILES, ...NEW].includes(file)).join(', ') || 'ok'}`)
ok(git('log', '--format=%s', `${BASE}..HEAD`).trim().split('\n').filter(Boolean).every((subject) => subject.startsWith(MARCA)), 'D6 commits desta branch começam pela marca')
ok(semPaginasConector2110(null, FILES[0]) === null && semPaginasConector2110('sem marca', FILES[0]) === 'sem marca' && semPaginasConector2110(rd(FILES[0]), 'fora.ts') === rd(FILES[0]), 'D7 null/sem marca/fora do alvo passam iguais')

console.log('M — mutantes; cada aplicação precisa quebrar a prova sem exceção')
async function mutant(label, file, from, to) {
  const clean = await proofs(sources)
  if (clean.length) { ok(false, `M ${label}: prova original já vermelha (${clean[0]})`); return }
  const changed = sources[file].replace(from, to)
  if (changed === sources[file]) { ok(false, `M ${label}: não aplicou`); return }
  try { const errors = await proofs({ ...sources, [file]: changed }); ok(errors.length > 0, `M ${label}: ${errors[0] || 'NÃO detectou'}`) } catch (error) { ok(false, `M ${label}: exceção não vale como prova (${error.message})`) }
}
await mutant('rota fora do par', 'lib/seo/connectorGuides.ts', "path: '/criar-videos-com-ia-no-chatgpt'", "path: '/chatgpt-errado'")
await mutant('hreflang PT apontando para EN', 'lib/seo/connectorGuides.ts', "connectorGuide(client, 'pt').path", "connectorGuide(client, 'en').path")
await mutant('OG sem idioma PT', 'lib/seo/connectorGuides.ts', "locale: lang === 'pt' ? 'pt_BR' : 'en_US'", "locale: 'en_US'")
await mutant('wrapper PT chama EN', 'app/criar-videos-com-ia-no-claude/page.tsx', 'client="claude" lang="pt"', 'client="claude" lang="en"')
await mutant('wrapper sem hreflang/OG', 'app/make-ai-videos-in-chatgpt/page.tsx', "export const metadata = connectorGuideMetadata('chatgpt', 'en')", "export const metadata = { ...connectorGuideMetadata('chatgpt', 'en'), alternates: { canonical: 'https://www.usekineo.com/make-ai-videos-in-chatgpt' }, openGraph: undefined }")
await mutant('URL anônima no lugar da Studio', 'components/ConnectorGuidePage.tsx', 'value={CLAUDE_STUDIO_MCP_SERVER_URL}', 'value="https://www.usekineo.com/api/mcp"')
await mutant('passos sem lista numerada', 'components/ConnectorGuidePage.tsx', /<\/?ol\b/g, (match) => match.replace('ol', 'ul'))
await mutant('ChatGPT pago omitido dos passos', 'lib/seo/connectorGuides.ts', /paid ChatGPT|ChatGPT pago/g, 'ChatGPT')
await mutant('custo omitido', 'components/ConnectorGuidePage.tsx', /Você paga com os créditos da sua conta Kineo\./g, 'Você pode continuar.')
await mutant('3D como disponível', 'components/ConnectorGuidePage.tsx', "'Em breve' : 'Coming soon'", "'Disponível' : 'Available now'")
await mutant('anúncio prometido no chat', 'components/ConnectorGuidePage.tsx', /não gera nem cobra/g, 'já cria e cobra')
await mutant('vitrine removida', 'components/ConnectorGuidePage.tsx', '<ShowcaseGrid locale={lang} />', '<div />')
await mutant('CTA perdido', 'components/ConnectorGuidePage.tsx', '`/signup?utm_source=', '`/login?utm_source=')
await mutant('sitemap sem Claude PT', 'app/sitemap.ts', "path: '/criar-videos-com-ia-no-claude'", "path: '/claude-pt-errado'")
await mutant('pausa de anúncios ignorada', 'lib/seo/connectorGuides.ts', 'adsAvailable ? guide.description : filmOnly', 'guide.description')
await mutant('sitemap perde guia na saída', 'app/sitemap.ts', '...staticEntries,', "...staticEntries.filter((entry) => !entry.url.endsWith('/make-ai-videos-in-chatgpt')),")
await mutant('llms sem as linhas', 'app/llms.txt/route.ts', 'connectorGuideLlmsLines(BASE, Boolean(STUDIO_ADS_FACT))', "''")
await mutant('rodapé sem ChatGPT EN', 'components/Footer.tsx', "href: '/make-ai-videos-in-chatgpt'", "href: '/chatgpt-errado'")
await mutant('guia órfão na página mãe', 'app/claude-connector/page.tsx', 'href={guide.path}', 'href="/pricing"')
for (const file of FILES) {
  let rejected = false
  try { semPaginasConector2110(`${rd(file)}\n// ${MARCA} a mais`, file) } catch { rejected = true }
  ok(rejected, `M desfaz rejeita acréscimo extra: ${file}`)
}
for (const [file, entries] of Object.entries(SWAPS)) for (const [line] of entries) {
  let rejected = false
  try { semPaginasConector2110(rd(file).replace(line, `${line} incompleto`), file) } catch { rejected = true }
  ok(rejected, `M desfaz rejeita troca parcial: ${file}`)
}
console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exitCode = fail ? 1 : 0
