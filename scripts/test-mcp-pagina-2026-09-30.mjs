// KINEO-MCP-PAGINA-2026-09-30 — guardião da /claude-connector no molde Buzzy/Higgsfield (fundador 30/09: "quero
// deixar o nosso modelo de MCP parecido com esses modelos"; "MCP" no menu do topo aponta para cá).
//
// Prova: (1) 5 abas — Claude, Claude Code, Cursor, Other MCP clients e ChatGPT marcado "soon" (não existe app nosso
// lá); (2) cada aba = 3 cartões numerados (StepCard n=1,2,3); (3) a URL do servidor vem de CLAUDE_MCP_SERVER_URL
// (nenhum literal na página nem no painel; a config do Cursor usa a mesma); (4) nenhuma frase diz que o vídeo é
// gerado/renderizado DENTRO do Claude (o conector escreve o roteiro e manda ao Studio); (5) todo clipe de pedido
// existe em public/previews E o selo nomeia o motor que o gerou (lista CURATED de lib/engineWall.ts); (6) chips de
// categoria cobrem todos os pedidos; (7) sem <img>/arquivo de logo de terceiros; (8) cores só pela paleta.
//
// Estilo readFileSync (roda sem alias `@/`); mutantes no fim provam que cada verificação enxerga o defeito.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => {
  if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) }
}

const SRC = {
  page: read('app/claude-connector/page.tsx'),
  panel: read('app/claude-connector/ConnectPanel.tsx'),
  filter: read('app/claude-connector/PresetFilter.tsx'),
  glyphs: read('app/claude-connector/ClientGlyphs.tsx'),
  wall: read('lib/engineWall.ts'),
  lib: read('lib/claudeConnect.ts'),
}

/** Sem comentários (o que vira tela ou comportamento). */
const code = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

// ─── (1) abas ─────────────────────────────────────────────────────────────────
function tabProblems(panel) {
  const probs = []
  const block = (panel.match(/const TABS[\s\S]*?\n\]/) || [''])[0]
  const tabs = [...block.matchAll(/\{ key: '([a-z_]+)', label: '([^']+)'(, soon: true)? \}/g)].map((m) => ({ key: m[1], label: m[2], soon: !!m[3] }))
  const want = ['claude', 'claude_code', 'cursor', 'other', 'chatgpt']
  if (tabs.map((t) => t.key).join() !== want.join()) probs.push(`abas ≠ ${want.join(' · ')} (${tabs.map((t) => t.key).join(' · ')})`)
  const gpt = tabs.find((t) => t.key === 'chatgpt')
  if (!gpt || !gpt.soon) probs.push('aba ChatGPT sem "soon"')
  if (tabs.some((t) => t.key !== 'chatgpt' && t.soon)) probs.push('aba que funciona marcada como "soon"')
  if (!/\{t\.soon && \(/.test(panel)) probs.push('marca "soon" não é renderizada')
  if (!panel.includes('<strong>Coming soon.</strong> A Kineo app for ChatGPT is not available yet.')) probs.push('aba ChatGPT não diz "Coming soon"')
  return probs
}

// ─── (2) 3 cartões por aba ────────────────────────────────────────────────────
function panelsOf(panel) {
  const out = {}
  const re = /\{tab === '([a-z_]+)' && \(([\s\S]*?)\n      \)\}/g
  for (const m of panel.matchAll(re)) out[m[1]] = m[2]
  return out
}
function stepProblems(panel) {
  const probs = []
  const panels = panelsOf(panel)
  for (const key of ['claude', 'claude_code', 'cursor', 'other', 'chatgpt']) {
    const body = panels[key]
    if (!body) { probs.push(`aba ${key} sem painel`); continue }
    const ns = [...body.matchAll(/<StepCard n=\{(\d)\}/g)].map((m) => m[1]).join()
    if (ns !== '1,2,3') probs.push(`aba ${key}: cartões ${ns || 'nenhum'} (esperado 1,2,3)`)
    if (!/<ol style=\{STEP_GRID\}>/.test(body)) probs.push(`aba ${key}: cartões fora da grade lado a lado`)
  }
  // Lado a lado no computador, empilhados no celular: grade auto-fit com mínimo ≤ 100%.
  if (!/gridTemplateColumns: 'repeat\(auto-fit, minmax\(min\(100%, \d+px\), 1fr\)\)'/.test((panel.match(/const STEP_GRID[\s\S]*?\n\}/) || [''])[0])) probs.push('STEP_GRID não empilha no celular')
  // Claude: os 3 passos pedidos (abrir → adicionar → conectar e começar).
  const c = panels.claude || ''
  if (!/n=\{1\} title="Open connector settings"[\s\S]*copyAndOpen/.test(c)) probs.push('cartão 1 do Claude não copia + abre o modal')
  if (!/n=\{2\} title="Add the Kineo connector"[\s\S]*<CopyField value=\{serverUrl\}/.test(c)) probs.push('cartão 2 do Claude sem a URL com Copy')
  if (!/n=\{3\} title="Connect and start"[\s\S]*href=\{startHref\}[\s\S]*Start in Claude →/.test(c)) probs.push('cartão 3 do Claude sem "Start in Claude →"')
  // Claude Code e Cursor: o comando / o arquivo certos.
  if (!(panels.claude_code || '').includes('<CopyField value={cliCommand}') || !panel.includes('const cliCommand = `claude mcp add --transport http kineo ${serverUrl}`')) probs.push('Claude Code sem `claude mcp add --transport http kineo <url>`')
  if (!(panels.claude_code || '').includes('/mcp')) probs.push('Claude Code sem o passo /mcp')
  if (!(panels.cursor || '').includes('~/.cursor/mcp.json') || !panel.includes('const cursorConfig = JSON.stringify({ mcpServers: { kineo: { url: serverUrl } } }, null, 2)')) probs.push('Cursor sem ~/.cursor/mcp.json com {"mcpServers":{"kineo":{"url":…}}}')
  return probs
}

// ─── (3) URL do servidor da fonte única ───────────────────────────────────────
function urlProblems({ page, panel, lib }) {
  const probs = []
  if (!lib.includes("export const CLAUDE_MCP_SERVER_URL = 'https://www.usekineo.com/api/mcp'")) probs.push('CLAUDE_MCP_SERVER_URL mudou')
  if (!page.includes('const SERVER_URL = CLAUDE_MCP_SERVER_URL')) probs.push('página não lê CLAUDE_MCP_SERVER_URL')
  if (!page.includes('<ConnectPanel serverUrl={SERVER_URL}')) probs.push('painel não recebe SERVER_URL')
  if (!page.includes('<CopyField value={SERVER_URL}')) probs.push('hero sem a URL do servidor com Copy')
  for (const [nome, s] of [['página', page], ['painel', panel]]) {
    if (/usekineo\.com\/api\/mcp|\/api\/mcp['"`]/.test(code(s))) probs.push(`URL do servidor digitada no ${nome}`)
  }
  return probs
}

// ─── (4) honestidade: nada é gerado dentro do Claude ─────────────────────────
const CLAIM = [
  /\b(generate|generates|render|renders|create|creates|make|makes)\s+(your\s+|the\s+|a\s+)?(videos?|clips?|films?|shorts?)\s+(right\s+)?(inside|in|within|from)\s+(Claude|ChatGPT|Cursor|your (AI|chat|assistant))\b/i,
  /\b(render|renders|rendered|generate|generates|generated)\s+(it\s+|them\s+)?(right\s+)?(inside|in|within)\s+(Claude|ChatGPT|Cursor)\b/i,
  /\bvideos? (appear|plays?|is ready) (inside|in) (Claude|ChatGPT|Cursor)\b/i,
]
function claimProblems(srcs) {
  const probs = []
  for (const s of srcs) for (const re of CLAIM) {
    const m = code(s).match(re)
    if (m) probs.push(`promete vídeo dentro do cliente: "${m[0]}"`)
  }
  return probs
}

// ─── (5) clipes reais com o selo do motor que os gerou ───────────────────────
const WALL_KEY = { fast: 'fast', seedance: 'cinematic_ai', kling: 'cinematic_kling', veo: 'cinematic_veo', hollywood: 'cinematic_hollywood', h3: 'cinematic_h3', omni: 'cinematic_omni' }
function curatedOf(wall) {
  const block = (wall.match(/const CURATED: Record<string, string\[\]> = \{[\s\S]*?\n\}/) || [''])[0]
  const out = {}
  for (const m of block.matchAll(/^\s*([a-z0-9_]+): \[([^\]]*)\]/gm)) out[m[1]] = [...m[2].matchAll(/'([0-9a-f-]+)'/g)].map((x) => x[1])
  return out
}
function clipProblems(page, wall) {
  const probs = []
  const curated = curatedOf(wall)
  if (!Object.keys(curated).length) probs.push('CURATED ilegível em lib/engineWall.ts')
  const presets = [...page.matchAll(/id: '([a-z]+)',\n\s+cat: '([a-z]+)',[\s\S]*?clip: (null|'([0-9a-f-]+)'),\n\s+engine: (null|'([a-z0-9]+)'),/g)]
  if (presets.length < 4) probs.push(`menos de 4 pedidos legíveis (${presets.length})`)
  for (const m of presets) {
    const [, id, , , clip, , engine] = m
    if (!clip) { if (engine) probs.push(`${id}: motor sem clipe`); continue }
    if (!fs.existsSync(path.join(ROOT, 'public/previews', clip + '.mp4'))) probs.push(`${id}: clipe inexistente ${clip}`)
    const wk = WALL_KEY[engine]
    if (!wk || !(curated[wk] || []).includes(clip)) probs.push(`${id}: selo "${engine}" não é o motor do clipe ${clip.slice(0, 8)} em CURATED`)
  }
  if (presets.length > 6) probs.push(`mais de 6 pedidos (${presets.length})`)
  return probs
}

// ─── (6) chips cobrem os pedidos ──────────────────────────────────────────────
function chipProblems(page, filter) {
  const probs = []
  const cats = [...((page.match(/const PRESET_CATEGORIES = \[[\s\S]*?\] as const/) || [''])[0]).matchAll(/key: '([a-z]+)'/g)].map((m) => m[1])
  if (cats.join() !== 'shorts,ads,clips,plans') probs.push(`chips ≠ Shorts · Ads · Clips · Plans (${cats.join()})`)
  for (const m of page.matchAll(/\n\s+cat: '([a-z]+)',/g)) if (!cats.includes(m[1])) probs.push(`pedido em categoria sem chip: ${m[1]}`)
  if (!page.includes('data-cat={pr.cat}')) probs.push('cartão sem data-cat')
  if (!filter.includes("{ key: 'all', label: 'All' }")) probs.push('sem o chip "All"')
  if (!/\[data-filter="\$\{c\.key\}"\]>\[data-cat\]:not\(\[data-cat~="\$\{c\.key\}"\]\)\{display:none!important\}/.test(filter)) probs.push('filtro não esconde por data-cat (sem !important o display:flex inline do cartão vence)')
  return probs
}

// ─── (7)+(8) sem logo de terceiros; cores pela paleta ────────────────────────
function lookProblems(srcs) {
  const probs = []
  for (const [nome, s] of Object.entries(srcs)) {
    const c = code(s)
    if (/<img\b|<Image\b|\.(png|jpe?g|webp|svg)['"`]/i.test(c)) probs.push(`${nome}: imagem/arquivo de logo`)
    const hex = c.match(/['"`]#[0-9a-fA-F]{3,8}\b/)
    if (hex) probs.push(`${nome}: cor digitada fora da paleta (${hex[0]})`)
  }
  return probs
}
const LOOK = { page: SRC.page, panel: SRC.panel, filter: SRC.filter, glyphs: SRC.glyphs }

// ─── o real ──────────────────────────────────────────────────────────────────
const t = tabProblems(SRC.panel)
ok(t.length === 0, `(1) 5 abas com ícone: Claude · Claude Code · Cursor · Other MCP clients · ChatGPT "soon" (${t.join('; ') || 'ok'})`)
const st = stepProblems(SRC.panel)
ok(st.length === 0, `(2) cada aba = 3 cartões numerados lado a lado; Claude/Claude Code/Cursor com os passos certos (${st.join('; ') || 'ok'})`)
const u = urlProblems(SRC)
ok(u.length === 0, `(3) URL do servidor só de CLAUDE_MCP_SERVER_URL (hero, painel, Cursor) (${u.join('; ') || 'ok'})`)
const cl = claimProblems([SRC.page, SRC.panel, SRC.filter])
ok(cl.length === 0, `(4) nenhuma promessa de vídeo gerado dentro do Claude (${cl.join('; ') || 'ok'})`)
const cp = clipProblems(SRC.page, SRC.wall)
ok(cp.length === 0, `(5) todo clipe existe em public/previews e o selo nomeia o motor de CURATED (${cp.join('; ') || 'ok'})`)
const ch = chipProblems(SRC.page, SRC.filter)
ok(ch.length === 0, `(6) chips All · Shorts · Ads · Clips · Plans cobrem todos os pedidos (${ch.join('; ') || 'ok'})`)
const lk = lookProblems(LOOK)
ok(lk.length === 0, `(7) sem <img>/logo de terceiros e sem cor fora de ./palette (${lk.join('; ') || 'ok'})`)
ok(/export const dynamic = 'force-static'/.test(SRC.page) && SRC.page.includes('canonical: `${BASE}/claude-connector`') && SRC.page.includes('<Footer />'), '(8) force-static, canonical /claude-connector e Footer mantidos')

// ─── mutantes ────────────────────────────────────────────────────────────────
{
  const m = SRC.panel.replace("  { key: 'cursor', label: 'Cursor' },\n", '')
  ok(m !== SRC.panel && tabProblems(m).length > 0, '(M1) sem a aba Cursor → vermelho')
}
{
  const m = SRC.panel.replace("{ key: 'chatgpt', label: 'ChatGPT', soon: true }", "{ key: 'chatgpt', label: 'ChatGPT' }")
  ok(m !== SRC.panel && tabProblems(m).length > 0, '(M2) ChatGPT sem "soon" → vermelho')
}
{
  const m = SRC.panel.replace(/<StepCard n=\{2\} title="Add the Kineo connector">[\s\S]*?<\/StepCard>\n/, '')
  ok(m !== SRC.panel && stepProblems(m).length > 0, '(M3) aba Claude com 2 cartões → vermelho')
}
{
  const m = SRC.page.replace('const SERVER_URL = CLAUDE_MCP_SERVER_URL', "const SERVER_URL = 'https://www.usekineo.com/api/mcp'")
  ok(m !== SRC.page && urlProblems({ ...SRC, page: m }).length > 0, '(M4) URL do servidor digitada na página → vermelho')
}
{
  const m = SRC.page.replace('Kineo MCP for any AI\n', 'Kineo MCP for any AI — generate videos in Claude\n')
  ok(m !== SRC.page && claimProblems([m]).length > 0, '(M5) "generate videos in Claude" no hero → vermelho')
  const m2 = SRC.panel.replace('Done.</p>', 'Your film renders in Claude.</p>')
  ok(m2 !== SRC.panel && claimProblems([m2]).length > 0, '(M6) "renders in Claude" no painel → vermelho')
}
{
  const m = SRC.page.replace("clip: 'c4e4fbab-0978-4daa-9fcf-119096370210'", "clip: '00000000-dead-beef-0000-000000000000'")
  ok(m !== SRC.page && clipProblems(m, SRC.wall).length > 0, '(M7) clipe que não existe na vitrine → vermelho')
  const m2 = SRC.page.replace("clip: 'c4e4fbab-0978-4daa-9fcf-119096370210',\n    engine: 'kling',", "clip: 'c4e4fbab-0978-4daa-9fcf-119096370210',\n    engine: 'veo',")
  ok(m2 !== SRC.page && clipProblems(m2, SRC.wall).length > 0, '(M8) selo com motor que não gerou o clipe → vermelho')
}
{
  const m = SRC.page.replace("    cat: 'plans',", "    cat: 'memes',")
  ok(m !== SRC.page && chipProblems(m, SRC.filter).length > 0, '(M9) pedido em categoria sem chip → vermelho')
}
{
  const m = SRC.panel.replace('background: C.card, border:', "background: '#161618', border:")
  ok(m !== SRC.panel && lookProblems({ ...LOOK, panel: m }).length > 0, '(M10) cor digitada fora da paleta → vermelho')
}

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
