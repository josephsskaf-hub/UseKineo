// KINEO-DOWNLOAD-OFERTA-2810 — guardião da oferta "Remove watermark + HD" no instante do download.
// Sem rede, sem banco. Prova a decisão pura (com mutante), a copy, a loja de insumos e a montagem nas duas telas.
import { readFileSync } from 'node:fs'
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
function memStorage() {
  const map = new Map()
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => { map.set(k, String(v)) }, map }
}

console.log('1) decisão pura: só para quem NÃO pagou, só depois do clique no download')
const libSrc = rd('lib/growth/downloadUpsell.ts')
const lib = roda(libSrc)
const base = { downloadClicked: true, hasWatermark: true, hasPaid: false, unlocking: false, dismissed: false }
checa('clicou em download, filme marcado, conta não paga → visível', lib.decideDownloadUpsell(base).visible === true && lib.decideDownloadUpsell(base).reason === 'ok')
checa('antes do clique → invisível (é o instante do download)', lib.decideDownloadUpsell({ ...base, downloadClicked: false }).reason === 'no_download_yet')
checa('filme limpo → invisível', lib.decideDownloadUpsell({ ...base, hasWatermark: false }).reason === 'no_watermark')
checa('pagante → invisível', lib.decideDownloadUpsell({ ...base, hasPaid: true }).reason === 'already_paid')
checa('pagamento não lido → invisível (falha fechada)', lib.decideDownloadUpsell({ ...base, hasPaid: null }).reason === 'paid_unknown')
checa('remontagem em curso → invisível', lib.decideDownloadUpsell({ ...base, unlocking: true }).reason === 'unlocking')
checa('fechou a oferta → invisível', lib.decideDownloadUpsell({ ...base, dismissed: true }).reason === 'dismissed')
checa('versão nomeada', lib.DOWNLOAD_UPSELL_VERSION === 'download_upsell_v1')

console.log('2) mutante: a trava de pagante deixa de decidir')
const mut = libSrc.replace("if (input.hasPaid) return { visible: false, reason: 'already_paid', version }", "if (false) return { visible: false, reason: 'already_paid', version }")
checa('mutante aplicou', mut !== libSrc)
checa('mutante é pego (pagante passaria a ver a oferta)', roda(mut).decideDownloadUpsell({ ...base, hasPaid: true }).visible === true)

console.log('3) estante: marca d\'água = conta não paga + builder clássico')
checa('não paga + Seedance (cinematic_ai) → marcado', lib.libraryFilmCarriesWatermark({ qualityMode: 'cinematic_ai', accountNonPaying: true }) === true)
checa('não paga + Kineo 1 (fast) → marcado', lib.libraryFilmCarriesWatermark({ qualityMode: 'fast', accountNonPaying: true }) === true)
checa('não paga + Kling/Veo → limpo', lib.libraryFilmCarriesWatermark({ qualityMode: 'cinematic_hollywood', accountNonPaying: true }) === false && lib.libraryFilmCarriesWatermark({ qualityMode: 'cinematic_veo', accountNonPaying: true }) === false)
checa('pagante → nunca', lib.libraryFilmCarriesWatermark({ qualityMode: 'cinematic_ai', accountNonPaying: false }) === false)
checa('conta não lida → nunca', lib.libraryFilmCarriesWatermark({ qualityMode: 'cinematic_ai', accountNonPaying: null }) === false)

console.log('4) copy e checkout')
const en = lib.downloadUpsellCopy({ priceLabel: '$9.90', monthlyCredits: 60, thisFilm: true })
checa('botão diz "Remove watermark + HD" com o preço do chamador', en.button.includes('Remove watermark + HD') && en.button.includes('$9.90'))
checa('promessa "this film" só com insumos', en.title.includes('this film') && !lib.downloadUpsellCopy({ priceLabel: null, monthlyCredits: 60, thisFilm: false }).title.includes('this film'))
checa('sem preço resolvido, sem número no botão', !/\d/.test(lib.downloadUpsellCopy({ priceLabel: null, monthlyCredits: 60, thisFilm: true }).button))
checa('créditos e custo do HD no subtítulo', en.sub.includes('60 monthly credits') && en.sub.includes(`${lib.MAKE_IT_HD_COST} of your`))
checa('pt e es localizados', lib.downloadUpsellCopy({ priceLabel: null, monthlyCredits: 60, thisFilm: true, lang: 'pt' }).button.includes('Tirar a marca + HD') && lib.downloadUpsellCopy({ priceLabel: null, monthlyCredits: 60, thisFilm: true, lang: 'es' }).button.includes('Quitar la marca + HD'))
checa('lib não crava preço', !/9\.90|\$\d/.test(libSrc.replace(/\/\/.*$/gm, '')))
checa('checkout = o MESMO do remove-watermark (Starter, intro, return=wm)', lib.DOWNLOAD_UPSELL_CHECKOUT_PATH === '/api/stripe/checkout?tier=starter&intro=1&return=wm')
const enhance = rd('app/api/enhance/route.ts')
checa('custo do HD = ENHANCE_COST da rota', new RegExp(`const ENHANCE_COST = ${lib.MAKE_IT_HD_COST}\\b`).test(enhance))
checa('Make it HD só para filme limpo de quem pagou', lib.decideMakeItHd({ delivered: true, hasWatermark: false, hasPaid: true, videoId: 'v' }) === true &&
  lib.decideMakeItHd({ delivered: true, hasWatermark: true, hasPaid: true, videoId: 'v' }) === false &&
  lib.decideMakeItHd({ delivered: true, hasWatermark: false, hasPaid: false, videoId: 'v' }) === false &&
  lib.decideMakeItHd({ delivered: true, hasWatermark: false, hasPaid: true, videoId: null }) === false)
// KINEO-AVULSO-GARANTIA-2810 — a segunda opção do cartão: o passe avulso.
checa('avulso = o MESMO SKU do "Just this video" (pack=starter, return=wm)', lib.DOWNLOAD_UPSELL_ONE_TIME_CHECKOUT_PATH === '/api/stripe/checkout?pack=starter&return=wm')
const ot = lib.downloadUpsellCopy({ priceLabel: '$9.90', monthlyCredits: 60, thisFilm: true, oneTimePriceLabel: '$4.99', oneTimeCredits: 35 })
checa('avulso com insumos: "Just this film — no watermark · $4.99 one-time"', ot.oneTimeButton === 'Just this film — no watermark · $4.99 one-time' && ot.oneTimeSub.includes('re-made clean') && ot.oneTimeSub.includes('35 credits'))
const otNext = lib.downloadUpsellCopy({ priceLabel: null, monthlyCredits: 60, thisFilm: false, oneTimePriceLabel: '$4.99', oneTimeCredits: 35 })
checa('avulso sem insumos: "your next film", igual ao plano', otNext.oneTimeButton === 'Just your next film — no watermark · $4.99 one-time' && !otNext.oneTimeSub.includes('this'))
checa('avulso sem preço: sem número no botão', !/\d/.test(lib.downloadUpsellCopy({ priceLabel: null, monthlyCredits: 60, thisFilm: true }).oneTimeButton))
checa('avulso em pt e es', lib.downloadUpsellCopy({ priceLabel: null, monthlyCredits: 60, thisFilm: true, lang: 'pt', oneTimePriceLabel: '$4.99' }).oneTimeButton === 'Só este filme — sem marca d’água · $4.99 pagamento único' && lib.downloadUpsellCopy({ priceLabel: null, monthlyCredits: 60, thisFilm: false, lang: 'es', oneTimePriceLabel: '$4.99' }).oneTimeButton === 'Solo tu próxima película — sin marca de agua · $4.99 pago único')

console.log('5) insumos da remontagem por filme (estante)')
const st = memStorage()
const inputs = { clip_urls: ['https://x/a.mp4'], voiceover_script: 'hello', quality: 'cinematic_ai' }
checa('grava e recupera', lib.rememberRebuildInputs(st, 'v1', inputs, 1000) && lib.recallRebuildInputs(st, 'v1', 2000)?.voiceover_script === 'hello')
checa('insumo inválido não grava', lib.rememberRebuildInputs(st, 'v2', { clip_urls: [] }, 1000) === false && lib.recallRebuildInputs(st, 'v2', 2000) === null)
checa('expira em 14 dias', lib.recallRebuildInputs(st, 'v1', 1000 + lib.WM_REBUILD_TTL_MS + 1) === null)
for (let i = 0; i < 7; i++) lib.rememberRebuildInputs(st, `n${i}`, inputs, 5000 + i)
const kept = Object.keys(JSON.parse(st.map.get(lib.WM_REBUILD_STORE_KEY)))
checa('guarda só os 5 mais recentes', kept.length === lib.WM_REBUILD_MAX_ENTRIES && kept.includes('n6') && !kept.includes('n0'))
const broken = memStorage(); broken.setItem(lib.WM_REBUILD_STORE_KEY, '{nao json')
checa('loja corrompida não quebra', lib.recallRebuildInputs(broken, 'v1') === null)

console.log('6) tela do filme (/studio/create → GenerateClient)')
const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
checa('importa a decisão e o cartão', gc.includes("from '@/lib/growth/downloadUpsell'") && gc.includes("import { DownloadUpsellCard, MakeItHdButton } from '@/components/growth/DownloadUpsell'"))
checa('decisão lê veredito do servidor, pagamento e remontagem', /decideDownloadUpsell\(\{[\s\S]{0,300}hasWatermark: currentResultHasWatermark,[\s\S]{0,40}hasPaid,[\s\S]{0,40}unlocking: wmUnlocking,/.test(gc))
const hd = gc.slice(gc.indexOf('async function handleDownload(e: React.MouseEvent<HTMLAnchorElement>)'))
const hdHead = hd.slice(0, hd.indexOf('const outcome = await downloadVideoFile('))
checa('o clique abre a oferta só p/ filme marcado de conta não paga', hdHead.includes('if (currentResultHasWatermark && !hasPaid && downloadUpsellKey)') && hdHead.includes('setDownloadUpsellClick('))
checa('o download não espera nem para (sem return/await no bloco da oferta)', !/KINEO-DOWNLOAD-OFERTA-2810[\s\S]*\breturn\b/.test(hdHead.slice(hdHead.indexOf('KINEO-DOWNLOAD-OFERTA-2810'), hdHead.indexOf('const slug'))) && hd.indexOf('const outcome = await downloadVideoFile(') > 0)
// KINEO-AVULSO-GARANTIA-2810 — o clique leva `option`; plano = handleRemoveWatermark, avulso = handleBuyThisVideoOnly.
checa('clique = evento próprio com option + o MESMO handleRemoveWatermark (plano) ou handleBuyThisVideoOnly (avulso)', /function handleDownloadUpsellBuy\(anchor: 'top' \| 'main', option: DownloadUpsellOption = 'plan'\) \{[\s\S]{0,200}trackEvent\('download_upsell_clicked'[\s\S]{0,240}option,[\s\S]{0,700}if \(option === 'one_time'\) handleBuyThisVideoOnly\(\)\s*\n\s*else handleRemoveWatermark\(\)\s*\n\s*\}/.test(gc) && gc.includes("withIntentCampaign('/api/stripe/checkout?tier=starter&intro=1&return=wm')") && gc.includes("'starter_pack_wm',\n      withIntentCampaign('/api/stripe/checkout?pack=starter&return=wm')"))
checa('tela do filme: dois botões ligados (plano e avulso) e espera no botão certo', gc.includes("onBuy={() => handleDownloadUpsellBuy(anchor, 'plan')}") && gc.includes("onBuyOneTime={() => handleDownloadUpsellBuy(anchor, 'one_time')}") && gc.includes("pendingOption={wmCheckout.pending === 'starter_pack_wm' ? 'one_time'"))
checa('tela do filme: preço do avulso = packPriceLabel() e créditos = PACK_CREDITS.starter', /downloadUpsellCopy\(\{[\s\S]{0,500}oneTimePriceLabel: packPriceLabel\(\),\s*\n\s*oneTimeCredits: PACK_CREDITS\.starter,/.test(gc))
const idxTop = gc.indexOf("{renderDownloadUpsell('top')}")
checa('âncora do topo logo depois do "Download MP4" do cabeçalho', idxTop > 0 && idxTop - gc.lastIndexOf('<span aria-hidden="true">⬇</span> Download MP4', idxTop) < 260)
checa('âncora principal nos DOIS ramos do download', gc.includes("{cleanDownloadTwinButton}\n                  {renderDownloadUpsell('main')}") && gc.includes("{!showPostVideoExportChoice && renderDownloadUpsell('main')}"))
checa('gêmeo some enquanto a oferta do download está aberta', gc.includes('cleanDownloadTwin.visible && !fullVersionOfferEligible && !downloadUpsell.visible ?'))
checa('Make it HD montado pela decisão (pagante, filme limpo)', /decideMakeItHd\(\{[\s\S]{0,200}hasPaid,/.test(gc) && gc.includes('{showMakeItHd && publicVideoId && <MakeItHdButton videoId={publicVideoId} surface="done_screen_top" />}'))
checa('insumos gravados só de filme marcado entregue', gc.includes("if (phase !== 'done' || !publicVideoId || !currentResultHasWatermark || !lastFastRenderRef.current) return") && gc.includes('rememberRebuildInputs(window.localStorage, publicVideoId, lastFastRenderRef.current)'))

console.log('7) estante (/library e /history → HistoryClient)')
const hc = rd('app/(dashboard)/history/HistoryClient.tsx')
checa('/library e /history usam o mesmo HistoryClient', rd('components/library/VideoCollection.tsx').includes("import MyVideosClient from '@/app/(dashboard)/history/HistoryClient'"))
checa('"não paga" = sem prova de pagamento nem plano', hc.includes('setAccountNonPaying(d.hasPaid !== true && d.isStarter !== true && d.isCreator !== true && d.isStudio !== true)'))
checa('o clique no download abre a oferta só p/ filme marcado e entrega pelo handleDownload intocado', /function handleDownloadWithUpsell\(video: Video, surface: DownloadUpsellSurface\) \{\s*\n\s*if \(video.video_url && !downloadingId && libraryFilmCarriesWatermark\(\{ qualityMode: video.quality_mode, accountNonPaying \}\)\) \{\s*\n\s*setDownloadUpsellOpen[\s\S]{0,120}void handleDownload\(video\)\s*\n\s*\}/.test(hc) && hc.includes('async function handleDownload(video: Video) {'))
checa('compra: handoff do filme, checkout return=wm (plano OU avulso), evento com option', /function handleDownloadUpsellBuy[\s\S]{0,1100}localStorage.setItem\('kineo_wm_unlock'[\s\S]{0,300}localStorage.removeItem\('kineo_wm_unlock'\)[\s\S]{0,200}DOWNLOAD_UPSELL_ONE_TIME_CHECKOUT_PATH[\s\S]{0,400}DOWNLOAD_UPSELL_CHECKOUT_PATH[\s\S]{0,300}trackEvent\('download_upsell_clicked'[\s\S]{0,80}option,/.test(hc))
checa('estante: dois botões ligados, chave própria do avulso', hc.includes("onBuyOneTime={() => handleDownloadUpsellBuy(video, surface, 'one_time')}") && hc.includes('downloadUpsellCheckout.launch(`${surface}:one_time`, DOWNLOAD_UPSELL_ONE_TIME_CHECKOUT_PATH'))
checa('montada no card e no preview', hc.includes("renderDownloadUpsell(video, 'library_card')") && hc.includes("renderDownloadUpsell(v, 'library_lightbox')") && hc.includes("onDownload={() => handleDownloadWithUpsell(v, 'library_lightbox')}") && hc.includes("onClick={() => handleDownloadWithUpsell(video, 'library_card')}"))
checa('estante não inventa preço do plano (sem moeda resolvida); o avulso vem da fonte única', hc.includes('downloadUpsellCopy({ priceLabel: null, monthlyCredits: TIER_CREDITS.starter, thisFilm, lang: interfaceLanguage, oneTimePriceLabel: packPriceLabel(), oneTimeCredits: PACK_CREDITS.starter })'))

console.log('8) cartão e botão HD')
const comp = rd('components/growth/DownloadUpsell.tsx')
checa('impressão: download_upsell_viewed ao montar, 1x por filme+superfície', comp.includes("trackEvent('download_upsell_viewed'") && comp.includes('viewedKeys.has(key)'))
checa('fechar é medido', comp.includes("trackEvent('download_upsell_dismissed'"))
checa('dois botões do mesmo tamanho (plano e avulso) e a garantia sob eles', comp.includes('data-download-upsell-cta="plan"') && comp.includes('data-download-upsell-cta="one_time"') && comp.indexOf('{firstFilmGuarantee(lang)}') > comp.indexOf('data-download-upsell-cta="one_time"') && (comp.match(/width: '100%', marginTop: \d+, padding: '11px 12px', borderRadius: 11, border: '2px solid var\(--accent\)'/g) || []).length === 2)
checa('HD usa a rota de sempre (/api/enhance) e é medido', comp.includes("fetch('/api/enhance', { method: 'POST'") && comp.includes("trackEvent('make_it_hd_clicked'") && comp.includes("trackEvent('make_it_hd_viewed'"))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
