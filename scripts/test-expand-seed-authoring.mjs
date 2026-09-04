#!/usr/bin/env node
// ═══ KINEO-SEMENTE-NAO-E-ROTEIRO — sprint-assinaturas #8 (2026-09-03) ══════
//
// O QUE ESTE TESTE TRANCA
//
// A rota /api/expand-script acusava o modelo de "reescrever parte do seu
// roteiro" mesmo quando o autor tinha UMA frase — ou seja, quando não havia
// roteiro nenhum para preservar. Medido em produção (04/09 00:30 BRT):
//
//   · `author_rewrite_rejected`: 11 recusas / 7 pessoas; o botão de saída do
//     #42 (`script_rewrite_candidate_opened`) foi clicado ZERO vezes; 4 das 7
//     nunca fizeram um filme na vida; a última foi 00:05 de hoje, do chatgpt.com.
//   · `needs_authoring` (a porta irmã, 200): 8 ocorrências, 6 pedidos de
//     autoria, 4 aceites, 3 filmes em 2h.
//
// Os 8 eventos que carregam a contagem do #42, reproduzidos abaixo como casos:
//   autor=1 mexidas=1 ×4 (taaft) · autor=2 mexidas=2 ×2 (taaft)
//   autor=3 mexidas=2 ×1 (chatgpt.com) · autor=14 mexidas=1 ×1 (nav)
//
// AS DUAS DIREÇÕES, que é o que importa: a semente passa a ir para a autoria,
// e o Contrato C1 continua mordendo em roteiro de verdade. Um teste que só
// provasse o lado novo deixaria passar um afrouxamento do C1.
//
// Compila e EXECUTA lib/expandPolicy.ts real (padrão do test-expand-policy),
// e lê app/api/expand-script/route.ts para provar QUEM CHAMA e EM QUE ORDEM —
// a política certa num arquivo que ninguém chama não conserta ninguém (lição
// do sceneTruth, 27/08).
//
// Rodar:  node scripts/test-expand-seed-authoring.mjs
// Sem rede, sem banco, sem chave de API, sem custo.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const saida = mkdtempSync(join(tmpdir(), 'kineo-semente-'))
const requerer = createRequire(join(saida, 'x.cjs'))

/**
 * O tsc do PRÓPRIO repositório — mas toda entrega desta sprint nasce numa
 * worktree limpa, e worktree não tem `node_modules`. Então: tenta a raiz do
 * lugar onde o teste está e, se não houver, cai no checkout principal que o
 * git conhece (`--git-common-dir` aponta para o .git de verdade). Sem isto o
 * teste só roda em C:\kineo e ninguém o executa antes de enfileirar.
 */
function acharTsc() {
  const candidatos = [join(raiz, 'node_modules', 'typescript', 'bin', 'tsc')]
  try {
    const comum = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd: raiz, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    if (comum) candidatos.push(join(dirname(comum), 'node_modules', 'typescript', 'bin', 'tsc'))
  } catch { /* sem git, segue com o candidato local */ }
  for (const c of candidatos) { if (existsSync(c)) return c }
  throw new Error(`typescript nao encontrado. Procurei em:\n  ${candidatos.join('\n  ')}`)
}

let falhas = 0
const casos = []
function checa(nome, condicao, detalhe = '') {
  casos.push({ nome, ok: !!condicao, detalhe })
  if (!condicao) falhas += 1
}

try {
  execFileSync(
    process.execPath,
    [
      acharTsc(),
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
  writeFileSync(join(saida, 'package.json'), JSON.stringify({ type: 'commonjs' }))

  const P = requerer(join(saida, 'expandPolicy.js'))
  const { isSeedNotScript, SEED_MAX_SENTENCES, authorPreserved, authorSentences } = P

  // ── 1. A função existe e é pura ─────────────────────────────────────────
  checa('isSeedNotScript é exportada', typeof isSeedNotScript === 'function')
  checa('SEED_MAX_SENTENCES = 2', SEED_MAX_SENTENCES === 2, `veio ${SEED_MAX_SENTENCES}`)

  // ── 2. OS 8 EVENTOS REAIS DE PRODUÇÃO ───────────────────────────────────
  // (autor, mexidas, esperado, quem)
  const producao = [
    [1, 1, true, 'taaft 03/09 06:00 (9ef9fdc8)'],
    [1, 1, true, 'taaft 03/09 06:00 (9ef9fdc8, 2a tentativa)'],
    [1, 1, true, 'taaft 02/09 07:21 (95efcf3e)'],
    [1, 1, true, 'taaft 02/09 07:23 (95efcf3e)'],
    [2, 2, true, 'taaft 02/09 07:26 (95efcf3e)'],
    [2, 2, true, 'taaft 02/09 07:26 (95efcf3e, candidate_fits=false)'],
    [3, 2, false, 'chatgpt.com 04/09 00:05 (c7b2aeae) — 1 frase dela DE PE'],
    [14, 1, false, 'nav 02/09 02:22 (623e4c0b) — roteiro de verdade'],
  ]
  let viramAutoria = 0
  for (const [autor, mexidas, esperado, quem] of producao) {
    const r = isSeedNotScript(autor, mexidas)
    if (r) viramAutoria += 1
    checa(
      `producao: autor=${autor} mexidas=${mexidas} -> ${esperado ? 'autoria' : 'recusa'} (${quem})`,
      r === esperado,
      `devolveu ${r}`,
    )
  }
  checa('6 dos 8 eventos reais passam a ir para a autoria', viramAutoria === 6, `foram ${viramAutoria}`)

  // ── 3. O C1 NÃO AFROUXA — o lado que protege o cliente ──────────────────
  checa('3 frases, 3 mexidas -> RECUSA (roteiro destruido, nao semente)', isSeedNotScript(3, 3) === false)
  checa('2 frases, 1 mexida -> RECUSA (uma dela sobreviveu: havia roteiro)', isSeedNotScript(2, 1) === false)
  checa('1 frase, 0 mexidas -> RECUSA (nem deveria chegar aqui)', isSeedNotScript(1, 0) === false)
  checa('12 frases, 12 mexidas -> RECUSA (o pior caso do C1)', isSeedNotScript(12, 12) === false)
  checa('0 frases -> RECUSA (texto vazio nunca vira autoria)', isSeedNotScript(0, 0) === false)
  checa('NaN nao vira autoria', isSeedNotScript(NaN, 1) === false)
  checa('negativo nao vira autoria', isSeedNotScript(-1, -1) === false)

  // ── 4. LIGADA NA MEDIDA REAL, não em números escritos à mão ─────────────
  const semente = 'Five shocking facts about compound interest.'
  const reescrita = 'Compound interest is the quietest force in finance. It doubles money while you sleep. Most people never see it work.'
  const pres1 = authorPreserved(semente, reescrita)
  checa('semente de 1 frase: authorPreserved reprova (nada sobreviveu)', pres1.ok === false)
  checa(
    'semente de 1 frase -> isSeedNotScript com a contagem REAL = true',
    isSeedNotScript(authorSentences(semente).length, pres1.missing.length) === true,
    `autor=${authorSentences(semente).length} mexidas=${pres1.missing.length}`,
  )

  const roteiro = 'Nobody believed him. The river boiled at ninety degrees. He walked in anyway. The story spread for years.'
  const parcial = 'Nobody believed him. The river boiled at ninety degrees. He walked in anyway. The legend spread for decades and nobody could explain it.'
  const pres2 = authorPreserved(roteiro, parcial)
  checa('roteiro de 4 frases com 1 mexida: authorPreserved reprova', pres2.ok === false)
  checa(
    'roteiro de 4 frases com 1 mexida -> CONTINUA RECUSA',
    isSeedNotScript(authorSentences(roteiro).length, pres2.missing.length) === false,
    `autor=${authorSentences(roteiro).length} mexidas=${pres2.missing.length}`,
  )

  // ── 5. QUEM CHAMA — a política tem de estar NO CAMINHO do dinheiro ──────
  const rota = readFileSync(join(raiz, 'app', 'api', 'expand-script', 'route.ts'), 'utf8')
  checa('a rota importa isSeedNotScript', /\bisSeedNotScript\b\s*,/.test(rota) && /from '@\/lib\/expandPolicy'/.test(rota))
  checa(
    'a rota chama isSeedNotScript com a contagem real',
    /isSeedNotScript\(\s*totalFrasesAutor\s*,\s*preservado\.missing\.length\s*\)/.test(rota),
  )

  const posGuarda = rota.indexOf('isSeedNotScript(totalFrasesAutor')
  const posRecusa = rota.indexOf("outcome: 'author_rewrite_rejected'")
  const posAutoria = rota.indexOf("authoringReason: 'seed_rewritten'")
  checa(
    'a semente e decidida ANTES da recusa',
    posGuarda > 0 && posRecusa > 0 && posGuarda < posRecusa,
    `guarda=${posGuarda} recusa=${posRecusa}`,
  )
  checa('a saida da semente e needs_authoring, nao 422', posAutoria > 0 && posAutoria < posRecusa)
  checa('a recusa author_rewrite_rejected CONTINUA existindo', posRecusa > 0)

  const depoisDaRecusa = rota.slice(posRecusa, posRecusa + 4000)
  checa('a recusa do C1 continua devolvendo 422', /\{\s*status:\s*422\s*\}/.test(depoisDaRecusa))

  const blocoAutoria = rota.slice(Math.max(0, posAutoria - 2200), posAutoria + 600)
  checa('a semente devolve o ORIGINAL em `script`, nunca o candidato', /script:\s*original,/.test(blocoAutoria))
  checa('a semente carrega o discriminador de medicao', /authoringReason:\s*'seed_rewritten'/.test(blocoAutoria))
  checa('a semente preserva o candidato para leitura', /candidate:\s*expandido,/.test(blocoAutoria))
  checa('a semente nao marca expanded:true', /expanded:\s*false,/.test(blocoAutoria))
} catch (e) {
  checa('execucao do teste', false, e instanceof Error ? e.message : String(e))
} finally {
  try { rmSync(saida, { recursive: true, force: true }) } catch {}
}

for (const c of casos) console.log(`${c.ok ? '  ok  ' : ' FALHA'} ${c.nome}${c.detalhe ? ` — ${c.detalhe}` : ''}`)
console.log(`\n${casos.length - falhas}/${casos.length} verificacoes`)
process.exit(falhas === 0 ? 0 : 1)
