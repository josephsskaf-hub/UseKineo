// KINEO-VENDER-NO-DOWNLOAD-2026-09-18 — guardião da jogada 7: "baixar limpo" ao lado de "baixar grátis".
// Sem rede, sem banco. Prova a decisão pura (com mutante) e a montagem nos DOIS ramos do download.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, () => { throw new Error('sem imports') })
  return m.exports
}

console.log('1) decisão pura')
const libSrc = rd('lib/growth/cleanDownloadTwin.ts')
const lib = roda(libSrc)
const base = { delivered: true, hasWatermark: true, hasPaid: false, unlocking: false, rebuildReady: true }
checa('filme marcado, conta não paga, remontagem pronta → visível', lib.decideCleanDownloadTwin(base).visible === true && lib.decideCleanDownloadTwin(base).reason === 'ok')
checa('sem filme entregue → invisível', lib.decideCleanDownloadTwin({ ...base, delivered: false }).reason === 'not_delivered')
checa('filme limpo (pago ou premium) → invisível', lib.decideCleanDownloadTwin({ ...base, hasWatermark: false }).reason === 'no_watermark')
checa('pagante provado → invisível', lib.decideCleanDownloadTwin({ ...base, hasPaid: true }).reason === 'already_paid')
checa('remontagem em curso → invisível', lib.decideCleanDownloadTwin({ ...base, unlocking: true }).reason === 'unlocking')
checa('sem insumos para remontar ESTE filme → invisível (não promete o que não entrega)', lib.decideCleanDownloadTwin({ ...base, rebuildReady: false }).reason === 'rebuild_not_ready')
checa('versão nomeada', lib.CLEAN_DOWNLOAD_TWIN_VERSION === 'clean_download_twin_v1')
const rot = lib.cleanDownloadTwinLabel('US$ 9.90', 60)
checa('rótulo com preço e créditos vindos do chamador', rot.title.includes('US$ 9.90') && rot.sub.includes('60 credits'))
checa('sem moeda resolvida, sem número', !/\d/.test(lib.cleanDownloadTwinLabel(null, 60).title))
checa('lib não crava 60 nem 9.90', !/\b60\b/.test(libSrc.replace(/\/\/.*$/gm, '')) && !libSrc.includes('9.90'))

console.log('2) mutante: a trava de remontagem deixa de decidir')
const mut = libSrc.replace("if (!input.rebuildReady) return { visible: false, reason: 'rebuild_not_ready', version }", "if (false) return { visible: false, reason: 'rebuild_not_ready', version }")
checa('mutante aplicou', mut !== libSrc)
checa('mutante é pego (o guardião reprovaria)', roda(mut).decideCleanDownloadTwin({ ...base, rebuildReady: false }).visible === true)

console.log('3) montagem na tela')
const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
checa('importa a decisão pura', gc.includes("import { decideCleanDownloadTwin, cleanDownloadTwinLabel } from '@/lib/growth/cleanDownloadTwin'"))
checa('a decisão lê o veredito do servidor, a prova de pagamento e os insumos', gc.includes('hasWatermark: currentResultHasWatermark,') && gc.includes('rebuildReady: Boolean(lastFastRenderRef.current),') && /decideCleanDownloadTwin\(\{[\s\S]{0,400}hasPaid,[\s\S]{0,200}unlocking: wmUnlocking,/.test(gc))
checa('o gêmeo NÃO exclui o trial (a decisão não lê trialActive nem trialPostVideoPhase)', !/decideCleanDownloadTwin\(\{[\s\S]{0,400}trial(Active|PostVideoPhase)/.test(gc))
checa('montado nos dois ramos irmãos', gc.split('{cleanDownloadTwinButton}').length === 2 && gc.includes('{!showPostVideoExportChoice && cleanDownloadTwinButton}'))
const idxTwin1 = gc.indexOf('{cleanDownloadTwinButton}')
const idxDl1 = gc.lastIndexOf('Download my Short (${finalVideoSeconds ?? duration}s · MP4)`}', idxTwin1)
checa('ramo 1: o gêmeo vem logo DEPOIS do download grátis (deliver-first)', idxDl1 > 0 && idxTwin1 - idxDl1 < 260)
const idxTwin2 = gc.indexOf('{!showPostVideoExportChoice && cleanDownloadTwinButton}')
const idxDl2 = gc.lastIndexOf("`Download my film (${finalVideoSeconds ?? duration}s · MP4)`", idxTwin2)
checa('ramo 2: o gêmeo vem logo DEPOIS do download grátis do trial', idxDl2 > 0 && idxTwin2 - idxDl2 < 1200)
checa('clique = o MESMO checkout do remove-watermark (return=wm), com evento próprio', /function handleCleanDownloadTwin\(\) \{[\s\S]{0,700}clean_download_twin_clicked[\s\S]{0,700}handleRemoveWatermark\(\)\s*\n\s*\}/.test(gc))
checa('impressão medida por viewport, uma vez por asset', gc.includes("trackEvent('clean_download_twin_shown'") && gc.includes('cleanDownloadTwinTrackedKeyRef.current === offerKey'))
checa('preço na moeda resolvida e créditos da fonte única', gc.includes('cleanDownloadTwinLabel(postVideoRenewalPrice, TIER_CREDITS.starter)'))
checa('a caixa antiga de export limpo continua intacta', gc.includes("{watermarkedDownloadConfirmed ? 'OR' : 'WANT IT WITHOUT THE WATERMARK?'}") && gc.includes('See clean export options →'))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
