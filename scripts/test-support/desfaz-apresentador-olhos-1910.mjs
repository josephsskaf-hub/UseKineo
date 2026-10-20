// KINEO-APRESENTADOR-OLHOS-1910 — DESFAZ, em memória, a entrega "olhos abertos" do apresentador v2 do Studio Ads (validação dos 12, 19/10: 8 de 11 reprovados por fechar os olhos
// KINEO-APRESENTADOR-OLHOS-1910 — falando): atuação com os olhos abertos no início + o que evitar; fala de apresentador sem verbos sensoriais e com piso de 19 palavras; voz sem speed que
// KINEO-APRESENTADOR-OLHOS-1910 — passa até 8% fica e o corte nunca deixa a fala abaixo do piso; tela de escolha só com os 4 aprovados para clientes; amostra = voz do anúncio; voice_id no
// KINEO-APRESENTADOR-OLHOS-1910 — evento da montagem. Para os guardiões que conferem arquivos BYTE A BYTE contra uma base antiga ou executam o código da época. Módulo auxiliar; não é teste.
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-APRESENTADOR-OLHOS-1910:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-apresentador-olhos-1910-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual. A marca NÃO contém a de nenhuma camada de antes. Encadeamento: é a camada MAIS NOVA — sai
// PRIMEIRO: semCloseRealLegendaCorte1910 (a cabeça da cadeia do Close real → apresentador v2 → ajuste 3 → …) chama esta antes de tudo.
// O guardião scripts/test-apresentador-olhos-1910.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (APRESENTADOR_OLHOS_1910_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_APRESENTADOR_OLHOS_1910 = 'KINEO-APRESENTADOR-OLHOS-1910'

/** A base da entrega (origin/main de 20/10: KINEO-HOME-3-CARDS-1910 + KINEO-KIT-BF-1910 no ar, mesclada com merge). */
export const APRESENTADOR_OLHOS_1910_BASE = 'c97d629d9c3e7c91e974155ad927fd31b4f6cc0a'

/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_APRESENTADOR_OLHOS_1910 = {
  'app/(dashboard)/ads/v2/AdsV2Simple.tsx': 2,
  'app/(dashboard)/ads/v2/page.tsx': 1,
  'components/ads/AdsPresenterPicker.tsx': 11,
  'lib/ads/v2Advance.ts': 14,
  'lib/ads/v2Brief.ts': 27,
  'lib/ads/v2PlanCore.ts': 6,
  'lib/ads/v2PresenterV2.ts': 75,
  'scripts/test-atores-ia-1310.mjs': 1,
  'scripts/test-close-real-ajuste-1910.mjs': 0,
  'scripts/test-close-real-v3-1910.mjs': 0,
  'scripts/test-filmes-f1-virgula-1910.mjs': 0,
  'scripts/test-filmes-f1f3-ajuste-1910.mjs': 0,
  'scripts/test-home-3-cards-1910.mjs': 1,
  'scripts/test-support/desfaz-close-real-legenda-corte-1910.mjs': 2,
  'scripts/test-support/desfaz-home-3-cards-1910.mjs': 2,
  'scripts/test-support/desfaz-kit-bf-1910.mjs': 2,
}
export const APRESENTADOR_OLHOS_1910_ARQUIVOS = Object.keys(ACRESCIMOS_APRESENTADOR_OLHOS_1910)
/** Arquivos novos da entrega. */
export const APRESENTADOR_OLHOS_1910_NOVOS = [
  'public/ads/presenters/voice-pt-confidentwoman.mp3',
  'scripts/test-apresentador-olhos-1910.mjs',
  'scripts/test-support/desfaz-apresentador-olhos-1910.mjs',
  'scripts/test-support/desfaz-apresentador-olhos-1910-trocas.json'
]

const AQUI = dirname(fileURLToPath(import.meta.url))
/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_APRESENTADOR_OLHOS_1910 = JSON.parse(readFileSync(join(AQUI, 'desfaz-apresentador-olhos-1910-trocas.json'), 'utf8'))

export function linhaDoApresentadorOlhos1910(l) {
  return typeof l === 'string' && l.includes(MARCA_APRESENTADOR_OLHOS_1910)
}

/** As linhas da BASE que a entrega reescreveu (para os guardiões que contam linhas removidas). */
export function linhasTrocadasApresentadorOlhos1910(p) {
  return (TROCAS_APRESENTADOR_OLHOS_1910[p] ?? []).map(([, base]) => base)
}

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semApresentadorOlhos1910(texto, p) {
  if (typeof texto !== 'string' || !texto.includes(MARCA_APRESENTADOR_OLHOS_1910) || !APRESENTADOR_OLHOS_1910_ARQUIVOS.includes(p)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_APRESENTADOR_OLHOS_1910[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_APRESENTADOR_OLHOS_1910)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_APRESENTADOR_OLHOS_1910[p] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-apresentador-olhos-1910: ${p} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazApresentadorOlhos1910(p, texto) {
  return semApresentadorOlhos1910(texto, p)
}
