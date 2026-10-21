// KINEO-ADS-BOLA-2110 — DESFAZ, em memória, a entrega "o anúncio da bola" (fundador 21/10: "o ads que eu tentei está horrível, descobre porquê";
// KINEO-ADS-BOLA-2110 — docs/ADS-BOLA-DIAGNOSTICO-2026-10-21.md, pedido 618a6680): o nome do negócio sem travessão solto, o texto-instrução, a foto
// KINEO-ADS-BOLA-2110 — inteira do produto no apresentador v2, a régua pela voz medida + a voz curta corrigida, a medição das fotos reais — nos
// KINEO-ADS-BOLA-2110 — arquivos que guardiões de camadas antigas conferem BYTE A BYTE contra uma base antiga.
// Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-ADS-BOLA-2110:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-ads-bola-2110-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF. A marca NÃO contém a de nenhuma camada de antes.
// ENCADEAMENTO: é a camada MAIS NOVA — semDesenhoNota9_2110 (que semHomeCardsClaros2010, semBebeQueFala2010, a cabeça semMenuUgc2010 e as cadeias
// da home e do Ads chamam primeiro) chama ESTE primeiro. Este não importa ninguém.
// O guardião scripts/test-ads-bola-2110.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (ADS_BOLA_2110_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_ADS_BOLA_2110 = 'KINEO-ADS-BOLA-2110'

/** A base da entrega: origin/main de 21/10 manhã (9415fa5dd, KINEO-DESENHO-NOTA9-2110 reâncoras). */
export const ADS_BOLA_2110_BASE = '58b03e12d' // KINEO-ADS-BOLA-2110 — merge da fila: a base da bola é a origin/main 58b03e12d

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_ADS_BOLA_2110 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-bola-2110-trocas.json'), 'utf8'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_ADS_BOLA_2110 = {
  'app/api/ads/v2/edit/route.ts': 1,
  'lib/ads/autoBrief.ts': 2,
  'lib/ads/scriptPrompt.ts': 0,
  'lib/ads/v2Advance.ts': 4,
  'lib/ads/v2Brief.ts': 4,
  'lib/ads/v2CloseReal.ts': 1,
  'lib/ads/v2PlanCore.ts': 17,
  'lib/ads/v2PostDeliveryServer.ts': 1,
  'lib/ads/v2Presenter.ts': 3,
  'lib/ads/v2PresenterV2.ts': 103,
  'lib/ads/v2Scene.ts': 15,
  'lib/ads/v2SceneServer.ts': 1,
  'lib/ads/v2Simple.ts': 106,
  'scripts/test-support/desfaz-legenda-bengali-2010.mjs': 2, // KINEO-ADS-BOLA-2110 — merge da fila (origin/main 58b03e12d): a cabeça da cadeia passou a ser a legenda bengali
}
export const ADS_BOLA_2110_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_ADS_BOLA_2110))
/** Arquivos novos da entrega (não existiam na base). */
export const ADS_BOLA_2110_NOVOS = [
  'lib/ads/v2BolaFix.ts',
  'scripts/test-ads-bola-2110.mjs',
  'scripts/test-support/desfaz-ads-bola-2110-trocas.json',
  'scripts/test-support/desfaz-ads-bola-2110.mjs',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semAdsBola2110(texto, p) {
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_ADS_BOLA_2110) || !ADS_BOLA_2110_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_ADS_BOLA_2110[rel] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_ADS_BOLA_2110)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_ADS_BOLA_2110[rel] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-ads-bola-2110: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-ads-bola-2110: ${rel} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazAdsBola2110(p, texto) {
  return semAdsBola2110(texto, p)
}
