// KINEO-LUGAR-DA-FALA-1411 · KINEO-COMENTARIO-NAO-E-CENA-1411 [CEO 14/11 09:50, dry-runs ao vivo do Racetrack e da Earhart] — guardião.
// Prova OFFLINE, EXECUTANDO o código real, com os textos REAIS (claim do a7def2bc, pago das 04:16; claim do 39c5cc92; dry-run de 14/11):
//   (B) a frase do lugar para na pontuação do ROTEIRO (Earhart: "the open sea Near that island" some); o Racetrack ganha o leito seco pela
//       FALA (o nome próprio "Death Valley" não conta contra o "dry lakebed"; o árido aceita a vírgula); os irmãos Sullivan (77c923a8, que o
//       ensaio pegou) continuam sem lugar; desligado = byte a byte o de antes;
//   (C) a oração de comentário do planejador ("…hints at the mystery of Amelia Earhart's disappearance", "…of her disappearance") não põe
//       a Amelia na ilha: a cena fica sem gente; o texto do plano não muda; objeto e "suggesting" literal seguem iguais; (M) mutantes vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const PED = 'lib/cinematic/pessoaDoPedido.ts', AJ = 'lib/cinematic/personagemAjuste.ts', FOLHA = 'lib/cinematic/folhaDePersonagem.ts', COM = 'lib/cinematic/sceneStyle.ts', ST = 'lib/cinematic/sceneStyle.ts'
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const carrega = (mutar = null, arq = PED) => createOfflineLoader({ globals: { AbortController, setTimeout, clearTimeout }, source: (rel, text) => (mutar && rel === arq ? mutar(lf(text)) : text) })

const EAR = 'July 2, 1937. Amelia Earhart wears a brown leather flight jacket and goggles over her short curly hair. She climbs into her silver twin-engine plane in New Guinea. Ten young mechanics in grey overalls push the plane onto the runway. Her next stop is Howland Island, a tiny empty strip of sand in the open sea. Near that island, her radio goes silent. Amelia Earhart is never found.'
const EAR_FALAS = ['July 2 1937 Amelia Earhart wears a brown leather flight jacket and goggles over her short curly hair', 'She climbs into her silver twin-engine plane in New Guinea Ten young mechanics in grey overalls push the plane onto the runway', 'Her next stop is Howland Island a tiny empty strip of sand in the open sea Near that island her radio goes silent', 'Amelia Earhart is never found']
const RAC = 'Rocks in Death Valley move by themselves. On an empty, dry lakebed called Racetrack Playa, heavy stones sit at the end of long, curving trails in the cracked mud. In December of twenty thirteen, time-lapse cameras finally caught them moving. After a rare rain, a thin sheet of ice forms on the shallow water. The morning sun breaks the ice into wide floating panels. A light breeze pushes the panels, and the panels push the rocks. Would you have guessed ice? Follow for more.'
const RAC_FALAS = ['Rocks in Death Valley move by themselves On an empty dry lakebed called Racetrack Playa heavy stones sit at the end of long curving', 'In December of twenty thirteen time-lapse cameras finally caught them moving', 'After a rare rain a thin sheet of ice forms on the shallow water The morning sun breaks the ice into wide floating panels', 'A light breeze pushes the panels and the panels push the rocks Would you have guessed ice Follow for more']
// os planos do 2º dry-run (09:36): nenhum diz "lakebed"; só o nome próprio "Racetrack Playa"
const RAC_PLANOS = ['A wide shot of Racetrack Playa, showcasing heavy stones resting at the end of long, curving trails in the cracked mud.', 'A wide shot of Racetrack Playa in December, showing heavy stones poised for movement under a bright sun.', 'A close-up of a thin sheet of ice forming on shallow water, sunlight glinting off the surface as it fractures into wide floating panels.', 'A wide shot of ice panels floating on shallow water, with a light breeze visibly pushing them, causing heavy stones to shift.']
const SULLIVAN = 'Why did five brothers die on one ship? On November thirteenth, nineteen forty-two, the cruiser USS Juneau was fighting off Guadalcanal when a Japanese torpedo hit her. On board were George, Francis, Joseph, Madison and Albert Sullivan. They had joined the Navy together after Pearl Harbor, and they made one demand: keep us on the same ship. In the open ocean, one by one, all five were lost. In January, a Navy officer walked up to their parents\' door in Iowa.'
const rota = (m, pedido, falas, planos) => { const p = m.lugarDoPedido(pedido); if (p) return 'P:' + p; const c = m.lugarDasCenas(falas, pedido) ?? m.lugarAridoDosPlanos(planos); return c ? 'F:' + c : null }

function provasB(L) {
  const erros = []
  const m = L(PED)
  if (rota(m, EAR, EAR_FALAS, ['Aerial shot of Howland Island.']) !== null) erros.push('B Earhart ganhou lugar: ' + rota(m, EAR, EAR_FALAS, []))
  if (m.lugarDasCenas(EAR_FALAS, EAR) !== null) erros.push('B a frase do lugar atravessou o ponto do roteiro')
  if (rota(m, RAC, RAC_FALAS, RAC_PLANOS) !== 'P:an empty, dry lakebed') erros.push('B Racetrack: ' + rota(m, RAC, RAC_FALAS, RAC_PLANOS))
  if (m.lugarDoPedido(SULLIVAN) !== null) erros.push('B Sullivans: "Pearl Harbor" saiu da conta e o navio virou o lugar do filme: ' + m.lugarDoPedido(SULLIVAN))
  if (m.comPontuacaoDoRoteiro(EAR_FALAS[2], EAR).replace(/\s+/g, ' ') !== 'Her next stop is Howland Island, a tiny empty strip of sand in the open sea. Near that island, her radio goes silent') erros.push('B a fala não voltou com a pontuação do roteiro: ' + m.comPontuacaoDoRoteiro(EAR_FALAS[2], EAR))
  if (m.comPontuacaoDoRoteiro('A wide shot of a desert', EAR) !== 'A wide shot of a desert') erros.push('B fala que o roteiro não tem mudou')
  const BOBBIE = 'This lost dog found his own way home. Bobbie the dog is a shaggy two-year-old collie mix. In August 1923, on a family car trip in Indiana, Bobbie goes missing. His family drives home to Silverton, Oregon, with an empty back seat. Six months later, in February 1924, Bobbie limps up to their front door in Silverton, skinny, his paws worn to the bone.'
  if (m.lugarDoPedido(BOBBIE) !== null) erros.push('B (iv) Bobbie: "a family car trip" virou o lugar do filme: ' + m.lugarDoPedido(BOBBIE))
  if (m.lugarDoPedido('Midnight ride on the last bus. At every stop, another passenger vanishes.') !== 'the last bus' || m.lugarDoPedido('She waits at the bus stop in the rain.') !== 'the bus stop' || m.lugarDoPedido('He sleeps in the hospital room.') !== 'the hospital room') erros.push('B (iv) o ônibus e o ponto de ônibus deixaram de ser lugar')
  if (m.lugarDasCenas(['A girl reads in the cold, rain-soaked street.', 'She sleeps.']) !== null) erros.push('B a vírgula entrou para lugar que não é árido')
  if (m.lugarDoPedido('A man drinks coffee at a stylish Johannesburg coffee shop.') !== 'a stylish Johannesburg coffee shop') erros.push('B o lugar de sempre mudou')
  return erros
}
function provasC(L) {
  const erros = []
  const F = L(FOLHA), A = L(AJ)
  const elenco = F.elencoDeterministico(EAR, true)
  const base = ['A close-up of Amelia Earhart in a brown leather flight jacket and goggles, short curly hair.', 'Ten young mechanics in grey overalls push a silver twin-engine plane onto the runway in New Guinea.']
  for (const fim of ["of Amelia Earhart's disappearance", 'of her disappearance']) {
    const ilha = `Aerial shot of Howland Island, a tiny strip of sand surrounded by vast, empty ocean, with a stillness that hints at the mystery ${fim}.`
    const visuals = [...base, ilha, 'A radio on a desk, static on the dial.']
    const r = A.ajustarPromptsDoElenco({ prompts: visuals, visuals, falas: EAR_FALAS, elenco })
    if (!r.semGente.includes(3) || r.cenas[2].nomes.length) erros.push(`C a ilha ("${fim}") ganhou gente: ${JSON.stringify(r.cenas[2])}`)
    if (!r.prompts[2].startsWith(ilha.replace(/\.$/, ''))) erros.push('C o texto do plano mudou')
    if (A.cenasDoElenco(visuals, EAR_FALAS, elenco)[0].nomes.join() !== elenco[0].nome) erros.push('C a cena 1 (a Amelia de verdade) perdeu a ficha')
  }
  // objeto do elenco segue como sempre; "suggesting" literal não é comentário
  const obj = [{ nome: 'Mona Lisa', nucleo: 'Mona Lisa', tipo: 'objeto', canonica: 'Mona Lisa, a small portrait', origem: 'deterministica', protagonista: true, genero: null }]
  if (A.cenasDoElenco(['A dusty trunk in a dim room, the lid ajar, hinting at the hidden Mona Lisa.'], ['The painting is in the trunk.'], obj)[0].nomes.join() !== 'Mona Lisa') erros.push('C o objeto saiu da cena')
  if (L(COM).foraDoComentario('He stares at the smart fridge suggesting kale, his brow furrowed.') !== 'He stares at the smart fridge suggesting kale, his brow furrowed.') erros.push('C "suggesting" literal virou comentário')
  // v2 [bloqueio do revisor 14/11 10:22]: plano COM gente fora do comentário fica igual à base — os 5 do revisor e o ator
  const GENTE5 = ['A parade in honor of the returning soldiers, who march past the crowd.', 'A military band plays in honor of the veterans.', 'Fireworks burst in honor of the astronauts as families cheer below.', 'A ceremony in honor of the fallen sailors on the deck.', 'A statue symbolizing the miners who died, workers laying flowers at its base.']
  for (const g of GENTE5) {
    const visuals = [base[0], base[1], g, 'A radio on a desk, static on the dial.']
    const r = A.ajustarPromptsDoElenco({ prompts: visuals, visuals, falas: EAR_FALAS, elenco })
    if (r.semGente.includes(3) || r.prompts[2].includes('No people')) erros.push('C v2 plano com gente virou "sem gente": ' + g)
  }
  const ator = 'An actor evoking Amelia Earhart walks on stage.'
  if (!A.cenasDoElenco([base[0], base[1], ator, 'x'], EAR_FALAS, elenco)[2].nomes.includes(elenco[0].nome)) erros.push('C v2 "An actor evoking …" perdeu a ficha')
  // a sceneStyle (buildStoryScenePrompt) lê igual: a ilha sem ficha; o ator com ficha
  const S = L(ST), anc = S.deriveStyleAnchor('photorealistic')
  if (S.buildStoryScenePrompt("Aerial shot of Howland Island, empty ocean, with a stillness that hints at the mystery of Amelia Earhart's disappearance.", anc, elenco[0].canonica).includes('consistent design')) erros.push('C v2 a sceneStyle ainda põe a ficha na ilha')
  if (!S.buildStoryScenePrompt(ator, anc, elenco[0].canonica).includes('consistent design')) erros.push('C v2 a sceneStyle tirou a ficha do ator')
  return erros
}

const b = provasB(carrega()), c = provasC(carrega())
checa(`B verde nos textos reais${b.length ? ': ' + b.join(' · ') : ''}`, b.length === 0)
checa(`C verde no plano real da ilha${c.length ? ': ' + c.join(' · ') : ''}`, c.length === 0)
{
  const m = carrega((s) => s.replace("export const LUGAR_DA_FALA_1411: ModoLugarDoRoteiro = 'all'", "export const LUGAR_DA_FALA_1411: ModoLugarDoRoteiro = 'off'"))(PED)
  checa('B desligado: a Earhart volta a "the open sea Near that island" e o Racetrack a null (o de antes)', m.lugarDasCenas(EAR_FALAS, EAR) === 'the open sea Near that island' && m.lugarDoPedido(RAC) === null)
  const A = carrega((s) => s.replace("export const COMENTARIO_NAO_E_CENA_1411: ModoComentarioNaoECena = 'all'", "export const COMENTARIO_NAO_E_CENA_1411: ModoComentarioNaoECena = 'off'"), COM)
  const F = A('lib/cinematic/folhaDePersonagem.ts'), Aj = A(AJ)
  const v = ['x', 'y', "Aerial shot of Howland Island, with a stillness that hints at the mystery of Amelia Earhart's disappearance."]
  checa('C desligado: a ilha volta a citar a Amelia (o de antes)', Aj.cenasDoElenco(v, EAR_FALAS, F.elencoDeterministico(EAR, true))[2].nomes.length === 1)
}
const rotaTxt = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
checa('B a rota passa o roteiro colado (pedidoDoCliente) a lugarDasCenas', rotaTxt.includes('lugarDasCenas(scenes.map((s) => s.description), pedidoDoCliente /* KINEO-LUGAR-DA-FALA-1411'))
const MUTANTES = [
  [PED, provasB, 'B a frase do lugar não volta ao roteiro', (s) => s.replace('    const tp = comPontuacaoDoRoteiro(t, roteiro)', '    const tp = t')],
  [PED, provasB, 'B nome próprio conta contra o árido', (s) => s.replace('  if (nomeProprioComComum(t, m) || lugarDeModificador(t, m)) return true', '  if (lugarDeModificador(t, m)) return true')],
  [PED, provasB, 'B nome próprio sai contra QUALQUER lugar (os Sullivans)', (s) => s.replace(" && tipoDoLugar(o[0]) === 'desert')", ')')],
  [PED, provasB, 'B a vírgula vale para todo lugar', (s) => s.replace("{0,4}?(?:desert|${LUGAR_ARIDO_1411}))(?![\\\\p{L}])`, 'iu')", "{0,4}?${LUGAR_NOME_1411})(?![\\\\p{L}])`, 'iu')")],
  [PED, provasB, 'B (iv) "car trip" volta a ser lugar', (s) => s.replace('  if (nomeProprioComComum(t, m) || lugarDeModificador(t, m)) return true', '  if (nomeProprioComComum(t, m)) return true').replace("for (const m of t.matchAll(new RegExp(lugarRe().source, 'giu'))) if (!lugarDeModificador(t, m)) return comParteDoLugar(t, m)", "for (const m of t.matchAll(new RegExp(lugarRe().source, 'giu'))) return comParteDoLugar(t, m)")],
  [AJ, provasC, 'C o comentário volta a pôr gente', (s) => s.replace('  if (!cru && comentarioNaoECenaLigado()) return cenasSemCitacaoDoComentario(visuals, falas, elenco)', '')],
  [AJ, provasC, 'C o "her" do comentário volta a contar', (s) => s.replace("const vDaCena = comentarioNaoECenaLigado() ? planoDoQuadro(args.visuals[i] ?? '', args.elenco) : args.visuals[i] ?? ''", "const vDaCena = args.visuals[i] ?? ''")],
  [AJ, provasC, 'C o comentário vale para objeto também', (s) => s.replace("const gente = (n: string) => elenco.find((e) => e.nome === n)?.tipo === 'humano'", 'const gente = (n: string) => true')],
  [COM, provasC, 'C "suggesting" entra como comentário', (s) => s.replace('|allud(?:e|es|ed|ing)\\s+to)', '|allud(?:e|es|ed|ing)\\s+to|suggesting)')],
  [COM, provasC, 'C v2 o comentário vale mesmo com gente fora dele (o bloqueio)', (s) => s.replace('  if (fora === v || mostraAlguem(fora)) return v', '  if (fora === v) return v')],
  [COM, provasC, 'C v2 o comentário inteiro sai (a v1, que tirava os soldados)', (s) => s.replace("  return v.replace(COMENTARIO_RE, (c) => (nomeRe ? c.replace(nomeRe, '') : c).replace(PRONOME_RE, ''))", '  return fora')],
  [ST, provasC, 'C v2 a sceneStyle ignora o comentário', (s) => s.replace('mentionsStoryCharacter(vQuem, character)', 'mentionsStoryCharacter(v, character)')],
  [PED, provasB, 'B (vi) a parte do lugar fica fora ("the bus")', (s) => s.replace('if (!lugarDeModificador(t, m)) return comParteDoLugar(t, m)', 'if (!lugarDeModificador(t, m)) return m')],
]
for (const [arq, prova, nome, fn] of MUTANTES) {
  const src = lf(fs.readFileSync(arq, 'utf8'))
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = prova(carrega(fn, arq)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
