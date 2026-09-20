// KINEO1-SEM-GENERICO-E-HOMONIMO-2026-09-20 — guardião com os rastros REAIS de 19-20/09: "mustang car" → cavalos,
// "bullet trajectory" → trem-bala, "historical soldier" → Burj Khalifa (genérico "city"), "Dyatlov" → bolsa de valores.
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

console.log('== (1) homônimos — tags REAIS dos filmes de 20/09 ==')
const cavalo = 'mountain, horse, snow, animal, grazing, winter, tourism, stallion, colt, wildlife, nature, outdoors, mare, wild, country, fur, foal'
checa('"mustang car" no contexto do carro recusa o cavalo', P.subjectConflictWithTags('mustang car', cavalo, 'the new mustang model truly stands out with its striking bold red finish') === 'car_not_animal')
checa('"mustang aerial" com fala de carro (engine) recusa a manada', P.subjectConflictWithTags('mustang aerial', 'horses, galloping, countryside, animal, mountain, wild horse, dust, freedom, mammal, meadow, run, stallion', "under the hood, the mustang's powerful engine is a remarkable marvel") === 'car_not_animal')
checa('"mustang" sem contexto de carro (documentário de cavalos selvagens) NÃO recusa', P.subjectConflictWithTags('wild mustang herd', cavalo, 'wild mustangs roam the plains of nevada') === null)
checa('"bullet trajectory diagram" com fala de sniper recusa o trem-bala', P.subjectConflictWithTags('bullet trajectory diagram', 'mount fuji, river, railway bridge, bullet train, high speed train, japan, landscape', "wind can affect a bullet's path by up to 30 inches at 1,000 yards") === 'bullet_not_train')
checa('"bullet hitting target slow motion" recusa o enfeite de Natal', P.subjectConflictWithTags('bullet hitting target slow motion', 'christmas, christmas decorations, bullet, tree, conifer, branch, slow motion', 'mastering long-range shooting takes precision') === 'bullet_not_train')
checa('"python code tutorial" recusa a cobra', P.subjectConflictWithTags('python code tutorial', 'snake, reptile, python, animal', 'learn python programming') === 'language_not_thing')
checa('"apple orchard harvest" (fruta de verdade) NÃO recusa', P.subjectConflictWithTags('apple orchard harvest', 'fruit, orchard, apple, tree', 'autumn apple picking in vermont') === null)

console.log('== (2) genéricos só para cena sem sujeito ==')
checa('"historical soldier" tem sujeito → genéricos proibidos (era Burj Khalifa por "city" na fala)', P.genericsAllowedFor(['historical soldier']) === false)
checa('"aerial drone Dyatlov Pass snow dusk" tem sujeito → proibidos (era bolsa de valores)', P.genericsAllowedFor(['aerial drone Dyatlov Pass snow dusk']) === false)
checa('"young scholar streetlight" tem sujeito → proibidos (era anjo do México)', P.genericsAllowedFor(['young scholar streetlight']) === false)
checa('busca só de genéricos/estilo ("nature wildlife danger beauty") → genéricos permitidos', P.genericsAllowedFor(['nature wildlife danger beauty deadly animals']) === true)
checa('lista vazia → permitidos (nada a proteger)', P.genericsAllowedFor([]) === true)
checa('as duas cadeias passam allowGenerics para concretizeQueries', (pixSrc.match(/concretizeQueries\(rawCleaned, hint, \{ allowGenerics: genericsAllowedFor\(rawCleaned\) \}\)/g) || []).length === 2)
checa('concretizeQueries só empurra o mapa de conceitos quando allowGenerics !== false', pixSrc.includes('if (opts?.allowGenerics !== false) for (const entry of CONCEPT_VISUAL_MAP) {'))
checa('a fala da cena vira contexto ativo antes das buscas do pool', pixSrc.indexOf('setActiveSubjectContext(hint)') < pixSrc.indexOf('const cands = await collectCandidates('))
checa('o portão aplica a tabela de homônimos logo depois da relevância', /reason=irrelevant[\s\S]{0,300}const conflito = subjectConflictWithTags\(query, video\.tags\)/.test(pixSrc))

console.log('== (3) mutantes ==')
const mut1 = pixSrc.replace("return !queries.some((q) => specificTokens(q).length > 0)", 'return true')
checa('mutante 1 (genéricos sempre) é pego', loadSrc(mut1, 'mut1.ts', deps).genericsAllowedFor(['historical soldier']) === true)
const mut2 = pixSrc.replace("if (c.subject.test(q) && c.context.test(ctx) && c.rejectTags.test(tags)) return c.label", 'if (false) return c.label')
checa('mutante 2 (tabela desligada → cavalo volta) é pego', loadSrc(mut2, 'mut2.ts', deps).subjectConflictWithTags('mustang car', cavalo, 'red car') === null)

console.log(`\n${ok} ok · ${falhas.length} falhas`)
process.exit(falhas.length ? 1 : 0)
