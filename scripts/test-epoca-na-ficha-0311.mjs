// KINEO-EPOCA-NA-FICHA-0311 [TRAVA 8.2 — fundador 03/11 pelo Canal do Revisor: "é o pior agora"] — guardião.
// Prova OFFLINE, EXECUTANDO o código REAL transpilado, com a forma do caso gustavoq.contato (03/11 14:12 BRT, Kling 4 grátis 15 s,
// nota 7, não baixou): "1950: A pilot vanished over the Bermuda Triangle…" e a ficha do casting (origem 'modelo') com jaqueta,
// JEANS, relógio e cabelo de hoje. O que fica provado:
//   (A) a ficha de gente numa história de época troca jeans/relógio/cabelo de hoje e ganha UMA linha de figurino do período;
//   (B) a mesma ficha numa história de HOJE (sem ano) não muda; ano ≥ 2015 no texto (há um "hoje") não trava época;
//   (C) animal e figura mítica não ganham figurino; idempotente; o caso youbykh (sem ano) segue igual;
//   (D) a trava entra em travarEstiloDaFicha — o ponto que as duas estradas (clássica e hollywood) já leem;
//   (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const globals = { AbortController, setTimeout: () => 0, clearTimeout() {} }
const carrega = (mutar = null) => createOfflineLoader({ globals, source: (rel, text) => (mutar && rel === 'lib/cinematic/elencoTrava.ts' ? mutar(text) : text) })('lib/cinematic/elencoTrava.ts')

const FALA = '1950: A pilot vanished over the Bermuda Triangle… magnetic anomalies may have altered his compass'
const PILOTO = { nome: 'the pilot', nucleo: 'pilot', tipo: 'humano', origem: 'modelo', protagonista: true, genero: 'man', canonica: 'the pilot, a man in his early 30s with short modern haircut, light stubble, wearing a green jacket, blue jeans and a modern wristwatch' }
const FOTO = { look: 'photoreal', lookPhrase: 'photorealistic cinematic' }

function provas(t) {
  const erros = []
  const r = t.travarEstiloDaFicha(PILOTO, FOTO, FALA).canonica
  if (/jeans|modern wristwatch|modern haircut/i.test(r)) erros.push('A sobrou roupa/cabelo de hoje: ' + r)
  if (!/period look: a person of 1950 with period-accurate 1950s hairstyle and clothing \(1950s dress:/.test(r)) erros.push('A falta a linha de figurino de 1950')
  if (!/high-waisted wool trousers/.test(r) || !/leather-strap mechanical wristwatch/.test(r)) erros.push('A trocas da década ausentes')
  if (!/filmed in photorealistic live action/.test(r)) erros.push('A a linha de estilo sumiu')
  const hoje = t.travarEstiloDaFicha(PILOTO, FOTO, 'A pilot vanished over the Bermuda Triangle').canonica
  if (/period look/.test(hoje) || !/blue jeans/.test(hoje)) erros.push('B história de hoje ganhou época')
  if (/period look/.test(t.travarEstiloDaFicha(PILOTO, FOTO, 'In 1950 a pilot vanished; in 2024 divers found the plane').canonica)) erros.push('B época mista (ano ≥ 2015) travou')
  const cao = t.travarEstiloDaFicha({ nome: 'the dog', nucleo: 'dog', tipo: 'animal', origem: 'deterministica', protagonista: true, genero: null, canonica: 'the dog, a small brown dog' }, FOTO, FALA).canonica
  if (/period look/.test(cao)) erros.push('C animal ganhou figurino')
  const mitica = { nome: 'Zeus', nucleo: 'Zeus', tipo: 'humano', origem: 'mitica', protagonista: true, genero: 'man', canonica: 'Zeus, king of the gods' }
  if (/period look/.test(t.fichaNaEpoca(mitica, { ano: 1950, decada: 1950, rotulo: '1950s', origem: 'ano' }).canonica)) erros.push('C mítica ganhou figurino')
  const uma = t.travarEstiloDaFicha(PILOTO, FOTO, FALA)
  if (t.travarEstiloDaFicha(uma, FOTO, FALA).canonica !== uma.canonica) erros.push('C não é idempotente')
  const lista = t.travarEstiloDoElenco([PILOTO], FOTO, FALA)
  if (lista.trocas.length !== 1 || lista.elenco[0].canonica !== uma.canonica) erros.push('D o elenco inteiro não recebe a época')
  return erros
}

const base = provas(carrega())
checa(`todas as provas verdes${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
const src = lf(fs.readFileSync('lib/cinematic/elencoTrava.ts', 'utf8'))
checa('D a época roda dentro de travarEstiloDaFicha (as duas estradas)', src.includes('return fichaNaEpoca(travarSoEstiloDaFicha(f, style, textoDoPedido), epocaDaHistoria(textoDoPedido))'))
const MUTANTES = [
  ['sem a linha de figurino', (s) => s.replace('${MARCA_EPOCA_NA_FICHA} a person of ${quando}', 'a person of ${quando}').replace("if (c.includes(MARCA_EPOCA_NA_FICHA)) return f", 'if (false) return f')],
  ['jeans fica', (s) => s.replace("'high-waisted wool trousers', 1960)", "'high-waisted wool trousers', 0)")],
  ['animal ganha figurino', (s) => s.replace("if (!epoca || f.tipo !== 'humano' ||", 'if (!epoca ||')],
  ['época desligada', (s) => s.replace('return fichaNaEpoca(travarSoEstiloDaFicha(f, style, textoDoPedido), epocaDaHistoria(textoDoPedido))', 'return travarSoEstiloDaFicha(f, style, textoDoPedido)')],
]
for (const [nome, fn] of MUTANTES) {
  const mudou = fn(lf(fs.readFileSync('lib/cinematic/elencoTrava.ts', 'utf8'))) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provas(carrega(fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
