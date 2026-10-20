// KINEO-KIT-BF-VENDA-2010 — DESFAZ, em memória, o KIT BLACK FRIDAY À VENDA (checkout ?pack=kit_bf, concessão no Path A do webhook, cartão no
// Studio Ads e no /pricing) e a OFERTA ANTECIPADA DO ANUAL (2 meses grátis até 21/11; o maior desconto, sem somar) nos arquivos que JÁ existiam,
// para os guardiões que conferem arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-KIT-BF-VENDA-2010:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-kit-bf-venda-2010-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF.
// ENCADEAMENTO: é a camada MAIS NOVA. Os desfaz que já existiam e leem os mesmos arquivos chamam ESTE primeiro (linha marcada neles, também
// desfeita aqui); os guardiões que liam o disco cru ganharam a reâncora (linha marcada, também desfeita aqui).
// O guardião scripts/test-kit-bf-venda-2010.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (KIT_BF_VENDA_2010_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_KIT_BF_VENDA_2010 = 'KINEO-KIT-BF-VENDA-2010'

/** A base da entrega (a ponta da fila entrega-atual de 20/10: KINEO-HOME-CARDS-BOTOES-2010, 87251eba9, sobre origin/main 9e5f60a19). */
export const KIT_BF_VENDA_2010_BASE = '87251eba98fec13a8662659a55606d444402a386'

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_KIT_BF_VENDA_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-kit-bf-venda-2010-trocas.json'), 'utf8'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_KIT_BF_VENDA_2010 = TROCAS_KIT_BF_VENDA_2010.__acrescimos
export const KIT_BF_VENDA_2010_ARQUIVOS = Object.keys(ACRESCIMOS_KIT_BF_VENDA_2010)
/** Arquivos novos da entrega. */
export const KIT_BF_VENDA_2010_NOVOS = [
  'lib/ads/kitBfSale.ts',
  'lib/billing/annualEarlyOffer.ts',
  'lib/stripe/kitBfCheckout.ts',
  'app/api/offers/black-friday/route.ts',
  'components/ads/KitBfBuyCard.tsx',
  'scripts/test-kit-bf-venda-2010.mjs',
  'scripts/test-support/desfaz-kit-bf-venda-2010.mjs',
  'scripts/test-support/desfaz-kit-bf-venda-2010-trocas.json',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semKitBfVenda2010(texto, p) {
  if (typeof texto !== 'string' || !texto.includes(MARCA_KIT_BF_VENDA_2010) || !KIT_BF_VENDA_2010_ARQUIVOS.includes(p)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_KIT_BF_VENDA_2010[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_KIT_BF_VENDA_2010)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_KIT_BF_VENDA_2010[p] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-kit-bf-venda-2010: ${p} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazKitBfVenda2010(p, texto) {
  return semKitBfVenda2010(texto, p)
}
