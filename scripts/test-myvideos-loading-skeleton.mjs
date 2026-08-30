// KINEO-SPRINT-UI6-2026-08-30 — prova que /my-videos tem skeleton de loading
// espelhando o layout real do MyVideosClient (sem salto de layout).
import { readFileSync } from 'node:fs'

const loading = readFileSync(new URL('../app/(dashboard)/my-videos/loading.tsx', import.meta.url), 'utf8')
const client = readFileSync(new URL('../app/(dashboard)/my-videos/MyVideosClient.tsx', import.meta.url), 'utf8')

let n = 0, fail = 0
function check(name, ok) {
  n++
  if (!ok) { fail++; console.error(`✗ ${name}`) } else console.log(`✓ ${name}`)
}

// 1. o skeleton existe e exporta default
check('loading.tsx exporta componente default', /export default function/.test(loading))
// 2. nunca spinner: shimmer animado presente
check('usa shimmer animado (regra: forma do resultado, nunca spinner)', /@keyframes/.test(loading) && /background-position/.test(loading))
check('nao usa spinner de verdade (classe/rotacao)', !/animate-spin|rotate\(360/.test(loading))
// 3. mesmo wrapper do client (sem salto de layout)
check('mesmo padding do MyVideosClient (px-4 sm:px-6 py-7 pb-20)', loading.includes('px-4 sm:px-6 py-7 pb-20') && client.includes('px-4 sm:px-6 py-7 pb-20'))
// 4. mesmas colunas responsivas da mv-grid real
for (const cols of ['repeat(5, minmax(0, 1fr))', 'repeat(4, minmax(0, 1fr))', 'repeat(3, minmax(0, 1fr))', 'repeat(2, minmax(0, 1fr))']) {
  check(`grade espelha ${cols}`, loading.includes(cols) && client.includes(cols))
}
// 5. mesmos breakpoints
for (const bp of ['max-width: 1280px', 'max-width: 900px', 'max-width: 600px']) {
  check(`breakpoint ${bp} espelhado`, loading.includes(bp) && client.includes(bp))
}
// 6. cards 9:16 como o resultado real
check('cards do skeleton sao 9:16', loading.includes("aspectRatio: '9 / 16'"))
// 7. tem fileira de filtros (o client renderiza FilterTabs)
check('skeleton antecipa a fileira de filtros', /flexWrap: 'wrap'/.test(loading))
// 8. e server component puro (loading.tsx nao pode depender de estado)
check('sem use client / sem hooks', !/use client|useState|useEffect/.test(loading))
// 9. keyframe com nome proprio (nao colide com o hsk da /history)
check('keyframe proprio (mvsk), sem colisao com /history', /mvsk/.test(loading) && !/\bhsk\b/.test(loading))

console.log(fail === 0 ? `\nPASS — ${n} verificacoes` : `\nFAIL — ${fail}/${n}`)
process.exit(fail === 0 ? 0 : 1)
