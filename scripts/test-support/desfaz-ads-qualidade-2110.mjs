// KINEO-ADS-QUALIDADE-2110 — DESFAZ, em memória, a entrega "Studio Ads com qualidade de anúncio" (fundador 21/10: "não tá natural… a pessoa encostando
// KINEO-ADS-QUALIDADE-2110 — na mulher um produto… o outro tá só o braço do relógio" — nota 7 no UGC, 4 no Product Ads): a pose natural do apresentador e a
// KINEO-ADS-QUALIDADE-2110 — leitura dela na escolha, a atuação viva, o punch-in e o gancho do produto, o cartão final v3, o roteiro sem frase genérica e
// KINEO-ADS-QUALIDADE-2110 — com todo benefício digitado, e a tela (aviso de pessoas só com pessoa, entrada nova da home, foto pequena < 500 px, foto de estilo de vida).
// Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-ADS-QUALIDADE-2110:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-ads-qualidade-2110-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF. A marca NÃO contém a de nenhuma camada de antes.
// ENCADEAMENTO: é a camada MAIS NOVA — semAdsBola2110 (que semDesenhoSom2110 e as cadeias da home e do Ads chamam primeiro) chama ESTE primeiro.
// Este não importa ninguém. O guardião scripts/test-ads-qualidade-2110.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_ADS_QUALIDADE_2110 = 'KINEO-ADS-QUALIDADE-2110'

/** A base da entrega: o anúncio da bola mesclado com a origin/main 9165cc6ab (5bb2a69d4). */
export const ADS_QUALIDADE_2110_BASE = '5bb2a69d4'

const TABELA = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-qualidade-2110-trocas.json'), 'utf8'))
/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_ADS_QUALIDADE_2110 = Object.fromEntries(Object.entries(TABELA).filter(([k]) => k !== '__acrescimos'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados. */
export const ACRESCIMOS_ADS_QUALIDADE_2110 = TABELA.__acrescimos
export const ADS_QUALIDADE_2110_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_ADS_QUALIDADE_2110))
/** Arquivos novos da entrega (não existiam na base). */
export const ADS_QUALIDADE_2110_NOVOS = [
  'docs/ADS-QUALIDADE-2026-10-21.md',
  'lib/ads/v2AdsQualidade.ts',
  'lib/ads/v2LifestylePhoto.ts',
  'scripts/test-ads-qualidade-2110.mjs',
  'scripts/test-support/desfaz-ads-qualidade-2110-trocas.json',
  'scripts/test-support/desfaz-ads-qualidade-2110.mjs',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semAdsQualidade2110(texto, p) {
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_ADS_QUALIDADE_2110) || !ADS_QUALIDADE_2110_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_ADS_QUALIDADE_2110[rel] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_ADS_QUALIDADE_2110)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_ADS_QUALIDADE_2110[rel] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-ads-qualidade-2110: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-ads-qualidade-2110: ${rel} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazAdsQualidade2110(p, texto) {
  return semAdsQualidade2110(texto, p)
}
