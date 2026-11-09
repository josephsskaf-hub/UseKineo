// KINEO-NO-CLAUDE-0911 [fundador 09/11: "também quero isso: generate in Claude, with Kineo AI" + regra "copiar 90%"] —
// guardião da /kineo-in-claude (página do conector Kineo Studio no molde da página MCP da Higgsfield).
//
// Prova, EXECUTANDO o código de hoje (Node com remoção de tipos + resolvedor de '@/'):
//   (A) todo cartão "você pode pedir" passa no validateCreateInput REAL de kineo_create_video (formato, duração do motor
//       padrão — o pedido não nomeia motor —, quadro, língua, ideia × roteiro) e usa o formato que PRODUZ hoje ('film': os
//       outros devolvem link do Studio sem cobrar); 6 a 9 cartões; prévia leve que existe em public/;
//   (B) a página nunca diz "unlimited", nunca nomeia motor, não promete prazo, não digita preço, não fala em parceria,
//       sem logo de terceiros, e "apresentador falante" só aparece na frase do que NÃO faz;
//   (C) estrutura do molde: abas Claude · ChatGPT, herói "Generate videos in <assistente> with Kineo", botão principal que
//       copia a URL do KINEO STUDIO antes de abrir o modal de conector (mesmos eventos da /claude-connector), "How to
//       connect?" rolando aos passos, custos derivados de engineCatalog, FAQ, sitemap, llms.txt e o link da /claude-connector;
//       o conector do diretório (/api/mcp) não ganha nada desta entrega.
// Mutantes no fim provam que cada verificação enxerga o defeito.
import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => {
  if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) }
}

const asFile = (abs) => {
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs
  for (const ext of ['.ts', '.tsx']) if (fs.existsSync(abs + ext)) return abs + ext
  if (fs.existsSync(path.join(abs, 'index.ts'))) return path.join(abs, 'index.ts')
  return abs + '.ts'
}
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) return { url: pathToFileURL(asFile(path.join(ROOT, specifier.slice(2)))).href, shortCircuit: true }
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
      const abs = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
      if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) return { url: pathToFileURL(asFile(abs)).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href)

const G = await load('lib/generateInClaude.ts')
const S = await load('lib/mcp/studioMcp.ts')
const E = await load('lib/engineLaunch.ts')
const H = await load('lib/gptHandoff.ts')
const PAUSED = E.UNAVAILABLE_ENGINE_KEYS

const F = {
  lib: 'lib/generateInClaude.ts',
  page: 'app/kineo-in-claude/page.tsx',
  ui: 'app/kineo-in-claude/GenerateInClaude.tsx',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, read(v)]))
const studioSrc = read('lib/mcp/studioMcp.ts')

/** Sem comentários: o que vira tela ou comportamento. */
const code = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s\/\/ .*$/gm, '')

// ─── (A) cartões ↔ ferramenta ────────────────────────────────────────────────
const FORMAT_THAT_RENDERS = 'film'
function cardProblems(cards) {
  const probs = []
  if (cards.length < 6 || cards.length > 9) probs.push(`${cards.length} cartões (esperado 6 a 9)`)
  if (new Set(cards.map((c) => c.id)).size !== cards.length) probs.push('id de cartão repetido')
  for (const c of cards) {
    if (!S.STUDIO_FORMATS.includes(c.format)) probs.push(`${c.id}: formato ${c.format} fora de STUDIO_FORMATS`)
    if (c.format !== FORMAT_THAT_RENDERS) probs.push(`${c.id}: formato ${c.format} não produz pelo conector hoje (devolve link do Studio)`)
    const args = { format: c.format, duration: c.duration, aspect: c.aspect, language: c.language, ...(c.mode === 'script' ? { script: 'narration' } : { idea: c.title }) }
    const v = S.validateCreateInput(args, PAUSED)
    if (!v.ok) probs.push(`${c.id}: kineo_create_video recusaria (${v.error})`)
    else if (v.value.engine !== S.STUDIO_DEFAULT_ENGINE) probs.push(`${c.id}: motor ≠ padrão`)
    if (!/^Using Kineo Studio, make a /.test(c.prompt)) probs.push(`${c.id}: pedido não começa com "Using Kineo Studio, make a"`)
    if (!c.prompt.includes(`${c.duration}-second`)) probs.push(`${c.id}: pedido não diz a duração do cartão`)
    if (c.aspect === '9:16' && !/vertical/.test(c.prompt)) probs.push(`${c.id}: pedido não diz vertical`)
    if (c.aspect === '16:9' && !/16:9/.test(c.prompt)) probs.push(`${c.id}: pedido não diz 16:9`)
    if (c.mode === 'script' && !/word for word/.test(c.prompt)) probs.push(`${c.id}: roteiro próprio sem "word for word"`)
    if (c.language !== 'en' && !G.ASK_LANGUAGE_NAMES[c.language]) probs.push(`${c.id}: língua ${c.language} sem nome para o selo`)
    if (c.language !== 'en' && !c.prompt.includes(`in ${G.ASK_LANGUAGE_NAMES[c.language]}`)) probs.push(`${c.id}: pedido não pede a língua do cartão`)
    for (const f of [c.clip.src, c.clip.poster]) {
      const abs = path.join(ROOT, 'public', f)
      if (!fs.existsSync(abs)) probs.push(`${c.id}: ${f} não existe em public/`)
      else if (f.endsWith('.mp4') && fs.statSync(abs).size > 1_500_000) probs.push(`${c.id}: prévia pesada (${f})`)
    }
  }
  return probs
}
const cp = cardProblems(G.ASK_CARDS)
ok(cp.length === 0, `(A1) ${G.ASK_CARDS.length} cartões: todos passam no validateCreateInput real, formato '${FORMAT_THAT_RENDERS}', pedido coerente, prévia leve em public/ (${cp.join('; ') || 'ok'})`)
ok(/if \(input\.format !== 'film'\) \{[\s\S]{0,400}format_not_available/.test(studioSrc), "(A2) o conector ainda só produz 'film' (os outros formatos devolvem link sem cobrar) — se isto mudar, reveja os cartões e a linha STUDIO_ONLY_FORMATS_LINE")
ok(/Product ads, UGC ads and cartoon episodes/.test(G.STUDIO_ONLY_FORMATS_LINE) && /charges nothing/.test(G.STUDIO_ONLY_FORMATS_LINE) && /\{STUDIO_ONLY_FORMATS_LINE\}/.test(SRC.ui), '(A3) a página diz, numa linha, que anúncio/UGC/desenho saem no Studio sem cobrança')

// ─── (B) higiene do texto ────────────────────────────────────────────────────
const toolTitles = S.buildStudioTools({ pausedEngines: PAUSED }).map((t) => t.title)
const engineNames = [...new Set([...Object.values(H.ENGINE_LABELS), 'Seedance', 'Kling', 'Veo', 'MiniMax', 'Hailuo', 'Omni', 'Kineo 1', 'Sora', 'Runway', 'Pika', 'Lyria', 'ElevenLabs', 'H3'])]
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const ENGINE_RE = new RegExp(`\\b(${engineNames.map(esc).join('|')})\\b`, 'i')
function textProblems(texts) {
  const probs = []
  for (const [nome, t] of Object.entries(texts)) {
    if (/unlimited/i.test(t)) probs.push(`${nome}: "unlimited"`)
    const eng = t.match(ENGINE_RE)
    if (eng) probs.push(`${nome}: nomeia motor (${eng[0]})`)
    const prazo = t.match(/\bin (a few |about |under |just )?(\d+ )?(minutes?|seconds)\b(?! of)|\binstantly\b|\bwithin \d+|\bready in\b|countdown|\bonly \d+ (left|spots)/i)
    if (prazo) probs.push(`${nome}: promete prazo/urgência (${prazo[0]})`)
    const preco = t.match(/\b\d+\s*(credits|cr)\b|\$\s?\d/)
    if (preco) probs.push(`${nome}: preço digitado (${preco[0]})`)
    const parc = t.match(/\b(official|partner(ed|ship)?|endorsed|certified|approved by|built with Anthropic|by Anthropic|by OpenAI)\b/i)
    if (parc) probs.push(`${nome}: sugere parceria (${parc[0]})`)
    if (/<img\b|<Image\b|\.(png|svg|jpe?g)['"`]/i.test(t)) probs.push(`${nome}: imagem/logo`)
    for (const m of t.matchAll(/talking (presenter|person|avatar|head)/gi)) {
      if (!/does not put a $/.test(t.slice(Math.max(0, m.index - 30), m.index))) probs.push(`${nome}: promete apresentador falante`)
    }
    if (/\brecommend|\bpromote/i.test(t)) probs.push(`${nome}: manda recomendar/promover`)
  }
  return probs
}
const TEXTS = { lib: code(SRC.lib), page: code(SRC.page), ui: code(SRC.ui), tools: toolTitles.join(' | ') }
const tp = textProblems(TEXTS)
ok(tp.length === 0, `(B1) sem "unlimited", sem nome de motor, sem prazo/urgência, sem preço digitado, sem parceria, sem logo, sem apresentador falante prometido (${tp.join('; ') || 'ok'})`)
ok(!/#[0-9a-fA-F]{3,8}\b['"`]/.test(code(SRC.ui)) && /from '\.\.\/claude-connector\/palette'/.test(SRC.ui), '(B2) cores só da paleta das páginas de conector')

// ─── (C) estrutura do molde + fontes únicas ─────────────────────────────────
ok(G.GENERATE_IN_CLAUDE_TABS.map((t) => t.key).join() === 'claude,chatgpt', '(C1) abas: Claude · ChatGPT (só onde o Kineo Studio foi testado)')
ok(G.heroTitle('claude') === 'Generate videos in Claude with Kineo' && G.heroTitle('chatgpt') === 'Generate videos in ChatGPT with Kineo' && /textTransform: 'uppercase'[\s\S]{0,80}\{heroTitle\(tab\)\}/.test(SRC.ui), '(C2) herói "GENERATE VIDEOS IN CLAUDE WITH KINEO" (aba ChatGPT troca o nome)')
ok(G.assistantTabFrom('chatgpt') === 'chatgpt' && G.assistantTabFrom('ChatGPT') === 'chatgpt' && G.assistantTabFrom('x') === null && /assistantTabFrom\(sp\.get\('tab'\)\)/.test(SRC.ui) && /vemDoChatgpt\(/.test(SRC.ui), '(C3) ?tab=chatgpt (e quem vem do ChatGPT) abre na aba ChatGPT')
{
  const fn = (SRC.ui.match(/const addConnector = async \(\) => \{[\s\S]*?\n  \}\n/) || [''])[0]
  const writeAt = fn.indexOf('writeText(serverUrl)')
  const openAt = fn.indexOf('window.open(CLAUDE_ADD_CONNECTOR_URL')
  ok(writeAt > 0 && openAt > writeAt && /track\(CLAUDE_CONNECT_EVENTS\.copyOpen/.test(fn) && /track\(CLAUDE_CONNECT_EVENTS\.copiedStateView/.test(fn) && /onClick=\{addConnector\}[\s\S]{0,120}Add Kineo in \{name\}/.test(SRC.ui), '(C4) "Add Kineo in …": copia ANTES de abrir o modal de conector, mesmos eventos da /claude-connector')
}
ok(/serverUrl=\{CLAUDE_STUDIO_MCP_SERVER_URL\}/.test(SRC.page) && !/CLAUDE_MCP_SERVER_URL\b/.test(code(SRC.page) + code(SRC.ui)) && !/usekineo\.com\/api\/mcp/.test(code(SRC.page) + code(SRC.ui) + code(SRC.lib)), '(C5) a URL é a do Kineo Studio (fonte única), nunca a do conector do diretório, nada digitado')
ok(/href=\{`#\$\{GENERATE_IN_CLAUDE_STEPS_ANCHOR\}`\}[\s\S]{0,140}How to connect\?/.test(SRC.ui) && /id=\{GENERATE_IN_CLAUDE_STEPS_ANCHOR\}/.test(SRC.ui), '(C6) "How to connect?" rola aos passos numerados')
ok(/CLAUDE_STEPS/.test(SRC.ui) && /CHATGPT_STEPS/.test(SRC.ui) && /What the connector does/.test(SRC.ui) && /What it does not do/.test(SRC.ui) && /What it costs/.test(SRC.ui) && /How to disconnect/.test(SRC.ui) && /aria-label="FAQ"/.test(SRC.ui), '(C7) passos por aba + faz / não faz + custo + desconectar + FAQ')
ok(/engineCatalog\(UNAVAILABLE_ENGINE_KEYS\)/.test(SRC.page) && /buildStudioTools\(\{ pausedEngines: UNAVAILABLE_ENGINE_KEYS \}\)/.test(SRC.page) && /from \{c\.from\} credits/.test(SRC.ui) && /from \{r\.from\} credits/.test(SRC.ui), '(C8) créditos e ferramentas derivados do código (engineCatalog / buildStudioTools)')
ok(/export const dynamic = 'force-static'/.test(SRC.page) && SRC.page.includes('canonical: `${BASE}${GENERATE_IN_CLAUDE_PATH}`') && /<Footer \/>/.test(SRC.page), '(C9) estática, canônica e com rodapé')
ok(G.GENERATE_IN_CLAUDE_PATH === '/kineo-in-claude' && !G.GENERATE_IN_CLAUDE_PATH.startsWith('/generate') && fs.existsSync(path.join(ROOT, 'app', G.GENERATE_IN_CLAUDE_PATH.slice(1), 'page.tsx')), '(C10) rota /kineo-in-claude existe e não cai no prefixo /generate (componentes globais tratam /generate* como a tela de gerar)')
ok(/\{ path: '\/kineo-in-claude'/.test(read('app/sitemap.ts')) && read('app/llms.txt/route.ts').includes('(${BASE}/kineo-in-claude)'), '(C11) no sitemap e no llms.txt')
ok(/<Link href=\{GENERATE_IN_CLAUDE_PATH\}/.test(read('app/claude-connector/StudioSection.tsx')) && /href=\{scriptsOnlyHref\}/.test(SRC.ui) && /scriptsOnlyHref=\{CLAUDE_CONNECTOR_PAGE\}/.test(SRC.page), '(C12) /claude-connector aponta para cá e esta página aponta de volta')
ok(['app/api/mcp/route.ts', 'lib/mcp/kineoMcp.ts', 'lib/kineoFacts.ts', 'scripts/test-mcp-claude-2026-09-29.mjs'].every((f) => !/kineo-in-claude|generateInClaude|KINEO-NO-CLAUDE-0911/.test(read(f))), '(C13) o conector do diretório (/api/mcp) e o guardião dele não ganham nada desta entrega')

// ─── mutantes ────────────────────────────────────────────────────────────────
const base = G.ASK_CARDS
const swap = (i, patch) => base.map((c, j) => (j === i ? { ...c, ...patch } : c))
ok(cardProblems(swap(0, { format: 'product_ad' })).length > 0, '(M1) cartão com product_ad (não produz pelo conector) → vermelho')
ok(cardProblems(swap(0, { format: 'trailer' })).length > 0, '(M2) cartão com formato que a ferramenta não aceita → vermelho')
ok(cardProblems(swap(0, { duration: 30, prompt: base[0].prompt.replace(/\d+-second/, '30-second') })).length > 0, '(M3) duração que o motor padrão não faz (30 s) → vermelho')
ok(cardProblems(swap(0, { language: 'xx' })).length > 0, '(M4) língua fora da narração → vermelho')
ok(cardProblems(swap(0, { aspect: '21:9' })).length > 0, '(M5) quadro fora de STUDIO_ASPECTS → vermelho')
ok(cardProblems(swap(0, { clip: { src: '/previews/nao-existe.mp4', poster: base[0].clip.poster } })).length > 0, '(M6) prévia inexistente → vermelho')
ok(cardProblems(base.slice(0, 5)).length > 0, '(M7) menos de 6 cartões → vermelho')
ok(textProblems({ x: 'Unlimited generations' }).length > 0, '(M8) "Unlimited" → vermelho')
ok(textProblems({ x: 'A narrated film made with Seedance 1.5' }).length > 0 && textProblems({ x: `A film from ${H.ENGINE_LABELS.hollywood}` }).length > 0, '(M9) nome de motor → vermelho')
ok(textProblems({ x: 'Your film is ready in 3 minutes' }).length > 0, '(M10) promessa de prazo → vermelho')
ok(textProblems({ x: 'from 21 credits' }).length > 0, '(M11) preço digitado → vermelho')
ok(textProblems({ x: 'The official Claude partner for video' }).length > 0, '(M12) parceria → vermelho')
ok(textProblems({ x: 'A talking presenter explains your product' }).length > 0 && textProblems({ x: 'It does not put a talking presenter on screen' }).length === 0, '(M13) apresentador falante prometido → vermelho; a negação passa')

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
