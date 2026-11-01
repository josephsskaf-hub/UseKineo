// KINEO-NARRADOR-DESCRICAO-0111 — guardião do pedido do revisor de 31/10 (Kling 4 grátis, 1º filme da pessoa, nota 5): o texto
// era a DESCRIÇÃO de uma imagem ("A child skillfully and enthusiastically crafts a colorful 3D car, surrounded by…") e o
// narrador a leu palavra por palavra. Agora a descrição vira a IDEIA do escritor (história narrada) e a imagem das cenas;
// narração de verdade (fato, história, roteiro marcado) continua intocada.
// Rodar: npx tsx scripts/test-narrador-descricao-0111.mts
import fs from 'node:fs'
import { detectPastedScript, notaDeDescricaoDeCena, isSceneDescription, leuADescricaoEmVozAlta, temaDaDescricao, semMolduraDoCondensar, SCENE_DESCRIPTION_RULE } from '../lib/pastedScript'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const nota = (t: string) => { const n = notaDeDescricaoDeCena(t); return `nota ${n.nota}, fortes ${n.fortes} [${n.sinais.join(' ')}]` }

// (1) descrições de imagem — DEVEM ser detectadas
const CRIANCA = 'A child skillfully and enthusiastically crafts a colorful 3D car, surrounded by their vibrant creations. The table showcases an impressive 3D dinosaur and a charming house, inspiring further imaginative creativity.'
const DESCRICOES: [string, string][] = [
  ['o caso do revisor (criança + carro 3D)', CRIANCA],
  ['plano de câmera (close-up, golden hour, 4k)', 'Close-up of an old fisherman mending his net at golden hour, cinematic lighting, shallow depth of field, 4k.'],
  ['cabana aconchegante (etiquetas de prompt)', 'A cozy cabin in a snowy forest at night, warm light glowing from the windows, smoke rising from the chimney, magical atmosphere.'],
  ['pt: menina pintando arco-íris', 'Uma menina sorridente pinta um arco-íris colorido em uma parede, cercada por flores vibrantes e borboletas encantadoras, luz suave do fim de tarde.'],
  ['es: niño con castillo de arena', 'Un niño feliz construye un castillo de arena en la playa, rodeado de conchas brillantes, iluminación cinematográfica.'],
]
for (const [nome, t] of DESCRICOES) {
  ok(isSceneDescription(t), `(1) descrição detectada: ${nome} — ${nota(t)}`)
  const d = detectPastedScript(t)
  ok(d.reason === 'scene_description' && d.pasted === false, `(1) detectPastedScript → scene_description, não colado: ${nome}`)
}
// a descrição chega embrulhada pelo "Condense this whole story…" do escritor no servidor (texto longo no filme curto)
const embrulhada = `Condense this whole story into a 15-second film of at most 45 spoken words — keep its beginning, its key facts and its ending; never cut it off midway:\n[${CRIANCA}]`
ok(semMolduraDoCondensar(embrulhada) === CRIANCA, '(1) a moldura do condensar sai antes de avaliar')
ok(isSceneDescription(embrulhada), '(1) descrição embrulhada pelo condensar continua detectada')
ok(isSceneDescription('Sure! Here is your prompt: ' + CRIANCA), '(1) descrição atrás de preâmbulo de chat continua detectada')

// (2) narrações de verdade — NUNCA detectadas
const NARRACOES: [string, string][] = [
  ['C-54 no Yukon (1950)', 'In 1950, a C-54 Skymaster disappeared over the Yukon wilderness. All 44 passengers were never seen again.'],
  ['Amazonas (presente documental)', 'The Amazon river carries more water than the next seven rivers combined.'],
  ['pt: Terra bola de neve', 'Imagine acordar e descobrir que todo o planeta está coberto de gelo. Entre 720 e 635 milhões de anos atrás, a Terra congelou completamente.'],
  ['roteiro marcado HOOK/PAYOFF', 'HOOK: [Pexels: frozen ocean aerial] The whole planet once froze solid.\nMICRO REWARD 1: [Pexels: glacier cracking] Ice reached the equator.\nPAYOFF: [Pexels: volcano erupting] Volcanoes saved us... by pumping out carbon for ten million years.'],
  ['águia (fato com enfeite e composição)', 'A majestic eagle soars above the snowy mountains, surrounded by clouds. It can spot a rabbit from two miles away.'],
  ['pescador (história no presente)', 'A young fisherman walks into the sea every morning. One day, he finds a bottle with a map inside. He follows it to an island no one has ever seen.'],
  ['Leningrado ("surrounded by" em fato histórico)', 'In 1943, the city of Leningrad was surrounded by German troops for 872 days.'],
  ['golfinho rosa (adjetivo bonito sozinho)', 'Deep in the Amazon, a stunning pink river dolphin glides through the dark water. Locals believe it can turn into a man at night.'],
  ['Muralha da China', 'The Great Wall of China is not visible from space with the naked eye. Astronauts have confirmed it again and again.'],
  ['es: historia narrada', 'En 1912, el Titanic se hundió en su viaje inaugural. Más de 1.500 personas murieron en el Atlántico Norte.'],
  ['onça (natureza com "surrounded by" e "soft light")', 'Deep in the rainforest, a jaguar waits in the shadows, surrounded by towering trees. Its spotted coat glows in the soft light of dawn. Then, without a sound, it strikes — and the river goes still.'],
  ['urso polar (presente com composição)', 'A lonely polar bear drifts on a melting ice floe, surrounded by endless dark water. Its home is disappearing faster than anyone predicted.'],
  ['ideia curta de uma linha','the history of the Roman empire'],
  ['diálogo', 'Motu: Chutki, is Bheem home?\nChutki: He went to the market with Raju.'],
]
for (const [nome, t] of NARRACOES) {
  ok(!isSceneDescription(t), `(2) narração NÃO é descrição: ${nome} — ${nota(t)}`)
  ok(detectPastedScript(t).reason !== 'scene_description', `(2) detectPastedScript não muda de rota: ${nome}`)
}

// (3) o escritor recebe a regra e a pergunta certas; o roteiro que lê a descrição é reprovado
ok(/NOT NARRATION/.test(SCENE_DESCRIPTION_RULE) && /\[Pexels: …\] cue MUST show the described subject/.test(SCENE_DESCRIPTION_RULE), '(3) regra: não é narração + toda pista [Pexels] mostra o sujeito descrito')
ok(/FIDELITY rule applies to the SUBJECT/.test(SCENE_DESCRIPTION_RULE), '(3) regra: a fidelidade vale para o sujeito, não para as palavras')
ok(temaDaDescricao(embrulhada).endsWith(CRIANCA) && /should SEE/.test(temaDaDescricao(CRIANCA)), '(3) tema do escritor: o miolo da descrição, sem moldura, com "should SEE"')
const roteiroRuim = 'HOOK: [Pexels: child building toy car] A child skillfully and enthusiastically crafts a colorful 3D car.\nPAYOFF: [Pexels: child smiling] The child proudly admires their imaginative work, which serves as a testament to their creativity.'
const roteiroBom = 'HOOK: [Pexels: child building colorful toy car] Leo is seven, and his car keeps falling apart.\nMICRO REWARD 1: [Pexels: child gluing toy car wheels] He tries tape. Then glue. Then his grandma\'s old buttons.\nPAYOFF: [Pexels: child racing toy car on table] The button wheels hold... and his car finally races past the dinosaur.'
ok(leuADescricaoEmVozAlta(roteiroRuim, CRIANCA), '(3) roteiro que repete a descrição (o do revisor) é pego')
ok(!leuADescricaoEmVozAlta(roteiroBom, CRIANCA), '(3) roteiro com história própria passa')

// (4) a rota do escritor usa a regra (fonte única do modo IA no cliente E do escritor no servidor, inclusive o Kling 4 grátis)
const gs = rd('app/api/generate-script/route.ts')
ok(gs.includes("colado.reason === 'scene_description' ? `\\n\\n${SCENE_DESCRIPTION_RULE}`"), '(4) generate-script: a regra entra no prompt do escritor')
ok(gs.includes("colado.reason === 'scene_description' ? temaDaDescricao(topic)"), '(4) generate-script: o tema vira a pergunta da descrição')
ok(gs.includes('leuADescricaoEmVozAlta(script, topic)'), '(4) generate-script: roteiro que leu a descrição regenera uma vez')
const ide = rd('lib/meta95/ideiaNoEscritor.ts')
ok(/escritor\(\{ topic: tema\.tema/.test(ide), '(4) escritor no servidor (ideia solta, inclusive o filme grátis) chama o mesmo /api/generate-script')

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail > 0) process.exit(1)
