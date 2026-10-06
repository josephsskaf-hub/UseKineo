// KINEO-CHATGPT-CONTRATO-V1-2026-10-06 — guardião do app da Kineo dentro do ChatGPT ("Kineo Script Studio" v1.0.0,
// enviado à revisão da OpenAI em 05/10/2026 18:40 UTC, protocolo C-BnHX0bXXKQDc).
//
// POR QUE EXISTE: a OpenAI guarda a varredura das tools junto com a submissão e, depois de publicado, re-escaneia o
// servidor MCP todo dia; nome, descrição, esquema e anotação de tool são METADADO — mudou, a atualização pode ser
// retida, e durante a revisão o revisor testaria um servidor diferente do que foi varrido. Até 06/10 três coisas que
// não têm nada a ver com o ChatGPT podiam mexer nesse metadado sem ninguém ver: o interruptor de manutenção de motores
// (PAUSED_ENGINE_KEYS — mudou em 15/09 e em 22/09; agora fora da listagem), as descrições de parâmetro que o conector
// do Claude compartilha (lib/mcp/kineoMcp.ts buildTools) e as constantes do handoff (DURATIONS, ASPECTS, TTL) — estas
// duas continuam ligadas de propósito e é este guardião que acusa.
//
// O que ele prova, e como:
//   (A) EXECUTA lib/mcp/kineoMcp.ts no perfil 'chatgpt' (alias `@/` resolvido por registerHooks, como em
//       scripts/test-mcp-claude-2026-09-29.mjs) e compara o initialize e o tools/list, BYTE A BYTE, com o retrato do que
//       a produção servia (docs/chatgpt-plugin/contrato-v1.0.0.json). Qualquer diferença = vermelho.
//   (B) O interruptor de manutenção não mexe no contrato: tools/list igual com a lista viva, vazia e cheia; e a RECUSA
//       continua viva na chamada (motor pausado → erro legível com alternativa, nada gravado).
//   (C) O esquema não promete o que o servidor recusa: todo motor, duração e formato do enum passa em validateHandoffInput.
//   (D) TEXTO da rota do ChatGPT (readFileSync, linha inteira, CRLF normalizado): mede initialize e tools/call com
//       channel e path próprios, com await, dentro de try/catch, sem roteiro/argumentos/IP/subject no evento.
//   (M) MUTANTES no objeto e no DISCO: cada regra é quebrada de propósito e o verificador TEM de ficar vermelho; e uma
//       mudança só do Claude (MCP_INSTRUCTIONS) TEM de ficar verde — o guardião não grita à toa.
//
// Mudar o contrato DE PROPÓSITO (nova versão do app): atualizar o retrato no mesmo commit e seguir o plano de revisão
// (durante a revisão: não publicar; depois de publicado: o scan diário da OpenAI pega e pode reter).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { randomBytes } from 'node:crypto'
import { registerHooks } from 'node:module'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CR = String.fromCharCode(13)
const lf = (s) => s.split(CR).join('')
const BOM = String.fromCharCode(0xfeff)
const read = (rel) => { const s = lf(fs.readFileSync(path.join(ROOT, rel), 'utf8')); return s.startsWith(BOM) ? s.slice(1) : s }
let pass = 0
let fail = 0
const ok = (cond, msg) => {
  if (cond) { pass++; console.log('  ok  ' + msg) } else { fail++; console.log('  FAIL ' + msg) }
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const abs = path.join(ROOT, specifier.slice(2))
      const file = fs.existsSync(abs) && fs.statSync(abs).isFile() ? abs : `${abs}.ts`
      return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

const SNAP_REL = 'docs/chatgpt-plugin/contrato-v1.0.0.json'
const MCP_REL = 'lib/mcp/kineoMcp.ts'
const ROUTE_REL = 'app/api/mcp/chatgpt/route.ts'
const snap = JSON.parse(read(SNAP_REL))
const mcpCode = read(MCP_REL)
const routeCode = read(ROUTE_REL)

const M = await import(pathToFileURL(path.join(ROOT, MCP_REL)).href)
const C = await import(pathToFileURL(path.join(ROOT, 'lib/mcp/chatgptContract.ts')).href)
const G = await import(pathToFileURL(path.join(ROOT, 'lib/gptHandoff.ts')).href)
const L = await import(pathToFileURL(path.join(ROOT, 'lib/engineLaunch.ts')).href)

// ─── Verificadores (os mesmos rodam no real e nos mutantes) ────────────────
const SCRIPT =
  'The river near the old town boils every afternoon. Locals cook eggs in it and tell stories about a giant serpent. ' +
  'Scientists found the heat comes from deep faults, not a volcano, and the water still runs hot today.'
const SHORT = 'A small bird lands on a flower at dawn. It listens, waits and sings. Every morning brings another quiet chance to notice the world.'

function fakeDeps(paused) {
  return {
    profile: 'chatgpt',
    facts: () => { throw new Error('o perfil ChatGPT não lê fatos comerciais') },
    pausedEngines: paused,
    createHandoff: async () => { throw new Error('nada deveria ser gravado aqui') },
  }
}

async function contractOf(mod, paused) {
  const init = (await mod.handleMcpMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }, fakeDeps(paused))).response.result
  const list = (await mod.handleMcpMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, fakeDeps(paused))).response.result
  return { initialize: { serverInfo: init.serverInfo, capabilities: init.capabilities, instructions: init.instructions }, tools: list.tools }
}

/** Diferenças entre um contrato e o retrato. A comparação final é a string exata do JSON (a ordem das chaves é a
 *  mesma da resposta HTTP, que serializa o mesmo objeto); as linhas por campo só dizem ONDE mudou. */
function contractDiff(c, s) {
  const out = []
  if (JSON.stringify(c.initialize) !== JSON.stringify(s.initialize)) out.push('initialize')
  const names = (t) => (Array.isArray(t) ? t.map((x) => x?.name).join(',') : '(sem tools)')
  if (names(c.tools) !== names(s.tools)) out.push(`tools: ${names(c.tools)} ≠ ${names(s.tools)}`)
  for (const st of Array.isArray(s.tools) ? s.tools : []) {
    const ct = (c.tools ?? []).find((x) => x?.name === st.name)
    if (!ct) continue
    for (const k of new Set([...Object.keys(st), ...Object.keys(ct)])) {
      if (JSON.stringify(ct[k]) !== JSON.stringify(st[k])) out.push(`${st.name}.${k}`)
    }
  }
  if (JSON.stringify(c.tools) !== JSON.stringify(s.tools)) out.push('tools (bytes)')
  return out
}

/** Corpo de uma função por contagem de chaves a partir do 1º `{` depois da assinatura (nunca janela fixa). */
function sliceFunction(code, signature) {
  const i = code.indexOf(signature)
  if (i < 0) return ''
  const open = code.indexOf('{', i)
  if (open < 0) return ''
  let depth = 0
  for (let j = open; j < code.length; j++) {
    if (code[j] === '{') depth++
    else if (code[j] === '}') { depth--; if (depth === 0) return code.slice(i, j + 1) }
  }
  return ''
}
const hasLine = (code, re) => code.split('\n').some((l) => re.test(l))

function routeProblems(code) {
  const p = []
  if (!hasLine(code, /^const EVENT_PATH = '\/api\/mcp\/chatgpt'$/)) p.push('EVENT_PATH próprio ausente')
  if (!hasLine(code, /^\s*const \{ response, trace \} = await handleMcpMessage\(body, deps\)$/)) p.push('a rota não lê o trace')
  if (!hasLine(code, /^\s*await record\(trace, req\.headers\.get\('user-agent'\)\)$/)) p.push('record ausente ou sem await')
  const rec = sliceFunction(code, 'async function record(')
  if (!rec) {
    p.push('função record ausente')
    return p
  }
  const body = rec.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')
  const count = (re) => (body.match(re) ?? []).length
  if (count(/name: 'mcp_initialized'/g) !== 1) p.push('mcp_initialized ≠ 1')
  if (count(/name: 'mcp_tool_called'/g) !== 1) p.push('mcp_tool_called ≠ 1')
  if (count(/channel: 'chatgpt_plugin'/g) !== 2) p.push('channel ausente em algum evento')
  if (count(/path: EVENT_PATH/g) !== 2) p.push('path ausente em algum evento')
  if (/\b(args|arguments|script|params|subject|ip|meta)\b/.test(body)) p.push('evento carrega roteiro/argumentos/IP/subject')
  if (!/\} catch \{/.test(body)) p.push('medição sem try/catch')
  return p
}

// ─── (A) o contrato que a OpenAI revisa ────────────────────────────────────
ok(snap.version === '1.0.0' && snap.submittedAt === '2026-10-05T18:40:53Z' && Array.isArray(snap.tools) && snap.tools.length === 2, '(A0) retrato da v1.0.0 lido (2 tools, enviado 05/10 18:40 UTC)')
ok(C.CHATGPT_CONTRACT_VERSION === snap.version, `(A1) CHATGPT_CONTRACT_VERSION do código (${C.CHATGPT_CONTRACT_VERSION}) = versão do retrato (${snap.version})`)
const PAUSED_LIVE = [...L.PAUSED_ENGINE_KEYS]
const real = await contractOf(M, PAUSED_LIVE)
const d0 = contractDiff(real, snap)
ok(d0.length === 0, `(A2) initialize + tools/list do perfil ChatGPT = retrato da produção, byte a byte (diferenças: ${d0.join('; ') || 'nenhuma'})`)
ok(real.tools.every((t) => ['readOnlyHint', 'destructiveHint', 'openWorldHint'].every((k) => typeof t.annotations?.[k] === 'boolean')), '(A3) as 2 tools seguem com readOnlyHint/destructiveHint/openWorldHint explícitos')
/** A lista literal da versão tem de ser EXATAMENTE o enum do retrato (fonte do enum, não cópia solta). */
const snapEnum = snap.tools.find((t) => t.name === 'create_video_handoff')?.inputSchema?.properties?.engineHint?.enum ?? []
const v1Problems = (list) => (Array.isArray(list) && list.length > 0 && JSON.stringify([...list]) === JSON.stringify(snapEnum) ? [] : [`${JSON.stringify(list)} ≠ ${JSON.stringify(snapEnum)}`])
ok(v1Problems(C.CHATGPT_V1_ENGINES).length === 0, `(A4) CHATGPT_V1_ENGINES = enum de motores do retrato (${(C.CHATGPT_V1_ENGINES ?? []).join(', ')})`)
ok(Array.isArray(C.CHATGPT_LISTING_PAUSED_ENGINES) && C.CHATGPT_LISTING_PAUSED_ENGINES.every((e) => !snapEnum.includes(e)) && G.HANDOFF_ENGINES.every((e) => snapEnum.includes(e) || C.CHATGPT_LISTING_PAUSED_ENGINES.includes(e)), '(A5) o que a listagem tira = motores do handoff fora da versão (nenhum motor novo vaza para o enum)')

// ─── (B) o interruptor de manutenção não mexe no contrato; a recusa continua viva ─
const empty = await contractOf(M, [])
const full = await contractOf(M, ['omni', 's25', 'h3', 'veo', 'fast', 'kling'])
ok(contractDiff(empty, snap).length === 0, '(B1) despausar todos os motores não muda o tools/list do ChatGPT')
ok(contractDiff(full, snap).length === 0, '(B2) pausar quase todos os motores não muda o tools/list do ChatGPT')
const pausedCall = (await M.handleMcpMessage(
  { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'create_video_handoff', arguments: { script: SCRIPT, durationSec: 35, engineHint: 'h3' } } },
  fakeDeps(['omni', 's25', 'h3']),
)).response.result
const pausedMsg = String(pausedCall?.structuredContent?.error ?? '')
ok(pausedCall?.isError === true && /temporarily paused/.test(pausedMsg) && /engineHint hollywood/.test(pausedMsg), `(B3) motor pausado NA HORA da chamada → erro legível com a alternativa da família, nada gravado ("${pausedMsg.slice(0, 80)}")`)

// ─── (C) o esquema não promete o que o servidor recusa ─────────────────────
const handoffTool = real.tools.find((t) => t.name === 'create_video_handoff')
const props = handoffTool?.inputSchema?.properties ?? {}
const recusas = []
for (const e of props.engineHint?.enum ?? []) {
  const v = G.validateHandoffInput({ script: SCRIPT, durationSec: 60, engineHint: e })
  if (!v.ok) recusas.push(`motor ${e}: ${v.error}`)
}
for (const d of props.durationSec?.enum ?? []) {
  const v = G.validateHandoffInput({ script: d === G.HANDOFF_SHORT_DURATION ? SHORT : SCRIPT, durationSec: d, engineHint: 'seedance' })
  if (!v.ok) recusas.push(`duração ${d}: ${v.error}`)
}
for (const a of props.aspect?.enum ?? []) {
  const v = G.validateHandoffInput({ script: SCRIPT, aspect: a })
  if (!v.ok) recusas.push(`formato ${a}: ${v.error}`)
}
const enumCount = (props.engineHint?.enum?.length ?? 0) + (props.durationSec?.enum?.length ?? 0) + (props.aspect?.enum?.length ?? 0)
ok(enumCount >= 10 && recusas.length === 0, `(C1) os ${enumCount} valores do enum (motor, duração, formato) passam em validateHandoffInput (recusas: ${recusas.join('; ') || 'nenhuma'})`)
ok(!G.validateHandoffInput({ script: SHORT, durationSec: G.HANDOFF_SHORT_DURATION, engineHint: 'kling' }).ok && /only with engineHint seedance/.test(props.durationSec?.description ?? ''), '(C2) a exceção que a descrição anuncia (15 s só com seedance) é a mesma que o servidor cobra')

// ─── (D) a rota do ChatGPT mede quem bate, sem mudar a resposta ────────────
const rp = routeProblems(routeCode)
ok(rp.length === 0, `(D1) /api/mcp/chatgpt grava mcp_initialized e mcp_tool_called com channel/path próprios, await e try/catch, sem roteiro/argumentos/IP/subject (problemas: ${rp.join('; ') || 'nenhum'})`)
ok(/^import \{ writeServerEvent \} from '@\/lib\/serverEvents'$/m.test(routeCode), '(D2) a rota usa o writeServerEvent da casa (nunca lança)')

// ─── (M) mutantes ──────────────────────────────────────────────────────────
const clone = () => JSON.parse(JSON.stringify(real))
let mt = clone()
const hi = mt.tools.findIndex((t) => t.name === 'create_video_handoff')
mt.tools[hi].inputSchema.properties.engineHint.description = mt.tools[hi].inputSchema.properties.engineHint.description.replace('Use seedance', 'Use  seedance')
ok(contractDiff(mt, snap).length > 0, '(M1) um espaço a mais na descrição do engineHint → vermelho')
mt = clone(); mt.tools[hi].inputSchema.properties.engineHint.enum = mt.tools[hi].inputSchema.properties.engineHint.enum.filter((e) => e !== 'h3')
ok(contractDiff(mt, snap).length > 0, '(M2) motor some do enum → vermelho')
mt = clone(); mt.tools[hi].annotations.openWorldHint = false
ok(contractDiff(mt, snap).length > 0, '(M3) openWorldHint volta a false (o achado da revisão de 05/10) → vermelho')
mt = clone(); mt.initialize.instructions += ' '
ok(contractDiff(mt, snap).length > 0, '(M4) instructions do initialize mudam → vermelho')
ok(v1Problems(['fast', 'seedance', 'kling', 'veo', 'hollywood']).length > 0 && v1Problems([...snapEnum, 'omni']).length > 0, '(M4b) lista da versão sem um motor, ou com o Omni de volta → vermelho')

async function diskMutant(label, from, to, paused) {
  const mutSrc = mcpCode.split(from).join(to)
  const applied = mutSrc !== mcpCode && mutSrc.includes(to)
  ok(applied, `(${label}a) mutante de disco aplicou (âncora encontrada e texto novo presente)`)
  if (!applied) return null
  const rel = `lib/mcp/.mutante-${randomBytes(4).toString('hex')}.ts`
  try {
    fs.writeFileSync(path.join(ROOT, rel), mutSrc)
    const MM = await import(pathToFileURL(path.join(ROOT, rel)).href)
    return contractDiff(await contractOf(MM, paused), snap)
  } finally {
    fs.rmSync(path.join(ROOT, rel), { force: true })
  }
}
const m5 = await diskMutant('M5', 'chatgptTools(buildTools({ pausedEngines: CHATGPT_LISTING_PAUSED_ENGINES }))', 'chatgptTools(buildTools({ pausedEngines: deps.pausedEngines }))', ['omni', 's25', 'h3'])
ok(m5 !== null && m5.length > 0, `(M5b) listagem do ChatGPT volta a ler o interruptor vivo e o H3 é pausado → vermelho (${(m5 ?? []).join('; ')})`)
const m6 = await diskMutant('M6', 'Use ${DEFAULT_ENGINE} unless the user explicitly names another engine', 'Prefer ${DEFAULT_ENGINE} unless the user explicitly names another engine', PAUSED_LIVE)
ok(m6 !== null && m6.length > 0, `(M6b) texto de parâmetro que o Claude compartilha muda em kineoMcp.ts → vermelho no ChatGPT (${(m6 ?? []).join('; ')})`)
const m7 = await diskMutant('M7', "'Kineo tools: kineo_facts reads Kineo\\'s current plans", "'Kineo connector tools: kineo_facts reads Kineo\\'s current plans", PAUSED_LIVE)
ok(m7 !== null && m7.length === 0, '(M7b) mudança SÓ do Claude (MCP_INSTRUCTIONS) → continua verde: o guardião não grita à toa')

const noAwait = routeCode.split("  await record(trace, req.headers.get('user-agent'))").join("  void record(trace, req.headers.get('user-agent'))")
ok(noAwait !== routeCode && routeProblems(noAwait).length > 0, '(M8) record sem await (morre na Vercel) → vermelho')
const leaksScript = routeCode.split("tool: trace.tool ?? null, ok: trace.ok ?? false,").join("tool: trace.tool ?? null, ok: trace.ok ?? false, script: null,")
ok(leaksScript !== routeCode && routeProblems(leaksScript).length > 0, '(M9) evento passa a carregar o roteiro → vermelho')
const noChannel = routeCode.split("{ channel: 'chatgpt_plugin', tool:").join('{ tool:')
ok(noChannel !== routeCode && routeProblems(noChannel).length > 0, '(M10) mcp_tool_called sem channel (vira "uso do Claude" no SQL) → vermelho')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
