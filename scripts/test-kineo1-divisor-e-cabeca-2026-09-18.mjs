// KINEO1-DIVISOR-POLIGLOTA + KINEO1-SUJEITO-CABECA (18/09, fundador: "Vai nos 2") — guardião com os rastros REAIS
// dos 6 filmes do painel de coerência de 18/09. Sem rede, sem banco.
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

console.log('== (1) divisor poliglota ==')
const S = loadWith('lib/broll/scene-splitter.ts', {})
const hindi = 'रंग-बिरंगे कार्टून स्टाइल में एक भारतीय मोहल्ले का दृश्य। मोटू, पतलू और चुटकी घर के बाहर खड़े हैं। मोटू चुटकी की तरफ देखकर मज़ेदार अंदाज़ में पूछता है। चुटकी हैरानी से मोटू की तरफ देखती है।'
checa('hindi com danda (।) vira 4 cenas, não 1 (o filme de 18/09 tinha 6 cenas com a MESMA busca)', S.splitScriptToScenes(hindi).length === 4)
const urdu = 'یہ پہلا جملہ ہے۔ یہ دوسرا جملہ ہے؟ یہ تیسرا جملہ ہے۔'
checa('urdu (۔ ؟) vira 3 cenas', S.splitScriptToScenes(urdu).length === 3)
const cjk = '这是第一句。这是第二句！这是第三句？'
checa('CJK (。！？) sem espaço depois: continua 1 bloco curto (não quebra o que não sabe)', S.splitScriptToScenes(cjk).length >= 1)
// A forma do pedido em espanhol de 18/09 (uma frase só, 80+ palavras, só vírgulas), com o conteúdo trocado.
const espanhol = 'el director deja el movil un momento para ponerse la chaqueta del traje, después vuelve a coger el móvil para salir por la puerta de la habitación del hotel, cuando se presentan de manera para no dejarlo salir y llevarlo de nuevo al interior de la habitación muchisimos fans, que quieren que uno de sus mayores deseos se haga realidad y le piden el movil para grabar todo lo que esta ocurriendo y enviar despues la grabación a sus respectivos moviles'
const cenasEs = S.splitScriptToScenes(espanhol)
checa('frase corrida de 80+ palavras só com vírgulas vira ≥ 3 cenas (era 1 → a mesma busca × 4)', cenasEs.length >= 3)
checa('nenhuma cena passa de SCENE_SPLIT_MAX_WORDS palavras', cenasEs.every((c) => c.narration.split(/\s+/).length <= S.SCENE_SPLIT_MAX_WORDS))
checa('texto sem vírgula nem ponto e 60 palavras é cortado por contagem', S.splitLongBlock(Array.from({ length: 60 }, (_, i) => 'w' + i).join(' ')).length === 3)
checa('inglês normal continua igual (3 frases = 3 cenas)', S.splitScriptToScenes('The mosquito kills. The hippo charges. The snail carries disease.').length === 3)
checa('roteiro com marcadores HOOK/PAYOFF continua pelo caminho dos marcadores', S.splitScriptToScenes('HOOK: a\n\nMICRO REWARD 1: b\n\nPAYOFF: c').length === 3)

console.log('== (2) mutante do divisor: sem o danda tudo volta a 1 cena ==')
const splitterSrc = rd('lib/broll/scene-splitter.ts')
const mutS = splitterSrc.replace('\\u0964', '\\u0000')
checa('mutante aplicou', mutS !== splitterSrc)
checa('mutante é pego (sem o danda o hindi perde cenas; só o corte por comprimento sobra)', loadSrc(mutS, 'scene-splitter-mut.ts').splitScriptToScenes(hindi).length < 4)

console.log('== (3) cabeça da busca ==')
const aspect = loadWith('lib/aspect.ts', {})
const aesthetic = loadWith('lib/broll/aesthetic-score.ts', {})
const P = loadWith('lib/pixabay.ts', { './clipVault': { vaultClipAsync: () => {} }, '@/lib/aspect': aspect, './broll/aesthetic-score': aesthetic })
const vid = (tags) => ({ id: 1, pageURL: '', type: 'film', tags, duration: 10, videos: { large: { url: 'u', width: 1920, height: 1080, size: 0, thumbnail: '' }, medium: {}, small: {}, tiny: {} } })
// Tags REAIS dos filmes de valos (18/09 22:39Z e 23:15Z, "deadliest animals")
const qMosq = 'mosquito insect close up macro bite'
checa('cabeça de "mosquito insect close up macro bite" = mosquito', P.headSubjectToken(qMosq) === 'mosquito')
checa('vespa ("macro, insect, wasp, bite, armenia") SAI', P.tagsRelevantToQuery(vid('macro, insect, wasp, bite, armenia'), qMosq) === false)
checa('mosca ("fly, insect, animal, macro, close up, nature") SAI', P.tagsRelevantToQuery(vid('fly, insect, animal, macro, close up, nature'), qMosq) === false)
checa('larva de mosquito ENTRA', P.tagsRelevantToQuery(vid('mosquito larvae, wriggle, aquatic, macro, water, insect, disease vector, dengue fever'), 'mosquito malaria tropical disease Africa') === true)
const qCaramujo = 'freshwater snail water schistosomiasis tropical'
checa('cabeça de "freshwater snail …" = snail (freshwater é modificador)', P.headSubjectToken(qCaramujo) === 'snail')
checa('pôr do sol tropical ("sea, ocean, sunset, tropical…") SAI', P.tagsRelevantToQuery(vid('sea, ocean, sunset, sunrise, waves, seascape, sun, water, clouds, aerial view, tropical, sky'), qCaramujo) === false)
checa('caramujo de jardim ENTRA', P.tagsRelevantToQuery(vid('snail, flower, shell, slow, plant, green, water, nature'), qCaramujo) === true)
const qCone = 'cone snail shell beautiful deadly ocean beach'
checa('praia ("beach, ocean, sea, summer, holiday…") SAI do caramujo-cone', P.tagsRelevantToQuery(vid('beach, ocean, sea, summer, holiday, wave, nature, beautiful, calm, peaceful, island'), qCone) === false)
checa('hipopótamo ENTRA', P.tagsRelevantToQuery(vid('hippo, hippopotamus, wildlife, mouth, teeth, water, animal, nature'), 'hippopotamus hippo river Africa water') === true)
checa('"moonlight on village" → nascer do sol na montanha SAI', P.tagsRelevantToQuery(vid('sunrise, mountain village, mountains, snow, fog, snow landscape, timelapse'), 'moonlight on village') === false)
checa('busca só de genéricos ("nature wildlife danger beauty deadly animals") não bloqueia (regra antiga)', P.tagsRelevantToQuery(vid('snake, viper, reptile, nature, animal, dangerous, wildlife'), 'nature wildlife danger beauty deadly animals') === true)
checa('família de sinônimo continua valendo na cabeça (boeing → aircraft, com o hit direto que o portão antigo já exigia)', P.tagsRelevantToQuery(vid('airport, runway, airliner, aircraft, boeing, airline'), 'boeing 737 engine closeup') === true)
checa('savana ("africa, savanna, safari") SAI de "mosquito malaria tropical disease Africa" — só a cabeça pega isto', P.tagsRelevantToQuery(vid('africa, tropical, savanna, safari, sunset, nature'), 'mosquito malaria tropical disease Africa') === false)

console.log('== (4) mutante da cabeça: sem a exigência a vespa volta ==')
const pixSrc = rd('lib/pixabay.ts')
const mutP = pixSrc.replace('return head === null || specificTokenHitsTags(head, tagWords)', 'return true')
checa('mutante aplicou', mutP !== pixSrc)
checa('mutante é pego (a savana entraria no filme do mosquito)', loadSrc(mutP, 'pixabay-mut.ts', { './clipVault': { vaultClipAsync: () => {} }, '@/lib/aspect': aspect, './broll/aesthetic-score': aesthetic }).tagsRelevantToQuery(vid('africa, tropical, savanna, safari, sunset, nature'), 'mosquito malaria tropical disease Africa') === true)

console.log(`\n${ok} ok · ${falhas.length} falhas`)
process.exit(falhas.length ? 1 : 0)
