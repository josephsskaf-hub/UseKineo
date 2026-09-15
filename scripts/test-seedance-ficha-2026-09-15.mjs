// KINEO-SEEDANCE-FICHA-2026-09-15 — Seedance 1.5, filme 58bc7022 (fundador: nota 9,5,
// "mudou a idade do personagem"). Os 7 prompts enviados (cinematic_dispatch_result)
// não carregavam a descrição pedida: deriveStoryCharacter só reconhecia "Benny, the
// tiniest bunny" e afins → null → cada cena reinventou o faroleiro. Aqui: a descrição
// EXPLÍCITA do autor é extraída primeiro e entra em toda cena do modo história.
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
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, ...globals }); return exp }
const SS = roda(rd('lib/cinematic/sceneStyle.ts'))

// os dois pedidos REAIS do fundador (15/09), com as quebras de linha do Studio
const farol = `Create a 60-second fictional mystery short in English.

Story:
At midnight, a lone lighthouse keeper notices that his lighthouse
is flashing even though its power is disconnected. Through the
window, he sees a small boat approaching the rocky shore without
navigation lights. He takes a flashlight downstairs and reaches
the empty dock. A wet notebook lies beside a mooring rope.

Tell these events in this exact order. Clearly present this as
fiction, not a real historical event.

Use third-person voiceover throughout. No dialogue, no presenter
talking to the camera, no quoted testimony.

Keep the same keeper throughout: a middle-aged man with a short
gray beard, a dark yellow raincoat and a black knit cap.

Show each event when it is narrated. Use establishing shots and
close-ups where appropriate.`
const trem = `Create a 60-second fictional cinematic mystery in English.

A night train stops at an abandoned station. A woman traveling
alone notices that every clock on the platform has stopped.

The protagonist is a 30-year-old woman with short black hair,
a dark green coat and a small scar above her left eyebrow.
Keep her appearance consistent throughout.
Only the woman on the platform is older, around 60, with gray
hair, the same scar and the same green coat.

Use third-person English voiceover, no character dialogue,
and no presenter addressing the camera.`

console.log('== a descrição explícita do autor é reconhecida ==')
const f1 = SS.deriveStoryCharacter(farol)
checa(`faroleiro: "${f1}"`, f1 === 'a middle-aged man with a short gray beard, a dark yellow raincoat and a black knit cap')
const t1 = SS.deriveStoryCharacter(trem)
checa(`trem: "${t1}"`, t1 === 'a 30-year-old woman with short black hair, a dark green coat and a small scar above her left eyebrow')
checa('"Main character: a tall old sailor with a white beard" → reconhecido', SS.deriveExplicitCharacter('Main character: a tall old sailor with a white beard. He waits.') === 'a tall old sailor with a white beard')
checa('"Personagem: uma menina de 8 anos com tranças" (PT) → não inventa: só descrições com marca de gente/aparência em inglês; devolve null sem quebrar', SS.deriveExplicitCharacter('Personagem: uma menina de 8 anos com tranças. Ela corre.') === null)
checa('pedido sem descrição de pessoa ("Make a video about the Lituya Bay wave, 524 meters high") → null (documentário não ganha personagem inventado)', SS.deriveStoryCharacter('Create a 60-second historical documentary about the 1958 Lituya Bay megatsunami. A wave 524 meters high stripped the mountains. Use third-person voiceover.') === null)
checa('a segunda pessoa ("Only the woman on the platform is older, around 60") NÃO vira o personagem principal', !/around 60|older/.test(t1))

console.log('== regressão: os padrões antigos continuam ==')
checa('"Benny, the tiniest bunny" → "Benny, the tiniest bunny"', SS.deriveStoryCharacter('Benny, the tiniest bunny in the meadow, wakes up early.') === 'Benny, the tiniest bunny')
checa('"a little bunny named Benny" → "Benny, a little bunny"', SS.deriveStoryCharacter('The story of a little bunny named Benny.') === 'Benny, a little bunny')
checa('"the brave fox" → "a brave fox"', SS.deriveStoryCharacter('Every night the brave fox crossed the frozen river.') === 'a brave fox')

console.log('== a descrição entra em TODA cena do modo história ==')
const anchor = SS.deriveStyleAnchor(farol)
const cena = SS.buildStoryScenePrompt('Drone shot of a small boat moving towards a rocky coastline under a moonlit sky', anchor, f1)
checa('buildStoryScenePrompt carrega "a middle-aged man with a short gray beard, a dark yellow raincoat and a black knit cap" com a trava de consistência', cena.includes('The same main character appears in this scene, consistent design: a middle-aged man with a short gray beard, a dark yellow raincoat and a black knit cap.'))
const cena2 = SS.buildStoryScenePrompt('Tracking shot following the lighthouse keeper as he descends wooden stairs with a flashlight', anchor, f1)
checa('a mesma ficha em outra cena (continuidade em código, não na obediência do modelo)', cena2.includes('a middle-aged man with a short gray beard') && cena2.indexOf('a middle-aged man') > cena2.indexOf('lighthouse keeper'))

console.log('== ligação: rota e política usam a mesma função ==')
const rota = rd('app/api/generate-video-cinematic/route.ts')
const pol = rd('lib/cinematic/visualPromptPolicy.ts')
checa('rota: storyCharacter = deriveStoryCharacter(prompt) no modo história, e entra na policy como character', rota.includes('const storyCharacter = storyMode ? deriveStoryCharacter(prompt) : null') && rota.includes('character: storyCharacter'))
checa('policy: fora do documentário sem rosto, buildStoryScenePrompt(visual, style, policy.character)', pol.includes("if (policy.mode !== 'documentary_faceless') {\n    prompt = buildStoryScenePrompt(visual, policy.style, policy.character ?? null)"))
checa('rota: modo história liga por look estilizado, character_story ou stock_cannot_tell (o faroleiro foi look estilizado)', rota.includes("const storyMode = isStylizedLook(styleAnchor) || formatoVisual.modo === 'character_story' || classifyEngineFit(prompt).verdict === 'stock_cannot_tell'"))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
