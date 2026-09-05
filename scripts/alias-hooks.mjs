// KINEO-ALIAS-LOADER-2026-09-05 — o gancho em si (roda na thread de loader).
// Traduz `@/x/y` para o arquivo real na raiz do repo, tentando as extensoes
// que o projeto usa. Nao inventa modulo: se nenhuma existir, devolve o
// especificador original e o Node reporta o erro de sempre.
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)))
const EXTENSOES = ['', '.ts', '.tsx', '.mts', '.js', '.mjs', '/index.ts', '/index.tsx', '/index.js']

// KINEO-MARCADOR-DA-CASA-2026-09-05 — o gancho so traduzia `@/`, e por isso
// `lib/momentumTopic.ts` continuava inalcancavel para teste: ele importa
// `./resumeStrip` SEM extensao, que o ESM do Node nao resolve. Resolver tambem
// o relativo extensionless e aditivo: a busca so acontece quando o caminho
// pedido NAO existe como esta, entao nada que hoje resolve muda de destino.
function tentarExtensoes(base) {
  for (const ext of EXTENSOES) {
    const candidato = base + ext
    if (existsSync(candidato)) return candidato
  }
  return null
}

export async function resolve(especificador, contexto, proximo) {
  if (especificador.startsWith('@/')) {
    const achado = tentarExtensoes(join(RAIZ, especificador.slice(2)))
    if (achado) return { url: pathToFileURL(achado).href, shortCircuit: true }
  } else if (
    (especificador.startsWith('./') || especificador.startsWith('../')) &&
    contexto.parentURL?.startsWith('file:')
  ) {
    const base = join(dirname(fileURLToPath(contexto.parentURL)), especificador)
    // Se ja existe do jeito que veio, e trabalho do resolvedor de sempre.
    if (!existsSync(base)) {
      const achado = tentarExtensoes(base)
      if (achado) return { url: pathToFileURL(achado).href, shortCircuit: true }
    }
  }
  return proximo(especificador, contexto)
}
