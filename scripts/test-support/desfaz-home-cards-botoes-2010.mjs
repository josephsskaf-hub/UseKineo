// KINEO-HOME-CARDS-BOTOES-2010 — DESFAZ, em memória, a entrega "um botão diferente por card de anúncio" da home (fundador 20/10: "o botão do UGC e do
// KINEO-HOME-CARDS-BOTOES-2010 — Product ficou parecido"): homeCardAdsCta em lib/ui/homeThreeCards.ts (16 línguas, "grátis" só com a amostra no ar), o
// KINEO-HOME-CARDS-BOTOES-2010 — componente HomeThreeCards usando-o, a grade dos 3 cards 5% menor no computador e o guardião dos 3 cards reancorado.
// Para os guardiões que conferem arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-HOME-CARDS-BOTOES-2010:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-home-cards-botoes-2010-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual. A marca NÃO contém a de nenhuma camada de antes. Preserva CRLF.
// ENCADEAMENTO: é a camada MAIS NOVA — semApresentadorOlhos1910 (a cabeça da cadeia do Close real) e semHome3Cards1910 chamam esta PRIMEIRO.
// O guardião scripts/test-home-cards-botoes-2010.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (HOME_CARDS_BOTOES_2010_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_HOME_CARDS_BOTOES_2010 = 'KINEO-HOME-CARDS-BOTOES-2010'

/** A base da entrega (origin/main de 20/10 depois dos olhos abertos do apresentador: 9e5f60a19). */
export const HOME_CARDS_BOTOES_2010_BASE = '9e5f60a19'

/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_HOME_CARDS_BOTOES_2010 = {
  'components/home/HomeThreeCards.tsx': 2,
  'lib/ui/homeThreeCards.ts': 27,
  'scripts/test-home-3-cards-1910.mjs': 0,
  'scripts/test-apresentador-olhos-1910.mjs': 2,
  'scripts/test-support/desfaz-apresentador-olhos-1910.mjs': 2,
  'scripts/test-support/desfaz-home-3-cards-1910.mjs': 2,
}
export const HOME_CARDS_BOTOES_2010_ARQUIVOS = Object.keys(ACRESCIMOS_HOME_CARDS_BOTOES_2010)
/** Arquivos novos da entrega. */
export const HOME_CARDS_BOTOES_2010_NOVOS = [
  'scripts/test-home-cards-botoes-2010.mjs',
  'scripts/test-support/desfaz-home-cards-botoes-2010.mjs',
  'scripts/test-support/desfaz-home-cards-botoes-2010-trocas.json',
]

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_HOME_CARDS_BOTOES_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-home-cards-botoes-2010-trocas.json'), 'utf8'))

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semHomeCardsBotoes2010(texto, p) {
  if (typeof texto !== 'string' || !texto.includes(MARCA_HOME_CARDS_BOTOES_2010) || !HOME_CARDS_BOTOES_2010_ARQUIVOS.includes(p)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_HOME_CARDS_BOTOES_2010[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_HOME_CARDS_BOTOES_2010)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_HOME_CARDS_BOTOES_2010[p] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-home-cards-botoes-2010: ${p} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-home-cards-botoes-2010: ${p} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazHomeCardsBotoes2010(p, texto) {
  return semHomeCardsBotoes2010(texto, p)
}

/** O diff (-U0) de UM arquivo é SÓ desta entrega? (arquivo novo dela, ou tem bloco e toda linha nova de todo bloco traz a marca). Diff vazio = false. */
export function diffSoHomeCardsBotoes2010(diff, arquivo) {
  if (HOME_CARDS_BOTOES_2010_NOVOS.includes(arquivo)) return true
  if (typeof diff !== 'string' || !diff) return false
  const blocos = []
  for (const l of diff.replace(/\r\n/g, '\n').split('\n')) {
    if (l.startsWith('@@')) blocos.push([])
    else if (blocos.length && l.startsWith('+') && !l.startsWith('+++')) blocos[blocos.length - 1].push(l.slice(1))
  }
  return blocos.length > 0 && blocos.every((b) => b.length > 0 && b.every((l) => l.includes(MARCA_HOME_CARDS_BOTOES_2010)))
}
