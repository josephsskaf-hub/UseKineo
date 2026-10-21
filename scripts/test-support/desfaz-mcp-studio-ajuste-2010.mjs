// KINEO-MCP-STUDIO-AJUSTE-2010 — DESFAZ, em memória, o ajuste do conector "Kineo Studio" (título na biblioteca, reconexão da
// geração presa, cópia neutra Claude/ChatGPT, passos do ChatGPT e a /claude-connector clara com a vitrine de 9), para os
// guardiões que conferem arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste.
//
// Forma: ARQUIVO INTEIRO — o redesenho da página reescreve dezenas de linhas, e contar acréscimo/troca linha a linha seria
// frágil. Um arquivo declarado que CARREGA a marca volta a ser, inteiro, o texto dele na base da entrega
// (MCP_STUDIO_AJUSTE_2010_BASE, via `git show`), preservando CRLF. Sem a marca, ou fora da lista, passa igual (idempotente).
// Toda linha que esta entrega acrescenta nos guardiões alheios (reâncoras) também leva a marca — então qualquer guardião
// que leia esses arquivos depois de desfeito vê exatamente a base.
// ENCADEAMENTO: é a camada MAIS NOVA — semAvatarPreso2010 (desfaz-avatar-preso-2010.mjs, a camada de antes, chamada pela
// cabeça da cadeia geral semMenuUgc2010, pela do /api/compose semMeta95Refazer1910 e por semMeta95Escrita2010) chama ESTE
// primeiro. Este não importa nenhuma camada. O guardião scripts/test-mcp-studio-ajuste-2010.mjs prova o resto.
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_MCP_STUDIO_AJUSTE_2010 = 'KINEO-MCP-STUDIO-AJUSTE-2010'

/** A base da entrega: origin/main de 20/10 (KINEO-AVATAR-PRESO-2010, 9d4d0ffc1). */
export const MCP_STUDIO_AJUSTE_2010_BASE = '9d4d0ffc1f71a34f9e4f56a05c55631908b925fc'

/** Arquivos que já existiam e a entrega altera (cada um carrega a marca). */
export const MCP_STUDIO_AJUSTE_2010_ARQUIVOS = Object.freeze([
  'lib/mcp/studioTools.ts',
  'lib/mcp/studioOauth.ts',
  'app/api/mcp/studio/oauth/authorize/route.ts',
  'app/claude-connector/StudioSection.tsx',
  'app/claude-connector/ConnectPanel.tsx',
  'app/claude-connector/palette.ts',
  'app/claude-connector/page.tsx',
  'scripts/test-mcp-studio-2010.mjs',
  'scripts/test-mcp-pagina-2026-09-30.mjs',
  'scripts/test-works-with-claude-2026-09-30.mjs',
  'scripts/test-support/desfaz-avatar-preso-2010.mjs',
  'scripts/test-avatar-preso-2010.mjs',
])

/** Arquivos novos da entrega (não existiam na base). */
export const MCP_STUDIO_AJUSTE_2010_NOVOS = Object.freeze([
  'app/claude-connector/ShowcaseGrid.tsx',
  'docs/MCP-STUDIO-AJUSTE-2026-10-20.md',
  'scripts/test-mcp-studio-ajuste-2010.mjs',
  'scripts/test-support/desfaz-mcp-studio-ajuste-2010.mjs',
])

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const cache = new Map()
function baseOf(rel) {
  if (!cache.has(rel)) {
    cache.set(rel, execFileSync('git', ['-C', ROOT, 'show', `${MCP_STUDIO_AJUSTE_2010_BASE}:${rel}`], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n'))
  }
  return cache.get(rel)
}

/** O texto do arquivo sem a entrega. Fora da lista ou sem a marca = devolve igual. Preserva CRLF. */
export function semMcpStudioAjuste2010(texto, p) {
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_MCP_STUDIO_AJUSTE_2010) || !MCP_STUDIO_AJUSTE_2010_ARQUIVOS.includes(rel)) return texto
  const out = baseOf(rel)
  return texto.includes('\r\n') ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazMcpStudioAjuste2010(p, texto) {
  return semMcpStudioAjuste2010(texto, p)
}
