// KINEO-STUDIO-ADS-2026-09-25 — guardião do SERVIDOR do Studio Ads: compra do passe, concessão fail-closed, sink de
// eventos, contrato do pedido (executado com entradas reais e maliciosas) e a rota de pedidos.
// Decisões do fundador (24/09): passe US$19,90 + 60 cr, 365 d, preço global em dólar, desligado até a palavra dele.
// Estilo da casa: readFileSync + regex para rotas; módulos puros por transpile + vm; `checa(nome, condicao)`.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, condicao) => { if (condicao) ok++; else falhas.push(nome) }

// carregador mínimo de módulos puros com import relativo (./models, ./types)
const cache = {}
function carrega(rel) {
  const p = rel.endsWith('.ts') ? rel : rel + '.ts'
  if (cache[p]) return cache[p]
  const js = ts.transpileModule(rd(p), { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  cache[p] = exp
  const dir = p.split('/').slice(0, -1).join('/')
  const req = (spec) => {
    if (spec.startsWith('./')) return carrega(`${dir}/${spec.slice(2)}`)
    throw new Error('import não puro em ' + p + ': ' + spec)
  }
  vm.runInNewContext(js, { exports: exp, require: req, console, Number, String, RegExp, Object, Array, Math, Date, JSON, URL, process: { env: {} } })
  return exp
}
const offer = carrega('lib/ads/offer')
const ev = carrega('lib/ads/events')
const C = carrega('lib/ads/orderContract')

// ── 1. checkout ────────────────────────────────────────────────────────────────────────────
const co = rd('app/api/stripe/checkout/route.ts')
const builder = (co.match(/async function buildAdsPassAndRedirect[\s\S]*?\n\}\n/) || [''])[0]
checa('1a. o builder do passe existe e lê preço/créditos/nome do módulo único (nada digitado)', builder.length > 1000 && /const unitAmount = ADS_PASS_USD_MINOR/.test(builder) && /pack: ADS_PASS_ID,\n\s*pack_credits: String\(ADS_PASS_CREDITS\)/.test(builder) && !/1990|19\.90/.test(builder))
// Reancorado com motivo (24/09): interna = isAdsInternalEmail (lista exata), não o isInternalEmail de métrica com LIKE.
const iGate = builder.indexOf('if (!adsPassLive() && !isAdsInternalEmail(user.email))')
const iSession = builder.indexOf('stripe.checkout.sessions.create')
const iAuth = builder.indexOf('supabase.auth.getUser()')
checa('1b. interruptor ANTES de qualquer sessão da Stripe e depois do login (interno passa para o canário)', iAuth > 0 && iGate > iAuth && iSession > iGate)
checa('1c. desligado = recusa visível (redirect com erro / 403), nunca sessão', /return isGet \? redirectError\('Studio Ads opens soon\.'\) : jsonError\('Studio Ads opens soon\.', 403\)/.test(builder))
checa('1d. moeda da casa: preço de lista em USD, sessão na moeda do país (settlementAmountMinor), idempotência por SKU/usuário/valor', /settlementAmountMinor\(unitAmount, chargeCurrency\)/.test(builder) && /oneTimeIdempotencyKey\(\{\n\s*sku: ADS_PASS_ID,/.test(builder))
const iProbe = builder.indexOf(".from('profiles').select(ADS_ACCESS_COLUMN).limit(0)")
checa('1g. sonda da coluna do acesso ANTES da sessão: sem a migration o passe não cobra (503 "opens soon", motivo migration_missing)', iProbe > iGate && iSession > iProbe && /skuContext\.blocked = 'migration_missing'\n\s*return isGet \? redirectError\('Studio Ads opens soon\.'\) : jsonError\('Studio Ads opens soon\.', 503\)/.test(builder) && !/import \{ isInternalEmail \}/.test(co))
checa('1e. o despacho ?pack=ads_pass chama o builder antes do atacado', /if \(packParam === ADS_PASS_ID\) \{\n\s*return await buildAdsPassAndRedirect\(req, true\)\n\s*\}\n\s*if \(isBulkPackId\(packParam\)\)/.test(co))
checa('1f. ads_checkout_started é nome aceito pelo logger e só é gravado depois da sessão existir', /\| 'ads_checkout_started'/.test(co) && builder.indexOf("recordCheckoutEvent('ads_checkout_started'") > iSession)

// ── 2. webhook: acesso no MESMO UPDATE, fail-closed, evento depois ───────────────────────────
const wh = rd('app/api/stripe/webhook/route.ts')
checa('2a. o passe é reconhecido SÓ pela metadata.pack exata (sem fallback por valor)', /const isAdsPass = packMeta === ADS_PASS_ID/.test(wh) && !/amount === 1990/.test(wh))
const iSet = wh.indexOf('if (isAdsPass && adsUntilIso) profileUpdate[ADS_ACCESS_COLUMN] = adsUntilIso')
const iUpd = wh.indexOf('.update(profileUpdate)', iSet)
checa('2b. a coluna de acesso entra no MESMO objeto profileUpdate (créditos + has_paid) antes do UPDATE', iSet > 0 && iUpd > iSet && /const profileUpdate: Record<string, unknown> = \{ video_credits: next, has_paid: true \}/.test(wh))
const erroBloco = wh.slice(wh.indexOf('if (updateErr) {', iUpd), wh.indexOf('} else {', iUpd))
checa('2c. sem a coluna: log explícito e RetryableEntitlementError (Stripe reenvia; nunca cobra sem conceder)', /if \(isAdsPass && \(\(updateErr as \{ code\?: string \}\)\.code === '42703'/.test(erroBloco) && /throw new RetryableEntitlementError\(/.test(erroBloco))
const iGranted = wh.indexOf("name: 'ads_access_granted'")
checa('2d. ads_access_granted só depois do UPDATE confirmado (dentro do else do sucesso), com a data e os créditos', iGranted > wh.indexOf('entitlementConfirmed = true', iUpd) && /metadata: \{ stripe_session_id: session\.id, until: adsUntilIso, credits: creditsToAdd, reason: 'pass' \}/.test(wh))
checa('2e. nenhum outro pacote escreve a coluna (só o ramo isAdsPass)', (wh.match(/profileUpdate\[ADS_ACCESS_COLUMN\]/g) || []).length === 1)

// ── 3. invariante de preço espelha o módulo ─────────────────────────────────────────────────
const cp = rd('lib/checkoutPricing.ts')
const row = cp.match(/\{ id: 'pack:ads_pass', usdMinor: (\d+), credits: (\d+), advertisedQuality: 'cinematic_ai' \}/)
checa('3. a linha do passe no checkPricingInvariants tem os MESMOS números de lib/ads/offer.ts', !!row && Number(row[1]) === offer.ADS_PASS_USD_MINOR && Number(row[2]) === offer.ADS_PASS_CREDITS)

// ── 4. sink do navegador recusa os eventos que só o servidor sabe ──────────────────────────────
const sink = rd('app/api/events/route.ts')
const serverOnly = (sink.match(/const SERVER_ONLY_EVENTS = new Set\(\[([\s\S]*?)\]\)/) || ['', ''])[1]
checa('4. todo evento só-de-servidor do Studio Ads (+ ads_checkout_started) está em SERVER_ONLY_EVENTS', [...ev.ADS_SERVER_ONLY_EVENTS, 'ads_checkout_started'].every((n) => serverOnly.includes(`'${n}'`)))

// ── 5. contrato do pedido, executado ───────────────────────────────────────────────────────────
const U = '11111111-2222-4333-8444-555555555555'
const OUTRO = '99999999-2222-4333-8444-555555555555'
const PFX = 'https://x.supabase.co/storage/v1/object/public/user-footage'
const FID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const foto = (uid, extra = {}) => ({ footageId: FID, url: `${PFX}/${uid}/clip-1.png`, kind: 'image', ...extra })
const briefOk = { business: 'Casa Lima, Peruvian food in Lisbon', offer: 'Lunch menu 12 euros', cta: 'whatsapp', contact: '+351 912 345 678', language: 'pt', tone: 'warm', audience: 'office workers', extra: { deadline: 'this week' } }
checa('5a. brief válido passa e normaliza espaços', C.sanitizeBrief({ ...briefOk, business: '  Casa   Lima  ' }).ok === true && C.sanitizeBrief({ ...briefOk, business: '  Casa   Lima  ' }).value.business === 'Casa Lima')
checa('5b. brief sem negócio, sem contato ou com CTA inventado é recusado', C.sanitizeBrief({ ...briefOk, business: '' }).error === 'business_required' && C.sanitizeBrief({ ...briefOk, contact: '' }).error === 'contact_required' && C.sanitizeBrief({ ...briefOk, cta: 'hack' }).error === 'cta_invalid')
checa('5c. extra com chave estranha ou valor gigante é recusado', C.sanitizeBrief({ ...briefOk, extra: { 'bad key': 'x' } }).ok === false && C.sanitizeBrief({ ...briefOk, extra: { deadline: 'x'.repeat(301) } }).ok === false)
checa('5d. mídia da própria pasta passa', C.sanitizeMedia([foto(U, { isLogo: true }), foto(U)], U, PFX).ok === true)
checa('5e. mídia de OUTRA conta, com "..", ou de outro host é recusada', C.sanitizeMedia([foto(OUTRO)], U, PFX).error === 'media_not_owned' && C.sanitizeMedia([{ ...foto(U), url: `${PFX}/${U}/../${OUTRO}/x.png` }], U, PFX).error === 'media_not_owned' && C.sanitizeMedia([{ ...foto(U), url: `https://evil.com/user-footage/${U}/x.png` }], U, PFX).error === 'media_not_owned')
checa('5f. dois logos, logo em vídeo, id sem formato ou lista gigante são recusados', C.sanitizeMedia([foto(U, { isLogo: true }), foto(U, { isLogo: true })], U, PFX).error === 'logo_only_one' && C.sanitizeMedia([foto(U, { isLogo: true, kind: 'video' })], U, PFX).error === 'logo_must_be_image' && C.sanitizeMedia([{ ...foto(U), footageId: 'x' }], U, PFX).error === 'media_id_invalid' && C.sanitizeMedia(Array.from({ length: 14 }, () => foto(U)), U, PFX).error === 'media_too_many')
const patch = C.sanitizeOrderPatch({ template: 'historia_fundador', consent: true, seconds: 90, status: 'delivered', user_id: OUTRO }, U, PFX, new Date('2026-09-25T10:00:00Z'))
checa('5g. PATCH: a duração vem do modelo (60 no fundador), consentimento vira carimbo, campos de fora (status, user_id, seconds) são ignorados', patch.ok === true && patch.value.template === 'historia_fundador' && patch.value.seconds === 60 && patch.value.consent_at === '2026-09-25T10:00:00.000Z' && !('status' in patch.value) && !('user_id' in patch.value))
checa('5h. PATCH com modelo inexistente, consentimento falso ou vazio é recusado', C.sanitizeOrderPatch({ template: 'viral_hack' }, U, PFX).error === 'template_invalid' && C.sanitizeOrderPatch({ consent: 'yes' }, U, PFX).error === 'consent_must_be_true' && C.sanitizeOrderPatch({}, U, PFX).error === 'patch_empty')
checa('5j. "%2e%2e", "%2F", "%5c", barra invertida e host parecido são recusados (a revisão passou "%2e%2e" no startsWith)', [`${PFX}/${U}/%2e%2e/${OUTRO}/x.png`, `${PFX}/${U}/%2E%2E/${OUTRO}/x.png`, `${PFX}/${U}/..%2F${OUTRO}/x.png`, `${PFX}/${U}/x%5c..%5cy.png`, `${PFX}/${U}\\..\\${OUTRO}\\x.png`, `${PFX}.evil.com/${U}/x.png`].every((url) => C.sanitizeMedia([{ ...foto(U), url }], U, PFX).error === 'media_not_owned') && C.sanitizeMedia([{ ...foto(U), url: `${PFX}/${U}/foto%20da%20loja.png?t=1` }], U, PFX).ok === true)
const troca1 = C.sanitizeOrderPatch({ media: [foto(U)] }, U, PFX), troca2 = C.sanitizeOrderPatch({ media: [foto(U)], consent: true }, U, PFX, new Date('2026-09-25T10:00:00Z'))
checa('5k. trocar a mídia sem consentir de novo zera consent_at (o consentimento atesta AQUELA mídia); com consent vira carimbo', troca1.ok === true && troca1.value.consent_at === null && troca2.ok === true && troca2.value.consent_at === '2026-09-25T10:00:00.000Z' && C.sanitizeOrderPatch({ template: 'oferta_relampago' }, U, PFX).value.consent_at === undefined)
checa('5i. só rascunho é editável', C.orderIsEditable('draft') === true && C.orderIsEditable('delivered') === false && C.orderIsEditable(undefined) === false)

// ── 6. rota de pedidos ───────────────────────────────────────────────────────────────────────
const rt = rd('app/api/ads/orders/route.ts')
const bloco = (nome) => (rt.match(new RegExp(`export async function ${nome}[\\s\\S]*?\\n\\}\\n`)) || [''])[0]
const post = bloco('POST'), pat = bloco('PATCH'), get = bloco('GET')
// Reancorado com motivo (24/09): a rota usa o leitor compartilhado loadAdsAccess(user.id, user.email) — e-mail do auth.
checa('6a. todo método exige login antes de usar a chave de serviço, e o acesso é lido com o e-mail do auth', [get, post, pat].every((b) => b.indexOf('await requireUser()') > -1 && b.indexOf('await requireUser()') < b.indexOf('loadAdsAccess(user.id, user.email)')))
const gateFn = (rt.match(/async function gateOrDeny[\s\S]*?\n\}\n/) || [''])[0]
checa('6b. POST e PATCH passam pelo portão (acesso + interruptor) ANTES de escrever, gravando ads_access_denied', [post, pat].every((b) => b.indexOf('await gateOrDeny(user.id, reason,') > -1 && b.indexOf('await gateOrDeny(user.id, reason,') < b.indexOf(".from('ads_orders')")) && /const g = adsGate\(reason\)\n\s*if \(g === 'ok'\) return null/.test(gateFn) && /name: 'ads_access_denied'/.test(gateFn) && /g === 'closed'\n\s*\? NextResponse\.json\(\{ error: 'Studio Ads opens soon\.', reason: 'closed' \}, \{ status: 403 \}\)/.test(gateFn))
checa('6c. leitura e escrita presas ao dono (eq user_id) e PATCH valida tudo no contrato antes do UPDATE', /\.eq\('user_id', user\.id\)/.test(get) && (pat.match(/\.eq\('user_id', user\.id\)/g) || []).length >= 2 && pat.indexOf('sanitizeOrderPatch(body, user.id, FOOTAGE_PUBLIC_PREFIX())') < pat.indexOf('.update(patch.value)'))
const sa = rd('lib/ads/serverAccess.ts')
checa('6d. tabela ausente (migration não aplicada) = 503 "not ready", nunca 500 nem sucesso falso', /export const isMissingAdsTable = \(code: string \| undefined\) => code === '42P01' \|\| code === 'PGRST205'/.test(sa) && /if \(isMissingAdsTable\([^)]*\)\) return notReady\(\)/.test(post) && /if \(isMissingAdsTable\([^)]*\)\) return notReady\(\)/.test(pat))
checa('6e. coluna do passe ausente: decide sem o passe (assinante/interna seguem); outro erro de leitura = none', /if \(withColumn\.error\.code === '42703'\) \{/.test(sa) && /select\('id, plan'\)/.test(sa) && /return \{ admin, reason: 'none' \}\n\}/.test(sa))
checa('6f. interruptor nas rotas: desligado (NEXT_PUBLIC_ADS_PASS_LIVE) só a conta interna passa; sem acesso vem antes', /if \(reason === 'none'\) return 'no_access'\n\s*if \(!adsPassLive\(\) && reason !== 'internal'\) return 'closed'\n\s*return 'ok'/.test(sa))
const iFoot = pat.indexOf(".from('user_footage').select('id, url, kind').eq('user_id', user.id).in('id', ids)")
checa('6g. mídia conferida no banco: cada id é user_footage DESTA conta, do mesmo tipo, e a URL gravada é a do banco', iFoot > 0 && iFoot < pat.indexOf('.update(patch.value)') && /if \(!row \|\| row\.kind !== m\.kind\) return NextResponse\.json\(\{ error: 'media_not_owned' \}, \{ status: 400 \}\)/.test(pat) && /fixed\.push\(\{ \.\.\.m, url: row\.url \}\)/.test(pat))
checa('6h. consentimento sem mídia é recusado antes do UPDATE', pat.indexOf("'consent_needs_media'") > 0 && pat.indexOf("'consent_needs_media'") < pat.indexOf('.update(patch.value)'))
checa('6i. corpo que não é objeto vira 400 e toda exceção vira 500 genérico (nada de 500 cru do Next)', /if \(body !== null && !isObject\(body\)\) return NextResponse\.json\(\{ error: 'body_must_be_object' \}, \{ status: 400 \}\)/.test(post) && /if \(!isObject\(body\)\) return NextResponse\.json\(\{ error: 'body_must_be_object' \}, \{ status: 400 \}\)/.test(pat) && [get, post, pat].every((b) => /^export async function \w+\([^)]*\) \{\n  try \{/.test(b) && /\} catch \(e\) \{/.test(b)))
checa('6j. UPDATE só pega rascunho (corrida com a entrega vira 409, não sobrescrita)', /\.update\(patch\.value\)\.eq\('id', id\)\.eq\('user_id', user\.id\)\.eq\('status', 'draft'\)/.test(pat) && /if \(!data\) return NextResponse\.json\(\{ error: 'This order can no longer be edited\.' \}, \{ status: 409 \}\)/.test(pat))

// ── 8. roteiro do anúncio: o validador descarta versão que inventa fato ─────────────────────────
const SP = carrega('lib/ads/scriptPrompt')
const M = carrega('lib/ads/models')
const oferta = M.adsModelById('oferta_relampago') // 35 s, 4 batidas, 100-115 palavras
const briefR = { business: 'Casa Lima, Peruvian food in Lisbon', offer: 'Lunch menu 12 euros this week', cta: 'whatsapp', contact: '+351 912 345 678', language: 'en', tone: 'warm', audience: 'office workers nearby', extra: {} }
const enche = (n) => Array.from({ length: n }, (_, i) => ['fresh', 'bright', 'warm', 'real', 'simple', 'honest', 'good', 'slow'][i % 8]).join(' ')
const versao = (angle, beats) => ({ angle, beats })
const limpa = (angle) => versao(angle, [
  'Hungry at lunch and tired of the same sandwich? ' + enche(18) + '.',
  'Casa Lima brings Peruvian food to Lisbon, cooked the way it is at home. ' + enche(22) + '.',
  'This week the lunch menu is 12 euros, for office workers nearby. ' + enche(22) + '.',
  'Message us on WhatsApp at +351 912 345 678 and book your table. ' + enche(12) + '.',
])
const resposta = (versions) => JSON.stringify({ versions })
const tres = SP.parseAdsScriptOutput(resposta([limpa('question'), limpa('number'), limpa('result')]), oferta, briefR)
checa('8a. três versões limpas (números só do brief, contato exato no fim, faixa de palavras) passam', Array.isArray(tres) && tres.length === 3 && tres.every((v) => v.beats.length === 4 && v.words >= 90 && v.words <= 144))
const inventa = limpa('number'); inventa.beats[1] = 'More than 2,000 people already came to Casa Lima. ' + enche(22) + '.'
const semContato = limpa('result'); semContato.beats[3] = 'Come by and book your table today. ' + enche(15) + '.'
const colchete = limpa('question'); colchete.beats[0] = '[Hook] Hungry at lunch? ' + enche(20) + '.'
const curta = versao('number', limpa('number').beats.slice(0, 3))
const r = SP.parseAdsScriptOutput(resposta([limpa('question'), inventa, semContato]), oferta, briefR)
checa('8b. versão que inventa "2,000" e versão sem o contato são descartadas; a limpa fica', Array.isArray(r) && r.length === 1 && r[0].angle === 'question')
checa('8c. colchete, número de batidas errado ou ângulo repetido não passam; nada válido = null', SP.parseAdsScriptOutput(resposta([colchete, curta, limpa('question'), limpa('question')]), oferta, briefR).length === 1 && SP.parseAdsScriptOutput(resposta([colchete, curta]), oferta, briefR) === null && SP.parseAdsScriptOutput('not json', oferta, briefR) === null)
checa('8d. inventedNumbers pega número fora do brief e aceita os do brief (inclui telefone e preço)', SP.inventedNumbers('Only 12 euros, call +351 912 345 678', briefR).length === 0 && SP.inventedNumbers('Rated 4.9 by 300 people', briefR).length === 3)
const msgs = SP.buildAdsScriptMessages(oferta, briefR, 'English')
checa('8e. o prompt proíbe inventar fato, exige o contato exato e a faixa de palavras do modelo', /Never invent a price, number, rating, deadline/.test(msgs.system) && /must contain the contact exactly as written/.test(msgs.system) && msgs.system.includes('100 to 115 words') && msgs.user.includes('+351 912 345 678'))
const sr = rd('app/api/ads/script/route.ts')
checa('8f. rota do roteiro: login, acesso, dono/rascunho, teto diário ANTES do modelo, validador na saída, sem cobrar', sr.indexOf('supabase.auth.getUser()') < sr.indexOf('loadAdsAccess(user.id, user.email)') && sr.indexOf('const gate = adsGate(reason)') < sr.indexOf("from('ads_orders')") && /if \(gate !== 'ok'\) \{/.test(sr) && /\.eq\('id', orderId\)\.eq\('user_id', user\.id\)/.test(sr) && sr.indexOf('ADS_SCRIPT_DAILY_CAP') < sr.indexOf('openai.chat.completions.create') && /let raw = completion\.choices\[0\]\?\.message\?\.content \?\? ''\n\s*let versions = parseAdsScriptOutput\(raw, model, brief\.value\)/.test(sr) && (sr.match(/parseAdsScriptOutput\(raw, model, brief\.value\)/g) || []).length === 2 /* reancorado 24/09 noite: 2a tentativa com o motivo (teste da padaria), o validador roda nas duas */ && !/video_credits|creditCost/.test(sr))

// ── 7. nada disto toca a trava 8.2 ─────────────────────────────────────────────────────────────
const novos = [builder, rt, rd('lib/ads/orderContract.ts'), rd('lib/ads/scriptPrompt.ts'), rd('app/api/ads/script/route.ts'), rd('lib/ads/serverAccess.ts')]
checa('7. nenhuma peça nova importa lib/compose, lib/hollywood, lib/cinematic, lib/broll, generate-video-*, analyze-idea ou generate-script', !novos.some((s) => /from '@\/lib\/(compose|hollywood|cinematic|broll|lyriaMusic|narrationFit)|api\/(analyze-idea|generate-script|generate-video-)/.test(s)))

console.log(`test-ads-servidor-2026-09-25: ${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  FAIL ' + f)
process.exit(falhas.length ? 1 : 0)
