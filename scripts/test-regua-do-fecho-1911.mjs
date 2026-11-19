// KINEO-REGUA-DO-FECHO-1911 [CEO 19/11] — a régua do encurtador de fala aprovava fecho estragado (número perdido, negação invertida, revelação
// perdida). Node puro, sem rede: executa a lib REAL (lib/kling4TrialEncaixe.ts).
//   R · os 21 encurtamentos do revisor (12 falas reais de filmes grátis): a régua de hoje aprova 17; a nova reprova todo fecho estragado.
//   M · os 13 encurtamentos REAIS aprovados em 14 dias (06–18/11, cinematic_submission_claim com narration_refit): a régua sozinha reprovaria 9
//       (o modelo apara o fecho); com o fecho fora do modelo, os 13 cabem no orçamento. Só o fecho e o fim encurtado entram aqui (nada mais do cliente).
//   P · o encaixe com o interruptor: o fecho não vai ao modelo, volta colado intacto; desligado = o de hoje.
// Mutantes no fim.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const LIB = 'lib/kling4TrialEncaixe.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const sent = (t) => t.trim().split(/(?<=[.!?…])\s+/u).filter(Boolean)
const cenas = (t) => { const s = sent(t); const n = s.length; const a = Math.ceil(n / 3), b = Math.ceil((n - a) / 2); return [s.slice(0, a).join(' '), s.slice(a, a + b).join(' '), s.slice(a + b).join(' ')].filter(Boolean) }

// R · o corpus do revisor: [fala real, [descrição, depois por cena, a nova régua aprova?]]
const C = [
  ['England, 1612. In the shadow of Pendle Hill, two rival families accused each other of witchcraft. At the trial, a nine-year-old girl stood on a table and testified against her own mother. By the end of that summer, ten people were hanged.', [
    ['perde o número do fecho (ten, por extenso)', ['England, 1612. Two rival families accused each other of witchcraft.', 'At the trial, a girl testified against her own mother.', 'By the end of that summer, people were hanged.'], false],
    ['perde o fecho inteiro', ['England, 1612. Two rival families accused each other of witchcraft.', 'At the trial, a girl testified against her own mother.', 'By the end of that summer.'], false],
    ['perde nome (Pendle Hill) e a mãe, fecho inteiro', ['England, 1612. Two rival families accused each other of witchcraft.', 'At the trial, a nine-year-old girl stood on a table.', 'By the end of that summer, ten people were hanged.'], true]]],
  ['In August 1977, a radio telescope in Ohio picked up a signal from deep space. It lasted seventy-two seconds and was far stronger than anything around it. An astronomer circled the numbers and wrote one word: Wow. Nobody has ever heard it again.', [
    ['perde "Wow" e o fecho vira o inverso', ['In August 1977, a telescope in Ohio picked up a signal.', 'It lasted seventy-two seconds.', 'An astronomer circled the numbers. Somebody has heard it again.'], false],
    ['perde o fecho (só "heard it")', ['In August 1977, a telescope in Ohio picked up a signal.', 'It lasted seventy-two seconds.', 'An astronomer wrote one word: Wow. Nobody heard it.'], false]]],
  ['Some planes take off heavier than they are allowed to land. If something goes wrong right after takeoff, the pilots open valves on the wings and dump tons of fuel into the sky to lose weight fast. Most of it evaporates long before reaching the ground.', [
    ['inverte o fecho', ['Some planes take off heavier than they can land.', 'If something goes wrong, pilots dump tons of fuel into the sky.', 'Most of it ends up reaching the ground.'], false],
    ['fecho trocado por negação "never evaporates"', ['Some planes take off heavier than they can land.', 'If something goes wrong, pilots dump fuel.', 'Most of it never evaporates before reaching the ground.'], false]]],
  ['A single mysterious door conceals Monaco\'s intriguing and prosperous path to immense wealth. Prince Rainier\'s visionary leadership transformed Monaco into a thriving destination over fifty-five years ago. As of today, Monaco\'s astonishing GDP per capita surpasses an impressive $190,000 annually.', [
    ['perde o número do fecho ($190,000)', ['A single door conceals Monaco\'s path to wealth.', 'Prince Rainier transformed Monaco over fifty-five years ago.', 'Today, Monaco\'s GDP per capita surpasses an impressive amount.'], false],
    // aparou adjetivos do fecho: a nova régua reprova (nunca acontece com o interruptor: o fecho não vai ao modelo)
    ['perde Rainier e o número do meio, apara o fecho', ['A single door conceals Monaco\'s path to wealth.', 'Visionary leadership transformed Monaco.', 'Today, Monaco\'s GDP per capita surpasses $190,000 annually.'], false]]],
  ['In 1912, a book dealer found a strange manuscript in an Italian villa. It is six hundred years old, full of plants nobody can identify, written in an alphabet no one has ever seen. Codebreakers from two world wars failed. Not one word has been read.', [
    ['fecho invertido: "One word has been read"', ['In 1912, a dealer found a manuscript in an Italian villa.', 'It is six hundred years old, in an alphabet no one has seen.', 'Codebreakers from two world wars failed. One word has been read.'], false],
    ['perde 1912 (não é o fecho)', ['A dealer found a manuscript in an Italian villa.', 'It is six hundred years old, in an alphabet no one has seen.', 'Codebreakers failed. Not one word has been read.'], true]]],
  ['In 1816, a doctor in Paris rolled some paper into a tube. He rested one end against his patient\'s chest and listened through the other. Her heartbeat came through more clearly than when he listened directly. That paper tube was the beginning of the stethoscope.', [
    ['perde "stethoscope" (a revelação)', ['In 1816, a doctor in Paris rolled paper into a tube.', 'He rested one end against a patient\'s chest and listened.', 'Her heartbeat came through clearly. That paper tube was the beginning.'], false],
    ['encurtamento bom', ['In 1816, a doctor in Paris rolled paper into a tube.', 'He rested it against his patient\'s chest and listened.', 'That paper tube was the beginning of the stethoscope.'], true]]],
  ['Kentucky, August 1955. A farm family drove to the police station in panic, saying small glowing creatures had surrounded their house. They said they fired at them for hours. Officers searched the farm that night and found bullet holes, but no creatures.', [
    ['fecho invertido: "and creatures"', ['Kentucky, August 1955. A farm family said glowing creatures surrounded their house.', 'They fired at them for hours.', 'Officers searched the farm and found bullet holes and creatures.'], false],
    ['perde "but no creatures"', ['Kentucky, August 1955. A farm family said glowing creatures surrounded their house.', 'They fired at them for hours.', 'Officers searched the farm that night and found bullet holes.'], false]]],
  ['In 1934, Switzerland made it a crime for bankers to reveal who their clients were. Breaking that secret could mean prison. For decades, money from all over the world poured into a small neutral country in the Alps that stayed out of wars.', [
    // o fecho perdeu "that stayed out of wars": aparar o fecho reprova (com o interruptor o fecho nem vai ao modelo)
    ['perde 1934 e apara o fecho', ['Switzerland made it a crime for bankers to reveal clients.', 'Breaking that secret could mean prison.', 'For decades, money poured into a small neutral country in the Alps.'], false]]],
  ['What if you could make a clock run faster just by lifting it? In 2010, researchers raised an atomic clock by about a foot. It gained time compared with one below it. The difference was tiny, but gravity had changed how fast time passed.', [
    ['perde "gravity" (a causa)', ['What if you could make a clock run faster by lifting it?', 'In 2010, researchers raised an atomic clock by a foot.', 'It gained time. The difference was tiny, but time passed fast.'], false]]],
  ['At the 1935 Lindbergh trial, a wooden ladder helped link a suspect to the kidnapping. A wood specialist traced one of its rails to a floorboard in the suspect\'s attic. The grain and nail holes lined up. The ladder had brought the investigation back indoors.', [
    ['perde Lindbergh (nome), fecho inteiro', ['At the 1935 trial, a wooden ladder linked a suspect to the kidnapping.', 'A specialist traced a rail to a floorboard in the suspect\'s attic.', 'The ladder had brought the investigation back indoors.'], true]]],
  ['Каждый новостной сюжет скрывает нечто большее, чем кажется. Вначале новости транслировались только по радио, а не по ТВ. Первый печатный выпуск новостей появился в 1605 году. Сегодня... новостные сюжеты объединяют ТВ, интернет и соцсети в мультимедийное искусство.', [
    ['ru: perde 1605 (meio), fecho inteiro', ['Каждый новостной сюжет скрывает нечто большее.', 'Вначале новости транслировались только по радио.', 'Сегодня новостные сюжеты объединяют ТВ, интернет и соцсети в мультимедийное искусство.'], true]]],
  ['Ein Junge kauft einen hinübergekommenden Zoo in seiner Stadt für nur 1000 Euro. Als er sieht wie kaputt alles ist will er aufgeben. Kurz bevor er wieder geht hört er etwas aus einer Holzkiste. Ein Mauzen. Er öffnet die Kiste und …… dann kommt Teil 2', [
    // o original já termina sem ponto; a régua de sempre reprova frase aberta (fica como hoje)
    ['de: original sem ponto final (frase aberta)', ['Ein Junge kauft einen Zoo für nur 1000 Euro.', 'Er will aufgeben.', 'Er öffnet die Kiste und dann kommt Teil 2'], false],
    ['de: perde "Teil 2"', ['Ein Junge kauft einen Zoo für nur 1000 Euro.', 'Er will aufgeben.', 'Er hört etwas aus einer Holzkiste.'], false]]],
]
// M · os 13 reais: [geração, língua, o fecho de antes, o fim encurtado que foi ao ar, a régua nova aprova?]
const REAIS = [
  ['80d9a38d', 'pt', 'Qual você escolheria? Comente!', 'Qual escolheria? Comente!', true],
  ['378998f0', 'pt', 'e juntos descobrem que compartilhar é mais divertido!', 'e descobrem que compartilhar é mais divertido!', false],
  ['c827ec0d', 'ur', "اسکرین پر پیغام: 'تمہارے پاس ایک موقع ہے۔'", "پیغام: 'تمہارے پاس ایک موقع ہے۔'", false],
  ['parked-4a18', 'en', 'Experts now believe violent weather caused disorientation, leaving the mystery unsolved.', 'Experts believe weather caused disorientation, leaving the mystery unsolved.', false],
  ['32cbb2d4', 'es', 'Entonces, giró una llave en mi puerta.', 'Entonces, giró una llave.', false],
  ['01f42846', 'pt', '90% do nosso oceano ainda é inexplorado!', '90% do oceano é inexplorado!', false],
  ['a9e9e20f', 'en', "Romans 1:20 shows through creation, God's attributes are seen.", "Romans 1:20 shows through creation, God's attributes are seen.", true],
  ['373b8121', 'en', "Discoveries suggest ancient civilizations had advanced knowledge, fueling Atlantis's mystery.", 'Discoveries suggest ancient civilizations had advanced knowledge.', false],
  ['0ddc05c1', 'pt', 'Prepare-se para explorar este novo mundo de possibilidades e aventuras!', 'Prepare-se para explorar novas possibilidades e aventuras!', false],
  ['28f65d63', 'en', 'The molar is flawlessly restored, showcasing luxury and precision in dental care.', 'The molar is restored, showcasing luxury and precision.', false],
  ['224c4659', 'en', "The next morning, nobody could see the boy's shadow... it had vanished.", "The next morning, nobody could see the boy's shadow... it vanished.", false],
  ['44d02f20', 'en', 'Most experts believe electromagnetic anomalies disrupted navigation. The mystery endures.', 'Most experts believe electromagnetic anomalies disrupted navigation. The mystery endures.', true],
  ['aa41c700', 'en', 'It ends with an epic... jump over a moving train! The most insane chase yet!', 'It ends with an epic jump over a moving train! The most insane chase yet!', true],
]

async function prova(over = {}) {
  const p = []
  const no = (ruim, msg) => { if (ruim) p.push(msg) }
  let E
  try { E = createOfflineLoader({ source: (rel, src) => over[rel] ?? src })('@/' + LIB) } catch (e) { return [`lib não carrega: ${e.message}`] }
  const rota = over[ROTA] ?? read(ROTA)
  no(E.K4_REGUA_DO_FECHO_1911 !== 'off', "A0 nasce 'off' (a main byte a byte); 'public' só com revisor independente + prova paga + sim do dono")
  no(E.reguaDoFechoLigada('off', true) || E.reguaDoFechoLigada('internal', false) || !E.reguaDoFechoLigada('internal', true) || !E.reguaDoFechoLigada('public', false), 'A1 off | internal (só a conta do ensaio) | public')
  no(!rota.includes('reguaDoFecho: reguaDoFechoLigada(K4_REGUA_DO_FECHO_1911, isDryRunAccount(user.email)),'), 'A2 a rota liga pela régua EXATA do ensaio (isDryRunAccount; e-mail parecido não abre)')

  // R · o corpus
  let hoje = 0
  for (const [texto, casos] of C) {
    const antes = cenas(texto)
    for (const [desc, depois, espera] of casos) {
      if (E.encaixeServe(antes, depois, 'en')) hoje++
      const nova = E.porQueOFechoNaoServe(antes, depois, 'en')
      no((nova === null) !== espera, `R ${desc}: a nova régua ${nova === null ? 'aprova' : `reprova (${nova})`}, devia ${espera ? 'aprovar' : 'reprovar'}`)
      if (nova === null) no(!E.encaixeServe(antes, depois, 'en'), `R ${desc}: a nova nunca aprova o que a de sempre reprova`)
    }
  }
  no(hoje !== 17, `R0 o defeito medido: a régua de hoje aprova 17 dos 21 (${hoje})`)
  { const antes = cenas(C[9][0]), depois = ['At the 1935 trial, a ladder linked a suspect to the kidnapping.', 'A specialist traced a rail to the attic.', 'The investigation had brought the ladder back indoors.']
    no(!E.encaixeServe(antes, depois, 'en') || E.porQueOFechoNaoServe(antes, depois, 'en') !== 'fecho_alterado', 'R1 as mesmas palavras do fecho em outra ordem mudam o sentido: hoje passa, a nova reprova') }
  // M · os 13 reais
  const reprovaria = REAIS.filter(([g, l, f, d, espera]) => { const ok = E.fechoPreservado(['x. ' + f], ['x. ' + d]); no(ok !== espera, `M ${g}: o fecho ${ok ? 'passa' : 'não passa'}`); return !ok }).length
  no(reprovaria !== 9, `M0 nos 13 reais de 14 dias, a régua sozinha reprovaria 9 (${reprovaria}): por isso o fecho não vai ao modelo`)

  // P · o encaixe
  const fala0 = { seconds: 17.2, cabe: false, maxSeconds: 15.5, reason: 'narration_over_kling4_15s' }
  const medir = async () => ({ seconds: 14.1, cabe: true, maxSeconds: 15.5, reason: 'ok' })
  const falas = cenas(C[0][0]) // Pendle: o fecho "By the end of that summer, ten people were hanged."
  const fecho = 'By the end of that summer, ten people were hanged.'
  // um "modelo" que apaga a 2ª metade de cada cena e, se receber o fecho, perde o "ten"
  const modelo = (chamadas) => async (fs, alvo) => { chamadas.push({ fs: [...fs], alvo }); return fs.map((f) => { if (f.includes('ten people')) return f.replace('ten ', ''); const w = f.split(' '); return w.slice(0, Math.max(3, Math.ceil(w.length * 0.7))).join(' ').replace(/[,;:.!?]*$/u, '.') }) }
  let alvoDeHoje = null
  { const ch = [], motivos = []
    const r = await E.encaixarFalaNoKling4({ falas, fala: fala0, language: 'en', medir, encurtar: modelo(ch), aoFalhar: (m) => motivos.push(m) })
    alvoDeHoje = ch[0]?.alvo ?? null
    no(!r || ch[0]?.fs.length !== 3 || !ch[0].fs[2].includes(fecho) || r.falas[2].includes('ten people'), `P1 desligado = o de hoje: o fecho vai ao modelo e o fecho estragado passa (${JSON.stringify(r?.falas)} ${motivos})`) }
  { const ch = [], motivos = []
    const r = await E.encaixarFalaNoKling4({ falas, fala: fala0, language: 'en', medir, encurtar: modelo(ch), aoFalhar: (m) => motivos.push(m), reguaDoFecho: true })
    no(!r || ch[0]?.fs.some((f) => f.includes('ten people')) || typeof alvoDeHoje !== 'number' || ch[0]?.alvo !== alvoDeHoje - 10, `P2 ligado: o fecho NÃO vai ao modelo e o orçamento desconta as 10 palavras dele (${JSON.stringify(ch[0])} ${motivos})`)
    no(!r?.falas[2].endsWith(fecho) || !E.fechoPreservado(falas, r.falas), `P3 ligado: o fecho volta colado, palavra por palavra (${r?.falas[2]})`) }
  { const ch = []
    const tres = ['A dealer found a manuscript in an Italian villa, far from any city.', 'It is six hundred years old, written in an alphabet no one has ever seen.', 'Not one word has been read.']
    const r = await E.encaixarFalaNoKling4({ falas: tres, fala: fala0, language: 'en', medir, encurtar: modelo(ch), reguaDoFecho: true })
    no(ch[0]?.fs.length !== 2 || r?.falas.length !== 3 || r?.falas[2] !== 'Not one word has been read.', `P4 última cena só com o fecho: o modelo recebe as outras 2, o fecho volta como a 3ª (${JSON.stringify(r?.falas)})`) }
  { const ch = [], duas = ['A farm family drove to the police station in a panic that night.', 'They said they fired at small glowing creatures for hours.', 'Officers searched the whole farm carefully until dawn. They found bullet holes, but no creatures.']
    const r = await E.encaixarFalaNoKling4({ falas: duas, fala: fala0, language: 'en', medir, encurtar: modelo(ch), reguaDoFecho: true })
    no(ch[0]?.fs[2] !== 'Officers searched the whole farm carefully until dawn.' || !r?.falas[2].endsWith(' They found bullet holes, but no creatures.') || !r.falas[2].startsWith('Officers searched'), `P8 última cena com duas frases: o modelo recebe só a 1ª, o fecho volta colado depois dela (${JSON.stringify(r?.falas)})`) }
  { const motivos = []
    const r = await E.encaixarFalaNoKling4({ falas, fala: fala0, language: 'en', medir, encurtar: async (fs) => fs.slice(1), aoFalhar: (m) => motivos.push(m), reguaDoFecho: true })
    no(r !== null || motivos[0] !== 'encurtar_sem_texto', `P5 o modelo devolve outra contagem de cenas: nada é colado, desiste como hoje (${motivos})`) }
  { const motivos = [], longo = ['Short hook here.', 'A middle line here.', 'And then, after all those long years of waiting in the cold dark harbour of the old northern town, the sailor finally came home to his family.']
    const r = await E.encaixarFalaNoKling4({ falas: longo, fala: { ...fala0, seconds: 40 }, language: 'en', medir, encurtar: modelo([]), aoFalhar: (m) => motivos.push(m), reguaDoFecho: true })
    no(r !== null || motivos[0] !== 'fecho_nao_cabe', `P6 o fecho sozinho não cabe no orçamento: desiste com 'fecho_nao_cabe' (${motivos})`) }
  { const motivos = []
    const r = await E.encaixarFalaNoKling4({ falas: ['Nobody has ever heard it again.'], fala: fala0, language: 'en', medir, encurtar: async () => ['Somebody has heard it again.'], aoFalhar: (m) => motivos.push(m), reguaDoFecho: true })
    no(r !== null || motivos[0] !== 'fecho_alterado', `P7 sem como separar o fecho (cena única), a régua ainda reprova o fecho invertido (${motivos})`) }
  return p
}

const MUT = [
  ['régua pública', LIB, (s) => s.replace("export const K4_REGUA_DO_FECHO_1911: ModoReguaDoFecho1911 = 'off'", "export const K4_REGUA_DO_FECHO_1911: ModoReguaDoFecho1911 = 'public'")],
  ['internal para todos', LIB, (s) => s.replace("modo === 'public' || (modo === 'internal' && contaDoEnsaio)", "modo !== 'off'")],
  ['rota: para todos', ROTA, (s) => s.replace('reguaDoFecho: reguaDoFechoLigada(K4_REGUA_DO_FECHO_1911, isDryRunAccount(user.email)),', 'reguaDoFecho: true,')],
  ['rota: régua larga da casa', ROTA, (s) => s.replace('reguaDoFecho: reguaDoFechoLigada(K4_REGUA_DO_FECHO_1911, isDryRunAccount(user.email)),', 'reguaDoFecho: reguaDoFechoLigada(K4_REGUA_DO_FECHO_1911, isInternalEmail(user.email)),')],
  ['fecho sempre preservado', LIB, (s) => s.replace('  for (let i = 0; i + f.length <= d.length; i++) if (f.every((w, k) => d[i + k] === w)) return true\n  return false', '  return true')],
  ['fecho fora de ordem vale', LIB, (s) => s.replace('  for (let i = 0; i + f.length <= d.length; i++) if (f.every((w, k) => d[i + k] === w)) return true\n  return false', '  return f.every((w) => d.includes(w))')],
  ['fecho só pela metade', LIB, (s) => s.replace('  const f = palavrasDe(fechoDaFala(antes))\n', '  const f = palavrasDe(fechoDaFala(antes)).slice(-3)\n')],
  ['fecho do depois', LIB, (s) => s.replace('export function fechoDaFala(falas: readonly string[]): string { return ultimaFrase(String(falas[falas.length - 1] ?? \'\')) }', 'export function fechoDaFala(falas: readonly string[]): string { return ultimaFrase(String(falas[falas.length - 1] ?? \'\')).split(\' \').slice(-1).join(\' \') }')],
  ['régua do fecho fora do laço', LIB, (s) => s.replace("      if (a.reguaDoFecho && !fechoPreservado(atuais, novas)) { if (insiste) continue; return falha('fecho_alterado', { rodada, alvo }) }", '')],
  ['o fecho vai ao modelo', LIB, (s) => s.replace('      const sep1911 = a.reguaDoFecho ? separarOFecho(atuais, fecho1911) : null', '      const sep1911 = null as ReturnType<typeof separarOFecho>')],
  ['orçamento cheio', LIB, (s) => s.replace('      const alvo1911 = sep1911 ? alvo - narrationWordCount(fecho1911, a.language) : alvo', '      const alvo1911 = alvo')],
  ['fecho não volta', LIB, (s) => s.replace("resto ? [...saida.slice(0, -1), `${String(saida[saida.length - 1]).trim()} ${fecho}`] : [...saida, fecho]", 'resto ? [...saida] : [...saida, fecho]')],
  ['cola com outra contagem', LIB, (s) => s.replace('(saida.length !== entrada.length ? null : resto ?', '(resto ?')],
  ['sem o piso do fecho', LIB, (s) => s.replace("      if (sep1911 && alvo1911 < sep1911.entrada.length * MIN_PALAVRAS_POR_CENA) return falha('fecho_nao_cabe', { rodada, alvo }) // KINEO-REGUA-DO-FECHO-1911\n", '')],
]
const p0 = await prova()
if (p0.length) { console.error('FAIL test-regua-do-fecho-1911:\n  ' + p0.join('\n  ')); process.exit(1) }
const vivos = []
for (const [nome, arq, f] of MUT) { const o = read(arq), m = f(o); if (m === o) { vivos.push(`${nome} (não pegou a fonte)`); continue } if (!(await prova({ [arq]: m })).length) vivos.push(nome) }
if (vivos.length) { console.error('FAIL test-regua-do-fecho-1911: mutantes vivos:\n  ' + vivos.join('\n  ')); process.exit(1) }
console.log(`PASS test-regua-do-fecho-1911 (21 casos do revisor: hoje aprova 17, a nova só os fechos inteiros; 13 reais: a régua sozinha reprovaria 9, o fecho fora do modelo resolve; ${MUT.length} mutantes mortos)`)
