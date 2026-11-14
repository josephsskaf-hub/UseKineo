// KINEO-BICHO-COM-NOME-1411 [CEO 14/11, lote 2 dos vídeos de teste da madrugada: caso F] — guardião.
// Prova OFFLINE, EXECUTANDO o código real:
//   (A) "Bobbie is a shaggy two-year-old collie mix…" (o dry-run do vídeo 4) faz de Bobbie um BICHO (collie), nunca "a man in his thirties";
//       "Luna was a cat", "Leo is a lion cub" também; "Max is a dog lover", "Bella is a horse trainer", "Oscar is a cat person" seguem gente;
//   (B) a ficha REAL do render pago (072196d8, 4 planos: "a real living mix") passa a dizer "a real living collie";
//   (C) desligado = byte a byte o de antes; (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const EP = 'lib/cinematic/elencoEpoca.ts', TR = 'lib/cinematic/elencoTrava.ts'
const globals = { AbortController, setTimeout, clearTimeout }
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const carrega = (mutar = null, arq = EP) => createOfflineLoader({ globals, source: (rel, text) => (mutar && rel === arq ? mutar(lf(text)) : text) })

const BOBBIE = 'This lost dog walked home across America. Bobbie is a shaggy two-year-old collie mix with a black, tan and white coat. In 1923 he got lost on a family road trip in Indiana. Six months later, Bobbie limps up to their front door in Oregon.'
const BICHOS = [[BOBBIE, 'Bobbie', 'collie'], ['Luna was a cat. Luna sleeps on the sofa all day.', 'Luna', 'cat'], ['Leo is a lion cub from the savanna. Leo roars at the sun.', 'Leo', 'cub'],
  // revisão independente 14/11 (bloqueio 4): o que muda e está certo
  ['Pickles is a tiny hedgehog. Pickles sniffs the flowers in the garden.', 'Pickles', 'hedgehog'], ['Bella is a chihuahua. Bella barks at the mailman every morning.', 'Bella', 'chihuahua']]
const CRIATURAS_OK = [['Ayesha is an 8-year-old girl with black hair. Misho is a tiny turquoise baby dragon with violet eyes, small wings, and a golden star pendant. Ayesha and Misho discover a magic star.', 'Misho', 'dragon']] // do corpus (a43dcc41): "baby" não corta
const GENTE = [['Max is a dog lover. Max walks to the park every morning. He smiles.', 'Max'], ['Bella is a horse trainer in Texas. Bella rides every day. She laughs.', 'Bella'], ['Adam is a 27-year-old man with short dark hair. Adam opens the door.', 'Adam'],
  // revisão independente 14/11 (bloqueio 1): gente COM bicho segue gente
  ['Lucy is a little girl with a cat. Lucy plays in the garden. She laughs.', 'Lucy'], ['Tom is a farmer with a horse. Tom rides at dawn. He smiles.', 'Tom'],
  ['Jack is a pirate with a parrot. Jack sails the sea. He sings.', 'Jack'], ['Mia is a vet who loves her cat. Mia opens the clinic. She smiles.', 'Mia'],
  ['Sam is a boy and his dog. Sam runs to school. He waves.', 'Sam'], ['Nora is an old woman in a cat costume. Nora dances. She laughs.', 'Nora'],
  ['Mia is a mother hen. Mia cooks for everyone. She smiles.', 'Mia'], // só a lista de gente corta aqui ("mother")
  // expressões de gente com nome de bicho
  ['Joe is a lone wolf. Joe drives at night. He smokes.', 'Joe'],
  // 2ª revisão independente 14/11: gente FAZENDO algo com um bicho, e expressões
  ['Lea is a jockey riding a horse. Lea wins the race. She smiles.', 'Lea'], ['Kim is a zookeeper feeding a lion. Kim laughs. She waves.', 'Kim'], ['Max is a dad walking the dog. Max whistles. He smiles.', 'Max'], ['Zoe is a nanny walking a dog. Zoe sings. She laughs.', 'Zoe'], ['Ali is a falconer releasing a hawk. Ali watches the sky. He smiles.', 'Ali'], ['Liz is a mama bear. Liz guards her kids every night, and she frowns at strangers. Liz smiles at dawn.', 'Liz'], ['Ann is a horse trainer. Ann rides every day. She laughs.', 'Ann'], ['Ann is a night owl. Ann paints until dawn. She hums.', 'Ann'], ['Kim is a busy bee. Kim runs the bakery. She laughs.', 'Kim']]
const BICHOS_LITERAIS = [['Rex is an old dog. Rex sleeps by the fire all day.', 'Rex', 'dog']] // "old dog" literal segue cão
// revisão independente 14/11 (bloqueio 2): a palavra antes de "mix" nunca é o artigo
const MIX = [['Bobbie, a mix with a brown coat', 'dog'], ['Rex, a mixed-breed dog with floppy ears', 'dog'], ['Tom, a mixed-breed cat with white paws', 'cat'], ['Max, a shaggy mix', 'dog'], ['Lola, a beagle mix', 'beagle'], ['Bobbie, exactly as the author wrote: "a scruffy little mutt"', 'dog']]
const FICHA_PAGA = { nome: 'Bobbie', nucleo: 'mix', tipo: 'animal', origem: 'autor', canonica: 'Bobbie, exactly as the author wrote: "shaggy two-year-old collie mix"; appearance anchors: medium, black, tan, and white coat' }

function provas(L) {
  const erros = []
  const ee = L(EP), tr = L(TR)
  for (const [t, nome, esp] of BICHOS) {
    const el = ee.personagensNomeados(t, ee.epocaDaHistoria(t), false, true)
    const p = el.find((x) => x.nome === nome)
    if (!p || p.tipo !== 'animal' || !new RegExp(`\\b${esp}\\b`).test(p.descricao) || /\b(?:man|woman|person)\b/.test(p.descricao)) erros.push(`A ${nome} não virou bicho (${esp}): ${JSON.stringify(p ?? null)}`)
  }
  for (const [t, nome] of GENTE) {
    const p = ee.personagensNomeados(t, null, false, true).find((x) => x.nome === nome)
    if (!p || p.tipo !== 'humano') erros.push(`A ${nome} (gente) virou ${p ? p.tipo + ': ' + p.descricao : 'nada'}`)
  }
  for (const [t, nome, esp] of BICHOS_LITERAIS) {
    const p = ee.personagensNomeados(t, null, false, true).find((x) => x.nome === nome)
    if (!p || p.tipo !== 'animal' || !p.descricao.includes(esp)) erros.push(`A ${nome} (bicho literal) não virou ${esp}: ${JSON.stringify(p ?? null)}`)
  }
  for (const [t, nome, esp] of CRIATURAS_OK) {
    const p = ee.personagensNomeados(t, null, false, true).find((x) => x.nome === nome)
    if (!p || p.tipo !== 'criatura' || !p.descricao.includes(esp)) erros.push(`A ${nome} não virou ${esp}: ${JSON.stringify(p ?? null)}`)
  }
  // o núcleo do 1º sintagma, direto na função: cada fronteira sozinha
  const NUCLEO = [['Kai is a boy feeding horses.', null], ['Rita is a vet a horse.', null], ['Daisy is a duckling.', 'duckling'], ['Bobbie is a shaggy two-year-old collie mix with a black coat.', 'collie'], ['Max is a dog lover.', null], ['Liz is a mama bear.', null], ['Bo is a stray dog.', 'dog'], ['Rex is an old dog.', 'dog']]
  for (const [frase, esperado] of NUCLEO) { const r = ee.nucleoDoBichoDaCopula(frase.split(' ')[0], frase); if (r !== esperado) erros.push(`N "${frase}" → ${r} (esperado ${esperado})`) }
  for (const [canonica, esp] of MIX) {
    const l = tr.linhaDeEstilo({ nome: 'x', nucleo: 'mix', tipo: 'animal', origem: 'autor', canonica }, { look: 'photoreal', lookPhrase: 'photorealistic' })
    if (!l.startsWith(`a real living ${esp} filmed`)) erros.push(`B "${canonica}" deu: ${l.slice(0, 40)}`)
  }
  const camada = ee.aplicarElencoEEpoca({ prompts: ['A shaggy dog walks along a highway.', 'A family car on a road.', 'A dog at a front door.'], falas: BOBBIE.split('. ').slice(0, 3), contextoOriginal: BOBBIE, contextoFiltro: BOBBIE, modo: 'character_story', tagFaceless: false, provaDeGente: true })
  if (camada.prompts.join(' ').match(/Bobbie, a (?:man|woman|person)/) || !camada.relato.elenco.some((x) => x.nome === 'Bobbie' && x.tipo === 'animal')) erros.push('A a camada de época ainda põe Bobbie como gente: ' + JSON.stringify(camada.relato.elenco))
  // (B)
  const linha = tr.linhaDeEstilo(FICHA_PAGA, { look: 'photoreal', lookPhrase: 'photorealistic, ultra-detailed' })
  if (/real living mix\b/.test(linha) || !/real living collie\b/.test(linha)) erros.push('B a ficha paga ainda diz "a real living mix": ' + linha)
  const semRaca = tr.linhaDeEstilo({ ...FICHA_PAGA, canonica: 'Bobbie, exactly as the author wrote: "a scruffy little mutt"' }, { look: 'photoreal', lookPhrase: 'photorealistic' })
  if (!/real living dog\b/.test(semRaca)) erros.push('B a ficha só com "mutt" não virou "dog": ' + semRaca)
  const gato = tr.linhaDeEstilo({ nome: 'Luna', nucleo: 'cat', tipo: 'animal', origem: 'autor', canonica: 'Luna, a cat with realistic cat anatomy and natural colours' }, { look: 'photoreal', lookPhrase: 'photorealistic' })
  if (!/real living cat filmed/.test(gato)) erros.push('B mexeu na ficha que já estava certa: ' + gato)
  return erros
}

const base = provas(carrega())
checa(`A e B verdes${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
{
  const L = carrega((s) => s.replace("export const BICHO_COM_NOME_1411: ModoBichoComNome = 'all'", "export const BICHO_COM_NOME_1411: ModoBichoComNome = 'off'"))
  const p = L(EP).personagensNomeados(BOBBIE, null, false, false).find((x) => x.nome === 'Bobbie')
  checa('C desligado: Bobbie volta ao de antes (gente)', !!p && p.tipo === 'humano')
}
const MUTANTES = [
  ['a cópula não lê a espécie', EP, (s) => s.replace('  if (bichoComNomeLigado()) { // KINEO-BICHO-COM-NOME-1411', '  if (false) { // KINEO-BICHO-COM-NOME-1411')],
  ['sem as raças ("collie" cai em gente)', EP, (s) => s.replace('const bicho = new RegExp(`^(?:${CRIATURAS}|${ANIMAIS}|${RACAS_1411})s?$`', 'const bicho = new RegExp(`^(?:${CRIATURAS}|${ANIMAIS})s?$`')],
  ['a ficha paga volta a dizer "mix"', TR, (s) => s.replace("if (/^(?:mix|mixed|cross|crossbreed|mutt|breed)$/.test(e))", 'if (false)')],
  // 2ª revisão independente 14/11: o núcleo do 1º sintagma
  ['(bloqueio 5) o verbo em -ing não fecha o sintagma ("a jockey riding a horse" vira cavalo)', EP, (s) => s.replace("if (/^[\\p{L}-]{3,}ing$/u.test(w) && !bicho.test(w)) break", '')],
  ['(bloqueio 5) o 2º artigo não fecha o sintagma', EP, (s) => s.replace('|a|an|the|this|these|those|is|was|', '|this|these|those|is|was|')],
  ['a ligação (with, who) não fecha o sintagma ("a little girl with a cat" vira gato)', EP, (s) => s.replace('const FRONTEIRA_DO_SINTAGMA_1411 = /^(?:with|who|whose|that|which|and|or|but|of|in|on|at|from|', 'const FRONTEIRA_DO_SINTAGMA_1411 = /^(?:')],
  ['olha QUALQUER palavra do sintagma, não o núcleo ("a dog lover" vira cão)', EP, (s) => s.replace('  let i = palavras.length - 1', '  let i = Math.max(0, palavras.findIndex((p) => bicho.test(p)))')],
  ['a expressão de gente ("a lone wolf", "a mama bear") vira bicho', EP, (s) => s.replace('if (i > 0 && IDIOMAS_DE_BICHO_1411.has(', 'if (false && IDIOMAS_DE_BICHO_1411.has(')],
  ['"collie mix": a mistura vira o núcleo (Bobbie sai gente)', EP, (s) => s.replace('if (i > 0 && MISTURA_1411.test(palavras[i])) i--', '')],
  ['(bloqueio 2) o artigo vira a espécie ("a real living a")', TR, (s) => s.replace("return antes && !/^(?:a|an|the|", "return antes && !/^(?:")],
  ['(bloqueio 2) "mixed-breed dog" não lê o bicho depois', TR, (s) => s.replace('if (depois && !/^(?:with|and|of|in|from|named|called)$/.test(depois)) return depois', '')],
]
for (const [nome, arq, fn] of MUTANTES) {
  const src = lf(fs.readFileSync(arq, 'utf8'))
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provas(carrega(fn, arq)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
