// === sprint-v1v4 #37 - O TETO DE CRESCIMENTO PASSA A VIAJAR NO PEDIDO =====
//
// POR QUE ESTE TESTE EXISTE
//
// 5 das 6 expansoes que nao entregaram texto em 29/08->01/09 sairam por
// `growth_limit`. Numa delas (30/08 21:01, 38s de fala para 45s) faltavam DOZE
// palavras. O teto de 2,5x nao era estreito demais - o modelo escreveu MUITO
// alem dele, e escreveu porque o teto era SECRETO: o pedido dizia "roughly N
// words", as 6 regras absolutas do system prompt nao falavam em limite
// superior, e o servidor media o teto so DEPOIS, para jogar a resposta fora.
//
// O que este arquivo prova, lendo o codigo REAL (nunca uma copia):
//   (1) o teto existe como funcao pura e usa as MESMAS constantes do veredito;
//   (2) o pedido ao modelo carrega o numero do teto;
//   (3) o system prompt tem a regra do maximo;
//   (4) a base do teto e resolvida ANTES da chamada e UMA vez so;
//   (5) o alvo nunca pode ficar acima do teto (pedido impossivel);
//   (6) o Contrato C1 continua de pe: o teto NAO mudou, nada renderiza sozinho;
//   (7) a telemetria consegue julgar a rodada.
//
// Ancoras de UMA LINHA (licao da #14).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8')

const politica = ler('lib/expandPolicy.ts')
const rota = ler('app/api/expand-script/route.ts')
const cliente = ler('app/(dashboard)/generate/GenerateClient.tsx')
const fit = ler('lib/narrationFit.ts')

let ok = 0
const falhas = []
const v = (nome, cond) => { if (cond) ok++; else falhas.push(nome) }

// --- (1) O TETO EM PALAVRAS EXISTE E NASCE DAS CONSTANTES DO VEREDITO -----
v('expandPolicy exporta maxCandidateWords', /export function maxCandidateWords\(/.test(politica))
v('maxCandidateWords usa MAX_GROWTH_FACTOR', /maxCandidateWords\([\s\S]{0,320}MAX_GROWTH_FACTOR/.test(politica))
v('maxCandidateWords usa WORDS_PER_SECOND', /maxCandidateWords\([\s\S]{0,320}WORDS_PER_SECOND/.test(politica))
v('maxCandidateWords protege base <= 0', /maxCandidateWords\([\s\S]{0,200}baseSpeech > 0\)\) return 0/.test(politica))
v('maxCandidateWords arredonda para baixo', /maxCandidateWords\([\s\S]{0,320}Math\.floor\(/.test(politica))
v('MAX_GROWTH_FACTOR segue 2.5 (o teto NAO mudou)', /export const MAX_GROWTH_FACTOR = 2\.5\b/.test(politica))
v('WORDS_PER_SECOND segue 2.3', /export const WORDS_PER_SECOND = 2\.3\b/.test(fit))
v('MIN_COVERAGE segue 0.95', /export const MIN_COVERAGE = 0\.95\b/.test(fit))

const MAXG = 2.5
const WPS = 2.3
const teto = (base) => (base > 0 ? Math.floor(base * MAXG * WPS) : 0)
v('teto(21s) = 120 palavras', teto(21) === 120)
v('teto(38s) = 218 palavras', teto(38) === 218)
v('teto(0) = 0', teto(0) === 0)
v('teto(-5) = 0', teto(-5) === 0)
v('teto cresce com a base', teto(40) > teto(20))
const alvoPal = (t) => Math.ceil(t * WPS)
v('caso real 30/08: alvo de 45s cabe folgado no teto de 38s de base', alvoPal(45) < teto(38))
v('caso real 01/09: alvo de 35s cabe no teto de 21s de base', alvoPal(35) < teto(21))

// --- (2) O PEDIDO CARREGA O TETO ------------------------------------------
v('rota importa maxCandidateWords', /^\s*maxCandidateWords,\s*$/m.test(rota))
v('rota calcula palavrasTeto', /const palavrasTeto = maxCandidateWords\(speechBase\)/.test(rota))
v('pedido diz HARD MAXIMUM com o numero', /HARD MAXIMUM: \$\{palavrasTeto\} spoken words/.test(rota))
v('pedido repete o numero na proibicao', /never go past \$\{palavrasTeto\}/.test(rota))
v('pedido explica a consequencia (descartado)', /\$\{palavrasTeto\} spoken words is discarded/.test(rota))

// --- (3) A REGRA DO MAXIMO ESTA NAS REGRAS ABSOLUTAS ----------------------
v('SISTEMA tem a regra 7', /^7\. There is a HARD MAXIMUM number of spoken words/m.test(rota))
v('regra 7 diz que estourar joga fora', /^7\. There is a HARD MAXIMUM[^\n]*thrown away/m.test(rota))
v('regra 7 manda adicionar menos em vez de estourar', /^7\. There is a HARD MAXIMUM[^\n]*add less of it/m.test(rota))
v('as 6 regras antigas seguem vivas', /^6\. The PAYOFF must remain the last section/m.test(rota))
v('regra 1 (nao reescrever) intacta', /^1\. NEVER change, reword, shorten or "improve"/m.test(rota))
v('regra 3 (so fato verificavel) intacta', /^3\. ONLY REAL, VERIFIABLE FACTS/m.test(rota))

// --- (4) A BASE E RESOLVIDA ANTES DA CHAMADA, E UMA VEZ SO ----------------
const iBase = rota.indexOf('const baseResolvida = resolveGrowthBase(')
const iChamada = rota.indexOf('openai.chat.completions.create')
const iVeredito = rota.indexOf('if (!withinGrowthLimit(speechBase, depois.speech))')
v('resolveGrowthBase aparece no codigo', iBase > 0)
v('chamada ao modelo aparece no codigo', iChamada > 0)
v('veredito de crescimento aparece no codigo', iVeredito > 0)
v('base resolvida ANTES da chamada ao modelo', iBase > 0 && iChamada > 0 && iBase < iChamada)
v('teto calculado ANTES da chamada ao modelo', rota.indexOf('const palavrasTeto =') > 0 && rota.indexOf('const palavrasTeto =') < iChamada)
v('veredito vem DEPOIS da chamada', iVeredito > iChamada)
v('resolveGrowthBase chamado UMA vez so', (rota.match(/resolveGrowthBase\(/g) || []).length === 1)
v('speechBase declarado UMA vez so', (rota.match(/const speechBase = /g) || []).length === 1)
v('palavrasTeto declarado UMA vez so', (rota.match(/const palavrasTeto = /g) || []).length === 1)
v('veredito reusa o MESMO speechBase', /withinGrowthLimit\(speechBase, depois\.speech\)/.test(rota))

// --- (5) O ALVO NUNCA PASSA O TETO ---------------------------------------
v('palavrasPedido e o minimo entre alvo e teto', /const palavrasPedido = Math\.min\(palavrasAlvo, palavrasTeto\)/.test(rota))
v('palavrasAdicionar nunca e negativo', /const palavrasAdicionar = Math\.max\(0, palavrasPedido - palavrasAtuais\)/.test(rota))
v('o pedido usa palavrasPedido no total', /roughly \$\{palavrasPedido\} spoken words in total/.test(rota))
v('o "aim for" usa palavrasPedido', /aim for \$\{palavrasPedido\}/.test(rota))
v('nenhum palavrasAlvo cru sobrou interpolado no pedido', !/\$\{palavrasAlvo\}/.test(rota))
const baseLimite = (45 * 0.95) / MAXG
v('a faixa de choque existe de verdade (alvo > teto e possivel)', alvoPal(45) > teto(baseLimite))
v('com o clamp o pedido nunca passa o teto', Math.min(alvoPal(45), teto(baseLimite)) <= teto(baseLimite))

// --- (6) CONTRATO C1 ------------------------------------------------------
const bloco = rota.slice(iBase > 0 ? iBase : 0, iVeredito > 0 ? iVeredito : rota.length)
v('C1: o caminho do teto nao chama /api/compose', !/api\/compose/.test(bloco))
v('C1: o caminho do teto nao debita credito', !/credit/i.test(bloco))
v('C1: o caminho do teto nao chama submitToFal', !/submitToFal/.test(bloco))
v('growth_limit continua devolvendo 422', /outcome: 'growth_limit' as ExpandOutcome[\s\S]{0,2400}status: 422/.test(rota))
v('o candidato da #30 continua voltando na resposta', /candidate: expandido,/.test(rota))
v('candidateFits da #30 continua na resposta', /candidateFits: depois\.ok,/.test(rota))
v('needs_authoring (preflight D1) continua vivo', /if \(needsAuthoring\(antes\.speech, target\)\)/.test(rota))

// --- (7) A TELEMETRIA JULGA A RODADA -------------------------------------
v('resposta 422 carrega maxWords', /maxWords: palavrasTeto,/.test(rota))
v('resposta 422 carrega candidateWords', /candidateWords: Math\.round\(depois\.speech \* WORDS_PER_SECOND\),/.test(rota))
v('cliente registra max_words', /max_words: typeof data\?\.maxWords === 'number'/.test(cliente))
v('cliente registra candidate_words', /candidate_words: typeof data\?\.candidateWords === 'number'/.test(cliente))
v('os dois campos vao no script_expand_failed', /script_expand_failed'[\s\S]{0,900}candidate_words:/.test(cliente))
v('base_seconds do #9 continua no evento', /base_seconds: typeof data\?\.baseSeconds === 'number'/.test(cliente))
v('base_repaired do #9 continua no evento', /base_repaired: data\?\.baseRepaired === true/.test(cliente))

console.log('\n' + ok + ' verificacoes passaram, ' + falhas.length + ' falharam')
if (falhas.length) {
  console.log('\nFALHAS:')
  for (const f of falhas) console.log('  x ' + f)
  process.exit(1)
}
console.log('OK sprint-v1v4 #37: o teto de crescimento deixou de ser secreto\n')
