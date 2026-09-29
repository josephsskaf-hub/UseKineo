// KINEO-REVISAO-E2B-2026-09-29 — guardião dos consertos da revisão adversarial da E2b (entrada Seedance 15 s).
//
// A revisão de dinheiro/entrada achou 8 caminhos em que o CLIENTE montava um filme de 15 s com um roteiro de 35-60 s (a
// guarda do cinematic recusava com 422, sem cobrar) ou abria o trial de 10 cr direto na parede. Este guardião prova, com
// os módulos REAIS executados (loader offline, alias @/ resolvido por caminho, sem tsconfig) e âncoras de linha inteira
// nas telas, que cada caminho foi fechado — e cada bloco tem mutante em memória que PRECISA ficar vermelho:
//   A. link com ?duration= que o saldo não paga cai na régua da entrada; ?engine=fast traduzido não é escolha explícita;
//   B. o handoff do GPT recusa 15 s acima do teto de fala da guarda (mesma régua, número derivado);
//   C. o escritor não devolve intacto o texto pronto acima do teto quando o alvo é curto (trava 8.2, "vai" do 15 s);
//   D. /generate: a duração decidida viaja para a análise (onboarding), o episódio/Viral Now a 15 s vira teaser, a parede
//      troca roteiro longo verbatim por modo IA;
//   E. "Continue with Seedance 1.5 · 15s" leva a duração no link;
//   F. a retomada de checkout enxerga o filme grátis de 15 s (não reabre checkout de conta com 0 filmes);
//   G. o cartão de plano não vende "Keep N/month with Kineo 1" a quem não vê o Kineo 1;
//   H. o modal de trial vencido não manda para um filme que a rota recusa.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import crypto from 'node:crypto'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; console.log('  ✓ ' + nome); return } falhas.push(nome); console.error('  ✗ ' + nome) }
const linhas = (src) => src.split('\n')
const temLinha = (src, linha) => linhas(src).includes(linha)
const antes = (src, a, b) => { const i = linhas(src).indexOf(a), j = linhas(src).indexOf(b); return i >= 0 && j >= 0 && i < j }

function criaLoader(sobrescritas = {}) {
  const cache = new Map()
  const indisponivel = (n) => { throw new Error('guardião offline proíbe ' + n) }
  const externos = { 'node:crypto': crypto, crypto, '@supabase/supabase-js': { createClient: () => indisponivel('Supabase') }, openai: { __esModule: true, default: class { constructor() { indisponivel('OpenAI') } } } }
  const contexto = {
    Buffer, URL, URLSearchParams, TextEncoder, TextDecoder, Date,
    process: { env: { NODE_ENV: 'production' } },
    console: { log() {}, warn() {}, error() {} },
    fetch: () => indisponivel('rede'), setTimeout: () => indisponivel('timer'), clearTimeout() {},
  }
  function carrega(spec, pai = root) {
    if (Object.hasOwn(externos, spec)) return externos[spec]
    let f = spec.startsWith('@/') ? join(root, spec.slice(2)) : spec.startsWith('.') ? resolve(pai, spec) : resolve(root, spec)
    if (!f.startsWith(root + sep)) throw new Error('fora do repo: ' + spec)
    if (!existsSync(f)) f += '.ts'
    if (!existsSync(f)) throw new Error('import inesperado: ' + spec)
    if (cache.has(f)) return cache.get(f)
    const exports = {}
    cache.set(f, exports)
    const rel = f.slice(root.length + 1).split(sep).join('/')
    const src = Object.hasOwn(sobrescritas, rel) ? sobrescritas[rel] : readFileSync(f, 'utf8')
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    vm.runInNewContext(js, { ...contexto, exports, require: (n) => carrega(n, dirname(f)) }, { timeout: 10000, filename: f })
    return exports
  }
  return carrega
}
function muta(rel, de, para) {
  const src = rd(rel)
  if (src.split(de).length !== 2) throw new Error(`âncora do mutante ausente/ambígua em ${rel}: ${de.slice(0, 70)}`)
  return { [rel]: src.replace(de, para) }
}

const L = criaLoader()
const ec = L('lib/credits/engineCost.ts')
const dbe = L('lib/durationByEngine.ts')
const S = dbe.SEEDANCE_SHORT_SECONDS
const custoSeedance = (s) => ec.creditCostForDuration('cinematic_ai', true, s)
const TRIAL = L('lib/freeTierOffer.ts').TRIAL_GRANT_CREDITS_COPY // o grant do trial (TRIAL_CREDIT_CAP espelhado na fonte da copy)
const TETO = dbe.maxWordsForShortFilm(S)
checa(`números derivados: 15 s = ${custoSeedance(S)} cr ≤ trial ${TRIAL} < 35 s = ${custoSeedance(35)} cr; teto de fala ${TETO} palavras`, custoSeedance(S) <= TRIAL && custoSeedance(35) > TRIAL && Number.isInteger(TETO) && TETO > 0)

console.log('A) link com ?duration= que o saldo não paga → régua da entrada (Studio e /generate)')
{
  const E = L('lib/growth/entradaSeedance15.ts')
  const r = (durUrl, balance, autoStart = false) => E.duracaoDaUrlNaEntrada({ durUrl, balance, autoStart, custoSeedance })
  checa(`trial ${TRIAL} cr + ?duration=35 (Viral Now 45→35) → ${S} s`, r(35, TRIAL) === S)
  checa('trial + ?duration=60 (páginas antigas) → 15 s', r(60, TRIAL) === S)
  checa('trial + ?duration=15 → a URL vence (null = não mexe)', r(S, TRIAL) === null)
  checa('pagante com saldo para 60 s + ?duration=60 → a URL vence', r(60, custoSeedance(60)) === null)
  checa('sem ?duration → a régua de sempre (maior que cabe)', r(null, TRIAL) === S && r(null, custoSeedance(60)) === 60)
  checa('saldo desconhecido → não mexe; auto-start → não mexe', r(35, null) === null && r(35, TRIAL, true) === null)
  checa('?engine=fast/kineo1 é pedido de Kineo 1 (traduzido, não é escolha explícita); seedance não', E.pedidoDeKineo1('fast') && E.pedidoDeKineo1('Kineo-1') && !E.pedidoDeKineo1('seedance') && !E.pedidoDeKineo1(null))
  const M = criaLoader(muta('lib/growth/entradaSeedance15.ts', '    if (Number.isFinite(c) && c > 0 && c <= f.balance) return null', '    return null'))('lib/growth/entradaSeedance15.ts')
  checa('mutante (URL sempre vence) → vermelho', M.duracaoDaUrlNaEntrada({ durUrl: 35, balance: TRIAL, autoStart: false, custoSeedance }) !== S)
  const GEN = rd('app/(dashboard)/generate/GenerateClient.tsx')
  checa('/generate: ?engine=fast traduzido segue a entrada; a duração vem de duracaoDaUrlNaEntrada', temLinha(GEN, '            const motorTraduzidoDoKineo1 = entradaNoPlano && pedidoDeKineo1(searchParams?.get(\'engine\'))') && temLinha(GEN, '            if (urlPickedEngine && !motorTraduzidoDoKineo1) { /* escolha explicita — nao tocar */ }') && temLinha(GEN, '              const d = duracaoDaUrlNaEntrada({'))
  const ST = rd('app/(dashboard)/studio/StudioClient.tsx')
  checa('Studio: a mesma função decide (a URL só vence quando o saldo paga)', temLinha(ST, '    const d = duracaoDaUrlNaEntrada({ durUrl: duracaoDaUrl, balance, autoStart: false, custoSeedance })'))
}

console.log('B) handoff do GPT: 15 s acima do teto de fala volta 400 na conversa (não 422 no Studio)')
{
  const roteiro = (n) => `HOOK: ${Array.from({ length: n }, (_, i) => `w${i}`).join(' ')}`
  const valida = (G, n) => G.validateHandoffInput({ script: roteiro(n), durationSec: S, engineHint: 'seedance' })
  const G = L('lib/gptHandoff.ts')
  const noTeto = valida(G, TETO), acima = valida(G, TETO + 1)
  checa(`${TETO} palavras faladas a ${S} s → aceito`, noTeto.ok === true)
  checa(`${TETO + 1} palavras → 400 "at most ${TETO} spoken words" (a instrução do GPT sabe aparar)`, acima.ok === false && acima.error.includes(`at most ${TETO} spoken words`))
  checa('35 s com o mesmo roteiro longo segue aceito (o teto é só do filme curto)', G.validateHandoffInput({ script: roteiro(TETO + 40), durationSec: 35, engineHint: 'seedance' }).ok === true)
  const M = criaLoader(muta('lib/gptHandoff.ts', '    if (palavrasFaladas > tetoCurto) {', '    if (false) {'))('lib/gptHandoff.ts')
  checa('mutante (sem o teto) → vermelho', valida(M, TETO + 1).ok === true)
}

console.log('C) o escritor (trava 8.2, "vai" do 15 s): texto pronto com marcadores não volta intacto acima do teto')
{
  const GS = rd('app/api/generate-script/route.ts')
  const L_RET = '    if (!forceAuthoring && hasViralMarkers(topic)) {'
  const L_FIT = '      if (filmeCurto && palavrasDoFilmeCurto(topic) > tetoFilmeCurto) {'
  const L_TETO = '    const tetoFilmeCurto = Math.min(maxWordsFor(alvoSegundos, regua.wordsPerSecond, regua.coverage), maxWordsForShortFilm(alvoSegundos))'
  const L_INTACTO = '      return NextResponse.json({ script: topic, alreadyStructured: true })'
  checa('as réguas do filme curto nascem ANTES do retorno antecipado, e o corte vem antes do "devolve intacto"', antes(GS, L_TETO, L_RET) && antes(GS, L_RET, L_FIT) && antes(GS, L_FIT, L_INTACTO) && temLinha(GS, '        const ajustePronto = fitShortFilmScript(so4Pronto.script, { maxWords: tetoFilmeCurto, minWords: pisoFilmeCurto, countWords: palavrasDoFilmeCurto, hardMaxWords: tetoDuroFilmeCurto })')) // reancorado 29/09 (KINEO-ROTEIRO-15S-FRASE-INTEIRA): + teto duro da guarda; o corte é por frases inteiras
  checa('mutante (sem o corte no retorno antecipado) → vermelho', !temLinha(GS.replace(L_FIT, '      if (false) {'), L_FIT))
  // O episódio da série (150-165 palavras, 5 marcadores) passa pelo MESMO corte e sai ≤ teto na régua da guarda.
  const SF = L('lib/shortFilmScript.ts')
  const SP = L('lib/scriptParser.ts')
  const conta = (t) => SP.parseUserScript(t).narration.split(/\s+/).filter(Boolean).length
  const frase = (k, n) => Array.from({ length: n }, (_, i) => `${k}${i}`).join(' ') + '.'
  const episodio = [`HOOK: ${frase('h', 20)} ${frase('hh', 12)}`, `MICRO REWARD 1: ${frase('a', 18)} ${frase('aa', 14)}`, `MICRO REWARD 2: ${frase('b', 18)} ${frase('bb', 14)}`, `MICRO REWARD 3: ${frase('c', 20)}`, `ESCALATION: ${frase('e', 20)}`, `RHYTHM: Now. Here.`, `PAYOFF: ${frase('p', 16)}`].join('\n\n')
  const so4 = SF.keepShortFilmSections(episodio)
  const ajuste = SF.fitShortFilmScript(so4.script, { maxWords: TETO, minWords: Math.min(40, TETO), countWords: conta })
  checa(`episódio de ${conta(episodio)} palavras → ${ajuste.words} ≤ ${TETO} na régua da guarda, PAYOFF intacto`, conta(episodio) > TETO && ajuste.words <= TETO && ajuste.script.includes(frase('p', 16)) && dbe.checarFalaDoFilmeCurto({ engine: 'seedance', seconds: S, verbatim: true, narration: SP.parseUserScript(ajuste.script).narration }).ok === true)
}

console.log('D) /generate: a duração decidida viaja; roteiro longo a 15 s vira teaser em modo IA')
{
  const GEN = rd('app/(dashboard)/generate/GenerateClient.tsx')
  const L_ESC = "          body: JSON.stringify({ topic: rawSource, language, targetSeconds: duracaoPedida, engine: mode === 'fast' || mode === 'creator' ? 'fast' : quality }),"
  checa('handleAnalyze: duracaoPedida = override ?? estado; alvo da análise e do escritor usam ela', temLinha(GEN, '    const duracaoPedida: Duration = opts?.targetSeconds ?? duration') && temLinha(GEN, '    let alvoAnalise: Duration = duracaoPedida') && temLinha(GEN, L_ESC))
  checa('mutante (escritor volta a ler o estado velho) → vermelho', !temLinha(GEN.replace(L_ESC, L_ESC.replace('targetSeconds: duracaoPedida', 'targetSeconds: duration')), L_ESC))
  checa('scriptModeOverride estrutura mesmo com a tela em verbatim', temLinha(GEN, "      : (opts?.scriptModeOverride ?? scriptMode) === 'ai' && (opts?.structureFirst === true || !opts?.skipPreview)"))
  checa('onboarding de nicho: a duração que o clique fixa vai junto (achado 1)', temLinha(GEN, '    void handleAnalyze(goal.topic, { fromTopic: true, skipPreview: true, structureFirst: true, targetSeconds: duracaoDoOnboarding })') && GEN.includes('      : !kineo1Shown ? SEEDANCE_SHORT_SECONDS : undefined'))
  checa('episódio a 15 s com roteiro longo e saldo < 60 s → teaser estruturado a 15 s (achado 6)', temLinha(GEN, '      !roteiroCabeNoFilmeCurto(s) &&') && temLinha(GEN, '      (credits === null || credits < custoSeedance(60))') && temLinha(GEN, "      void handleAnalyze(s, { fromTopic: true, skipPreview: true, structureFirst: true, targetSeconds: SEEDANCE_SHORT_SECONDS, scriptModeOverride: 'ai' })") && temLinha(GEN, '    void handleAnalyze(s, { fromTopic: true, skipPreview: true, structureFirst: false, targetSeconds: duracaoDoEpisodio })'))
  checa('auto-analyze (Viral Now) a 15 s com roteiro longo → teaser (achado 5)', temLinha(GEN, "    if (mode === 'cinematic_ai' && aiEngine === 'seedance' && duration === SEEDANCE_SHORT_SECONDS && !roteiroCabeNoFilmeCurto(sp)) {") && temLinha(GEN, "      handleAnalyze(sp, { fromTopic: true, skipPreview: true, structureFirst: true, scriptModeOverride: 'ai' })"))
  checa('parede: "Make my free 15-second film" com roteiro verbatim longo passa a modo IA (achado 3)', temLinha(GEN, "              if (scriptMode === 'verbatim' && !roteiroCabeNoFilmeCurto(prompt)) setScriptMode('ai')"))
  const E = L('lib/growth/entradaSeedance15.ts')
  checa(`a régua do cliente é a da guarda: ${TETO} palavras cabem, ${TETO + 1} não`, E.roteiroCabeNoFilmeCurto(Array(TETO).fill('w').join(' ')) && !E.roteiroCabeNoFilmeCurto(Array(TETO + 1).fill('w').join(' ')))
}

console.log('E) próxima ação: "Continue with Seedance 1.5 · 15s" leva a duração')
{
  const SC = L('lib/seriesContinuation.ts')
  const href = SC.seriesContinuationHrefOrNull('The last day of Pompeii', 'next_action', { engine: 'seedance', duration: S })
  const q = new URL('https://x.invalid' + href).searchParams
  checa(`link da série com duration=${S} e engine=seedance`, q.get('duration') === String(S) && q.get('engine') === 'seedance' && q.get('autoanalyze') === '1')
  checa('sem duração pedida, o link continua sem duration (nada muda para os outros degraus)', !new URL('https://x.invalid' + SC.seriesContinuationHrefOrNull('The last day of Pompeii', 'next_action', { engine: 'seedance' })).searchParams.has('duration'))
  const NA = rd('app/api/next-action/route.ts')
  const L_DUR = "          duration: state === 'dry' && curtoEscolhido ? SEEDANCE_SHORT_SECONDS : null,"
  checa('a rota passa a duração do degrau curto ao link de continuar', temLinha(NA, L_DUR))
  const M = criaLoader(muta('lib/seriesContinuation.ts', "  if (duration !== null) params.set('duration', String(duration))", ''))('lib/seriesContinuation.ts')
  checa('mutante (link sem a duração) → vermelho', !new URL('https://x.invalid' + M.seriesContinuationHrefOrNull('The last day of Pompeii', 'next_action', { engine: 'seedance', duration: S })).searchParams.has('duration'))
}

console.log('F) retomada de checkout: o trial de 10 cr com 0 filmes tem entrega grátis (não reabre o checkout)')
{
  const TB = L('lib/growth/trialBalanceBridge.ts')
  const base = { trialPhase: 'active', credits: TRIAL, creditsUsed: 0 }
  checa(`com o 15 s: elegível (custo ${TB.decideTrialFirstDelivery({ ...base, shortFilm: true }).cost} ≤ ${TRIAL})`, TB.decideTrialFirstDelivery({ ...base, shortFilm: true }).eligible === true)
  checa('sem o 15 s (o defeito): inelegível → a rota reabria o checkout', TB.decideTrialFirstDelivery(base).eligible === false)
  const RES = rd('app/api/stripe/checkout/resume/route.ts')
  checa('a rota passa shortFilm: SEEDANCE_15S_PUBLIC (o mesmo interruptor do banner)', temLinha(RES, '    shortFilm: SEEDANCE_15S_PUBLIC,') && temLinha(RES, "import { SEEDANCE_15S_PUBLIC } from '@/lib/engineLaunch' // revisão da E2b: a mesma entrada que o banner do trial usa"))
}

console.log('G) cartão de plano: sem "Keep N/month with Kineo 1" para quem não vê o Kineo 1')
{
  const PF = L('lib/growth/planFit.ts')
  const caso = { quality: 'cinematic_hollywood', seconds: 60, monthlyFilms: 10, currency: 'usd' }
  const antes_ = PF.calculatePlanFit(caso), depois = PF.calculatePlanFit({ ...caso, kineo1Allowed: false })
  checa('caso de controle oferece a alternativa Kineo 1 quando permitido', antes_.fastAlternative !== null)
  checa('kineo1Allowed=false → fastAlternative null', depois.fastAlternative === null)
  const M = criaLoader(muta('lib/growth/planFit.ts', " || input.kineo1Allowed === false) {", ') {'))('lib/growth/planFit.ts')
  checa('mutante (ignora kineo1Allowed) → vermelho', M.calculatePlanFit({ ...caso, kineo1Allowed: false }).fastAlternative !== null)
  const GEN = rd('app/(dashboard)/generate/GenerateClient.tsx')
  checa('/generate passa kineo1Allowed={kineo1Shown} ao cartão', temLinha(GEN, '                    kineo1Allowed={kineo1Shown}'))
}

console.log('H) trial vencido com 0 filmes: nada de botão para um filme que a rota recusa')
{
  const DG = L('lib/growth/trialDowngradeFirstValue.ts')
  const SW = L('lib/engineLaunch.ts').SEEDANCE_15S_PUBLIC
  checa(`com a entrada nova (SEEDANCE_15S_PUBLIC=${SW}) o modal NÃO oferece o filme`, SW === true && DG.trialDowngradeOffersFirstFilm(SW) === false)
  const RT = rd('app/api/generate-video-cinematic/route.ts')
  checa('a razão existe na rota: Seedance recusado a quem não paga e não está em trial ativo', /!isPaidUser && !trialActive/.test(RT))
}

console.log(`\n${ok}/${ok + falhas.length} verificações`)
if (falhas.length) { for (const f of falhas) console.log('FALHOU:', f); process.exit(1) }
console.log('PASS — a revisão da E2b: nenhum caminho do cliente monta 15 s com roteiro longo, nem abre o trial na parede.')
