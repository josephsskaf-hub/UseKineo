// KINEO-VOLTA-STATUS-1311 — guardião da rota que mostra o estado da carta de volta no Resend (sem o painel).
// Executa a biblioteca real (casamento pela lista, contagem, régua) e lê a rota: só admin, só leitura (nenhuma escrita no banco,
// nenhum POST ao Resend), nenhum endereço na resposta, User-Agent e pausa de 10 req/s, e o envio guardando o resend_id.
// Depois devolve cada defeito ao código, em memória, e exige vermelho. Rodar: node scripts/test-volta-status-1311.mjs
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(ROOT, 'package.json'))
const ts = require('typescript')
const rd = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const LIB = 'lib/growth/volta1211Status.ts'
const ROTA = 'app/api/admin/volta-1211-status/route.ts'
const ENVIO = 'app/api/admin/send-volta-1211/route.ts'
const SRC = Object.fromEntries([LIB, ROTA, ENVIO].map((p) => [p, rd(p)]))

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

const T0 = Date.UTC(2026, 10, 13, 16, 40)
const iso = (ms) => new Date(ms).toISOString()
const pg = (ms) => new Date(ms).toISOString().replace('T', ' ').replace('Z', '+00') // formato "2026-11-13 16:40:00.000+00"

async function battery(src) {
  const p = []
  const ok = (c, m) => { if (!c) p.push(m) }
  let L
  try { L = carregar(src) } catch (e) { return ['não carrega: ' + e.message] }
  // 1. estados documentados
  ok(['bounced', 'complained', 'delivered', 'opened', 'clicked', 'delivery_delayed', 'suppressed', 'failed'].every((e) => L.RESEND_LAST_EVENTS.includes(e)), 'os estados do Resend estão todos')
  ok(L.normalizarEstado('bounced') === 'bounced' && L.normalizarEstado('novo_estado') === 'outro' && L.normalizarEstado(null) === 'sem_estado', 'estado desconhecido não vira entregue')
  ok(L.resendMs(pg(T0)) === T0 && L.resendMs(iso(T0)) === T0 && L.resendMs('lixo') === null, 'created_at nos dois formatos')
  // 2. casamento pela lista
  const enviados = [
    { email: 'A@x.co', stampMs: T0, resendId: null },
    { email: 'b@x.co', stampMs: T0 + 60_000, resendId: null },
    { email: 'c@x.co', stampMs: T0, resendId: 'id-c' },
    { email: 'd@x.co', stampMs: T0, resendId: null },
  ]
  const lista = [
    { id: 'l1', to: ['a@x.co'], created_at: pg(T0 - 5_000), last_event: 'complained' },
    { id: 'l0', to: ['a@x.co'], created_at: pg(T0 - 3 * 86_400_000), last_event: 'delivered' }, // outra carta, dias antes
    { id: 'l2', to: ['b@x.co'], created_at: pg(T0 + 55_000), last_event: 'bounced' },
    { id: 'l3', to: ['c@x.co'], created_at: pg(T0), last_event: 'delivered' },
    { id: 'l4', to: ['d@x.co'], created_at: pg(T0 + 30 * 60_000), last_event: 'delivered' }, // fora da janela
  ]
  const m = L.casarPelaLista(enviados, lista)
  ok(m.get(0) === 'complained', 'casa pelo destinatário (sem maiúscula) e pelo horário do carimbo')
  ok(m.get(1) === 'bounced', 'cada enviado acha o seu')
  ok(!m.has(2), 'quem tem resend_id não é casado pela lista')
  ok(!m.has(3), 'e-mail fora da janela do carimbo não casa')
  const dois = L.casarPelaLista([{ email: 'a@x.co', stampMs: T0, resendId: null }, { email: 'a@x.co', stampMs: T0, resendId: null }], [lista[0]])
  ok(dois.size === 1, 'um e-mail da lista casa uma vez só')
  ok(L.listaPassouDoInicio([{ id: 'x', to: [], created_at: pg(T0 - 3_600_000), last_event: null }], T0) && !L.listaPassouDoInicio([{ id: 'x', to: [], created_at: pg(T0), last_event: null }], T0), 'a lista para quando passa do 1º carimbo')
  ok(L.VOLTA_LISTA_MAX_PAGINAS <= 100, 'teto de páginas da lista')
  // 3. contagem e régua
  const c = L.contarEstados(['bounced', 'complained', 'complained', 'sem_estado', 'delivered'])
  ok(c.bounced === 1 && c.complained === 2 && c.sem_estado === 1 && c.delivered === 1 && c.opened === 0, 'contagem por estado')
  const R = (o) => L.voltaRegua({ enviados: 50, spam: 0, devolvidos: 0, descadastros: 0, visitas: 3, semEstado: 0, ...o })
  ok(R({}).veredito === 'segue', 'lote limpo segue')
  ok(R({ spam: 1 }).veredito === 'OLHAR', '1 spam = olhar')
  ok(R({ spam: 2 }).veredito === 'PARA', '2 spam = PARA')
  ok(R({ devolvidos: 2 }).veredito === 'PARA' && R({ devolvidos: 1 }).veredito === 'segue', 'devolvidos ≥ 3% = PARA (2 de 50 sim, 1 não)')
  ok(R({ descadastros: 1 }).veredito === 'PARA', 'descadastro ≥ 1% = PARA')
  ok(R({ enviados: 200, visitas: 1 }).veredito === 'PARA' && R({ enviados: 199, visitas: 0 }).veredito === 'segue', 'visitas < 1% só depois de 200')
  ok(R({ semEstado: 26 }).veredito === 'OLHAR', 'mais da metade sem estado = olhar (não decide às cegas)')
  ok(R({ spam: 2 }).motivos.length > 0 && R({}).motivos.length === 0, 'PARA diz o motivo')
  // 4. a rota
  const r = src[ROTA]
  ok(r.includes("if (!user || !ADMIN_EMAILS.has((user.email ?? '').trim().toLowerCase())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })"), 'só admin')
  ok(!/\.(insert|update|upsert|delete)\(|registrarCorrida|recordEmailSend|recordResendResponse/.test(r), 'só leitura: nada é gravado')
  ok(!/method:\s*'(POST|PUT|PATCH|DELETE)'/.test(r) && !/api\.resend\.com\/emails['`]\s*,\s*\{\s*method/.test(r), 'nenhum envio ao Resend')
  ok(r.includes("'User-Agent': 'kineo-admin-volta-status/1.0'"), 'User-Agent (o Resend devolve 403 sem ele)')
  ok(/const PAUSA_MS = (\d+)/.test(r) && +/const PAUSA_MS = (\d+)/.exec(r)[1] >= 100, 'pausa ≥ 100 ms (10 req/s do Resend)')
  ok(r.includes('`/emails/${encodeURIComponent(rid)}`') && r.includes('`/emails?limit=100${after ?'), 'por id quando existe; pela lista para os sem id')
  const resposta = r.slice(r.indexOf('return NextResponse.json({\n      campanha'))
  ok(resposta.length > 0 && !/\bemail\b|\bids\b(?!\.length)|user_id|\buid\b/.test(resposta.slice(0, resposta.indexOf('} catch'))), 'nenhum endereço nem id de pessoa na resposta')
  ok(r.includes('regua,') && r.includes('spam: total.complained, devolvidos: total.bounced, descadastros, visitas: visitou.size, semEstado: total.sem_estado'), 'a régua vai na resposta com os números certos')
  ok(r.includes(".eq('metadata->>utm_campaign', VOLTA_1211_CAMPAIGN)"), 'visitas pela utm da carta')
  ok(r.includes('saiu >= (porPessoa.get(uid)?.stampMs ?? Infinity)'), 'descadastro só conta depois da carta')
  // 5. KINEO-VOLTA-STATUS-ERRO-1311 — a 1ª recusa do Resend aparece: código HTTP e o name do erro, nada mais
  const corpo = (o) => ({ json: async () => o })
  ok((await L.nomeDoErroResend(corpo({ statusCode: 401, message: 'This API key is restricted to only send emails.', name: 'restricted_api_key' }))) === 'restricted_api_key', 'name do erro do Resend lido')
  ok((await L.nomeDoErroResend(corpo({ name: 'Bearer re_abc123 <x>' }))) === null && (await L.nomeDoErroResend(corpo(null))) === null, 'name que não é identificador simples vira null (sem texto livre)')
  ok((await L.nomeDoErroResend({ json: async () => { throw new Error('html') } })) === null, 'corpo que não é JSON não derruba')
  ok(r.includes('const falhou = async (r: Response) => { falhasResend++; if (!primeiraFalha) primeiraFalha = { http: r.status, erro: await nomeDoErroResend(r) } }'), 'guarda só a 1ª falha: código e name')
  ok(r.includes('} else await falhou(r)') && r.includes('if (!r.ok) { await falhou(r); break }'), 'as duas leituras (por id e lista) registram a falha')
  ok(r.includes('falhas_resend: falhasResend, primeira_falha: primeiraFalha }'), 'a falha vai em leitura.primeira_falha')
  ok(!/message|statusText|resendKey\s*[,}]|Authorization[^\n]*primeira/.test(r.slice(r.indexOf('return NextResponse.json({\n      campanha'), r.indexOf('  } catch (e) {'))), 'nada de mensagem, corpo ou chave na resposta')
  // 6. o envio guarda o id
  const e = src[ENVIO]
  ok(e.includes("resend_id: resendId } })") && e.includes("const resendId = typeof corpo?.id === 'string' && corpo.id ? corpo.id : null"), 'o envio guarda o id do Resend no carimbo')
  ok(e.includes("(await res.json().catch(() => null))"), 'resposta sem corpo não derruba o carimbo')
  ok(e.includes("tags: [{ name: 'campaign', value: VOLTA_1211_CAMPAIGN }]"), 'a carta leva a etiqueta da campanha')
  return p
}

let failed = 0
const base = await battery(SRC)
console.log(base.length === 0 ? 'PASS volta-status: lê o Resend, conta por estado, régua, nenhum endereço, só leitura' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++
const muta = (rel, from, to) => {
  if (!SRC[rel].includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from.slice(0, 70)}`)
  return { ...SRC, [rel]: SRC[rel].replace(from, to) }
}
const MUTANTES = [
  ['estado desconhecido vira entregue', muta(LIB, "(raw as ResendLastEvent) : 'outro'", "(raw as ResendLastEvent) : 'delivered'")],
  ['casa sem janela', muta(LIB, '      if (ms === null || ms < e.stampMs - VOLTA_MATCH_ANTES_MS || ms > e.stampMs + VOLTA_MATCH_DEPOIS_MS) continue\n', '')],
  ['casa sem destinatário', muta(LIB, "      if (!l.to.some((t) => typeof t === 'string' && t.trim().toLowerCase() === alvo)) continue\n", '')],
  ['e-mail da lista casa duas vezes', muta(LIB, '      if (usados.has(l.id)) continue\n', '')],
  ['quem tem id casa pela lista', muta(LIB, '    if (e.resendId) return\n', '')],
  ['1 spam já para', muta(LIB, 'if (m.spam >= 2) para.push', 'if (m.spam >= 1) para.push')],
  ['devolvidos a 10%', muta(LIB, 'm.devolvidos / m.enviados >= 0.03', 'm.devolvidos / m.enviados >= 0.1')],
  ['sem régua de descadastro', muta(LIB, "  if (m.enviados > 0 && m.descadastros / m.enviados >= 0.01) para.push(`descadastros: ${m.descadastros} de ${m.enviados} (≥ 1%)`)\n", '')],
  ['cego decide', muta(LIB, "  if (m.enviados > 0 && m.semEstado * 2 > m.enviados) olhar.push(`sem estado no Resend: ${m.semEstado} de ${m.enviados}`)\n", '')],
  ['rota aberta', muta(ROTA, "if (!user || !ADMIN_EMAILS.has((user.email ?? '').trim().toLowerCase())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })", 'if (false) return null as never')],
  ['rota grava', muta(ROTA, '    // ── 4. contagem', "    await admin.from('events').insert({ name: 'volta_status_lido' })\n    // ── 4. contagem")],
  ['sem User-Agent', muta(ROTA, "'User-Agent': 'kineo-admin-volta-status/1.0'", "'X-Client': 'kineo'")],
  ['sem pausa', muta(ROTA, 'const PAUSA_MS = 120', 'const PAUSA_MS = 0')],
  ['endereço na resposta', muta(ROTA, '      descadastros,\n      visitas_pela_carta', '      descadastros,\n      emails: enviados.map((e) => e.email),\n      visitas_pela_carta')],
  ['régua sem spam', muta(ROTA, 'spam: total.complained, devolvidos: total.bounced, descadastros,', 'spam: 0, devolvidos: total.bounced, descadastros,')],
  ['descadastro antigo conta', muta(ROTA, 'saiu >= (porPessoa.get(uid)?.stampMs ?? Infinity)', 'saiu > 0')],
  ['falha sem código', muta(ROTA, 'primeiraFalha = { http: r.status, erro: await nomeDoErroResend(r) }', 'primeiraFalha = { http: 0, erro: await nomeDoErroResend(r) }')],
  ['falha da lista some', muta(ROTA, 'if (!r.ok) { await falhou(r); break }', 'if (!r.ok) { falhasResend++; break }')],
  ['falha fora da resposta', muta(ROTA, ', primeira_falha: primeiraFalha }', ' }')],
  ['texto livre do provedor', muta(LIB, "return /^[a-z][a-z0-9_]{0,63}$/.test(n) ? n : null", 'return n || null')],
  ['envio não guarda o id', muta(ENVIO, 'resend_id: resendId } })', '} })')],
  ['envio sem etiqueta', muta(ENVIO, ", tags: [{ name: 'campaign', value: VOLTA_1211_CAMPAIGN }]", '')],
]
let killed = 0
for (const [nome, src] of MUTANTES) {
  let p
  try { p = await battery(src) } catch (e) { p = [`lançou: ${e.message}`] }
  if (p.length > 0) killed++
  else { failed++; console.log(`SOBREVIVEU mutante: ${nome}`) }
}
console.log(`mutantes: ${killed}/${MUTANTES.length} mortos`)
if (failed) { console.log('FAIL'); process.exit(1) }
console.log('OK')
