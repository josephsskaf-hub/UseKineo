// KINEO-BEBE-QUE-FALA-2010 — DESFAZ, em memória, o "AI Kids Cartoon Stories" (template /kids-cartoon, `kids_cartoon` na rota do filme e no
// /generate, 4º card da home, páginas no sitemap e no /llms.txt) para os guardiões que conferem arquivos BYTE A BYTE contra uma base antiga.
// Módulo auxiliar; não é teste.
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-BEBE-QUE-FALA-2010:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-bebe-que-fala-2010-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF. A marca NÃO contém a de nenhuma camada de antes.
// ENCADEAMENTO: é a camada MAIS NOVA — semMenuUgc2010 (a cabeça que semUgcAjustes2010 e as cadeias da home/Studio Ads chamam primeiro)
// chama ESTE primeiro. Este não importa ninguém.
// O guardião scripts/test-bebe-que-fala-2010.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (BEBE_QUE_FALA_2010_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semKidsVenda2010 } from './desfaz-kids-venda-2010.mjs' // KINEO-KIDS-VENDA-2010 — a venda do desenho infantil veio depois: sai PRIMEIRO (encadeado; texto sem a marca passa igual)

export const MARCA_BEBE_QUE_FALA_2010 = 'KINEO-BEBE-QUE-FALA-2010'

/** A base da entrega: origin/main de 20/10 (KINEO-MENU-UGC-2010 na ponta). */
export const BEBE_QUE_FALA_2010_BASE = 'b7662b717a0d8513d9c59cc2527c7fd834a49f56'

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_BEBE_QUE_FALA_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-bebe-que-fala-2010-trocas.json'), 'utf8'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_BEBE_QUE_FALA_2010 = {
  'app/(dashboard)/generate/GenerateClient.tsx': 3,
  'app/KineoLanding.tsx': 2,
  'app/api/generate-video-cinematic/route.ts': 9,
  'app/llms.txt/route.ts': 2,
  'app/sitemap.ts': 3,
  'components/home/HomeThreeCards.tsx': 4,
  'scripts/test-support/desfaz-menu-ugc-2010.mjs': 2,
}
export const BEBE_QUE_FALA_2010_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_BEBE_QUE_FALA_2010))
/** Arquivos novos da entrega (não existiam na base). */
export const BEBE_QUE_FALA_2010_NOVOS = [
  'app/(dashboard)/kids-cartoon/page.tsx',
  'app/ai-kids-cartoon-videos/page.tsx',
  'app/api/kids-cartoon/story/route.ts',
  'app/desenho-infantil-3d-com-ia/page.tsx',
  'components/home/HomeKidsCard.tsx',
  'components/kidsCartoon/KidsCartoonPages.tsx',
  'components/kidsCartoon/KidsCartoonTemplate.tsx',
  'components/kidsCartoon/KidsCtaLink.tsx',
  'lib/kidsCartoon/babyPodcast.ts',
  'lib/kidsCartoon/kidsCartoon.ts',
  'lib/seo/paginasKidsCartoon2010.ts',
  'lib/ui/homeKidsCard.ts',
  'public/posters/home-card-kids-cartoon-leo.webp',
  'public/previews/home-card-kids-cartoon-leo.mp4',
  'scripts/test-bebe-que-fala-2010.mjs',
  'scripts/test-support/desfaz-bebe-que-fala-2010.mjs',
  'scripts/test-support/desfaz-bebe-que-fala-2010-trocas.json',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semBebeQueFala2010(texto, p) {
  texto = semKidsVenda2010(texto, p) // KINEO-KIDS-VENDA-2010 — a camada mais nova sai primeiro
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_BEBE_QUE_FALA_2010) || !BEBE_QUE_FALA_2010_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_BEBE_QUE_FALA_2010[rel] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_BEBE_QUE_FALA_2010)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_BEBE_QUE_FALA_2010[rel] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-bebe-que-fala-2010: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-bebe-que-fala-2010: ${rel} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazBebeQueFala2010(p, texto) {
  return semBebeQueFala2010(texto, p)
}
