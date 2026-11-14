// KINEO-QUEM-ESTA-NA-CENA-1411 [CEO 14/11, Earhart refeita 72f3b718: homem de chapéu na ilha, outra mulher na cena dos navios, Amelia sem ficha] — guardião.
// Prova OFFLINE, EXECUTANDO o código real (lib/cinematic/personagemAjuste: cenasDoElenco e ajustarPromptsDoElenco, que alimentam o prompt, o still e a
// trava de elenco), com os planos e as falas REAIS:
//   (A) Earhart 72f3b718: a ilha e os navios ("no other objects or people") são marcados sem gente; a cena dos navios não recebe a Amelia da narração;
//       a cena 2 ("Amelia climbs…") casa a Amelia Earhart pelo primeiro nome; o prompt já marcado não ganha ninguém numa passada seguinte (a trava);
//   (B) Earhart 9a8cc918: "their silhouettes visible against the waves… as they comb the waters" (os navios) não põe a Amelia;
//   (C) quem o plano MOSTRA continua: "a fisherman… no other people around", "two soldiers… deserted street", a mão com o rabo "no people", a
//       silhueta de uma mulher, "silhouettes of soldiers", "no cars but many people walking";
//   (D) o primeiro nome só casa quando é só daquela ficha e está sozinho: "Amelia Johnson" é outra pessoa, "John" de dois Johns não casa, título não casa;
//   (E) os casos que o ensaio no corpus de 30 dias achou: "the empty space where the crew once stood" (Mary Celeste) não é gente; as 5 cenas que
//       passam a ser marcadas; (F) interruptor 'off' = o de antes (a ilha sem marca, a Amelia nos navios); (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const FO = 'lib/cinematic/folhaDePersonagem.ts', AJ = 'lib/cinematic/personagemAjuste.ts', EP = 'lib/cinematic/elencoEpoca.ts'
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const carrega = (mutar = null, arq = FO) => createOfflineLoader({ globals: { AbortController, setTimeout, clearTimeout }, source: (rel, text) => (mutar && rel === arq ? mutar(lf(text)) : text) })
const DESLIGA = (s) => s.replace("export const QUEM_ESTA_NA_CENA_1411: ModoQuemEstaNaCena = 'all'", "export const QUEM_ESTA_NA_CENA_1411: ModoQuemEstaNaCena = 'off'")

// os planos e as falas reais (cinematic_submission_claim de 72f3b718 e 9a8cc918, 14/11)
const VIS = [
  'Close-up of Amelia Earhart, her short curly hair peeking from under brown leather goggles, wearing a flight jacket, determined expression.',
  'Amelia climbs into her sleek silver twin-engine plane, surrounded by ten young mechanics in grey overalls, pushing it onto the runway under a bright sky.',
  'Wide shot of Howland Island, a tiny empty strip of sand in the open sea, with no other objects or people.',
  'Aerial view of navy ships and planes searching the ocean, emphasizing the vast emptiness of the sea, no other objects or people.',
]
const FALAS = ['July 2 1937 Amelia Earhart wears a brown leather flight jacket and goggles over her short curly hair', 'She climbs into her silver twin-engine plane in New Guinea Ten young mechanics in grey overalls push the plane onto the runway', 'Her next stop is Howland Island a tiny empty strip of sand in the open sea Near that island her radio goes silent', 'Navy ships and planes search the ocean for two weeks No trace was ever found Where did Amelia Earhart go Follow for more lost']
const NAVIOS_9A8 = 'Navy ships and planes search the ocean, their silhouettes visible against the waves, conveying urgency and mystery as they comb the vast waters.'
const ELENCO = [
  { nome: 'Amelia Earhart', nucleo: 'Amelia Earhart', tipo: 'humano', origem: 'autor', canonica: 'Amelia Earhart, exactly as the author wrote: "Amelia Earhart wears a brown leather flight jacket and goggles over her short curly hair"; a real person', protagonista: true, genero: null },
  { nome: 'the young mechanics', nucleo: 'young mechanics', tipo: 'humano', origem: 'autor', canonica: 'the young mechanics, exactly as the author wrote: "young mechanics in grey overalls push the plane onto the runway"', protagonista: false, genero: null },
]
const PERF = ', characters act naturally within the scene without addressing the viewer'
const nomes = (A, vis, falas, elenco = ELENCO) => A.cenasDoElenco(vis, falas, elenco).map((c) => c.nomes)

function provas(L) {
  const erros = []
  const A = L(AJ)
  // (A)
  const n = nomes(A, VIS, FALAS)
  if (n[3].includes('Amelia Earhart')) erros.push('A a cena dos navios recebeu a Amelia da narração')
  if (!n[1].includes('Amelia Earhart') || !n[1].includes('the young mechanics')) erros.push('A a cena 2 ("Amelia climbs") não casou a Amelia Earhart e os mecânicos: ' + n[1])
  if (!n[0].includes('Amelia Earhart')) erros.push('A a abertura perdeu a Amelia')
  const r = A.ajustarPromptsDoElenco({ prompts: VIS.map((v) => `photorealistic. ${v} 9:16 vertical framing${PERF}`), visuals: VIS, falas: FALAS, elenco: ELENCO })
  if (JSON.stringify(r.semGente) !== '[3,4]') erros.push('A as marcadas sem gente deviam ser [3,4]: ' + JSON.stringify(r.semGente))
  for (const k of [2, 3]) if (r.prompts[k].includes(PERF.trim().slice(1).trim()) || !r.prompts[k].includes('No people, no human figures and no faces anywhere in this shot.')) erros.push(`A cena ${k + 1} marcada ainda tem frase de gente ou ficou sem a marca`)
  // a trava e a ficha garantida passam de novo pelos prompts prontos: o já marcado não ganha ninguém
  const depois = nomes(A, r.prompts, FALAS)
  if (depois[2].length || depois[3].length) erros.push('A o prompt marcado ganhou gente na passada seguinte: ' + JSON.stringify(depois))
  // o plano marcado que ainda tem um pronome ("where her plane vanished") não ganha a pessoa da fala na passada seguinte
  if (nomes(A, ['A lone palm tree on the empty beach where her plane vanished. No people, no human figures and no faces anywhere in this shot.'], [FALAS[3]])[0].length) erros.push('A o prompt marcado com pronome ganhou a pessoa da narração')
  // (B)
  if (nomes(A, [VIS[0], NAVIOS_9A8], [FALAS[0], FALAS[3]])[1].includes('Amelia Earhart')) erros.push('B "their silhouettes… as they comb" (os navios) pôs a Amelia')
  // (C)
  for (const t of ['A fisherman stands alone on the pier, no other people around.', 'Two soldiers walk through the deserted street.', 'A close-up of a hand trembling over a smartphone, no other characters, no animals, no people, no added props', 'The silhouette of a woman against the window.', 'Silhouettes of soldiers on the ridge.', 'A street with no cars but many people walking.']) if (!A.visualMostraAlguem(t)) erros.push('C sumiu quem o plano mostra: ' + t)
  // (D)
  const AMELIA = [ELENCO[0]]
  if (nomes(A, ['Amelia Johnson waves from the dock.'], [''], AMELIA)[0].length || nomes(A, ['Carol Earhart waves from the dock.'], [''], AMELIA)[0].length) erros.push('D "Amelia Johnson" / "Carol Earhart" casou a Amelia Earhart')
  if (!nomes(A, ['Earhart checks the radio.'], [''], AMELIA)[0].length) erros.push('D o sobrenome sozinho não casou')
  const JOHNS = [{ ...ELENCO[0], nome: 'John Smith', nucleo: 'John Smith' }, { ...ELENCO[0], nome: 'John Doe', nucleo: 'John Doe', protagonista: false }]
  if (nomes(A, ['John opens the door.'], [''], JOHNS)[0].length) erros.push('D "John" de dois Johns casou alguém')
  if (nomes(A, ['Captain waves at the crowd.'], [''], [{ ...ELENCO[0], nome: 'Captain Briggs', nucleo: 'Captain Briggs' }])[0].length) erros.push('D o título ("Captain") casou sozinho')
  // (E)
  if ((t => A.visualMostraAlguem(t) || A.visualTemGenteDePapel(t))('Wide shot of the deserted deck of the Mary Celeste, sails fully raised, the sun casting long shadows on the empty space where the crew once stood.')) erros.push('E "where the crew once stood" virou gente no plano')
  for (const t of ['Wide shot from a ship\'s deck showing bright flames falling from the sky, with silhouettes of six planes in the distance and the ocean below.', 'A serene view of the vast ocean, waves gently rolling under a bright sky, with a distant silhouette of the Galápagos Islands on the horizon.', 'Hopeful shot of the ocean horizon at sunset, with a silhouette of the whale breaching the surface, symbolizing their potential return by twenty twenty-eight.']) if (A.visualMostraAlguem(t)) erros.push('E silhueta de coisa virou gente: ' + t.slice(0, 60))
  // (G) v2 [bloqueio do revisor e da CEO 14/11] — a silhueta de GENTE continua gente (na v1 sumiam); só sai a de coisa PROVADA
  const SILHUETAS_DE_GENTE = ['Silhouettes of dancers move behind the curtain.', 'silhouettes of fishermen hauling nets at dawn', 'silhouettes of riders on the ridge', 'silhouettes of monks walking in line', 'silhouettes of workers on the scaffolding', 'silhouettes of kids playing football', 'The silhouettes of two lovers on the bridge.', 'Their silhouettes dance on the wall.', 'Two lovers walk on the bridge, their silhouettes against the sunset.']
  for (const t of SILHUETAS_DE_GENTE) if (!A.visualMostraAlguem(t)) erros.push('G silhueta de gente sumiu: ' + t)
  // a negação só tira a frase negada: quem vem depois do "but/except" segue no texto e no plano; "not a single person" é negação
  if (!A.visualTemGenteDePapel('Nobody but the captain remains on deck.') || !A.visualMostraAlguem('There are no people on the street except an old man with a cane.')) erros.push('G a negação com exceção apagou quem está no plano')
  if (A.visualMostraAlguem('Not a single person on the pier, only gulls.')) erros.push('G "not a single person" não é negação')
  // (H) v2 — o primeiro nome só em papel de pessoa, nunca palavra comum, data, posse de coisa ou uso atributivo
  const FALSOS = [['Rose petals fall on the empty table.', 'Rose Kennedy'], ['Will the storm pass before dawn?', 'Will Rogers'], ['June 2, 1937: the hangar is silent.', 'June Carter'], ['In June the rains came.', 'June Carter'], ['May 1937, an empty harbor.', 'May Welland'], ['Grace fills the empty room.', 'Grace Kelly'], ['Hope fades over the sea.', 'Hope Lange'], ['A Bill of sale lies on the desk.', 'Bill Smith'], ["Earhart's silver plane sits alone on the runway.", 'Amelia Earhart'], ['The Earhart search ends.', 'Amelia Earhart'], ['Amelia, Iowa, is a small town.', 'Amelia Earhart'], ['Rose climbs the old garden trellis.', 'Rose Kennedy']]
  for (const [v, nome] of FALSOS) if (nomes(A, [v], [''], [{ ...ELENCO[0], nome, nucleo: nome }])[0].length) erros.push(`H "${v}" casou ${nome}`)
  const CERTOS = [['Amelia climbs into her plane.', 'Amelia Earhart'], ['Then Amelia slowly waves goodbye.', 'Amelia Earhart'], ["Mara's hands grip the crank.", 'Mara Lindqvist'], ['Roland, the inventor, glares at the fridge.', 'Roland Oznard']]
  for (const [v, nome] of CERTOS) if (!nomes(A, [v], [''], [{ ...ELENCO[0], nome, nucleo: nome }])[0].length) erros.push(`H "${v}" não casou ${nome}`)
  // (I) v2 — PELA ROTA: o ajuste marca e a camada de época (aplicarElencoEEpoca) não tira a marca nem põe a Amelia que a fala cita
  const E = L(EP)
  const historia = FALAS.join('. ')
  const ep = E.aplicarElencoEEpoca({ prompts: r.prompts, falas: FALAS, contextoOriginal: historia, contextoFiltro: historia, modo: 'character_story', tagFaceless: false })
  for (const k of [2, 3]) if (/Named characters? in this shot|People in the shot wear/.test(ep.prompts[k]) || !ep.prompts[k].includes('No people, no human figures and no faces anywhere in this shot.')) erros.push(`I pela rota, a cena ${k + 1} marcada ganhou gente na camada de época: ${ep.prompts[k].slice(-260)}`)
  return erros
}

const base = provas(carrega())
checa(`A a E verdes nos planos reais${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
{
  const A = carrega(DESLIGA)(AJ)
  const r = A.ajustarPromptsDoElenco({ prompts: VIS.map((v) => `photorealistic. ${v} 9:16 vertical framing${PERF}`), visuals: VIS, falas: FALAS, elenco: ELENCO })
  checa('F desligado: o de antes (a ilha sem marca e a Amelia na cena dos navios)', !r.semGente.includes(3) && nomes(A, VIS, FALAS)[3].includes('Amelia Earhart') && !nomes(A, VIS, FALAS)[1].includes('Amelia Earhart'))
}
const MUTANTES = [
  [FO, 'a gente negada não sai do texto', (s) => s.replace("  return t.replace(GENTE_NEGADA_RE_1411, ' ')", "  return t")],
  [FO, '(v2) sem "not a single"', (s) => s.replace('|not\\s+(?:a\\s+single|one|another|any))\\s+', ')\\s+')],
  [FO, '(v2) "their silhouettes" sai sem antecedente coisa (os dois namorados somem)', (s) => s.replace("return COISA_RE_1411.test(w) ? ' ' : m } return m }", "return ' ' } return ' ' }")],
  [FO, '(v2) a silhueta volta a sair por exclusão (a v1: dancers, monks, kids somem)', (s) => s.replace("(?:${COISA_DA_SILHUETA_1411})(?![\\\\p{L}])`, 'giu')", "(?:[\\\\p{L}-]+)(?![\\\\p{L}])`, 'giu')")],
  [FO, '(v2) palavra comum vale como parte do nome ("Rose climbs the trellis")', (s) => s.replace(' && !PARTE_QUE_E_PALAVRA_1411.test(w)', '')],
  [FO, '(v2) a parte do nome casa sem papel de pessoa ("Rose petals", "June 2")', (s) => s.replace('    if (PAPEL_DE_PESSOA_DEPOIS_1411.test(visual.slice(i + parte.length))) return true // v2 — só em papel de pessoa\n', '    return true\n')],
  [EP, '(v2) a camada de época tira a marca e põe a pessoa da fala', (s) => s.replace("export const MARCA_MANDA_NA_EPOCA_1411: 'off' | 'all' = 'all'", "export const MARCA_MANDA_NA_EPOCA_1411: 'off' | 'all' = 'off'")],
  [FO, 'a silhueta de coisa conta como gente', (s) => s.replace(".replace(GENTE_QUE_FOI_RE_1411, ' ').replace(SILHUETA_DE_COISA_RE_1411, ' ')", ".replace(GENTE_QUE_FOI_RE_1411, ' ')")],
  [FO, '"where the crew once stood" conta como gente', (s) => s.replace(".replace(GENTE_QUE_FOI_RE_1411, ' ').replace(SILHUETA", ".replace(SILHUETA")],
  [FO, 'o item de lista sem vírgula/or/and passa ("no cars but many people")', (s) => s.replace('|[\\p{Ll}-]+(?:\\s*,|\\s+or|\\s+and))\\s+){0,4}(?:people', '|[\\p{Ll}-]+(?:\\s*,|\\s+or|\\s+and)?)\\s+){0,4}(?:people')],
  [FO, 'sem o primeiro nome (iii)', (s) => s.replace("  if (quemEstaNaCenaLigado() && partesDoNome1411(ficha, elenco).some(", "  if (false && partesDoNome1411(ficha, elenco).some(")],
  [FO, 'o primeiro nome casa mesmo colado a outro nome ("Amelia Johnson")', (s) => s.replace('    if (colado(depois?.[1]) || (colado(antes?.[1])', '    if (false || (false')],
  [FO, 'a parte do nome vale mesmo repetida no elenco (dois Johns)', (s) => s.replace(' && !outros.includes(w.toLowerCase()))', ')')],
  [FO, 'título vale como nome ("Captain")', (s) => s.replace(' && !TITULO_NAO_E_NOME_1411.test(w) && !PARTE_QUE_E_PALAVRA_1411', ' && !PARTE_QUE_E_PALAVRA_1411')],
  [AJ, 'o prompt já marcado volta a ganhar gente', (s) => s.replace("const marcadoSemGente1411 = (visual: string) => quemEstaNaCenaLigado() && String(visual ?? '').includes(MARCA_SEM_GENTE_1411)", 'const marcadoSemGente1411 = (visual: string) => false')],
  [AJ, '"they" dos navios conta na regra da fala', (s) => s.replace("semGenteNegada(v).replace(/(?<![\\p{L}])(?:they|them|their|theirs)(?![\\p{L}])/giu, ' ')", 'v')],
  [AJ, '"deserted street" volta a apagar os soldados', (s) => s.split('return (quemEstaNaCenaLigado() || !SEM_GENTE_RE.test(v))').join('return (!SEM_GENTE_RE.test(v))')],
  [AJ, 'o detector volta a ler o texto cru (a palavra negada conta)', (s) => s.split("  const v = semGenteNegada(String(visual ?? '')) // KINEO-QUEM-ESTA-NA-CENA-1411 (i)\n").join("  const v = String(visual ?? '')\n")],
]
for (const [arq, nome, fn] of MUTANTES) {
  const src = lf(fs.readFileSync(arq, 'utf8'))
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provas(carrega(fn, arq)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
