// AUDITORIA DOS MOTORES (14/09/2026) — guardião dos 3 itens reproduzidos que
// foram consertados na mesma noite:
//   1. frase maior que a cena entrava inteira e só o dry-run via;
//   2. a sobra era encaixada de trás para frente (1…11, 14, 12, 13);
//   3. "Anchorage" / "drops its anchor" / "No presenter" ligavam apresentador.
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

console.log('== item 3: apresentador por palavra inteira, negação vence ==')
const VM = roda(rd('lib/cinematic/visualMode.ts'))
const modo = (t) => VM.decidirFormato(t, false).modo
checa('"drops its anchor" não é apresentador', modo('A ship drops its anchor beside the island. The crew waits for dawn.') === 'documentary_faceless')
checa('"Anchorage, Alaska" não é apresentador', modo('A documentary about Anchorage, Alaska, and the 1964 earthquake.') === 'documentary_faceless')
checa('"No presenter. Show only the city." é faceless', modo('No presenter. Show only the city at night, drones and streets.') === 'documentary_faceless')
checa('"sem apresentador" em PT é faceless', modo('Documentário sobre o Pantanal, sem apresentador, só imagens.') === 'documentary_faceless')
checa('pedido real de apresentador continua ligando', modo('A presenter talks to camera about the 1964 earthquake.') === 'presenter')
checa('"news anchor" inteiro continua ligando', modo('A news anchor reads the headline about the earthquake.') === 'presenter')
checa('tag [faceless] segue vencendo tudo', VM.decidirFormato('a presenter talks to camera', true).modo === 'documentary_faceless')

console.log('== item 1: frase longa é quebrada na vírgula do meio (mirror executado) ==')
const r = rd('app/api/generate-video-cinematic/route.ts')
const iM = r.indexOf('// ═══ MIRROR: splitLongSentence ═══')
const iE = r.indexOf('// ═══ END MIRROR ═══', iM)
checa('mirror splitLongSentence existe na rota', iM > 0 && iE > iM)
const mirror = r.slice(iM, iE).split('\n').map((l) => l.replace(/^ {8}/, '')).join('\n')
for (const [SCENE_CAP, temCinematic, capEsperado] of [[12, false, 28], [10, false, 24], [12, true, 20]]) {
  const src = `const wordsIn = (t) => t.trim().split(/\\s+/).filter(Boolean).length\nconst SCENE_CAP = ${SCENE_CAP}\nconst plan = { scenes: [${temCinematic ? "{ type: 'cinematic' }" : "{ type: 'support' }"}] }\n${mirror}\nexports.cap = capSentenceWords\nexports.split = splitLongSentence`
  const M = roda(src)
  checa(`teto de palavras por frase = ${capEsperado} (SCENE_CAP ${SCENE_CAP}${temCinematic ? ', com cena cinematic' : ''})`, M.cap === capEsperado)
  const longa = 'On the night of July 9, 1958, a massive landslide fell into Lituya Bay after a strong earthquake, and the wave that followed climbed 524 meters up the far shore, stripping every tree from the slope.'
  const partes = M.split(longa)
  checa(`frase de ${longa.split(' ').length} palavras vira ${partes.length} partes, todas ≤ teto, nenhuma palavra perdida`, partes.length >= 2 && partes.every((p) => p.split(' ').length <= M.cap) && partes.join(' ') === longa)
  checa('a quebra cai numa vírgula (respiração), não no meio da oração', partes.slice(0, -1).every((p) => /[,;:—–]$/.test(p)))
  checa('frase curta não é tocada', M.split('A wave hit the bay.').length === 1)
}
checa('a régua fala × segundos roda no caminho PAGO antes da recusa (não só no dry-run)', (() => {
  const iGuard = r.indexOf('KINEO-FRASE-MAIOR-QUE-A-CENA-2026-09-14 (auditoria, item 1): a régua')
  const iRecusa = r.indexOf('if (verbatimOverflowWords > 0) {')
  const iSubmit = r.indexOf('await submitToFalWithOneRetry(')
  return iGuard > 0 && iGuard < iRecusa && iRecusa < iSubmit && /if \(fala > \(sc\.seconds \|\| 0\) \+ 1\) verbatimOverflowWords \+= /.test(r)
})())

console.log('== item 2: a sobra nunca anda para trás ==')
checa('o laço de trás para frente morreu', !/for \(let k = plan\.scenes\.length - 1; k >= 0 && si < sentences\.length; k--\)/.test(r))
checa('a sobra vai só para a ÚLTIMA cena narrada', /const ultima = \[\.\.\.plan\.scenes\]\.reverse\(\)\.find\(\(sc\) => sc\.type !== 'dialogue'\)/.test(r))
checa('a cota é proporcional sobre o que RESTA', /const share = Math\.max\(6, Math\.round\(restantesW \* \(\(sc\.seconds \|\| 5\) \/ restantesS\)\)\)/.test(r) && !/totalWords \* \(\(sc\.seconds \|\| 5\) \/ planSecs\)/.test(r))
// simulação da distribuição com a cota nova: 12 frases de 12 palavras em 6 cenas de 10 s (cabe nos tetos) — ordem 1..12 e nada sobra
{
  const wordsIn = (t) => t.trim().split(/\s+/).filter(Boolean).length
  const sentences = Array.from({ length: 12 }, (_, i) => `Sentence ${i + 1} ` + Array(10).fill('w').join(' ') + '.')
  const scenes = Array.from({ length: 6 }, () => ({ type: 'support', seconds: 10 }))
  const capWords = () => 26
  let si = 0
  const ordem = []
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i]
    const restantesW = sentences.slice(si).reduce((a, s) => a + wordsIn(s), 0)
    const restantesS = scenes.slice(i).reduce((a, s) => a + (s.seconds || 5), 0) || 1
    const share = Math.max(6, Math.round(restantesW * ((sc.seconds || 5) / restantesS)))
    let w = 0; const chunk = []
    while (si < sentences.length) {
      const nw = wordsIn(sentences[si])
      if (chunk.length > 0 && (w + nw > capWords(sc) || (w >= share && nw >= 5))) break
      chunk.push(sentences[si]); w += nw; si++
    }
    ordem.push(...chunk.map((s) => Number(s.match(/Sentence (\d+)/)[1])))
  }
  checa('simulação: 12 frases saem 1→12 em ordem e nada sobra', si === sentences.length && ordem.join(',') === Array.from({ length: 12 }, (_, i) => i + 1).join(','))
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
