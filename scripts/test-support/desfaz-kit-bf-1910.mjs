// KINEO-KIT-BF-1910 — DESFAZ, em memória, o KIT BLACK FRIDAY parte 1 no "Close do produto real" do Studio Ads (oferta opcional no gancho, no
// cartão e 1× na fala; lote de 1/3/5 variações com ângulos distintos pelo modo lote) nos arquivos que JÁ existiam, para os guardiões que conferem
// arquivos BYTE A BYTE contra uma base antiga ou executam o formato na régua da época. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-KIT-BF-1910:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-kit-bf-1910-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF.
// ENCADEAMENTO: é a camada MAIS NOVA do Studio Ads. semCloseRealLegendaCorte1910 (a cabeça da cadeia do Ads: produto na mão → ajustes → juiz →
// apresentador v2 → Close real → legenda → pílula → corte) chama esta PRIMEIRO; todo guardião que já desfazia essas camadas lê o texto de antes
// do kit sem ser editado. Os guardiões que liam o disco cru ganharam a reâncora (linha marcada, também desfeita aqui).
// O guardião scripts/test-kit-bf-1910.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (KIT_BF_1910_BASE).
import { semCompraAvulsa2410 } from './desfaz-compra-avulsa-2410.mjs' // KINEO-COMPRA-AVULSA-2410 — exact newer leaf before historical assertions.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semApresentadorOlhos1910 } from './desfaz-apresentador-olhos-1910.mjs' // KINEO-APRESENTADOR-OLHOS-1910 — os olhos abertos do apresentador v2 vieram depois: saem PRIMEIRO (encadeado; texto sem a marca passa igual)

export const MARCA_KIT_BF_1910 = 'KINEO-KIT-BF-1910'

/** A base da entrega (origin/main de 19/10: KINEO-META95-IDEIA-1910, 9ddb24c7e). */
export const KIT_BF_1910_BASE = '9ddb24c7e2cb4f9e0e5ef7f17a84ae2dddfd5b0a'

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_KIT_BF_1910 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-kit-bf-1910-trocas.json'), 'utf8'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_KIT_BF_1910 = TROCAS_KIT_BF_1910.__acrescimos
export const KIT_BF_1910_ARQUIVOS = Object.keys(ACRESCIMOS_KIT_BF_1910)
/** Arquivos novos da entrega. */
export const KIT_BF_1910_NOVOS = [
  'lib/ads/v2KitBf.ts',
  'lib/ads/v2KitBfMontage.ts',
  'lib/ads/v2KitBfServer.ts',
  'app/(dashboard)/ads/v2/AdsV2KitBf.tsx',
  'scripts/test-kit-bf-1910.mjs',
  'scripts/test-support/desfaz-kit-bf-1910.mjs',
  'scripts/test-support/desfaz-kit-bf-1910-trocas.json',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semKitBf1910(texto, p) {
  texto = semCompraAvulsa2410(texto, p) // KINEO-COMPRA-AVULSA-2410 — before every historical hash and early return.
  texto = semApresentadorOlhos1910(texto, p) // KINEO-APRESENTADOR-OLHOS-1910 — a camada mais nova sai primeiro
  if (typeof texto !== 'string' || !texto.includes(MARCA_KIT_BF_1910) || !KIT_BF_1910_ARQUIVOS.includes(p)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_KIT_BF_1910[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_KIT_BF_1910)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_KIT_BF_1910[p] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-kit-bf-1910: ${p} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazKitBf1910(p, texto) {
  return semKitBf1910(texto, p)
}
