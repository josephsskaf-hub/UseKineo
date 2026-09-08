// ═══════════════════════════════════════════════════════════════════════════
// A CARTA DOS SOCIOS — guardiao da va-r11 (07/09/2026)
// ═══════════════════════════════════════════════════════════════════════════
//
// POR QUE ESTE ARQUIVO EXISTE. O cardapio pedia uma carta para os afiliados
// com "o link deles, o trial de $1, 3 videos da vitrine e a comissao como
// esta". Tres dessas quatro coisas sao faceis de escrever ERRADO de um jeito
// que so aparece quando o socio responde. O que este guardiao impede, em
// ordem de gravidade:
//
//  1. QUE A CASA ELOGIE COM NUMERO QUE NAO SUSTENTA. Medido em 07/09: 25
//     cliques em 5 semanas, 10 deles de 3 IPs no mesmo dia e com UA de robo,
//     e 10 dos 15 socios sem UM clique na vida. "Seu link teve N cliques" e
//     verdade aritmetica e mentira util — quando ele perguntar quantos
//     viraram conta, a resposta e zero. A carta nao cita clique, conversao
//     nem ganho acumulado, para NINGUEM.
//  2. QUE A COMISSAO SEJA DIGITADA. Os 15 estao em 0.4 hoje e a pagina diz
//     "40%" — se alguem mudar a taxa de um socio no banco, a carta tem de
//     mudar com ela. A taxa sai de `affiliates.commission_rate`, por pessoa.
//     (memoria `campo-validado-gravado-ecoado-nao-e-honrado`)
//  3. QUE O SOCIO SEM TAXA CONHECIDA RECEBA CONVITE. Convidar alguem a
//     divulgar sem saber o que se esta prometendo e a promessa sem executor
//     que custou o e-mail "Feeling forgotten" em 22/08.
//  4. QUE A ROTA ENVIE POR PADRAO, sem teto de lote, sem supressao, sem
//     descadastro, ou com o carimbo fora de LIFECYCLE_EMAIL_EVENT_NAMES —
//     um socio TAMBEM e cliente (6 dos 15 receberam outra carta nossa nas
//     24h anteriores a este commit).
//  5. QUE A COORTE SEJA TRUNCADA EM SILENCIO: o PostgREST corta em 1000 sem
//     erro. (auditoria 28/08, "truncamento sistemico")
//
// Roda a funcao REAL (transpileModule) — contar texto nao prova condicao
// (memoria `guardiao-que-conta-texto-nao-prova-condicao`). Onde a checagem e
// de fonte, o mutante prova que APLICOU antes de exigir vermelho (memoria
// `mutacao-precisa-provar-que-aplicou`).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(root, 'node_modules/typescript'))

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }

// CRLF normalizado na LEITURA (memoria `guardiao-crlf-falso-vermelho`).
const read = (p) => readFileSync(path.join(root, p), 'utf8').split('\r\n').join('\n')

function loadTs(p, mocks = {}, srcOverride = null) {
  const src = srcOverride ?? read(p)
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: p }).outputText
  const m = { exports: {} }
  new Function('require', 'module', 'exports', out)((id) => { if (id in mocks) return mocks[id]; throw new Error(`${p}: unexpected import ${id}`) }, m, m.exports)
  return m.exports
}

const ROUTE = 'app/api/admin/send-affiliate-wakeup-1usd/route.ts'
const src = read(ROUTE)
// A fonte SEM comentarios: toda checagem de "nao existe X no codigo" roda
// aqui, senao o proprio bloco de explicacao do topo casa com o padrao
// (memoria `falsificar-mutacao-commitar-antes`).
const codeOnly = src.split('\n').filter((l) => {
  const t = l.trim()
  return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
}).join('\n')

const engine = loadTs('lib/credits/engineCost.ts')
const autopilot = loadTs('lib/autopilot/config.ts', { '@/lib/credits/engineCost': engine })
const pricing = loadTs('lib/checkoutPricing.ts', { '@/lib/credits/engineCost': engine, '@/lib/autopilot/config': autopilot })
const trialFee = loadTs('lib/lifecycle/trialEntryFee.ts', { '@/lib/checkoutPricing': pricing })

const FOOT_HTML = '<!--FOOTER_HTML-->'
const FOOT_TEXT = '\n[FOOTER_TEXT]'
const MOCKS = {
  'next/server': { NextResponse: { json: (b, i) => ({ body: b, init: i }) } },
  '@/lib/supabase/server': { createClient: () => ({}) },
  '@supabase/supabase-js': { createClient: () => ({}) },
  '@/lib/emailSuppression': {
    emailFooterHtml: () => FOOT_HTML,
    emailFooterText: () => FOOT_TEXT,
    unsubscribeHeaders: () => ({ 'List-Unsubscribe': '<x>' }),
  },
  '@/lib/internalAccounts': { isInternalEmail: () => false },
  '@/lib/lifecycle/suppression': { loadLifecycleSuppression: async () => ({ isSuppressed: () => false, suppressedCount: 0, degraded: false }) },
  '@/lib/lifecycle/trialEntryFee': trialFee,
  '@/lib/checkoutPricing': pricing,
}

const load = (srcOverride = null) => loadTs(ROUTE, MOCKS, srcOverride)
const { buildAffiliateWakeupEmail, formatCommissionRate } = load()

const fee = trialFee.trialEntryFeeLabel({ compact: true })
const monthly = trialFee.trialMonthlyAfterLabel({ compact: true })
const P = (over = {}) => ({ id: 'u1', email: 'a@b.com', code: 'PF9HRZ6L', rate: 0.4, ...over })

console.log('\n── 1. A CASA NAO ELOGIA COM NUMERO QUE NAO SUSTENTA')
{
  const m = buildAffiliateWakeupEmail(P())
  const todo = `${m.subject}\n${m.text}\n${m.html}`
  ok(!/\bclicks?\b/i.test(todo), 'a carta nao fala em cliques (10 dos 15 tem zero, e os 25 tem robo dentro)')
  ok(!/\bvisits?\b|\bvisitors?\b/i.test(todo), 'a carta nao fala em visitas ao link')
  ok(!/\bsign-?ups?\b|\breferrals?\b|\bconversions?\b/i.test(todo), 'a carta nao fala em cadastros/indicacoes (sao zero para os 15)')
  ok(!/\bearned\b|\bso far\b|\byou have made\b/i.test(todo), 'a carta nao cita ganho acumulado (nunca houve comissao)')
  ok(!/\bpaid out\b|\bpayout\b|\bnet ?\d+|\bwithin \d+ days\b/i.test(todo), 'a carta nao promete calendario de pagamento que a casa nunca exerceu')
}

console.log('\n── 2. A COMISSAO E A DA PESSOA, LIDA DO BANCO')
{
  const quarenta = buildAffiliateWakeupEmail(P({ rate: 0.4 }))
  const vinteCinco = buildAffiliateWakeupEmail(P({ rate: 0.25 }))
  const meio = buildAffiliateWakeupEmail(P({ rate: 0.5 }))
  ok(quarenta.text.includes('40% recurring'), 'taxa 0.4 → "40% recurring" no texto')
  ok(quarenta.html.includes('40% recurring'), 'taxa 0.4 → "40% recurring" no html')
  ok(vinteCinco.text.includes('25% recurring'), 'taxa 0.25 → a carta diz 25%')
  ok(!/40%/.test(vinteCinco.text + vinteCinco.html), 'taxa 0.25 → NENHUM "40%" chumbado sobrou (o numero da pagina nao vaza)')
  ok(meio.text.includes('50% recurring'), 'taxa 0.5 → a carta diz 50%')
  ok(formatCommissionRate(0.375) === '37.5%', 'taxa quebrada nao vira "37%" nem "38%"')
  ok(!/\b40 ?%|\b0\.4\b/.test(codeOnly.split('export async function GET')[0]), 'nenhuma taxa literal no construtor da carta')
}

console.log('\n── 3. DINHEIRO NUNCA E DIGITADO: taxa de entrada e mensalidade vem do cobrador')
{
  const m = buildAffiliateWakeupEmail(P())
  ok(m.text.includes(fee) && m.subject.includes(fee), `a entrada (${fee}) sai de trialEntryFeeLabel, no corpo e no assunto`)
  ok(m.text.includes(monthly), `a mensalidade (${monthly}) sai de trialMonthlyAfterLabel`)
  ok(!/\$\s?\d/.test(codeOnly), 'nenhum valor em dolar digitado no codigo da rota')
  ok(/trialEntryFullPromise\(/.test(codeOnly), 'a promessa inteira vem da fonte unica, nao remontada a mao')
}

console.log('\n── 4. O LINK E O DO SOCIO, NO HOST CANONICO')
{
  const m = buildAffiliateWakeupEmail(P({ code: 'ccm7gxhy' }))
  ok(m.text.includes('https://www.usekineo.com/a/CCM7GXHY'), 'o codigo vai MAIUSCULO e no host de producao')
  ok(m.html.includes('href="https://www.usekineo.com/a/CCM7GXHY"'), 'o html linka o mesmo endereco')
  ok(!buildAffiliateWakeupEmail(P({ code: 'AAAA1111' })).text.includes('CCM7GXHY'), 'o codigo nao esta chumbado — muda com a pessoa')
  ok(m.text.includes('https://www.usekineo.com/examples'), 'a vitrine com os filmes para postar esta na carta')
}

console.log('\n── 5. DESCADASTRO E RODAPE EM TODA CARTA')
{
  const m = buildAffiliateWakeupEmail(P())
  ok(m.html.includes(FOOT_HTML), 'o rodape de descadastro esta no html')
  ok(m.text.includes(FOOT_TEXT.trim()), 'o rodape de descadastro esta no texto')
  ok(/unsubscribeHeaders\(a\.id\)/.test(codeOnly), 'os headers de descadastro vao no envio, por pessoa')
  ok(/reply_to: REPLY_TO/.test(codeOnly), 'a resposta do socio cai na caixa do fundador')
}

console.log('\n── 6. A ROTA NAO ENVIA POR PADRAO, E O LOTE TEM TETO')
{
  ok(/const confirm = req\.nextUrl\.searchParams\.get\('confirm'\) === 'SEND'/.test(codeOnly), 'so `?confirm=SEND` envia')
  ok(/if \(!confirm\) \{[\s\S]{0,200}mode: 'DRY_RUN'/.test(codeOnly), 'sem confirm, a rota devolve DRY_RUN e nao passa do return')
  ok(/const MAX_BATCH = \d+/.test(codeOnly) && /Math\.min\(limitParam, MAX_BATCH\)/.test(codeOnly), 'o limite pedido nunca ultrapassa MAX_BATCH')
  ok(/alvos\.slice\(0, batch\)/.test(codeOnly), 'o laco de envio percorre no maximo o lote')
  ok(/setTimeout\(r, 600\)/.test(codeOnly), 'pacing de 600ms entre e-mails')
  // MUTANTE: trocar a exigencia do confirm por `true` tem de ficar vermelho.
  const mutante = src.replace(
    "const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'",
    'const confirm = true',
  )
  ok(mutante !== src, 'o mutante do confirm foi realmente aplicado (senao o verde nao vale nada)')
  const mutanteCode = mutante.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
  ok(!/=== 'SEND'/.test(mutanteCode), 'com o mutante, a trava do confirm some — e esta checagem a pegaria')
}

console.log('\n── 7. QUEM FICA DE FORA FICA DE FORA')
{
  ok(/CONTATOS_PROIBIDOS = \['den\.higgins', 'noelrss21', 'emiliomontinari', 'akajitin'\]/.test(codeOnly), 'os 4 contatos proibidos pelo fundador estao na lista')
  ok(/if \(isInternalEmail\(email\) \|\| proibido\(email\)\) continue/.test(codeOnly), 'a lista proibida e o e-mail interno sao APLICADOS no filtro da coorte')
  ok(/\.eq\('status', 'active'\)/.test(codeOnly), 'socio inativo nao recebe convite')
  ok(/if \(!Number\.isFinite\(rate\) \|\| rate <= 0\) continue/.test(codeOnly), 'socio sem taxa conhecida NAO recebe convite (nao se promete o que nao se sabe)')
  ok(/if \(!uid \|\| !email \|\| !code\) continue/.test(codeOnly), 'sem dono, e-mail ou codigo a casa nao tem o que dizer')
  ok(/optOut\.has\(s\.id\)/.test(codeOnly) && /r\.email_opted_out/.test(codeOnly), 'quem pediu para nao receber nao recebe')
  ok(/!jaAvisado\.has\(s\.id\)/.test(codeOnly) && /\.eq\('name', STAMP\)/.test(codeOnly), '1x por pessoa PARA SEMPRE, pelo carimbo')
  ok(/supressao\.isSuppressed\(c\.id\)/.test(codeOnly), 'a supressao de 24h da casa e aplicada na lista final')
}

console.log('\n── 8. O CARIMBO EXISTE, TEM NOME PROPRIO E ESTA REGISTRADO')
{
  ok(/const STAMP = 'affiliate_wakeup_1usd_sent'/.test(codeOnly), 'o carimbo tem nome proprio')
  const registry = read('lib/lifecycle/emailEvents.ts')
  ok(registry.includes("'affiliate_wakeup_1usd_sent'"), 'o carimbo esta em LIFECYCLE_EMAIL_EVENT_NAMES (mesmo commit)')
  ok(/name: STAMP/.test(codeOnly), 'o evento gravado usa a constante, nao uma string repetida')
  // Ancorado no BLOCO da metadata, nao na fonte inteira: o `code` aparece de
  // proposito na resposta de DRY_RUN (JSON de admin, que e como eu confiro a
  // lista antes de disparar). O que nao pode e o codigo virar linha em
  // `events`, que e append-only e lido por tudo.
  const metaBloco = (codeOnly.match(/metadata: \{[\s\S]*?\n\s*\},\n\s*\}\)/) ?? [''])[0]
  ok(metaBloco.length > 0, 'o bloco de metadata do carimbo foi localizado (senao a checagem seguinte e vacante)')
  ok(!/\bcode\b/.test(metaBloco), 'o codigo do socio NAO vai para a analitica (e ativo financeiro dele)')
  ok(/fee: trialEntryFeeLabel/.test(codeOnly), 'o carimbo leva a taxa do deploy — linha sem `fee` e de antes desta carta')
}

console.log('\n── 9. A COORTE NAO E TRUNCADA EM SILENCIO')
{
  ok(/\.range\(from, from \+ 999\)/.test(codeOnly), 'os socios sao lidos PAGINADOS (o PostgREST corta em 1000 sem erro)')
  ok(/if \(!data \|\| data\.length < 1000\) break/.test(codeOnly), 'a paginacao so para quando a pagina vem incompleta')
  ok(/if \(error\) throw error/.test(codeOnly), 'erro de leitura vira excecao, nao coorte vazia silenciosa')
  ok(/if \(pe\) throw pe/.test(codeOnly) && /if \(se\) throw se/.test(codeOnly), 'opt-out e carimbo tambem falham alto em vez de sumir com gente')
}

console.log('\n── 10. O PORTAO DO CARDAPIO: a atribuicao existe antes do convite')
{
  const clique = read('app/a/[code]/route.ts')
  ok(/res\.cookies\.set\(COOKIE, code/.test(clique), 'a rota /a/<code> grava o cookie de atribuicao')
  ok(/res\.cookies\.set\(CLICK_COOKIE, clickProofId/.test(clique), 'a prova de clique acompanha o cookie')
  const callback = read('app/auth/callback/route.ts')
  ok(/finalizeAffiliateSignupAttribution\(\{/.test(callback), 'o cadastro CHAMA a finalizacao (nao e contrato sem chamador)')
  ok(/rawCode: requestCookies\.get\('sf_aff'\)\?\.value/.test(callback), 'a finalizacao recebe o cookie enquanto o OAuth ainda o carrega')
  const webhook = read('app/api/stripe/webhook/route.ts')
  ok(/from\('affiliate_commissions'\)\.insert\(value\)/.test(webhook), 'o pagamento lanca a comissao — a promessa da carta e executavel')
  ok(/status: 'paid', converted_at: convertedAt/.test(webhook), 'o referral vira `paid` quando o dinheiro entra')
}

console.log('\n── 11. A CARTA TEM GATILHO PROPRIO, E ELE NAO PISA EM NINGUEM')
{
  // Sem cron, a carta so sai quando um humano clica — e os ~6 socios que a
  // supressao de 24h segura hoje nunca receberiam (memoria
  // `rota-de-admin-so-com-cookie-nunca-dispara`).
  const vercel = JSON.parse(read('vercel.json'))
  const meu = (vercel.crons ?? []).filter((c) => String(c.path).includes('send-affiliate-wakeup-1usd'))
  ok(meu.length === 1, 'a carta tem exatamente um gatilho no vercel.json')
  ok(String(meu[0]?.path ?? '').includes('confirm=SEND'), 'o gatilho dispara de verdade (confirm=SEND)')
  ok(/limit=\d+/.test(String(meu[0]?.path ?? '')), 'o gatilho leva teto de lote')

  const expandir = (campo, teto) => {
    const out = new Set()
    for (const parte of String(campo).split(',')) {
      if (parte === '*') { for (let i = 0; i < teto; i++) out.add(i); continue }
      const passo = parte.startsWith('*/') ? Number(parte.slice(2)) : null
      if (passo) { for (let i = 0; i < teto; i += passo) out.add(i) } else out.add(Number(parte))
    }
    return [...out]
  }
  const min = (s) => expandir(String(s).split(' ')[0] ?? '', 60)
  const hor = (s) => expandir(String(s).split(' ')[1] ?? '', 24)
  const meusMin = new Set(min(meu[0]?.schedule ?? ''))
  const minhasH = new Set(hor(meu[0]?.schedule ?? ''))
  ok(meusMin.size > 0 && minhasH.size > 0, 'o horario do gatilho foi lido (senao a checagem seguinte e vacante)')
  const colisoes = []
  for (const c of vercel.crons ?? []) {
    if (String(c.path).includes('send-affiliate-wakeup-1usd')) continue
    const mesmoMin = min(c.schedule).some((m) => meusMin.has(m))
    const mesmaHora = hor(c.schedule).some((h) => minhasH.has(h))
    if (mesmoMin && mesmaHora) colisoes.push(String(c.path).split('?')[0])
  }
  ok(colisoes.length === 0, `nenhum job compartilha minuto E hora com a carta (colisoes: ${colisoes.join(', ') || 'nenhuma'})`)
}

console.log(`\n${n - fail} ok / ${fail} falhas`)
process.exit(fail === 0 ? 0 : 1)
