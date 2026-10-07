// KINEO-INDICE-VIDEO-IA-2026-10-06 — a ÚNICA edição desta mudança nas páginas de motor: um link discreto
// "Real cost and render time" → /ai-video-index no fim da linha de links ([engine]) e do rodapé (seedance-2-5).
// Os guardiões que travam essas páginas byte a byte (na fonte ou no HTML renderizado) descontam SÓ isto — e EXIGEM que
// exista (contar antes de descontar: normalização sem sujeito é trava afrouxada). O conteúdo do link e da página
// /ai-video-index é provado por scripts/test-indice-video-ia-2026-10-06.mjs.
export const INDICE_HREF = '/ai-video-index'
export const INDICE_TEXTO = 'Real cost and render time'

// fonte: separador + comentário + Link, linhas inteiras (qualquer recuo), nada além
const FONTE = /\n[ ]*\{' · '\}\n[ ]*\{\/\* KINEO-INDICE-VIDEO-IA-2026-10-06 — o índice mensal com tempo e custo medidos de cada motor \(link discreto\)\. \*\/\}\n[ ]*<Link href="\/ai-video-index" style=\{\{ color: '#86868b', textDecoration: 'none' \}\}>Real cost and render time<\/Link>(?=\n)/g
// HTML renderizado: o separador " · " e a âncora (o comentário JSX não renderiza nada)
const HTML = / · <a [^>]*href="\/ai-video-index"[^>]*>Real cost and render time<\/a>/g

const lf = (s) => s.replace(/\r\n/g, '\n')
export const edicoesIndiceFonte = (src) => (lf(src).match(FONTE) ?? []).length
export const semIndiceFonte = (src) => lf(src).replace(FONTE, '')
export const edicoesIndiceHtml = (html) => (html.match(HTML) ?? []).length
export const semIndiceHtml = (html) => html.replace(HTML, '')
