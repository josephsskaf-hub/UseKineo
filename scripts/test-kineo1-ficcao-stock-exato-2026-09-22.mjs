// KINEO1-FICCAO-STOCK-EXATO-2026-09-22 — guardião: em história com personagem, o banco só entra se a cabeça da busca
// for tag EXATA. Caso stefanoszantis06 (22/09 13:16Z, "Emily às 3:00 AM", Kineo 1, nota 75 / visual 60): "whispering
// voice" trouxe um pássaro (tag "whisper" ⊂ "whispering"); scenes 4-6 só tinham banco porque o teto de stills era 3.
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
function loadWith(file, requireMap) {
  const exports = {}
  const js = ts.transpileModule(rd(file), { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports, require: (m) => requireMap[m] ?? {}, process: { env: {} }, console: { log() {}, warn() {}, error() {} }, Math, Date, Number, Set, Map, Array, JSON, Object, RegExp, String, Promise, fetch: undefined, setTimeout, clearTimeout, URL, URLSearchParams }, { filename: file })
  return exports
}
const aspect = loadWith('lib/aspect.ts', {})
const aesthetic = loadWith('lib/broll/aesthetic-score.ts', {})
const P = loadWith('lib/pixabay.ts', { './clipVault': { vaultClipAsync: () => {} }, '@/lib/aspect': aspect, './broll/aesthetic-score': aesthetic })

// As tags REAIS do filme da Emily (fast_scene_plan 6ced9814).
const ROBIN = { id: 1, tags: 'bird, robin, male, whisper, territorial claim, forest, subalpine, japan', videos: {} }
const CONTAS = { id: 2, tags: 'anxiety, stress, depression, sad, alone, sadness, bills, money, rent, sue, dough, lost, serious, angry, stressed, headache, depressed, man, checks, sweater, bed', videos: {} }
const HALLWAY = { id: 3, tags: 'hallway, dark, corridor, dim, mystery, scary, path, hall, old, walls, building, decay, broken, lights, flickering, flickering lights, abandoned', videos: {} }
const PHONE = { id: 4, tags: 'phone, ringing, call, incoming, smartphone, mobile, telephone, ring, notification, alert, communication, device, sound, buzz, vibration, digital, office, message', videos: {} }
const DOORS = { id: 5, tags: 'bedrooms, doors, night, house', videos: {} }

console.log('== o vazamento, reproduzido (modo normal) ==')
P.setActiveStrictSubject(false)
checa('SEM o modo ficção, "whispering voice" ACEITA o pássaro (substring "whisper" ⊂ "whispering") — o vazamento real', P.tagsRelevantToQuery(ROBIN, 'whispering voice') === true)

console.log('== modo ficção: a cabeça tem de ser tag exata ==')
P.setActiveStrictSubject(true)
checa('"whispering voice" → pássaro REJEITADO', P.tagsRelevantToQuery(ROBIN, 'whispering voice') === false)
checa('"bedroom door" → homem com contas na cama REJEITADO (bed ≠ bedroom)', P.tagsRelevantToQuery(CONTAS, 'bedroom door') === false)
checa('"low angle dark hallway night" → corredor escuro ACEITO (tag exata "hallway")', P.tagsRelevantToQuery(HALLWAY, 'low angle dark hallway night') === true)
checa('"phone notification" → ACEITO (cabeça "notification" é tag exata)', P.tagsRelevantToQuery(PHONE, 'phone notification') === true)
checa('plural simples tolerado: "bedroom door" aceita tag "bedrooms"', P.tagsRelevantToQuery(DOORS, 'bedroom door') === true)
checa('busca só de genéricos ("door window") não traz stock em ficção; "dark room" (cabeça "dark", tag exata) ainda traz', P.tagsRelevantToQuery({ id: 6, tags: 'door, window, house', videos: {} }, 'door window') === false && P.tagsRelevantToQuery({ id: 7, tags: 'candle, dark room, candle burning, dark, sadness', videos: {} }, 'dark room') === true)
checa('headMatchesTagExactly: exato ou ±s, nunca substring', P.headMatchesTagExactly('whispering', ['whisper']) === false && P.headMatchesTagExactly('door', ['doors']) === true && P.headMatchesTagExactly('doors', ['door']) === true && P.headMatchesTagExactly('bedroom', ['bed']) === false)
P.setActiveStrictSubject(false)
checa('desligado de novo, o comportamento antigo volta (o modo é por chamada)', P.tagsRelevantToQuery(HALLWAY, 'low angle dark hallway night') === true && P.tagsRelevantToQuery(ROBIN, 'whispering voice') === true)

console.log('== a rota liga o modo só com personagem, e sobe o teto de stills da história ==')
const ft = rd('app/api/generate-video-fast/route.ts')
checa('getPixabayClipsForScene recebe strictSubject: !!personagem', ft.includes('styleCtx, aspect, strictSubject: !!personagem }'))
checa('com clipes, a história com personagem mantém até 6 stills (era 3)', ft.includes('if (!filmeDesenhado) aiStillsMax = Math.min(aiStillsMax, personagem ? CHARACTER_STORY_STILLS_WITH_CLIPS_MAX : FIRST_FILM_STILLS_WITH_CLIPS_MAX)') && rd('lib/fastAiClips.ts').includes('export const CHARACTER_STORY_STILLS_WITH_CLIPS_MAX = 6'))
checa('getPixabayClipsForScene liga o modo a partir do opts (setActiveStrictSubject)', rd('lib/pixabay.ts').includes('setActiveStrictSubject(opts?.strictSubject === true)'))

console.log('== mutantes ==')
{
  const src = rd('lib/pixabay.ts')
  const mut = src.replace('return tagWords.some((w) => w === h || w === `${h}s` || h === `${w}s`)', 'return tagWords.some((w) => w === h || w.includes(h) || h.includes(w))')
  checa('mutante (substring de volta) aplicou', mut !== src)
  const js = ts.transpileModule(mut, { compilerOptions: { module: 1, target: 9 } }).outputText
  const ex = {}
  vm.runInNewContext(js, { exports: ex, require: (m) => ({ './clipVault': { vaultClipAsync: () => {} }, '@/lib/aspect': aspect, './broll/aesthetic-score': aesthetic })[m] ?? {}, process: { env: {} }, console: { log() {}, warn() {}, error() {} }, Math, Date, Number, Set, Map, Array, JSON, Object, RegExp, String, Promise, fetch: undefined, setTimeout, clearTimeout, URL, URLSearchParams })
  ex.setActiveStrictSubject(true)
  checa('mutante é pego: o pássaro volta a passar', ex.tagsRelevantToQuery(ROBIN, 'whispering voice') === true)
}
{
  const mut = ft.replace('strictSubject: !!personagem', 'strictSubject: false')
  checa('mutante da rota (modo nunca ligado) é pego', mut !== ft && !mut.includes('strictSubject: !!personagem'))
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
