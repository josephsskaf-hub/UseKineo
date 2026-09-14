// KINEO-RESTAURA-AUTOR-2026-09-13 — guardião: a expansão devolve a frase do
// autor ao lugar em vez de jogar o candidato fora.
//
// Medido (14 d): script_expand_failed 24/58 auto-expansões (41%); causa nº 1
// author_rewrite_rejected (13 casos, 8 pessoas) — o modelo mexe em 1 frase
// entre 3/4/14/20, o candidato cabe, a rota recusa. Fundador 13/09: "vai".
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

// Carregador CJS mínimo: resolve './x' e '@/lib/x' para lib/x.ts transpilado.
const cache = new Map()
function carregar(rel) {
  if (cache.has(rel)) return cache.get(rel)
  const js = ts.transpileModule(rd(rel), { compilerOptions: { module: 1, target: 9 } }).outputText
  const mod = { exports: {} }
  cache.set(rel, mod.exports)
  const req = (spec) => {
    const alvo = spec.startsWith('@/lib/') ? 'lib/' + spec.slice(6) + '.ts' : spec.startsWith('./') ? join(dirname(rel), spec.slice(2)).replace(/\\/g, '/') + '.ts' : null
    if (!alvo) throw new Error('import inesperado: ' + spec)
    return carregar(alvo)
  }
  vm.runInNewContext(js, { exports: mod.exports, module: mod, require: req, console })
  cache.set(rel, mod.exports)
  return mod.exports
}
const P = carregar('lib/expandPolicy.ts')

console.log('== restoreAuthorSentences ==')
const autor = 'In 1872 a ship was found drifting in the Atlantic. Not a single person was aboard. Her name was the Mary Celeste.'
// o modelo reescreveu a 2ª frase e acrescentou material novo
const cand = 'In 1872 a ship was found drifting in the Atlantic. There was not one single soul aboard the vessel. Her name was the Mary Celeste. Food, water and cargo were still in place, untouched. The lifeboat was gone.'
const r = P.restoreAuthorSentences(autor, cand)
checa('a frase mexida volta a ser a do autor, palavra por palavra', r !== null && r.restored === 1 && r.text.includes('Not a single person was aboard.'))
checa('o material novo sobrevive', r !== null && /Food, water and cargo/.test(r.text) && /The lifeboat was gone/.test(r.text))
checa('depois do reparo, authorPreserved aprova', r !== null && P.authorPreserved(autor, r.text).ok === true)
checa('candidato intacto → null (nada a reparar)', P.restoreAuthorSentences(autor, autor + ' The lifeboat was gone.') === null)
checa('frase APAGADA de vez (sem parente) → null (segue para a recusa; C1 intacto)', P.restoreAuthorSentences(autor, 'In 1872 a ship was found drifting in the Atlantic. Her name was the Mary Celeste. The lifeboat was gone.') === null)
checa('parente fraca (<50% das palavras) não conta como a mesma frase', P.restoreAuthorSentences('The captain vanished with his family.', 'Storms battered the coast for weeks. The crew was never seen again.') === null)
const pt = 'Eram três da manhã quando o telefone tocou. Número desconhecido. Ele não atendeu.'
const candPt = 'Eram três da manhã quando o telefone tocou. Era um número desconhecido, sem nome. Ele não atendeu. O aparelho tocou de novo, e de novo, até que ele levantou da cama.'
const rp = P.restoreAuthorSentences(pt, candPt)
checa('português com acento: frase curta reescrita volta ("Número desconhecido.")', rp !== null && rp.restored === 1 && rp.text.includes('Número desconhecido.') && P.authorPreserved(pt, rp.text).ok)
checa('ordem preservada: a frase restaurada fica no lugar da parente, não no fim', rp !== null && rp.text.indexOf('Número desconhecido.') < rp.text.indexOf('Ele não atendeu.'))

console.log('== a rota ==')
const rota = rd('app/api/expand-script/route.ts')
checa('a rota tenta restaurar ANTES do veredito (a linha `const preservado` dos guardiões antigos fica intacta e mede o texto reparado)', rota.indexOf('const reparo = restoreAuthorSentences(falaOriginal, expandido)') > 0 && rota.indexOf('const reparo = restoreAuthorSentences(falaOriginal, expandido)') < rota.indexOf('const preservado = authorPreserved(falaOriginal, falaExpandida)') && /depois = narrationFit\(falaExpandida, target\)\n\s+autorRestaurado = reparo\.restored/.test(rota))
checa('só aceita o reparo se authorPreserved confirmar', /if \(authorPreserved\(falaOriginal, falaReparada\)\.ok\) \{/.test(rota))
checa('a resposta diz quantas frases voltaram (authorRestored)', /authorRestored: autorRestaurado,/.test(rota))
checa('o reparo vem antes da semente/recusa', rota.indexOf('const reparo = restoreAuthorSentences(') < rota.indexOf("outcome: 'author_rewrite_rejected'"))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
