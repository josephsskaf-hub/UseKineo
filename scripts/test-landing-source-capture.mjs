// KINEO-ACQ-LANDING-SOURCE-2026-09-06 — guardião do rótulo de origem no pouso.
//
// O QUE ESTE GUARDIÃO PROVA, e por que ele lê o arquivo em vez de importar:
// `components/SourceCapture.tsx` é TSX com alias `@/` — `import()` dele morre no
// resolver antes da primeira verificação (medido: 72 testes de scripts/ com esse
// defeito). Então este arquivo lê o código-fonte e amarra cada verificação à
// VARIÁVEL QUE DECIDE, nunca a uma frase solta: trocar a condição por `true`
// mantém a contagem de texto intacta e precisa reprovar mesmo assim.
//
// O DEFEITO QUE ELE IMPEDE DE VOLTAR: o evento de pouso lia só o
// `document.referrer` e descartava o `utm_source` que estava na mesma URL. Em 14
// dias isso apagou a origem de 82% das sessões (2.948 de 3.600) — inclusive as
// 108 do ChatGPT que chegam sem referrer e COM `?utm_source=chatgpt`.
//
// E o defeito-irmão, que a correção não pode reintroduzir: `homepage` e
// `sticky_cta` são rótulos de SUPERFÍCIE interna (lib/acquisitionSource.ts,
// 12/08). Se virarem "origem", inventam uma origem e apagam a verdadeira.

import { readFileSync } from 'node:fs'

const FILE = 'components/SourceCapture.tsx'
const src = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')

let pass = 0
const fails = []
function check(label, ok, detail) {
  if (ok) { pass++; return }
  fails.push(`${label}${detail ? ` — ${detail}` : ''}`)
}

// ── 1. O evento continua sendo emitido, e é o mesmo evento de sempre ────────
check(
  'emite landing_session_started',
  /trackEvent\(\s*'landing_session_started'/.test(src),
)

// ── 2. O utm_source é LIDO da URL ───────────────────────────────────────────
check(
  'lê utm_source da query string',
  /new URLSearchParams\(\s*window\.location\.search\s*\)\.get\(\s*'utm_source'\s*\)/.test(src),
)

// ── 3. O utm_source passa pelo ponto de estrangulamento de superfície ───────
// Amarrado à variável: `surface` tem de ser ATRIBUÍDA a partir de
// internalSurfaceLabel(<a mesma coisa que veio da URL>).
const surfaceAssign = src.match(/surface\s*=\s*internalSurfaceLabel\(\s*(\w+)\s*\)/)
check(
  'surface = internalSurfaceLabel(utm cru)',
  Boolean(surfaceAssign),
  'nenhuma atribuição de `surface` a partir de internalSurfaceLabel()',
)
if (surfaceAssign) {
  const rawVar = surfaceAssign[1]
  check(
    'a variável rotulada é a MESMA lida da URL',
    src
      .split('\n')
      .some((line) => {
        const m = line.match(/(?:const|let)\s+(\w+)\s*=/)
        return Boolean(m) && m[1] === rawVar &&
          line.includes('URLSearchParams') && line.includes('utm_source')
      }),
    `\`${rawVar}\` não vem de URLSearchParams(...).get('utm_source')`,
  )
  check(
    'internalSurfaceLabel é importado de lib/acquisitionSource',
    /import\s*\{[^}]*\binternalSurfaceLabel\b[^}]*\}\s*from\s*'@\/lib\/acquisitionSource'/s.test(src),
  )
}

// ── 4. Rótulo interno NUNCA vira origem ─────────────────────────────────────
// A atribuição de utmSource tem de ser CONDICIONADA a `surface`. Um mutante que
// apague a guarda (`utmSource = normalizedUtmSource(raw)`) reprova aqui.
const utmAssign = src.match(/utmSource\s*=\s*([^\n]+)/)
check(
  'utmSource é atribuído',
  Boolean(utmAssign),
)
if (utmAssign) {
  const expr = utmAssign[1]
  check(
    'a atribuição de utmSource é guardada por `surface`',
    /\bsurface\b/.test(expr) && /\?/.test(expr),
    `expressão sem guarda de superfície: ${expr.trim()}`,
  )
  check(
    'com superfície interna, utmSource vira null',
    /surface\s*\?\s*null\s*:/.test(expr),
    `esperado \`surface ? null : ...\`, achado: ${expr.trim()}`,
  )
}

// ── 5. Precedência: referrer atestado vence o utm escrito no link ───────────
const sourceAssign = src.match(/const\s+source\s*=\s*([^\n]+)/)
check('source é derivado', Boolean(sourceAssign))
if (sourceAssign) {
  const expr = sourceAssign[1]
  check(
    'referrerHost vem ANTES de utmSource na precedência',
    /referrerHost\s*\?\?\s*utmSource/.test(expr),
    `esperado \`referrerHost ?? utmSource\`, achado: ${expr.trim()}`,
  )
}

// ── 6. O evento carrega os quatro campos novos ─────────────────────────────
const payload = src.match(/trackEvent\(\s*'landing_session_started',\s*\{([\s\S]*?)\n\s*\}\)/)
check('payload do evento é legível', Boolean(payload))
if (payload) {
  const body = payload[1]
  // Cada campo tem de aparecer como PROPRIEDADE — `nome:` (explícita) ou
  // `nome,` (shorthand) — nunca só dentro de um comentário.
  const propNames = new Set(
    body
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, '').trim())
      .map((line) => line.match(/^(\w+)\s*[:,]/))
      .filter(Boolean)
      .map((m) => m[1]),
  )
  for (const field of ['referrer_host', 'utm_source', 'surface', 'source', 'source_known']) {
    check(`payload carrega \`${field}\``, propNames.has(field))
  }
  // source_known tem de ser DERIVADO de source, não uma constante. Um mutante
  // que escreva `source_known: true` mantém o campo e mente no placar.
  const known = body.match(/source_known\s*:\s*([^,\n]+)/)
  check(
    'source_known é derivado de `source`, não constante',
    Boolean(known) && /\bsource\b/.test(known[1]) && !/^\s*(true|false)\s*$/.test(known[1]),
    known ? `achado: ${known[1].trim()}` : 'campo ausente',
  )
  // E o campo `source` tem de ser a VARIÁVEL derivada, não um literal colado.
  // Aceita shorthand (`source,`) ou explícito (`source: source`); reprova
  // qualquer outra expressão — inclusive `source: utmSource`, que perderia a
  // precedência do referrer.
  const sourceLine = body
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .find((line) => /^source\s*[:,]/.test(line))
  check(
    'o campo `source` usa a variável derivada',
    Boolean(sourceLine) && /^source\s*,$/.test(sourceLine),
    sourceLine ? `achado: ${sourceLine}` : 'campo ausente',
  )
}

// ── 7. Nada do comportamento antigo foi perdido ────────────────────────────
check('captureSourceOnce continua sendo chamado', /captureSourceOnce\(\)/.test(src))
check('captureRefOnce continua sendo chamado', /captureRefOnce\(\)/.test(src))
check('a captura continua uma vez por aba', /sessionStorage\.getItem\(marker\)/.test(src))
check(
  'a captura continua sem poder quebrar a página (try/catch externo)',
  /\}\s*catch\s*\{[\s\S]*Storage or analytics failures[\s\S]*\}/.test(src),
)

// ── resultado ───────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n❌ ${fails.length} REPROVAÇÃO(ÕES) em ${FILE}:\n`)
  fails.forEach((f) => console.error(`   · ${f}`))
  console.error(`\n   ${pass} verificações passaram.\n`)
  process.exit(1)
}
console.log(`✅ ${pass} verificações — o evento de pouso grava a origem que já tinha na mão, e rótulo interno não vira origem.`)
