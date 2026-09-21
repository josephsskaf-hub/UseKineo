// KINEO1-FILME-DESENHADO-2026-09-21 — guardião do caso jonathanschwapp (21/09 16:52Z, Kineo 1, nota 65).
// Pedido em FRANCÊS de "animation 3D colorée et joyeuse… maison en carton… facteur… ruban doré" chegou pelo auto-start:
// (1) o detector de língua só sabia en/pt/es → narração em ESPANHOL; (2) o regex de look era inglês e exigia "3D animation"
// → look photoreal; (3) o banco de filmagem real pôs criança na neve, lago, raio-X e vinil ("joyful animation",
// "friendly mailman", "vintage animation desk"); (4) os prompts de still/clipe/hook eram "photorealistic" fixos.
// Cada conserto vira uma prova EXECUTADA sobre a função pura; a rota é conferida na fonte e um mutante por conserto.
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
function roda(src, requireMap = {}, file = 'x.ts') {
  const exports = {}
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports, require: (m) => requireMap[m] ?? {}, process: { env: {} }, console: { log() {}, warn() {}, error() {} }, Math, Date, Number, Set, Map, Array, JSON, Object, RegExp, String, Promise, setTimeout, clearTimeout, AbortController, fetch: undefined }, { filename: file })
  return exports
}

const JONATHAN = "Un petit personnage mignon vit dans une maison originale en carton, avec des escaliers en papier. Il essaie de monter et fait une petite pirouette comique sans se faire mal. Un facteur sympathique arrive avec son sac, tente de monter, glisse doucement et tombe sur un coussin. Les personnages l'aident et réparent son petit nez avec un joli ruban doré magique. Tout le monde danse et applaudit devant la maison pendant que des confettis en papier colorés tombent doucement."
const PEDIDO_FR = 'Je veux une animation 3D colorée et joyeuse pour les enfants de 3 à 7 ans. ' + JONATHAN

console.log('== (2) o look desenhado nas 16 línguas — lib/cinematic/sceneStyle ==')
const styleSrc = rd('lib/cinematic/sceneStyle.ts')
const S = roda(styleSrc)
checa('"animation 3D" (ordem francesa) é desenho', S.looksLikeDrawnRequest(PEDIDO_FR) === true && S.deriveStyleAnchor(PEDIDO_FR).look === 'animated3d')
checa('"3D animated cartoon, Pixar style" (inglês) segue desenho', S.deriveStyleAnchor('3D animated cartoon, Pixar style, colorful and joyful. ' + JONATHAN).look === 'animated3d')
checa('"dessin animé" / "dibujos animados" / "desenho animado" / "Zeichentrick" / "cartone animato" → desenho', ['un dessin animé sur un petit chat', 'un video de dibujos animados de un perro', 'um desenho animado sobre um menino', 'ein Zeichentrickfilm über einen Hund', 'un cartone animato su un robot'].every((t) => S.looksLikeDrawnRequest(t)))
checa('hindi (कार्टून) e árabe (كرتون) → desenho', S.looksLikeDrawnRequest('रंग-बिरंगे कार्टून स्टाइल में एक भारतीय मोहल्ले का दृश्य') && S.looksLikeDrawnRequest('فيديو كرتون عن قطة صغيرة تتعلم الطيران'))
checa('"estilo anime" / "аниме" caem no look anime, não no 3D', S.deriveStyleAnchor('una historia en estilo anime sobre un samurái').look === 'anime' && S.deriveStyleAnchor('история в стиле аниме про самурая').look === 'anime')
checa('filme real (Boeing, animais) NÃO é desenho; "animal" não é "animated"', !S.looksLikeDrawnRequest('Why are Boeing 737 engines flat on the bottom? The answer is ground clearance.') && !S.looksLikeDrawnRequest('wild animals of africa and their animalistic behavior') && S.deriveStyleAnchor('Why are Boeing 737 engines flat on the bottom?').look === 'photoreal')
checa('fonte única: o aviso do Studio importa daqui e não tem lista própria', rd('lib/growth/kineo1FitNotice.ts').includes("import { looksLikeDrawnRequest } from '@/lib/cinematic/sceneStyle'") && !rd('lib/growth/kineo1FitNotice.ts').includes('CARTOON_PATTERNS'))
{
  const mut = styleSrc.replace(/^\s*\/\(\?<!\[\\p\{L\}\]\)\(dessin animé\|dessins animés\|animation 3d\|film d'animation\|style anime\)\(\?!\[\\p\{L\}\]\)\/iu, \/\/ fr\n/m, '')
  checa('mutante (sem a linha fr) aplicou', mut !== styleSrc)
  checa('mutante é pego: "dessin animé" deixa de ser desenho', mut !== styleSrc && roda(mut).looksLikeDrawnRequest('un dessin animé sur un petit chat') === false)
}

console.log('== (1) a língua do texto — lib/textLanguage ==')
const tlSrc = rd('lib/textLanguage.ts')
const T = roda(tlSrc)
checa('o pedido REAL do Jonathan é francês (era es 0,77)', T.detectNarrationLanguage(JONATHAN).language === 'fr')
checa('padrão "en" cede ao francês (switched) e o filme narra em fr', (() => { const r = T.resolveNarrationLanguage('en', JONATHAN); return r.language === 'fr' && r.switched === true })())
checa('alemão → de', T.detectNarrationLanguage('Ein kleiner Junge findet im Wald eine alte Karte und macht sich mit seinem Hund auf die Suche nach dem Schatz, der seit hundert Jahren verschwunden ist.').language === 'de')
checa('italiano → it', T.detectNarrationLanguage('Un piccolo robot vive in una casa di cartone e ogni giorno prova a salire le scale di carta senza cadere, finché il postino non arriva con un nastro dorato e tutti gli amici della casa lo aiutano.').language === 'it')
checa('espanhol e português seguem inteiros (os textos dos guardiões de 12/09 e 13/09)', T.detectNarrationLanguage('se trata de un hombre que busca ser feliz pero se da cuenta que la felicidad en pro de los demás no es lo que él esperaba y entonces decide cambiar su vida para siempre').language === 'es' && T.detectNarrationLanguage('La historia del tsunami de Lituya Bay en 1958: la ola más alta jamás registrada, con 524 metros, fue causada por un deslizamiento en Alaska y un pescador sobrevivió.').language === 'es' && T.detectNarrationLanguage('Eram exatamente 3h17 da madrugada quando o telefone de Lucas começou a tocar. Número desconhecido. Ele não atendeu, mas o telefone tocou de novo e de novo até que ele levantou').language === 'pt')
checa('inglês segue inglês', T.detectNarrationLanguage('My name is Tomás, and I was the last lighthouse keeper on the island. Every night for thirty years I climbed the steps and lit the lamp by hand, because one boat still came home this way.').language === 'en')
checa('marca partilhada nunca decide sozinha: "le", "un", "son", "la" não são exclusivas de ninguém', tlSrc.includes("DETECTABLE_LANGUAGES.every((other) => other === lang || !SETS[other].has(w))"))
{
  const mut = tlSrc.replace("export const DETECTABLE_LANGUAGES: readonly DetectableLanguage[] = ['en', 'pt', 'es', 'fr', 'de', 'it']", "export const DETECTABLE_LANGUAGES: readonly DetectableLanguage[] = ['en', 'pt', 'es']")
  checa('mutante (sem fr/de/it) aplicou', mut !== tlSrc)
  checa('mutante é pego: o Jonathan deixa de ser francês', mut !== tlSrc && roda(mut).detectNarrationLanguage(JONATHAN).language !== 'fr')
}

console.log('== (4) still, clipe e gancho no look pedido ==')
const look = S.deriveStyleAnchor(PEDIDO_FR)
const FS = roda(rd('lib/fastAiScene.ts'), { '@/lib/hollywood/anchors': { generateCinematicSceneStill: async () => null }, '@supabase/supabase-js': { createClient: () => ({}) } })
const stillDesenhado = FS.buildFastStillPrompt({ description: 'a cardboard house with paper stairs', voiceover: 'Le facteur arrive', query: 'cardboard house', look })
const stillReal = FS.buildFastStillPrompt({ description: 'a cardboard house with paper stairs', voiceover: 'Le facteur arrive', query: 'cardboard house' })
checa('still desenhado abre com o look (3D animado) e não diz "Photorealistic"; sem look segue fotorreal', stillDesenhado.startsWith(look.lookPhrase) && !/^Photorealistic cinematic still/.test(stillDesenhado) && !/documentary photography/.test(stillDesenhado) && stillDesenhado.includes('cardboard house with paper stairs') && stillReal.startsWith('Photorealistic cinematic still')) // o lookPhrase diz "not photorealistic" de propósito
checa('generateFastSceneStill usa o sufixo do look quando há desenho (o fotorreal contradizia o prompt)', rd('lib/fastAiScene.ts').includes("styleSuffix: args.look && args.look.look !== 'photoreal' ? args.look.suffix : 'documentary realism, natural color grade, sharp 35mm film look'"))
const FC = roda(rd('lib/fastAiClips.ts'), { '@fal-ai/client': { fal: {} }, './fastAiHook': {} })
const clipDesenhado = FC.buildSceneClipPrompt('a friendly mailman climbs the paper stairs', 'Le facteur monte', 'mailman', look)
const clipReal = FC.buildSceneClipPrompt('a friendly mailman climbs the paper stairs', 'Le facteur monte', 'mailman')
checa('clipe desenhado leva o look, sem "photorealistic", e o personagem NÃO vira silhueta; sem look segue como antes', clipDesenhado.includes(look.lookPhrase) && !/, photorealistic, dramatic lighting/.test(clipDesenhado) && !clipDesenhado.includes('silhouetted') && clipDesenhado.includes(look.suffix.trim()) && /, photorealistic, dramatic lighting/.test(clipReal))
const FH = roda(rd('lib/fastAiHook.ts'), { '@fal-ai/client': { fal: {} }, '@supabase/supabase-js': { createClient: () => ({}) }, './clipVault': {} })
const hookDesenhado = FH.buildHookPrompt('a cute character in a cardboard house', 'topic', look)
checa('gancho desenhado leva o look e não diz "photorealistic"; sem look segue fotorreal', hookDesenhado.includes(look.lookPhrase) && !/, photorealistic, dramatic lighting/.test(hookDesenhado) && /, photorealistic, dramatic lighting/.test(FH.buildHookPrompt('a cute character in a cardboard house', 'topic')))

console.log('== (3) a rota do Kineo 1: desenho = still em toda cena, clipes gerados sempre, banco fora ==')
const ft = rd('app/api/generate-video-fast/route.ts')
checa('rota importa a fonte única do look', ft.includes("import { looksLikeDrawnRequest, deriveStyleAnchor } from '@/lib/cinematic/sceneStyle'"))
checa('decide UMA vez por filme, a partir do pedido', ft.includes('const filmeDesenhado = looksLikeDrawnRequest(prompt)') && ft.includes('const desenhoLook = filmeDesenhado ? deriveStyleAnchor(prompt) : null'))
checa('clipes gerados entram sempre no desenho (trial também) e o gancho leva o look', ft.includes('const clipesElegiveis = isFirstVideo || isPaidAccount || filmeDesenhado') && ft.includes('buildHookPrompt(scenes[0]?.description ?? prompt, prompt, desenhoLook)'))
checa('toda cena decide still (reason drawn) com o look, e o teto de stills não cai para 3 no desenho', ft.includes("? { ai: true, reason: 'drawn' as const, entity: null }") && ft.includes('look: desenhoLook }), seed: aiStillSeed') && ft.includes('if (!filmeDesenhado) aiStillsMax = Math.min(aiStillsMax, FIRST_FILM_STILLS_WITH_CLIPS_MAX)') && ft.includes('if (personagem || filmeDesenhado) aiStillsMax = Math.max('))
checa('com o still desenhado na mão a cena fecha (banco fora); sem still, o stock ainda entra (fail-open)', /cenasComClipeIA\.add\(sceneNo\)[^\n]*\n(?:[^\n]*\n){0,4}\s*if \(filmeDesenhado\) continue/.test(ft) && !/if \(filmeDesenhado\) continue[\s\S]{0,200}if \(personagem\)/.test(ft))
checa('desenho não puxa do cofre e o clipe da cena leva o look', ft.includes('const filmeDeEntidade = !!personagem || filmeDesenhado') && ft.includes("sc?.stockSearchQuery ?? '', desenhoLook)"))
checa('o evento fast_ai_still carrega o look (medição: quantos filmes desenhados por dia)', ft.includes('drawn_look: desenhoLook?.look ?? null'))
{
  const mut = ft.replace('if (filmeDesenhado) continue', '')
  checa('mutante (sem o continue do desenho) é pego', mut !== ft && !/cenasComClipeIA\.add\(sceneNo\)[^\n]*\n(?:[^\n]*\n){0,4}\s*if \(filmeDesenhado\) continue/.test(mut))
}

console.log('== (5) o aviso do Studio diz a verdade nova ==')
const N = roda(rd('lib/growth/kineo1FitNotice.ts'), { '@/lib/cinematic/sceneStyle': S })
checa('pedido do Jonathan no Kineo 1 → aviso; no Seedance → não', N.decideKineo1FitNotice({ engine: 'fast', text: PEDIDO_FR }).show === true && N.decideKineo1FitNotice({ engine: 'seedance', text: PEDIDO_FR }).show === false)
const copy = N.kineo1FitNoticeCopy('25 cr')
checa('copy: filmagem real → stills desenhados; Seedance anima toda cena (custo na frase)', /real footage/i.test(copy.title) && /drawn stills/i.test(copy.title) && copy.body.includes('Seedance 1.5 (25 cr)') && /won’t move|will not move/.test(copy.body))

console.log('== (3b) Pixabay: humor e "animation" nunca são o sujeito ==')
const px = rd('lib/pixabay.ts')
checa('"joyful", "friendly", "vintage", "animation", "cartoon" entraram nos genéricos', ["'joyful'", "'friendly'", "'vintage'", "'animation'", "'cartoon'", "'golden'"].every((w) => px.includes(w)))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
