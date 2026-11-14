// KINEO-QUANDO-NAO-E-GALINHA-0911 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião sem rede e sem custo.
// Caso real: jardsono10239 (BR, 07/11 14:41 UTC, 1º filme, grátis 15 s, generation 13a4a7f6): "Era 3 da manhã quando Lucas recebeu uma
// ligação misteriosa." — em inglês "It was 3 a.m. when Lucas received...": a janela de espécie de lib/cinematic/elencoEpoca.ts (tipoDe)
// não tinha fronteira antes da espécie, e "w-HEN Lucas" casou com "hen". O filme abriu com uma galinha na janela de chuva.
// Prova executando o código real: o texto do caso sai humano; palavra comum que TERMINA em nome de bicho (when/then/combat/acrobat/
// howl/bowl/Moscow/himself/kitchen) não vira espécie; e todo o resto — bicho de verdade, bicho composto (bullfrog, jackrabbit, firebird,
// starfish, wombat) — sai IGUAL à base, palavra por palavra (volta 3: a lista fixa de compostos da volta 2 transformava bicho em gente).
// Rodar: node scripts/test-quando-nao-e-galinha-0911.mjs
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semQuandoNaoEGalinha0911, deltaQuandoNaoEGalinha0911Exato, QUANDO_NAO_E_GALINHA_0911 } from './test-support/desfaz-quando-nao-e-galinha-0911.mjs'
import { semNomeSemCorpo1111 } from './test-support/desfaz-nome-sem-corpo-1111.mjs' // KINEO-NOME-SEM-CORPO-1111
import { semNomeNaoCruzaPonto1111 } from './test-support/desfaz-nome-nao-cruza-ponto-1111.mjs' // KINEO-NOME-NAO-CRUZA-PONTO-1111
import { semEspecieNaoEGente1111 } from './test-support/desfaz-especie-nao-e-gente-1111.mjs' // KINEO-ESPECIE-NAO-E-GENTE-1111
import { semElencoProvaDeGente1211 } from './test-support/desfaz-elenco-prova-de-gente-1211.mjs' // KINEO-ELENCO-PROVA-DE-GENTE-1211
import { semIdeiaFichaAssunto1211 } from './test-support/desfaz-ideia-ficha-assunto-1211.mjs' // KINEO-IDEIA-FICHA-ASSUNTO-1211
import { semHistoriaReal1411 } from './test-support/desfaz-historia-real-1411.mjs' // KINEO-HISTORIA-REAL-1411
import { semBichoComNome1411 } from './test-support/desfaz-bicho-com-nome-1411.mjs' // KINEO-BICHO-COM-NOME-1411
import { semFichaDoAutorManda1411 } from './test-support/desfaz-ficha-do-autor-manda-1411.mjs' // KINEO-FICHA-DO-AUTOR-MANDA-1411
import { semFichaDoAutorMandaV21411 } from './test-support/desfaz-ficha-do-autor-manda-v2-1411.mjs' // KINEO-FICHA-DO-AUTOR-MANDA-1411 v2
import { semHistoriaRealAll1411 } from './test-support/desfaz-historia-real-all-1411.mjs' // KINEO-HISTORIA-REAL-1411 'all'

let ok = 0
let falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const EPOCA = 'lib/cinematic/elencoEpoca.ts'
const raiz = join(import.meta.dirname, '..')
const BASE_FONTE = execFileSync('git', ['show', `${QUANDO_NAO_E_GALINHA_0911.base}:${EPOCA}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 })
const carrega = (mutar = null) => createOfflineLoader({ source: (rel, t) => (mutar && rel === EPOCA ? mutar(t) : t) })(EPOCA)
const carregaBase = () => carrega(() => BASE_FONTE)

// o texto em inglês que o elenco lê (textoInglesDe → personagensNomeados), o do caso real
const LUCAS = 'HOOK (0-2s): [Pexels: dark rainy window] "It was 3 a.m. when Lucas received a mysterious call."\n\nMICRO REWARD 1: [Pexels: young man phone screen] "An unknown number.\n\nMICRO REWARD 2: [Pexels: dimly lit room] Do not open the door!"\n\nPAYOFF: [Pexels: phone ringing ominous] "The next day, three knocks on the door... and it was himself. Too late."'
const LUCAS_PT = 'HOOK (0-2s): [Pexels: dark rainy window] "Era 3 da manhã quando Lucas recebeu uma ligação misteriosa."\n\nMICRO REWARD 1: [Pexels: young man phone screen] "Um número desconhecido.\n\nMICRO REWARD 2: [Pexels: dimly lit room] Não abra a porta!"\n\nPAYOFF: [Pexels: phone ringing ominous] "No dia seguinte, três batidas na porta... e era ele mesmo. Tarde demais."'

const quem = (ep, texto, nome) => ep.personagensNomeados(texto).find((p) => p.nome === nome) ?? null
const sai = (ep, texto, nome) => { const p = quem(ep, texto, nome); return p ? `${p.tipo}: ${p.descricao}` : '(ausente)' }

// negativos: palavra comum que termina em nome de bicho/criatura colada ao nome → gente
const NEGATIVOS = [
  [LUCAS, 'Lucas', 'caso real (when Lucas → hen)'],
  ['It was 3 a.m.\nwhen Lucas received a mysterious call. Lucas picked up the phone.', 'Lucas', 'caso real com quebra de linha'],
  ['It was 3 a.m. — when Lucas received a mysterious call — Lucas’s hands shook.', 'Lucas', 'caso real com travessão e possessivo curvo'],
  ['It was 3 a.m. when Lucas received a mysterious call. Lucas picked up the phone.', 'Lucas', 'caso real + Lucas picked up'],
  ['It was late when Maria heard the knock. Maria opened the door slowly.', 'Maria', 'when Maria (hen)'],
  ['He stopped, then Maria opened the door. Maria smiled at him.', 'Maria', 'then Maria (hen)'],
  ['IT WAS 3 A.M. WHEN Lucas received a call. Lucas answered it.', 'Lucas', 'CAIXA ALTA (WHEN Lucas)'],
  ['After the long combat Joana walked home alone. Joana cried.', 'Joana', 'combat Joana (bat)'],
  ['Combat veteran Mark came home. Mark slept for days.', 'Mark', 'Combat veteran Mark'],
  ['The famous acrobat Pedro jumped from the trapeze. Pedro landed safely.', 'Pedro', 'acrobat Pedro (bat)'],
  ['The acrobat Luna jumped from the trapeze. Luna landed safely.', 'Luna', 'The acrobat Luna (bat)'],
  ['They heard a howl Rafael could not explain. Rafael ran into the woods.', 'Rafael', 'howl Rafael (owl)'],
  ['She dropped the bowl Marta had filled. Marta screamed.', 'Marta', 'bowl Marta (owl)'],
  ['She dropped the bowl Kate had filled. Then a howl Kate could not explain. Kate ran.', 'Kate', 'bowl/howl Kate (owl)'],
  ['In Moscow Ivan waited for the last train. Ivan was cold.', 'Ivan', 'Moscow Ivan (cow)'],
  ['He looked at himself Tomás thought, and smiled. Tomás opened the box.', 'Tomás', 'himself Tomás (elf), nome com acento'],
  ['He bought it himself Tom said. The shelf Tom built fell down. Tom laughed.', 'Tom', 'himself/shelf Tom (elf)'],
  ['It was midnight when Ágata received the letter. Ágata read it twice.', 'Ágata', 'when Ágata (hen), nome com acento no início'],
  ['Era meia-noite quando Lucas recebeu a carta. Lucas leu duas vezes.', 'Lucas', 'português sem tradução'],
  ['Era medianoche cuando Lucas recibió la carta. Lucas la leyó dos veces.', 'Lucas', 'espanhol sem tradução'],
  // histórias reais com "Then X"/"When X" que viravam galinha
  ['The oxygen tank exploded. When Jim Lovell heard the bang, he radioed Houston. Lovell stayed calm.', 'Lovell', 'Apollo 13: When Jim Lovell'],
  ['The oxygen tank exploded. Then Lovell radioed Houston. Lovell stayed calm.', 'Lovell', 'Apollo 13: Then Lovell'],
  ['The ship was huge. Then Smith ordered full speed. Smith never came back.', 'Smith', 'Titanic: Then Smith'],
  ['The crowd cheered when Kennedy waved. Kennedy smiled at them.', 'Kennedy', 'When Kennedy waved'],
  ['The sky exploded over Siberia. Then Semenov was thrown from his chair. Semenov survived.', 'Semenov', 'Tunguska: Then Semenov'],
  ['Nobody believed it when Warren bought Coca-Cola. Warren held the stock for decades.', 'Warren', 'When Warren bought'],
  ['Imagine waking up when Maria knocks on the door. Maria is smiling.', 'Maria', 'Imagine… when Maria'],
  ['The city of Buffalo Sam called home was frozen. Sam shoveled snow.', 'Sam', 'Buffalo Sam'],
  ['In Bat Yam Noa opened a bakery. Noa baked all night.', 'Noa', 'Bat Yam Noa'],
  ['The old Beetle Hans drove was rusty. Hans fixed it.', 'Hans', 'Beetle Hans'],
]
// volta 2 + 3 (revisor 09/11): palavra comum × nome × molde — todas viravam bicho na base, todas gente agora
const COMUNS = ['when', 'then', 'WHEN', 'Then', 'combat', 'acrobat', 'howl', 'bowl', 'growl', 'himself', 'herself', 'itself', 'myself', 'yourself', 'shelf', 'scat', 'hotdog', 'underdog', 'snapdragon', 'cowl', 'scowl', 'prowl', 'jowl', 'kitchen', 'Moscow', 'selfish', 'potter', 'million', 'scarecrow', 'escrow', 'scapegoat', 'mohawk', 'stroll', 'guacamole']
const NOMES_N = ['Lucas', 'Maria', 'Pedro', 'Ana', 'Tom', 'Kate', 'Mark', 'Luna', 'Joana', 'Ivan', 'Tomás', 'Ágata']
const MOLDES_N = [
  (w, n) => `It was late ${w} ${n} received a call. ${n} answered.`,
  (w, n) => `Nobody knew ${w} ${n} came back. ${n} smiled.`,
  (w, n) => `The ${w} ${n} saw was strange. ${n} walked away.`,
]
for (const w of COMUNS) for (const n of NOMES_N) for (const [i, m] of MOLDES_N.entries()) NEGATIVOS.push([m(w, n), n, `${w} ${n} molde ${i + 1}`])

// positivos: bicho/criatura de verdade continua bicho/criatura, com a espécie certa
const POSITIVOS = [
  ['Once upon a time, the hen Clara lived on a farm. Clara laid a golden egg.', 'Clara', 'hen', 'the hen Clara'],
  ['A fox named Rusty lived in the forest. Rusty loved berries.', 'Rusty', 'fox', 'a fox named Rusty'],
  ['An owl called Hoot watched the moon. Hoot sang all night.', 'Hoot', 'owl', 'an owl called Hoot'],
  ['The little dragon Mishu flew over the mountains. Mishu was happy.', 'Mishu', 'dragon', 'the little dragon Mishu flew'],
  ['Leo the lion woke up hungry. Leo roared at the sun.', 'Leo', 'lion', 'Leo the lion'],
  ['The bear Bruno climbed the tree. Bruno ate honey.', 'Bruno', 'bear', 'the bear Bruno'],
  ['The bat Nico flew out of the cave. Nico was hungry.', 'Nico', 'bat', 'the bat Nico'],
  ['The cow Mimosa walked to the river. Mimosa drank water.', 'Mimosa', 'cow', 'the cow Mimosa'],
  ['The elf Tilo opened the door. Tilo laughed.', 'Tilo', 'elf', 'the elf Tilo'],
  ['Two dragons named Ember lived in the castle. Ember breathed fire.', 'Ember', 'dragon', 'plural: dragons named Ember'],
  ['THE HEN Clara lived on a farm. Clara laid an egg.', 'Clara', 'hen', 'CAIXA ALTA: THE HEN Clara'],
  ['The fox Ângelo ran across the field. Ângelo hid in the grass.', 'Ângelo', 'fox', 'the fox Ângelo (nome com acento)'],
  ['Dino woke up in the jungle. Dino ran to the river.', 'Dino', 'dinosaur', 'Dino (pela forma do nome)'],
  // volta 3 (revisor 09/11): histórias com bicho composto que a volta 2 transformava em gente
  ['The bullfrog Jeremy croaked all night. Jeremy jumped into the pond.', 'Jeremy', 'frog', 'the bullfrog Jeremy'],
  ['The jackrabbit Jack raced across the desert. Jack won.', 'Jack', 'rabbit', 'the jackrabbit Jack'],
  ['The pussycat Tom sat on the mat. Tom purred.', 'Tom', 'cat', 'the pussycat Tom'],
  ['The firebird Zhar lit up the sky. Zhar sang.', 'Zhar', 'bird', 'the firebird Zhar'],
  ['The goldfish Bubbles swam in circles. Bubbles was bored.', 'Bubbles', 'fish', 'the goldfish Bubbles'],
  ['The sheepdog Shep guarded the flock. Shep barked loudly.', 'Shep', 'dog', 'the sheepdog Shep'],
]
// a combinação gerada: todo composto (os da lista da volta 2 E os que ficavam fora dela, E os limítrofes) sai IGUAL à base
const COMPOSTOS = ['goldfish', 'catfish', 'bluebird', 'blackbird', 'songbird', 'hummingbird', 'sheepdog', 'bobcat', 'tomcat', 'wildcat', 'polecat',
  'bullfrog', 'treefrog', 'jackrabbit', 'pussycat', 'puppydog', 'wolfdog', 'robodog', 'barnowl', 'snowowl', 'warhorse', 'nighthawk', 'firebird',
  'thunderbird', 'jaybird', 'lungfish', 'flatfish', 'babydragon', 'seadragon', 'starfish', 'seahorse', 'jellyfish', 'crayfish', 'wombat', 'fowl',
  'stallion', 'beagle', 'workhorse', 'dogfish', 'hellhound', 'sea-horse']
const NOMES = ['Rusty', 'Lucas', 'Maria', 'Tom', 'Bella', 'Jeremy', 'Tomás', 'Ágata']
const MOLDES = [
  (c, n) => `There was a ${c} named ${n}. ${n} swam every day. ${n} was happy.`,
  (c, n) => `The ${c} ${n} lived by the river. ${n} was happy.`,
  (c, n) => `A ${c} called ${n} slept all day. ${n} woke up at night.`,
  (c, n) => `The old ${c} ${n} croaked. ${n} slept.`,
  (c, n) => `Two ${c}s named ${n} lived in the barn. ${n} played all day.`,
  (c, n) => `THE ${c.toUpperCase()} ${n} ran away. ${n} came back.`,
  (c, n) => `My ${c} ${n} is the best. ${n} loves me.`,
]
const IGUAIS_A_BASE = []
for (const c of COMPOSTOS) for (const n of NOMES) for (const [i, m] of MOLDES.entries()) IGUAIS_A_BASE.push([m(c, n), n, `${c} ${n} molde ${i + 1}`])
for (const [t, n, , r] of POSITIVOS) IGUAIS_A_BASE.push([t, n, r])

function prova(ep, base) {
  const erros = []
  for (const [texto, nome, rotulo] of NEGATIVOS) {
    const p = quem(ep, texto, nome)
    if (p && (p.tipo !== 'humano' || /\b(?:hen|bat|owl|cow|elf|cat|dog|dragon|fish|otter|lion|crow|goat|hawk|troll|mole)\b/i.test(p.descricao))) erros.push(`N ${rotulo}: ${p.tipo} "${p.descricao.slice(0, 50)}"`)
  }
  for (const [texto, nome, especie, rotulo] of POSITIVOS) {
    const p = quem(ep, texto, nome)
    if (!p) erros.push(`P ${rotulo}: ${nome} sumiu do elenco`)
    else if (p.tipo === 'humano' || !new RegExp(`\\b${especie}\\b`, 'i').test(p.descricao)) erros.push(`P ${rotulo}: ${p.tipo} "${p.descricao.slice(0, 50)}"`)
  }
  for (const [texto, nome, rotulo] of IGUAIS_A_BASE) {
    const a = sai(ep, texto, nome), b = sai(base, texto, nome)
    // KINEO-NOME-NAO-CRUZA-PONTO-1111 — na base, um nome de até 4 letras antes de ponto ("…named Tom. Tom swam") era lido como título ("Tom. Tom") e o
    // bicho SUMIA do elenco ("(ausente)"); agora ele entra como entraria "Rusty" no mesmo texto. Só essa diferença é aceita: base ausente, nome curto seguido de
    // ". <nome>", e o mesmo tipo que "Rusty" teria.
    if (a !== b && b === '(ausente)' && nome.length <= 4 && texto.includes(`${nome}. ${nome}`) && a.split(':')[0] === sai(ep, texto.split(nome).join('Rusty'), 'Rusty').split(':')[0]) continue // o Tom sai do MESMO tipo que um nome longo no mesmo texto (o comportamento de sempre para Rusty/Bella)
    if (a !== b) erros.push(`B ${rotulo}: "${a.slice(0, 50)}" ≠ base "${b.slice(0, 50)}"`)
  }
  return erros
}

const base = carregaBase()
// ── A. o caso real, letra a letra ───────────────────────────────────────────────────────────────────────────────────────
{
  const ep = carrega()
  const lucas = quem(ep, LUCAS, 'Lucas')
  checa('A caso real: Lucas é humano (não "a hen with realistic hen anatomy") → ' + (lucas ? `${lucas.tipo}: ${lucas.descricao.slice(0, 60)}` : 'ausente'), !!lucas && lucas.tipo === 'humano' && !/\bhen\b/i.test(lucas.descricao))
  const naBase = quem(base, LUCAS, 'Lucas')
  checa('A controle: na base o mesmo texto dava galinha', !!naBase && /\bhen\b/i.test(naBase.descricao))
  const pt = ep.personagensNomeados(LUCAS_PT)
  checa('A roteiro em português (sem tradução): nenhuma galinha', pt.every((p) => p.tipo === 'humano' && !/\bhen\b/i.test(p.descricao)))
}

// ── B. tabela: negativos humanos, positivos bichos, compostos iguais à base ────────────────────────────────────────────
{
  const erros = prova(carrega(), base)
  checa(`B ${NEGATIVOS.length} negativos, ${POSITIVOS.length} positivos e ${IGUAIS_A_BASE.length} compostos iguais à base ` + erros.slice(0, 10).join(' | '), erros.length === 0)
  const naBase = NEGATIVOS.filter(([t, n]) => { const p = quem(base, t, n); return p && p.tipo !== 'humano' }).length
  checa(`B controle: na base ${naBase} dos ${NEGATIVOS.length} negativos viravam bicho`, naBase >= 1200) // os que sobram já eram gente na base (Combat veteran, Moscow ausente, Bat Yam…)
}

// ── C. mutantes: desfazer o conserto tem de derrubar ─────────────────────────────────────────────────────────────────────
{
  const marca = '(?<![\\p{L}\\p{N}])${palavraComum}\\p{L}*?(${CRIATURAS}|${ANIMAIS})'
  const fonte = readFileSync(join(raiz, EPOCA), 'utf8')
  checa('C a fronteira está no código, uma vez', fonte.split(marca).length === 2)
  const m1 = prova(carrega((t) => t.replace(marca, '(${CRIATURAS}|${ANIMAIS})')), base)
  checa('C mutante M1 (sem a fronteira, como na base): volta a virar bicho ' + m1.length, m1.length >= 300 && m1.some((e) => e.includes('caso real')))
  const m2 = prova(carrega((t) => t.replace(marca, '${palavraComum}\\p{L}*?(${CRIATURAS}|${ANIMAIS})')), base)
  checa('C mutante M2 (sem o lookbehind, a lista vira enfeite): reprova ' + m2.length, m2.length >= 300 && m2.some((e) => e.includes('caso real')))
  const m3 = prova(carrega((t) => t.replace(marca, '(?<![\\p{L}\\p{N}])\\p{L}*?(${CRIATURAS}|${ANIMAIS})')), base)
  checa('C mutante M3 (sem a lista de palavras comuns): when/combat/howl voltam a virar bicho ' + m3.length, m3.length >= 300 && m3.some((e) => e.includes('caso real')))
  const m4 = prova(carrega((t) => t.replace(marca, '(?<![\\p{L}\\p{N}])${palavraComum}(${CRIATURAS}|${ANIMAIS})')), base)
  checa('C mutante M4 (só palavra inteira, a volta 1): bullfrog/jackrabbit/goldfish viram gente ' + m4.length, m4.length >= 41 * 8 * 5 && m4.some((e) => e.includes('bullfrog Jeremy')) && m4.some((e) => e.includes('goldfish Bubbles')))
  const m5 = prova(carrega((t) => t.replace(marca, '(?<![\\p{L}\\p{N}])${palavraComum}(?:(?:gold|cat|bob|sheep|blue)(?=fish|cat|dog|bird))?(${CRIATURAS}|${ANIMAIS})')), base)
  checa('C mutante M5 (lista fixa de compostos, a volta 2): bullfrog/jackrabbit/firebird viram gente ' + m5.length, m5.length > 0 && m5.some((e) => e.includes('bullfrog Jeremy')) && m5.some((e) => e.includes('firebird Zhar')))
  console.log('     M1 derrubou: ' + m1.slice(0, 8).map((e) => e.split(':')[0]).join(' · ') + ` … (${m1.length})`)
}

// ── D. recibo exato da TRAVA 8.2 ────────────────────────────────────────────────────────────────────────────────────────
{
  const hoje = semEspecieNaoEGente1111(semNomeSemCorpo1111(semNomeNaoCruzaPonto1111(semElencoProvaDeGente1211(semIdeiaFichaAssunto1211(semHistoriaReal1411(semBichoComNome1411(semFichaDoAutorManda1411(semFichaDoAutorMandaV21411(semHistoriaRealAll1411(readFileSync(join(raiz, EPOCA), 'utf8'), EPOCA), EPOCA), EPOCA), EPOCA), EPOCA) /* KINEO-HISTORIA-REAL-1411 · KINEO-BICHO-COM-NOME-1411 · KINEO-FICHA-DO-AUTOR-MANDA-1411 (e a v2) — as camadas de 14/11 saem primeiro, cada uma pelo recibo exato (hash antes/depois) */, EPOCA) /* KINEO-IDEIA-FICHA-ASSUNTO-1211 — a camada de 12/11 noite sai antes */, EPOCA) /* KINEO-ELENCO-PROVA-DE-GENTE-1211 — a camada de 12/11 sai primeiro */, EPOCA), EPOCA), EPOCA) // KINEO-ESPECIE-NAO-E-GENTE-1111 — a camada mais nova (11/11) sai antes do recibo
  checa('D recibo: desfazer devolve a base exata', semQuandoNaoEGalinha0911(hoje, EPOCA).replace(/\r\n/g, '\n') === BASE_FONTE.replace(/\r\n/g, '\n'))
  checa('D recibo: o arquivo de hoje é exatamente base + esta entrega', deltaQuandoNaoEGalinha0911Exato(hoje, BASE_FONTE, EPOCA))
  checa('D recibo: edição a mais reprova', !deltaQuandoNaoEGalinha0911Exato(hoje.replace('KINEO-QUANDO-NAO-E-GALINHA-0911', 'KINEO-QUANDO-NAO-E-GALINHA-0911 x'), BASE_FONTE, EPOCA))
  checa('D recibo: só este arquivo no escopo', Object.keys(QUANDO_NAO_E_GALINHA_0911.scope).join() === EPOCA && Object.keys(QUANDO_NAO_E_GALINHA_0911.addedSources).length === 0)
}

console.log(`\n${falhas === 0 ? '✅' : '❌'} ${ok} ok, ${falhas} falhas`)
process.exit(falhas === 0 ? 0 : 1)
