// KINEO-CENA-FORA-DO-PEDIDO-1111 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião do "giant" adjetivo que virava personagem.
// Revisor 10/11 23:25 BRT: 3 de 3 primeiros filmes grátis de 15 s (Kling 4 grátis) com CENA_FORA_DO_PEDIDO. Prova no banco (SELECT em
// events: cinematic_submission_claim.response e cinematic_character_sheet):
//   · 2176bed6 (ursinho, geração 03d002f3): personagem.elenco = [the baby bear, {nome:"the giant", tipo:"criatura", origem:"deterministica"}]; as
//     imagens-chave 2 e 3 levaram "the giant, a small towering giant with a rough weathered face, enormous hands and crude cloth garments" e a
//     folha dele. O roteiro não tem gigante: o escritor de cenas escreveu "a giant carrot" e SEM_NOME_RE leu "a giant" como o ser. → CONSERTADO AQUI.
//   · b23b3e7f (álcool, geração bf8989ad): sem elenco. 4 falas em 3 planos: a blitz virou fundo do plano 2 ("a police checkpoint looms in the
//     background") e o plano 3 foi escrito "A shadowy figure in the desert, discreetly exchanging a small package". O filme seguiu o texto. Fora daqui.
//   · 26e1f8b4 (Adão e Eva, geração 40543daf): ficha "Eve … appearance anchors: 8-12" (idade da ficha) — coberto por outra sessão. Fora daqui.
// TODA verificação roda sobre o código de PRODUÇÃO (lib/cinematic/folhaDePersonagem.ts, lib/cinematic/personagemAjuste.ts e lib/filmes/filme15Elenco.ts
// importados). A base e cada mutante são cópias temporárias do arquivo de produção (origin/main, ou o arquivo com uma linha mutada) importadas do
// mesmo diretório; a mesma bateria tem de ficar vermelha. Sem rede, sem banco, sem fornecedor.
// Rodar: npx tsx scripts/test-cena-fora-do-pedido-1111.mjs
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { elencoDeterministico } from '../lib/cinematic/folhaDePersonagem.ts'
import { elencoDoRoteiro } from '../lib/cinematic/personagemAjuste.ts'
import { elencoDoFilme15 } from '../lib/filmes/filme15Elenco.ts'

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ', m) } else { fail++; console.log('  FALHA', m) } }
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const FOLHA = 'lib/cinematic/folhaDePersonagem.ts'
const MARCA = 'KINEO-CENA-FORA-DO-PEDIDO-1111'

// ── Os textos reais (cinematic_submission_claim.response: prompt e as 3 descrições de cena, 10/11) ───────────────────────────
const URSINHO = {
  prompt: 'HOOK: [Pexels: colorful garden with huge carrot] A baby bear finds an enormous magical carrot in the garden!\n\nMICRO REWARD 2: [Pexels: bear flying into flowers] The carrot pops out, sending him flying into flowers!\n\nPAYOFF: [Pexels: butterflies flying from carrot] A bunny helps him up, and hundreds of butterflies burst from the carrot!',
  visuals: [
    'A close-up shot of the bear standing in a lush garden, its eyes wide with curiosity as it investigates an enormous, brightly colored carrot partially buried in the soil, surrounded by vibrant green plants and flowers, capturing the whimsical nature of the scene.',
    'A drone shot capturing a vibrant garden scene where a giant carrot is dramatically uprooted from the ground, sending the bear soaring into the air amidst a flurry of colorful flowers blooming around it, emphasizing the wild and magical aspect of the moment.',
    'A tracking shot following a small, friendly bunny as it rushes to help the bear stand up, surrounded by a whirlwind of colorful butterflies that emerge from the giant carrot, creating a visually stunning and joyful climax to the scene.',
  ],
}
const ALCOOL = {
  prompt: "HOOK (0-2s): [Pexels: desert landscape] Did you know this country bans alcohol sales?\n\nMICRO REWARD 1: [Pexels: city street market] In Saudi Arabia, buying alcohol is strictly illegal.\n\nMICRO REWARD 2: [Pexels: police checkpoint] Violators face hefty fines and possible imprisonment.\n\nPAYOFF: [Pexels: desert sunset view] But... expatriates still find ways to obtain it through black markets.",
  visuals: [
    'A vast desert landscape under a clear blue sky, with golden sand dunes stretching into the horizon, bathed in warm sunlight.',
    'A bustling city street market in Saudi Arabia, vendors displaying colorful goods, while a police checkpoint looms in the background, ensuring compliance.',
    'A shadowy figure in the desert, discreetly exchanging a small package under the cover of dusk, with sand dunes in the background.',
  ],
}
const ADAO = {
  prompt: "HOOK (0-2s): [Pexels: animated garden scene] Adam and Eve's story—like you've never heard it.\n\nMICRO REWARD 2: [Pexels: animated snake slithering] The serpent? It could actually speak—confusing Eve in her own language.\n\nPAYOFF: [Pexels: animated angel with flaming sword] The real twist? Their exit wasn't just punishment... it was a new beginning!",
  visuals: [
    'A close-up shot of Adam and Eve standing together in a lush garden, with Eve looking curiously at a serpent coiled around a tree, symbolizing temptation and the pivotal moment in their story.',
    'A sweeping drone shot over a lush, vibrant garden filled with diverse plants and flowers, capturing the essence of paradise where Eve meets the serpentine figure that to her.',
    'A sweeping aerial shot of Adam and Eve walking away from the garden at sunrise, with the sun illuminating their path, symbolizing new beginnings and hope.',
  ],
}

const nomes = (e) => e.map((f) => f.nome)
const temGigante = (e) => e.some((f) => /\bgiant\b/i.test(f.nome) || /towering giant/i.test(f.canonica))
/** O caminho do 15 s (rota: elencoDoFilme15 com o elenco do pedido e os visuais do plano), com o extrator dado. */
const elenco15 = (caso, extrair) => elencoDoFilme15({ elencoDoPedido: extrair(caso.prompt), visuals: caso.visuals, extrair, completar: true }).elenco

// ── A bateria: recebe o extrator determinístico (produção, base ou mutante) e devolve as falhas ─────────────────────────────
const GIGANTE_PEDIDO = [ // gigante que o texto PEDE: continua personagem, com a ficha de sempre
  'A giant walks across the valley and the ground shakes.',
  'Jack climbs the beanstalk and meets a giant in the castle.',
  'The giant, angry and hungry, roared at the village.',
  'Deep in the hills lives the giant who guards the bridge.',
  'A friendly giant named Tom lifts the house.',
  'Nobody in the village had ever seen the giant.',
  'Every night a giant sleeps under the old bridge.',
]
const GIGANTE_ADJETIVO = [ // "giant" colado a outra palavra: nunca vira "the giant"
  'A drone shot of a garden where a giant carrot is dramatically uprooted from the ground.',
  'colorful butterflies that emerge from the giant carrot',
  'A giant wave hits the fishing boat at night.',
  'The camera reveals a giant-sized pumpkin in the field.',
  'A giant mushroom glows in the dark forest.',
  'A huge giant carrot rolls down the hill.',
  'A GIANT CARROT appears in the garden.',
  'the giant pumpkins of the county fair',
]
function bateria(extrair, rotulo) {
  const falhas = []
  const quer = (c, m) => { if (!c) falhas.push(m) }
  // 1. o caso real: nem o pedido, nem cada visual, nem o elenco do 15 s têm gigante
  quer(!temGigante(extrair(URSINHO.prompt)), 'ursinho: o pedido não tem gigante')
  for (let i = 0; i < 3; i++) quer(!temGigante(extrair(URSINHO.visuals[i])), `ursinho: o visual ${i + 1} não dá "the giant"`)
  const e = elenco15(URSINHO, extrair)
  quer(!temGigante(e), `ursinho: o elenco do filme de 15 s não tem gigante (veio ${JSON.stringify(nomes(e))})`)
  quer(e.length === 1 && /bear/.test(e[0].nome) && e[0].tipo === 'animal' && e[0].protagonista === true, `ursinho: o elenco é só o ursinho (veio ${JSON.stringify(nomes(e))})`)
  // 2. gigante pedido continua personagem
  for (const t of GIGANTE_PEDIDO) { const g = extrair(t).find((f) => f.nucleo === 'giant'); quer(!!g && g.tipo === 'criatura' && /towering giant/.test(g.canonica), `pedido: "${t.slice(0, 48)}" mantém o gigante`) }
  // 3. adjetivo nunca vira o ser
  for (const t of GIGANTE_ADJETIVO) quer(!extrair(t).some((f) => f.nucleo === 'giant'), `adjetivo: "${t.slice(0, 48)}" não dá o ser gigante`)
  // 4. "a giant bear": o bicho com o adjetivo, como sempre
  { const g = extrair('A giant bear hugs the little girl.'); quer(g.some((f) => f.nucleo === 'bear' && f.tipo === 'animal') && !g.some((f) => f.nucleo === 'giant'), 'a giant bear = o urso') }
  if (rotulo) console.log(`    [${rotulo}] ${falhas.length} falha(s)`)
  return falhas
}

// ── PRODUÇÃO ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log('1. produção (lib/cinematic/folhaDePersonagem.ts + o caminho da rota: elencoDoRoteiro → elencoDoFilme15)')
{
  const falhas = bateria(elencoDeterministico)
  ok(falhas.length === 0, `bateria verde com o extrator determinístico${falhas.length ? ' — ' + falhas.join(' | ') : ''}`)
  const pelaRota = elenco15(URSINHO, elencoDoRoteiro)
  ok(!temGigante(pelaRota) && pelaRota.length === 1, `ursinho pela rota (elencoDoRoteiro): elenco = ${JSON.stringify(nomes(pelaRota))}`)
  ok(!pelaRota.some((f) => /rough weathered face|crude cloth garments/.test(f.canonica)), 'ursinho: nenhuma ficha com "rough weathered face … crude cloth garments"')
}

// ── BASE (origin/main) e MUTANTES: cópias temporárias no mesmo diretório ────────────────────────────────────────────────────
const raiz = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const atual = lf(readFileSync(resolve(raiz, FOLHA), 'utf8'))
let n = 0
async function comCopia(fonte, fn) {
  const nome = `lib/cinematic/.tmp-cena-fora-do-pedido-${process.pid}-${++n}.ts`
  const caminho = resolve(raiz, nome)
  writeFileSync(caminho, fonte)
  try { return await fn(await import(pathToFileURL(caminho).href)) } finally { try { unlinkSync(caminho) } catch {} }
}
let base = null
try { base = lf(execFileSync('git', ['show', `origin/main:${FOLHA}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 })) } catch { base = null }
const baseSemConserto = base && !base.includes(MARCA) ? base : null // depois de publicado, origin/main já tem o conserto: a base vira o mutante M1

console.log('2. a base reproduz o defeito e o resto fica byte a byte')
const SEM_GIGANTE = [ // textos sem a palavra "giant": o elenco tem de ser IGUAL ao da base, ficha por ficha
  ALCOOL.prompt, ...ALCOOL.visuals, ADAO.prompt, ...ADAO.visuals, URSINHO.prompt, URSINHO.visuals[0],
  'A sad Indian boy sits by the window. Ravan rolls his eyes. Ravan: "Not again."', 'A tired commuter waits for the last train.',
  'A little girl hands the key to an elderly man.', 'A ghost flight vanished over the Pacific in 1962.', 'The brave fox crosses the frozen river.',
  'Dino heard a noise under the bed. Dino opened the dinosaur blanket.', 'A young woman opens a bakery in Lisbon and the whole street lines up.',
  'Uma menina encontra uma chave azul no jardim do avô.', 'A dragon sleeps on a pile of gold while a knight tiptoes past.',
  'A street vendor sells fruit while a crowd of shoppers walks by and a police officer watches.',
]
if (baseSemConserto) {
  await comCopia(baseSemConserto, async (mod) => {
    const falhasBase = bateria(mod.elencoDeterministico, 'base origin/main')
    ok(falhasBase.some((f) => f.startsWith('ursinho: o visual 2')) && falhasBase.some((f) => f.startsWith('ursinho: o elenco do filme de 15 s')), 'na base o visual 2 dá "the giant" e ele entra no elenco do 15 s (o defeito do 2176bed6)')
    const eBase = elenco15(URSINHO, mod.elencoDeterministico)
    ok(JSON.stringify(nomes(eBase)) === JSON.stringify(['the baby bear', 'the giant']) && /towering giant with a rough weathered face, enormous hands and crude cloth garments/.test(eBase[1].canonica), `na base o elenco é o do claim: ${JSON.stringify(nomes(eBase))}`)
    let iguais = 0
    for (const t of SEM_GIGANTE) if (JSON.stringify(mod.elencoDeterministico(t)) === JSON.stringify(elencoDeterministico(t))) iguais++
    ok(iguais === SEM_GIGANTE.length, `texto sem "giant": elenco idêntico ao da base em ${iguais}/${SEM_GIGANTE.length} (inclui os textos reais do álcool e de Adão e Eva)`)
    let pedidos = 0
    for (const t of GIGANTE_PEDIDO) if (JSON.stringify(mod.elencoDeterministico(t)) === JSON.stringify(elencoDeterministico(t))) pedidos++
    ok(pedidos === GIGANTE_PEDIDO.length, `gigante pedido: ficha idêntica à da base em ${pedidos}/${GIGANTE_PEDIDO.length}`)
    for (const caso of [ALCOOL, ADAO]) ok(JSON.stringify(elenco15(caso, mod.elencoDeterministico)) === JSON.stringify(elenco15(caso, elencoDeterministico)), `elenco do 15 s idêntico ao da base: ${caso === ALCOOL ? 'álcool (b23b3e7f)' : 'Adão e Eva (26e1f8b4)'} — este conserto não os muda`)
  })
} else console.log('    (origin/main já tem o conserto ou não está disponível: a comparação com a base fica para o mutante M1)')

console.log('3. mutantes (a mesma bateria tem de ficar vermelha)')
const muta = (de, para) => { if (atual.split(de).length !== 2) throw new Error('mutante: âncora ausente ou repetida: ' + de.slice(0, 60)); return atual.replace(de, () => para) }
const MUTANTES = [
  ['M1 sem o olhar à frente no SEM_NOME_RE', muta('${SER_COMO_ADJETIVO}${GIGANTE_COMO_ADJETIVO}`', '${SER_COMO_ADJETIVO}`'), /ursinho: o visual 2|adjetivo:/],
  ['M2 todo "giant" seguido de palavra é adjetivo (sem a lista de verbo/ligação)', muta("const GIGANTE_AGE = 'who|whom|", "const GIGANTE_AGE = 'zzzzqq|whom|").replace(/(const GIGANTE_AGE = 'zzzzqq)[^']*'/, "$1'"), /pedido:/],
  ['M3 sem o hífen (giant-sized)', muta('(?<=\\bgiant)(?:-|\\s+', '(?<=\\bgiant)(?:\\s+'), /adjetivo: "The camera reveals a giant-sized/],
  ['M4 o olhar à frente vale para qualquer ser (não só giant)', muta('(?!(?<=\\bgiant)(?:-|', '(?!(?:-|'), null],
]
for (const [nome, fonte, esperado] of MUTANTES) {
  await comCopia(fonte, async (mod) => {
    const falhas = bateria(mod.elencoDeterministico)
    if (esperado) ok(falhas.some((f) => esperado.test(f)), `${nome}: vermelho (${falhas.length} falha(s))`)
    else { // M4: a bateria do gigante não vê; quem vê é a igualdade com a produção nos textos sem "giant"
      let dif = 0
      for (const t of SEM_GIGANTE) if (JSON.stringify(mod.elencoDeterministico(t)) !== JSON.stringify(elencoDeterministico(t))) dif++
      ok(dif > 0, `${nome}: vermelho (${dif} texto(s) sem "giant" mudam de elenco)`)
    }
  })
}

console.log('4. escopo do arquivo')
ok(atual.split(MARCA).length - 1 >= 3 && atual.includes('${SER_COMO_ADJETIVO}${GIGANTE_COMO_ADJETIVO}`'), 'a marca está no arquivo e o SEM_NOME_RE usa os dois olhares à frente')
if (baseSemConserto) {
  const semMarca = atual.split('\n').filter((l) => !l.includes(MARCA)).join('\n')
  const baseSemLinha = base.split('\n').filter((l) => !/^const SEM_NOME_RE = /.test(l)).join('\n')
  ok(semMarca === baseSemLinha, 'fora das linhas marcadas o arquivo é o de origin/main, byte a byte')
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
