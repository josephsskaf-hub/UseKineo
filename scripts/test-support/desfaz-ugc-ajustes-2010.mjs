// KINEO-UGC-AJUSTES-2010 — DESFAZ, em memória, os AJUSTES DO UGC de 20/10 no Studio Ads: Jade e Robert na lista de aprovados do apresentador v2 (revalidação de 20/10),
// KINEO-UGC-AJUSTES-2010 — o SUB-TETO de 10/dia da amostra com a pessoa (passou dele, a entrada UGC cai no Close real com aviso honesto; o /start confere de novo), o
// KINEO-UGC-AJUSTES-2010 — "sample_probe" (só a conta interna, com ?sample_probe=1, vira 'none' no /plan, no /start e na tela) e a folga de 23 palavras do roteiro do
// KINEO-UGC-AJUSTES-2010 — apresentador v2 (o pedido continua 19–21). Para os guardiões que conferem arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste.
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-UGC-AJUSTES-2010:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-ugc-ajustes-2010-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF. A marca NÃO contém a de nenhuma camada de antes.
// ENCADEAMENTO: é a camada MAIS NOVA — os desfaz das camadas de antes que leem os mesmos arquivos (KINEO-PAGINAS-UGC-2010, a cabeça que semKitBfVenda2010 chama primeiro, e KINEO-FILMES-F1F3-PUBLICO-2010) chamam
// ESTE primeiro; os guardiões que liam o disco cru ganharam a reâncora (linha marcada, também desfeita aqui).
// O arquivo binário public/ads/presenters/voice-pt-confidentwoman.mp3 (a frase neutra de 20/10, mesma voz) não tem desfaz em texto: o guardião
// scripts/test-ugc-ajustes-2010.mjs confere o sha256 dele.
// O guardião scripts/test-ugc-ajustes-2010.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (UGC_AJUSTES_2010_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_UGC_AJUSTES_2010 = 'KINEO-UGC-AJUSTES-2010'

/** A base da entrega (origin/main de 20/10 = a fila: KINEO-PAGINAS-UGC-2010 sobre KINEO-KIT-BF-VENDA-2010; mesclada com merge sobre a 1ª base 44d8d206f). */
export const UGC_AJUSTES_2010_BASE = '9ebff0df33037329dc390e314014c5408f5c5258'

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_UGC_AJUSTES_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ugc-ajustes-2010-trocas.json'), 'utf8'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_UGC_AJUSTES_2010 = TROCAS_UGC_AJUSTES_2010.__acrescimos
export const UGC_AJUSTES_2010_ARQUIVOS = Object.keys(ACRESCIMOS_UGC_AJUSTES_2010)
/** Arquivos novos da entrega. */
export const UGC_AJUSTES_2010_NOVOS = [
  'scripts/test-ugc-ajustes-2010.mjs',
  'scripts/test-support/desfaz-ugc-ajustes-2010.mjs',
  'scripts/test-support/desfaz-ugc-ajustes-2010-trocas.json',
]
/** O binário trocado (a amostra de voz PT): o guardião confere o sha256. */
export const UGC_AJUSTES_2010_BINARIOS = { 'public/ads/presenters/voice-pt-confidentwoman.mp3': '89154f00cc4c5246e0e4891401b32c248a9d50bb718e6cf3d3eeb11175d91ac7' }

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semUgcAjustes2010(texto, p) {
  if (typeof texto !== 'string' || !texto.includes(MARCA_UGC_AJUSTES_2010) || !UGC_AJUSTES_2010_ARQUIVOS.includes(p)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_UGC_AJUSTES_2010[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_UGC_AJUSTES_2010)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_UGC_AJUSTES_2010[p] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-ugc-ajustes-2010: ${p} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-ugc-ajustes-2010: ${p} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazUgcAjustes2010(p, texto) {
  return semUgcAjustes2010(texto, p)
}
