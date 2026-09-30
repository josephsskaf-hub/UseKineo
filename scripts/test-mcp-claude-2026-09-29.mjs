// KINEO-MCP-CLAUDE-2026-09-29 — guardião do servidor MCP (conector da Kineo no Claude).
//
// O que ele prova, e como:
//   (A) EXECUTA lib/mcp/kineoMcp.ts (o alias `@/` é resolvido em processo por registerHooks, como em
//       scripts/test-gpt-handoff.mjs) com dependências FALSAS: protocolo, anotações de toda tool, despachante,
//       seções de fatos, motor pausado, faixa de IP da Anthropic.
//   (B) PREÇO: nenhum "$<número>" no código do conector (preço só vem de kineo_facts → lib/kineoFacts →
//       lib/checkoutPricing); todo preço citado no pacote de submissão tem de existir em lib/checkoutPricing.ts.
//   (C) TEXTO das rotas/libs: canal próprio, mesma validação da ação do GPT, nada da trava 8.2, nada que renderize.
//   (M) MUTANTES: cada regra acima é quebrada de propósito (no objeto E num arquivo-mutante no disco) e o
//       verificador TEM de ficar vermelho. Mutante que não reprova = guardião cego = vermelho.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomBytes } from 'node:crypto'
import { registerHooks } from 'node:module'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => {
  if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) }
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

const MCP_REL = 'lib/mcp/kineoMcp.ts'
const HANDOFF_REL = 'lib/mcp/connectorHandoff.ts'
const ROUTE_REL = 'app/api/mcp/route.ts'
const DOC_REL = 'docs/CLAUDE-DIRECTORY-SUBMISSAO-2026-09-29.md'
const mcpCode = read(MCP_REL)
const handoffCode = read(HANDOFF_REL)
const routeCode = read(ROUTE_REL)
const libHandoff = read('lib/gptHandoff.ts')
const pricingCode = read('lib/checkoutPricing.ts')
const launchCode = read('lib/engineLaunch.ts')
const docText = read(DOC_REL)

// ─── Verificadores (os mesmos rodam no real e nos mutantes) ────────────────
/** Problemas de anotação: título, readOnlyHint/destructiveHint booleanos, nome ≤ 64. */
function annotationProblems(tools) {
  const probs = []
  if (!Array.isArray(tools) || tools.length === 0) return ['nenhuma tool']
  for (const t of tools) {
    const n = t?.name ?? '(sem nome)'
    if (typeof t?.name !== 'string' || !t.name || t.name.length > 64) probs.push(`${n}: nome vazio ou > 64`)
    if (typeof t?.title !== 'string' || !t.title.trim()) probs.push(`${n}: sem title`)
    const a = t?.annotations
    if (!a || typeof a !== 'object') { probs.push(`${n}: sem annotations`); continue }
    if (typeof a.title !== 'string' || !a.title.trim()) probs.push(`${n}: sem annotations.title`)
    if (typeof a.readOnlyHint !== 'boolean') probs.push(`${n}: readOnlyHint ausente`)
    if (typeof a.destructiveHint !== 'boolean') probs.push(`${n}: destructiveHint ausente`)
    if (a.readOnlyHint === true && a.destructiveHint === true) probs.push(`${n}: readOnly e destructive ao mesmo tempo`)
    if (typeof t?.description !== 'string' || t.description.length < 40) probs.push(`${n}: descrição curta demais`)
  }
  return probs
}

/** Todos os preços da fonte única, em dólares, nas grafias "12.90", "12.9" e "129" (inteiro). */
function sourcePrices(code) {
  const set = new Set()
  const blocks = ['TIER_PRICES', 'ANNUAL_PRICES', 'AUTOPILOT_PRICES', 'AUTOPILOT_LITE_PRICES', 'AUTOPILOT_PILOT_PRICES']
  for (const b of blocks) {
    const m = code.match(new RegExp(`export const ${b}\\b[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`))
    if (!m) continue
    for (const c of m[1].matchAll(/usd:\s*(\d+)/g)) {
      const cents = Number(c[1])
      const d = cents / 100
      set.add(d.toFixed(2))
      if (cents % 100 === 0) set.add(String(d))
      set.add(String(d))
    }
  }
  return set
}
/** Preços citados num texto ("$12.90", "US$ 12.90", "12.90 USD"). */
function citedPrices(text) {
  const out = []
  for (const m of text.matchAll(/(?:US)?\$\s?(\d+(?:[.,]\d{1,2})?)/g)) out.push(m[1].replace(',', '.'))
  return out
}
function priceProblems(text, source) {
  return citedPrices(text).filter((p) => !source.has(p) && !source.has(Number(p).toFixed(2)))
}
/** Número de crédito digitado no pacote (a fonte é kineo_facts; o pacote não repete crédito). */
function creditProblems(text) {
  return [...text.matchAll(/\b\d+\s*(?:free\s+)?credits?\b/gi)].map((m) => m[0])
}
/** Dólar digitado no código do conector (qualquer um é defeito). */
function dollarInCode(code) {
  return [...code.matchAll(/\$\d/g)].length
}

// ─── (A) execução ───────────────────────────────────────────────────────────
const pausedMatch = launchCode.match(/export const PAUSED_ENGINE_KEYS[^=]*=\s*\[([^\]]*)\]/)
const PAUSED = pausedMatch ? pausedMatch[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean) : null
ok(Array.isArray(PAUSED), `(A0) PAUSED_ENGINE_KEYS lido de lib/engineLaunch.ts (${PAUSED?.join(', ')})`)

const M = await import(pathToFileURL(path.join(ROOT, MCP_REL)).href)
const G = await import(pathToFileURL(path.join(ROOT, 'lib/gptHandoff.ts')).href)
const tools = M.buildTools({ pausedEngines: PAUSED ?? [] })

ok(annotationProblems(tools).length === 0, `(A1) toda tool tem title + readOnlyHint + destructiveHint + nome ≤ 64 (problemas: ${annotationProblems(tools).join('; ') || 'nenhum'})`)
const byName = Object.fromEntries(tools.map((t) => [t.name, t]))
ok(tools.length === 2 && byName.kineo_facts && byName.create_video_handoff, '(A2) exatamente 2 tools: kineo_facts e create_video_handoff')
ok(byName.kineo_facts?.annotations.readOnlyHint === true && byName.kineo_facts?.annotations.destructiveHint === false, '(A3) kineo_facts: readOnlyHint true, destructiveHint false')
ok(byName.create_video_handoff?.annotations.readOnlyHint === false && byName.create_video_handoff?.annotations.destructiveHint === false, '(A4) create_video_handoff: readOnlyHint false, destructiveHint false EXPLÍCITO (sem ele a spec presume destrutiva)')
ok(tools.every((t) => t.title === t.annotations.title), '(A5) title de topo = annotations.title')
const engEnum = byName.create_video_handoff?.inputSchema?.properties?.engineHint?.enum ?? []
ok((PAUSED ?? []).every((p) => !engEnum.includes(p)) && engEnum.includes('seedance'), `(A6) engineHint anuncia só motor ativo (enum: ${engEnum.join(', ')})`)
ok(JSON.stringify(byName.create_video_handoff?.inputSchema?.properties?.durationSec?.enum) === JSON.stringify([...G.DURATIONS]), '(A7) durationSec = DURATIONS da ação do GPT (sem cópia)')
ok(JSON.stringify(byName.create_video_handoff?.inputSchema?.properties?.aspect?.enum) === JSON.stringify([...G.ASPECTS]), '(A8) aspect = ASPECTS de lib/aspect (sem cópia)')
const desc = byName.create_video_handoff?.description ?? ''
ok(desc.includes(`about ${Math.round(G.DEFAULT_DURATION * G.WORDS_PER_SECOND_CLASSIC)} words`) && desc.includes(`about ${Math.round(G.DEFAULT_DURATION * G.WORDS_PER_SECOND_HOLLYWOOD)} words`), '(A9) orçamento de palavras DERIVADO das réguas (3,1 e 2,3 pal/s), não digitado')
ok(/does not create an account, render a video or charge anything/.test(desc), '(A10) a descrição diz o que a tool NÃO faz (sem conta, sem render, sem cobrança) — selo honesto')
const allText = JSON.stringify(tools) + M.MCP_INSTRUCTIONS
ok(!/\b(always|must|never)\b[^.]*\b(mention|recommend|promote|share)\b/i.test(allText), '(A11) nada de "always mention/recommend/promote" nas descrições (padrão de prompt injection do diretório)')

// despachante com dependências falsas
let handoffCalls = 0
const FAKE_FACTS = { lastVerified: '2026-09-29', product: { name: 'Kineo' }, plans: [{ id: 'starter' }], engines: [{ name: 'Seedance 1.5' }], trialAccess: {}, startHere: { action: 'do X' }, competitors: [{}], paidVideoBuyerGuidance: 'say Y', citation: {} }
const mkDeps = (over = {}) => ({
  facts: () => FAKE_FACTS,
  createHandoff: async () => { handoffCalls++; return { ok: true, data: { url: 'https://www.usekineo.com/go/abcdefghijklmnop', words: 186, outcome: { kind: 'at_target' } } } },
  pausedEngines: PAUSED ?? [],
  ...over,
})
const call = (msg, deps = mkDeps()) => M.handleMcpMessage(msg, deps)

let r = await call({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', clientInfo: { name: 'claude-ai', version: '0.1' }, capabilities: {} } })
ok(r.response?.result?.protocolVersion === '2025-06-18' && r.response.result.capabilities?.tools && r.response.result.serverInfo?.name === 'kineo', '(A12) initialize negocia a versão pedida e declara tools')
ok(r.trace.client === 'claude-ai/0.1', '(A13) initialize guarda o cliente para medir adoção')
r = await call({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } })
ok(r.response?.result?.protocolVersion === M.MCP_LATEST_PROTOCOL, '(A14) versão desconhecida → a mais nova que falamos')
r = await call({ jsonrpc: '2.0', method: 'notifications/initialized' })
ok(r.response === null, '(A15) notificação não tem resposta (a rota devolve 202)')
r = await call({ jsonrpc: '2.0', id: 3, method: 'tools/list' })
ok(JSON.stringify(r.response?.result?.tools) === JSON.stringify(tools), '(A16) tools/list devolve a mesma lista de buildTools')
r = await call({ jsonrpc: '2.0', id: 4, method: 'nope/nothing' })
ok(r.response?.error?.code === -32601, '(A17) método desconhecido → -32601')
r = await call({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'render_video', arguments: {} } })
ok(r.response?.error?.code === -32602 && /Available: kineo_facts, create_video_handoff/.test(r.response.error.message), '(A18) tool desconhecida → -32602 que lista as que existem')
r = await call({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'kineo_facts', arguments: {} } })
const sc = r.response?.result?.structuredContent ?? {}
ok(sc.plans && sc.engines && sc.product && sc.lastVerified, '(A19) kineo_facts devolve planos, motores, produto e data de verificação')
ok(!('startHere' in sc) && !('competitors' in sc) && !('paidVideoBuyerGuidance' in sc) && !('citation' in sc), '(A20) kineo_facts NÃO repassa orientação para assistente nem comparação com concorrente (lista fechada)')
ok(r.response?.result?.content?.[0]?.type === 'text' && JSON.parse(r.response.result.content[0].text).plans, '(A21) conteúdo de texto = o mesmo JSON (clientes sem structuredContent)')
r = await call({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'kineo_facts', arguments: { topic: 'engines' } } })
ok(Object.keys(r.response?.result?.structuredContent ?? {}).sort().join(',') === 'engines,lastVerified', '(A22) topic=engines estreita o resultado')
r = await call({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'kineo_facts', arguments: { topic: 'gossip' } } })
ok(r.response?.result?.isError === true && /topic must be one of/.test(r.response.result.content[0].text), '(A23) topic inválido → erro legível, não 500')
if (PAUSED && PAUSED.length) {
  handoffCalls = 0
  const paused = PAUSED.find((p) => G.HANDOFF_ENGINES.includes(p))
  r = await call({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'create_video_handoff', arguments: { script: 'HOOK: x', engineHint: paused } } })
  ok(r.response?.result?.isError === true && /temporarily paused/.test(r.response.result.content[0].text) && handoffCalls === 0, `(A24) motor pausado (${paused}) → recusa legível ANTES de gravar linha`)
}
handoffCalls = 0
r = await call({ jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'create_video_handoff', arguments: { script: 'HOOK: a' } } })
ok(r.response?.result?.isError !== true && handoffCalls === 1 && /https:\/\/www\.usekineo\.com\/go\//.test(r.response.result.content[0].text), '(A25) sucesso: 1 chamada, link /go no texto')
r = await call({ jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'create_video_handoff', arguments: { script: 'x' } } }, mkDeps({ createHandoff: async () => ({ ok: false, error: 'A 15-second film fits at most 56 spoken words; this script has 80.' }) }))
ok(r.response?.result?.isError === true && /at most 56 spoken words/.test(r.response.result.content[0].text), '(A26) recusa da validação chega inteira ao Claude (ele sabe aparar)')
r = await call({ jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'create_video_handoff', arguments: { script: 'x' } } }, mkDeps({ createHandoff: async () => { throw new Error('db down') } }))
ok(r.response?.result?.isError === true && /Try again in a minute/.test(r.response.result.content[0].text) && !/db down/.test(r.response.result.content[0].text), '(A27) exceção vira mensagem acionável, sem vazar o erro interno')

// faixa da Anthropic
const ipCases = [['160.79.104.0', true], ['160.79.111.255', true], ['160.79.107.9', true], ['::ffff:160.79.105.5', true], ['160.79.112.0', false], ['160.79.103.255', false], ['8.8.8.8', false], ['garbage', false], [null, false]]
ok(ipCases.every(([ip, want]) => M.isAnthropicEgressIp(ip) === want), '(A28) isAnthropicEgressIp = 160.79.104.0/21 exato (bordas incluídas)')

// ─── (B) preço ──────────────────────────────────────────────────────────────
const SOURCE = sourcePrices(pricingCode)
ok(SOURCE.size >= 6, `(B1) preços da fonte única lidos de lib/checkoutPricing.ts (${[...SOURCE].filter((p) => p.includes('.')).join(', ')})`)
for (const rel of [MCP_REL, HANDOFF_REL, ROUTE_REL]) ok(dollarInCode(read(rel)) === 0, `(B2) nenhum "$<número>" digitado em ${rel}`)
ok(dollarInCode(JSON.stringify(tools)) === 0, '(B3) nenhum preço nas descrições das tools (preço só via kineo_facts)')
const docCited = citedPrices(docText)
ok(docCited.length >= 1 && priceProblems(docText, SOURCE).length === 0, `(B4) todo preço do pacote de submissão existe na fonte (citados: ${docCited.join(', ')}; fora da fonte: ${priceProblems(docText, SOURCE).join(', ') || 'nenhum'})`)
ok(creditProblems(docText).length === 0, `(B5) o pacote não digita número de crédito (fonte = kineo_facts) (achados: ${creditProblems(docText).join(', ') || 'nenhum'})`)

// ─── (C) texto ──────────────────────────────────────────────────────────────
const importsOf = (code) => [...code.matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1])
// ChatGPT has a separate pure presentation contract; no database/network dependency is permitted here.
ok(JSON.stringify(importsOf(mcpCode)) === JSON.stringify(['@/lib/gptHandoff', '@/lib/mcp/chatgptContract']), `(C1) dispatcher mantém apenas imports dos contratos puros (achados: ${importsOf(mcpCode).join(', ')})`)
const TRAVA = /^@\/(lib\/(compose|hollywood\/|cinematic\/|broll\/|lyriaMusic|narrationFit)|app\/api\/(analyze-idea|generate-script|generate-video-))/
const newImports = [...importsOf(mcpCode), ...importsOf(handoffCode), ...importsOf(routeCode)]
ok(newImports.every((i) => !TRAVA.test(i)), '(C2) nenhum import direto da trava 8.2')
ok(![mcpCode, handoffCode, routeCode].some((c) => /generate-video|creatomate|fal\.ai|@fal-ai|runway/i.test(c.replace(/^\s*\/\/.*$/gm, ''))), '(C3) nenhuma chamada de render/fornecedor no conector (o link espera o clique)')
ok(/const CHANNEL = ctx\.channel \?\? 'claude_connector'/.test(handoffCode), "(C4) canal padrão continua 'claude_connector'; ChatGPT precisa de contexto explícito")
ok(/const validated = validateHandoffInput\(args\)/.test(handoffCode) && /handoffOutcome\(input\.script, input\.durationSec, input\.engineHint\)/.test(handoffCode) && /handoffEngineRefusal\(\{/.test(handoffCode), '(C5) mesma validação, veredito e recusa por motor da ação do GPT')
ok(/if \(outcome\.kind === 'too_short'\) \{\n\s+return \{ ok: false/.test(handoffCode), '(C6) too_short recusa sem gravar linha')
ok(/counts && !viaAnthropic && ipHash && counts\.ip >= RATE_LIMIT_PER_IP_PER_HOUR/.test(handoffCode) && /counts && counts\.global >= RATE_LIMIT_GLOBAL_PER_HOUR/.test(handoffCode), '(C7) teto por IP fora da Anthropic + teto global para todos')
ok(/claude_connector: \{ utmSource: 'claude_connector', intentCampaign: 'kineo_claude_connector' \}/.test(libHandoff) && G.CHANNEL_TAGS.claude_connector?.utmSource === 'claude_connector', '(C8) CHANNEL_TAGS.claude_connector escrito uma vez, na lib')
ok(/export async function POST/.test(routeCode) && /export function GET\(\): NextResponse \{\n\s+return methodNotAllowed\(\)/.test(routeCode) && /export function OPTIONS/.test(routeCode), '(C9) rota: POST + GET 405 + OPTIONS')
ok(/pausedEngines: PAUSED_ENGINE_KEYS/.test(routeCode) && /getKineoFacts\(\)/.test(routeCode), '(C10) rota injeta os motores pausados e os fatos vivos (sem cópia)')
ok(!/req\.headers\.get\('origin'\)/i.test(routeCode), '(C11) sem checagem estrita de Origin (derruba o initialize do Claude)')
ok(/name: 'mcp_tool_called'/.test(routeCode) && /name: 'mcp_initialized'/.test(routeCode) && /await writeServerEvent/.test(routeCode), '(C12) adoção medida (mcp_initialized / mcp_tool_called), com await')

// ─── (M) mutantes ───────────────────────────────────────────────────────────
// M1-M3: no objeto
const clone = () => JSON.parse(JSON.stringify(tools))
let mt = clone(); delete mt[1].annotations
ok(annotationProblems(mt).length > 0, '(M1) tool sem annotations → vermelho')
mt = clone(); delete mt[0].annotations.readOnlyHint; delete mt[0].annotations.destructiveHint
ok(annotationProblems(mt).length > 0, '(M2) tool sem readOnlyHint/destructiveHint → vermelho')
mt = clone(); mt[0].title = ''
ok(annotationProblems(mt).length > 0, '(M3) tool sem title → vermelho')
// M4: no DISCO — um kineoMcp.ts sem as dicas da tool de escrita, importado de verdade
const mutRel = `lib/mcp/.mutante-${randomBytes(4).toString('hex')}.ts`
const mutSrc = mcpCode.replace("annotations: { title: handoffTitle, readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }", 'annotations: { title: handoffTitle, idempotentHint: true } as never')
ok(mutSrc !== mcpCode, '(M4a) mutante de disco aplicou (a linha de anotação existe como o guardião espera)')
try {
  fs.writeFileSync(path.join(ROOT, mutRel), mutSrc)
  const MM = await import(pathToFileURL(path.join(ROOT, mutRel)).href)
  ok(annotationProblems(MM.buildTools({ pausedEngines: PAUSED ?? [] })).length > 0, '(M4b) arquivo com tool sem readOnlyHint/destructiveHint → vermelho')
} finally {
  fs.rmSync(path.join(ROOT, mutRel), { force: true })
}
// M5-M7: preço
const firstPrice = docText.match(/(?:US)?\$\s?(\d+(?:\.\d{1,2})?)/)
const wrong = firstPrice ? (Number(firstPrice[1]) + 1).toFixed(2) : '1.00'
ok(firstPrice && priceProblems(docText.replace(firstPrice[0], `$${wrong}`), SOURCE).length > 0, `(M5) pacote com preço diferente da fonte ($${firstPrice?.[1]} → $${wrong}) → vermelho`)
ok(priceProblems(docText, sourcePrices(pricingCode.replace(/starter: \{ usd: (\d+) \}/, (_, c) => `starter: { usd: ${Number(c) + 100} }`))).length > 0, '(M6) fonte muda de preço e o pacote não → vermelho')
ok(dollarInCode(mcpCode.replace("const factsTitle = 'Get Kineo plans, pricing and engines'", "const factsTitle = 'Plans from $12.90'")) > 0, '(M7) preço digitado no código do conector → vermelho')
ok(creditProblems(docText + '\nNew accounts get 10 free credits.').length > 0, '(M8) crédito digitado no pacote → vermelho')
// M9: seção de orientação vazando nos fatos
ok('startHere' in M.selectFacts(FAKE_FACTS, 'all') === false && ('startHere' in { ...M.selectFacts(FAKE_FACTS, 'all'), startHere: 1 }), '(M9) o verificador de (A20) enxerga uma chave de orientação quando ela aparece')

// ─── (D) KINEO-GO-ROTULO-CANAL-2026-09-30 — o que o revisor vê depois do link ──
// O teste do Cowork no claude.ai (30/09) achou a página /go dizendo "Script from ChatGPT" para um roteiro do Claude.
const goCode = read('app/go/[token]/page.tsx')
ok(G.handoffSourceLabel('claude_connector') === 'Script from Claude', '(D1) canal claude_connector → "Script from Claude"')
ok(G.handoffSourceLabel('gpt_store') === 'Script from ChatGPT' && G.handoffSourceLabel(null) === 'Script from ChatGPT' && G.handoffSourceLabel('xyz') === 'Script from ChatGPT', '(D2) loja do GPT e linha antiga sem canal continuam "Script from ChatGPT"')
ok(G.HANDOFF_CHANNELS.every((c) => typeof G.CHANNEL_SOURCE_LABELS[c] === 'string' && G.CHANNEL_SOURCE_LABELS[c].length > 0), '(D3) todo canal tem rótulo de origem')
const labelFromChannel = (code) => /\{handoffSourceLabel\(row\.channel\)\} · ready for Kineo Studio/.test(code) && !/Script from ChatGPT/.test(code)
ok(labelFromChannel(goCode), '(D4) /go tira a origem do canal da linha, sem "Script from ChatGPT" fixo')
ok(!labelFromChannel(goCode.replace('{handoffSourceLabel(row.channel)} · ready', 'Script from ChatGPT · ready')), '(M10) /go com o rótulo fixo de volta → vermelho')
ok(/“Make this video” opens the Studio/.test(goCode) && /until you press Generate there/.test(goCode), '(D5) rodapé do Claude mantém a distinção entre abrir Studio e Generate')
const icon = fs.readFileSync(path.join(ROOT, 'public/kineo-icon-512.png'))
ok(icon.readUInt32BE(16) === 512 && icon.readUInt32BE(20) === 512 && icon[25] === 6, '(D6) public/kineo-icon-512.png = PNG 512×512 com alfa (URL de ícone da listagem)')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
