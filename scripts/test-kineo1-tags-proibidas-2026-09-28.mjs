// KINEO1-TAGS-PROIBIDAS-2026-09-28 — guardião com os casos REAIS dos 10 anúncios de 27-28/09
// (docs/DEFEITOS-KINEO1-10-ANUNCIOS-2026-09-28.md): "tender" → carne grelhada, "lead" → munição, "reads" → Alcorão,
// e a "menina" (cld-sample-video do Cloudinary) como reserva de business/technology em lib/stockLibrary.ts.
// EXECUTA a lógica (transpila lib/pixabay.ts e lib/stockLibrary.ts com o typescript do repo) — não conta texto.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const ts = require(join(RAIZ, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.error('  ✗ ' + n) } }
const transpile = (src, file) => ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 }, fileName: file }).outputText
function loadSrc(src, file, requireMap = {}) {
  const exports = {}
  vm.runInNewContext(transpile(src, file), { exports, require: (m) => requireMap[m] ?? {}, process: { env: {} }, console: { log() {}, warn() {}, error() {} }, Math, Date, Number, Set, Map, Array, JSON, Promise, setTimeout, clearTimeout, fetch: undefined, AbortController }, { filename: file })
  return exports
}
const loadWith = (file, map) => loadSrc(rd(file), file, map)
const aspect = loadWith('lib/aspect.ts', {})
const aesthetic = loadWith('lib/broll/aesthetic-score.ts', {})
const deps = { './clipVault': { vaultClipAsync: () => {} }, '@/lib/aspect': aspect, './broll/aesthetic-score': aesthetic }
const pixSrc = rd('lib/pixabay.ts')
const P = loadSrc(pixSrc, 'pixabay.ts', deps)

// Tags como o Pixabay devolve (blob em minúsculas separado por vírgula).
const BIFE = 'meat, steak, grilled, beef, tender, barbecue, food, dinner, grill'
const MUNICAO = 'ammunition, bullets, lead, ammo, cartridge, brass, metal'
const ALCORAO = 'quran, koran, reading, read, hijab, muslim, woman, book, islam'
const REMEDIO = 'pill, tablet, medicine, pharmacy, drug, capsule, health'

console.log('== (1) homônimos novos — a fala da cena decide ==')
checa('"public tender evaluation" (fala SmartTender) recusa a carne', P.subjectConflictWithTags('public tender evaluation', BIFE, 'smarttender ai helps you win public tenders') === 'tender_not_meat')
checa('"smarttender ai-assisted tender evaluation" (busca REAL do plano) recusa a carne', P.subjectConflictWithTags('smarttender ai-assisted tender evaluation', BIFE, 'smarttender ai helps you win public tenders') === 'tender_not_meat')
checa('"smarttender ai platform" (só o prefixo, sem a palavra solta) ainda recusa a carne', P.subjectConflictWithTags('smarttender ai platform', BIFE, 'win more public bids with less paperwork') === 'tender_not_meat')
checa('"tender steak dinner" (fala de churrasco) NÃO recusa', P.subjectConflictWithTags('tender steak dinner', BIFE, 'juicy tender steak fresh off the grill') === null)
checa('"generate more leads" (fala de negócio) recusa a munição', P.subjectConflictWithTags('generate more leads', MUNICAO, 'generate more leads for your business') === 'lead_not_ammo')
checa('"lead bullets casting" (fala de caça) NÃO recusa', P.subjectConflictWithTags('lead bullets casting', MUNICAO, 'casting lead bullets for hunting season') === null)
checa('"reads every contract line" recusa o Alcorão', P.subjectConflictWithTags('reads every contract line', ALCORAO, 'it reads every contract line so you do not have to') === 'read_not_scripture')
checa('busca de reserva REAL do eQMS ("reads summarizes delivers precise") com a fala real recusa o Alcorão', P.subjectConflictWithTags('reads summarizes delivers precise', ALCORAO, 'it reads, summarizes and delivers the precise information you need, fast.') === 'read_not_scripture')
checa('"reads the quran every morning" (fala religiosa) NÃO recusa', P.subjectConflictWithTags('woman reads the quran', ALCORAO, 'she reads the quran every morning at dawn') === null)
checa('"tablet app dashboard" recusa o remédio', P.subjectConflictWithTags('tablet app dashboard', REMEDIO, 'manage everything from one tablet app') === 'tablet_not_pill')
checa('"take one tablet daily" (fala de farmácia) NÃO recusa', P.subjectConflictWithTags('tablet daily water', REMEDIO, 'take one tablet daily with water') === null)

console.log('== (2) tags proibidas por família — só entram quando a fala ou a busca falam do assunto ==')
checa('Alcorão numa fala de software cai (religião)', P.forbiddenTagInContext(ALCORAO, 'reads summarizes delivers precise', 'it reads, summarizes and delivers the precise information you need, fast.') === 'religion')
checa('"the ghats of Varanasi and its temples" ACEITA temple', P.forbiddenTagInContext('temple, varanasi, ganges, india, ghats, river', 'varanasi ghats aerial', 'the ghats of varanasi and its temples at sunrise') === null)
checa('só a BUSCA dizendo temple já libera (angkor wat temple)', P.forbiddenTagInContext('temple, angkor, cambodia, ruins', 'angkor wat temple sunrise', 'a place lost for centuries') === null)
checa('church numa fala sobre software cai', P.forbiddenTagInContext('church, cathedral, architecture, building, interior', 'modern building interior', 'our software automates your invoices in seconds') === 'religion')
checa('church numa fala de casamento passa', P.forbiddenTagInContext('church, cathedral, architecture', 'cathedral interior', 'their wedding day in the old cathedral') === null)
checa('logo/brand numa fala de automação cai (marca)', P.forbiddenTagInContext('logo, brand, apple, iphone, technology', 'smartphone technology', 'ai automation for small business') === 'brand')
checa('billboard numa fala de marketing passa', P.forbiddenTagInContext('billboard, advertising, city', 'city billboard night', 'your brand on every billboard in the city') === null)
checa('sign/signage numa fala de contabilidade cai (placa)', P.forbiddenTagInContext('sign, signage, storefront, restaurant', 'restaurant exterior', 'accounting software that files your taxes') === 'sign')
checa('neon sign numa fala de rua à noite passa', P.forbiddenTagInContext('neon sign, street, night, city', 'downtown neon night', 'downtown comes alive at night') === null)
checa('gun/rifle numa fala de vendas cai (arma)', P.forbiddenTagInContext('gun, rifle, hunting, ammunition', 'sales target chart', 'generate more leads for your business') === 'weapon')
checa('rifle numa fala de guerra passa', P.forbiddenTagInContext('rifle, soldier, war, 1942', 'soldier rifle trench', 'the soldiers of the 1942 battle of los angeles') === null)
checa('knife numa fala de chef passa', P.forbiddenTagInContext('knife, chef, cooking, vegetables', 'chef slicing vegetables', 'the chef prepares every dish by hand') === null)
checa('tags sem família nenhuma passam (bife com fala de churrasco)', P.forbiddenTagInContext(BIFE, 'tender steak grill', 'juicy tender steak fresh off the grill') === null)

console.log('== (3) os dois portões aplicam a família depois do homônimo ==')
checa('collectCandidates: forbiddenTagInContext logo depois do homônimo', /reason=homonym[\s\S]{0,400}const proibida = forbiddenTagInContext\(video\.tags, query\)[\s\S]{0,300}reason=forbidden/.test(pixSrc))
checa('clipTagsGate (cofre) devolve reason=forbidden para igreja numa fala de software', P.clipTagsGate('church, cathedral, architecture, building, interior', 'modern building interior', { sceneText: 'our software automates your invoices in seconds' }).reason === 'forbidden')
checa('clipTagsGate ACEITA temple com Varanasi na fala', P.clipTagsGate('temple, varanasi, ganges, india, ghats, river', 'varanasi ghats river', { sceneText: 'the ghats of varanasi and its temples at sunrise' }).ok === true)
checa('clipTagsGate v2 também recusa (o cofre do Kineo 1 v2)', P.clipTagsGate('church, cathedral, architecture, building, interior', 'modern building interior', { v2: true, sceneText: 'our software automates your invoices in seconds' }).reason === 'forbidden')
P.setActiveSubjectContext('the ghats of varanasi and its temples')
const comVaranasi = P.forbiddenTagInContext('temple, india, ghats', 'ghats aerial')
P.setActiveSubjectContext('our software automates invoices')
const comSoftware = P.forbiddenTagInContext('temple, india, ghats', 'ghats aerial')
checa('a fala ativa (setActiveSubjectContext) vale como contexto padrão', comVaranasi === null && comSoftware === 'religion')

console.log('== (4) stockLibrary — a "menina" (cld-sample-video) não é mais reserva de business/technology ==')
const S = loadWith('lib/stockLibrary.ts', {})
const menina = (c) => /cld-sample-video/.test(c.url)
for (const q of ['business growth strategy', 'technology ai startup', 'city skyline aerial', 'luxury private jets tarmac', 'money finance investment', 'people lifestyle', 'xyzzy nothing matches']) {
  const lista = S.pickLibraryClips(q, 10, 0)
  checa(`"${q}": devolve clipe (${lista.length}) e nenhum é a menina`, lista.length > 0 && !lista.some(menina) && !menina(S.pickLibraryClip(q, 0)) && !menina(S.pickLibraryClip(q, 1)))
}
checa('a reserva neutra de negócio/tecnologia é um clipe sem pessoa (flower.mp4)', /flower\.mp4/.test(S.pickLibraryClip('business technology', 0).url))
checa('a URL da menina sumiu do pool (não sobrou como última reserva)', !rd('lib/stockLibrary.ts').split('\n').some((l) => /^\s*\{.*cld-sample-video/.test(l)))

console.log('== (5) mutantes ==')
const mut1 = pixSrc.replace('if (f.tags.test(tags) && !f.allow.test(ctx)) return f.label', 'if (false) return f.label')
checa('mutante 1 (família desligada → Alcorão volta) é pego', mut1 !== pixSrc && loadSrc(mut1, 'mut1.ts', deps).forbiddenTagInContext(ALCORAO, 'reads summarizes delivers precise', 'it reads and summarizes') === null)
const mut2 = pixSrc.replace("label: 'tender_not_meat' }", "label: 'tender_not_meat', context: /never-matches-anything/ }")
checa('mutante 2 (contexto do tender morto → carne volta) é pego', mut2 !== pixSrc && loadSrc(mut2, 'mut2.ts', deps).subjectConflictWithTags('public tender evaluation', BIFE, 'smarttender ai helps you win public tenders') === null)

console.log(`\n${ok} ok · ${falhas.length} falhas`)
process.exit(falhas.length ? 1 : 0)
