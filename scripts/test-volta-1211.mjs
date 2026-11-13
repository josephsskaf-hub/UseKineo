// KINEO-VOLTA-1211 — guardião da carta de volta para a base (lib/growth/volta1211.ts + app/api/admin/send-volta-1211/route.ts).
// Executa a biblioteca real (segmento, língua, link, carta, ondas, régua de parada) e lê a rota: ensaio por padrão, envio
// trancado pelo interruptor, supressão de 7 dias, carta uma vez na vida, carimbo na lista da casa. Depois devolve cada defeito
// ao código, em memória, e exige vermelho. Rodar: node scripts/test-volta-1211.mjs
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(ROOT, 'package.json'))
const ts = require('typescript')
const rd = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const LIB = 'lib/growth/volta1211.ts'
const ROTA = 'app/api/admin/send-volta-1211/route.ts'
const EVT = 'lib/lifecycle/emailEvents.ts'
const SRV = 'app/api/events/route.ts'
const QUOTA = 'lib/email/quota.ts'
const SRC = Object.fromEntries([LIB, ROTA, EVT, SRV, QUOTA].map((p) => [p, rd(p)]))

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
  return exec(join(ROOT, LIB))
}

const DIA = 86_400_000
const NOW = Date.UTC(2026, 10, 12, 16)
const VID = '0f1e2d3c-4b5a-4968-8776-655443322110'
const FOOT = { text: '[unsubscribe]', html: '<p>[unsubscribe]</p>' }
const PRECO = /(\$|US\$|R\$|€)\s?\d|\d+\s?%|discount|desconto|descuento|free credits?|créditos? grát|créditos? gratis|bonus|bônus|coupon|cupom|cupón|\bfree film|filme grátis|video gratis/i

function battery(src) {
  const p = []
  const ok = (c, m) => { if (!c) p.push(m) }
  let L
  try { L = carregar(src) } catch (e) { return ['não carrega: ' + e.message] }
  const f = (o) => ({ paid: false, optedOut: false, internal: false, films: 0, downloaded: false, regionPaidOnly: false, lastActiveMs: NOW - 10 * DIA, nowMs: NOW, ...o })
  const seg = (o) => { const r = L.voltaSegmento(f(o)); return r.seg ?? 'fora:' + r.fora }

  // 1. segmentos
  ok(seg({ films: 2, downloaded: true }) === 'c_baixou', 'baixou e parado → c_baixou')
  ok(seg({ films: 1 }) === 'a_filme_parado', 'filme e parado 7+ dias → a_filme_parado')
  ok(seg({ films: 1, lastActiveMs: NOW - 2 * DIA }) === 'fora:ativo_7d', 'filme com atividade nos 7 dias fica fora')
  ok(seg({ regionPaidOnly: true }) === 'd_pais_pago', 'sem filme, país pago-só → d')
  ok(seg({}) === 'b_sem_filme' && seg({ lastActiveMs: null }) === 'b_sem_filme', 'sem filme → b (sem atividade conta como parado)')
  ok(seg({ paid: true, films: 3, downloaded: true }) === 'fora:pagante', 'pagante nunca recebe')
  ok(seg({ optedOut: true, films: 1 }) === 'fora:opt_out', 'quem pediu para sair nunca recebe')
  ok(seg({ internal: true }) === 'fora:interno', 'conta da casa nunca recebe')
  // 2. língua
  ok(L.voltaLingua('br') === 'pt' && L.voltaLingua('MX') === 'es' && L.voltaLingua('US') === 'en' && L.voltaLingua(null) === 'en', 'língua pelo país')
  // 3. link
  const lf = new URL(L.voltaLink('https://www.usekineo.com/', { videoId: VID, idea: 'x' }))
  ok(lf.pathname === '/history' && lf.searchParams.get('v') === VID, 'com filme: a página do PRÓPRIO filme')
  ok(lf.searchParams.get('utm_source') === 'lifecycle' && lf.searchParams.get('utm_campaign') === 'volta_1211', 'utm_source=lifecycle & utm_campaign=volta_1211')
  const ls = new URL(L.voltaLink('https://www.usekineo.com', { videoId: 'nao-e-id', idea: 'A storm over the sea\nnow' }))
  ok(ls.pathname === '/studio/create' && ls.searchParams.get('prompt') === 'A storm over the sea now', 'sem filme: Studio com a ideia na caixa (sem quebra de linha)')
  ok(!ls.searchParams.has('create_intent') && !ls.searchParams.has('autostart'), 'nada começa sozinho')
  ok(!new URL(L.voltaLink('https://x.co', { idea: null })).searchParams.has('prompt'), 'sem ideia: sem prompt')
  // 4. cartas: 4 segmentos × 3 línguas, sem preço, sem desconto, sem crédito, sem filme grátis; rodapé de descadastro sempre
  for (const s of L.VOLTA_1211_ORDEM) for (const lg of ['en', 'pt', 'es']) {
    const c = L.voltaCarta({ seg: s, lingua: lg, film: s.startsWith('b') || s.startsWith('d') ? null : 'Boiling River', idea: 'A storm', link: 'https://x.co/l', footer: FOOT })
    ok(c.subject.length > 5 && !/[\r\n]/.test(c.subject), `${s}/${lg}: assunto de uma linha`)
    ok(!PRECO.test(c.subject + c.text), `${s}/${lg}: sem preço, desconto, crédito ou filme grátis`)
    ok(c.text.includes('[unsubscribe]') && c.html.includes('[unsubscribe]'), `${s}/${lg}: rodapé de descadastro`)
    ok(c.text.includes('https://x.co/l') && c.html.includes('href="https://x.co/l"'), `${s}/${lg}: o link vai no corpo`)
    if (s === 'c_baixou' || s === 'a_filme_parado') ok(c.subject.includes('Boiling River'), `${s}/${lg}: o filme dela no assunto`)
  }
  const pt = L.voltaCarta({ seg: 'b_sem_filme', lingua: 'pt', film: null, idea: null, link: 'l', footer: FOOT })
  ok(!/ideia na caixa/.test(pt.text), 'sem ideia, a carta não promete caixa preenchida')
  ok(L.voltaCarta({ seg: 'a_filme_parado', lingua: 'en', film: '<b>x</b>', idea: null, link: 'l', footer: FOOT }).html.includes('&lt;b&gt;'), 'HTML escapado')
  // 5. ondas e régua
  ok(L.voltaOndaDoDia(1, 1000) === 50 && L.voltaOndaDoDia(2, 1000) === 100 && L.voltaOndaDoDia(1, 20) === 20 && L.voltaOndaDoDia(30, 5000) === 1000, 'ondas crescem e nunca passam da vaga do dia')
  ok(L.voltaPararOnda({ enviados: 1000, spam: 1, bounces: 0, descadastros: 0, cliques: 50 }) === 'spam', 'spam 0,1% para')
  ok(L.voltaPararOnda({ enviados: 100, spam: 0, bounces: 4, descadastros: 0, cliques: 5 }) === 'bounce', 'bounce 4% para')
  ok(L.voltaPararOnda({ enviados: 100, spam: 0, bounces: 0, descadastros: 1, cliques: 5 }) === 'descadastro', 'descadastro 1% para')
  ok(L.voltaPararOnda({ enviados: 200, spam: 0, bounces: 0, descadastros: 0, cliques: 1 }) === 'clique', 'clique < 1% em 200 para')
  ok(L.voltaPararOnda({ enviados: 200, spam: 0, bounces: 2, descadastros: 1, cliques: 6 }) === null, 'onda limpa segue')
  // 6. a rota
  const r = src[ROTA]
  ok(L.VOLTA_1211_SEND_LIVE === false, 'o envio nasce trancado')
  ok(r.includes("if (confirm && !VOLTA_1211_SEND_LIVE) {") && r.indexOf('if (confirm && !VOLTA_1211_SEND_LIVE)') < r.indexOf('createAdminClient(url'), 'trancado responde antes de abrir o banco')
  ok(r.includes("req.nextUrl.searchParams.get('confirm') === 'SEND'"), 'só a string exata SEND arma')
  ok(r.indexOf("if (!confirm) {") > 0 && r.indexOf("if (!confirm) {") < r.indexOf("fetch('https://api.resend.com/emails'"), 'o ensaio devolve antes de qualquer fetch ao Resend')
  ok(r.includes('loadLifecycleSuppression(admin, candidatos.map((c) => c.id), VOLTA_1211_SUPPRESSION_HOURS)') && L.VOLTA_1211_SUPPRESSION_HOURS === 168, 'supressão de 7 dias')
  ok(r.includes("if (degradada || usadosHoje === null) {"), 'supressão ou cota ilegível: não envia (falha fechada)')
  ok(r.includes('if (recebeu.has(v.id)) { fora.ja_recebeu++; continue }') && r.includes('VOLTA_1211_SENT, VOLTA_1211_CLAIM'), 'esta carta uma vez na vida')
  ok(r.includes('if (vistos.has(email)) { fora.alias_repetido++; continue }'), 'um endereço, uma carta')
  ok(r.includes('if (pagou.has(v.id)) { fora.pagou++; continue }') && r.includes('winbackProfileOk(p)'), 'pagante, opt-out e e-mail inválido fora')
  ok(r.includes("priority: 'growth'") && r.includes("const tetoGrowth = capForPriority('growth')") && !/dailyCap() * 0.d/.test(r), 'growth: a vaga vem do teto único (capForPriority), sem multiplicar solto')
  ok(r.includes('headers: unsubscribeHeaders(a.id)'), 'List-Unsubscribe no envio')
  ok(L.VOLTA_1211_BATCH_MAX <= 50, 'lote máximo 50')
  ok(L.VOLTA_1211_REPLY_TO === 'support@usekineo.com' && r.includes('reply_to: VOLTA_1211_REPLY_TO'), 'resposta cai na caixa varrida (support@)')
  // 7. ordem travada: o envio só alcança c no dia 1
  ok(JSON.stringify(L.VOLTA_1211_SEGMENTOS_LIBERADOS) === JSON.stringify(['c_baixou']), 'dia 1: só o segmento c liberado')
  ok(L.voltaSegmentoLiberado('c_baixou') && !L.voltaSegmentoLiberado('a_filme_parado') && !L.voltaSegmentoLiberado('b_sem_filme') && !L.voltaSegmentoLiberado('d_pais_pago'), 'a, d e b trancados')
  ok(r.includes('if (confirm && !voltaSegmentoLiberado(r.seg)) { fora.nao_liberado++; continue }'), 'o envio pula segmento não liberado')
  // 8. o teto do Resend mora num lugar só
  const qq = src[QUOTA]
  ok(/export const RESEND_TETO_DIARIO: Readonly<Record<ResendPlano, number>> = { free: 100, pro: 1600 }/.test(qq), 'teto: free 100, pro 1600 (50.000 ÷ 31)')
  ok(qq.includes("export const RESEND_PLANO = 'free' as ResendPlano"), 'hoje é o plano free')
  ok(qq.includes('Math.min(Math.floor(raw), doPlano) : doPlano'), 'a env só baixa o teto, nunca sobe acima do plano')
  ok(!/KINEO_EMAIL_DAILY_CAP|RESEND_TETO_DIARIO/.test(r), 'a rota não tem teto próprio')
  ok(qq.includes('return Math.floor(dailyCap() * yieldThreshold(priority))'), 'capForPriority usa o mesmo limiar da cota')
  ok(src[EVT].includes("'volta_1211_emailed',"), 'o carimbo entra na supressão da casa')
  ok(src[SRV].includes("'volta_1211_emailed',") && src[SRV].includes("'volta_1211_claimed',"), 'o navegador não forja o carimbo')
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS volta 1211: 4 segmentos, filme como isca, sem preço, 7 dias de supressão, envio trancado' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++
const muta = (rel, from, to) => {
  if (!SRC[rel].includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from.slice(0, 70)}`)
  return { ...SRC, [rel]: SRC[rel].replace(from, to) }
}
const MUTANTES = [
  ['envio destrancado', muta(LIB, 'VOLTA_1211_SEND_LIVE = false as boolean', 'VOLTA_1211_SEND_LIVE = true as boolean')],
  ['supressão de 24 h', muta(LIB, 'VOLTA_1211_SUPPRESSION_HOURS = 168', 'VOLTA_1211_SUPPRESSION_HOURS = 24')],
  ['pagante recebe', muta(LIB, "  if (f.paid) return { fora: 'pagante' }\n", '')],
  ['opt-out recebe', muta(LIB, "  if (f.optedOut) return { fora: 'opt_out' }\n", '')],
  ['ativo recebe', muta(LIB, "    if (!parado) return { fora: 'ativo_7d' }\n", '')],
  ['baixou vira a', muta(LIB, "f.downloaded ? 'c_baixou' : 'a_filme_parado'", "'a_filme_parado'")],
  ['link sem a página do filme', muta(LIB, '`${b}/history?${', '`${b}/studio/create?${')],
  ['utm errado', muta(LIB, "utm_campaign: VOLTA_1211_CAMPAIGN }", "utm_campaign: 'winback' }")],
  ['autostart', muta(LIB, "...UTM, ...(idea ? { prompt: idea } : {})", "...UTM, create_intent: '1', ...(idea ? { prompt: idea } : {})")],
  ['crédito como isca', muta(LIB, "'Type one sentence: Kineo writes the script, picks the scenes and narrates it.'", "'Your 10 free credits are waiting.'")],
  ['filme grátis prometido', muta(LIB, "subject: 'Seu primeiro filme está a uma frase'", "subject: 'Seu filme grátis está a uma frase'")],
  ['sem rodapé', muta(LIB, "'', input.footer.text].join", "''].join")],
  ['HTML sem escape', muta(LIB, '`<p style="margin:0 0 14px">${esc(l)}</p>`', '`<p style="margin:0 0 14px">${l}</p>`')],
  ['onda sem teto da vaga', muta(LIB, 'Math.min(VOLTA_1211_ONDAS[i], Math.floor(vagaDoDia))', 'VOLTA_1211_ONDAS[i]')],
  ['régua sem spam', muta(LIB, "  if (m.spam / m.enviados >= 0.001) return 'spam'\n", '')],
  ['rota sem tranca', muta(ROTA, 'if (confirm && !VOLTA_1211_SEND_LIVE) {', 'if (false) {')],
  ['rota com supressão de 24 h', muta(ROTA, ', VOLTA_1211_SUPPRESSION_HOURS)', ')')],
  ['rota reenvia a mesma carta', muta(ROTA, 'if (recebeu.has(v.id)) { fora.ja_recebeu++; continue }', '')],
  ['rota envia com supressão cega', muta(ROTA, 'if (degradada || usadosHoje === null) {', 'if (usadosHoje === null) {')],
  ['carimbo fora da supressão', muta(EVT, "  'volta_1211_emailed',\n", '')],
  ['c, a, d e b liberados juntos', muta(LIB, "VOLTA_1211_SEGMENTOS_LIBERADOS: readonly VoltaSegmento[] = ['c_baixou']", "VOLTA_1211_SEGMENTOS_LIBERADOS: readonly VoltaSegmento[] = ['c_baixou', 'a_filme_parado', 'd_pais_pago', 'b_sem_filme']")],
  ['rota ignora a ordem', muta(ROTA, 'if (confirm && !voltaSegmentoLiberado(r.seg)) { fora.nao_liberado++; continue }', '')],
  ['plano pro ligado sem pagamento', muta(QUOTA, "RESEND_PLANO = 'free' as ResendPlano", "RESEND_PLANO = 'pro' as ResendPlano")],
  ['env sobe o teto', muta(QUOTA, 'Math.min(Math.floor(raw), doPlano) : doPlano', 'Math.floor(raw) : doPlano')],
  ['teto solto na rota', muta(ROTA, "const tetoGrowth = capForPriority('growth')", 'const tetoGrowth = Math.floor(dailyCap() * 0.6)')],
  ['resposta para caixa cega', muta(LIB, "VOLTA_1211_REPLY_TO = 'support@usekineo.com'", "VOLTA_1211_REPLY_TO = 'hello@usekineo.com'")],
  ['carimbo forjável', muta(SRV, "  'volta_1211_claimed',\n", '')],
]
let killed = 0
for (const [nome, src] of MUTANTES) {
  let p
  try { p = battery(src) } catch (e) { p = [`lançou: ${e.message}`] }
  if (p.length > 0) killed++
  else { failed++; console.log(`SOBREVIVEU mutante: ${nome}`) }
}
console.log(`mutantes: ${killed}/${MUTANTES.length} mortos`)
if (failed) { console.log('FAIL'); process.exit(1) }
console.log('OK')
