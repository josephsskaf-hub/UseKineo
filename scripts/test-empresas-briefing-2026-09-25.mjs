// KINEO-FLUXO-NOVO-2026-09-25 — guardião da peça C do fluxo novo (Empresas): briefing pós-pagamento, alerta ao
// fundador, /admin/ads e o fato forjável fechado.
//
// O QUE ELE PROVA, cada bloco amarrado à variável que decide (não a contagem de texto):
//  1. O reconhecimento do pedido Express/Pro mora num lugar só (lib/growth/dfySession.ts) e o webhook não tem cópia.
//  2. O contrato do briefing (lib/growth/dfyBrief.ts): limpeza, obrigatórios, pré-preenchimento pelos 3 campos REAIS
//     do Payment Link, id determinístico (reenviar sobrescreve), e-mail mascarado.
//  3. A rota /api/dfy/brief EXECUTADA com Stripe e banco falsos: quem autoriza é a Stripe (redirect antes do webhook
//     funciona), nada é escrito antes do retrieve, sessão não paga/não-Empresas não escreve, reenvio sobrescreve a
//     MESMA linha, o fundador é avisado só na 1ª vez, teto de edições.
//  4. lib/founderAlert.ts EXECUTADO: 1×/sessão por reserva determinística, teto de 3 s, nunca lança, envia mesmo
//     se o banco falhar, e a mensagem sai das fontes únicas (DFY_TIERS, URL do briefing).
//  5. O webhook: o ramo Empresas RODADO (dentro de um switch) — alerta só DEPOIS do pedido gravado; e o alerta do
//     passe só depois da concessão confirmada, só quando isAdsPass.
//  6. /api/events EXECUTADO: dfy_order_paid, dfy_brief_submitted e founder_order_alerted não entram pelo navegador
//     (controle: dfy_brief_viewed entra).
//  7. /admin/ads: portão antes do service role (rota executada), contas da fila e do prazo.
//  8. Página/formulário: noindex + no-referrer, o cliente só importa TIPOS do módulo com node:crypto, nada de
//     prometer "My footage" (402 para conta grátis), e nenhum preço digitado nos arquivos novos.
// Estilo da casa: readFileSync + typescript.transpileModule + vm; nenhum import '@/' em tempo de execução
// (o carregador abaixo resolve '@/' para arquivo e injeta dublês). `ok(cond, nome)`; sai com 1 se falhar.
import { readFileSync, existsSync } from 'node:fs'
import * as nodeCrypto from 'node:crypto'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let passou = 0
const falhas = []
const ok = (cond, nome) => { if (cond) passou++; else falhas.push(nome) }
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

// ── carregador: transpila TS → CommonJS e roda no vm; '@/x' e './x' viram arquivo; o resto vem de `stubs` ──────────
function resolveFile(rel) {
  for (const c of [rel, rel + '.ts', rel + '.tsx', rel + '/index.ts']) if (existsSync(join(RAIZ, c)) && /\.(ts|tsx)$/.test(c)) return c
  throw new Error('arquivo não encontrado: ' + rel)
}
function makeLoader(stubs, env, extraCtx = {}) {
  const cache = new Map()
  const load = (rel) => {
    const file = resolveFile(rel)
    if (cache.has(file)) return cache.get(file).exports
    const js = ts.transpileModule(rd(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React } }).outputText
    const mod = { exports: {} }
    cache.set(file, mod)
    const req = (s) => {
      if (Object.prototype.hasOwnProperty.call(stubs, s)) return stubs[s]
      if (s === 'node:crypto' || s === 'crypto') return nodeCrypto
      if (s.startsWith('@/')) return load(s.slice(2))
      if (s.startsWith('.')) return load(posix.join(posix.dirname(file), s))
      throw new Error('import inesperado: ' + s + ' em ' + file)
    }
    const ctx = {
      module: mod, exports: mod.exports, require: req, process: { env },
      console: { log() {}, warn() {}, error() {} },
      setTimeout, clearTimeout, URL, URLSearchParams, Date, Promise, JSON, Math, Object, Array, String, Number, RegExp, Error, Set, Map, Symbol, TextEncoder,
      ...extraCtx,
    }
    vm.runInNewContext(js, ctx, { filename: file })
    return mod.exports
  }
  return load
}
const nextServer = { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200, headers: init?.headers ?? {} }) } }
const ENV = { STRIPE_SECRET_KEY: 'sk_test_x', NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc' }

const puro = makeLoader({}, {})
const DFY = puro('lib/growth/dfyOffer')
const S = puro('lib/growth/dfySession')
const B = puro('lib/growth/dfyBrief')
const EXPRESS = DFY.DFY_TIERS.express
const PRO = DFY.DFY_TIERS.pro

// Os 3 campos REAIS do Payment Link (docs/COWORK-STRIPE-LINK-EMPRESAS-2026-09-23.md: rótulos do painel; a chave é
// gerada pela Stripe a partir do rótulo, por isso o pré-preenchimento lê rótulo E chave).
const CAMPOS_LINK = [
  { key: 'businessnamewhatyousell', label: { type: 'custom', custom: 'Business name + what you sell' }, type: 'text', optional: false, text: { value: 'Padaria Sol, sourdough bread in Recife' } },
  { key: 'lastframectaphonewhatsappurloraddress', label: { type: 'custom', custom: 'Last-frame CTA: phone, WhatsApp, URL or address' }, type: 'text', optional: false, text: { value: 'WhatsApp +55 81 90000-0000' } },
  { key: 'languagethefilmyouwant12lines', label: { type: 'custom', custom: 'Language + the film you want (1-2 lines)' }, type: 'text', optional: false, text: { value: 'Portuguese; fresh bread at 6 a.m., the oven and the queue' } },
]
const sessao = (extra = {}) => ({ id: 'cs_live_a1b2c3d4e5f6g7h8i9', object: 'checkout.session', mode: 'payment', status: 'complete', payment_status: 'paid', metadata: {}, client_reference_id: null, payment_link: EXPRESS.linkId, amount_total: 18990, currency: 'brl', customer_details: { email: 'dono@padaria.example', name: 'Dono da Padaria' }, customer_email: null, custom_fields: CAMPOS_LINK, ...extra })

// ── 1. o reconhecimento num lugar só ────────────────────────────────────────────────────────────────────────────
const wh = rd('app/api/stripe/webhook/route.ts')
ok(S.isDfyOrderSession(sessao()) === true && S.dfySessionTier(sessao()) === 'express', '1a. link Express (string), sem metadata e em BRL (Adaptive Pricing) → pedido Empresas, degrau express')
ok(S.isDfyOrderSession(sessao({ payment_link: { id: PRO.linkId, object: 'payment_link' } })) === true && S.dfySessionTier(sessao({ payment_link: { id: PRO.linkId } })) === 'pro', '1b. link Pro expandido {id} → degrau pro')
ok(S.isDfyOrderSession(sessao({ payment_link: null, metadata: { pack: 'bulk20' }, amount_total: EXPRESS.priceMinor, currency: 'usd' })) === false, '1c. sessão da casa com o MESMO valor do Express mas com metadata.pack e sem payment_link NÃO é pedido')
ok(S.isDfyOrderSession(sessao({ payment_link: 'plink_outroQualquer123', amount_total: EXPRESS.priceMinor, currency: 'usd' })) === true && S.isDfyOrderSession(sessao({ payment_link: 'plink_outroQualquer123', amount_total: EXPRESS.priceMinor + 1, currency: 'usd' })) === false, '1d. 3ª regra: link desconhecido só vale no valor aceito exato')
ok(S.isDfyOrderSession(sessao({ payment_link: DFY.DFY_LEGACY_PAYMENT_LINK_IDS[0] })) === true && S.dfySessionTier(sessao({ payment_link: DFY.DFY_LEGACY_PAYMENT_LINK_IDS[0] })) === null, '1e. link legado ainda é reconhecido, com degrau null')
ok(!/\nfunction (?:sessionPaymentLinkId|dfySessionTier|isDfyOrderSession)\(/.test(wh) && wh.includes("import { dfySessionTier, isDfyOrderSession } from '@/lib/growth/dfySession'"), '1f. o webhook importa a regra do módulo e não guarda cópia local')
const rotaBrief = rd('app/api/dfy/brief/route.ts')
ok(/import \{ dfySessionTier, isDfyOrderSession \} from '@\/lib\/growth\/dfySession'/.test(rotaBrief) && !/function isDfyOrderSession/.test(rotaBrief), '1g. a rota do briefing usa a MESMA regra (import, sem cópia)')

// ── 2. contrato do briefing ─────────────────────────────────────────────────────────────────────────────────────
const limpo = B.sanitizeBrief({ business: '  Padaria  ', goal: 'x'.repeat(5000), language: 'Português', cta: 'WhatsApp', intruso: 'drop table', links: ['https://drive.google.com/a', 'javascript:alert(1)', 'https://drive.google.com/a', 'ftp://x.y', ...Array.from({ length: 20 }, (_, i) => `https://ex.com/${i}`)] })
const maxGoal = B.DFY_BRIEF_FIELDS.find((f) => f.key === 'goal').max
ok(limpo.business === 'Padaria' && limpo.goal.length === maxGoal && !('intruso' in limpo), '2a. sanitizeBrief apara, corta no teto do campo e descarta chave desconhecida')
ok(limpo.links[0] === 'https://drive.google.com/a' && !limpo.links.some((l) => /javascript:|ftp:/.test(l)) && new Set(limpo.links).size === limpo.links.length && limpo.links.length === B.DFY_BRIEF_MAX_LINKS, '2b. links: só http(s), sem repetição, no máximo DFY_BRIEF_MAX_LINKS')
ok(JSON.stringify(B.missingBriefFields(B.sanitizeBrief({}))) === JSON.stringify(['business', 'goal', 'language', 'cta']) && B.missingBriefFields(limpo).length === 0, '2c. obrigatórios = negócio, objetivo, idioma e CTA (público, fatos e links são opcionais)')
const pre = B.prefillFromCustomFields(CAMPOS_LINK)
ok(pre.business === CAMPOS_LINK[0].text.value && pre.cta === CAMPOS_LINK[1].text.value && pre.goal === CAMPOS_LINK[2].text.value && pre.language === 'Portuguese', '2d. os 3 campos do Payment Link preenchem negócio, CTA, objetivo e idioma (1º trecho curto)')
ok(Object.keys(B.prefillFromCustomFields([{ key: 'x', label: { custom: 'Favorite color' }, text: { value: 'blue' } }])).length === 0 && Object.keys(B.prefillFromCustomFields(null)).length === 0, '2e. campo que não casa não inventa nada')
const id1 = B.briefEventId('cs_live_aaaaaaaaaaaa')
ok(id1 === B.briefEventId('cs_live_aaaaaaaaaaaa') && id1 !== B.briefEventId('cs_live_bbbbbbbbbbbb') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id1), '2f. id do briefing determinístico por sessão, formato uuid')
ok(B.maskEmail('dono@padaria.example') === 'do***@padaria.example' && B.maskEmail('x') === null && B.maskEmail(null) === null, '2g. e-mail mascarado')

// ── 3. a rota do briefing, executada ────────────────────────────────────────────────────────────────────────────
const seq = []
const stripeSessions = new Map()
const dbState = { rows: new Map(), readError: null, writeError: null }
const alertas = []
function fakeRouteDb() {
  return {
    from(table) {
      const filters = []
      const q = {}
      q.select = () => { seq.push(['select', table]); return q }
      q.eq = (c, v) => { filters.push([c, v]); seq.push(['eq', table, c, v]); return q }
      q.maybeSingle = async () => {
        const id = (filters.find((f) => f[0] === 'id') || [])[1]
        const row = dbState.rows.get(id)
        return { data: row ? { metadata: row.metadata } : null, error: dbState.readError }
      }
      q.upsert = async (row, opts) => { seq.push(['upsert', table, row, opts]); if (dbState.writeError) return { error: dbState.writeError }; dbState.rows.set(row.id, JSON.parse(JSON.stringify(row))); return { error: null } }
      q.insert = async (row) => { seq.push(['insert', table, row]); return { error: null } }
      return q
    },
  }
}
const loadRota = makeLoader({
  'next/server': nextServer,
  '@supabase/supabase-js': { createClient: () => fakeRouteDb() },
  '@/lib/stripe': { stripe: { checkout: { sessions: { retrieve: async (id, params, opts) => {
    seq.push(['retrieve', id, opts])
    const s = stripeSessions.get(id)
    if (s instanceof Error) throw s
    if (!s) { const e = new Error('No such checkout.session'); e.code = 'resource_missing'; throw e }
    return JSON.parse(JSON.stringify(s))
  } } } } },
  '@/lib/founderAlert': { alertFounderDfyBrief: async (x) => { seq.push(['alert']); alertas.push(x); return 'sent' } },
}, ENV)
const R = loadRota('app/api/dfy/brief/route')
const reqGet = (sid) => ({ nextUrl: new URL('https://www.usekineo.com/api/dfy/brief?session_id=' + encodeURIComponent(sid)) })
const reqPost = (body) => ({ text: async () => JSON.stringify(body) })
const reset = () => { seq.length = 0; alertas.length = 0 }
const BRIEF_OK = { business: 'Padaria Sol', goal: 'Fresh bread at 6 a.m.', language: 'Portuguese', cta: 'WhatsApp +55 81 90000-0000', links: ['https://drive.google.com/logo'] }

const SID = 'cs_live_a1b2c3d4e5f6g7h8i9'
stripeSessions.set(SID, sessao())
reset()
let r = await R.GET(reqGet('nao-e-sessao'))
ok(r.status === 400 && r.body.state === 'invalid' && !seq.some((s) => s[0] === 'retrieve'), '3a. session_id fora do formato → 400 sem chamar a Stripe')
reset()
r = await R.GET(reqGet(SID))
const retrieveCall = seq.find((s) => s[0] === 'retrieve')
ok(r.status === 200 && r.body.state === 'ready' && r.body.tier === 'express' && r.body.hours === EXPRESS.hours && r.body.revisions === EXPRESS.revisions && r.body.tier_name === EXPRESS.name, '3b. sessão paga, SEM dfy_order_paid no banco (redirect antes do webhook) → ready, com degrau/horas/revisões de DFY_TIERS')
ok(retrieveCall && retrieveCall[2]?.timeout === 5000 && retrieveCall[2]?.maxNetworkRetries === 0 && !seq.some((s) => s[0] === 'eq' && s[2] === 'name'), '3c. a autorização é o retrieve da Stripe (5 s, 0 retry); a rota nunca consulta events por nome (dfy_order_paid não autoriza)')
ok(r.body.email === 'do***@padaria.example' && r.body.prefill.business === CAMPOS_LINK[0].text.value && r.body.brief === null && r.body.edits_left === B.DFY_BRIEF_MAX_EDITS, '3d. e-mail mascarado, formulário pré-preenchido pelos campos do link')
ok(r.headers['Cache-Control']?.includes('no-store') && r.headers['Referrer-Policy'] === 'no-referrer' && /noindex/.test(r.headers['X-Robots-Tag'] ?? ''), '3e. resposta no-store, no-referrer e noindex (o session_id é a senha do pedido)')

const SID_PEND = 'cs_live_pendente00000001'
stripeSessions.set(SID_PEND, sessao({ id: SID_PEND, payment_status: 'unpaid' }))
reset()
r = await R.GET(reqGet(SID_PEND))
const rPostPend = await R.POST(reqPost({ session_id: SID_PEND, brief: BRIEF_OK }))
ok(r.body.state === 'pending' && rPostPend.status === 409 && !seq.some((s) => s[0] === 'upsert' || s[0] === 'select'), '3f. meio lento (complete + unpaid) → pending; POST recusado sem tocar no banco')
const SID_CASA = 'cs_live_pacotedacasa00001'
stripeSessions.set(SID_CASA, sessao({ id: SID_CASA, payment_link: null, metadata: { pack: 'starter10' }, amount_total: 490, currency: 'usd' }))
reset()
r = await R.GET(reqGet(SID_CASA))
const rPostCasa = await R.POST(reqPost({ session_id: SID_CASA, brief: BRIEF_OK }))
ok(r.status === 404 && r.body.state === 'not_found' && rPostCasa.status === 404 && !seq.some((s) => s[0] === 'upsert'), '3g. sessão paga que NÃO é pedido Empresas responde igual a inexistente e não escreve')
reset()
r = await R.GET(reqGet('cs_live_naoexiste000000001'))
ok(r.status === 404 && r.body.state === 'not_found', '3h. sessão inexistente na Stripe → 404')
const SID_ERR = 'cs_live_stripefora00000001'
stripeSessions.set(SID_ERR, Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }))
r = await R.GET(reqGet(SID_ERR))
ok(r.status === 503 && r.body.state === 'unavailable', '3i. Stripe fora → 503 unavailable (tente de novo), nunca "pago"')

reset()
r = await R.POST(reqPost({ session_id: SID, brief: { business: 'x' } }))
ok(r.status === 400 && r.body.state === 'incomplete' && r.body.missing.includes('cta') && !seq.some((s) => s[0] === 'upsert'), '3j. briefing sem os obrigatórios → 400 incomplete, nada gravado')
reset()
r = await R.POST(reqPost({ session_id: SID, brief: { ...BRIEF_OK, extra: 'x' } }))
const up1 = seq.find((s) => s[0] === 'upsert')
const iRetrieve = seq.findIndex((s) => s[0] === 'retrieve')
const iPrimeiroBanco = seq.findIndex((s) => s[0] === 'select' || s[0] === 'upsert' || s[0] === 'insert')
ok(r.status === 200 && r.body.state === 'saved' && r.body.first === true, '3k. 1º envio → saved, first')
ok(iRetrieve >= 0 && iPrimeiroBanco > iRetrieve, `3l. a Stripe é consultada ANTES de qualquer leitura/escrita no banco (retrieve ${iRetrieve}, banco ${iPrimeiroBanco})`)
ok(up1 && up1[2].id === B.briefEventId(SID) && up1[2].name === 'dfy_brief_submitted' && up1[3]?.onConflict === 'id' && up1[2].metadata.stripe_session_id === SID && up1[2].metadata.tier === 'express' && !('extra' in up1[2].metadata.brief) && up1[2].metadata.edits === 1, '3m. grava dfy_brief_submitted com id determinístico, upsert por id, sessão/degrau e briefing limpo')
ok(alertas.length === 1 && alertas[0].stripeSessionId === SID && alertas[0].tier === 'express' && seq.findIndex((s) => s[0] === 'alert') > seq.findIndex((s) => s[0] === 'upsert'), '3n. o fundador é avisado UMA vez, depois de o briefing gravado')
const primeiro = dbState.rows.get(B.briefEventId(SID)).metadata.first_submitted_at
reset()
r = await R.POST(reqPost({ session_id: SID, brief: { ...BRIEF_OK, goal: 'Nova versão' } }))
const up2 = seq.find((s) => s[0] === 'upsert')
ok(r.body.state === 'saved' && r.body.first === false && up2[2].id === up1[2].id && up2[2].metadata.brief.goal === 'Nova versão' && up2[2].metadata.first_submitted_at === primeiro && up2[2].metadata.edits === 2 && alertas.length === 0, '3o. reenvio SOBRESCREVE a mesma linha (mesmo id), guarda a 1ª data, conta a edição e não reavisa')
reset()
r = await R.GET(reqGet(SID))
ok(r.body.brief?.goal === 'Nova versão' && r.body.submitted_at === primeiro, '3p. GET devolve o briefing salvo para reeditar')
dbState.rows.get(B.briefEventId(SID)).metadata.edits = B.DFY_BRIEF_MAX_EDITS
reset()
r = await R.POST(reqPost({ session_id: SID, brief: BRIEF_OK }))
ok(r.status === 429 && r.body.state === 'too_many_edits' && !seq.some((s) => s[0] === 'upsert'), '3q. teto de edições por sessão → 429 sem gravar')
dbState.rows.clear(); dbState.writeError = { code: '57014', message: 'timeout' }
reset()
r = await R.POST(reqPost({ session_id: SID, brief: BRIEF_OK }))
ok(r.status === 503 && alertas.length === 0, '3r. banco falhou na escrita → 503 e nenhum aviso de briefing que não existe')
dbState.writeError = null
reset()
r = await R.POST({ text: async () => 'x'.repeat(30_000) })
ok(r.status === 413 && !seq.length, '3s. corpo gigante recusado antes de tudo')

// ── 4. o alerta ao fundador, executado ──────────────────────────────────────────────────────────────────────────
const reservas = new Set()
const alertLog = []
let dbFalha = null
let notifyImpl = async () => ({ email: 'sent', webhook: 'skipped', delivered: true })
const timeouts = []
const envAlert = { ...ENV }
const loadAlert = makeLoader({
  '@supabase/supabase-js': { createClient: () => ({
    from: (table) => ({
      insert: async (row) => {
        alertLog.push(['insert', table, row])
        if (dbFalha === 'throw') throw new Error('rede caiu')
        if (dbFalha) return { error: dbFalha }
        if (reservas.has(row.id)) return { error: { code: '23505', message: 'duplicate' } }
        reservas.add(row.id)
        return { error: null }
      },
      update: (patch) => ({ eq: async (c, v) => { alertLog.push(['update', table, patch, v]); return { error: null } } }),
    }),
  }) },
  '@/lib/supplier/notify': { notifyFounder: (subject, text) => { alertLog.push(['notify', subject, text]); return notifyImpl(subject, text) } },
}, envAlert, { setTimeout: (fn, ms) => { timeouts.push(ms); return setTimeout(fn, 5) }, clearTimeout })
const A = loadAlert('lib/founderAlert')
const notifies = () => alertLog.filter((l) => l[0] === 'notify').length
let out = await A.alertFounderDfyOrder(sessao())
const ins = alertLog.find((l) => l[0] === 'insert')
ok(out === 'sent' && notifies() === 1 && ins[2].id === A.founderAlertEventId('dfy_order', SID) && ins[2].name === 'founder_order_alerted' && alertLog.indexOf(ins) < alertLog.findIndex((l) => l[0] === 'notify'), '4a. 1º alerta: reserva determinística ANTES do envio, envia uma vez → sent')
ok(alertLog.some((l) => l[0] === 'update' && l[2].metadata.state === 'sent' && l[3] === ins[2].id), '4b. o desfecho fica anotado na reserva')
out = await A.alertFounderDfyOrder(sessao())
ok(out === 'duplicate' && notifies() === 1, '4c. reentrega da Stripe (mesma sessão) → duplicate, nada reenviado')
out = await A.alertFounderAdsPass({ session: sessao({ id: SID }), userId: '16aa454a-2ef3-4e6d-bc53-0bece84290d7', credits: 60, until: '2027-09-25T00:00:00.000Z' })
ok(out === 'sent' && notifies() === 2 && alertLog.filter((l) => l[0] === 'insert').pop()[2].id === A.founderAlertEventId('ads_pass', SID), '4d. outro tipo na mesma sessão (passe) tem reserva própria e envia')
const msg = A.dfyOrderAlertMessage(sessao(), new Date('2026-09-25T12:00:00.000Z'))
const prazoEsperado = new Date(Date.parse('2026-09-25T12:00:00.000Z') + EXPRESS.hours * 3600_000).toISOString().slice(0, 16).replace('T', ' ')
ok(msg.subject.includes(EXPRESS.name) && msg.subject.includes(`${EXPRESS.hours} h`) && msg.text.includes(prazoEsperado) && msg.text.includes(`${EXPRESS.revisions} revisão`), '4e. a mensagem tira degrau, horas, prazo e revisões de DFY_TIERS')
ok(msg.text.includes(B.dfyBriefUrl('https://www.usekineo.com', SID)) && msg.text.includes('/admin/ads') && CAMPOS_LINK.every((f) => msg.text.includes(f.text.value)) && msg.text.includes('dono@padaria.example'), '4f. a mensagem leva o link do briefing (para repassar antes do redirect), o painel, os 3 campos e o e-mail')
ok(A.paidAmountLabel(18990, 'brl') === '189.90 BRL' && A.paidAmountLabel(3500, 'jpy') === '3500 JPY' && A.paidAmountLabel(null, 'usd') === 'valor não informado', '4g. valor como a Stripe cobrou (moeda da sessão; sem casa decimal onde a moeda não tem)')
notifyImpl = () => new Promise(() => {})
out = await A.alertFounderOnce({ kind: 'dfy_order', stripeSessionId: 'cs_live_travado0000000001', subject: 's', text: 't' })
ok(out === 'timeout' && timeouts.includes(A.FOUNDER_ALERT_TIMEOUT_MS) && A.FOUNDER_ALERT_TIMEOUT_MS <= 3000, `4h. envio travado → 'timeout' no teto de ${A.FOUNDER_ALERT_TIMEOUT_MS} ms (o webhook não fica refém do Resend)`)
notifyImpl = async () => { throw new Error('Resend explodiu') }
let lancou = null
try { out = await A.alertFounderOnce({ kind: 'dfy_order', stripeSessionId: 'cs_live_explode0000000001', subject: 's', text: 't' }) } catch (e) { lancou = e }
ok(lancou === null && out === 'failed', '4i. envio que lança → failed, o alerta NUNCA lança para o webhook')
notifyImpl = async () => ({ email: 'sent', webhook: 'skipped', delivered: true })
dbFalha = 'throw'
const antes = notifies()
out = await A.alertFounderOnce({ kind: 'dfy_order', stripeSessionId: 'cs_live_bancofora00000001', subject: 's', text: 't' })
ok(out === 'sent' && notifies() === antes + 1, '4j. banco fora na reserva → o alerta sai mesmo assim (dois e-mails custam menos que um pedido que ninguém viu)')
dbFalha = null
envAlert.SUPABASE_SERVICE_ROLE_KEY = ''
out = await A.alertFounderOnce({ kind: 'dfy_order', stripeSessionId: 'cs_live_semsupabase000001', subject: 's', text: 't' })
ok(out === 'sent', '4k. sem service role → envia sem dedupe')
envAlert.SUPABASE_SERVICE_ROLE_KEY = 'svc'
ok(typeof A.alertFounderDfyBrief === 'function' && (await A.alertFounderDfyBrief({ stripeSessionId: 'cs_live_briefing000000001', tier: 'pro', email: 'a@b.c', brief: B.sanitizeBrief(BRIEF_OK) })) === 'sent' && alertLog.filter((l) => l[0] === 'notify').pop()[1].includes(PRO.name), '4l. alerta do briefing sai com o degrau certo')

// ── 5. o webhook: o ramo Empresas RODADO e o alerta do passe no lugar certo ─────────────────────────────────────
// Âncora na abertura do ramo (única na rota), não na 1ª linha dele: reordenar o corpo tem que cair no teste de
// comportamento abaixo, não num "ramo não achado".
const iRamo = wh.indexOf('          if (isDfyOrderSession(session)) {\n')
const ramo = iRamo >= 0 ? wh.slice(iRamo, wh.indexOf('\n          }', iRamo) + 12) : ''
ok(ramo.length > 0 && (wh.split('await alertFounderDfyOrder(').length - 1) === 1, '5a. o ramo Empresas existe e o alerta do pedido tem UM chamador')
async function rodaRamo({ gravacaoLanca }) {
  const chamadas = []
  const js = ts.transpileModule(`exports.run = async function run(session) { switch (1) { case 1: ${ramo} } return 'fora' }`, { compilerOptions: { module: 1, target: 9 } }).outputText
  const m = { exports: {} }
  vm.runInNewContext(js, {
    exports: m.exports, supabase: {}, event: { id: 'evt_1' },
    isDfyOrderSession: () => true,
    recordDfyOrderPaid: async () => { chamadas.push('grava'); if (gravacaoLanca) throw new Error('RetryableCheckoutAnalyticsError') },
    alertFounderDfyOrder: async () => { chamadas.push('alerta'); return 'sent' },
  })
  let erro = null
  try { await m.exports.run({ id: 'cs_x' }) } catch (e) { erro = e }
  return { chamadas, erro }
}
const feliz = await rodaRamo({ gravacaoLanca: false })
ok(JSON.stringify(feliz.chamadas) === JSON.stringify(['grava', 'alerta']) && feliz.erro === null, '5b. ramo executado: grava o pedido e SÓ DEPOIS avisa o fundador')
const falhou = await rodaRamo({ gravacaoLanca: true })
ok(JSON.stringify(falhou.chamadas) === JSON.stringify(['grava']) && falhou.erro !== null, '5c. gravação lança (500 → a Stripe reenvia) → nenhum alerta de pedido que não está no banco')
const iOk = wh.indexOf('entitlementConfirmed = true', wh.indexOf('const isAdsPass = packMeta === ADS_PASS_ID'))
const iIfPass = wh.indexOf('            if (isAdsPass) {\n', iOk)
const blocoPass = iIfPass >= 0 ? wh.slice(iIfPass, wh.indexOf('\n            }\n', iIfPass) + 14) : ''
ok(iOk > 0 && iIfPass > iOk && blocoPass.includes("name: 'ads_access_granted'") && blocoPass.indexOf('await alertFounderAdsPass(') > blocoPass.indexOf("name: 'ads_access_granted'") && (wh.split('await alertFounderAdsPass(').length - 1) === 1, '5d. o alerta do passe mora no bloco isAdsPass DO RAMO DE SUCESSO, depois de ads_access_granted, com um chamador só')
async function rodaPass(isAdsPass) {
  const chamadas = []
  const js = ts.transpileModule(`exports.run = async function run() { ${blocoPass} }`, { compilerOptions: { module: 1, target: 9 } }).outputText
  const m = { exports: {} }
  vm.runInNewContext(js, {
    exports: m.exports, isAdsPass, userId: 'u1', creditsToAdd: 60, adsUntilIso: '2027-01-01', session: { id: 'cs_y' },
    writeServerEvent: async (x) => { chamadas.push(x.name) },
    alertFounderAdsPass: async (x) => { chamadas.push('alerta:' + x.userId + ':' + x.credits) },
  })
  await m.exports.run()
  return chamadas
}
ok(JSON.stringify(await rodaPass(true)) === JSON.stringify(['ads_access_granted', 'alerta:u1:60']) && (await rodaPass(false)).length === 0, '5e. bloco do passe executado: só com isAdsPass, e o alerta vem depois do evento de concessão')

// ── 6. /api/events: o fato forjável fechado ─────────────────────────────────────────────────────────────────────
const inserts = []
const loadEv = makeLoader({
  'next/server': nextServer,
  '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
  '@supabase/supabase-js': { createClient: () => ({ from: () => ({ insert: async (row) => { inserts.push(row); return { error: null } } }) }) },
  '@/lib/requestIdentity': { clientIp: () => '203.0.113.9', hashIp: () => 'h', isLikelyBot: () => false },
  '@/lib/growth/businessAdsAttribution': { businessAdsStamp: () => ({}) },
}, { ...ENV })
const EV = loadEv('app/api/events/route')
const evReq = (name) => ({ nextUrl: new URL('https://www.usekineo.com/api/events'), json: async () => ({ name, metadata: { stripe_session_id: 'cs_live_forjado', tier: 'pro' } }), headers: { get: () => 'Mozilla/5.0' } })
const ctrl = await EV.POST(evReq('dfy_brief_viewed'))
ok(ctrl.body.stored === true && inserts.length === 1, '6a. controle: evento de cliente (dfy_brief_viewed) entra pelo sink — o dublê chega até a gravação')
for (const nome of ['dfy_order_paid', 'dfy_brief_submitted', 'founder_order_alerted']) {
  const antesIns = inserts.length
  const res = await EV.POST(evReq(nome))
  ok(res.body.stored === false && res.body.ignored === true && inserts.length === antesIns, `6b. navegador não cunha ${nome} (recusado antes de gravar)`)
}

// ── 7. /admin/ads ───────────────────────────────────────────────────────────────────────────────────────────────
const AD = puro('app/admin/ads/adsAdminData')
const agora = new Date('2026-09-26T12:00:00.000Z')
const pagoEm = '2026-09-25T00:00:00.000Z'
const { orders, orphanBriefs } = AD.buildDfyOrderRows(
  [
    { created_at: pagoEm, user_id: null, metadata: { stripe_session_id: 'cs_a', tier: 'express', customer_email: 'a@x.y', custom_fields: [{ label: 'Business', value: 'Padaria' }] } },
    { created_at: '2026-09-23T00:00:00.000Z', user_id: null, metadata: { stripe_session_id: 'cs_b', tier: 'pro' } },
    { created_at: pagoEm, user_id: null, metadata: { stripe_session_id: 'cs_a', tier: 'express' } },
  ],
  [
    { created_at: '2026-09-25T01:00:00.000Z', metadata: { stripe_session_id: 'cs_a', brief: { business: 'Padaria' }, updated_at: '2026-09-25T02:00:00.000Z' } },
    { created_at: '2026-09-25T03:00:00.000Z', metadata: { stripe_session_id: 'cs_orfao', tier: 'pro', brief: { business: 'Clínica' } } },
  ],
  agora,
)
const oa = orders.find((o) => o.stripeSessionId === 'cs_a')
const ob = orders.find((o) => o.stripeSessionId === 'cs_b')
ok(orders.length === 2 && oa.deadlineAt === new Date(Date.parse(pagoEm) + EXPRESS.hours * 3600_000).toISOString() && oa.hoursLeft === (Date.parse(pagoEm) + EXPRESS.hours * 3600_000 - agora.getTime()) / 3600_000, '7a. prazo Empresas = pago em + horas do degrau (DFY_TIERS); pedido repetido conta uma vez')
ok(oa.late === false && ob.late === (Date.parse('2026-09-23T00:00:00.000Z') + PRO.hours * 3600_000 < agora.getTime()) && oa.brief?.business === 'Padaria' && oa.briefUpdatedAt === '2026-09-25T02:00:00.000Z', '7b. atraso calculado contra o relógio e o briefing junta pela sessão da Stripe')
ok(orphanBriefs.length === 1 && orphanBriefs[0].stripeSessionId === 'cs_orfao' && orphanBriefs[0].tier === 'pro', '7c. briefing sem pedido gravado aparece à parte (webhook atrasado não esconde cliente)')
const pedidos = [
  { id: 'o1', user_id: 'u1', status: 'delivered', template: 't', seconds: 35, video_id: 'v1', qa_at: null, delivered_at: '2026-09-25T10:00:00.000Z', created_at: '', updated_at: '2026-09-25T10:00:00.000Z', brief: { business: 'Loja' } },
  { id: 'o2', user_id: 'u2', status: 'delivered', template: 't', seconds: 60, video_id: null, qa_at: null, delivered_at: '2026-09-26T08:00:00.000Z', created_at: '', updated_at: '2026-09-26T08:00:00.000Z' },
  { id: 'o3', user_id: 'u3', status: 'delivered', template: 't', seconds: 35, video_id: null, qa_at: '2026-09-26T09:00:00.000Z', delivered_at: '2026-09-25T09:00:00.000Z', created_at: '', updated_at: '' },
  { id: 'o4', user_id: 'u4', status: 'rendering', template: 't', seconds: 35, video_id: null, qa_at: null, delivered_at: null, created_at: '', updated_at: '2026-09-26T11:00:00.000Z' },
  { id: 'o5', user_id: 'u5', status: 'rendering', template: 't', seconds: 35, video_id: null, qa_at: null, delivered_at: null, created_at: '', updated_at: '2026-09-26T11:50:00.000Z' },
]
const fila = AD.buildReviewQueue(pedidos, agora)
ok(JSON.stringify(fila.map((f) => f.id)) === JSON.stringify(['o1', 'o2']) && fila[0].late === true && fila[0].ageHours === 26 && fila[1].late === false && AD.ADS_REVIEW_PROMISE_HOURS === 24 && fila[0].business === 'Loja', '7d. fila de revisão: só entregue sem qa_at, a mais antiga primeiro, atraso contra 24 h')
ok(JSON.stringify(AD.staleRendering(pedidos, agora).map((f) => f.id)) === JSON.stringify(['o4']), '7e. render parado há mais de 30 min entra na lista (o de 10 min não)')
ok(AD.parseQaAction({ action: 'qa', order_id: '16aa454a-2ef3-4e6d-bc53-0bece84290d7', ok: false }).ok === false && AD.parseQaAction({ action: 'qa', order_id: '16aa454a-2ef3-4e6d-bc53-0bece84290d7', ok: false, note: 'logo cortado' }).ok === true && AD.parseQaAction({ action: 'qa', order_id: 'x', ok: true }).ok === false && AD.parseQaAction({ action: 'outra', order_id: '16aa454a-2ef3-4e6d-bc53-0bece84290d7', ok: true }).ok === false, '7f. POST só aceita ação qa, uuid válido, ok booleano, e reprovar exige motivo')
// a rota do admin executada
let usuario = null
const adminCalls = []
let updateRows = []
const dbDuble = {
  isAdminEmail: (e) => e === 'admin@kineo.test',
  serviceClient: () => { adminCalls.push(['service']); const q = { filtros: [] }; q.from = (t) => { adminCalls.push(['from', t]); return q }; q.update = (p) => { adminCalls.push(['update', p]); return q }; q.eq = (c, v) => { q.filtros.push([c, v]); return q }; q.is = (c, v) => { q.filtros.push([c, v]); return q }; q.select = async () => { adminCalls.push(['filtros', q.filtros]); return { data: updateRows, error: null } }; return q },
}
const loadAdm = makeLoader({
  'next/server': nextServer,
  '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: usuario } }) } }) },
  '@/lib/serverEvents': { writeServerEvent: async (x) => { adminCalls.push(['event', x]); return true } },
  // A rota importa '../_shared/db' (relativo): o dublê responde pelos dois especificadores.
  '../_shared/db': dbDuble,
  '@/app/api/admin/_shared/db': dbDuble,
}, { ...ENV })
const admStubs = loadAdm
const ADM = (() => { try { return admStubs('app/api/admin/ads/route') } catch (e) { falhas.push('7g. rota do admin não carregou: ' + e.message); return {} } })()
const admReq = (body) => ({ json: async () => body })
const ORD = '16aa454a-2ef3-4e6d-bc53-0bece84290d7'
if (typeof ADM.POST === 'function') {
  usuario = { email: 'curioso@x.y' }
  r = await ADM.POST(admReq({ action: 'qa', order_id: ORD, ok: true }))
  ok(r.status === 403 && !adminCalls.some((c) => c[0] === 'service'), '7g. não-admin → 403 ANTES de abrir o service role')
  usuario = { email: 'admin@kineo.test' }
  updateRows = [{ id: ORD, user_id: 'u9', delivered_at: '2026-09-25T10:00:00.000Z' }]
  adminCalls.length = 0
  r = await ADM.POST(admReq({ action: 'qa', order_id: ORD, ok: true }))
  const upd = adminCalls.find((c) => c[0] === 'update')
  const filtros = (adminCalls.find((c) => c[0] === 'filtros') || [])[1] || []
  const ev = (adminCalls.find((c) => c[0] === 'event') || [])[1]
  ok(r.status === 200 && upd[1].status === 'reviewed' && upd[1].qa_ok === true && typeof upd[1].qa_at === 'string' && upd[1].qa_by === 'admin@kineo.test', '7h. admin aprova → ads_orders ganha status reviewed, qa_at, qa_by, qa_ok')
  ok(JSON.stringify(filtros) === JSON.stringify([['id', ORD], ['status', 'delivered'], ['qa_at', null]]), '7i. o UPDATE só pega pedido entregue e ainda sem revisão (clicar duas vezes não decide duas vezes)')
  ok(ev && ev.name === 'ads_qa_decided' && ev.metadata.order_id === ORD && ev.metadata.ok === true && ev.userId === 'u9', '7j. todo veredito vira ads_qa_decided com order_id, quem e o resultado')
  updateRows = []
  adminCalls.length = 0
  r = await ADM.POST(admReq({ action: 'qa', order_id: ORD, ok: true }))
  ok(r.status === 409 && !adminCalls.some((c) => c[0] === 'event'), '7k. pedido já revisado → 409, sem segundo evento')
  adminCalls.length = 0
  r = await ADM.POST(admReq({ action: 'qa', order_id: ORD, ok: false }))
  ok(r.status === 400 && !adminCalls.some((c) => c[0] === 'update'), '7l. reprovar sem motivo → 400 sem tocar no pedido')
}
const pagAdm = rd('app/admin/ads/page.tsx')
const iGate = pagAdm.indexOf('if (!user || !isAdminEmail(user.email)) {')
const iSvc = pagAdm.indexOf('const admin = serviceClient()')
ok(iGate > 0 && iSvc > iGate && /return <Shell>/.test(pagAdm.slice(iGate, iSvc)), '7m. página /admin/ads: portão ADMIN_EMAILS devolve a tela negada ANTES do service role')

// ── 8. página e formulário ──────────────────────────────────────────────────────────────────────────────────────
const pag = rd('app/business-video-ads/brief/page.tsx')
const form = rd('app/business-video-ads/brief/BriefForm.tsx')
ok(!/^'use client'/m.test(pag) && /robots: \{ index: false, follow: false/.test(pag) && /referrer: 'no-referrer'/.test(pag) && /fields=\{DFY_BRIEF_FIELDS/.test(pag), '8a. página do briefing: servidor, noindex, no-referrer, campos vindos do contrato')
const importsForm = [...form.matchAll(/^import (.*) from '([^']+)'/gm)]
ok(/^'use client'/.test(form) && importsForm.filter((m) => m[2] === '@/lib/growth/dfyBrief').every((m) => /^type /.test(m[1])) && !importsForm.some((m) => m[2].startsWith('node:') || m[2] === '@/lib/founderAlert'), '8b. o formulário (cliente) só importa TIPOS de dfyBrief (node:crypto fora do bundle do navegador)')
ok(/trackEvent\('dfy_brief_viewed'/.test(form) && !/trackEvent\([^)]*sessionId/.test(form) && !/My footage/i.test(semComentarios(form)) && /reply to your receipt/i.test(form), '8c. evento de cliente sem o session_id; nada de prometer My footage (402 para conta grátis); a saída é responder o recibo')
const NOVOS = ['lib/growth/dfySession.ts', 'lib/growth/dfyBrief.ts', 'lib/founderAlert.ts', 'app/api/dfy/brief/route.ts', 'app/business-video-ads/brief/page.tsx', 'app/business-video-ads/brief/BriefForm.tsx', 'app/admin/ads/page.tsx', 'app/admin/ads/AdsAdminActions.tsx', 'app/admin/ads/adsAdminData.ts', 'app/api/admin/ads/route.ts']
// Preço em centavos das fontes únicas (degraus, legado e passe) e qualquer "$"/"US$" seguido de número. O "/ 100" de
// conversão de centavos (paidAmountLabel) não é preço: por isso a lista não inclui os valores já divididos.
const precos = [EXPRESS.priceMinor, PRO.priceMinor, DFY.DFY_LEGACY_PRICE_USD_MINOR, puro('lib/ads/offer').ADS_PASS_USD_MINOR]
const comPreco = NOVOS.filter((f) => { const code = semComentarios(rd(f)); return /(?:US)?\$\s?\d/.test(code) || precos.some((p) => new RegExp('(^|[^\\w.])' + p + '(?!\\w)').test(code)) })
ok(comPreco.length === 0, `8d. nenhum preço digitado no código dos arquivos novos (${comPreco.join(', ') || 'nenhum'})`)

console.log(`test-empresas-briefing-2026-09-25: ${passou} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  FAIL ' + f)
process.exit(falhas.length ? 1 : 0)
