// KINEO-MCP-CHATGPT-FATOS-2026-10-02 — guardião do MCP do ChatGPT (app/api/mcp/chatgpt/route.ts).
//
// O que ele prova:
//   (A) a rota do ChatGPT importa e usa getKineoFacts (lib/kineoFacts.ts), a mesma fonte do conector do Claude, e
//       passa o interruptor CHATGPT_MCP_COMMERCIAL_FACTS_LIVE — que nasce DESLIGADO (preço/oferta pública = decisão
//       do fundador; o perfil foi submetido à OpenAI sem ofertas);
//   (B) a rota grava mcp_initialized e mcp_tool_called com client 'chatgpt' (padrão de app/api/mcp/route.ts record),
//       um por initialize e por tools/call — a função `record` é EXECUTADA com um writeServerEvent falso;
//   (C) a rota do Claude segue igual: getKineoFacts nos deps, sem perfil chatgpt, mesmos eventos com via_anthropic;
//   (D) EXECUTA lib/mcp/kineoMcp.ts (alias @/ resolvido por registerHooks, como scripts/test-mcp-claude-2026-09-29.mjs):
//       desligado, o perfil chatgpt nem lê os fatos e as ferramentas não falam de preço; ligado, kineo_facts traz
//       `commercial` com os fatos e o esquema aceita; falha ao ler os fatos nunca derruba as capacidades;
//   (M) mutantes.
// Nenhuma ferramenta renderiza, cobra ou cria conta: nada disso é tocado aqui (as duas tools seguem as mesmas).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { createRequire, registerHooks } from 'node:module'
import { randomBytes } from 'node:crypto'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

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

const CHATGPT_ROUTE = read('app/api/mcp/chatgpt/route.ts')
const CLAUDE_ROUTE = read('app/api/mcp/route.ts')
const CONTRACT = read('lib/mcp/chatgptContract.ts')

// ─── (A) fatos via getKineoFacts + interruptor desligado ─────────────────────
function factsProblems(route, contract) {
  const p = []
  const code = route.replace(/^\s*\/\/.*$/gm, '')
  if (!/import \{ getKineoFacts \} from '@\/lib\/kineoFacts'/.test(code)) p.push('não importa getKineoFacts')
  if (!/facts: \(\) => getKineoFacts\(\) as unknown as Record<string, unknown>,/.test(code)) p.push('deps.facts não usa getKineoFacts')
  if (/facts: \(\) => \(\{\}\)/.test(code)) p.push('ainda devolve fatos vazios')
  if (!/commercialFacts: CHATGPT_MCP_COMMERCIAL_FACTS_LIVE,/.test(code)) p.push('não passa o interruptor')
  if (!/profile: 'chatgpt',/.test(code)) p.push('perdeu o perfil chatgpt (contrato das ferramentas mudaria)')
  if (!/export const CHATGPT_MCP_COMMERCIAL_FACTS_LIVE = false\n/.test(contract)) p.push('interruptor de fatos comerciais não nasce desligado (decisão do fundador)')
  return p
}
const fp = factsProblems(CHATGPT_ROUTE, CONTRACT)
ok(fp.length === 0, `(A) rota do ChatGPT lê os fatos por getKineoFacts; exposição atrás do interruptor = false (${fp.join('; ') || 'ok'})`)

// ─── (B) eventos com client 'chatgpt', executados ────────────────────────────
async function eventProblems(route) {
  const p = []
  const code = route.replace(/^\s*\/\/.*$/gm, '')
  if (!/import \{ writeServerEvent \} from '@\/lib\/serverEvents'/.test(code)) p.push('não importa writeServerEvent')
  if (!/const \{ response, trace \} = await handleMcpMessage\(body, deps\)\n\s*await record\(trace\)/.test(code)) p.push('POST não grava o trace de cada mensagem')
  const fnSrc = route.match(/async function record\(trace: McpTrace\): Promise<void> \{[\s\S]*?\n\}\n/)?.[0]
  if (!fnSrc) return [...p, 'função record ausente']
  const js = ts.transpileModule(fnSrc + '\nexport { record }', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const events = []
  const mod = { exports: {} }
  new Function('module', 'exports', 'writeServerEvent', js)(mod, mod.exports, async (e) => { events.push(e); return true })
  await mod.exports.record({ method: 'initialize', client: 'openai-mcp/1.0', protocol: '2025-06-18' })
  await mod.exports.record({ method: 'tools/call', tool: 'create_video_handoff', ok: true })
  await mod.exports.record({ method: 'tools/list' })
  await mod.exports.record({ method: 'ping' })
  const init = events.find((e) => e.name === 'mcp_initialized')
  const call = events.find((e) => e.name === 'mcp_tool_called')
  if (events.length !== 2) p.push(`${events.length} eventos para initialize+tools/call+tools/list+ping (esperado 2)`)
  if (!init || init.metadata?.client !== 'chatgpt' || init.path !== '/api/mcp/chatgpt') p.push(`mcp_initialized sem client 'chatgpt'/path: ${JSON.stringify(init)}`)
  if (init && (init.metadata?.client_info !== 'openai-mcp/1.0' || init.metadata?.protocol !== '2025-06-18')) p.push('mcp_initialized perdeu clientInfo/protocolo')
  if (!call || call.metadata?.client !== 'chatgpt' || call.metadata?.tool !== 'create_video_handoff' || call.metadata?.ok !== true || call.path !== '/api/mcp/chatgpt') p.push(`mcp_tool_called sem client 'chatgpt'/tool/ok: ${JSON.stringify(call)}`)
  if (JSON.stringify(events).match(/script|subject|ip/i)) p.push('evento carrega roteiro, subject ou IP')
  return p
}
const ep = await eventProblems(CHATGPT_ROUTE)
ok(ep.length === 0, `(B) mcp_initialized e mcp_tool_called gravados com client 'chatgpt', um por initialize/tools/call (${ep.join('; ') || 'ok'})`)

// ─── (C) a rota do Claude segue igual ────────────────────────────────────────
function claudeProblems(route) {
  const p = []
  if (!/facts: \(\) => getKineoFacts\(\) as unknown as Record<string, unknown>,/.test(route)) p.push('Claude perdeu getKineoFacts')
  if (/profile: 'chatgpt'|commercialFacts/.test(route)) p.push('Claude ganhou perfil/interruptor do ChatGPT')
  if (!route.includes("await writeServerEvent({ name: 'mcp_initialized', path: '/api/mcp', metadata: { client: trace.client ?? null, protocol: trace.protocol ?? null, via_anthropic: viaAnthropic } })")) p.push('mcp_initialized do Claude mudou')
  if (!route.includes("await writeServerEvent({ name: 'mcp_tool_called', path: '/api/mcp', metadata: { tool: trace.tool ?? null, ok: trace.ok ?? false, via_anthropic: viaAnthropic } })")) p.push('mcp_tool_called do Claude mudou')
  return p
}
const cp = claudeProblems(CLAUDE_ROUTE)
ok(cp.length === 0, `(C) rota do Claude intacta: fatos, eventos e via_anthropic (${cp.join('; ') || 'ok'})`)

// ─── (D) o despachante, executado ────────────────────────────────────────────
const M = await import(pathToFileURL(path.join(ROOT, 'lib/mcp/kineoMcp.ts')).href)
const FAKE_FACTS = { lastVerified: '2026-10-02', plans: [{ tier: 'starter', marker: 'fake' }], engines: [{ id: 'x' }], trialAccess: { credits: 10 } }
const baseDeps = (over = {}) => ({
  profile: 'chatgpt', pausedEngines: [], createHandoff: async () => ({ ok: false, error: 'not in this test' }),
  facts: () => { throw new Error('fatos comerciais não podem ser lidos com o interruptor desligado') }, ...over,
})
async function dispatcherProblems(MM) {
  const p = []
  const run = async (method, params, deps) => (await MM.handleMcpMessage({ jsonrpc: '2.0', id: 1, method, params }, deps)).response
  // desligado (sem a chave, como os testes antigos, e com false explícito, como a rota): os fatos nem são LIDOS.
  let reads = 0
  const spy = () => { reads++; throw new Error('fatos comerciais não podem ser lidos com o interruptor desligado') }
  for (const deps of [baseDeps({ facts: spy }), baseDeps({ commercialFacts: false, facts: spy })]) {
    const tools = (await run('tools/list', {}, deps)).result.tools
    if (/\b(pricing|subscription|trial|credits|USD|lastVerified|plans)\b/i.test(JSON.stringify(tools))) p.push('desligado: ferramentas falam de preço/plano')
    const facts = (await run('tools/call', { name: 'kineo_facts' }, deps)).result
    if (facts.isError) p.push('desligado: kineo_facts quebrou (leu os fatos?)')
    if ('commercial' in (facts.structuredContent ?? {})) p.push('desligado: kineo_facts trouxe commercial')
  }
  if (reads > 0) p.push(`desligado: deps.facts foi lido ${reads}×`)
  // ligado
  const on = baseDeps({ commercialFacts: true, facts: () => FAKE_FACTS })
  const onFacts = (await run('tools/call', { name: 'kineo_facts' }, on)).result
  if (onFacts.structuredContent?.commercial?.plans?.[0]?.marker !== 'fake') p.push('ligado: commercial não traz os fatos de deps.facts')
  if (!Array.isArray(onFacts.structuredContent?.engines)) p.push('ligado: perdeu as capacidades técnicas')
  const onTools = (await run('tools/list', {}, on)).result.tools
  const factsTool = onTools.find((t) => t.name === 'kineo_facts')
  if (!factsTool?.outputSchema?.oneOf?.[0]?.properties?.commercial) p.push('ligado: esquema de saída não aceita commercial')
  if (onTools.length !== 2) p.push('ligado: o número de ferramentas mudou')
  const broken = baseDeps({ commercialFacts: true, facts: () => { throw new Error('down') } })
  const brokenFacts = (await run('tools/call', { name: 'kineo_facts' }, broken)).result
  if (brokenFacts.isError || !Array.isArray(brokenFacts.structuredContent?.engines) || 'commercial' in brokenFacts.structuredContent) p.push('ligado com fatos fora: derrubou as capacidades')
  return p
}
const dp = await dispatcherProblems(M)
ok(dp.length === 0, `(D) desligado = contrato de antes (fatos nem lidos); ligado = capacidades + commercial (${dp.join('; ') || 'ok'})`)

// ─── (M) mutantes ────────────────────────────────────────────────────────────
ok(factsProblems(CHATGPT_ROUTE.replace('facts: () => getKineoFacts() as unknown as Record<string, unknown>,', 'facts: () => ({}),'), CONTRACT).length > 0, '(M1) rota sem getKineoFacts → vermelho')
ok(factsProblems(CHATGPT_ROUTE, CONTRACT.replace('export const CHATGPT_MCP_COMMERCIAL_FACTS_LIVE = false\n', 'export const CHATGPT_MCP_COMMERCIAL_FACTS_LIVE = true\n')).length > 0, '(M2) interruptor ligado sem ordem do fundador → vermelho')
ok((await eventProblems(CHATGPT_ROUTE.replace("metadata: { client: 'chatgpt', client_info", "metadata: { client: trace.client ?? null, client_info"))).length > 0, '(M3) client vindo do cliente em vez da rota → vermelho')
ok((await eventProblems(CHATGPT_ROUTE.replace('  await record(trace)', '  void trace'))).length > 0, '(M4) POST sem gravar → vermelho')
ok((await eventProblems(CHATGPT_ROUTE.replace("} else if (trace.method === 'tools/call') {", "} else if (trace.method) {"))).length > 0, '(M5) evento para toda mensagem (tools/list, ping) → vermelho')
ok(claudeProblems(CLAUDE_ROUTE.replace('via_anthropic: viaAnthropic } })\n  } else', 'via_anthropic: viaAnthropic, client_x: 1 } })\n  } else')).length > 0, '(M6) rota do Claude alterada → vermelho')
{
  const MCP_REL = 'lib/mcp/kineoMcp.ts'
  const mutRel = `lib/mcp/.mut-${randomBytes(4).toString('hex')}.ts`
  fs.writeFileSync(path.join(ROOT, mutRel), read(MCP_REL).replace('if (deps.commercialFacts === true) {', 'if (true) {'))
  try {
    const MM = await import(pathToFileURL(path.join(ROOT, mutRel)).href)
    ok((await dispatcherProblems(MM)).length > 0, '(M7) despachante lendo os fatos com o interruptor desligado → vermelho')
  } finally {
    fs.rmSync(path.join(ROOT, mutRel), { force: true })
  }
}

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
