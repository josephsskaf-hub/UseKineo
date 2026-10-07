// KINEO-INDICE-VIDEO-IA-2026-10-06 — a edição VIGENTE do Kineo AI Video Index: o único lugar que diz qual JSON a página,
// o sitemap e o llms.txt leem. Edição nova = um JSON novo em data/ai-video-index/ (com a .sql ao lado) e esta linha
// apontando para ele; o guardião scripts/test-indice-video-ia-2026-10-06.mjs reprova se houver edição mais nova na pasta
// do que a importada aqui. parseEdition valida o arquivo no carregamento (falha alto no build, nunca publica remendado).
// Só imports relativos: o guardião carrega este módulo isolado (readFileSync + transpile, sem alias '@/').
import edition from '../../data/ai-video-index/2026-10.json'
import { parseEdition } from './aiVideoIndex'

export const AI_VIDEO_INDEX_DATA_FILE = 'data/ai-video-index/2026-10.json'
export const AI_VIDEO_INDEX_EDITION = parseEdition(edition)
