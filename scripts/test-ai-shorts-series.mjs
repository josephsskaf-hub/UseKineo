// KINEO-AEO-SERIE-2026-09-06 — guardião da página pública /ai-shorts-series.
//
// Lê os arquivos com readFileSync (nunca import com alias `@/` — 72 testes de
// scripts/ morrem no resolver antes da primeira verificação). CRLF normalizado
// na leitura: o checkout do Windows já derrubou regex de duas linhas aqui.
//
// O QUE ELE IMPEDE:
//   1. CSS novo (className/module.css/<style>) — regra dura do ciclo;
//   2. a página deixar de DIZER o que a temporada NÃO é — os `boundaries` e o
//      `season.cost` têm de ser renderizados a partir da VARIÁVEL, não de um
//      literal copiado (que envelhece) e não em comentário (que ninguém lê);
//   3. número de episódio, crédito ou preço digitado à mão — a "copy que mente";
//   4. a página existir sem chegar ao sitemap, ao /llms.txt e ao link interno
//      (órfã = "Discovered – currently not indexed");
//   5. canonical ausente, e schema FAQ que não nasce do mesmo array do HTML.

import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

const PAGE_PATH = 'app/ai-shorts-series/page.tsx'
const page = read(PAGE_PATH)
const sitemap = read('app/sitemap.ts')
const llms = read('app/llms.txt/route.ts')
const factsPage = read('app/facts/page.tsx')
const fact = read('lib/growth/afterTheFilmFacts.ts')

let pass = 0
const fails = []
const check = (label, ok, detail) => {
  if (ok) { pass++; return }
  fails.push(`${label}${detail ? ` — ${detail}` : ''}`)
}

// Corpo sem comentários: literal suspeito dentro de comentário não é promessa.
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n')
const body = stripComments(page)

// ── 1. Existe, é server component, e não traz CSS novo ─────────────────────
check('1. a página existe e exporta um componente default', /export default function \w+\(/.test(body))
check('2. é server component (sem "use client")', !/['"]use client['"]/.test(body))
check('3. nenhum className', !/className=/.test(body))
check('4. nenhum import de .css/.module', !/\.module\.css|\.css['"]/.test(body))
check('5. nenhuma tag <style', !/<style\b/i.test(body))

// ── 2. Diz o que a temporada NÃO é — amarrado à VARIÁVEL ────────────────────
check(
  '6. importa AFTER_THE_FILM_FACT de @/lib/kineoFacts',
  /import\s*\{[^}]*\bAFTER_THE_FILM_FACT\b[^}]*\}\s*from\s*'@\/lib\/kineoFacts'/s.test(body),
)
// O JSX de retorno é onde a coisa vira HTML. Recorta do `return (` do
// componente até o fim do arquivo.
const returnIdx = body.search(/export default function \w+\([\s\S]*?\breturn \(/)
const jsx = returnIdx >= 0 ? body.slice(body.indexOf('return (', returnIdx)) : ''
check('7. o componente tem um bloco return (', jsx.length > 0)
check(
  '8. os boundaries são renderizados no JSX via .map da variável',
  /\{AFTER_THE_FILM_FACT\.boundaries\.map\(/.test(jsx),
)
check(
  '9. o item do map imprime o boundary (não só a chave)',
  /\{AFTER_THE_FILM_FACT\.boundaries\.map\(\((\w+)\)\s*=>[\s\S]*?\{\1\}[\s\S]*?\)\)\}/.test(jsx),
)
check(
  '10. season.cost é renderizado no JSX',
  /\{SEASON\.cost\}|\{AFTER_THE_FILM_FACT\.season\.cost\}/.test(jsx),
)
check(
  '11. o claim é renderizado no JSX',
  /\{AFTER_THE_FILM_FACT\.claim\}/.test(jsx),
)
// O fato de origem continua tendo boundaries — senão o map renderiza nada.
check('12. o fato de origem tem boundaries com conteúdo', /boundaries:\s*\[\s*'[^']+'/.test(fact))

// ── 3. Nenhum número público digitado ──────────────────────────────────────
// Só o corpo sem comentários. Valores de estilo (fontSize: 34) não casam com
// nenhum destes padrões de propósito: o que se proíbe é número COM unidade
// pública ao lado.
const literalPrice = body.match(/\$\s?\d[\d.,]*/)
check('13. nenhum preço em dólar digitado ($N)', !literalPrice, literalPrice ? `achado "${literalPrice[0]}"` : undefined)
const literalUnit = body.match(/\b\d+\s*(episodes?|credits?|cr|films?|videos?)\b/i)
check('14. nenhum "N episodes/credits/films/videos" digitado', !literalUnit, literalUnit ? `achado "${literalUnit[0]}"` : undefined)
const literalEpisodeN = body.match(/\bepisodes?\s+\d+/i)
check('15. nenhum "episode N" digitado', !literalEpisodeN, literalEpisodeN ? `achado "${literalEpisodeN[0]}"` : undefined)
const wordNumber = body.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+(episodes?|credits?|films?|videos?)\b/i)
check('16. nenhum número por extenso com unidade pública', !wordNumber, wordNumber ? `achado "${wordNumber[0]}"` : undefined)
check(
  '17. o número de episódios vem de AFTER_THE_FILM_FACT.season',
  /const SEASON = AFTER_THE_FILM_FACT\.season/.test(body) && /\{SEASON\.episodes\}|SEASON\.episodes\}/.test(body),
)
check(
  '18. planos e motores vêm de PLAN_FACTS / ENGINE_FACTS',
  /PLAN_FACTS\.map\(/.test(jsx) && /ENGINE_FACTS\.map\(/.test(body),
)

// ── 4. Ligações: sitemap, llms.txt, link interno ───────────────────────────
const sitemapCode = sitemap
  .split('\n')
  .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
  .join('\n')
check(
  '19. /ai-shorts-series está no array routes[] do sitemap',
  /\{\s*path:\s*'\/ai-shorts-series'\s*,\s*priority:\s*[\d.]+/.test(sitemapCode),
)
check(
  '20. LAST_MODIFIED do sitemap avançou para 2026-09-06 ou depois',
  (() => {
    const m = sitemapCode.match(/const LAST_MODIFIED = new Date\('([^']+)'\)/)
    return Boolean(m) && Date.parse(m[1]) >= Date.parse('2026-09-06T00:00:00.000Z')
  })(),
)
check('21. /llms.txt linka a página', /\$\{BASE\}\/ai-shorts-series\b/.test(llms))
const secaoAfter = llms.match(/## What happens after a video is finished[\s\S]*?(?=\n## )/)
check(
  '22. o link do llms.txt NÃO está dentro da seção "after a video is finished" (guardião irmão proíbe linha solta ali)',
  Boolean(secaoAfter) && !secaoAfter[0].includes('/ai-shorts-series'),
)
check(
  '23. /facts linka a página como item de dados (voto interno para o auditor de órfãs)',
  /href:\s*'\/ai-shorts-series'/.test(stripComments(factsPage)),
)

// ── 5. Canonical e schema ──────────────────────────────────────────────────
check(
  '24. canonical aponta para /ai-shorts-series',
  /alternates:\s*\{\s*canonical:\s*CANONICAL\s*\}/.test(body) &&
    /const CANONICAL = `\$\{PRODUCT\.url\}\/ai-shorts-series`/.test(body),
)
check(
  '25. o FAQPage nasce do mesmo array FAQ que o HTML renderiza',
  /'@type':\s*'FAQPage'[\s\S]*?mainEntity:\s*FAQ\.map\(/.test(body) && /\{FAQ\.map\(/.test(jsx),
)
check(
  '26. o JSON-LD é escapado (</script> não fecha a tag)',
  /JSON\.stringify\(faqJsonLd\)\.replace\(\/<\/g,\s*'\\\\u003c'\)/.test(body),
)
// Toda resposta do FAQ tem de derivar de fato: nenhuma resposta é string pura.
const faqBlock = body.match(/const FAQ[^=]*=\s*\[([\s\S]*?)\n\]/)
check('27. o array FAQ é legível', Boolean(faqBlock))
if (faqBlock) {
  const answers = [...faqBlock[1].matchAll(/\n\s*a:\s*([^\n]+)/g)].map((m) => m[1])
  check('28. o FAQ tem entre 3 e 5 perguntas', answers.length >= 3 && answers.length <= 5, `achadas ${answers.length}`)
  const pure = answers.filter((a) => /^'[^`$]*',?$/.test(a.trim()))
  check('29. nenhuma resposta do FAQ é string pura sem fato interpolado', pure.length === 0, pure[0])
}

// ── resultado ──────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n❌ ${fails.length} REPROVAÇÃO(ÕES) em ${PAGE_PATH}:\n`)
  fails.forEach((f) => console.error(`   · ${f}`))
  console.error(`\n   ${pass} verificações passaram.\n`)
  process.exit(1)
}
console.log(`✅ test-ai-shorts-series: ${pass} verificações passaram.`)
