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
  vm.runInNewContext(js, { exports: exp, require: req, console, Number, String, RegExp, Object, Array, Math, Date, JSON, process: { env: {} } })
  return exp
}
const offer = carrega('lib/ads/offer')
const ev = carrega('lib/ads/events')
const C = carrega('lib/ads/orderContract')

// ── 1. checkout ────────────────────────────────────────────────────────────────────────────
const co = rd('app/api/stripe/checkout/route.ts')
const builder = (co.match(/async function buildAdsPassAndRedirect[\s\S]*?\n\}\n/) || [''])[0]
checa('1a. o builder do passe existe e lê preço/créditos/nome do módulo único (nada digitado)', builder.length > 1000 && /const unitAmount = ADS_PASS_USD_MINOR/.test(builder) && /pack: ADS_PASS_ID,\n\s*pack_credits: String\(ADS_PASS_CREDITS\)/.test(builder) && !/1990|19\.90/.test(builder))
const iGate = builder.indexOf('if (!adsPassLive() && !isInternalEmail(user.email))')
const iSession = builder.indexOf('stripe.checkout.sessions.create')
const iAuth = builder.indexOf('supabase.auth.getUser()')
checa('1b. interruptor ANTES de qualquer sessão da Stripe e depois do login (interno passa para o canário)', iAuth > 0 && iGate > iAuth && iSession > iGate)
checa('1c. desligado = recusa visível (redirect com erro / 403), nunca sessão', /return isGet \? redirectError\('Studio Ads opens soon\.'\) : jsonError\('Studio Ads opens soon\.', 403\)/.test(builder))
checa('1d. moeda da casa: preço de lista em USD, sessão na moeda do país (settlementAmountMinor), idempotência por SKU/usuário/valor', /settlementAmountMinor\(unitAmount, chargeCurrency\)/.test(builder) && /oneTimeIdempotencyKey\(\{\n\s*sku: ADS_PASS_ID,/.test(builder))
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
checa('5i. só rascunho é editável', C.orderIsEditable('draft') === true && C.orderIsEditable('delivered') === false && C.orderIsEditable(undefined) === false)

// ── 6. rota de pedidos ───────────────────────────────────────────────────────────────────────
const rt = rd('app/api/ads/orders/route.ts')
const bloco = (nome) => (rt.match(new RegExp(`export async function ${nome}[\\s\\S]*?\\n\\}\\n`)) || [''])[0]
const post = bloco('POST'), pat = bloco('PATCH'), get = bloco('GET')
checa('6a. todo método exige login antes de usar a chave de serviço', [get, post, pat].every((b) => b.indexOf('await requireUser()') > -1 && b.indexOf('await requireUser()') < b.indexOf('loadAccess(')))
checa('6b. POST e PATCH recusam quem não tem acesso ANTES de escrever, gravando ads_access_denied', [post, pat].every((b) => b.indexOf("if (reason === 'none')") > -1 && b.indexOf("if (reason === 'none')") < b.indexOf('.from(\'ads_orders\')') && /name: 'ads_access_denied'/.test(b)))
checa('6c. leitura e escrita presas ao dono (eq user_id) e PATCH valida tudo no contrato antes do UPDATE', /\.eq\('user_id', user\.id\)/.test(get) && (pat.match(/\.eq\('user_id', user\.id\)/g) || []).length >= 2 && pat.indexOf('sanitizeOrderPatch(body, user.id, FOOTAGE_PUBLIC_PREFIX())') < pat.indexOf('.update(patch.value)'))
checa('6d. tabela ausente (migration não aplicada) = 503 "not ready", nunca 500 nem sucesso falso', /const isMissingTable = \(code: string \| undefined\) => code === '42P01' \|\| code === 'PGRST205'/.test(rt) && /if \(isMissingTable\([^)]*\)\) return notReady\(\)/.test(post))
checa('6e. coluna do passe ausente: decide sem o passe (pagante/interna seguem), nunca abre acesso por engano', /if \(withColumn\.error\.code === '42703'\) \{/.test(rt) && /return \{ admin, reason: 'none' as const, error: withColumn\.error \}/.test(rt))

// ── 7. nada disto toca a trava 8.2 ─────────────────────────────────────────────────────────────
const novos = [builder, rt, rd('lib/ads/orderContract.ts')]
checa('7. nenhuma peça nova importa lib/compose, lib/hollywood, lib/cinematic, lib/broll, generate-video-*, analyze-idea ou generate-script', !novos.some((s) => /from '@\/lib\/(compose|hollywood|cinematic|broll|lyriaMusic|narrationFit)|api\/(analyze-idea|generate-script|generate-video-)/.test(s)))

console.log(`test-ads-servidor-2026-09-25: ${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  FAIL ' + f)
process.exit(falhas.length ? 1 : 0)
