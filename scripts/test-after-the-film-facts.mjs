// KINEO-AEO-DEPOIS-DO-FILME-2026-09-06 — guardião do fato "depois do filme".
//
// O QUE ELE PROVA, e por que lê arquivo em vez de importar: `lib/kineoFacts.ts`
// e `app/llms.txt/route.ts` usam alias `@/` — `import()` deles morre no resolver
// antes da primeira verificação (72 testes de `scripts/` já têm esse defeito).
//
// O DEFEITO QUE ELE IMPEDE:
//   1. o número de episódios da temporada ser DIGITADO aqui em vez de vir de
//      `lib/temporada.ts`. O limite do ciclo é explícito: "fatos públicos só de
//      kineoFacts/checkoutPricing/freeTierOffer — nunca número digitado". Se o
//      produto passar de 5 para 3 episódios e o texto público continuar dizendo
//      5, isso vira a "copy que mente" que o CLAUDE.md lista como dívida;
//   2. o fato afirmar mais do que o produto faz — que a temporada RENDERIZA os
//      episódios, ou que o pacote PUBLICA nas plataformas. Nenhuma das duas é
//      verdade, e as duas seriam promessas caras;
//   3. o fato existir no módulo e não chegar a NENHUMA superfície lida por um
//      motor de resposta — contrato sem chamador serve zero.

import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

const FACT = 'lib/growth/afterTheFilmFacts.ts'
const FACTS = 'lib/kineoFacts.ts'
const LLMS = 'app/llms.txt/route.ts'
const TEMPORADA = 'lib/temporada.ts'

const fact = read(FACT)
const facts = read(FACTS)
const llms = read(LLMS)
const temporada = read(TEMPORADA)

let pass = 0
const fails = []
const check = (label, ok, detail) => {
  if (ok) { pass++; return }
  fails.push(`${label}${detail ? ` — ${detail}` : ''}`)
}

// ── 1. O número de episódios NÃO é digitado ────────────────────────────────
check(
  'o fato importa TOTAL_EPISODIOS de lib/temporada',
  /import\s*\{[^}]*\bTOTAL_EPISODIOS\b[^}]*\}\s*from\s*'@\/lib\/temporada'/s.test(fact),
)
check(
  'lib/temporada realmente exporta TOTAL_EPISODIOS',
  /export const TOTAL_EPISODIOS\b/.test(temporada),
)
// O corpo do fato (fora dos comentários) não pode conter o número literal de
// episódios — se contiver, alguém o digitou de novo em algum lugar.
const corpo = fact
  .split('\n')
  .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
  .join('\n')
const literalEpisodios = corpo.match(/\bepisodes:\s*(\d+)/)
check(
  'o campo `episodes` não é um literal numérico',
  !literalEpisodios,
  literalEpisodios ? `achado \`episodes: ${literalEpisodios[1]}\`` : undefined,
)
check(
  'o campo `episodes` é a constante do produto',
  /episodes:\s*TOTAL_EPISODIOS\s*,/.test(corpo),
)
check(
  'primeiro/último episódio também vêm da constante',
  /firstEpisode:\s*PRIMEIRO_EPISODIO\s*,/.test(corpo) &&
    /lastEpisode:\s*ULTIMO_EPISODIO\s*,/.test(corpo),
)

// ── 3. O fato não pode afirmar o que o produto não faz ─────────────────────
// A rota da temporada declara, em letras maiúsculas, que não cobra e não chama
// a fal. O texto público tem de carregar essa fronteira.
check(
  'o fato diz que escrever a temporada não gasta crédito',
  /costs nothing and spends no credits/i.test(corpo),
)
check(
  'o fato diz que o episódio só é cobrado ao ser renderizado',
  /only charged if and when it is\s*\n?\s*'?\s*'?actually rendered|only charged if and when it is actually rendered/i.test(
    corpo.replace(/'\s*\+\s*\n\s*'/g, ''),
  ),
)
check(
  'o fato nega que escrever a temporada renderize os episódios',
  /does not render its episodes/i.test(corpo),
)

// ── 3b. NENHUMA AFIRMAÇÃO PÚBLICA SOBRE O PACOTE DE PUBLICAÇÃO ────────────
// Em 06/09 eu publiquei "every finished film comes with the copy needed to post
// it" e fui medir: `publish_pack_written` estava em ZERO com 42 e-mails de
// "filme pronto" em 24h. Fato público descreve o que o CLIENTE RECEBE, não o
// que existe no repositório. A frase só volta quando o evento aparecer.
const secaoLlms = (llms.match(/## What happens after a video is finished[\s\S]*?(?=\n## )/)?.[0] ?? '').toLowerCase()
for (const proibido of ['publishpack', 'publishing pack', 'pinned comment', 'tiktok caption']) {
  check(
    `o fato não afirma nada sobre o pacote ("${proibido}")`,
    !corpo.toLowerCase().includes(proibido),
  )
  check(
    `/llms.txt não afirma nada sobre o pacote ("${proibido}")`,
    !secaoLlms.includes(proibido),
  )
}

// ── 3c. A FALHA DO PACOTE TEM DE SER OBSERVÁVEL ───────────────────────────
// A frase pública só pode voltar quando `publish_pack_written` deixar de ser
// zero — e para isso é preciso saber POR QUE ele é zero. `garantirPacote` tinha
// sete `return null` mudos; cada um passa a dizer o próprio nome, e o cron
// grava o motivo. Sem isto, a próxima sessão fica com o mesmo enigma.
const cron = read('app/api/cron/send-video-ready/route.ts')
const server = read('lib/publishPackServer.ts')

check(
  'garantirPacote aceita um relator de falha',
  /onFalha\?:\s*\(motivo: string\)\s*=>\s*void/.test(server),
)
// Amarrado ao COMPORTAMENTO, não ao texto: nenhum `return null` pode sobrar
// dentro de garantirPacote — todos viraram `return falhou(...)`.
// Recorta o corpo REAL: começa em `const videoId`, ou seja, DEPOIS do helper
// `falhou` — cujo próprio `return null` é legítimo, é ele que devolve o valor
// que todas as saídas passaram a usar. Ancorar assim (e não por índice de
// ocorrência) mantém o guardião honesto se o helper mudar de forma.
const inicioCorpo = server.indexOf('const videoId = typeof filme.id')
check('o corpo de garantirPacote é recortável', inicioCorpo > 0)
const corpoGarantir = inicioCorpo > 0 ? server.slice(inicioCorpo) : ''
const mudosRestantes = (corpoGarantir.match(/^\s*(?:if \([^)]*\) )?return null$/gm) ?? [])
check(
  'nenhum `return null` mudo sobrou em garantirPacote',
  mudosRestantes.length === 0,
  mudosRestantes.length ? `${mudosRestantes.length} ainda mudo(s)` : undefined,
)
check(
  'garantirPacote nomeia pelo menos 6 motivos distintos',
  new Set([...corpoGarantir.matchAll(/falhou\((?:'([^']+)'|`([^`]+)`)/g)].map((m) => m[1] ?? m[2])).size >= 6,
)
check(
  'o cron passa o relator',
  /onFalha:\s*\(motivo\)\s*=>\s*\{\s*motivoPack\s*=\s*motivo\s*\}/.test(cron),
)
check(
  'o cron grava publish_pack_unavailable quando não há pacote',
  /if \(!pack\)/.test(cron) && /name:\s*'publish_pack_unavailable'/.test(cron),
)
check(
  'o motivo gravado é a variável, não um literal',
  /reason:\s*motivoPack\s*\?\?/.test(cron),
)

// ── 4. O fato CHEGA às superfícies que um motor de resposta lê ─────────────
check(
  'kineoFacts importa o fato',
  /import\s*\{[^}]*\bAFTER_THE_FILM_FACT\b[^}]*\}\s*from\s*'\.\/growth\/afterTheFilmFacts'/s.test(facts),
)
check(
  'o payload de /api/facts declara o campo',
  /\n\s*afterTheFilm:\s*AfterTheFilmFact\b/.test(facts),
)
check(
  'getKineoFacts() devolve o campo preenchido',
  /\n\s*afterTheFilm:\s*AFTER_THE_FILM_FACT\s*,/.test(facts),
)
check(
  '/llms.txt importa o fato',
  /\n\s*AFTER_THE_FILM_FACT,/.test(llms),
)
check(
  '/llms.txt tem uma seção própria para ele',
  /## What happens after a video is finished/.test(llms),
)
// A seção tem de USAR o fato, não repetir texto à mão.
const secao = llms.match(/## What happens after a video is finished[\s\S]*?(?=\n## )/)
check('a seção do llms.txt é legível', Boolean(secao))
if (secao) {
  const corpoSecao = secao[0]
  for (const campo of ['claim', 'season.what', 'season.cost', 'boundaries']) {
    check(
      `a seção interpola AFTER_THE_FILM_FACT.${campo}`,
      corpoSecao.includes(`AFTER_THE_FILM_FACT.${campo}`),
    )
  }
  // Nenhuma frase de venda digitada solta: toda linha de conteúdo da seção tem
  // de vir de uma interpolação.
  const linhasSoltas = corpoSecao
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('##') && !l.startsWith('${') && !l.startsWith('- **Season**'))
  check(
    'a seção não tem prosa digitada fora das interpolações',
    linhasSoltas.length === 0,
    linhasSoltas.length ? `linha solta: ${linhasSoltas[0]}` : undefined,
  )
}

// ── resultado ──────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n❌ ${fails.length} REPROVAÇÃO(ÕES):\n`)
  fails.forEach((f) => console.error(`   · ${f}`))
  console.error(`\n   ${pass} verificações passaram.\n`)
  process.exit(1)
}
console.log(`✅ ${pass} verificações — a TEMPORADA (medida: 28 escritas em 24h) está em /llms.txt e /api/facts com o número vindo do produto; o PACOTE fica fora enquanto publish_pack_written for zero.`)
