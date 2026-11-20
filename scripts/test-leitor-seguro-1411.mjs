// KINEO-LEITOR-SEGURO-1411 [CEO 14/11: o leitor semântico faltou em 16% dos filmes em 30 dias] — guardião. Prova OFFLINE, EXECUTANDO a leitura real
// (lib/cinematic/elencoSemantico pedirElencoSemantico) com um fetch falso e a resposta REAL gravada do caso "prod-max" (docs/calibracao).
// Tempos encolhidos: (A) filme rápido, 1 chamada; (B) a 1ª lenta, a de segurança vence e a perdedora é ABORTADA; (C) a 1ª inválida espera a 2ª no ar;
// (D) rede e HTTP repetem até 2 vezes; (E) as duas estouram no teto; (K) opção B; (L) o limite de 4 chamadas (o "cinco" do revisor).
// Constantes REAIS (3,5 s · 7 s · 9 s · 250 ms · 1 s): (H) 1ª de 5 s → a de segurança vence; (I) penduradas soltam aos 9 s; (P) o prazo de 7 s por chamada
// com fetch que IGNORA o abort; (R) o relógio de 9 s com corpo que pendura; (S) o respiro de 250 ms; (T) 429 repete UMA vez, depois de 1 s.
// (J) nunca mais de 2 no ar, por caso. (F) evento: quem venceu e a versão nova só com o leitor seguro rodando. (G) 'off' e 'internal' de cliente = a main
// byte a byte (a lib da origin/main nos mesmos casos). (M) mutantes vermelhos, inclusive os 10 do revisor independente de 19/11.
// O commit nasce 'off' (CEO 19/11): as provas ligam a cópia carregada em 'all'.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { execFileSync } from 'node:child_process'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const ES = 'lib/cinematic/elencoSemantico.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const lf = (t) => String(t).replace(/\r\n/g, '\n')
// [CEO 20/11] o commit nasce 'off' ou 'internal' (a integração da prova C): as provas ligam a cópia em 'all'; cliente em 'internal' = a main
const DESLIGADO = /export const LEITOR_SEGURO_1411: 'off' \| 'internal' \| 'all' = '(?:off|internal)'/
const LIGA = (s) => s.replace(DESLIGADO, "export const LEITOR_SEGURO_1411: 'off' | 'internal' | 'all' = 'all'")
const carrega = (mutar = null, ligar = true) => createOfflineLoader({ globals: { AbortController, setTimeout, clearTimeout, Response }, source: (rel, text) => (rel === ES ? (mutar ?? ((x) => x))(ligar ? LIGA(lf(text)) : lf(text)) : text) })
const calib = JSON.parse(fs.readFileSync('docs/calibracao/protagonista-seedance-0111.json', 'utf8'))
const MAX = calib.casos.find((c) => c.id === 'prod-max')
const resposta = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const BOM = () => resposta({ choices: [{ message: { content: MAX.resposta.raw } }] })
const RUIM = () => resposta({ choices: [{ message: { content: '{"protagonist":{"name":"Rex","kind":"human"},"supporting":[],"places_and_orgs":[]}' } }] })
const espera = (ms, sinal, valor) => new Promise((res, rej) => { const t = setTimeout(() => res(valor()), ms); sinal?.addEventListener('abort', () => { clearTimeout(t); rej(new Error('abort')) }) })
const surda = (ms, valor) => new Promise((res) => setTimeout(() => res(valor()), ms)) // ignora o abort
const CORPO_PENDURADO = () => ({ status: 200, ok: true, json: () => new Promise(() => {}) }) // o corpo nunca chega e ignora o abort
const T = { hedgeMs: 40, timeoutMs: 120, orcamentoMs: 160, respiroMs: 5 }

/** Um caso: o fetch passa por um contador PRÓPRIO (no ar, pico, início de cada chamada, sinais). */
async function caso(E, f, opts) {
  const c = { n: 0, noAr: 0, pico: 0, inicios: [], sinais: [] }
  const t0 = Date.now()
  const r = await E.pedirElencoSemantico(MAX.texto, { apiKey: 'k', ...opts, fetchImpl: async (u, i) => { c.n++; c.noAr++; c.pico = Math.max(c.pico, c.noAr); c.inicios.push(Date.now() - t0); c.sinais.push(i.signal); try { return await f(c.n, i) } finally { c.noAr-- } } })
  return { r, c, ms: Date.now() - t0 }
}

async function provas(L) {
  const erros = []
  const E = L(ES)
  const curto = (f, extra = {}) => caso(E, f, { ...T, ...extra })
  const real = (f) => caso(E, f, {})
  const picos = []
  // os casos de constantes reais correm juntos (cada um com o seu contador)
  const longos = Promise.all([
    real((n, i) => (n === 1 ? espera(5_000, i.signal, BOM) : espera(200, i.signal, BOM))), // H
    real((n, i) => espera(60_000, i.signal, BOM)), // I
    real((n) => (n === 1 ? new Promise(() => {}) : surda(4_500, BOM))), // P: a 1ª ignora o abort; a de segurança (3,5 s) responde aos 8 s
    real(() => CORPO_PENDURADO()), // R: o corpo pendura nas duas
    real((n) => (n === 1 ? Promise.reject(new Error('ECONNRESET')) : BOM())), // S: rede e a repetição
    real((n) => (n === 1 ? resposta({}, 429) : BOM())), // T: 429 e a repetição
    real(() => resposta({}, 429)), // T2: 429 sempre
  ])
  // (A)
  { const { r, c } = await curto(async () => BOM()); picos.push(c.pico)
    if (r.status !== 'ok' || c.n !== 1 || r.paralelas !== 0 || r.venceu !== 1 || r.venceu_tipo !== 'principal') erros.push(`A rápido: ${c.n} chamada(s), ${JSON.stringify({ s: r.status, p: r.paralelas, t: r.venceu_tipo })}`) }
  // (B) a 1ª demora 90 ms, a de segurança (40 ms) responde em 10 ms e vence; a perdedora é ABORTADA ao terminar
  { const { r, c } = await curto((n, i) => (n === 1 ? surda(90, RUIM) : espera(10, i.signal, BOM)), { timeoutMs: 1000, orcamentoMs: 1000 }); picos.push(c.pico)
    if (r.status !== 'ok' || r.venceu !== 2 || r.paralelas !== 1 || r.venceu_tipo !== 'seguranca' || r.elenco?.protagonist?.name !== 'Max') erros.push(`B a 2ª não venceu: ${JSON.stringify({ s: r.status, v: r.venceu, t: r.venceu_tipo })}`)
    if (!c.sinais[0]?.aborted) erros.push('B a perdedora não foi abortada ao terminar') }
  // (C) a 1ª devolve JSON reprovado aos 60 ms, com a 2ª no ar até os 90 ms: espera a 2ª
  { const { r, c } = await curto((n, i) => (n === 1 ? espera(60, i.signal, RUIM) : espera(50, i.signal, BOM)), { timeoutMs: 1000, orcamentoMs: 1000 }); picos.push(c.pico)
    if (r.status !== 'ok' || r.venceu !== 2 || !(r.motivos ?? []).includes('1:json')) erros.push(`C a 1ª inválida não esperou a 2ª: ${JSON.stringify({ s: r.status, v: r.venceu, m: r.motivos })}`) }
  // (D) rede, HTTP 503 e a 3ª boa; rede sempre para em 3
  { const { r, c } = await curto(async (n) => { if (n === 1) throw new Error('ECONNRESET'); if (n === 2) return resposta({}, 503); return BOM() }, { timeoutMs: 1000, orcamentoMs: 1000, hedgeMs: 1000 }); picos.push(c.pico)
    if (r.status !== 'ok' || c.n !== 3 || r.venceu !== 3 || r.venceu_tipo !== 'repeticao' || JSON.stringify(r.motivos) !== '["1:rede","2:http"]') erros.push(`D a falha rápida não repetiu 2 vezes: ${c.n} chamadas, ${JSON.stringify(r.motivos)}`) }
  { const { r, c } = await curto(async () => { throw new Error('ECONNRESET') }, { timeoutMs: 1000, orcamentoMs: 1000, hedgeMs: 1000 })
    if (r.status !== 'falhou' || c.n !== 3) erros.push(`D rede sempre: ${c.n} chamadas (devia parar em 3)`) }
  // (D') a segurança só sai com uma chamada NO AR: rede aos 0 ms, repetição agendada para os 100 ms, segurança aos 20 ms = não sai
  { const { r, c } = await curto(async (n) => { if (n === 1) throw new Error('ECONNRESET'); return BOM() }, { timeoutMs: 1000, orcamentoMs: 1000, hedgeMs: 20, respiroMs: 100 })
    if (c.n !== 2 || r.paralelas !== 0 || r.venceu_tipo !== 'repeticao') erros.push(`D' segurança sem chamada no ar: ${c.n} chamadas, paralelas ${r.paralelas}`) }
  // (E) as duas estouram: o total respeita o teto, e cada uma diz o motivo
  { const { r, c, ms } = await curto((_n, i) => espera(10_000, i.signal, BOM), { orcamentoMs: 80 }); picos.push(c.pico)
    if (r.status !== 'falhou' || r.elenco !== null || ms > 80 + 50 || !(r.motivos ?? []).some((m) => /prazo/.test(m)) || r.paralelas !== 1) erros.push(`E as duas estourando: ${ms} ms, ${JSON.stringify({ s: r.status, m: r.motivos, p: r.paralelas })}`) }
  // (K) opção B: inválida e válida = a válida (2 chamadas); inválida sempre = 2, nunca 3; sem 1 s de folga, nenhuma tentativa a mais
  { const { r, c } = await curto(async (n) => (n === 1 ? RUIM() : BOM()), { timeoutMs: 1000, orcamentoMs: 3000, hedgeMs: 2000 })
    if (r.status !== 'ok' || r.venceu !== 2 || c.n !== 2 || r.venceu_tipo !== 'B' || JSON.stringify(r.motivos) !== '["1:json"]') erros.push(`K a inválida não tentou de novo: ${c.n} chamadas, ${JSON.stringify({ s: r.status, t: r.venceu_tipo, m: r.motivos })}`) }
  { const { r, c } = await curto(async () => RUIM(), { timeoutMs: 1000, orcamentoMs: 3000, hedgeMs: 2000 })
    if (r.status !== 'json_invalido' || c.n !== 2) erros.push(`K2 inválida sempre: ${c.n} chamadas (devia parar em 2), ${r.status}`) }
  { const { r, c } = await curto((n, i) => espera(400, i.signal, RUIM), { timeoutMs: 1000, orcamentoMs: 1_200, hedgeMs: 2000 })
    if (r.status !== 'json_invalido' || c.n !== 1) erros.push(`K3 sem 1 s de folga (restam 0,8 s): ${c.n} chamadas (devia ser 1)`) }
  // (L) o "cinco" do revisor: 1ª inválida aos 0,5 s, 2ª e 3ª 503, 4ª inválida; o B pediria a 5ª — o limite é 4
  { const { r, c } = await curto((n, i) => (n === 1 ? espera(500, i.signal, RUIM) : n <= 3 ? resposta({}, 503) : RUIM()), { timeoutMs: 1000, orcamentoMs: 3000, hedgeMs: 350, respiroMs: 5 }); picos.push(c.pico)
    if (c.n !== 4 || r.status !== 'json_invalido') erros.push(`L o pior filme: ${c.n} chamadas (o limite é 4), ${r.status}, ${JSON.stringify(r.motivos)}`) }
  const [H, I, P, R, S, T1, T2] = await longos
  picos.push(H.c.pico, I.c.pico, P.c.pico, R.c.pico, S.c.pico, T1.c.pico, T2.c.pico)
  if (H.r.status !== 'ok' || H.r.venceu !== 2 || H.c.n !== 2 || H.ms < 3_500 || H.ms > 4_300) erros.push(`H a 1ª lenta (5 s): ${H.ms} ms, ${JSON.stringify({ s: H.r.status, v: H.r.venceu, n: H.c.n })}`)
  if (I.r.status !== 'falhou' || I.r.elenco !== null || I.ms < 8_800 || I.ms > 9_600 || I.r.paralelas !== 1) erros.push(`I as duas penduradas: ${I.ms} ms, ${JSON.stringify({ s: I.r.status, p: I.r.paralelas })}`)
  if (P.r.status !== 'ok' || P.r.venceu_tipo !== 'seguranca' || JSON.stringify(P.r.motivos) !== '["1:prazo"]' || P.ms < 7_700 || P.ms > 8_600) erros.push(`P o prazo de 7 s da 1ª (que ignora o abort) não registrou: ${P.ms} ms, ${JSON.stringify({ s: P.r.status, m: P.r.motivos })}`)
  if (R.r.status !== 'falhou' || !(R.r.motivos ?? []).includes('teto') || R.ms < 8_800 || R.ms > 9_600) erros.push(`R o relógio de 9 s com o corpo pendurado: ${R.ms} ms, ${JSON.stringify({ s: R.r.status, m: R.r.motivos })}`)
  { const gap = (S.c.inicios[1] ?? 0) - (S.c.inicios[0] ?? 0)
    if (S.r.status !== 'ok' || S.c.n !== 2 || gap < 240 || gap > 700) erros.push(`S o respiro da repetição devia ser ~250 ms: ${gap} ms, ${S.c.n} chamadas`) }
  { const gap = (T1.c.inicios[1] ?? 0) - (T1.c.inicios[0] ?? 0)
    if (T1.r.status !== 'ok' || T1.c.n !== 2 || T1.r.venceu_tipo !== 'repeticao' || gap < 990 || gap > 1_500) erros.push(`T 429: uma repetição depois de 1 s: ${gap} ms, ${T1.c.n} chamadas`)
    if (T2.r.status !== 'falhou' || T2.c.n !== 2 || JSON.stringify(T2.r.motivos) !== '["1:429","2:429"]') erros.push(`T2 429 sempre: ${T2.c.n} chamadas (devia ser 2), ${JSON.stringify(T2.r.motivos)}`) }
  // (J) nunca mais de 2 no ar, caso a caso
  if (Math.max(...picos) > 2) erros.push(`J ${Math.max(...picos)} chamadas no ar ao mesmo tempo`)
  return erros
}

// F e G: o evento e o 'off'/'internal' de cliente = a main
const CAMPOS = ' ...(pedidoSemantico.paralelas !== undefined ? { tentativas: pedidoSemantico.tentativas, tentativas_paralelas: pedidoSemantico.paralelas, venceu: pedidoSemantico.venceu ?? null, quem_venceu: pedidoSemantico.venceu_tipo ?? null, motivos: pedidoSemantico.motivos ?? [] } : {}) /* KINEO-LEITOR-SEGURO-1411: off = o evento da main, byte a byte */,'
const VERSAO = 'version: pedidoSemantico.paralelas !== undefined ? CONFERENCIA_ELENCO_VERSAO_LEITOR_SEGURO : CONFERENCIA_ELENCO_VERSAO,'
const FROTA = (rota) => rota.includes(CAMPOS) && rota.includes(VERSAO)
const MAIN_ES = lf(execFileSync('git', ['show', 'origin/main:' + ES], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
let GDIF = []
async function gOff(L, contaDaCasa = false) {
  const casos = [
    ['boa', () => async () => BOM()],
    ['rede sempre', () => async () => { throw new Error('ECONNRESET') }],
    ['http e boa', () => { let n = 0; return async () => (++n === 1 ? resposta({}, 503) : BOM()) }],
    ['429 sempre', () => async () => resposta({}, 429)],
    ['json ruim', () => async () => RUIM()],
    ['prazo', () => (_u, init) => espera(10_000, init.signal, BOM)],
  ]
  const roda = async (E, f, casa) => { let n = 0; const g = f(); const r = await E.pedirElencoSemantico(MAX.texto, { apiKey: 'k', timeoutMs: 60, orcamentoMs: 150, ...(casa === undefined ? {} : { contaDaCasa: casa }), fetchImpl: async (u, i) => { n++; return g(u, i) } }); const { ms, ...resto } = r; return JSON.stringify({ ...resto, n }) }
  const EM = createOfflineLoader({ globals: { AbortController, setTimeout, clearTimeout, Response }, source: (rel, text) => (rel === ES ? MAIN_ES : text) })(ES), EB = L(ES)
  const d = []
  for (const [nome, f] of casos) { const a = await roda(EM, f), b = await roda(EB, f, contaDaCasa); if (a !== b) d.push(`${nome}: main ${a.slice(0, 120)} ≠ ramo ${b.slice(0, 120)}`) }
  GDIF = d
  return d
}

checa("M0 o commit nasce 'off' ou 'internal' (nunca 'all': 'all' pega todo filme da rota, pago também)", DESLIGADO.test(lf(fs.readFileSync(ES, 'utf8'))))
const base = await provas(carrega())
checa(`A a T verdes com a resposta real do "prod-max"${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
{ const rota = lf(fs.readFileSync(ROTA, 'utf8'))
  checa('F o evento grava quem venceu (principal, segurança, repetição ou B) e a versão nova SÓ quando o leitor seguro rodou', FROTA(rota))
  const main = lf(execFileSync('git', ['show', 'origin/main:' + ROTA], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
  const linha = (t) => t.split('\n').find((l) => l.includes('if (pedidoSemantico) void writeServerEvent({ name: EVENTO_CONFERENCIA_ELENCO')) ?? ''
  checa('F2 desligado: a linha do evento é a da main + só o espalhamento e a versão condicionais', linha(rota).replace(CAMPOS, '').replace(VERSAO, 'version: CONFERENCIA_ELENCO_VERSAO,') === linha(main))
  checa('F3 as duas leituras da rota passam a conta exata do ensaio (isDryRunAccount) para o modo internal', rota.includes('{ elenco: (t) => pedirElencoSemantico(t, { contaDaCasa: isDryRunAccount(user.email) }), sujeito:') && rota.includes('?? await pedirElencoSemantico(prompt, { contaDaCasa: isDryRunAccount(user.email) })) : null')) }
checa(`G desligado = a main byte a byte nos mesmos casos${GDIF.length ? ': ' + GDIF.join(' · ') : ''}`, (await gOff(carrega(null, false))).length === 0)
{ const INTERNO = (s) => s.replace(DESLIGADO, "export const LEITOR_SEGURO_1411: 'off' | 'internal' | 'all' = 'internal'")
  const ci = await gOff(carrega(INTERNO, false), false)
  checa(`G2 'internal' com cliente = a main byte a byte${ci.length ? ': ' + ci.join(' · ') : ''}`, ci.length === 0)
  const E = carrega(INTERNO, false)(ES); let n = 0
  const r = await E.pedirElencoSemantico(MAX.texto, { apiKey: 'k', contaDaCasa: true, fetchImpl: async () => { n++; return BOM() } })
  checa("G3 'internal' com a conta do ensaio = o leitor seguro (os campos novos)", r.status === 'ok' && r.paralelas === 0 && r.venceu_tipo === 'principal')
  const L = carrega(null, false)(ES)
  checa('G4 a régua: off | internal (só a casa) | all', !L.leitorSeguroLigado('off', true) && !L.leitorSeguroLigado('internal', false) && L.leitorSeguroLigado('internal', true) && L.leitorSeguroLigado('all', false)) }

const MUTANTES = [
  ['sem o pedido de segurança', (s) => s.replace("    hedge = setTimeout(() => { if (!feito && ativas > 0 && paralelas === 0) { paralelas = 1; disparar('seguranca') } }, o.hedgeMs)", '')],
  ['a perdedora ainda decide (o primeiro que volta vence, mesmo inválido)', (s) => s.replace("        if (r.ok) { raw = r.raw; fim(r.elenco, 'ok', id); return }", "        if (r.ok) { raw = r.raw; fim(r.elenco, 'ok', id); return }\n        if (r.motivo === 'json') { fim(null, 'json_invalido', null); return }")],
  ['falha rápida sem repetição', (s) => s.replace("        if ((r.motivo === 'rede' || r.motivo === 'http') && rapidas < o.rapidas", "        if (false && rapidas < o.rapidas")],
  ['sem o teto total (cada chamada ganha o prazo cheio, não o que resta)', (s) => s.replace('      const tempo = Math.min(o.prazoMs, restante())', '      const tempo = o.prazoMs')],
  ['o pedido de segurança sai sempre (filme rápido paga 2)', (s) => s.replace("    disparar('principal')\n    hedge = setTimeout(", "    disparar('principal'); paralelas = 1; disparar('seguranca')\n    hedge = setTimeout(")],
  ['3 no ar (o pedido de segurança dispara 2)', (s) => s.replace("{ paralelas = 1; disparar('seguranca') } }, o.hedgeMs)", "{ paralelas = 1; disparar('seguranca'); disparar('seguranca') } }, o.hedgeMs)")],
  ['o pedido de segurança aos 6 s', (s) => s.replace('export const LEITOR_SEGURO_HEDGE_MS = 3_500', 'export const LEITOR_SEGURO_HEDGE_MS = 6_000')],
  ['o teto total de 20 s', (s) => s.replace('export const LEITOR_SEGURO_ORCAMENTO_MS = 9_000', 'export const LEITOR_SEGURO_ORCAMENTO_MS = 20_000')],
  ['sem a tentativa a mais do JSON inválido (opção B)', (s) => s.replace("        if (r.motivo === 'json' && !jsonDeNovo && ativas === 0 && agendadas === 0 && restante() > 1_000) { jsonDeNovo = true; disparar('B'); return }\n", '')],
  ['JSON inválido repete sem fim', (s) => s.replace("r.motivo === 'json' && !jsonDeNovo && ativas === 0", "r.motivo === 'json' && ativas === 0")],
  // os 10 do revisor independente (rv11, 19/11)
  ['rv11 m1: não abortar a perdedora', (s) => s.replace('      for (const c of controles) { try { c.abort() } catch { /* a perdedora some em silêncio */ } }\n', '')],
  ['rv11 m2: B sem a folga de 1 s', (s) => s.replace('restante() > 1_000) { jsonDeNovo', 'restante() > 0) { jsonDeNovo')],
  ['rv11 m3: sem respiro', (s) => s.replace('rapidas++; repetir(o.respiroMs); return', 'rapidas++; repetir(0); return')],
  ['rv11 m4: três repetições', (s) => s.replace('rapidas < o.rapidas', 'rapidas <= o.rapidas')],
  ['rv11 m5: status sempre falhou', (s) => s.replace("fim(null, m === 'json' ? 'json_invalido' : 'falhou', null)", "fim(null, 'falhou', null)")],
  ['rv11 m6: prazo de 9 s por chamada', (s) => s.replace('export const LEITOR_SEGURO_PRAZO_MS = 7_000', 'export const LEITOR_SEGURO_PRAZO_MS = 9_000')],
  ['rv11 m7: segurança sem ativas > 0', (s) => s.replace('if (!feito && ativas > 0 && paralelas === 0)', 'if (!feito && paralelas === 0)')],
  ['rv11 m8: venceu sempre 1', (s) => s.replace("fim(r.elenco, 'ok', id)", "fim(r.elenco, 'ok', 1)")],
  ['rv11 m9: 429 não repete', (s) => s.replace("if (r.motivo === '429' && !repetiu429", "if (false && !repetiu429")],
  ['rv11 m10: respiro de 2 s', (s) => s.replace('export const LEITOR_SEGURO_RESPIRO_MS = 250', 'export const LEITOR_SEGURO_RESPIRO_MS = 2_000')],
  // os itens novos
  ['429 repete duas vezes', (s) => s.replace("if (r.motivo === '429' && !repetiu429 && restante()", "if (r.motivo === '429' && restante()")],
  ['429 como falha rápida (2 em 0,5 s)', (s) => s.replace("    if (res.status === 429) return { ok: false, motivo: '429', raw: null }\n", '')],
  ['o limite de 5 chamadas', (s) => s.replace('export const LEITOR_SEGURO_MAX_CHAMADAS = 4', 'export const LEITOR_SEGURO_MAX_CHAMADAS = 5')],
  ['sem o relógio de 9 s da leitura', (s) => s.replace(/    relogio = setTimeout\(\(\) => \{ motivos\.push\('teto'\);[^\n]*\n/, '')],
  ['o prazo da chamada depende do abort', (s) => s.replace('    }), prazo])\n', '    })])\n')],
  ['quem venceu sempre principal', (s) => s.replace('venceu_tipo: venceu ? tipos[venceu - 1] : null', "venceu_tipo: venceu ? 'principal' : null")],
]
for (const [nome, fn] of MUTANTES) {
  const src = LIGA(lf(fs.readFileSync(ES, 'utf8')))
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = await Promise.race([provas(carrega((x) => fn(x))), new Promise((ok) => setTimeout(() => ok(['pendurou']), 30_000))]) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
{ const e = await gOff(carrega((s) => s.replace(DESLIGADO, "export const LEITOR_SEGURO_1411: 'off' | 'internal' | 'all' = 'all'"), false))
  checa(`mutante "nasce ligado" fica vermelho no G (${e.length} diferença(s))`, e.length > 0)
  const ei = await gOff(carrega((s) => s.replace(DESLIGADO, "export const LEITOR_SEGURO_1411: 'off' | 'internal' | 'all' = 'internal'").replace("modo === 'all' || (modo === 'internal' && contaDaCasa === true)", "modo !== 'off'"), false), false)
  checa(`mutante "internal para todos" fica vermelho no G2 (${ei.length} diferença(s))`, ei.length > 0)
  const rota = lf(fs.readFileSync(ROTA, 'utf8'))
  checa('mutante "evento com os campos sempre" fica vermelho no F', !FROTA(rota.replace(CAMPOS, ' tentativas_paralelas: pedidoSemantico.paralelas ?? 0, venceu: pedidoSemantico.venceu ?? null, motivos: pedidoSemantico.motivos ?? [],')))
  checa('mutante "evento sem quem venceu" fica vermelho no F', !FROTA(rota.replace(' quem_venceu: pedidoSemantico.venceu_tipo ?? null,', '')))
  checa('mutante "versão nova sempre" fica vermelho no F', !FROTA(rota.replace(VERSAO, 'version: CONFERENCIA_ELENCO_VERSAO_LEITOR_SEGURO,'))) }
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
