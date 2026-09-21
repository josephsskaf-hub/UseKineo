// KINEO-SEM-LETRAS-2026-09-21 — guardião: nenhuma estrada clássica pede objeto-com-texto, e toda cena proíbe letras.
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
function roda(src, req = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, (n) => { if (n in req) return req[n]; throw new Error('import inesperado ' + n) })
  return m.exports
}

console.log('1) sceneStyle (módulo puro): sufixo incondicional + léxico de objetos-com-texto')
const styleSrc = rd('lib/cinematic/sceneStyle.ts')
const S = roda(styleSrc)
checa('NO_READABLE_TEXT_SUFFIX proíbe letras, números, rótulos e placas', /no readable text, letters, numbers, labels or signage/.test(S.NO_READABLE_TEXT_SUFFIX))
checa('NO_TEXT_OBJECT_DIRECTION manda mostrar texto como textura, nunca como sujeito', S.NO_TEXT_OBJECT_DIRECTION.includes('Never make a text-bearing object the subject') && S.NO_TEXT_OBJECT_DIRECTION.includes('aged paper out of focus'))
for (const w of ['sonar readout of the seabed', 'a magazine article about the find', 'coordinates in a drawer', 'radar screen glowing', 'an old photograph']) checa(`léxico pega "${w}"`, S.textSafetySuffix(w).length > 0)
checa('léxico NÃO dispara em cena sem objeto de texto (prompt byte a byte igual)', S.textSafetySuffix('a submarine robot gliding over stone blocks two thousand feet down') === '')
const story = S.buildStoryScenePrompt('a robot camera descends past granite blocks', S.deriveStyleAnchor('photoreal story'), null)
checa('prompt de história (character_story/presenter) leva o sufixo', story.includes(S.NO_READABLE_TEXT_SUFFIX))

console.log('2) visualPromptPolicy: negative forte + sufixo no caminho faceless')
const pol = rd('lib/cinematic/visualPromptPolicy.ts')
checa('negative clássico = lista do hollywood (on-screen text, foreign/cyrillic text, map labels, newspaper headline)', ['on-screen text', 'readable signs', 'foreign text', 'cyrillic text', 'map labels', 'newspaper headline'].every((t) => pol.includes(t)))
checa('caminho faceless cola NO_READABLE_TEXT_SUFFIX (antes: só "no text")', pol.includes("'subject clearly framed with the lower third clear for captions, no watermark, no logo' + NO_READABLE_TEXT_SUFFIX,") && !pol.includes("no text, no watermark, no logo'"))
checa('import do sufixo vem de sceneStyle', pol.includes("NO_READABLE_TEXT_SUFFIX, type StyleAnchor } from './sceneStyle'"))
const P = roda(pol, { '../aspect': { aspectSpec: () => ({ promptFraming: '9:16 vertical', falAspectRatio: '9:16' }) }, './sceneStyle': S })
const neg = P.classicVisualNegativePrompt('documentary_faceless', false)
checa('classicVisualNegativePrompt executado contém as proibições de texto', neg.includes('on-screen text') && neg.includes('cyrillic text'))
const faceless = P.buildClassicVisualPrompt('sonar chart of the seabed west of Cuba', { mode: 'documentary_faceless', style: S.deriveStyleAnchor('x'), aspect: '9:16', opening: false })
checa('cena faceless executada: sufixo incondicional + reforço do léxico (sonar chart)', faceless.includes(S.NO_READABLE_TEXT_SUFFIX) && faceless.includes('intentionally out of focus and unreadable'))

console.log('3) quem ESCREVE a cena recebe a regra')
const rota = rd('app/api/generate-video-cinematic/route.ts')
checa('diretor visual da rota cinematic: regra na lista de RULES', rota.includes('No on-screen text, captions, or logos.\n- ${NO_TEXT_OBJECT_DIRECTION}') && rota.includes('NO_TEXT_OBJECT_DIRECTION } from \'@/lib/cinematic/sceneStyle\''))
const runway = rd('lib/runway.ts')
checa('planejador de cenas (runway.ts): regra no contrato visual', runway.includes("- ${NO_TEXT_OBJECT_DIRECTION}") && runway.includes("import { NO_TEXT_OBJECT_DIRECTION } from '@/lib/cinematic/sceneStyle'"))
const align = rd('lib/cinematic/speechImageAlign.ts')
checa('supervisor fala×imagem: objeto-com-texto como sujeito = REWRITE', align.includes("NO_TEXT_OBJECT_DIRECTION + ' A shot whose subject is a text-bearing object counts as a REWRITE. '"))
checa('supervisor continua módulo puro (sem import)', !/^import /m.test(align))
const copia = align.match(/const NO_TEXT_OBJECT_DIRECTION =\n([\s\S]*?)\n\n/)
checa('a cópia literal no supervisor é IDÊNTICA à fonte em sceneStyle', !!copia && new Function('return ' + copia[1])() === S.NO_TEXT_OBJECT_DIRECTION)

console.log('4) mutantes')
const mutFaceless = roda(pol.replace("no watermark, no logo' + NO_READABLE_TEXT_SUFFIX,", "no watermark, no logo',"), { '../aspect': { aspectSpec: () => ({ promptFraming: '9:16', falAspectRatio: '9:16' }) }, './sceneStyle': S })
checa('mutante (sufixo removido do faceless) é pego', !mutFaceless.buildClassicVisualPrompt('a submarine robot', { mode: 'documentary_faceless', style: S.deriveStyleAnchor('x'), aspect: '9:16', opening: false }).includes(S.NO_READABLE_TEXT_SUFFIX))
const mutLex = roda(styleSrc.replace('|sonar|radar|', '|'))
checa('mutante (sonar fora do léxico) é pego', mutLex.textSafetySuffix('sonar sweep of the seabed') === '' && S.textSafetySuffix('sonar sweep of the seabed') !== '')

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
