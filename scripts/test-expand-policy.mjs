#!/usr/bin/env node
// ═══ KINEO-350-TESTES-COMPORTAMENTAIS-2026-08-26 ═══════════════════════════
//
// A DIFERENÇA PARA O TESTE DO #349: aquele lia o FONTE com regex e checava se
// certas chamadas existiam. Isso pega refactor, não pega comportamento — e o
// canário em produção provou que dava para passar em 9 invariantes e ainda
// assim deixar três becos sem saída de pé.
//
// Este aqui COMPILA lib/expandPolicy.ts + lib/narrationFit.ts + lib/scriptParser.ts
// com o tsc do próprio repositório e EXECUTA as funções reais com as entradas
// dos clientes reais:
//
//   · 19joschaschuetz96, 25/08 20:41 → fala 7s pedindo 60s
//   · 19joschaschuetz96, 25/08 20:44 → fala 2s pedindo 60s
//   · ofirshu555,        26/08 08:31 → fala 38s pedindo 45s
//
// Rodar:  node scripts/test-expand-policy.mjs
// Sem rede, sem banco, sem chave de API, sem custo.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const saida = mkdtempSync(join(tmpdir(), 'kineo-350-'))
// CommonJS + createRequire: o tsc emite `require('./narrationFit')` sem
// extensão, que o ESM do Node recusa. CJS resolve isso sem gambiarra de loader.
const requerer = createRequire(join(saida, 'x.cjs'))

function compilar() {
  execFileSync(
    process.execPath,
    [
      join(raiz, 'node_modules', 'typescript', 'bin', 'tsc'),
      join(raiz, 'lib', 'expandPolicy.ts'),
      join(raiz, 'lib', 'narrationFit.ts'),
      join(raiz, 'lib', 'scriptParser.ts'),
      '--outDir', saida,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--moduleResolution', 'node',
      '--skipLibCheck',
    ],
    { stdio: 'pipe' },
  )
  // Marca a pasta como CommonJS para o Node não herdar o "type" do repo.
  writeFileSync(join(saida, 'package.json'), JSON.stringify({ type: 'commonjs' }))
}

let falhas = 0
const casos = []
function checa(nome, condicao, detalhe = '') {
  casos.push({ nome, ok: !!condicao, detalhe })
  if (!condicao) falhas += 1
}

try {
  compilar()
} catch (e) {
  console.error('Não consegui compilar as libs para testar:\n', e.stdout?.toString() || e.message)
  process.exit(1)
}

const P = requerer(join(saida, 'expandPolicy.js'))
const { parseUserScript } = requerer(join(saida, 'scriptParser.js'))
const { narrationFit, speechSeconds } = requerer(join(saida, 'narrationFit.js'))

console.log('\nKINEO #350 — política de expansão (comportamento, não regex)\n')

// ── 1 e 2. Ideia curta: ZERO chamada de expansão ───────────────────────────
// Estes dois números vieram do banco: events.narration_guard_blocked do
// 19joschaschuetz96 em 25/08. Ele tentou duas vezes e foi embora sem vídeo.
for (const fala of [2, 7]) {
  checa(
    `${fala}s → 60s é needs_authoring (zero chamada de expansão)`,
    P.needsAuthoring(fala, 60) === true,
    `requiredGrowth=${P.requiredGrowth(fala, 60).toFixed(1)}x contra teto ${P.MAX_GROWTH_FACTOR}x`,
  )
  checa(
    `${fala}s → 60s NÃO oferece duração menor falsa`,
    P.largestFittingDuration(fala) === null,
    `maxCabivel=${P.maximumFittingDuration(fala).toFixed(1)}s, menor do seletor=${Math.min(...P.SUPPORTED_DURATIONS)}s`,
  )
}

// ── 3. O teto NÃO foi afrouxado (a trava que o fundador exigiu) ────────────
checa('MAX_GROWTH_FACTOR continua 2,5×', P.MAX_GROWTH_FACTOR === 2.5, `valor=${P.MAX_GROWTH_FACTOR}`)
checa(
  '2s→60s continua proibido como "expansão" (seria 28,5×)',
  P.requiredGrowth(2, 60) > 8 && P.needsAuthoring(2, 60),
  `${P.requiredGrowth(2, 60).toFixed(1)}x`,
)

// ── 4. Entrada moderada: expansão é possível ───────────────────────────────
checa('24s → 45s é expansível (não é needs_authoring)', P.needsAuthoring(24, 45) === false,
  `requiredGrowth=${P.requiredGrowth(24, 45).toFixed(2)}x`)
checa('38s → 45s (caso ofirshu555) é expansível', P.needsAuthoring(38, 45) === false,
  `requiredGrowth=${P.requiredGrowth(38, 45).toFixed(2)}x`)

// ── 5. Segunda rodada só quando vale a pena ────────────────────────────────
checa('1ª rodada ligeiramente curta (cobertura .88) merece 2ª',
  P.deservesSecondRound({ outcome: 'still_short', round: 1, grew: true, coverageAfter: 0.88 }) === true)
checa('2ª rodada insuficiente NÃO gera 3ª',
  P.deservesSecondRound({ outcome: 'still_short', round: 2, grew: true, coverageAfter: 0.9 }) === false)
checa('não cresceu → sem 2ª rodada',
  P.deservesSecondRound({ outcome: 'still_short', round: 1, grew: false, coverageAfter: 0.9 }) === false)
checa('autor reescrito → sem 2ª rodada',
  P.deservesSecondRound({ outcome: 'author_rewrite_rejected', round: 1, grew: true, coverageAfter: 0.9 }) === false)

// ── 6. Crescimento acumulado nunca passa de 2,5× da BASE ───────────────────
// O furo que isto fecha: rodada 1 leva 20s→50s (2,5×, no limite). Se a rodada
// 2 medisse contra 50s, o teto viraria 125s = 6,25× do que a pessoa escreveu.
checa('rodada 2 medida contra a BASE recusa o composto (20s → 60s)',
  P.withinGrowthLimit(20, 60) === false, '60 > 20 × 2,5 = 50')
checa('rodada 2 medida contra a BASE aceita dentro do teto (20s → 49s)',
  P.withinGrowthLimit(20, 49) === true)
checa('base zero nunca autoriza crescimento', P.withinGrowthLimit(0, 10) === false)

// ── 7. Falha transitória não é culpa da pessoa ─────────────────────────────
for (const s of [408, 429, 500, 502, 503]) {
  checa(`HTTP ${s} é transitório (retry, sem queimar rodada)`, P.isTransientStatus(s) === true)
}
for (const s of [400, 401, 422]) {
  checa(`HTTP ${s} NÃO é transitório (sem "Try again" cego)`, P.isTransientStatus(s) === false)
}

// ── 8. Duração menor: só a que passa DE VERDADE na régua canônica ──────────
checa('fala 58s → oferece 60s', P.largestFittingDuration(58) === 60, `max=${P.maximumFittingDuration(58).toFixed(1)}`)
checa('fala 34s → oferece 35s', P.largestFittingDuration(34) === 35)
checa('fala 33s → NÃO oferece nada (33/0.95 = 34,7 < 35)', P.largestFittingDuration(33) === null)
checa('a lista de durações não inventa 45s (fora do seletor desde o #333)',
  !P.SUPPORTED_DURATIONS.includes(45), `lista=${P.SUPPORTED_DURATIONS.join('/')}`)
// A duração oferecida tem de passar na régua REAL, não só na aritmética.
for (const fala of [30, 40, 58, 62, 90, 95]) {
  const d = P.largestFittingDuration(fala)
  if (d !== null) {
    const texto = 'palavra '.repeat(Math.round(fala * P.WORDS_PER_SECOND))
    checa(`duração ${d}s oferecida para fala ~${fala}s passa no narrationFit`,
      narrationFit(texto, d).ok === true)
  }
}

// ── 9. Preservação do autor: frase CURTA (o furo herdado) ──────────────────
const curta = 'Nobody believed it. The drill kept getting stuck at twelve kilometers.'
checa('frase curta preservada é aceita',
  P.authorPreserved(curta, 'Nobody believed it. Not one geologist did. The drill kept getting stuck at twelve kilometers.').ok === true)
checa('frase curta REESCRITA é detectada (o filtro ≥5 palavras deixava passar)',
  P.authorPreserved(curta, 'No one believed it. The drill kept getting stuck at twelve kilometers.').ok === false)

// ── 10. Unicode: português acentuado e outro alfabeto ──────────────────────
const pt = 'Ninguém acreditou. A perfuração parou aos doze quilômetros de profundidade.'
checa('português acentuado preservado é aceito',
  P.authorPreserved(pt, 'Ninguém acreditou. Nem os geólogos. A perfuração parou aos doze quilômetros de profundidade.').ok === true)
checa('português acentuado reescrito é rejeitado',
  P.authorPreserved(pt, 'Ninguem duvidou. A perfuração parou aos doze quilômetros de profundidade.').ok === false)
const ru = 'Никто не поверил. Бурение остановилось на двенадцати километрах.'
checa('cirílico preservado é aceito',
  P.authorPreserved(ru, 'Никто не поверил. Ни один геолог. Бурение остановилось на двенадцати километрах.').ok === true)
checa('cirílico reescrito é rejeitado',
  P.authorPreserved(ru, 'Никто не верил. Бурение остановилось на двенадцати километрах.').ok === false)
checa('ordem invertida conta como perda (narração reordenada muda a história)',
  P.authorPreserved('First sentence here. Second sentence here.',
    'Second sentence here. First sentence here.').ok === false)

// ── 11. Bullets e diretivas NÃO são fala do autor (D3, o caso do canário) ──
const doChatGPT = `The deepest hole humans ever dug was sealed shut, and nobody explained why.
Soviet engineers drilled for nineteen years and passed twelve kilometers of crust.

- Show the rig covered in snow while the narrator speaks
- Cut to the drill bit grinding against hot rock

Voice: calm documentary tone
Music: tense ambient bed
Format: YouTube Shorts format, 9:16, 1 legend only

At that depth the rock behaved like plastic and the drill kept getting stuck.`
const falaDoChatGPT = parseUserScript(doChatGPT).narration || doChatGPT
// O modelo reformatou as diretivas (o que ele SEMPRE faz) mas não tocou na fala.
const expandidoOk = `The deepest hole humans ever dug was sealed shut, and nobody explained why.
Soviet engineers drilled for nineteen years and passed twelve kilometers of crust.
The bit reached rock at over one hundred and eighty degrees Celsius.
At that depth the rock behaved like plastic and the drill kept getting stuck.

VOICE: calm documentary tone
MUSIC — tense ambient bed`
const falaExpandidaOk = parseUserScript(expandidoOk).narration || expandidoOk
checa('bullets + diretivas reformatadas NÃO viram rewroteAuthor falso',
  P.authorPreserved(falaDoChatGPT, falaExpandidaOk).ok === true,
  `perdidas=${JSON.stringify(P.authorPreserved(falaDoChatGPT, falaExpandidaOk).missing)}`)
checa('a divergência de réguas do #348 continua real neste roteiro',
  narrationFit(doChatGPT, 45).speech > narrationFit(falaDoChatGPT, 45).speech,
  `cru=${narrationFit(doChatGPT, 45).speech.toFixed(1)}s vs fala=${narrationFit(falaDoChatGPT, 45).speech.toFixed(1)}s`)
// Reescrita VERDADEIRA da fala continua sendo rejeitada.
const expandidoRuim = falaExpandidaOk.replace(
  'Soviet engineers drilled for nineteen years and passed twelve kilometers of crust.',
  'Engineers from the USSR drilled for almost two decades through twelve kilometers of crust.',
)
checa('reescrita verdadeira da FALA continua rejeitada',
  P.authorPreserved(falaDoChatGPT, expandidoRuim).ok === false)

// ── 12. Diretivas engolidas são detectadas para serem devolvidas ───────────
const semDiretivas = 'The deepest hole humans ever dug was sealed shut, and nobody explained why.'
const perdidas = P.lostDirectives(doChatGPT, semDiretivas)
checa('diretivas sumidas são detectadas (para devolver as linhas do autor)',
  perdidas.length === 3 && perdidas.some((l) => /^Voice:/i.test(l)),
  `perdidas=${JSON.stringify(perdidas)}`)
checa('bullet NÃO é tratado como diretiva nem como fala',
  P.directiveLines(doChatGPT).every((l) => !l.startsWith('-')))

// ── 13. Identidade da tentativa (rodadas por base + duração) ───────────────
checa('mesma base + mesma duração ⇒ mesma chave',
  P.attemptKey('texto', 60) === P.attemptKey('texto', 60))
checa('duração diferente ⇒ chave diferente (rodadas novas são justas)',
  P.attemptKey('texto', 60) !== P.attemptKey('texto', 35))
checa('base diferente ⇒ chave diferente',
  P.attemptKey('texto a', 60) !== P.attemptKey('texto b', 60))
checa('teto de rodadas é 2', P.MAX_ROUNDS === 2)

// ── 14. Aritmética das palavras que faltam bate com a produção ─────────────
checa('caso ofirshu555 (38s/45s) pede ~11-12 palavras',
  P.missingWords(38, 45) >= 10 && P.missingWords(38, 45) <= 13, `faltam=${P.missingWords(38, 45)}`)
checa('quem já enche não "falta" palavra nenhuma', P.missingWords(60, 45) === 0)

// ── 15. A régua é a MESMA das duas pontas (invariante do #349, mantido) ────
checa('minimumSpeech usa MIN_COVERAGE canônico',
  Math.abs(P.minimumSpeech(60) - 60 * P.MIN_COVERAGE) < 1e-9)
checa('speechSeconds reexportado é o mesmo da régua',
  P.speechSeconds === speechSeconds)

// ── 16. NADA aqui toca fornecedor, débito ou render ────────────────────────
// Garantia estrutural: expandPolicy não importa nada além da régua.
const fonte = readFileSync(join(raiz, 'lib', 'expandPolicy.ts'), 'utf8')
checa('expandPolicy não importa fal, supabase, stripe nem openai',
  !/(from ['"].*\b(fal|supabase|stripe|openai)\b)/i.test(fonte))
checa('expandPolicy não fala em débito/crédito/render',
  !/(debit|credit_debits|render_jobs|charge)/i.test(fonte))

// ── Resultado ─────────────────────────────────────────────────────────────
for (const c of casos) {
  console.log(`  ${c.ok ? '✓' : '✗'} ${c.nome}${c.detalhe && !c.ok ? `\n      ${c.detalhe}` : ''}`)
}
rmSync(saida, { recursive: true, force: true })
console.log(
  falhas === 0
    ? `\n${casos.length} CASOS OK — ideia curta tem saída, teto intacto, autor preservado.\n`
    : `\n${falhas} de ${casos.length} CASOS FALHARAM.\n`,
)
process.exit(falhas === 0 ? 0 : 1)
