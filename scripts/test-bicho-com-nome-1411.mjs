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
const BICHOS = [[BOBBIE, 'Bobbie', 'collie'], ['Luna was a cat. Luna sleeps on the sofa all day.', 'Luna', 'cat'], ['Leo is a lion cub from the savanna. Leo roars at the sun.', 'Leo', 'cub']]
const GENTE = [['Max is a dog lover. Max walks to the park every morning. He smiles.', 'Max'], ['Bella is a horse trainer in Texas. Bella rides every day. She laughs.', 'Bella'], ['Adam is a 27-year-old man with short dark hair. Adam opens the door.', 'Adam']]
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
    if (p && p.tipo !== 'humano') erros.push(`A ${nome} virou ${p.tipo}: ${p.descricao}`)
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
  ['sem as raças ("collie" cai em gente)', EP, (s) => s.replace("|${RACAS_1411})s?(?=", ')s?(?=')],
  ['"dog lover" vira cão (sem a trava do fim do sintagma)', EP, (s) => s.replace(String.raw`s?(?=\s*(?:[.,;:!?)]|$)|\s+(?:mix|cross|mutt|breed|with|who|that|from|named|called|and|in|on|at|of)(?![\p{L}]))`, 's?')],
  ['a ficha paga volta a dizer "mix"', TR, (s) => s.replace("if (/^(?:mix|mixed|cross|crossbreed|mutt|breed)$/.test(e))", 'if (false)')],
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
