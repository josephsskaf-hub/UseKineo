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

console.log('== (6) revisão do cético — tag exata e compostos liberados; leitura religiosa legítima; bartender ==')
const DOLAR = 'dollar sign, money, cash, finance, dollar, currency, wealth'
checa("'dollar sign' numa fala sobre dinheiro NÃO é placa", P.forbiddenTagInContext(DOLAR, 'money dollar cash', 'five shocking facts about money that banks hide') === null)
checa("'dollar sign' passa no clipTagsGate (cofre) com fala de dinheiro", P.clipTagsGate(DOLAR, 'money dollar cash', { sceneText: 'five shocking facts about money that banks hide' }).ok === true)
checa("'sign' sozinha na mesma fala de dinheiro ainda cai (placa)", P.forbiddenTagInContext('sign, storefront, restaurant, money', 'money dollar cash', 'five shocking facts about money that banks hide') === 'sign')
checa("'street sign' NÃO é liberado: cai numa fala de contabilidade", P.forbiddenTagInContext('street sign, storefront, restaurant', 'restaurant exterior', 'accounting software that files your taxes') === 'sign')
checa("'street sign' segue passando quando a fala é de rua", P.forbiddenTagInContext('street sign, storefront, restaurant', 'restaurant exterior', 'the busiest street in downtown tokyo') === null)
const NEPAL = 'prayer flags, himalaya, nepal, mountain, everest, wind'
checa("'prayer flags' numa fala sobre o Nepal NÃO é religião", P.forbiddenTagInContext(NEPAL, 'himalaya nepal mountains', 'the highest villages of nepal sit above the clouds') === null)
checa("'prayer flags' passa no clipTagsGate (cofre) com fala do Nepal", P.clipTagsGate(NEPAL, 'himalaya nepal mountains', { sceneText: 'the highest villages of nepal sit above the clouds' }).ok === true)
checa("'prayer' sozinha na mesma fala do Nepal ainda cai (religião)", P.forbiddenTagInContext('prayer, himalaya, nepal, mountain', 'himalaya nepal mountains', 'the highest villages of nepal sit above the clouds') === 'religion')
checa("'cross country' numa fala de corrida NÃO é religião", P.forbiddenTagInContext('cross country, running, trail, athlete, forest', 'trail running forest', 'she trains for the race every morning') === null)
checa("'cross' sozinha na mesma fala de corrida ainda cai (religião)", P.forbiddenTagInContext('cross, running, trail, athlete', 'trail running forest', 'she trains for the race every morning') === 'religion')
const BIBLIA = 'bible, reading, book, faith, christian, pages'
checa('"she reads the bible every morning" (fala religiosa; "page" ainda acende o contexto largo) NÃO recusa a Bíblia', P.subjectConflictWithTags('woman reads a book', BIBLIA, 'she reads the bible every morning, one page at a time') === null)
checa('a mesma fala SEM a palavra religiosa ainda recusa o Alcorão (o contexto largo continua vivo)', P.subjectConflictWithTags('woman reads a book', ALCORAO, 'she reads one page every morning before work') === 'read_not_scripture')
checa('clipTagsGate (cofre) ACEITA a tag bible com "she reads the bible every morning" (busca "bible reading morning": relevância passa; homônimo e família não recusam)', P.clipTagsGate(BIBLIA, 'bible reading morning', { sceneText: 'she reads the bible every morning, one page at a time' }).ok === true)
checa('"holy" na fala também libera (scripture)', P.subjectConflictWithTags('reads the holy text', 'scripture, reading, book, holy', 'he reads the holy text and its every line') === null)
const BAR = 'bar, bartender, cocktail, drink, food, kitchen, restaurant'
checa("'bartender' NÃO dispara tender_not_meat numa fala de negócio", P.subjectConflictWithTags('bartender cocktail bar', BAR, 'the bar business grew 40 percent with our software') === null)
checa("'smarttender' (prefixo legítimo) SEGUE disparando", P.subjectConflictWithTags('smarttender ai platform', BIFE, 'win more public bids with less paperwork') === 'tender_not_meat')
checa("'tender' solta ao lado de 'bartender' na mesma busca ainda dispara", P.subjectConflictWithTags('bartender tender document', BIFE, 'public tender documents') === 'tender_not_meat')
console.log('== (5) mutantes ==')
const mut1 = pixSrc.replace('if (f.tags.test(tags) && !f.allow.test(ctx)) return f.label', 'if (false) return f.label')
checa('mutante 1 (família desligada → Alcorão volta) é pego', mut1 !== pixSrc && loadSrc(mut1, 'mut1.ts', deps).forbiddenTagInContext(ALCORAO, 'reads summarizes delivers precise', 'it reads and summarizes') === null)
const mut2 = pixSrc.replace("label: 'tender_not_meat' }", "label: 'tender_not_meat', context: /never-matches-anything/ }")
checa('mutante 2 (contexto do tender morto → carne volta) é pego', mut2 !== pixSrc && loadSrc(mut2, 'mut2.ts', deps).subjectConflictWithTags('public tender evaluation', BIFE, 'smarttender ai helps you win public tenders') === null)

const mut3 = pixSrc.replace('!LIBERATED_COMPOUND_TAGS.has(t)', 'true')
checa("mutante 3 (compostos liberados desligados → 'dollar sign' vira placa) é pego", mut3 !== pixSrc && loadSrc(mut3, 'mut3.ts', deps).forbiddenTagInContext(DOLAR, 'money dollar cash', 'five shocking facts about money') === 'sign')
const mut4 = pixSrc.replace('if (c.unless && c.unless.test(ctx)) continue', 'if (false) continue')
const M4 = loadSrc(mut4, 'mut4.ts', deps)
checa('mutante 4 (unless desligado → Bíblia recusada de novo, inclusive no cofre) é pego', mut4 !== pixSrc && M4.subjectConflictWithTags('woman reads a book', BIBLIA, 'she reads the bible every morning, one page at a time') === 'read_not_scripture' && M4.clipTagsGate(BIBLIA, 'bible reading morning', { sceneText: 'she reads the bible every morning, one page at a time' }).reason === 'homonym')
const mut5 = pixSrc.replace('subject: /\\b(?!bartenders?\\b)\\w*tenders?\\b/', 'subject: /\\b\\w*tenders?\\b/')
checa("mutante 5 (lookahead do bartender removido → bar vira carne) é pego", mut5 !== pixSrc && loadSrc(mut5, 'mut5.ts', deps).subjectConflictWithTags('bartender cocktail bar', BAR, 'the bar business grew 40 percent with our software') === 'tender_not_meat')
console.log(`\n${ok} ok · ${falhas.length} falhas`)
process.exit(falhas.length ? 1 : 0)
