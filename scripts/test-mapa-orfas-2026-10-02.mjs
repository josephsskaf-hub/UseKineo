// KINEO-MAPA-ORFAS-2026-10-02 · KINEO-MAPA-PRODUTOS-2026-10-02 · KINEO-MOTORES-PT-ES-2026-10-02 ·
// KINEO-PRECO-REAIS-PORTA-PT-2026-10-02 — guardião da seção B (itens 4–5) e da parte de mapa do A1.
//
// Prova, sem rede, banco, render pago nem env:
//  (A) órfãos com link interno: o rodapé (presente em toda página pública que o importa) liga as 3 páginas de produto,
//      o hub de motores, o hub de casos de uso (que lista as 100), o hub /vs (que lista as canônicas), as 3 comparações
//      de anúncio e as 16 portas de língua — TUDO derivado do catálogo (nenhum caminho de órfão digitado); os hubs
//      /ai-video-generator e /vs listam as páginas de motor traduzidas e as comparações de anúncio do catálogo.
//  (B) sitemap: /showcase (com o interruptor) e /support entram; as 3 páginas de produto entram em 0.8 weekly;
//      LAST_MODIFIED = 2026-10-02 com o motivo escrito.
//  (C) /llms.txt e /api/facts: Clips/Spaces/Ads v2 com preço derivado (clipCreditCost, catálogo de imagens,
//      adsV2Credits), Produção só com PRODUCAO_PUBLIC=true e sem preço; PLAN_FACTS intocado.
//  (D) /ads/for: vídeo da casa existe em public/ (o reanchor do guardião de segmentos prova a página).
//  (E) pt/es nas páginas de motor atrás de ENGINE_PAGES_PT_ES_LIVE=false (nada muda no ar) e prontas quando true.
//  (F) preço em reais da porta PT atrás de GERADOR_BRL_PRICE_LIVE=false, valor da tabela que o checkout cobra.
// Mutantes em memória provam que cada trava ficaria vermelha.
import { readFileSync, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import Module from 'node:module'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { renderPage } from './preview-ux-complete.mjs'
import { offlineModules } from './gpt24h-offline-support.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(RAIZ, 'package.json'))
const ts = require('typescript')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
function pure(src) { const box = { exports: {} }; vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: 1, target: 7 } }).outputText, { exports: box.exports }); return box.exports }

// ── gancho de require (mesmo desenho de scripts/test-ads-aeo-2026-09-24.mjs): .ts transpilado, '@/x' → <raiz>/x ──────
const acha = (base) => [base, base + '.ts', base + '.tsx', join(base, 'index.ts')].find((c) => existsSync(c) && statSync(c).isFile())
const resolveOriginal = Module._resolveFilename
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) { const f = acha(join(RAIZ, request.slice(2))); if (f) return f }
  if ((request.startsWith('./') || request.startsWith('../')) && parent?.filename?.match(/\.tsx?$/)) { const f = acha(resolve(dirname(parent.filename), request)); if (f) return f }
  return resolveOriginal.call(this, request, parent, ...rest)
}
const overrides = new Map()
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (mod, filename) => {
    const src = overrides.get(filename) ?? readFileSync(filename, 'utf8')
    mod._compile(ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: filename }).outputText, filename)
  }
}
const limpa = () => { for (const k of Object.keys(require.cache)) if (k.startsWith(RAIZ) && !k.includes('node_modules')) delete require.cache[k] }
const req = (p) => require(join(RAIZ, p))
async function renderiza(patch = {}) {
  limpa(); overrides.clear()
  for (const [file, [from, to]] of Object.entries(patch)) { const src = rd(file); if (!src.includes(from)) throw new Error('âncora do mutante sumiu: ' + from); overrides.set(join(RAIZ, file), src.split(from).join(to)) }
  const llms = await (await req('app/llms.txt/route.ts').GET()).text()
  const facts = JSON.parse(await req('app/api/facts/route.ts').GET().text())
  return { llms, facts }
}

// ═══ (A) órfãos com link interno ════════════════════════════════════════════════════════════════════════════════════
console.log('A) rodapé e hubs')
const footerSrc = rd('components/Footer.tsx')
const pages = pure(rd('lib/growth/productLandingPages.ts'))
const intent = pure(rd('lib/seo/intentPages.ts'))
const langs = pure(rd('lib/seo/freeShortsGeneratorLangs.ts'))
const adsSnap = JSON.parse(rd('lib/growth/adsCompetitorSnapshot.json')).competitors
const doors = Object.entries(langs.freeShortsAlternates('')).filter(([k]) => k !== 'x-default').map(([, h]) => h)
const footerHtml = renderPage('components/Footer.tsx')
const hrefs = new Set([...footerHtml.matchAll(/href="([^"]*)"/g)].map((m) => m[1]))
const mustLink = [...pages.PRODUCT_LANDING_PAGES.map((p) => p.path), '/ai-video-generator', intent.INTENT_HUB_PATH, '/vs', ...adsSnap.map((c) => '/vs/' + c.slug), ...doors]
ok(pages.PRODUCT_LANDING_PAGES.map((p) => p.path).join('|') === '/ai-virtual-staging-video|/ai-video-clip-generator|/ai-actor-ads', 'catálogo: os 3 caminhos exatos do A1')
ok(doors.length === 16 && doors.includes('/gerador-de-shorts-gratis') && doors.includes('/generador-de-shorts-gratis') && doors.includes('/free-shorts-generator/fr'), 'catálogo: 16 portas de língua (en/pt/es + 13)')
const missing = mustLink.filter((h) => !hrefs.has(h))
ok(missing.length === 0, `rodapé renderizado liga todo órfão-cabeça (${mustLink.length} links)${missing.length ? ' — faltam ' + missing.join(', ') : ''}`)
ok((footerHtml.match(/<details /g) || []).length === 4, 'rodapé segue com 4 grupos <details> (a linha de línguas fica fora deles)')
ok(/hrefLang="pt-BR"|hreflang="pt-BR"/.test(footerHtml) && footerHtml.includes('Português'), 'porta de língua leva hreflang e o nome na própria língua')
const typedOrphan = /['"`]\/(ai-virtual-staging-video|ai-video-clip-generator|ai-actor-ads|free-shorts-generator\/[a-z]{2}|gerador-de-shorts-gratis|generador-de-shorts-gratis|vs\/[a-z-]+-alternative|ai-video-generator\/for)['"`]/
ok(!typedOrphan.test(footerSrc), 'rodapé: nenhum caminho de órfão digitado (tudo vem do catálogo)')
ok(footerSrc.includes('...PRODUCT_LANDING_PAGES.map((page) => ({ href: page.path, label: page.footerLabel })),') && footerSrc.includes('links: ADS_COMPARISONS.map((competitor) => ({ href: adsComparisonPath(competitor.slug)') && footerSrc.includes("Object.entries(freeShortsAlternates(''))") && footerSrc.includes('{ href: INTENT_HUB_PATH, label: `AI video for ${INTENT_SLUGS.length} use cases` }'), 'rodapé: as 4 listas derivam do catálogo')
const hub = rd('app/ai-video-generator/page.tsx')
ok(hub.includes('{LOCALIZED_ENGINE_SLUGS.map((slug) => (') && hub.includes('{ENGINE_LANG_CODES.map((code) => (') && hub.includes('href={`/ai-video-generator/${slug}/${code}`}') && hub.includes('<Link href={INTENT_HUB_PATH}'), 'hub /ai-video-generator: motores traduzidos × línguas + hub de casos de uso, do catálogo')
const forHub = rd('app/ai-video-generator/for/page.tsx')
ok(forHub.includes('INTENT_PAGES.filter((p) => p.family === fam).map((p) => (') && forHub.includes('href={intentPagePath(p.slug)}'), 'hub /ai-video-generator/for lista as 100 do catálogo')
const vsHub = rd('app/vs/page.tsx')
ok(vsHub.includes('{ADS_COMPARISONS.map((competitor) => (') && vsHub.includes('href={adsComparisonPath(competitor.slug)}') && !/['"`]\/vs\/[a-z-]+-alternative['"`]/.test(vsHub), 'hub /vs lista as 3 comparações de anúncio do snapshot (nada digitado)')
let usedBy = 0
for (const f of ['app/KineoLanding.tsx', 'app/ai-video-generator/page.tsx', 'app/ai-video-generator/for/page.tsx', 'app/vs/page.tsx', 'app/free-ai-shorts-generator/page.tsx', 'app/alternatives/page.tsx']) if (existsSync(join(RAIZ, f)) && rd(f).includes("from '@/components/Footer'")) usedBy++
ok(usedBy === 6, `o rodapé aparece na home e nos hubs indexáveis (home, /ai-video-generator, /for, /vs, porta grátis, /alternatives: ${usedBy}/6)`)
{ // mutante: um caminho de órfão digitado no rodapé → vermelho
  const m = footerSrc.replace('...PRODUCT_LANDING_PAGES.map((page) => ({ href: page.path, label: page.footerLabel })),', "{ href: '/ai-actor-ads', label: 'x' },")
  ok(m !== footerSrc && typedOrphan.test(m), 'mutante (caminho digitado no rodapé) → vermelho')
}

// ═══ (B) sitemap ════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('B) sitemap')
const sitemapMocks = {
  'app/free-ai-shorts/[niche]/page.tsx': { NICHE_SLUGS: [] }, 'app/alternatives/[competitor]/page.tsx': { COMPETITOR_SLUGS: [] },
  'lib/publicExamples.ts': { PUBLIC_EXAMPLES: [] }, 'lib/comparisons.ts': { CANONICAL_SLUGS: [] }, 'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
  'lib/publicSurfacePolicy.ts': { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false }, 'lib/growth/enginePageCatalog.ts': { ENGINE_SLUGS: [] },
  'lib/growth/citationAnswers.ts': { CITATION_ANSWER_LINKS: [], CITATION_REVIEW_DATE: '2026-09-27' },
  'lib/seo/enginePageLangs.ts': { LOCALIZED_ENGINE_SLUGS: [], ENGINE_LANG_CODES: [] },
}
const smSrc = rd('app/sitemap.ts')
const sitemapWith = (src) => offlineModules({ mocks: sitemapMocks, replacements: src ? { 'app/sitemap.ts': src } : {} })('app/sitemap.ts').default()
const sm = sitemapWith()
const entry = (path) => sm.filter((e) => e.url === 'https://www.usekineo.com' + path)
const showcaseOn = pure(rd('lib/showcaseTelemetry.ts')).SHOWCASE_PUBLIC
ok(existsSync(join(RAIZ, 'app/showcase/page.tsx')) && existsSync(join(RAIZ, 'app/support/page.tsx')) && !/noindex|index:\s*false/.test(rd('app/showcase/page.tsx') + rd('app/support/page.tsx')), '/showcase e /support existem e não são noindex')
ok(entry('/showcase').length === (showcaseOn ? 1 : 0) && entry('/support').length === 1, '/showcase (com SHOWCASE_PUBLIC) e /support no mapa, uma vez cada')
ok(pages.PRODUCT_LANDING_PAGES.every((p) => { const e = entry(p.path); return e.length === 1 && e[0].priority === 0.8 && e[0].changeFrequency === 'weekly' }), 'as 3 páginas de produto no mapa, 0.8 weekly, uma vez cada')
ok(smSrc.includes("const LAST_MODIFIED = new Date('2026-10-02T05:00:00.000Z')") && /KINEO-MAPA-PRODUTOS-2026-10-02 — advanced from 2026-09-17[\s\S]{0,400}Clips[\s\S]{0,80}Spaces/.test(smSrc), 'LAST_MODIFIED avançou para 2026-10-02 com o motivo escrito')
ok(!/['"`]\/(ai-virtual-staging-video|ai-video-clip-generator|ai-actor-ads)['"`]/.test(smSrc), 'sitemap: caminho de produto vem do catálogo, nunca digitado')
{ const m = smSrc.replace("  for (const page of PRODUCT_LANDING_PAGES) {\n", '  for (const page of PRODUCT_LANDING_PAGES.slice(1)) {\n')
  ok(m !== smSrc && !sitemapWith(m).some((e) => e.url.endsWith(pages.PRODUCT_LANDING_PAGES[0].path)), 'mutante (página de produto fora do laço) → vermelho') }

// ═══ (C) llms.txt e /api/facts ═══════════════════════════════════════════════════════════════════════════════════════
console.log('C) llms.txt e /api/facts')
const on = await renderiza()
const cat = req('lib/clips/clipCatalog.ts'), price = req('lib/clips/clipPricing.ts'), launch = req('lib/engineLaunch.ts')
const v2 = req('lib/ads/v2Tiers.ts'), v2s = req('lib/ads/v2Screen.ts'), img = req('lib/imageModels.ts')
const offered = cat.CLIP_ENGINE_ORDER.filter((k) => !launch.enginePaused(k) && (k !== 's25' || launch.S25_PUBLIC))
const P = on.facts.products
ok(P && P.clips && P.clips.url === 'https://www.usekineo.com/ai-video-clip-generator', '/api/facts: products.clips com a página do A1')
ok(JSON.stringify(P.clips.engines.map((e) => e.key)) === JSON.stringify(offered) && !offered.includes('omni') && !offered.includes('s25'), 'clips: só motores à venda (pausado/oculto fora — mesma régua da rota)')
ok(P.clips.engines.every((e) => e.options.length === cat.offeredSecondsFor(e.key).length && e.options.every((o) => o.credits === price.clipCreditCost(e.key, o.seconds))), 'clips: cada preço = clipCreditCost(motor, segundos oferecidos)')
ok(P.clips.engines.every((e) => e.options.every((o) => on.llms.includes(`${o.seconds} s = ${o.credits}`))), 'llms.txt: a tabela do clipe sai dos mesmos números')
const nano = Number.parseInt(img.IMG_ENGINES.find((e) => e.key === 'nanobanana').credits, 10)
const routeCost = Number((rd('app/api/images/generate/route.ts').match(/nanobanana: \{\n\s+slug: 'fal-ai\/nano-banana-pro',\n\s+cost: (\d+),/) || [])[1])
const spacesClient = rd('app/(dashboard)/spaces/SpacesClient.tsx')
ok(nano === routeCost && spacesClient.includes(`const NANO_CREDITS = ${nano}`), 'spaces: foto pronta = Nano Banana Pro do catálogo = a rota que cobra = a tela do Spaces')
ok(spacesClient.includes("body: JSON.stringify({ engine: 'kling', seconds: 5,") && P.spaces.clipSeconds === 5 && P.spaces.creditsPerClip === price.clipCreditCost('kling', 5), 'spaces: clipe = o pedido que a tela faz ao /api/clips (Kling 2.5, 5 s), preço do clipCreditCost')
ok(P.spaces.creditsPerPhotoWithClip === nano + price.clipCreditCost('kling', 5) && P.spaces.url === 'https://www.usekineo.com/ai-virtual-staging-video' && on.llms.includes(`${P.spaces.creditsPerPhotoWithClip} credits per photo`), 'spaces: soma das etapas, página do A1, no llms.txt')
ok(P.adsV2 && P.adsV2.seconds === v2s.ADS_V2_SCREEN_SECONDS && P.adsV2.tiers.every((t) => t.credits === v2.adsV2Credits(t.id, v2s.ADS_V2_SCREEN_SECONDS)), 'ads v2: créditos = adsV2Credits na duração que a tela vende')
ok(P.actorAds === null && !on.llms.includes('/ai-actor-ads') && !/AI actor/.test(on.llms), 'Produção fechada (PRODUCAO_PUBLIC=false): nenhuma linha no llms.txt e actorAds null')
ok(/## Recently shipped[^\n]*\n\n- 2026-09-29: Clips/.test(on.llms) && on.llms.includes('- 2026-09-30: Spaces') && on.llms.includes('- 2026-09-29: Studio Ads v2'), '"Recently shipped" ganhou Clips, Ads v2 e Spaces')
const factsSrc = rd('lib/kineoFacts.ts'), plFactsSrc = rd('lib/growth/productLandingFacts.ts'), llmsSrc = rd('app/llms.txt/route.ts')
// montageCredits: 0 é o único número escrito: a montagem do Spaces (app/api/spaces/montage) não debita nada — conferido abaixo.
ok(!/\b\d+ credits\b/.test(plFactsSrc.replace(/\/\/.*$/gm, '')) && !/credits: \d|Credits: \d/.test(plFactsSrc.replace(/montageCredits: 0,?/g, '')) && !/debit|creditCost|credits/i.test(rd('app/api/spaces/montage/route.ts').replace(/\/\/.*$/gm, '')), 'productLandingFacts: nenhum crédito digitado (montagem do Spaces = 0 porque a rota não debita)')
ok(factsSrc.includes('    products: PRODUCT_LANDING_FACTS,') && on.facts.plans.length > 0, '/api/facts: bloco products ao lado do resto; plans segue presente')
{ const planBlock = factsSrc.slice(factsSrc.indexOf('export const PLAN_FACTS'), factsSrc.indexOf('export const PLAN_FACTS') + 4000)
  ok(factsSrc.includes('export const PLAN_FACTS') && !/PRODUCT_LANDING|productLanding/.test(planBlock) && JSON.stringify(on.facts.plans) === JSON.stringify(req('lib/kineoFacts.ts').PLAN_FACTS), 'PLAN_FACTS intocado: o bloco de produtos não entra nos planos') }
const opened = await renderiza({ 'lib/ads/producao.ts': ['export const PRODUCAO_PUBLIC = false', 'export const PRODUCAO_PUBLIC = true'] })
ok(opened.facts.products.actorAds?.url === 'https://www.usekineo.com/ai-actor-ads' && opened.llms.includes('/ai-actor-ads') && /for businesses on request/.test(opened.llms) && !/AI actor[^\n]*\d+ credits/.test(opened.llms), 'mutante (PRODUCAO_PUBLIC=true) → linha aparece, SEM preço')
const clipsOff = await renderiza({ 'lib/clips/clipLaunch.ts': ['export const CLIPS_PUBLIC = true', 'export const CLIPS_PUBLIC = false'] })
ok(clipsOff.facts.products.clips === null && !clipsOff.llms.includes('/ai-video-clip-generator') && !clipsOff.llms.includes('2026-09-29: Clips'), 'mutante (CLIPS_PUBLIC=false) → Clips some do llms.txt e do JSON')
const priced = await renderiza({ 'lib/clips/clipPricing.ts': ['export const CLIP_MIN_CREDITS = 5', 'export const CLIP_MIN_CREDITS = 6'] })
ok(priced.facts.products.clips.fromCredits === 6 && priced.llms.includes('From 6 credits per clip'), 'mutante (piso do clipe muda na fonte) → llms.txt e JSON mudam juntos')

// ═══ (D) /ads/for: vídeo da casa ════════════════════════════════════════════════════════════════════════════════════
console.log('D) /ads/for')
const showcase = offlineModules()('lib/showcase.ts')
ok(showcase.SHOWCASE_MEDIA.ads.length > 0 && showcase.SHOWCASE_MEDIA.ads.every((a) => existsSync(join(RAIZ, 'public' + a.video)) && existsSync(join(RAIZ, 'public' + a.poster))), 'os anúncios da casa (SHOWCASE_MEDIA.ads) existem em public/previews e public/posters')
const segPage = rd('app/ads/for/[segment]/page.tsx')
ok(segPage.includes("import { SHOWCASE_MEDIA } from '@/lib/showcase'") && segPage.includes('a house demo, not a client result') && segPage.includes("'Example video coming soon · this is a placeholder, not a client result.'"), 'página de segmento: vídeo da casa com legenda honesta; placeholder só sem vídeo')

// ═══ (E) pt/es nas páginas de motor ═════════════════════════════════════════════════════════════════════════════════
console.log('E) pt/es atrás de ENGINE_PAGES_PT_ES_LIVE')
const engSrc = rd('lib/seo/enginePageLangs.ts')
const runEng = (src) => { const m = { exports: {} }; new Function('module', 'exports', 'require', ts.transpileModule(src, { compilerOptions: { module: 1, target: 7 } }).outputText)(m, m.exports, (n) => { if (n === '@/lib/seo/freeShortsGeneratorLangs') return langs; throw new Error('import inesperado ' + n) }); return m.exports }
const off = runEng(engSrc)
ok(/^export const ENGINE_PAGES_PT_ES_LIVE = false$/m.test(engSrc), 'interruptor nasce false')
ok(off.ENGINE_LANG_CODES.length === 13 && !off.ENGINE_LANG_CODES.includes('pt') && off.engineLangFor('pt') === undefined && off.engineDoorFor('es') === undefined && Object.keys(off.engineAlternates('https://x', 'veo')).length === 15, 'desligado: 13 línguas, pt/es fora de params, hreflang 15 — nada muda no ar')
const onEng = runEng(engSrc.replace('export const ENGINE_PAGES_PT_ES_LIVE = false', 'export const ENGINE_PAGES_PT_ES_LIVE = true'))
const altOn = onEng.engineAlternates('https://x', 'seedance')
ok(onEng.ENGINE_LANG_CODES.length === 15 && altOn['pt-BR'] === 'https://x/ai-video-generator/seedance/pt' && altOn.es === 'https://x/ai-video-generator/seedance/es' && Object.keys(altOn).length === 17, 'ligado: 15 línguas, hreflang ganha pt-BR e es')
ok(onEng.engineDoorFor('pt').doorPath === '/gerador-de-shorts-gratis' && onEng.engineDoorFor('es').doorPath === '/generador-de-shorts-gratis' && onEng.engineDoorFor('fr').doorPath === '/free-shorts-generator/fr' && onEng.engineDoorFor('pt').locale === 'pt-BR', 'ligado: a porta de cada língua aponta para o slug próprio (pt/es) ou /free-shorts-generator/<código>')
const f = { engine: 'Seedance 1.5', credits: 25, trial: 10 }
for (const code of ['pt', 'es']) {
  const L = onEng.engineLangFor(code), D = onEng.engineDoorFor(code)
  const t = [L.title(f), L.description(f), L.h1(f), L.lead(f), L.about['kineo-1'](f), L.about.seedance(f), L.about.veo(f), L.howTitle, ...L.how, L.costTitle, L.proofTitle(f), L.proofLine, D.badge, D.faqTitle, D.form.label, D.form.placeholder, D.form.submit, D.form.examplesLabel, D.form.note, D.proof.eyebrow, D.proof.line, ...D.examples]
  ok(t.every((s) => typeof s === 'string' && s.trim().length > 0) && !/AI Video Generator for YouTube Shorts/.test(L.title(f)), `${code}: textos e porta completos, sem inglês vazado no título`)
  const cobre = L.cost({ ...f, credits: 5, covers: true, starter: 'STARTER_X' }), naoCobre = L.cost({ ...f, covers: false, starter: 'STARTER_X' })
  ok(naoCobre.includes('25') && naoCobre.includes('10') && naoCobre.includes('STARTER_X') && !cobre.includes('STARTER_X'), `${code}: custo/trial do catálogo e honestidade do trial (Starter só quando não cobre)`)
  ok(L.faq({ ...f, covers: false, starter: 'STARTER_X' }).length === 3 && L.faq({ ...f, covers: false, starter: 'STARTER_X' })[1].a.includes('STARTER_X'), `${code}: 3 FAQ, preço do plano só no ramo "não cobre"`)
}
ok(!/\b(25|15|59|100|150) (cr|crédit|Credits|kredyt|credit)/.test(engSrc.replace(/\/\/.*$/gm, '')), 'nenhum custo digitado nos textos pt/es')
const langPage = rd('app/ai-video-generator/[engine]/[lang]/page.tsx')
ok(langPage.includes('const L = engineLangFor(params.lang)') && langPage.includes('const P = engineDoorFor(params.lang)') && langPage.includes('<Link href={P.doorPath}') && langPage.includes('LOCALIZED_ENGINE_SLUGS.flatMap((engine) => ENGINE_LANG_CODES.map((lang) => ({ engine, lang })))'), 'página: params, texto e porta seguem a lista publicada')
ok(llmsSrc.includes('const l = { locale: engineLangLocale(code) }'), 'llms.txt: locale da página de motor pelo catálogo (pt/es inclusos quando ligados)')

// ═══ (F) preço em reais da porta PT ═════════════════════════════════════════════════════════════════════════════════
console.log('F) R$ na /gerador-de-shorts-gratis atrás de GERADOR_BRL_PRICE_LIVE')
const brlSrc = rd('lib/seo/brlDoorPrice.ts')
const settle = offlineModules()('lib/settlementCurrency.ts')
const brlOff = offlineModules()('lib/seo/brlDoorPrice.ts')
const brlOn = offlineModules({ replacements: { 'lib/seo/brlDoorPrice.ts': brlSrc.replace('export const GERADOR_BRL_PRICE_LIVE = false', 'export const GERADOR_BRL_PRICE_LIVE = true') } })('lib/seo/brlDoorPrice.ts')
const OLD = 'Planos pagos liberam o MP4 limpo, a partir de US$ 9 por mês como preço de referência em USD. Para clientes no Brasil, a cobrança normalmente é em reais; confira o valor no checkout.'
ok(/^export const GERADOR_BRL_PRICE_LIVE = false$/m.test(brlSrc) && brlOff.geradorPaidPlansSentence('9') === OLD, 'desligado: a frase de hoje, byte a byte')
const brlLabel = settle.formatSettlementMoney('brl', settle.BRL_PLAN_PRICES_MINOR.starter.monthly)
ok(brlOn.geradorPaidPlansSentence('9').includes(brlLabel) && brlOn.starterBrlMonthlyLabel() === brlLabel, `ligado: o valor da tabela que o checkout cobra (${brlLabel})`)
ok(settle.BRL_PLAN_PRICES_MINOR.starter.monthly === 4990 || !brlOn.geradorPaidPlansSentence('9').includes('49,90'), 'ligado: nunca o R$ 49,90 da tabela V5 enquanto a tabela vigente for outra')
ok(!/R\$\s?\d/.test(brlSrc.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')) && !/R\$\s?\d/.test(rd('app/gerador-de-shorts-gratis/page.tsx')), 'nenhum valor em reais digitado (fonte: settlementCurrency)')
ok(rd('app/gerador-de-shorts-gratis/page.tsx').includes("'Você cria, assiste, baixa e posta vídeos Fast com marca d’água sem cartão nenhum. ' + geradorPaidPlansSentence(STARTER_USD_AMOUNT)"), 'porta PT: a resposta do FAQ (e o JSON-LD, que lê o mesmo array) passam pela função')
{ const tabela = rd('lib/settlementCurrency.ts').replace('starter: { monthly: 6490, annual: 64900 }', 'starter: { monthly: 7490, annual: 74900 }')
  const m = offlineModules({ replacements: { 'lib/settlementCurrency.ts': tabela, 'lib/seo/brlDoorPrice.ts': brlSrc.replace('export const GERADOR_BRL_PRICE_LIVE = false', 'export const GERADOR_BRL_PRICE_LIVE = true') } })('lib/seo/brlDoorPrice.ts')
  ok(tabela !== rd('lib/settlementCurrency.ts') && m.geradorPaidPlansSentence('9').includes('74,90'), 'mutante (tabela BRL muda) → a frase muda junto') }

console.log(`\n${pass} ok · ${fail} falhas`)
process.exit(fail ? 1 : 0)
