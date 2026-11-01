// KINEO-RESGATE-CUPOM-RICO-0111 — guardião do cupom FIRST50 na carta de checkout expirado, SÓ para país rico.
//
// O número: 31 cartas de checkout expirado em 14 d e quase nenhuma compra — a carta devolvia a pessoa ao MESMO preço sem
// oferecer nada. Fundador, 01/11: "vai tudo".
//
// O que este guardião prova, EXECUTANDO o código (sem rede, sem banco, sem Resend, sem Stripe):
//   1. a régua pura (lib/lifecycle/checkoutRecoveryOffer.ts): país rico (a lista da casa, menos BR) → FIRST50; outro país
//      ou país desconhecido → nada; perfil vence o IP da sessão; o link e a copy dizem o escopo real (Creator/Studio mensal);
//   2. a rota REAL app/api/admin/send-checkout-recovery, transpilada e carregada com banco/Stripe/supressão em memória:
//      · DRY-RUN (sem confirm=SEND): nenhum fetch, nenhum insert; a lista mostra a oferta e a faixa de cada pessoa;
//      · o envio, com fetch FALSO (nada sai da máquina): só o país rico recebe o FIRST50, no lugar certo da carta, e o
//        evento grava offer=FIRST50|none + country_tier; a carta dos outros sai byte a byte como antes;
//      · o dedupe existente: quem já recebeu não recebe de novo (2ª rodada = zero envios);
//   3. o gancho do avulso (US$ 2,90) NÃO foi inventado: nenhum 'starter290' na régua nem na carta enquanto não existir
//      elegibilidade de resgate na base.
//
// Rodar: npx tsx scripts/test-resgate-cupom-rico-0111.mts
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import {
  ofertaDoResgate, paisDoResgate, resgatePromoUrl, resgatePromoTexto, resgatePromoHtml,
  CHECKOUT_RECOVERY_PROMO, CHECKOUT_RECOVERY_OFFER_VERSION,
} from '../lib/lifecycle/checkoutRecoveryOffer'
import { PAISES_FILME_GRATIS } from '../lib/freeFilmPolicy'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const rd = (p: string) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n')
const SITE = 'https://www.usekineo.com'

// ── 1. a régua pura ──────────────────────────────────────────────────────────────────────────────────────────────────
console.log('1) régua: quem é país rico, quem não é')
const pedidos = ['US', 'CA', 'GB', 'IE', 'DE', 'FR', 'ES', 'IT', 'NL', 'SE', 'PL', 'NO', 'IS', 'CH', 'AU', 'NZ', 'JP', 'KR', 'SG', 'IL', 'AE']
ok(pedidos.every((c) => ofertaDoResgate(c).offer === 'FIRST50' && ofertaDoResgate(c).country_tier === 'rico'), 'EUA, Canadá, RU, Irlanda, UE/EEE, Suíça, Noruega, Austrália, NZ, Japão, Coreia, Singapura, Israel, Emirados → FIRST50')
ok(['BR', 'IN', 'MX', 'PH', 'NG', 'ID', 'PK', 'AR', 'MY', 'TR'].every((c) => { const o = ofertaDoResgate(c); return o.offer === 'none' && o.country_tier === 'outro' }), 'Brasil, Índia, México, Filipinas, Nigéria, Indonésia, Paquistão, Argentina, Malásia, Turquia → sem cupom')
ok(PAISES_FILME_GRATIS.filter((c) => c !== 'BR').every((c) => ofertaDoResgate(c).offer === 'FIRST50'), 'a lista é a da casa (PAISES_FILME_GRATIS), sem lista nova digitada')
ok(PAISES_FILME_GRATIS.includes('BR') && ofertaDoResgate('BR').offer === 'none', 'BR fica fora mesmo estando na lista do filme grátis (já paga preço regional em reais)')
ok([null, undefined, '', 'XX', 'T1', 'usa', '12'].every((c) => { const o = ofertaDoResgate(c as string | null); return o.offer === 'none' && o.country_tier === 'desconhecido' && o.country === null }), 'país desconhecido (vazio, XX, T1, lixo) → sem cupom (falha FECHADA)')
ok(ofertaDoResgate(' us ').country === 'US' && ofertaDoResgate('us').offer === 'FIRST50', 'normaliza caixa e espaço')
ok(paisDoResgate({ lastCountry: 'IN', signupCountry: 'US', sessionCountry: 'US' }) === 'IN', 'perfil (último país) vence o cadastro e o IP da sessão')
ok(paisDoResgate({ lastCountry: 'XX', signupCountry: 'GB', sessionCountry: 'IN' }) === 'GB', 'último país inválido → país do cadastro')
ok(paisDoResgate({ lastCountry: null, signupCountry: null, sessionCountry: 'DE' }) === 'DE', 'sem perfil → IP da sessão expirada')
ok(paisDoResgate({}) === null, 'nenhum sinal → null')

console.log('2) link e copy do cupom: honestos')
const url = resgatePromoUrl(SITE)
ok(url === `${SITE}/pricing?promo=FIRST50&utm_source=email&utm_campaign=checkout_recovery_rico`, 'link = /pricing?promo=FIRST50&utm_source=email&utm_campaign=checkout_recovery_rico')
const tx = resgatePromoTexto(SITE), hx = resgatePromoHtml(SITE)
ok(tx.includes(url) && hx.includes(url), 'texto e html levam o link')
ok(/first month/.test(tx) && /Creator or Studio/.test(tx) && /monthly/.test(tx), 'diz o escopo real: 1º mês, Creator ou Studio, mensal')
const semCodigo = (s: string) => s.split(url).join('').split(CHECKOUT_RECOVERY_PROMO).join('').replace(/style="[^"]*"/g, '')
ok(!/\d/.test(semCodigo(tx)) && !/\d/.test(semCodigo(hx)), 'nenhum número de preço/porcentagem digitado (só o nome do código)')
ok(!/starter|annual|every month|forever|free credits/i.test(tx), 'não promete Starter, anual, desconto recorrente nem crédito')
const cp = rd('app/api/stripe/checkout/route.ts')
ok(/publicPromo === 'FIRST50'/.test(cp) && /percent_off: 50/.test(cp) && /duration: 'once'/.test(cp), "o cupom existe no checkout: FIRST50, 'once' (só a 1ª fatura), metade")
ok(/\(publicPromo === 'FIRST50' \|\| publicPromo === 'COMEBACK50'\) && !privatePackPromo && \(tier === 'starter' \|\| isAnnual\)/.test(cp), 'o gate do checkout recusa Starter e anual — a copy não promete além disso')
const ho = rd('lib/growth/pricingPlanChoiceAttribution.ts')
ok(/promo === 'FIRST50' \|\| promo === 'COMEBACK50'/.test(ho) && /initialBilling: monthlyPromo \? 'monthly'/.test(ho), 'a /pricing abre no mensal com ?promo=FIRST50')

console.log('3) gancho do avulso: não inventado')
const lib = rd('lib/lifecycle/checkoutRecoveryOffer.ts')
const codigoLib = lib.replace(/^\s*\/\/.*$/gm, '')
ok(!/starter290|2\.90|290/.test(codigoLib), 'a régua não oferece o avulso (nenhuma elegibilidade de resgate do starter290 existe na base)')
ok(/GANCHO DO AVULSO/.test(lib) && /aqui entra o avulso do starter290/.test(lib), 'o gancho está escrito no lugar onde a elegibilidade vai entrar')

// ── 4. a rota real, com o mundo em memória ───────────────────────────────────────────────────────────────────────────
type Row = Record<string, unknown>
const req0 = createRequire(path.join(root, 'package.json'))
const ts = req0('typescript')
function fileFor(rel: string): string | null {
  for (const c of [rel, `${rel}.ts`, `${rel}.tsx`, `${rel}/index.ts`]) {
    const abs = path.join(root, c)
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return c
  }
  return null
}
function carrega(entry: string, stubs: Record<string, unknown>): Record<string, unknown> {
  const cache = new Map<string, { exports: Record<string, unknown> }>()
  const load = (rel: string): Record<string, unknown> => {
    const hit = cache.get(rel); if (hit) return hit.exports
    const out = ts.transpileModule(rd(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: rel }).outputText
    const mod = { exports: {} as Record<string, unknown> }
    cache.set(rel, mod)
    const req = (spec: string) => {
      if (spec in stubs) return stubs[spec]
      let target: string | null = null
      if (spec.startsWith('@/')) target = fileFor(spec.slice(2))
      else if (spec.startsWith('.')) target = fileFor(path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec)))
      if (target) return load(target)
      return req0(spec)
    }
    new Function('require', 'module', 'exports', out)(req, mod, mod.exports)
    return mod.exports
  }
  return load(entry)
}

function mundo() {
  const agora = Date.now()
  const h = (n: number) => new Date(agora - n * 3600_000).toISOString()
  const pessoas: Array<{ id: string; email: string; last?: string | null; signup?: string | null; ip: string; film?: boolean }> = [
    { id: 'u-us', email: 'ana@exemplo.com', last: 'US', ip: 'US', film: true },
    { id: 'u-de-ip', email: 'ben@exemplo.de', last: null, signup: null, ip: 'DE' },
    { id: 'u-br', email: 'caio@exemplo.com.br', last: 'BR', ip: 'BR', film: true },
    { id: 'u-in', email: 'dev@exemplo.in', signup: 'IN', ip: 'IN' },
    { id: 'u-in-ip-us', email: 'eli@exemplo.com', last: 'IN', ip: 'US' },
    { id: 'u-unk', email: 'fay@exemplo.com', last: null, signup: null, ip: 'XX' },
    { id: 'u-ja', email: 'gus@exemplo.com', last: 'US', ip: 'US' },
    { id: 'u-pagou', email: 'hal@exemplo.com', last: 'GB', ip: 'GB' },
    { id: 'u-sem-porta', email: 'ivy@exemplo.com', last: 'CA', ip: 'CA' },
  ]
  const events: Row[] = []
  pessoas.forEach((p, i) => events.push({ user_id: p.id, name: 'checkout_session_expired', created_at: h(10 + i), metadata: { stripe_session_id: `cs_${p.id}`, tier: 'basic', ip_country: p.ip } }))
  events.push({ user_id: 'u-ja', name: 'checkout_recovery_emailed_v1', created_at: h(200), metadata: {} })
  events.push({ user_id: 'u-pagou', name: 'payment_success', created_at: h(5), metadata: {} })
  const profiles: Row[] = pessoas.map((p) => ({ id: p.id, email: p.email, email_opted_out: false, has_paid: false, signup_country: p.signup ?? null, last_country: p.last ?? null }))
  const videos: Row[] = pessoas.filter((p) => p.film).map((p) => ({ user_id: p.id, title: 'The Lost City of Gold', topic: null, created_at: h(30) }))
  return { events, profiles, videos, tabelas: { events, profiles, videos } as Record<string, Row[]> }
}

function adminDe(tabelas: Record<string, Row[]>, inserts: Row[]) {
  return {
    from(table: string) {
      const filtros: Array<(r: Row) => boolean> = []
      let ordem: { col: string; asc: boolean } | null = null
      const q = {
        select() { return q },
        eq(col: string, v: unknown) { filtros.push((r) => r[col] === v); return q },
        gte(col: string, v: string) { filtros.push((r) => String(r[col]) >= v); return q },
        in(col: string, vs: unknown[]) { filtros.push((r) => vs.includes(r[col])); return q },
        order(col: string, o: { ascending: boolean }) { ordem = { col, asc: o.ascending }; return q },
        range() { return q },
        then(res: (v: { data: Row[]; error: null }) => unknown, rej?: (e: unknown) => unknown) {
          let rows = (tabelas[table] ?? []).filter((r) => filtros.every((f) => f(r)))
          if (ordem) { const { col, asc } = ordem; rows = [...rows].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1)) }
          return Promise.resolve({ data: rows, error: null }).then(res, rej)
        },
        insert(row: Row) { inserts.push(row); (tabelas[table] ??= []).push({ ...row, created_at: new Date().toISOString() }); return Promise.resolve({ error: null }) },
      }
      return q
    },
  }
}

process.env.CRON_SECRET = 'segredo-de-teste'
process.env.RESEND_API_KEY = 're_teste_falso'
process.env.STRIPE_SECRET_KEY = 'sk_test_falso'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-falso'

const fetches: Array<{ url: string; body: Row }> = []
const fetchOriginal = globalThis.fetch
globalThis.fetch = (async (u: string, init?: { body?: string }) => {
  fetches.push({ url: String(u), body: JSON.parse(String(init?.body ?? '{}')) })
  return { ok: true, status: 200, json: async () => ({ id: 'falso' }) }
}) as unknown as typeof fetch

const M = mundo()
const inserts: Row[] = []
const admin = adminDe(M.tabelas, inserts)
const stripeFalso = {
  checkout: { sessions: { retrieve: async (id: string) => (id === 'cs_u-sem-porta'
    ? { after_expiration: { recovery: { url: null } } }
    : { after_expiration: { recovery: { url: `https://checkout.stripe.com/c/pay/${id}#rec`, expires_at: Math.floor(Date.now() / 1000) + 86400 * 20 } } }) } },
}
const rota = carrega('app/api/admin/send-checkout-recovery/route.ts', {
  '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
  '@supabase/supabase-js': { createClient: () => admin },
  '@/lib/stripe': { stripe: stripeFalso },
  '@/lib/supabase/readAll': { readAll: async (fn: () => PromiseLike<unknown>) => await fn() },
  '@/lib/lifecycle/suppression': { loadLifecycleSuppression: async () => ({ isSuppressed: () => false, suppressedCount: 0, degraded: false }) },
}) as { GET: (req: unknown) => Promise<{ json: () => Promise<Row>; status: number }> }

const pedido = (qs: string) => {
  const u = new URL(`https://www.usekineo.com/api/admin/send-checkout-recovery${qs}`)
  return { headers: new Headers({ authorization: 'Bearer segredo-de-teste' }), nextUrl: u, url: u.toString() }
}

console.log('4) a rota real em DRY-RUN (sem confirm=SEND)')
const dry = await (await rota.GET(pedido(''))).json()
ok(dry.mode === 'DRY_RUN', 'modo DRY_RUN')
ok(fetches.length === 0 && inserts.length === 0, 'dry-run: nenhum e-mail, nenhum evento gravado')
ok(dry.com_cupom_first50 === 2, `dry-run conta 2 cartas com FIRST50 (EUA pelo perfil, Alemanha pelo IP) — veio ${dry.com_cupom_first50}`)
ok(JSON.stringify(dry.por_faixa_de_pais) === JSON.stringify({ rico: 2, outro: 3, desconhecido: 1 }) || (dry.por_faixa_de_pais as Row).rico === 2 && (dry.por_faixa_de_pais as Row).outro === 3 && (dry.por_faixa_de_pais as Row).desconhecido === 1, 'faixas: 2 rico · 3 outro · 1 desconhecido')
ok(dry.link_do_cupom === url && dry.oferta_versao === CHECKOUT_RECOVERY_OFFER_VERSION, 'dry-run mostra o link do cupom e a versão da régua')
const lista = (dry.lista as string[]) ?? []
ok(lista.some((l) => l.startsWith('ana@exemplo.com') && /rico\/US · oferta FIRST50$/.test(l)), 'lista: EUA → rico/US · oferta FIRST50')
ok(lista.some((l) => l.startsWith('eli@exemplo.com') && /outro\/IN · oferta none$/.test(l)), 'lista: perfil IN com IP dos EUA → outro/IN · sem cupom (perfil vence)')
ok(lista.some((l) => l.startsWith('fay@exemplo.com') && /desconhecido\/\?\? · oferta none$/.test(l)), 'lista: país desconhecido → sem cupom')
ok(!lista.some((l) => /gus@|hal@|ivy@/.test(l)), 'dedupe e filtros de antes intactos: já recebeu, pagou, sem porta de volta → fora')
const ex = dry.excluidos as Row
ok(ex.ja_recebeu === 1 && ex.pagante === 1 && dry.sem_porta_de_volta_nao_recebem === 1, 'contadores de exclusão: 1 já recebeu · 1 pagou · 1 sem porta')

console.log('5) o envio, com fetch FALSO (nada sai da máquina)')
const env = await (await rota.GET(pedido('?confirm=SEND&limit=30'))).json()
ok(env.mode === 'SENT' && env.enviados === 6 && env.falhas === 0, `6 cartas "enviadas" ao fetch falso (veio ${env.enviados}/${env.falhas})`)
ok(fetches.every((f) => f.url === 'https://api.resend.com/emails'), 'só o endereço do Resend foi chamado (e é falso aqui)')
const cartaDe = (email: string) => fetches.find((f) => f.body.to === email)?.body as { text: string; html: string } | undefined
const ana = cartaDe('ana@exemplo.com')!, ben = cartaDe('ben@exemplo.de')!, caio = cartaDe('caio@exemplo.com.br')!, eli = cartaDe('eli@exemplo.com')!, fay = cartaDe('fay@exemplo.com')!
ok(ana.text.includes(tx) && ana.html.includes(hx), 'EUA: a carta leva o FIRST50 (texto e html)')
ok(ben.text.includes(tx), 'Alemanha (pelo IP da sessão): leva o FIRST50')
const iReply = ana.text.indexOf('I would rather know than guess.'), iCupom = ana.text.indexOf(tx), iPlanos = ana.text.indexOf('If you would rather look at the plans again first')
ok(iReply > 0 && iCupom > iReply && iPlanos > iCupom, 'texto: o cupom vem depois do "foi o preço? responda" e antes do link dos planos')
const hReply = ana.html.indexOf('I would rather know than guess.</p>'), hCupom = ana.html.indexOf(hx), hPlanos = ana.html.indexOf('If you would rather look at <a')
ok(hReply > 0 && hCupom > hReply && hPlanos > hCupom, 'html: mesma ordem')
ok(ana.text.includes('https://checkout.stripe.com/c/pay/cs_u-us#rec') && ana.text.indexOf('https://checkout.stripe.com') < iCupom, 'a porta de volta da Stripe continua sendo o 1º link da carta')
ok(/\n\nIf it was the price: code FIRST50[^\n]*\n[^\n]*\n\nIf you would rather look/.test(ana.text), 'texto: parágrafo próprio, com linha em branco antes e depois')
for (const [nome, c] of [['Brasil', caio], ['Índia (perfil)', eli], ['desconhecido', fay]] as const) {
  ok(!/FIRST50|half off|checkout_recovery_rico/.test(c.text + c.html), `${nome}: carta SEM cupom`)
}
ok(caio.text.split('/pricing?utm_source=lifecycle&utm_medium=email&utm_campaign=checkout_recovery').length === 2 && ana.text.includes('/pricing?utm_source=lifecycle&utm_medium=email&utm_campaign=checkout_recovery'), 'o link dos planos (regra K1) segue nas duas cartas')
const evs = inserts.filter((r) => r.name === 'checkout_recovery_emailed_v1')
const md = (uid: string) => (evs.find((r) => r.user_id === uid)?.metadata ?? {}) as Row
ok(evs.length === 6, '6 eventos checkout_recovery_emailed_v1')
ok(md('u-us').offer === 'FIRST50' && md('u-us').country_tier === 'rico' && md('u-us').offer_country === 'US', 'evento EUA: offer=FIRST50 · country_tier=rico · offer_country=US')
ok(md('u-de-ip').offer === 'FIRST50' && md('u-de-ip').country_tier === 'rico' && md('u-de-ip').offer_country === 'DE', 'evento Alemanha: offer=FIRST50 · rico · DE')
ok(md('u-br').offer === 'none' && md('u-br').country_tier === 'outro', 'evento Brasil: offer=none · outro')
ok(md('u-in-ip-us').offer === 'none' && md('u-in-ip-us').country_tier === 'outro' && md('u-in-ip-us').country === 'US', 'evento Índia-com-IP-EUA: offer=none · outro (o campo antigo country segue sendo o IP da sessão)')
ok(md('u-unk').offer === 'none' && md('u-unk').country_tier === 'desconhecido' && md('u-unk').offer_country === null, 'evento desconhecido: offer=none · desconhecido')
ok(evs.every((r) => (r.metadata as Row).offer_version === CHECKOUT_RECOVERY_OFFER_VERSION && (r.metadata as Row).recovery_url_used === true && !JSON.stringify(r.metadata).includes('checkout.stripe.com')), 'todo evento leva a versão da régua e continua SEM o link pessoal da Stripe')

console.log('6) dedupe: 2ª rodada não reenvia')
const n1 = fetches.length
const env2 = await (await rota.GET(pedido('?confirm=SEND&limit=30'))).json()
ok(env2.enviados === 0 && fetches.length === n1, `2ª rodada: zero envios (veio ${env2.enviados})`)

console.log('7) a carta de quem não é de país rico sai do corpo de sempre')
const src = rd('app/api/admin/send-checkout-recovery/route.ts')
ok(src.includes("if (c.oferta.offer !== 'FIRST50') return { texto, html, offer: 'none' }"), 'sem FIRST50, texto e html saem direto do corpo de sempre')
ok(src.includes('text: carta.texto,') && src.includes('html: carta.html,') && src.includes('offer: carta.offer,'), 'o envio e o evento usam a MESMA carta (offer gravado = o que entrou)')
ok(!/^export (?:function|const) (?!GET\b|maxDuration\b|dynamic\b|fetchCache\b|escolherPortaDeVolta\b)/m.test(src), 'nenhum export novo na rota (Next só aceita os campos de rota; a régua mora no módulo)')

console.log('8) mutante: a régua dá cupom a todo mundo e o guardião pega')
const mutSrc = lib.replace("if (rico) return { offer: CHECKOUT_RECOVERY_PROMO, country_tier: 'rico', country: c }", "return { offer: CHECKOUT_RECOVERY_PROMO, country_tier: 'rico', country: c }")
ok(mutSrc !== lib, 'mutante aplicou')
const mutOut = ts.transpileModule(mutSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
const mutMod = { exports: {} as Record<string, unknown> }
new Function('require', 'module', 'exports', mutOut)((s: string) => (s === '@/lib/freeFilmPolicy' ? { paisDaListaConfirmado: (c: string) => c } : req0(s)), mutMod, mutMod.exports)
ok((mutMod.exports.ofertaDoResgate as typeof ofertaDoResgate)('IN').offer === 'FIRST50', 'mutante é pego: a Índia passaria a receber cupom (o item 1 cairia)')

globalThis.fetch = fetchOriginal
console.log(`\n═══ ${pass} passaram, ${fail} falharam ═══`)
process.exit(fail ? 1 : 0)
