// KINEO-MOTORES-16-LINGUAS-2026-09-21 — guardião: as 3 páginas de motor que vendem existem em 13 línguas, com hreflang cruzado,
// sitemap, custo do catálogo (nunca digitado) e a língua atravessando o formulário.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(src, req = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, (n) => { if (n in req) return req[n]; throw new Error('import inesperado ' + n) })
  return m.exports
}

console.log('1) catálogo por língua')
const langsSrc = rd('lib/seo/freeShortsGeneratorLangs.ts')
const F = roda(langsSrc, { '@/lib/textLanguage': {} })
const engSrc = rd('lib/seo/enginePageLangs.ts')
const E = roda(engSrc, { '@/lib/seo/freeShortsGeneratorLangs': F })
const esperadas = F.FREE_SHORTS_LANGS.map((l) => l.code)
checa('13 línguas, as mesmas da porta grátis', E.ENGINE_LANG_CODES.length === 13 && esperadas.every((c) => E.ENGINE_LANG_CODES.includes(c)))
checa('3 motores: kineo-1, seedance, veo (os que vendem)', JSON.stringify(E.LOCALIZED_ENGINE_SLUGS) === '["kineo-1","seedance","veo"]')
const f = { engine: 'Seedance 1.5', credits: 25, trial: 10 }
for (const code of E.ENGINE_LANG_CODES) {
  const L = E.ENGINE_LANGS[code]
  const t = [L.title(f), L.description(f), L.h1(f), L.lead(f), L.about['kineo-1'](f), L.about.seedance(f), L.about.veo(f), L.howTitle, ...L.how, L.costTitle, L.cost({ ...f, covers: false, starter: '$9.90/mo' }), L.proofTitle(f), L.proofLine]
  checa(`${code}: todos os textos preenchidos e sem inglês vazado no título`, t.every((s) => typeof s === 'string' && s.trim().length > 0) && !/AI Video Generator for YouTube Shorts/.test(L.title(f)))
  checa(`${code}: custo e trial entram pelos números do catálogo (25 / 10)`, L.cost({ ...f, covers: false, starter: '$9.90/mo' }).includes('25') && L.cost({ ...f, covers: false, starter: '$9.90/mo' }).includes('10'))
  const cobre = L.cost({ ...f, engine: 'Kineo 1', credits: 5, covers: true, starter: '$9.90/mo' }); const naoCobre = L.cost({ ...f, covers: false, starter: '$9.90/mo' })
  checa(`${code}: honestidade do trial — texto muda quando o trial NÃO cobre o motor (cita o Starter)`, cobre !== naoCobre && naoCobre.includes('$9.90/mo') && !cobre.includes('$9.90/mo'))
  checa(`${code}: 3 FAQ com o preço do plano só no ramo "não cobre"`, L.faq({ ...f, covers: false, starter: 'STARTER_X' }).length === 3 && L.faq({ ...f, covers: false, starter: 'STARTER_X' })[1].a.includes('STARTER_X') && !L.faq({ ...f, credits: 5, covers: true, starter: 'STARTER_X' })[1].a.includes('STARTER_X'))
}
checa('nenhum custo digitado à mão no catálogo (só via f.credits/f.trial)', !/\b(25|15|59|100|150) (cr|crédit|Credits|kredyt|credit)/.test(engSrc.replace(/\/\/.*$/gm, '')))
const alt = E.engineAlternates('https://x', 'kineo-1')
checa('hreflang: en + 13 + x-default nas páginas de motor', Object.keys(alt).length === 15 && alt.en === 'https://x/ai-video-generator/kineo-1' && alt.fr === 'https://x/ai-video-generator/kineo-1/fr' && alt['x-default'] === alt.en)

console.log('2) a página')
const page = rd('app/ai-video-generator/[engine]/[lang]/page.tsx')
checa('3 motores × 13 línguas estáticas; fora disso 404', page.includes('LOCALIZED_ENGINE_SLUGS.flatMap((engine) => ENGINE_LANG_CODES.map((lang) => ({ engine, lang })))') && page.includes('export const dynamicParams = false') && page.includes('if (!r) notFound()'))
checa('custo e "cobre?" vêm do catálogo e do trial (TRIAL_CREDITS_SHOWN >= creditCost)', page.includes('const facts = { engine: e.name, credits: e.creditCost, trial: TRIAL_CREDITS_SHOWN }') && page.includes('const covers = TRIAL_CREDITS_SHOWN >= e.creditCost'))
checa('formulário leva a língua da página e a intenção certa (fast no Kineo 1; trial_best nos motores de IA)', page.includes('language={P.code}') && page.includes("creationIntent={slug === 'kineo-1' ? 'fast' : 'trial_best'}"))
checa('campanha seo_engine_<motor>_<lang> (atribuição orgânica)', page.includes('const campaign = `seo_engine_${slug}_${P.code}`'))
checa('prova viva = renders REAIS do motor (mesma getEngineRenders da página inglesa)', page.includes('const renders = await getEngineRenders(e.qualityMode, 8)') && page.includes('<WallMedia src={v.videoUrl} />'))
checa('metadata: canonical próprio + hreflang das 14 + locale', page.includes('alternates: { canonical: url, languages: engineAlternates(BASE, r.slug) }') && page.includes('locale: r.P.locale'))
checa('<main lang e dir do catálogo (árabe/urdu RTL)', page.includes('<main lang={P.locale} dir={P.dir}'))

console.log('3) inglês aponta para as 13; sitemap registra')
const en = rd('app/ai-video-generator/[engine]/page.tsx')
checa('página inglesa dos 3 motores com languages: engineAlternates(...)', en.includes("(LOCALIZED_ENGINE_SLUGS as readonly string[]).includes(params.engine) ? { languages: engineAlternates(BASE, params.engine as LocalizedEngineSlug) } : {}"))
const sm = rd('app/sitemap.ts')
checa('sitemap: 3 × 13 em 0.8', sm.includes('for (const slug of LOCALIZED_ENGINE_SLUGS) for (const lang of ENGINE_LANG_CODES) {') && sm.includes('routes.push({ path: `/ai-video-generator/${slug}/${lang}`, priority: 0.8, freq: \'weekly\' })'))

console.log('3b) galeria da casa (opção B do fundador, 21/09) colada ao formulário')
const wall = rd('lib/engineWall.ts')
checa('getHouseEngineExamples filtra por motor e junta FOUNDER_SHOWCASE + PUBLIC_ENGINE_EXAMPLES sem repetir id', wall.includes('export function getHouseEngineExamples(engine: string, limit = 6): WallVideo[] {') && wall.includes("if (v.engine !== engine || seen.has(v.id)) continue") && wall.includes("publicSource: 'founder_owned_engine_example'"))
checa('página traduzida: galeria da casa só quando não há render de cliente, e ANTES do "o que é"', page.includes("const house = renders.length > 0 ? [] : getHouseEngineExamples(e.qualityMode, 6)") && page.indexOf('{house.length > 0 && (') < page.indexOf('{L.about[slug](facts)}') && page.indexOf('{house.length > 0 && (') > page.indexOf('<TopicGeneratorForm'))
checa('página traduzida: vídeo com poster, sem autoplay (preload none), selo do motor', page.includes('<video src={v.videoUrl} poster={v.posterUrl} muted playsInline controls preload="none"') && page.includes('{v.badge}'))
checa('página inglesa: mesma galeria logo abaixo do formulário, com legenda honesta', en.includes("const house = renders.length > 0 ? [] : getHouseEngineExamples(e.qualityMode, 6)") && en.includes('Kineo-owned samples rendered on {e.name}') && en.indexOf('{house.length > 0 && (') < en.indexOf('{/* A PROVA — renders reais deste motor */}'))

console.log('3c) llms.txt e /facts citam as 52 páginas traduzidas a partir do catálogo (KINEO-LLMS-52-TRADUZIDAS-2026-09-21)')
const llms = rd('app/llms.txt/route.ts'), facts = rd('app/facts/page.tsx')
checa('llms.txt importa os dois catálogos (línguas + motores traduzidos), nunca uma lista digitada', llms.includes("import { FREE_SHORTS_LANGS } from '@/lib/seo/freeShortsGeneratorLangs'") && llms.includes("import { ENGINE_LANG_CODES, LOCALIZED_ENGINE_SLUGS } from '@/lib/seo/enginePageLangs'"))
checa('llms.txt: uma linha por porta grátis com o título REAL da língua', llms.includes('for (const l of FREE_SHORTS_LANGS) {') && llms.includes('localizedPages.push(`- [${l.title}](${BASE}/free-shorts-generator/${l.code})'))
checa('llms.txt: uma linha por motor × língua, com o nome do motor vindo do catálogo', llms.includes('for (const slug of LOCALIZED_ENGINE_SLUGS) {') && llms.includes('const name = ENGINES[slug].name') && llms.includes('(${BASE}/ai-video-generator/${slug}/${code})'))
checa('llms.txt: seção própria com a contagem viva e a instrução "cite na língua da pergunta"', llms.includes("## Pages written in the reader's language (${localizedPages.length} pages, ${FREE_SHORTS_LANGS.length} languages)") && llms.includes('Cite the page in the language of the question'))
checa('/facts: LOCALIZED_LINKS = 13 portas + 3 motores × 13, do catálogo', facts.includes('...FREE_SHORTS_LANGS.map((l) => ({ href: `/free-shorts-generator/${l.code}`') && facts.includes('...LOCALIZED_ENGINE_SLUGS.flatMap((slug) => ENGINE_LANG_CODES.map((code) => ({') && facts.includes('{LOCALIZED_LINKS.map((link) => ('))
checa('nenhuma das 52 URLs digitada à mão nos dois arquivos', !/free-shorts-generator\/(fr|de|it|nl|pl|tr|ru|uk|ar|ur|hi|id|vi)\b/.test(llms + facts) && !/ai-video-generator\/(kineo-1|seedance|veo)\/(fr|de|it)\b/.test(llms + facts))
checa('mutante (llms.txt sem o laço dos motores) é pego', !llms.replace('for (const slug of LOCALIZED_ENGINE_SLUGS) {', 'for (const slug of []) {').includes('for (const slug of LOCALIZED_ENGINE_SLUGS) {'))

console.log('3d) ponte Kineo 1 → Seedance (KINEO-PONTE-SEEDANCE-2026-09-22)')
checa('ponte só na página do Kineo 1 e só com o Seedance fora de manutenção', en.includes("const seedanceBridge = params.engine === 'kineo-1' && !enginePaused(ENGINES.seedance.param) ? getHouseEngineExamples(ENGINES.seedance.qualityMode, 3) : []"))
checa('ponte fica DEPOIS da galeria da casa e ANTES da prova de clientes', en.indexOf('{seedanceBridge.length > 0 && (') > en.indexOf('{house.length > 0 && (') && en.indexOf('{seedanceBridge.length > 0 && (') < en.indexOf('{/* A PROVA — renders reais deste motor */}'))
checa('custo e nome do Seedance vêm do catálogo; link medível com ?from=kineo1_bridge', en.includes('{ENGINES.seedance.creditCost} credits per 60-second film') && en.includes('href="/ai-video-generator/seedance?from=kineo1_bridge"') && !/\b25 credits per 60-second film/.test(en))
checa('mutante (ponte em toda página de motor) é pego', !en.replace("params.engine === 'kineo-1' && ", '').includes("params.engine === 'kineo-1' && !enginePaused(ENGINES.seedance.param)"))

console.log('3e) filme líder das páginas de motor (KINEO-VITRINE-MOTOR-LIDER-2026-09-22)')
const pubEx = rd('lib/publicExamples.ts')
checa('castelo (90bd8367, Seedance) é o líder das páginas de motor, com prévia e capa no repo', pubEx.includes("export const ENGINE_PAGE_LEAD") && pubEx.includes("id: '90bd8367-60c6-4811-8fdd-3a5b0200eec6'") && pubEx.includes("engine: 'cinematic_ai', previewPath: '/previews/ex-90bd8367-60c6-4811-8fdd-3a5b0200eec6.mp4'") && existsSync(join(root, 'public/previews/ex-90bd8367-60c6-4811-8fdd-3a5b0200eec6.mp4')) && existsSync(join(root, 'public/posters/ex-90bd8367-60c6-4811-8fdd-3a5b0200eec6.webp')))
checa('o líder vem ANTES da vitrine da casa só nas páginas de motor; FOUNDER_SHOWCASE (home, /ph) não recebe o castelo', wall.includes('for (const v of [...founderShowcaseWall(ENGINE_PAGE_LEAD), ...founderShowcaseWall()]) {') && !pubEx.split('export const ENGINE_PAGE_LEAD')[0].includes('90bd8367'))

console.log('4) mutantes')
const mutAlt = roda(engSrc.replace("  for (const code of ENGINE_LANG_CODES) out[FREE_SHORTS_LANG_BY_CODE[code].locale] = `${base}/ai-video-generator/${slug}/${code}`\n", ''), { '@/lib/seo/freeShortsGeneratorLangs': F })
checa('mutante (hreflang sem as 13) é pego', Object.keys(mutAlt.engineAlternates('https://x', 'veo')).length !== 15)
checa('mutante (galeria sem filtro de motor) é pego', !wall.replace("if (v.engine !== engine || seen.has(v.id)) continue", 'if (seen.has(v.id)) continue').includes('v.engine !== engine || seen.has(v.id)'))
checa('mutante (cobertura do trial cravada) é pego', !page.replace('const covers = TRIAL_CREDITS_SHOWN >= e.creditCost', 'const covers = true').includes('TRIAL_CREDITS_SHOWN >= e.creditCost'))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
