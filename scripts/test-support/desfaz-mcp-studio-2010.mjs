// KINEO-MCP-STUDIO-2010 — DESFAZ, em memória, o conector "Kineo Studio" nos DOIS arquivos que já existiam e foram tocados
// (app/claude-connector/page.tsx: import + <StudioSection />; lib/claudeConnect.ts: a URL e a âncora do conector), para os
// guardiões que conferem arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste.
//
// Uma forma só: ACRÉSCIMO — toda linha nova carrega a marca KINEO-MCP-STUDIO-2010 e sai inteira (contagem EXATA por arquivo).
// Não há TROCA: nenhuma linha da base foi reescrita. Só age nos arquivos declarados; o resto passa igual (idempotente). Preserva CRLF.
// CAMADA DISJUNTA: nenhuma camada da cadeia atual (menu-ugc → ugc-ajustes → paginas-ugc → kit-bf-venda → …) toca estes dois
// arquivos, e esta não toca nenhum arquivo delas — por isso não entra na cadeia nem importa ninguém. O guardião
// scripts/test-mcp-studio-2010.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (MCP_STUDIO_2010_BASE).

export const MARCA_MCP_STUDIO_2010 = 'KINEO-MCP-STUDIO-2010'

/** A base da entrega: origin/main de 20/10 (KINEO-MENU-UGC-2010). */
export const MCP_STUDIO_2010_BASE = 'b7662b717a0d8513d9c59cc2527c7fd834a49f56'

/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados. */
export const ACRESCIMOS_MCP_STUDIO_2010 = {
  'app/claude-connector/page.tsx': 2,
  'lib/claudeConnect.ts': 3,
}
export const MCP_STUDIO_2010_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_MCP_STUDIO_2010))

/** Arquivos novos da entrega (não existiam na base). */
export const MCP_STUDIO_2010_NOVOS = [
  'lib/mcp/studioLaunch.ts',
  'lib/mcp/studioOauth.ts',
  'lib/mcp/studioOauthStore.ts',
  'lib/mcp/studioMcp.ts',
  'lib/mcp/studioSession.ts',
  'lib/mcp/studioTools.ts',
  'app/api/mcp/studio/route.ts',
  'app/api/mcp/studio/oauth/authorize/route.ts',
  'app/api/mcp/studio/oauth/token/route.ts',
  'app/api/mcp/studio/oauth/register/route.ts',
  'app/api/mcp/studio/oauth/revoke/route.ts',
  'app/.well-known/oauth-authorization-server/route.ts',
  'app/.well-known/oauth-protected-resource/route.ts',
  'app/.well-known/oauth-protected-resource/api/mcp/studio/route.ts',
  'app/claude-connector/StudioSection.tsx',
  'supabase/migrations/20261020150000_mcp_studio_oauth.sql',
  'docs/MCP-STUDIO-2026-10-20.md',
  'scripts/test-mcp-studio-2010.mjs',
  'scripts/test-support/desfaz-mcp-studio-2010.mjs',
]

/** O texto do arquivo sem a entrega. Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semMcpStudio2010(texto, p) {
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_MCP_STUDIO_2010) || !MCP_STUDIO_2010_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const fora = []
  let tiradas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (linha.includes(MARCA_MCP_STUDIO_2010)) { tiradas++; continue }
    fora.push(linha)
  }
  const esperadas = ACRESCIMOS_MCP_STUDIO_2010[rel] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-mcp-studio-2010: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazMcpStudio2010(p, texto) {
  return semMcpStudio2010(texto, p)
}
