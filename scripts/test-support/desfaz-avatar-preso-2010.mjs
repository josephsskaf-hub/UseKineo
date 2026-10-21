// KINEO-AVATAR-PRESO-2010 [TRAVA 8.2 — vai do fundador 20/10 "vai pra tudo"] — DESFAZ, em memória, o conserto do avatar preso (o compose
// monta o avatar/apresentador pré-pago pelo custo do NASCIMENTO; a conferência do /api/compose/status aceita o claim de montagem velho),
// para os guardiões que conferem arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste.
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-AVATAR-PRESO-2010:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-avatar-preso-2010-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF. A marca NÃO contém a de nenhuma camada de antes.
// ENCADEAMENTO: é a camada MAIS NOVA — semMeta95Refazer1910 (a cabeça da cadeia do /api/compose, que semFilmesF1F4_1910 chama primeiro) chama
// ESTE primeiro; semMenuUgc2010 (a cabeça da cadeia geral) chama semAvatarPreso2010NosGuardioes (só as reâncoras em scripts/). Este não importa ninguém.
// O guardião scripts/test-avatar-preso-2010.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (AVATAR_PRESO_2010_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semVerbatimIntocavel2010NaCadeia } from './desfaz-verbatim-intocavel-2010.mjs' // KINEO-VERBATIM-INTOCAVEL-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — a camada mais nova (20/10, depois do avatar preso): as reâncoras dela nos guardiões saem primeiro

export const MARCA_AVATAR_PRESO_2010 = 'KINEO-AVATAR-PRESO-2010'

/** A base da entrega: a fila de 20/10 depois dos merges (legenda na escrita do roteiro sobre a folha de personagem + conector, sobre o menu UGC). */
export const AVATAR_PRESO_2010_BASE = '02c69b8c05f25bd03e9282a4fadab2d0fe8bc82d'

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_AVATAR_PRESO_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-avatar-preso-2010-trocas.json'), 'utf8'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_AVATAR_PRESO_2010 = {
  'app/api/compose/route.ts': 4,
  'lib/avatar/reservation.ts': 14,
  'scripts/test-support/desfaz-meta95-refazer-1910.mjs': 2,
  'scripts/test-seedance-15s-3x6-2026-09-29.mjs': 1,
  'scripts/test-voz-15s-mesma-da-montagem-2026-09-29.mjs': 1,
  'scripts/test-support/desfaz-menu-ugc-2010.mjs': 2,
  'scripts/test-support/desfaz-meta95-escrita-2010.mjs': 2,
  'scripts/test-meta95-escrita-2010.mjs': 1,
  'scripts/test-filmes-f1f3-ajuste-1910.mjs': 1,
  'scripts/test-filmes-f1-virgula-1910.mjs': 1,
  'scripts/test-mcp-studio-2010.mjs': 3,
  'scripts/test-meta95-personagem-2010.mjs': 2,
}
export const AVATAR_PRESO_2010_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_AVATAR_PRESO_2010))
/** Arquivos novos da entrega (não existiam na base). */
export const AVATAR_PRESO_2010_NOVOS = [
  'docs/AVATAR-PRESO-2026-10-20.md',
  'scripts/test-avatar-preso-2010.mjs',
  'scripts/test-support/desfaz-avatar-preso-2010.mjs',
  'scripts/test-support/desfaz-avatar-preso-2010-trocas.json',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semAvatarPreso2010(texto, p) {
  texto = semVerbatimIntocavel2010NaCadeia(texto, p) // KINEO-VERBATIM-INTOCAVEL-2010 — encadeado: a camada mais nova sai primeiro (só as reâncoras dela em scripts/; o lib/growth/entradaSeedance15.ts tem desfaz próprio)
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_AVATAR_PRESO_2010) || !AVATAR_PRESO_2010_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_AVATAR_PRESO_2010[rel] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_AVATAR_PRESO_2010)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_AVATAR_PRESO_2010[rel] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-avatar-preso-2010: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-avatar-preso-2010: ${rel} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Só as reâncoras dos guardiões (arquivos em scripts/): é o que a cabeça da cadeia geral (semMenuUgc2010) chama. O /api/compose e a
 * reservation.ts saem só pela cadeia do /api/compose (semMeta95Refazer1910) — a cadeia geral os lê como "a última versão alheia". */
export function semAvatarPreso2010NosGuardioes(texto, p) {
  return String(p ?? '').replace(/\\/g, '/').startsWith('scripts/') ? semAvatarPreso2010(texto, p) : texto
}

/** As linhas da BASE que a entrega reescreveu no arquivo (para os guardiões que só toleram acréscimo + trocas declaradas). */
export function linhasTrocadasAvatarPreso2010(p) {
  return (TROCAS_AVATAR_PRESO_2010[String(p ?? '').replace(/\\/g, '/')] ?? []).map(([, base]) => base)
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazAvatarPreso2010(p, texto) {
  return semAvatarPreso2010(texto, p)
}
