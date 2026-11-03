// KINEO-AVIAO-NAO-VIRA-CARRO-0311 + KINEO-SUJEITO-DA-FALA-0311 [TRAVA 8.2 — fundador 03/11: "universalizar"] — guardião.
// Caso real: mahrafariha (AE, ChatGPT, 03/11, 1º filme, bcd18c51): "A plane vanished—unsolved for 70 years! In 1950, Northwest Flight 2501…" saiu com um
// sedã dos anos 50 numa estrada de floresta, nenhum avião no filme, pixel 100. Duas causas, as duas para todos os motores:
//   (A) o sufixo de época dizia "any vehicle in frame is 1950s sedans…": era uma ordem de pôr carro. Agora é condicional, e avião/navio/trem ficam o que são;
//   (B) o sujeito obrigatório só lia o pedido ("mistério sem solução"): sem sujeito ali, lê a 1ª frase da narração, com a MESMA leitura calibrada.
// Executa o código real offline, com a resposta do modelo gravada no fetch; mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
let falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const globals = { AbortController, setTimeout: () => 0, clearTimeout() {}, process: { env: { OPENAI_API_KEY: 'teste' } } }
const EP = 'lib/cinematic/elencoEpoca.ts'
const SU = 'lib/cinematic/sujeitoTodosMotores.ts'
const carrega = (arq, mutar = null) => createOfflineLoader({ globals, source: (rel, t) => (mutar && rel === arq ? mutar(t) : t) })(arq)

function provasEpoca(E) {
  const e = []
  const s = E.sufixoDeEpoca({ ano: 1950, decada: 1950, rotulo: '1950s', origem: 'ano' })
  if (/any vehicle in frame/i.test(s)) e.push('o sufixo ainda manda pôr veículo')
  if (!/do not add vehicles the shot does not mention/.test(s)) e.push('falta "não acrescente veículo"')
  if (!/an aircraft, ship or train stays exactly what the shot says/.test(s)) e.push('avião pode virar carro')
  if (!/do not add people the shot does not mention/.test(s)) e.push('a regra das pessoas sumiu')
  return e
}

const resposta = (o) => async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(o) } }] }) })
const AVIAO = { reasoning: 'The sentence is about a plane that vanished.', subject: 'a plane', head_noun: 'plane', subject_visual_no_people: 'a plane', kind: 'vehicle', real_person: false, has_human: false, mention_words: ['plane'], word_use: 'literal', request_language: 'en' }
const NADA = { reasoning: 'An unsolved mystery; no specific physical subject.', subject: null, head_noun: null, subject_visual_no_people: null, kind: 'none', real_person: false, has_human: false, mention_words: [], word_use: 'none', request_language: 'en' }
const FALAS = ['A plane vanished—unsolved for 70 years! In 1950, Northwest Flight 2501 vanished over Lake Michigan.', 'Despite searches, no wreckage was ever found.', 'The leading theory: turbulence caused a crash.']
const PLANOS = ['A foggy forest with tall trees, shadows blending into the mist', 'Search boats with spotlights on a dark lake', 'Aerial view of a stormy shoreline']
const PEDIDO = { pedido: 'an unsolved mystery', fonte: 'ideia_solta', motivo: 'ok' }

async function provasSujeito(S) {
  const e = []
  if (S.primeiraFraseDaFala(FALAS[0]) !== 'A plane vanished—unsolved for 70 years!') e.push('1ª frase errada: ' + S.primeiraFraseDaFala(FALAS[0]))
  if (S.primeiraFraseDaFala('[Pexels: x] “Hi.”') !== '' ) e.push('frase curta demais devia ser vazia')
  let chamadas = 0
  const f = async (...a) => { chamadas++; return (chamadas === 1 ? resposta(NADA) : resposta(AVIAO))(...a) }
  const r = await S.sujeitoEmTodosOsMotores({ pedido: PEDIDO, falas: FALAS, planos: PLANOS, pessoaPermitida: true, estrada: 'classica' }, { fetchImpl: f, tentativasExtras: 0 })
  if (!r || !r.relato.corrigido || r.relato.cena !== 1 || !/^Main subject clearly visible in frame: a plane\./.test(r.planos[0])) e.push('pedido genérico: o avião da 1ª frase não entrou: ' + JSON.stringify(r?.relato?.motivo_sem_sujeito))
  if (r && r.relato.motivo_do_pedido !== 'fala_de_abertura') e.push('relato não diz que veio da fala')
  if (chamadas !== 2) e.push('chamadas ' + chamadas)
  let c2 = 0
  const so = await S.sujeitoEmTodosOsMotores({ pedido: null, falas: FALAS, planos: PLANOS, pessoaPermitida: true, estrada: 'hollywood' }, { fetchImpl: async (...a) => { c2++; return resposta(AVIAO)(...a) }, tentativasExtras: 0 })
  if (!so || !so.relato.corrigido || c2 !== 1) e.push('roteiro sem pedido não leu a fala')
  let c3 = 0
  const fig = await S.sujeitoEmTodosOsMotores({ pedido: PEDIDO, falas: ['Money is a lie they sold you for decades.'], planos: ['A man counting bills'], pessoaPermitida: true, estrada: 'classica' }, { fetchImpl: async (...a) => { c3++; return resposta(NADA)(...a) }, tentativasExtras: 0 })
  if (fig && fig.planos[0] !== 'A man counting bills') e.push('sem sujeito mexeu no plano')
  return e
}

const e1 = provasEpoca(carrega(EP))
checa(`A o sufixo de época não põe carro${e1.length ? ': ' + e1.join(' · ') : ''}`, e1.length === 0)
const e2 = await provasSujeito(carrega(SU))
checa(`B o sujeito também vem da 1ª frase da fala${e2.length ? ': ' + e2.join(' · ') : ''}`, e2.length === 0)
const srcE = fs.readFileSync(EP, 'utf8')
const mE = (t) => t.replace('a car or carriage, only if the shot describes one, is ${p.veiculos} (do not add vehicles the shot does not mention; an aircraft, ship or train stays exactly what the shot says)', 'any vehicle in frame is ${p.veiculos}')
checa('mutante "ordem de pôr carro" fica vermelho', mE(srcE) !== srcE && provasEpoca(carrega(EP, mE)).length > 0)
const srcS = fs.readFileSync(SU, 'utf8')
const mS = (t) => t.replace('if (!frase) return doPedido', 'return doPedido')
checa('mutante "não lê a fala" fica vermelho', mS(srcS) !== srcS && (await provasSujeito(carrega(SU, mS))).length > 0)
console.log(`\n${ok} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
