// KINEO-PAGINAS-MOTOR-1610 — a normalização ÚNICA que os guardiões de TRAVA das páginas de motor usam para descontar desta
// mudança SÓ o que ela acrescentou (fundador 16/10: páginas de conteúdo/SEO não contam como produto congelado; o molde da
// página do Seedance nas páginas de Veo 3.1, Kling 3, Kling 2.5 e Seedance 2.5). Todo o resto segue travado byte a byte.
// O conteúdo novo é provado à parte, com mutantes, por scripts/test-paginas-motor-1610.mjs.
//
// Quem usa: test-citation-engine-metadata (fonte e metadata), test-paid-seedance-bridge-2026-09-28 (arquivo inteiro),
// test-seedance-hero-plans-2026-09-28 e test-veo-hero-plans-2026-09-30 (HTML renderizado e metadata de cada motor),
// test-avatar-fora-2026-09-28 (o tamanho da FAQ do Kling 3).
//
// FONTE: desfaz EXATAMENTE as 4 edições de app/ai-video-generator/[engine]/page.tsx (o import, o `let` + a linha da meta
// própria e a linha JSX do guia). Qualquer outra diferença continua vermelha.
// HTML: tira o bloco <section data-kineo="engine-guide-1610"> (que não tem <section> dentro). METADATA: neutraliza dos DOIS
// lados a description das páginas que ganharam meta própria — e só quando a atual é EXATAMENTE a meta do catálogo.

export const IMPORT_1610 = "import { EngineBuyerGuide } from '@/components/PaginasMotor1610' // KINEO-PAGINAS-MOTOR-1610"
export const LET_1610 = '  let description = pause // KINEO-PAGINAS-MOTOR-1610 — let: a página reescrita troca pela meta própria logo abaixo'
export const CONST_BASE = '  const description = pause'
export const META_1610 = '  if (!pause && e.metaDescription) description = e.metaDescription // KINEO-PAGINAS-MOTOR-1610 — meta própria (≤155) das páginas reescritas'
export const GUIA_1610 = '        <EngineBuyerGuide slug={params.engine} ctaHref={signupUrl} campaign={campaign} />{/* KINEO-PAGINAS-MOTOR-1610 — resumo, preço por duração, limites, quando não usar */}'
export const EDICOES_PAGINAS_MOTOR_1610_FONTE = 4

const lf = (s) => s.replace(/\r\n/g, '\n')

/** Quantas das 4 edições a fonte contém, cada uma exatamente uma vez (o guardião exige 4 — a normalização tem sujeito). */
export function edicoesPaginasMotor1610Fonte(src) {
  const linhas = lf(src).split('\n')
  const umaVez = (l) => linhas.filter((x) => x === l).length === 1
  return [IMPORT_1610, LET_1610, META_1610, GUIA_1610].filter(umaVez).length
}

/** Fonte (LF) da página de motor → a mesma fonte sem as 4 edições desta mudança. */
export function semPaginasMotor1610Fonte(src) {
  return lf(src).split('\n')
    .filter((l) => l !== IMPORT_1610 && l !== META_1610 && l !== GUIA_1610)
    .map((l) => (l === LET_1610 ? CONST_BASE : l))
    .join('\n')
}

const GUIA_HTML = /<section data-kineo="engine-guide-1610"[\s\S]*?<\/section>/g
/** Quantos blocos do guia o HTML renderizado tem. */
export const guiasHtml1610 = (html) => (html.match(GUIA_HTML) ?? []).length
/** HTML renderizado → sem o bloco do guia. */
export const semGuiaHtml1610 = (html) => html.replace(GUIA_HTML, '')

/** Os slugs que ganharam meta própria (lidos do catálogo carregado pelo guardião). */
export function slugsComMeta1610(ENGINES) {
  return Object.keys(ENGINES).filter((s) => typeof ENGINES[s].metaDescription === 'string')
}
/** Metadata → com a description neutralizada (description, openGraph e twitter). */
export function comMetaNeutra1610(meta) {
  if (!meta || typeof meta !== 'object') return meta
  const N = '[paginas-motor-1610:description]'
  const out = { ...meta, description: N }
  if (out.openGraph) out.openGraph = { ...out.openGraph, description: N }
  if (out.twitter) out.twitter = { ...out.twitter, description: N }
  return out
}
