#!/usr/bin/env node
// GUARDIÃO — KINEO-SUPPRESSION-EVENTS-2026-09-06 (sprint-assinaturas #26)
//
// O QUE ELE GUARDA: a supressão de 24h passou a ler uma QUINTA fonte — os
// carimbos de e-mail que vivem na tabela `events`. Antes deste commit,
// 7 campanhas de admin e 5 crons carimbavam só ali e eram invisíveis para a
// trava: 70 pares de e-mail em 30 min para 42 pessoas em 7 dias.
//
// ESTILO readFileSync DE PROPÓSITO: guardião que importa com alias `@/` morre
// no import antes da primeira verificação (memória `guardioes-com-alias-nao-rodam`).
//
// Atualização 06/10: a quinta fonte também fecha em erro. Lista incompleta de
// envios não pode autorizar reenvio. O módulo e o readAll reais são executados
// com banco falso, incluindo página 2, janela curta e mutantes.

import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const SUP = 'lib/lifecycle/suppression.ts'
const EVT = 'lib/lifecycle/emailEvents.ts'

const sup = readFileSync(SUP, 'utf8').replace(/\r\n/g, '\n')
const evt = readFileSync(EVT, 'utf8').replace(/\r\n/g, '\n')

let ok = 0
const falhas = []
function check(nome, cond) {
  if (cond) { ok++; console.log('  ok  ' + nome) }
  else { falhas.push(nome); console.log('  XX  ' + nome) }
}

// ── 1. A LISTA CANÔNICA EXISTE E É UMA SÓ ────────────────────────────────────
console.log('\n1. lib/lifecycle/emailEvents.ts — a lista canônica')
check('exporta LIFECYCLE_EMAIL_EVENT_NAMES', /export const LIFECYCLE_EMAIL_EVENT_NAMES\s*=\s*\[/.test(evt))
check('a lista é `as const` (não vira string[] mutável)', /\]\s*as const/.test(evt))

const nomes = Array.from(evt.matchAll(/^ {2}'([a-z0-9_]+)',$/gm)).map((m) => m[1])
check('a lista tem pelo menos 25 nomes (tem ' + nomes.length + ')', nomes.length >= 25)
check('não há nome repetido na lista', new Set(nomes).size === nomes.length)

// Os três carimbos que a medição de 06/09 apontou como dominantes nos pares de
// 30 minutos. Se algum sair da lista, o defeito volta pela mesma porta.
for (const n of ['stranded_ready_sent', 'video_ready_email_sent', 'trial_lifecycle_email_sent']) {
  check("o carimbo dominante '" + n + "' está na lista", nomes.includes(n))
}
// As duas cartas de série deste ciclo, que são as que disparam hoje.
for (const n of ['season_letter_emailed_v1', 'next_episode_wall_emailed_v1']) {
  check("a campanha viva '" + n + "' está na lista", nomes.includes(n))
}

// ⚠️ A TRAVA QUE IMPEDE O PIOR ERRO POSSÍVEL NESTE ARQUIVO: pôr aqui um evento
// de LEITURA (clique, exibição) calaria a casa por 24h porque alguém ABRIU um
// e-mail. Nenhum nome de leitura conhecida pode entrar.
const PROIBIDOS = ['episode_link_clicked', 'season_shown', 'season_written',
  'season_episode_clicked', 'email_opened', 'pricing_viewed', 'checkout_started',
  'next_action_card_shown', 'publish_pack_copied']
for (const n of PROIBIDOS) {
  check("evento de LEITURA '" + n + "' NÃO está na lista", !nomes.includes(n))
}
check('nenhum nome da lista termina em _clicked/_viewed/_shown/_seen',
  !nomes.some((n) => /_(clicked|viewed|shown|seen|opened)$/.test(n)))

// ── 2. A SUPRESSÃO USA A LISTA — E NÃO UMA CÓPIA À MÃO ───────────────────────
console.log('\n2. suppression.ts — a quinta fonte está ligada')
check('importa LIFECYCLE_EMAIL_EVENT_NAMES de ./emailEvents',
  /import \{ LIFECYCLE_EMAIL_EVENT_NAMES \} from '\.\/emailEvents'/.test(sup))
check('consulta a tabela events', /\.from\('events'\)/.test(sup))
check('o filtro de nomes usa a constante, não um array literal',
  /\.in\('name', LIFECYCLE_EMAIL_EVENT_NAMES/.test(sup))
check('não existe lista de nomes de e-mail copiada dentro do suppression.ts',
  !/'(?:season_letter|next_episode_wall|checkout_recovery)_emailed_v1'\s*,/.test(sup))

// A janela é a MESMA do resto do módulo: a fonte nova não pode inventar corte
// próprio, senão a janela de 4h do hot lead vale para quatro fontes e 24h para
// a quinta.
check('a fonte nova usa o mesmo `cutoff` das outras quatro',
  /\.gte\('created_at', new Date\(cutoff\)\.toISOString\(\)\)/.test(sup))

// ── 3. FALHA FECHADA — lista incompleta não autoriza reenvio ────────────────
console.log('\n3. a quinta fonte falha FECHADA, com sinal para quem chama')
// A FATIA COMEÇA NO CÓDIGO, NÃO NO COMENTÁRIO — e isto é um erro que eu
// cometi na primeira versão deste guardião. Ancorar em
// `KINEO-SUPPRESSION-EVENTS-2026-09-06` casava com a MENÇÃO ao bloco lá em
// cima, na interface, e a fatia engolia o laço inteiro das quatro fontes
// antigas. A fatia abaixo começa na variável usada pela quinta fonte.
const iniBloco = sup.indexOf('const idSet = new Set(ids)')
const fimBloco = sup.indexOf('const suppressed = new Set<string>()')
check('o bloco da quinta fonte existe e vem antes do cálculo final',
  iniBloco > 0 && fimBloco > iniBloco)
check('o bloco vem DEPOIS das quatro fontes antigas',
  iniBloco > sup.indexOf("return closed(`email_send_log: "))
check('o cabeçalho KINEO-SUPPRESSION-EVENTS-2026-09-06 documenta a fonte nova',
  sup.includes('KINEO-SUPPRESSION-EVENTS-2026-09-06'))
const bloco = sup.slice(iniBloco, fimBloco)

check('falha da quinta fonte chama closed e marca eventsDegraded',
  /return \{ \.\.\.closed\(.*\), eventsDegraded: true \}/.test(bloco))
check('o bloco captura a falha do readAll', /\} catch \(err\) \{/.test(bloco))

// O sinal chega a quem chama: sem isto, "a quinta fonte caiu" é indistinguível
// de "estava tudo bem".
check('a interface expõe eventsDegraded', /readonly eventsDegraded\?: boolean/.test(sup))
check('o retorno de sucesso carrega eventsDegraded',
  /degraded: false, eventsDegraded: false \}/.test(sup))
check('eventsDegraded é OPCIONAL (não quebra implementador existente)',
  /eventsDegraded\?: boolean/.test(sup))

// ── 4. PAGINAÇÃO — truncar em 1.000 é deixar de suprimir EM SILÊNCIO ─────────
console.log('\n4. a leitura usa a paginação compartilhada')
check('usa readAll para leitura completa', /await readAll\(\(\) => admin/.test(bloco))
check('ordena por created_at (paginação sem ORDER BY pula linha)',
  /\.order\('created_at', \{ ascending: true \}\)/.test(bloco))
check('contexto da consulta identifica rota e tabela', /route: 'lifecycle\/suppression', table: 'events'/.test(bloco))

// ── 5. O QUE A FONTE NOVA NÃO PODE FAZER ─────────────────────────────────────
console.log('\n5. limites')
check('só LÊ events (nenhum insert/update/delete na tabela)',
  !/\.from\('events'\)[\s\S]{0,200}\.(insert|update|delete|upsert)\(/.test(sup))
check('respeita o crivo isRealSendStamp via bump()', /bump\(row\.user_id, parseTime\(row\.created_at\)\)/.test(bloco))
check('filtra pelos ids consultados (não suprime quem não foi perguntado)',
  /idSet\.has\(row\.user_id\)/.test(bloco))
check('as quatro fontes antigas continuam falhando FECHADAS',
  /return closed\(`profiles: /.test(sup) && /return closed\(`checkout_abandoned: /.test(sup) &&
  /return closed\(`trial_emails_log: /.test(sup) && /return closed\(`email_send_log: /.test(sup))

console.log('\n6. comportamento real offline e mutantes')
const NOW = Date.parse('2026-10-06T15:00:00Z')
class Clock extends Date { static now() { return NOW } }
function compile(source, dependencies = {}) {
  const exports = {}
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(js, { exports, Date: Clock, Map, Set, console: { log() {}, warn() {}, error() {} }, require(id) {
    if (Object.hasOwn(dependencies, id)) return dependencies[id]
    throw new Error('Import sem dublê: ' + id)
  } })
  return exports
}
const readSource = readFileSync('lib/supabase/readAll.ts', 'utf8').replace(/\r\n/g, '\n')
const dependencies = {
  './skipStamp': compile(readFileSync('lib/lifecycle/skipStamp.ts', 'utf8')),
  './emailEvents': compile(evt),
}
async function execute(source = sup, { failTable = null, failFrom = 1000, windowHours = 24, paginationSource = readSource } = {}) {
  const reads = compile(paginationSource, { '../serverEvents': { writeServerEvent: async () => true } })
  const module = compile(source, { ...dependencies, '../supabase/readAll': reads })
  const events = Array.from({ length: 1500 }, (_, i) => ({ id: String(i).padStart(5, '0'), user_id: i === 1200 ? 'received' : 'outside-' + i, name: 'stranded_ready_sent', created_at: new Date(NOW - 5 * 3600000).toISOString() }))
  events.push({ id: 'reader', user_id: 'reader', name: 'email_opened', created_at: new Date(NOW - 3600000).toISOString() })
  const calls = []
  const db = { from(table) {
    let filters = [], sorters = [], bounds = [0, 999]
    const q = {
      select: () => q,
      in(k, values) { filters.push((r) => values.includes(r[k])); return q },
      eq(k, value) { filters.push((r) => r[k] === value); return q },
      gte(k, value) { filters.push((r) => r[k] >= value); return q },
      not(k, _op, value) { filters.push((r) => r[k] !== value); return q },
      order(k, { ascending = true } = {}) { sorters.push([k, ascending]); return q },
      range(from, to) { bounds = [from, to]; return q },
      then(resolve, reject) {
        calls.push({ table, bounds, sorters })
        if (table === failTable && bounds[0] === failFrom) return Promise.resolve({ data: null, error: { message: 'fixture falhou' } }).then(resolve, reject)
        const rows = (table === 'events' ? events : []).filter((r) => filters.every((f) => f(r)))
        rows.sort((a, b) => { for (const [k, asc] of sorters) { const n = a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0; if (n) return asc ? n : -n } return 0 })
        return Promise.resolve({ data: rows.slice(bounds[0], bounds[1] + 1), error: null }).then(resolve, reject)
      },
    }
    return q
  } }
  return { result: await module.loadLifecycleSuppression(db, ['received', 'fresh', 'reader'], windowHours), calls }
}
const success = await execute()
check('envio na linha 1201 suprime destinatário, sem calar fresh/reader', success.result.isSuppressed('received') && !success.result.isSuppressed('fresh') && !success.result.isSuppressed('reader'))
check('sucesso não marca degradação', !success.result.degraded && !success.result.eventsDegraded)
check('events leu segunda página e desempate id', success.calls.some((c) => c.table === 'events' && c.bounds[0] === 1000 && JSON.stringify(c.sorters) === '[["created_at",true],["id",true]]'))
const short = await execute(sup, { windowHours: 4 })
check('janela de 4h deixa passar envio de 5h (24h suprime)', !short.result.isSuppressed('received') && !short.result.degraded)
const closed = await execute(sup, { failTable: 'events' })
check('página 2 falhou: todos suprimidos, degraded e eventsDegraded verdadeiros', closed.result.degraded && closed.result.eventsDegraded && closed.result.suppressedCount === 3 && ['received', 'fresh', 'reader'].every(closed.result.isSuppressed))
for (const table of ['profiles', 'checkout_abandoned', 'trial_emails_log', 'email_send_log']) {
  const failure = await execute(sup, { failTable: table, failFrom: 0 })
  check('erro na fonte ' + table + ' mantém falha fechada', failure.result.degraded && failure.result.suppressedCount === 3)
}
function mutate(source, original, replacement) {
  if (!source.includes(original)) throw new Error('Mutante sem alvo: ' + original)
  return source.replace(original, replacement)
}
const oldOpen = mutate(sup, 'return { ...closed(err instanceof Error ? err.message : String(err)), eventsDegraded: true }', 'return { isSuppressed: () => false, suppressedCount: 0, degraded: false, eventsDegraded: true }')
const unsafe = await execute(oldOpen, { failTable: 'events' })
check('mutante fail-open morto: erro deixa fresh passar e quebra contrato', !unsafe.result.isSuppressed('fresh') && !unsafe.result.degraded)
const shortRead = mutate(readSource, 'data.length < POSTGREST_PAGE_SIZE', 'data.length <= POSTGREST_PAGE_SIZE')
const truncated = await execute(sup, { paginationSource: shortRead })
check('mutante sem página 2 morto: perde destinatário que já recebeu', !truncated.result.isSuppressed('received'))
const noNames = mutate(sup, ".in('name', LIFECYCLE_EMAIL_EVENT_NAMES as unknown as string[])", '')
const silencedReader = await execute(noNames)
check('mutante sem filtro de nomes morto: leitura vira supressão indevida', silencedReader.result.isSuppressed('reader'))

console.log('\n' + (falhas.length === 0 ? 'VERDE' : 'VERMELHO') + ' — ' + ok + ' verificações ok, ' + falhas.length + ' falha(s)')
if (falhas.length) { for (const f of falhas) console.log('   · ' + f); process.exit(1) }
