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
const PACK = 'lib/publishPack.ts'

const fact = read(FACT)
const facts = read(FACTS)
const llms = read(LLMS)
const temporada = read(TEMPORADA)
const pack = read(PACK)

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

// ── 2. As peças do pacote batem com o que o pacote realmente produz ────────
// lib/publishPack.ts declara o tipo com exatamente quatro campos; o fato
// público não pode listar uma quinta peça que ninguém entrega.
const tipoPacote = pack.match(/export type PacoteDePublicacao = \{([\s\S]*?)\n\}/)
check('o tipo do pacote é legível em lib/publishPack.ts', Boolean(tipoPacote))
if (tipoPacote) {
  const campos = [...tipoPacote[1].matchAll(/^\s*(\w+):/gm)].map((m) => m[1])
  const pecas = corpo.match(/pieces:\s*\[([\s\S]*?)\]/)
  check('o fato lista as peças do pacote', Boolean(pecas))
  if (pecas) {
    const n = [...pecas[1].matchAll(/'[^']+'/g)].length
    check(
      'o fato lista exatamente tantas peças quantas o pacote entrega',
      n === campos.length,
      `pacote entrega ${campos.length} (${campos.join(', ')}), o fato lista ${n}`,
    )
  }
}

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
  'o fato nega explicitamente que publique nas plataformas',
  /does not upload, schedule or publish/i.test(corpo),
)
check(
  'o fato nega que escrever a temporada renderize os episódios',
  /does not render its episodes/i.test(corpo),
)
check(
  'o fato diz a verdade sobre o crédito: só no plano gratuito',
  /free plan/i.test(corpo) && /clean/i.test(corpo),
)
// E a fronteira do crédito tem de bater com o código que a implementa.
check(
  'lib/publishPack de fato só credita plano gratuito',
  /isFreePlan/.test(pack),
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
  for (const campo of ['claim', 'season.what', 'season.cost', 'publishPack.what', 'publishPack.pieces', 'publishPack.credit', 'boundaries']) {
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
    .filter((l) => l && !l.startsWith('##') && !l.startsWith('${') && !l.startsWith('- **Season**') && !l.startsWith('- **Publishing pack**'))
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
console.log(`✅ ${pass} verificações — temporada e pacote de publicação existem em /llms.txt e /api/facts, com o número vindo do produto e as fronteiras escritas.`)
