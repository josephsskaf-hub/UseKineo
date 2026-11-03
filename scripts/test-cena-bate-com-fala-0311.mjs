// KINEO-CENA-BATE-COM-FALA-0311 [TRAVA 8.2 — fundador 03/11, Canal do Revisor] — guardião. Prova que a regra comum dos escritores
// de cena (lib/cinematic/cenarioDoFilme.ts, lida pelo descritor clássico E pelo planejador hollywood) cobre os 6 defeitos da
// rodada: contagem ("a family of four"), objeto citado ("a waterproof bag"), pessoa fora do roteiro, ação concreta ("set a
// budget"), anatomia por dentro do corpo ("três corações") e o último plano igual à última fala. E que os dois escritores
// continuam importando a constante uma vez cada (a regra vale para todos os motores).
// Rodar: node scripts/test-cena-bate-com-fala-0311.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '..')
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const F = { lib: 'lib/cinematic/cenarioDoFilme.ts', rota: 'app/api/generate-video-cinematic/route.ts', router: 'lib/hollywood/router.ts' }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const load = (src) => { const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; const m = { exports: {} }; new Function('require', 'module', 'exports', js)(() => { throw new Error('import') }, m, m.exports); return m.exports }

function checa(over = {}) {
  const erros = []
  const req = (c, m) => { if (!c) erros.push(m) }
  let R
  try { R = load(over[F.lib] ?? read(F.lib)).REGRAS_DO_ESCRITOR_DE_CENAS } catch (e) { return ['lib não compila: ' + e.message] }
  req(/COUNT: when the narration line gives a number/.test(R) && /shows exactly that number/.test(R), 'contagem: "a family of four" = exatamente 4')
  req(/NAMED OBJECT/.test(R) && /visible main subject of that shot/.test(R), 'objeto citado é o sujeito visível da cena')
  req(/NO EXTRA PEOPLE: never add a person the script does not describe/.test(R) && /host or a character sheet you were given is not an extra person/.test(R), 'nenhuma pessoa fora do roteiro (host/ficha não contam)')
  req(/ACTIONS: when a line tells the viewer to DO something/.test(R) && /never a symbolic stand-in/.test(R), 'ação concreta, nunca símbolo')
  req(/INSIDE THE BODY/.test(R) && /never appear outside, floating/.test(R), 'órgão por dentro do corpo, nunca por fora')
  req(/LAST SHOT: the final shot shows literally what the final narration line says/.test(R), 'último plano = última fala')
  req(/MEANS in the context of the whole script/.test(R) && /NO TEXT, NO PUBLIC FIGURES/.test(R), 'as regras de 02/11 continuam')
  const rota = over[F.rota] ?? read(F.rota)
  const router = over[F.router] ?? read(F.router)
  req(rota.split('${REGRAS_DO_ESCRITOR_DE_CENAS}').length === 2 && router.split('${REGRAS_DO_ESCRITOR_DE_CENAS}').length === 2, 'os dois escritores (clássico e hollywood) leem a regra, uma vez cada')
  return erros
}
const base = checa()
ok(base.length === 0, `todas as provas verdes (${base.length} erro(s))${base.length ? ': ' + base.join(' · ') : ''}`)
const lib = read(F.lib)
const MUTANTES = [
  ['contagem some', { [F.lib]: lib.replace(/\n\s*'- KINEO-CENA-BATE-COM-FALA-0311 COUNT:[^\n]*/, '') }],
  ['último plano some', { [F.lib]: lib.replace(/\n\s*'- KINEO-CENA-BATE-COM-FALA-0311 LAST SHOT:[^\n]*/, '') }],
  ['clássico para de ler a regra', { [F.rota]: read(F.rota).replace('${REGRAS_DO_ESCRITOR_DE_CENAS}', '') }],
]
for (const [nome, over] of MUTANTES) {
  const changed = Object.entries(over).every(([k, v]) => v !== read(k))
  const e = changed ? checa(over) : ['(mutante não aplicou)']
  ok(changed && e.length > 0, `mutante "${nome}" fica vermelho (${changed ? e.length + ' erro(s)' : 'NÃO APLICOU'})`)
}
console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
