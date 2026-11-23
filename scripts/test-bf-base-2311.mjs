// KINEO-BF-BASE-2311 — guardião da carta da Black Friday para a base (lib/lifecycle/bfBase2311.ts + app/api/admin/send-bf-base-2311).
// EXECUTA a regra pura (travas, metades, cartas, leitura dos parâmetros) e lê a rota (ensaio antes de qualquer escrita, porta da
// Black Friday na metade A, selo na lista da casa). Depois devolve cada defeito ao código, em memória, e exige que a asserção EXATA
// fique vermelha. Rodar: node scripts/test-bf-base-2311.mjs
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(ROOT, 'package.json'))
const ts = require('typescript')
const rd = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const LIB = 'lib/lifecycle/bfBase2311.ts'
const ROTA = 'app/api/admin/send-bf-base-2311/route.ts'
const SQL = 'docs/queries/BF-BASE-2311.sql'
const EVT = 'lib/lifecycle/emailEvents.ts'
const SRV = 'app/api/events/route.ts'
const CHK = 'app/api/stripe/checkout/route.ts'
const SRC = Object.fromEntries([LIB, ROTA, SQL, EVT, SRV, CHK].map((p) => [p, rd(p)]))

function carregar(fontes) {
  const cache = new Map()
  const exec = (arq) => {
    const rel = arq.slice(ROOT.length + 1).replace(/\\/g, '/')
    if (cache.has(arq)) return cache.get(arq).exports
    const mod = { exports: {} }
    cache.set(arq, mod)
    const texto = Object.hasOwn(fontes, rel) ? fontes[rel] : readFileSync(arq, 'utf8')
    const js = ts.transpileModule(texto, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
    const req = (id) => {
      if (id.startsWith('.') || id.startsWith('@/')) {
        const b = id.startsWith('@/') ? join(ROOT, id.slice(2)) : resolve(dirname(arq), id)
        for (const ext of ['.ts', '.tsx', '/index.ts']) if (existsSync(b + ext)) return exec(b + ext)
        throw new Error('não resolveu ' + id)
      }
      return require(id)
    }
    new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
    return mod.exports
  }
  return { L: exec(join(ROOT, LIB)), P: exec(join(ROOT, 'lib/checkoutPricing.ts')), B: exec(join(ROOT, 'lib/billing/blackFriday2026.ts')) }
}

const DIA = 86_400_000
const NOW = Date.UTC(2026, 10, 25, 15)
const FOOT = { text: '[unsubscribe]', html: '<p>[unsubscribe]</p>' }
const APP = 'https://www.usekineo.com'
const uuid = (i) => { const h = createHash('sha256').update('id' + i).digest('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}` }
// Preço literal: cifrão com dígito, valor com centavos, ou qualquer número das tabelas de preço (centavos e dólares).
const PRECO_LIT = /\$\s?\d|US\$|\b\d+\.\d{2}\b|\b(?:900|1900|5900|5400|7600|11400|16000|950|54|108|19|9\.5)\b/

function battery(src) {
  const p = []
  const ok = (c, m) => { if (!c) p.push(m) }
  let L, P, B
  try { ({ L, P, B } = carregar(src)) } catch (e) { return ['não carrega: ' + e.message] }
  const base = { email: 'ana@example.com', signupCountry: 'US', lastCountry: null, emailOptedOut: false, hasPaid: false, stripeSubscriptionId: null, paypalSubscriptionId: null, paymentEvent: false, films: 1, alreadyGotThis: false, lastEmailMs: null, nowMs: NOW }
  const tr = (o) => L.bfBaseTrava({ ...base, ...o })

  // 1. travas
  ok(tr({}) === null, 'a conta típica (país rico, filme, nunca pagou) entra')
  ok(tr({ hasPaid: true }) === 'pagou' && tr({ hasPaid: null }) === 'pagou' && tr({ stripeSubscriptionId: 'sub_1' }) === 'pagou'
    && tr({ paypalSubscriptionId: 'I-1' }) === 'pagou' && tr({ paymentEvent: true }) === 'pagou', 'quem pagou nunca entra')
  ok(tr({ emailOptedOut: true }) === 'saiu', 'quem saiu nunca entra')
  ok(tr({ email: 'josephsskaf@gmail.com' }) === 'casa' && tr({ email: 'VictoriaSkaf96@gmail.com' }) === 'casa'
    && tr({ email: 'qa@usekineo.com' }) === 'casa' && tr({ email: 'x@mail.usekineo.com' }) === 'casa', 'casa nunca entra')
  ok(tr({ lastEmailMs: NOW - 6 * DIA }) === 'email_7d' && tr({ lastEmailMs: NOW - 8 * DIA }) === null, 'e-mail há 6 dias fica fora, há 8 entra')
  ok(tr({ signupCountry: 'BR' }) === 'pais_fora' && tr({ signupCountry: null, lastCountry: 'IN' }) === 'pais_fora'
    && tr({ signupCountry: null, lastCountry: null }) === 'pais_fora' && tr({ signupCountry: 'BR', lastCountry: 'US' }) === 'pais_fora'
    && tr({ signupCountry: '', lastCountry: 'jp' }) === null, 'país fora da lista fica fora (coalesce: signup vence)')
  ok(tr({ films: 0 }) === 'sem_filme', 'sem filme fica fora')
  ok(tr({ alreadyGotThis: true }) === 'ja_recebeu_esta', 'esta carta uma vez na vida')
  ok(tr({ email: 'sem-arroba' }) === 'sem_email', 'sem e-mail válido fica fora')

  // 2. metades
  const ids = Array.from({ length: 1000 }, (_, i) => uuid(i))
  const m1 = ids.map((id) => L.bfBaseMetade(id))
  const L2 = carregar(src).L // 2ª carga independente do módulo: o hash não pode depender de estado
  const m2 = ids.map((id) => L2.bfBaseMetade(id))
  ok(m1.every((m, i) => m === m2[i] && m === L.bfBaseMetade(ids[i])), 'divisão estável (mesmo id, mesma metade)')
  const as = m1.filter((m) => m === 'a').length
  ok(as >= 450 && as <= 550 && m1.every((m) => m === 'a' || m === 'b'), `divisão entre 45% e 55% em 1.000 ids`)

  // 3. cartas
  const A = [L.bfBaseCarta({ arm: 'a', filmTitle: 'The lost city of gold', app: APP, footer: FOOT }), L.bfBaseCarta({ arm: 'a', filmTitle: null, app: APP, footer: FOOT })]
  const Bc = [L.bfBaseCarta({ arm: 'b', filmTitle: 'The lost city of gold', app: APP, footer: FOOT }), L.bfBaseCarta({ arm: 'b', filmTitle: null, app: APP, footer: FOOT })]
  const tudo = (c) => `${c.subject}\n${c.text}\n${c.html}`
  const st = B.bf2026PriceRows().find((r) => r.tier === 'starter')
  ok(A.every((c) => !/creator/i.test(tudo(c)) && !/any annual|all annual|every annual|studio/i.test(tudo(c))), 'texto A não cita Creator nem "any annual"')
  ok(A.every((c) => c.text.includes(B.bf2026Usd(st.bfMinor)) && c.text.includes('Starter') && c.text.includes(L.bfBaseFimA()) && L.bfBaseFimA().includes('Dec 1')
    && c.link.includes('/black-friday?') && c.link.includes('utm_source=email&utm_campaign=bf_base_2311&utm_content=arm_a')), 'texto A: preço do código, prazo 1/12 lido do código, link da Black Friday')
  const meio = P.formatCheckoutMoney('usd', Math.round(P.TIER_PRICES.basic.usd / 2))
  ok(Bc.every((c) => /first month/i.test(c.text) && /only the first month/i.test(c.text) && c.text.includes(meio) && !/annual|year|starter|studio/i.test(tudo(c))
    && !/until|through dec|ends|last chance|expires|hurry/i.test(tudo(c))), 'texto B cita só o 1º mês, sem anual e sem prazo')
  ok(Bc.every((c) => c.link.includes('/pricing?promo=FIRST50&utm_source=email&utm_campaign=bf_base_2311&utm_content=arm_b')), 'link B usa o mecanismo do FIRST50')
  ok([...A, ...Bc].every((c) => c.text.includes('[unsubscribe]') && c.html.includes('[unsubscribe]') && (c.html.match(/<a /g) || []).length === 1
    && c.text.replace(/https?:\S+/g, '').replace('[unsubscribe]', '').split(/\s+/).filter(Boolean).length <= 110 && !/<img/i.test(c.html)), 'curto, um botão, sem imagem, com descadastro')
  ok(A[0].subject.includes('The lost city of gold') && Bc[0].subject.includes('The lost city of gold'), 'assunto fala do filme')
  ok(/percent_off: 50,\n\s+duration: 'once',\n\s+name: '50% off first month',/.test(src[CHK]) && src[CHK].includes("FIRST50_COUPON_ID = 'KINEO_FIRST50'"), 'FIRST50 continua metade da 1ª fatura no checkout')

  // 4. nenhum preço literal nos arquivos novos (comentários fora)
  const semComent = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '').replace(/^\s*--.*$/gm, '')
  ok(!PRECO_LIT.test(semComent(src[LIB])) && !PRECO_LIT.test(semComent(src[ROTA])) && !PRECO_LIT.test(semComent(src[SQL])), 'nenhum número de preço literal nos arquivos novos')

  // 5. parâmetros: sem confirm=SEND nada é enviado
  const ped = (o) => L.bfBasePedido({ confirm: null, limit: null, arm: null, ...o })
  ok(ped({}).modo === 'DRY_RUN' && ped({ confirm: 'send', limit: '10', arm: 'a' }).modo === 'DRY_RUN' && ped({ confirm: 'yes', limit: '10', arm: 'b' }).modo === 'DRY_RUN', 'sem confirm=SEND é ensaio')
  ok(ped({ confirm: 'SEND', arm: 'a' }).status === 400 && ped({ confirm: 'SEND', limit: '151', arm: 'a' }).status === 400
    && ped({ confirm: 'SEND', limit: '150', arm: 'x' }).status === 400 && ped({ confirm: 'SEND', limit: '150', arm: 'both' }).limit === 150, 'envio pede limit ≤ 150 e arm')
  const r = src[ROTA]
  const iDry = r.indexOf("if (pedido.modo === 'DRY_RUN') {")
  const iEscrita = Math.min(...['.insert(', '.update({', "fetch('", 'registrarCorrida'].map((k) => { const i = r.indexOf(k); return i < 0 ? Infinity : i }))
  ok(iDry > 0 && iDry < iEscrita && r.slice(iDry, r.indexOf('// ── 4. ENVIO')).includes('return NextResponse.json('), 'o ensaio sai antes de qualquer escrita ou envio')
  ok(r.includes("(e.arm === 'b' || bfAberta)") && r.includes("pedido.arm === 'a' && !bfAberta"), 'metade A só com a Black Friday aberta')
  ok(r.includes('if (vagas <= 0)') && r.includes('Math.min(pedido.limit, vagas)') && r.includes('res.status === 429'), 'para quando a cota do dia acaba')
  const iSelo = r.indexOf('name: BF_BASE_2311_SENT, path: ROUTE')
  ok(iSelo > 0 && iSelo < r.indexOf("fetch('https://api.resend.com/emails'") && r.includes('if (reserva.error) { pulados++; continue }'), 'selo antes do envio, nunca duas vezes')
  ok(src[EVT].includes("  'bf_base_2311_sent',\n") && src[SRV].includes("  'bf_base_2311_sent',\n"), 'selo na supressão da casa e só o servidor grava')
  ok(!r.includes('CRON_SECRET') && !rd('vercel.json').includes('send-bf-base-2311') && !/send-black-friday-2026/.test(r), 'rota manual, sem cron')
  return p
}

const base = battery(SRC)
if (base.length) { console.error('VERMELHO na base:\n - ' + base.join('\n - ')); process.exit(1) }

const muta = (arq, de, para) => {
  if (!SRC[arq].includes(de)) throw new Error(`mutante sem âncora em ${arq}: ${de.slice(0, 60)}`)
  return { ...SRC, [arq]: SRC[arq].replace(de, para) }
}
const mutantes = [
  ['has_paid nulo passa', muta(LIB, 'p.hasPaid !== false ||', 'p.hasPaid === true ||'), 'quem pagou nunca entra'],
  ['opt-out ignorado', muta(LIB, "p.emailOptedOut !== false && p.emailOptedOut !== null && p.emailOptedOut !== undefined) return 'saiu'", "false) return 'saiu'"), 'quem saiu nunca entra'],
  ['domínio da casa esquecido', muta(LIB, "contaDaCasaExata(e) || /@(?:[a-z0-9-]+\\.)*usekineo\\.com$/.test(e)", 'contaDaCasaExata(e)'), 'casa nunca entra'],
  ['janela de 5 dias', muta(LIB, 'p.nowMs - ultimo < BF_BASE_2311_SUPPRESSION_DAYS * 86_400_000', 'p.nowMs - ultimo < 5 * 86_400_000'), 'e-mail há 6 dias fica fora, há 8 entra'],
  ['janela de 9 dias', muta(LIB, 'p.nowMs - ultimo < BF_BASE_2311_SUPPRESSION_DAYS * 86_400_000', 'p.nowMs - ultimo < 9 * 86_400_000'), 'e-mail há 6 dias fica fora, há 8 entra'],
  ['Brasil na lista', muta(LIB, "'JP', 'SG', 'AE', 'IL', 'KR',", "'JP', 'SG', 'AE', 'IL', 'KR', 'BR',"), 'país fora da lista fica fora (coalesce: signup vence)'],
  ['last_country vence', muta(LIB, 'return s !== null ? norm(s) : norm(lastCountry)', 'return norm(lastCountry) ?? norm(signupCountry)'), 'país fora da lista fica fora (coalesce: signup vence)'],
  ['sem filme passa', muta(LIB, 'p.films >= 1', 'p.films >= 0'), 'sem filme fica fora'],
  ['metade torta', muta(LIB, '& 1) === 0 ?', '& 3) !== 3 ?'), 'divisão entre 45% e 55% em 1.000 ids'],
  ['metade sorteada', muta(LIB, "return (hash32(`${BF_BASE_2311_CAMPAIGN}:${String(userId).trim().toLowerCase()}`) & 1) === 0 ? 'a' : 'b'", "return Math.random() < 0.5 ? 'a' : 'b'"), 'divisão estável (mesmo id, mesma metade)'],
  ['A promete qualquer anual', muta(LIB, 'the yearly ${n.name} plan is', 'any annual plan, like ${n.name}, is'), 'texto A não cita Creator nem "any annual"'],
  ['B fala de anual', muta(LIB, 'after that it is ${n.full} a month.', 'after that it is ${n.full} a month, or go annual.'), 'texto B cita só o 1º mês, sem anual e sem prazo'],
  ['preço digitado na B', muta(LIB, 'after that it is ${n.full} a month.', 'after that it is $19 a month.'), 'nenhum número de preço literal nos arquivos novos'],
  ['send minúsculo envia', muta(LIB, "if (params.confirm !== 'SEND') return", "if (!params.confirm) return"), 'sem confirm=SEND é ensaio'],
  ['teto de 1000', muta(LIB, 'if (n > BF_BASE_2311_BATCH_MAX)', 'if (n > 1000)'), 'envio pede limit ≤ 150 e arm'],
  ['ensaio depois da escrita', muta(ROTA, "if (pedido.modo === 'DRY_RUN') {", "if (pedido.modo === 'NUNCA') {"), 'o ensaio sai antes de qualquer escrita ou envio'],
  ['A fora da janela sai', muta(ROTA, "(e.arm === 'b' || bfAberta)", '(true)'), 'metade A só com a Black Friday aberta'],
  ['selo forjável', muta(SRV, "  'bf_base_2311_sent',\n", ''), 'selo na supressão da casa e só o servidor grava'],
  ['selo depois do envio', muta(ROTA, 'if (reserva.error) { pulados++; continue }', ''), 'selo antes do envio, nunca duas vezes'],
]
const linhas = []
let vivos = 0
for (const [nome, fontes, esperado] of mutantes) {
  const f = battery(fontes)
  const morto = f.some((m) => m === esperado || m.startsWith(esperado))
  if (!morto) vivos++
  linhas.push(`${morto ? 'MORTO' : 'VIVO '} · ${nome} · ${morto ? esperado : 'esperado: ' + esperado + ' | pegou: ' + (f.join(' / ') || 'nada')}`)
}
console.log(linhas.join('\n'))
if (vivos) { console.error(`${vivos} mutante(s) vivo(s)`); process.exit(1) }
console.log(`PASS test-bf-base-2311 — base verde, ${mutantes.length} mutantes mortos pela asserção exata`)
