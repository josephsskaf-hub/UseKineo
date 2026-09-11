// KINEO-PRIMEIRA-PESSOA-2026-09-11 — guardião de "quem conta a própria história é o personagem".
//
// Canário do fundador (Kling 3, 11/09 11:53 BRT, claim 6a000eb0, deploy 679b789c):
// "My name is Tomás, and I was the last lighthouse keeper…" caiu em
// documentary_faceless → 8 cenas de apoio, 0 de diálogo → o planner escreveu
// "Tomás stands in front of the lighthouse… He begins speaking about his past"
// → o Kling desenhou o homem falando e a narradora disse outra coisa por cima.
// O fundador: "as pessoas pensam que é o cara falando, mas é o narrador. Pior."
//
// Três consertos, sem render pago: (1) primeira pessoa → presenter (o personagem
// fala na lente com a nossa voz); (2) verbos de fala saem do prompt de apoio e o
// "boca fechada" vira PREFIXO em toda família; (3) o dry-run de $0 mostra modo,
// ficha e voz antes de gastar 150 créditos.
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
const roda = (src) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp }); return exp }

console.log('== o diretor de formato, executado ==')
const VM = roda(rd('lib/cinematic/visualMode.ts'))
const TOMAS = "My name is Tomás, and I was the last lighthouse keeper on Ilha das Cabras. In 1987 the government shut the light off and told me to leave. I didn't. Every night for thirty years I climbed the ninety-two steps and lit the lamp by hand, because one fishing boat still came home this way."
const d = VM.decidirFormato(TOMAS, false)
checa('o faroleiro (canário real) vira presenter: quem fala é o personagem', d.modo === 'presenter' && d.apresentadorPedido === true)
checa('motivo diz primeira pessoa', /primeira pessoa/.test(d.motivo))
checa('presenter permite cena de diálogo (permiteApresentador)', VM.permiteApresentador('presenter') === true)
checa('português: "Me chamo Tomás e eu era o último faroleiro" → presenter', VM.decidirFormato('Me chamo Tomás e eu era o último faroleiro da ilha. Eu subia os degraus toda noite porque eu sabia que um barco ainda voltava por ali.', false).modo === 'presenter')
checa('espanhol: "Mi nombre es Tomás, yo era el último farero" → presenter', VM.decidirFormato('Mi nombre es Tomás y yo era el último farero de la isla. Yo subía cada noche porque mi barco volvía por aquí.', false).modo === 'presenter')
checa('documentário com "I think you will love this fact" NÃO vira presenter', VM.decidirFormato('I think you will love this fact: Anak Krakatau released 1,000 tons of sulfur dioxide during its last eruption. The plume drifted across the strait.', false).modo === 'documentary_faceless')
checa('terceira pessoa ("his story… he was born") segue character_story (pessoa muda)', VM.decidirFormato('This is his story. He was born in a small village by the sea and grew up climbing the lighthouse steps.', false).modo === 'character_story')
checa('a tag [faceless] continua vencendo a primeira pessoa', VM.decidirFormato(TOMAS + ' [faceless]', true).modo === 'documentary_faceless')
checa('pedido explícito de apresentador continua presenter', VM.decidirFormato('Make a video of me talking to the camera about my week', false).modo === 'presenter')
checa('NOAA (documental) continua documentary_faceless', VM.decidirFormato('NOAA reports that the Atlantic hurricane season peaks in September. Warm water fuels the storms.', false).modo === 'documentary_faceless')
checa('contadoNaPrimeiraPessoa é determinístico e exige sinal + pronomes', VM.contadoNaPrimeiraPessoa(TOMAS) === true && VM.contadoNaPrimeiraPessoa('my name is') === false && VM.contadoNaPrimeiraPessoa('') === false)
const proib = VM.proibidosPorModo('documentary_faceless')
checa('verbos de fala entram na lista de proibidos fora do presenter', ['begins speaking', 'speaking about', 'says', 'narrates'].every((t) => proib.includes(t)) && VM.proibidosPorModo('character_story').includes('begins speaking'))
checa('presenter continua sem proibições', VM.proibidosPorModo('presenter').length === 0)

console.log('== a rota: boca fechada como prefixo, verbos de fala removidos ==')
const rt = rd('app/api/generate-video-cinematic/route.ts')
checa('mouthPrefix vale para TODA família em cena não-diálogo (não só h3)', /const mouthPrefix = hs\.type !== 'dialogue'\n\s+\? 'No one talks on camera\. Every visible person is silent, mouth closed, no lip movement, not speaking\. '\n\s+: ''/.test(rt) && !/family === 'h3' && hs\.type !== 'dialogue'\n\s+\? 'No one talks/.test(rt))
checa('"begins speaking about his past" é trocado por silêncio antes do POST', /hs\.prompt = hs\.prompt\n\s+\.replace\(\/\\b\(\?:he\|she\|they\|the \(\?:man\|woman\|person\|old man\|old woman\|boy\|girl\)\)\?\\s\*\(\?:begins\?\|starts\?\|continues\?\)\\s\+\(\?:speaking\|talking\|telling\|narrating\|explaining\)/.test(rt))
{
  // executa a mesma substituição da rota sobre o prompt REAL do canário
  const m = rt.match(/hs\.prompt = hs\.prompt\n([\s\S]*?)\n\s+\}\n/)
  const chain = m ? m[1] : ''
  const fn = new Function('p', 'return p' + chain.replace(/^\s+/gm, '') )
  const real = 'Tomás stands in front of the lighthouse, with a determined expression. He begins speaking about his past., subtle handheld camera movement'
  const out = fn(real)
  checa('prompt real do canário sai sem "begins speaking about his past"', !/begins speaking/.test(out) && /silent, mouth closed/.test(out))
  checa('prompt sem verbo de fala fica byte a byte igual', fn('A close-up of the lighthouse lamp flickering against the darkening sky') === 'A close-up of the lighthouse lamp flickering against the darkening sky')
  checa('"she tells the story of the island" também vira silêncio', /silent, mouth closed/.test(fn('An old woman on the pier; she tells the story of the island, wind in her hair')))
}

console.log('== dry-run de $0 diz quem fala ==')
checa('dry-run devolve visual_mode, motivo, ficha, voz e nº de cenas de diálogo', /visual_mode: formatoVisual\.modo,\n\s+visual_mode_reason: formatoVisual\.motivo,\n\s+character_sheet: plan\.characterSheet \?\? null,\n\s+character_voice: resolveCharacterVoice\(plan\.characterSheet \?\? ''\),\n\s+dialogue_scenes: plan\.scenes\.filter\(\(sc\) => sc\.type === 'dialogue'\)\.length,/.test(rt))
checa('rota importa resolveCharacterVoice', /import \{ resolveCharacterVoice \} from '@\/lib\/hollywood\/characterVoice'/.test(rt))
checa('dry-run continua estornando e sem POST pago (releaseBirthClaim antes do return)', /await releaseBirthClaim\('dry_run_no_charge'\)\n\s+return NextResponse\.json\(\{\n\s+dry_run: true,/.test(rt))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
