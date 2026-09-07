// GUARDIÃO — `fit` NÃO É VEREDITO (07/09/2026, ciclo gpt-loja)
//
// O DEFEITO QUE ISTO TRAVA, medido em produção com uma sonda real:
//   POST /api/gpt/handoff, roteiro de 150 palavras, durationSec 60, seedance
//   → fit: "short", fitMessage: "About 48s of narration for a 60s video —
//     the story may end early..."
//   → outcome.kind: "at_target", outcomeMessage: "Ready for a 60-second film."
//
// A MESMA resposta carrega as duas frases. `fit` é o orçamento de palavras por
// VOZ; `outcome` é a régua de quem cobra (o Studio antes de renderizar). A
// página /go já foi corrigida para ler `outcome`. Mas o GPT não lê a página:
// ele lê o openapi.json e as instruções do docs/GPT-KINEO-VIDEO-MAKER.md — e os
// dois ainda mandavam comentar o comprimento a partir de `fit`. O resultado
// seria o GPT dizendo "seu roteiro pode acabar cedo, quer que eu estenda?" para
// um roteiro CORRETO, no instante em que a pessoa acabou de aprová-lo.
//
// A regra vive em três arquivos (a descrição do 200, a do campo `fitMessage` e
// o Step 6 do doc). Consertar um e fechar o caso deixa a mentira viva nos
// outros — é por isso que este guardião lê os DOIS que restaram e cobra a
// mesma invariante em ambos: toda frase que MANDA falar sobre comprimento tem
// de se apoiar em `outcome`, e toda menção a `fit` como base de aviso tem de
// vir negada.
//
// Roda com `node scripts/test-gpt-fit-nao-e-veredito.mjs` (sem alias @/, senão
// morre no import antes da 1ª verificação).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const OPENAPI = join(raiz, 'public', 'gpt', 'openapi.json')
const DOC = join(raiz, 'docs', 'GPT-KINEO-VIDEO-MAKER.md')

let ok = 0
const falhas = []
function checa(nome, condicao, detalhe = '') {
  if (condicao) ok += 1
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ''}`)
}

// ── os arquivos, crus e parseados ─────────────────────────────────────────────
const cru = readFileSync(OPENAPI, 'utf8')
const doc = readFileSync(DOC, 'utf8')

let spec = null
try {
  spec = JSON.parse(cru)
  checa('1. openapi.json é JSON válido', true)
} catch (e) {
  checa('1. openapi.json é JSON válido', false, String(e.message))
}

// ── o caminho até os campos que o modelo lê ───────────────────────────────────
const post = spec?.paths?.['/api/gpt/handoff']?.post
checa('2. a operação POST /api/gpt/handoff existe no spec', Boolean(post))

const resp200 = post?.responses?.['200']
// O schema da 200 vem por $ref: resolver o ponteiro é parte da prova — um
// guardião que lê o objeto inline passaria verde num spec que o GPT não usa.
const ref = resp200?.content?.['application/json']?.schema?.$ref ?? ''
const nomeSchema = ref.split('/').pop()
const schema200 = nomeSchema ? spec?.components?.schemas?.[nomeSchema] : null
checa('3. o schema da resposta 200 resolve pelo $ref', Boolean(schema200), `ref: ${ref}`)
const props = schema200?.properties ?? null

const descFit = props?.fit?.description ?? ''
const descFitMessage = props?.fitMessage?.description ?? ''
const descOutcome = props?.outcome?.description ?? ''
const desc200 = resp200?.description ?? ''

checa('4. o campo `fitMessage` existe e é descrito', descFitMessage.length > 40)
checa('5. o campo `outcome` existe e é descrito', descOutcome.length > 40)

// ── A INVARIANTE, ligada à variável que decide ────────────────────────────────
// Não basta o texto "não avise": o que importa é QUAL CAMPO governa a fala
// sobre comprimento. Onde `outcome` governa, o guardião exige que ele apareça
// nominalmente; onde `fit` aparece, exige que venha negado.

const NEGACAO = /(never|not the verdict|ignore|only when|only if|do not)/i

checa(
  '6. a descrição do 200 manda ler `outcome.kind` para falar de comprimento',
  /outcome\.kind/.test(desc200),
  'a instrução de topo perdeu a âncora no veredito'
)
checa(
  '7. a descrição do 200 proíbe avisar a partir de `fit`',
  NEGACAO.test(desc200) && /`?fitMessage`?/.test(desc200),
  'o topo precisa dizer explicitamente o que NÃO fazer com fitMessage'
)
checa(
  '8. a descrição do campo `fit` diz que ele NÃO é o veredito',
  /not the verdict/i.test(descFit) || /`?outcome`?\b/.test(descFit),
  descFit.slice(0, 120)
)
checa(
  '9. a descrição do campo `fit` proíbe avisar a partir dele',
  NEGACAO.test(descFit),
  descFit.slice(0, 120)
)

// O coração: a descrição do `fitMessage` NÃO pode instruir a citá-lo sempre que
// se comentar comprimento. Ela tem de ser condicional e tem de apontar o
// veredito verdadeiro.
checa(
  '10. `fitMessage` não é mais a frase padrão sobre comprimento',
  !/when you comment on the length/i.test(descFitMessage),
  'voltou a instrução que faz o GPT chamar de curto um roteiro at_target'
)
checa(
  '11. `fitMessage` só é citado se a PESSOA perguntar como se mediu',
  /only\b[^.]{0,80}\basks?\b[^.]{0,80}\bmeasured\b/i.test(descFitMessage),
  descFitMessage.slice(0, 160)
)
checa(
  '12. `fitMessage` aponta `outcomeMessage` como a única frase do desfecho',
  /outcomeMessage/.test(descFitMessage),
  descFitMessage.slice(0, 160)
)
checa(
  '13. `fitMessage` avisa que ele mente sobre roteiro que renderiza inteiro',
  /(may end early|full requested duration|render[s]? at full length)/i.test(descFitMessage),
  'sem o exemplo do erro, a próxima sessão não entende por que a regra existe'
)
checa(
  '14. `outcome` é descrito como a régua que o Studio aplica',
  /studio applies/i.test(descOutcome),
  descOutcome.slice(0, 140)
)

// ── O MESMO no documento que o fundador cola no editor do GPT ─────────────────
const passo6 = doc.split('## Step 6')[1]?.split('\n## ')[0] ?? ''
checa('15. o doc tem o Step 6 (a mensagem final do GPT)', passo6.length > 200)

checa(
  '16. o doc não condiciona mais o aviso a `fit is "short"`',
  !/if the response says fit is "short"/i.test(doc),
  'a instrução antiga voltaria a acusar de curto o roteiro certo'
)
checa(
  '17. o Step 6 manda ler `outcome.kind`',
  /outcome\.kind/.test(passo6),
  passo6.slice(0, 160)
)
checa(
  '18. o Step 6 manda calar sobre comprimento quando é `at_target`',
  /at_target/.test(passo6) && /(say nothing|NOTHING)/i.test(passo6),
  'sem isso o GPT comenta comprimento de um filme que sai no alvo'
)
checa(
  '19. o Step 6 só oferece estender quando é `shorter_film`',
  /shorter_film/.test(passo6) && /extend the script/i.test(passo6),
  'a oferta de estender tem de estar amarrada ao desfecho, não ao orçamento'
)
checa(
  '20. o Step 6 manda IGNORAR `fit`/`fitMessage` como aviso',
  /ignore\b[^.]{0,60}`?fit`?/i.test(passo6),
  passo6.slice(0, 200)
)

// ── A VARREDURA CRUZADA — nenhuma frase imperativa sobre comprimento pode se
//    apoiar em `fit` sem negação. É o que impede o conserto de nascer de novo
//    em um quarto portador que ninguém audita.
const frasesDoDoc = passo6.split(/(?<=\.)\s+/)
const todasAsDescricoes = [desc200, descFit, descFitMessage, descOutcome]
const frasesDoSpec = todasAsDescricoes.flatMap((d) => d.split(/(?<=\.)\s+/))
const suspeitas = [...frasesDoDoc, ...frasesDoSpec].filter((f) => {
  const mandaFalarDeComprimento = /(extend the script|end early|too short|call the script short)/i.test(f)
  const seApoiaEmFit = /\bfit\b|fitMessage/i.test(f)
  return mandaFalarDeComprimento && seApoiaEmFit && !NEGACAO.test(f)
})
checa(
  '21. nenhuma frase manda falar de comprimento a partir de `fit` sem negação',
  suspeitas.length === 0,
  suspeitas.map((s) => s.slice(0, 120)).join(' | ')
)

// ── O contrato não pode ter sumido: os campos continuam sendo devolvidos ──────
const requeridos = schema200?.required ?? []
for (const campo of ['fit', 'fitMessage', 'outcome', 'outcomeMessage', 'url']) {
  checa(`22.${campo} continua obrigatório na resposta`, requeridos.includes(campo), `required: ${requeridos.join(',')}`)
}

// ── veredito ─────────────────────────────────────────────────────────────────
console.log(`\n${ok} verificações ok, ${falhas.length} falhas`)
if (falhas.length) {
  for (const f of falhas) console.log(`  ✗ ${f}`)
  process.exit(1)
}
console.log('✓ `fit` não governa nenhuma frase sobre o que a pessoa vai receber')
