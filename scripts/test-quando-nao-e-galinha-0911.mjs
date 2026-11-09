// KINEO-QUANDO-NAO-E-GALINHA-0911 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião sem rede e sem custo.
// Caso real: jardsono10239 (BR, 07/11 14:41 UTC, 1º filme, grátis 15 s, generation 13a4a7f6): "Era 3 da manhã quando Lucas recebeu uma
// ligação misteriosa." — em inglês "It was 3 a.m. when Lucas received...": a janela de espécie de lib/cinematic/elencoEpoca.ts (tipoDe)
// não tinha fronteira antes da espécie, e "w-HEN Lucas" casou com "hen". O filme abriu com uma galinha na janela de chuva.
// Prova executando o código real: o texto do caso sai humano; bichos de verdade continuam bichos; palavra comum que TERMINA em nome de
// bicho (when/then/combat/acrobat/howl/bowl/Moscow/himself) não vira espécie; desfazer o conserto derruba o teste.
// Rodar: node scripts/test-quando-nao-e-galinha-0911.mjs
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semQuandoNaoEGalinha0911, deltaQuandoNaoEGalinha0911Exato, QUANDO_NAO_E_GALINHA_0911 } from './test-support/desfaz-quando-nao-e-galinha-0911.mjs'

let ok = 0
let falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const EPOCA = 'lib/cinematic/elencoEpoca.ts'
const carrega = (mutar = null) => createOfflineLoader({ source: (rel, t) => (mutar && rel === EPOCA ? mutar(t) : t) })(EPOCA)
const raiz = join(import.meta.dirname, '..')

// o texto em inglês que o elenco lê (textoInglesDe → personagensNomeados), o do caso real
const LUCAS = 'HOOK (0-2s): [Pexels: dark rainy window] "It was 3 a.m. when Lucas received a mysterious call."\n\nMICRO REWARD 1: [Pexels: young man phone screen] "An unknown number.\n\nMICRO REWARD 2: [Pexels: dimly lit room] Do not open the door!"\n\nPAYOFF: [Pexels: phone ringing ominous] "The next day, three knocks on the door... and it was himself. Too late."'
const LUCAS_PT = 'HOOK (0-2s): [Pexels: dark rainy window] "Era 3 da manhã quando Lucas recebeu uma ligação misteriosa."\n\nMICRO REWARD 1: [Pexels: young man phone screen] "Um número desconhecido.\n\nMICRO REWARD 2: [Pexels: dimly lit room] Não abra a porta!"\n\nPAYOFF: [Pexels: phone ringing ominous] "No dia seguinte, três batidas na porta... e era ele mesmo. Tarde demais."'

const quem = (ep, texto, nome) => ep.personagensNomeados(texto).find((p) => p.nome === nome) ?? null

// negativos: palavra comum que termina em nome de bicho/criatura colada ao nome → gente
const NEGATIVOS = [
  [LUCAS, 'Lucas', 'caso real (when Lucas → hen)'],
  ['It was late when Maria heard the knock. Maria opened the door slowly.', 'Maria', 'when Maria (hen)'],
  ['He stopped, then Maria opened the door. Maria smiled at him.', 'Maria', 'then Maria (hen)'],
  ['IT WAS 3 A.M. WHEN Lucas received a call. Lucas answered it.', 'Lucas', 'CAIXA ALTA (WHEN Lucas)'],
  ['After the long combat Joana walked home alone. Joana cried.', 'Joana', 'combat Joana (bat)'],
  ['The famous acrobat Pedro jumped from the trapeze. Pedro landed safely.', 'Pedro', 'acrobat Pedro (bat)'],
  ['They heard a howl Rafael could not explain. Rafael ran into the woods.', 'Rafael', 'howl Rafael (owl)'],
  ['She dropped the bowl Marta had filled. Marta screamed.', 'Marta', 'bowl Marta (owl)'],
  ['In Moscow Ivan waited for the last train. Ivan was cold.', 'Ivan', 'Moscow Ivan (cow)'],
  ['He looked at himself Tomás thought, and smiled. Tomás opened the box.', 'Tomás', 'himself Tomás (elf), nome com acento'],
  ['It was midnight when Ágata received the letter. Ágata read it twice.', 'Ágata', 'when Ágata (hen), nome com acento no início'],
  ['Era meia-noite quando Lucas recebeu a carta. Lucas leu duas vezes.', 'Lucas', 'português sem tradução'],
  ['Era medianoche cuando Lucas recibió la carta. Lucas la leyó dos veces.', 'Lucas', 'espanhol sem tradução'],
]
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
]

function prova(ep) {
  const erros = []
  for (const [texto, nome, rotulo] of NEGATIVOS) {
    const p = quem(ep, texto, nome)
    if (p && (p.tipo !== 'humano' || /\b(?:hen|bat|owl|cow|elf)\b/i.test(p.descricao))) erros.push(`N ${rotulo}: ${p.tipo} "${p.descricao.slice(0, 50)}"`)
  }
  for (const [texto, nome, especie, rotulo] of POSITIVOS) {
    const p = quem(ep, texto, nome)
    if (!p) erros.push(`P ${rotulo}: ${nome} sumiu do elenco`)
    else if (p.tipo === 'humano' || !new RegExp(`\\b${especie}\\b`, 'i').test(p.descricao)) erros.push(`P ${rotulo}: ${p.tipo} "${p.descricao.slice(0, 50)}"`)
  }
  return erros
}

// ── A. o caso real, letra a letra ───────────────────────────────────────────────────────────────────────────────────────
{
  const ep = carrega()
  const lucas = quem(ep, LUCAS, 'Lucas')
  checa('A caso real: Lucas é humano (não "a hen with realistic hen anatomy") → ' + (lucas ? `${lucas.tipo}: ${lucas.descricao.slice(0, 60)}` : 'ausente'), !!lucas && lucas.tipo === 'humano' && !/\bhen\b/i.test(lucas.descricao))
  const pt = ep.personagensNomeados(LUCAS_PT)
  checa('A roteiro em português (sem tradução): nenhuma galinha', pt.every((p) => p.tipo === 'humano' && !/\bhen\b/i.test(p.descricao)))
}

// ── B. tabela: negativos humanos, positivos bichos ─────────────────────────────────────────────────────────────────────
{
  const erros = prova(carrega())
  checa(`B ${NEGATIVOS.length} negativos e ${POSITIVOS.length} positivos ` + erros.join(' | '), erros.length === 0)
}

// ── C. mutantes: desfazer o conserto tem de derrubar ─────────────────────────────────────────────────────────────────────
{
  const marca = '(?<![\\p{L}\\p{N}])(${CRIATURAS}|${ANIMAIS})'
  const fonte = readFileSync(join(raiz, EPOCA), 'utf8')
  checa('C a fronteira está no código, uma vez', fonte.split(marca).length === 2)
  const m1 = prova(carrega((t) => t.replace(marca, '(${CRIATURAS}|${ANIMAIS})')))
  checa('C mutante M1 (sem a fronteira, como na base): volta a virar bicho ' + m1.length, m1.length >= 8 && m1.some((e) => e.includes('caso real')))
  const m2 = prova(carrega((t) => t.replace(marca, '(?<![\\p{L}])(${CRIATURAS}|${ANIMAIS})').replace("'iu').exec(frases) // KINEO-ELENCO-EPOCA-2710 // KINEO-QUANDO", "'i').exec(frases) // KINEO-ELENCO-EPOCA-2710 // KINEO-QUANDO")))
  checa('C mutante M2 (sem a flag u, \\p{L} vira letra p literal): reprova ' + m2.length, m2.length > 0)
  const m3 = prova(carrega((t) => t.replace(marca, '(?<![\\p{L}])(${CRIATURAS}|${ANIMAIS})')))
  checa('C controle M3 (fronteira só de letra): o mesmo resultado do conserto ' + m3.join(' | '), m3.length === 0)
  console.log('     M1 derrubou: ' + m1.map((e) => e.split(':')[0]).join(' · '))
}

// ── D. recibo exato da TRAVA 8.2 ────────────────────────────────────────────────────────────────────────────────────────
{
  const hoje = readFileSync(join(raiz, EPOCA), 'utf8')
  const base = execFileSync('git', ['show', `${QUANDO_NAO_E_GALINHA_0911.base}:${EPOCA}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 })
  checa('D recibo: desfazer devolve a base exata', semQuandoNaoEGalinha0911(hoje, EPOCA).replace(/\r\n/g, '\n') === base.replace(/\r\n/g, '\n'))
  checa('D recibo: o arquivo de hoje é exatamente base + esta entrega', deltaQuandoNaoEGalinha0911Exato(hoje, base, EPOCA))
  checa('D recibo: edição a mais reprova', !deltaQuandoNaoEGalinha0911Exato(hoje.replace('KINEO-QUANDO-NAO-E-GALINHA-0911', 'KINEO-QUANDO-NAO-E-GALINHA-0911 x'), base, EPOCA))
  checa('D recibo: só este arquivo no escopo', Object.keys(QUANDO_NAO_E_GALINHA_0911.scope).join() === EPOCA && Object.keys(QUANDO_NAO_E_GALINHA_0911.addedSources).length === 0)
}

console.log(`\n${falhas === 0 ? '✅' : '❌'} ${ok} ok, ${falhas} falhas`)
process.exit(falhas === 0 ? 0 : 1)
