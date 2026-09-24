// KINEO-TRES-JOGADAS-SERVIDOR-2026-09-23 — guardião da frente "servidor e fatos que a IA lê".
//
// O QUE ELE PROVA (cada bloco cita o dado que motivou):
//  S1 pack de US$4,90: grava intent_campaign na sessão (antes: metadata só supabase_user_id/pack/
//     pack_credits → toda medição de pack dava 0) e `?return=studio` volta ao Studio (antes: /checkout/
//     success ficava em 'plan_pending' para sempre, lib/growth/checkoutSuccessEntitlement.ts:34-37).
//  S2 webhook: payment_success ganha kind/payment_link; pedido KINEO EMPRESAS (Express US$35 / Pro US$75 por Payment Link;
//     o link legado de US$100 de 23/09 está desativado na Stripe e só é reconhecido)
//     vira 'dfy_order_paid' ANTES da checagem de userId, sem crédito/plano/has_paid, sem guard, sem throw.
//  S3 padrão de billing da /pricing = mensal (anual concede 1×/ano, FAQ promete reset mensal; 0 vendas anuais).
//  S4 fatos que a IA lê: vigência 17/09, Kling 3 calculado, "per week" derivado da janela, llms.txt sem
//     `usd / 100`, sem Date.now() e sem o unlock de $4,90 como oferta geral, openapi 1.2.2 sem "25-credit"
//     nem "first film is free", models-pricing e pricing.ts sem 25/3 digitados.
//  S5 página de intenção: cadastro SEM utm_source=google cravado (quem vinha do ChatGPT virava 'google').
//  DFY o módulo puro lib/growth/dfyOffer.ts: candidatos positivos/negativos reais, link com identidade.
// Estilo da casa: readFileSync + regex (import com alias '@/' não roda); helper `checa(nome, condicao)`.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const roda = (src) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, Map, Set, Array, Object, String, RegExp, Number, Math, URLSearchParams }); return exp }
const num = (src, name) => Number((src.match(new RegExp(`${name}\\s*=\\s*(\\d+)`)) || [])[1])

// ── DFY: o módulo puro ────────────────────────────────────────────────────────
console.log('== DFY: lib/growth/dfyOffer.ts ==')
let dfy
try {
  dfy = await import(pathToFileURL(join(RAIZ, 'lib/growth/dfyOffer.ts')).href)
} catch (e) {
  // Node sem strip de tipos: transpila e roda no vm (mesmo caminho dos outros guardiões).
  dfy = roda(rd('lib/growth/dfyOffer.ts'))
}
checa('DFY_TIERS: Express 3500 e Pro 7500 (fundador 24/09), legado 10000 fora dos SKUs, ACCEPTED = os três', dfy.DFY_TIERS.express.priceMinor === 3500 && dfy.DFY_TIERS.pro.priceMinor === 7500 && dfy.DFY_LEGACY_PRICE_USD_MINOR === 10000 && JSON.stringify([...dfy.DFY_ACCEPTED_AMOUNTS_USD_MINOR]) === '[3500,7500,10000]')
checa("isDfyLinkUrl('') === false; isDfyOfferLive() espelha liveDfyTiers() (vazio = cartão pausado)", dfy.isDfyLinkUrl('') === false && (dfy.isDfyOfferLive() === false) === (dfy.liveDfyTiers().length === 0))
// ── LIGADO 24/09 ~04h BRT: os dois degraus com os links REAIS que o Cowork criou no painel da Stripe (conta live, nada pago;
// relatório docs/KINEO-EMPRESAS-STRIPE-2026-09-23.md, seção v2). Se alguém esvaziar uma url/linkId, o cartão some do Studio em
// SILÊNCIO (o componente devolve null): por isso os valores exatos ficam travados aqui, e não só o formato.
const EXPRESS_URL = 'https://buy.stripe.com/8x2eVddNbcHRfqH34ygjC0x', EXPRESS_PLINK = 'plink_1UJ4BgIah5dxzSBf8RGTiutr'
const PRO_URL = 'https://buy.stripe.com/28E14n38x0Z9guL6gKgjC0y', PRO_PLINK = 'plink_1UJ4FXIah5dxzSBf8hU9ggtE'
checa('LIGADO: Express com a URL e o plink reais (Cowork 24/09)', dfy.DFY_TIERS.express.url === EXPRESS_URL && dfy.DFY_TIERS.express.linkId === EXPRESS_PLINK)
checa('LIGADO: Pro com a URL e o plink reais (Cowork 24/09)', dfy.DFY_TIERS.pro.url === PRO_URL && dfy.DFY_TIERS.pro.linkId === PRO_PLINK)
checa('LIGADO: isDfyOfferLive() true nos dois degraus; liveDfyTiers() = [express, pro] nesta ordem', dfy.isDfyOfferLive() === true && dfy.isDfyOfferLive('express') === true && dfy.isDfyOfferLive('pro') === true && dfy.liveDfyTiers().map((t) => t.tier).join(',') === 'express,pro')
checa('LIGADO: dfyPaymentLinkIds() = [express, pro, legado] e dfyTierForLink resolve os dois plinks reais', JSON.stringify(dfy.dfyPaymentLinkIds()) === JSON.stringify([EXPRESS_PLINK, PRO_PLINK, 'plink_1UJ23XIah5dxzSBfyfKlmOGV']) && dfy.dfyTierForLink(EXPRESS_PLINK) === 'express' && dfy.dfyTierForLink(PRO_PLINK) === 'pro')
checa('LIGADO: dfyCardCopy() sem argumento pinta os DOIS botões, Express primeiro, com preço e prazo', (() => { const c = dfy.dfyCardCopy(); return c.options.length === 2 && c.options[0].cta === 'Express — US$35, 48 h →' && c.options[1].cta === 'Pro — US$75, 72 h →' && c.options[1].detail.startsWith('Seedance or Kling 3.') })())
checa('LIGADO: dfyPaymentLink sem url explícita lê o degrau e leva a identidade da conta', (() => { const u = dfy.dfyPaymentLink({ tier: 'pro', userId: '16aa454a-2ef3-4e6d-bc53-0bece84290d7' }); return typeof u === 'string' && u.startsWith(PRO_URL + '?') && u.includes('client_reference_id=16aa454a-2ef3-4e6d-bc53-0bece84290d7') && u.includes('utm_source=studio_dfy_card') })())
checa('LIGADO: URL e plink reais NÃO aparecem no webhook nem no cartão (fonte única é o módulo puro)', !rd('app/api/stripe/webhook/route.ts').includes(EXPRESS_PLINK) && !rd('app/api/stripe/webhook/route.ts').includes(PRO_PLINK) && !rd('components/DfyOfferCard.tsx').includes(EXPRESS_URL) && !rd('components/DfyOfferCard.tsx').includes(PRO_URL))
checa('isDfyLinkUrl aceita buy.stripe.com e recusa http/outro host', dfy.isDfyLinkUrl('https://buy.stripe.com/abc_123') === true && dfy.isDfyLinkUrl('http://buy.stripe.com/abc') === false && dfy.isDfyLinkUrl('https://evil.com/buy.stripe.com') === false)
const POSITIVOS = [
  'Create a high-converting 30-second vertical video ad for Ascend AI, an AI automation agency. Target small business owners',
  'make an advertisement with this man for eCredit.ng, a Nigerian digital platform',
  'Create a professional 75–90 second advertising video for Help Me Tenerife, a company in Tenerife',
  'Create a realistic, cinematic restaurant advertisement set in Amman, Jordan',
  'New 60-second MadLabs advertisement script. Got a business idea but no website?',
  'Create a 40-second premium enterprise software demo for SmartTender AI',
  'Create a premium 60–75 second cinematic founder-story video for ADMITIY',
  'Crie um vídeo publicitário para minha loja de roupas em Curitiba',
  'Crea un anuncio para mi negocio de comida casera',
]
const NEGATIVOS = [
  'billionaires never fly commercial airplanes, here is why',
  'Monaco is the second smallest country in the world',
  'Create a funny 60–90 second 3D AI brainrot story. The main character is a huge muscular p',
  'The African lungfish can survive droughts for up to four years',
  '5 morning habits Jeff Bezos used before Amazon hit $1 trillion',
  'Unexpected school lunches with a twist! Dinner Lady: What will it be today dear?',
  'Why do bad memories stick harder than good ones?',
  'Create a 60-second vertical 9:16 educational Instagram Reel about Lantana camara',
]
for (const t of POSITIVOS) checa(`isDfyCandidate POSITIVO: "${t.slice(0, 50)}…"`, dfy.isDfyCandidate(t) === true)
for (const t of NEGATIVOS) checa(`isDfyCandidate NEGATIVO: "${t.slice(0, 50)}…"`, dfy.isDfyCandidate(t) === false)
checa('isDfyCandidate: texto curto (<20) e vazio/null nunca casam', dfy.isDfyCandidate('ad for my shop') === false && dfy.isDfyCandidate('') === false && dfy.isDfyCandidate(null) === false && dfy.isDfyCandidate(undefined) === false)
checa('dfyPaymentLink devolve null com URL vazia explícita e com http', dfy.dfyPaymentLink({ tier: 'express', userId: 'u1', url: '' }) === null && dfy.dfyPaymentLink({ tier: 'pro', userId: 'u1', url: 'http://buy.stripe.com/x' }) === null)
const link = dfy.dfyPaymentLink({ tier: 'express', userId: 'user_abc-123', email: 'joe@example.com', url: 'https://buy.stripe.com/test_XYZ' })
checa('dfyPaymentLink monta client_reference_id + prefilled_email + utm_source sobre a URL válida', typeof link === 'string' && link.startsWith('https://buy.stripe.com/test_XYZ?') && link.includes('client_reference_id=user_abc-123') && link.includes('prefilled_email=joe%40example.com') && link.includes('utm_source=studio_dfy_card'))
const semRef = dfy.dfyPaymentLink({ tier: 'pro', userId: 'bad id with spaces', email: 'not-an-email', url: 'https://buy.stripe.com/test_XYZ' })
checa('dfyPaymentLink descarta client_reference_id inválido e e-mail sem @ (não quebra o link)', typeof semRef === 'string' && !semRef.includes('client_reference_id') && !semRef.includes('prefilled_email'))
checa('dfyCardCopy lista só degraus LIGADOS, na ordem Express → Pro, com preço e prazo do degrau', (() => { const T = { express: { ...dfy.DFY_TIERS.express, url: 'https://buy.stripe.com/e', linkId: 'plink_e1234567890' }, pro: { ...dfy.DFY_TIERS.pro, url: 'https://buy.stripe.com/p', linkId: 'plink_p1234567890' } }; const c = dfy.dfyCardCopy(T); const off = dfy.dfyCardCopy({ ...T, pro: { ...T.pro, url: '' } }); return c.options.length === 2 && c.options[0].tier === 'express' && c.options[0].cta.includes('US$35') && c.options[0].cta.includes('48 h') && c.options[1].cta.includes('US$75') && c.options[1].cta.includes('72 h') && off.options.length === 1 && dfy.dfyCardCopy().options.length === dfy.liveDfyTiers().length })())

// ── S1: checkout do pack ─────────────────────────────────────────────────────
console.log('== S1: app/api/stripe/checkout/route.ts ==')
const co = rd('app/api/stripe/checkout/route.ts')
checa('helper intentCampaignFrom(req) com a MESMA regex da assinatura (alfanumérico . _ ~ -, 1-100)', /function intentCampaignFrom\(req: NextRequest\): string \| undefined \{[\s\S]*?\/\^\[A-Za-z0-9\._~-\]\{1,100\}\$\/\.test\(raw\)/.test(co))
checa('a assinatura (buildAndRedirect) usa o helper — uma sanitização, dois SKUs', co.includes('const intentCampaign = intentCampaignFrom(req)'))
const packIni = co.indexOf('async function buildPackAndRedirect(')
const packFim = co.indexOf('async function buildStarter290AndRedirect(')
const pack = packIni >= 0 && packFim > packIni ? co.slice(packIni, packFim) : ''
checa('buildPackAndRedirect localizado', pack.length > 1000)
checa('pack lê intent_campaign pelo helper', pack.includes('const packIntentCampaign = intentCampaignFrom(req)'))
const metaIni = pack.indexOf('metadata: {')
const metaFim = pack.indexOf('},', metaIni)
const packMeta = metaIni >= 0 ? pack.slice(metaIni, metaFim) : ''
checa('pack: metadata da sessão grava intent_campaign SÓ quando presente (spread condicional)', packMeta.includes("...(packIntentCampaign ? { intent_campaign: packIntentCampaign } : {})"))
checa('pack: metadata mantém supabase_user_id / pack: starter10 / pack_credits', packMeta.includes('supabase_user_id: user.id') && packMeta.includes("pack: 'starter10'") && packMeta.includes('pack_credits: String(STARTER_PACK.credits)'))
checa('pack: checkout_attempted/started carregam intent_campaign via skuContext', pack.includes('if (packIntentCampaign) skuContext.intent_campaign = packIntentCampaign'))
checa("pack: ?return=studio → /studio/create?resume=wall_v1&pack=starter&session_id={CHECKOUT_SESSION_ID}", pack.includes("returnTo === 'studio'") && pack.includes('`${appUrl}/studio/create?resume=wall_v1&pack=starter&session_id={CHECKOUT_SESSION_ID}`'))
checa("pack: ramo 'wm' intacto (/generate?wm_unlock=1)", pack.includes("returnTo === 'wm'") && pack.includes('`${appUrl}/generate?wm_unlock=1&session_id={CHECKOUT_SESSION_ID}`'))
checa('pack: padrão continua /checkout/success?...&pack=starter', pack.includes('`${appUrl}/checkout/success?success=true&pack=starter&currency=${currency}&amount=${unitAmount}&session_id={CHECKOUT_SESSION_ID}`'))
const ternIni = pack.indexOf('const packSuccessUrl =')
const tern = pack.slice(ternIni, pack.indexOf('const packIntentCampaign', ternIni))
checa("pack: a decisão de success_url é o ternário wm → studio → padrão (ordem lida no código)", tern.indexOf("'wm'") < tern.indexOf("'studio'") && tern.indexOf("'studio'") < tern.indexOf('/checkout/success'))

// ── S2: webhook ──────────────────────────────────────────────────────────────
console.log('== S2: app/api/stripe/webhook/route.ts ==')
const wh = rd('app/api/stripe/webhook/route.ts')
checa("importa dfyPaymentLinkIds/dfyTierForLink/DFY_ACCEPTED_AMOUNTS_USD_MINOR de '@/lib/growth/dfyOffer' (mesmos números que o cartão mostra)", wh.includes("import { DFY_ACCEPTED_AMOUNTS_USD_MINOR, dfyPaymentLinkIds, dfyTierForLink, type DfyTier } from '@/lib/growth/dfyOffer'"))
const rpsIni = wh.indexOf('async function recordPaymentSuccess(')
const rps = wh.slice(rpsIni, wh.indexOf('\n}\n', rpsIni))
checa('payment_success.metadata ganha kind (session.metadata.kind ?? null)', rps.includes("kind: dfyOrder ? 'dfy' : (session.metadata?.kind ?? null)") && rps.includes('dfy_tier: dfyTier,'))
checa('payment_success.metadata ganha payment_link (string ou id, ou null)', /payment_link: typeof session\.payment_link === 'string'\s*\?\s*session\.payment_link\s*:\s*session\.payment_link\?\.id \?\? null/.test(rps))
checa('payment_success.metadata segue com amount_total e currency', rps.includes('amount_total: session.amount_total') && rps.includes('currency: session.currency'))
// KINEO-EMPRESAS-DFY-PLINK-2026-09-24 — o link existe (Cowork, 23/09) e a conta tem Adaptive Pricing: a chave primeira
// do reconhecimento é o id do Payment Link; kind=dfy e valor exato ficam como segunda e terceira.
checa('isDfyOrderSession: 1º id do link (degraus + legado), 2º kind===dfy, 3º valor aceito em usd, sem metadata.pack e SÓ em sessão de Payment Link', /function isDfyOrderSession\(session: Stripe\.Checkout\.Session\): boolean \{[\s\S]{0,260}if \(dfyPaymentLinkIds\(\)\.includes\(sessionPaymentLinkId\(session\) \?\? ''\)\) return true\s*if \(session\.metadata\?\.kind === 'dfy'\) return true[\s\S]{0,420}return \(\s*sessionPaymentLinkId\(session\) !== null &&\s*DFY_ACCEPTED_AMOUNTS_USD_MINOR\.includes\(session\.amount_total \?\? -1\) &&\s*\(session\.currency \?\? ''\)\.toLowerCase\(\) === 'usd' &&\s*!\(session\.metadata\?\.pack \?\? ''\)\.trim\(\)\s*\)/.test(wh))
checa('webhook não redigita plink nenhum (ids vêm do módulo puro) e grava o degrau no pedido pelo helper único', !/plink_[A-Za-z0-9]{10,}/.test(wh) && /tier: dfySessionTier\(session\),/.test(wh) && /function dfySessionTier\(session: Pick<Stripe\.Checkout\.Session, 'metadata' \| 'payment_link'>\): DfyTier \| null/.test(wh) && /if \(m === 'express' \|\| m === 'pro'\) return m\n  return dfyTierForLink\(sessionPaymentLinkId\(session\)\)/.test(wh))
// ── KINEO-EMPRESAS-COCKPIT-2026-09-24 — os 4 furos de servidor que o cético do workflow achou depois de LIGAR ──
checa('payment_success de pedido Empresas NÃO leva tier (colidia com o tier "pro" da assinatura); leva kind=dfy e dfy_tier', /const dfyOrder = session\.mode === 'payment' && isDfyOrderSession\(session\)/.test(wh) && /const dfyTier = dfyOrder \? dfySessionTier\(session\) : null/.test(wh) && /tier: dfyOrder \? null : \(session\.metadata\?\.tier \?\? null\),/.test(wh) && /kind: dfyOrder \? 'dfy' : \(session\.metadata\?\.kind \?\? null\),\n\s+dfy_tier: dfyTier,/.test(wh))
checa('funil e isNewSubscriberEvent excluem kind=dfy (pedido Empresas é dinheiro, não assinante)', /typeof metadata\.tier === 'string' && !metadata\.pack && metadata\.kind !== 'dfy'\)/.test(rd('app/api/admin/funnel/route.ts')) && /if \(metadata\?\.kind === 'dfy'\) return false/.test(rd('app/api/admin/_shared/mrr.ts')))
checa('recordAsyncCheckoutState (sessão unpaid de meio lento) usa sessionOwnerUuid — nunca o client_reference_id cru', /const userId = sessionOwnerUuid\(session\)\n  const sessionRef = stripeCheckoutSessionReference\(session\.id\)/.test(wh) && !/const userId = session\.metadata\?\.supabase_user_id \?\? session\.client_reference_id \?\? null\n  const sessionRef/.test(wh))
checa('evento duplicado: pedido Empresas retoma em vez de sair como duplicate:true', /duplicateSession\.mode !== 'subscription' && !duplicateSafeObservation && !isDfyOrderSession\(duplicateSession\)\)\) \{/.test(wh))
checa('sessionPaymentLinkId aceita string e objeto expandido', /function sessionPaymentLinkId\([^)]*\): string \| null \{\s*const link = session\.payment_link\s*if \(typeof link === 'string'\) return link\s*return link && typeof link === 'object' && typeof link\.id === 'string' \? link\.id : null/.test(wh))
checa('ids de link: legado plink_… presente; degrau só entra quando tiver linkId; dfyTierForLink resolve o degrau', (() => { const ids = dfy.dfyPaymentLinkIds(); const T = { express: { ...dfy.DFY_TIERS.express, linkId: 'plink_e1234567890' }, pro: { ...dfy.DFY_TIERS.pro, linkId: 'plink_p1234567890' } }; return ids.every((i) => /^plink_[A-Za-z0-9]{10,}$/.test(i)) && ids.includes('plink_1UJ23XIah5dxzSBfyfKlmOGV') && dfy.dfyPaymentLinkIds(T).length === 3 && dfy.dfyTierForLink('plink_p1234567890', T) === 'pro' && dfy.dfyTierForLink('plink_1UJ23XIah5dxzSBfyfKlmOGV', T) === null })())
checa('dfyPaymentLink com URL real leva client_reference_id e prefilled_email', (() => { const u = dfy.dfyPaymentLink({ tier: 'pro', userId: '0b1f0b1f-0000-4000-8000-000000000001', email: 'x@y.com', source: 't', url: 'https://buy.stripe.com/real' }); return typeof u === 'string' && u.startsWith('https://buy.stripe.com/real?') && u.includes('client_reference_id=0b1f0b1f-0000-4000-8000-000000000001') && u.includes('prefilled_email=x%40y.com') })())
const pathAIni = wh.indexOf("if (session.mode === 'payment') {")
const pathA = wh.slice(pathAIni, pathAIni + 6000)
const idxDfy = pathA.indexOf('if (isDfyOrderSession(session)) {')
const idxUser = pathA.indexOf('const userId = session.metadata?.supabase_user_id ?? session.client_reference_id')
checa('Path A: o ramo DFY vem ANTES da checagem de userId (quem paga pelo link pode não ter client_reference_id)', idxDfy >= 0 && idxUser > idxDfy)
const ramo = idxDfy >= 0 ? pathA.slice(idxDfy, pathA.indexOf('}', idxDfy) + 1) : ''
checa('Path A: ramo DFY = recordDfyOrderPaid + break (nada de crédito, plano, has_paid, guard)', /await recordDfyOrderPaid\(supabase, event\.id, session\)\s*break/.test(ramo) && !/entitlementPending|video_credits|has_paid|stripe_events/.test(ramo))
const rdoIni = wh.indexOf('async function recordDfyOrderPaid(')
const rdo = wh.slice(rdoIni, wh.indexOf('\n}\n', rdoIni))
checa('recordDfyOrderPaid localizado e inteiro dentro de try/catch (nunca lança para a Stripe)', rdo.length > 500 && /\): Promise<void> \{\s*try \{/.test(rdo) && /\} catch \(err\) \{\s*console\.error\('\[stripe webhook\] dfy_order_paid threw:'/.test(rdo))
checa("dfy_order_paid: dedupe por name + contains metadata.stripe_session_id (padrão do payment_success)", rdo.includes(".eq('name', 'dfy_order_paid')") && rdo.includes(".contains('metadata', { stripe_session_id: session.id })"))
checa('dfy_order_paid: id determinístico a partir de session.id', rdo.includes("update(`dfy_order_paid:${session.id}`)"))
// KINEO-DFY-UUID-2026-09-23 — client_reference_id é livre na URL do Payment Link; events.user_id é uuid.
// Valor fora do formato dava 22P02 (não 23503) e o pedido PAGO morria num console.error.
const ownerFn = wh.slice(wh.indexOf('function sessionOwnerUuid('), wh.indexOf('\n}\n', wh.indexOf('function sessionOwnerUuid(')))
checa('sessionOwnerUuid: só supabase_user_id/client_reference_id que PASSAM no formato uuid viram dono; o resto é null', /const SESSION_OWNER_UUID = \/\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}\$\/i/.test(wh) && /\[session\.metadata\?\.supabase_user_id, session\.client_reference_id\]\s*\.find\(\(v\): v is string => typeof v === 'string' && SESSION_OWNER_UUID\.test\(v\)\) \?\? null/.test(ownerFn))
checa('dfy_order_paid: user_id = sessionOwnerUuid(session) (nunca o client_reference_id cru)', rdo.includes('const userId = sessionOwnerUuid(session)') && !rdo.includes('session.client_reference_id ?? null'))
checa('payment_success: user_id = sessionOwnerUuid(session) (o mesmo filtro)', rps.includes('const userId = sessionOwnerUuid(session)') && !rps.includes('session.client_reference_id ?? null'))
checa('isOwnerRejection aceita 23503 E 22P02; os dois fallbacks (payment_success e dfy_order_paid) usam a função', /function isOwnerRejection\(code: string \| null \| undefined\): boolean \{\s*return code === '23503' \|\| code === '22P02'/.test(wh) && rps.includes('if (userId && isOwnerRejection(error.code))') && rdo.includes('if (userId && isOwnerRejection(error.code))'))
checa('dfy_order_paid: metadata pequena com o que a operação manual precisa (e-mail, nome, custom_fields, payment_link, kind dfy)', ['customer_email: session.customer_details?.email ?? null', 'customer_name: session.customer_details?.name ?? null', 'custom_fields: (session.custom_fields ?? []).map(', "kind: 'dfy'", 'payment_link: paymentLink', "source: 'stripe_webhook'", 'stripe_session_id: session.id'].every((s) => rdo.includes(s)))
checa('dfy_order_paid: custom_fields lê text/dropdown/numeric e label.custom', rdo.includes('label: f.label?.custom ?? null') && rdo.includes('value: f.text?.value ?? f.dropdown?.value ?? (f.numeric?.value ?? null)'))
checa('dfy_order_paid: NÃO concede nada (sem profiles/video_credits/plan/has_paid no corpo)', !/video_credits|has_paid|\.from\('profiles'\)|plan:/.test(rdo))
checa('dfy_order_paid: dono rejeitado (isOwnerRejection: 23503 ou 22P02) regrava sem user_id; 23505 é sucesso', rdo.includes('isOwnerRejection(error.code)') && rdo.includes("error.code === '23505'"))
// 10000 não colide com SKU nenhum: todo valor USD declarado em checkoutPricing e todo legado do webhook.
const cp = rd('lib/checkoutPricing.ts')
const usdAmounts = [...cp.matchAll(/\b(?:usd|usdMinor)\s*:\s*(\d+)/g)].map((m) => Number(m[1]))
const amb = ((cp.match(/AMBIGUOUS_ONE_TIME_USD_AMOUNTS[^\n]*new Set<number>\(\[([^\]]*)\]\)/) || [])[1] || '').split(',').map((s) => Number(s.trim())).filter(Number.isFinite)
const legados = [...wh.matchAll(/amount === (\d+)\)/g)].map((m) => Number(m[1]))
checa(`nenhum valor aceito (3500/7500/10000) está em AMBIGUOUS_ONE_TIME_USD_AMOUNTS ({${amb}})`, amb.length >= 1 && dfy.DFY_ACCEPTED_AMOUNTS_USD_MINOR.every((v) => !amb.includes(v)))
checa('3500/7500 colidem com bulk20/bulk50 de propósito documentado: por isso a 3ª regra só vale para sessão de Payment Link (a casa nunca cria sessão com payment_link) e sem metadata.pack', /sessionPaymentLinkId\(session\) !== null &&\s*DFY_ACCEPTED_AMOUNTS_USD_MINOR\.includes\(session\.amount_total \?\? -1\)/.test(wh) && usdAmounts.includes(3500) && usdAmounts.includes(7500) && !usdAmounts.includes(10000) && legados.length >= 2 && dfy.DFY_ACCEPTED_AMOUNTS_USD_MINOR.every((v) => !legados.includes(v)))
checa('o comentário do webhook registra a prova de não colisão (9900, 490/290, top-ups, bulk, anuais, legados)', /AMBIGUOUS_ONE_TIME_USD_AMOUNTS = \{9900\}/.test(wh) && /Nenhum é 10000/.test(wh))

// ── S3: padrão mensal ────────────────────────────────────────────────────────
console.log('== S3: lib/growth/pricingPlanChoiceAttribution.ts ==')
const ppc = rd('lib/growth/pricingPlanChoiceAttribution.ts')
const P = roda(ppc)
checa("padrão sem parâmetro é 'monthly' (fundador 23/09)", P.pricingBillingHandoff({}).initialBilling === 'monthly')
checa("?billing=annual explícito continua abrindo no anual", P.pricingBillingHandoff({ billing: 'annual' }).initialBilling === 'annual')
checa("promo mensal vence o pedido de anual", P.pricingBillingHandoff({ billing: 'annual', promo: 'COMEBACK50' }).initialBilling === 'monthly')
checa("no código: `requestedBilling ?? 'monthly'` e nenhum `?? 'annual'`", ppc.includes("requestedBilling ?? 'monthly'") && !ppc.includes("?? 'annual'"))
checa('o motivo está no arquivo (anual concede por fatura 1×/ano; 0 vendas anuais)', /KINEO-PADRAO-MENSAL-2026-09-23/.test(ppc) && /0 vendas/.test(ppc) && /por FATURA/.test(ppc))

// ── S4: fatos que a IA lê ────────────────────────────────────────────────────
console.log('== S4: kineoFacts / llms.txt / openapi / models-pricing / pricing ==')
const kf = rd('lib/kineoFacts.ts')
checa("OFFER_EFFECTIVE_ISO = '2026-09-17' e HUMAN = 'September 17, 2026' (trial 10cr em 16/09 + cota semanal em 17/09)", kf.includes("const OFFER_EFFECTIVE_ISO = '2026-09-17'") && kf.includes("const OFFER_EFFECTIVE_HUMAN = 'September 17, 2026'") && !kf.includes("OFFER_EFFECTIVE_ISO = '2026-08-07'"))
checa('a fonte da data nova está no comentário (KINEO-TRIAL-10 e KINEO-COTA-SEMANAL)', /KINEO-TRIAL-10-\s*2026-09-16/.test(kf) && /KINEO-COTA-SEMANAL-2026-09-17/.test(kf))
const k3Ini = kf.indexOf("name: 'Kling 3',")
const k3 = kf.slice(k3Ini, kf.indexOf('},', k3Ini))
checa("Kling 3 'what' NÃO tem mais 'One fits each month on the Studio plan.' digitado; usa studioFitsPerMonthSentence('cinematic_hollywood')", !k3.includes("One fits each month on the Studio plan.'") && k3.includes("${studioFitsPerMonthSentence('cinematic_hollywood')}"))
checa('studioFitsPerMonthSentence divide TIER_CREDITS.pro por creditsPerReferenceVideo e faz plural', /function studioFitsPerMonthSentence\([\s\S]*?Math\.floor\(TIER_CREDITS\.pro \/ creditsPerReferenceVideo\(quality\)\)[\s\S]*?if \(fits === 1\) return 'One fits each month on the Studio plan\.'[\s\S]*?fit each month on the Studio plan\./.test(kf))
// Conta real: TIER_CREDITS.pro e o custo do Kling 3 lidos do código, para o guardião saber o plural esperado.
const tcIni = cp.indexOf('export const TIER_CREDITS')
const proGrant = Number((cp.slice(tcIni, tcIni + 4000).match(/^\s*pro:\s*(\d+)/m) || [])[1])
checa(`TIER_CREDITS.pro lido (${proGrant}) é finito e ≥ 150 (senão nem um Kling 3 cabe e a frase tem de dizer isso)`, Number.isFinite(proGrant) && proGrant >= 150)
checa("free tier: nenhuma frase diz 'Fast video per month' / 'free tier is … per month' digitado", !/Fast video per month/.test(kf) && !/free tier is[^\n]*per month/.test(kf))
checa('free tier: a unidade vem de freeWindowLabel(FREE_OFFER.windowMs)', kf.includes('${freeWindowLabel(FREE_OFFER.windowMs)}'))
const fwl = (kf.match(/function freeWindowLabel\(windowMs: number\): string \{([\s\S]*?)\n\}/) || [])[1]
const freeWindowLabel = fwl ? new Function('windowMs', fwl) : null
const DIA = 24 * 60 * 60 * 1000
checa("freeWindowLabel: 7 dias → 'per week' · 1 dia → 'every 24 hours' · 30 dias → 'per month' · 10 dias → 'every 10 days'", Boolean(freeWindowLabel) && freeWindowLabel(7 * DIA) === 'per week' && freeWindowLabel(DIA) === 'every 24 hours' && freeWindowLabel(30 * DIA) === 'per month' && freeWindowLabel(10 * DIA) === 'every 10 days')
const fto = rd('lib/freeTierOffer.ts')
checa('a janela ON de freeTierOffer é FREE_FAST_WEEKLY_WINDOW_MS = 7 dias (o que faz a frase sair "per week")', /FREE_FAST_WEEKLY_WINDOW_MS = 7 \* DAY_MS/.test(fto) && /windowMs: FREE_FAST_WEEKLY_WINDOW_MS/.test(fto))

const llms = rd('app/llms.txt/route.ts')
checa("llms: preço do Starter formatado (formatCheckoutMoney), nunca `TIER_PRICES.starter.usd / 100`", llms.includes("${formatCheckoutMoney('usd', TIER_PRICES.starter.usd)}/month") && !llms.includes('.usd / 100'))
checa("llms: veredito do one-off é honesto (não para conta nova; planos a partir do Starter; top-ups para assinantes)", llms.includes('"One-off video without a subscription" → not for new accounts today') && llms.includes('one-time top-up credit packs are') && !llms.includes('video unlock for $4.90, no plan required'))
checa('llms: o preço do unlock regional sai de packPriceLabel, não digitado', llms.includes("${packPriceLabel('usd')} single-video unlock") && !/\(The \$4\.90/.test(llms))
checa('llms: Sora sem contagem regressiva (rota force-static congelava) — texto estático com as duas datas', !llms.includes('Date.now()') && !llms.includes('days away') && llms.includes('the app closed on') && llms.includes('2026-04-26') && llms.includes('2026-09-24'))
checa('llms: a página nova Seedance vs Veo vs Kling está listada nas comparações', llms.includes('[Seedance vs Veo vs Kling for Shorts — measured on real renders](${BASE}/seedance-vs-veo-vs-kling): what each engine delivers, median length and cost per film, read from the production database.'))
checa("llms: o único 'per month' restante do free tier não existe (planos mensais continuam 'per billing month')", !/free tier[^\n]*per month/i.test(llms))

const oaRaw = rd('public/gpt/openapi.json')
let oa = null
try { oa = JSON.parse(oaRaw) } catch {}
checa('openapi.json continua JSON válido', Boolean(oa))
checa("openapi info.version = 1.2.2", oa?.info?.version === '1.2.2')
const oaStrings = []
;(function walk(v) { if (typeof v === 'string') oaStrings.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk) })(oa)
const trialCap = num(rd('lib/reverseTrial.ts'), 'TRIAL_CREDIT_CAP')
const trialMentions = oaStrings.flatMap((s) => [...s.matchAll(/(\d+)-credit trial/g)].map((m) => Number(m[1])))
checa(`openapi: nenhum "25-credit"; todo "N-credit trial" (${[...new Set(trialMentions)]}) === TRIAL_CREDIT_CAP (${trialCap})`, !oaRaw.includes('25-credit') && trialMentions.length >= 3 && trialMentions.every((n) => n === trialCap))
checa('openapi: nenhuma description promete "first film is free" / "free film" / "fits the free trial"', !oaStrings.some((s) => /first film (is )?free|\bfree film\b|fits? the free trial/i.test(s)))
const d200 = oa?.paths?.['/api/gpt/handoff']?.post?.responses?.['200']?.description ?? ''
checa('openapi 200: o trial cobre o `fast`; Seedance e motores generativos = plano pago (Starter)', /`fast`/.test(d200) && /seedance/.test(d200) && /paid plan/.test(d200) && /Starter/.test(d200))
// O requestBody é um $ref para components.schemas.HandoffRequest.
const engineHint = oa?.components?.schemas?.HandoffRequest?.properties?.engineHint?.description ?? ''
checa('openapi engineHint: seedance descrito como plano pago; fast como o único que o trial cobre', /`seedance` \(Seedance 1\.5[^)]*paid plans/.test(engineHint) && /the only engine the no-card trial covers/.test(engineHint))
checa('openapi engineHint: o custo do Kling 3 continua citado (150 credits at 60s — trava J8 do gpt-handoff)', /150 credits at 60s/.test(engineHint))
// KINEO-PRECO-NO-OPENAPI-2026-09-23 — as descriptions novas dizem "Starter,
// US$9.90/month" (200 e durationSec). Description de OpenAPI é INSTRUÇÃO para o
// GPT da loja, não doc (memória: a regra vive em vários arquivos); um literal
// certo hoje mente na primeira mudança de preço. Amarra TODO `US$N/month` do
// schema ao TIER_PRICES.starter.usd real, lido de lib/checkoutPricing.ts, e
// proíbe qualquer outro cifrão-com-dígito no arquivo (forma não amarrada).
const tpIni = cp.indexOf('export const TIER_PRICES')
const starterUsd = Number((cp.slice(tpIni, tpIni + 600).match(/starter:\s*\{\s*usd:\s*(\d+)/) || [])[1])
const oaPrices = [...oaRaw.matchAll(/US\$(\d+(?:\.\d{1,2})?)\/month/g)].map((m) => m[1])
checa(`openapi: todo "US$N/month" do schema (${[...new Set(oaPrices)].join(',')}) === TIER_PRICES.starter.usd/100 (${Number.isFinite(starterUsd) ? (starterUsd / 100).toFixed(2) : 'NaN'})`, Number.isFinite(starterUsd) && oaPrices.length >= 1 && oaPrices.every((p) => Number(p) === starterUsd / 100))
checa('openapi: nenhum outro cifrão-com-dígito fora da forma amarrada US$N/month', !/\$\s?\d/.test(oaRaw.replace(/US\$\d+(?:\.\d{1,2})?\/month/g, '')))

const mp = rd('app/models-pricing/page.tsx')
checa("models-pricing: 'The free trial gives 25 credits' morreu; interpola TRIAL_CREDITS_SHOWN (mesma constante do parágrafo acima)", !mp.includes('gives 25 credits') && mp.includes('The free trial gives ${TRIAL_CREDITS_SHOWN} credits.'))
const pr = rd('lib/pricing.ts')
const freeIni = pr.indexOf('free: {')
const freeBloco = pr.slice(freeIni, pr.indexOf('},', freeIni))
checa("pricing.ts: PLANS.free.credits = TRIAL_GRANT_CREDITS_COPY (não mais 3), importado de '@/lib/freeTierOffer'", freeBloco.includes('credits: TRIAL_GRANT_CREDITS_COPY') && !/credits: 3,/.test(freeBloco) && pr.includes("import { TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'"))
checa('pricing.ts → freeTierOffer não tem ciclo (freeTierOffer importa só credits/engineCost e entryPolicy, que não importam pricing)', !/from '(?:\.\/|@\/lib\/|\.\.\/)pricing'/.test(fto) && !/from '(?:\.\/|@\/lib\/|\.\.\/)pricing'/.test(rd('lib/credits/engineCost.ts')) && !/from '(?:\.\/|@\/lib\/|\.\.\/)pricing'/.test(rd('lib/entryPolicy.ts')))

// ── S5: origem honesta na página de intenção ─────────────────────────────────
console.log('== S5: app/ai-video-generator/for/[slug]/page.tsx ==')
const pg = rd('app/ai-video-generator/for/[slug]/page.tsx')
const shIni = pg.indexOf('function studioHref(')
const sh = pg.slice(shIni, pg.indexOf('\n}\n', shIni))
checa('studioHref: cadastro SEM utm_source e SEM utm_medium cravados', sh.length > 100 && !/utm_source\s*:/.test(sh) && !/utm_medium\s*:/.test(sh))
checa('studioHref: mantém utm_campaign, intent_campaign e redirect para o Studio', sh.includes('utm_campaign: campaign, intent_campaign: campaign, redirect: `/studio?${studio.toString()}`'))
checa('studioHref: o comentário confirma o caminho do first-touch (captureSourceOnce → referrer externo; acquisitionSource → host do referrer)', /captureSourceOnce/.test(sh) && /sanitizeAcquisitionReferrer\(document\.referrer\)/.test(sh) && /acquisitionSource/.test(sh))
const an = rd('lib/analytics.ts')
checa('lib/analytics.ts: sem utm, captureSourceOnce grava o referrer externo e não grava nada quando não há fonte (pouso posterior ainda vence)', an.includes('const ref = sanitizeAcquisitionReferrer(document.referrer, window.location.hostname)') && an.includes('if (Object.keys(src).length === 0) return'))
const as = rd('lib/acquisitionSource.ts')
checa('lib/acquisitionSource.ts: utm explícito vence; sem utm a origem sai do host do referrer', /const explicit = sanitizeAcquisitionUtmSource\(input\.utmSource\)/.test(as) && /return parsed \? \(sourceFromHost\(parsed\.hostname\) \?\? 'direct'\) : 'direct'/.test(as))
checa('o guardião do Projeto 1 exige que NÃO exista utm_source cravado (reancorado 23/09)', /!\/utm_source\\s\*:\/\.test\(pg\)/.test(rd('scripts/test-projeto-1-google-2026-09-17.mjs')))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  FAIL', f)
process.exit(falhas.length ? 1 : 0)
