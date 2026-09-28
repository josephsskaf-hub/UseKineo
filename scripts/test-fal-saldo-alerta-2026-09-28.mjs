// KINEO-FAL-SALDO-ALERTA-2026-09-28 — guardião do alarme ÚNICO de saldo da fal.
//
// O CASO: em 30 dias (até 27/09) a fal recusou 36 cenas por saldo em 12 despachos (11/09, 16/09, 21/09 — no 21/09,
// "403 User is locked. Reason: Exhausted balance"). O alarme vivia em DUAS cópias (lib/falAlert e a rota cinematic, com
// o e-mail do fundador cravado), com throttle na memória da lambda e nenhuma linha no banco; o Kineo 1 (gancho +
// clipes do primeiro filme, o MESMO Seedance) engolia a recusa num console.warn; o poll de clipe reconhecia a frase
// exata e só logava; e a rota mandava "balance EXHAUSTED" em EMPTY_PLAN/ZERO_POSTS, que não são saldo.
//
// Este guardião EXECUTA o código real (transpile + vm, sem '@/…', sem rede, sem banco):
//   1. classificação: a frase da fal com message 'Forbidden' + body.detail → saldo; "model is locked for your account"
//      → acesso; 403 pelado não é mais saldo (a regra velha de lib/falAlert). O classificador é ESPELHO de
//      sceneDisposition: regex byte-idênticas e as duas funções executadas no mesmo corpus.
//   2. id de 6 h: estável dentro da janela, outro na seguinte, FNV-1a puro (sem node:crypto), vagas de re-tentativa.
//   3. alertFalExhausted com banco falso: reserva + 1 e-mail por janela; 2ª ocorrência = linha de contagem; teto de 3 s;
//      banco fora = envia mesmo assim, sem repetir na mesma lambda; nunca lança. REVISÃO 28/09: envio que falhou,
//      estourou o teto ou lambda que morreu NÃO calam a janela — re-tentativa na vaga seguinte após 10 min, teto de 3.
//   4. EMPTY_PLAN/ZERO_POSTS: assunto verdadeiro (não é saldo).
//   5. Kineo 1: os catches de fastAiHook e fastAiClips chamam o alarme e ESPERAM por ele (await, não void).
//   6. poll: a rota real /api/cinematic-clip-status reserva a janela uma vez e NUNCA escreve linha de contagem.
//   7. retry-hollywood-scene e veed: a chamada existe, com await.
//   8. /admin: o parser do card lê o formato real da RPC e o leitor cai para contagens exatas sem ela. REVISÃO 28/09:
//      leitura do fallback com erro = "não medido" (nunca verde); o vermelho segue a ÚLTIMA recusa, não a reserva.
//   9. rota cinematic (TRAVA 8.2): um alertFalExhausted só, dentro de finalizarDespacho; EMPTY_PLAN/ZERO_POSTS fora do
//      alarme de saldo; nenhum e-mail do fundador cravado. Enquanto a trava não sobe, a seção confere que a rota
//      continua INTACTA (nada pela metade).
//  10. FRONTEIRA (revisão 28/09): lib/falAlert é alcançado pelo navegador (GenerateClient → import() do router →
//      veed → falAlert). A 1ª versão importava node:crypto e o build de navegador do Next quebrava com tsc verde. A
//      seção varre o grafo de TODO arquivo 'use client' (import estático, export-from e import()) e reprova qualquer
//      node:* alcançável — com denominador conferido e um controle negativo que injeta o import e exige o vermelho.
//  REVISÃO 2 (28/09): 3c teto de 3 s POR CANAL (notify.ts real + falAlert.ts real: e-mail em 5 ms + ntfy lento = 'sent',
//      um e-mail só); 7b host do Hollywood = UM alarme por despacho, creditado ao filme (veed.ts real); 8b o card não
//      manda estornar filme a caminho (in_flight_*) e não pinta de verde o que não mediu (FalBalanceCard real).
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'

// Vira true no commit "[TRAVA 8.2]" que liga a rota cinematic ao alarme único.
const TRAVA_82_APLICADA = false

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))
const tick = async (n = 20) => { for (let i = 0; i < n; i++) await Promise.resolve() }

function carrega(arquivo, mapa, globais = {}, src = null) {
  const js = ts.transpileModule(src ?? rd(arquivo), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const exports = {}
  vm.runInNewContext(js, {
    exports,
    require: (m) => { if (!(m in mapa)) throw new Error(`Unexpected import em ${arquivo}: ${m}`); return mapa[m] },
    process: { env: {} },
    console: { log() {}, warn() {}, error() {} },
    Buffer, URL, URLSearchParams, JSON, Math, Date, Promise, Map, Set, Array, Object, String, Number, RegExp, Error,
    setTimeout, clearTimeout,
    ...globais,
  }, { filename: arquivo, timeout: 5000 })
  return exports
}

const D = carrega('lib/cinematic/sceneDisposition.ts', { 'node:crypto': crypto })

// Banco falso com PK única em `events` (o 23505 é o que faz a reserva funcionar) e created_at = now() do banco (o
// relógio falso). SELECT por id devolve a linha: é assim que o alarme lê COMO a vaga terminou (revisão 28/09).
function bancoFalso(opts = {}) {
  const rows = []
  const ops = []
  const client = {
    from(table) {
      let action = 'select', value = null, lim = null
      const filtros = []
      const q = {
        select() { action = 'select'; return q },
        insert(v) { action = 'insert'; value = v; return q },
        update(v) { action = 'update'; value = v; return q },
        eq(k, v) { filtros.push([k, v]); return q },
        limit(n) { lim = n; return q },
        then(res, rej) {
          return Promise.resolve().then(() => {
            ops.push({ table, action, value: clone(value) })
            if (table !== 'events') throw new Error('tabela inesperada ' + table)
            if (action === 'insert') {
              if (opts.insertLanca) throw new Error('rede do banco caiu')
              if (opts.insertErro) return { data: null, error: { code: opts.insertErro, message: 'falha simulada' } }
              if (value.id && rows.some((r) => r.id === value.id)) return { data: null, error: { code: '23505', message: 'duplicate key' } }
              rows.push({ created_at: new Date(relogio.agora).toISOString(), ...clone(value), id: value.id ?? `auto-${rows.length}` })
              return { data: null, error: null }
            }
            if (action === 'update') {
              for (const r of rows) if (filtros.every(([k, v]) => r[k] === v)) Object.assign(r, clone(value))
              return { data: null, error: null }
            }
            if (opts.selectErro) return { data: null, error: { code: opts.selectErro, message: 'leitura simulada falhou' } }
            const achadas = rows.filter((r) => filtros.every(([k, v]) => r[k] === v))
            return { data: clone(lim === null ? achadas : achadas.slice(0, lim)), error: null }
          }).then(res, rej)
        },
      }
      return q
    },
  }
  return { rows, ops, client }
}

const ENV = { NEXT_PUBLIC_SUPABASE_URL: 'https://offline.invalid', SUPABASE_SERVICE_ROLE_KEY: 'offline-only', NEXT_PUBLIC_APP_URL: 'https://www.usekineo.com' }
const relogio = { agora: Date.UTC(2026, 8, 21, 0, 0, 0) } // 21/09 00:00 UTC = início de uma janela de 6 h
class DataFalsa extends Date {
  constructor(...a) { super(...(a.length ? a : [relogio.agora])) }
  static now() { return relogio.agora }
}

/**
 * Uma "lambda" nova: módulo recarregado (memória local zerada), mesmo banco. O mapa de imports é ESTRITO de propósito
 * (revisão 28/09): 'node:crypto' e '@/lib/cinematic/sceneDisposition' NÃO estão nele — se algum voltar a lib/falAlert,
 * o carregador lança "Unexpected import" e o guardião inteiro fica vermelho (o navegador também alcança este arquivo).
 */
function lambda({ banco, notify, setTimeoutImpl, env = ENV, supabaseLanca = false } = {}) {
  return carrega('lib/falAlert.ts', {
    '@supabase/supabase-js': { createClient: () => { if (supabaseLanca) throw new Error('boom'); return banco.client } },
    '@/lib/supplier/notify': { notifyFounder: notify },
  }, { process: { env }, Date: DataFalsa, ...(setTimeoutImpl ? { setTimeout: setTimeoutImpl } : {}) })
}
function carteiro(resposta = { email: 'sent', webhook: 'skipped', delivered: true }) {
  const enviados = []
  const fn = async (subject, text) => { enviados.push({ subject, text }); if (resposta instanceof Error) throw resposta; return resposta }
  return { enviados, fn }
}
const NAO_SAIU = { email: 'failed', webhook: 'skipped', delivered: false } // Resend 429 no pico, sem webhook
const SAIU = { email: 'sent', webhook: 'skipped', delivered: true }
/** Carteiro com roteiro: uma resposta por envio, a última se repete. */
function carteiroRoteiro(...respostas) {
  const enviados = []
  const fn = async (subject, text) => {
    const r = respostas[Math.min(enviados.length, respostas.length - 1)]
    enviados.push({ subject, text })
    return r
  }
  return { enviados, fn }
}
const ID_REAL = lambda({ banco: bancoFalso(), notify: carteiro().fn })
/** Id da vaga N da janela de `t`, pela função real (para achar a linha no banco falso). */
const falAlertIdDe = (t, vaga) => ID_REAL.falAlertEventId(t, vaga)

const FRASE_FAL = 'User is locked. Reason: Exhausted balance. Top up your balance at fal.ai/dashboard/billing'

// ═══════════════════ 1. classificação ═══════════════════
console.log('== 1. classificação (sceneDisposition real) ==')
{
  const A = lambda({ banco: bancoFalso(), notify: carteiro().fn })
  const apiError = { status: 403, message: 'Forbidden', body: { detail: FRASE_FAL } } // o que o @fal-ai/client entrega
  checa('o SDK entrega só "Forbidden" na mensagem: sem o body.detail o classificador NÃO vê saldo (a armadilha)', D.isBalanceExhausted(403, 'Forbidden') === false)
  checa('fal 403 + message "Forbidden" + body.detail com a frase real → saldo', A.looksExhausted(apiError) === true)
  checa('FalQueueSubmitError (mensagem com detail + providerBody) → saldo', A.looksExhausted({ status: 403, message: `Fal queue rejected submit (403): ${FRASE_FAL}`, providerBody: { detail: FRASE_FAL } }) === true)
  checa('402 → saldo', A.looksExhausted({ status: 402, message: 'Payment Required' }) === true)
  const acesso = { status: 403, message: 'Forbidden', body: { detail: 'This model is locked for your account' } }
  checa('"model is locked for your account" → acesso, NÃO saldo', A.looksExhausted(acesso) === false)
  checa('… e a classe real é auth_model_access', D.classifyProviderFailure({ status: 403, ambiguous: false, message: A.falErrorText(acesso) }).reason_class === 'auth_model_access')
  checa('403 pelado não é mais saldo (a regra velha de lib/falAlert dizia que sim)', A.looksExhausted({ status: 403, message: 'Forbidden' }) === false)
  checa('"User is locked" sem a razão financeira não é saldo', A.looksExhausted({ status: 403, message: 'Forbidden', body: { detail: 'User is locked' } }) === false)
  checa('moderação em 403 não é saldo', A.looksExhausted({ status: 403, message: 'Forbidden', body: { detail: 'Content policy violation' } }) === false)
  checa('erro sem status (rede) não é saldo', A.looksExhausted(new Error('fetch failed')) === false && A.looksExhausted(null) === false)
  checa('corpo sem detail entra serializado e cortado (≤300)', A.falErrorText({ message: 'x', body: { error: 'y'.repeat(1000) } }).length <= 302)
  const src = rd('lib/falAlert.ts')
  checa('lib/falAlert não crava e-mail nem chama o Resend: fala por notifyFounder', !/@gmail\.com|api\.resend\.com/.test(src) && src.includes("import { notifyFounder } from '@/lib/supplier/notify'"))
  // REVISÃO 28/09 — re-ancorado. A intenção de sempre ("a pergunta é a de sceneDisposition, nunca uma regra própria")
  // agora é provada por ESPELHO e não por import: o import arrastava node:crypto para o bundle do navegador.
  checa('lib/falAlert não importa node:* nem lib/cinematic/* (o navegador alcança este arquivo — seção 10)', !/from\s+['"]node:|import\(\s*['"]node:|require\(\s*['"]node:/.test(src) && !/from\s+['"]@\/lib\/cinematic\//.test(src))
  const disp = rd('lib/cinematic/sceneDisposition.ts')
  const linha = (texto, nome) => (texto.match(new RegExp(`^const ${nome} = .*$`, 'm')) ?? [null])[0]
  const espelho = src.slice(src.indexOf('// ═══ MIRROR: lib/cinematic/sceneDisposition.ts'), src.indexOf('// ═══ END MIRROR ═══'))
  checa('espelho: bloco MIRROR presente e fechado', espelho.length > 200 && src.includes('// ═══ END MIRROR ═══'))
  for (const nome of ['SALDO', 'ACESSO']) {
    const la = linha(disp, nome)
    const lb = linha(espelho, nome)
    checa(`espelho: const ${nome} é byte-idêntica à de sceneDisposition`, !!la && la === lb)
  }
  const disposOrigem = disp.slice(disp.indexOf('export function isBalanceExhausted('), disp.indexOf('export function isBalanceExhausted(') + 200)
  checa('espelho: a origem ainda é a mesma regra (isBalanceExhausted = classe balance_quota do classificador)', disposOrigem.includes("classifyProviderFailure({ status, ambiguous: false, message }).reason_class === 'balance_quota'"))
  // A PROVA QUE VALE: as duas funções no mesmo corpus — status × frases reais e de borda.
  const frases = [
    '', 'Forbidden', FRASE_FAL, 'User is locked', 'User is locked. Reason: Exhausted balance',
    'This model is locked for your account', 'model not available for your plan', 'Insufficient balance',
    'quota exceeded for this key', 'Payment required', 'billing issue — top up your account', 'topup needed',
    'out of credits', 'no credits left', '0 credits remaining', 'prepaid balance depleted', 'prepay required', 'access denied: billing',
    'not authorized', 'forbidden for this key', 'no access to fal-ai/veo3', 'Content policy violation', 'nsfw content',
    'rate limit exceeded', 'Internal Server Error', 'EXHAUSTED', 'model xyz is unauthorized, balance ok',
  ]
  const statuses = [null, 200, 400, 401, 402, 403, 404, 408, 409, 422, 429, 499, 500, 502, 503]
  let casos = 0
  const divergencias = []
  for (const st of statuses) for (const f of frases) {
    casos++
    const a = D.isBalanceExhausted(st, f)
    const b = A.isBalanceRefusal(st, f)
    if (a !== b) divergencias.push(`${st}:${f}`)
  }
  checa(`espelho: ${casos} casos (status × frases) — isBalanceRefusal ≡ sceneDisposition.isBalanceExhausted (divergências: ${divergencias.slice(0, 3).join(' | ') || 'nenhuma'})`, casos >= 300 && divergencias.length === 0)
  checa('espelho: o corpus tem os dois lados (saldo e não-saldo) em 403, senão a paridade não prova nada', frases.some((f) => D.isBalanceExhausted(403, f)) && frases.some((f) => !D.isBalanceExhausted(403, f) && /locked/i.test(f)))
}

// ═══════════════════ 2. id da janela de 6 h ═══════════════════
console.log('== 2. id determinístico de 6 h ==')
{
  const A = lambda({ banco: bancoFalso(), notify: carteiro().fn })
  const t0 = relogio.agora
  const H = 3600 * 1000
  const id0 = A.falAlertEventId(t0)
  checa('formato uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id0))
  checa('estável dentro da janela (00:00 → 05:59:59)', A.falAlertEventId(t0 + 3 * H) === id0 && A.falAlertEventId(t0 + 6 * H - 1) === id0)
  checa('outro na janela seguinte (06:00)', A.falAlertEventId(t0 + 6 * H) !== id0)
  // REVISÃO 28/09 — re-ancorado: era sha256 de node:crypto (fórmula do founderAlert), que quebrava o build do navegador.
  // A intenção (id DETERMINÍSTICO por nome:janela, igual em qualquer lambda) segue; a fórmula agora é FNV-1a puro,
  // reimplementado aqui de forma independente para o guardião não ler a resposta do próprio arquivo.
  const fnv = (s) => {
    let h = 0x811c9dc5
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16
    return h >>> 0
  }
  const uuid = (seed) => { const x = [0, 1, 2, 3].map((f) => fnv(`${f}:${seed}`).toString(16).padStart(8, '0')).join(''); return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}` }
  checa('fórmula: FNV-1a(faixa:nome:janela) em 4 faixas, forma de uuid', id0 === uuid(`fal_balance_exhausted:${Math.floor(t0 / (6 * H))}`))
  checa('vaga de re-tentativa: id próprio, estável, derivado de nome:janela:retry:N', A.falAlertEventId(t0, 1) === uuid(`fal_balance_exhausted:${Math.floor(t0 / (6 * H))}:retry:1`) && A.falAlertEventId(t0 + H, 1) === A.falAlertEventId(t0, 1) && A.falAlertEventId(t0, 1) !== id0 && A.falAlertEventId(t0, 2) !== A.falAlertEventId(t0, 1))
  checa('janela é de 6 h; teto de 3 s; 3 tentativas com 10 min entre elas', A.FAL_ALERT_WINDOW_MS === 6 * H && A.FAL_ALERT_TIMEOUT_MS === 3000 && A.FAL_ALERT_MAX_ATTEMPTS === 3 && A.FAL_ALERT_RETRY_GAP_MS === 10 * 60 * 1000)
  checa('defeito tem id próprio por tipo (não colide com o saldo nem entre si)', A.dispatchDefectEventId('EMPTY_PLAN', t0) !== A.dispatchDefectEventId('ZERO_POSTS', t0) && A.dispatchDefectEventId('EMPTY_PLAN', t0) !== id0)
  const vistos = new Set()
  let gerados = 0
  for (let w = 0; w < 20000; w++) {
    const t = t0 + w * 6 * H
    for (let v = 0; v < 3; v++) {
      for (const id of [A.falAlertEventId(t, v), A.dispatchDefectEventId('EMPTY_PLAN', t, v), A.dispatchDefectEventId('ZERO_POSTS', t, v)]) { vistos.add(id); gerados++ }
    }
  }
  checa(`sem colisão: ${gerados} ids (20 mil janelas ≈ 13,7 anos × 3 tipos × 3 vagas) são todos distintos`, gerados === 180000 && vistos.size === gerados)
}

// ═══════════════════ 3. alertFalExhausted ═══════════════════
console.log('== 3. alarme: reserva, contagem, teto, banco fora ==')
{
  relogio.agora = Date.UTC(2026, 8, 21, 0, 28, 39)
  const banco = bancoFalso()
  const c = carteiro()
  const L1 = lambda({ banco, notify: c.fn })
  const r1 = await L1.alertFalExhausted({ source: 'cinematic', engine: 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video', userId: 'u-1', generationId: 'g-1', scenesRefused: 4, context: 'accepted=4/8' })
  const reserva = banco.rows.find((r) => r.id === L1.falAlertEventId())
  checa('1ª ocorrência: e-mail enviado (sent)', r1 === 'sent' && c.enviados.length === 1)
  checa('assunto de sempre + link de recarga + painel no texto', c.enviados[0]?.subject === L1.FAL_ALERT_SUBJECT && c.enviados[0].text.includes('https://fal.ai/dashboard/billing') && c.enviados[0].text.includes('/admin/supplier-health'))
  checa('reserva com id determinístico, nome fal_balance_exhausted, user_id nulo (FK nunca derruba o dedupe) e pessoa no metadata', !!reserva && reserva.name === 'fal_balance_exhausted' && reserva.user_id === null && reserva.metadata.user_id === 'u-1' && reserva.metadata.alerted === true)
  checa('desfecho anotado na reserva (state sent + canais)', reserva?.metadata.state === 'sent' && reserva.metadata.email === 'sent' && reserva.metadata.webhook === 'skipped')
  checa('a reserva guarda fonte, motor, geração e cenas', reserva?.metadata.source === 'cinematic' && reserva.metadata.scenes_refused === 4 && reserva.metadata.generation_id === 'g-1')

  relogio.agora += 39 * 60 * 1000 // 01:07 — o 2º despacho do fundador no 21/09
  const r2 = await L1.alertFalExhausted({ source: 'cinematic', userId: 'u-1', scenesRefused: 5 })
  const L2 = lambda({ banco, notify: c.fn }) // outra lambda, mesma janela
  const r3 = await L2.alertFalExhausted({ source: 'kineo1_clip', userId: 'u-2' })
  const contagem = banco.rows.filter((r) => r.name === 'fal_balance_exhausted' && r.metadata.alerted === false)
  checa('2ª e 3ª ocorrência na janela (mesma lambda e outra lambda): duplicate, NENHUM e-mail novo', r2 === 'duplicate' && r3 === 'duplicate' && c.enviados.length === 1)
  checa('… e viram linhas de CONTAGEM (alerted:false) com a pessoa na coluna user_id', contagem.length === 2 && contagem.every((r) => typeof r.user_id === 'string' && r.id !== reserva.id))

  relogio.agora += 6 * 3600 * 1000 // janela seguinte
  const r4 = await L2.alertFalExhausted({ source: 'cinematic' })
  checa('janela seguinte: novo e-mail, nova reserva', r4 === 'sent' && c.enviados.length === 2 && banco.rows.filter((r) => r.metadata.alerted === true).length === 2)

  // teto de 3 s: o carteiro trava, o relógio do teto dispara na hora
  const bancoT = bancoFalso()
  const LT = lambda({ banco: bancoT, notify: () => new Promise(() => {}), setTimeoutImpl: (fn) => { fn(); return 1 } })
  // relógio REAL do guardião como rede: se o teto sumir, o teste fica vermelho em 2 s em vez de pendurar.
  const rT = await Promise.race([LT.alertFalExhausted({ source: 'poll', countRow: false }), new Promise((r) => setTimeout(() => r('PENDURADO'), 2000))])
  checa('carteiro travado: devolve timeout (não fica refém do Resend) e anota timeout', rT === 'timeout' && bancoT.rows[0]?.metadata.state === 'timeout')

  // banco fora: envia mesmo assim; a mesma lambda não repete na janela
  const bancoF = bancoFalso({ insertErro: '08006' })
  const cF = carteiro()
  const LF = lambda({ banco: bancoF, notify: cF.fn })
  const rF1 = await LF.alertFalExhausted({ source: 'cinematic' })
  const rF2 = await LF.alertFalExhausted({ source: 'cinematic' })
  checa('banco fora: o alarme sai mesmo assim (1 e-mail), e a mesma lambda não repete na janela', rF1 === 'sent' && rF2 === 'duplicate' && cF.enviados.length === 1)

  // nunca lança
  let lancou = false
  let rE1, rE2, rE3
  try {
    rE1 = await lambda({ banco: bancoFalso(), notify: carteiro(new Error('resend down')).fn }).alertFalExhausted({ source: 'cinematic' })
    rE2 = await lambda({ banco: bancoFalso({ insertLanca: true }), notify: carteiro().fn }).alertFalExhausted({ source: 'cinematic' })
    rE3 = await lambda({ banco: bancoFalso(), notify: carteiro().fn, supabaseLanca: true }).alertFalExhausted({ source: 'cinematic' })
  } catch { lancou = true }
  checa('nunca lança: carteiro que lança = failed; banco que lança = envia; client que lança = error', !lancou && rE1 === 'failed' && rE2 === 'sent' && rE3 === 'error')
  const cS = carteiro()
  const semServico = await lambda({ banco: bancoFalso(), notify: cS.fn, env: {} }).alertFalExhausted({ source: 'cinematic' })
  checa('sem service role: envia sem dedupe (o apagão importa mais que o e-mail duplicado)', semServico === 'sent' && cS.enviados.length === 1)
}

// ═══════════════════ 3b. envio que não saiu não cala a janela (revisão 28/09) ═══════════════════
console.log('== 3b. envio falhou / estourou / lambda morreu: re-tentativa, com intervalo e teto ==')
{
  const MIN = 60 * 1000
  // O CASO DO REVISOR: 1º envio falha (Resend 429), o Resend volta, duas lambdas depois na mesma janela diziam
  // 'duplicate' e o fundador ficava sem nada até a virada das 6 h.
  relogio.agora = Date.UTC(2026, 8, 21, 0, 10, 0)
  const banco = bancoFalso()
  const c = carteiroRoteiro(NAO_SAIU, SAIU)
  const r1 = await lambda({ banco, notify: c.fn }).alertFalExhausted({ source: 'cinematic', userId: 'u-1' })
  const vaga0 = banco.rows.find((r) => r.id === falAlertIdDe(relogio.agora, 0))
  checa('1º envio não saiu: devolve failed e a vaga 0 fica anotada failed', r1 === 'failed' && vaga0?.metadata.state === 'failed' && c.enviados.length === 1)
  relogio.agora += 1 * MIN
  const r2 = await lambda({ banco, notify: c.fn }).alertFalExhausted({ source: 'kineo1_clip', userId: 'u-2' })
  checa('1 min depois (outra lambda): ainda dentro do intervalo — duplicate, sem e-mail, mas a recusa é CONTADA', r2 === 'duplicate' && c.enviados.length === 1 && banco.rows.filter((r) => r.metadata.alerted === false).length === 1)
  relogio.agora += 10 * MIN // 11 min depois da vaga 0
  const r3 = await lambda({ banco, notify: c.fn }).alertFalExhausted({ source: 'cinematic', userId: 'u-3' })
  const vaga1 = banco.rows.find((r) => r.id === falAlertIdDe(relogio.agora, 1))
  checa('11 min depois: a PRÓXIMA recusa re-tenta na vaga 1 e o e-mail SAI (o defeito era: silêncio até a virada)', r3 === 'sent' && c.enviados.length === 2 && vaga1?.metadata.state === 'sent' && vaga1.metadata.attempt === 1)
  relogio.agora += 1 * MIN
  const r4 = await lambda({ banco, notify: c.fn }).alertFalExhausted({ source: 'cinematic' })
  checa('depois de um envio entregue: a janela está avisada — duplicate, nada de 3º e-mail', r4 === 'duplicate' && c.enviados.length === 2)

  // A mesma lambda que falhou: a memória local respeita o intervalo, e o poll nem toca no banco dentro dele.
  relogio.agora = Date.UTC(2026, 8, 22, 6, 5, 0)
  const bancoP = bancoFalso()
  const cP = carteiroRoteiro(NAO_SAIU, SAIU)
  const P = lambda({ banco: bancoP, notify: cP.fn })
  const p1 = await P.alertFalExhausted({ source: 'poll', countRow: false })
  const opsDepoisDaFalha = bancoP.ops.length
  relogio.agora += 2 * MIN
  const p2 = await P.alertFalExhausted({ source: 'poll', countRow: false })
  checa('poll: envio falhou → a 2ª chamada 2 min depois é duplicate SEM ir ao banco (alta frequência não martela)', p1 === 'failed' && p2 === 'duplicate' && bancoP.ops.length === opsDepoisDaFalha && cP.enviados.length === 1)
  relogio.agora += 9 * MIN
  const p3 = await P.alertFalExhausted({ source: 'poll', countRow: false })
  checa('poll: 11 min depois a mesma lambda re-tenta e entrega; nenhuma linha de contagem no caminho', p3 === 'sent' && cP.enviados.length === 2 && bancoP.rows.every((r) => r.metadata.alerted === true))

  // Lambda que morreu entre reservar e enviar: a vaga fica 'reserved' para sempre.
  relogio.agora = Date.UTC(2026, 8, 23, 12, 30, 0)
  const bancoM = bancoFalso()
  bancoM.rows.push({ id: falAlertIdDe(relogio.agora, 0), name: 'fal_balance_exhausted', user_id: null, created_at: new Date(relogio.agora - 1 * MIN).toISOString(), metadata: { alerted: true, state: 'reserved', attempt: 0 } })
  const cM = carteiro()
  const m1 = await lambda({ banco: bancoM, notify: cM.fn }).alertFalExhausted({ source: 'cinematic' })
  checa("vaga 'reserved' de 1 min atrás (envio talvez no ar): duplicate, não duplica o e-mail", m1 === 'duplicate' && cM.enviados.length === 0)
  bancoM.rows[0].created_at = new Date(relogio.agora - 11 * MIN).toISOString()
  const m2 = await lambda({ banco: bancoM, notify: cM.fn }).alertFalExhausted({ source: 'cinematic' })
  checa("vaga 'reserved' de 11 min atrás (lambda morreu): re-tenta na vaga 1 e entrega", m2 === 'sent' && cM.enviados.length === 1 && bancoM.rows.some((r) => r.id === falAlertIdDe(relogio.agora, 1) && r.metadata.state === 'sent'))

  // Teto: o Resend não volta. 3 tentativas espaçadas, depois só contagem.
  relogio.agora = Date.UTC(2026, 8, 24, 0, 0, 0)
  const bancoC = bancoFalso()
  const cC = carteiroRoteiro(NAO_SAIU)
  const saidas = []
  for (let i = 0; i < 5; i++) {
    saidas.push(await lambda({ banco: bancoC, notify: cC.fn }).alertFalExhausted({ source: 'cinematic' }))
    relogio.agora += 11 * MIN
  }
  checa(`teto: 3 tentativas por janela, depois duplicate (saídas: ${saidas.join(',')})`, saidas.join(',') === 'failed,failed,failed,duplicate,duplicate' && cC.enviados.length === 3 && bancoC.rows.filter((r) => r.metadata.alerted === true).length === 3)

  // Teto de 3 s estourado também não cala: 'timeout' é "não saiu".
  relogio.agora = Date.UTC(2026, 8, 25, 0, 0, 0)
  const bancoT = bancoFalso()
  let travado = true
  const cT = { enviados: [], fn: (s, t) => { cT.enviados.push(s); return travado ? new Promise(() => {}) : Promise.resolve(SAIU) } }
  const lento = (fn) => { if (travado) fn(); return 1 }
  const t1 = await lambda({ banco: bancoT, notify: cT.fn, setTimeoutImpl: lento }).alertFalExhausted({ source: 'cinematic' })
  travado = false
  relogio.agora += 11 * MIN
  const t2 = await lambda({ banco: bancoT, notify: cT.fn, setTimeoutImpl: lento }).alertFalExhausted({ source: 'cinematic' })
  checa('timeout no 1º envio → 11 min depois a próxima recusa entrega na vaga 1', t1 === 'timeout' && t2 === 'sent' && cT.enviados.length === 2)

  // Leitura da vaga que falha: conservador (não duplica o e-mail), mas conta.
  relogio.agora = Date.UTC(2026, 8, 26, 0, 0, 0)
  const bancoL = bancoFalso({ selectErro: '57014' })
  const cL = carteiroRoteiro(NAO_SAIU, SAIU)
  await lambda({ banco: bancoL, notify: cL.fn }).alertFalExhausted({ source: 'cinematic' })
  relogio.agora += 11 * MIN
  const l2 = await lambda({ banco: bancoL, notify: cL.fn }).alertFalExhausted({ source: 'cinematic' })
  checa('não deu para ler a vaga: duplicate (sem e-mail duplicado) e a recusa vira contagem', l2 === 'duplicate' && cL.enviados.length === 1 && bancoL.rows.some((r) => r.metadata.alerted === false))

  // Banco fora + envio que falhou: a memória da lambda re-tenta com a mesma regra.
  relogio.agora = Date.UTC(2026, 8, 27, 0, 0, 0)
  const bancoF = bancoFalso({ insertErro: '08006' })
  const cF = carteiroRoteiro(NAO_SAIU, SAIU)
  const F = lambda({ banco: bancoF, notify: cF.fn })
  const f1 = await F.alertFalExhausted({ source: 'cinematic' })
  const f2 = await F.alertFalExhausted({ source: 'cinematic' })
  relogio.agora += 11 * MIN
  const f3 = await F.alertFalExhausted({ source: 'cinematic' })
  const f4 = await F.alertFalExhausted({ source: 'cinematic' })
  checa(`banco fora: falhou → espera o intervalo → entrega → para (saídas: ${[f1, f2, f3, f4].join(',')})`, [f1, f2, f3, f4].join(',') === 'failed,duplicate,sent,duplicate' && cF.enviados.length === 2)

  // O alarme de defeito passa pelo mesmo caminho.
  relogio.agora = Date.UTC(2026, 8, 27, 6, 0, 0)
  const bancoD = bancoFalso()
  const cD = carteiroRoteiro(NAO_SAIU, SAIU)
  const d1 = await lambda({ banco: bancoD, notify: cD.fn }).alertDispatchDefect({ kind: 'ZERO_POSTS' })
  relogio.agora += 11 * MIN
  const d2 = await lambda({ banco: bancoD, notify: cD.fn }).alertDispatchDefect({ kind: 'ZERO_POSTS' })
  checa('defeito de despacho: envio que falhou também é re-tentado (e continua sem linha de contagem)', d1 === 'failed' && d2 === 'sent' && bancoD.rows.length === 2 && bancoD.rows.every((r) => r.metadata.alerted === true))
}

// ═══════════════════ 3c. teto POR CANAL (revisão 2, 28/09) ═══════════════════
// O CASO DO REVISOR: notify.ts real + falAlert.ts real, RESEND_API_KEY e KINEO_ALERT_WEBHOOK_URL (ntfy) ligados; o
// Resend respondia 200 em 50 ms e o ntfy em 4 s. O teto de 3 s corria contra o Promise.all dos DOIS canais: saía
// 'timeout' a cada recusa, o e-mail que JÁ tinha chegado era re-enviado (3 e-mails na janela) e o painel dizia
// "E-mails sent 0". Aqui o teto de 3 s vira 60 ms (só o relógio do teto de lib/falAlert) e os canais têm 5 ms / 300 ms.
console.log('== 3c. teto de 3 s por canal: o primeiro canal que confirma decide ==')
{
  const MIN = 60 * 1000
  const tetoRapido = (fn, ms) => setTimeout(fn, ms === 3000 ? 60 : ms)
  const espera = (ms) => new Promise((r) => setTimeout(r, ms))
  const resposta = (status) => ({ ok: status >= 200 && status < 300, status, text: async () => '' })
  /** notify.ts REAL com fetch falso: cada canal responde no seu tempo. */
  const notifyReal = ({ email = [5, 200], webhook = [300, 200] } = {}) => {
    const chamadas = { email: 0, webhook: 0 }
    const fetchFalso = async (url) => {
      const canal = String(url).includes('api.resend.com') ? 'email' : 'webhook'
      chamadas[canal]++
      const [ms, status] = canal === 'email' ? email : webhook
      await espera(ms)
      return resposta(status)
    }
    const N = carrega('lib/supplier/notify.ts', {}, {
      process: { env: { RESEND_API_KEY: 're_offline', KINEO_ALERT_WEBHOOK_URL: 'https://ntfy.sh/kineo-offline' } },
      fetch: fetchFalso, AbortSignal,
    })
    return { N, chamadas }
  }
  // notifyFounder real: avisa canal a canal, antes do mais lento terminar.
  {
    const { N } = notifyReal()
    const avisos = []
    const t0 = Date.now()
    const r = await N.notifyFounder('s', 't', { onChannel: (canal, res) => avisos.push({ canal, res, ms: Date.now() - t0 }) })
    checa('notify.ts real: onChannel avisa o e-mail (5 ms) ANTES do webhook (300 ms) e o retorno segue completo', avisos.length === 2 && avisos[0].canal === 'email' && avisos[0].res === 'sent' && avisos[0].ms < 200 && avisos[1].canal === 'webhook' && r.email === 'sent' && r.webhook === 'sent' && r.delivered === true)
    const r2 = await N.notifyFounder('s', 't', { onChannel: () => { throw new Error('aviso quebrado') } })
    checa('notify.ts real: um onChannel que lança não derruba o alarme (nunca lança)', r2.delivered === true)
    const r3 = await N.notifyFounder('s', 't')
    checa('notify.ts real: sem opções, o contrato de sempre (cron supplier-watch, quality-radar)', r3.email === 'sent' && r3.webhook === 'sent')
  }
  // A sequência do revisor: 4 lambdas novas, recusas a 11 min uma da outra, a mesma janela de 6 h.
  {
    relogio.agora = Date.UTC(2026, 8, 28, 0, 5, 0)
    const banco = bancoFalso()
    const { N, chamadas } = notifyReal()
    const saidas = []
    for (let i = 0; i < 4; i++) {
      saidas.push(await lambda({ banco, notify: N.notifyFounder, setTimeoutImpl: tetoRapido }).alertFalExhausted({ source: 'cinematic', userId: 'u-' + i }))
      relogio.agora += 11 * MIN
    }
    const vaga0 = banco.rows.find((r) => r.id === falAlertIdDe(Date.UTC(2026, 8, 28, 0, 5, 0), 0))
    checa(`e-mail em 5 ms + ntfy em 300 ms (teto 60 ms): 'sent' na 1ª, e as outras são contagem (saídas: ${saidas.join(',')}; antes: timeout,timeout,timeout,duplicate)`, saidas.join(',') === 'sent,duplicate,duplicate,duplicate')
    checa(`… o Resend recebeu UM e-mail, não três (recebeu ${chamadas.email})`, chamadas.email === 1)
    checa("… e a vaga ficou 'sent' com email:'sent' (o painel conta o e-mail entregue; o webhook ainda no ar fica 'pending')", vaga0?.metadata.state === 'sent' && vaga0.metadata.email === 'sent' && vaga0.metadata.webhook === 'pending')
  }
  // O outro lado: o webhook entrega rápido e o Resend trava — também é 'sent' (qualquer canal).
  {
    relogio.agora = Date.UTC(2026, 8, 28, 6, 5, 0)
    const banco = bancoFalso()
    const { N } = notifyReal({ email: [300, 200], webhook: [5, 200] })
    const r = await lambda({ banco, notify: N.notifyFounder, setTimeoutImpl: tetoRapido }).alertFalExhausted({ source: 'cinematic' })
    checa("webhook em 5 ms + Resend em 300 ms: 'sent' pelo webhook", r === 'sent' && banco.rows[0]?.metadata.webhook === 'sent' && banco.rows[0].metadata.email === 'pending')
  }
  // 'timeout' continua existindo: nenhum canal confirmou dentro do teto.
  {
    relogio.agora = Date.UTC(2026, 8, 28, 12, 5, 0)
    const banco = bancoFalso()
    const { N } = notifyReal({ email: [200, 200], webhook: [300, 200] })
    const r = await lambda({ banco, notify: N.notifyFounder, setTimeoutImpl: tetoRapido }).alertFalExhausted({ source: 'cinematic' })
    checa("os dois canais lentos (200/300 ms, teto 60 ms): 'timeout' — ainda não saiu, a re-tentativa segue valendo", r === 'timeout' && banco.rows[0]?.metadata.state === 'timeout')
  }
  // Canal que FALHA rápido não é entrega: Resend 429 em 5 ms + ntfy lento → timeout, com o 'failed' anotado.
  {
    relogio.agora = Date.UTC(2026, 8, 28, 18, 5, 0)
    const banco = bancoFalso()
    const { N } = notifyReal({ email: [5, 429], webhook: [300, 200] })
    const r = await lambda({ banco, notify: N.notifyFounder, setTimeoutImpl: tetoRapido }).alertFalExhausted({ source: 'cinematic' })
    checa("Resend 429 em 5 ms + ntfy lento: 'timeout' (falha rápida não é entrega) e o 'failed' do e-mail fica anotado", r === 'timeout' && banco.rows[0]?.metadata.state === 'timeout' && banco.rows[0].metadata.email === 'failed')
  }
  await espera(350) // os canais lentos terminam aqui dentro — nada vaza para a seção seguinte
}

// ═══════════════════ 4. EMPTY_PLAN / ZERO_POSTS ═══════════════════
console.log('== 4. defeito de despacho não é saldo ==')
{
  relogio.agora = Date.UTC(2026, 8, 28, 12, 0, 0)
  const banco = bancoFalso()
  const c = carteiro()
  const L = lambda({ banco, notify: c.fn })
  const a = await L.alertDispatchDefect({ kind: 'EMPTY_PLAN', engine: 'seedance', userId: 'u-9', context: 'duration=60' })
  const b = await L.alertDispatchDefect({ kind: 'EMPTY_PLAN', engine: 'seedance' })
  const z = await L.alertDispatchDefect({ kind: 'ZERO_POSTS', engine: 'seedance' })
  checa('EMPTY_PLAN: assunto verdadeiro — nomeia o defeito e diz que NÃO é saldo', a === 'sent' && c.enviados[0].subject.includes('EMPTY_PLAN') && c.enviados[0].subject.includes('not a fal balance problem') && !/balance EXHAUSTED/.test(c.enviados[0].subject))
  checa('um e-mail por tipo por janela, sem linha de contagem; ZERO_POSTS tem o seu', b === 'duplicate' && z === 'sent' && c.enviados.length === 2 && c.enviados[1].subject.includes('ZERO_POSTS') && banco.rows.every((r) => r.name === 'cinematic_dispatch_defect_alerted' && r.metadata.alerted === true))
  checa('defeito nunca escreve fal_balance_exhausted (não polui a contagem de saldo)', !banco.rows.some((r) => r.name === 'fal_balance_exhausted'))
}

// ═══════════════════ 5. Kineo 1: os catches chamam e ESPERAM ═══════════════════
console.log('== 5. Kineo 1 (gancho + clipes do primeiro filme) ==')
{
  const Areal = lambda({ banco: bancoFalso(), notify: carteiro().fn })
  const falQueRecusa = (erro) => ({ fal: { config() {}, queue: { async submit() { throw erro } } } })
  const erroSaldo = Object.assign(new Error('Forbidden'), { status: 403, body: { detail: FRASE_FAL } })
  const erroAcesso = Object.assign(new Error('Forbidden'), { status: 403, body: { detail: 'model is locked for your account' } })
  for (const [arquivo, fn, fonte, extra] of [
    ['lib/fastAiHook.ts', 'submitAiHook', 'kineo1_hook', { '@supabase/supabase-js': { createClient: () => ({}) }, './clipVault': { vaultClipAsync() {} } }],
    ['lib/fastAiClips.ts', 'submitSceneClip', 'kineo1_clip', { './fastAiHook': { persistHookClip: async () => null } }],
  ]) {
    const chamadas = []
    let libera
    const espiao = {
      looksExhausted: Areal.looksExhausted, // a classificação REAL
      alertFalExhausted: (input) => { chamadas.push(input); return new Promise((r) => { libera = () => r('sent') }) },
    }
    const M = carrega(arquivo, { '@fal-ai/client': falQueRecusa(erroSaldo), '@/lib/falAlert': espiao, ...extra }, { process: { env: { FAL_KEY: 'offline-only' } } })
    let terminou = false
    const p = M[fn]('a storm over the sea').then((v) => { terminou = true; return v })
    await tick(50)
    checa(`${arquivo}: recusa por saldo (message "Forbidden" + body.detail) chama o alarme com source ${fonte} e o motor Seedance`, chamadas.length === 1 && chamadas[0].source === fonte && /seedance\/v1\.5/.test(chamadas[0].engine))
    checa(`${arquivo}: o catch ESPERA o alarme (await, não void) — nada volta antes do envio`, terminou === false)
    libera?.()
    const v = await p
    checa(`${arquivo}: depois do alarme, segue o contrato de sempre (null, stock cobre a cena)`, v === null)
    const chamadas2 = []
    const M2 = carrega(arquivo, { '@fal-ai/client': falQueRecusa(erroAcesso), '@/lib/falAlert': { looksExhausted: Areal.looksExhausted, alertFalExhausted: async (i) => { chamadas2.push(i); return 'sent' } }, ...extra }, { process: { env: { FAL_KEY: 'offline-only' } } })
    checa(`${arquivo}: 403 de ACESSO não acorda o fundador`, (await M2[fn]('x')) === null && chamadas2.length === 0)
  }
}

// ═══════════════════ 6. poll: reserva uma vez, nunca conta ═══════════════════
console.log('== 6. poll de clipe (rota real) ==')
{
  const generationId = '00000000-0000-4000-8000-000000000011'
  const model = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
  const ids = ['clip-a', null, 'clip-b', 'clip-c']
  const codigo = rd('app/api/cinematic-clip-status/route.ts')
  async function poll(falAlert, { stage = 'status', detail = FRASE_FAL, queueError } = {}) {
    const claim = { status: 'settled', falRequestIds: ids, falModels: ids.map(() => model), resolutionReference: 'billing-x', authorizedCompletedUrls: ids.map(() => null), response: {} }
    const erro = Object.assign(new Error('Forbidden'), { status: 403, body: { detail } })
    const M = carrega('app/api/cinematic-clip-status/route.ts', {
      '@/lib/stuckScene': { stuckSceneIndexes: () => [], stuckClockStart: () => 0, lastSceneRetryAt: async () => null, CINEMATIC_SCENE_STUCK_EVENT: 'cinematic_scene_stuck' },
      'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
      '@/lib/serverEvents': { writeServerEvent: async () => true },
      '@/lib/strandedRescue': { CINEMATIC_CLIENT_POLL_EVENT: 'cinematic_client_poll', CLIENT_POLL_DEDUPE_MINUTES: 1 },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) } }) },
      '@supabase/supabase-js': { createClient: () => ({}) },
      '@fal-ai/client': { fal: { config() {}, queue: {
        async status(_m, { requestId }) {
          if (requestId === 'clip-c' && stage === 'status') throw erro
          return requestId === 'clip-c' ? { status: 'COMPLETED', request_id: requestId, error: queueError } : { status: 'IN_PROGRESS', request_id: requestId }
        },
        async result() { return { data: {} } },
      } } },
      '@/lib/cinematic/claim': {
        validCinematicGenerationId: (v) => v === generationId,
        loadVerifiedCinematicClaim: async () => ({ ok: true, claim }),
        authorizeCinematicCompletedUrls: async () => ({ ok: true, claim }),
        authorizeCinematicTerminalFailures: async ({ failed }) => { claim.response.terminal_failed_jobs = failed; return { ok: true, claim } },
        cinematicJobsAreTerminal: () => false,
        releaseCinematicClaim: async () => ({ ok: true }),
      },
      '@/lib/credits/refund': { refundRenderCredits: async () => 0 },
      '@/lib/falAlert': falAlert,
    }, { process: { env: { FAL_KEY: 'offline-only', NEXT_PUBLIC_SUPABASE_URL: 'https://offline.invalid', SUPABASE_SERVICE_ROLE_KEY: 'offline-only' } } }, codigo)
    return M.GET({ nextUrl: new URL(`https://offline.invalid/api/cinematic-clip-status?generationId=${generationId}&ids=${encodeURIComponent(JSON.stringify(ids))}`) })
  }
  relogio.agora = Date.UTC(2026, 8, 21, 1, 30, 0)
  const banco = bancoFalso()
  const c = carteiro()
  const lambdaA = lambda({ banco, notify: c.fn })
  for (let i = 0; i < 5; i++) await poll(lambdaA)
  const lambdaB = lambda({ banco, notify: c.fn })
  for (let i = 0; i < 3; i++) await poll(lambdaB)
  const opsAposReserva = banco.ops.filter((o) => o.action === 'insert').length
  checa('poll com a frase exata: 1 e-mail em 8 polls de 2 lambdas', c.enviados.length === 1)
  checa('poll NUNCA escreve linha de contagem (só a reserva da janela)', banco.rows.length === 1 && banco.rows[0].metadata.alerted === true && banco.rows[0].metadata.source === 'poll')
  checa('a lambda que já viu a reserva nem tenta INSERT de novo (2 inserts: 1 reserva + 1 da outra lambda batendo no 23505)', opsAposReserva === 2)
  // o ramo COMPLETED + error (cena aceita que morreu com a conta travada)
  const banco2 = bancoFalso()
  const c2 = carteiro()
  const L3 = lambda({ banco: banco2, notify: c2.fn })
  await poll(L3, { stage: 'none', queueError: FRASE_FAL })
  await poll(L3, { stage: 'none', queueError: FRASE_FAL })
  checa('COMPLETED com erro de saldo (cena aceita morta): alarma uma vez, sem contagem', c2.enviados.length === 1 && banco2.rows.length === 1)
  // só evidência explícita
  const banco3 = bancoFalso()
  const c3 = carteiro()
  await poll(lambda({ banco: banco3, notify: c3.fn }), { detail: 'User is locked' })
  checa('"User is locked" sem a razão NÃO alarma no poll', c3.enviados.length === 0 && banco3.rows.length === 0)
  checa('as duas chamadas do poll passam countRow:false', (codigo.match(/alertFalExhausted\(\{ source: 'poll', engine: model, generationId, countRow: false \}\)/g) ?? []).length === 2)
}

// ═══════════════════ 7. retry de cena e Avatar ═══════════════════
console.log('== 7. retry-hollywood-scene e veed ==')
{
  const retry = rd('app/api/retry-hollywood-scene/route.ts')
  const i = retry.indexOf('const explicitRejection = !accepted && error instanceof FalQueueSubmitError && !error.ambiguous')
  const linha = retry.slice(i, retry.indexOf('if (!falPosted || explicitRejection)', i))
  checa('retry: UMA chamada, só em recusa EXPLÍCITA classificada como saldo, com await', (retry.match(/alertFalExhausted\(/g) ?? []).length === 1 && linha.includes("if (explicitRejection && looksExhausted(error as FalQueueSubmitError)) await alertFalExhausted({ source: 'retry_scene'"))
  const veed = rd('lib/avatar/veed.ts')
  checa('veed: nenhum "void alertFalExhausted" (o throw logo depois cortava o envio)', !/void alertFalExhausted/.test(veed))
  checa('veed: as 3 chamadas agora são await com fonte própria', ['avatar_animate', 'avatar_submit', 'avatar_matte'].every((s) => veed.includes(`await alertFalExhausted({ source: '${s}'`)))
}

// ═══════════════════ 7b. Hollywood host: UM alarme por despacho, creditado ao filme (revisão 2, 28/09) ═══════════════════
// O CASO DO REVISOR: na rota cinematic, cena de diálogo com âncora vai por submitAvatarJob (host TTS, ligado por
// padrão). Com a fal sem saldo, veed alarmava 'avatar_submit' ANTES de a rota cair no O3 — que também recusava e
// ligava a flag do finalizador. Um despacho = N+1 linhas, e o ÚNICO e-mail da janela saía como "Source: avatar_submit ·
// engine: fal-ai/kling-video/ai-avatar/v2/standard", sem cena, pessoa nem geração — um produto fora do catálogo desde
// 27/09. Aqui: veed.ts REAL + falAlert.ts REAL (banco falso), fetch devolvendo o 403 real da fal.
console.log('== 7b. host do Hollywood: a recusa vira a flag do despacho; o finalizador é o único alarme ==')
{
  const fetch403 = async () => ({ ok: false, status: 403, text: async () => JSON.stringify({ detail: FRASE_FAL }) })
  const veedCom = (L) => carrega('lib/avatar/veed.ts', { '@fal-ai/client': { fal: { config() {} } }, '@/lib/falAlert': L }, { process: { env: { FAL_KEY: 'offline-only' } }, fetch: fetch403 })
  const cenaHost = { imageUrl: 'https://offline.invalid/p.png', audioUrl: 'https://offline.invalid/a.mp3', engine: 'presenter' }
  relogio.agora = Date.UTC(2026, 8, 29, 0, 30, 0)
  const banco = bancoFalso()
  const c = carteiro()
  const L = lambda({ banco, notify: c.fn })
  const V = veedCom(L)
  const erros = []
  for (let i = 0; i < 2; i++) { try { await V.submitAvatarJob({ ...cenaHost, alertOnBalance: false }) } catch (e) { erros.push(e) } }
  checa('veed real, alertOnBalance:false: as 2 cenas de diálogo lançam o AvatarSubmitError explícito (403, não ambíguo) sem alarmar', erros.length === 2 && erros.every((e) => e instanceof V.AvatarSubmitError && e.status === 403 && e.ambiguous === false) && banco.rows.length === 0 && c.enviados.length === 0)
  checa('… e o erro carrega a frase da fal: o looksExhausted real diz SALDO (é o que a rota lê para ligar a flag)', erros.every((e) => L.looksExhausted(e) === true))
  // O que o finalizador manda (seção 9 executa a fatia real da rota): source cinematic, motor, pessoa, geração, cenas.
  await L.alertFalExhausted({ source: 'cinematic', engine: 'fal-ai/kling-video/o3/pro/image-to-video', userId: 'u-1', generationId: 'g-1', scenesRefused: 5, path: '/api/generate-video-cinematic' })
  const linhas = banco.rows.filter((r) => r.name === 'fal_balance_exhausted')
  checa(`um despacho Hollywood com 2 cenas de diálogo recusadas = UMA linha fal_balance_exhausted (achei ${linhas.length}; antes: 3)`, linhas.length === 1)
  checa("… creditada ao FILME: source 'cinematic', geração, pessoa e cenas — nada de 'avatar_submit'", linhas[0]?.metadata.source === 'cinematic' && linhas[0].metadata.generation_id === 'g-1' && linhas[0].metadata.user_id === 'u-1' && linhas[0].metadata.scenes_refused === 5 && !banco.rows.some((r) => r.metadata?.source === 'avatar_submit'))
  checa('… e o único e-mail diz "Source: cinematic" com as cenas recusadas', c.enviados.length === 1 && c.enviados[0].text.includes('Source: cinematic') && c.enviados[0].text.includes('Scenes refused in this attempt: 5') && !c.enviados[0].text.includes('avatar_submit'))
  // O /api/generate-avatar (link direto, fora do catálogo mas no ar) continua com o alarme próprio: o padrão não mudou.
  relogio.agora = Date.UTC(2026, 8, 29, 6, 30, 0)
  const banco2 = bancoFalso()
  const c2 = carteiro()
  const L2 = lambda({ banco: banco2, notify: c2.fn })
  let lancou = false
  try { await veedCom(L2).submitAvatarJob(cenaHost) } catch { lancou = true }
  checa("sem a opção (o /api/generate-avatar): o alarme 'avatar_submit' de sempre, um e-mail", lancou && banco2.rows.length === 1 && banco2.rows[0].metadata.source === 'avatar_submit' && c2.enviados.length === 1)
  const veed = rd('lib/avatar/veed.ts')
  checa('veed: a guarda é explícita — só alertOnBalance === false cala o alarme de dentro', veed.includes("if (args.alertOnBalance !== false && looksExhausted(e)) await alertFalExhausted({ source: 'avatar_submit'"))
}

// ═══════════════════ 8. /admin ═══════════════════
console.log('== 8. card do /admin/supplier-health ==')
{
  const P = carrega('lib/supplier/falBalancePanel.ts', { '@/lib/internalAccounts': { INTERNAL_EXACT_EMAILS: ['a@x'], INTERNAL_LIKE_PATTERNS: ['t%'] } })
  // formato REAL devolvido pelo SELECT da função em 27/09 (só leitura)
  // formato REAL devolvido pelo SELECT da função revisada em 28/09 (só leitura): a última recusa é 21/09 02:03 UTC.
  const real = { days: 30, by_day: [], latest: null, last_refusal_at: '2026-09-21T02:03:36.820536+00:00', dispatch: { people: 2, dispatches: 12, scenes_refused: 36, external_people: 1, refunded_credits: 450, delivered_charged_credits: 44, unrefunded_undelivered_debits: 0, unrefunded_undelivered_credits: 0, unrefunded_undelivered_external: 0 } }
  const p = P.parseFalBalancePanel(real)
  checa('parser lê o formato real da RPC (12 despachos, 36 cenas, 450 cr estornados, 0 parado, última recusa 21/09)', p?.mode === 'rpc' && p.dispatch.dispatches === 12 && p.dispatch.scenesRefused === 36 && p.dispatch.refundedCredits === 450 && p.dispatch.unrefundedUndeliveredCredits === 0 && p.latest === null && p.lastRefusalAt === '2026-09-21T02:03:36.820536+00:00')
  const agora = Date.UTC(2026, 8, 28, 12)
  const painel = (latestAt, lastRefusalAt) => ({ mode: 'rpc', days: 30, latest: latestAt ? { createdAt: latestAt, source: 'cinematic', engine: null, state: 'sent', scenesRefused: null } : null, lastRefusalAt, byDay: [], dispatch: null })
  const iso = (ms) => new Date(ms).toISOString()
  checa('recusa de 2 h atrás = fresco (vermelho); de 7 h = não; sem painel = não', P.falRefusalIsFresh(painel(null, iso(agora - 2 * 3600e3)), agora) === true && P.falRefusalIsFresh(painel(null, iso(agora - 7 * 3600e3)), agora) === false && P.falRefusalIsFresh(null, agora) === false)
  // O CASO DO REVISOR: reserva às 00:10 UTC (1ª recusa da janela), recusas até 05:50, card aberto às 06:30.
  const d0 = Date.UTC(2026, 8, 21, 0, 0)
  const H = 3600e3
  const caso = painel(iso(d0 + 10 * 60e3), iso(d0 + 5 * H + 50 * 60e3))
  checa('reserva 00:10, última recusa 05:50, card às 06:30 → VERMELHO (antes: verde "No balance alarm in the last 6 h")', P.falRefusalIsFresh(caso, d0 + 6 * H + 30 * 60e3) === true && P.falLastRefusalAt(caso) === iso(d0 + 5 * H + 50 * 60e3))
  checa('sem last_refusal_at (RPC antiga/fallback vazio) o alarme conta como recusa; o mais novo dos dois vence', P.falRefusalIsFresh(painel(iso(agora - H), null), agora) === true && P.falLastRefusalAt(painel(iso(agora - H), iso(agora - 3 * H))) === iso(agora - H))
  // RPC ausente (migration não aplicada): cai para contagens exatas, nunca linha crua
  const adminFalso = ({ erroEm = null, countNulo = false } = {}) => {
    const consultas = []
    return {
      consultas,
      rpc: async () => ({ data: null, error: { code: 'PGRST202', message: 'function not found' } }),
      from(t) {
        const q = { sel: null, opts: null, filtros: [], lim: null }
        const api = {
          select(s, o) { q.sel = s; q.opts = o ?? null; return api },
          eq(k, v) { q.filtros.push([k, v]); return api },
          is(k, v) { q.filtros.push([k, v]); return api }, // revisão 2: a leitura real filtra metadata->>ip_hash is null
          gte(k, v) { q.filtros.push([k, v]); return api },
          is(k, v) { q.filtros.push([k, v]); return api }, // FIX-REVISAO-2: o leitor filtra o carimbo do sink (metadata->ip_hash/is_bot IS NULL)
          order() { return api },
          limit(n) { q.lim = n; return api },
          then(res) {
            consultas.push({ t, ...q })
            const nome = (q.filtros.find(([k]) => k === 'name') ?? [])[1]
            const alarme = q.filtros.some(([k]) => k === 'metadata->>alerted')
            const qual = q.opts?.head ? 'count' : alarme ? 'latest' : nome === 'fal_balance_exhausted' ? 'lastRow' : 'lastDispatch'
            if (erroEm === 'todas' || erroEm === qual) return Promise.resolve({ data: null, count: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } }).then(res)
            if (qual === 'count') return Promise.resolve({ data: null, count: countNulo ? null : 7, error: null }).then(res)
            if (qual === 'latest') return Promise.resolve({ data: [{ created_at: '2026-09-21T00:28:40Z', metadata: { source: 'cinematic', state: 'sent', alerted: true } }], error: null }).then(res)
            if (qual === 'lastRow') return Promise.resolve({ data: [{ created_at: '2026-09-21T05:50:00Z' }], error: null }).then(res)
            return Promise.resolve({ data: [{ created_at: '2026-09-21T02:03:36Z' }], error: null }).then(res)
          },
        }
        return api
      },
    }
  }
  const adm = adminFalso()
  const fb = await P.readFalBalancePanel(adm, new Date(agora))
  checa('sem a migration: modo fallback, último alarme lido, contagem exata de despachos e a ÚLTIMA recusa (a mais nova das duas fontes)', fb?.mode === 'fallback' && fb.latest?.source === 'cinematic' && fb.dispatch?.dispatches === 7 && fb.lastRefusalAt === '2026-09-21T05:50:00Z')
  checa('fallback só faz leitura limitada: 1 linha (limit 1) ou count exact/head (o banco conta)', adm.consultas.length === 4 && adm.consultas.every((q) => q.lim === 1 || (q.opts?.head === true && q.opts?.count === 'exact')))
  // O CASO DO REVISOR: statement timeout nas leituras do fallback → antes: {latest:null, dispatch:null} = verde.
  for (const onde of ['todas', 'latest', 'count', 'lastRow', 'lastDispatch']) {
    const r = await P.readFalBalancePanel(adminFalso({ erroEm: onde }), new Date(agora))
    checa(`fallback com erro em ${onde} (57014) → null = "não medido" (âmbar), nunca "sem alarme" (verde)`, r === null)
  }
  checa('count exact que volta sem número não vira zero → null', (await P.readFalBalancePanel(adminFalso({ countNulo: true }), new Date(agora))) === null)
  const lanca = await P.readFalBalancePanel({ rpc: async () => { throw new Error('boom') } }, new Date(agora))
  checa('leitura que lança = null ("não medido"), nunca derruba o painel', lanca === null)
  const pagina = rd('app/admin/supplier-health/page.tsx')
  checa('o card vem ANTES da tabela de fornecedores', pagina.indexOf('<FalBalanceCard panel={falPanel}') > 0 && pagina.indexOf('<FalBalanceCard panel={falPanel}') < pagina.indexOf('one line per supplier ─'))
  checa('o card tem o botão de recarga e o rótulo de contas internas', pagina.includes('href={FAL_BILLING_URL}') && pagina.includes('INTERNAL_ACCOUNTS_LABEL'))
  checa('o vermelho do card vem de falRefusalIsFresh(panel) (última recusa), não da reserva', pagina.includes('const fresh = falRefusalIsFresh(panel, nowMs)') && !pagina.includes('falAlarmIsFresh'))
  const manchete = pagina.slice(pagina.indexOf("{!panel\n"), pagina.indexOf("'No balance refusal recorded yet'") + 40)
  checa('manchete: panel null é a PRIMEIRA pergunta e diz "Not measured" em âmbar', /\{!panel\s*\n\s*\? 'Not measured right now — this is NOT a sign of health'/.test(manchete) && pagina.includes("color: !panel ? '#fbbf24'"))
  const mig = 'supabase/migrations/20260928090000_admin_fal_balance_panel.sql'
  const sql = existsSync(join(RAIZ, mig)) ? rd(mig) : ''
  checa('migration da RPC existe, conta no banco e só o service_role executa', sql.includes('create or replace function public.admin_fal_balance_panel(') && sql.includes('revoke all on function public.admin_fal_balance_panel(text[], text[], integer) from public, anon, authenticated;') && sql.includes('grant execute on function public.admin_fal_balance_panel(text[], text[], integer) to service_role;'))
  checa('a RPC conta créditos cobrados SEM entrega (dinheiro parado) e usa NOT EXISTS para contas internas', sql.includes("'unrefunded_undelivered_credits'") && sql.includes("c.metadata->>'status' = 'done'") && !/not in \(select/i.test(sql))
  checa('a RPC devolve last_refusal_at = max das DUAS fontes (toda linha fal_balance_exhausted + despacho com saldo)', sql.includes("'last_refusal_at', greatest(") && sql.includes('(select max(a.created_at) from alarmes a)') && sql.includes('(select max(d.created_at) from despachos d)') && /despachos as \(\s*\n\s*select e\.user_id,\s*\n\s*e\.created_at,/.test(sql))
  checa("'E-mails sent' conta só envio entregue (state=sent) — uma re-tentativa que falhou não vira e-mail", sql.includes("count(*) filter (where a.metadata->>'alerted' = 'true' and a.metadata->>'state' = 'sent') as alertas"))
}

// ═══════════════════ 8b. o card não manda estornar filme a caminho, e não pinta de verde o que não mediu (revisão 2) ═══════════════════
console.log('== 8b. card: filme em voo fora do "refund them"; fallback nunca verde (FalBalanceCard real) ==')
{
  const P = carrega('lib/supplier/falBalancePanel.ts', { '@/lib/internalAccounts': { INTERNAL_EXACT_EMAILS: ['a@x'], INTERNAL_LIKE_PATTERNS: ['t%'] } })
  // O card REAL: FalBalanceCard de app/admin/supplier-health/page.tsx (a página não pode exportá-lo — o Next recusa
  // export extra em page — então o export é acrescentado em memória), renderizado com react-dom/server.
  const requireNode = (await import('node:module')).createRequire(import.meta.url)
  const React = requireNode('react')
  const jsxRuntime = requireNode('react/jsx-runtime')
  const { renderToStaticMarkup } = requireNode('react-dom/server')
  const pagina = rd('app/admin/supplier-health/page.tsx')
  const js = ts.transpileModule(`${pagina}\nexport { FalBalanceCard }\n`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const ex = {}
  vm.runInNewContext(js, {
    exports: ex,
    require: (m) => ({
      'react/jsx-runtime': jsxRuntime, react: React,
      'next/link': { __esModule: true, default: ({ children, ...p }) => React.createElement('a', p, children) },
      '@/lib/supabase/server': { createClient() { throw new Error('offline') } },
      '@/app/api/admin/_shared/db': { isAdminEmail: () => false, serviceClient: () => null },
      '@/lib/supplier/burn': { readSupplierBurn: async () => [] },
      '@/lib/supplier/falBalancePanel': P,
      '@/lib/falAlert': { FAL_BILLING_URL: 'https://fal.ai/dashboard/billing' },
      '@/lib/internalAccounts': { INTERNAL_ACCOUNTS_LABEL: 'internal accounts excluded' },
      '@/lib/supplier/generationHealth': { readGenerationHealth: async () => null, describeRules: () => '', FAILURE_RATE_PCT: 50, FAST_MIN_ATTEMPTS: 5, SLOW_MIN_ATTEMPTS: 8, MIN_DISTINCT_USERS: 2, REASON_REPEAT_MIN: 10 },
    })[m] ?? (() => { throw new Error('import inesperado no card: ' + m) })(),
    process: { env: {} }, console: { log() {}, warn() {}, error() {} }, Date, Math, JSON, Number, String, Array, Object, Promise, Error,
  }, { filename: 'supplier-health/page.tsx' })
  const agora = Date.UTC(2026, 8, 28, 12)
  const card = (panel) => renderToStaticMarkup(React.createElement(ex.FalBalanceCard, { panel, nowMs: agora }))
  const tileDe = (html, rotulo) => {
    const m = new RegExp(`>${rotulo}</div><div class="font-black" style="[^"]*color:(#[0-9a-fA-F]{6})">([^<]*)</div>(?:<p[^>]*>([^<]*)</p>)?`).exec(html)
    return m ? { cor: m[1].toLowerCase(), valor: m[2], nota: m[3] ?? '' } : null
  }
  const VERDE = '#34d399', AMBAR = '#fbbf24', VERMELHO = '#f87171'
  // (1) O CASO DO REVISOR, fallback (migration não aplicada = o estado no lançamento): RPC PGRST202 + 4 leituras exatas.
  const adminFallback = {
    rpc: async () => ({ data: null, error: { code: 'PGRST202', message: 'function not found' } }),
    from() {
      const q = { head: false, alarme: false, nome: null }
      const api = {
        select(_s, o) { q.head = !!o?.head; return api }, eq(k, v) { if (k === 'metadata->>alerted') q.alarme = true; if (k === 'name') q.nome = v; return api },
        is() { return api }, gte() { return api }, order() { return api }, limit() { return api },
        then(res) {
          if (q.head) return Promise.resolve({ data: null, count: 12, error: null }).then(res)
          if (q.alarme) return Promise.resolve({ data: [{ created_at: '2026-09-21T00:28:40Z', metadata: { source: 'cinematic', state: 'sent', alerted: true } }], error: null }).then(res)
          return Promise.resolve({ data: [{ created_at: '2026-09-21T02:03:36Z' }], error: null }).then(res)
        },
      }
      return api
    },
  }
  const fb = await P.readFalBalancePanel(adminFallback, new Date(agora))
  checa('fallback real: modo fallback com o dinheiro NÃO medido (null) — inclusive o em voo', fb?.mode === 'fallback' && fb.dispatch?.unrefundedUndeliveredCredits === null && fb.dispatch?.inFlightCredits === null)
  checa("falStuckMoneyState(fallback) = 'not_measured'", P.falStuckMoneyState?.(fb.dispatch) === 'not_measured')
  const hFb = card(fb)
  const parado = tileDe(hFb, 'Charged, NOT delivered')
  checa(`card real no fallback: "Charged, NOT delivered" em ÂMBAR "Not measured", nunca verde "should always be 0" (achei ${parado?.cor} "${parado?.valor}" "${parado?.nota}")`, parado?.cor === AMBAR && parado.valor === '—' && /^Not measured/.test(parado.nota) && !hFb.includes('should always be 0'))
  const semMedida = ['Scenes refused', 'Credits refunded', 'Charged, film delivered', 'People'].map((r) => tileDe(hFb, r))
  checa('card real no fallback: nenhum tile sem número fica verde — todos âmbar "Not measured"', semMedida.every((t) => t && t.cor === AMBAR && t.valor === '—' && /^Not measured/.test(t.nota)) && !new RegExp(`color:${VERDE}">—<`).test(hFb))
  checa('card real no fallback: o tile "still rendering" só existe quando a RPC mede (não inventa zero)', tileDe(hFb, 'Charged, still rendering') === null)
  // (2) Hollywood ≥ 90 % seguindo cobrado com recusa de saldo: o e-mail sai NA HORA e o filme ainda renderiza.
  const rpc = (dispatch) => P.parseFalBalancePanel({ days: 30, by_day: [], latest: null, last_refusal_at: new Date(agora - 60e3).toISOString(), dispatch: { dispatches: 1, scenes_refused: 1, people: 1, external_people: 1, refunded_credits: 0, delivered_charged_credits: 0, ...dispatch } })
  const emVoo = rpc({ unrefunded_undelivered_credits: 0, unrefunded_undelivered_debits: 0, unrefunded_undelivered_external: 0, in_flight_credits: 150, in_flight_debits: 1, in_flight_window_minutes: 120 })
  checa('parser lê in_flight_* da RPC (150 cr, 1 débito, janela de 120 min)', emVoo?.dispatch?.inFlightCredits === 150 && emVoo.dispatch.inFlightDebits === 1 && emVoo.dispatch.inFlightWindowMinutes === 120 && P.falStuckMoneyState?.(emVoo.dispatch) === 'clear')
  const hVoo = card(emVoo)
  const vooParado = tileDe(hVoo, 'Charged, NOT delivered')
  const vooTile = tileDe(hVoo, 'Charged, still rendering')
  checa('filme de 150 cr a caminho: nenhum "refund them" no card; "Charged, NOT delivered" = 0', !hVoo.includes('refund them') && vooParado?.valor === '0' && vooParado.cor === VERDE)
  checa('… e o filme aparece em "Charged, still rendering" (âmbar) com "do NOT refund"', vooTile?.valor === '150' && vooTile.cor === AMBAR && /do NOT refund/.test(vooTile.nota) && /120-min delivery window/.test(vooTile.nota))
  // (3) Dinheiro parado de verdade (fora da janela): continua vermelho e manda estornar.
  const hParado = card(rpc({ unrefunded_undelivered_credits: 25, unrefunded_undelivered_debits: 1, unrefunded_undelivered_external: 1, in_flight_credits: 0, in_flight_debits: 0, in_flight_window_minutes: 120 }))
  const t3 = tileDe(hParado, 'Charged, NOT delivered')
  checa('parado fora da janela (25 cr, externo): vermelho "older than 120 min — refund them"', t3?.cor === VERMELHO && t3.valor === '25' && /older than 120 min — refund them/.test(t3.nota))
  // (4) Uma RPC que não separa o em voo (sem in_flight_*): nunca "refund them" às cegas.
  const cega = rpc({ unrefunded_undelivered_credits: 150, unrefunded_undelivered_debits: 1, unrefunded_undelivered_external: 1 })
  const t4 = tileDe(card(cega), 'Charged, NOT delivered')
  checa("RPC sem in_flight_*: 'unseparated' — âmbar \"check each one before refunding\", nunca \"refund them\"", P.falStuckMoneyState?.(cega.dispatch) === 'unseparated' && t4?.cor === AMBAR && /check each one before refunding/.test(t4.nota))
  // (5) A SQL (a migration ainda não foi aplicada — editada no lugar): a janela de entrega existe e bate com o TS.
  const sql = rd('supabase/migrations/20260928090000_admin_fal_balance_panel.sql')
  const corpoDebitos = sql.slice(sql.indexOf('  debitos as ('), sql.indexOf('  select jsonb_build_object('))
  checa('SQL: em_voo = despacho com menos de 120 min OU compose com claim pending aberta há menos de 120 min', /\(d\.created_at > now\(\) - interval '120 minutes'\s*\n\s*or exists \(/.test(corpoDebitos) && /c\.metadata->>'status' = 'pending' and c\.created_at > now\(\) - interval '120 minutes'/.test(corpoDebitos) && /\) as em_voo/.test(corpoDebitos))
  const linhaDe = (chave) => (sql.match(new RegExp(`'${chave}', \\(select[^\\n]*`)) ?? [''])[0]
  checa("SQL: os 3 números de 'dinheiro parado' excluem o em voo (and not b.em_voo) — antes contavam o filme renderizando", ['unrefunded_undelivered_credits', 'unrefunded_undelivered_debits', 'unrefunded_undelivered_external'].every((k) => linhaDe(k).includes('and not b.entregue and not b.em_voo')))
  checa("SQL: in_flight_credits/in_flight_debits = cobrado, sem entrega, DENTRO da janela; in_flight_window_minutes = 120", linhaDe('in_flight_credits').includes('and not b.entregue and b.em_voo') && linhaDe('in_flight_debits').includes('and not b.entregue and b.em_voo') && sql.includes("'in_flight_window_minutes', 120"))
  checa('janela da SQL (120 min) = FAL_PANEL_IN_FLIGHT_MINUTES do card', P.FAL_PANEL_IN_FLIGHT_MINUTES === 120 && (sql.match(/interval '120 minutes'/g) ?? []).length === 2)
  // (6) LINHA FORJADA (o revisor: POST anônimo no /api/events com event_name fal_balance_exhausted, state 'sent'):
  // o sink do navegador carimba metadata.ip_hash/is_bot; lib/falAlert nunca. Banco falso que APLICA os filtros.
  const adminDe = (linhas) => ({
    rpc: async () => ({ data: null, error: { code: 'PGRST202', message: 'function not found' } }),
    from() {
      const q = { head: false, filtros: [], nulos: [] }
      const api = {
        select(_s, o) { q.head = !!o?.head; return api }, eq(k, v) { q.filtros.push([k, v]); return api }, is(k, v) { if (v === null) q.nulos.push(k); return api },
        gte() { return api }, order() { return api }, limit() { return api },
        then(res) {
          const campo = (r, k) => (k.startsWith('metadata->>') ? (r.metadata?.[k.slice(11)] === undefined ? undefined : String(r.metadata[k.slice(11)])) : r[k])
          const achadas = linhas.filter((r) => q.filtros.every(([k, v]) => campo(r, k) === v) && q.nulos.every((k) => campo(r, k) === undefined))
            .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
          if (q.head) return Promise.resolve({ data: null, count: achadas.length, error: null }).then(res)
          return Promise.resolve({ data: achadas.slice(0, 1), error: null }).then(res)
        },
      }
      return api
    },
  })
  const recente = new Date(agora - 60e3).toISOString()
  const forjada = { name: 'fal_balance_exhausted', created_at: recente, metadata: { alerted: true, state: 'sent', source: 'cinematic', engine: 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video', scenes_refused: 9, ip_hash: 'h-anon', is_bot: false } }
  const doServidor = { name: 'fal_balance_exhausted', created_at: recente, metadata: { alerted: true, state: 'sent', source: 'cinematic', engine: 'x', user_id: null } }
  const pForjado = await P.readFalBalancePanel(adminDe([forjada]), new Date(agora))
  checa('linha forjada pelo sink do navegador (ip_hash carimbado): o card NÃO fica vermelho nem mostra "Last alarm … sent"', pForjado?.mode === 'fallback' && pForjado.latest === null && pForjado.lastRefusalAt === null && P.falRefusalIsFresh(pForjado, agora) === false)
  const pServidor = await P.readFalBalancePanel(adminDe([doServidor, forjada]), new Date(agora))
  checa('controle: a linha do servidor (lib/falAlert, sem ip_hash) continua pintando o vermelho', pServidor?.latest?.state === 'sent' && P.falRefusalIsFresh(pServidor, agora) === true)
  const cteAlarmes = sql.slice(sql.indexOf('  alarmes as ('), sql.indexOf('  por_dia as ('))
  checa("SQL: alarmes e ultimo ignoram linha com metadata ? 'ip_hash' (carimbo do sink do navegador)", cteAlarmes.split("and not (e.metadata ? 'ip_hash')").length === 3)
  checa('SQL segue só leitura, SECURITY DEFINER, search_path public, revoke public/anon/authenticated, grant só service_role', /language sql\nsecurity definer\nset search_path = public\nstable\n/.test(sql) && !/\b(insert|update|delete|truncate|alter|drop)\b/i.test(sql.slice(sql.indexOf('as $$'), sql.indexOf('$$;'))) && sql.includes('revoke all on function public.admin_fal_balance_panel(text[], text[], integer) from public, anon, authenticated;') && sql.includes('grant execute on function public.admin_fal_balance_panel(text[], text[], integer) to service_role;') && (sql.match(/^grant /gm) ?? []).length === 1)
}

// ═══════════════════ 9. rota cinematic (TRAVA 8.2) ═══════════════════
console.log(`== 9. rota cinematic — trava 8.2 ${TRAVA_82_APLICADA ? 'APLICADA' : 'pendente (confere que nada ficou pela metade)'} ==`)
{
  const rota = rd('app/api/generate-video-cinematic/route.ts')
  const chamadas = (rota.match(/alertFalExhausted\(/g) ?? []).length
  if (!TRAVA_82_APLICADA) {
    checa('rota intacta: ainda não importa lib/falAlert', !rota.includes("from '@/lib/falAlert'"))
    checa('rota intacta: as cópias locais seguem lá até a trava subir', rota.includes('async function alertFalExhausted(context: string)') && rota.includes('let LAST_FAL_ALERT = 0'))
  } else {
    checa('as cópias locais sumiram (looksExhausted, alertFalExhausted, LAST_FAL_ALERT)', !/function looksExhausted\(/.test(rota) && !/async function alertFalExhausted\(/.test(rota) && !rota.includes('LAST_FAL_ALERT'))
    checa('importa o alarme único de lib/falAlert', /import \{[^}]*\balertFalExhausted\b[^}]*\blooksExhausted\b[^}]*\} from '@\/lib\/falAlert'/.test(rota) || /import \{[^}]*\blooksExhausted\b[^}]*\balertFalExhausted\b[^}]*\} from '@\/lib\/falAlert'/.test(rota))
    const ini = rota.indexOf('async function finalizarDespacho(ctx: DispatchContext, res: Response): Promise<void> {')
    const fim = rota.indexOf('\n}\n', ini)
    const corpo = ini >= 0 && fim > ini ? rota.slice(ini, fim + 2) : ''
    checa(`exatamente UMA chamada de alertFalExhausted na rota inteira (achei ${chamadas}) e ela mora em finalizarDespacho`, chamadas === 1 && (corpo.match(/alertFalExhausted\(/g) ?? []).length === 1)
    checa('a chamada é guardada por ctx.balanceExhausted', /if \(ctx\.balanceExhausted\) \{\s*\n\s*await alertFalExhausted\(\{/.test(corpo))
    const vazio = rota.slice(rota.indexOf('if (planoVazio) {'), rota.indexOf("error: 'Could not submit clips to AI generator. Please try again.'"))
    checa('EMPTY_PLAN e ZERO_POSTS não chamam o alarme de saldo; cada um tem o seu alarme de defeito', vazio.length > 0 && !vazio.includes('alertFalExhausted') && vazio.includes("await alertDispatchDefect({ kind: 'EMPTY_PLAN'") && vazio.includes("await alertDispatchDefect({ kind: 'ZERO_POSTS'"))
    checa('nenhum e-mail do fundador cravado em código de alarme na rota (to: [...] / api.resend.com)', !/to:\s*\['[^']*@/.test(rota) && !rota.includes('api.resend.com'))
    checa('a flag de saldo continua nascendo só de balance_quota / da classe (nada de 403 genérico)', rota.includes("if (despachoCena.outcome.reason_class === 'balance_quota') c.balanceExhausted = true") && rota.includes('if (looksExhausted({ status, message: e?.message })) ctxDespacho().balanceExhausted = true'))
    // EXECUTA a fatia real de finalizarDespacho
    if (corpo) {
      const src = `export async function rodar(ctx: any, res: any, deps: any) {\n  const { writeServerEvent, resumirPlano, invarianteFecha, providerSpendPossible, safeLogFields, alertFalExhausted, process } = deps\n  ${corpo}\n  return finalizarDespacho(ctx, res)\n}`
      const F = carrega('finalizarDespacho', {}, {}, src)
      const exec = async (ctx, eventoLanca = false) => {
        const alarmes = []
        const eventos = []
        await F.rodar(ctx, { status: 503 }, {
          writeServerEvent: async (e) => { if (eventoLanca) throw new Error('db'); eventos.push(e) },
          resumirPlano: () => ({ planned: 8, attempted: 8, accepted: 3, rejected: 5, ambiguous: 0, not_attempted: 0, total_posts: 8, reason_histogram: { ok: 3, balance_quota: 5 }, provider_status_histogram: { 200: 3, 403: 5 } }),
          invarianteFecha: () => true, providerSpendPossible: () => true, safeLogFields: (x) => x,
          alertFalExhausted: async (i) => { alarmes.push(i); return 'sent' },
          process: { env: {} },
        })
        return { alarmes, eventos }
      }
      const base = () => ({ balanceExhausted: true, registrado: false, outcomes: [], attempts: [], totalPosts: 8, planned: 8, userId: 'u-1', generationId: 'g-1', claimId: null, billingReference: 'b', engine: 'seedance', quality: 'cinematic', claimAction: 'released', refundConfirmed: true, submittedPrompts: [], cenarioRemovido: [] })
      const a = await exec(base())
      checa('finalizarDespacho (fatia real): saldo → 1 alarme com source cinematic, motor, pessoa e cenas recusadas do histograma', a.alarmes.length === 1 && a.alarmes[0].source === 'cinematic' && a.alarmes[0].engine === 'seedance' && a.alarmes[0].userId === 'u-1' && a.alarmes[0].generationId === 'g-1' && a.alarmes[0].scenesRefused === 5)
      const b = await exec({ ...base(), balanceExhausted: false })
      checa('finalizarDespacho: sem saldo → nenhum alarme', b.alarmes.length === 0 && b.eventos.length === 1)
      const cc = await exec({ ...base(), registrado: true })
      checa('finalizarDespacho: já registrado → nenhum alarme duplicado', cc.alarmes.length === 0)
      const d = await exec(base(), true)
      checa('finalizarDespacho: telemetria que cai não cala o alarme', d.alarmes.length === 1)
    }
  }
  // ═══ REVISÃO 2 (28/09) — o host do Hollywood (cena de diálogo por submitAvatarJob) não alarma por conta própria ═══
  // Vira true no commit "[TRAVA 8.2] FIX-REVISAO-2" que passa alertOnBalance:false e liga a flag do despacho no catch.
  const HOST_UM_ALARME_APLICADO = false
  const hostIni = rota.indexOf('const reqId = await submitAvatarJob({')
  const hostCall = hostIni >= 0 ? rota.slice(hostIni, rota.indexOf('})', hostIni) + 2) : ''
  checa('rota: uma chamada só de submitAvatarJob — a do host do Hollywood', (rota.match(/submitAvatarJob\(/g) ?? []).length === 1 && hostCall.includes("engine: 'presenter'"))
  if (!(TRAVA_82_APLICADA && HOST_UM_ALARME_APLICADO)) {
    checa('host intacto até a trava subir: a rota ainda não passa alertOnBalance (nada pela metade)', !rota.includes('alertOnBalance'))
  } else {
    checa('host: a chamada passa alertOnBalance:false — o veed não alarma dentro do despacho', /\n\s*alertOnBalance: false,?\n/.test(hostCall))
    const catchIni = rota.indexOf('} catch (e) {', hostIni)
    const ambIdx = rota.indexOf('if (e instanceof AvatarSubmitError && e.ambiguous) {', hostIni)
    const LINHA = 'if (e instanceof AvatarSubmitError && looksExhausted(e)) ctxDespacho().balanceExhausted = true'
    const flagIdx = rota.indexOf(LINHA, catchIni)
    checa('host: no catch, a recusa de SALDO liga a flag do despacho antes de qualquer outro ramo (o finalizador alarma UMA vez, como cinematic)', catchIni > hostIni && flagIdx > catchIni && flagIdx < ambIdx && rota.slice(catchIni, flagIdx).split('\n').filter((l) => l.trim() && !l.trim().startsWith('//')).length === 1)
    // A LINHA REAL, executada com o AvatarSubmitError e o looksExhausted reais (veed.ts e falAlert.ts carregados).
    const Lh = lambda({ banco: bancoFalso(), notify: carteiro().fn })
    const erroDe = async (status, detail) => {
      const Vh = carrega('lib/avatar/veed.ts', { '@fal-ai/client': { fal: { config() {} } }, '@/lib/falAlert': Lh }, { process: { env: { FAL_KEY: 'offline-only' } }, fetch: async () => ({ ok: false, status, text: async () => JSON.stringify({ detail }) }) })
      try { await Vh.submitAvatarJob({ imageUrl: 'https://offline.invalid/p.png', audioUrl: 'https://offline.invalid/a.mp3', engine: 'presenter', alertOnBalance: false }) } catch (e) { return { e, Classe: Vh.AvatarSubmitError } }
      return null
    }
    const roda = async (status, detail) => {
      const r = await erroDe(status, detail)
      const ctx = { balanceExhausted: false }
      vm.runInNewContext(`(function (e, AvatarSubmitError, looksExhausted, ctxDespacho) { ${LINHA} })`, {})(r.e, r.Classe, Lh.looksExhausted, () => ctx)
      return ctx.balanceExhausted
    }
    checa('linha real: 403 de saldo da fal no host → flag do despacho ligada', (await roda(403, FRASE_FAL)) === true)
    checa('linha real: 403 de ACESSO ("model is locked for your account") e 503 ambíguo → flag desligada', (await roda(403, 'This model is locked for your account')) === false && (await roda(503, FRASE_FAL)) === false)
  }
}

// ═══════════════════ 10. fronteira servidor/cliente (revisão 28/09) ═══════════════════
// O CASO: lib/falAlert importou node:crypto (e sceneDisposition, que também importa) — tsc exit 0, e o build de
// navegador do Next 14.2.5 falhava com "UnhandledSchemeError: Reading from node:crypto", pelo caminho
// GenerateClient.tsx ('use client') → import('@/lib/hollywood/router') → lib/avatar/veed → lib/falAlert. Nada do push
// chegaria à produção (o mesmo 06/09 de lib/gptHandoff). Esta seção lê o grafo como o webpack lê: AST do TypeScript
// (comentário não conta), import de valor, export-from, import() dinâmico e require; `import type` fica de fora
// (é apagado no build). Reprova qualquer especificador node:* alcançável a partir de um arquivo 'use client'.
console.log('== 10. fronteira: nenhum node:* alcançável de um arquivo \'use client\' ==')
{
  const EXT = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.tsx', '/index.js']
  const relDe = (abs) => relative(RAIZ, abs).split(sep).join('/')
  // Arquivo INTEIRO sempre (um recorte do começo pendurou o parser do TypeScript) e parse compartilhado entre as
  // varreduras — só o arquivo sobrescrito pelo controle negativo é reparseado.
  const PARSE = new Map()
  function varre(sobrescreve = {}) {
    const fonte = (abs) => sobrescreve[relDe(abs)] ?? readFileSync(abs, 'utf8')
    const parse = (abs) => {
      const proprio = relDe(abs) in sobrescreve
      if (!proprio && PARSE.has(abs)) return PARSE.get(abs)
      const sf = ts.createSourceFile(abs, fonte(abs), ts.ScriptTarget.Latest, true, /x$/.test(abs) ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
      if (!proprio) PARSE.set(abs, sf)
      return sf
    }
    const arquivos = []
    const anda = (d) => {
      for (const f of readdirSync(d)) {
        if (f === 'node_modules' || f.startsWith('.')) continue
        const p = join(d, f)
        const s = statSync(p)
        if (s.isDirectory()) anda(p)
        else if (/\.(ts|tsx|js|jsx|mjs)$/.test(f) && !/\.d\.ts$/.test(f)) arquivos.push(p)
      }
    }
    for (const d of ['app', 'lib', 'components']) anda(join(RAIZ, d))
    const resolve1 = (de, spec) => {
      let base
      if (spec.startsWith('@/')) base = join(RAIZ, spec.slice(2))
      else if (spec.startsWith('.')) base = resolve(dirname(de), spec)
      else return { externo: spec }
      for (const e of EXT) { const c = base + e; if (existsSync(c) && statSync(c).isFile()) return { arquivo: c } }
      return null
    }
    const cache = new Map()
    const deps = (abs) => {
      if (cache.has(abs)) return cache.get(abs)
      const sf = parse(abs)
      const out = []
      const specDe = (n) => (n && ts.isStringLiteralLike(n) ? n.text : null)
      const visita = (n) => {
        if (ts.isImportDeclaration(n)) {
          const c = n.importClause
          const soTipo = c && (c.isTypeOnly || (!c.name && c.namedBindings && ts.isNamedImports(c.namedBindings) && c.namedBindings.elements.length > 0 && c.namedBindings.elements.every((e) => e.isTypeOnly)))
          const s = specDe(n.moduleSpecifier)
          if (s && !soTipo) out.push({ spec: s, dinamico: false })
        } else if (ts.isExportDeclaration(n) && n.moduleSpecifier) {
          const s = specDe(n.moduleSpecifier)
          if (s && !n.isTypeOnly) out.push({ spec: s, dinamico: false })
        } else if (ts.isCallExpression(n) && n.arguments.length >= 1) {
          const s = specDe(n.arguments[0])
          if (s && n.expression.kind === ts.SyntaxKind.ImportKeyword) out.push({ spec: s, dinamico: true })
          else if (s && ts.isIdentifier(n.expression) && n.expression.text === 'require') out.push({ spec: s, dinamico: false })
        }
        ts.forEachChild(n, visita)
      }
      visita(sf)
      const res = out.map((d) => ({ ...d, alvo: resolve1(abs, d.spec) })).filter((d) => d.alvo)
      cache.set(abs, res)
      return res
    }
    const clientes = arquivos.filter((f) => {
      const primeiro = parse(f).statements[0]
      return !!primeiro && ts.isExpressionStatement(primeiro) && ts.isStringLiteral(primeiro.expression) && primeiro.expression.text === 'use client'
    })
    // BFS multi-fonte com pai: o caminho impresso é o que o webpack seguiria.
    const pai = new Map()
    const fila = []
    for (const c of clientes) { pai.set(c, null); fila.push(c) }
    const achados = []
    const dinamicas = []
    for (let i = 0; i < fila.length; i++) {
      const n = fila[i]
      for (const d of deps(n)) {
        if (d.alvo.externo) {
          if (/^node:/.test(d.alvo.externo)) {
            const caminho = []
            for (let k = n; k; k = pai.get(k)) caminho.unshift(relDe(k))
            achados.push({ spec: d.alvo.externo, em: relDe(n), caminho })
          }
          continue
        }
        if (d.dinamico) dinamicas.push(`${relDe(n)} -> ${relDe(d.alvo.arquivo)}`)
        if (pai.has(d.alvo.arquivo)) continue
        pai.set(d.alvo.arquivo, n)
        fila.push(d.alvo.arquivo)
      }
    }
    return { arquivos: arquivos.length, clientes: clientes.length, alcancados: pai.size, achados, dinamicas, alcancou: (r) => pai.has(join(RAIZ, r)) }
  }
  const v = varre()
  checa(`denominador: ${v.clientes} arquivos 'use client' de ${v.arquivos} (esperado ≥ 150) e ${v.alcancados} módulos alcançados (≥ 400; 488 em 28/09; um resolvedor quebrado pararia perto dos 217 clientes)`, v.clientes >= 150 && v.alcancados >= 400)
  checa('a varredura segue import() dinâmico: GenerateClient → lib/hollywood/router está entre as arestas dinâmicas', v.dinamicas.includes('app/(dashboard)/generate/GenerateClient.tsx -> lib/hollywood/router.ts'))
  checa('o caminho do defeito está coberto: lib/avatar/veed e lib/falAlert SÃO alcançados pelo navegador', v.alcancou('lib/avatar/veed.ts') && v.alcancou('lib/falAlert.ts'))
  checa(`nenhum node:* alcançável de arquivo 'use client' (achados: ${v.achados.map((a) => `${a.spec} <- ${a.em}`).slice(0, 3).join(' | ') || 'nenhum'})`, v.achados.length === 0)
  checa('lib/cinematic/sceneDisposition (importa node:crypto) não é alcançado pelo navegador', !v.alcancou('lib/cinematic/sceneDisposition.ts'))
  // CONTROLE NEGATIVO: a 1ª versão, recolocada em memória, TEM de ficar vermelha — pelo caminho exato do defeito.
  const falAlertOriginal = readFileSync(join(RAIZ, 'lib/falAlert.ts'), 'utf8')
  const mutante = varre({ 'lib/falAlert.ts': `import { createHash } from 'node:crypto'\n${falAlertOriginal}` })
  const pego = mutante.achados.find((a) => a.spec === 'node:crypto' && a.em === 'lib/falAlert.ts')
  checa('controle negativo: node:crypto de volta em lib/falAlert → a varredura acusa, pelo caminho GenerateClient → router → veed → falAlert', !!pego && pego.caminho.join(' -> ') === 'app/(dashboard)/generate/GenerateClient.tsx -> lib/hollywood/router.ts -> lib/avatar/veed.ts -> lib/falAlert.ts')
  const mutante2 = varre({ 'lib/falAlert.ts': `import { isBalanceExhausted } from '@/lib/cinematic/sceneDisposition'\n${falAlertOriginal}` })
  checa('controle negativo: o import de sceneDisposition de volta → a varredura acusa o node:crypto de lá', mutante2.achados.some((a) => a.spec === 'node:crypto' && a.em === 'lib/cinematic/sceneDisposition.ts'))
  const soTipo = varre({ 'lib/falAlert.ts': `import type { Hash } from 'node:crypto'\n// import { createHash } from 'node:crypto'\n${falAlertOriginal}` })
  checa('import type e comentário não contam (o build apaga os dois) — a varredura não acusa em falso', soTipo.achados.length === 0)
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
