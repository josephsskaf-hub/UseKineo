#!/usr/bin/env node
// ═══ sprint-v1v4 #11 — A DURAÇÃO QUE O PRODUTO NÃO OFERECE ═════════════════
//
// Duas peças do mesmo defeito, medidas em produção (14 dias, só externos):
// 23 recusas `narration_too_short` em 17 PESSOAS, e 11 dessas 17 nunca
// entregaram um único vídeo.
//
//   (1) O PADRÃO da tela de criação era 45s. O seletor tem 35/60/90. Quem não
//       tocava nos chips via nenhum aceso, lia "add words to fill 45s" com o
//       45 em lugar nenhum da tela, e era recusada contra um alvo que nunca
//       escolheu. 14 das 23 recusas têm target=45.
//   (2) A ALTERNATIVA da frase de recusa era `floor(fala/5)*5` — 40s, 30s,
//       25s, 15s. Nenhum desses números existe no seletor. E com 11s ou 2s de
//       fala, o "use 15s" nem passaria na régua: levava à MESMA recusa.
//
// Rodar:  node scripts/test-duracao-que-nao-existe-2026-08-31.mjs
// Sem rede, sem banco, sem servidor.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8')

let falhas = 0
const checa = (nome, cond, detalhe = '') => {
  if (cond) { console.log(`  ✓ ${nome}`) }
  else { falhas++; console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ''}`) }
}

const fonteNarration = ler('lib/narrationFit.ts')
const fonteExpand = ler('lib/expandPolicy.ts')
const fonteRota = ler('app/api/generate-video-cinematic/route.ts')
const fonteClient = ler('app/(dashboard)/generate/GenerateClient.tsx')

// ─── A régua e a lista, replicadas do fonte (nada de valor escrito à mão) ───
const MIN_COVERAGE = Number(/export const MIN_COVERAGE = ([\d.]+)/.exec(fonteNarration)?.[1])
const WPS = Number(/export const WORDS_PER_SECOND = ([\d.]+)/.exec(fonteNarration)?.[1])
const SUPPORTED = JSON.parse(
  /export const SUPPORTED_DURATIONS = (\[[^\]]*\])/.exec(fonteExpand)?.[1] ?? 'null',
)
const OPCOES_UI = [...fonteClient.matchAll(/\{ value: (\d+), label: '([^']+)' \}/g)].map((m) => Number(m[1]))

console.log('\nA) As três listas do produto são a MESMA lista')
checa('MIN_COVERAGE lido do fonte', MIN_COVERAGE === 0.95, `lido=${MIN_COVERAGE}`)
checa('WORDS_PER_SECOND lido do fonte', WPS === 2.3, `lido=${WPS}`)
checa('SUPPORTED_DURATIONS = [35,60,90]', JSON.stringify(SUPPORTED) === '[35,60,90]', JSON.stringify(SUPPORTED))
checa('DURATION_OPTIONS da UI = SUPPORTED_DURATIONS', JSON.stringify(OPCOES_UI) === JSON.stringify(SUPPORTED), JSON.stringify(OPCOES_UI))
checa('45 NÃO está no seletor (foi removido em 20/08)', !SUPPORTED.includes(45))

// ─── Reimplementação fiel das duas funções sob teste ───────────────────────
const fit = (fala, alvo) => {
  const coverage = fala / alvo
  const ok = coverage >= MIN_COVERAGE
  return {
    speech: fala, target: alvo, silence: alvo - fala, coverage, ok,
    missingWords: ok ? 0 : Math.ceil((alvo * MIN_COVERAGE - fala) * WPS),
  }
}
const maiorQueCabe = (fala, lista = SUPPORTED) => {
  const teto = fala / MIN_COVERAGE
  const cabem = lista.filter((d) => d <= teto + 1e-9).sort((a, b) => b - a)
  return cabem.length > 0 ? cabem[0] : null
}
const sugeridaAntiga = (fala) => Math.max(15, Math.floor(fala / 5) * 5)

// ─── Os 22 pares (fala, alvo) REAIS das recusas de produção ────────────────
// Extraídos de events.metadata->'error' ('speech=Xs target=Ys'), 14 dias,
// externos. Cada um é uma pessoa que viu esta frase na tela.
const PRODUCAO = [
  [25, 35], [30, 35], [32, 35], [38, 45], [37, 45], [42, 45], [2, 60], [7, 60],
  [34, 45], [35, 45], [29, 45], [32, 45], [31, 45], [11, 35], [37, 45], [38, 45],
  [36, 45], [31, 45], [39, 45], [40, 45], [2, 35], [38, 45],
]

console.log('\nB) A frase antiga mandava a pessoa para uma duração inexistente')
const ruinsAntes = PRODUCAO.filter(([f]) => !SUPPORTED.includes(sugeridaAntiga(f)))
checa('a régua antiga errava na MAIORIA das recusas reais', ruinsAntes.length >= 12,
  `${ruinsAntes.length} de ${PRODUCAO.length} sugeriam duração fora do seletor`)
const antesAindaRecusaria = PRODUCAO.filter(([f]) => f / sugeridaAntiga(f) < MIN_COVERAGE)
checa('e em alguns casos a sugestão antiga seria recusada de novo', antesAindaRecusaria.length >= 3,
  `${antesAindaRecusaria.length} casos (ex.: fala 11s -> "use 15s" = ${(11 / 15 * 100).toFixed(0)}%)`)

console.log('\nC) A frase nova nunca oferece o que a tela não tem')
for (const [fala, alvo] of PRODUCAO) {
  const s = maiorQueCabe(fala)
  if (s !== null && !SUPPORTED.includes(s)) {
    checa(`fala ${fala}s/alvo ${alvo}s oferece duração do seletor`, false, `ofereceu ${s}`)
  }
}
checa('toda sugestão nova está no seletor', PRODUCAO.every(([f]) => {
  const s = maiorQueCabe(f); return s === null || SUPPORTED.includes(s)
}))
checa('toda sugestão nova PASSA na régua de 95%', PRODUCAO.every(([f]) => {
  const s = maiorQueCabe(f); return s === null || f / s >= MIN_COVERAGE
}))
checa('quando nada cabe, não há sugestão (fala 2s)', maiorQueCabe(2) === null)
checa('quando nada cabe, não há sugestão (fala 11s)', maiorQueCabe(11) === null)
checa('fala 33.25s (o piso exato de 35s) cabe em 35s', maiorQueCabe(33.25) === 35)
checa('fala 33.2s NÃO cabe em 35s', maiorQueCabe(33.2) === null)
checa('fala 57s cabe em 60s e não em 90s', maiorQueCabe(57) === 60)

console.log('\nD) O padrão de 35s destrava a maioria das recusas de hoje')
const alvo45 = PRODUCAO.filter(([, a]) => a === 45)
checa('45 era o alvo na maioria das recusas', alvo45.length >= 14, `${alvo45.length} de ${PRODUCAO.length}`)
const passariamEm35 = alvo45.filter(([f]) => fit(f, 35).ok)
checa('a maioria delas passaria em 35s sem escrever mais nada', passariamEm35.length >= 11,
  `${passariamEm35.length} de ${alvo45.length}`)

console.log('\nE) A peça está LIGADA nas duas pontas (lição do sceneTruth)')
checa('narrationTooShortMessage exige a lista como parâmetro',
  /export function narrationTooShortMessage\(\s*fit: NarrationFit,\s*supportedDurations: readonly number\[\],\s*\)/.test(fonteNarration))
checa('a mensagem nunca mais usa floor(fala/5)*5', !/Math\.floor\(fit\.speech \/ 5\)/.test(fonteNarration))
checa('a rota importa SUPPORTED_DURATIONS', /import \{ SUPPORTED_DURATIONS, largestFittingDuration \} from '@\/lib\/expandPolicy'/.test(fonteRota))
checa('a rota PASSA a lista para a mensagem', /narrationTooShortMessage\(fit, SUPPORTED_DURATIONS\)/.test(fonteRota))
checa('suggestedDuration vem de largestFittingDuration', /suggestedDuration: largestFittingDuration\(fit\.speech\) \?\? 0/.test(fonteRota))
checa('a rota não usa mais round(fala/5)*5', !/Math\.round\(fit\.speech \/ 5\)/.test(fonteRota))
checa('DEFAULT_DURATION deriva do próprio seletor',
  /const DEFAULT_DURATION: Duration = DURATION_OPTIONS\[0\]\.value/.test(fonteClient))
checa('o estado da tela nasce em DEFAULT_DURATION',
  /useState<Duration>\(DEFAULT_DURATION\)/.test(fonteClient))
checa('nenhum useState de duração escrito à mão com 45', !/useState<Duration>\(45\)/.test(fonteClient))
checa('narrationFit continua sendo a régua do contador vivo da tela',
  fonteClient.includes("import { MIN_COVERAGE, speechSeconds } from '@/lib/narrationFit'"))

console.log('\nF) Fronteira com o Codex e armadilhas conhecidas')
checa('nada de preço/crédito/plano nesta mudança',
  !/checkoutPricing|marketingPrice|engineCost/.test(
    ['lib/narrationFit.ts'].map(ler).join('\n')))
checa('SUPPORTED_DURATIONS não foi alterada (lib/growth depende dela)',
  fonteExpand.includes('export const SUPPORTED_DURATIONS = [35, 60, 90] as const'))
// A armadilha da #8: crase em comentário novo pode cair dentro de template literal.
const comentariosNovos = [
  ...fonteClient.matchAll(/^\/\/ .*sprint-v1v4 #11[\s\S]{0,2400}?(?=\nconst DEFAULT_DURATION)/gm),
]
checa('nenhuma crase nos comentários novos do client',
  !(comentariosNovos[0]?.[0] ?? '').includes('`'))
checa('nenhuma crase nos comentários novos da rota',
  !/\/\/ sprint-v1v4 #11[^\n]*`/.test(fonteRota))

console.log(falhas === 0
  ? `\n✅ TODAS AS VERIFICAÇÕES PASSARAM\n`
  : `\n❌ ${falhas} VERIFICAÇÃO(ÕES) FALHARAM\n`)
process.exit(falhas === 0 ? 0 : 1)
