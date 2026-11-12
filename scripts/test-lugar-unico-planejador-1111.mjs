import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nativeRequire = createRequire(import.meta.url)
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
const carregar = (src) => { const m = { exports: {} }; new Function('module', 'exports', 'require', ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(m, m.exports, nativeRequire); return m.exports }
// KINEO-LUGAR-UNICO-PLANEJADOR-1111 — CEO 11/11: a regra "ONE PLACE" no planejador só se a prova mostrar que não achata documentário. Ensaio
// (gpt-4o-mini, 8 rodadas, roteiros reais; arquivos DIV2-PLANEJADOR-LUGAR-UNICO-rodada*.json na pasta de notas): sempre ligada, achatou os
// Veteranos ("Back in the same forest"); decidida pelo GPT, não pegou o boneco. Aqui a decisão é do código (personagemContinuo). Trava (Node
// puro, sem rede): (a) os 3 roteiros reais — Veteranos (roteiro colado, em 6 falas) e Pompeia = null; boneco (4eb0c0c9) = "stick man";
// (b) nome próprio não conta ("Vesuvius"), uma fala só não conta, e o personagem tem de estar em ≥ metade das falas; (c) o planejador (as
// duas mensagens de cena do analyze-idea) só ganha a linha quando o código acha o personagem — Veteranos e Pompeia: a mensagem é a de antes,
// byte a byte; (d) a linha não traz exemplo de lugar (a rodada 6 copiou "sunny park"). Mutantes no fim.
const PC = 'lib/cinematic/personagemContinuo.ts', AN = 'app/api/analyze-idea/route.ts'
const VET = ['Why is Veterans Day always November eleventh? Because of one morning in France.', 'In nineteen eighteen, after four years of war, the fighting was set to stop at the eleventh hour of the eleventh day of the eleventh month. The deal was signed in a railroad car in a forest, around five in the morning.', 'But the guns did not stop. For six more hours, both sides kept fighting over ground that no longer mattered. More than twenty-seven hundred men died that morning.', 'One of them was Henry Gunther, a soldier from Baltimore. At ten fifty-nine, he charged toward a German machine gun. The Germans knew peace was one minute away. They waved at him to go back.', 'He kept coming. He is remembered as the last American killed in the war. Then, at eleven, silence. America called it Armistice Day, and later Veterans Day, to honor everyone who served.', 'In nineteen seventy-one, it was moved to a Monday in October for a long weekend. Many states refused to go along. The date meant too much. So it came back to November eleventh. Who are you thanking this Veterans Day? Tell me below, and follow for more history.']
const POMPEIA = ['Thousands cheer—unaware of looming doom.', 'A plume rises from Mount Vesuvius... dark and menacing.', 'Vesuvius erupts violently, hurling fiery rocks.', "The amphitheater crumbles—engulfed in chaos... as Pompeii falls under Vesuvius's wrath."]
const BONECO = ['Ever seen a stick man fart while reading?', 'This stick man reads with unexpected sound effects.', 'Every page prompts a surprising reaction.', "It's a mix of humor and animation: farting while reading!"]
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let P
  try { P = carregar(over[PC] ?? read(PC)) } catch (e) { return [`fonte não carrega: ${e.message}`] }
  for (const [nome, falas, quer] of [['Veteranos', VET, null], ['Pompeia', POMPEIA, null], ['boneco 4eb0c0c9', BONECO, 'stick man']])
    no(P.personagemContinuo(falas) !== quer, `(a) ${nome} → ${JSON.stringify(P.personagemContinuo(falas))}`)
  no(P.personagemContinuo(['Luca moved in.', 'Luca heard knocks.', 'Luca found a photo.']) !== null, '(b) nome próprio contou como personagem')
  no(P.personagemContinuo(['A dog barks.', 'The sun sets.', 'The wind blows.', 'Night falls.']) !== null, '(b) uma fala só contou')
  no(P.personagemContinuo(['A girl finds a key.', 'The girl opens the door.', 'Behind it, the girl sees the sea.']) !== 'girl', '(b) a menina em 3 de 3 não contou')
  // (e) ajuste da CEO 11/11 20:50 — gente no PLURAL não é personagem contínuo: documentário de guerra com "the men" em quase toda fala = null
  // (senão a linha ONE PLACE entra e achata o filme, o defeito da v1); "two kids" também fica como antes, sem a linha
  const guerra = ['In 1916 the men marched toward the Somme.', 'For days the men waited in flooded trenches.', 'At dawn the whistles blew and the men went over the top.', 'By nightfall, nineteen thousand British soldiers were dead.']
  no(P.personagemContinuo(guerra) !== null, `(e) documentário com "the men" → ${JSON.stringify(P.personagemContinuo(guerra))}`)
  no(P.personagemContinuo(['Two kids find a map.', 'The kids follow it into the woods.', 'The kids dig under an old oak.']) !== null, '(e) "kids" no plural contou')
  no(P.personagemContinuo(['Two puppies wake up.', 'The puppies chase a ball.', 'The puppies fall asleep.']) !== 'puppy', '(e) bicho no plural deixou de contar')
  no(/sunny park|e\.g\./.test(P.REGRA_UM_LUGAR), '(d) a linha traz exemplo de lugar')
  // (c) as duas mensagens de cena do analyze-idea, como no código
  const an = over[AN] ?? read(AN)
  const ini = 'const visualUserMsg = `'
  const a1 = an.indexOf(ini), b1 = an.indexOf('`\n\n      try {', a1), a2 = an.indexOf(ini, b1), b2 = an.indexOf('`\n\n        try {', a2)
  if (a1 < 0 || b1 < 0 || a2 < 0 || b2 < 0) return [...p, '(c) não achei as duas mensagens de cena do analyze-idea']
  const msg = (tpl, falas, pc) => new Function('sceneList', 'estrelaNoPedido', 'ESTRELA_REAL_PEOPLE_EXCEPTION', 'personagemContinuo', 'REGRA_UM_LUGAR', 'ultimoPlanoLigado', 'REGRA_ULTIMO_PLANO', 'return `' + tpl + '`')(falas.map((t, i) => ({ scene_number: i + 1, typeLabel: 'SCENE', duration_seconds: 4, voiceover: t })), false, '', pc, P.REGRA_UM_LUGAR, false, '') /* KINEO-ULTIMO-PLANO-ACONTECE-1111: a linha do último plano, desligada */
  for (const [nome, tpl] of [['roteiro marcado', an.slice(a1 + ini.length, b1)], ['roteiro colado', an.slice(a2 + ini.length, b2)]]) {
    no(!msg(tpl, BONECO, P.personagemContinuo).includes(P.REGRA_UM_LUGAR), `(c) ${nome}: o boneco não ganhou a linha`)
    // a mensagem de antes = a mesma mensagem sem a expressão da linha (o texto anterior a KINEO-LUGAR-UNICO-PLANEJADOR-1111)
    const antes = tpl.replace(/\$\{[^${}]*\?\s*`\s*\$\{REGRA_UM_LUGAR\}`\s*:\s*''\}/u, '')
    for (const [doc, falas] of [['Veteranos', VET], ['Pompeia', POMPEIA]]) no(msg(tpl, falas, P.personagemContinuo) !== msg(antes, falas, () => null), `(c) ${nome}: a mensagem dos ${doc} mudou`)
  }
  no(!an.includes("import { personagemContinuo, REGRA_UM_LUGAR } from '@/lib/cinematic/personagemContinuo'"), '(c) o analyze-idea não importa o detector')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (só o boneco ganha a linha do lugar único; documentários byte a byte; sem exemplo de lugar)')
const pc = read(PC), an = read(AN)
const MUT = [
  ['M5 "men" volta a contar como "man"', { [PC]: pc.replace("const CABECA = '(?:stick (?:man|figure)|man|woman|", "const CABECA = '(?:stick (?:man|figure)|man|men|woman|").replace("const SINGULAR: Record<string, string> = { puppies: 'puppy', kittens: 'kitten' }", "const SINGULAR: Record<string, string> = { men: 'man', puppies: 'puppy', kittens: 'kitten' }") }],
  ['M6 "kids" volta a contar', { [PC]: pc.replace("|kid|child|", "|kid|kids|child|") }],
  ['M1 basta uma fala', { [PC]: pc.replace('return melhor && melhor[1] >= 2 && melhor[1] * 2 >= linhas.length ? melhor[0] : null', 'return melhor ? melhor[0] : null') }],
  ['M2 a regra sempre ligada no roteiro marcado', { [AN]: an.replace("${personagemContinuo(sceneList.map((s) => s.voiceover)) ?", '${true ?') }],
  ['M3 o exemplo "sunny park" volta', { [PC]: pc.replace('names it in words at the start ("In the same <that place>, …" — the place this story needs, never a stock example)', 'names it in words (e.g. "in the same sunny park")') }],
  ['M4 o roteiro colado sem a linha', { [AN]: (() => { const i = an.lastIndexOf("${personagemContinuo(sceneList.map((s) => s.voiceover)) ?"); const j = an.indexOf(": ''}", i) + 5; return an.slice(0, i) + an.slice(j) })() }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
