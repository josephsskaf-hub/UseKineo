// KINEO-FECHO-ABERTURA-0311 [TRAVA 8.2 — fundador 03/11: "vamos pegar todos esses defeitos que já são conhecidos e arrumar todos, universalizar"] — guardião.
// Defeito (revisor, 9 primeiros filmes): o filme abre e fecha com o MESMO plano (Kling 4 da escotilha; Vênus com a mesma galáxia
// nos 3 últimos quadros). A regra "o fecho não repete a abertura" vivia só no descritor clássico; o planejador hollywood lê
// REGRAS_DO_ESCRITOR_DE_CENAS (lib/cinematic/cenarioDoFilme.ts) e não a via.
// Prova OFFLINE, EXECUTANDO o código REAL transpilado (GPT trocado por um gravador, nenhuma chamada sai):
//   A. REGRAS_DO_ESCRITOR_DE_CENAS traz a regra do fecho ≠ abertura (com a variante do apresentador);
//   B. o planejador hollywood (planHollywoodScenes) MANDA a regra no prompt de sistema ao GPT; o descritor clássico também a lê;
//   C. a rede determinística universal (prepararQualidadeDoFilme, as duas estradas): o caso da escotilha — última cena quase igual
//      à 1ª — sai com o eixo do desfecho; a 1ª cena fica intacta; cenas diferentes ficam intactas;
//   M. mutantes (regra fora da lista, lista fora do planejador, rede desligada) ficam VERMELHOS.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const globals = { AbortController, setTimeout: () => 0, clearTimeout() {} }
const LINHA = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty one twenty two'
const pedidos = []
const openai = { chat: { completions: { create: async (req) => { pedidos.push(req); return { choices: [{ message: { content: JSON.stringify({ genre: 'documentary', hostFits: false, stylized: false, characterSheet: 'a man in a grey sweater', environmentSheet: 'a small submarine', styleSheet: 'film', scenes: [
  { index: 1, type: 'support', beat: 'HOOK', seconds: 10, prompt: 'A man looks out of a round submarine hatch', voiceover: LINHA, caption: 'a' },
  { index: 2, type: 'support', beat: 'PAYOFF', seconds: 10, prompt: 'The hatch opens to the sunlight', voiceover: LINHA, caption: 'b' }] }) } }] } } } } }
const mocks = { '@/lib/openai': { openai, OPENAI_TTS_TIMEOUT_MS: 1 }, '@fal-ai/client': { fal: { config() {}, subscribe() { throw Error('fal proibida no guardião') } } } }
const mundo = (mutar = {}) => createOfflineLoader({ mocks, globals, source: (rel, text) => (mutar[rel] ? mutar[rel](text) : text) })

const REGRA = 'KINEO-FECHO-ABERTURA-0311 CLOSING SHOT DIFFERS FROM THE OPENING'
async function promptDoPlanejador(L) {
  pedidos.length = 0
  await L('lib/hollywood/router.ts').planHollywoodScenes({ idea: 'The man in the submarine hatch', durationSeconds: 35, language: 'en', faceless: true })
  return pedidos[0]?.messages?.find((m) => m.role === 'system')?.content ?? ''
}

// Caso real (fd0a408e / 33d4e5ad): 3 planos, o último é o da abertura de novo; a fala do fim não tem then/finally (a regra do desfecho por palavra não dispara).
const P = ['A man in a grey sweater stares through the round brass hatch window of a submarine, dim blue light, slow push-in',
  'Deep dark water outside the hull, a faint shape moving in the distance, macro detail',
  'A man in a grey sweater stares through the round brass hatch window of a submarine, dim blue light, slow push-in, tense']
const F = ['He looked out of the hatch.', 'Something moved in the dark.', 'The hatch opened to the sunlight.']
function rede(L) {
  const FQ = L('lib/cinematic/filmQuality.ts'), SS = L('lib/cinematic/sceneStyle.ts')
  const style = SS.deriveStyleAnchor('a man in a submarine')
  const corre = (prompts, falas) => FQ.prepararQualidadeDoFilme({ prompts, falas, contextoOriginal: prompts.join(' ') + ' ' + falas.join(' '), contextoFiltro: null, modo: 'documentary_faceless', tagFaceless: true, style }).prompts
  const base = corre(P.map((p, i) => (i === 2 ? 'Bright sunlight floods an open hatch on a calm sea surface, wide aerial shot' : p)), F)
  return { igual: corre(P, F), diferente: base, FQ }
}

async function provas(L) {
  const erros = []
  const regras = L('lib/cinematic/cenarioDoFilme.ts').REGRAS_DO_ESCRITOR_DE_CENAS
  if (!regras.includes(REGRA) || !/closing host shot uses a different shot size/.test(regras)) erros.push('A a regra não está em REGRAS_DO_ESCRITOR_DE_CENAS')
  const sys = await promptDoPlanejador(L)
  if (!sys.includes(REGRA)) erros.push('B o planejador hollywood não manda a regra ao GPT')
  const { igual, diferente } = rede(L)
  if (!/^Film visual medium: [^.]+\. final moment of the story, a different place and angle from the opening shot/.test(igual[2])) erros.push('C a última cena igual à 1ª não ganhou o eixo do desfecho: ' + igual[2].slice(0, 120))
  if (igual[0].includes('final moment')) erros.push('C a 1ª cena mudou')
  if (diferente[2].includes('different place and angle from the opening')) erros.push('C cena final diferente foi mexida')
  return erros
}

console.log('A-C) o código real')
const erros = await provas(mundo())
checa('a regra está na lista comum, chega ao planejador hollywood e a rede universal corrige o fecho igual à abertura' + (erros.length ? ' — ' + erros.join(' | ') : ''), erros.length === 0)
const rota = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
checa('o descritor clássico também lê a lista comum (REGRAS_DO_ESCRITOR_DE_CENAS no prompt do generateCinematicDescriptions)', /async function generateCinematicDescriptions[\s\S]{0,9000}\$\{REGRAS_DO_ESCRITOR_DE_CENAS\}/.test(rota))
const router = lf(fs.readFileSync('lib/hollywood/router.ts', 'utf8'))
checa('o planejador hollywood interpola a lista comum no prompt de sistema', router.includes('\n${REGRAS_DO_ESCRITOR_DE_CENAS}\n'))

console.log('M) mutantes')
const mutantes = [
  ['regra fora da lista comum', { 'lib/cinematic/cenarioDoFilme.ts': (t) => t.replace(/\n  '- KINEO-FECHO-ABERTURA-0311[^\n]*/, '') }, 'B'],
  ['lista comum fora do planejador hollywood', { 'lib/hollywood/router.ts': (t) => t.replace('\n${REGRAS_DO_ESCRITOR_DE_CENAS}\n', '\n') }, 'B'],
  ['rede determinística desligada (cenaQuaseIgual sempre falso)', { 'lib/cinematic/filmQuality.ts': (t) => t.replace('export function cenaQuaseIgual(a: string, b: string, ignorar: ReadonlyArray<string> = []): boolean {', 'export function cenaQuaseIgual(a: string, b: string, ignorar: ReadonlyArray<string> = []): boolean { return false;') }, 'C'],
]
for (const [nome, mutar, letra] of mutantes) {
  const fonteMudou = Object.entries(mutar).every(([rel, f]) => f(lf(fs.readFileSync(rel, 'utf8'))) !== lf(fs.readFileSync(rel, 'utf8')))
  const e = await provas(mundo(mutar))
  checa(`mutante "${nome}" fica VERMELHO (${letra})`, fonteMudou && e.some((x) => x.startsWith(letra)))
}

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { console.log('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
