// KINEO-MCP-DESENHO-2110 — desfaz em memória a camada cartoon do conector Kineo Studio.
// Mais nova: chamada ANTES de qualquer camada anterior; não importa outro desfaz (sem ciclos).
// Produto: arquivo inteiro da base. Guardiões/cadeia: acréscimos exatos e trocas da tabela JSON.
// Fora do alvo/sem marca é idempotente. CRLF preservado. Contagem divergente lança: nunca base falsa.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_MCP_DESENHO_2110 = 'KINEO-MCP-DESENHO-2110'
export const MCP_DESENHO_2110_BASE = 'f53733122fbdd8393a9950444ab70e0695c3c9f1'
export const MCP_DESENHO_2110_INTEIROS = Object.freeze(['lib/mcp/studioMcp.ts', 'lib/mcp/studioTools.ts'])
export const ACRESCIMOS_MCP_DESENHO_2110 = {
  "scripts/test-avatar-preso-2010.mjs": 3,
  "scripts/test-bebe-que-fala-2010.mjs": 2,
  "scripts/test-home-cards-claros-2010.mjs": 2,
  "scripts/test-mcp-studio-2010.mjs": 3,
  "scripts/test-mcp-studio-ajuste-2010.mjs": 3,
  "scripts/test-menu-ugc-2010.mjs": 2,
  "scripts/test-meta95-escrita-2010.mjs": 2,
  "scripts/test-meta95-personagem-2010.mjs": 2,
  "scripts/test-support/desfaz-home-cards-claros-2010.mjs": 2,
  "scripts/test-support/desfaz-mcp-studio-ajuste-2010.mjs": 2
}
export const TROCAS_MCP_DESENHO_2110 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-mcp-desenho-2110-trocas.json'), 'utf8'))
export const MCP_DESENHO_2110_ARQUIVOS = Object.freeze([...MCP_DESENHO_2110_INTEIROS, ...Object.keys(ACRESCIMOS_MCP_DESENHO_2110)])
export const MCP_DESENHO_2110_NOVOS = Object.freeze([
  'scripts/test-mcp-desenho-2110.mjs',
  'scripts/test-support/desfaz-mcp-desenho-2110.mjs',
  'scripts/test-support/desfaz-mcp-desenho-2110-trocas.json',
])
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const cache = new Map()
function baseOf(rel) {
  if (!cache.has(rel)) cache.set(rel, execFileSync('git', ['-C', ROOT, 'show', `${MCP_DESENHO_2110_BASE}:${rel}`], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n'))
  return cache.get(rel)
}
export function semMcpDesenho2110(texto, p) {
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_MCP_DESENHO_2110) || !MCP_DESENHO_2110_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  let out
  if (MCP_DESENHO_2110_INTEIROS.includes(rel)) out = baseOf(rel)
  else {
    const trocas = new Map(TROCAS_MCP_DESENHO_2110[rel] ?? [])
    const keep = []
    let added = 0, replaced = 0
    for (const line of texto.replace(/\r\n/g, '\n').split('\n')) {
      if (!line.includes(MARCA_MCP_DESENHO_2110)) keep.push(line)
      else if (trocas.has(line)) { keep.push(trocas.get(line)); replaced++ }
      else added++
    }
    if (added !== ACRESCIMOS_MCP_DESENHO_2110[rel] || replaced !== trocas.size) throw new Error(`desfaz-mcp-desenho-2110: ${rel}: ${added} acréscimos/${replaced} trocas; esperava ${ACRESCIMOS_MCP_DESENHO_2110[rel]}/${trocas.size}`)
    out = keep.join('\n')
  }
  return crlf ? out.replace(/\n/g, '\r\n') : out
}
export function desfazMcpDesenho2110(p, texto) { return semMcpDesenho2110(texto, p) }
