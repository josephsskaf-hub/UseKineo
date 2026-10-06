// KINEO-STUDIO-TILE-ADS-2026-09-27 — guardião do tile "Business ad" no /studio (sprint 16 h, ciclo D, item U).
//
// O QUE PROVA (readFileSync, sem alias @/, sem rede, sem OpenAI):
//   A. StudioClient importa as fontes: ADS_SUBSCRIBER_PLANS (lib/ads/access.ts), KINEO1_35S_CREDITS + adsPassLive
//      (lib/ads/offer.ts), ADS_MODELS (lib/ads/models.ts), getTierPrice + formatCheckoutMoney (lib/checkoutPricing.ts).
//   B. Literal antigo travado em ZERO: nenhum "9.90", "3 credits", "35-second" digitado — os três números nascem por derivação
//      (getTierPrice('starter') → 990 → "$9.90"; KINEO1_35S_CREDITS → 3; min(ADS_MODELS.seconds) → 35). O guardião LÊ os três
//      valores nas fontes e confere que a derivação em StudioClient os produz.
//   C. Os dois hrefs existem com utm_campaign=sprint0927 (wizard /ads/new e porta /ads?from=studio) e o wizard só sai
//      sob o predicado de plano (adsTileAccess = ADS_SUBSCRIBER_PLANS.includes(plan)).
//   D. O tile está condicionado a adsPassLive(); studio_tiles_shown carrega ads_tile; o clique grava
//      studio_tile_ads_clicked {plan, has_access, href_kind}; o evento está em ADS_EVENTS e fora de ADS_SERVER_ONLY_EVENTS.
//   E. O plano cru chega do /api/me/credits (select 'video_credits, plan' + `plan` no JSON) e StudioClient o lê (d?.plan).
//   F. Mutantes em memória: (1) preço digitado no lugar da derivação → vermelho; (2) wizard para todo mundo (sem a condição
//      de plano) → vermelho; (3) tile sem adsPassLive() → vermelho; (4) studio_tiles_shown sem ads_tile → vermelho;
//      (5) poster sem object-fit contain → vermelho (revisão 27/09: o cartão 1200×630 com o cover herdado virava "ces" no tile 9:16).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (rel) => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

const STUDIO = rd('app/(dashboard)/studio/StudioClient.tsx')
const OFFER = rd('lib/ads/offer.ts')
const MODELS = rd('lib/ads/models.ts')
const ACCESS = rd('lib/ads/access.ts')
const PRICING = rd('lib/checkoutPricing.ts')
const EVENTS = rd('lib/ads/events.ts')
const CREDITS_ROUTE = rd('app/api/me/credits/route.ts')

let ok = 0
const falhas = []
function check(nome, cond) {
  if (cond) ok += 1
  else falhas.push(nome)
  console.log(`${cond ? 'ok ' : 'FAIL'} ${nome}`)
}

// ─── fontes lidas (o guardião não digita nenhum número: extrai das fontes) ─────────────────────────────────────────────
const starterMinor = Number(/starter: \{ usd: (\d+) \}/.exec(PRICING)?.[1])
const kineo1_35 = Number(/export const KINEO1_35S_CREDITS = (\d+)/.exec(OFFER)?.[1])
const modelSeconds = [...MODELS.matchAll(/^\s{4}seconds: (\d+),$/gm)].map((m) => Number(m[1]))
const minSeconds = Math.min(...modelSeconds)
const subscriberPlans = /export const ADS_SUBSCRIBER_PLANS: readonly string\[\] = \[([^\]]+)\]/.exec(ACCESS)?.[1] ?? ''
const starterLabel = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(starterMinor / 100)
check('fontes legíveis: starter em centavos, KINEO1_35S_CREDITS, segundos dos modelos, planos assinantes', Number.isInteger(starterMinor) && starterMinor > 0 && Number.isInteger(kineo1_35) && kineo1_35 > 0 && modelSeconds.length >= 2 && Number.isFinite(minSeconds) && subscriberPlans.includes("'starter'"))

// ─── as verificações como função da fonte (para os mutantes rodarem em memória) ────────────────────────────────────────
function verificar(src) {
  const r = {}
  r.importAccess = /import \{ ADS_SUBSCRIBER_PLANS \} from '@\/lib\/ads\/access'/.test(src)
  r.importOffer = /import \{ KINEO1_35S_CREDITS, adsPassLive \} from '@\/lib\/ads\/offer'/.test(src)
  r.importModels = /import \{ ADS_MODELS \} from '@\/lib\/ads\/models'/.test(src)
  r.importPricing = /import \{ formatCheckoutMoney, getTierPrice \} from '@\/lib\/checkoutPricing'/.test(src)
  // literal antigo = 0 (nada digitado)
  r.semPrecoDigitado = src.split('9.90').length - 1 === 0
  r.semCreditosDigitados = src.split('3 credits').length - 1 === 0
  r.semSegundosDigitados = src.split('35-second').length - 1 === 0
  // derivação
  r.precoDerivado = src.includes("const ADS_TILE_STARTER_PRICE = formatCheckoutMoney('usd', getTierPrice('starter', 'usd', 'standard'))")
  r.segundosDerivados = src.includes('const ADS_TILE_MIN_SECONDS = Math.min(...ADS_MODELS.map((m) => m.seconds))')
  r.linhaAssinante = src.includes('`Included in your plan · ${KINEO1_35S_CREDITS} credits per ${ADS_TILE_MIN_SECONDS}-second ad`')
  r.linhaPorta = src.includes('`Included in any paid plan · from ${ADS_TILE_STARTER_PRICE}/month`')
  // hrefs
  // REANCORADO 29/09 (KINEO-ADS-V2-VIRADA-2026-09-29): /ads/new sem ?classic=1 agora cai no v2 (34/41/51 por 15 s); a linha
  // do tile vende o CLÁSSICO (KINEO1_35S_CREDITS por 35 s), então o href leva &classic=1 no fim. Intenção mantida: utm triplo
  // com a campanha do dia, e o assistente (não a porta) para quem tem plano.
  r.hrefWizard = src.includes("const ADS_TILE_WIZARD_HREF = '/ads/new?utm_source=studio&utm_medium=tile&utm_campaign=sprint0927&classic=1'")
  r.hrefPorta = src.includes("const ADS_TILE_DOOR_HREF = '/ads?from=studio&utm_source=studio&utm_medium=tile&utm_campaign=sprint0927'")
  // predicado de plano: o wizard só sai sob adsTileAccess, e adsTileAccess é o predicado do servidor
  r.predicadoPlano = src.includes('const adsTileAccess = plan !== null && ADS_SUBSCRIBER_PLANS.includes(plan)')
  r.wizardSoComAcesso = src.includes('const adsTileHref = adsTileAccess ? ADS_TILE_WIZARD_HREF : ADS_TILE_DOOR_HREF') && src.split('ADS_TILE_WIZARD_HREF').length - 1 === 2
  // tile condicionado ao interruptor
  r.tileSoComPasse = /\{adsPassLive\(\) && \(\n\s+<div className="vtile" data-tile="ads">/.test(src)
  // impressão: ads_tile dentro do evento já existente (sem evento novo de impressão)
  const shownStart = src.indexOf("void trackEvent('studio_tiles_shown', {")
  const shownEnd = shownStart >= 0 ? src.indexOf('})', shownStart) : -1
  const shownBloco = shownStart >= 0 && shownEnd > shownStart ? src.slice(shownStart, shownEnd) : ''
  r.adsTileNaImpressao = /ads_tile: adsPassLive\(\)/.test(shownBloco)
  r.semImpressaoNova = !/trackEvent\('studio_tile_ads_shown'/.test(src) && !/trackEvent\('ads_tile_shown'/.test(src)
  // clique
  const clickStart = src.indexOf("void trackEvent('studio_tile_ads_clicked', {")
  const clickBloco = clickStart >= 0 ? src.slice(clickStart, src.indexOf('})', clickStart)) : ''
  r.cliqueCompleto = /\bplan,/.test(clickBloco) && /has_access: adsTileAccess/.test(clickBloco) && /href_kind: adsTileAccess \? 'wizard' : 'door'/.test(clickBloco)
  // forma dos irmãos: mesmas classes, poster estático de public/og, nunca vídeo de cliente
  const tileStart = src.indexOf('<div className="vtile" data-tile="ads">')
  const tileBloco = tileStart >= 0 ? src.slice(tileStart, src.indexOf('</div>', tileStart)) : ''
  r.mesmaForma = /className="vtwatch"/.test(tileBloco) && /className="vt"/.test(tileBloco) && /className="vtnext"/.test(tileBloco) && /href=\{adsTileHref\}/.test(tileBloco)
  r.posterEstatico = src.includes("const ADS_TILE_POSTER = '/og/ads-for-local-services.png'") && /<img src=\{ADS_TILE_POSTER\} alt=""/.test(tileBloco) && !/<video/.test(tileBloco)
  r.tituloESubtitulo = /<UiLabel>Business ad<\/UiLabel>/.test(tileBloco) && /<UiLabel>Studio Ads<\/UiLabel>/.test(tileBloco)
  // revisão 27/09 (render em Edge headless): o poster é um cartão 1200×630 e a regra .stu .vtile img é object-fit cover — num tile
  // 9:16 sobrava só "ces" e "ENT RESULT". O contain inline mostra o cartão inteiro; o guardião trava a tag completa.
  r.posterInteiro = tileBloco.includes("<img src={ADS_TILE_POSTER} alt=\"\" loading=\"lazy\" decoding=\"async\" style={{ objectFit: 'contain' }} />")
  // plano cru lido da mesma chamada
  r.lePlano = /typeof d\?\.plan === 'string'\) setPlan\(d\.plan\)/.test(src)
  return r
}

const R = verificar(STUDIO)
for (const [k, v] of Object.entries(R)) check(`StudioClient · ${k}`, v)

// ─── derivação confere com as fontes (o texto que a tela vai mostrar, calculado aqui a partir das fontes) ───────────────
check(`derivação: o Starter da fonte formata como ${starterLabel} (Intl en-US, 2 casas) e o tile só o conhece por getTierPrice`, /^\$\d+\.\d{2}$/.test(starterLabel) && R.precoDerivado && R.semPrecoDigitado)
check(`derivação: ${kineo1_35} créditos por anúncio de ${minSeconds} s vêm de KINEO1_35S_CREDITS e de min(ADS_MODELS.seconds)`, kineo1_35 === Math.min(...[...MODELS.matchAll(/seconds: 35,[\s\S]*?credits: (\d+),/g)].map((m) => Number(m[1]))) && minSeconds === 35 && R.segundosDerivados && R.linhaAssinante)

// ─── lista fechada de eventos ───────────────────────────────────────────────────────────────────────────────────────────
const adsEventsBloco = EVENTS.slice(EVENTS.indexOf('export const ADS_EVENTS = ['), EVENTS.indexOf('] as const'))
const serverOnlyBloco = EVENTS.slice(EVENTS.indexOf('export const ADS_SERVER_ONLY_EVENTS'), EVENTS.indexOf('export function isAdsEvent'))
check('studio_tile_ads_clicked está em ADS_EVENTS (lib/ads/events.ts)', /'studio_tile_ads_clicked',/.test(adsEventsBloco))
check('studio_tile_ads_clicked NÃO é só-de-servidor (o navegador grava)', !/studio_tile_ads_clicked/.test(serverOnlyBloco))

// ─── /api/me/credits devolve o plano cru ────────────────────────────────────────────────────────────────────────────────
// Reancorado 29/09 (KINEO-KINEO1-FORA-2026-09-29): o select ganhou has_paid (régua do Kineo 1) e o JSON ganhou `kineo1`
// antes de `plan`; o que se vigia é o mesmo — o plano CRU e minúsculo chega ao cliente pelo /api/me/credits.
check("/api/me/credits seleciona 'video_credits, plan' e devolve `plan` minúsculo (a fonte do predicado no cliente)", CREDITS_ROUTE.includes(".select('video_credits, plan, has_paid')") && /const plan = typeof data\?\.plan === 'string' \? data\.plan\.trim\(\)\.toLowerCase\(\) : null/.test(CREDITS_ROUTE) && /internal: s25Visible\(user\.email\), (s25Liberado, )?(hasPaid, )?kineo1, plan \}\)/.test(CREDITS_ROUTE) /* reancorado KINEO-S25-ABRE-2026-10-06: + s25Liberado */) // reancorado 29/09 (E2b): a resposta ganhou hasPaid antes de kineo1

// ─── mutantes em memória ────────────────────────────────────────────────────────────────────────────────────────────────
const m1 = STUDIO.split('`Included in any paid plan · from ${ADS_TILE_STARTER_PRICE}/month`').join('`Included in any paid plan · from $9.90/month`')
check('mutante 1 (preço digitado "$9.90" no lugar da derivação) → vermelho', m1 !== STUDIO && (!verificar(m1).semPrecoDigitado || !verificar(m1).linhaPorta))
const m2 = STUDIO.split('const adsTileHref = adsTileAccess ? ADS_TILE_WIZARD_HREF : ADS_TILE_DOOR_HREF').join('const adsTileHref = ADS_TILE_WIZARD_HREF')
check('mutante 2 (wizard para todo mundo, sem a condição de plano) → vermelho', m2 !== STUDIO && !verificar(m2).wizardSoComAcesso)
const m3 = STUDIO.split('{adsPassLive() && (\n').join('{(\n')
check('mutante 3 (tile sem adsPassLive()) → vermelho', m3 !== STUDIO && !verificar(m3).tileSoComPasse)
const m4 = STUDIO.replace(/\n\s+ads_tile: adsPassLive\(\),[^\n]*/, '')
check('mutante 4 (studio_tiles_shown sem ads_tile) → vermelho', m4 !== STUDIO && !verificar(m4).adsTileNaImpressao)
const m5 = STUDIO.split(" style={{ objectFit: 'contain' }} />").join(' />')
check('mutante 5 (poster sem object-fit contain: o cartão 1200×630 vira "ces" no tile 9:16) → vermelho', m5 !== STUDIO && !verificar(m5).posterInteiro)

console.log(`test-studio-tile-ads-2026-09-27: ${ok} ok · ${falhas.length} falhas`)
if (falhas.length) console.log(falhas.map((f) => ` - ${f}`).join('\n'))
process.exit(falhas.length ? 1 : 0)
