// KINEO-AVATAR-PRESO-2010 [TRAVA 8.2 — vai do fundador 20/10 "vai pra tudo"] — DESFAZ, em memória, o conserto do avatar preso (o compose
// monta o avatar/apresentador pré-pago pelo custo do NASCIMENTO; a conferência do /api/compose/status aceita o claim de montagem velho),
// para os guardiões que conferem arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste.
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-AVATAR-PRESO-2010:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-avatar-preso-2010-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF. A marca NÃO contém a de nenhuma camada de antes.
// ENCADEAMENTO: é a camada MAIS NOVA do /api/compose — semMeta95Refazer1910 (desfaz-meta95-refazer-1910.mjs, que semFilmesF1F4_1910 chama
// primeiro) chama ESTE primeiro. Este não importa ninguém.
// O guardião scripts/test-avatar-preso-2010.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (AVATAR_PRESO_2010_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_AVATAR_PRESO_2010 = 'KINEO-AVATAR-PRESO-2010'

/** A base da entrega: origin/main de 20/10 (KINEO-MENU-UGC-2010). */
export const AVATAR_PRESO_2010_BASE = 'b7662b717a0d8513d9c59cc2527c7fd834a49f56'

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_AVATAR_PRESO_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-avatar-preso-2010-trocas.json'), 'utf8'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_AVATAR_PRESO_2010 = {
  'app/api/compose/route.ts': 4,
  'lib/avatar/reservation.ts': 14,
  'scripts/test-support/desfaz-meta95-refazer-1910.mjs': 2,
  'scripts/test-seedance-15s-3x6-2026-09-29.mjs': 1,
  'scripts/test-voz-15s-mesma-da-montagem-2026-09-29.mjs': 1,
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

/** As linhas da BASE que a entrega reescreveu no arquivo (para os guardiões que só toleram acréscimo + trocas declaradas). */
export function linhasTrocadasAvatarPreso2010(p) {
  return (TROCAS_AVATAR_PRESO_2010[String(p ?? '').replace(/\\/g, '/')] ?? []).map(([, base]) => base)
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazAvatarPreso2010(p, texto) {
  return semAvatarPreso2010(texto, p)
}
