// KINEO-HOME-REMODELA-2010 — DESFAZ, em memória, a home e o menu remodelados de 20/10 (8 clipes para todos, fileira PromoCards fora da home,
// "Images made by Kineo" com 10 fotos de anúncio, topo = 4 principais + "Claude & ChatGPT" + Trending + Pricing, "More tools" fora),
// para os guardiões que conferem arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste.
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-HOME-REMODELA-2010:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — linha nova que ocupa o lugar de UM BLOCO da base (uma ou mais linhas; o "More tools" saiu inteiro): reconhecida INTEIRA,
//     volta a ser o bloco da base. Tabela em desfaz-home-remodela-2010-trocas.json ([linha nova, bloco da base com \n]).
//   · lib/ui/refinementCopy.json não aceita comentário: lá a entrega é só acrescentar as 5 chaves de HOME_REMODELA_2010_CHAVES nas 16
//     línguas — o desfaz tira exatamente essas chaves (só se o valor for o desta entrega) e reescreve o JSON como o arquivo é escrito.
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF. A marca NÃO contém a de nenhuma camada de antes.
// ENCADEAMENTO: é a camada MAIS NOVA — semMenuUgc2010 (a cabeça da cadeia geral) chama ESTE primeiro. Este não importa ninguém.
// O guardião scripts/test-home-remodela-2010.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (HOME_REMODELA_2010_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semBebeQueFala2010 } from './desfaz-bebe-que-fala-2010.mjs' // KINEO-BEBE-QUE-FALA-2010 — a camada de 20/10 (mesclada depois) divide linhas de reâncora com esta: sai PRIMEIRO (texto sem a marca passa igual)

export const MARCA_HOME_REMODELA_2010 = 'KINEO-HOME-REMODELA-2010'

/** A base da entrega: a fila de 20/10 (entrega-atual = origin/main + KINEO-VERBATIM-INTOCAVEL-2010 + KINEO-MCP-STUDIO-AJUSTE-2010), mesclada nesta entrega. */
export const HOME_REMODELA_2010_BASE = 'e79cea9677c7e0071489b4cced7830217345cb5f'

/** [linha nova (inteira), bloco da base] por arquivo. */
export const TROCAS_HOME_REMODELA_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-home-remodela-2010-trocas.json'), 'utf8'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_HOME_REMODELA_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-home-remodela-2010-acrescimos.json'), 'utf8'))
export const HOME_REMODELA_2010_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_HOME_REMODELA_2010))

/** As 5 chaves de interface acrescentadas em lib/ui/refinementCopy.json (16 línguas). */
export const HOME_REMODELA_2010_CHAVES = ['Images made by Kineo', 'AI Cartoon Videos', 'Storm at sea', 'Glacier river', 'Surfer on a wave']
export const HOME_REMODELA_2010_JSON = 'lib/ui/refinementCopy.json'

/** Arquivos novos da entrega (não existiam na base). */
export const HOME_REMODELA_2010_NOVOS = [
  'lib/ui/homeRemodela2010.ts',
  'public/home-images/ad-01.webp', 'public/home-images/ad-02.webp', 'public/home-images/ad-03.webp', 'public/home-images/ad-04.webp',
  'public/home-images/ad-05.webp', 'public/home-images/ad-06.webp', 'public/home-images/ad-07.webp', 'public/home-images/ad-08.webp',
  'public/home-images/ad-09.webp', 'public/home-images/ad-10.webp', 'public/home-images/perfume-splash.webp',
  'scripts/test-home-remodela-2010.mjs',
  'scripts/test-support/desfaz-home-remodela-2010.mjs',
  'scripts/test-support/desfaz-home-remodela-2010-trocas.json',
  'scripts/test-support/desfaz-home-remodela-2010-acrescimos.json',
]

function semChavesJson(texto) {
  let j
  try { j = JSON.parse(texto) } catch { return texto }
  if (!j || typeof j !== 'object' || !j.en || !HOME_REMODELA_2010_CHAVES.some((k) => k in j.en)) return texto
  for (const lang of Object.keys(j)) for (const k of HOME_REMODELA_2010_CHAVES) delete j[lang][k]
  const out = JSON.stringify(j, null, 2) + '\n'
  return texto.includes('\r\n') ? out.replace(/\n/g, '\r\n') : out
}

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semHomeRemodela2010(texto, p) {
  texto = semBebeQueFala2010(texto, p) // KINEO-BEBE-QUE-FALA-2010 — a camada mais nova sai primeiro
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string') return texto
  if (rel === HOME_REMODELA_2010_JSON) return semChavesJson(texto)
  if (!texto.includes(MARCA_HOME_REMODELA_2010) || !HOME_REMODELA_2010_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_HOME_REMODELA_2010[rel] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_HOME_REMODELA_2010)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_HOME_REMODELA_2010[rel] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-home-remodela-2010: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== (TROCAS_HOME_REMODELA_2010[rel] ?? []).length) throw new Error(`desfaz-home-remodela-2010: ${rel} com ${trocadas} de ${(TROCAS_HOME_REMODELA_2010[rel] ?? []).length} troca(s) (remodelação pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** As linhas da BASE que a entrega reescreveu ou tirou no arquivo (para os guardiões que só toleram acréscimo + trocas declaradas). */
export function linhasTrocadasHomeRemodela2010(p) {
  return (TROCAS_HOME_REMODELA_2010[String(p ?? '').replace(/\\/g, '/')] ?? []).flatMap(([, base]) => base.split('\n'))
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazHomeRemodela2010(p, texto) {
  return semHomeRemodela2010(texto, p)
}
