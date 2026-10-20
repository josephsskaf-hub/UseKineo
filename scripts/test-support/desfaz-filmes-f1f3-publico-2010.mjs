// KINEO-FILMES-F1F3-PUBLICO-2010 [TRAVA 8.2 — vai do fundador 20/10 "nota 10"] — DESFAZ, em memória, a virada das fases F1 (legenda) e F3 (som)
// KINEO-FILMES-F1F3-PUBLICO-2010 — do "Faceless 15 s" para TODOS (FACELESS15_PUBLIC f1:true, f3:true em lib/filmes/faceless15.ts; f2/f4/cta seguem só
// KINEO-FILMES-F1F3-PUBLICO-2010 — por pedido interno) e os guardiões dos filmes reancorados no estado novo. Para os guardiões que conferem arquivos BYTE A
// KINEO-FILMES-F1F3-PUBLICO-2010 — BYTE contra uma base antiga ou executam o módulo da época (interruptor desligado). Módulo auxiliar; não é teste.
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-FILMES-F1F3-PUBLICO-2010:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-filmes-f1f3-publico-2010-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual. A marca NÃO contém a de nenhuma camada de antes. Preserva CRLF.
// ENCADEAMENTO: é a camada MAIS NOVA — semHomeCardsBotoes2010 (chamada primeiro por semApresentadorOlhos1910 e semHome3Cards1910, as cabeças das
// cadeias) chama esta antes de tudo. O guardião scripts/test-filmes-f1f3-publico-2010.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semUgcAjustes2010 } from './desfaz-ugc-ajustes-2010.mjs' // KINEO-UGC-AJUSTES-2010 — os ajustes do UGC (20/10) vieram depois: saem PRIMEIRO (encadeado; texto sem a marca passa igual)

export const MARCA_FILMES_F1F3_PUBLICO_2010 = 'KINEO-FILMES-F1F3-PUBLICO-2010'

/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_FILMES_F1F3_PUBLICO_2010 = {
  'lib/filmes/faceless15.ts': 0,
  'scripts/test-filmes-f1f4-1910.mjs': 11,
  'scripts/test-filmes-f1-virgula-1910.mjs': 1,
  'scripts/test-filmes-f1f3-ajuste-1910.mjs': 0,
  'scripts/test-support/desfaz-home-cards-botoes-2010.mjs': 2,
}
export const FILMES_F1F3_PUBLICO_2010_ARQUIVOS = Object.keys(ACRESCIMOS_FILMES_F1F3_PUBLICO_2010)
/** Arquivos novos da entrega. */
export const FILMES_F1F3_PUBLICO_2010_NOVOS = [
  'scripts/test-filmes-f1f3-publico-2010.mjs',
  'scripts/test-support/desfaz-filmes-f1f3-publico-2010.mjs',
  'scripts/test-support/desfaz-filmes-f1f3-publico-2010-trocas.json',
]

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_FILMES_F1F3_PUBLICO_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-filmes-f1f3-publico-2010-trocas.json'), 'utf8'))

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semFilmesF1F3Publico2010(texto, p) {
  texto = semUgcAjustes2010(texto, p) // KINEO-UGC-AJUSTES-2010 — a camada mais nova sai primeiro
  if (typeof texto !== 'string' || !texto.includes(MARCA_FILMES_F1F3_PUBLICO_2010) || !FILMES_F1F3_PUBLICO_2010_ARQUIVOS.includes(p)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_FILMES_F1F3_PUBLICO_2010[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_FILMES_F1F3_PUBLICO_2010)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_FILMES_F1F3_PUBLICO_2010[p] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-filmes-f1f3-publico-2010: ${p} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-filmes-f1f3-publico-2010: ${p} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazFilmesF1F3Publico2010(p, texto) {
  return semFilmesF1F3Publico2010(texto, p)
}

/** O diff (-U0) de UM arquivo é SÓ desta entrega? (arquivo novo dela, ou tem bloco e toda linha nova de todo bloco traz a marca). Diff vazio = false. */
export function diffSoFilmesF1F3Publico2010(diff, arquivo) {
  if (FILMES_F1F3_PUBLICO_2010_NOVOS.includes(arquivo)) return true
  if (typeof diff !== 'string' || !diff) return false
  const blocos = []
  for (const l of diff.replace(/\r\n/g, '\n').split('\n')) {
    if (l.startsWith('@@')) blocos.push([])
    else if (blocos.length && l.startsWith('+') && !l.startsWith('+++')) blocos[blocos.length - 1].push(l.slice(1))
  }
  return blocos.length > 0 && blocos.every((b) => b.length > 0 && b.every((l) => l.includes(MARCA_FILMES_F1F3_PUBLICO_2010)))
}
