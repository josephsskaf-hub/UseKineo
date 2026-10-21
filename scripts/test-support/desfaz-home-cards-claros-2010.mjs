// KINEO-HOME-CARDS-CLAROS-2010 — DESFAZ, em memória, a entrega "a parte de baixo dos vídeos mais clara" nos 4 cards da home (fundador 20/10 23:30:
// KINEO-HOME-CARDS-CLAROS-2010 — "a parte de baixo dos vídeos tá bem escura, arruma isso pra hoje"): véu (.k3c-shade/.k3c-glass) mais leve em
// KINEO-HOME-CARDS-CLAROS-2010 — components/home/HomeThreeCards.tsx + sombra no título/linha, e as reâncoras dos guardiões da home.
// Para os guardiões que conferem arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-HOME-CARDS-CLAROS-2010:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-home-cards-claros-2010-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF. A marca NÃO contém a de nenhuma camada de antes.
// ENCADEAMENTO: é a camada MAIS NOVA — semBebeQueFala2010 (que a cabeça semMenuUgc2010 e as cadeias da home chamam primeiro) chama ESTE
// primeiro. Este não importa ninguém.
// O guardião scripts/test-home-cards-claros-2010.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (HOME_CARDS_CLAROS_2010_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semDesenhoNota9_2110 } from './desfaz-desenho-nota9-2110.mjs' // KINEO-DESENHO-NOTA9-2110 — o desenho infantil inteiro na tela clara (21/10) veio depois: sai PRIMEIRO (encadeado; texto sem a marca passa igual)

export const MARCA_HOME_CARDS_CLAROS_2010 = 'KINEO-HOME-CARDS-CLAROS-2010'

/** A base da entrega: origin/main de 20/10 noite (625a5f9dc, KINEO-BEBE-QUE-FALA-2010 reâncoras). */
export const HOME_CARDS_CLAROS_2010_BASE = '625a5f9dc'

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_HOME_CARDS_CLAROS_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-home-cards-claros-2010-trocas.json'), 'utf8'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_HOME_CARDS_CLAROS_2010 = {
  'components/home/HomeKidsCard.tsx': 0,
  'components/home/HomeThreeCards.tsx': 6,
  'scripts/test-bebe-que-fala-2010.mjs': 1,
  'scripts/test-mcp-studio-2010.mjs': 2,
  'scripts/test-mcp-studio-ajuste-2010.mjs': 3,
  'scripts/test-meta95-personagem-2010.mjs': 2,
  'scripts/test-support/desfaz-bebe-que-fala-2010.mjs': 2,
  'scripts/test-verbatim-intocavel-2010.mjs': 0,
}
export const HOME_CARDS_CLAROS_2010_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_HOME_CARDS_CLAROS_2010))
/** Arquivos novos da entrega (não existiam na base). */
export const HOME_CARDS_CLAROS_2010_NOVOS = [
  'scripts/test-home-cards-claros-2010.mjs',
  'scripts/test-support/desfaz-home-cards-claros-2010-trocas.json',
  'scripts/test-support/desfaz-home-cards-claros-2010.mjs',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semHomeCardsClaros2010(texto, p) {
  texto = semDesenhoNota9_2110(texto, p) // KINEO-DESENHO-NOTA9-2110 — a camada mais nova sai primeiro
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_HOME_CARDS_CLAROS_2010) || !HOME_CARDS_CLAROS_2010_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_HOME_CARDS_CLAROS_2010[rel] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_HOME_CARDS_CLAROS_2010)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_HOME_CARDS_CLAROS_2010[rel] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-home-cards-claros-2010: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-home-cards-claros-2010: ${rel} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazHomeCardsClaros2010(p, texto) {
  return semHomeCardsClaros2010(texto, p)
}
