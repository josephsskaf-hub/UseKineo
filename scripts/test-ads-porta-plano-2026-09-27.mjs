// KINEO-ADS-PORTA-PLANO-2026-09-27 — guardião do item A (ciclo B da sprint de 16 h, dom 27/09, alvo MRR): a porta /ads para
// quem quis fazer anúncio sem plano. Dado do dia: 2 pessoas logadas sem acesso abriram /ads/new, foram devolvidas a /ads sem
// uma palavra e /ads só oferecia o passe — nunca o Starter, que inclui o Studio Ads e custa menos. Agora: o gate devolve a
// /ads?from=new; a porta mostra DUAS portas (Starter primeiro, passe intacto) para quem não tem gate 'ok'; uma faixa no topo
// explica a quem voltou; ads_page_viewed ganha plan_offer + from; o clique no Starter vira ads_door_plan_clicked.
// Cada prova TRAVA o literal antigo (= 0) e prova o novo POR DERIVAÇÃO (preço/créditos/contagem nunca digitados). Só
// readFileSync (sem alias @/); o que é executado (formatCheckoutMoney, getTierPrice, TIER_CREDITS, adsAccessReason,
// decideEngineGate) roda pelo loader offline. Mutantes em memória no bloco 6.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
const count = (s, needle) => s.split(needle).length - 1
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
const load = createOfflineLoader()

const PAGE = rd('app/(dashboard)/ads/new/page.tsx')
const DOOR = rd('app/ads/page.tsx')
const BANNERS = rd('app/ads/AdsPageBanners.tsx')
const WIZARD = rd('app/(dashboard)/ads/new/AdsWizardClient.tsx')
const ROUTE = rd('app/api/stripe/checkout/route.ts') // só leitura

// ── 1. /ads/new: o gate no_access devolve a /ads?from=new e o evento grava o destino ──
checa('1a. "redirect(\'/ads\')" literal = 0 em ads/new/page.tsx (a devolução muda nunca volta)', count(PAGE, "redirect('/ads')") === 0)
checa('1b. o gate no_access (e só ele) devolve a /ads?from=new', /if \(gate === 'no_access' && !resumingPass\) \{[\s\S]*?redirect\('\/ads\?from=new'\)/.test(PAGE) && count(PAGE, "redirect('/ads?from=new')") === 1)
checa('1c. ads_access_denied continua igual (stage/who/reason) e ganha metadata.redirect com o mesmo destino', PAGE.includes("metadata: { stage: 'page', who: 'no_access', reason, redirect: '/ads?from=new' } })"))
checa('1d. o ramo anônimo e o ?resume=pass não mudaram (um redirect ao /login, painel anônimo intacto)', count(PAGE, 'redirect(`/login') === 1 && PAGE.includes('<AdsWizardClient gate="anon" access="none" resumingPass={false} />'))

// REANCORADO 04/11 (KINEO-ADS-SEM-PRECO-0411) — fundador: "/ads tem que ter só o que o cara vai trabalhar, não tem que ter o pricing". As duas portas (Starter + passe) saíram;
// o propósito segue: quem foi devolvido sem acesso ouve o porquê e tem uma saída para os planos. A prova de preço digitado virou prova de NENHUM preço.
// ── 2. /ads não vende: nem plano, nem passe, nem número ──
const TYPED = /9[.,]90|\b60 credits\b|\b20 ads\b|US\$9\b/
const VENDA = /STARTER_CHECKOUT_HREF|CHECKOUT_HREF|ads-door-plan|formatCheckoutMoney|getTierPrice|TIER_CREDITS|starterPrice|planOffer|<div className="cost ads-price"/
checa('2a. nenhum preço/crédito/contagem digitado ("9.90", "60 credits", "20 ads", "US$9") em app/ads/page.tsx', !TYPED.test(DOOR))
checa('2b. /ads não monta oferta de plano nem de passe', !VENDA.test(DOOR))
const ROUTE_SANITIZER = ROUTE.match(/function intentCampaignFrom\(req: NextRequest\)[^\n]*\n[^\n]*\n\s+return (\/\^[^/]+\/)\.test\(raw\)/)
checa('2c. "ads_door" passa pelo sanitizador de intent_campaign (regex lida do route.ts, não copiada)', !!ROUTE_SANITIZER && new RegExp(ROUTE_SANITIZER[1].slice(1, -1)).test('ads_door'))
const access = load('lib/ads/access.ts')
checa('2d. FATO "part of every paid plan": adsAccessReason({ plan: starter }) === subscriber (lib/ads/access.ts ADS_SUBSCRIBER_PLANS)', access.adsAccessReason({ plan: 'starter' }, 'x@example.com') === 'subscriber')

// ── 3. a faixa de quem voltou: condição, lugar, saída ──
checa('3a. searchParams chega pela prop da página e from = first(searchParams?.from)', DOOR.includes('export default async function StudioAdsPage({ searchParams }') && DOOR.includes('const from = first(searchParams?.from)'))
const condicaoFaixa = "const returnedFromWizard = (from === 'new' || from === 'v2') && viewer.signedIn && viewer.gate === 'no_access'"
checa("3b. faixa condicionada a (from === 'new' || from === 'v2') && viewer.signedIn && viewer.gate === 'no_access'", DOOR.includes(condicaoFaixa))
const stripStart = DOOR.indexOf('{returnedFromWizard ? (')
const heroStart = DOOR.indexOf('<header className="ads-hero">')
const strip = DOOR.slice(stripStart, heroStart)
checa('3c. faixa ANTES do hero, dizendo o porquê e levando aos planos, sem preço', stripStart > 0 && heroStart > stripStart && strip.includes('<b>Studio Ads is part of every paid plan.</b>') && strip.includes('href="/pricing?intent_campaign=ads_door"') && !/\$|credits/.test(strip))
// Rascunho: AdsWizardClient só grava 'kineo:ads:draft:v1' em saveDraftAndLogin, e TODO chamador está atrás de `anon`; takeDraft
// apaga na 1ª leitura (TTL 1 h). Logado sem acesso nunca monta o assistente → nada é gravado → a faixa não pode prometer.
const writers = count(WIZARD, 'saveDraftAndLogin(text, link)')
const anonWriters = count(WIZARD, 'anon ? saveDraftAndLogin(text, link)') + count(WIZARD, 'if (anon) return saveDraftAndLogin(text, link)')
checa('3d. a faixa NÃO promete rascunho salvo — e o código confirma: saveDraft só via saveDraftAndLogin, todos os chamadores atrás de anon', !/saved|kept /.test(strip) && writers > 0 && writers === anonWriters)

// ── 4. medição: ads_page_viewed segue com from; o wrapper de clique segue o mesmo ──
checa('4a. AdsPageBanners recebe from do servidor', DOOR.includes('<AdsPageBanners live={live} cta={cta} from={from} />'))
const viewedStart = BANNERS.indexOf("void trackEvent('ads_page_viewed', {")
const viewed = BANNERS.slice(viewedStart, BANNERS.indexOf('})', viewedStart))
checa('4b. ads_page_viewed carrega plan_offer e from', viewedStart > 0 && viewed.includes('plan_offer: planOffer') && viewed.includes('from,'))
checa('4c. o from do servidor passa pelo mesmo sanitizador (entrySource) com a URL como reserva — nunca ecoado cru', BANNERS.includes("const from = entrySource(fromProp ?? params?.get('from') ?? null)"))
const ev = load('lib/ads/events.ts')
checa('4d. ads_door_plan_clicked segue na lista FECHADA ADS_EVENTS (o histórico continua legível)', ev.isAdsEvent('ads_door_plan_clicked'))

// ── 5. mutantes em memória: o guardião pega o que ele promete pegar ──
const auditDoor = (src) => {
  const p = []
  if (TYPED.test(src)) p.push('typed')
  if (VENDA.test(src)) p.push('sale')
  if (!src.includes(condicaoFaixa)) p.push('condition')
  if (!src.includes('href="/pricing?intent_campaign=ads_door"')) p.push('exit')
  return p
}
checa('5a. o auditor aprova o arquivo real', auditDoor(DOOR).length === 0)
const mutPrice = DOOR.replace('<b>{l.name}</b></div>', '<b>{l.name}</b> $9.90</div>')
checa('5b. MUTANTE preço digitado no JSX ("$9.90") fica vermelho', mutPrice !== DOOR && auditDoor(mutPrice).includes('typed'))
const mutHref = DOOR.replace("const CLASSIC_HREF =", "const STARTER_CHECKOUT_HREF = '/api/stripe/checkout?tier=starter'\nconst CLASSIC_HREF =")
checa('5c. MUTANTE a porta do Starter de volta fica vermelho', mutHref !== DOOR && auditDoor(mutHref).includes('sale'))
const mutLive = DOOR.replace(condicaoFaixa, "const returnedFromWizard = from === 'new' || from === 'v2'")
checa('5d. MUTANTE faixa sem a condição fica vermelho', mutLive !== DOOR && auditDoor(mutLive).includes('condition'))
const mutExit = DOOR.replace('href="/pricing?intent_campaign=ads_door"', 'href="/ads"')
checa('5e. MUTANTE faixa sem saída para os planos fica vermelho', mutExit !== DOOR && auditDoor(mutExit).includes('exit'))
const mutRedirect = PAGE.replace("redirect('/ads?from=new')", "redirect('/ads')")
checa('5f. MUTANTE ads/new devolvendo a /ads pelado fica vermelho (1a travaria)', mutRedirect !== PAGE && count(mutRedirect, "redirect('/ads')") === 1)

console.log(`test-ads-porta-plano-2026-09-27: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
