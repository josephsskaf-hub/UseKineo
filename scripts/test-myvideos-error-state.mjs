// KINEO-SPRINT-UI4-2026-08-29 — prova que /history e /my-videos nao mascaram
// falha de leitura como "No videos yet" (licao do incidente JWT-skew 28/08:
// o fundador viu 0 videos com 327 intactos NESTAS telas).
import { readFileSync } from 'node:fs'

const checks = []
const t = (name, cond) => { checks.push([name, cond]) }
const read = (p) => readFileSync(p, 'utf8')

const histPage = read('app/(dashboard)/history/page.tsx')
t('history/page captura o error do select', histPage.includes('error: loadError'))
t('history/page loga warn na falha', histPage.includes("console.warn('[history] videos read failed"))
t('history/page passa loadError ao client', histPage.includes('loadError={Boolean(loadError)}'))

const histClient = read('app/(dashboard)/history/HistoryClient.tsx')
t('HistoryClient aceita loadError', histClient.includes('loadError?: boolean'))
t('HistoryClient guarda antes do empty state', histClient.indexOf('loadError && videos.length === 0') < histClient.indexOf('/* ── Empty state ── */'))
t('HistoryClient: copy de seguranca', histClient.includes('Your videos and credits are safe'))
t('HistoryClient: role=alert (a11y)', histClient.includes('role="alert"'))
t('HistoryClient: botao Try again', histClient.includes('window.location.reload()'))
t('HistoryClient: empty state original intacto', histClient.includes('No videos yet'))

const mvPage = read('app/(dashboard)/my-videos/page.tsx')
t('my-videos/page passa loadError', mvPage.includes('loadError={Boolean(query.error)}'))
t('my-videos/page mantem retry estreito 42703', mvPage.includes('narrowColumns'))

const mvClient = read('app/(dashboard)/my-videos/MyVideosClient.tsx')
t('MyVideosClient aceita loadError', mvClient.includes('loadError?: boolean'))
t('MyVideosClient guarda antes do empty state', mvClient.indexOf('loadError && videos.length === 0') < mvClient.indexOf('No videos yet —'))
t('MyVideosClient: copy de seguranca', mvClient.includes('Your videos and credits are safe'))
t('MyVideosClient: role=alert (a11y)', mvClient.includes('role="alert"'))
t('MyVideosClient: empty state original intacto', mvClient.includes('No videos yet'))

let fail = 0
for (const [name, ok] of checks) { console.log(`${ok ? '✅' : '❌'} ${name}`); if (!ok) fail++ }
console.log(`\n${checks.length - fail}/${checks.length} ok`)
process.exit(fail ? 1 : 0)
