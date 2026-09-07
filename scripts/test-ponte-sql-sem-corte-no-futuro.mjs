// ═══ GUARDIÃO — o instrumento da ponte não pode voltar a cortar por HORA ════
//
// O DEFEITO QUE ISTO TRAVA, com relógio:
// Em 07/09 a casa escreveu DUAS vezes um corte de deploy no FUTURO. Em
// `docs/queries/PONTE-COM-PRECO-2026-09-07.sql` o corte ficou em 07:10Z com o
// relógio em 05:32Z (1h38 no futuro). No fechamento do ciclo gpt-loja a
// próxima sessão foi mandada cortar em `2026-09-07 07:00Z` — e às 06:52Z esse
// instante ainda não tinha chegado. Uma consulta com corte no futuro devolve
// ZERO por aritmética pura, e zero se lê como "ninguém veio". É a pior classe
// de erro de medição: o número existe, tem cara de resposta e não mede nada.
//
// A CAUSA-RAIZ é conhecida e não some sozinha: o Git Bash desta máquina não
// tem tzdata, então `TZ=America/Sao_Paulo date` devolve UTC rotulado GMT — 3h
// adiantado — e quem carimba a hora a partir daí carimba o futuro.
//
// A CURA, e o que este arquivo prova: o SQL da ponte separa sonda de pessoa
// pela ORIGEM (`ip_hash`), não pelo relógio. Este guardião lê o arquivo real e
// reprova qualquer recaída para corte por hora nas consultas (1) e (1b), que
// são as duas que respondem "já veio alguém?".
//
// FALSIFICAÇÃO: troque a cláusula `not in (...)` da (1b) por
// `created_at > '2026-09-07T07:00:00Z'` e este teste reprova.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const CAMINHO = 'docs/queries/PONTE-HANDOFF-FUNIL-2026-09-07.sql'
// Normalizar CRLF na leitura: no checkout do Windows o arquivo chega com \r\n
// e toda regex de mais de uma linha falharia por motivo que não é o defeito.
const sql = readFileSync(join(raiz, CAMINHO), 'utf8').replace(/\r\n/g, '\n')

const SONDAS = [
  '67fc14c5443b51680991b631ce1a7ec3aa53386b95a5c76a4e386f6d77321e0d',
  '04b852318d49a58963ac5a5303af0e4cbf8725197864c53dc9df553730410625',
]

let falhas = 0
let feitas = 0
function checar(nome, condicao, detalhe = '') {
  feitas += 1
  if (condicao) return
  falhas += 1
  console.error(`✗ ${nome}${detalhe ? ` — ${detalhe}` : ''}`)
}

// ── O corpo executável: tudo que NÃO é comentário. É onde um corte por hora
//    faria estrago; nos comentários ele é a explicação do erro e tem de poder
//    ficar (este arquivo conta a história do defeito para quem vier depois).
const executavel = sql
  .split('\n')
  .filter((linha) => !linha.trimStart().startsWith('--'))
  .join('\n')

checar(
  'nenhum corte por data literal no corpo executável',
  !/\b(created_at|clicked_at|viewed_at)\s*[><]=?\s*'20\d\d/i.test(executavel),
  'achei comparação de timestamp com literal — o separador é ip_hash, não relógio',
)

checar(
  'a explicação do corte no futuro continua no arquivo',
  sql.includes('NO FUTURO'),
  'quem apagar a lição vai repetir o erro',
)

// ── As duas consultas que respondem "já veio alguém?" precisam das duas
//    sondas. Amarrado ao VALOR que decide, não à contagem de linhas: um
//    mutante que apague um hash reprova aqui.
for (const hash of SONDAS) {
  const ocorrencias = executavel.split(hash).length - 1
  checar(
    `sonda ${hash.slice(0, 8)}… excluída nas DUAS consultas`,
    ocorrencias >= 2,
    `apareceu ${ocorrencias}× no corpo executável, esperado ≥2 (consulta 1 e 1b)`,
  )
}

// ── A (1b) é a pergunta de uma linha. Ela existe e não filtra por tempo.
const bloco1b = sql.slice(sql.indexOf('-- (1b)'))
const corpo1b = bloco1b
  .slice(0, bloco1b.indexOf(';') + 1)
  .split('\n')
  .filter((linha) => !linha.trimStart().startsWith('--'))
  .join('\n')

checar('a consulta (1b) existe', sql.includes('-- (1b)'))
checar(
  'a (1b) não tem janela de tempo',
  corpo1b.length > 0 && !/interval|now\(\)|'20\d\d-/i.test(corpo1b),
  'um `interval` ou um literal de data aqui reintroduz o zero por aritmética',
)
checar(
  'a (1b) exclui as sondas por ip_hash',
  /ip_hash\s+not\s+in/i.test(corpo1b),
  'sem a exclusão, a resposta "já veio alguém?" conta os 16 ensaios da casa',
)

// ── A (1) separa e RÓTULA, em vez de esconder: quem lê tem de ver os dois
//    lados na mesma tabela.
checar(
  "a consulta (1) rotula 'organico' e 'sonda'",
  executavel.includes("'organico'") && executavel.includes("'sonda'"),
)

console.log(
  falhas === 0
    ? `✓ ${feitas} verificações — o instrumento da ponte separa por origem, não por relógio`
    : `✗ ${falhas} de ${feitas} verificações falharam`,
)
process.exit(falhas === 0 ? 0 : 1)
