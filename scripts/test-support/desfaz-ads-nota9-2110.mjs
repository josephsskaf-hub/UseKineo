// KINEO-ADS-NOTA9-2110 — DESFAZ, em memória, a entrega "Studio Ads nota 9" (fundador 21/10: "3 ajustes… experiência do cliente no mínimo em 9"):
// KINEO-ADS-NOTA9-2110 — a tela FOCO dos cards da home (?entry=ugc | ?entry=product) em app/(dashboard)/ads/v2/AdsV2Simple.tsx e AdsV2Client.tsx, a
// KINEO-ADS-NOTA9-2110 — faixa de uma linha do Kit Black Friday (components/ads/KitBfBuyCard.tsx, prop slim) e o encadeamento no desfaz anterior.
// Para os guardiões que conferem arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-ADS-NOTA9-2110:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-ads-nota9-2110-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF. A marca NÃO contém a de nenhuma camada de antes.
// ENCADEAMENTO: é a camada MAIS NOVA — semDesenhoNota9_2110 (que semHomeCardsClaros2010, semBebeQueFala2010 e a cabeça semMenuUgc2010 chamam primeiro) chama ESTE
// primeiro. Este não importa ninguém.
// O guardião scripts/test-ads-nota9-2110.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (ADS_NOTA9_2110_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semMeta95PersonagemAjuste2010 } from './desfaz-meta95-personagem-ajuste-2010.mjs' // KINEO-META95-PERSONAGEM-AJUSTE-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — os consertos da folha (integrados 21/10, depois do Studio Ads nota 9) são a camada MAIS NOVA: saem PRIMEIRO (texto sem a marca deles passa igual)

export const MARCA_ADS_NOTA9_2110 = 'KINEO-ADS-NOTA9-2110'

/** A base da entrega: origin/main de 21/10 (dbd50f95a, KINEO-HOME-CARDS-CLAROS-2010 reâncoras depois do desenho nota 9). */
export const ADS_NOTA9_2110_BASE = 'dbd50f95a'

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_ADS_NOTA9_2110 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-nota9-2110-trocas.json'), 'utf8'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_ADS_NOTA9_2110 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-nota9-2110-trocas.json'), 'utf8')).__acrescimos
export const ADS_NOTA9_2110_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_ADS_NOTA9_2110))
/** Arquivos novos da entrega (não existiam na base). */
export const ADS_NOTA9_2110_NOVOS = [
  'components/ads/AdsNota9.tsx',
  'lib/ads/v2Nota9.ts',
  'scripts/test-ads-nota9-2110.mjs',
  'scripts/test-support/desfaz-ads-nota9-2110-trocas.json',
  'scripts/test-support/desfaz-ads-nota9-2110.mjs',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semAdsNota92110(texto, p) {
  texto = semMeta95PersonagemAjuste2010(texto, p) // KINEO-META95-PERSONAGEM-AJUSTE-2010 — a camada mais nova sai primeiro (encadeado: semDesenhoNota9_2110 → semAdsNota92110 → o ajuste da folha)
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_ADS_NOTA9_2110) || !ADS_NOTA9_2110_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_ADS_NOTA9_2110[rel] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_ADS_NOTA9_2110)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_ADS_NOTA9_2110[rel] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-ads-nota9-2110: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-ads-nota9-2110: ${rel} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazAdsNota92110(p, texto) {
  return semAdsNota92110(texto, p)
}
