// KINEO-KIDS-VENDA-2010 — DESFAZ, em memória, as 3 formas de venda do AI Kids Cartoon Stories (checkout do piloto/pack, intercepções do
// webhook, passe 3 do cron do Autopilot, admissão `kids_order` na rota do filme, cartões no /pricing e nas páginas, painel no
// /kids-cartoon) para os guardiões que conferem arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste.
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-KIDS-VENDA-2010:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-kids-venda-2010-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF. A marca NÃO contém a de nenhuma camada de antes.
// ENCADEAMENTO: é a camada MAIS NOVA — semAdsCenaAjuste2110 chama ESTE primeiro; semBebeQueFala2010 também chama antes da cadeia antiga. Este não importa ninguém.
// O guardião scripts/test-kids-venda-2010.mjs prova que, retirada somente a venda, cada arquivo é EXATAMENTE a origin/main 72d23210c.
import { semCompraAvulsa2410 } from './desfaz-compra-avulsa-2410.mjs' // KINEO-COMPRA-AVULSA-2410 — exact newer leaf before historical assertions.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semAdsCena952110 } from './desfaz-ads-cena-95-2110.mjs' // KINEO-ADS-CENA-95-2110 — a camada posterior sai antes da contagem exata da venda.
import { semCartoonTracao2210 } from './desfaz-cartoon-tracao-2210.mjs' // KINEO-CARTOON-TRACAO-2210

export const MARCA_KIDS_VENDA_2010 = 'KINEO-KIDS-VENDA-2010'

/** A base da entrega: origin/main de 21/10, incluindo a tela clara e o som do desenho, antes de ligar a venda. */
export const KIDS_VENDA_2010_BASE = '72d23210c'
/** Compatibilidade com guardiões anteriores: agora a main mesclada e a base exata são a mesma ponta 72d23210c. */
export const KIDS_VENDA_2010_MERGED_MAIN = '72d23210c'

const TABELA = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-kids-venda-2010-trocas.json'), 'utf8'))
/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_KIDS_VENDA_2010 = Object.fromEntries(Object.entries(TABELA).filter(([k]) => k !== '__acrescimos'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_KIDS_VENDA_2010 = TABELA.__acrescimos
export const KIDS_VENDA_2010_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_KIDS_VENDA_2010))
/** Arquivos novos da entrega (não existiam na base). */
export const KIDS_VENDA_2010_NOVOS = [
  'app/api/kids-venda/sample/route.ts',
  'app/api/kids-venda/status/route.ts',
  'components/kidsCartoon/KidsVendaCards.tsx',
  'components/kidsCartoon/KidsVendaPanel.tsx',
  'lib/kidsVenda/cron.ts',
  'lib/kidsVenda/kidsVenda.ts',
  'lib/kidsVenda/server.ts',
  'lib/kidsVenda/webhook.ts',
  'lib/stripe/kidsVendaCheckout.ts',
  'migrations_pending/2026-10-20_kids_venda.sql',
  'docs/KIDS-VENDA-LIGA-2026-10-21.md',
  'docs/previews/kids-venda-liga-2110.html',
  'docs/previews/kids-venda-liga-2110.png',
  'docs/previews/kids-venda-liga-2110-mobile.png',
  'scripts/test-kids-venda-2010.mjs',
  'scripts/test-support/desfaz-kids-venda-2010.mjs',
  'scripts/test-support/desfaz-kids-venda-2010-trocas.json',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semKidsVenda2010(texto, p) {
  texto = semCartoonTracao2210(semCompraAvulsa2410(texto, p), p) // KINEO-CARTOON-TRACAO-2210 — preserve every earlier exact guardian.
  texto = semAdsCena952110(texto, p) // KINEO-ADS-CENA-95-2110 — preserva Kids ao tirar95; depois tira a venda pela tabela original.
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_KIDS_VENDA_2010) || !KIDS_VENDA_2010_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_KIDS_VENDA_2010[rel] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_KIDS_VENDA_2010)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_KIDS_VENDA_2010[rel] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-kids-venda-2010: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-kids-venda-2010: ${rel} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazKidsVenda2010(p, texto) {
  return semKidsVenda2010(texto, p)
}
