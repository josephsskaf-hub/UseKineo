import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
// KINEO-NOME-SEM-CORPO-HOLLYWOOD-1211 — a ficha PRÓPRIA do planejador do hollywood (lib/hollywood/router.ts; só entra quando o elenco vem vazio) não vira
// "God"/"Yahweh"/"Allah"…: ficha que começa por um desses = ficha vazia. Trava (Node puro): (a) o filtro pega as divindades e deixa passar gente ("Godfrey",
// "Lorde", "Lord Byron" — título de gente, com nome próprio depois); (b) a linha está no planejador e a ficha do modelo passa por ela. Mutante: sem o filtro.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const R = readFileSync(join(root, 'lib/hollywood/router.ts'), 'utf8').replace(/\r\n/g, '\n')
const LINHA = "const fichaDoModelo = SEM_CORPO_FICHA_1211.test(fichaCruaDoModelo) && !TITULO_DE_GENTE_1211.test(fichaCruaDoModelo) ? '' : fichaCruaDoModelo"
function problems(src) {
  const p = []
  const m1 = /const SEM_CORPO_FICHA_1211 = (\/.+\/iu)\n/.exec(src), m2 = /const TITULO_DE_GENTE_1211 = (\/.+?\/) \/\//.exec(src)
  if (!m1 || !m2) return ['(b) o filtro não está no planejador']
  const deus = new Function(`return ${m1[1]}`)(), titulo = new Function(`return ${m2[1]}`)()
  const filtra = (t) => deus.test(t) && !titulo.test(t)
  for (const t of ['God, exactly as the author wrote: "manifestation is God"', 'Yahweh, a radiant presence', 'The Lord, an elderly figure', 'Allah', 'Holy Spirit as a dove of light']) if (!filtra(t)) p.push(`(a) deixou passar: ${t}`)
  for (const t of ['Godfrey, a man in his forties', 'Lorde, a young singer', 'A tall knight who serves the lord', 'Maria, a nurse', 'Lord Byron, a poet in a dark coat']) if (filtra(t)) p.push(`(a) pegou gente: ${t}`)
  if (!src.includes(LINHA)) p.push('(b) a ficha do modelo não passa pelo filtro')
  return p
}
assert.deepEqual(problems(R), [], 'estado atual')
console.log('ok  estado atual limpo (divindade não vira ficha no hollywood; gente passa)')
const m = problems(R.replace(LINHA, 'const fichaDoModelo = fichaCruaDoModelo'))
if (!m.length) { console.log('FALHA M1 sem o filtro: ficou verde'); process.exit(1) }
console.log(`ok  M1 sem o filtro: vermelho (${m[0]})`)
console.log('2 ok · 0 falha(s)')
