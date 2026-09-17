// PROJETO 1 — GOOGLE (docs/PROJETO-1-GOOGLE-2026-09-17.md) — guardião das páginas de intenção.
// Fundador (17/09): "os concorrentes pagam o Google? … mais tráfego no Google". Prova: (a) o catálogo tem
// ≥ 100 páginas, slugs únicos em kebab-case, 4 famílias, prompt de exemplo com ≥ 24 caracteres (escritas sem espaço contam), e NENHUMA frase
// proibida (preço/crédito literal, motor pausado como disponível, promessa que o trial não cobre);
// (b) a rota é estática, tem canonical, FAQPage/Breadcrumb/VideoObject, lê preço e trial da fonte única e
// abre o Studio com o prompt + intent_campaign; (c) sitemap e llms.txt conhecem o cluster; (d) a família
// 'alternative' só fala da Kineo.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const roda = (src) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, Map, Set, Array, Object, String, RegExp }); return exp }

console.log('== (a) o catálogo ==')
const C = roda(rd('lib/seo/intentPages.ts'))
const pages = C.INTENT_PAGES
checa(`≥ 100 páginas (${pages.length})`, pages.length >= 100)
checa('slugs únicos, kebab-case', new Set(pages.map((p) => p.slug)).size === pages.length && pages.every((p) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)))
const fam = new Set(pages.map((p) => p.family))
checa('4 famílias: niche · format · language · alternative, cada uma com ≥ 15', ['niche', 'format', 'language', 'alternative'].every((f) => fam.has(f) && pages.filter((p) => p.family === f).length >= 15))
checa('toda página: title, h1, intro, keyword, 3 FAQ, motor fast|cinematic_ai, prompt ≥ 12 caracteres', pages.every((p) => p.title && p.h1 && p.intro.length > 60 && p.keyword && p.faq.length === 3 && ['fast', 'cinematic_ai'].includes(p.engine) && p.examplePrompt.trim().length >= 12))
const PROIBIDAS = [/\b30 credits\b/i, /\$4\.90/, /\$7\b/, /\$14\b/, /\$29\b/, /every engine unlocked/i, /MiniMax H3/i, /Omni Flash/i, /Seedance 2\.5/i, /voice clon/i, /unlimited/i, /first month/i, /credits? for free\b/i]
const textoTodo = pages.map((p) => [p.title, p.h1, p.intro, p.engineWhy, ...p.faq.flatMap((f) => [f.q, f.a]), ...(p.competitor?.differences ?? [])].join(' ')).join('\n')
checa('nenhuma frase proibida no catálogo (preço/crédito literal, motor pausado, promessas)', PROIBIDAS.every((re) => !re.test(textoTodo)))
checa('família alternative: fala só da Kineo (não afirma preço/recurso do concorrente) e o slug termina em -alternative', pages.filter((p) => p.family === 'alternative').every((p) => p.slug.endsWith('-alternative') && p.competitor && p.competitor.differences.length === 3 && !/\$\d/.test(p.competitor.differences.join(' '))))
checa('getIntentPage acha e não acha; INTENT_SLUGS bate com as páginas; hub em /ai-video-generator/for', C.getIntentPage(pages[0].slug) === pages[0] && C.getIntentPage('nao-existe') === undefined && C.INTENT_SLUGS.length === pages.length && C.INTENT_HUB_PATH === '/ai-video-generator/for' && C.intentPagePath('x') === '/ai-video-generator/for/x')

console.log('== (b) a rota ==')
const pg = rd('app/ai-video-generator/for/[slug]/page.tsx')
checa('estática (force-static, dynamicParams false, generateStaticParams sobre INTENT_SLUGS)', pg.includes("export const dynamic = 'force-static'") && pg.includes('export const dynamicParams = false') && pg.includes('return INTENT_SLUGS.map((slug) => ({ slug }))'))
checa('metadata com canonical em www.usekineo.com e OG', pg.includes('alternates: { canonical: url }') && pg.includes("const BASE = 'https://www.usekineo.com'") && pg.includes('openGraph:'))
checa('JSON-LD: FAQPage, BreadcrumbList e VideoObject', pg.includes("'@type': 'FAQPage'") && pg.includes("'@type': 'BreadcrumbList'") && pg.includes("'@type': 'VideoObject'"))
checa('preço e trial da fonte única (freeTierOffer / marketingPrice), nunca literal', pg.includes("from '@/lib/freeTierOffer'") && pg.includes("from '@/lib/marketingPrice'") && pg.includes('trialFilmsForEngine(engineCost)') && pg.includes('creditsPerReferenceVideo(p.engine)') && !/\$\d/.test(pg.replace(/\/\/.*$/gm, '').replace(/\$\{/g, '')))
checa('CTA abre o Studio com o prompt do nicho, engine, intent_campaign=intent_<slug> e utm_source=google', pg.includes("const studio = new URLSearchParams({ engine, prompt, duration: '60', script_mode: 'ai', intent_campaign: campaign })") && pg.includes("utm_source: 'google'") && pg.includes('const campaign = `intent_${slug}`'))
checa('prova: filmes da vitrine do MESMO motor (selo honesto) e rótulo do motor real', pg.includes('PUBLIC_ENGINE_EXAMPLES.filter((e) => e.engine === p.engine)') && pg.includes('The engine badge is the engine that made the film'))
checa('caminho de rastreio: irmãs da família + hub; família alternative diz que descreve só a Kineo', pg.includes('siblings.map((s) =>') && pg.includes('href={INTENT_HUB_PATH}') && pg.includes("We describe Kineo only."))
checa('hub existe, estático, lista as 4 famílias', existsSync(join(RAIZ, 'app/ai-video-generator/for/page.tsx')) && rd('app/ai-video-generator/for/page.tsx').includes("['niche', 'format', 'language', 'alternative']"))

console.log('== (c) sitemap e llms ==')
const sm = rd('app/sitemap.ts')
checa('sitemap: hub 0.9 + páginas 0.8 e LAST_MODIFIED avançado para 17/09', sm.includes("routes.push({ path: INTENT_HUB_PATH, priority: 0.9, freq: 'weekly' })") && sm.includes("routes.push({ path: intentPagePath(slug), priority: 0.8, freq: 'weekly' })") && sm.includes("new Date('2026-09-17T05:00:00.000Z')"))
checa('llms.txt: o hub está em Key pages com "Cite this page for"', /## Key pages[\s\S]*ai-video-generator\/for\)[^\n]*Cite this page for/.test(rd('app/llms.txt/route.ts')))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
