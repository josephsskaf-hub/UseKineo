// KINEO-RECUSA-NAO-E-TENTE-DE-NOVO-2026-08-31
// Prova que uma recusa deterministica (4xx) do /api/analyze-idea para de virar
// "Please try again" — a instrucao que nao pode dar certo.
// Licao do sceneTruth: nao basta a peca existir, tem que estar LIGADA nas duas
// pontas. Os blocos C e D leem os arquivos que CHAMAM.
import { readFileSync } from 'node:fs'
import { ANALYZE_PROMPT_MAX_CHARS, analyzePromptTooLongMessage } from '../lib/analyzeLimits.ts'

let ok = 0, fail = 0
const t = (nome, cond) => { if (cond) { ok++ } else { fail++; console.error('  ✗ ' + nome) } }
const R = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')

// ── A. a fonte unica ────────────────────────────────────────────────────────
t('A1 teto e 5000', ANALYZE_PROMPT_MAX_CHARS === 5000)
t('A2 teto e inteiro positivo', Number.isInteger(ANALYZE_PROMPT_MAX_CHARS) && ANALYZE_PROMPT_MAX_CHARS > 0)
t('A3 frase cita o numero', analyzePromptTooLongMessage().includes('5,000'))
t('A4 frase e em ingles (cliente)', /Prompt is too long/.test(analyzePromptTooLongMessage()))
t('A5 frase termina com ponto', analyzePromptTooLongMessage().trim().endsWith('.'))

// ── B. servidor: le a fonte unica, nao um numero solto ──────────────────────
const route = R('app/api/analyze-idea/route.ts')
t('B1 route importa a fonte unica', /from '@\/lib\/analyzeLimits'/.test(route))
t('B2 route compara contra a constante', /prompt\.length > ANALYZE_PROMPT_MAX_CHARS/.test(route))
t('B3 route usa a frase da fonte unica', /analyzePromptTooLongMessage\(\)/.test(route))
t('B4 nenhum 5000 solto sobrou no teste de comprimento', !/prompt\.length > 5000/.test(route))
t('B5 continua 400 (recusa de entrada, nao falha nossa)', /analyzePromptTooLongMessage\(\)\s*\},\s*\{\s*status:\s*400/.test(route.replace(/\s+/g, ' ')) || /status: 400/.test(route))

// ── C. cliente: o guarda existe e roda ANTES do fetch ──────────────────────
const cli = R('app/(dashboard)/generate/GenerateClient.tsx')
t('C1 cliente importa a fonte unica', /import \{ ANALYZE_PROMPT_MAX_CHARS \} from '@\/lib\/analyzeLimits'/.test(cli))
t('C2 textarea usa a constante', /maxLength=\{ANALYZE_PROMPT_MAX_CHARS\}/.test(cli))
t('C3 nenhum maxLength=5000 sobrou', !/maxLength=\{5000\}/.test(cli))
const iGuardaVazio = cli.indexOf("analyze_prompt_empty")
const iGuardaLongo = cli.indexOf("analyze_prompt_too_long")
const iBody = cli.indexOf('const analyzeBody = JSON.stringify({ prompt: source')
t('C4 guarda de vazio existe', iGuardaVazio > 0)
t('C5 guarda de comprimento existe', iGuardaLongo > 0)
t('C6 guarda de vazio vem ANTES do corpo do fetch', iGuardaVazio > 0 && iGuardaVazio < iBody)
t('C7 guarda de comprimento vem ANTES do corpo do fetch', iGuardaLongo > 0 && iGuardaLongo < iBody)
t('C8 guarda devolve a tela ao estado utilizavel', /setPhase\('idle'\)\s*\n\s*return/.test(cli.slice(iGuardaVazio, iGuardaVazio + 900)))
t('C9 a mensagem de comprimento diz o numero da pessoa', /Your text is \$\{sourceLen/.test(cli))
t('C10 a mensagem de comprimento diz quanto cortar', /over the \$\{ANALYZE_PROMPT_MAX_CHARS/.test(cli))
t('C11 a mensagem de vazio nao manda "try again"', !/Type an idea first[^']*try again/i.test(cli))

// ── D. cliente: 4xx mostra a frase do servidor; 5xx nao ────────────────────
t('D1 le a frase do servidor', /const servidorDisse\s*=/.test(cli))
t('D2 separa 4xx de 5xx', /res\.status >= 400 && res\.status < 500/.test(cli))
t('D3 4xx com frase do servidor mostra a frase', /recusaDeterminista && servidorDisse\s*\?\s*servidorDisse/.test(cli))
t('D4 5xx mantem o "try again" honesto', /Could not analyze that idea\. Please try again\./.test(cli))
t('D5 o fromTopic continua existindo no ramo generico', /opts\?\.fromTopic\s*\n?\s*\?\s*'Could not analyze topic/.test(cli.replace(/\s+/g, ' ')) || /fromTopic/.test(cli))
t('D6 telemetria leva o comprimento', /prompt_len=\$\{sourceLen\}/.test(cli))
t('D7 telemetria NAO leva o texto da pessoa', !/detail:\s*source\b/.test(cli) && !/prompt_text/.test(cli))

// ── E. a armadilha da #8: nenhuma crase em comentario novo ─────────────────
const novos = cli.split('\n').filter((l) => l.includes('KINEO-RECUSA-NAO-E-TENTE-DE-NOVO'))
t('E1 a marca do bloco existe no cliente', novos.length >= 2)
const comentariosNovos = cli
  .split('\n')
  .filter((l) => l.trim().startsWith('//') && /RECUSA-NAO-E-TENTE|deterministic|deterministica|utm_source=chatgpt/.test(l))
t('E2 nenhuma crase nos comentarios novos do cliente', comentariosNovos.every((l) => !l.includes('`')))
t('E3 lib nova sem crase em comentario', R('lib/analyzeLimits.ts').split('\n').filter((l) => l.trim().startsWith('//')).every((l) => !l.includes('`')))

// ── F. fronteira: nao encostei na pista do Codex ───────────────────────────
t('F1 nao toquei em preco/credito/trial nesta lib', !/price|credit|trial|plan/i.test(R('lib/analyzeLimits.ts')))

console.log(`\n${ok} ok · ${fail} falhas`)
process.exit(fail ? 1 : 0)
