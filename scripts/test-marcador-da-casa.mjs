// GUARDIAO — KINEO-MARCADOR-DA-CASA-2026-09-05
//
// Prova que o auto-start parou de recusar o roteiro que a PROPRIA CASA escreveu.
//
// O defeito: `app/HomeTopicForm.tsx` escreve o roteiro do visitante de graca na
// home, ele aprova, e o handoff para /signup manda o texto em marcadores da casa
// ("HOOK: ...", "MICRO REWARD 1: ..."). `looksLikeInstruction` lia "HOOK:" com o
// seu LABEL_LINE (feito para "STYLE:" de colagem de chatbot) e devolvia true:
// auto-start pulado com `prompt_looks_like_instruction`, e um aviso na tela
// dizendo "Your ChatGPT script is still here" para quem nunca colou nada.
//
// Este guardiao le os ARQUIVOS REAIS. Nao basta a biblioteca estar certa: se o
// HomeTopicForm mudar o formato do handoff, ou se o GenerateClient parar de
// consultar looksLikeInstruction, o conserto deixa de alcancar o cliente e o
// teste tem de ficar vermelho. Por isso ha um bloco de PROVA DO CHAMADOR.
//
// Rodar:  node scripts/test-marcador-da-casa.mjs

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const raiz = process.cwd()
// Licao do #1: guardiao que compara literais tem de normalizar a quebra de linha,
// senao vive vermelho no Windows e verde na CI, e o vermelho vira paisagem.
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8').split('\r\n').join('\n')

let ok = 0
const falhas = []
function checa(nome, condicao) {
  if (condicao) { ok++; return }
  falhas.push(nome)
}

const { looksLikeInstruction, pickMomentumTopic } = await import(
  pathToFileURL(path.join(raiz, 'lib/momentumTopic.ts')).href
)
const { pareceRoteiroDaCasa, temMarcadores } = await import(
  pathToFileURL(path.join(raiz, 'lib/nextEpisodeMarkers.ts')).href
)

// ── 1. PROVA DO CHAMADOR: o formato que este teste usa e o formato que o codigo
//       da home realmente produz. Se um dos dois mudar, o teste cai.
const home = ler('app/HomeTopicForm.tsx')
checa('home: markerFor mapeia HOOK', /if \(normalized === 'HOOK'\) return 'HOOK'/.test(home))
checa('home: markerFor mapeia FACT 1 -> MICRO REWARD 1', /'FACT 1'\) return 'MICRO REWARD 1'/.test(home))
checa('home: markerFor mapeia FACT 3 -> ESCALATION', /'FACT 3'\) return 'ESCALATION'/.test(home))
checa('home: markerFor mapeia PAYOFF', /'PAYOFF'\) return 'PAYOFF'/.test(home))
checa('home: buildActivationPrompt junta com quebra de linha', home.includes("out.join('\\n')"))
checa('home: buildActivationPrompt escreve "MARCADOR: texto"', home.includes('${marker}: ${text}'))
checa('home: o handoff vai para /signup com ?prompt=', home.includes('/signup?${params.toString()}'))

// ── 2. PROVA DO CHAMADOR: o porteiro do auto-start ainda consulta a funcao que
//       eu consertei — senao o conserto nao chega em ninguem.
const gen = ler('app/(dashboard)/generate/GenerateClient.tsx')
checa('generate: importa looksLikeInstruction', gen.includes("import { looksLikeInstruction } from '@/lib/momentumTopic'"))
checa('generate: pula o auto-start quando looksLikeInstruction e true',
  gen.includes('if (looksLikeInstruction(explicitPrompt)) {'))
checa('generate: o motivo do pulo continua prompt_looks_like_instruction',
  gen.includes("consumeAndSkip('prompt_looks_like_instruction')"))

// ── 3. O CASO REAL: o handoff da home, montado como o HomeTopicForm monta.
//       Comprimento na faixa medida em producao (338-431 chars).
const roteiroDaCasa = [
  'HOOK: In 1833, the sky over North America filled with a hundred thousand falling stars.',
  'MICRO REWARD 1: Farmers woke their children, certain the world was ending that night.',
  'MICRO REWARD 2: Newspapers printed nothing else for a week, and nobody could explain it.',
  'ESCALATION: It was not the end of anything, it was the Earth crossing a comet trail.',
  'PAYOFF: That single night is why we have the words "meteor shower" at all.',
].join('\n')
checa('handoff da home cai na faixa medida (300-500 chars)',
  roteiroDaCasa.length > 300 && roteiroDaCasa.length < 500)
checa('DEFEITO CONSERTADO: o roteiro da casa NAO e instrucao',
  looksLikeInstruction(roteiroDaCasa) === false)
checa('o roteiro da casa e reconhecido como roteiro da casa',
  pareceRoteiroDaCasa(roteiroDaCasa) === true)
// Prova de que o LABEL_LINE antigo pegaria: a primeira linha bate no padrao que
// causava o falso positivo. Sem isto o teste poderia estar verde por acidente.
checa('a primeira linha AINDA bate no padrao que causava o falso positivo',
  /^[A-Z][A-Z /&-]{2,}:/.test(roteiroDaCasa.split('\n')[0]))

// Rotulo em linha propria (o esqueleto que /api/next-episode devolve) tambem passa.
const esqueletoEpisodio = [
  'HOOK', 'The city sank in a single afternoon.', '',
  'MICRO REWARD', 'It had stood for four hundred years.', '',
  'ESCALATION', 'The water never gave it back.', '',
  'PAYOFF', 'It is still down there.',
].join('\n')
checa('esqueleto do episodio 2 (rotulo em linha propria) nao e instrucao',
  looksLikeInstruction(esqueletoEpisodio) === false)
checa('esqueleto do episodio 2 continua valendo em temMarcadores',
  temMarcadores(esqueletoEpisodio) === true)

// ── 4. NAO AFROUXOU: tudo que era recusado ontem continua recusado hoje.
const colagens = [
  ['resposta de chatbot com markdown',
   'Absolutely. Below is a **complete content package** for your Short.\n\nSTYLE: Bright, colourful'],
  ['ordem ao chatbot',
   'Create a 40-second Shorts video titled "The Moon is drifting away"'],
  ['rotulo de producao',
   'STYLE: Bright, colourful, fast cuts\nMAIN CHARACTER: a young astronomer\nTHEME: space'],
  ['duas frases de regra',
   'The narrator must be male. All spoken dialogue must be in FRENCH ONLY.'],
  ['markdown de titulo',
   '## The 1833 meteor storm\n\nA short about the night the sky fell.'],
  ['pedido educado',
   'Please make me a 35-second video about the deepest hole ever dug.'],
]
for (const [nome, texto] of colagens) {
  checa(`NAO AFROUXOU: ${nome} continua sendo instrucao`, looksLikeInstruction(texto) === true)
  checa(`NAO AFROUXOU: ${nome} nao passa por roteiro da casa`, pareceRoteiroDaCasa(texto) === false)
}

// Um "HOOK:" solto no meio de uma colagem NAO vira passe livre.
const colagemComUmMarcador = 'Absolutely! Here is your script.\n\nHOOK: The sky fell in 1833.\n\nHope this helps!'
checa('um marcador dentro de colagem nao vira passe livre',
  pareceRoteiroDaCasa(colagemComUmMarcador) === false)
checa('colagem com um marcador continua sendo instrucao',
  looksLikeInstruction(colagemComUmMarcador) === true)

// Comeca com marcador mas so tem DOIS distintos: fica de fora do passe livre.
const doisMarcadores = 'HOOK: The sky fell.\nPAYOFF: And nobody knew why.'
checa('so dois marcadores distintos nao basta', pareceRoteiroDaCasa(doisMarcadores) === false)

// Borda: entradas degeneradas nao explodem.
const bordas = [['null', null], ['undefined', undefined], ['vazio', ''], ['espacos', '   \n  '], ['numero', 42]]
for (const [nome, v] of bordas) {
  checa(`borda ${nome}: pareceRoteiroDaCasa devolve false sem explodir`, pareceRoteiroDaCasa(v) === false)
}

// ── 5. O VIZINHO NAO SE MEXEU: `pickMomentumTopic` (ancora do e-mail de momentum)
//       mora no mesmo arquivo, mas NAO chama looksLikeInstruction — usa
//       INSTRUCTION_START/LABEL_LINE direto sobre o titulo ja extraido. Prova
//       lendo o arquivo, para o dia em que alguem "simplificar" reaproveitando.
const mom = ler('lib/momentumTopic.ts')
const corpoPick = mom.slice(mom.indexOf('export function pickMomentumTopic'))
checa('vizinho: pickMomentumTopic nao passou a depender de looksLikeInstruction',
  corpoPick.includes('looksLikeInstruction') === false)
// E o comportamento observavel: ele tira o rotulo e devolve o gancho — que e a
// ancora certa do e-mail. Nao e "rejeitar", e "extrair"; o teste diz o que e.
checa('vizinho: pickMomentumTopic extrai o gancho do roteiro da casa',
  pickMomentumTopic(roteiroDaCasa) ===
    'In 1833, the sky over North America filled with a hundred thousand falling stars.')
checa('vizinho: pickMomentumTopic continua aceitando gancho limpo',
  pickMomentumTopic('The night the sky fell over America') === 'The night the sky fell over America')
checa('vizinho: pickMomentumTopic continua recusando colagem de chatbot',
  pickMomentumTopic('STYLE: Bright, colourful, fast cuts') === null)

// ── resultado
const total = ok + falhas.length
if (falhas.length) {
  console.error(`\nVERMELHO — ${falhas.length} de ${total} falharam:`)
  for (const f of falhas) console.error(`  x ${f}`)
  process.exit(1)
}
console.log(`VERDE — ${ok}/${total} verificacoes`)
