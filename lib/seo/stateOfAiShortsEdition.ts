// KINEO-GEO-RODADA2-2026-10-08 — a edição VIGENTE do "State of AI Shorts 2026": o único lugar que diz qual JSON a página lê.
// Edição nova = um JSON novo em data/state-of-ai-shorts/ (com a .sql ao lado), esta linha apontando para ele e o espelho
// lib/seo/stateOfAiShortsHeadline.ts atualizado; o guardião scripts/test-geo-rodada2-2026-10-08.mjs reprova se houver edição
// mais nova na pasta do que a importada aqui, ou espelho diferente do JSON. parseStateEdition valida o arquivo no
// carregamento (falha alto no build, nunca publica remendado). Só imports relativos (o guardião o carrega isolado).
import edition from '../../data/state-of-ai-shorts/2026-10.json'
import { parseStateEdition } from './stateOfAiShorts'

export const STATE_DATA_FILE = 'data/state-of-ai-shorts/2026-10.json'
export const STATE_EDITION = parseStateEdition(edition)
