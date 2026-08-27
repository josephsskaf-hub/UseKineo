#!/usr/bin/env node
// ═══ KINEO-VARIEDADE-SEM-AMPUTAR — teste de regressao do caso REAL ════════
//
// O caso: render 37c8d832 (MiniMax H3, 45 creditos, 7 cenas). Narracao dizia
// "a German U-boat sank it in 1942"; a imagem entregou um rosto submerso
// fazendo bolhas.
//
// A cena 4 abaixo e o TEXTO REAL lido de `cinematic_submission_claim` em
// producao. Se a correcao regredir, este teste falha com o mesmo sintoma.
//
// Rodar: node scripts/test-variety-axis.mjs   (sem rede, sem custo)

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const saida = mkdtempSync(join(tmpdir(), 'kineo-variety-'))
const requerer = createRequire(join(saida, 'x.cjs'))
mkdirSync(join(saida, 'src'), { recursive: true })
writeFileSync(join(saida, 'src', 'varietyAxis.ts'),
  readFileSync(join(raiz, 'lib/hollywood/varietyAxis.ts'), 'utf8'))
try {
  execFileSync(process.execPath, [
    join(raiz, 'node_modules', 'typescript', 'bin', 'tsc'),
    join(saida, 'src', 'varietyAxis.ts'),
    '--outDir', join(saida, 'out'), '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--skipLibCheck', '--rootDir', join(saida, 'src'),
  ], { stdio: 'pipe' })
  writeFileSync(join(saida, 'out', 'package.json'), JSON.stringify({ type: 'commonjs' }))
} catch (e) {
  console.error('Nao consegui compilar:\n', e.stdout?.toString() || e.message)
  process.exit(1)
}
const V = requerer(join(saida, 'out', 'varietyAxis.js'))

let falhas = 0, total = 0
const checa = (nome, cond, det = '') => {
  total += 1
  if (!cond) { falhas += 1; console.error(`  x ${nome}${det ? ` — ${det}` : ''}`) }
}

console.log('\nKINEO variedade visual — regressao do render 37c8d832\n')

// ── O PROMPT REAL DA CENA 4, antes do C3 (formato do planner) ─────────────
const CENA_4_REAL =
  "A close-up shot of the ocean's surface, highlighting the sheen as it spreads. " +
  'Mouth closed, not speaking, no lip movement., subtle handheld camera movement, ' +
  'natural imperfect lighting, light film grain, candid framing, 9:16 vertical framing ' +
  'Cinematography (match exactly): natural lighting, warm color palette, light film grain, ' +
  'candid framing with slight camera movement. Level horizon, stable well-composed shot ' +
  '(tripod or slow dolly), no tilted or dutch angles. Tack-sharp focus from the very first ' +
  'frame, crystal-clear facial detail and skin texture, high micro-contrast, pristine clarity ' +
  'throughout — never soft focus, never hazy or washed out. No readable text anywhere in the ' +
  'scene: no phone or computer screens, no signs, no billboards, no labels, no subtitles, ' +
  'no watermarks. If a phone appears, its screen is off or blurred.'

const EIXO = 'macro close-up of one telling detail, shallow focus, texture filling the frame'
const CENARIO = 'the vast open Gulf of Mexico under an overcast sky'

// ── 1. O SINTOMA EXATO NAO PODE VOLTAR ───────────────────────────────────
{
  const antigo = `${EIXO}, ${CENA_4_REAL.replace(/\s+/g,' ').trim().split(' ').slice(0,14).join(' ')}, styleSheet`
  checa('o codigo ANTIGO de fato terminava a descricao em "Mouth" (prova do bug)',
    /spreads\. Mouth,/.test(antigo), antigo.slice(0, 140))

  const novo = V.aplicarEixoVisual(CENA_4_REAL, CENARIO, EIXO)
  checa('o novo NUNCA deixa "Mouth" solto', !/\bMouth,\s*(styleSheet|natural lighting)/.test(novo))
  checa('a proibicao chega INTEIRA ao motor',
    novo.includes('Mouth closed, not speaking, no lip movement'))
  checa('nao termina em proibicao quebrada', !V.terminaEmProibicaoQuebrada(novo))
}

// ── 2. OS QUATRO SUFIXOS DE PROTECAO SOBREVIVEM ──────────────────────────
{
  const novo = V.aplicarEixoVisual(CENA_4_REAL, CENARIO, EIXO)
  checa('protecao: boca fechada', novo.includes('not speaking, no lip movement'))
  checa('protecao: sem texto na tela', novo.includes('No readable text anywhere'))
  checa('protecao: nitidez', novo.includes('Tack-sharp focus'))
  checa('protecao: horizonte estavel', novo.includes('Level horizon'))
  checa('o eixo novo esta no comeco', novo.startsWith(EIXO))
  checa('o cenario repetido foi removido', !novo.includes(CENARIO))
}

// ── 3. O CORTE, QUANDO PRECISA, NUNCA PARTE UMA FRASE ────────────────────
{
  checa('corta na fronteira da frase',
    V.cortarEmFronteiraDeFrase('Um. Dois. Tres muito longo aqui.', 12) === 'Um. Dois.',
    V.cortarEmFronteiraDeFrase('Um. Dois. Tres muito longo aqui.', 12))
  checa('sem frase inteira que caiba, devolve vazio',
    V.cortarEmFronteiraDeFrase('Uma frase unica bem comprida sem ponto no meio.', 10) === '')
  checa('texto curto passa intacto',
    V.cortarEmFronteiraDeFrase('Curto.', 100) === 'Curto.')
}

// ── 4. O DETECTOR DE PROIBICAO DECAPITADA ────────────────────────────────
{
  checa('detecta "... spreads. Mouth"',
    V.terminaEmProibicaoQuebrada("highlighting the sheen as it spreads. Mouth"))
  checa('detecta "... shot. No"', V.terminaEmProibicaoQuebrada('A wide shot. No'))
  checa('NAO acusa proibicao completa',
    !V.terminaEmProibicaoQuebrada('A wide shot. Mouth closed, not speaking, no lip movement.'))
  checa('NAO acusa frase descritiva normal',
    !V.terminaEmProibicaoQuebrada('A wide shot of the ocean at dawn.'))
}

// ── 5. PROMPT ANORMALMENTE LONGO: a CAUDA sobrevive ──────────────────────
{
  const gigante = 'Uma cena descritiva muito longa. '.repeat(80) + CENA_4_REAL
  const novo = V.aplicarEixoVisual(gigante, null, EIXO)
  checa('respeita o teto', novo.length <= V.TETO_PROMPT_CENA, String(novo.length))
  checa('mesmo cortando, a protecao de texto sobrevive', novo.includes('No readable text anywhere'))
  checa('mesmo cortando, a nitidez sobrevive', novo.includes('Tack-sharp focus'))
  checa('mesmo cortando, nao termina em proibicao quebrada', !V.terminaEmProibicaoQuebrada(novo))
}

// ── 6. AS OUTRAS CENAS CORTADAS NO MESMO RENDER ──────────────────────────
{
  const cena5 = 'Aerial shot of a Coast Guard ship navigating through the Gulf waters, ' +
    'searching for the source of the sheen. Mouth closed, not speaking, no lip movement.'
  const novo = V.aplicarEixoVisual(cena5, CENARIO, 'vast wide establishing shot at dawn')
  checa('cena 5: nao termina mais em "searching for"', !/searching for$/.test(novo.trim()))
  checa('cena 5: o objeto da busca chega inteiro', novo.includes('source of the sheen'))
}

console.log(falhas === 0
  ? `\n${total} VERIFICACOES OK — a proibicao nunca mais viaja decapitada.\n`
  : `\n${falhas} FALHAS em ${total} verificacoes.\n`)
process.exit(falhas === 0 ? 0 : 1)
