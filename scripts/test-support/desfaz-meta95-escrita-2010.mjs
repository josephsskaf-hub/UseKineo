// KINEO-META95-ESCRITA-2010 — DESFAZ, em memória, a legenda na escrita do roteiro (Whisper com o idioma da escrita nos pontos que
// transcrevem TTS, cache em outra escrita ignorado, rede final da legenda) e as reâncoras dos guardiões, para os guardiões que
// conferem arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste.
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-META95-ESCRITA-2010:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-meta95-escrita-2010-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF. A marca NÃO contém a de nenhuma camada de antes.
// ENCADEAMENTO: é a camada MAIS NOVA — semMeta95Personagem2010 (a cabeça que semMenuUgc2010 e as cadeias de antes chamam primeiro) chama ESTE
// primeiro. Este não importa ninguém.
// O guardião scripts/test-meta95-escrita-2010.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (META95_ESCRITA_2010_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_META95_ESCRITA_2010 = 'KINEO-META95-ESCRITA-2010'

/** A base da entrega: origin/main de 20/10 (KINEO-META95-PERSONAGEM-2010 sobre KINEO-MCP-STUDIO-2010), mesclada nesta entrega. */
export const META95_ESCRITA_2010_BASE = 'fbe47c4677d4af4cc231e41f2db542fbfd2ba476'

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_META95_ESCRITA_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-meta95-escrita-2010-trocas.json'), 'utf8'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_META95_ESCRITA_2010 = {
  'app/api/ads/render/route.ts': 1,
  'app/api/compose/route.ts': 4,
  'app/api/compose/unlock/route.ts': 3,
  'app/api/prewarm-voiceover/route.ts': 1,
  'lib/audioNoCliqueServer.ts': 1,
  'scripts/test-support/desfaz-meta95-personagem-2010.mjs': 2,
  // reâncoras dos guardiões que liam as linhas trocadas (ou a rota byte a byte contra uma base antiga)
  'scripts/test-ads-self-serve-2026-09-24.mjs': 0,
  'scripts/test-filmes-f1-virgula-1910.mjs': 1,
  'scripts/test-filmes-f1f3-ajuste-1910.mjs': 0,
  'scripts/test-filmes-f1f3-publico-2010.mjs': 1,
  'scripts/test-filmes-f1f4-1910.mjs': 0,
  'scripts/test-gancho-1q-2026-10-03.mjs': 1,
  'scripts/test-kling-duracao-2026-09-15.mjs': 0,
  'scripts/test-legenda-grafia-do-roteiro-2026-09-28.mjs': 0,
  'scripts/test-meta95-refazer-1910.mjs': 1,
  'scripts/test-seedance-15s-3x6-2026-09-29.mjs': 2,
  'scripts/test-voz-15s-mesma-da-montagem-2026-09-29.mjs': 2,
}
export const META95_ESCRITA_2010_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_META95_ESCRITA_2010))
/** Arquivos novos da entrega (não existiam na base). */
export const META95_ESCRITA_2010_NOVOS = [
  'lib/escritaDaLegenda.ts',
  'lib/whisperNaEscrita.ts',
  'scripts/test-meta95-escrita-2010.mjs',
  'scripts/test-support/desfaz-meta95-escrita-2010.mjs',
  'scripts/test-support/desfaz-meta95-escrita-2010-trocas.json',
  'scripts/test-support/meta95-escrita-2010.json',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semMeta95Escrita2010(texto, p) {
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_META95_ESCRITA_2010) || !META95_ESCRITA_2010_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_META95_ESCRITA_2010[rel] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_META95_ESCRITA_2010)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_META95_ESCRITA_2010[rel] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-meta95-escrita-2010: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-meta95-escrita-2010: ${rel} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** As linhas da BASE que esta entrega trocou de propósito no arquivo (para guardiões que só aceitam acréscimos sobre uma base antiga). */
export function linhasTrocadasMeta95Escrita2010(p) {
  return (TROCAS_META95_ESCRITA_2010[String(p ?? '').replace(/\\/g, '/')] ?? []).map(([, base]) => base)
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazMeta95Escrita2010(p, texto) {
  return semMeta95Escrita2010(texto, p)
}
