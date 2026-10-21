// KINEO-PAGINAS-CONECTOR-2110 — camada mais nova: tira só esta entrega, em memória.
// A cabeça anterior a chama PRIMEIRO. Não importa camadas antigas nem toca disco.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_PAGINAS_CONECTOR_2110 = 'KINEO-PAGINAS-CONECTOR-2110'
export const PAGINAS_CONECTOR_2110_BASE = 'f53733122fbdd8393a9950444ab70e0695c3c9f1'
const dir = dirname(fileURLToPath(import.meta.url))
export const TROCAS_PAGINAS_CONECTOR_2110 = JSON.parse(readFileSync(join(dir, 'desfaz-paginas-conector-2110-trocas.json'), 'utf8'))
export const ACRESCIMOS_PAGINAS_CONECTOR_2110 = JSON.parse(readFileSync(join(dir, 'desfaz-paginas-conector-2110-acrescimos.json'), 'utf8'))
export const PAGINAS_CONECTOR_2110_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_PAGINAS_CONECTOR_2110))
export const PAGINAS_CONECTOR_2110_NOVOS = [
  'app/make-ai-videos-in-chatgpt/page.tsx',
  'app/criar-videos-com-ia-no-chatgpt/page.tsx',
  'app/make-ai-videos-in-claude/page.tsx',
  'app/criar-videos-com-ia-no-claude/page.tsx',
  'components/ConnectorGuidePage.tsx',
  'lib/seo/connectorGuides.ts',
  'docs/preview-paginas-conector-2110.html',
  'scripts/test-paginas-conector-2110.mjs',
  'scripts/test-support/connector-guide-fixture.mjs',
  'scripts/test-support/desfaz-paginas-conector-2110.mjs',
  'scripts/test-support/desfaz-paginas-conector-2110-trocas.json',
  'scripts/test-support/desfaz-paginas-conector-2110-acrescimos.json',
]

export function semPaginasConector2110(texto, p) {
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !PAGINAS_CONECTOR_2110_ARQUIVOS.includes(rel) || !texto.includes(MARCA_PAGINAS_CONECTOR_2110)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map(TROCAS_PAGINAS_CONECTOR_2110[rel] ?? [])
  const fora = []
  let tiradas = 0, trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_PAGINAS_CONECTOR_2110)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  if (tiradas !== ACRESCIMOS_PAGINAS_CONECTOR_2110[rel] || trocadas !== trocas.size) throw new Error(`desfaz-paginas-conector-2110: ${rel}: acréscimos ${tiradas}/${ACRESCIMOS_PAGINAS_CONECTOR_2110[rel]}, trocas ${trocadas}/${trocas.size}`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

export function desfazPaginasConector2110(p, texto) {
  return semPaginasConector2110(texto, p)
}
