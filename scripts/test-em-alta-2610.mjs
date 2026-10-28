// KINEO-EM-ALTA-2610 — guardião da vitrine "Em alta esta semana" (tela de Clipes).
//   A. catálogo: cada tendência tem prévia e pôster que EXISTEM em public/, motor de texto, 5 s, 9:16, "No text" no prompt;
//   B. nada de pessoa real: nenhum nome de jogador/artista/marca no prompt; o colchão de gelatina saiu (olho, 26/10);
//   C. a tela: o botão só PREENCHE (applyTrend chama setPrompt/setEngineKey e nunca a geração), ?trend= aplica uma vez;
//   D. telas e eventos fora do escopo intocados (sem evento novo em app/api/events);
//   E. mutantes.
import { semRostoCards2810, ARQUIVOS_ROSTO_CARDS_2810 } from './test-support/desfaz-rosto-cards-2810.mjs' // KINEO-ROSTO-NO-CLIPE-2810 — as entregas de 28/10 (rosto no clipe, cards, elenco, galeria cheia, menu) saem em memória ANTES de todas as camadas
import { ARQUIVOS as DESENHO15_ARQUIVOS } from './test-support/desfaz-desenho-15s-aceita-2710.mjs' // KINEO-DESENHO-15S-ACEITA-2710
import { ARQUIVOS as CONSERTOS_ARQUIVOS } from './test-support/desfaz-consertos-2710.mjs' // KINEO-CONSERTOS-2710
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { semIntegracaoSobreMain2372610 } from './test-support/leva-rebase-2610.mjs' // Exact sealed integration only; unknown source bytes are never projected.

const lf = (t) => t.replace(/\r\n/g, '\n')
const rd = (p) => lf(semRostoCards2810(fs.readFileSync(p, 'utf8'), p))
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }

const cat = rd('lib/clips/clipTrends.ts')
const keys = [...cat.matchAll(/key: '([a-z_]+)'/g)].map((m) => m[1])
checa('A1 cinco tendências', keys.length === 5)
for (const k of keys) {
  checa(`A2 prévia e pôster existem (${k})`, fs.existsSync(`public/previews/em-alta-${k}.mp4`) && fs.existsSync(`public/posters/em-alta-${k}.webp`) && cat.includes(`/previews/em-alta-${k}.mp4`))
}
const blocos = cat.split("    key: '").slice(1)
const semTexto = /const N = ' No text, no logos, no watermark\.'/.test(cat)
checa('A3 todo prompt pede sem texto e sem marca d\'água', blocos.every((b) => (semTexto && /\+ N,/.test(b)) || (/No text, no logos/.test(b) && /no watermark/.test(b))))
checa('A4 motor Kling 3 (hollywood), 5 s, 9:16 em todas', blocos.every((b) => /engine: 'hollywood'/.test(b) && /seconds: 5,/.test(b) && /aspect: '9:16'/.test(b)))
checa('B1 sem nome de pessoa/marca real nos prompts', !/Messi|Yamal|Ozil|Özil|Ronaldo|Neymar|Ferrari|Porsche|Lamborghini|Gangnam/i.test(cat.replace(/^\/\/.*$/gm, '')))
checa('B2 colchão de gelatina fora da vitrine', !keys.includes('jelly_mattress'))

const ui = rd('app/(dashboard)/clips/ClipsClient.tsx')
const apply = ui.slice(ui.indexOf('function applyTrend('), ui.indexOf('const trendFromUrlRef'))
checa('C1 applyTrend preenche motor, duração, formato e ideia', ['setEngineKey(target.key)', 'setSeconds(trend.seconds)', 'setAspect(trend.aspect)', 'setPrompt(trend.prompt)'].every((s) => apply.includes(s)))
checa('C2 applyTrend nunca gera nem chama a API', !/generate|fetch\(|\/api\/clips/.test(apply))
checa('C3 limpa efeito e foto antes (clipe por texto)', apply.includes('setEffectKey(null)') && apply.includes('setPhotoUrl(null)'))
checa('C4 ?trend= aplica uma vez só', /trendFromUrlRef\.current = true/.test(ui) && /get\('trend'\)/.test(ui))
checa('C5 card só aparece se a conta tem motor que serve', /const target = trendTarget\(tr, engines\)\s*\n\s*if \(!target\) return null/.test(ui))
checa('C6 vitrine vem antes da galeria de efeitos', ui.indexOf('clip-trends-title') > 0 && ui.indexOf('clip-trends-title') < ui.indexOf('aria-labelledby="clip-effects-title"'))

// This task's own immutable delta remains free of API/event edits. The final
// branch also contains four separately approved deliveries, whose API sources
// are certified below rather than mistaken for changes made by this UI task.
const OWN_BASE = '237b14fb186655e448e9d2e5e80b5b904a8e9863'
const OWN_PRODUCT = 'f9216bf8728cb86adac67c59c9b8ca47c06521f9'
const APPROVED_INTEGRATION = '917d1f8728b0d73d6ffb518e2e16051fbd3d9f9a'
const LATEST_MAIN = 'ffe52785608c868cdc9215ec878f7de6f841a2e6'
const git = (...args) => lf(execFileSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 16 << 20, stdio: ['ignore', 'pipe', 'ignore'] }))
const list = value => value.trim().split('\n').filter(Boolean)
const mudou = list(git('diff', '--name-only', OWN_BASE, OWN_PRODUCT))
checa('D1 nenhum evento novo nem rota mexida', !mudou.some((f) => f.startsWith('app/api/')))

const expectedApi = list(git('diff', '--name-only', OWN_BASE, APPROVED_INTEGRATION, '--', 'app/api')).sort()
const currentApi = [...new Set([
  ...list(git('diff', '--name-only', LATEST_MAIN, '--', 'app/api')),
  ...list(git('ls-files', '--others', '--exclude-standard', '--', 'app/api')),
])].filter((f) => !DESENHO15_ARQUIVOS.includes(f) && !(CONSERTOS_ARQUIVOS.includes(f) && !expectedApi.includes(f)) && !(ARQUIVOS_ROSTO_CARDS_2810.includes(f) && !expectedApi.includes(f))).sort() /* KINEO-ROSTO-NO-CLIPE-2810 — rota que só as entregas de 28/10 mexeram sai do inventário desta */ // KINEO-CONSERTOS-2710 — rota que SÓ uma entrega de 27/10 mexeu (cinematic) sai do inventário desta; a do status (aprovada aqui) fica e é projetada // KINEO-DESENHO-15S-ACEITA-2710 — rota que uma entrega posterior mexeu sai do inventário desta
const immutable = new Map()
function blob(ref, file) {
  const key = ref + ':' + file
  if (!immutable.has(key)) {
    let value = null
    try { value = git('cat-file', 'blob', key) } catch { /* Missing historical files remain missing; no HEAD fallback. */ }
    immutable.set(key, value)
  }
  return immutable.get(key)
}
function apiBoundary(overrides = {}) {
  const failures = []
  const files = [...new Set([...currentApi, ...Object.keys(overrides)])].sort()
  if (JSON.stringify(files) !== JSON.stringify(expectedApi)) failures.push('API inventory differs from the approved four-wave delta')
  for (const file of files) {
    let raw
    try { raw = Object.hasOwn(overrides, file) ? overrides[file] : rd(file) }
    catch { failures.push('API source missing: ' + file); continue }
    const before = blob(OWN_BASE, file)
    if (before !== null) {
      if (lf(semIntegracaoSobreMain2372610(raw, file)) !== before) failures.push('Unknown API bytes: ' + file)
    } else {
      const reviewed = blob(APPROVED_INTEGRATION, file)
      if (reviewed === null || lf(raw) !== reviewed) failures.push('New API differs from its immutable approved source: ' + file)
    }
  }
  return failures
}
checa('D2 API delta keeps every exact approved source, with no extra path', apiBoundary().length === 0)
const crlfApi = Object.fromEntries(currentApi.map(file => [file, rd(file).replace(/\n/g, '\r\n')]))
checa('D3 exact API boundary accepts CRLF without changing meaning', apiBoundary(crlfApi).length === 0)
checa('D4 historical projection is idempotent for each approved API', currentApi.every(file => {
  const first = semIntegracaoSobreMain2372610(rd(file), file)
  return semIntegracaoSobreMain2372610(first, file) === first
}))
const apiMutation = 'app/api/events/route.ts'
checa('M2 unknown API edit cannot escape the exact sealed boundary', currentApi.includes(apiMutation)
  && apiBoundary({ [apiMutation]: rd(apiMutation) + '\n// unknown API edit must remain visible\n' }).length > 0)
const newApiMutation = currentApi.find(file => blob(OWN_BASE, file) === null)
checa('M3 an edited API absent from the original main also stays red', Boolean(newApiMutation)
  && apiBoundary({ [newApiMutation]: rd(newApiMutation) + '\n// unknown new-API edit must remain visible\n' }).length > 0)


const mut = apply.replace('setPrompt(trend.prompt)', '')
checa('M1 mutante (sem preencher a ideia) seria vermelho em C1', !['setPrompt(trend.prompt)'].every((s) => mut.includes(s)))

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
