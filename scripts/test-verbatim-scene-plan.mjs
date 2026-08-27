#!/usr/bin/env node
// Executa a função real usada pela rota; sem rede, fornecedor ou crédito.

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const output = mkdtempSync(join(tmpdir(), 'kineo-verbatim-beats-'))
const requireFromOutput = createRequire(join(output, 'x.cjs'))

try {
  execFileSync(process.execPath, [
    join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    join(root, 'lib', 'cinematic', 'verbatimBeats.ts'),
    '--outDir', output,
    '--module', 'commonjs',
    '--target', 'es2022',
    '--skipLibCheck',
  ], { stdio: 'pipe' })
  writeFileSync(join(output, 'package.json'), JSON.stringify({ type: 'commonjs' }))
} catch (error) {
  console.error('Não consegui compilar verbatimBeats:', error.stdout?.toString() || error.message)
  process.exit(1)
}

const { resolveVerbatimSegments } = requireFromOutput(join(output, 'verbatimBeats.js'))
const routeSource = readFileSync(join(root, 'app/api/generate-video-cinematic/route.ts'), 'utf8')
let failures = 0
let checks = 0
function check(label, condition) {
  checks += 1
  if (!condition) {
    failures += 1
    console.error(`x ${label}`)
  }
}

const cleanScript = `At night, some quiet coastlines begin to glow electric blue. The light comes from tiny plankton that store chemical energy during the day. When a wave moves them, they flash for only a fraction of a second. Millions of flashes together make every footprint, paddle, and ripple shine. The glow is not magic, and it is not permanent. Temperature, tides, and nutrients must align. That is why a beach can look ordinary one evening and become a field of stars the next.`
const normalized = cleanScript.replace(/\s+/gu, ' ').trim()
const cleanParsed = { segments: [], narration: normalized }
const beats = resolveVerbatimSegments(cleanParsed, 4)
const beatSizes = beats.map((beat) => beat.voiceover.split(/\s+/u).length)

check('prosa limpa de 35s vira quatro cenas', beats.length === 4)
check('nenhuma cena vazia', beats.every((beat) => beat.voiceover.length > 0))
check('nenhuma palavra falada é inventada, removida ou reordenada', beats.map((beat) => beat.voiceover).join(' ') === normalized)
check('beats são equilibrados', Math.max(...beatSizes) - Math.min(...beatSizes) <= 1)
check('cada beat fornece pista visual curta', beats.every((beat) => beat.pexelsQuery.length > 0 && beat.pexelsQuery.split(/\s+/u).length <= 24))
check('primeira palavra preservada', beats[0].voiceover.startsWith('At night,'))
check('payoff preservado no último beat', beats.at(-1).voiceover.endsWith('the next.'))

const oneSentence = Array.from({ length: 80 }, (_, index) => `word${index + 1}`).join(' ')
const oneSentenceBeats = resolveVerbatimSegments({ segments: [], narration: oneSentence }, 4)
check('uma única frase longa também vira quatro cenas', oneSentenceBeats.length === 4)
check('frase longa mantém exatamente as 80 palavras', oneSentenceBeats.map((beat) => beat.voiceover).join(' ') === oneSentence)

check('entrada vazia não inventa cena', resolveVerbatimSegments({ segments: [], narration: '  ' }, 4).length === 0)
check('não cria beats vazios quando há menos palavras', resolveVerbatimSegments({ segments: [], narration: 'one two' }, 4).length === 2)
check('teto defensivo de nove cenas', resolveVerbatimSegments({ segments: [], narration: oneSentence }, 99).length === 9)
check('contagem inválida fecha em um beat', resolveVerbatimSegments({ segments: [], narration: 'one two three' }, Number.NaN).length === 1)

const marked = {
  narration: 'First sentence stays. Middle sentence stays. Last sentence stays.',
  segments: [
    { voiceover: 'First sentence stays.', pexelsQuery: 'first' },
    { voiceover: 'Middle sentence stays.', pexelsQuery: 'middle' },
    { voiceover: 'Last sentence stays.', pexelsQuery: 'last' },
  ],
}
check('roteiro marcado permanece byte a byte quando cabe', JSON.stringify(resolveVerbatimSegments(marked, 3)) === JSON.stringify(marked.segments))
const sampled = resolveVerbatimSegments(marked, 2)
check('amostragem marcada mantém primeiro e último', sampled[0].pexelsQuery === 'first' && sampled[1].pexelsQuery === 'last')

check('rota importa a função executada pelo teste', routeSource.includes("from '@/lib/cinematic/verbatimBeats'"))
check('rota aciona o fallback somente quando não há segmentos marcados', routeSource.includes('parsedScript.segments.length > 0'))
check('rota usa o resolver executado com parsedScript e clipCount', routeSource.includes('resolveVerbatimSegments(parsedScript, clipCount)'))
check('rota não volta a ler os segmentos crus', !routeSource.includes('const segs = parsedScript.segments'))
check('TTS final continua usando a narração integral', routeSource.includes('verbatim && parsedScript.narration'))

rmSync(output, { recursive: true, force: true })
console.log(failures === 0 ? `${checks}/${checks} verificações OK` : `${failures}/${checks} verificações falharam`)
process.exit(failures === 0 ? 0 : 1)
