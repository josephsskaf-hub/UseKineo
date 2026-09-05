// KINEO-ALIAS-LOADER-2026-09-05 — o gancho em si (roda na thread de loader).
// Traduz `@/x/y` para o arquivo real na raiz do repo, tentando as extensoes
// que o projeto usa. Nao inventa modulo: se nenhuma existir, devolve o
// especificador original e o Node reporta o erro de sempre.
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)))
const EXTENSOES = ['', '.ts', '.tsx', '.mts', '.js', '.mjs', '/index.ts', '/index.tsx', '/index.js']

export async function resolve(especificador, contexto, proximo) {
  if (especificador.startsWith('@/')) {
    const relativo = especificador.slice(2)
    for (const ext of EXTENSOES) {
      const candidato = join(RAIZ, relativo + ext)
      if (existsSync(candidato)) {
        return { url: pathToFileURL(candidato).href, shortCircuit: true }
      }
    }
  }
  return proximo(especificador, contexto)
}
