// KINEO-WORKS-WITH-CLAUDE-2026-09-30 — guardião do selo "Works with Claude" (fundador 30/09: "vai").
//
// O que é verdade HOJE e pode ser dito: a Kineo funciona no Claude como conector personalizado (/api/mcp,
// passo a passo em /claude-connector). O que NÃO é verdade ainda: listagem no diretório de conectores do Claude
// (submetida 30/09, "Em revisão", sem garantia), integração oficial, parceria ou endosso da Anthropic.
// Este guardião reprova qualquer uma dessas palavras nas superfícies do selo, e qualquer logo/imagem nelas.
// Quando a listagem for APROVADA E PUBLICADA, reancorar com motivo (trocar a frase para a do diretório).
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

const pricing = read('app/pricing/PricingClient.tsx')
const footer = read('components/Footer.tsx')
const page = read('app/claude-connector/page.tsx')

/** Promessa que ainda não é verdade. */
// "approved"/"verified" sozinhos são legítimos ("the script you approved"); reprova aprovado/verificado POR alguém.
const OVERCLAIM = /\b(official|officially|partner(ship)?|endorsed|certified|(approved|verified) (by|connector|integration)|directory|featured in claude|anthropic)\b/i
/** Texto que o usuário vê (sem comentários de código). */
const visible = (code) => code.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

/** O bloco do selo na página de preços: do <a> que aponta para /claude-connector até o </a>. */
function badgeOf(code) {
  const m = code.match(/<a\s+href="\/claude-connector[^"]*"[\s\S]*?<\/a>/)
  return m ? m[0] : null
}
function badgeProblems(code) {
  const b = badgeOf(code)
  if (!b) return ['selo ausente']
  const probs = []
  if (!/Works with Claude/.test(b)) probs.push('sem "Works with Claude"')
  if (OVERCLAIM.test(visible(b))) probs.push(`promessa acima da verdade: ${visible(b).match(OVERCLAIM)[0]}`)
  if (/<img|<svg|<Image|logo/i.test(b)) probs.push('logo/imagem no selo')
  if (!/target="_blank"/.test(b) || !/rel="noopener/.test(b)) probs.push('não abre em aba nova (tira o comprador da página de preços)')
  // 30/09: o selo nasceu dentro de .pricing-intro e ficou INVISÍVEL — o CSS da página esconde todo <p> filho de
  // .pricing-intro (.pricing-blue .pricing-intro>p{display:none}). Ele tem de vir DEPOIS da grade de planos (#plans).
  const plansAt = code.indexOf('id="plans"')
  if (plansAt < 0 || code.indexOf(b) < plansAt) probs.push('selo antes da grade de planos (a área do topo esconde <p>)')
  return probs
}
function footerProblems(code) {
  const m = code.match(/\{ href: '\/claude-connector', label: '([^']+)' \}/)
  if (!m) return ['link do rodapé ausente']
  return OVERCLAIM.test(m[1]) ? [`rodapé promete demais: ${m[1]}`] : []
}

// ─── o real ────────────────────────────────────────────────────────────────
ok(badgeProblems(pricing).length === 0, `(1) /pricing: selo "Works with Claude" → /claude-connector, sem logo, sem promessa acima da verdade, aba nova (${badgeProblems(pricing).join('; ') || 'ok'})`)
ok(footerProblems(footer).length === 0, `(2) rodapé: "Use Kineo in Claude" → /claude-connector (${footerProblems(footer).join('; ') || 'ok'})`)
ok(!OVERCLAIM.test(visible(page)), `(3) /claude-connector não promete diretório/parceria/oficial no texto visível (${(visible(page).match(OVERCLAIM) || ['nada'])[0]})`)
ok(/export default function ClaudeConnectorPage/.test(page) && /\{SERVER_URL\}/.test(page), '(4) a página de destino existe e mostra a URL do servidor')
ok(fs.existsSync(path.join(ROOT, 'app/api/mcp/route.ts')), '(5) o servidor que o selo anuncia existe (app/api/mcp/route.ts)')
ok(/\{ path: '\/claude-connector'/.test(read('app/sitemap.ts')), '(6) /claude-connector está no sitemap')

// ─── KINEO-OPEN-IN-CLAUDE + KINEO-CLAUDE-CONNECTOR-V2 (30/09) — mecânica da página MCP da Higgsfield ───
const panel = read('app/claude-connector/ConnectPanel.tsx')
/** Problemas da grade "Try in Claude" e do painel de conexão. */
function tryProblems(code, panelCode) {
  const probs = []
  // Texto literal (includes), não regex: nada de escape para errar.
  const has = (s) => code.includes(s)
  if (!has("const CLAUDE_NEW_CHAT = 'https://claude.ai/new?q='")) probs.push('destino não é claude.ai/new?q=')
  if (!has("const CONNECT_URL = 'https://claude.ai/customize/connectors?modal=add-custom-connector'")) probs.push('CONNECT_URL não é o modal de conector do claude.ai')
  // O truque da Higgsfield: todo pedido termina guiando quem ainda não conectou — com a URL do NOSSO servidor.
  if (!has('const CONNECT_SENTENCE = `If Kineo is not connected, ask me to [connect Kineo](${CONNECT_URL}) using ${SERVER_URL} before continuing.`')) probs.push('frase de conexão ausente ou sem CONNECT_URL/SERVER_URL')
  if (!has('CLAUDE_NEW_CHAT + encodeURIComponent(`${prompt} ${CONNECT_SENTENCE}`)')) probs.push('pedido sem a frase de conexão ou sem encodeURIComponent')
  const prompts = [...code.matchAll(/prompt: '((?:[^'\\]|\\.)+)'/g)].map((m) => m[1])
  if (prompts.length < 4) probs.push(`menos de 4 pedidos (${prompts.length})`)
  for (const pr of prompts) {
    if (!/^Using the Kineo connector/.test(pr)) probs.push(`pedido sem "Using the Kineo connector": ${pr.slice(0, 40)}`)
    // O conector não gera mídia: o pedido pede roteiro/envio ao Studio ou fatos, nunca "gerar/renderizar o vídeo".
    if (/\b(generate|render|create|make)\b[^.]*\b(video|clip|film)\b/i.test(pr)) probs.push(`pedido promete gerar vídeo no Claude: ${pr.slice(0, 50)}`)
  }
  // Clipe de card = filme real da vitrine; selo diz "Sample made with Kineo" + motor.
  for (const m of code.matchAll(/clip: '([0-9a-f-]+)'/g)) {
    if (!fs.existsSync(path.join(ROOT, 'public/previews', m[1] + '.mp4'))) probs.push(`clipe inexistente: ${m[1]}`)
  }
  if (!has('Sample made with Kineo · {ENGINE_LABELS[pr.engine]}')) probs.push('clipe sem selo "Sample made with Kineo · <motor>"')
  const v = visible(code)
  const panelAt = v.indexOf('<ConnectPanel ')
  const tryAt = v.indexOf('Try it in Claude</h2>')
  const noteAt = v.search(/Claude uses Kineo only if the connector is added/)
  const btnAt = v.indexOf('Try in Claude ↗')
  if (panelAt < 0 || tryAt < panelAt) probs.push('grade "Try it in Claude" antes do painel de conexão')
  if (noteAt < 0 || btnAt < 0 || noteAt > btnAt) probs.push('aviso "só usa a Kineo se o conector estiver adicionado" ausente ou depois dos botões')
  const anchors = [...code.matchAll(/<a [^>]*?href=\{openInClaude\([^)]*\)\}[^>]*>/g)].map((m) => m[0])
  if (anchors.length < 1 || anchors.some((a) => !/target="_blank"/.test(a) || !/rel="noopener/.test(a))) probs.push('botões sem aba nova/noopener')
  // Painel: abre o modal certo em aba nova, e a aba ChatGPT é "em breve" (não existe app nosso lá).
  if (!/href=\{connectUrl\}\s+target="_blank"/.test(panelCode)) probs.push('"Connect" não abre o modal em aba nova')
  if (!panelCode.includes('<strong>Coming soon.</strong> A Kineo app for ChatGPT is not available yet.') || /chatgpt\.com\/(plugins|apps|g\/)/.test(panelCode)) probs.push('aba ChatGPT promete app que não existe')
  if (OVERCLAIM.test(visible(panelCode))) probs.push(`painel promete demais: ${visible(panelCode).match(OVERCLAIM)[0]}`)
  return probs
}
ok(tryProblems(page, panel).length === 0, `(7) /claude-connector: painel Connect + grade "Try in Claude" com frase de conexão, pedidos honestos, clipes reais, ChatGPT "em breve" (${tryProblems(page, panel).join('; ') || 'ok'})`)
ok(tryProblems(page.replace(/Claude uses Kineo only if the connector is added/, 'Claude uses Kineo'), panel).length > 0, '(M10) sem o aviso do conector → vermelho')
ok(tryProblems(page.replace('write a 35-second narrated YouTube Short from this one line', 'generate a 35-second video from this one line'), panel).length > 0, '(M11) pedido que promete gerar o vídeo no Claude → vermelho')
ok(tryProblems(page.replace('encodeURIComponent(`${prompt} ${CONNECT_SENTENCE}`)', 'encodeURIComponent(prompt)'), panel).length > 0, '(M12) pedido sem a frase de conexão → vermelho')
ok(tryProblems(page.replace("clip: '75728dfb-3b29-47fa-aea8-b806d549a2b9'", "clip: '00000000-dead-beef-0000-000000000000'"), panel).length > 0, '(M13) clipe que não existe na vitrine → vermelho')
ok(tryProblems(page, panel.replace('<strong>Coming soon.</strong> A Kineo app for ChatGPT is not available yet.', 'Open the Kineo app in ChatGPT: https://chatgpt.com/plugins/kineo')).length > 0, '(M14) aba ChatGPT prometendo app que não existe → vermelho')

// ─── mutantes ───────────────────────────────────────────────────────────────
ok(badgeProblems(pricing.replace('Works with Claude · add Kineo as a connector', 'Official Claude partner')).length > 0, '(M1) selo "Official Claude partner" → vermelho')
ok(badgeProblems(pricing.replace('Works with Claude · add Kineo as a connector', 'Works with Claude · now in the Claude directory')).length > 0, '(M2) selo que anuncia o diretório antes da aprovação → vermelho')
ok(badgeProblems(pricing.replace('Works with Claude · add', '<img src="/claude-logo.png" alt="" /> Works with Claude · add')).length > 0, '(M3) logo no selo → vermelho')
ok(badgeProblems(pricing.replace('target="_blank"\n', '')).length > 0, '(M4) selo que tira o comprador da página → vermelho')
ok(badgeProblems(pricing.replace(/<a\s+href="\/claude-connector[\s\S]*?<\/a>/, '')).length > 0, '(M5) selo removido → vermelho')
{
  const b = badgeOf(pricing)
  const semSelo = pricing.replace(b, '')
  const naIntro = semSelo.replace('<div className="pricing-intro', `${b}\n<div className="pricing-intro`)
  ok(badgeProblems(naIntro).length > 0, '(M9) selo de volta no topo escondido (antes de #plans) → vermelho')
}
ok(footerProblems(footer.replace("label: 'Use Kineo in Claude'", "label: 'Official Claude integration'")).length > 0, '(M6) rodapé "Official Claude integration" → vermelho')
{
  const m7 = page.replace('Try it in Claude</h2>', 'Try it from the Claude directory</h2>')
  ok(m7 !== page && OVERCLAIM.test(visible(m7)), '(M7) página que promete o diretório → vermelho (mutante aplicado)')
}
ok(badgeProblems(pricing.replace('Works with Claude · add Kineo as a connector', 'Works with Claude · approved by Anthropic')).length > 0, '(M8) "approved by Anthropic" no selo → vermelho (o "approved" legítimo da página não é)')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
