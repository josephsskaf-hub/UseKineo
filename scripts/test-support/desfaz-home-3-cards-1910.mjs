// KINEO-HOME-3-CARDS-1910 — DESFAZ, em memória, a entrega dos 3 cards da home + a amostra grátis pela entrada do card (?entry=product|ugc;
// a amostra com a pessoa pelo card UGC) nos arquivos que JÁ existiam, para os guardiões que conferem rotas e telas BYTE A BYTE contra uma
// base antiga (ou executam o arquivo com stubs da época). Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-HOME-3-CARDS-1910:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-home-3-cards-1910-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual. A marca NÃO contém a de nenhuma camada de antes. Preserva CRLF.
// ENCADEAMENTO: é a camada MAIS NOVA do Studio Ads — semCloseRealLegendaCorte1910 (a cabeça da corrente do Close real, que o Close real, o
// ajuste, a rodada 3, a legenda e a pílula chamam) chama esta PRIMEIRO; os guardiões da home (2 portas, clips_first) a aplicam na KineoLanding.
// O guardião scripts/test-home-3-cards-1910.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (HOME_3_CARDS_1910_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semHomeCardsBotoes2010 } from './desfaz-home-cards-botoes-2010.mjs' // KINEO-HOME-CARDS-BOTOES-2010 — os botões distintos dos cards de anúncio vieram depois: saem PRIMEIRO (encadeado; texto sem a marca passa igual)
import { semApresentadorOlhos1910 } from './desfaz-apresentador-olhos-1910.mjs' // KINEO-APRESENTADOR-OLHOS-1910 — os olhos abertos do apresentador v2 vieram depois: saem PRIMEIRO (encadeado; texto sem a marca passa igual)

export const MARCA_HOME_3_CARDS_1910 = 'KINEO-HOME-3-CARDS-1910'

/** A base da entrega: a fila entrega-atual de 19/10 (origin/main 9ddb24c7e + KINEO-KIT-BF-1910), mesclada nesta branch. */
export const HOME_3_CARDS_1910_BASE = '719eb5b509703ddc802102363a2603de4882c38c'

/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_HOME_3_CARDS_1910 = {
  'app/(dashboard)/ads/v2/AdsV2Client.tsx': 3,
  'app/(dashboard)/ads/v2/AdsV2Simple.tsx': 6,
  'app/(dashboard)/ads/v2/page.tsx': 6,
  'app/KineoLanding.tsx': 12,
  'lib/ads/v2Advance.ts': 4,
  'lib/ads/v2Contract.ts': 5,
  'lib/ads/v2PlanCore.ts': 7,
  'lib/ads/v2StartCore.ts': 2,
  'scripts/test-ads-fiel-2-1510.mjs': 1,
  'scripts/test-ads-fiel-3-1510.mjs': 1,
  'scripts/test-ads-fiel-4-1510.mjs': 1,
  'scripts/test-ads-fiel-5-1510.mjs': 1,
  'scripts/test-ads-fiel-6-1610.mjs': 1,
  'scripts/test-ads-fiel-7-1610.mjs': 1,
  'scripts/test-ads-fiel-liga-1510.mjs': 1,
  'scripts/test-ads-link-tela-1510.mjs': 1,
  'scripts/test-ads-lista-1510.mjs': 1,
  'scripts/test-ads-mao-ajuste-3-1610.mjs': 1,
  'scripts/test-ads-mao-juiz-1610.mjs': 1,
  'scripts/test-ads-marcas-1510.mjs': 1,
  'scripts/test-ads-pos-entrega-1510.mjs': 1,
  'scripts/test-ads-produto-na-mao-1610.mjs': 1,
  'scripts/test-ads-produto-na-mao-ajuste-1610.mjs': 1,
  'scripts/test-ads-v2-virada-2026-09-29.mjs': 1,
  'scripts/test-apresentador-v2-1710.mjs': 1,
  'scripts/test-apresentador-v2-ajuste-1710.mjs': 1,
  'scripts/test-apresentador-v2-ajuste-3-1710.mjs': 1,
  'scripts/test-apresentador-v2-libera-1910.mjs': 1,
  'scripts/test-business-depois-da-amostra.mjs': 1,
  'scripts/test-close-real-v3-1910.mjs': 1,
  'scripts/test-duas-portas-1310.mjs': 1,
  'scripts/test-filmes-f1-virgula-1910.mjs': 0,
  'scripts/test-filmes-f1f3-ajuste-1910.mjs': 1,
  'scripts/test-filmes-f1f4-1910.mjs': 1,
  'scripts/test-home-clips-first-2026-10-05.mjs': 1,
  'scripts/test-juiz-grade-1610.mjs': 1,
  'scripts/test-kit-bf-1910.mjs': 1,
  'scripts/test-support/desfaz-close-real-legenda-corte-1910.mjs': 2,
  'scripts/test-support/desfaz-meta95-ideia-1910.mjs': 2,
}
/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_HOME_3_CARDS_1910 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-home-3-cards-1910-trocas.json'), 'utf8'))
export const HOME_3_CARDS_1910_ARQUIVOS = Object.keys(ACRESCIMOS_HOME_3_CARDS_1910)
/** Arquivos novos da entrega (não existiam na base). */
export const HOME_3_CARDS_1910_NOVOS = [
  'components/home/HomeThreeCards.tsx',
  'lib/ui/homeThreeCards.ts',
  'lib/ads/sampleEntry.ts',
  'scripts/test-home-3-cards-1910.mjs',
  'scripts/test-support/desfaz-home-3-cards-1910.mjs',
  'scripts/test-support/desfaz-home-3-cards-1910-trocas.json',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semHome3Cards1910(texto, p) {
  texto = semHomeCardsBotoes2010(texto, p) // KINEO-HOME-CARDS-BOTOES-2010 — a camada mais nova sai primeiro
  texto = semApresentadorOlhos1910(texto, p) // KINEO-APRESENTADOR-OLHOS-1910 — a camada mais nova sai primeiro
  if (typeof texto !== 'string' || !texto.includes(MARCA_HOME_3_CARDS_1910) || !HOME_3_CARDS_1910_ARQUIVOS.includes(p)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_HOME_3_CARDS_1910[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_HOME_3_CARDS_1910)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_HOME_3_CARDS_1910[p] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-home-3-cards-1910: ${p} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-home-3-cards-1910: ${p} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazHome3Cards1910(p, texto) {
  return semHome3Cards1910(texto, p)
}

// ── DIFF (para os guardiões que medem "todo bloco novo traz a MINHA marca" / "o diff só toca a minha lista" por git diff da base deles até a
// árvore, inclusive o que ainda não foi commitado). Um bloco (@@) é DESTA entrega quando tem linha nova (+) e TODA linha nova traz a marca
// (acréscimo ou troca; as linhas - que ele troca saem junto). Exceção única: lib/ui/refinementCopy.json (JSON não aceita comentário) — lá o
// bloco é desta entrega quando toda linha nova é uma das chaves novas dos 3 cards, ou a última chave de antes ganhando só a vírgula.
export const HOME_3_CARDS_1910_CHAVES_COPY = [
  'AI Faceless Videos', 'Type an idea. Get a narrated Short in minutes.', 'AI Product Ads',
  'Your real product photos become a ready-to-run ad.', 'AI UGC Ads', 'An AI person holds your product and tells why to buy.',
]
const COPY_JSON_HOME_3_CARDS_1910 = 'lib/ui/refinementCopy.json'
/** Arquivo que NASCEU nesta entrega (os de HOME_3_CARDS_1910_NOVOS e as prévias/pôsteres dos cards em public/)? Sai inteiro do diff. */
export function arquivoNovoHome3Cards1910(f) {
  return HOME_3_CARDS_1910_NOVOS.includes(f) || /^public\/(posters|previews)\/home-card-[a-z0-9-]+\.(webp|mp4)$/.test(f)
}
function blocoEhHome3Cards1910(arquivo, linhas) {
  const novas = linhas.filter((l) => l.startsWith('+')).map((l) => l.slice(1))
  if (!novas.length) return false
  if (arquivo !== COPY_JSON_HOME_3_CARDS_1910) return novas.every((l) => l.includes(MARCA_HOME_3_CARDS_1910))
  const velhas = new Set(linhas.filter((l) => l.startsWith('-')).map((l) => l.slice(1)))
  return novas.every((l) => HOME_3_CARDS_1910_CHAVES_COPY.some((k) => l.trimStart().startsWith(JSON.stringify(k) + ':')) || (l.endsWith(',') && velhas.has(l.slice(0, -1))))
}
/** O diff unificado (de preferência -U0) sem os blocos desta entrega; arquivo que fica sem bloco sai com o cabeçalho. Aceita CRLF. */
export function diffSemHome3Cards1910(diff) {
  if (typeof diff !== 'string' || !diff) return diff
  const out = []
  let cab = []
  let blocos = []
  let bloco = null
  let arquivo = ''
  const fechaArquivo = () => {
    if (bloco) { blocos.push(bloco); bloco = null }
    const ficam = blocos.filter((b) => !blocoEhHome3Cards1910(arquivo, b.slice(1)))
    if (!arquivoNovoHome3Cards1910(arquivo) && (!blocos.length || ficam.length)) out.push(...cab, ...ficam.flat())
    cab = []; blocos = []
  }
  for (const linha of diff.replace(/\r\n/g, '\n').split('\n')) {
    if (linha.startsWith('diff --git ')) { fechaArquivo(); cab.push(linha); const m = / b\/(.*)$/.exec(linha); arquivo = m ? m[1] : ''; continue }
    if (linha.startsWith('@@')) { if (bloco) blocos.push(bloco); bloco = [linha]; continue }
    if (bloco) bloco.push(linha); else cab.push(linha)
  }
  fechaArquivo()
  return out.join('\n')
}
/** O diff (-U0) de um arquivo é SÓ desta entrega? (tem bloco e todo bloco é desta entrega). Diff vazio = false. */
export function diffSoHome3Cards1910(diff, arquivo) {
  if (typeof diff !== 'string') return false
  const linhas = diff.replace(/\r\n/g, '\n').split('\n')
  const m = linhas.map((l) => / b\/(.*)$/.exec(l.startsWith('diff --git ') ? l : '')).find(Boolean)
  const arq = arquivo ?? (m ? m[1] : '')
  const blocos = []
  for (const l of linhas) { if (l.startsWith('@@')) blocos.push([]); else if (blocos.length && !l.startsWith('diff --git ')) blocos[blocos.length - 1].push(l) }
  return arquivoNovoHome3Cards1910(arq) || (blocos.length > 0 && blocos.every((b) => blocoEhHome3Cards1910(arq, b)))
}
