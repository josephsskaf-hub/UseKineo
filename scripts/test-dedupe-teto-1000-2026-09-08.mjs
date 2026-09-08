// KINEO-DEDUPE-TETO-1000-2026-09-08 — guardião da leitura de idempotência do
// cron de ciclo de vida do trial.
//
// O QUE ELE PROTEGE, E POR QUE ISSO NÃO É TEORIA
// ──────────────────────────────────────────────
// O PostgREST deste projeto corta TODA resposta em 1.000 linhas SEM devolver
// erro (`db.max_rows = 1000`). Em `app/api/cron/trial-lifecycle-emails` existe
// UMA leitura sem janela de tempo — a de idempotência, `trial_emails_log`, que
// responde "quem já recebeu qual kind". Idempotência vale para sempre, então
// aquela tabela só cresce, e cada conta traz uma linha POR KIND, não uma linha.
//
// MEDIDO NO BANCO EM 08/09/2026, antes do conserto:
//   · 3.149 linhas para 812 contas = 3,88 kinds por conta;
//   · um bloco de 200 contas MADURAS (>14d) = 962 linhas — 96% do teto;
//   · as 200 contas mais pesadas = 1.033 linhas — JÁ acima do teto;
//   · com os 6 kinds de hoje maduros, 200 contas = 1.200 linhas (17% perdido).
// A leitura pedia 200 contas por requisição, e o comentário que justificava o
// 200 falava de COMPRIMENTO DE URL — uma razão que nunca contou linhas.
//
// O DANO NÃO É SPAM, e dizer isso importa para ninguém "consertar" de novo o
// que já está fechado: o claim do passo 4b (PK user_id+email_kind, upsert com
// ignoreDuplicates) torna envio duplo impossível por construção. O dano é que
// quem JÁ recebeu reaparece em `fresh`, ocupa vaga no `batch` de MAX_PER_RUN e
// some no claim — o teto da execução é gasto com no-op, e quem devia receber
// naquela hora fica para a próxima.
//
// ESTILO: leitura de arquivo + CONTAGEM. Nada de `assert` que morre na primeira
// falha e esconde as outras; e as verificações se amarram à CONDIÇÃO (o número
// que decide, a chamada que decide) e não à redação do comentário.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROTA = 'app/api/cron/trial-lifecycle-emails/route.ts'
const src = readFileSync(join(raiz, ROTA), 'utf8').replace(/\r\n/g, '\n')

const TETO_POSTGREST = 1000

let ok = 0
let mal = 0
const falhas = []
function check(nome, condicao) {
  // Ordem dos argumentos: NOME primeiro, CONDIÇÃO depois. Trocar os dois faz a
  // trava passar sem avaliar nada (guardiao-vermelho-pode-estar-parado).
  if (condicao === true) ok++
  else {
    mal++
    falhas.push(nome)
  }
}

// ── Constantes que decidem ────────────────────────────────────────────────────
function constNum(nome) {
  const m = src.match(new RegExp('const\\s+' + nome + '\\s*=\\s*([0-9_]+)'))
  return m ? Number(m[1].replace(/_/g, '')) : null
}

const usuariosPorQuery = constNum('EMAIL_LOG_USERS_PER_QUERY')
const pagina = constNum('EMAIL_LOG_PAGE')
const tetoBloco = constNum('EMAIL_LOG_HARD_CAP')

check('EMAIL_LOG_USERS_PER_QUERY existe e é número', typeof usuariosPorQuery === 'number')
check('EMAIL_LOG_PAGE existe e é número', typeof pagina === 'number')
check('EMAIL_LOG_HARD_CAP existe e é número', typeof tetoBloco === 'number')

// ── Quantos kinds existem HOJE (a condição, não um 6 cravado à mão) ──────────
// Se um 7º kind nascer, este guardião recalcula sozinho e fica vermelho quando
// a folga acabar. É a diferença entre travar o número e travar a razão dele.
const blocoKinds = src.match(/const KIND_PRIORITY[^{]*\{([\s\S]*?)\n\}/)
const kinds = blocoKinds ? (blocoKinds[1].match(/^\s{2}\w+\s*:/gm) || []).length : 0
check('KIND_PRIORITY foi encontrado e tem pelo menos 1 kind', kinds >= 1)

const piorCaso = (usuariosPorQuery ?? 0) * kinds
check(
  `pior bloco possível (${usuariosPorQuery} contas × ${kinds} kinds = ${piorCaso}) fica ABAIXO do teto de ${TETO_POSTGREST}`,
  piorCaso > 0 && piorCaso < TETO_POSTGREST,
)
check(
  `pior bloco tem folga real (≥2× abaixo do teto): ${piorCaso} ≤ ${TETO_POSTGREST / 2}`,
  piorCaso > 0 && piorCaso <= TETO_POSTGREST / 2,
)
check(
  `EMAIL_LOG_PAGE (${pagina}) fica ABAIXO do teto do servidor — página cheia tem de ser sinal de "tem mais", não o teto do PostgREST`,
  typeof pagina === 'number' && pagina > 0 && pagina < TETO_POSTGREST,
)
check(
  'EMAIL_LOG_HARD_CAP é maior que uma página (senão o laço fecha antes de paginar uma vez)',
  typeof tetoBloco === 'number' && typeof pagina === 'number' && tetoBloco > pagina,
)

// ── A leitura de dedupe: onde ela está e o que ela faz ───────────────────────
// Recorta o trecho entre `const alreadySent` e `const fresh =`, que é o corpo
// exato da leitura de idempotência. Amarrar aqui, e não no arquivo inteiro,
// impede que uma ocorrência de `.range(` de OUTRA leitura pinte esta de verde.
const iIni = src.indexOf('const alreadySent = new Set<string>()')
const iFim = src.indexOf('const fresh = candidates.filter(')
check('o bloco da leitura de dedupe foi localizado', iIni > 0 && iFim > iIni)
const bloco = iIni > 0 && iFim > iIni ? src.slice(iIni, iFim) : ''

check('a leitura de dedupe abre trial_emails_log', bloco.includes("from('trial_emails_log')"))
check(
  'o bloco da leitura de dedupe pede EMAIL_LOG_USERS_PER_QUERY contas por requisição',
  /chunk\([\s\S]*?,\s*EMAIL_LOG_USERS_PER_QUERY\s*\)/.test(bloco),
)
check(
  'o bloco da leitura de dedupe NÃO usa mais um CHUNK_SIZE de 200',
  !/CHUNK_SIZE\s*\)/.test(bloco),
)
check('a leitura de dedupe pagina com .range(', bloco.includes('.range('))
check('a página do .range( é EMAIL_LOG_PAGE', /\.range\(\s*fromRow\s*,\s*fromRow\s*\+\s*EMAIL_LOG_PAGE\s*-\s*1\s*\)/.test(bloco))
check(
  "a paginação tem ordem TOTAL pela PK: .order('user_id') E .order('email_kind')",
  bloco.includes(".order('user_id'") && bloco.includes(".order('email_kind'"),
)
check(
  'o laço só termina quando a página vem CURTA (o único sinal de fim do PostgREST)',
  /got\.length\s*<\s*EMAIL_LOG_PAGE/.test(bloco),
)
check(
  'o cursor avança pelo que veio (fromRow += got.length), não por um passo fixo',
  /fromRow\s*\+=\s*got\.length/.test(bloco),
)

// ── FALHA FECHADA: o ponto em que este guardião já viu remédio virar veneno ──
// Um `break` no teto do bloco sairia do laço e SEGUIRIA com a lista de "já
// recebeu" incompleta — falha ABERTA disfarçada de proteção. O contrato aqui é
// o mesmo da lib/truncationTripwire.ts: ou a lista está completa, ou não sai.
const respostas503 = (bloco.match(/status:\s*503/g) || []).length
check('a leitura de dedupe tem DUAS saídas 503 (erro de leitura E teto de bloco)', respostas503 >= 2)
check(
  'o ramo do teto de bloco RESPONDE 503 em vez de sair do laço com lista incompleta',
  /fromRow\s*>=\s*EMAIL_LOG_HARD_CAP[\s\S]{0,700}?status:\s*503/.test(bloco),
)
check(
  'o ramo do teto de bloco NÃO usa break/continue para escapar (isso seria falha ABERTA)',
  !/fromRow\s*>=\s*EMAIL_LOG_HARD_CAP[\s\S]{0,700}?\b(break|continue)\b/.test(bloco),
)
check(
  'erro de leitura continua fechando (logErr → 503), como antes do conserto',
  /if\s*\(logErr\)\s*\{[\s\S]{0,400}?status:\s*503/.test(bloco),
)

// ── A constante morta não pode voltar ────────────────────────────────────────
// `CHUNK_SIZE = 200` ficou sem chamador quando o dedupe ganhou o bloco próprio.
// Constante morta em arquivo de 2.700 linhas é o próximo comentário falso — e,
// pior, é o número que alguém reusaria por acidente na próxima leitura nova.
check(
  'o CHUNK_SIZE de 200 não existe mais como constante viva neste arquivo',
  !/^const\s+CHUNK_SIZE\s*=/m.test(src),
)

// ── As leituras IRMÃS continuam pequenas pelo mesmo motivo ───────────────────
// Elas já estavam certas; o guardião existe para que uma "unificação de
// constantes" futura não as suba para 200 junto.
const irmaUsuarios = constNum('VIDEO_COUNT_USERS_PER_QUERY')
const irmaPagina = constNum('VIDEO_COUNT_PAGE')
check(
  `leitura irmã (contagem de vídeos) segue pedindo poucas contas por requisição: ${irmaUsuarios}`,
  typeof irmaUsuarios === 'number' && irmaUsuarios > 0 && irmaUsuarios <= 50,
)
check(
  `página da leitura irmã (${irmaPagina}) segue abaixo do teto de ${TETO_POSTGREST}`,
  typeof irmaPagina === 'number' && irmaPagina > 0 && irmaPagina < TETO_POSTGREST,
)

// ── O segundo cadeado, que é o que impede spam de verdade ────────────────────
// Se alguém remover o claim achando que o dedupe do passo 2 basta, o dano deixa
// de ser vaga desperdiçada e passa a ser e-mail duplicado.
check(
  'o claim do passo 4b continua no arquivo (upsert com onConflict user_id,email_kind)',
  /onConflict:\s*'user_id,email_kind'/.test(src),
)
check('o claim do passo 4b continua com ignoreDuplicates: true', /ignoreDuplicates:\s*true/.test(src))

// ── O carimbo do deploy ──────────────────────────────────────────────────────
// Cron autenticado não tem discriminador HTTP: respondia 401 anônimo antes e
// responde 401 anônimo agora. Sem estes dois campos no evento, nenhuma consulta
// separa uma execução do código novo de uma do antigo, e a prova vira torcida.
check(
  'os contadores do dedupe são declarados no bloco da leitura',
  /let dedupeRows = 0/.test(bloco) && /let dedupePages = 0/.test(bloco),
)
check(
  'os contadores são somados por PÁGINA lida, dentro do laço',
  bloco.includes('dedupePages++') && bloco.includes('dedupeRows += got.length'),
)
check(
  'dedupe_rows e dedupe_pages viajam no evento trial_lifecycle_email_sent',
  /name: 'trial_lifecycle_email_sent'[\s\S]{0,1200}?dedupe_rows: dedupeRows/.test(src) &&
    /name: 'trial_lifecycle_email_sent'[\s\S]{0,1200}?dedupe_pages: dedupePages/.test(src),
)

// ── Relatório ────────────────────────────────────────────────────────────────
console.log(`\n[dedupe-teto-1000] ${ok} verificações passaram, ${mal} falharam.`)
if (mal > 0) {
  console.log('\nFALHAS:')
  for (const f of falhas) console.log(`  ✗ ${f}`)
  process.exit(1)
}
console.log('✓ a leitura de idempotência do trial não pode mais truncar em silêncio.')
