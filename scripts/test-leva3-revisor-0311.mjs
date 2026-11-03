// KINEO-LEGENDA-PREPOSICAO-0311 + KINEO-FITS-DO-15S-0311 [TRAVA 8.2 — fundador 03/11, Canal do Revisor] — guardião da leva 3.
//   (A) a legenda não fecha o pedaço em preposição longa/conectivo ("THE SUN EXPLODED OVER", Tunguska): a lista de palavras-função
//       de lib/compose.ts tem over/under/through/like/than… e as equivalentes pt/es/fr/de; as de antes continuam;
//   (A2) nome próprio + número ("World War 3", "Apollo 11", "Boeing 747", "Louis XIV") nunca se parte: palavrasDoNomeAntesDoNumero
//       manda as até 2 palavras maiúsculas finais descerem com o número (hansak.th, Petrov 1983); o despacho usa o helper;
//   (B) script_written de filme curto mede pelo piso DO FILME CURTO (pisoFilmeCurto), e guarda o piso longo em min_words_long:
//       os fits:false de 03/11 (min 86/56/53 para teto 41) eram alarme falso;
//   (M) mutantes ficam vermelhos.
// Rodar: node scripts/test-leva3-revisor-0311.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const ROOT = path.resolve(import.meta.dirname, '..')
const ts = createRequire(import.meta.url)(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const F = { compose: 'lib/compose.ts', script: 'app/api/generate-script/route.ts' }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

function palavrasFuncao(src) {
  const i = src.indexOf('const LEGENDA_PALAVRA_FUNCAO = new Set([')
  const j = src.indexOf('])', i)
  if (i < 0 || j < 0) return new Set()
  return new Set([...src.slice(i, j).matchAll(/'([^']+)'/g)].map((m) => m[1]))
}

function checa(over = {}) {
  const erros = []
  const req = (c, m) => { if (!c) erros.push(m) }
  const set = palavrasFuncao(over[F.compose] ?? read(F.compose))
  for (const w of ['over', 'under', 'through', 'across', 'like', 'than', 'sobre', 'entre', 'hasta', 'sur', 'avec', 'über', 'mit']) req(set.has(w), `A "${w}" viaja com o que rege`)
  for (const w of ['the', 'of', 'into', 'de', 'la', 'und']) req(set.has(w), `A a palavra de antes "${w}" continua`)
  for (const w of ['sun', 'exploded', 'siberia', 'sky']) req(!set.has(w), `A palavra de conteúdo "${w}" nunca é palavra-função`)
  const co = over[F.compose] ?? read(F.compose)
  let f = null
  try {
    const i = co.indexOf('const LEGENDA_NUMERO_RE'), j = co.indexOf('export function terminaEmPalavraFuncao')
    const js = ts.transpileModule(co.slice(i, j) + '\nmodule.exports = { palavrasDoNomeAntesDoNumero }', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const m = { exports: {} }; new Function('module', 'exports', js)(m, m.exports); f = m.exports.palavrasDoNomeAntesDoNumero
  } catch (e) { erros.push('A2 helper não compila: ' + e.message) }
  const W = (t) => t.split(' ').map((word) => ({ word }))
  if (f) {
    req(f(W('stopped World War'), '3') === 2, 'A2 "STOPPED | WORLD WAR 3"')
    req(f(W('A possible World War'), '3') === 2, 'A2 "A POSSIBLE | WORLD WAR 3"')
    req(f(W('the mission Apollo'), '11') === 1 && f(W('flew a Boeing'), '747') === 1 && f(W('crowned King Louis'), 'XIV') === 2, 'A2 Apollo 11 / Boeing 747 / King Louis XIV')
    req(f(W('in the year'), '1983') === 0, 'A2 palavra minúscula antes do ano: nada desce')
    req(f(W('World War'), '3') === 0, 'A2 nunca esvazia o pedaço')
    req(f(W('stopped World War'), 'by') === 0, 'A2 sem número depois: nada desce')
  }
  req(co.includes('const nomeAntesDoNumero = !natural && next ? palavrasDoNomeAntesDoNumero(current, next.word) : 0') && co.includes('current = current.slice(-nomeAntesDoNumero)'), 'A2 o divisor da legenda usa o helper')
  const sc = over[F.script] ?? read(F.script)
  req(/min_words: filmeCurto \? pisoFilmeCurto : alvoPalavras, min_words_long: alvoPalavras/.test(sc), 'B min_words do filme curto = piso do filme curto (o longo fica em min_words_long)')
  req(/fits: filmeCurto \? palavrasDoFilmeCurto\(script\) >= pisoFilmeCurto : scriptWordCount\(script\) >= alvoPalavras/.test(sc), 'B fits do filme curto mede pelo piso dele')
  return erros
}
const base = checa()
ok(base.length === 0, `todas as provas verdes (${base.length} erro(s))${base.length ? ': ' + base.join(' · ') : ''}`)
const co = read(F.compose)
const sc = read(F.script)
const MUTANTES = [
  ['"over" sai da lista', { [F.compose]: co.replace("  'over', 'under',", "  'under',") }],
  ['nome desce sem número', { [F.compose]: co.replace("if (!proximo || !LEGENDA_NUMERO_RE.test(proximo.trim())) return 0", 'if (!proximo) return 0') }],
  ['fits volta ao piso longo', { [F.script]: sc.replace('fits: filmeCurto ? palavrasDoFilmeCurto(script) >= pisoFilmeCurto : scriptWordCount(script) >= alvoPalavras', 'fits: scriptWordCount(script) >= alvoPalavras') }],
]
for (const [nome, over] of MUTANTES) {
  const changed = Object.entries(over).every(([k, v]) => v !== read(k))
  const e = changed ? checa(over) : ['(mutante não aplicou)']
  ok(changed && e.length > 0, `mutante "${nome}" fica vermelho (${changed ? e.length + ' erro(s)' : 'NÃO APLICOU'})`)
}
console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
