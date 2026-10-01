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
  // REANCORADO 30/09 (KINEO-CLAUDE-1CLIQUE): o link leva direto ao painel (#connect), com a origem (?src=footer).
  const m = code.match(/\{ href: '\/claude-connector\?src=footer#connect', label: '([^']+)' \}/)
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

// ─── KINEO-OPEN-IN-CLAUDE + KINEO-CLAUDE-CONNECTOR-V2 + KINEO-CLAUDE-1CLIQUE (30/09) ───
// REANCORADO 30/09 (KINEO-CLAUDE-1CLIQUE, brief do fundador): os destinos do Claude saíram da página para a fonte
// única lib/claudeConnect.ts (card da home, painel e página usam os mesmos); o "Connect" virou "copiar + abrir"
// (lib/claudeConnectClient.ts) e o "Try in Claude" virou ClaudePromptLink (mede o clique).
const panel = read('app/claude-connector/ConnectPanel.tsx')
const connectLib = read('lib/claudeConnect.ts')
const connectClient = read('lib/claudeConnectClient.ts')
const promptLink = read('app/claude-connector/ClaudePromptLink.tsx')
const promoComp = read('components/PromoCards.tsx')
const promoData = read('lib/ui/promoCards.ts')

/** Problemas da fonte única de destinos. */
function libProblems(lib) {
  const probs = []
  const has = (s) => lib.includes(s)
  if (!has("export const CLAUDE_MCP_SERVER_URL = 'https://www.usekineo.com/api/mcp'")) probs.push('URL do servidor ≠ https://www.usekineo.com/api/mcp')
  if (!has("export const CLAUDE_ADD_CONNECTOR_URL = 'https://claude.ai/customize/connectors?modal=add-custom-connector'")) probs.push('modal de conector ≠ claude.ai/customize/connectors?modal=add-custom-connector')
  if (!has("export const CLAUDE_NEW_CHAT_URL = 'https://claude.ai/new?q='")) probs.push('chat novo ≠ claude.ai/new?q=')
  // O truque da Higgsfield: todo pedido termina guiando quem ainda não conectou — com a URL do NOSSO servidor.
  if (!has('export const CLAUDE_CONNECT_SENTENCE = `If Kineo is not connected, ask me to [connect Kineo](${CLAUDE_ADD_CONNECTOR_URL}) using ${CLAUDE_MCP_SERVER_URL} before continuing.`')) probs.push('frase de conexão ausente ou sem as URLs da fonte')
  if (!has('return CLAUDE_NEW_CHAT_URL + encodeURIComponent(`${prompt} ${CLAUDE_CONNECT_SENTENCE}`)')) probs.push('pedido sem a frase de conexão ou sem encodeURIComponent')
  if (/^import /m.test(lib)) probs.push('lib/claudeConnect.ts deixou de ser pura (import)')
  if (/window\.|navigator\.|document\./.test(lib.replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, ''))) probs.push('lib/claudeConnect.ts toca window/navigator/document')
  return probs
}

/** O pedido de cada card e o do botão "Start in Claude": roteiro + envio ao Studio (ou fatos), nunca "gerar vídeo no Claude". */
function promptProblems(prompts) {
  const probs = []
  for (const pr of prompts) {
    if (!/^Using the Kineo connector/.test(pr)) probs.push(`pedido sem "Using the Kineo connector": ${pr.slice(0, 40)}`)
    if (/\b(generate|render|create|make)\b[^.]*\b(video|clip|film)\b/i.test(pr)) probs.push(`pedido promete gerar vídeo no Claude: ${pr.slice(0, 50)}`)
  }
  return probs
}

/** Problemas da grade "Try in Claude" e da página. */
function tryProblems(code, panelCode) {
  const probs = []
  const has = (s) => code.includes(s)
  if (!has("from '@/lib/claudeConnect'") || !has('const SERVER_URL = CLAUDE_MCP_SERVER_URL')) probs.push('página não lê os destinos da fonte única')
  if (/claude\.ai\//.test(code.replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, ''))) probs.push('URL do claude.ai digitada na página (fora da fonte única)')
  const prompts = [...code.matchAll(/prompt: '((?:[^'\\]|\\.)+)'/g)].map((m) => m[1])
  if (prompts.length < 4) probs.push(`menos de 4 pedidos (${prompts.length})`)
  probs.push(...promptProblems(prompts))
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
  if (!/<ClaudePromptLink href=\{claudePromptHref\(pr\.prompt\)\} preset=\{pr\.id\}/.test(code)) probs.push('"Try in Claude" fora do ClaudePromptLink (sem medição) ou sem a frase de conexão')
  if (!/target="_blank"/.test(promptLink) || !/rel="noopener/.test(promptLink)) probs.push('"Try in Claude" sem aba nova/noopener')
  // Aba ChatGPT "em breve" (não existe app nosso lá).
  if (!panelCode.includes('<strong>Coming soon.</strong> A Kineo app for ChatGPT is not available yet.') || /chatgpt\.com\/(plugins|apps|g\/)/.test(panelCode)) probs.push('aba ChatGPT promete app que não existe')
  if (OVERCLAIM.test(visible(panelCode))) probs.push(`painel promete demais: ${visible(panelCode).match(OVERCLAIM)[0]}`)
  return probs
}

/** Brief do fundador (30/09): "1 clique + colar" — o que o card, o painel e o gesto têm de fazer. */
function oneClickProblems({ panelCode, clientCode, compCode, dataCode, pageCode }) {
  const probs = []
  // O gesto: a cópia COMEÇA antes da aba nova (mesmo tique do clique) e o resultado só é aguardado depois.
  const copyAt = clientCode.indexOf('navigator.clipboard?.writeText(CLAUDE_MCP_SERVER_URL)')
  const openAt = clientCode.indexOf("window.open(CLAUDE_ADD_CONNECTOR_URL, '_blank', 'noopener')")
  const awaitAt = clientCode.indexOf('await copying')
  if (copyAt < 0 || openAt < 0 || awaitAt < 0) probs.push('gesto sem cópia da URL, sem abrir o modal em aba nova, ou sem conferir a cópia')
  else if (!(copyAt < openAt && openAt < awaitAt)) probs.push('ordem do gesto errada (copiar → abrir → conferir): fora do gesto o navegador bloqueia')
  // Qualquer await ANTES da aba nova tira o window.open do gesto do usuário (pop-up bloqueado).
  const fnStart = clientCode.indexOf('export async function copyUrlAndOpenClaude')
  if (fnStart < 0 || openAt < 0 || /\bawait\b/.test(clientCode.slice(fnStart, openAt))) probs.push('await antes de abrir a aba nova (fora do gesto: pop-up bloqueado)')
  // Card da home: ação no dado, desvio no clique, celular não abre o claude.ai.
  if (!/id: 'claude',\n\s+href: CLAUDE_CARD_HREF,\n\s+action: 'claude_connect',/.test(dataCode)) probs.push("card do Claude sem action 'claude_connect'")
  if (!compCode.includes("if (card.action === 'claude_connect') connectFromCard(e, (href) => router.push(href))")) probs.push('clique do card não chama connectFromCard')
  const fn = (compCode.match(/function connectFromCard[\s\S]*?\n\}\n/) || [''])[0]
  if (!/if \(e\.metaKey \|\| e\.ctrlKey \|\| e\.shiftKey \|\| e\.altKey \|\| e\.button !== 0\) return/.test(fn)) probs.push('card sequestra Ctrl/⌘-clique (abrir em nova aba)')
  const mobileAt = fn.indexOf('if (isMobileClient(window.innerWidth, navigator.userAgent)) {')
  const mobileGo = fn.indexOf("go(claudeConnectorHref('home_card'))")
  const openCall = fn.indexOf('copyUrlAndOpenClaude({ open: true })')
  if (mobileAt < 0 || mobileGo < mobileAt || openCall < 0 || openCall < mobileGo) probs.push('celular abre o claude.ai (modal de conector no app móvel não confirmado)')
  if (!fn.includes("go(claudeConnectorHref('home_card', copied))")) probs.push('depois do clique o card não leva à página com ?copied=')
  // Painel: âncora, botão "copiar + abrir", estado "copiado" com Continue → Add → Connect, os 3 passos FORA de <details>.
  if (!panelCode.includes('id={CLAUDE_CONNECT_ANCHOR}')) probs.push('painel sem id="connect"')
  if (!panelCode.includes("{mobile ? 'Copy URL' : 'Copy URL & open Claude →'}") || !panelCode.includes('await copyUrlAndOpenClaude({ open: !mobile })')) probs.push('botão principal não é "Copy URL & open Claude →" (ou abre o claude.ai no celular)')
  if (!panelCode.includes('✓ URL copied. In Claude: type Kineo as the name, paste the URL (Ctrl+V / ⌘V), click Continue → Add → Connect.')) probs.push('estado "URL copied" sem os 3 cliques do Claude')
  if (!/sp\.get\('copied'\) === '1'/.test(panelCode)) probs.push('chegada com ?copied=1 não mostra o estado "copiado"')
  const steps = (panelCode.match(/<ol[\s\S]*?<\/ol>/) || [''])[0]
  if (!/Continue/.test(steps) || !/<strong>Add<\/strong>/.test(steps) || !/<strong>Connect<\/strong>/.test(steps)) probs.push('os 3 passos não citam Continue / Add / Connect')
  if (/<details[\s\S]*?<ol/.test(panelCode.slice(0, panelCode.indexOf("tab === 'claude_code'")))) probs.push('os 3 passos escondidos num <details>')
  if (!panelCode.includes('<CopyField value={serverUrl}')) probs.push('sem o campo Copy de reserva')
  // reancorado 30/09 (KINEO-MCP-PAGINA): o botão virou o primário do 3º cartão ("Connect and start"), depois do
  // Add → Connect — ali o "Already connected?" não faz sentido. Continua exigido: o texto "Start in Claude →" DENTRO do
  // cartão 3 da aba Claude e o pedido pronto (startHref = claudePromptHref(CLAUDE_START_PROMPT)) vindo da página.
  const card3 = (panelCode.match(/<StepCard n=\{3\} title="Connect and start">[\s\S]*?<\/StepCard>/) || [''])[0]
  if (!card3.includes('Start in Claude →') || !card3.includes('href={startHref}') || !pageCode.includes('startHref={claudePromptHref(CLAUDE_START_PROMPT)}')) probs.push('sem "Start in Claude →" com o pedido pronto no cartão 3')
  // Aviso do celular: sem a inferência "works on your phone too" (não confirmada).
  if (!panelCode.includes('Add the connector from Claude on the web or desktop.') || /phone/i.test(visible(panelCode))) probs.push('aviso do celular ausente ou com promessa não confirmada ("phone")')
  // Nada de afirmar plano do Claude.
  if (/\b(Pro|Max|Team|Enterprise|Free) plan\b/.test(visible(pageCode) + visible(panelCode))) probs.push('página afirma em qual plano do Claude o conector funciona (não verificado)')
  return probs
}

const libP = libProblems(connectLib)
ok(libP.length === 0, `(7a) lib/claudeConnect.ts: fonte única pura das URLs do Claude + frase de conexão (${libP.join('; ') || 'ok'})`)
const startPrompt = (connectLib.match(/export const CLAUDE_START_PROMPT = '([^']+)'/) || [, ''])[1]
ok(startPrompt && promptProblems([startPrompt]).length === 0, `(7b) pedido do "Start in Claude" honesto (${startPrompt.slice(0, 50)})`)
ok(tryProblems(page, panel).length === 0, `(7) /claude-connector: grade "Try in Claude" medida, pedidos honestos, clipes reais, ChatGPT "em breve" (${tryProblems(page, panel).join('; ') || 'ok'})`)
const oneClick = { panelCode: panel, clientCode: connectClient, compCode: promoComp, dataCode: promoData, pageCode: page }
ok(oneClickProblems(oneClick).length === 0, `(8) 1 clique + colar: card copia e abre o modal (não no celular), painel com estado "copiado" e os 3 cliques (${oneClickProblems(oneClick).join('; ') || 'ok'})`)
ok(tryProblems(page.replace(/Claude uses Kineo only if the connector is added/, 'Claude uses Kineo'), panel).length > 0, '(M10) sem o aviso do conector → vermelho')
ok(tryProblems(page.replace('write a 35-second narrated YouTube Short from this one line', 'generate a 35-second video from this one line'), panel).length > 0, '(M11) pedido que promete gerar o vídeo no Claude → vermelho')
{
  const m12 = connectLib.replace('encodeURIComponent(`${prompt} ${CLAUDE_CONNECT_SENTENCE}`)', 'encodeURIComponent(prompt)')
  ok(m12 !== connectLib && libProblems(m12).length > 0, '(M12) pedido sem a frase de conexão → vermelho')
}
ok(tryProblems(page.replace("clip: '75728dfb-3b29-47fa-aea8-b806d549a2b9'", "clip: '00000000-dead-beef-0000-000000000000'"), panel).length > 0, '(M13) clipe que não existe na vitrine → vermelho')
ok(tryProblems(page, panel.replace('<strong>Coming soon.</strong> A Kineo app for ChatGPT is not available yet.', 'Open the Kineo app in ChatGPT: https://chatgpt.com/plugins/kineo')).length > 0, '(M14) aba ChatGPT prometendo app que não existe → vermelho')
const mut = (patch) => oneClickProblems({ ...oneClick, ...patch }).length > 0
ok(mut({ clientCode: connectClient.replace("window.open(CLAUDE_ADD_CONNECTOR_URL, '_blank', 'noopener')", '') }), '(M15) gesto que não abre o modal → vermelho')
{
  // Aguardar a cópia ANTES de abrir a aba perde o gesto: o navegador bloqueia o pop-up.
  const lento = connectClient.replace('copying = navigator.clipboard?.writeText(CLAUDE_MCP_SERVER_URL) ?? null', 'copying = null')
    .replace("window.open(CLAUDE_ADD_CONNECTOR_URL, '_blank', 'noopener')", "void 0; await Promise.resolve(); navigator.clipboard?.writeText(CLAUDE_MCP_SERVER_URL); window.open(CLAUDE_ADD_CONNECTOR_URL, '_blank', 'noopener')")
  ok(mut({ clientCode: lento }), '(M16) cópia depois da aba (fora do gesto) → vermelho')
}
ok(mut({ compCode: promoComp.replace("  if (isMobileClient(window.innerWidth, navigator.userAgent)) {\n    go(claudeConnectorHref('home_card'))\n    return\n  }\n", '') }), '(M17) celular abrindo o claude.ai → vermelho')
ok(mut({ panelCode: panel.replace('click Continue → Add → Connect.', 'click Continue.') }), '(M18) estado "copiado" sem o Add → Connect → vermelho')
ok(mut({ panelCode: panel.replace('Add the connector from Claude on the web or desktop.', 'Add the connector from Claude on the web or desktop; it then works on your phone too.') }), '(M19) aviso do celular com "works on your phone" não confirmado → vermelho')
ok(mut({ dataCode: promoData.replace("    action: 'claude_connect',\n", '') }), '(M20b) card do Claude sem a ação de conectar → vermelho')
ok(mut({ compCode: promoComp.replace('if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return', '') }), '(M21) card sequestrando Ctrl/⌘-clique → vermelho')
// reancorado 30/09 (KINEO-MCP-PAGINA): mutante da âncora nova — cartão 3 sem o "Start in Claude →".
ok(mut({ panelCode: panel.replace('                  Start in Claude →\n', '') }), '(M22) cartão 3 sem "Start in Claude →" → vermelho')

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
