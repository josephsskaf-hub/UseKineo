// KINEO-LIVRO-DE-ESTADO-2026-09-19 — guardião: estado herdado entre cenas, mudança = resultado, sem enfeite; juiz de
// continuidade. Caso das meias (Axel, Veo, 00:39 BRT): cena 4 "white sock" já azul; cena 6 "transforming" terminou azul;
// cachorro que ninguém pediu; juiz 100. Sem rede, sem banco.
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
function loadSrc(src, file, requireMap = {}) {
  const exports = {}
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports, require: (m) => { if (m in requireMap) return requireMap[m]; throw new Error('import inesperado ' + m) }, process: { env: {} }, console, Math, Date, Number, Set, Map, Array, JSON, AbortController, setTimeout, clearTimeout, fetch: undefined }, { filename: file })
  return exports
}

console.log('1) supervisor de continuidade (v2) — o que o modelo lê')
const alignSrc = rd('lib/cinematic/speechImageAlign.ts')
const A = loadSrc(alignSrc, 'speechImageAlign.ts')
checa('versão v2 nomeada', A.SPEECH_IMAGE_ALIGN_VERSION === 'fala_x_imagem_v2_estado')
const msgs = A.buildAlignMessages({ topic: 'meias', scenes: [{ voiceover: 'a', shot: 'b' }] })
const sys = msgs[0].content
checa('regra 1: estado herdado ("carry each state FORWARD", "state in force AT THAT LINE")', sys.includes('carry each state FORWARD') && sys.includes('state in force AT THAT LINE'))
checa('regra 2: mudança = resultado (nunca "transforming from X to Y")', sys.includes('describe the shot in the RESULT state') && sys.includes('never "transforming from X to Y"'))
checa('regra 2b: última cena no estado FINAL', sys.includes('The LAST scene must show the FINAL state'))
checa('regra 3: sem enfeite (no other characters, no animals, no people)', sys.includes('NO EXTRAS') && sys.includes('no other characters, no animals, no people, no added props'))
checa('o JSON pedido traz "state" por cena', sys.includes('"state":"<visible state of each recurring character/object at this line'))

console.log('2) parse: reescritas + estado, para KEEP e REWRITE')
const cenas = [{ voiceover: 'x', shot: 'A close-up shot of the large white sock guiding breathing' }, { voiceover: 'y', shot: 'A close-up of the large sock transforming from blue back to white' }]
const raw = JSON.stringify({ scenes: [
  { i: 1, action: 'rewrite', shot: 'A close-up of the large BLUE sock guiding breathing in a cozy living room, no other characters, no animals, no people, no added props', why: 'sock is blue at this line', state: 'big sock: blue; small sock: red' },
  { i: 2, action: 'rewrite', shot: 'Both socks fully white and calm on the plush carpet, no other characters, no animals, no people, no added props', why: 'final state white', state: 'big sock: white; small sock: white' },
] })
const full = A.parseAlignReplyFull(raw, cenas)
checa('duas reescritas aceitas com estado', full.rewritten.length === 2 && full.rewritten[0].state === 'big sock: blue; small sock: red')
checa('livro de estado por cena', full.states.length === 2 && full.states[1].state === 'big sock: white; small sock: white')
const rawKeep = JSON.stringify({ scenes: [{ i: 1, action: 'keep', shot: '', why: 'ok', state: 'big sock: blue' }] })
checa('KEEP também registra estado (o juiz precisa dele)', A.parseAlignReplyFull(rawKeep, cenas).states[0]?.state === 'big sock: blue' && A.parseAlignReply(rawKeep, cenas).length === 0)
checa('estado longo é cortado em 200', A.parseAlignReplyFull(JSON.stringify({ scenes: [{ i: 1, action: 'keep', state: 'x'.repeat(500) }] }), cenas).states[0].state.length === 200)
checa('parseAlignReply antigo continua igual (compatibilidade)', A.parseAlignReply(raw, cenas).length === 2)

console.log('3) mutante: sem a regra do resultado o supervisor volta a aceitar "transforming"')
const mut = alignSrc.replace("'When a line CHANGES a state (turns blue, becomes white again, breaks, grows), describe the shot in the RESULT state with the change already complete — never \"transforming from X to Y\": the generator seeds the shot from a still of the first frame and rarely finishes a change. ' +", '')
checa('mutante aplicou', mut !== alignSrc)
checa('mutante é pego', !loadSrc(mut, 'align-mut.ts').buildAlignMessages({ topic: 't', scenes: [{ voiceover: 'a', shot: 'b' }] })[0].content.includes('RESULT state'))

console.log('4) rota grava o livro de estado (dois caminhos)')
const rota = rd('app/api/generate-video-cinematic/route.ts')
checa('caminho clássico (seedance/veo/kling) grava states no evento', /engine: wantsKling \? 'kling' : wantsVeo \? 'veo' : wantsSora \? 'sora' : 'seedance', \.\.\.alinhado\.relato, states: alinhado\.states,/.test(rota))
checa('caminho hollywood grava states no evento', /engine: family, \.\.\.alinhado\.relato, states: alinhado\.states,/.test(rota))

console.log('5) juiz v4: regra de continuidade')
const judgeSrc = rd('lib/fastCoherence.ts')
const J = loadSrc(judgeSrc, 'fastCoherence.ts', { '@/lib/promptGuard': { isBareStarter: () => false, looksLikeOurOwnUi: () => false }, '@/lib/modelRefusal': { looksLikeModelRefusal: () => false } /* v5 */ })
checa('versão v5 (v4 + juiz honesto de 21/09; a CONTINUITY RULE segue)', J.FAST_COHERENCE_VERSION === 'k1_coerencia_v5_honesto')
const jm = J.buildCoherenceMessages({ prompt: 'meias', narration: 'n', scenes: [{ scene: 1, voiceover: 'v', query: 'p', from: 0, sources: ['aiVideo'], tags: [] }], engine: 'cinematic_veo' })[0].content
checa('motor de IA: CONTINUITY RULE presente (estado em vigor, estado final, "transforming", extras; 1 → ≤60, 2+ → ≤40)', jm.includes('CONTINUITY RULE') && jm.includes('state in force AT THAT LINE') && jm.includes('FINAL state the story ends in') && jm.includes('"transforming from X to Y"') && jm.includes('one caps narration_vs_visuals at 60, two or more at 40'))
const jk = J.buildCoherenceMessages({ prompt: 'p', narration: 'n', scenes: [{ scene: 1, voiceover: 'v', query: 'q', from: 0, sources: ['pixabay'], tags: ['a'] }], engine: 'fast' })[0].content
checa('Kineo 1 (stock) mantém a SUBJECT RULE e não recebe a de continuidade (não há prompt gerado por cena)', jk.includes('SUBJECT RULE') && !jk.includes('CONTINUITY RULE'))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
process.exit(falhas.length ? 1 : 0)
