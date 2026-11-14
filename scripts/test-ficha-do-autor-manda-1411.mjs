// KINEO-FICHA-DO-AUTOR-MANDA-1411 [CEO 14/11, dry-run da Earhart: elenco_epoca dizia "long hair in two braids", o autor escreveu "short curly hair"] — guardião.
// Prova OFFLINE, EXECUTANDO o código real (aplicarElencoEEpoca, a camada que põe "Named character in this shot" na cena cuja FALA cita o nome):
//   (A) sem as fichas do autor, a cena 4 (a fala cita Amelia Earhart, o plano não) ganha a descrição SORTEADA (tranças) — o defeito;
//   (B) com elas, ganha a ficha do autor (jaqueta, óculos, cabelo curto cacheado); a cena que já leva a ficha não ganha 2ª descrição;
//   (C) gente sem ficha do autor segue com a descrição de sempre; a rota passa as fichas de origem 'autor'; (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const EP = 'lib/cinematic/elencoEpoca.ts', FQ = 'lib/cinematic/filmQuality.ts'
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const carrega = (mutar = null, arq = EP) => createOfflineLoader({ globals: { AbortController, setTimeout, clearTimeout }, source: (rel, text) => (mutar && rel === arq ? mutar(lf(text)) : text) })

const T = 'July 2, 1937. Amelia Earhart wears a brown leather flight jacket and goggles over her short curly hair. She climbs into her silver twin-engine plane in New Guinea. Ten young mechanics in grey overalls push the plane onto the runway. Her next stop is Howland Island, a tiny empty strip of sand in the open sea. Near that island, her radio goes silent. Amelia Earhart is never found.'
const FALAS = ['July 2, 1937. Amelia Earhart wears a brown leather flight jacket and goggles over her short curly hair.', 'She climbs into her silver twin-engine plane in New Guinea. Ten young mechanics push the plane.', 'Her next stop is Howland Island. Near that island, her radio goes silent.', 'Amelia Earhart is never found.']
const FICHA = 'Amelia Earhart, exactly as the author wrote: "Amelia Earhart wears a brown leather flight jacket and goggles over her short curly hair"'
const PROMPTS = [`A close-up of a pilot on a runway. The same main character appears in this scene, consistent design: ${FICHA}.`, 'Ten mechanics push a silver plane.', 'Wide shot of Howland Island.', 'A radio on a desk.']
const aplica = (ee, fichas) => ee.aplicarElencoEEpoca({ prompts: PROMPTS, falas: FALAS, contextoOriginal: T, contextoFiltro: T, modo: 'character_story', tagFaceless: false, provaDeGente: true, ...(fichas ? { fichasDoAutor: fichas } : {}) })

function provas(L) {
  const erros = []
  const ee = L(EP)
  // (A) o defeito, sem as fichas
  const sem = aplica(ee, null)
  if (!/two braids|long [a-z -]*hair/.test(sem.prompts[3])) erros.push('A fixture: sem as fichas a cena 4 já não ganhava a descrição sorteada')
  // (B) com as fichas do autor
  const com = aplica(ee, [{ nome: 'Amelia Earhart', canonica: FICHA }])
  if (/two braids|long [a-z -]*hair/.test(com.prompts.join(' ')) || !com.prompts[3].includes('short curly hair')) erros.push('B a cena 4 não levou a ficha do autor: ' + com.prompts[3].slice(0, 200))
  if ((com.prompts[0].match(/Amelia Earhart, /g) ?? []).length > 1 || /Named character/.test(com.prompts[0])) erros.push('B a cena 1 (já com a ficha) ganhou 2ª descrição')
  if (!/short curly hair/.test(com.relato.elenco[0]?.descricao ?? '')) erros.push('B o relato ainda mostra a descrição sorteada')
  // (C) gente sem ficha do autor segue igual
  const outro = aplica(ee, [{ nome: 'Fred Noonan', canonica: 'Fred Noonan, exactly as the author wrote: "a navigator in a white shirt"' }])
  if (outro.prompts.join('|') !== sem.prompts.join('|')) erros.push('C ficha de OUTRA pessoa mudou a cena')
  // v2 [revisor 14/11, item D]: (D1) o nome aponta UMA pessoa só; (D3) bicho não ganha ficha de gente
  const T2 = 'In 1890, John Carter meets John Miller at the docks. John Carter shakes hands. John Miller smiles.'
  const dois = ee.aplicarElencoEEpoca({ prompts: ['The docks.', 'A handshake.', 'A smile.'], falas: ['In 1890, John Carter meets John Miller at the docks.', 'John Carter shakes hands.', 'John Miller smiles.'], contextoOriginal: T2, contextoFiltro: T2, modo: 'character_story', tagFaceless: false, provaDeGente: true, fichasDoAutor: [{ nome: 'John', canonica: 'John, exactly as the author wrote: "John wears a red scarf"' }] })
  if (dois.relato.elenco.length !== 2) erros.push('D1 fixture: a camada não leu os dois Johns')
  if (dois.relato.elenco.some((e) => /red scarf/.test(e.descricao ?? ''))) erros.push('D1 a ficha "John" foi para um dos dois Johns: ' + dois.relato.elenco.map((e) => e.nome + ': ' + e.descricao).join(' | '))
  const um = ee.aplicarElencoEEpoca({ prompts: ['The docks.', 'A handshake.', 'A smile.'], falas: ['In 1890, John Carter waits at the docks.', 'John Carter shakes hands.', 'He smiles.'], contextoOriginal: 'In 1890, John Carter waits at the docks. John Carter shakes hands. He smiles.', contextoFiltro: 'In 1890, John Carter waits at the docks. John Carter shakes hands. He smiles.', modo: 'character_story', tagFaceless: false, provaDeGente: true, fichasDoAutor: [{ nome: 'John', canonica: 'John, exactly as the author wrote: "John wears a red scarf"' }] })
  if (!um.relato.elenco.some((e) => /red scarf/.test(e.descricao ?? ''))) erros.push('D1 com UM John só, a ficha "John" devia valer (a Mara do d2201895)')
  const TB = 'This lost dog found his way home. Bobbie the dog is a shaggy two-year-old collie mix. In 1923 Bobbie goes missing. In 1924 Bobbie limps up to the front door.'
  const bicho = ee.aplicarElencoEEpoca({ prompts: ['A field.', 'A road.', 'A door.'], falas: ['Bobbie the dog is a shaggy two-year-old collie mix.', 'In 1923 Bobbie goes missing.', 'In 1924 Bobbie limps up to the front door.'], contextoOriginal: TB, contextoFiltro: TB, modo: 'character_story', tagFaceless: false, provaDeGente: true, fichasDoAutor: [{ nome: 'Bobbie', canonica: 'Bobbie, exactly as the author wrote: "a man in a grey hat"' }] })
  if (bicho.prompts.join(' ').includes('grey hat') || bicho.relato.elenco.some((e) => /grey hat/.test(e.descricao ?? ''))) erros.push('D3 o bicho ganhou a ficha de gente')
  return erros
}

const base = provas(carrega())
checa(`A, B e C verdes${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
const fq = lf(fs.readFileSync(FQ, 'utf8'))
checa("C a qualidade do filme passa à camada de época SÓ as fichas humanas de origem 'autor', atrás do interruptor", fq.includes("export const FICHA_DO_AUTOR_MANDA_1411: 'off' | 'all' = 'all'") && fq.includes("...(FICHA_DO_AUTOR_MANDA_1411 === 'all' ? { fichasDoAutor: elenco.filter((f) => f.origem === 'autor' && f.tipo === 'humano' && String(f.canonica ?? '').trim()).map((f) => ({ nome: f.nome, canonica: f.canonica })) } : {})"))
const MUTANTES = [
  ['v2: o nome vale para duas pessoas', (s) => s.replace('  return elenco.filter((o) => mesmoPersonagem(casam[0].nome, o.nome)).length === 1 ? casam[0] : undefined', '  return casam[0]')],
  ['a ficha do autor vale para bicho', (s) => s.replace("const fichaDoAutor = p.tipo === 'humano' ? fichaDoAutorDaPessoa(p, elenco, args.fichasDoAutor) : undefined", 'const fichaDoAutor = fichaDoAutorDaPessoa(p, elenco, args.fichasDoAutor)')],
  ['a ficha do autor não substitui a sorteada', (s) => s.replace('if (fichaDoAutor) p.descricao = fichaDoAutor.canonica', 'if (false) p.descricao = fichaDoAutor.canonica')],
  ['a ficha vale para QUALQUER pessoa (não confere o nome)', (s) => s.replace('  if (casam.length !== 1) return undefined', '  return (fichas ?? [])[0]')],
]
for (const [nome, fn] of MUTANTES) {
  const src = lf(fs.readFileSync(EP, 'utf8'))
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provas(carrega(fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
