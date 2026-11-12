// KINEO-IDEIA-FICHA-ASSUNTO-1211 — guardião dos 3 defeitos provados pelos 2 filmes pagos de teste de 12/11 (conta da casa).
//   A "Jonathan" (Kling 4): "older than the first photograph of a person" virou elenco ("the person, a person in their thirties…").
//   B "Jonathan": "nearly 2,000 kilometres from Africa" virou "Africa clearly visible as the subject of this shot".
//   C "Lumo" (H3 Max Turbo): a mulher ruiva de suéter mostarda e a garrafa de vidro com tampa de bambu da IDEIA não chegavam a plano nenhum.
// Prova: (1) cada regra com o texto REAL dos filmes + controles; (2) desligado = byte a byte o de antes (assinatura antiga ≡ false; a rota
// só liga pela conta da casa; o plano sem a marca não muda no compactador do Kling 4); (3) mutantes reprovam. Sem rede, sem banco.
// Rodar: npx tsx scripts/test-ideia-ficha-assunto-1211.mjs
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { protagonistaSemNome, papelSemNomeAge, aplicarElencoEEpoca, epocaDaHistoria } from '../lib/cinematic/elencoEpoca.ts'
import { sujeitosDaFala, comSujeitoDaFala, promptCurtoDoFilmeKling4 } from '../lib/cinematic/filmQuality.ts'
import { IDEIA_NA_FICHA, ideiaNaFichaLigada, fichaDaIdeia, comIdeiaNaCena, pessoaDaIdeia, produtoDaIdeia, textoDaIdeia, EMBALAGEM_COR_LISA } from '../lib/cinematic/ideiaNaFicha.ts'
import { ELENCO_PROVA_DE_GENTE } from '../lib/cinematic/provaDeGente.ts'

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ', m) } else { fail++; console.log('  FALHA', m) } }
const J = (x) => JSON.stringify(x)
const STYLE = { look: 'photoreal', suffix: ', same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain', lookPhrase: 'photorealistic, ultra-detailed' }

const JONATHAN = 'HOOK: [Pexels: giant tortoise on grass] Jonathan hatched around 1832.\n\nMICRO REWARD: [Pexels: tortoise walking slowly] Jonathan is now over 190 years old, older than the first photograph of a person.\n\nPAYOFF: [Pexels: island cliffs ocean] Jonathan lives on a tiny island, nearly 2,000 kilometres from Africa.'
const IDEIA_LUMO = 'UGC video, 15 seconds, vertical 9:16, for a fictional brand called Lumo. A woman in her late twenties with short curly red hair and a mustard yellow sweater stands in a bright kitchen and speaks to the camera while holding the Lumo glass water bottle (clear glass, bamboo lid). She says the water is still cold after 12 hours and that the 750 ml bottle fits in her bag. Natural daylight, handheld phone framing.'
const ROTA_LUMO = `[Idea: ${IDEIA_LUMO}]\nHOOK (0-2s): [Pexels: bright kitchen woman smiling] Meet the Lumo bottle — your hydration hero.\n\nPAYOFF: [Pexels: woman confidently sipping water] All in a sleek 750 ml design... Lumo bottle — cold refreshment, whenever, wherever.`
const CAUDA = ' 9:16 vertical framing, subject framed in the upper two-thirds with the lower third clear for captions, smooth camera motion, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, 9:16 vertical framing. Every bottle, box and package is one plain solid colour. Setting as the customer asked: a bright kitchen.'
const PLANOS_LUMO = [ // os 3 planos gravados no claim b2a513ba (12/11 20:44)
  'Film visual medium: photorealistic, ultra-detailed. Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. photorealistic, ultra-detailed. A woman in a bright kitchen smiles at the camera, holding the Lumo glass water bottle, sunlight streaming through the window.' + CAUDA,
  'Film visual medium: photorealistic, ultra-detailed. photorealistic, ultra-detailed. A close-up of the bamboo lid being twisted tight on the Lumo bottle, followed by a hand smoothly placing the bottle into a stylish bag.' + CAUDA,
  'Film visual medium: photorealistic, ultra-detailed. photorealistic, ultra-detailed. The woman confidently sips water from the Lumo bottle, the sleek design glistening in natural daylight, showcasing its refreshing appeal.' + CAUDA,
]

console.log('── A: substantivo genérico de gente em comparação/objeto não vira elenco ──')
const ep = epocaDaHistoria(JONATHAN)
ok(protagonistaSemNome(JONATHAN, ep)?.nome === 'the person', 'A desligado: o de antes ("the person") — a prova do defeito')
ok(protagonistaSemNome(JONATHAN, ep, false, true) === null, 'A ligado: "photograph of a person" não é ninguém em cena')
for (const [t, esperado] of [
  ['A tired commuter waits for the last train. The commuter sighs.', 'the tired commuter'],
  ['Meet a man who never slept.', 'the man'],
  ['She is taller than a man. The man laughs at her.', 'the man'],
  ['Can a person become a Super Saiyan? His journey began in a remote dojo.', 'the person'],
  ['The photo of a stranger hung there. The stranger came back at night.', 'the stranger'],
]) ok(protagonistaSemNome(t, null, false, true)?.nome === esperado, `A ligado, ator fica: "${t.slice(0, 48)}…" → ${esperado}`)
for (const t of ['The photo of a stranger hung on the wall.', 'It weighs more than a man.', 'He ran like a child.', 'A gift for a teacher sat on the desk.'])
  ok(protagonistaSemNome(t, null, false, true) === null && protagonistaSemNome(t) !== null, `A ligado, referência sai (desligado entrava): "${t}"`)
ok(papelSemNomeAge('older than the first photograph of a person.', 'person') === false && papelSemNomeAge('A person walks in.', 'person') === true, 'A papelSemNomeAge: regência decide')
for (const t of [JONATHAN, 'A tired commuter waits.', 'It weighs more than a man.', 'Ein Junge kauft einen Zoo.'])
  ok(J(protagonistaSemNome(t, null, false)) === J(protagonistaSemNome(t, null, false, false)), `A desligado: assinatura antiga ≡ false ("${t.slice(0, 30)}…")`)
// a camada inteira, com os prompts reais: ligado, nenhuma cláusula de elenco "the person"
const planosJ = ['Close-up of Jonathan the giant tortoise on grassy terrain, slowly moving.', 'Medium shot of Jonathan walking slowly across a grassy field.']
const falasJ = ['Jonathan hatched around 1832. Jonathan is now over 190 years old, older than the first photograph of a person.', 'Jonathan lives on a tiny island, nearly 2,000 kilometres from Africa.']
const camada = (pg) => aplicarElencoEEpoca({ prompts: planosJ, falas: falasJ, contextoOriginal: JONATHAN, contextoFiltro: JONATHAN, modo: 'documentary_faceless', tagFaceless: false, ...(pg ? { provaDeGente: true } : {}) })
ok(!camada(true).prompts.some((p) => /the person, a person in their thirties/.test(p)), 'A camada ligada: nenhum plano ganha "the person, a person in their thirties"')
ok(J(camada(false)) === J(aplicarElencoEEpoca({ prompts: planosJ, falas: falasJ, contextoOriginal: JONATHAN, contextoFiltro: JONATHAN, modo: 'documentary_faceless', tagFaceless: false, provaDeGente: false })), 'A camada desligada: ausente ≡ false')

console.log('── B: lugar de referência (distância/comparação/origem) não vira o assunto do plano ──')
const FALA_B = 'Jonathan lives on a tiny island, nearly 2,000 kilometres from Africa.'
ok(J(sujeitosDaFala(FALA_B)) === J(['Africa']), 'B desligado: o de antes (["Africa"]) — a prova do defeito')
ok(J(sujeitosDaFala(FALA_B, true)) === '[]', 'B ligado: "from Africa" é referência')
ok(!comSujeitoDaFala('Medium shot of a tortoise on island cliffs above the ocean.', FALA_B, [], true).includes('Africa clearly visible'), 'B ligado: o plano da ilha fica com a ilha')
ok(J(sujeitosDaFala('In October 2020, it passed about five million miles from Mars.', true)) === '[]', 'B ligado: "miles from Mars" (claim 38e27c00, 05/11) também sai')
for (const [f, s] of [['On Venus, the year ends before a single day does!', 'Venus'], ['The ship sank near Newfoundland.', 'Newfoundland']])
  ok(J(sujeitosDaFala(f, true)) === J([s]), `B ligado, assunto fica: "${f}" → ${s}`)
ok(J(sujeitosDaFala('Mount Everest is taller than Kilimanjaro.', true)) === '[]', 'B ligado: "taller than X" sai')
for (const f of [FALA_B, 'On Venus, the year ends before a single day does!', 'In October 2020, it passed about five million miles from Mars.'])
  ok(J(sujeitosDaFala(f)) === J(sujeitosDaFala(f, false)) && comSujeitoDaFala('A view.', f, []) === comSujeitoDaFala('A view.', f, [], false), `B desligado: assinatura antiga ≡ false ("${f.slice(0, 30)}…")`)

console.log('── C: a pessoa e o produto da IDEIA viram a ficha única de todos os planos ──')
ok(textoDaIdeia(null, ROTA_LUMO) === IDEIA_LUMO && textoDaIdeia(ROTA_LUMO) === IDEIA_LUMO && textoDaIdeia(IDEIA_LUMO) === IDEIA_LUMO, 'C o "[Idea: …]" da rota é lido (pedido ou prompt)')
const F = fichaDaIdeia(IDEIA_LUMO, ROTA_LUMO)
ok(F?.pessoa === 'a woman in her late twenties with short curly red hair and a mustard yellow sweater', `C pessoa verbatim: ${F?.pessoa}`)
ok(F?.produto === 'the Lumo glass water bottle (clear glass, bamboo lid)', `C produto verbatim: ${F?.produto}`)
const depois = PLANOS_LUMO.map((p) => comIdeiaNaCena(p, F))
depois.forEach((p, i) => {
  ok(/short curly red hair/.test(p) && /mustard yellow sweater/.test(p) && /clear glass, bamboo lid/.test(p), `C plano ${i + 1}: ruiva + suéter mostarda + vidro/bambu`)
  ok(!p.includes(EMBALAGEM_COR_LISA), `C plano ${i + 1}: a embalagem não pede mais cor lisa`)
  ok(p.includes('no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, 9:16 vertical framing. Every bottle, box and package keeps its described material and colour, unprinted. Setting as the customer asked: a bright kitchen.'), `C plano ${i + 1}: proibições intactas, nada cortado`)
  ok(p.endsWith('The product shown is always this same one: the Lumo glass water bottle (clear glass, bamboo lid). The same main character appears in this scene, consistent design: a woman in her late twenties with short curly red hair and a mustard yellow sweater.'), `C plano ${i + 1}: produto e, por último, a ficha — no fim, como toda ficha da casa`)
  ok(p.startsWith(PLANOS_LUMO[i].slice(0, PLANOS_LUMO[i].indexOf(' Every bottle'))), `C plano ${i + 1}: a cena de antes intacta até a embalagem`)
})
ok(/Medium shot|A close-up of the bamboo lid|sips water/.test(promptCurtoDoFilmeKling4(depois[1], STYLE)), 'C Kling 4: a AÇÃO do plano sobrevive com a ficha e o produto')
ok(depois.every((p) => comIdeiaNaCena(p, F) === p), 'C idempotente')
// Kling 4: o compactador de 512 mantém a pessoa (Identity:) e o produto (Product:) nos 3 planos
const k4 = depois.map((p) => promptCurtoDoFilmeKling4(p, STYLE))
ok(k4.every((t) => /Identity: a woman in her late twenties with short curly red hair and a mustard yellow sweater/.test(t) && /Product: the Lumo glass water bottle \(clear glass, bamboo lid\)/.test(t)), 'C Kling 4: Identity + Product nos 3 planos')
ok(k4.every((t) => !/one plain solid colour/.test(t) && t.endsWith('Mouth closed, no speaking.') && Array.from(t).length <= 512), 'C Kling 4: sem cor lisa, boca fechada no fim, ≤ 512')
ok(PLANOS_LUMO.every((p) => !promptCurtoDoFilmeKling4(p, STYLE).includes('Product:')), 'C Kling 4 sem a marca: nada de "Product:" (o de antes)')
// controles
for (const t of ['Make a video about the history of Rome.', 'A man walks his dog in the park.', 'Foggy cemetery at dawn; close-up of a single house key inside the pocket of a dark suit jacket (no face).', 'The story of a man named Qarun. Qarun lived during the time of Prophet Musa (Alehis Salam).'])
  ok(fichaDaIdeia(t) === null, `C controle sem ficha: "${t.slice(0, 50)}…"`)
ok(produtoDaIdeia('An old fisherman holding a brass lantern (dented, green glass) walks along the pier.') === 'a brass lantern (dented, green glass)', 'C sem marca: objeto MANUSEADO com parêntese descritivo')
ok(pessoaDaIdeia('A young blonde woman, approximately 25 years old, with natural makeup and a casual pastel pink outfit, in a modern home.') === 'a young blonde woman, approximately 25 years old, with natural makeup and a casual pastel pink outfit', 'C a leitura de vírgulas (24564d97) segue igual')
// a ficha inventada do mesmo papel vira a da ideia; nome próprio com a mesma descrição não duplica
ok(comIdeiaNaCena('Character in this shot: the woman, a woman in her thirties with wavy brown hair, wearing a dark blue jacket — clearly visible in frame. She smiles.', F).includes('the woman, a woman in her late twenties with short curly red hair and a mustard yellow sweater — clearly'), 'C a ficha inventada do papel "woman" é trocada pelas palavras da ideia')
const FR = fichaDaIdeia('Meet Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair. He hates his fridge.')
ok(comIdeiaNaCena('Named character in this shot: Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair — clearly visible in frame.', FR) === 'Named character in this shot: Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair — clearly visible in frame.', 'C a ficha que já diz as palavras da ideia não duplica')
ok(comIdeiaNaCena(PLANOS_LUMO[0], F, { semPessoa: true }).includes('The product shown is always this same one:') && !comIdeiaNaCena(PLANOS_LUMO[0], F, { semPessoa: true }).includes('same main character'), 'C [faceless]: só o produto')
ok(PLANOS_LUMO.every((p) => comIdeiaNaCena(p, null) === p), 'C sem ficha: byte a byte')

console.log('── interruptores e rota: cliente byte a byte ──')
ok(IDEIA_NA_FICHA === 'internal' && ELENCO_PROVA_DE_GENTE === 'internal', `padrões 'internal' (IDEIA_NA_FICHA=${IDEIA_NA_FICHA}, ELENCO_PROVA_DE_GENTE=${ELENCO_PROVA_DE_GENTE})`)
ok(ideiaNaFichaLigada('internal', false) === false && ideiaNaFichaLigada('internal', true) === true && ideiaNaFichaLigada('all', false) === true, 'ideiaNaFichaLigada: internal só a casa')
const rota = readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8')
ok(/const ideiaNaFicha = ideiaNaFichaLigada\(IDEIA_NA_FICHA, isInternalEmail\(user\.email\)\) \? fichaDaIdeia\(pedidoDoCliente, prompt\) : null/.test(rota), 'rota: a ficha da ideia só nasce na conta da casa')
ok(/const pessoaPedida = pessoaDoPedido\(pedidoDoCliente\) \?\? ideiaNaFicha\?\.pessoa \?\? null/.test(rota), 'rota: desligado, pessoaPedida é a de antes')
ok((rota.match(/if \(ideiaNaFicha && !qualidadeHerdada\)/g) ?? []).length === 2, 'rota: aplicada nas DUAS estradas (hollywood e clássica), nunca na qualidade herdada')
ok(rota.indexOf('comIdeiaNaCena(scene.prompt, ideiaNaFicha') > rota.indexOf('const aplicarQualidadeHollywood') && rota.indexOf('comIdeiaNaCena(classicScenePrompts[i], ideiaNaFicha') < rota.indexOf('KINEO-DRYRUN-CLASSICO-2026-09-12 — O VALIDADOR'), 'rota: antes do dry-run, do still e do clipe')
const fq = readFileSync('lib/cinematic/filmQuality.ts', 'utf8'), ee = readFileSync('lib/cinematic/elencoEpoca.ts', 'utf8')
ok(fq.includes("args.provaDeGente === true ? comSujeitoDaFala(p, args.falas[i] ?? '', [...elenco.map(f => f.nome), ...cast.relato.elenco.map(e => e.nome)], true) : comSujeitoDaFala(p, args.falas[i] ?? '', [...elenco.map(f => f.nome), ...cast.relato.elenco.map(e => e.nome)])"), 'B só com provaDeGente (a chave que a rota já liga pela conta da casa)')
ok(ee.includes('args.provaDeGente === true ? protagonistaSemNome(texto, epoca, infantil, true) : protagonistaSemNome(texto, epoca, infantil)'), 'A só com provaDeGente')

console.log('── mutantes ──')
const muta = async (arq, de, para, teste, rotulo) => {
  const src = readFileSync(arq, 'utf8')
  const mut = src.replace(de, para)
  if (mut === src) { ok(false, `mutante ${rotulo}: trecho ausente`); return }
  const tmp = resolve(arq.replace(/\.ts$/, `.mutante-1211c-${Math.random().toString(36).slice(2, 7)}.ts`))
  writeFileSync(tmp, mut)
  try { const M = await import(pathToFileURL(tmp).href); ok(!teste(M), `mutante ${rotulo} reprova`) } finally { unlinkSync(tmp) }
}
await muta('lib/cinematic/elencoEpoca.ts', 'if (!REGENCIA_DE_REFERENCIA_RE.test(', 'if (true || !REGENCIA_DE_REFERENCIA_RE.test(', (M) => M.protagonistaSemNome(JONATHAN, null, false, true) === null, 'A sem a regência')
await muta('lib/cinematic/filmQuality.ts', 'if (referenciaNaoESujeito && REFERENCIA_NAO_SUJEITO_1211.has(anterior.toLowerCase())) continue', '', (M) => J(M.sujeitosDaFala(FALA_B, true)) === '[]', 'B sem a regra')
await muta('lib/cinematic/ideiaNaFicha.ts', 'const lida = pessoaDoPedido(comVirgulas(texto))', 'const lida = pessoaDoPedido(texto)', (M) => !!M.pessoaDaIdeia(IDEIA_LUMO), 'C sem separar os complementos')
await muta('lib/cinematic/ideiaNaFicha.ts', 'MANUSEIA_RE.test(texto.slice', 'true || MANUSEIA_RE.test(texto.slice', (M) => M.fichaDaIdeia('Foggy cemetery at dawn; close-up of a single house key inside the pocket of a dark suit jacket (no face).') === null && M.produtoDaIdeia('A cave with a dark suit jacket (old wool) on a hook.') === null, 'C produto sem o verbo de manusear')

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
