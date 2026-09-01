// ═══ sprint-v1v4 #42 — O BECO DO `author_rewrite_rejected` ═════════════════
//
// MEDIDO (01/09/2026): suarezgarciakevin6, vinda do chatgpt.com, bateu na
// parede de narracao tres vezes em sete minutos (20:08 / 20:12 / 20:15) e saiu
// com ZERO video. As duas ultimas sairam por `author_rewrite_rejected`. Ela
// estava obedecendo — a fala subiu de 3s para 20s e depois 23s contra um alvo
// de 35s — e a tela devolveu, nas tres, uma frase vermelha e nenhum botao.
//
// Nenhum botao porque 23s de fala nao enche 35/60/90: `largestFittingDuration`
// devolve null e a unica saida alternativa da tela nao aparece. E o texto que
// o modelo escreveu — que podia encher a duracao — foi destruido em silencio
// porque UMA frase dela foi mexida. E o mesmo beco que o #30 fechou do lado do
// `growth_limit`, sobrevivendo no irmao.
//
// Este teste le os ARQUIVOS REAIS de producao, nao mocks.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const rota = readFileSync(join(raiz, 'app/api/expand-script/route.ts'), 'utf8')
const cliente = readFileSync(join(raiz, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
const politica = readFileSync(join(raiz, 'lib/expandPolicy.ts'), 'utf8')

let ok = 0
let falhas = 0
function checa(nome, condicao) {
  if (condicao) { ok++; return }
  falhas++
  console.error(`  ✗ ${nome}`)
}

// Recorta o bloco de resposta do `author_rewrite_rejected` na rota.
const iAR = rota.indexOf("outcome: 'author_rewrite_rejected' as ExpandOutcome")
const blocoAR = iAR < 0 ? '' : rota.slice(iAR, iAR + 3000)

console.log('\n── SERVIDOR: a recusa passou a devolver o texto, rotulado ──')
checa('a rota tem o ramo author_rewrite_rejected', iAR > 0)
checa('devolve o candidato (antes ele morria em silencio)', /candidate: expandido/.test(blocoAR))
checa('devolve os segundos do candidato', /candidateSeconds: Math\.round\(depois\.speech\)/.test(blocoAR))
checa('devolve candidateFits: o portao que impede oferecer texto curto', /candidateFits: depois\.ok/.test(blocoAR))
checa('devolve QUANTAS frases da autora foram mexidas', /rewrittenSentences: preservado\.missing\.length/.test(blocoAR))
checa('devolve o TOTAL de frases da autora (denominador)', /authorSentenceCount: authorSentences\(falaOriginal\)\.length/.test(blocoAR))
checa('devolve o `after` para a tela poder falar em segundos', /after: medida\(depois\.speech, target\)/.test(blocoAR))
checa('mantem suggestedDuration (o caminho antigo nao foi removido)', /suggestedDuration: largestFittingDuration\(antes\.speech\)/.test(blocoAR))
checa('mantem rewroteAuthor: true', /rewroteAuthor: true/.test(blocoAR))
checa('continua respondendo 422 (o veredito NAO virou sucesso)', /status: 422/.test(blocoAR))
checa('authorSentences foi importado de verdade', /^\s*authorSentences,$/m.test(rota))
checa('authorSentences existe e e exportado na politica', /export function authorSentences/.test(politica))

console.log('\n── CONTRATO C1: o teto e a comparacao NAO afrouxaram ──')
checa('MAX_GROWTH_FACTOR continua 2.5', /export const MAX_GROWTH_FACTOR = 2\.5/.test(politica))
checa('authorPreserved continua exigindo a frase inteira, em ordem', /const em = candidatas\.indexOf\(frase, cursor\)/.test(politica))
checa('a recusa continua vindo de !preservado.ok', /if \(!preservado\.ok\)/.test(rota))
checa('o original NAO e substituido pelo candidato na rota', !/original = expandido/.test(rota))
checa('nenhum render e disparado neste ramo', !/submitToFal|generate-video/.test(blocoAR))

console.log('\n── CLIENTE: o estado carrega o texto e o tamanho do estrago ──')
const iTipo = cliente.indexOf("kind: 'author_rewrite_rejected'")
const blocoTipo = iTipo < 0 ? '' : cliente.slice(iTipo, iTipo + 400)
checa('o estado tem candidate', /candidate: string \| null/.test(blocoTipo))
checa('o estado tem candidateSeconds', /candidateSeconds: number/.test(blocoTipo))
checa('o estado tem rewrittenSentences', /rewrittenSentences: number/.test(blocoTipo))
checa('o estado tem authorSentenceCount', /authorSentenceCount: number/.test(blocoTipo))

console.log('\n── CLIENTE: MESMO PORTAO do #30 (nunca oferecer texto curto) ──')
const iCand = cliente.indexOf('const candidatoAR =')
const blocoCand = iCand < 0 ? '' : cliente.slice(iCand, iCand + 500)
checa('existe candidatoAR', iCand > 0)
checa('so aceita quando o outcome e author_rewrite_rejected', /data\.outcome === 'author_rewrite_rejected'/.test(blocoCand))
checa('exige candidato string nao vazio', /data\.candidate\.trim\(\)\.length > 0/.test(blocoCand))
checa('EXIGE candidateFits === true (senao volta ao mesmo muro)', /data\?\.candidateFits === true/.test(blocoCand))
checa('cai para null quando nao ha o que oferecer', /: null/.test(blocoCand))
checa('o gate do growth_limit continua intacto', /const candidatoGL =/.test(cliente))

console.log('\n── CLIENTE: a tela deixou de ser beco ──')
checa('ha botao proprio para o candidato de reescrita', /expandState\.kind === 'author_rewrite_rejected' && expandState\.candidate/.test(cliente))
checa('o botao marca o texto como REESCRITA (honestidade do #30)', /setExpandedIsRewrite\(true\)[\s\S]{0,200}setExpandedScript\(texto\)/.test(cliente))
checa('o botao limpa o estado de erro', /setExpandState\(null\)/.test(cliente))
checa('a frase diz N de M frases', /of your \{expandState\.authorSentenceCount\} sentences/.test(cliente))
checa('a frase diz os segundos do candidato', /\{expandState\.candidateSeconds\}s of narration/.test(cliente))
checa('a frase chama o texto de rewrite, nao de "seu roteiro"', /it is a rewrite, not your script finished/.test(cliente))
checa('sem candidato, a frase ANTIGA continua (nada regrediu)', /we threw its version away and kept yours/.test(cliente))
checa('a tela continua dizendo que nada foi renderizado', /Nothing was rendered and no credits were used/.test(cliente))

console.log('\n── MEDICAO: o veredito passou a ter tamanho ──')
checa('script_expand_failed carrega rewritten_sentences', /rewritten_sentences:/.test(cliente))
checa('script_expand_failed carrega author_sentences', /author_sentences:/.test(cliente))
checa('script_expand_failed carrega candidate_fits', /candidate_fits: data\?\.candidateFits === true/.test(cliente))
checa('existe evento de oferta', /script_rewrite_candidate_offered/.test(cliente))
checa('existe evento de abertura', /script_rewrite_candidate_opened/.test(cliente))
checa('a oferta so dispara com candidato', /if \(candidatoAR\) \{/.test(cliente))
checa('os eventos do #30 sobreviveram', /script_growth_candidate_offered/.test(cliente) && /script_growth_candidate_opened/.test(cliente))

console.log('\n── FALLBACK: o 4xx nao classificado nao quebra o tipo ──')
const iFb = cliente.indexOf('reason: \'unclassified\'')
const blocoFb = iFb < 0 ? '' : cliente.slice(Math.max(0, iFb - 700), iFb)
checa('o fallback existe', iFb > 0)
checa('o fallback nao oferece candidato (nao ha texto)', /candidate: null/.test(blocoFb))
checa('o fallback zera as contagens', /rewrittenSentences: 0/.test(blocoFb) && /authorSentenceCount: 0/.test(blocoFb))

console.log('\n── PISTA DO CODEX: nada de preco, credito, plano ou oferta ──')
const iBotao = cliente.indexOf("expandState.kind === 'author_rewrite_rejected' && expandState.candidate")
const blocoBotao = iBotao < 0 ? '' : cliente.slice(iBotao, iBotao + 1400)
checa('o bloco novo nao cita plano/preco/upgrade/checkout', !/upgrade|checkout|price|plan|credits_cost|Stripe/i.test(blocoBotao))
checa('a rota nao passou a mexer em credito', !/refund|debit|credits/i.test(blocoAR))

const total = ok + falhas
console.log(`\n${falhas === 0 ? '✅' : '❌'} ${ok}/${total} verificacoes`)
process.exit(falhas === 0 ? 0 : 1)
