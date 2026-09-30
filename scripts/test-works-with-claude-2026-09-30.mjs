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
ok(OVERCLAIM.test(visible(page.replace('Add it to Claude</h2>', 'Add it from the Claude directory</h2>'))), '(M7) página que promete o diretório → vermelho')
ok(badgeProblems(pricing.replace('Works with Claude · add Kineo as a connector', 'Works with Claude · approved by Anthropic')).length > 0, '(M8) "approved by Anthropic" no selo → vermelho (o "approved" legítimo da página não é)')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
