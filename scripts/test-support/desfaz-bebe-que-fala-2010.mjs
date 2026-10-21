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

export const MARCA_BEBE_QUE_FALA_2010 = 'KINEO-BEBE-QUE-FALA-2010'

/** A base da entrega: origin/main de 20/10 depois do merge (a fila entrega-atual: KINEO-VERBATIM-INTOCAVEL-2010 sobre KINEO-AVATAR-PRESO-2010, KINEO-META95-ESCRITA-2010, KINEO-META95-PERSONAGEM-2010, KINEO-MCP-STUDIO-2010 e KINEO-MENU-UGC-2010). */
export const BEBE_QUE_FALA_2010_BASE = 'b023609fdc2fac86dc1276ec4704ae4ae98b2cda'

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_BEBE_QUE_FALA_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-bebe-que-fala-2010-trocas.json'), 'utf8'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_BEBE_QUE_FALA_2010 = {
  'app/(dashboard)/generate/GenerateClient.tsx': 3,
  'app/KineoLanding.tsx': 2,
  'app/api/generate-avatar/route.ts': 5,
  'app/api/generate-video-cinematic/route.ts': 9,
  'app/llms.txt/route.ts': 3,
  'app/sitemap.ts': 5,
  'components/home/HomeThreeCards.tsx': 6,
  'scripts/test-avatar-preso-2010.mjs': 1,
  'scripts/test-cena-negacao-1510.mjs': 0,
  'scripts/test-contrato-classicos-1410.mjs': 0,
  'scripts/test-filmes-f1-virgula-1910.mjs': 0,
  'scripts/test-filmes-f1f3-ajuste-1910.mjs': 0,
  'scripts/test-filmes-f1f4-1910.mjs': 0,
  'scripts/test-home-3-cards-1910.mjs': 1,
  'scripts/test-kling25-variedade-2026-09-28.mjs': 0,
  'scripts/test-mcp-studio-2010.mjs': 1,
  'scripts/test-menu-ugc-2010.mjs': 1,
  'scripts/test-meta95-escrita-2010.mjs': 1,
  'scripts/test-meta95-personagem-2010.mjs': 1,
  'scripts/test-moderacao-2026-09-25.mjs': 1,
  'scripts/test-showcase-2026-10-02.mjs': 1,
  'scripts/test-studio-fantasma-1510.mjs': 0,
  'scripts/test-support/desfaz-avatar-preso-2010.mjs': 2,
  'scripts/test-support/desfaz-menu-ugc-2010.mjs': 2,
  'scripts/test-support/desfaz-meta95-escrita-2010.mjs': 2,
  'scripts/test-support/desfaz-verbatim-intocavel-2010.mjs': 3,
  'scripts/test-trilha-15s-1610.mjs': 0,
  'scripts/test-veo-marcado-2026-09-29.mjs': 0,
  'scripts/test-veo-modo-ia-2026-09-29.mjs': 0,
  'scripts/test-verbatim-intocavel-2010.mjs': 1,
  'scripts/test-visual-contract-2026-09-11.mjs': 0,
}
export const BEBE_QUE_FALA_2010_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_BEBE_QUE_FALA_2010))
/** Arquivos novos da entrega (não existiam na base). */
export const BEBE_QUE_FALA_2010_NOVOS = [
  'app/(dashboard)/baby-podcast/page.tsx',
  'app/(dashboard)/kids-cartoon/page.tsx',
  'app/ai-baby-podcast-videos/page.tsx',
  'app/ai-kids-cartoon-videos/page.tsx',
  'app/api/baby-podcast/prepare/route.ts',
  'app/api/kids-cartoon/story/route.ts',
  'app/desenho-infantil-3d-com-ia/page.tsx',
  'app/videos-bebe-podcast-ia/page.tsx',
  'components/home/HomeKidsCard.tsx',
  'components/home/HomeProductAdsReel.tsx',
  'components/kidsCartoon/BabyCtaLink.tsx',
  'components/kidsCartoon/BabyPodcastPages.tsx',
  'components/kidsCartoon/BabyPodcastTemplate.tsx',
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
  'scripts/test-support/desfaz-bebe-que-fala-2010-trocas.json',
  'scripts/test-support/desfaz-bebe-que-fala-2010.mjs',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semBebeQueFala2010(texto, p) {
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
