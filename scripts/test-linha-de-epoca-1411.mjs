// KINEO-LINHA-DE-EPOCA-1411 v2 [CEO 14/11 12:25, lote 1b: a Earhart refeita piorou de 6 para 5 — casal e sedã dos anos 30 na ilha, sedã no mar;
// bloqueio do revisor: a lista fechada de palavras de gente tirava a roupa de 18 de 26 cenas com gente] — guardião.
// Prova OFFLINE, EXECUTANDO o código real (aplicarEpoca, o que a camada de época põe no fim de cada cena), com os planos REAIS do dry-run:
//   (A) a cena marcada sem gente (a ilha) leva SÓ a data: nenhuma roupa, carro, catálogo nem frase negativa;
//   (B) TODA outra cena leva a roupa positiva da década, sem catálogo — inclusive a que a lista antiga não via: o padeiro de 1965, o pronome
//       só, o nome só, as frases em português, espanhol, francês e alemão; a linha não adivinha gente por palavra;
//   (C) a frase de veículo só com veículo de rua: carro, ambulância, "a black Ford", "Model T", carro/coche/voiture/Auto; avião, navio e
//       "Henry Ford" (gente) não chamam carro; "no cars" não é veículo;
//   (D) quem não passa a cena e o interruptor 'off': a linha de sempre; e nela a regra da origem (KINEO-ORIGEM-DO-ELENCO-0311) segue viva —
//       cena com origem não veste a lista ocidental; (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const EP = 'lib/cinematic/elencoEpoca.ts'
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const carrega = (mutar = null) => createOfflineLoader({ globals: { AbortController, setTimeout, clearTimeout }, source: (rel, text) => (mutar && rel === EP ? mutar(lf(text)) : text) })
const E1937 = { ano: 1937, decada: 1930, rotulo: '1930s', origem: 'ano' }
const E1965 = { ano: 1965, decada: 1960, rotulo: '1960s', origem: 'ano' }
const E1923 = { ano: 1923, decada: 1920, rotulo: '1920s', origem: 'ano' }
const MOLDURA = ', characters act naturally within the scene without addressing the viewer, 9:16 vertical framing, subject framed in the upper two-thirds'
const ILHA = `photorealistic, ultra-detailed. Aerial view of Howland Island, a tiny strip of sand in the open sea.${MOLDURA}. No people, no human figures and no faces anywhere in this shot.`
const NAVIOS = `photorealistic, ultra-detailed. Tracking shot of navy ships and planes searching the ocean, waves crashing against the hulls.${MOLDURA}`
const COM_GENTE = [
  ['o padeiro de 1965', 'The baker kneads dough at dawn in his shop.', E1965], ['o pronome só', 'He opens the door and steps outside.', E1965],
  ['o nome só', 'Amelia climbs in and waves.', E1937], ['português', 'Os soldados marcham pela rua.', E1937],
  ['espanhol', 'Una mujer camina por la plaza.', E1937], ['francês', 'Un homme lit le journal.', E1937], ['alemão', 'Ein Mann steht am Fenster.', E1937],
  ['os navios (a regra de sem gente não marcou)', NAVIOS, E1937],
]
const VEICULO = [['o carro do Bobbie', 'A car drives down a sun-drenched Indiana road in August 1923.', E1923], ['ambulância', 'An ambulance speeds past the hospital.', E1965], ['a black Ford', 'A black Ford parks outside the diner.', E1937], ['Model T', 'A Model T rattles down the lane.', E1923], ['carro', 'Um carro antigo para na esquina.', E1937], ['coche', 'Un coche negro espera en la calle.', E1937], ['voiture', 'Une voiture noire attend devant la gare.', E1937], ['Auto', 'Ein altes Auto steht vor dem Haus.', E1937]]
const SEM_VEICULO = [['os navios', NAVIOS], ['Henry Ford (gente)', 'Henry Ford smiles at the camera.'], ['a lista negativa antiga', 'A battlefield at dawn, absolutely no modern objects, no tanks, no cars, no trucks.'], ['falsos (cartographer, cabinet)', 'A cartographer opens the cabinet and unrolls a carpet map.']]
const RUIM = /fedora|wide-lapel|bias-cut|wool overcoat|sedans with spare|spare wheel|only if|do not add|present-day|absolutely no|no hoodies|car or carriage/i
const ROUPA = /People in the shot wear period-accurate \S+ clothing true to their own place and role, with period props\./

function provas(L) {
  const erros = []
  const E = L(EP)
  const linha = (cena, ep) => E.aplicarEpoca(cena, ep).prompt.slice(String(cena).replace(/\s+$/, '').length).trim()
  // (A)
  if (linha(ILHA, E1937).replace(/^\./, '').trim() !== 'Period setting: 1937 (1930s).') erros.push('A a ilha (sem gente): ' + linha(ILHA, E1937))
  // (B)
  for (const [nome, cena, ep] of COM_GENTE) { const l = linha(cena, ep); if (!ROUPA.test(l) || RUIM.test(l)) erros.push(`B ${nome}: ${l}`) }
  // (C)
  // na cena COM carro, a frase do carro da década é a certa ("rounded 1930s sedans with spare wheels"); proibidos ali só a condicional, a negativa e o catálogo de roupa
  for (const [nome, cena, ep] of VEICULO) { const l = linha(cena, ep); if (!/Street vehicles in the shot are /.test(l) || /fedora|wide-lapel|bias-cut|only if|do not add|present-day|absolutely no|car or carriage/i.test(l)) erros.push(`C ${nome} não chamou o veículo: ${l}`) }
  for (const [nome, cena] of SEM_VEICULO) if (/Street vehicles/.test(linha(cena, E1937))) erros.push(`C ${nome} chamou o carro`)
  // (D) quem não passa a cena recebe a linha de sempre
  if (!/Any person the shot describes wears 1930s dress/.test(E.sufixoDeEpoca(E1937))) erros.push('D quem não passa a cena perdeu a linha de sempre')
  return erros
}
// (D) com o interruptor 'off', a regra da origem segue: a cena com origem não veste a lista ocidental (fedoras) na linha de sempre
const ORIGEM = { descricao: () => null, roupaDaEpoca: (r) => `period-accurate ${r} clothing true to their own place and role`, frase: () => 'The main person, if one is shown in this shot, is Japanese, with the natural features of Japanese people. ' }
function provaOrigem(L) {
  const E = L(EP)
  const r = E.aplicarElencoEEpoca({ prompts: ['An old man in a uniform stands in the jungle.', 'A rusted rifle on a rock.'], falas: ['a', 'b'], contextoOriginal: 'In 1945 Onoda fought on in the jungle.', contextoFiltro: 'In 1945 Onoda fought on in the jungle.', modo: 'documentary_faceless', tagFaceless: false, origemDoElenco: ORIGEM })
  return /natural features of Japanese people/.test(r.prompts[0]) && !/fedoras/.test(r.prompts[0]) && /true to their own place and role/.test(r.prompts[0]) ? [] : ['D (origem, linha de sempre) a cena com origem vestiu a lista ocidental: ' + r.prompts[0].slice(0, 300)]
}
const DESLIGA = (s) => s.replace("export const LINHA_DE_EPOCA_1411: ModoLinhaDeEpoca = 'all'", "export const LINHA_DE_EPOCA_1411: ModoLinhaDeEpoca = 'off'")

const base = provas(carrega())
checa(`A, B, C e D verdes nos planos reais e nos casos do revisor${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
{
  const l = carrega(DESLIGA)(EP).aplicarEpoca(ILHA, E1937).prompt
  checa('D desligado: a ilha volta a receber a linha de sempre (catálogo e sedã)', /fedoras, wide-lapel suits/.test(l) && /rounded 1930s sedans/.test(l))
  const o = provaOrigem(carrega(DESLIGA))
  checa(`D desligado: a regra da origem segue viva na linha de sempre${o.length ? ': ' + o.join(' · ') : ''}`, o.length === 0)
}
const MUTANTES = [
  ['a cena marcada sem gente ganha roupa', (s) => s.replace('  const semGente = t.includes(SEM_GENTE_NA_CENA_1411)', '  const semGente = false'), provas],
  ['a roupa volta a depender de uma lista de palavras', (s) => s.replace('  const gente = !semGente\n', "  const gente = !semGente && /(?<![\\p{L}])(?:man|woman|people|soldiers?|mechanics?)(?![\\p{L}])/iu.test(t)\n"), provas],
  ['veículo sempre', (s) => s.replace("  const veiculo = VEICULO_DE_RUA_RE_1411.test(t.replace(VEICULO_NEGADO_RE_1411, ' '))", '  const veiculo = true'), provas],
  ['"no cars" conta como veículo', (s) => s.replace("VEICULO_DE_RUA_RE_1411.test(t.replace(VEICULO_NEGADO_RE_1411, ' '))", 'VEICULO_DE_RUA_RE_1411.test(t)'), provas],
  ['sem as outras línguas no veículo', (s) => s.replace('|carros?|caminh(?:ão|ões)|ônibus|carroças?|bondes?|táxis?|motocicletas?|bicicletas?|coches?|cami(?:ón|ones)|autob(?:ús|uses)|carruajes?|carretas?|tranvías?|voitures?|camions?|calèches?|charrettes?|tramways?|vélos?|autos?|lastwagen|kutschen?|straßenbahnen?|fahrr(?:ad|äder)|motorr(?:ad|äder))', ')'), provas],
  ['a marca vale sem artigo ("Henry Ford" vira carro)', (s) => s.replace('|(?<![\\p{L}])(?:a|an|the|his|her|their|black|white|red|blue|green|old|new|vintage|battered|shiny)\\s+(?:Ford|', '|(?<![\\p{L}])(?:Ford|'), provas],
  ['a aplicação não passa a cena (volta a linha de sempre)', (s) => s.replace('const longa = sep + sufixoDeEpoca(epoca, false, base)', 'const longa = sep + sufixoDeEpoca(epoca)'), provas],
  ['(origem) a cena com origem veste a lista ocidental', (s) => DESLIGA(s).replace("if (args.origemDoElenco && r.aplicada === 'longa' && r.prompt.includes('natural features of '))", 'if (false)'), provaOrigem],
]
for (const [nome, fn, prova] of MUTANTES) {
  const src = lf(fs.readFileSync(EP, 'utf8'))
  const mudou = fn(src) !== src && fn(src) !== DESLIGA(src)
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = prova(carrega(fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
