// KINEO-PORTAS-16-LINGUAS-2026-09-20 — guardião: a porta grátis existe nas 16 línguas do catálogo, com hreflang cruzado,
// sitemap, língua atravessando o cadastro e preço vindo da fonte única.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, () => ({}))
  return m.exports
}

console.log('1) catálogo das 13 línguas')
const langsSrc = rd('lib/seo/freeShortsGeneratorLangs.ts')
const L = roda(langsSrc)
const catalogo = rd('lib/textLanguage.ts').match(/export type NarrationLanguage = ([^\n]+)/)[1].match(/'([a-z]+)'/g).map((s) => s.replace(/'/g, ''))
const esperadas = catalogo.filter((c) => !['en', 'pt', 'es'].includes(c))
const codes = L.FREE_SHORTS_LANGS.map((l) => l.code)
checa(`13 línguas = catálogo menos en/pt/es (${esperadas.join(',')})`, codes.length === 13 && esperadas.every((c) => codes.includes(c)) && new Set(codes).size === 13)
for (const l of L.FREE_SHORTS_LANGS) {
  const campos = [l.title, l.description, l.badge, l.h1, l.lead, l.form.label, l.form.placeholder, l.form.submit, l.form.examplesLabel, l.form.note, l.handoff.eyebrow, l.handoff.heading, l.handoff.description, l.handoff.label, l.handoff.placeholder, l.handoff.submit, l.handoff.note, l.proof.eyebrow, l.proof.line, l.faqTitle]
  checa(`${l.code}: todos os campos preenchidos, 3 exemplos, 3 FAQ, locale`, campos.every((c) => typeof c === 'string' && c.trim().length > 0) && l.examples.length === 3 && l.faq.length === 3 && typeof l.locale === 'string')
  checa(`${l.code}: FAQ de preço usa a fonte única (recebe o preço como parâmetro)`, l.faq.some((f) => f.a('PRECO_TESTE').includes('PRECO_TESTE')))
  checa(`${l.code}: título e descrição não são cópia do inglês`, !/Free AI Shorts Generator/.test(l.title))
}
checa('ar e ur são RTL; as outras não', L.FREE_SHORTS_LANGS.every((l) => (l.dir === 'rtl') === (l.code === 'ar' || l.code === 'ur')))
checa('nenhum preço digitado à mão no catálogo', !/\$ ?\d+[.,]\d\d|\b9[.,]90\b|\b14\b|\b19[.,]90\b/.test(langsSrc.replace(/\/\/.*$/gm, '')))
const alt = L.freeShortsAlternates('https://x')
checa('hreflang: 16 línguas + x-default, cada uma na sua URL', Object.keys(alt).length === 17 && alt.en === 'https://x/free-ai-shorts-generator' && alt['pt-BR'] === 'https://x/gerador-de-shorts-gratis' && alt.es === 'https://x/generador-de-shorts-gratis' && alt.fr === 'https://x/free-shorts-generator/fr' && alt['x-default'] === alt.en && esperadas.every((c) => Object.values(alt).includes(`https://x/free-shorts-generator/${c}`)))

console.log('2) a página')
const page = rd('app/free-shorts-generator/[lang]/page.tsx')
checa('rota estática por língua, 404 fora do catálogo', page.includes('export const dynamicParams = false') && page.includes('FREE_SHORTS_LANGS.map((l) => ({ lang: l.code }))') && page.includes('if (!L) notFound()'))
checa('metadata: canonical próprio + hreflang das 16', page.includes('alternates: { canonical: url, languages: freeShortsAlternates(BASE) }'))
checa('<main lang e dir vêm do catálogo', page.includes('<main lang={L.locale} dir={L.dir}'))
checa('formulário leva language={L.code} e campanha seo_ (atribuição orgânica)', page.includes('language={L.code}') && page.includes('const campaign = `seo_gerador_${L.code}`') && page.includes('campaign={campaign}'))
checa('handoff de roteiro na mesma língua', page.includes('campaign={`seo_chatgpt_to_shorts_${L.code}`}') && (page.match(/language=\{L\.code\}/g) || []).length === 2)
checa('preço vem de marketingPrice', page.includes("import { STARTER_USD_AMOUNT } from '@/lib/marketingPrice'") && page.includes('f.a(price)'))
checa('mesma prova viva e mesmo exit-intent da porta PT', page.includes('PUBLIC_EXAMPLES.slice(0, 3)') && page.includes('<ExitIntentOffer variant="free" />'))

console.log('3) as 3 portas antigas apontam para as 16')
for (const f of ['app/free-ai-shorts-generator/page.tsx', 'app/gerador-de-shorts-gratis/page.tsx', 'app/generador-de-shorts-gratis/page.tsx']) {
  const s = rd(f)
  checa(`${f}: languages: freeShortsAlternates(BASE)`, s.includes('languages: freeShortsAlternates(BASE),') && s.includes("import { freeShortsAlternates } from '@/lib/seo/freeShortsGeneratorLangs'"))
}

console.log('4) sitemap e cadastro')
const sm = rd('app/sitemap.ts')
checa('sitemap registra as 13 com prioridade 0.9', sm.includes("routes.push({ path: `/free-shorts-generator/${l.code}`, priority: 0.9, freq: 'weekly' })") && sm.includes("import { FREE_SHORTS_LANGS } from '@/lib/seo/freeShortsGeneratorLangs'"))
const signup = rd('app/(auth)/signup/page.tsx')
checa('cadastro deixa qualquer língua do catálogo atravessar (não só en/pt/es)', signup.includes("const language = narrationLanguage(params.get('language'))") && signup.includes("if (language) activationParams.set('language', language)") && !signup.includes("language === 'en' || language === 'pt' || language === 'es'"))
checa('TopicGeneratorForm aceita NarrationLanguage', rd('app/youtube-shorts-from-topic/TopicGeneratorForm.tsx').includes('language?: NarrationLanguage'))
checa('LocalizedScriptHandoff aceita as 15 não-inglesas', rd('components/LocalizedScriptHandoff.tsx').includes("language: Exclude<NarrationLanguage, 'en'>"))

console.log('5) mutantes')
const mut1 = roda(langsSrc.replace("  for (const l of FREE_SHORTS_LANGS) out[l.locale] = `${base}/free-shorts-generator/${l.code}`\n", ''))
checa('mutante (hreflang sem as 13) é pego', Object.keys(mut1.freeShortsAlternates('https://x')).length !== 17)
const semVi = langsSrc.replace(/  \{\n    code: 'vi',[\s\S]*?\n  \},\n\]/, ']')
checa('mutante (língua removida do catálogo) é pego', roda(semVi).FREE_SHORTS_LANGS.length === 12)

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
