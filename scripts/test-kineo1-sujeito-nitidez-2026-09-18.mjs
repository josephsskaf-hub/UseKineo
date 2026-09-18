// KINEO1-SUJEITO / NITIDEZ / CROSSFADE — 2026-09-18 — guardião das três queixas do fundador (03:31 BRT):
//   "uns vídeos de carro no meio, não mostra só boeings" · "algumas imagens estavam borradas… um cara lavando a
//   mão" · "as imagens estão sem fade" · "85 é uma nota muito alta". Prova com as TAGS REAIS que o Pixabay
//   devolveu nos dois filmes (salswina 20:18Z Boeing; lee2fin3 20:14Z amor): (a) a tag tem de bater com o SUJEITO
//   da busca, não com a palavra genérica; famílias de sinônimo cobrem "boeing" dito como "aircraft"; higiene/covid
//   é lista negra; buscas só de genéricos seguem a regra antiga; (b) o piso de resolução virou proibição; (c) o
//   montador cruza os cortes do Kineo 1 com a receita já exercitada no hollywood; (d) o juiz tem a regra do
//   sujeito; (e) repetição de tags com visual gerado na cena não readmite o repetido.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const transpile = (file) => ts.transpileModule(rd(file), { compilerOptions: { module: 1, target: 9 } }).outputText
function loadWith(file, requireMap, env = {}) {
  const exports = {}
  vm.runInNewContext(transpile(file), { exports, require: (m) => requireMap[m] ?? {}, process: { env }, console: { log() {}, warn() {}, error() {} }, Math, Date, Number, Set, Map, Array, JSON, Promise, setTimeout, clearTimeout, fetch: undefined, AbortController }, { filename: file })
  return exports
}

console.log('== (a) o sujeito manda ==')
const aspect = loadWith('lib/aspect.ts', {})
const aesthetic = loadWith('lib/broll/aesthetic-score.ts', {})
const P = loadWith('lib/pixabay.ts', { './clipVault': { vaultClipAsync: () => {} }, '@/lib/aspect': aspect, './broll/aesthetic-score': aesthetic })
const vid = (tags) => ({ id: 1, pageURL: '', type: 'film', tags, duration: 10, videos: { large: { url: 'u', width: 1920, height: 1080, size: 0, thumbnail: '' }, medium: {}, small: {}, tiny: {} } })
// Tags REAIS do filme do Boeing (query "boeing 737 engine closeup")
const aeroporto = 'airport, planes, departure, traffic, runway, rush hour, stuttgart, traffic volume, airliner, passenger aircraft, aircraft, airbus, boeing, airline, air traffic'
const transito = 'buildings, traffic, vehicles, cars, street, trip, transport, asphalt, city, architectural, urban, engine, sunny, daytime'
const moto = 'motorbike, bike, chrome, engine, chopper, vehicle, biker, motorcycle, motor-bike, driving, 111354301'
const qBoeing = 'boeing 737 engine closeup'
checa('tokens específicos de "boeing 737 engine closeup" = boeing, 737 (engine é genérico, closeup é estilo)', JSON.stringify(P.specificTokens(qBoeing).sort()) === JSON.stringify(['737', 'boeing']))
checa('aeroporto com "boeing/aircraft" ENTRA', P.tagsRelevantToQuery(vid(aeroporto), qBoeing) === true)
checa('trânsito de cidade (casava só "engine") SAI', P.tagsRelevantToQuery(vid(transito), qBoeing) === false)
checa('moto (casava só "engine") SAI', P.tagsRelevantToQuery(vid(moto), qBoeing) === false)
checa('família: clipe só com "airplane, jet engine, turbine" (sem a palavra boeing) ENTRA', P.tagsRelevantToQuery(vid('airplane, jet engine, turbine, sky, flight'), qBoeing) === true)
// Tags REAIS do filme de amor (query "closeup of intertwined hands")
const covid = 'washing hands, coronavirus, stop the spread, covid 19, water, hands, soap'
const xadrez = 'chess, chess board, strategy, play, board game, chess pieces, think, hands'
const qMaos = 'closeup of intertwined hands'
checa('"washing hands, covid" (casava só "hands") SAI', P.tagsRelevantToQuery(vid(covid), qMaos) === false)
checa('tabuleiro de xadrez (casava só "hands") SAI', P.tagsRelevantToQuery(vid(xadrez), qMaos) === false)
checa('"couple holding hands, love" ENTRA pela família do amor', P.tagsRelevantToQuery(vid('couple, holding hands, love, romantic, sunset'), qMaos) === true)
checa('busca só de genéricos ("city street night") segue a regra antiga: "city, street" ENTRA', P.tagsRelevantToQuery(vid('city, street, night, lights'), 'city street night') === true)
const src = rd('lib/pixabay.ts')
checa('higiene/pandemia na lista negra dura (covid, coronavirus, washing hands, sanitiz…)', ['coronavirus', 'covid', 'pandemic', 'sanitiz', 'washing hands'].every((s) => src.includes(`'${s}'`)) && src.includes("const HARD_OFFTOPIC_SUBSTRINGS = ['maneki'"))

console.log('== (b) nitidez é proibição ==')
checa('rendição que borra no corte é REJEITADA (paisagem < 1920 ou retrato < 1080 em 9:16; inverso em 16:9), com log low_res', src.includes("? (portrait ? rez.height >= 1080 : rez.width >= 1920)\n        : (portrait ? rez.height >= 1920 : rez.width >= 1920)") && src.includes('reason=low_res') && src.indexOf('reason=low_res') < src.indexOf('const coversScene = typeof video.duration'))

console.log('== (c) crossfade do Kineo 1 ==')
const cp = rd('lib/compose.ts')
checa('constante 0,25 s (a mesma do hollywood) com interruptor KINEO_FAST_CROSSFADE', cp.includes('const FAST_CROSSFADE_SECONDS = 0.25') && cp.includes("process.env.KINEO_FAST_CROSSFADE") && cp.includes('const HOLLYWOOD_CROSSFADE_SECONDS = 0.25'))
checa('clipe não-último fica 0,25 s a mais (sobreposição) — o #202 falhou porque NÃO havia sobreposição', cp.includes('duration: round3(segLen + CLIP_GAP_OVERLAP + (isFastStock && FAST_CROSSFADE_ENABLED && i < cleanClips.length - 1 ? FAST_CROSSFADE_SECONDS : 0))'))
checa('cortes a partir do 2º entram com enter_transition fade (a propriedade exercitada), abertura do preto intacta', cp.includes(": isFastStock && FAST_CROSSFADE_ENABLED && i > 0\n          ? { enter_transition: { type: 'fade', duration: FAST_CROSSFADE_SECONDS } }") && cp.includes("? { enter_transition: { type: 'fade', duration: FAST_OPENING_FADE_SECONDS } }"))

console.log('== (d) juiz ==')
const jz = rd('lib/fastCoherence.ts')
checa('regra do sujeito: palavra genérica não é match; 1 cena errada ≤ 60, 2+ ≤ 40; nomeia a cena', jz.includes('SUBJECT RULE: the clip tags must name the SAME subject') && jz.includes('One mismatched scene caps narration_vs_visuals at 60; two or more cap it at 40'))

console.log('== (e) repetição com visual gerado ==')
const ft = rd('app/api/generate-video-fast/route.ts')
checa('tudo repetido + cena com visual gerado → nenhum stock; sem visual gerado → fica o primeiro', ft.includes('const pixFinal = pixInedito.length > 0 ? pixInedito : cenasComClipeIA.has(sceneNo) ? [] : pixUrls.slice(0, 1)'))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
