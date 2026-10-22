// KINEO-MCP-STUDIO-AJUSTE-2010 — DESFAZ, em memória, o ajuste do conector "Kineo Studio" (título na biblioteca, reconexão da
// geração presa, cópia neutra Claude/ChatGPT, passos do ChatGPT e a /claude-connector clara com a vitrine de 9), para os
// guardiões que conferem arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste.
//
// Duas formas:
//   · ARQUIVO INTEIRO — os arquivos de produto e os 2 guardiões da página que só esta entrega mexe (o redesenho reescreve
//     dezenas de linhas; contar linha a linha seria frágil): carregando a marca, voltam a ser, inteiros, o texto deles na base
//     (MCP_STUDIO_AJUSTE_2010_BASE, via `git show`).
//   · LINHA A LINHA — os guardiões/desfaz que OUTRAS camadas também reancoraram (test-mcp-studio-2010, test-avatar-preso-2010,
//     desfaz-verbatim-intocavel-2010): toda linha tocada leva a marca; ACRÉSCIMO sai inteiro (contagem EXATA), TROCA volta a ser
//     a linha da base (tabela em desfaz-mcp-studio-ajuste-2010-trocas.json). Assim as camadas de antes continuam vendo as
//     linhas delas, na ordem que quiserem.
// Fora da lista ou sem a marca = devolve igual (idempotente). Preserva CRLF. Contagem errada = erro (nunca base falsa).
// ENCADEAMENTO: é a camada MAIS NOVA — semVerbatimIntocavel2010 / semVerbatimIntocavel2010NaCadeia (a camada de antes, que
// semAvatarPreso2010 chama primeiro) chamam ESTE primeiro. Este não importa nenhuma camada.
// O guardião scripts/test-mcp-studio-ajuste-2010.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semBebeQueFala2010 } from './desfaz-bebe-que-fala-2010.mjs' // KINEO-BEBE-QUE-FALA-2010 — a camada de 20/10 (mesclada depois) divide linhas de reâncora com esta: sai PRIMEIRO (texto sem a marca passa igual)

export const MARCA_MCP_STUDIO_AJUSTE_2010 = 'KINEO-MCP-STUDIO-AJUSTE-2010'

/** A base da entrega: a fila de 20/10 (entrega-atual b023609fd = origin/main 9d4d0ffc1 + o conserto do verbatim). */
export const MCP_STUDIO_AJUSTE_2010_BASE = 'b023609fdc2fac86dc1276ec4704ae4ae98b2cda'

/** Arquivos inteiros (produto + guardiões da página que só esta entrega mexe). */
export const MCP_STUDIO_AJUSTE_2010_INTEIROS = Object.freeze([
  'lib/mcp/studioTools.ts',
  'lib/mcp/studioOauth.ts',
  'app/api/mcp/studio/oauth/authorize/route.ts',
  'app/claude-connector/StudioSection.tsx',
  'app/claude-connector/ConnectPanel.tsx',
  'app/claude-connector/palette.ts',
  'app/claude-connector/page.tsx',
  'scripts/test-mcp-pagina-2026-09-30.mjs',
  'scripts/test-works-with-claude-2026-09-30.mjs',
])
/** Linha a linha: contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_MCP_STUDIO_AJUSTE_2010 = {
  'scripts/test-mcp-studio-2010.mjs': 3,
  'scripts/test-avatar-preso-2010.mjs': 1,
  'scripts/test-support/desfaz-verbatim-intocavel-2010.mjs': 3,
  'scripts/test-meta95-personagem-2010.mjs': 1,
  'scripts/test-verbatim-intocavel-2010.mjs': 0,
}
export const TROCAS_MCP_STUDIO_AJUSTE_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-mcp-studio-ajuste-2010-trocas.json'), 'utf8'))

/** Todos os arquivos que já existiam e a entrega altera (cada um carrega a marca). */
export const MCP_STUDIO_AJUSTE_2010_ARQUIVOS = Object.freeze([...MCP_STUDIO_AJUSTE_2010_INTEIROS, ...Object.keys(ACRESCIMOS_MCP_STUDIO_AJUSTE_2010)])

/** Arquivos novos da entrega (não existiam na base). */
export const MCP_STUDIO_AJUSTE_2010_NOVOS = Object.freeze([
  'app/claude-connector/ShowcaseGrid.tsx',
  'docs/MCP-STUDIO-AJUSTE-2026-10-20.md',
  'scripts/test-mcp-studio-ajuste-2010.mjs',
  'scripts/test-support/desfaz-mcp-studio-ajuste-2010.mjs',
  'scripts/test-support/desfaz-mcp-studio-ajuste-2010-trocas.json',
])

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const cache = new Map()
function baseOf(rel) {
  if (!cache.has(rel)) {
    cache.set(rel, execFileSync('git', ['-C', ROOT, 'show', `${MCP_STUDIO_AJUSTE_2010_BASE}:${rel}`], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n'))
  }
  return cache.get(rel)
}

/** O texto do arquivo sem a entrega. Fora da lista ou sem a marca = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semMcpStudioAjuste2010(texto, p) {
  texto = semBebeQueFala2010(texto, p) // KINEO-BEBE-QUE-FALA-2010 — a camada mais nova sai primeiro
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_MCP_STUDIO_AJUSTE_2010) || !MCP_STUDIO_AJUSTE_2010_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  let out
  if (MCP_STUDIO_AJUSTE_2010_INTEIROS.includes(rel)) {
    out = baseOf(rel)
  } else {
    const trocas = new Map((TROCAS_MCP_STUDIO_AJUSTE_2010[rel] ?? []).map(([nova, base]) => [nova, base]))
    const fora = []
    let tiradas = 0
    let trocadas = 0
    for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
      if (!linha.includes(MARCA_MCP_STUDIO_AJUSTE_2010)) { fora.push(linha); continue }
      if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
      tiradas++
    }
    const esperadas = ACRESCIMOS_MCP_STUDIO_AJUSTE_2010[rel] ?? 0
    if (tiradas !== esperadas) throw new Error(`desfaz-mcp-studio-ajuste-2010: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
    if (trocadas !== trocas.size) throw new Error(`desfaz-mcp-studio-ajuste-2010: ${rel} com ${trocadas} de ${trocas.size} troca(s)`)
    out = fora.join('\n')
  }
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazMcpStudioAjuste2010(p, texto) {
  return semMcpStudioAjuste2010(texto, p)
}
